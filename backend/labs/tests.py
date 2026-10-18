import json
import uuid
from unittest import mock

from django.test import TestCase, override_settings

from .auth import make_token
from .models import BugReport, Feedback, QuizAttempt, Rating, SimulationRun, Student

EXP = "django-request-response"
SITE = "http://localhost:5173"


def claims(**overrides):
    base = {"sub": "123", "email": "asha@somaiya.edu", "email_verified": True, "hd": "somaiya.edu", "name": "Asha"}
    return {**base, **overrides}


class ApiTestCase(TestCase):
    def _pre_setup(self):
        # Rate limits and lockouts are counted in the cache: start every test from zero.
        from django.core.cache import cache

        cache.clear()
        super()._pre_setup()

    def post(self, url, data, token=None, **headers):
        if token:
            headers["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return self.client.post(url, json.dumps(data), content_type="application/json", **headers)

    def get(self, url, token=None):
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"} if token else {}
        return self.client.get(url, **headers)

    def make_student(self, roll="16010121001", email="asha@somaiya.edu"):
        student = Student.objects.create(google_sub=f"sub-{email}", email=email, name="Asha", roll_number=roll)
        return student, make_token(student)


@override_settings(GOOGLE_CLIENT_ID="client-id.apps.googleusercontent.com", ALLOWED_EMAIL_DOMAIN="somaiya.edu")
class GoogleSignInTests(ApiTestCase):
    def sign_in(self, token_claims=None, error=None):
        target = "google.oauth2.id_token.verify_oauth2_token"
        side = {"side_effect": error} if error else {"return_value": token_claims}
        with mock.patch(target, **side) as verify:
            response = self.post("/api/auth/google", {"credential": "jwt"})
        return response, verify

    def test_university_account_signs_in_and_gets_a_token(self):
        response, verify = self.sign_in(claims())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(verify.call_args.args[2], "client-id.apps.googleusercontent.com")  # audience checked
        body = response.json()
        self.assertEqual(body["student"], {"email": "asha@somaiya.edu", "name": "Asha", "rollNumber": None})
        me = self.get("/api/me", body["token"])
        self.assertEqual(me.status_code, 200)

    def test_same_google_account_is_one_student(self):
        self.sign_in(claims())
        self.sign_in(claims(name="Asha P."))
        self.assertEqual(Student.objects.count(), 1)
        self.assertEqual(Student.objects.get().name, "Asha P.")

    def test_personal_account_with_university_address_is_rejected(self):
        response, _ = self.sign_in(claims(hd=None))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Student.objects.count(), 0)

    def test_other_domain_is_rejected(self):
        response, _ = self.sign_in(claims(email="x@gmail.com", hd=None))
        self.assertEqual(response.status_code, 403)
        response, _ = self.sign_in(claims(email="x@other.edu", hd="other.edu"))
        self.assertEqual(response.status_code, 403)

    def test_unverified_email_is_rejected(self):
        response, _ = self.sign_in(claims(email_verified=False))
        self.assertEqual(response.status_code, 403)

    def test_invalid_token_is_rejected(self):
        response, _ = self.sign_in(error=ValueError("bad signature"))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "sign_in_rejected")

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_not_configured(self):
        response = self.post("/api/auth/google", {"credential": "jwt"})
        self.assertEqual(response.status_code, 403)


class TokenTests(ApiTestCase):
    def test_missing_and_bad_tokens(self):
        self.assertEqual(self.get("/api/me").status_code, 401)
        self.assertEqual(self.get("/api/me", "garbage").status_code, 401)

    def test_token_for_deleted_student(self):
        student, token = self.make_student()
        student.delete()
        self.assertEqual(self.get("/api/me", token).status_code, 401)

    def test_expired_token(self):
        _, token = self.make_student()
        with override_settings(AUTH_TOKEN_MAX_AGE=-1):
            self.assertEqual(self.get("/api/me", token).status_code, 401)


