import os
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================
AMADEUS_API_KEY = os.getenv("AMADEUS_API_KEY")
AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET")

BOOKING_API_KEY = os.getenv("BOOKING_API_KEY")
BOOKING_API_HOST = os.getenv("BOOKING_API_HOST")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

CAR_API_HOST = os.getenv("CAR_API_HOST", "priceline-com-provider.p.rapidapi.com").strip()
CAR_API_URL = f"https://{CAR_API_HOST}/v2/cars/resultsRequest"
GEO_API_KEY = os.getenv("GEO_API_KEY")






# ------------------ AMADEUS FLIGHT URLS ---------------------
TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
FLIGHT_URL = "https://test.api.amadeus.com/v2/shopping/flight-offers"


cached_token = None


# ============================================================
# HELPERS
# ============================================================
def normalize_date(obj):
    """Convert Dialogflow CX date object to YYYY-MM-DD"""
    if isinstance(obj, dict):
        y = int(obj.get("year"))
        m = int(obj.get("month"))
        d = int(obj.get("day"))
        return f"{y:04d}-{m:02d}-{d:02d}"
    return obj


CITY_TO_IATA = {
    "paris": "PAR", "tokyo": "TYO", "madrid": "MAD", "london": "LON",
    "dubai": "DXB", "new york": "NYC", "dallas": "DFW", "los angeles": "LAX",
    "san francisco": "SFO", "toronto": "YYZ", "sydney": "SYD",
    "delhi": "DEL", "mumbai": "BOM", "york": "NYC"
}


def city_to_iata(city):
    return CITY_TO_IATA.get(city.lower(), city[:3].upper())


def get_amadeus_token():
    global cached_token
    if cached_token:
        return cached_token

    data = {
        "grant_type": "client_credentials",
        "client_id": AMADEUS_API_KEY,
        "client_secret": AMADEUS_API_SECRET
    }
    res = requests.post(TOKEN_URL, data=data)
    cached_token = res.json().get("access_token")
    return cached_token

def normalize_time(obj):
    if isinstance(obj, dict):
        h = int(obj.get("hours", 0))
        m = int(obj.get("minutes", 0))
        return f"{h:02d}:{m:02d}"
    return obj


# ============================================================
# ⭐⭐ FLIGHT HANDLERS ⭐⭐
# ============================================================


def offer_has_layover_city(offer, layover_iata):
    """Returns True if any intermediate segment arrives at layover_iata"""
    try:
        segments = offer["itineraries"][0]["segments"]
        for seg in segments[:-1]:  # exclude final arrival
            if seg["arrival"]["iataCode"] == layover_iata:
                return True
    except Exception:
        return False
    return False


