const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  departmentName: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Department', DepartmentSchema);