class DevSignInTests(ApiTestCase):
    @override_settings(DEV_LOGIN=False)
    def test_disabled_by_default(self):
        self.assertEqual(self.post("/api/auth/dev", {"email": "a@b.c"}).status_code, 404)

    @override_settings(DEV_LOGIN=True)
    def test_enabled(self):
        response = self.post("/api/auth/dev", {"email": "Test@Somaiya.edu", "name": "Test"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["student"]["email"], "test@somaiya.edu")


@override_settings(STUDENT_SHARED_PASSWORD="class-password")
class RollSignInTests(ApiTestCase):
    def sign_in(self, roll="16010125804", password="class-password", **extra):
        return self.post("/api/auth/roll", {"roll_number": roll, "password": password, **extra})

    def test_first_sign_in_creates_the_student(self):
        response = self.sign_in(name="Asha")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["student"], {"email": None, "name": "Asha", "rollNumber": "16010125804"})
        me = self.get("/api/me", response.json()["token"]).json()
        self.assertEqual(me["student"]["rollNumber"], "16010125804")

    def test_signing_in_again_is_the_same_student(self):
        self.sign_in(name="Asha")
        response = self.sign_in(roll="160 101 25 804", name="Someone else")  # spaces are ignored
        self.assertEqual(response.json()["student"]["name"], "Asha")  # the first name stays
        self.assertEqual(Student.objects.count(), 1)

    def test_records_need_no_extra_step(self):
        token = self.sign_in().json()["token"]
        self.assertEqual(self.post("/api/events", {"events": [quiz_event()]}, token).status_code, 200)
        self.assertEqual(QuizAttempt.objects.get().student.roll_number, "16010125804")

    def test_wrong_password_and_lockout(self):
        self.assertEqual(self.sign_in(password="nope").status_code, 401)
        self.assertEqual(Student.objects.count(), 0)
        for _ in range(9):
            self.sign_in(password="nope")
        self.assertEqual(self.sign_in().status_code, 429)

    def test_invalid_roll_number(self):
        for roll in ["12345", "26010125804", "1601012580", "abcdefghijk"]:
            self.assertEqual(self.sign_in(roll=roll).status_code, 400, roll)

    @override_settings(STUDENT_SHARED_PASSWORD="")
    def test_off_without_a_class_password(self):
        response = self.sign_in(password="anything")
        self.assertEqual(response.status_code, 503)

    def test_google_account_joins_the_roll_number_student(self):
        roll_token = self.sign_in(name="Asha").json()["token"]
        self.post("/api/events", {"events": [quiz_event()]}, roll_token)
        self.post("/api/ratings", {"experiment": EXP, "stars": 3}, roll_token)
        google = Student.objects.create(google_sub="g-1", email="asha@somaiya.edu", name="Asha P")
        google_token = make_token(google)
        self.post("/api/ratings", {"experiment": EXP, "stars": 5}, google_token)  # rated before the roll number
        response = self.post("/api/me/roll-number", {"roll_number": "16010125804"}, google_token)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["student"], {"email": "asha@somaiya.edu", "name": "Asha", "rollNumber": "16010125804"})
        self.assertEqual(Student.objects.count(), 1)
        student = Student.objects.get()
        self.assertEqual((student.google_sub, student.quizattempts.count()), ("g-1", 1))
        self.assertEqual(Rating.objects.get().stars, 3)  # the roll-number student's own rating is kept
        # The old Google-only token no longer works; the new one does.
        self.assertEqual(self.get("/api/me", google_token).status_code, 401)
        self.assertEqual(self.get("/api/me", response.json()["token"]).status_code, 200)

    def test_two_google_accounts_cannot_share_a_roll_number(self):
        self.sign_in()
        first = Student.objects.create(google_sub="g-1", email="a@somaiya.edu")
        self.post("/api/me/roll-number", {"roll_number": "16010125804"}, make_token(first))
        second = Student.objects.create(google_sub="g-2", email="b@somaiya.edu")
        response = self.post("/api/me/roll-number", {"roll_number": "16010125804"}, make_token(second))
        self.assertEqual(response.status_code, 409)