def handle_flight_options(params):
    departure_city = city_to_iata(params.get("departure_city"))

    # ⚠️ IMPORTANT: if your CX param is destination-city, use that key instead
    destination_city = city_to_iata(params.get("destination_city") or params.get("destination-city"))

    departure_date = normalize_date(params.get("departure_date"))
    travel_class = (params.get("flight_class") or "ECONOMY").upper()

    if not departure_city or not destination_city or not departure_date:
        return "I need your departure city, destination city, and travel date.", {}

    token = get_amadeus_token()
    headers = {"Authorization": f"Bearer {token}"}

    query = {
        "originLocationCode": departure_city,
        "destinationLocationCode": destination_city,
        "departureDate": departure_date,
        "adults": 1,
        "travelClass": travel_class,
        "currencyCode": "USD"
    }

    res = requests.get(FLIGHT_URL, headers=headers, params=query)
    data = res.json()

    offers = data.get("data", [])
    if not offers:
        return "Sorry, I couldn't find any flights. Try different details? Yes to retry flight search, Start Over to go to main menu or exit", {}

    # ✅ FILTER BY LAYOVER IF PROVIDED
    layover_city = params.get("layover_city")
    if layover_city:
        layover_iata = city_to_iata(layover_city)
        offers = [o for o in offers if offer_has_layover_city(o, layover_iata)]

        if not offers:
            return (
                f"Sorry, I couldn’t find flights with a layover in {layover_city}. "
                f"Do you want to try another layover city or see all flights?",
                {}
            )

    flights = offers[:3]

    reply = "✈️ **Best Flight Options:**\n\n"
    option_details = {}

    for idx, offer in enumerate(flights, start=1):
        price = offer["price"]["total"]
        airline = offer.get("validatingAirlineCodes", ["Unknown"])[0]

        try:
            cabin = offer["travelerPricings"][0]["fareDetailsBySegment"][0]["cabin"]
        except Exception:
            cabin = "Unknown"

        seg = offer["itineraries"][0]["segments"][0]
        dep_time = seg["departure"]["at"]
        arr_time = seg["arrival"]["at"]
        segments = offer["itineraries"][0]["segments"]
        stops = [s["arrival"]["iataCode"] for s in segments[:-1]]


        reply += (
            f"✈️ **Option {idx}**\n"
            f"Airline: {airline}\n"
            f"Class: {cabin}\n"
            f"Price: ${price}\n"
            f"Departure: {dep_time}\n"
            f"Arrival: {arr_time}\n\n"
            f"Stops: {', '.join(stops) if stops else 'Direct'}\n\n"
        )

        option_details[f"option_{idx}_airline"] = airline
        option_details[f"option_{idx}_class"] = cabin
        option_details[f"option_{idx}_price"] = price
        option_details[f"option_{idx}_departure"] = dep_time
        option_details[f"option_{idx}_arrival"] = arr_time

    reply += "Choose an option: **1, 2, or 3** or retry flight search."
    return reply, option_details




def handle_select_flight(params):
    selected = int(params.get("selected_flight_id", 1))
    key = f"option_{selected}"

    mapped = {
        "selected_flight_airline": params.get(f"{key}_airline"),
        "selected_flight_class": params.get(f"{key}_class"),
        "selected_flight_price": params.get(f"{key}_price"),
        "selected_flight_departure": params.get(f"{key}_departure"),
        "selected_flight_arrival": params.get(f"{key}_arrival"),
    }
    

    preview = f"""
✈️ **Selected Flight Details**
• Airline: {mapped['selected_flight_airline']}
• Class: {mapped['selected_flight_class']}
• Price: ${mapped['selected_flight_price']}
• Departure: {mapped['selected_flight_departure']}
• Arrival: {mapped['selected_flight_arrival']}
"""
    return mapped, preview



def handle_booking_confirmation(params):

    airline = params.get("selected_flight_airline")
    cls = params.get("selected_flight_class")
    price = params.get("selected_flight_price")
    dep_city = params.get("departure_city")
    dest_city = params.get("destination_city")
    dep_time = params.get("selected_flight_departure")
    arr_time = params.get("selected_flight_arrival")

    p1_name = params.get("username")
    p1_email = params.get("useremail")
    p1_dob = params.get("userdob")

    p2_name = params.get("passenger2_name")
    p2_email = params.get("passenger2_email")
    p2_dob = params.get("passenger2_dob")

    # Build reply cleanly — NO triple quotes
    reply = (
        f"🛫 **Flight Booking Summary**\n\n"
        f"• Airline: {airline}\n"
        f"• Class: {cls}\n"
        f"• Price: ${price}\n"
        f"• Route: {dep_city} → {dest_city}\n"
        f"• Departure: {dep_time}\n"
        f"• Arrival: {arr_time}\n\n"
        f"🧍 **Passenger 1**\n"
        f"• Name: {p1_name}\n"
        f"• Email: {p1_email}\n"
        f"• DOB: {p1_dob}\n"
    )

    if p2_name:
        reply += (
            f"\n🧍 **Passenger 2**\n"
            f"• Name: {p2_name}\n"
            f"• Email: {p2_email}\n"
            f"• DOB: {p2_dob}\n"
        )

    # Always add confirmation line
    reply += (
        "\nWould you like to confirm this booking?\n"
        "- yes → confirm booking\n"
        "- no → cancel or modify details"
    )
    return reply




