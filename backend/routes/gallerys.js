const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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
    else cb(new Error("Only image files are allowed"), false);
  },
});

// ==========================
// Helpers
// ==========================
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const uploadToCloudinary = async (file, folder) => {
  return cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    { folder }
  );
};

// ==========================
// GET ALL GALLERY ITEMS
// ==========================
router.get("/", async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json(galleryItems);
  } catch (error) {
    console.error("GET gallery error:", error);
    res.status(500).json({ message: "Failed to fetch gallery items" });
  }
});

// ==========================
// GET SINGLE GALLERY ITEM
// ==========================
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid gallery ID" });
    }

    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Gallery item not found" });

    res.json(item);
  } catch (error) {
    console.error("GET single gallery error:", error);
    res.status(500).json({ message: "Failed to fetch gallery item" });
  }
});

// ==========================
// CREATE GALLERY ITEM
// ==========================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const type = req.body.type?.trim();
    const description = req.body.description?.trim();

    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!type) return res.status(400).json({ message: "Type is required" });
    if (!description) return res.status(400).json({ message: "Description is required" });
    if (!req.file) return res.status(400).json({ message: "Image is required" });

    const uploadResult = await uploadToCloudinary(req.file, "gallery");

    const galleryItem = new Gallery({
      title,
      type,
      description,
      image: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
    });

    const savedItem = await galleryItem.save();
    res.status(201).json(savedItem);

  } catch (error) {
    console.error("POST gallery error:", error);
    res.status(500).json({ message: "Failed to create gallery item" });
  }
});

// ==========================
// UPDATE GALLERY ITEM
// ==========================
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid gallery ID" });
    }

    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Gallery item not found" });

    const title = req.body.title?.trim();
    const type = req.body.type?.trim();
    const description = req.body.description?.trim();

    if (req.body.title !== undefined && !title)
      return res.status(400).json({ message: "Title cannot be empty" });
    if (req.body.type !== undefined && !type)
      return res.status(400).json({ message: "Type cannot be empty" });
    if (req.body.description !== undefined && !description)
      return res.status(400).json({ message: "Description cannot be empty" });

    let image = item.image;
    let imagePublicId = item.imagePublicId;

    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId).catch(() => {});
      }

      const uploadResult = await uploadToCloudinary(req.file, "gallery");
      image = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const updatedItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      {
        title: title ?? item.title,
        type: type ?? item.type,
        description: description ?? item.description,
        image,
        imagePublicId,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedItem);

  } catch (error) {
    console.error("PUT gallery error:", error);
    res.status(500).json({ message: "Failed to update gallery item" });
  }
});

// ==========================
// DELETE GALLERY ITEM
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid gallery ID" });
    }

    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Gallery item not found" });

    if (item.imagePublicId) {
      await cloudinary.uploader.destroy(item.imagePublicId).catch(() => {});
    }

    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ message: "Gallery item deleted successfully" });

  } catch (error) {
    console.error("DELETE gallery error:", error);
    res.status(500).json({ message: "Failed to delete gallery item" });
  }
});

module.exports = router;
