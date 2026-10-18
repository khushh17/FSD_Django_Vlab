from django.contrib import admin
from django.urls import path

from labs import admin_views, views

admin.site.site_header = "Virtual Labs admin"
admin.site.site_title = "Virtual Labs admin"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/google", views.google_sign_in),
    path("api/auth/dev", views.dev_sign_in),
    path("api/me", views.me),
    path("api/me/roll-number", views.set_roll_number),
    path("api/events", views.events),
    path("api/ratings", views.rate),
    path("api/feedback", views.feedback),
    path("api/bug-reports", views.bug_report),
    path("api/admin/login", admin_views.login),
    path("api/admin/me", admin_views.me),
    path("api/admin/overview", admin_views.overview),
    path("api/admin/students", admin_views.students),
    path("api/admin/students/<int:student_id>", admin_views.student_detail),
    path("api/admin/quiz", admin_views.quiz),
    path("api/admin/feedback", admin_views.feedback_list),
    path("api/admin/bugs", admin_views.bug_list),
    path("api/admin/bugs/<int:bug_id>", admin_views.bug_update),
    path("api/admin/simulation", admin_views.simulation),
]
