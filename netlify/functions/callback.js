// netlify/functions/callback.js
exports.handler = async (event) => {
  // dynamic import for node-fetch
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  try {
    // Get code and state from query parameters
    const params = event.queryStringParameters;
    const code = params.code;
    const state = params.state; // e.g., USER_1
    const userId = state.replace("USER_", "");

    if (!code) return { statusCode: 400, body: "Missing code" };

    // Exchange code for access token
    const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
        redirect_uri: "https://navtarangindia.com/.netlify/functions/callback"
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Token response:", tokenData);
      return { statusCode: 500, body: "Error: no access token returned" };
    }

    // Store tokens in Neon/Postgres DB
    const { Client } = require("pg");
    const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL });
    await client.connect();

    await client.query(
      `UPDATE users SET access_token=$1, refresh_token=$2 WHERE id=$3`,
      [tokenData.access_token, tokenData.refresh_token, userId]
    );

    await client.end();

    return {
      statusCode: 200,
      body: "✅ Access token saved successfully! You can close this page."
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "❌ Error processing callback" };
  }
};
