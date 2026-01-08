import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("AMADEUS_API_KEY")
API_SECRET = os.getenv("AMADEUS_API_SECRET")

# TOKEN: ---------------------------------------------------------
token_url = "https://test.api.amadeus.com/v1/security/oauth2/token"

res = requests.post(token_url, data={
    "grant_type": "client_credentials",
    "client_id": API_KEY,
    "client_secret": API_SECRET
})

token_data = res.json()
access_token = token_data.get("access_token")
print("TOKEN:", access_token)

# FLIGHT SEARCH TEST: -------------------------------------------
url = "https://test.api.amadeus.com/v2/shopping/flight-offers"

query = {
    "originLocationCode": "MAD",
    "destinationLocationCode": "NYC",
    "departureDate": "2025-12-10",
    "adults": 1,
    "currencyCode": "USD"
}

headers = {
    "Authorization": f"Bearer {access_token}"
}

print("\nSearching flights...")
resp = requests.get(url, params=query, headers=headers)

print("STATUS:", resp.status_code)
print(resp.json())
