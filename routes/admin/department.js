const express = require('express');
const multer = require('multer');
const Department = require('../../models/department');
const path = require('path');

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// CREATE: Add a department
router.post('/', upload.single('image'), async (req, res) => {
  const { name, description, dailyQuota } = req.body;

  // Validate only the required fields
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  if(!dailyQuota) {
    dailyQuota = 50;
  }

  try {
    // Prepare the department data, conditionally adding the image if provided
    const departmentData = new Department({
      name,
      description,
      dailyQuota,
      image: req.file
        ? {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            path: req.file.path,
            size: req.file.size,
          }
        : null, // Set image to null if no file is uploaded
    });

    const savedDepartment = await departmentData.save();
    res.json(savedDepartment);
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({ error: 'Failed to add department' });
  }
});


// READ: Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    console.error('Error retrieving departments:', error);
    res.status(500).json({ error: 'Failed to retrieve departments' });
  }
});

// READ: Get a single department by ID
router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    console.error('Error retrieving department:', error);
    res.status(500).json({ error: 'Failed to retrieve department' });
  }
});

// UPDATE: Edit a department
router.put('/', upload.single('image'), async (req, res) => {
  const { name, description, dailyQuota, _id } = req.body;
  console.log(req.body);
  try {
    const department = await Department.findById(_id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (name) department.name = name;
    if (dailyQuota) department.dailyQuota = dailyQuota;
    if (description) department.description = description;

    if (req.file) {
      department.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        path: req.file.path,
        size: req.file.size,
      };
    }

    const updatedDepartment = await department.save();
    res.json(updatedDepartment);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE: Remove a department
router.delete('/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id); // Check if the department exists
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});


module.exports = router;
