// netlify/functions/callback.js
exports.handler = async (event) => {
  try {
    // 1️⃣ Extract query parameters
    const params = event.queryStringParameters;
    const code = params.code;
    const state = params.state; // e.g., "USER_13"

    if (!code || !state) {
      return { statusCode: 400, body: "Missing code or state" };
    }

    const userId = state.replace("USER_", "");

    // 2️⃣ Dynamic import of node-fetch
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

    // 3️⃣ Exchange code for access_token
    const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
        redirect_uri: "https://navtarangindia.com/.netlify/functions/callback"
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error(tokenData);
      return { statusCode: 500, body: "Error retrieving access token" };
    }

    // 4️⃣ Save tokens in Neon (Postgres)
    const { Client } = require("pg");
    const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL });
    await client.connect();

    await client.query(
      `UPDATE users SET access_token=$1, refresh_token=$2 WHERE id=$3`,
      [tokenData.access_token, tokenData.refresh_token, userId]
    );

    await client.end();

    // 5️⃣ Return success message
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `<h2>✅ Access token saved successfully!</h2><p>You can now close this page.</p>`
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "❌ Error processing callback: " + err.toString() };
  }
};