# ============================================================
# ⭐⭐ HOTEL HANDLERS (YOUR EXACT CORRECT VERSION) ⭐⭐
# ============================================================

def handle_hotel_options(params):

    hotel_city = params.get("hotel_city")
    checkin = normalize_date(params.get("check_in"))
    checkout = normalize_date(params.get("check_out"))

    budget_obj = params.get("budget")
    if isinstance(budget_obj, dict) and "amount" in budget_obj:
        hotel_budget = float(budget_obj["amount"])
    else:
        hotel_budget = 9999

    if not hotel_city or not checkin or not checkout:
        return "I need the hotel city, check-in date, and check-out date.", {}

    dest_id_map = {
        "paris": "-1456928", "tokyo": "-246227", "london": "-2601889",
        "dubai": "-782831", "new york": "-2550311",
        "delhi": "-2106102", "mumbai": "-2101842"
    }

    dest_id = dest_id_map.get(hotel_city.lower())
    if not dest_id:
        return "Sorry, I don't know this city yet for hotels. Try different details. Yes to retry hotel search, Start Over to go to main menu or exit", {}

    url = "https://apidojo-booking-v1.p.rapidapi.com/properties/list"

    query = {
        "offset": "0",
        "arrival_date": checkin,
        "departure_date": checkout,
        "guest_qty": "2",
        "room_qty": "1",
        "dest_ids": dest_id,
        "search_type": "city",
        "locale": "en-us",
        "currency_code": "USD"
    }

    headers = {
        "X-RapidAPI-Key": BOOKING_API_KEY,
        "X-RapidAPI-Host": BOOKING_API_HOST
    }

    res = requests.get(url, headers=headers, params=query)
    data = res.json()

    if "result" not in data:
        return "No hotels found.", {}

    results = data["result"][:30]

    hotels = []
    for h in results:
        name = h.get("hotel_name")
        rating = h.get("review_score", 0)
        price = h.get("min_total_price")

        # ✅ NEW: image url extraction (main key + safe fallbacks)
        image_url = (
            h.get("main_photo_url")
            or h.get("main_photo_url_original")
            or h.get("max_photo_url")
            or h.get("hotel_image_url")
        )

        if price and price <= hotel_budget:
            hotels.append({
                "name": name,
                "rating": rating,
                "price": price,
                "checkin": checkin,
                "checkout": checkout,
                "image": image_url,  # ✅ store it per option
            })

        if len(hotels) == 3:
            break

    if not hotels:
        return "No hotels match your budget. Do you want to retry hotel search, Start Over to go to main menu or exit", {}

    reply = "🏨 **Best Hotel Options:**\n\n"
    mapped = {}

    for idx, h in enumerate(hotels, start=1):
        reply += (
            f"⭐ **Option {idx}**\n"
            f"Hotel: {h['name']}\n"
            f"Rating: {h['rating']}\n"
            f"Price: ${h['price']}\n"
            f"Check-In: {h['checkin']}\n"
            f"Check-Out: {h['checkout']}\n\n"
        )

        mapped[f"hotel_opt_{idx}_name"] = h["name"]
        mapped[f"hotel_opt_{idx}_rating"] = h["rating"]
        mapped[f"hotel_opt_{idx}_price"] = h["price"]
        mapped[f"hotel_opt_{idx}_checkin"] = h["checkin"]
        mapped[f"hotel_opt_{idx}_checkout"] = h["checkout"]

        # ✅ NEW: store image url per option
        mapped[f"hotel_opt_{idx}_image"] = h["image"]

    reply += "Choose a hotel: **1, 2, or 3** or retry hotel search."
    return reply, mapped




