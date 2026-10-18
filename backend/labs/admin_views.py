"""
JSON API for the admin pages (the professor). Every endpoint except login needs the admin
token. Data is small (one class per experiment), so the numbers are worked out in Python.

  POST /api/admin/login                {username, password}  -> {token, admin}
  GET  /api/admin/me                                         -> {admin}
  GET  /api/admin/overview?experiment=                       -> summary numbers
  GET  /api/admin/students?experiment=                       -> one row per student
  GET  /api/admin/students/<id>?experiment=                  -> one student's attempts and runs
  GET  /api/admin/quiz?experiment=&kind=&level=&attempts=    -> per-question results
  GET  /api/admin/feedback?experiment=                       -> feedback, newest first
  GET  /api/admin/bugs?experiment=&status=                   -> bug reports, newest first
  POST /api/admin/bugs/<id>            {status}              -> mark open / fixed
  GET  /api/admin/simulation?experiment=&lab=                -> runs grouped by setup
"""

import json
from collections import Counter, defaultdict
from datetime import timedelta
from statistics import mean, median

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone

from .api import ApiError, endpoint, get_choice, get_query_choice, get_str
from .auth import make_admin_token
from .models import BugReport, Feedback, QuizAttempt, Rating, SimulationRun, Student

# ---- sign-in ----


def _lockout_key(username):
    return f"labs:admin-login-failures:{username.lower()}"


@endpoint("POST", auth=False)
def login(request):
    username = get_str(request.data, "username", min_length=1, max_length=150)
    password = get_str(request.data, "password", min_length=1, max_length=200)
    key = _lockout_key(username)
    if cache.get(key, 0) >= settings.ADMIN_MAX_FAILED_LOGINS:
        minutes = settings.ADMIN_LOCKOUT_SECONDS // 60
        raise ApiError(429, "locked", f"Too many wrong passwords. Try again in {minutes} minutes.")
    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_superuser:
        failures = cache.get(key, 0) + 1
        cache.set(key, failures, settings.ADMIN_LOCKOUT_SECONDS)
        raise ApiError(401, "bad_credentials", "Wrong username or password.")
    cache.delete(key)
    return JsonResponse({"token": make_admin_token(user), "admin": _admin_json(user)})


def _admin_json(user):
    return {"username": user.get_username(), "name": user.get_full_name() or user.get_username()}


@endpoint("GET", auth="admin")
def me(request):
    return JsonResponse({"admin": _admin_json(request.admin), "experiments": settings.LAB_EXPERIMENTS})


# ---- helpers ----


def _experiment(request):
    return get_query_choice(request, "experiment", settings.LAB_EXPERIMENTS, settings.LAB_EXPERIMENTS[0])


def _pct(score, total):
    return round(100 * score / total, 1) if total else None


def _avg(values):
    values = [v for v in values if v is not None]
    return round(mean(values), 1) if values else None


def _first_and_best(attempts):
    """attempts in time order -> {(kind, level): {"first": attempt, "best": attempt, "count": n}} for one student."""
    out = {}
    for a in attempts:
        entry = out.setdefault((a.kind, a.level), {"first": a, "best": a, "count": 0})
        entry["count"] += 1
        if _pct(a.score, a.total) > _pct(entry["best"].score, entry["best"].total):
            entry["best"] = a
    return out


def _attempts_by_student(experiment):
    by_student = defaultdict(list)
    for a in QuizAttempt.objects.filter(experiment=experiment).order_by("created_at"):
        by_student[a.student_id].append(a)
    return by_student


def _learning_gain(by_student):
    """
    For each student with a pretest and a posttest: first pretest % and first posttest %
    (whatever level they chose first). Returns the averages and the number of students.
    """
    pre, post = [], []
    for attempts in by_student.values():
        first_pre = next((a for a in attempts if a.kind == QuizAttempt.PRETEST), None)
        first_post = next((a for a in attempts if a.kind == QuizAttempt.POSTTEST), None)
        if first_pre and first_post:
            pre.append(_pct(first_pre.score, first_pre.total))
            post.append(_pct(first_post.score, first_post.total))
    if not pre:
        return {"students": 0, "pretest": None, "posttest": None, "gain": None}
    return {
        "students": len(pre),
        "pretest": _avg(pre),
        "posttest": _avg(post),
        "gain": _avg([b - a for a, b in zip(pre, post)]),
    }


