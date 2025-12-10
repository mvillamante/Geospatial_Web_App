from django.http import JsonResponse
from .views.satellite import fetch_copernicus

def copernicus_test(request):
    data = fetch_copernicus()
    return JsonResponse(data, safe=False)
