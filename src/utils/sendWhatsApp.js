const twilio = require("twilio");

/**
 * Send WhatsApp message using Twilio.
 */
const sendWhatsApp = async (phone, message) => {
  try {
    if (!phone) {
      console.error("WhatsApp Error: No phone number provided");
      return false;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("WhatsApp Error: Twilio credentials missing in .env");
      return false;
    }

    const client = twilio(accountSid, authToken);

    // Format phone number (ensure it has + prefix)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    console.log(`[WhatsApp] Sending to ${formattedPhone}...`);

    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`
    });

    console.log(`[WhatsApp] Message sent: ${result.sid}`);
    return true;
  } catch (error) {
    console.error("WhatsApp Notification Error:", error.message);
    return false;
  }
};

module.exports = sendWhatsApp;
