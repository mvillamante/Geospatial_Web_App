import logging
import os
from datetime import datetime, timedelta

import requests
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

COPERNICUS_CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"


def _get_access_token() -> str:
    if not COPERNICUS_CLIENT_ID or not COPERNICUS_CLIENT_SECRET:
        logger.error("Copernicus credentials not configured. Set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET env vars.")
        raise ValueError("Copernicus credentials are not configured. Please set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET environment variables.")

    logger.info("Requesting Copernicus access token...")
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
    logger.info("Successfully obtained Copernicus access token")
    return response.json()["access_token"]


@api_view(["GET"])
@permission_classes([AllowAny])
def get_ndvi_image(request):
    """
    Returns an NDVI (green index) image for Cabuyao using Copernicus Process API.
    Optional query params:
      - bbox=minLon,minLat,maxLon,maxLat
      - year=YYYY (use whole year)
      - month=1-12 (specific month, requires year to be set)
      - from=YYYY-MM-DD
      - to=YYYY-MM-DD
      - maxCloud=0-100
      - width=integer (image width in pixels)
      - height=integer (image height in pixels)
      - expandDays=N (expand search window by N days on each side for clearer images)
    
    When month is specified, the API will select the image with the least cloud coverage
    within that month to provide the clearest possible NDVI visualization.
    """
    try:
        bbox_param = request.GET.get("bbox")
        if bbox_param:
            bbox = [float(x) for x in bbox_param.split(",")]
            if len(bbox) != 4:
                return JsonResponse({"error": "bbox must have 4 values"}, status=400)
        else:
            # Cabuyao, Laguna
            bbox = [120.90, 14.08, 121.22, 14.36]

        year_param = request.GET.get("year")
        month_param = request.GET.get("month")
        from_date = request.GET.get("from")
        to_date = request.GET.get("to")
        end_date = datetime.utcnow().date()

        if year_param:
            try:
                year_value = int(year_param)
                if year_value < 2015 or year_value > end_date.year:
                    return JsonResponse(
                        {"error": "year must be between 2015 and current year"},
                        status=400,
                    )
            except ValueError:
                return JsonResponse({"error": "year must be a valid integer"}, status=400)

            # Check if a specific month is requested
            if month_param:
                try:
                    month_value = int(month_param)
                    if month_value < 1 or month_value > 12:
                        return JsonResponse(
                            {"error": "month must be between 1 and 12"},
                            status=400,
                        )
                except ValueError:
                    return JsonResponse({"error": "month must be a valid integer"}, status=400)
                
                # Set date range for the specific month
                parsed_from = datetime(year_value, month_value, 1).date()
                # Get the last day of the month
                if month_value == 12:
                    parsed_to = datetime(year_value, 12, 31).date()
                else:
                    parsed_to = (datetime(year_value, month_value + 1, 1) - timedelta(days=1)).date()
            else:
                parsed_from = datetime(year_value, 1, 1).date()
                parsed_to = datetime(year_value, 12, 31).date()
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

        # Expand the search window to find clearer imagery and enable compositing
        # The leastCC mosaicking will select the CLEAREST PIXEL from ALL images in the time range
        # So a wider range = more chances to fill gaps with clear pixels
        if month_param:
            # For month requests, expand significantly to get complete coverage
            # This allows compositing from ~3 months of data centered on the requested month
            default_expand = "45"
        elif year_param:
            default_expand = "0"  # Full year has enough data
        else:
            default_expand = "30"
        
        expand_days = int(request.GET.get("expandDays", default_expand))
        expand_days = max(0, min(expand_days, 90))  # Allow up to 90 days expansion

        search_from = parsed_from - timedelta(days=expand_days)
        search_to = parsed_to + timedelta(days=expand_days)

        # Clamp search_to to today
        if search_to > end_date:
            search_to = end_date
        
        # Ensure we have at least 30 days of data to composite from
        min_range_days = 30
        if (search_to - search_from).days < min_range_days:
            search_from = search_to - timedelta(days=min_range_days)

        from_date = search_from.isoformat()
        to_date = search_to.isoformat()

        # Cloud coverage filter - use 100% to include ALL images for compositing
        # The leastCC mosaicking will still pick only the clearest PIXELS from each image
        # This ensures we get complete coverage by combining clear pixels from multiple passes
        max_cloud = int(request.GET.get("maxCloud", "100"))
        max_cloud = max(0, min(max_cloud, 100))

        def _parse_size(value: str | None, default: int) -> int:
            if not value:
                return default
            try:
                return int(value)
            except ValueError:
                return default

        width = _parse_size(request.GET.get("width"), 1536)
        height = _parse_size(request.GET.get("height"), 1536)
        width = max(256, min(width, 4096))
        height = max(256, min(height, 4096))

        try:
            access_token = _get_access_token()
        except ValueError as exc:
            # Credentials not configured
            logger.error(f"Copernicus credentials error: {exc}")
            return JsonResponse(
                {"error": str(exc)},
                status=500,
            )
        except requests.RequestException as exc:
            details = getattr(exc.response, "text", None)
            logger.error(f"Copernicus token request failed: {details or str(exc)}")
            return JsonResponse(
                {"error": "Copernicus token request failed", "details": details or str(exc)},
                status=502,
            )

        # Evalscript with Scene Classification Layer (SCL) for cloud masking
        # With leastCC mosaicking + 100% cloud threshold, Sentinel Hub will:
        # - Collect ALL images in the time range
        # - For each pixel, select the image with least cloud at that location
        # - Apply this evalscript to render the best available data
        evalscript = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL"], units: "DN" }],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}

