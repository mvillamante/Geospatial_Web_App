#For Login, Logout, and Registration APIs

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

def role_required(roles=[]):
    def decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({"error": "Unauthorized"}, status=401)
            if request.user.role not in roles:
                return JsonResponse({"error": "Forbidden"}, status=403)
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

@login_required
@role_required(roles=['Admin'])
def admin_dashboard(request):
    return JsonResponse({"message": "Welcome Admin!"})
