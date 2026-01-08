import streamlit as st
import json
import uuid
from google.cloud import dialogflowcx_v3 as dialogflow
from google.oauth2 import service_account
from google.api_core.client_options import ClientOptions
import os
import base64

# ===========================================================
# CONFIG
# ===========================================================
st.set_page_config(page_title="Trip Sage • Travel Assistant", page_icon="🌍")


# ===========================================================
# BASE DIRECTORY
# ===========================================================
BASE_DIR = os.path.dirname(__file__)
IMAGE_PATH = os.path.join(BASE_DIR, "trip_sage_infographic.png")
KEY_PATH = os.path.join(BASE_DIR, "dialogflow_key.json")


# ===========================================================
# LOAD BACKGROUND IMAGE (CSS BASE64)
# ===========================================================
def encode_image(image_path):
    with open(image_path, "rb") as img:
        return base64.b64encode(img.read()).decode()


bg_base64 = encode_image(IMAGE_PATH)

st.markdown(f"""
<style>

@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap');

html, body, [class*="css"] {{
    font-family: 'Poppins', sans-serif;
    height: 100%;
    margin: 0;
}}

.stApp {{
    background-image: url("data:image/png;base64,{bg_base64}");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: top center;
    background-attachment: fixed;
    background-color: #d8ecff;
}}

/* REMOVE TOP EMPTY BAR */
header {{ height: 0 !important; padding: 0 !important; margin: 0 !important; }}
.st-emotion-cache-18ni7ap {{ padding-top: 0 !important; margin-top: 0 !important; }}
.block-container {{ padding-top: 0 !important; }}

.user-bubble {{
    background-color: #ffffffd9;
    padding: 14px 18px;
    border-radius: 14px;
    margin-bottom: 10px;
    max-width: 70%;
    color: #000;
    font-size: 16px;
    backdrop-filter: blur(5px);
    box-shadow: 0px 4px 12px rgba(0,0,0,0.1);
}}

.bot-bubble {{
    background: linear-gradient(135deg, #ffd66c, #ff9e2b);
    padding: 14px 18px;
    border-radius: 14px;
    margin-bottom: 10px;
    max-width: 70%;
    color: black;
    font-size: 16px;
    box-shadow: 0px 4px 12px rgba(0,0,0,0.15);
}}

.chat-container {{
    margin: auto;
    max-width: 800px;
    padding: 10px 20px;
    background: rgba(255,255,255,0.0);
    border-radius: 20px;
    backdrop-filter: none;
    margin-top: 20px;
    margin-bottom: 140px;
}}

.stChatInput {{
    position: fixed !important;
    bottom: 20px !important;
    width: 60% !important;
    left: 20% !important;
}}

</style>
""", unsafe_allow_html=True)




# ===========================================================
# LOAD DIALOGFLOW KEY
# ===========================================================
with open(KEY_PATH) as f:
    key_data = json.load(f)

credentials = service_account.Credentials.from_service_account_info(key_data)

PROJECT_ID = key_data["project_id"]
LOCATION = "us-central1"
AGENT_ID = "6b6ca8cb-339c-44bc-823b-ff8f96359c4c"


# ===========================================================
# DIALOGFLOW CLIENT
# ===========================================================
def get_session_client():
    opts = ClientOptions(api_endpoint="us-central1-dialogflow.googleapis.com")
    return dialogflow.SessionsClient(credentials=credentials, client_options=opts)


def detect_intent_text(text, session_id):
    client = get_session_client()

    session = client.session_path(PROJECT_ID, LOCATION, AGENT_ID, session_id)

    query_input = dialogflow.QueryInput(
        text=dialogflow.TextInput(text=text),
        language_code="en"
    )

    req = dialogflow.DetectIntentRequest(session=session, query_input=query_input)
    res = client.detect_intent(request=req)

    messages = res.query_result.response_messages
    full_msg = "\n".join([m.text.text[0] for m in messages if m.text.text])
    return full_msg


# ===========================================================
# SESSION STATE
# ===========================================================
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

if "messages" not in st.session_state:
    st.session_state.messages = []


# ===========================================================
# CHAT WINDOW UI
# ===========================================================
st.markdown('<div class="chat-container">', unsafe_allow_html=True)

for m in st.session_state.messages:
    bubble = "user-bubble" if m["role"] == "user" else "bot-bubble"
    st.markdown(f'<div class="{bubble}">{m["content"]}</div>', unsafe_allow_html=True)

st.markdown("</div>", unsafe_allow_html=True)


# ===========================================================
# CHAT INPUT + IMMEDIATE PROCESSING
# ===========================================================
user_msg = st.chat_input("Ask me about flights, hotels, trip planning, or car rentals...")

if user_msg:
    st.session_state.messages.append({"role": "user", "content": user_msg})

    bot_reply = detect_intent_text(user_msg, st.session_state.session_id)

    st.session_state.messages.append({"role": "assistant", "content": bot_reply})

    st.rerun()
