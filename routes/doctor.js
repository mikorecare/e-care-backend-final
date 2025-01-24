const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Doctor = require('../models/doctor');
const Department = require('../models/department'); 

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// CREATE: Add a doctor
router.post('/', upload.single('image'), async (req, res) => {
  const { name, specialization, departments } = req.body;

  if (!name || !specialization || !departments) {
    return res.status(400).json({ error: 'Name, specialization, and departments are required' });
  }

  try {
    // Validate departments
    const departmentIds = JSON.parse(departments); // Parse JSON array
    const validDepartments = await Department.find({ _id: { $in: departmentIds } });
    if (validDepartments.length !== departmentIds.length) {
      return res.status(400).json({ error: 'One or more departments are invalid' });
    }

    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const doctor = new Doctor({ name, specialization, departments: departmentIds });

    if (req.file) {
      const uploadStream = gfs.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', async (file) => {
        doctor.image = {
          filename: file.filename,
          originalName: req.file.originalname,
          mimeType: file.contentType,
          size: file.length,
          uploadDate: file.uploadDate,
        };
        const savedDoctor = await doctor.save();
        res.status(201).json(savedDoctor);
      });

      uploadStream.on('error', (error) => {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Image upload failed' });
      });
    } else {
      const savedDoctor = await doctor.save();
      res.status(201).json(savedDoctor);
    }
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
});

// READ: Get all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('departments', 'name');
    res.json(doctors);
  } catch (error) {
    console.error('Error retrieving doctors:', error);
    res.status(500).json({ error: 'Failed to retrieve doctors' });
  }
});

router.get('/by-department/:id', async (req, res) => {
  try {
    const departmentId = req.params.id;
    const doctors = await Doctor.find({ departments: departmentId })
      .populate('departments', 'name') // Populate department name
      .exec();

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors by department:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// DELETE: Remove a doctor
router.delete('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    try {
      await gfs.delete(new mongoose.Types.ObjectId(doctor.image.filename));
    } catch (err) {
      console.error('Error deleting image from GridFS:', err);
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

module.exports = router;
