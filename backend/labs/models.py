from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models

# TODO: confirm Somaiya's roll number format with the professor; this accepts letters,
# digits, '/' and '-', 4 to 20 characters.
roll_number_validator = RegexValidator(
    r"^[A-Z0-9/-]{4,20}$",
    "Enter your roll number: 4 to 20 letters, digits, '/' or '-'.",
)


class Student(models.Model):
    """A student who signed in with Google. The roll number is entered once, after the first sign-in."""

    google_sub = models.CharField("Google account ID", max_length=255, unique=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=200, blank=True)
    roll_number = models.CharField(
        max_length=20, unique=True, null=True, blank=True, validators=[roll_number_validator]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["roll_number", "email"]

    def __str__(self):
        return f"{self.roll_number or '(no roll number)'} {self.email}"


class Event(models.Model):
    """
    Fields shared by everything a student sends. `client_id` is generated in the browser, so
    a record that is sent twice (for example after a dropped connection) is stored once.
    """

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="%(class)ss")
    experiment = models.CharField(max_length=80, db_index=True)
    client_id = models.UUIDField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class QuizAttempt(Event):
    PRETEST = "pretest"
    POSTTEST = "posttest"
    KINDS = [(PRETEST, "Pretest"), (POSTTEST, "Posttest")]

    kind = models.CharField(max_length=10, choices=KINDS)
    level = models.CharField(max_length=20, blank=True, help_text="Posttest level; blank for the pretest.")
    score = models.PositiveSmallIntegerField()
    total = models.PositiveSmallIntegerField()
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    retake = models.BooleanField(default=False, help_text="Shuffled retake of the same level.")

    class Meta(Event.Meta):
        pass

    def __str__(self):
        return f"{self.student} {self.kind} {self.level} {self.score}/{self.total}"


class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question_id = models.CharField(max_length=100, db_index=True)
    # Index of the chosen option as authored in the question bank (not as shuffled on screen).
    chosen = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Blank when skipped.")
    correct = models.BooleanField()

    class Meta:
        ordering = ["attempt", "id"]

    def __str__(self):
        return f"{self.question_id}: {self.chosen} ({'right' if self.correct else 'wrong'})"


class SimulationRun(Event):
    """One simulation run that reached its last step."""

    lab = models.CharField(max_length=40)
    config = models.JSONField(help_text="The setup the student chose.")
    prediction = models.JSONField(default=dict, blank=True)
    outcome = models.JSONField()
    prediction_correct = models.BooleanField(null=True, blank=True, help_text="Blank when no prediction was made.")
    steps_total = models.PositiveSmallIntegerField()
    steps_viewed = models.PositiveSmallIntegerField(help_text="Steps reached with Next before the end.")
    used_run_to_end = models.BooleanField(default=False)

    class Meta(Event.Meta):
        pass

    def __str__(self):
        return f"{self.student} {self.lab} {self.created_at:%Y-%m-%d %H:%M}"


class Rating(models.Model):
    """One rating per student per experiment; rating again replaces it."""

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="ratings")
    experiment = models.CharField(max_length=80, db_index=True)
    stars = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [models.UniqueConstraint(fields=["student", "experiment"], name="one_rating_per_experiment")]

    def __str__(self):
        return f"{self.student} {self.experiment} {self.stars}★"


class Feedback(Event):
    message = models.TextField(max_length=2000)

    class Meta(Event.Meta):
        verbose_name_plural = "feedback"

    def __str__(self):
        return f"{self.student} {self.created_at:%Y-%m-%d}"


class BugReport(Event):
    OPEN = "open"
    FIXED = "fixed"
    STATUSES = [(OPEN, "Open"), (FIXED, "Fixed")]

    page = models.CharField(max_length=80, blank=True, help_text="The tab the student was on.")
    description = models.TextField(max_length=2000)
    status = models.CharField(max_length=10, choices=STATUSES, default=OPEN)

    class Meta(Event.Meta):
        pass

    def __str__(self):
        return f"{self.experiment} / {self.page}: {self.description[:40]}"
