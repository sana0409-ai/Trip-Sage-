import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

API_URL = "https://priceline8.p.rapidapi.com/search-rental-car"

def search_cars():
    params = {
        "pick_up_date": "2025-12-11",
        "drop_off_date": "2025-12-12",
        "pick_up_time": "12:30",
        "drop_off_time": "15:30",
        "pick_up_location": "JFK",  # TEST: JFK airport works in UI
        "drop_off_location": "40.758867,-73.9848769999",  # exact example from UI
        "currency": "USD"
    }

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "priceline8.p.rapidapi.com"
    }

    print("\n🔗 URL:", API_URL)
    print("📦 Params:", params)

    resp = requests.get(API_URL, headers=headers, params=params)

    print("\nStatus Code:", resp.status_code)

    if resp.status_code != 200:
        print("❌ Error: API request failed.")
        print(resp.text)
        return None

    return resp.json()


if __name__ == "__main__":
    result = search_cars()
    print("\n🚗 API Response:")
    print(result)