class RateLimitTests(ApiTestCase):
    def test_feedback_is_limited(self):
        _, token = self.make_student()
        codes = [
            self.post("/api/feedback", {"id": str(uuid.uuid4()), "experiment": EXP, "message": "Hi"}, token).status_code
            for _ in range(21)
        ]
        self.assertEqual(codes[:20], [201] * 20)
        self.assertEqual(codes[20], 429)


class RollNumberTests(ApiTestCase):
    def test_set_once(self):
        student, token = self.make_student(roll=None)
        response = self.post("/api/me/roll-number", {"roll_number": " 16010121001 "}, token)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["student"]["rollNumber"], "16010121001")
        again = self.post("/api/me/roll-number", {"roll_number": "16010121002"}, token)
        self.assertEqual(again.status_code, 409)
        student.refresh_from_db()
        self.assertEqual(student.roll_number, "16010121001")

    def test_invalid(self):
        _, token = self.make_student(roll=None)
        for roll in ["", "ab", "has space", "x" * 21, "<script>", "26010121001", "1601012100", "160101210011", "1601012100a"]:
            response = self.post("/api/me/roll-number", {"roll_number": roll}, token)
            self.assertEqual(response.status_code, 400, roll)

    def test_taken(self):
        self.make_student(roll="16010121001", email="a@somaiya.edu")
        _, token = self.make_student(roll=None, email="b@somaiya.edu")
        response = self.post("/api/me/roll-number", {"roll_number": "16010121001"}, token)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"], "roll_number_taken")


def quiz_event(**data_overrides):
    data = {
        "kind": "posttest",
        "level": "easy",
        "score": 1,
        "total": 2,
        "durationSeconds": 95,
        "retake": False,
        "answers": [
            {"questionId": "mw-order-01", "chosen": 1, "correct": True},
            {"questionId": "urls-root-urlconf-01", "chosen": None, "correct": False},
        ],
        **data_overrides,
    }
    return {"id": str(uuid.uuid4()), "type": "quiz_attempt", "experiment": EXP, "data": data}


def sim_event(**data_overrides):
    data = {
        "lab": "middleware",
        "config": {"middleware": ["security", "csrf"], "request": "post-no-token", "view": "render"},
        "prediction": {"status": "403", "viewRuns": "no"},
        "outcome": {"status": 403, "viewCalled": False},
        "predictionCorrect": True,
        "stepsTotal": 12,
        "stepsViewed": 4,
        "usedRunToEnd": True,
        **data_overrides,
    }
    return {"id": str(uuid.uuid4()), "type": "simulation_run", "experiment": EXP, "data": data}


