const { SessionsClient } = require("@google-cloud/dialogflow-cx");

// Small helper
const safeIncludes = (value, search) => typeof value === "string" && value.includes(search);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, sessionId } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message is required" });

    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const agentId = process.env.DIALOGFLOW_AGENT_ID;
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId || !agentId || !credentialsJson) {
      return res.status(500).json({
        error: "Dialogflow CX is not configured properly",
        missing: {
          DIALOGFLOW_PROJECT_ID: !projectId,
          DIALOGFLOW_AGENT_ID: !agentId,
          GOOGLE_APPLICATION_CREDENTIALS_JSON: !credentialsJson,
        },
      });
    }

    const credentials = JSON.parse(credentialsJson);

    const sessionClient = new SessionsClient({
      apiEndpoint: `${location}-dialogflow.googleapis.com`,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });

    const currentSessionId = sessionId || `session-${Date.now()}`;
    const sessionPath = sessionClient.projectLocationAgentSessionPath(
      projectId,
      location,
      agentId,
      currentSessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: { text: message },
        languageCode: "en",
      },
    };

    const [response] = await sessionClient.detectIntent(request);
    const queryResult = response.queryResult;

    if (!queryResult) {
      return res.status(500).json({ error: "No response from Dialogflow CX" });
    }

    // Extract response text
    let responseText = "";
    if (queryResult.responseMessages?.length) {
      for (const msg of queryResult.responseMessages) {
        if (msg.text?.text?.length) {
          responseText += msg.text.text.join("\n") + "\n";
        }

        // Skip "chips" payloads
        if (msg.payload?.fields) {
          const richContent = msg.payload.fields["richContent"];
          if (richContent?.listValue?.values) {
            let isChipsPayload = false;

            for (const item of richContent.listValue.values) {
              if (item.listValue?.values) {
                for (const subItem of item.listValue.values) {
                  const typeField = subItem.structValue?.fields?.["type"];
                  if (typeField?.stringValue === "chips") {
                    isChipsPayload = true;
                    break;
                  }
                }
              }
              if (isChipsPayload) break;
            }

            if (isChipsPayload) continue;
          }

          const textField = msg.payload.fields["text"];
          if (textField?.stringValue) responseText += textField.stringValue + "\n";
        }
      }
    }

    responseText = responseText.trim();

    // Pull images from parameters (same logic you had)
    const carImages = {};
    const hotelImages = {};
    let selectedCarImage = "";
    let selectedHotelImage = "";

    const upgradeHotelImageUrl = (url) =>
      url.replace(/\/square\d+\//, "/max500/").replace(/\/max\d+\//, "/max500/");

    const fields = queryResult.parameters?.fields || {};
    for (let i = 1; i <= 5; i++) {
      const carParam = fields[`car_opt_${i}_image`];
      if (carParam?.stringValue) carImages[`option${i}`] = carParam.stringValue;

      const hotelParam = fields[`hotel_opt_${i}_image`];
      if (hotelParam?.stringValue) hotelImages[`option${i}`] = upgradeHotelImageUrl(hotelParam.stringValue);
    }

    if (fields["selected_car_image"]?.stringValue) {
      selectedCarImage = fields["selected_car_image"].stringValue;
    }

    if (fields["selected_hotel_image"]?.stringValue) {
      selectedHotelImage = upgradeHotelImageUrl(fields["selected_hotel_image"].stringValue);
    }

    // Itinerary override (same as your server code)
    const intentName = queryResult.intent?.displayName || "";
    const itineraryParam = fields["session.params.generated_itinerary"];
    const itinerary = itineraryParam?.stringValue || "";

    if (itinerary && intentName === "trip_itinerary_plan") {
      responseText = itinerary;
    }

    responseText = responseText
      .replace(/Would you like to proceed with planning this trip\?/gi, "")
      .trim();

    if (!responseText && queryResult.transcript) {
      responseText = queryResult.transcript;
    }

    return res.status(200).json({
      response: responseText || "I didn't understand that. Could you try again?",
      intent: queryResult.intent?.displayName || null,
      confidence: queryResult.intentDetectionConfidence || 0,
      currentPage: queryResult.currentPage?.displayName || null,
      sessionId: currentSessionId,
      carImages: Object.keys(carImages).length ? carImages : undefined,
      selectedCarImage: selectedCarImage || undefined,
      hotelImages: Object.keys(hotelImages).length ? hotelImages : undefined,
      selectedHotelImage: selectedHotelImage || undefined,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to process message",
      details: err?.message || String(err),
    });
  }
};
