import { SessionsClient } from "@google-cloud/dialogflow-cx";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, sessionId } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    const agentId = process.env.DIALOGFLOW_AGENT_ID;
    const location = process.env.DIALOGFLOW_LOCATION || "us-central1";
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId || !agentId || !credentialsJson) {
      return res.status(500).json({
        error: "Dialogflow CX is not configured properly",
        missing: {
          projectId: !projectId,
          agentId: !agentId,
          credentials: !credentialsJson,
        },
      });
    }

    // Parse credentials JSON (and fix newline formatting for private_key)
    const credentials = JSON.parse(credentialsJson);
    const privateKey =
      typeof credentials.private_key === "string"
        ? credentials.private_key.replace(/\\n/g, "\n")
        : credentials.private_key;

    const sessionClient = new SessionsClient({
      apiEndpoint: `${location}-dialogflow.googleapis.com`,
      credentials: {
        client_email: credentials.client_email,
        private_key: privateKey,
      },
      projectId: credentials.project_id,
    });

    const currentSessionId =
      sessionId || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

    // Extract text response
    let responseText = "";
    if (queryResult.responseMessages?.length) {
      for (const msg of queryResult.responseMessages) {
        if (msg.text?.text?.length) {
          responseText += msg.text.text.join("\n");
        }

        // skip chips payloads (UI-only)
        if (msg.payload?.fields) {
          const richContent = msg.payload.fields["richContent"];
          if (richContent?.listValue) {
            let isChipsPayload = false;

            for (const item of richContent.listValue.values || []) {
              if (item.listValue) {
                for (const subItem of item.listValue.values || []) {
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
          if (textField?.stringValue) responseText += textField.stringValue;
        }
      }
    }

    // Pull images + itinerary params (same behavior as your routes.ts)
    let itinerary = "";
    let destination = "";
    const carImages = {};
    let selectedCarImage = "";
    const hotelImages = {};
    let selectedHotelImage = "";

    const fields = queryResult.parameters?.fields || {};

    const generatedItinerary = fields["session.params.generated_itinerary"];
    if (generatedItinerary?.stringValue) itinerary = generatedItinerary.stringValue;

    const destParam = fields["destination"];
    if (destParam?.stringValue) destination = destParam.stringValue;

    for (let i = 1; i <= 5; i++) {
      const imageKey = `car_opt_${i}_image`;
      const imageParam = fields[imageKey];
      if (imageParam?.stringValue) carImages[`option${i}`] = imageParam.stringValue;
    }

    const selectedCarImageParam = fields["selected_car_image"];
    if (selectedCarImageParam?.stringValue) selectedCarImage = selectedCarImageParam.stringValue;

    const upgradeHotelImageUrl = (url) =>
      url.replace(/\/square\d+\//, "/max500/").replace(/\/max\d+\//, "/max500/");

    for (let i = 1; i <= 5; i++) {
      const imageKey = `hotel_opt_${i}_image`;
      const imageParam = fields[imageKey];
      if (imageParam?.stringValue) {
        hotelImages[`option${i}`] = upgradeHotelImageUrl(imageParam.stringValue);
      }
    }

    const selectedHotelImageParam = fields["selected_hotel_image"];
    if (selectedHotelImageParam?.stringValue) {
      selectedHotelImage = upgradeHotelImageUrl(selectedHotelImageParam.stringValue);
    }

    const intentName = queryResult.intent?.displayName || "";
    if (itinerary && intentName === "trip_itinerary_plan") {
      responseText = itinerary;
    }

    responseText = (responseText || queryResult.transcript || "").replace(
      /Would you like to proceed with planning this trip\?/gi,
      ""
    ).trim();

    return res.json({
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
}
