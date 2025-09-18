const { Client } = require("pg");
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    if (!data.name || !data.email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
    });
    await client.connect();

    let userId;

    try {
      // Try insert new user
      const insertUser = `
        INSERT INTO users (name, email, phone, region)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      const result = await client.query(insertUser, [
        data.name,
        data.email,
        data.phone || null,
        data.region || null,
      ]);
      userId = result.rows[0].id;
      console.log("✅ User inserted:", userId);

    } catch (err) {
      if (err.code === "23505") {
        // Duplicate email → fetch existing user_id
        const existing = await client.query(
          "SELECT id FROM users WHERE email = $1 LIMIT 1",
          [data.email]
        );
        userId = existing.rows[0].id;
        console.log("ℹ️ Email exists, using existing userId:", userId);
      } else {
        throw err;
      }
    }

    // Setup Nodemailer
    let transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const clientId = process.env.AMAZON_CLIENT_ID;
    const redirectUri = "https://navtarangindia.com/netlify/functions/callback";
    const lwaUrl = `https://www.amazon.com/ap/oa?client_id=client_id=amzn1.application-oa2-client.d9273e4359b94f1b892bbf2bca64e300&scope=advertising::campaign_management&response_type=code&redirect_uri=https://navtarangindia.com/netlify/functions/callback&state=USER_${userId}`;

    let mailOptions = {
      from: `"Navtarang India" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: "Sign Up Confirmation - Navtarang India",
      html: `<p>Hello ${data.name},</p>
             <p>Your account is already registered. You can continue with Login with Amazon:</p>
             <a href="${lwaUrl}">
               <img src="https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA_gold_195x46.png" width="195" height="46" alt="Login with Amazon">
             </a>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to:", data.email);

    await client.end();

    return { statusCode: 200, body: JSON.stringify({ message: "Signup handled + Email sent!" }) };

  } catch (err) {
    console.error("❌ Signup error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.toString() }) };
  }
};
