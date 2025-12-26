const express = require("express");
const router = express.Router();
const Gallery = require("../models/Gallery");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

console.log("Gallery routes loaded");

// ==========================
// Cloudinary Config
// ==========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================
// Multer (Memory Storage)
// ==========================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

// ==========================
// GET ALL GALLERY ITEMS
// ==========================
router.get("/", async (req, res) => {
  try {
    console.log("GET /api/gallery");
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json(galleryItems);
  } catch (error) {
    console.error("GET gallery error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==========================
// GET SINGLE GALLERY ITEM
// ==========================
router.get("/:id", async (req, res) => {
  try {
    console.log("GET /api/gallery/:id", req.params.id);
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Gallery item not found" });
    res.json(item);
  } catch (error) {
    console.error("GET single gallery error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==========================
// CREATE GALLERY ITEM
// ==========================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, type, description } = req.body;

    // Validation
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!type?.trim()) return res.status(400).json({ message: "Type is required" });
    if (!description?.trim()) return res.status(400).json({ message: "Description is required" });
    if (!req.file) return res.status(400).json({ message: "Image is required" });

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "gallery" }
    );

    const galleryItem = new Gallery({
      title: title.trim(),
      type: type.trim(),
      description: description.trim(),
      image: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
    });

    const savedItem = await galleryItem.save();
    console.log("Gallery item created:", savedItem._id);
    res.status(201).json(savedItem);

  } catch (error) {
    console.error("POST gallery error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================
// UPDATE GALLERY ITEM
// ==========================
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, type, description } = req.body;

    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Gallery item not found" });

    // Validate fields if provided
    if (title !== undefined && !title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
    if (type !== undefined && !type.trim()) return res.status(400).json({ message: "Type cannot be empty" });
    if (description !== undefined && !description.trim()) return res.status(400).json({ message: "Description cannot be empty" });

    let imageUrl = item.image;
    let imagePublicId = item.imagePublicId;

    // If new image uploaded
    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }

      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "gallery" }
      );

      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const updatedItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      {
        title: title !== undefined ? title.trim() : item.title,
        type: type !== undefined ? type.trim() : item.type,
        description: description !== undefined ? description.trim() : item.description,
        image: imageUrl,
        imagePublicId,
      },
      { new: true, runValidators: true }
    );

    console.log("Gallery item updated:", updatedItem._id);
    res.json(updatedItem);

  } catch (error) {
    console.error("PUT gallery error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================
// DELETE GALLERY ITEM
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Gallery item not found" });

    if (item.imagePublicId) {
      await cloudinary.uploader.destroy(item.imagePublicId);
    }

    await Gallery.findByIdAndDelete(req.params.id);
    console.log("Gallery item deleted:", item._id);
    res.json({ message: "Gallery item deleted successfully" });

  } catch (error) {
    console.error("DELETE gallery error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
