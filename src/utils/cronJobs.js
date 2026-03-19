const cron = require("node-cron");
const Membership = require("../models/Membership");
const sendWhatsApp = require("./sendWhatsApp");
const { calculateEndDate } = require("./dateUtils");

const initCronJobs = () => {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running subscription expiry check...");
    
    try {
      const now = new Date();
      // Calculate the window for 12 hours from now (e.g., between 11.5 and 12.5 hours)
      const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const windowStart = new Date(twelveHoursFromNow.getTime() - 30 * 60 * 1000); // 11.5 hours
      const windowEnd = new Date(twelveHoursFromNow.getTime() + 30 * 60 * 1000);   // 12.5 hours

      const expiringSoon = await Membership.find({
        status: "active",
        expiryNotificationSent: false,
        endDate: {
          $gte: windowStart,
          $lte: windowEnd
        }
      }).populate({
        path: "member",
        populate: { path: "user", select: "phone name" }
      });

      console.log(`Found ${expiringSoon.length} memberships expiring in ~12 hours`);

      for (const membership of expiringSoon) {
        const user = membership.member?.user;
        if (user && user.phone) {
          const message = `High ${user.name}, your ${membership.planName} membership at IronCore Gym expires in 12 hours. Renew now to continue your training without interruption!`;
          
          const sent = await sendWhatsApp(user.phone, message);
          if (sent) {
            membership.expiryNotificationSent = true;
            await membership.save();
            console.log(`Notification sent to ${user.name} (${user.phone})`);
          }
        }
      }
    } catch (error) {
      console.error("Error in subscription expiry cron job:", error.message);
    }
  });

  // Run every minute to catch expired memberships and renew them as 'pending' for testing
  cron.schedule("* * * * *", async () => {
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
