from fastapi import APIRouter, Depends, HTTPException, status
import requests
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import dotenv
from pathlib import Path
import os

from app.deps import get_db
from backend.schema import PlacesCache

dotenv.load_dotenv(dotenv.find_dotenv())

GEOAPIFY_KEY = os.getenv("GEOAPIFY_KEY")
GEOAPIFY_URL = "https://api.geoapify.com/v2/places"
GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search"
CACHE_TTL = timedelta(days=5)

router = APIRouter(tags=["location"])

@router.get("/places/{city}")
def get_places(
    city: str,
    db: Session = Depends(get_db)
):
    cached = db.get(PlacesCache, city)

    # If cached 
    if cached:
        if cached.updated_at.tzinfo is None:
            cached.updated_at = cached.updated_at.replace(tzinfo=timezone.utc)
            
        age = datetime.now(timezone.utc) - cached.updated_at
        # if valid
        if age < CACHE_TTL:
            return {"source": "cache", "data": cached.response}
        
        # else not falid
        else:
            # reuse the lon lat values
            params = {
                "filter": f"circle:{cached.lon},{cached.lat},5000",
                "apiKey": GEOAPIFY_KEY,
                "categories": "tourism,entertainment,leisure.park,building.tourism",
                "limit": 20,
            }

            resp = requests.get(GEOAPIFY_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

            cached.response = data
            cached.updated_at = datetime.now(timezone.utc)

            return {"source": "lon_lat", "data": data}

    # not in cache
    geocode_params = {
        "text": city,
        "type": "city",
        "limit": 1,
        "apiKey": GEOAPIFY_KEY,
    }
    
    geocode_resp = requests.get(GEOCODE_URL, params=geocode_params)
    geocode_resp.raise_for_status()
    geo_data = geocode_resp.json()

    if not geo_data.get("features"):
        raise HTTPException(status_code=404, detail="City not found")
    
    feature = geo_data["features"][0]
    api_lon = feature["properties"]["lon"]
    api_lat = feature["properties"]["lat"]
    place_id = feature["properties"].get("place_id")

    if not place_id:
        raise HTTPException(
            status_code=400,
            detail="City geocoded but missing place_id; cannot query Places API",
        )
        
    params = {
        "filter": f"circle:{api_lon},{api_lat},5000",
        "apiKey": GEOAPIFY_KEY,
        "categories": "tourism,entertainment,leisure.park,building.tourism",
        "limit": 20,
    }

    resp = requests.get(GEOAPIFY_URL, params=params)
    resp.raise_for_status()
    data = resp.json()
    cached = PlacesCache(
        city=city,
        response=data,
        lon=api_lon,
        lat=api_lat,
        updated_at=datetime.now(timezone.utc)
    )

    db.add(cached)

    db.commit()

    return {"source": "geoapify", "data": data}