function preProcessScenes(collections) {
  // Sort scenes by cloud coverage (ascending) so clearest images are preferred
  collections.scenes.orbits.sort(function(a, b) {
    return a.tileCloudCoverage - b.tileCloudCoverage;
  });
  return collections;
}

function evaluatePixel(samples) {
  // With ORBIT mosaicking, we get an array of samples from different orbits
  // Iterate through samples to find the best (clearest) pixel
  
  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];
    let scl = sample.SCL;
    
    // Skip no-data pixels (SCL = 0)
    if (scl === 0) continue;
    
    // Skip cloudy/shadow pixels if we have more samples to check
    // SCL: 1=saturated, 3=cloud shadow, 8=cloud med, 9=cloud high, 10=cirrus, 11=snow
    let isBad = (scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11);
    
    if (isBad && i < samples.length - 1) {
      // Try next sample if this one is bad and we have more
      continue;
    }
    
    // Calculate NDVI for this pixel
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
    
    // If still cloudy but no better option, show semi-transparent
    if (isBad) {
      // Use a neutral green-gray for unavoidable cloud pixels
      return [0.6, 0.65, 0.5, 0.5];
    }
    
    // Stretch NDVI range for clearer contrast
    let scaled = Math.max(0.0, Math.min(1.0, (ndvi + 0.1) / 0.9));
    // Slight gamma boost to emphasize greens
    scaled = Math.pow(scaled, 0.85);

    // Enhanced color ramp (brown -> yellow -> light green -> deep green)
    if (scaled < 0.15) return [0.55, 0.35, 0.20, 1.0];  // Brown (bare soil/urban)
    if (scaled < 0.30) return [0.85, 0.70, 0.35, 1.0];  // Tan/yellow
    if (scaled < 0.45) return [0.75, 0.82, 0.35, 1.0];  // Yellow-green
    if (scaled < 0.60) return [0.50, 0.78, 0.30, 1.0];  // Light green
    if (scaled < 0.75) return [0.25, 0.70, 0.25, 1.0];  // Medium green
    return [0.08, 0.55, 0.15, 1.0];                      // Deep green (dense vegetation)
  }
  
  // No valid samples found - return transparent
  return [0, 0, 0, 0];
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
                        "processing": {
                            "mosaickingOrder": "leastCC",
                        },
                    }
                ],
            },
            "output": {
                "width": width,
                "height": height,
                "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
            },
            "evalscript": evalscript,
        }

        logger.info(f"Requesting NDVI image: bbox={bbox}, from={from_date}, to={to_date}, maxCloud={max_cloud}")
        
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
            logger.error(f"Copernicus process request failed: {response.status_code} - {response.text[:500]}")
            return JsonResponse(
                {
                    "error": "Copernicus process request failed",
                    "status": response.status_code,
                    "details": response.text[:2000],
                },
                status=502,
            )

        logger.info(f"NDVI image retrieved successfully ({len(response.content)} bytes)")
        return HttpResponse(response.content, content_type="image/png")
    except requests.RequestException as exc:
        details = getattr(exc.response, "text", None)
        logger.error(f"Copernicus request failed: {details or str(exc)}")
        return JsonResponse(
            {"error": "Copernicus request failed", "details": details or str(exc)},
            status=502,
        )
    except ValueError as exc:
        logger.warning(f"Invalid request parameters: {exc}")
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        logger.exception(f"Unexpected error in get_ndvi_image: {exc}")
        return JsonResponse({"error": "Unexpected error", "details": str(exc)}, status=500)