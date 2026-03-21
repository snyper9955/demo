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
      console.error(`SID: ${accountSid ? 'SET' : 'MISSING'}`);
      console.error(`TOKEN: ${authToken ? 'SET' : 'MISSING'}`);
      console.error(`FROM: ${fromNumber ? 'SET' : 'MISSING'}`);
      return false;
    }

    console.log(`[WhatsApp] DEBUG: Using SID=${accountSid.substring(0,6)}... From=${fromNumber}`);

    const client = twilio(accountSid, authToken);

    // Format phone number (ensure it has + prefix and country code)
    let formattedPhone = phone.trim();
    
    // If it's a 10-digit number, assume it's Indian and add +91
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = '+91' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    console.log(`[WhatsApp] Sending to ${formattedPhone}...`);

    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`
    });

    console.log(`[WhatsApp] Message sent successfully: ${result.sid}`);
    return true;
  } catch (error) {
    console.error("WhatsApp Notification Error:", error.message);
    if (error.code) console.error(`Twilio Error Code: ${error.code}`);
    if (error.moreInfo) console.error(`More Info: ${error.moreInfo}`);
    return false;
  }
};

module.exports = sendWhatsApp;