def _attempt_summary(firsts):
    """Average and median of first attempts (as %), plus the number of students."""
    values = [_pct(a.score, a.total) for a in firsts]
    return {
        "students": len(values),
        "averageFirst": _avg(values),
        "medianFirst": round(median(values), 1) if values else None,
    }


# ---- overview ----


@endpoint("GET", auth="admin")
def overview(request):
    experiment = _experiment(request)
    by_student = _attempts_by_student(experiment)
    runs = list(SimulationRun.objects.filter(experiment=experiment))
    ratings = list(Rating.objects.filter(experiment=experiment).values_list("stars", flat=True))
    week_ago = timezone.now() - timedelta(days=7)

    active = set(by_student) | {r.student_id for r in runs}
    active |= set(Rating.objects.filter(experiment=experiment).values_list("student_id", flat=True))
    active |= set(Feedback.objects.filter(experiment=experiment).values_list("student_id", flat=True))
    recent = {sid for sid, attempts in by_student.items() if attempts[-1].created_at >= week_ago}
    recent |= {r.student_id for r in runs if r.created_at >= week_ago}

    firsts = defaultdict(list)  # (kind, level) -> first attempts
    counts = Counter((a.kind, a.level) for attempts in by_student.values() for a in attempts)
    for attempts in by_student.values():
        for (kind, level), entry in _first_and_best(attempts).items():
            firsts[(kind, level)].append(entry["first"])

    pretest_firsts = [a for (kind, _), items in firsts.items() if kind == QuizAttempt.PRETEST for a in items]
    posttest_levels = {
        level: {**_attempt_summary(items), "attempts": counts[(kind, level)]}
        for (kind, level), items in sorted(firsts.items()) if kind == QuizAttempt.POSTTEST
    }

    labs = defaultdict(list)
    for r in runs:
        labs[r.lab].append(r)

    return JsonResponse(
        {
            "experiment": experiment,
            "students": {
                "signedIn": Student.objects.exclude(roll_number=None).count(),
                "active": len(active),
                "activeLast7Days": len(recent),
            },
            "completion": {
                "pretest": sum(1 for a in by_student.values() if any(x.kind == QuizAttempt.PRETEST for x in a)),
                "simulation": len({r.student_id for r in runs}),
                "posttest": sum(1 for a in by_student.values() if any(x.kind == QuizAttempt.POSTTEST for x in a)),
            },
            "pretest": {**_attempt_summary(pretest_firsts), "attempts": counts[(QuizAttempt.PRETEST, "")]},
            "posttest": posttest_levels,
            "learningGain": _learning_gain(by_student),
            "simulation": {lab: _lab_summary(items) for lab, items in sorted(labs.items())},
            "ratings": {
                "count": len(ratings),
                "average": _avg(ratings),
                "distribution": {str(s): ratings.count(s) for s in range(1, 6)},
            },
            "feedback": Feedback.objects.filter(experiment=experiment).count(),
            "openBugs": BugReport.objects.filter(experiment=experiment, status=BugReport.OPEN).count(),
        }
    )


def _lab_summary(runs):
    predicted = [r for r in runs if r.prediction_correct is not None]
    return {
        "runs": len(runs),
        "students": len({r.student_id for r in runs}),
        "predictions": len(predicted),
        "predictionAccuracy": _pct(sum(r.prediction_correct for r in predicted), len(predicted)),
        "usedRunToEnd": _pct(sum(r.used_run_to_end for r in runs), len(runs)),
    }


# ---- students ----


def _score_json(attempt):
    return {"score": attempt.score, "total": attempt.total, "percent": _pct(attempt.score, attempt.total)}


@endpoint("GET", auth="admin")
def students(request):
    experiment = _experiment(request)
    by_student = _attempts_by_student(experiment)
    runs = defaultdict(list)
    for r in SimulationRun.objects.filter(experiment=experiment):
        runs[r.student_id].append(r)
    ratings = dict(Rating.objects.filter(experiment=experiment).values_list("student_id", "stars"))

    rows = []
    for s in Student.objects.all():
        summary = _first_and_best(by_student.get(s.pk, []))
        my_runs = runs.get(s.pk, [])
        predicted = [r for r in my_runs if r.prediction_correct is not None]
        rows.append(
            {
                "id": s.pk,
                "rollNumber": s.roll_number,
                "name": s.name,
                "email": s.email,
                "lastSeen": s.last_seen_at,
                "quizzes": {
                    f"{kind}:{level}": {
                        "first": _score_json(entry["first"]),
                        "best": _score_json(entry["best"]),
                        "attempts": entry["count"],
                    }
                    for (kind, level), entry in summary.items()
                },
                "simulationRuns": len(my_runs),
                "predictionAccuracy": _pct(sum(r.prediction_correct for r in predicted), len(predicted)),
                "rating": ratings.get(s.pk),
            }
        )
    return JsonResponse({"experiment": experiment, "students": rows})


