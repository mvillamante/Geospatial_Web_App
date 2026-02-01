import requests
import logging
from django.http import JsonResponse

from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status

from api.models import EvacuationCenter
from api.serializer import EvacuationCenterSerializer

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def reverse_geocode(request):
    """
    Reverse geocode coordinates to get address information.
    Query parameters:
    - lat: latitude (required)
    - lon: longitude (required)
    """
    lat = request.GET.get('lat')
    lon = request.GET.get('lon')
    
    if not lat or not lon:
        return JsonResponse(
            {'error': 'Latitude and longitude are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Convert to float to validate
        latitude = float(lat)
        longitude = float(lon)
    except ValueError:
        return JsonResponse(
            {'error': 'Invalid latitude or longitude format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Call OpenStreetMap Nominatim API for reverse geocoding
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            'format': 'json',
            'lat': latitude,
            'lon': longitude,
            'zoom': 18,
            'addressdetails': 1
        }
        headers = {
            'User-Agent': 'GeospatialApp/1.0'  # Required by Nominatim
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return JsonResponse(
                {'error': 'Geocoding service unavailable'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        data = response.json()
        address = data.get('address', {})
        display_name = data.get('display_name', '')
        
        # Log for debugging
        logger.info(f"Geocoding response for {latitude}, {longitude}: address={address}, display_name={display_name}")
        
        # Extract specific components for client display
        location_parts = []
        
        # Extract District FIRST (check district-related fields more thoroughly)
        district = (
            address.get('city_district') or
            address.get('district') or
            address.get('subdistrict') or
            address.get('county') or
            address.get('region')
        )
        
        # Extract Barangay (check multiple possible fields)
        barangay = (
            address.get('suburb') or 
            address.get('village') or 
            address.get('neighbourhood') or
            address.get('quarter') or
            address.get('residential')
        )
        
        # Extract City (check multiple possible fields)
        city = (
            address.get('city') or 
            address.get('municipality') or 
            address.get('town')
        )

        # Extract Street/Road (and house number if available)
        road = (
            address.get('road') or
            address.get('street') or
            address.get('pedestrian') or
            address.get('path') or
            address.get('footway')
        )
        house_number = address.get('house_number')
        if road and house_number:
            street = f"{house_number} {road}"
        else:
            street = road or ''
        
        # Format: Street, Barangay, City (requested UX)
        if street:
            location_parts.append(street)
        
        if barangay:
            barangay_lower = barangay.lower()
            if 'barangay' not in barangay_lower and 'brgy' not in barangay_lower:
                location_parts.append(f"Barangay {barangay}")
            else:
                location_parts.append(barangay)
        
        if city:
            location_parts.append(city)
        
        # If we have at least one component, format it
        if location_parts:
            formatted_location = ', '.join(location_parts)
        elif display_name:
            # Fallback: try to extract from display_name more intelligently
            # Nominatim display_name format: "road, barangay/district, city, province, country"
            name_parts = display_name.split(', ')
            extracted_parts = []
            
            # Look for district-like terms in display_name
            district_keywords = ['district', 'dist', 'zone', 'area', 'sector']
            
            for part in name_parts:
                part = part.strip()
                part_lower = part.lower()
                # Skip country, postal codes, coordinates, and very short parts
                if (part and 
                    'Philippines' not in part_lower and 
                    not part.isdigit() and 
                    len(part) > 2 and
                    'postcode' not in part_lower and
                    'lat' not in part_lower and
                    'lng' not in part_lower and
                    'road' not in part_lower and
                    'street' not in part_lower):
                    
                    # Prioritize district-like terms
                    is_district_like = any(keyword in part_lower for keyword in district_keywords)
                    is_barangay_like = 'barangay' in part_lower or 'brgy' in part_lower
                    is_city_like = part_lower in ['cabuyao', 'laguna', 'calamba', 'san pedro', 'biñan']
                    
                    # Add district-like terms first, then barangay, then city
                    if is_district_like or is_barangay_like or is_city_like or len(extracted_parts) < 3:
                        extracted_parts.append(part)
            
            if extracted_parts:
                formatted_location = ', '.join(extracted_parts[:3])
            else:
                # If we can't parse, use cleaned display_name (remove country/postal)
                cleaned_parts = [p.strip() for p in name_parts 
                                if p.strip() and 
                                'Philippines' not in p.lower() and 
                                not p.strip().isdigit() and
                                len(p.strip()) > 2]
                if cleaned_parts:
                    formatted_location = ', '.join(cleaned_parts[:3])
                else:
                    formatted_location = display_name
        else:
            # If no data at all, try to determine district from coordinates
            # For Cabuyao area, we can approximate districts
            # This is a fallback - should rarely be used
            if 14.2 <= latitude <= 14.3 and 121.0 <= longitude <= 121.2:
                formatted_location = "Cabuyao City, Laguna"
            else:
                # Last resort: use a generic location format
                formatted_location = "Location Area"
        
        # Ensure we always have a non-empty location (never use coordinates)
        if not formatted_location or formatted_location.strip() == '':
            if display_name:
                # Clean display_name
                name_parts = display_name.split(', ')
                cleaned = [p.strip() for p in name_parts 
                          if p.strip() and 
                          'Philippines' not in p.lower() and 
                          not p.strip().isdigit() and
                          len(p.strip()) > 2][:3]
                formatted_location = ', '.join(cleaned) if cleaned else display_name
            else:
                formatted_location = "Location Area"
        
        # Log the final formatted location for debugging
        logger.info(f"Formatted location: {formatted_location}")
        print(f"DEBUG - Formatted location: {formatted_location}")
        print(f"DEBUG - Location parts: {location_parts}")
        print(f"DEBUG - Barangay: {barangay}, District: {district}, City: {city}")
        
        return JsonResponse({
            'success': True,
            'location': formatted_location,
            # Provide structured fields so clients can display exactly what they need
            'street': street or '',
            'district': district or '',
            'barangay': barangay or '',
            'city': city or '',
            'address': address,
            'coordinates': {
                'lat': latitude,
                'lon': longitude
            }
        }, status=status.HTTP_200_OK)
        
    except requests.exceptions.Timeout:
        return JsonResponse(
            {'error': 'Geocoding request timed out'},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except requests.exceptions.RequestException as e:
        return JsonResponse(
            {'error': f'Geocoding service error: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return JsonResponse(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class EvacuationCenterListAPIView(generics.ListCreateAPIView):
    queryset = EvacuationCenter.objects.all()
    serializer_class = EvacuationCenterSerializer
    permission_classes = [AllowAny]
    
    pagination_class = None
    
class EvacuationCenterDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EvacuationCenter.objects.all()
    serializer_class = EvacuationCenterSerializer
    permission_classes = [AllowAny]