def handle_select_hotel(params):
    selected = int(params.get("number", 1))
    key = f"hotel_opt_{selected}"

    mapped = {
        "selected_hotel_name": params.get(f"{key}_name"),
        "selected_hotel_rating": params.get(f"{key}_rating"),
        "selected_hotel_price": params.get(f"{key}_price"),
        "selected_hotel_checkin": params.get(f"{key}_checkin"),
        "selected_hotel_checkout": params.get(f"{key}_checkout"),
        "selected_hotel_image": params.get(f"{key}_image"),
    }

    preview = f"""
🏨 **Selected Hotel**
• Name: {mapped['selected_hotel_name']}
• Rating: {mapped['selected_hotel_rating']}
• Price: ${mapped['selected_hotel_price']}
• Check-In: {mapped['selected_hotel_checkin']}
• Check-Out: {mapped['selected_hotel_checkout']}
"""
    return mapped, preview



def handle_hotel_booking_confirmation(params):

    hotel_name = params.get("selected_hotel_name")
    rating = params.get("selected_hotel_rating")
    price = params.get("selected_hotel_price")
    checkin = params.get("selected_hotel_checkin")
    checkout = params.get("selected_hotel_checkout")

    # Guest details
    guest_name = params.get("username")
    guest_email = params.get("useremail")
    guest_dob = params.get("userdob")
    num_guests = params.get("num_guests") or params.get("number_of_guests") or 1

    reply = (
        f"🏨 **Hotel Booking Summary**\n\n"
        f"• Hotel: {hotel_name}\n"
        f"• Rating: {rating}\n"
        f"• Price: ${price}\n"
        f"• Check-In: {checkin}\n"
        f"• Check-Out: {checkout}\n\n"
        f"👤 **Guest Information**\n"
        f"• Number of Guests: {num_guests}\n"
        f"• Name: {guest_name}\n"
        f"• Email: {guest_email}\n"
        f"• DOB: {guest_dob}\n\n"
        f"Would you like to confirm this booking?\n"
        f"- yes → confirm booking\n"
        f"- no → cancel or modify details"
    )

    return reply






# ============================================================
# 🛫 STATIC AIRPORT COORDINATE MAPPING (Fix for "No cars found")
# ============================================================

CAR_CITY_COORDS = {
    "chicago": "41.9773,-87.8369",      # ORD - Chicago O'Hare
    "new york": "40.6413,-73.7781",     # JFK
    "los angeles": "33.9416,-118.4085", # LAX
    "dallas": "32.8998,-97.0403",       # DFW
    "houston": "29.9902,-95.3368",      # IAH
    "miami": "25.7959,-80.2870",        # MIA
    "orlando": "28.4312,-81.3081",      # MCO
    "san francisco": "37.6213,-122.3790", # SFO
    "seattle": "47.4502,-122.3088",     # SEA
    "atlanta": "33.6407,-84.4277",      # ATL
}


# ============================================================
# 🔍 GEOAPIFY LOOKUP (CITY → LAT,LON) - FALLBACK ONLY
# ============================================================
def geoapify_lookup(city_name):
    if not city_name:
        return None

    url = "https://api.geoapify.com/v1/geocode/search"
    params = {
        "text": city_name,
        "format": "json",
        "apiKey": GEO_API_KEY
    }

    try:
        r = requests.get(url, params=params)
        data = r.json()

        if "results" not in data or len(data["results"]) == 0:
            return None

        res = data["results"][0]
        lat = res["lat"]
        lon = res["lon"]

        return f"{lat},{lon}"

    except Exception as e:
        print("Geoapify error:", e)
        return None


# ============================================================
# 🔧 GET COORDS (Airport First → Geoapify Second)
# ============================================================
def get_coords(city_name):
    if not city_name:
        return None

    city = city_name.lower()

    # 1️⃣ First try airport mapping
    if city in CAR_CITY_COORDS:
        return CAR_CITY_COORDS[city]

    # 2️⃣ Fallback to Geoapify
    return geoapify_lookup(city)