@endpoint("GET", auth="admin")
def student_detail(request, student_id):
    experiment = _experiment(request)
    s = Student.objects.filter(pk=student_id).first()
    if s is None:
        raise ApiError(404, "not_found", "No such student.")
    attempts = QuizAttempt.objects.filter(student=s, experiment=experiment).prefetch_related("answers").order_by("-created_at")
    runs = SimulationRun.objects.filter(student=s, experiment=experiment).order_by("-created_at")
    return JsonResponse(
        {
            "student": {"id": s.pk, "rollNumber": s.roll_number, "name": s.name, "email": s.email,
                        "createdAt": s.created_at, "lastSeen": s.last_seen_at},
            "attempts": [
                {
                    "id": a.pk,
                    "kind": a.kind,
                    "level": a.level,
                    **_score_json(a),
                    "durationSeconds": a.duration_seconds,
                    "retake": a.retake,
                    "createdAt": a.created_at,
                    "answers": [{"questionId": x.question_id, "chosen": x.chosen, "correct": x.correct} for x in a.answers.all()],
                }
                for a in attempts
            ],
            "runs": [
                {
                    "id": r.pk,
                    "lab": r.lab,
                    "config": r.config,
                    "prediction": r.prediction,
                    "outcome": r.outcome,
                    "predictionCorrect": r.prediction_correct,
                    "stepsViewed": r.steps_viewed,
                    "stepsTotal": r.steps_total,
                    "usedRunToEnd": r.used_run_to_end,
                    "createdAt": r.created_at,
                }
                for r in runs
            ],
            "rating": Rating.objects.filter(student=s, experiment=experiment).values_list("stars", flat=True).first(),
            "feedback": list(Feedback.objects.filter(student=s, experiment=experiment).values("message", "created_at")),
        }
    )


# ---- quiz analysis ----


@endpoint("GET", auth="admin")
def quiz(request):
    experiment = _experiment(request)
    kind = get_query_choice(request, "kind", [QuizAttempt.PRETEST, QuizAttempt.POSTTEST], QuizAttempt.PRETEST)
    level = request.GET.get("level", "")
    which = get_query_choice(request, "attempts", ["first", "all"], "first")

    attempts = QuizAttempt.objects.filter(experiment=experiment, kind=kind, level=level).order_by("created_at")
    if which == "first":
        seen, chosen_ids = set(), []
        for a in attempts.only("id", "student_id"):
            if a.student_id not in seen:
                seen.add(a.student_id)
                chosen_ids.append(a.pk)
        attempts = attempts.filter(pk__in=chosen_ids)
    attempts = list(attempts.prefetch_related("answers"))

    questions = defaultdict(lambda: {"answered": 0, "correct": 0, "skipped": 0, "chosen": Counter()})
    scores = Counter()
    for a in attempts:
        scores[f"{a.score}/{a.total}"] += 1
        for x in a.answers.all():
            q = questions[x.question_id]
            if x.chosen is None:
                q["skipped"] += 1
                continue
            q["answered"] += 1
            q["correct"] += x.correct
            q["chosen"][x.chosen] += 1

    return JsonResponse(
        {
            "experiment": experiment,
            "kind": kind,
            "level": level,
            "attempts": which,
            "count": len(attempts),
            "averagePercent": _avg([_pct(a.score, a.total) for a in attempts]),
            "scores": dict(sorted(scores.items(), key=lambda kv: [int(n) for n in kv[0].split("/")])),
            "questions": {
                qid: {
                    "answered": q["answered"],
                    "correct": q["correct"],
                    "skipped": q["skipped"],
                    "percentCorrect": _pct(q["correct"], q["answered"] + q["skipped"]),
                    "chosen": {str(k): v for k, v in sorted(q["chosen"].items())},
                }
                for qid, q in questions.items()
            },
        }
    )


# ---- feedback and bug reports ----


