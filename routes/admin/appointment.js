const express = require('express');
const router = express.Router();
const Appointment = require('../../models/appointment');
const authMiddleware = require('../../middleware/authMiddleware'); // If you use JWT auth

// Create an appointment
router.post('/', authMiddleware, async (req, res) => {
  const {
    department,
    description,
    date,
    time,
    firstname,
    lastname,
    age,
    gender,
    dateOfBirth,
    address,
    mobileNumber
  } = req.body;

  if (!department || !date || !time || !firstname || !lastname || !age || !gender) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newAppointment = new Appointment({
      userId: req.user.id,
      department,
      description,
      date,
      time,
      firstname,
      lastname,
      age,
      gender,
      dateOfBirth,
      address,
      mobileNumber,
    });

    await newAppointment.save();
    res.status(201).json(newAppointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
});

// Get appointments for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment
      .find({ userId: req.user.id })
      .populate('department', 'name'); // If you want the department name
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
});

// Get all appointments (no auth, if needed)
router.get('/list', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.json(appointments);
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

// Count endpoints (optional)
router.get('/total', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    const count = appointments.length;
    res.json({ count, appointments });
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

router.get('/total/complete', async (req, res) => {
  try {
    const appointments = await Appointment.find({ status: 'completed' });
    const count = appointments.length;
    res.json({ count, appointments });
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

router.get('/total/upcoming', async (req, res) => {
  try {
    const appointments = await Appointment.find({ status: 'upcoming' });
    const count = appointments.length;
    res.json({ count, appointments });
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

router.get('/total/cancelled', async (req, res) => {
  try {
    const appointments = await Appointment.find({ status: 'cancelled' });
    const count = appointments.length;
    res.json({ count, appointments });
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

// GET one appointment by ID
router.get('/list/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    res.status(500).json({ error: 'Failed to retrieve appointment' });
  }
});

// Update an appointment (allow updating status, date, time)
router.put('/:id', authMiddleware, async (req, res) => {
  const { date, time, status } = req.body;
  console.log(req.body);
  try {
    // Find the appointment for the logged-in user
    const appointment = await Appointment.findOne({
      _id: req.params.id
    });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    // If date is provided, parse and update
    if (date) {
      console.log(date);
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      appointment.date = parsedDate;
    }

    // If status is provided (must be 'upcoming', 'completed', or 'cancelled')
    if (status) {
      console.log(status);
      if (!['upcoming', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status update.' });
      }
      appointment.status = status;
    }

    await appointment.save();
    return res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment', details: error.message });
  }
});

// Delete an appointment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment', details: error.message });
  }
});

router.get('/departmentTotals', async (req, res) => {

  try {
    const { year, month } = req.query; // e.g. year=2025, month=1
    const yearInt = parseInt(year, 10);
    const monthInt = parseInt(month, 10);

    // Build start/end date for that month
    const startDate = new Date(yearInt, monthInt - 1, 1);    // e.g. 2025-01-01
    const endDate = new Date(yearInt, monthInt, 1);          // e.g. 2025-02-01

    const results = await Appointment.aggregate([
      { 
        $match: {
          date: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'deptInfo'
        }
      },
      { $unwind: '$deptInfo' },
      {
        $project: {
          _id: 0,
          departmentName: '$deptInfo.name',
          count: 1
        }
      }
    ]);

    res.json(results);
  } catch (err) {
    console.error('Error aggregating department totals:', err);
    res.status(500).json({ error: 'Failed to get department totals' });
  }
});



module.exports = router;
