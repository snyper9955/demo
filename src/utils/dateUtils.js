/**
 * Calculates the end date based on the start date and plan duration.
 * @param {Date} startDate - The start date of the membership.
 * @param {string} planName - The name of the plan (daily, monthly, quarterly, yearly).
 * @returns {Date} The calculated end date.
 */
const calculateEndDate = (startDate, planName) => {
  const start = new Date(startDate);
  switch (planName) {
    case "daily":
      return new Date(start.getTime() + 5 * 60 * 1000); // 5 minutes for testing
    case "monthly":
      return new Date(start.setMonth(start.getMonth() + 1));
    case "quarterly":
      return new Date(start.setMonth(start.getMonth() + 3));
    case "yearly":
      return new Date(start.setFullYear(start.getFullYear() + 1));
    default:
      return new Date(start.setMonth(start.getMonth() + 1));
  }
};

module.exports = { calculateEndDate };
