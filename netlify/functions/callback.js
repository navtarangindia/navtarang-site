const { Client } = require("pg");
const fetch = require("node-fetch"); // Netlify supports fetch, but include if needed

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters;
    const code = params.code;
    const state = params.state || "";
    const userId = state.replace("USER_", "");

    if (!code) {
      return { statusCode: 400, body: "Missing code from Amazon callback." };
    }

    // 1️⃣ Exchange code for tokens from Amazon
    const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
        redirect_uri: "https://navtarangindia.com/netlify/functions/callback",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Amazon token error:", tokenData);
      return { statusCode: 400, body: "OAuth token exchange failed: " + JSON.stringify(tokenData) };
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // 2️⃣ Save tokens into Neon DB
    const client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
    });
    await client.connect();

    await client.query(
      `UPDATE users 
       SET access_token = $1, refresh_token = $2, token_expires_in = NOW() + ($3 || ' seconds')::interval
       WHERE id = $4`,
      [access_token, refresh_token, expires_in, userId]
    );

    await client.end();

    // 3️⃣ Return success page
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h2>✅ Login Successful</h2>
            <p>Your Amazon account is now connected!</p>
            <p>You may close this window.</p>
          </body>
        </html>
      `,
    };
  } catch (err) {
    console.error("Callback error:", err);
    return { statusCode: 500, body: "Server error: " + err.toString() };
  }
};
