import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import dialogflow from "@google-cloud/dialogflow";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Dialogflow Chat Route
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const projectId = process.env.DIALOGFLOW_PROJECT_ID;
      const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

      if (!projectId || !credentialsJson) {
        return res.status(500).json({ error: "Dialogflow is not configured" });
      }

      // Parse the credentials JSON
      const credentials = JSON.parse(credentialsJson);

      // Create a session client with explicit credentials
      const sessionClient = new dialogflow.SessionsClient({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        projectId: credentials.project_id,
      });

      // Use provided sessionId or generate a new one
      const session = sessionClient.projectAgentSessionPath(
        projectId,
        sessionId || `session-${Date.now()}`
      );

      // Build the request
      const request = {
        session,
        queryInput: {
          text: {
            text: message,
            languageCode: "en-US",
          },
        },
      };

      // Send message to Dialogflow
      const [response] = await sessionClient.detectIntent(request);
      const result = response.queryResult;

      if (!result) {
        return res.status(500).json({ error: "No response from Dialogflow" });
      }

      res.json({
        response: result.fulfillmentText || "I didn't understand that. Could you try again?",
        intent: result.intent?.displayName || null,
        confidence: result.intentDetectionConfidence || 0,
        parameters: result.parameters?.fields || {},
      });

    } catch (error: any) {
      console.error("Dialogflow error:", error);
      res.status(500).json({ 
        error: "Failed to process message",
        details: error.message 
      });
    }
  });

  return httpServer;
}
