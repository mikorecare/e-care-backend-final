const express = require("express");
const multer = require("multer");
const Department = require("../../models/department");
const path = require("path");
const mongoose = require("mongoose");
const { Readable } = require("stream");
const fs = require("fs");

// Set up Multer for file uploads
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

const router = express.Router();

// CREATE: Add a department
router.post("/", upload, async (req, res) => {
  const { name, description } = req.body;
  let { dailyQuota } = req.body;
  
  // Validate only the required fields
  if (!name || !description) {
    return res.status(400).json({ error: "Name and description are required" });
  }

  if (!dailyQuota) {
    dailyQuota = 50;
  }

  let departmentData = new Department({
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

  if (req.file) {
    const fileBuffer = fs.readFileSync(req.file.path);

    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);

    const uploadStream = gfs.openUploadStream(req.file.filename, {
      contentType: req.file.mimetype,
    });

    readableStream.pipe(uploadStream);

    uploadStream.on("finish", async () => {
      const fileId = uploadStream.id;

       departmentData.image = {
        filename: uploadStream.filename,
        originalName: req.file.originalname,
        mimeType: uploadStream.contentType,
        size: uploadStream.length,
        uploadDate: uploadStream.uploadDate,
        _id: new mongoose.Types.ObjectId(fileId),
      };

      const savedDepartment = await departmentData.save();
      res.status(201).json(savedDepartment);
    });

    uploadStream.on("error", (error) => {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "File upload failed" });
    });
  } else {
    try {

      const savedDepartment = await departmentData.save();
      res.json(savedDepartment);
    } catch (error) {
      console.error("Error adding department:", error);
      res.status(500).json({ error: "Failed to add department" });
    }
  }
});

// READ: Get all departments
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    console.error("Error retrieving departments:", error);
    res.status(500).json({ error: "Failed to retrieve departments" });
  }
});

// READ: Get a single department by ID
router.get("/:id", async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }
    res.json(department);
  } catch (error) {
    console.error("Error retrieving department:", error);
    res.status(500).json({ error: "Failed to retrieve department" });
  }
});

// UPDATE: Edit a department
router.put("/:id", upload, async (req, res) => {
  const { name, description, dailyQuota } = req.body;

  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    if (name) department.name = name;
    if (description) department.description = description;
    if (dailyQuota) department.dailyQuota = parseInt(dailyQuota, 10);

    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);

      const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads",
      });

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);

      const uploadStream = gfs.openUploadStream(req.file.filename, {
        contentType: req.file.mimetype,
      });

      readableStream.pipe(uploadStream);

      uploadStream.on("finish", async () => {
        const fileId = uploadStream.id;

        if (department.image?._id) {
          try {
            await gfs.delete(new mongoose.Types.ObjectId(department.image._id));
          } catch (err) {
            console.error("Error deleting old image:", err);
          }
        }

        department.image = {
          filename: uploadStream.filename,
          originalName: req.file.originalname,
          mimeType: uploadStream.contentType,
          size: uploadStream.length,
          uploadDate: uploadStream.uploadDate,
          _id: new mongoose.Types.ObjectId(fileId),
        };

        const updatedDepartment = await department.save();
        res.status(201).json(updatedDepartment);
      });

      uploadStream.on("error", (error) => {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "File upload failed" });
      });
    } else {
      const updatedDepartment = await department.save();
      res.status(201).json(updatedDepartment);
    }

    // uploadStream.on('finish', async () => {

    //   // Now, `uploadedFile` contains metadata
    //   const fileId = uploadStream.id;

    //   if (department.image?._id) {
    //     try {
    //       await gfs.delete(new mongoose.Types.ObjectId(department.image._id));
    //     } catch (err) {
    //       console.error('Error deleting old image:', err);
    //     }
    //   }

    //   department.image = {
    //     filename: uploadStream.filename,
    //     originalName: req.file.originalname,
    //     mimeType: uploadStream.contentType,
    //     size: uploadStream.length,
    //     uploadDate: uploadStream.uploadDate,
    //     _id: new mongoose.Types.ObjectId(fileId),
    //   };

    //   const updatedDepartment = await department.save();
    //   res.json(updatedDepartment);
    // });

    // uploadStream.on('error', (error) => {
    //   console.error('Error uploading new image:', error);
    //   res.status(500).json({ error: 'Image upload failed' });
    // });
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ error: "Failed to update department" });
  }
});

// DELETE: Remove a department
router.delete("/:id", async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id); // Check if the department exists
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
});

module.exports = router;
