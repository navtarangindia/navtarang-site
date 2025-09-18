const { Client } = require("pg");
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    if (!data.name || !data.email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    // 1️⃣ Connect to Neon (Postgres)
    const client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
    });
    await client.connect();

    // 2️⃣ Insert user into "users" table
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

    const userId = result.rows[0].id;

    // 3️⃣ Setup Nodemailer
    let transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 4️⃣ Build LWA Login URL
    const clientId = process.env.AMAZON_CLIENT_ID; // safer than hardcoding
    const redirectUri = "https://navtarangindia.com/netlify/functions/callback";

    const lwaUrl = `https://www.amazon.com/ap/oa?client_id=client_id=amzn1.application-oa2-client.d9273e4359b94f1b892bbf2bca64e300&scope=advertising::campaign_management&response_type=code&redirect_uri=https://navtarangindia.com/netlify/functions/callback&state=USER_${userId}`;

    // 5️⃣ Send email with LWA button
    let mailOptions = {
      from: `"Navtarang India" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: "Sign Up Confirmation - Navtarang India",
      html: `<p>Hello ${data.name},</p>
             <p>Thank you for signing up. Your details have been saved.</p>
             <p>Click below to login with Amazon:</p>
             <a href="${lwaUrl}">
               <img src="https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA_gold_195x46.png" width="195" height="46" alt="Login with Amazon">
             </a>`,
    };

    await transporter.sendMail(mailOptions);

    await client.end();

    return { statusCode: 200, body: JSON.stringify({ message: "Signup saved + Email sent!" }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.toString() }) };
  }
};
