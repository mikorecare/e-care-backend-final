const express = require('express');
const multer = require('multer');
const Department = require('../models/department');
const mongoose = require('mongoose');

// const upload = multer({ storage: storage });

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// CREATE: Add a department with an image
router.post('/', upload.single('image'), async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description || !req.file) {
    return res.status(400).json({ error: 'Name, description, and image are required' });
  }

  try {
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const uploadStream = gfs.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async (file) => {
      const department = new Department({
        name,
        description,
        image: {
          filename: file.filename,
          originalName: req.file.originalname,
          mimeType: file.contentType,
          size: file.length,
          uploadDate: file.uploadDate,
        },
      });

      const savedDepartment = await department.save();
      res.status(201).json(savedDepartment);
    });

    uploadStream.on('error', (error) => {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Image upload failed' });
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
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

// Update daily quota or department info
router.put('/:id', upload.single('image'), async (req, res) => {
  const { name, description, dailyQuota } = req.body;

  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (name) department.name = name;
    if (description) department.description = description;
    if (dailyQuota) department.dailyQuota = parseInt(dailyQuota, 10);

    if (req.file) {
      const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const uploadStream = gfs.openUploadStream(req.file.originalname, { contentType: req.file.mimetype });
      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', async (file) => {
        try {
          await gfs.delete(new mongoose.Types.ObjectId(department.image.filename));
        } catch (err) {
          console.error('Error deleting old image:', err);
        }

        department.image = {
          filename: file.filename,
          originalName: req.file.originalname,
          mimeType: file.contentType,
          size: file.length,
          uploadDate: file.uploadDate,
        };

        const updatedDepartment = await department.save();
        res.json(updatedDepartment);
      });

      uploadStream.on('error', (error) => {
        console.error('Error uploading new image:', error);
        res.status(500).json({ error: 'Image upload failed' });
      });
    } else {
      const updatedDepartment = await department.save();
      res.json(updatedDepartment);
    }
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

//EDIT
router.put('/:id', upload.single('image'), async (req, res) => {
  const { name, description } = req.body;

  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (name) department.name = name;
    if (description) department.description = description;

    if (req.file) {
      const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

      // Upload new image
      const uploadStream = gfs.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', async (file) => {
        // Delete the old image
        try {
          await gfs.delete(new mongoose.Types.ObjectId(department.image.filename));
        } catch (err) {
          console.error('Error deleting old image:', err);
        }

        // Update the department's image field
        department.image = {
          filename: file.filename,
          originalName: req.file.originalname,
          mimeType: file.contentType,
          size: file.length,
          uploadDate: file.uploadDate,
        };

        const updatedDepartment = await department.save();
        res.json(updatedDepartment);
      });

      uploadStream.on('error', (error) => {
        console.error('Error uploading new image:', error);
        res.status(500).json({ error: 'Image upload failed' });
      });
    } else {
      const updatedDepartment = await department.save();
      res.json(updatedDepartment);
    }
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// READ: Get a single department by ID (including name, description, and image)
router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Build a response object with the department's details
    const departmentDetails = {
      name: department.name,
      description: department.description,
      image: {
        filename: department.image.filename,
        originalName: department.image.originalName,
        mimeType: department.image.mimeType,
        size: department.image.size,
        uploadDate: department.image.uploadDate,
      },
    };

    res.json(departmentDetails);
  } catch (error) {
    console.error('Error retrieving department:', error);
    res.status(500).json({ error: 'Failed to retrieve department' });
  }
});

// Serve image by filename
router.get('/uploads/:filename', async (req, res) => {
  try {
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });

    const fileStream = gfs.openDownloadStreamByName(req.params.filename);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error serving file:', error);
      res.status(404).json({ error: 'File not found' });
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});


// DELETE: Remove a department
router.delete('/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    try {
      await gfs.delete(new mongoose.Types.ObjectId(department.image.filename));
    } catch (err) {
      console.error('Error deleting image from GridFS:', err);
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;