# ============================================================
# 🔧 EXTRACT DATES FROM itemKey
# ============================================================
def extract_dates_from_itemkey(item_key):
    if not item_key:
        return "N/A", "N/A"

    parts = item_key.split("-")
    if len(parts) < 4:
        return "N/A", "N/A"

    pickup_raw = parts[-4]
    dropoff_raw = parts[-2]

    def fmt(d):
        return f"20{d[4:6]}-{d[2:4]}-{d[0:2]}"

    return fmt(pickup_raw), fmt(dropoff_raw)


# ============================================================
# ✅ City → Airport IATA (same idea, used by new API)
# ============================================================
RENTAL_IATA_MAP = {
    "dallas": "DFW",
    "orlando": "MCO",
    "new york": "JFK",
    "los angeles": "LAX",
    "chicago": "ORD",
    "miami": "MIA",
    "san francisco": "SFO",
    "las vegas": "LAS",
    "atlanta": "ATL",
    "seattle": "SEA",
    "houston": "IAH",
}

def get_airport_code(city_name: str):
    if not city_name:
        return None
    city = city_name.lower().strip()
    return RENTAL_IATA_MAP.get(city)




# ============================================================
# ⏱️ Date & Time Normalization Helpers
# ============================================================

def normalize_date_mmddyyyy(date_obj):
    """Dialogflow date object -> MM/DD/YYYY (required by this API)"""
    try:
        y = int(date_obj["year"])
        m = int(date_obj["month"])
        d = int(date_obj["day"])
        return f"{m:02d}/{d:02d}/{y:04d}"
    except:
        return None

def normalize_time(time_obj):
    """Dialogflow time object -> HH:MM"""
    try:
        h = int(time_obj["hours"])
        m = int(time_obj["minutes"])
        return f"{h:02d}:{m:02d}"
    except:
        return "10:00"


# ============================================================
# 🚗 Car Rental Handler (Fix 1 — FULL FINAL VERSION)
# ============================================================

