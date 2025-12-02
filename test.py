import json
import requests
from datetime import datetime, timezone
import os
import dotenv

dotenv.load_dotenv(dotenv.find_dotenv())

GEOAPIFY_KEY = os.getenv("GEOAPIFY_KEY")
GEOAPIFY_URL = "https://api.geoapify.com/v2/places"
GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search"

city = "Tokyo"

geocode_params = {
    "text": city,
    "type": "city",
    "limit": 1,
    "apiKey": GEOAPIFY_KEY,
}
geocode_resp = requests.get(GEOCODE_URL, params=geocode_params)
geocode_resp.raise_for_status()
geo_data = geocode_resp.json()

print(geo_data)

feature = geo_data["features"][0]
lon = feature["properties"]["lon"]
lat = feature["properties"]["lat"]
place_id = feature["properties"].get("place_id")

print(place_id)

params = {
    "filter": f"circle:{lon},{lat},5000",
    "apiKey": GEOAPIFY_KEY,
    "limit": 20,
    "categories" : "commercial,natural,entertainment,leisure"
}
resp = requests.get(GEOAPIFY_URL, params=params)
resp.raise_for_status()
data = resp.json()

print(data)