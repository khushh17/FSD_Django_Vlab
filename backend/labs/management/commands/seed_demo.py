"""
Fill the local database with made-up demo students, so the admin pages can be tried out.

    python manage.py seed_demo            # add the demo data (and the dev admin, if set)
    python manage.py seed_demo --clear    # remove all demo data

Only runs with DJANGO_DEBUG=1. Demo students have roll numbers 16099999001 onwards
(branch 999, which no real branch uses), Google IDs starting demo: and emails
demo.student.N@... so they are easy to tell apart and remove. If DEV_ADMIN_USERNAME and
DEV_ADMIN_PASSWORD are set in backend/.env, a superuser with those details is created
for signing in to the admin pages locally.
"""

import json
import os
import random
import subprocess
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from labs.models import BugReport, Feedback, QuizAnswer, QuizAttempt, Rating, SimulationRun, Student

ROOT = Path(settings.BASE_DIR).parent
EXPERIMENT = "django-request-response"
STUDENTS = 24
DEMO_ROLL = "16099999"  # + 3-digit serial: "160", branch 999, year 99

DEFAULT_MW = ["SecurityMiddleware", "SessionMiddleware", "CommonMiddleware", "CsrfViewMiddleware",
              "AuthenticationMiddleware", "MessageMiddleware", "XFrameOptionsMiddleware"]
URLS = [{"kind": "view", "route": "blog/<int:year>/", "view": "post_by_year", "name": "by-year"}]
# (lab, config, real outcome, the right prediction, typical wrong predictions)
SCENARIOS = [
    ("middleware", {"middleware": DEFAULT_MW, "request": "get", "view": "render"},
     {"status": 200, "viewCalled": True, "source": "post_detail view (render)", "error": None},
     {"status": "200", "viewRuns": "yes"}, [{"status": "403", "viewRuns": "no"}]),
    ("middleware", {"middleware": DEFAULT_MW, "request": "postNoToken", "view": "render"},
     {"status": 403, "viewCalled": False, "source": "CsrfViewMiddleware.process_view", "error": None},
     {"status": "403", "viewRuns": "no"}, [{"status": "403", "viewRuns": "yes"}, {"status": "200", "viewRuns": "yes"}]),
    ("urls", {"preset": "slash", "urlpatterns": URLS, "request": {"method": "GET", "path": "/blog/2024", "appendSlash": True, "debug": False}},
     {"type": "redirect", "key": "redirect"}, {"outcome": "redirect"}, [{"outcome": "not-found"}]),
    ("urls", {"preset": "slash", "urlpatterns": URLS, "request": {"method": "POST", "path": "/blog/2024", "appendSlash": True, "debug": True}},
     {"type": "runtime-error", "key": "runtime-error"}, {"outcome": "runtime-error"}, [{"outcome": "redirect"}, {"outcome": "not-found"}]),
]


