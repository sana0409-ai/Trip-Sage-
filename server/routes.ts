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

      // Send message to Dialogflow CX
      const [response] = await sessionClient.detectIntent(request);
      const queryResult = response.queryResult;

      if (!queryResult) {
        return res.status(500).json({ error: "No response from Dialogflow CX" });
      }

      // Log full response for debugging
      console.log("Dialogflow full response:", JSON.stringify(response, null, 2));
      console.log("Query result:", JSON.stringify(queryResult, null, 2));

      // Extract the response text from response messages
      let responseText = "";
      if (queryResult.responseMessages && queryResult.responseMessages.length > 0) {
        for (const msg of queryResult.responseMessages) {
          if (msg.text && msg.text.text && msg.text.text.length > 0) {
            responseText += msg.text.text.join("\n");
          }
        }
      }

      // Check if there's a generated itinerary in session parameters
      let itinerary = "";
      if (queryResult.parameters && queryResult.parameters.fields) {
        const generatedItinerary = queryResult.parameters.fields["session.params.generated_itinerary"];
        if (generatedItinerary && generatedItinerary.stringValue) {
          itinerary = generatedItinerary.stringValue;
        }
      }

      // If we have an itinerary and the current response is asking to collect details,
      // show the itinerary instead (it will be shown once, then the flow continues)
      if (itinerary && (responseText.includes("Please provide") || responseText.includes("pick-up"))) {
        // Remove the "Would you like to proceed" prompt to show just the itinerary
        responseText = itinerary;
      }
      
      // Remove "Would you like to proceed with planning this trip?" if it comes after showing itinerary
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
