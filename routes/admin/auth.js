// // const express = require('express');
// // const passport = require('passport');
// // const jwt = require('jsonwebtoken');
// // const User = require('../models/user');
// // const bcrypt = require('bcrypt');
// // const dotenv = require('dotenv');

// // dotenv.config();

// // const router = express.Router();

// // // Google Sign-In
// // router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// // // Google Callback
// // router.get(
// //   '/google/callback',
// //   passport.authenticate('google', { failureRedirect: '/' }),
// //   (req, res) => {
// //     const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
// //     res.json({ token, user: req.user });
// //   }
// // );

// // // Signup for Admin/Staff
// // router.post('/signup', async (req, res) => {
// //   const { firstname, lastname, email, password, role } = req.body;
// //   if (!firstname || !lastname || !email || !password || !role) {
// //     return res.status(400).json({ error: 'All fields are required' });
// //   }

// //   try {
// //     const hashedPassword = await bcrypt.hash(password, 10);
// //     const user = new User({ firstname, lastname, email, password: hashedPassword, role });
// //     await user.save();
// //     res.status(201).json({ message: 'User registered successfully' });
// //   } catch (err) {
// //     res.status(500).json({ error: 'Failed to register user' });
// //   }
// // });

// // // Sign-In for Admin/Staff
// // router.post('/signin', async (req, res) => {
// //   const { email, password } = req.body;
// //   if (!email || !password) {
// //     return res.status(400).json({ error: 'Email and password are required' });
// //   }

// //   try {
// //     const user = await User.findOne({ email });
// //     if (!user || !(await bcrypt.compare(password, user.password))) {
// //       return res.status(401).json({ error: 'Invalid credentials' });
// //     }

// //     const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
// //     res.json({ token, user });
// //   } catch (err) {
// //     res.status(500).json({ error: 'Failed to sign in' });
// //   }
// // });

// // module.exports = router;
// const express = require('express');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const User = require('../models/user');
// const router = express.Router();

// // Sign up route - Create user with a role (patient by default, or set by frontend)
// router.post('/signup', async (req, res) => {
//   const { firstname, lastname, email, password, role } = req.body;

//   if (!firstname || !lastname || !email || !password) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }

//   try {
//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ error: 'User already exists' });
//     }

//     // Create new user
//     const newUser = new User({
//       firstname,
//       lastname,
//       email,
//       password,
//       role: role || 'patient',  // Default role is 'patient'
//     });

//     await newUser.save();

//     // Generate JWT token for authentication
//     const token = jwt.sign(
//       { id: newUser._id, email: newUser.email, role: newUser.role },
//       process.env.JWT_SECRET, // Store secret in your .env file
//       { expiresIn: '1h' }
//     );

//     res.status(201).json({
//       message: 'User registered successfully',
//       token,
//       user: { _id: newUser._id, firstname: newUser.firstname, role: newUser.role },
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to register user' });
//   }
// });

// // Login route - Only email and password required
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ error: 'Email and password are required' });
//   }

//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Check if password is correct
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: 'Invalid credentials' });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user._id, email: user.email, role: user.role },
//       process.env.JWT_SECRET, // Use JWT_SECRET in your .env
//       { expiresIn: '1h' }
//     );

//     res.json({
//       message: 'Login successful',
//       token,
//       user: { _id: user._id, firstname: user.firstname, role: user.role },
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // Update user profile
// router.put('/update/:id', async (req, res) => {
//   const { firstname, lastname, phoneNumber, address, image } = req.body;
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     if (firstname) user.firstname = firstname;
//     if (lastname) user.lastname = lastname;
//     if (phoneNumber) user.phoneNumber = phoneNumber;
//     if (address) user.address = address;
//     if (image) user.image = image;

//     await user.save();
//     res.json({ message: 'Profile updated successfully', user });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// module.exports = router;
