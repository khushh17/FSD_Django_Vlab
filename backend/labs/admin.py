"""
Django's built-in admin, for the professor: browse, search, filter and export raw records.
The student-facing data is read-only here; only roll numbers and bug status are editable.
"""

from django.contrib import admin

from .models import BugReport, Feedback, QuizAnswer, QuizAttempt, Rating, SimulationRun, Student


class ReadOnlyAdmin(admin.ModelAdmin):
    """Records come from students' browsers; the admin views them but does not add them."""

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["roll_number", "name", "email", "created_at", "last_seen_at"]
    search_fields = ["roll_number", "name", "email"]
    # The roll number can be corrected here (students cannot change it themselves).
    fields = ["roll_number", "name", "email", "google_sub", "created_at", "last_seen_at"]
    readonly_fields = ["name", "email", "google_sub", "created_at", "last_seen_at"]

    def has_add_permission(self, request):
        return False


class QuizAnswerInline(admin.TabularInline):
    model = QuizAnswer
    fields = ["question_id", "chosen", "correct"]
    readonly_fields = fields
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ReadOnlyAdmin):
    list_display = ["created_at", "student", "experiment", "kind", "level", "score", "total", "retake", "duration_seconds"]
    list_filter = ["experiment", "kind", "level", "retake"]
    search_fields = ["student__roll_number", "student__email", "student__name"]
    date_hierarchy = "created_at"
    inlines = [QuizAnswerInline]


@admin.register(QuizAnswer)
class QuizAnswerAdmin(ReadOnlyAdmin):
    list_display = ["question_id", "chosen", "correct", "attempt"]
    list_filter = ["correct", "attempt__experiment", "attempt__kind"]
    search_fields = ["question_id", "attempt__student__roll_number"]


@admin.register(SimulationRun)
class SimulationRunAdmin(ReadOnlyAdmin):
    list_display = ["created_at", "student", "experiment", "lab", "prediction_correct", "steps_viewed", "steps_total", "used_run_to_end"]
    list_filter = ["experiment", "lab", "prediction_correct", "used_run_to_end"]
    search_fields = ["student__roll_number", "student__email", "student__name"]
    date_hierarchy = "created_at"


@admin.register(Rating)
class RatingAdmin(ReadOnlyAdmin):
    list_display = ["updated_at", "student", "experiment", "stars"]
    list_filter = ["experiment", "stars"]
    search_fields = ["student__roll_number", "student__email"]


@admin.register(Feedback)
class FeedbackAdmin(ReadOnlyAdmin):
    list_display = ["created_at", "student", "experiment", "message"]
    list_filter = ["experiment"]
    search_fields = ["message", "student__roll_number", "student__email"]
    date_hierarchy = "created_at"


@admin.register(BugReport)
class BugReportAdmin(admin.ModelAdmin):
    list_display = ["created_at", "status", "experiment", "page", "description", "student"]
    list_filter = ["status", "experiment", "page"]
    list_editable = ["status"]
    search_fields = ["description", "student__roll_number", "student__email"]
    fields = ["status", "experiment", "page", "description", "student", "client_id", "created_at"]
    readonly_fields = ["experiment", "page", "description", "student", "client_id", "created_at"]

    def has_add_permission(self, request):
        return False
