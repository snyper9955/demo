require("dotenv").config();
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const testFullFlow = async () => {
    try {
        const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
        const to = `whatsapp:${process.env.ADMIN_WHATSAPP_NUMBER}`;
        
        console.log(`--- Twilio Full Flow Test ---`);
        console.log(`From: ${from}`);
        console.log(`To: ${to}`);
        
        const message = await client.messages.create({
            body: "🔍 Testing message status tracking. Are you joined to the sandbox?",
            from: from,
            to: to
        });
        
        console.log(`Message Queued! SID: ${message.sid}`);
        console.log(`Initial Status: ${message.status}`);
        
        // Wait and poll for status
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const updatedMessage = await client.messages(message.sid).fetch();
            console.log(`Status after ${(i+1)*2}s: ${updatedMessage.status}`);
            
            if (updatedMessage.errorCode) {
                console.error(`❌ ERROR CODE: ${updatedMessage.errorCode}`);
                console.error(`❌ ERROR MESSAGE: ${updatedMessage.errorMessage}`);
                break;
            }
            
            if (updatedMessage.status === 'delivered') {
                console.log("✅ DELIVERED!");
                break;
            }
        }
        
    } catch (error) {
        console.error("❌ CRITICAL FAILURE:", error.message);
    }
};

testFullFlow();