class EventTests(ApiTestCase):
    def setUp(self):
        self.student, self.token = self.make_student()

    def send(self, *events, token=None):
        return self.post("/api/events", {"events": list(events)}, token or self.token)

    def test_quiz_attempt_and_answers_saved(self):
        response = self.send(quiz_event())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["ok"], True)
        attempt = QuizAttempt.objects.get()
        self.assertEqual((attempt.student, attempt.kind, attempt.level, attempt.score, attempt.total), (self.student, "posttest", "easy", 1, 2))
        self.assertEqual(list(attempt.answers.values_list("question_id", "chosen", "correct")), [("mw-order-01", 1, True), ("urls-root-urlconf-01", None, False)])

    def test_simulation_run_saved(self):
        self.send(sim_event())
        run = SimulationRun.objects.get()
        self.assertEqual((run.lab, run.prediction_correct, run.steps_viewed, run.used_run_to_end), ("middleware", True, 4, True))
        self.assertEqual(run.config["request"], "post-no-token")

    def test_marked_on_the_server_not_by_the_browser(self):
        # The browser claims full marks with a wrong option; the server marks it wrong.
        tampered = quiz_event(score=2, total=2, answers=[
            {"questionId": "mw-order-01", "chosen": 0, "correct": True},
            {"questionId": "wsgi-application-01", "chosen": 1, "correct": True},
        ])
        self.assertEqual(self.send(tampered).json()["results"][0]["ok"], True)
        attempt = QuizAttempt.objects.get()
        self.assertEqual((attempt.score, attempt.total), (1, 2))
        self.assertEqual(list(attempt.answers.values_list("correct", flat=True)), [False, True])

    def test_pretest_level_is_ignored(self):
        self.send(quiz_event(kind="pretest", level="hard", answers=[{"questionId": "pre-http-method-01", "chosen": 1}]))
        attempt = QuizAttempt.objects.get()
        self.assertEqual((attempt.level, attempt.score), ("", 1))

    def test_sent_twice_is_stored_once(self):
        event = quiz_event()
        self.send(event)
        response = self.send(event)
        self.assertEqual(response.json()["results"][0], {"id": event["id"], "ok": True, "duplicate": True})
        self.assertEqual(QuizAttempt.objects.count(), 1)

    def test_bad_events_are_rejected_one_by_one(self):
        good = quiz_event()
        bad_cases = [
            quiz_event(answers=[{"questionId": "made-up-01", "chosen": 0, "correct": True}]),
            quiz_event(answers=[{"questionId": "pre-http-method-01", "chosen": 1, "correct": True}]),  # pretest question
            quiz_event(answers=[{"questionId": "mw-template-response-01", "chosen": 0, "correct": True}]),  # hard only
            quiz_event(answers=[{"questionId": "mw-order-01", "chosen": 9, "correct": True}]),  # no option 9
            quiz_event(answers=[{"questionId": "mw-order-01", "chosen": 1}, {"questionId": "mw-order-01", "chosen": 1}]),
            quiz_event(level="expert"),
            quiz_event(kind="midterm"),
            quiz_event(answers=[]),
            {**quiz_event(), "experiment": "someone-else"},
            {**quiz_event(), "type": "unknown"},
            {**quiz_event(), "id": "not-a-uuid"},
            sim_event(stepsViewed=13),
            sim_event(config="text"),
            sim_event(predictionCorrect="yes"),
            "not an object",
        ]
        response = self.send(good, *bad_cases)
        results = response.json()["results"]
        self.assertEqual(results[0]["ok"], True)
        self.assertEqual([r["ok"] for r in results[1:]], [False] * len(bad_cases))
        self.assertEqual(QuizAttempt.objects.count(), 1)
        self.assertEqual(SimulationRun.objects.count(), 0)

    def test_batch_limits(self):
        self.assertEqual(self.post("/api/events", {"events": []}, self.token).status_code, 400)
        self.assertEqual(self.post("/api/events", {"events": [quiz_event() for _ in range(51)]}, self.token).status_code, 400)

    def test_needs_sign_in_and_roll_number(self):
        self.assertEqual(self.post("/api/events", {"events": [quiz_event()]}).status_code, 401)
        _, token = self.make_student(roll=None, email="new@somaiya.edu")
        response = self.send(quiz_event(), token=token)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "roll_number_required")

    def test_invalid_json_and_method(self):
        response = self.client.post("/api/events", "{oops", content_type="application/json", HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.get("/api/events", self.token).status_code, 405)


