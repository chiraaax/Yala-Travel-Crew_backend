const express = require("express");
const router = express.Router();
const Package = require("../models/Package");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

console.log("Packages route loaded");

/* ======================
   Cloudinary Config
====================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ======================
   Multer (Memory)
====================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

/* ======================
   Helpers
====================== */
const splitArray = (value) =>
  value ? value.split(",").map(v => v.trim()).filter(Boolean) : [];

const validateNumber = (value, field) => {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new Error(`${field} must be a valid positive number`);
  }
  return num;
};

/* ======================
   GET ALL
====================== */
router.get("/", async (req, res) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ======================
   GET ONE
====================== */
router.get("/:id", async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ======================
   CREATE
====================== */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "packages" }
    );

    const pkg = await Package.create({
      name: req.body.name,
      image: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
      description: req.body.description,
      duration: req.body.duration,
      price: validateNumber(req.body.price, "Price"),
      destinations: splitArray(req.body.destinations),
      category: req.body.category,
      includes: splitArray(req.body.includes),
      highlights: splitArray(req.body.highlights),
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error("CREATE package error:", error);
    res.status(400).json({ message: error.message });
  }
});

/* ======================
   UPDATE
====================== */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    let image = pkg.image;
    let imagePublicId = pkg.imagePublicId;

    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }

      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "packages" }
      );

      image = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const updatedPkg = await Package.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || pkg.name,
        image,
        imagePublicId,
        description: req.body.description || pkg.description,
        duration: req.body.duration || pkg.duration,
        price:
          req.body.price !== undefined
            ? validateNumber(req.body.price, "Price")
            : pkg.price,
        destinations: req.body.destinations
          ? splitArray(req.body.destinations)
          : pkg.destinations,
        category: req.body.category || pkg.category,
        includes: req.body.includes
          ? splitArray(req.body.includes)
          : pkg.includes,
        highlights: req.body.highlights
          ? splitArray(req.body.highlights)
          : pkg.highlights,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedPkg);
  } catch (error) {
    console.error("UPDATE package error:", error);
    res.status(400).json({ message: error.message });
  }
});

/* ======================
   DELETE
====================== */
router.delete("/:id", async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    if (pkg.imagePublicId) {
      await cloudinary.uploader.destroy(pkg.imagePublicId);
    }

    await pkg.deleteOne();
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