def handle_car_rental_options(params):
    pickup_city = params.get("pick_up_city") or params.get("pick_up_City")
    dropoff_city = params.get("drop_off_city") or pickup_city  # allow same dropoff

    # 1) Convert city -> airport code (required by this API)
    pickup_code = get_airport_code(pickup_city) or (pickup_city.strip().upper() if pickup_city else None)
    dropoff_code = get_airport_code(dropoff_city) or (dropoff_city.strip().upper() if dropoff_city else None)

    if not pickup_code or len(pickup_code) != 3:
        return f"Sorry, I couldn't map **{pickup_city}** to a supported airport code. Try a major city (e.g., New York, Chicago).", {}

    if not dropoff_code or len(dropoff_code) != 3:
        return f"Sorry, I couldn't map **{dropoff_city}** to a supported airport code. Try a major city (e.g., New York, Chicago).", {}

    # 2) Normalize dates & times (MM/DD/YYYY for this endpoint)
    pickup_date = normalize_date_mmddyyyy(params.get("pick_up"))
    dropoff_date = normalize_date_mmddyyyy(params.get("drop_off_date"))
    pickup_time = normalize_time(params.get("car_pickup_time"))
    dropoff_time = normalize_time(params.get("car_dropoff_time"))

    if not pickup_date or not dropoff_date:
        return "Sorry — I’m missing the pick-up or drop-off date. What dates do you want?", {}

    # 3) Call Priceline Com Provider API
    search_params = {
        "pickup_date": pickup_date,
        "dropoff_date": dropoff_date,
        "pickup_time": pickup_time,
        "dropoff_time": dropoff_time,
        "pickup_airport_code": pickup_code,
        "dropoff_airport_code": dropoff_code,
        "currency": "USD",
        "drivers_age": "25",
        "limit": "50",
        "sort_order": "PRICE",
    }

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": CAR_API_HOST,
        "accept": "application/json",
    }

    try:
        res = requests.get(CAR_API_URL, headers=headers, params=search_params, timeout=30)
    except Exception as e:
        return f"Car search failed (network). {e}", {}

    if res.status_code != 200:
        return f"Car search failed ({res.status_code}). Try again.", {}

    data = res.json()

    # 4) Parse results_list object -> list
    root = data.get("getCarResultsRequest", {})
    results = root.get("results", {})
    results_list = results.get("results_list", {}) or {}

    if not isinstance(results_list, dict) or len(results_list) == 0:
        return "No rental cars available for those dates/airport. Try different dates or a different city.", {}

    # Convert dict results_list -> list of dicts with key
    cars = []
    for k, v in results_list.items():
        if isinstance(v, dict):
            vv = dict(v)
            vv["_result_key"] = k
            cars.append(vv)

    if not cars:
        return "No rental cars found. Try different dates or cities.", {}

    # Sort by TOTAL trip price (best UX)
    def total_price(x):
        try:
            return float((((x.get("price_details") or {}).get("base") or {}).get("total_price")) or 1e18)
        except:
            return 1e18

    cars.sort(key=total_price)

    # Take top 3
    top3 = cars[:3]

    reply = "🚗 **Best Car Rental Options:**\n\n"
    details = {}

    for idx, car in enumerate(top3, start=1):
        car_info = car.get("car", {}) if isinstance(car.get("car"), dict) else {}
        vendor = (car.get("partner", {}) or {}).get("name", "Unknown vendor")

        car_type = car_info.get("example", "Car")
        car_class = car_info.get("description", "")
        img = None

        images = car_info.get("images") if isinstance(car_info.get("images"), dict) else {}
        img = images.get("SIZE268X144") or images.get("SIZE335X180") or car_info.get("imageURL")

        base_price = ((car.get("price_details") or {}).get("base") or {}) if isinstance(car.get("price_details"), dict) else {}
        per_day = base_price.get("price", "N/A")
        total = base_price.get("total_price", "N/A")
        symbol = base_price.get("symbol", "$")

        pickup_loc = (car.get("pickup", {}) or {}).get("location", pickup_code)
        dropoff_loc = (car.get("dropoff", {}) or {}).get("location", dropoff_code)

        reply += (
            f"🚗 **Option {idx}**\n"
            f"• Vendor: {vendor}\n"
            f"• Car: {car_type}" + (f" ({car_class})\n" if car_class else "\n") +
            f"• Price: {symbol}{per_day}/day  |  Total: {symbol}{total}\n"
            f"• Pick-Up: {pickup_loc}\n"
            f"• Drop-Off: {dropoff_loc}\n\n"
        )

        # Store option details for next steps (keeps your flow intact)
        base = f"car_opt_{idx}"
        details[f"{base}_vendor"] = vendor
        details[f"{base}_type"] = car_type
        details[f"{base}_class"] = car_class
        details[f"{base}_price"] = per_day
        details[f"{base}_total"] = total
        details[f"{base}_pickup"] = pickup_loc
        details[f"{base}_dropoff"] = dropoff_loc
        details[f"{base}_image"] = img
        details[f"{base}_result_key"] = car.get("_result_key")
        details[f"{base}_bundle"] = car.get("postpaid_contract_bundle")

        # Also store dates so your existing select handler shows them
        details[f"{base}_pickup_date"] = pickup_date
        details[f"{base}_dropoff_date"] = dropoff_date

    reply += "Choose a car: **1, 2, or 3** or retry car rental search."

    return reply, details




# ============================================================
# 🚘 SELECT CAR HANDLER
# ============================================================
def handle_select_car(params):
    n = int(params.get("number"))
    base = f"car_opt_{n}"

    mapped = {
        "selected_car_vendor": params.get(f"{base}_vendor"),
        "selected_car_type": params.get(f"{base}_type"),
        "selected_car_class": params.get(f"{base}_class"),
        "selected_car_price": params.get(f"{base}_price"),          # per day
        "selected_car_total": params.get(f"{base}_total"),          # total trip
        "selected_car_pickup": params.get(f"{base}_pickup"),
        "selected_car_dropoff": params.get(f"{base}_dropoff"),
        "selected_car_pickup_date": params.get(f"{base}_pickup_date"),
        "selected_car_dropoff_date": params.get(f"{base}_dropoff_date"),
        "selected_car_image": params.get(f"{base}_image"),
        "selected_car_result_key": params.get(f"{base}_result_key"),
        "selected_car_bundle": params.get(f"{base}_bundle"),
    }

    preview = f"""
🚗 **Selected Car**

• Vendor: {mapped['selected_car_vendor']}
• Type: {mapped['selected_car_type']} ({mapped['selected_car_class']})
• Price: ${mapped['selected_car_price']}/day (Total: ${mapped['selected_car_total']})
• Pick-Up: {mapped['selected_car_pickup']} ({mapped['selected_car_pickup_date']})
• Drop-Off: {mapped['selected_car_dropoff']} ({mapped['selected_car_dropoff_date']})
"""

    

    return mapped, preview