class FormTests(ApiTestCase):
    def setUp(self):
        self.student, self.token = self.make_student()

    def test_rating_replaces_previous(self):
        self.post("/api/ratings", {"experiment": EXP, "stars": 3}, self.token)
        response = self.post("/api/ratings", {"experiment": EXP, "stars": 5}, self.token)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Rating.objects.get().stars, 5)
        self.assertEqual(self.get("/api/me", self.token).json()["ratings"], {EXP: 5})

    def test_rating_summary_is_public(self):
        self.assertEqual(self.get(f"/api/ratings/summary?experiment={EXP}").json(), {"experiment": EXP, "average": None, "count": 0})
        other, other_token = self.make_student("R009", "z@somaiya.edu")
        self.post("/api/ratings", {"experiment": EXP, "stars": 4}, self.token)
        self.post("/api/ratings", {"experiment": EXP, "stars": 5}, other_token)
        response = self.get(f"/api/ratings/summary?experiment={EXP}")
        self.assertEqual((response.json()["average"], response.json()["count"]), (4.5, 2))
        self.assertIn("max-age", response["Cache-Control"])
        self.assertEqual(self.get("/api/ratings/summary?experiment=nope").status_code, 400)

    def test_rating_range(self):
        for stars in [0, 6, "5", 4.5, True]:
            self.assertEqual(self.post("/api/ratings", {"experiment": EXP, "stars": stars}, self.token).status_code, 400)

    def test_feedback_and_bug_report(self):
        fid, bid = str(uuid.uuid4()), str(uuid.uuid4())
        for _ in range(2):  # resent after a timeout: stored once
            self.assertEqual(self.post("/api/feedback", {"id": fid, "experiment": EXP, "message": "Nice lab"}, self.token).status_code, 201)
            self.assertEqual(self.post("/api/bug-reports", {"id": bid, "experiment": EXP, "page": "simulation", "description": "Next is slow"}, self.token).status_code, 201)
        self.assertEqual(Feedback.objects.get().message, "Nice lab")
        bug = BugReport.objects.get()
        self.assertEqual((bug.page, bug.status), ("simulation", "open"))

    def test_empty_and_long_messages(self):
        self.assertEqual(self.post("/api/feedback", {"id": str(uuid.uuid4()), "experiment": EXP, "message": "   "}, self.token).status_code, 400)
        self.assertEqual(self.post("/api/feedback", {"id": str(uuid.uuid4()), "experiment": EXP, "message": "x" * 2001}, self.token).status_code, 400)

    def test_forms_need_sign_in(self):
        self.assertEqual(self.post("/api/ratings", {"experiment": EXP, "stars": 4}).status_code, 401)