class Command(BaseCommand):
    help = "Add (or with --clear, remove) made-up demo students for trying the admin pages."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Remove the demo data instead.")

    def handle(self, *args, clear=False, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DJANGO_DEBUG=1.")
        # Old demo rows used roll numbers DEMO001...; current ones have Google IDs demo:N.
        deleted, _ = Student.objects.filter(Q(google_sub__startswith="demo:") | Q(roll_number__startswith="DEMO")).delete()
        if clear:
            self.stdout.write(f"Removed the demo data ({deleted} rows).")
            return
        self._dev_admin()
        banks = json.loads(
            subprocess.run(
                ["node", str(ROOT / "scripts" / "export-question-banks.mjs")],
                capture_output=True, text=True, check=True, cwd=ROOT,
            ).stdout
        )[EXPERIMENT]
        with transaction.atomic():
            self._seed(banks, random.Random(42))
        self.stdout.write(self.style.SUCCESS(f"Added {STUDENTS} demo students (roll numbers {DEMO_ROLL}001 to {DEMO_ROLL}{STUDENTS:03})."))

    def _dev_admin(self):
        username, password = os.environ.get("DEV_ADMIN_USERNAME"), os.environ.get("DEV_ADMIN_PASSWORD")
        if not (username and password):
            return
        User = get_user_model()
        user = User.objects.filter(username=username).first() or User(username=username)
        user.is_staff = user.is_superuser = True
        if not user.check_password(password):  # re-hashing would sign the dev admin out
            user.set_password(password)
        user.save()
        self.stdout.write(f"Dev admin '{username}' is ready (password from backend/.env).")

    def _seed(self, banks, rnd):
        now = timezone.now()
        # Each question has a difficulty and one tempting wrong option (a "misconception").
        traits = {}
        for q in banks["pretest"] + banks["posttest"]:
            wrong = [i for i in range(q["options"]) if i != q["answer"]]
            traits[q["id"]] = (rnd.uniform(-0.25, 0.2), rnd.choice(wrong), wrong)

        def answer(q, skill):
            difficulty, trap, wrong = traits[q["id"]]
            if rnd.random() < 0.03:
                return None, False
            if rnd.random() < min(0.97, max(0.05, skill + difficulty)):
                return q["answer"], True
            return (trap if rnd.random() < 0.6 else rnd.choice(wrong)), False

        def attempt(student, kind, level, questions, skill, when, retake=False):
            answers = [(q["id"], *answer(q, skill)) for q in questions]
            a = QuizAttempt.objects.create(
                student=student, experiment=EXPERIMENT, client_id=uuid.uuid4(), kind=kind, level=level,
                score=sum(c for _, _, c in answers), total=len(answers),
                duration_seconds=rnd.randint(90, 900), retake=retake,
            )
            QuizAttempt.objects.filter(pk=a.pk).update(created_at=when)
            QuizAnswer.objects.bulk_create(QuizAnswer(attempt=a, question_id=i, chosen=ch, correct=c) for i, ch, c in answers)

        for n in range(1, STUDENTS + 1):
            start = now - timedelta(days=rnd.uniform(0, 20), hours=rnd.uniform(0, 8))
            s = Student.objects.create(
                google_sub=f"demo:{n}", email=f"demo.student.{n}@{settings.ALLOWED_EMAIL_DOMAIN}",
                name=f"Demo Student {n}", roll_number=f"{DEMO_ROLL}{n:03}", last_seen_at=start + timedelta(hours=2),
            )
            skill = rnd.uniform(0.3, 0.8)
            if n % 8 == 0:
                continue  # signed in, did nothing
            attempt(s, "pretest", "", banks["pretest"], skill, start)
            if rnd.random() < 0.3:
                attempt(s, "pretest", "", banks["pretest"], skill + 0.15, start + timedelta(minutes=12), retake=True)

            for k in range(rnd.randint(0, 6)):
                lab, config, outcome, right, wrong = rnd.choice(SCENARIOS)
                predicted = rnd.random() < 0.8
                correct = predicted and rnd.random() < min(0.95, 0.35 + skill)
                total = rnd.randint(6, 20)
                jumped = rnd.random() < 0.35
                run = SimulationRun.objects.create(
                    student=s, experiment=EXPERIMENT, client_id=uuid.uuid4(), lab=lab, config=config,
                    prediction=(right if correct else rnd.choice(wrong)) if predicted else {},
                    outcome=outcome, prediction_correct=correct if predicted else None,
                    steps_total=total, steps_viewed=rnd.randint(1, total - 1) if jumped else total, used_run_to_end=jumped,
                )
                SimulationRun.objects.filter(pk=run.pk).update(created_at=start + timedelta(minutes=30 + 5 * k))

            if n % 5 == 4:
                continue  # stopped before the posttest
            level = rnd.choice(["easy", "easy", "medium", "medium", "hard"])
            pool = [q for q in banks["posttest"] if level in q["levels"]]
            attempt(s, "posttest", level, rnd.sample(pool, min(10, len(pool))), skill + 0.15, start + timedelta(hours=1))
            if rnd.random() < 0.25:
                attempt(s, "posttest", level, rnd.sample(pool, min(10, len(pool))), skill + 0.25, start + timedelta(hours=1, minutes=20), retake=True)
            if rnd.random() < 0.6:
                Rating.objects.create(student=s, experiment=EXPERIMENT, stars=rnd.choice([3, 4, 4, 5, 5]))

        demo = list(Student.objects.filter(google_sub__startswith="demo:").order_by("roll_number"))
        for s, text in zip(demo[:3], [
            "Demo feedback: the step-by-step log made the middleware order clear.",
            "Demo feedback: the URL lab was confusing at first; an example walkthrough would help.",
            "Demo feedback: please add more hard posttest questions.",
        ]):
            Feedback.objects.create(student=s, experiment=EXPERIMENT, client_id=uuid.uuid4(), message=text)
        BugReport.objects.create(
            student=demo[3], experiment=EXPERIMENT, client_id=uuid.uuid4(), page="simulation",
            description="Demo bug: the step log jumped to the top once on a phone.",
        )
