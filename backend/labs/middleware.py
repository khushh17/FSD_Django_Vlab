from django.conf import settings
from django.http import HttpResponse


class CorsMiddleware:
    """
    Lets the lab site (a different origin) call /api/. Only origins listed in
    CORS_ALLOWED_ORIGINS get the CORS headers; the browser blocks every other site.
    The API uses a bearer token, not cookies, so no credentials header is sent.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        origin = request.headers.get("Origin")
        allowed = origin in settings.CORS_ALLOWED_ORIGINS
        is_preflight = request.method == "OPTIONS" and "Access-Control-Request-Method" in request.headers

        if is_preflight:
            response = HttpResponse(status=204)
            if allowed:
                response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
                response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
                response["Access-Control-Max-Age"] = "600"
        else:
            response = self.get_response(request)

        if allowed:
            response["Access-Control-Allow-Origin"] = origin
        response["Vary"] = ", ".join(filter(None, [response.get("Vary"), "Origin"]))
        return response
