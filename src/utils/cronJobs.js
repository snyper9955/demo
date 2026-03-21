const cron = require("node-cron");
const Membership = require("../models/Membership");
const sendWhatsApp = require("./sendWhatsApp");
const { calculateEndDate } = require("./dateUtils");

const initCronJobs = () => {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Subscription expiry notification skipped (Twilio disabled for users).");
  });

  // Run every 30 minutes to catch expired memberships and renew them as 'pending'
  cron.schedule("*/30 * * * *", async () => {
    console.log("Running auto-renewal transition for expired memberships...");
    
    try {
      const now = new Date();
      
      const expiredActiveDocs = await Membership.find({
        status: "active",
        endDate: { $lt: now }
      });
 
      if (expiredActiveDocs.length > 0) {
        console.log(`Found ${expiredActiveDocs.length} expired memberships. Processing renewals...`);
        
        for (const doc of expiredActiveDocs) {
          // 1. Mark the current one as strictly 'expired'
          doc.status = "expired";
          await doc.save();

          // 2. Create a NEW pending renewal for the same plan
          const newStartDate = new Date();
          const newEndDate = calculateEndDate(newStartDate, doc.planName);

          const renewal = new Membership({
            member: doc.member,
            planName: doc.planName,
            price: doc.price,
            timeSlot: doc.timeSlot,
            startDate: newStartDate,
            endDate: newEndDate,
            status: "pending",
            createdBy: doc.createdBy // Keep record of who originally assigned it if possible
          });

          await renewal.save();
          console.log(`Auto-renewed member ${doc.member} to pending ${doc.planName} plan.`);
        }
        
        console.log("Auto-renewal transition complete.");
      }
    } catch (error) {
      console.error("Error in auto-renewal cron job:", error.message);
    }
  });

  console.log("Subscription expiry and auto-renewal cron jobs initialized.");
};

module.exports = initCronJobs;
