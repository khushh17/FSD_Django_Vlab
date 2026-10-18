"""
JSON API used by the lab site.

  POST /api/auth/google        {credential}            -> {token, student}
  POST /api/auth/dev           {email, name}           -> {token, student}   (local testing only)
  GET  /api/me                                         -> {student, ratings}
  POST /api/me/roll-number     {roll_number}           -> {student}
  POST /api/events             {events: [...]}         -> {results: [...]}   quiz attempts, simulation runs
  POST /api/ratings            {experiment, stars}     -> {stars}
  GET  /api/ratings/summary?experiment=                -> {average, count}   (public)
  POST /api/feedback           {id, experiment, message}
  POST /api/bug-reports        {id, experiment, page, description}
"""

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count
from django.http import JsonResponse

from .api import (
    ApiError,
    bad,
    endpoint,
    get_bool,
    get_choice,
    get_int,
    get_object,
    get_query_choice,
    get_str,
    get_uuid,
)
from .auth import SignInError, make_token, verify_google_credential
from .models import BugReport, Feedback, QuizAnswer, QuizAttempt, Rating, SimulationRun, Student, roll_number_validator
from .question_keys import keys_for

MAX_EVENTS_PER_BATCH = 50


def student_json(student):
    return {"email": student.email, "name": student.name, "rollNumber": student.roll_number}


def signed_in(student):
    return JsonResponse({"token": make_token(student), "student": student_json(student)})


def get_experiment(data):
    return get_choice(data, "experiment", settings.LAB_EXPERIMENTS)


# ---- sign-in ----


@endpoint("POST", auth=False)
def google_sign_in(request):
    credential = get_str(request.data, "credential", min_length=1, max_length=5000)
    try:
        sub, email, name = verify_google_credential(credential)
    except SignInError as err:
        raise ApiError(403, "sign_in_rejected", str(err)) from err
    return signed_in(_upsert_student(sub, email, name))


@endpoint("POST", auth=False)
def dev_sign_in(request):
    if not settings.DEV_LOGIN:
        raise ApiError(404, "not_found", "Not found.")
    email = get_str(request.data, "email", min_length=3, max_length=254).lower()
    if "@" not in email:
        raise bad("'email' must be an email address.")
    name = get_str(request.data, "name", max_length=200, required=False)
    return signed_in(_upsert_student(f"dev:{email}", email, name))


def _upsert_student(sub, email, name):
    """Find the student by Google account ID; keep their email and name up to date."""
    with transaction.atomic():
        student = Student.objects.select_for_update().filter(google_sub=sub).first()
        if student is None:
            student = Student(google_sub=sub)
        student.email, student.name = email, name
        try:
            student.save()
        except IntegrityError as exc:  # the email belongs to another Google account ID
            raise ApiError(409, "email_in_use", "This email is linked to another account. Ask the admin.") from exc
    return student


# ---- the signed-in student ----


@endpoint("GET")
def me(request):
    ratings = dict(request.student.ratings.values_list("experiment", "stars"))
    return JsonResponse({"student": student_json(request.student), "ratings": ratings})


@endpoint("POST")
def set_roll_number(request):
    student = request.student
    if student.roll_number:
        # Changing it would let a student move their results to someone else.
        raise ApiError(409, "roll_number_set", "Your roll number is already saved. Ask the admin to change it.")
    roll = get_str(request.data, "roll_number", min_length=1, max_length=20).upper()
    try:
        roll_number_validator(roll)
    except Exception as exc:  # ValidationError
        raise bad(roll_number_validator.message, "invalid_roll_number") from exc
    student.roll_number = roll
    try:
        with transaction.atomic():
            student.save(update_fields=["roll_number"])
    except IntegrityError as exc:
        raise ApiError(409, "roll_number_taken", "This roll number is already used by another account. Ask the admin.") from exc
    return JsonResponse({"student": student_json(student)})


# ---- events sent in the background (quiz attempts, simulation runs) ----


@endpoint("POST", roll_number=True)
def events(request):
    batch = request.data.get("events")
    if not isinstance(batch, list) or not 1 <= len(batch) <= MAX_EVENTS_PER_BATCH:
        raise bad(f"'events' must be a list of 1 to {MAX_EVENTS_PER_BATCH} events.")
    results = []
    for item in batch:
        item_id = item.get("id") if isinstance(item, dict) else None
        try:
            if not isinstance(item, dict):
                raise bad("Each event must be a JSON object.")
            handler = EVENT_HANDLERS.get(item.get("type"))
            if handler is None:
                raise bad(f"Unknown event type. Use one of: {', '.join(EVENT_HANDLERS)}.")
            data = get_object(item, "data", max_bytes=40000)
            client_id = get_uuid(item, "id")
            experiment = get_experiment(item)
            try:
                duplicate = handler(request.student, experiment, client_id, data)
            except IntegrityError:  # the same event arrived twice at once
                duplicate = True
            results.append({"id": item_id, "ok": True, "duplicate": duplicate})
        except ApiError as err:
            # The client drops events rejected as invalid: sending them again would not help.
            results.append({"id": item_id, "ok": False, "error": err.code, "message": err.message})
    return JsonResponse({"results": results})


