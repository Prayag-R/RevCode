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

// Simple in-memory storage (replace with database in production)
const userWordPressSites = new Map();

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasGeminiKey: !!GEMINI_API_KEY });
});

// ===== WORDPRESS SITE REGISTRATION =====
// Store WordPress site credentials
app.post("/api/wordpress/register", (req, res) => {
  try {
    const { userId, siteUrl, apiKey } = req.body;
    
    if (!userId || !siteUrl || !apiKey) {
      return res.status(400).json({ error: "Missing userId, siteUrl, or apiKey" });
    }

    // Validate URL format
    if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid siteUrl format" });
    }

    // Store the site credentials
    if (!userWordPressSites.has(userId)) {
      userWordPressSites.set(userId, []);
    }

    const sites = userWordPressSites.get(userId);
    const existingIndex = sites.findIndex(s => s.siteUrl === siteUrl);

    if (existingIndex >= 0) {
      sites[existingIndex] = { siteUrl, apiKey, createdAt: new Date() };
    } else {
      sites.push({ siteUrl, apiKey, createdAt: new Date() });
    }

    res.json({ 
      success: true, 
      message: "WordPress site registered successfully",
      site: { siteUrl, apiKey }
    });
  } catch (err) {
    console.error("WordPress registration error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get registered WordPress sites
app.get("/api/wordpress/sites/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const sites = userWordPressSites.get(userId) || [];
    
    res.json({ 
      sites: sites.map(s => ({ 
        siteUrl: s.siteUrl, 
        createdAt: s.createdAt 
      }))
    });
  } catch (err) {
    console.error("Get sites error:", err.message);
    res.status(500).json({ error: err.message });
  }
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

// ===== DEPLOY CODE TO WORDPRESS PLUGIN =====
app.post("/api/deploy-code", async (req, res) => {
  try {
    const { siteUrl, apiKey, code, codeType, userId } = req.body;
    
    if (!siteUrl || !apiKey || !code || !codeType) {
      return res.status(400).json({ error: "Missing siteUrl, apiKey, code, or codeType" });
    }

    if (!["css", "js", "html"].includes(codeType)) {
      return res.status(400).json({ error: "codeType must be 'css', 'js', or 'html'" });
    }

    // Normalize site URL (remove trailing slash)
    const normalizedUrl = siteUrl.replace(/\/$/, "");

    // Deploy to WordPress plugin
    const deploymentUrl = `${normalizedUrl}/wp-json/aicd/v1/deploy`;

    const response = await axios.post(
      deploymentUrl,
      {
        code: code,
        code_type: codeType
      },
      {
        headers: {
          "X-AICD-API-Key": apiKey,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log(`✅ Code deployed to ${siteUrl}`);

    res.json({
      success: true,
      message: "Code deployed successfully to WordPress site",
      deployment: response.data
    });
  } catch (err) {
    console.error("Deploy error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Failed to deploy code",
      details: err.response?.data?.message || err.message
    });
  }
});

// ===== DEPLOY MULTIPLE CODES =====
app.post("/api/deploy-codes", async (req, res) => {
  try {
    const { siteUrl, apiKey, deployments } = req.body;
    
    if (!siteUrl || !apiKey || !deployments || !Array.isArray(deployments)) {
      return res.status(400).json({ error: "Missing siteUrl, apiKey, or deployments array" });
    }

    const normalizedUrl = siteUrl.replace(/\/$/, "");
    const deploymentUrl = `${normalizedUrl}/wp-json/aicd/v1/deploy`;

    const response = await axios.post(
      deploymentUrl,
      { deployments },
      {
        headers: {
          "X-AICD-API-Key": apiKey,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log(`✅ ${deployments.length} code(s) deployed to ${siteUrl}`);

    res.json({
      success: true,
      message: `${deployments.length} code(s) deployed successfully`,
      deployment: response.data
    });
  } catch (err) {
    console.error("Deploy error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Failed to deploy codes",
      details: err.response?.data?.message || err.message
    });
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

    const systemPrompt = `You are a WordPress code generator. Generate ONLY valid CSS, JavaScript, or HTML code.
    
Return the code in this JSON format:
{
  "code": "YOUR_CODE_HERE",
  "code_type": "css" or "js" or "html",
  "description": "brief description"
}

Rules:
- For styling changes, use CSS with !important flags
- For interactions, use vanilla JavaScript (no jQuery)
- Keep code production-ready
- Return ONLY valid JSON, no markdown or extra text`;

    const r = await axios.post(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      contents: [{ 
        parts: [{ 
          text: `${systemPrompt}\n\nPrompt:\n${prompt}` 
        }] 
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    });

    const responseText = r.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Try to parse JSON from response
    let parsedCode;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsedCode = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", responseText);
      return res.status(500).json({ 
        error: "Failed to parse generated code", 
        rawResponse: responseText 
      });
    }

    res.json({ 
      code: parsedCode.code,
      code_type: parsedCode.code_type,
      description: parsedCode.description
    });
  } catch (err) {
    console.error("Gemini code error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== DIRECT SETUP (NO OAUTH) =====
app.post("/api/setup/direct", async (req, res) => {
  try {
    const { userId, siteUrl, apiKey, siteName } = req.body;

    if (!userId || !siteUrl || !apiKey) {
      return res.status(400).json({ 
        error: "Missing userId, siteUrl, or apiKey",
        hint: "Get these from: WordPress Admin → AI Code Deployer"
      });
    }

    // Validate URL format
    if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid URL format. Must start with http:// or https://" });
    }

    // Verify the API key works by testing the plugin endpoint
    const testEndpoint = `${siteUrl.replace(/\/$/, "")}/wp-json/aicd/v1/deployments`;
    
    try {
      const testRes = await axios.get(testEndpoint, {
        headers: { "X-AICD-API-Key": apiKey },
        timeout: 5000
      });

      // API key is valid, save it
      if (!userWordPressSites.has(userId)) {
        userWordPressSites.set(userId, []);
      }

      const sites = userWordPressSites.get(userId);
      const newSite = {
        id: Math.random().toString(36).substring(7),
        name: siteName || "My WordPress Site",
        siteUrl: siteUrl.replace(/\/$/, ""),
        apiKey: apiKey,
        setupMethod: "direct",
        createdAt: new Date().toISOString(),
        verified: true
      };

      sites.push(newSite);

      console.log(`✅ Direct setup successful for ${siteUrl}`);

      res.json({
        success: true,
        message: "WordPress site connected successfully!",
        site: {
          id: newSite.id,
          name: newSite.name,
          siteUrl: newSite.siteUrl,
          createdAt: newSite.createdAt
        }
      });
    } catch (testErr) {
      console.error("API key verification failed:", testErr.message);
      res.status(401).json({
        error: "Invalid API key or site URL",
        details: "Could not connect to your WordPress site. Check that:",
        hints: [
          "✓ The AI Code Deployer plugin is installed and activated",
          "✓ The site URL is correct (e.g., https://example.com)",
          "✓ The API key is correct",
          "✓ Your site is accessible from the internet"
        ]
      });
    }
  } catch (err) {
    console.error("Direct setup error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== FULL PIPELINE: Review → Code → Deploy =====
app.post("/api/review-to-deploy", async (req, res) => {
  try {
    const { review, siteUrl, apiKey, userId } = req.body;
    
    if (!review || !siteUrl || !apiKey) {
      return res.status(400).json({ error: "Missing review, siteUrl, or apiKey" });
    }

    console.log("🔄 Starting review-to-deploy pipeline...");

    // Step 1: Generate prompt from review
    console.log("📝 Generating prompt from review...");
    const promptRes = await axios.post(`http://localhost:${PORT}/api/generate-prompt`, { review });
    const prompt = promptRes.data.prompt;

    // Step 2: Generate code from prompt
    console.log("💻 Generating code from prompt...");
    const codeRes = await axios.post(`http://localhost:${PORT}/api/generate-code`, { prompt });
    const { code, code_type, description } = codeRes.data;

    // Step 3: Deploy code to WordPress
    console.log("🚀 Deploying code to WordPress...");
    const deployRes = await axios.post(`http://localhost:${PORT}/api/deploy-code`, {
      siteUrl,
      apiKey,
      code,
      codeType: code_type,
      userId
    });

    res.json({
      success: true,
      message: "Review processed and deployed successfully",
      pipeline: {
        review: review.substring(0, 50) + "...",
        prompt: prompt.substring(0, 100) + "...",
        code_type: code_type,
        description: description,
        deployment: deployRes.data.deployment
      }
    });
  } catch (err) {
    console.error("Pipeline error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Pipeline failed", 
      details: err.response?.data || err.message 
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✓ Gemini Key: ${!!GEMINI_API_KEY}`);
  console.log(`✓ WordPress OAuth Client ID: ${!!WORDPRESS_CLIENT_ID}`);
  console.log(`✓ Redirect URI: ${WORDPRESS_REDIRECT_URI}`);
  console.log(`✓ WordPress Plugin Integration: ACTIVE`);
});