const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Feedback = require('../../models/feedback');
const Department = require('../../models/department'); 
const authMiddleware = require('../../middleware/authMiddleware');
const multer = require("multer");

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
// Create feedback
router.post('/', authMiddleware, async (req, res) => {
  const { department, rate, comments, appointmentId } = req.body;

  if (!department || !rate || !comments || !appointmentId) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if feedback for this appointment already exists
    const existingFeedback = await Feedback.findOne({ appointmentId, userId: req.user.id });
    if (existingFeedback) {
      return res.status(400).json({
        error: 'You have already submitted feedback for this appointment.',
      });
    }

    const newFeedback = new Feedback({
      userId: req.user.id,
      department,
      rate,
      comments,
      appointmentId,
    });

    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feedback', details: error.message });
  }
});

// Get all feedbacks for the logged-in user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user.id })
      .populate('department', 'name')
      .populate('appointmentId', '_id date time status');
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your feedback', details: error.message });
  }
});

// Get feedback for a specific appointment by logged-in user
router.get('/appointment/:appointmentId', authMiddleware, async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const feedback = await Feedback.findOne({
      appointmentId,
      userId: req.user.id,
    }).populate('department', 'name');

    if (!feedback) {
      return res.status(404).json({ error: 'No feedback found for this appointment.' });
    }

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback', details: error.message });
  }
});

// Get all feedback
router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('department', 'name');
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedbacks', details: error.message });
  }
});


// Get feedbacks grouped by department, with optional filtering by department ID
// Get feedbacks grouped by department
// Fetch feedback by department
router.get('/by-department/:departmentId', async (req, res) => {
  const { departmentId } = req.params;

  try {
    // Validate if the department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Fetch feedback for the specific department
    const feedbacks = await Feedback.find({ department: departmentId })
      .populate('userId', 'firstname lastname image') // Populate user info
      .sort({ createdAt: -1 }); // Sort by latest feedback

    if (!feedbacks.length) {
      return res.status(404).json({ message: 'No feedback found for this department' });
    }

    // Return feedbacks with populated user details
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks by department:', error.message);
    res.status(500).json({ error: 'Failed to fetch feedbacks', details: error.message });
  }
});

// router.get('/by-department/:departmentId', async (req, res) => {
//   const { departmentId } = req.params;

//   try {
//     // Validate if the department exists
//     const department = await Department.findById(departmentId);
//     if (!department) {
//       return res.status(404).json({ error: 'Department not found' });
//     }

//     // Fetch feedback for the specific department
//     const feedbacks = await Feedback.find({ department: departmentId })
//       .populate('userId', 'name') // Optional: Populate user info if needed
//       .sort({ createdAt: -1 }); // Optional: Sort by latest feedback

//     if (!feedbacks.length) {
//       return res.status(404).json({ message: 'No feedback found for this department' });
//     }

//     // Return feedbacks
//     res.status(200).json(feedbacks);
//   } catch (error) {
//     console.error('Error fetching feedbacks by department:', error.message);
//     res.status(500).json({ error: 'Failed to fetch feedbacks', details: error.message });
//   }
// });




// Edit feedback
router.put('/:id', authMiddleware, async (req, res) => {
  const { rate, comments } = req.body;

  try {
    const feedback = await Feedback.findOne({ _id: req.params.id, userId: req.user.id });
    if (!feedback) return res.status(404).json({ error: 'Feedback not found or unauthorized' });

    if (rate) feedback.rate = rate;
    if (comments) feedback.comments = comments;

    await feedback.save();
    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feedback', details: error.message });
  }
});

// Delete feedback
router.delete('/:id/:userId', upload, async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndDelete({
      _id: req.params.id
    });
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found or unauthorized' });
    }
    res.status(200).json({ message: 'Feedback deleted successfully.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to delete feedback', details: error.message });
  }
});


module.exports = router;
