const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const Appointment = require("../../models/appointment");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const { Readable } = require("stream");
const fs = require("fs");
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

// Middleware for authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from 'Bearer <token>'

  if (!token)
    return res.status(401).json({ error: "Unauthorized, no token provided" });

  console.log("Received Token:", token); // Debugging line to see the token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user information to the request
    next();
  } catch (error) {
    console.error("Token Error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Signup route
router.post("/signup", async (req, res) => {
  const { firstname, lastname, email, password, contactNumber, image } =
    req.body;

  // if (!firstname || !email || !password) {
  //   return res.status(400).json({ error: 'All fields are required' });
  // }

  try {
    const user = new User({
      firstname,
      lastname,
      email,
      password,
      contactNumber,
      image, // Optional image field
      role: "staff",
    });

    await user.save(); // Save the user to the database

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to register user", details: error.message });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return token and essential user details
    res.json({
      token,
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        contactNumber: user.contactNumber,
        image: user.image, // Image data (filename, path, etc.)
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to login", details: error.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const users = await User.find({ role: "patient" });
    res.json(users);
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error retrieving user:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    res.status(500).json({ error: "Failed to retrieve user" });
  }
});

// Update current user's profile route
router.put(
  "/profile/:id",
  upload,
  async (req, res) => {
    const { firstname, lastname, email, contactNumber } = req.body;

    try {
      // Check if the logged-in user matches the user trying to update their profile
      const user = await User.findById(req.params.id); // Find user by decoded ID
      if (!user) return res.status(404).json({ error: "User not found" });

      // Update fields if provided
      if (firstname) user.firstname = firstname;
      if (lastname) user.lastname = lastname;
      if (email) user.email = email;
      if (contactNumber) user.contactNumber = contactNumber;

      if (req.file) {
        const fileBuffer = fs.readFileSync(req.file.path);

        const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "uploads",
        });

        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);

        const uploadStream = gfs.openUploadStream(req.file.filename, {
          contentType: req.file.mimetype,
        });

        readableStream.pipe(uploadStream);

        uploadStream.on("finish", async () => {
          const fileId = uploadStream.id;

          if (user.image?._id) {
            try {
              await gfs.delete(new mongoose.Types.ObjectId(user.image._id));
            } catch (err) {
              console.error("Error deleting old image:", err);
            }
          }

          user.image = {
            filename: uploadStream.filename,
            originalName: req.file.originalname,
            mimeType: uploadStream.contentType,
            size: uploadStream.length,
            uploadDate: uploadStream.uploadDate,
            _id: new mongoose.Types.ObjectId(fileId),
          };

          const updatedUser = await user.save();
          res.status(201).json(updatedUser);
        });

        uploadStream.on("error", (error) => {
          console.error("Error uploading file:", error);
          res.status(500).json({ error: "File upload failed" });
        });
      } else {
        const updatedUser = await user.save();
        res.status(201).json(updatedUser);
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
      res
        .status(500)
        .json({ error: "Failed to update profile", details: error.message });
    }
  }
);

router.get("/patients/:id", upload, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const patientsList = await Appointment.find({ userId: user._id });

    res.json({
      ...user.toObject(),
      patientsList,
    });
  } catch (error) {
    console.error("Error retrieving user:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    res.status(500).json({ error: "Failed to retrieve user" });
  }
});

router.put("/change-password/:id", upload, async (req, res) => {
  const { password, newPassword } = req.body;

  try {
    const user = await User.findOne({ _id: req.params.id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ error: "User has no password set" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect Password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();
    res.status(201).json({ success: "Updated Password Successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Cannot find user" });
  }
});

// Delete current user's profile
router.delete("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete profile", details: error.message });
  }
});

module.exports = router;
