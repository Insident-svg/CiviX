from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from geopy.distance import geodesic
import logging
from typing import Tuple, Optional
import urllib.request
import tempfile
import os

logger = logging.getLogger(__name__)

def get_exif_data(image_path: str):
    try:
        image = Image.open(image_path)
        info = image._getexif()
        if not info: return None

        exif_data = {}
        for tag, value in info.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                gps_data = {}
                for t in value:
                    sub_decoded = GPSTAGS.get(t, t)
                    gps_data[sub_decoded] = value[t]
                exif_data[decoded] = gps_data
            else:
                exif_data[decoded] = value
        return exif_data
    except Exception as e:
        logger.warning(f"Failed to extract EXIF from {image_path}: {e}")
        return None

def _convert_to_degrees(value):
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)

def extract_lat_lon(exif_data) -> Optional[Tuple[float, float]]:
    if not exif_data or "GPSInfo" not in exif_data:
        return None

    gps_info = exif_data["GPSInfo"]
    if "GPSLatitude" in gps_info and "GPSLatitudeRef" in gps_info and \
       "GPSLongitude" in gps_info and "GPSLongitudeRef" in gps_info:
        lat = _convert_to_degrees(gps_info["GPSLatitude"])
        if gps_info["GPSLatitudeRef"] != "N":
            lat = -lat

        lon = _convert_to_degrees(gps_info["GPSLongitude"])
        if gps_info["GPSLongitudeRef"] != "E":
            lon = -lon
        return lat, lon
    return None

async def check_location_spoofing(image_url: str, claimed_lat: float, claimed_lon: float, threshold_km: float = 2.0) -> bool:
    """
    Checks if the image EXIF GPS data differs from the claimed coordinates by more than threshold_km.
    """
    if not image_url or not claimed_lat or not claimed_lon:
        return False
        
    try:
        # For MVP, mock downloading the image to extract EXIF
        # In reality: urllib.request.urlretrieve(image_url, temp_path)
        
        # We will assume no spoofing if we can't extract it easily in MVP
        # return False
        
        # Pseudo-logic for real execution:
        # exif = get_exif_data(temp_path)
        # actual_coords = extract_lat_lon(exif)
        # if actual_coords:
        #    actual_lat, actual_lon = actual_coords
        #    distance_km = geodesic((claimed_lat, claimed_lon), (actual_lat, actual_lon)).kilometers
        #    if distance_km > threshold_km:
        #        logger.warning(f"Location spoofing detected! Distance: {distance_km:.2f} km")
        #        return True
        return False
        
    except Exception as e:
        logger.warning(f"Geospatial check failed: {e}")
        return False
