const express = require('express');
const multer = require('multer');
const Doctor = require('../../models/doctor');
const Department = require('../../models/department'); // Import the Department model
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
const router = express.Router();

// CREATE: Add a doctor
router.post('/', upload.single('image'), async (req, res) => {
  const { name, specialization, departments } = req.body;

  if (!name || !specialization || !departments) {
    return res
      .status(400)
      .json({ error: 'Name, specialization, and departments are required' });
  }

  let departmentIds;
  try {
    // Ensure departments are in array format
    departmentIds = typeof departments === 'string' ? JSON.parse(departments) : departments;

    if (!Array.isArray(departmentIds)) {
      throw new Error('Invalid departments format');
    }
  } catch (parseError) {
    return res.status(400).json({ error: 'Departments must be a valid array' });
  }

  try {
    // Validate that departments are valid ObjectIds
    const validDepartments = await Department.find({
      _id: { $in: departmentIds },
    });

    if (validDepartments.length !== departmentIds.length) {
      return res
        .status(400)
        .json({ error: 'One or more departments are invalid' });
    }

    const doctorData = new Doctor({
      name,
      specialization,
      departments: departmentIds,
    });

    if (req.file) {
      doctorData.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        path: req.file.path,
        size: req.file.size,
      };
    }

    const savedDoctor = await doctorData.save();
    res.json(savedDoctor);
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
});

router.put('/', upload.single('image'), async (req, res) => {
  const { name, specialization, departments, _id } = req.body;
  console.log(req.body);
  try {
    const doctor = await Doctor.findById(_id);
    if (!doctor) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (name) doctor.name = name;
    if (departments) doctor.departments = departments;
    if (specialization) doctor.specialization = specialization;

    if (req.file) {
      doctor.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        path: req.file.path,
        size: req.file.size,
      };
    }

    const updateDoctor = await doctor.save();
    res.json(updateDoctor);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
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

router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(doctor);
  } catch (error) {
    console.error('Error retrieving department:', error);
    res.status(500).json({ error: 'Failed to retrieve department' });
  }
});

// DELETE: Remove a doctor
router.delete('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

// READ: Get doctors based on departments
router.get('/by-department/:departmentId', async (req, res) => {
  const { departmentId } = req.params;

  try {
    const doctors = await Doctor.find({ departments: departmentId }).populate('departments', 'name');
    if (!doctors.length) {
      return res.status(404).json({ message: 'No doctors found for this department' });
    }

    // Correctly construct the image path
    const baseUrl = 'http://192.168.1.132:4000';
    const doctorsWithImageUrl = doctors.map((doctor) => ({
      ...doctor.toObject(),
      image: doctor.image?.filename ? `${baseUrl}/uploads/${doctor.image.filename}` : null, // Ensure null for missing images
    }));

    res.json(doctorsWithImageUrl);
  } catch (error) {
    console.error('Error fetching doctors by department:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctors', details: error.message });
  }
});


// router.get('/by-department/:departmentId', async (req, res) => {
//   const { departmentId } = req.params;

//   try {
//     const doctors = await Doctor.find({ departments: departmentId }).populate('departments', 'name');
//     if (!doctors.length) {
//       return res.status(404).json({ message: 'No doctors found for this department' });
//     }

//     // Add a base URL to the image path for accessibility from the client-side
//     const doctorsWithImageUrl = doctors.map(doctor => ({
//       ...doctor.toObject(),
//       image: `http://192.168.1.132:4000/uploads/${doctor.image.filename}`  // Ensure the correct file path
//     }));

//     res.json(doctorsWithImageUrl);
//   } catch (error) {
//     console.error('Error fetching doctors by department:', error.message);
//     res.status(500).json({ error: 'Failed to fetch doctors', details: error.message });
//   }
// });


module.exports = router;