def _student_ref(s):
    return {"id": s.pk, "rollNumber": s.roll_number, "name": s.name, "email": s.email}


@endpoint("GET", auth="admin")
def feedback_list(request):
    experiment = _experiment(request)
    items = Feedback.objects.filter(experiment=experiment).select_related("student").order_by("-created_at", "-pk")
    return JsonResponse(
        {
            "experiment": experiment,
            "feedback": [
                {"id": f.pk, "message": f.message, "createdAt": f.created_at, "student": _student_ref(f.student)}
                for f in items
            ],
        }
    )


def _bug_json(b):
    return {
        "id": b.pk,
        "page": b.page,
        "description": b.description,
        "status": b.status,
        "createdAt": b.created_at,
        "student": _student_ref(b.student),
    }


@endpoint("GET", auth="admin")
def bug_list(request):
    experiment = _experiment(request)
    bugs = BugReport.objects.filter(experiment=experiment).select_related("student").order_by("-created_at", "-pk")
    status = request.GET.get("status", "")
    if status:
        bugs = bugs.filter(status=get_query_choice(request, "status", [BugReport.OPEN, BugReport.FIXED]))
    counts = Counter(BugReport.objects.filter(experiment=experiment).values_list("status", flat=True))
    return JsonResponse(
        {
            "experiment": experiment,
            "counts": {BugReport.OPEN: counts[BugReport.OPEN], BugReport.FIXED: counts[BugReport.FIXED]},
            "bugs": [_bug_json(b) for b in bugs],
        }
    )


@endpoint("POST", auth="admin")
def bug_update(request, bug_id):
    bug = BugReport.objects.select_related("student").filter(pk=bug_id).first()
    if bug is None:
        raise ApiError(404, "not_found", "No such bug report.")
    bug.status = get_choice(request.data, "status", [BugReport.OPEN, BugReport.FIXED])
    bug.save(update_fields=["status"])
    return JsonResponse({"bug": _bug_json(bug)})


# ---- simulation analysis ----


@endpoint("GET", auth="admin")
def simulation(request):
    """
    Runs grouped by setup (identical config): how often students predicted the outcome,
    and the wrong predictions they made most. Setups with the lowest accuracy show the
    ideas students find hardest.
    """
    experiment = _experiment(request)
    runs = SimulationRun.objects.filter(experiment=experiment).order_by("created_at")
    lab = request.GET.get("lab", "")
    if lab:
        runs = runs.filter(lab=lab)

    groups = {}
    for r in runs:
        key = (r.lab, json.dumps(r.config, sort_keys=True))
        g = groups.setdefault(
            key,
            {"lab": r.lab, "config": r.config, "runs": 0, "students": set(), "predictions": 0, "correct": 0,
             "runToEnd": 0, "outcomes": Counter(), "wrong": Counter(), "outcomeOf": {}},
        )
        g["runs"] += 1
        g["students"].add(r.student_id)
        g["runToEnd"] += r.used_run_to_end
        outcome_key = json.dumps(r.outcome, sort_keys=True)
        g["outcomes"][outcome_key] += 1
        g["outcomeOf"][outcome_key] = r.outcome
        if r.prediction_correct is not None:
            g["predictions"] += 1
            g["correct"] += r.prediction_correct
            if not r.prediction_correct:
                g["wrong"][json.dumps(r.prediction, sort_keys=True)] += 1

    labs = Counter(SimulationRun.objects.filter(experiment=experiment).values_list("lab", flat=True))
    scenarios = []
    for g in groups.values():
        top_outcome = g["outcomes"].most_common(1)[0][0]
        scenarios.append(
            {
                "lab": g["lab"],
                "config": g["config"],
                "outcome": g["outcomeOf"][top_outcome],
                "runs": g["runs"],
                "students": len(g["students"]),
                "predictions": g["predictions"],
                "correct": g["correct"],
                "accuracy": _pct(g["correct"], g["predictions"]),
                "usedRunToEnd": _pct(g["runToEnd"], g["runs"]),
                "wrongPredictions": [
                    {"prediction": json.loads(p), "count": n} for p, n in g["wrong"].most_common(3)
                ],
            }
        )
    # Hardest first; setups nobody predicted go last; then the most used.
    scenarios.sort(key=lambda s: (s["accuracy"] if s["accuracy"] is not None else 101, -s["runs"]))
    return JsonResponse({"experiment": experiment, "lab": lab, "labs": dict(labs), "scenarios": scenarios})
