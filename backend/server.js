// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ===== ENVIRONMENT VARIABLES =====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const WORDPRESS_CLIENT_ID = process.env.WORDPRESS_CLIENT_ID;
const WORDPRESS_CLIENT_SECRET = process.env.WORDPRESS_CLIENT_SECRET;
const WORDPRESS_REDIRECT_URI = process.env.WORDPRESS_REDIRECT_URI;
const WORDPRESS_AUTHORIZE_URL = process.env.WORDPRESS_AUTHORIZE_URL;
const WORDPRESS_TOKEN_URL = process.env.WORDPRESS_TOKEN_URL;

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasGeminiKey: !!GEMINI_API_KEY });
});

// ===== WORDPRESS OAUTH =====
app.get("/api/oauth/authorize-url", (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const SCOPES = "global";

  const url = `${WORDPRESS_AUTHORIZE_URL}?client_id=${WORDPRESS_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    WORDPRESS_REDIRECT_URI
  )}&response_type=code&state=${state}&scope=${encodeURIComponent(SCOPES)}`;

  res.json({ authorizeUrl: url, state });
});

// Handle OAuth callback redirect
app.get("/auth/callback", (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=no_code`);
  }

  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?code=${code}&state=${state}`);
});

app.post("/api/oauth/token", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code required" });

    const response = await axios.post(
      WORDPRESS_TOKEN_URL,
      new URLSearchParams({
        client_id: WORDPRESS_CLIENT_ID,
        client_secret: WORDPRESS_CLIENT_SECRET,
        redirect_uri: WORDPRESS_REDIRECT_URI,
        code,
        grant_type: "authorization_code",
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    res.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    });
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get access token", details: err.response?.data });
  }
});

// ===== LIST WORDPRESS SITES =====
app.get("/api/list-wordpress-sites", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(400).json({ error: "Missing authorization token" });

    const response = await axios.get("https://public-api.wordpress.com/rest/v1.1/me/sites", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const formattedSites = response.data.sites.map(site => ({
      name: site.name,
      url: site.URL,
      id: site.ID,
    }));

    res.json({ sites: formattedSites });
  } catch (err) {
    console.error("List sites error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== FETCH WORDPRESS SITE CODE =====
app.post("/api/fetch-wordpress-code", async (req, res) => {
  try {
    const { siteUrl, accessToken } = req.body;
    if (!siteUrl || !accessToken)
      return res.status(400).json({ error: "Missing siteUrl or accessToken" });

    res.json({ siteCode: "Site context available" });
  } catch (err) {
    console.error("Fetch site code error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== DEPLOY CODE =====
app.post("/api/deploy-code", async (req, res) => {
  try {
    const { siteUrl, accessToken, code } = req.body;
    if (!siteUrl || !accessToken || !code)
      return res.status(400).json({ error: "Missing required parameters" });

    res.json({
      success: true,
      message: "Code deployment to WordPress coming soon.",
    });
  } catch (err) {
    console.error("Deploy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GEMINI ENDPOINTS =====
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { review } = req.body;
    if (!review) return res.status(400).json({ error: "Review required" });

    const r = await axios.post(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: `Create an actionable implementation prompt from this review:\n"${review}"` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    });

    const prompt = r.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ prompt });
  } catch (err) {
    console.error("Gemini prompt error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-code", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    const r = await axios.post(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: `Generate production-ready PHP or JavaScript code for WordPress.\n\nPrompt:\n${prompt}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    });

    const code = r.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ code });
  } catch (err) {
    console.error("Gemini code error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✓ Gemini Key: ${!!GEMINI_API_KEY}`);
  console.log(`✓ WordPress OAuth Client ID: ${!!WORDPRESS_CLIENT_ID}`);
  console.log(`✓ Redirect URI: ${WORDPRESS_REDIRECT_URI}`);
});
