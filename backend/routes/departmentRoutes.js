const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const mongoose = require('mongoose');

// Endpoint to add a new department
router.post('/', async (req, res) => {
  const { email, password, departmentName } = req.body;
  if (!email || !password || !departmentName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const dept = new Department({ email, password, departmentName });
    await dept.save();
    res.status(201).json({ message: 'Department added successfully', department: dept });
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({ message: 'Error adding department' });
  }
});

// Endpoint to fetch all departments
router.get('/', async (req, res) => {
  try {
    const depts = await Department.find({});
    res.status(200).json(depts);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Error fetching departments' });
  }
});

// Endpoint to update a department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentName, email } = req.body;

    console.log('Update department request:', {
      id,
      departmentName,
      email,
      params: req.params,
      body: req.body
    });

    if (!departmentName || !email) {
      return res.status(400).json({ message: 'Department name and email are required' });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid MongoDB ObjectId:', id);
      return res.status(400).json({ 
        message: 'Invalid department ID format',
        id: id
      });
    }

    // Check if another department already has the same name or email
    const existingDept = await Department.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      $or: [
        { departmentName: { $regex: new RegExp(`^${departmentName}$`, 'i') } },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });

    if (existingDept) {
      console.log('Department name or email conflict found:', existingDept);
      return res.status(400).json({ 
        message: 'Another department already exists with this name or email' 
      });
    }

    console.log('Attempting to find and update department with ID:', id);
    const updatedDept = await Department.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { departmentName, email },
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    console.log('Update result:', updatedDept);

    if (!updatedDept) {
      console.log('Department not found with ID:', id);
      // Check if department exists at all
      const exists = await Department.exists({ _id: new mongoose.Types.ObjectId(id) });
      if (!exists) {
        return res.status(404).json({ 
          message: 'Department not found',
          id: id
        });
      }
      return res.status(500).json({ 
        message: 'Failed to update department',
        id: id
      });
    }

    res.status(200).json(updatedDept);
  } catch (error) {
    console.error('Error updating department:', error);
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid department ID format',
        error: error.message
      });
    }
    res.status(500).json({ 
      message: 'Error updating department',
      error: error.message 
    });
  }
});

// Endpoint to update department password
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const updatedDept = await Department.findByIdAndUpdate(
      id,
      { password },
      { new: true, runValidators: true }
    );

    if (!updatedDept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ 
      message: 'Error updating password',
      error: error.message 
    });
  }
});

// Endpoint to delete a department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDept = await Department.findByIdAndDelete(id);

    if (!deletedDept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ 
      message: 'Error deleting department',
      error: error.message 
    });
  }
});

module.exports = router;
