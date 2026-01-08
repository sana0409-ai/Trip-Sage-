import os
import re
import json
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
CAR_API_HOST = os.getenv("CAR_API_HOST", "priceline-com-provider.p.rapidapi.com").strip()
URL = f"https://{CAR_API_HOST}/v2/cars/resultsRequest"

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": CAR_API_HOST,
    "accept": "application/json",
}

PARAMS = {
    "pickup_date": "01/10/2026",     # MM/DD/YYYY
    "dropoff_date": "01/13/2026",
    "pickup_time": "10:00",
    "dropoff_time": "10:00",
    "pickup_airport_code": "JFK",
    "dropoff_airport_code": "JFK",
    "currency": "USD",
    "drivers_age": "25",
    "limit": "50",
    "sort_order": "PRICE",
}

PRICE_KEYS = ("total", "total_price", "totalprice", "amount", "price", "rate", "subtotal", "grandtotal")
VEHICLE_KEYS = ("vehicle", "car", "carmodel", "model", "category", "class", "type", "group")

# image keys we care about
IMAGE_PATH_CANDIDATES = [
    ("car.images.SIZE268X144", ("car", "images", "SIZE268X144")),
    ("car.images.SIZE335X180", ("car", "images", "SIZE335X180")),
    ("car.images.SIZE134X72",  ("car", "images", "SIZE134X72")),
    ("car.imageURL",           ("car", "imageURL")),
]

def walk(obj, path=""):
    """Yield (path, value) for all leaves in nested dict/list."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            np = f"{path}.{k}" if path else str(k)
            yield from walk(v, np)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            np = f"{path}[{i}]"
            yield from walk(v, np)
    else:
        yield path, obj

def looks_like_price_key(path: str) -> bool:
    p = path.lower()
    return any(k in p for k in PRICE_KEYS)

def looks_like_vehicle_key(path: str) -> bool:
    p = path.lower()
    return any(k in p for k in VEHICLE_KEYS)

def parse_number(x):
    if isinstance(x, (int, float)):
        return float(x)
    if isinstance(x, str):
        s = x.strip()
        m = re.search(r"(\d+(?:\.\d+)?)", s.replace(",", ""))
        if m:
            try:
                return float(m.group(1))
            except:
                return None
    return None

def best_price_and_path(car: dict):
    best = None
    best_path = None
    for path, val in walk(car):
        if not looks_like_price_key(path):
            continue
        num = parse_number(val)
        if num is None or num <= 0:
            continue
        if best is None or num < best:
            best = num
            best_path = path
    return best, best_path

def best_vehicle_string_and_path(car: dict):
    best = None
    best_path = None
    for path, val in walk(car):
        if not looks_like_vehicle_key(path):
            continue
        if not isinstance(val, str):
            continue
        s = val.strip()
        if not s or s.startswith("http"):
            continue
        if len(s) < 4:
            continue

        score = 0
        if "similar" in s.lower():
            score += 3
        if " " in s:
            score += 2
        if any(ch.isalpha() for ch in s) and any(ch.isdigit() for ch in s):
            score += 1

        if best is None or score > best[0]:
            best = (score, s)
            best_path = path

    return (best[1] if best else None), best_path

def flatten_results_list(results_list: dict):
    out = []
    if not isinstance(results_list, dict):
        return out
    for k, v in results_list.items():
        if isinstance(v, dict):
            vv = dict(v)
            vv["_result_key"] = k
            out.append(vv)
    return out

def safe_get(d, path_tuple):
    cur = d
    for k in path_tuple:
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]
    return cur

def best_image_url_and_path(car: dict):
    # prefer nice sized images first
    for label, path in IMAGE_PATH_CANDIDATES:
        val = safe_get(car, path)
        if isinstance(val, str) and val.strip().startswith("http"):
            return val.strip(), label

    # fallback: brute-scan for any URL under "car" subtree
    car_obj = car.get("car") if isinstance(car.get("car"), dict) else {}
    for p, v in walk(car_obj, "car"):
        if isinstance(v, str) and v.startswith("http") and (".png" in v or ".jpg" in v or ".jpeg" in v):
            return v, p

    return None, None

def download_image(url, filename):
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}"
        with open(filename, "wb") as f:
            f.write(resp.content)
        return True, "OK"
    except Exception as e:
        return False, str(e)

def main():
    if not RAPIDAPI_KEY:
        raise SystemExit("❌ Missing RAPIDAPI_KEY in .env")

    print("\n🔗 URL:", URL)
    print("📦 Params:", PARAMS)

    r = requests.get(URL, headers=HEADERS, params=PARAMS, timeout=30)
    print("Status:", r.status_code)
    if r.status_code != 200:
        print(r.text[:2000])
        return

    data = r.json()

    root = data.get("getCarResultsRequest", {})
    results = root.get("results", {})
    results_list = results.get("results_list", {})
    cars = flatten_results_list(results_list)

    if not cars:
        print("😵 No cars in results_list")
        print("Top-level keys:", list(data.keys()))
        return

    print(f"\n✅ Inventory count: {results.get('rc_inventory_count')} | Returned: {results.get('returned_inv_count')}")
    print("\n================ 🚗 TOP 3 OPTIONS (WITH IMAGES) ================\n")

    for i, car in enumerate(cars[:3], start=1):
        rk = car.get("_result_key")

        partner = car.get("partner", {}) if isinstance(car.get("partner"), dict) else {}
        vendor = partner.get("name") or partner.get("code") or "Unknown vendor"

        car_name, car_path = best_vehicle_string_and_path(car)
        price, price_path = best_price_and_path(car)

        img_url, img_path = best_image_url_and_path(car)

        print(f"OPTION {i} (key: {rk})")
        print("----------------------------------")
        print(f"🏢 Vendor: {vendor}")
        print(f"💳 Pay type: {car.get('payType', 'N/A')} | Opaque: {car.get('opaque', 'N/A')}")
        print(f"🚗 Car: {car_name or 'N/A'}")
        if car_path:
            print(f"   ↳ from: {car_path}")
        print(f"💰 Price: {PARAMS.get('currency','USD')} {price if price is not None else 'N/A'}")
        if price_path:
            print(f"   ↳ from: {price_path}")

        print(f"🖼️ Image: {img_url or 'N/A'}")
        if img_path:
            print(f"   ↳ from: {img_path}")

        # Optional: download to verify it loads
        if img_url:
            fn = f"car_{i}_{rk}.png"
            ok, msg = download_image(img_url, fn)
            print(f"⬇️ Download: {fn} -> {msg}")

        print()

    # Save full response for inspection
    with open("cars_full_response.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("🧾 Saved full response to cars_full_response.json")

if __name__ == "__main__":
    main()
