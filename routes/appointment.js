const cron = require('node-cron');
const express = require('express');
const router = express.Router();
const Appointment = require('../models/appointment');
const Department = require('../models/department');
const Notification = require('../models/notification'); // Import the notification model
const authMiddleware = require('../middleware/authMiddleware'); // Middleware to authenticate users
const moment = require('moment-timezone');
const serverTime = moment().tz('UTC'); // Server's time zone
const userTime = serverTime.tz('Asia/Manila'); // Adjust for users' time zone

// Helper function to check if a date is today
const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
};

// Helper function to create notifications
const createNotification = async (userId, title, appointment, actionType) => {
  const populatedAppointment = await appointment.populate('department', 'name');
  const formattedDate = new Date(populatedAppointment.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  let message = `Your appointment with the ${populatedAppointment.department.name} Department is scheduled on ${formattedDate}.`;

  if (actionType === 'booked') {
    message = `You have successfully booked an appointment with the ${populatedAppointment.department.name} Department on ${formattedDate}.`;
  } else if (actionType === 'cancelled') {
    message = `Your appointment with the ${populatedAppointment.department.name} Department on ${formattedDate} has been cancelled.`;
  } else if (actionType === 'completed') {
    message = `Your appointment with the ${populatedAppointment.department.name} Department last ${formattedDate} has been completed.`;
  }

  const notification = new Notification({ userId, title, message });
  await notification.save();
};

// Cron job for daily notifications
cron.schedule('0 0 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  const appointments = await Appointment.find({
    date: today,
    notificationSent: false,
  }).populate('department', 'name');

  for (const appointment of appointments) {
    await createNotification(
      appointment.userId,
      'Appointment Reminder',
      appointment,
      'today'
    );
    appointment.notificationSent = true;
    await appointment.save();
  }
});



// Admin route to update appointment status
router.put('/appointments/:id', async (req, res) => {
  const { date, time, status } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id).populate('department', 'name');
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (status) {
      appointment.status = status;
      const actionType = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : null;
      if (actionType) {
        await createNotification(appointment.userId, `Appointment ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, appointment, actionType);
      }
    }

    if (date || time) {
      if (date) appointment.date = new Date(date);
      if (time) appointment.time = time;

      await createNotification(appointment.userId, 'Appointment Rescheduled', appointment, 'rescheduled');
    }

    await appointment.save();
    res.status(200).json(appointment);
  } catch (error) {
    console.error(`Failed to update appointment: ${error.message}`);
    res.status(500).json({ error: 'Failed to update appointment', details: error.message });
  }
});

// Fetch notifications for the logged-in user
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.', details: error.message });
  }
});


// Mark notification as read
// Route to mark notification as read
// Route to mark notification as read
router.put('/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    // Find and update the notification
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { read: true } },
      { new: true } // Return the updated notification
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read.', details: error.message });
  }
});


// Get available slots for departments on a specific date
router.get('/slots', async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date is required to check available slots' });
  }

  try {
    const departments = await Department.find();
    const slots = await Promise.all(
      departments.map(async (department) => {
        const count = await Appointment.countDocuments({
          department: department._id,
          date: new Date(date),
        });
        return {
          department: department.name,
          departmentId: department._id,
          availableSlots: Math.max(0, department.dailyQuota - count),
        };
      })
    );

    res.status(200).json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});


// Create an appointment
router.post('/', authMiddleware, async (req, res) => {
  const {
    department,
    description,
    date,
    newPatient,
    hospitalNo,
    lastname,
    firstname,
    middlename,
    age,
    gender,
    patientStatus,
    address,
    mobileNumber,
    dateOfBirth,
    placeOfBirth,
    gurdian,
    Occupation,
  } = req.body;

  if (!department || !date || !newPatient || !lastname || !firstname || !age || !gender || !patientStatus) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  if (newPatient === 'old' && !hospitalNo) {
    return res.status(400).json({ error: 'Hospital number is required for returning patients' });
  }

  try {
    const departmentData = await Department.findById(department);
    if (!departmentData) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const count = await Appointment.countDocuments({
      department,
      date: new Date(date),
    });

    if (count >= departmentData.dailyQuota) {
      return res.status(400).json({ error: `No available slots for ${departmentData.name} on ${date}` });
    }

    const appointment = new Appointment({
      userId: req.user.id,
      department,
      description,
      date: new Date(date),
      newPatient,
      hospitalNo: newPatient === 'old' ? hospitalNo : undefined,
      lastname,
      firstname,
      middlename,
      age,
      gender,
      patientStatus,
      address,
      mobileNumber,
      dateOfBirth,
      placeOfBirth,
      gurdian,
      Occupation,
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
});

// Get appointments for the logged-in user
// Get appointments for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.id }).populate('department', 'name');
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
});

// Update appointment logic (this is where reschedule happens)
// Update an appointment (date and status only)
router.put('/:id', authMiddleware, async (req, res) => {
  const { date, status } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (date) appointment.date = new Date(date);
    if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) {
      appointment.status = status;
    }

    await appointment.save();
    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment', details: error.message });
  }
});

// Delete an appointment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    await createNotification(req.user.id, 'Appointment Deleted', appointment, 'cancelled');
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

module.exports = router;