def _save_quiz_attempt(student, experiment, client_id, data):
    if QuizAttempt.objects.filter(client_id=client_id).exists():
        return True
    kind = get_choice(data, "kind", [QuizAttempt.PRETEST, QuizAttempt.POSTTEST])
    keys = keys_for(experiment)
    if keys is None:
        raise ApiError(500, "no_answer_keys", "The server has no answer keys for this experiment.")
    if kind == QuizAttempt.POSTTEST:
        level = get_choice(data, "level", keys["posttestLevels"])
    else:
        level = ""
    answers = data.get("answers")
    if not isinstance(answers, list) or not 1 <= len(answers) <= 100:
        raise bad("'answers' must be a list of 1 to 100 answers.")
    # Marked here with the answer keys. The browser's own marking ("correct", "score") is
    # not trusted: a student could edit the request.
    clean, seen = [], set()
    for answer in answers:
        if not isinstance(answer, dict):
            raise bad("Each answer must be a JSON object.")
        question_id = get_str(answer, "questionId", min_length=1, max_length=100)
        key = keys["questions"].get(question_id)
        if key is None or key["kind"] != kind or (level and level not in key["levels"]):
            raise bad(f"Question '{question_id}' is not part of this test.")
        if question_id in seen:
            raise bad(f"Question '{question_id}' is answered twice.")
        seen.add(question_id)
        chosen = get_int(answer, "chosen", min_value=0, max_value=key["options"] - 1, allow_null=True)
        clean.append(QuizAnswer(question_id=question_id, chosen=chosen, correct=chosen == key["answer"]))
    score, total = sum(a.correct for a in clean), len(clean)
    with transaction.atomic():
        attempt = QuizAttempt.objects.create(
            student=student,
            experiment=experiment,
            client_id=client_id,
            kind=kind,
            level=level,
            score=score,
            total=total,
            duration_seconds=get_int(data, "durationSeconds", min_value=0, max_value=86400, allow_null=True),
            retake=get_bool(data, "retake", default=False),
        )
        for answer in clean:
            answer.attempt = attempt
        QuizAnswer.objects.bulk_create(clean)
    return False


def _save_simulation_run(student, experiment, client_id, data):
    if SimulationRun.objects.filter(client_id=client_id).exists():
        return True
    steps_total = get_int(data, "stepsTotal", min_value=1, max_value=1000)
    SimulationRun.objects.create(
        student=student,
        experiment=experiment,
        client_id=client_id,
        lab=get_str(data, "lab", min_length=1, max_length=40),
        config=get_object(data, "config"),
        prediction=get_object(data, "prediction", required=False),
        outcome=get_object(data, "outcome"),
        prediction_correct=get_bool(data, "predictionCorrect", allow_null=True),
        steps_total=steps_total,
        steps_viewed=get_int(data, "stepsViewed", min_value=0, max_value=steps_total),
        used_run_to_end=get_bool(data, "usedRunToEnd", default=False),
    )
    return False


EVENT_HANDLERS = {"quiz_attempt": _save_quiz_attempt, "simulation_run": _save_simulation_run}


# ---- forms the student submits and waits for ----


@endpoint("GET", auth=False)
def rating_summary(request):
    """Public: the average rating shown in every visitor's header."""
    experiment = get_query_choice(request, "experiment", settings.LAB_EXPERIMENTS)
    summary = Rating.objects.filter(experiment=experiment).aggregate(average=Avg("stars"), count=Count("id"))
    average = round(summary["average"], 1) if summary["average"] is not None else None
    response = JsonResponse({"experiment": experiment, "average": average, "count": summary["count"]})
    response["Cache-Control"] = "public, max-age=300"
    return response


@endpoint("POST")
def rate(request):
    experiment = get_experiment(request.data)
    stars = get_int(request.data, "stars", min_value=1, max_value=5)
    Rating.objects.update_or_create(student=request.student, experiment=experiment, defaults={"stars": stars})
    return JsonResponse({"stars": stars})


@endpoint("POST")
def feedback(request):
    data = request.data
    client_id = get_uuid(data, "id")
    if not Feedback.objects.filter(client_id=client_id).exists():
        Feedback.objects.create(
            student=request.student,
            experiment=get_experiment(data),
            client_id=client_id,
            message=get_str(data, "message", min_length=1, max_length=2000),
        )
    return JsonResponse({"ok": True}, status=201)


@endpoint("POST")
def bug_report(request):
    data = request.data
    client_id = get_uuid(data, "id")
    if not BugReport.objects.filter(client_id=client_id).exists():
        BugReport.objects.create(
            student=request.student,
            experiment=get_experiment(data),
            client_id=client_id,
            page=get_str(data, "page", max_length=80, required=False),
            description=get_str(data, "description", min_length=1, max_length=2000),
        )
    return JsonResponse({"ok": True}, status=201)
