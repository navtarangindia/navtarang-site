const fetch = require("node-fetch");
const { Client } = require("pg");

exports.handler = async (event) => {
  try {
    const code = event.queryStringParameters?.code;
    const state = event.queryStringParameters?.state;
    if (!code) return { statusCode: 400, body: "Missing code" };

    const userId = state?.replace("USER_", "");
    if (!userId) return { statusCode: 400, body: "Invalid state/user" };

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
        redirect_uri: "https://navtarangindia.com/.netlify/functions/callback",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) return { statusCode: 400, body: JSON.stringify(tokenData) };

    // Save tokens to Neon
    const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL });
    await client.connect();
    await client.query(
      `UPDATE users SET amazon_access_token=$1, amazon_refresh_token=$2 WHERE id=$3`,
      [tokenData.access_token, tokenData.refresh_token, userId]
    );
    await client.end();

    return {
      statusCode: 200,
      body: `✅ Tokens saved successfully for user ${userId}. You can close this page.`,
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error processing callback: " + err.message };
  }
};
