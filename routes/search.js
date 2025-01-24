const express = require('express');
const Department = require('../models/department');
const Doctor = require('../models/doctor');
const router = express.Router();

router.get('/', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    // Search departments
    const departments = await Department.find({
      name: { $regex: query, $options: 'i' }, // Case-insensitive search by name
    });

    // Search doctors
    const doctors = await Doctor.find({
      $or: [
        { name: { $regex: query, $options: 'i' } }, // Case-insensitive search by name
        { specialization: { $regex: query, $options: 'i' } }, // Search by specialization
      ],
    }).populate('departments', 'name'); // Include department names

    // Combine and return results
    res.json({
      departments,
      doctors,
    });
  } catch (error) {
    console.error('Error performing search:', error.message);
    res.status(500).json({ error: 'Failed to perform search.' });
  }
});

module.exports = router;