@override_settings(CORS_ALLOWED_ORIGINS=[SITE])
class CorsTests(ApiTestCase):
    def test_preflight_from_lab_site(self):
        response = self.client.options("/api/events", HTTP_ORIGIN=SITE, HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response["Access-Control-Allow-Origin"], SITE)
        self.assertIn("Authorization", response["Access-Control-Allow-Headers"])

    def test_other_site_gets_no_cors_headers(self):
        response = self.client.options("/api/events", HTTP_ORIGIN="https://evil.example", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
        self.assertNotIn("Access-Control-Allow-Origin", response)
        response = self.get("/api/me")
        self.assertNotIn("Access-Control-Allow-Origin", response)

    def test_actual_response_has_header(self):
        response = self.client.get("/api/me", HTTP_ORIGIN=SITE)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response["Access-Control-Allow-Origin"], SITE)
        self.assertIn("Origin", response["Vary"])
        self.assertEqual(response["Access-Control-Expose-Headers"], "Content-Disposition")

    def test_admin_untouched(self):
        response = self.client.get("/admin/login/", HTTP_ORIGIN=SITE)
        self.assertNotIn("Access-Control-Allow-Origin", response)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "admin-tests"}},
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],  # fast, tests only
)
class AdminTestBase(ApiTestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from django.core.cache import cache

        cache.clear()
        User = get_user_model()
        self.prof = User.objects.create_superuser("prof", "prof@somaiya.edu", "correct-horse-battery")
        User.objects.create_user("staff", "s@somaiya.edu", "staff-password-123", is_staff=True)
        self.token = self.login("prof", "correct-horse-battery").json()["token"]

    def login(self, username, password):
        return self.post("/api/admin/login", {"username": username, "password": password})

    def attempt(self, student, kind, level, answers, when=0):
        from datetime import timedelta

        from django.utils import timezone

        from .models import QuizAnswer

        a = QuizAttempt.objects.create(
            student=student, experiment=EXP, client_id=uuid.uuid4(), kind=kind, level=level,
            score=sum(c for _, _, c in answers), total=len(answers),
        )
        QuizAttempt.objects.filter(pk=a.pk).update(created_at=timezone.now() - timedelta(minutes=100 - when))
        QuizAnswer.objects.bulk_create(QuizAnswer(attempt=a, question_id=q, chosen=ch, correct=c) for q, ch, c in answers)
        return a


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "admin-tests"}},
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],  # fast, tests only
)
class AdminApiTests(AdminTestBase):
    def test_login(self):
        self.assertEqual(self.get("/api/admin/me", self.token).json()["admin"]["username"], "prof")
        self.assertEqual(self.login("prof", "wrong").status_code, 401)
        self.assertEqual(self.login("staff", "staff-password-123").status_code, 401)  # staff is not the admin

    def test_lockout_after_repeated_wrong_passwords(self):
        for _ in range(5):
            self.assertEqual(self.login("prof", "wrong").status_code, 401)
        self.assertEqual(self.login("prof", "correct-horse-battery").status_code, 429)

    def test_password_change_signs_out(self):
        self.prof.set_password("a-new-password-456")
        self.prof.save()
        self.assertEqual(self.get("/api/admin/me", self.token).status_code, 401)

    def test_student_token_is_not_an_admin_token(self):
        _, student_token = self.make_student()
        for url in ["/api/admin/me", "/api/admin/overview", "/api/admin/students", "/api/admin/quiz"]:
            self.assertEqual(self.get(url, student_token).status_code, 401, url)
            self.assertEqual(self.get(url).status_code, 401, url)
        self.assertEqual(self.get("/api/me", self.token).status_code, 401)  # and the other way round

    def test_overview_and_learning_gain(self):
        a, _ = self.make_student("R001", "a@somaiya.edu")
        b, _ = self.make_student("R002", "b@somaiya.edu")
        self.make_student("R003", "c@somaiya.edu")  # signed in, did nothing
        # a: pretest 1/4 then a retake 4/4; posttest easy 3/4 -> gain uses the first attempts: 25 -> 75
        self.attempt(a, "pretest", "", [("q1", 0, True), ("q2", 1, False), ("q3", 1, False), ("q4", 1, False)], when=1)
        self.attempt(a, "pretest", "", [("q1", 0, True), ("q2", 0, True), ("q3", 0, True), ("q4", 0, True)], when=2)
        self.attempt(a, "posttest", "easy", [("p1", 0, True), ("p2", 0, True), ("p3", 0, True), ("p4", 1, False)], when=3)
        # b: pretest 2/4 only
        self.attempt(b, "pretest", "", [("q1", 0, True), ("q2", 0, True), ("q3", 1, False), ("q4", None, False)], when=4)
        self.post("/api/events", {"events": [sim_event()]}, make_token(b))
        Rating.objects.create(student=a, experiment=EXP, stars=4)
        Rating.objects.create(student=b, experiment=EXP, stars=5)

        o = self.get("/api/admin/overview", self.token).json()
        self.assertEqual(o["students"], {"signedIn": 3, "active": 2, "activeLast7Days": 2})
        self.assertEqual(o["completion"], {"pretest": 2, "simulation": 1, "posttest": 1})
        self.assertEqual(o["pretest"], {"students": 2, "averageFirst": 37.5, "medianFirst": 37.5, "attempts": 3})
        self.assertEqual(o["posttest"]["easy"]["averageFirst"], 75.0)
        self.assertEqual(o["learningGain"], {"students": 1, "pretest": 25.0, "posttest": 75.0, "gain": 50.0})
        self.assertEqual(o["simulation"]["middleware"]["predictionAccuracy"], 100.0)
        self.assertEqual(o["ratings"]["average"], 4.5)
        self.assertEqual(o["ratings"]["distribution"]["5"], 1)

    def test_students_and_detail(self):
        a, _ = self.make_student("R001", "a@somaiya.edu")
        self.attempt(a, "pretest", "", [("q1", 0, True), ("q2", 1, False)], when=1)
        self.attempt(a, "pretest", "", [("q1", 0, True), ("q2", 0, True)], when=2)
        rows = self.get("/api/admin/students", self.token).json()["students"]
        row = next(r for r in rows if r["rollNumber"] == "R001")
        self.assertEqual(row["quizzes"]["pretest:"]["first"]["percent"], 50.0)
        self.assertEqual(row["quizzes"]["pretest:"]["best"]["percent"], 100.0)
        self.assertEqual(row["quizzes"]["pretest:"]["attempts"], 2)
        detail = self.get(f"/api/admin/students/{a.pk}", self.token).json()
        self.assertEqual(len(detail["attempts"]), 2)
        self.assertEqual(detail["attempts"][0]["answers"][1], {"questionId": "q2", "chosen": 0, "correct": True})
        self.assertEqual(self.get("/api/admin/students/99999", self.token).status_code, 404)

    def test_quiz_analysis_first_and_all(self):
        a, _ = self.make_student("R001", "a@somaiya.edu")
        b, _ = self.make_student("R002", "b@somaiya.edu")
        self.attempt(a, "posttest", "easy", [("p1", 2, False), ("p2", 0, True)], when=1)
        self.attempt(a, "posttest", "easy", [("p1", 1, True), ("p2", 0, True)], when=2)
        self.attempt(b, "posttest", "easy", [("p1", 2, False), ("p2", None, False)], when=3)
        self.attempt(b, "posttest", "hard", [("h1", 0, True)], when=4)

        first = self.get("/api/admin/quiz?kind=posttest&level=easy", self.token).json()
        self.assertEqual(first["count"], 2)
        self.assertEqual(first["questions"]["p1"], {"answered": 2, "correct": 0, "skipped": 0, "percentCorrect": 0.0, "chosen": {"2": 2}})
        self.assertEqual(first["questions"]["p2"]["skipped"], 1)
        self.assertEqual(first["questions"]["p2"]["percentCorrect"], 50.0)
        self.assertEqual(first["scores"], {"0/2": 1, "1/2": 1})

        every = self.get("/api/admin/quiz?kind=posttest&level=easy&attempts=all", self.token).json()
        self.assertEqual(every["count"], 3)
        self.assertEqual(every["questions"]["p1"]["chosen"], {"1": 1, "2": 2})
        self.assertEqual(self.get("/api/admin/quiz?kind=midterm", self.token).status_code, 400)

    def test_feedback_and_bug_inboxes(self):
        a, token = self.make_student("R001", "a@somaiya.edu")
        self.post("/api/feedback", {"id": str(uuid.uuid4()), "experiment": EXP, "message": "First"}, token)
        self.post("/api/feedback", {"id": str(uuid.uuid4()), "experiment": EXP, "message": "Second"}, token)
        feedback = self.get("/api/admin/feedback", self.token).json()["feedback"]
        self.assertEqual([f["message"] for f in feedback], ["Second", "First"])  # newest first
        self.assertEqual(feedback[0]["student"]["rollNumber"], "R001")

        self.post("/api/bug-reports", {"id": str(uuid.uuid4()), "experiment": EXP, "page": "aim", "description": "Typo"}, token)
        bugs = self.get("/api/admin/bugs", self.token).json()
        self.assertEqual(bugs["counts"], {"open": 1, "fixed": 0})
        bug_id = bugs["bugs"][0]["id"]
        response = self.post(f"/api/admin/bugs/{bug_id}", {"status": "fixed"}, self.token)
        self.assertEqual(response.json()["bug"]["status"], "fixed")
        self.assertEqual(self.get("/api/admin/bugs?status=open", self.token).json()["bugs"], [])
        self.assertEqual(self.get("/api/admin/bugs?status=fixed", self.token).json()["counts"], {"open": 0, "fixed": 1})
        self.assertEqual(self.post(f"/api/admin/bugs/{bug_id}", {"status": "gone"}, self.token).status_code, 400)
        self.assertEqual(self.post("/api/admin/bugs/99999", {"status": "fixed"}, self.token).status_code, 404)
        self.assertEqual(self.post(f"/api/admin/bugs/{bug_id}", {"status": "open"}, token).status_code, 401)  # students cannot

    def test_simulation_grouped_by_setup(self):
        _, ta = self.make_student("R001", "a@somaiya.edu")
        _, tb = self.make_student("R002", "b@somaiya.edu")
        csrf = {"config": {"middleware": ["csrf"], "request": "postNoToken", "view": "render"}}
        get = {"config": {"middleware": ["csrf"], "request": "get", "view": "render"}}
        wrong = {"prediction": {"status": "200", "viewRuns": "yes"}, "predictionCorrect": False}
        self.post("/api/events", {"events": [sim_event(**csrf, **wrong), sim_event(**csrf, predictionCorrect=True), sim_event(**get, predictionCorrect=True)]}, ta)
        self.post("/api/events", {"events": [sim_event(**csrf, **wrong), sim_event(**{"config": {"middleware": ["csrf"], "view": "render", "request": "postNoToken"}}, prediction={}, predictionCorrect=None)]}, tb)
        data = self.get("/api/admin/simulation", self.token).json()
        self.assertEqual(data["labs"], {"middleware": 5})
        first = data["scenarios"][0]  # hardest first
        self.assertEqual(first["config"]["request"], "postNoToken")
        self.assertEqual((first["runs"], first["students"], first["predictions"], first["correct"]), (4, 2, 3, 1))
        self.assertEqual(first["accuracy"], 33.3)
        self.assertEqual(first["wrongPredictions"], [{"prediction": {"status": "200", "viewRuns": "yes"}, "count": 2}])
        self.assertEqual(data["scenarios"][1]["accuracy"], 100.0)
        self.assertEqual(self.get("/api/admin/simulation?lab=urls", self.token).json()["scenarios"], [])