def handle_car_booking_confirmation(params):
    car_vendor = params.get("selected_car_vendor")
    car_type = params.get("selected_car_type")
    car_class = params.get("selected_car_class")
    per_day = params.get("selected_car_price")
    total = params.get("selected_car_total")
    img = params.get("selected_car_image")

    pickup_loc = params.get("selected_car_pickup")
    pickup_date = params.get("selected_car_pickup_date")
    dropoff_loc = params.get("selected_car_dropoff")
    dropoff_date = params.get("selected_car_dropoff_date")

    driver_name = params.get("username")
    driver_email = params.get("useremail")
    driver_dob = params.get("userdob")

    msg = (
        f"🚗 **Car Rental Booking Summary**\n\n"
        f"• Vendor: {car_vendor}\n"
        f"• Car: {car_type} ({car_class})\n"
        f"• Price: ${per_day}/day  |  Total: ${total}\n"
        f"• Pick-Up: {pickup_loc} ({pickup_date})\n"
        f"• Drop-Off: {dropoff_loc} ({dropoff_date})\n\n"
        f"👤 **Driver Information**\n"
        f"• Name: {driver_name}\n"
        f"• Email: {driver_email}\n"
        f"• DOB: {driver_dob}\n\n"
    )

    if img:
        msg += f"🖼️ Car Image: {img}\n\n"

    msg += (
        "Would you like to confirm this booking?\n"
        "- yes → confirm selection\n"
        "- no → cancel or modify details"
    )

    return msg










# ============================================================
# ⭐⭐ WEBHOOK ROUTER ⭐⭐
# ============================================================

