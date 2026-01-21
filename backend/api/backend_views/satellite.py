import os
from datetime import datetime, timedelta

import requests
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view

COPERNICUS_CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"


def _get_access_token() -> str:
    if not COPERNICUS_CLIENT_ID or not COPERNICUS_CLIENT_SECRET:
        raise ValueError("Copernicus credentials are not configured")

    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": COPERNICUS_CLIENT_ID,
            "client_secret": COPERNICUS_CLIENT_SECRET,
        },
        timeout=20,
    )
    response.raise_for_status()
    return response.json()["access_token"]


@api_view(["GET"])
def get_ndvi_image(request):
    """
    Returns an NDVI (green index) image for Cabuyao using Copernicus Process API.
    Optional query params:
      - bbox=minLon,minLat,maxLon,maxLat
      - from=YYYY-MM-DD
      - to=YYYY-MM-DD
      - maxCloud=0-100
      - expandDays=N (expand search window by N days on each side for clearer images)
    """
    try:
        bbox_param = request.GET.get("bbox")
        if bbox_param:
            bbox = [float(x) for x in bbox_param.split(",")]
            if len(bbox) != 4:
                return JsonResponse({"error": "bbox must have 4 values"}, status=400)
        else:
            # Cabuyao, Laguna (expanded to include Gulod, Baclaran, Mamatid)
            bbox = [121.02, 14.16, 121.20, 14.34]

        from_date = request.GET.get("from")
        to_date = request.GET.get("to")
        end_date = datetime.utcnow().date()

        if from_date and to_date:
            try:
                parsed_from = datetime.strptime(from_date, "%Y-%m-%d").date()
                parsed_to = datetime.strptime(to_date, "%Y-%m-%d").date()
            except ValueError:
                parsed_from = None
                parsed_to = None
        else:
            parsed_from = None
            parsed_to = None

        if not parsed_from or not parsed_to:
            parsed_to = end_date
            parsed_from = end_date - timedelta(days=30)

        # Clamp future dates to today
        if parsed_to > end_date:
            parsed_to = end_date
        if parsed_from > parsed_to:
            parsed_from = parsed_to - timedelta(days=30)

        # Optional: expand the search window slightly to find clearer imagery
        # Default to 5 days for specific month requests to stay close to the target period
        expand_days = int(request.GET.get("expandDays", "5"))
        expand_days = max(0, min(expand_days, 30))  # Cap at 30 days expansion

        search_from = parsed_from - timedelta(days=expand_days)
        search_to = parsed_to + timedelta(days=expand_days)

        # Clamp search_to to today
        if search_to > end_date:
            search_to = end_date

        from_date = search_from.isoformat()
        to_date = search_to.isoformat()

        # Lower default cloud coverage for clearer NDVI imagery
        max_cloud = int(request.GET.get("maxCloud", "5"))
        max_cloud = max(0, min(max_cloud, 100))

        try:
            access_token = _get_access_token()
        except requests.RequestException as exc:
            details = getattr(exc.response, "text", None)
            return JsonResponse(
                {"error": "Copernicus token request failed", "details": details or str(exc)},
                status=502,
            )

        # Evalscript with Scene Classification Layer (SCL) for cloud masking
        # SCL values: 4=Vegetation, 5=Bare Soil, 6=Water (clear pixels)
        # Clouds/shadows: 3=Cloud Shadow, 8=Cloud Med, 9=Cloud High, 10=Cirrus
        evalscript = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL"] }],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  let scl = sample.SCL;
  
  // Check if pixel is cloudy or shadowy - use a neutral color for these
  // SCL: 3=cloud shadow, 8=cloud medium prob, 9=cloud high prob, 10=thin cirrus
  let isCloudy = (scl === 3 || scl === 8 || scl === 9 || scl === 10);
  
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
  
  // For cloudy pixels, show a muted version
  if (isCloudy) {
    // Return a light gray to indicate cloud-affected area
    return [0.85, 0.85, 0.85];
  }
  
  // Stretch NDVI range for clearer contrast
  let scaled = Math.max(0.0, Math.min(1.0, (ndvi + 0.1) / 0.9));
  // Slight gamma boost to emphasize greens
  scaled = Math.pow(scaled, 0.8);

  // Enhanced color ramp (brown -> yellow-green -> deep green)
  if (scaled < 0.2) return [0.45, 0.25, 0.12];
  if (scaled < 0.4) return [0.9, 0.75, 0.35];
  if (scaled < 0.6) return [0.65, 0.85, 0.25];
  if (scaled < 0.8) return [0.2, 0.75, 0.25];
  return [0.05, 0.55, 0.12];
}
"""

        payload = {
            "input": {
                "bounds": {
                    "bbox": bbox,
                    "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
                },
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "timeRange": {
                                "from": f"{from_date}T00:00:00Z",
                                "to": f"{to_date}T23:59:59Z",
                            },
                            "maxCloudCoverage": max_cloud,
                            "mosaickingOrder": "leastCC",
                        },
                    }
                ],
            },
            "output": {
                "width": 1024,
                "height": 1024,
                "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
            },
            "evalscript": evalscript,
        }

        response = requests.post(
            PROCESS_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=90,
        )

        if not response.ok:
            return JsonResponse(
                {
                    "error": "Copernicus process request failed",
                    "status": response.status_code,
                    "details": response.text[:2000],
                },
                status=502,
            )

        return HttpResponse(response.content, content_type="image/png")
    except requests.RequestException as exc:
        details = getattr(exc.response, "text", None)
        return JsonResponse(
            {"error": "Copernicus request failed", "details": details or str(exc)},
            status=502,
        )
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"error": "Unexpected error", "details": str(exc)}, status=500)