const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const connectDB = require("./config/db");

// Connect DB ONCE (important for serverless)
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
   Multer (Vercel Safe)
   Uses /tmp instead of disk
====================== */
const upload = multer({
  storage: multer.memoryStorage(), // ✅ REQUIRED for Vercel
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

/* ======================
   Health / Root
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
   Routes
====================== */
app.use(async (req, res, next) => {
  await connectOnce();
  next();
});

app.use("/api/admin", require("./routes/admin"));
app.use("/api/contact", require("./routes/contact"));

app.use("/api/tours", upload.single("image"), require("./routes/tours"));
app.use("/api/rentals", upload.single("image"), require("./routes/rentals"));
app.use("/api/packages", upload.single("image"), require("./routes/packages"));
app.use("/api/gallery", upload.single("image"), require("./routes/gallerys"));

/* ======================
   EXPORT (NO app.listen)
====================== */
module.exports = app;
