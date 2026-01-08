import os
import json
import re
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

BOOKING_API_KEY = os.getenv("BOOKING_API_KEY")
BOOKING_API_HOST = os.getenv("BOOKING_API_HOST")

URL = "https://apidojo-booking-v1.p.rapidapi.com/properties/list"

IMAGE_KEYS = (
    "max_photo_url",
    "main_photo_url",
    "photo_main_url",
    "mainPhotoUrl",
    "maxPhotoUrl",
)

def safe_filename(s: str, max_len: int = 80) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return (s[:max_len].strip("_") or "hotel")

def best_hotel_image(hotel: dict):
    # 1) Common direct keys
    for k in IMAGE_KEYS:
        v = hotel.get(k)
        if isinstance(v, str) and v.startswith("http"):
            return v, k

    # 2) Sometimes nested (rare)
    # Try a few obvious nests if present
    for path in ("photos", "photo_urls", "images", "hotel_photos"):
        v = hotel.get(path)
        if isinstance(v, list) and v:
            first = v[0]
            if isinstance(first, str) and first.startswith("http"):
                return first, path
            if isinstance(first, dict):
                for kk in ("url", "max", "main", "src"):
                    vv = first.get(kk)
                    if isinstance(vv, str) and vv.startswith("http"):
                        return vv, f"{path}[0].{kk}"

    return None, None

def download_image(url: str, out_path: str, timeout: int = 30):
    try:
        r = requests.get(url, timeout=timeout)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        ctype = r.headers.get("content-type", "")
        if "image" not in ctype:
            # sometimes CDNs return html if blocked
            return False, f"Not an image content-type: {ctype}"
        with open(out_path, "wb") as f:
            f.write(r.content)
        return True, "OK"
    except Exception as e:
        return False, str(e)

def test_booking_hotels_with_images():
    if not BOOKING_API_KEY or not BOOKING_API_HOST:
        raise SystemExit("❌ Missing BOOKING_API_KEY or BOOKING_API_HOST in .env")

    print("\n🔍 Searching Hotels + Images...\n")

    today = datetime.today()
    arrival = today + timedelta(days=1)
    departure = today + timedelta(days=3)

    arrival_date = arrival.strftime("%Y-%m-%d")
    departure_date = departure.strftime("%Y-%m-%d")

    params = {
        "offset": "0",
        "arrival_date": arrival_date,
        "departure_date": departure_date,
        "guest_qty": "2",
        "room_qty": "1",
        "dest_ids": "-3727579",  # Paris
        "search_type": "city",
        "locale": "en-us",
        "currency_code": "USD"
    }

    headers = {
        "X-RapidAPI-Key": BOOKING_API_KEY,
        "X-RapidAPI-Host": BOOKING_API_HOST
    }

    res = requests.get(URL, headers=headers, params=params, timeout=30)

    print("STATUS:", res.status_code)
    if res.status_code != 200:
        print(res.text[:2000])
        return

    data = res.json()

    # Save full response so you can inspect later
    with open("hotels_full_response.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("🧾 Saved full response to hotels_full_response.json")

    # Quick sanity: top keys
    if isinstance(data, dict):
        print("\nTop-level keys:", list(data.keys()))

    results = data.get("result", [])
    if not results:
        print("\n😵 No hotels found under data['result']")
        # Print a small preview to help debug structure
        print(json.dumps(data, indent=2)[:2000])
        return

    print(f"\n✅ Hotels returned: {len(results)}")
    print("\n================ 🏨 TOP 5 (WITH IMAGES) ================\n")

    os.makedirs("hotel_images", exist_ok=True)

    for i, h in enumerate(results[:5], start=1):
        name = h.get("hotel_name") or h.get("name") or "Unknown Hotel"
        rating = h.get("review_score") or h.get("reviewScore") or "N/A"
        price = h.get("min_total_price") or h.get("price") or "N/A"

        img_url, img_key = best_hotel_image(h)

        print(f"OPTION {i}")
        print("----------------------------------")
        print(f"🏨 Name: {name}")
        print(f"⭐ Rating: {rating}")
        print(f"💰 Price: {price}")
        print(f"🖼️ Image: {img_url if img_url else 'N/A'}")
        if img_key:
            print(f"   ↳ from: {img_key}")

        # Optional: download image to confirm it actually loads
        if img_url:
            fname = f"hotel_{i}_{safe_filename(name)}.jpg"
            out_path = os.path.join("hotel_images", fname)
            ok, msg = download_image(img_url, out_path)
            print(f"⬇️ Download: {out_path} -> {msg}")
        print()

if __name__ == "__main__":
    test_booking_hotels_with_images()
