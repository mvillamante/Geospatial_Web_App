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
      - year=YYYY
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
            # Cabuyao, Laguna - centered on municipality with coverage of key barangays
            # Covers: Gulod, Baclaran, Mamatid, Sala, Banay-Banay, Marinig, Bigaa
            # minLon, minLat, maxLon, maxLat
            bbox = [121.06, 14.20, 121.18, 14.32]

        year_param = request.GET.get("year")
        from_date = request.GET.get("from")
        to_date = request.GET.get("to")
        end_date = datetime.utcnow().date()

        if year_param and not (from_date or to_date):
            try:
                parsed_year = int(year_param)
                parsed_from = datetime(parsed_year, 1, 1).date()
                parsed_to = datetime(parsed_year, 12, 31).date()
            except ValueError:
                parsed_from = None
                parsed_to = None
        elif from_date and to_date:
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
        # Default to 10 days for yearly requests to improve chance of cloud-free mosaics
        default_expand = "10" if year_param and not (from_date or to_date) else "5"
        expand_days = int(request.GET.get("expandDays", default_expand))
        expand_days = max(0, min(expand_days, 30))  # Cap at 30 days expansion

        search_from = parsed_from - timedelta(days=expand_days)
        search_to = parsed_to + timedelta(days=expand_days)

        # Clamp search_to to today
        if search_to > end_date:
            search_to = end_date

        from_date = search_from.isoformat()
        to_date = search_to.isoformat()

        # Lower default cloud coverage for clearer NDVI imagery
        # With temporal mosaicking, we can use slightly higher threshold
        max_cloud = int(request.GET.get("maxCloud", "15"))
        max_cloud = max(0, min(max_cloud, 100))

        try:
            access_token = _get_access_token()
        except ValueError as exc:
            return JsonResponse(
                {"error": "Copernicus credentials not configured", "details": str(exc)},
                status=500,
            )
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
  var scl = sample.SCL;
  
  // Check if pixel is cloudy or invalid
  // SCL: 0=No data, 1=Saturated, 3=Shadow, 8=Cloud Med, 9=Cloud High, 10=Cirrus, 11=Snow
  var isBad = (scl === 0 || scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11);
  
  // For bad/cloudy pixels, show light gray
  if (isBad) {
    return [0.9, 0.9, 0.9];
  }
  
  // Calculate NDVI
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
  
  // Enhanced NDVI color ramp for Cabuyao vegetation analysis
  // Optimized for tropical/agricultural areas
  // Red tones for low vegetation, transitioning to green for healthy vegetation
  
  if (ndvi < -0.1) {
    // Water/bare surfaces - dark blue-gray
    return [0.24, 0.31, 0.47];
  } else if (ndvi < 0.1) {
    // Very low/no vegetation - dark red
    return [0.70, 0.18, 0.15];
  } else if (ndvi < 0.2) {
    // Low vegetation - red-orange
    return [0.85, 0.35, 0.18];
  } else if (ndvi < 0.3) {
    // Sparse vegetation - orange
    return [0.92, 0.55, 0.22];
  } else if (ndvi < 0.4) {
    // Light vegetation - yellow-orange
    return [0.95, 0.78, 0.28];
  } else if (ndvi < 0.5) {
    // Moderate vegetation - yellow-green
    return [0.75, 0.88, 0.30];
  } else if (ndvi < 0.65) {
    // Good vegetation - lime green
    return [0.45, 0.82, 0.28];
  } else if (ndvi < 0.8) {
    // Dense vegetation - bright green
    return [0.20, 0.72, 0.22];
  } else {
    // Very dense/healthy vegetation - deep emerald
    return [0.08, 0.55, 0.15];
  }
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
                        },
                    }
                ],
            },
            "output": {
                "width": 1536,
                "height": 1536,
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