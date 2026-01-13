import requests
from django.http import JsonResponse

def get_copernicus(request):
    # Coordinates for Cabuyao, Laguna
    lat = request.GET.get("lat", "14.2743")
    lon = request.GET.get("lon", "121.1196")
    url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=1"
    r = requests.get(url)
    data = r.json()
    return JsonResponse(data, safe=False)