const express = require('express');
const mongoose = require('mongoose');
// const passport = require('passport');
// const session = require('express-session');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { GridFSBucket } = require('mongodb');


dotenv.config();

const app = express();
app.use(cors()); 

app.use(express.json());


// Enable CORS
const corsOptions = {
  // origin: ['http://192.1.113.150:64535', 'http://localhost:54122', 'capacitor://localhost'], 
  origin: ['http://192.168.29.84:64535', 'http://192.168.29.84:54122', 'capacitor://192.168.29.84'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// // Serve static files
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process if connection fails
  });

// Serve static files from GridFS
app.get('/uploads/:filename', async (req, res) => {
  try {
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const files = await gfs.find({ filename: req.params.filename }).toArray();

    if (!files.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    gfs.openDownloadStreamByName(req.params.filename).pipe(res);
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

// Import routes
const userRoutes = require('./routes/user'); 
const departmentRoutes = require('./routes/department'); 
const doctorRoutes = require('./routes/doctor'); 
const appointmentRoutes = require('./routes/appointment'); 
const feedbackRoutes = require('./routes/feedback'); 
const searchRoutes = require('./routes/search');
const adminUserRoutes = require('./routes/admin/user');
const adminDepartmentRoutes = require('./routes/admin/department');
const adminAppointmentRoutes = require('./routes/admin/appointment');
const adminFeedbackRoutes = require('./routes/admin/feedback');
const adminDoctorRoutes = require('./routes/admin/doctor');


// Define API routes
app.use('/api/users', userRoutes); 
app.use('/api/departments', departmentRoutes); 
app.use('/api/doctors', doctorRoutes); 
app.use('/api/appointments', appointmentRoutes); 
app.use('/api/feedbacks', feedbackRoutes); 
app.use('/api/search', searchRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/departments', adminDepartmentRoutes);
app.use('/api/admin/appointments', adminAppointmentRoutes);
app.use('/api/admin/feedbacks', adminFeedbackRoutes);
app.use('/api/admin/doctors', adminDoctorRoutes);

// Import the notification cron job
require('./cronJobs/notificationCron');


// Root route
app.get('/', (req, res) => {
  res.send('RESTful API Connected');
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


