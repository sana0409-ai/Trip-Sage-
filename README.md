# Travel Bot (Flask)

A Flask-based webhook service for travel search flows (flights, hotels, and car rentals). It integrates with Amadeus, Booking, Priceline (RapidAPI), and Geoapify to return option cards and booking summaries. The `/webhook` endpoint is intended for Dialogflow CX, and `/chat` is a lightweight Streamlit-friendly endpoint.

## Features
- Flight search with optional layover filtering (Amadeus)
- Hotel search with budget filtering and rich image cards (Booking via RapidAPI)
- Car rental search with airport mapping and image cards (Priceline via RapidAPI)
- Dialogflow CX webhook handler with option selection and confirmation flows

## Requirements
- Python 3.9+ (recommended)
- API keys for the providers listed below

## Setup
1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root with the following values:

```env
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret

BOOKING_API_KEY=your_rapidapi_key
BOOKING_API_HOST=your_booking_rapidapi_host
RAPIDAPI_KEY=your_rapidapi_key

CAR_API_HOST=priceline-com-provider.p.rapidapi.com
GEO_API_KEY=your_geoapify_key
```

## Run
```bash
python app.py
```

The server will start on `http://0.0.0.0:8080`.

## Run With ngrok (Dialogflow Webhook)
1. Start the Flask app:

```bash
python app.py
```

2. In a separate terminal, start ngrok:

```bash
ngrok http 8080
```

3. Copy the HTTPS forwarding URL from ngrok (for example, `https://xxxxx.ngrok-free.app`) and set your Dialogflow CX webhook URL to:

```
https://xxxxx.ngrok-free.app/webhook
```

If ngrok is not installed, download it from `https://ngrok.com/download` and authenticate with your token (`ngrok config add-authtoken <TOKEN>`).

## Endpoints
- `POST /webhook`
  - Dialogflow CX webhook handler. Expects Dialogflow CX request payloads and returns fulfillment responses with optional rich content.
- `POST /chat`
  - Simple JSON endpoint for a Streamlit UI.
  - Request: `{ "query": "hello" }`
  - Response: `{ "reply": "..." }`

## Example (chat)
```bash
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "find me a flight"}'
```

## Notes
- Airport and city mappings are embedded in `app.py` for flights and car rentals.
- Hotel and car results are limited to the top 3 options.
- Ensure your Dialogflow CX parameters match the expected keys in the handlers.

## Project Structure
- `app.py`: Flask app, webhook handlers, and API integrations

## Troubleshooting
- If you see authentication errors, verify the API keys and host names in `.env`.
- If no results are returned, try different cities/dates or verify provider quotas.