@app.post("/webhook")
def webhook():
    req = request.get_json()
    tag = req.get("fulfillmentInfo", {}).get("tag", "").strip()
    params = req.get("sessionInfo", {}).get("parameters", {})

    # -------------------- FLIGHT --------------------
    if tag == "Flight_Options":
        reply, details = handle_flight_options(params)
        return jsonify({
            "fulfillment_response": {"messages": [{"text": {"text": [reply]}}]},
            "sessionInfo": {"parameters": details}
        })

    if tag == "Select_Flight_Details":
        mapped, preview = handle_select_flight(params)
        return jsonify({
            "sessionInfo": {"parameters": mapped},
            "fulfillment_response": {"messages": [{"text": {"text": [preview]}}]}
        })

    if tag == "Booking_Confirmation":
        reply = handle_booking_confirmation(params)
        return jsonify({
            "fulfillment_response": {"messages": [{"text": {"text": [reply]}}]}
        })

    # -------------------- HOTELS --------------------
    if tag == "Hotel_Options":
        reply, details = handle_hotel_options(params)

        rich_cards = []
        for i in range(1, 4):
            img = details.get(f"hotel_opt_{i}_image")
            if img:
                rich_cards.append({
                    "type": "info",
                    "title": f"Option {i}: {details.get(f'hotel_opt_{i}_name')}",
                    "subtitle": f"${details.get(f'hotel_opt_{i}_price')}",
                    "image": {
                        "imageUri": img,
                        "accessibilityText": "Hotel image"
                    }
                })

        messages = [{"text": {"text": [reply]}}]

        if rich_cards:
            messages.append({
                "payload": {
                    "richContent": [rich_cards]
                }
            })

        return jsonify({
            "fulfillment_response": {"messages": messages},
            "sessionInfo": {"parameters": details}
        })

    if tag == "Select_Hotel_Details":
        mapped, preview = handle_select_hotel(params)

        messages = [{"text": {"text": [preview]}}]

        img = mapped.get("selected_hotel_image")
        if img:
            messages.append({
                "payload": {
                    "richContent": [[
                        {
                            "type": "image",
                            "rawUrl": img,
                            "accessibilityText": "Selected hotel"
                        }
                    ]]
                }
            })

        return jsonify({
            "sessionInfo": {"parameters": mapped},
            "fulfillment_response": {"messages": messages}
        })

    if tag == "Hotel_Booking_Confirmation":
        reply = handle_hotel_booking_confirmation(params)
        return jsonify({
            "fulfillment_response": {"messages": [{"text": {"text": [reply]}}]}
        })

    # -------------------- CAR RENTAL --------------------
    if tag == "Car_Rental_Options":
        reply, details = handle_car_rental_options(params)

        rich_cards = []
        for i in range(1, 4):
            img = details.get(f"car_opt_{i}_image")
            if img:
                rich_cards.append({
                    "type": "image",
                    "rawUrl": img,
                    "accessibilityText": f"Car option {i}"
                })

        messages = [{"text": {"text": [reply]}}]

        if rich_cards:
            messages.append({
                "payload": {
                    "richContent": [rich_cards]
                }
            })

        return jsonify({
            "fulfillment_response": {"messages": messages},
            "sessionInfo": {"parameters": details}
        })

    if tag == "Select_Car_Details":
        mapped, preview = handle_select_car(params)

        messages = [{"text": {"text": [preview]}}]

        img = mapped.get("selected_car_image")
        if img:
            messages.append({
                "payload": {
                    "richContent": [[
                        {
                            "type": "image",
                            "rawUrl": img,
                            "accessibilityText": "Selected rental car"
                        }
                    ]]
                }
            })

        return jsonify({
            "sessionInfo": {"parameters": mapped},
            "fulfillment_response": {"messages": messages}
        })

    if tag == "Car_Booking_Confirmation":
        reply = handle_car_booking_confirmation(params)
        return jsonify({
            "fulfillment_response": {"messages": [{"text": {"text": [reply]}}]}
        })

    # fallback
    return jsonify({
        "fulfillment_response": {"messages": [{"text": {"text": ["No handler matched this request."]}}]}
    })




# ============================================================
# ⭐ SIMPLE STREAMLIT CHAT ENDPOINT (NOT FOR DIALOGFLOW)
# ============================================================
@app.post("/chat")
def chat_ui():
    """
    This endpoint is ONLY for Streamlit UI.
    It expects: { "query": "hello" }
    It returns: { "reply": "..." }
    """

    req = request.get_json()
    user_msg = req.get("query", "").lower()

    # ==== SUPER BASIC LOGIC (OPTIONAL) ====
    # Instead of writing logic, we call your DF webhook pipeline 1:1.

    # Call DF webhook STRUCTURE but without DF
    # You can route messages based on keywords
    # Or directly hit your handlers if you want a fully custom UI

    # If you want to connect Streamlit → Dialogflow → Backend,
    # I can build the detectIntent version too.

    # For now: simple “intelligence”
    if "flight" in user_msg:
        reply = "Sure! I can help with flights. Tell me departure city, destination city, and date."
    elif "hotel" in user_msg:
        reply = "Okay! I need the hotel city, check-in, and check-out dates."
    elif "car" in user_msg:
        reply = "Let me help with car rentals. What's your pick-up and drop-off city?"
    else:
        reply = "I’m here to help with flights, hotels, and car rentals! Ask me anything."

    return jsonify({"reply": reply})


# ============================================================
# START SERVER
# ============================================================
if __name__ == "__main__":
    app.run(port=8080, host="0.0.0.0")