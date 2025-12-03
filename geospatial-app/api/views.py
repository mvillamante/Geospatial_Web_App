from django.http import JsonResponse
from . import satellite

def copernicus_test(request):
    data = satellite.fetch_copernicus()
    return JsonResponse(data, safe=False)
