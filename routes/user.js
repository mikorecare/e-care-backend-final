const express = require('express');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mongoose = require('mongoose');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from 'Bearer <token>'
  if (!token) return res.status(401).json({ error: 'Unauthorized, no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user information to the request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Signup route
router.post('/signup', async (req, res) => {
  const { firstname, lastname, email, password, contactNumber, image } = req.body;

  if (!firstname || !lastname || !email || !password || !contactNumber) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = new User({
      firstname,
      lastname,
      email,
      password,
      contactNumber,
      image, // Optional image field
      role: 'patient',
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: 'patient' });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        contactNumber: user.contactNumber,
        image: user.image,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      image: user.image,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// Update profile route
router.put('/profile', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Find the user by the ID decoded from the token
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update user details
    const { firstname, lastname, email, contactNumber } = req.body;
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;
    if (email) user.email = email;
    if (contactNumber) user.contactNumber = contactNumber;

    // Handle image upload
    if (req.file) {
      const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

      // Upload new image
      const uploadStream = gfs.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', async (file) => {
        // Delete old image from GridFS
        if (user.image?.filename) {
          try {
            const files = await gfs.find({ filename: user.image.filename }).toArray();
            if (files.length > 0) {
              await gfs.delete(files[0]._id);
            }
          } catch (err) {
            console.error('Error deleting old image:', err);
          }
        }

        // Update user's image field
        user.image = {
          filename: file.filename,
          originalName: req.file.originalname,
          mimeType: file.contentType,
          size: file.length,
          uploadDate: file.uploadDate,
        };

        const updatedUser = await user.save();
        return res.json({ message: 'Profile updated successfully', user: updatedUser });
      });

      uploadStream.on('error', (error) => {
        console.error('Error uploading image:', error.message);
        res.status(500).json({ error: 'Image upload failed' });
      });
    } else {
      // Save user details without image changes
      const updatedUser = await user.save();
      res.json({ message: 'Profile updated successfully', user: updatedUser });
    }
  } catch (error) {
    console.error('Error updating profile:', error.message);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});



// Serve uploaded images
router.get('/uploads/:filename', async (req, res) => {
  try {
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    const fileStream = gfs.openDownloadStreamByName(req.params.filename);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      res.status(404).json({ error: 'File not found' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Delete user profile
router.delete('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const oldFilename = user.image?.filename;

    // Delete the user's image from GridFS
    if (oldFilename) {
      try {
        const files = await gfs.find({ filename: oldFilename }).toArray();
        if (files.length > 0) {
          await gfs.delete(files[0]._id);
        }
      } catch (error) {
        console.error(`Error deleting image from GridFS: ${error}`);
      }
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete profile', details: error.message });
  }
});

module.exports = router;
