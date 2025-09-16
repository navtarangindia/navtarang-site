const nodemailer = require("nodemailer");

exports.handler = async function(event, context) {
  try {
    const data = JSON.parse(event.body);

    if (!data.email || !data.name) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    // SMTP setup with Hostinger credentials from Netlify environment variables
    let transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const amazonLoginUrl = "https://www.amazon.com/ap/oa?client_id=amzn1.application-oa2-client.d9273e4359b94f1b892bbf2bca64e300&scope=advertising::campaign_management&response_type=code&redirect_uri=https://navtarangindia.com/callback&state=SPECIAL";

    const htmlBody = `
      <p>Hello <strong>${data.name}</strong>,</p>
      <p>Thank you for signing up with <strong>Navtarang India</strong>.</p>
      <p><strong>Your registration details:</strong><br>
      Email: ${data.email}<br>
      Phone: ${data.phone || "N/A"}<br>
      Region: ${data.region || "N/A"}</p>

      <p>Click the button below to securely connect your Amazon Ads account:</p>
      <p>
        <a href="${amazonLoginUrl}">
          <img src="https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA_gold_195x46.png" width="195" height="46" alt="Login with Amazon">
        </a>
      </p>

      <p>Best regards,<br>Navtarang India Team</p>
    `;

    await transporter.sendMail({
      from: `"Navtarang India" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: "Complete Your Amazon Ads Connection - Navtarang India",
      text: `Hello ${data.name},\nPlease login with Amazon: ${amazonLoginUrl}`,
      html: htmlBody
    });

    return { statusCode: 200, body: JSON.stringify({ message: "Email sent!" }) };

  } catch (error) {
    console.error("Email sending error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};
