const { Client } = require("pg");
const fetch = require("node-fetch"); // add node-fetch if not already installed

exports.handler = async (event) => {
  try {
    // Get query params
    const code = event.queryStringParameters.code;
    const state = event.queryStringParameters.state; // USER_1
    const userId = state.replace("USER_", "");

    if (!code) {
      return { statusCode: 400, body: "Missing code" };
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
        redirect_uri: "https://navtarangindia.com/netlify/functions/callback"
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return { statusCode: 400, body: JSON.stringify(tokenData) };
    }

    // Save tokens in Neon DB
    const client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL
    });
    await client.connect();

    await client.query(
      `UPDATE users SET amazon_access_token=$1, amazon_refresh_token=$2 WHERE id=$3`,
      [tokenData.access_token, tokenData.refresh_token, userId]
    );

    await client.end();

    return {
      statusCode: 200,
      body: `✅ Tokens stored for user ${userId}. You can close this page.`
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "❌ Error processing callback: " + err.toString() };
  }
};
