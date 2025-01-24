const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');  // Specify the folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Use the current timestamp as filename
  }
});

const upload = multer({ storage: storage });

// Middleware for authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];  // Extract token from 'Bearer <token>'

  if (!token) return res.status(401).json({ error: 'Unauthorized, no token provided' });

  console.log("Received Token:", token);  // Debugging line to see the token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach decoded user information to the request
    next();
  } catch (error) {
    console.error("Token Error:", error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Signup route
router.post('/signup', async (req, res) => {
  const { firstname, lastname, email, password, contactNumber, image } = req.body;

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
      image,  // Optional image field
      role: 'patient',
    });

    await user.save();  // Save the user to the database

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Return token and essential user details
    res.json({
      token,
      user: {
        _id : user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        contactNumber: user.contactNumber,
        image: user.image, // Image data (filename, path, etc.)
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const users = await User.find({role: 'patient'});
    res.json(users);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id); 

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error retrieving user:', error);

    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Update current user's profile route
router.put('/profile', authMiddleware, upload.single('image'), async (req, res) => {
  const { firstname, lastname, email, contactNumber } = req.body;

  try {
    // Check if the logged-in user matches the user trying to update their profile
    const user = await User.findById(req.user.id); // Find user by decoded ID
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update fields if provided
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;
    if (email) user.email = email;
    if (contactNumber) user.contactNumber = contactNumber;

    // If a new image file is uploaded, update the image field
    if (req.file) {
      user.image = {  // Save file info (filename, path, etc.)
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        path: req.file.path,
        size: req.file.size,
      };
    }

    // Save the updated user
    const updatedUser = await user.save();

    // Return updated user object
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Delete current user's profile
router.delete('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete profile', details: error.message });
  }
});

module.exports = router;
