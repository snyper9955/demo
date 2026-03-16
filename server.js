require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const initCronJobs = require("./src/utils/cronJobs");

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Initialize Cron Jobs
initCronJobs();

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});