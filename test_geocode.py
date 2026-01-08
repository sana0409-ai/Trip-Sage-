import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEO_API_KEY")
city = "Seattle"

print("\n=== TESTING GEOAPIFY GEOCODE API ===")
print(f"Using key: {API_KEY}")

url = "https://api.geoapify.com/v1/geocode/search"
params = {
    "text": city,
    "apiKey": API_KEY
}

res = requests.get(url, params=params)

print("\nStatus:", res.status_code)
print("Raw Response:")
print(res.text)

try:
    data = res.json()
    print("\nParsed JSON OK")

    if "features" in data and len(data["features"]) > 0:
        first = data["features"][0]["geometry"]["coordinates"]
        lon, lat = first
        print(f"\nLat: {lat}, Lon: {lon}")
    else:
        print("❌ No features returned")

except Exception as e:
    print("❌ JSON ERROR:", e)
