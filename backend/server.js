const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Connect DB once (Vercel-safe)
let isConnected = false;
const connectOnce = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

const app = express();

/* ======================
   Middleware
====================== */
app.use(
  cors({
    origin: "https://yala-travel-crew.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   Health Check
====================== */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Yala Travel Crew Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ======================
   DB Connection Middleware
====================== */
app.use(async (req, res, next) => {
  await connectOnce();
  next();
});

/* ======================
   Routes (NO multer here)
====================== */
app.use("/api/admin", require("./routes/admin"));
app.use("/api/contact", require("./routes/contact"));

app.use("/api/tours", require("./routes/tours"));
app.use("/api/rentals", require("./routes/rentals"));
app.use("/api/packages", require("./routes/packages"));
app.use("/api/gallery", require("./routes/gallerys"));

/* ======================
   EXPORT (Serverless)
====================== */
module.exports = app;
