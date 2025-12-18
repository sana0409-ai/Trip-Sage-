import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Dialogflow CX Chat Route
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
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
            credentials: !credentialsJson
          }
        });
      }

      // Parse the credentials JSON
      const credentials = JSON.parse(credentialsJson);

      // Create a Dialogflow CX session client with explicit credentials
      const sessionClient = new SessionsClient({
        apiEndpoint: `${location}-dialogflow.googleapis.com`,
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        projectId: credentials.project_id,
      });

      // Use provided sessionId or generate a new one
      const currentSessionId = sessionId || `session-${Date.now()}`;
      
      // Build the session path for Dialogflow CX
      const sessionPath = sessionClient.projectLocationAgentSessionPath(
        projectId,
        location,
        agentId,
        currentSessionId
      );

      // Build the request for Dialogflow CX
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
          },
          languageCode: "en",
        },
      };

      // Log the exact message being sent to Dialogflow
      console.log(`Sending to Dialogflow: "${message}" | Session: ${currentSessionId}`);
      
      // Send message to Dialogflow CX
      const [response] = await sessionClient.detectIntent(request);
      const queryResult = response.queryResult;
      
      // Log extracted parameters for debugging
      if (queryResult?.parameters?.fields) {
        const params = queryResult.parameters.fields;
        console.log("Dialogflow extracted parameters:", JSON.stringify(Object.keys(params).map(k => `${k}: ${JSON.stringify(params[k])}`)));
      }

      if (!queryResult) {
        return res.status(500).json({ error: "No response from Dialogflow CX" });
      }


      // Extract the response text from response messages
      let responseText = "";
      if (queryResult.responseMessages && queryResult.responseMessages.length > 0) {
        for (const msg of queryResult.responseMessages) {
          if (msg.text && msg.text.text && msg.text.text.length > 0) {
            responseText += msg.text.text.join("\n");
          }
          // Handle custom payloads - but skip chip/button payloads (those are UI elements, not text)
          if (msg.payload && msg.payload.fields) {
            // Check if this is a chips/buttons payload - skip it
            const richContent = msg.payload.fields["richContent"];
            if (richContent && richContent.listValue) {
              let isChipsPayload = false;
              for (const item of richContent.listValue.values || []) {
                if (item.listValue) {
                  for (const subItem of item.listValue.values || []) {
                    if (subItem.structValue && subItem.structValue.fields) {
                      const typeField = subItem.structValue.fields["type"];
                      if (typeField && typeField.stringValue === "chips") {
                        isChipsPayload = true;
                        break;
                      }
                    }
                  }
                }
                if (isChipsPayload) break;
              }
              // Skip chips payloads - they're just button options
              if (isChipsPayload) {
                continue;
              }
            }
            
            // For non-chips payloads, extract text
            const textField = msg.payload.fields["text"];
            if (textField && textField.stringValue) {
              responseText += textField.stringValue;
            }
          }
        }
      }

      // Check if there's a generated itinerary in session parameters
      let itinerary = "";
      let destination = "";
      const carImages: { [key: string]: string } = {};
      let selectedCarImage = "";
      const hotelImages: { [key: string]: string } = {};
      let selectedHotelImage = "";
      
      if (queryResult.parameters && queryResult.parameters.fields) {
        const generatedItinerary = queryResult.parameters.fields["session.params.generated_itinerary"];
        if (generatedItinerary && generatedItinerary.stringValue) {
          itinerary = generatedItinerary.stringValue;
        }
        
        // Try to find the destination parameter
        const destParam = queryResult.parameters.fields["destination"];
        if (destParam && destParam.stringValue) {
          destination = destParam.stringValue;
        }
        
        // Extract car option images
        for (let i = 1; i <= 5; i++) {
          const imageKey = `car_opt_${i}_image`;
          const imageParam = queryResult.parameters.fields[imageKey];
          if (imageParam && imageParam.stringValue) {
            carImages[`option${i}`] = imageParam.stringValue;
          }
        }
        
        // Extract selected car image
        const selectedCarImageParam = queryResult.parameters.fields["selected_car_image"];
        if (selectedCarImageParam && selectedCarImageParam.stringValue) {
          selectedCarImage = selectedCarImageParam.stringValue;
        }
        
        // Extract hotel option images and upgrade to higher resolution
        const upgradeHotelImageUrl = (url: string): string => {
          return url
            .replace(/\/square\d+\//, '/max500/')
            .replace(/\/max\d+\//, '/max500/');
        };
        
        for (let i = 1; i <= 5; i++) {
          const imageKey = `hotel_opt_${i}_image`;
          const imageParam = queryResult.parameters.fields[imageKey];
          if (imageParam && imageParam.stringValue) {
            hotelImages[`option${i}`] = upgradeHotelImageUrl(imageParam.stringValue);
          }
        }
        
        // Extract selected hotel image
        const selectedHotelImageParam = queryResult.parameters.fields["selected_hotel_image"];
        if (selectedHotelImageParam && selectedHotelImageParam.stringValue) {
          selectedHotelImage = upgradeHotelImageUrl(selectedHotelImageParam.stringValue);
        }
      }
      
      console.log(`User input: "${message}" | Destination: "${destination}" | Itinerary starts with: "${itinerary.substring(0, 50)}..."`);
      

      // Only show itinerary if this is the trip_itinerary_plan intent (not for booking flows)
      const intentName = queryResult.intent?.displayName || "";
      if (itinerary && intentName === "trip_itinerary_plan") {
        responseText = itinerary;
      }
      
      // Remove "Would you like to proceed with planning this trip?" prompt
      responseText = responseText.replace(/Would you like to proceed with planning this trip\?/gi, "").trim();

      // Fallback to transcript if no response messages
      if (!responseText && queryResult.transcript) {
        responseText = queryResult.transcript;
      }

      res.json({
        response: responseText || "I didn't understand that. Could you try again?",
        intent: queryResult.intent?.displayName || null,
        confidence: queryResult.intentDetectionConfidence || 0,
        currentPage: queryResult.currentPage?.displayName || null,
        sessionId: currentSessionId,
        carImages: Object.keys(carImages).length > 0 ? carImages : undefined,
        selectedCarImage: selectedCarImage || undefined,
        hotelImages: Object.keys(hotelImages).length > 0 ? hotelImages : undefined,
        selectedHotelImage: selectedHotelImage || undefined,
      });

    } catch (error: any) {
      console.error("Dialogflow CX error:", error);
      res.status(500).json({ 
        error: "Failed to process message",
        details: error.message 
      });
    }
  });

  return httpServer;
}
