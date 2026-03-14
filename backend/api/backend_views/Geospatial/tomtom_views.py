import os

import requests
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

TOMTOM_ROADS_TILE_URL = "https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png"
TOMTOM_TRAFFIC_TILE_URL = "https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png"


def _fetch_tomtom_tile(url: str) -> HttpResponse:
    if not TOMTOM_API_KEY:
        return JsonResponse({"error": "TomTom API key is not configured"}, status=500)

    try:
        response = requests.get(url, params={"key": TOMTOM_API_KEY}, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        return JsonResponse(
            {"error": "Failed to fetch TomTom tile", "details": str(exc)},
            status=502,
        )

    tile_response = HttpResponse(
        response.content,
        content_type=response.headers.get("Content-Type", "image/png"),
    )

    cache_header = response.headers.get("Cache-Control")
    if cache_header:
        tile_response["Cache-Control"] = cache_header

    return tile_response


@api_view(["GET"])
@permission_classes([AllowAny])
def tomtom_roads_tile(request, z: int, x: int, y: int):
    tile_url = TOMTOM_ROADS_TILE_URL.format(z=z, x=x, y=y)
    return _fetch_tomtom_tile(tile_url)


@api_view(["GET"])
@permission_classes([AllowAny])
def tomtom_traffic_tile(request, z: int, x: int, y: int):
    tile_url = TOMTOM_TRAFFIC_TILE_URL.format(z=z, x=x, y=y)
    return _fetch_tomtom_tile(tile_url)