class PackagingTests(TestCase):
    def test_answer_keys_match_the_question_banks(self):
        import shutil
        import subprocess
        from pathlib import Path

        if shutil.which("node") is None:
            self.skipTest("Node is not installed")
        root = Path(__file__).resolve().parent.parent.parent
        result = subprocess.run(
            ["node", "scripts/export-question-banks.mjs", "--check"], cwd=root, capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_pyproject_dependencies_match_requirements(self):
        import tomllib
        from pathlib import Path

        root = Path(__file__).resolve().parent.parent
        pyproject = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))["project"]["dependencies"]
        requirements = [
            line.strip()
            for line in (root / "requirements.txt").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]
        self.assertEqual(sorted(pyproject), sorted(requirements), "Update pyproject.toml and requirements.txt together.")


class ExportTests(AdminTestBase):
    def csv_rows(self, table):
        import csv
        import io

        response = self.get(f"/api/admin/export?table={table}", self.token)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/csv"))
        self.assertIn(f"{EXP}-{table}-", response["Content-Disposition"])
        text = response.content.decode("utf-8")
        self.assertTrue(text.startswith("﻿"))  # so Excel reads UTF-8
        return list(csv.reader(io.StringIO(text[1:])))

    def test_students_and_attempts(self):
        a, _ = self.make_student("R001", "a@somaiya.edu")
        self.attempt(a, "pretest", "", [("q1", 0, True), ("q2", 1, False)], when=1)
        self.attempt(a, "posttest", "hard", [("h1", 0, True)], when=2)
        rows = self.csv_rows("students")
        self.assertEqual(rows[0][:6], ["Roll number", "Name", "Email", "Pretest first", "Pretest best", "Pretest attempts"])
        row = next(r for r in rows if r[0] == "R001")
        self.assertEqual(row[3:6], ["1/2", "1/2", "1"])
        hard = rows[0].index("Posttest hard best")
        self.assertEqual(row[hard], "1/1")
        attempts = self.csv_rows("attempts")
        self.assertEqual([r[2] for r in attempts[1:]], ["pretest", "posttest"])
        self.assertEqual(len(self.csv_rows("answers")), 1 + 3)

    def test_formulas_are_neutralised(self):
        _, token = self.make_student("R001", "a@somaiya.edu")
        self.post("/api/feedback", {"id": str(uuid.uuid4()), "experiment": EXP, "message": '=HYPERLINK("http://x")'}, token)
        rows = self.csv_rows("feedback")
        self.assertEqual(rows[1][3], '\'=HYPERLINK("http://x")')

    def test_every_table_and_access(self):
        for table in ["students", "attempts", "answers", "runs", "feedback", "bugs"]:
            self.csv_rows(table)
        self.assertEqual(self.get("/api/admin/export?table=passwords", self.token).status_code, 400)
        self.assertEqual(self.get("/api/admin/export?table=students").status_code, 401)
