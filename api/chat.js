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

  const target = process.env.DIALOGFLOW_WEBHOOK_URL;
  if (!target) {
    return res.status(500).json({
      error: "Missing DIALOGFLOW_WEBHOOK_URL env variable",
    });
  }

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.DIALOGFLOW_WEBHOOK_AUTH
          ? { Authorization: process.env.DIALOGFLOW_WEBHOOK_AUTH }
          : {}),
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const text = await upstream.text();

    // Try to return JSON, otherwise return debug info
    try {
      const json = JSON.parse(text);
      return res.status(upstream.status).json(json);
    } catch {
      return res.status(upstream.status).json({
        error: "Upstream did not return JSON",
        status: upstream.status,
        preview: text.slice(0, 300),
      });
    }
  } catch (err) {
    return res.status(500).json({
      error: "Proxy request failed",
      message: err?.message || String(err),
    });
  }
}
