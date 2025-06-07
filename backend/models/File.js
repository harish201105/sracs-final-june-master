const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true }, // Stores relative path to file in uploads directory
  documentType: { type: String, required: true },
  startDate: { type: Date, required: false }, // Make it optional
  endDate: { type: Date, required: false },   // Make it optional
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'closed', 'Department Assigned', 'Department Remarks Given', 'Final Remarks Pending'], 
    default: 'Pending' 
  },
  uploadDate: { type: Date, default: Date.now },
  assignmentDate: { type: String }, // Store assignment date as string to preserve exact format
  elements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentElement' }]
}, { timestamps: true }); // Add timestamps option

module.exports = mongoose.model('File', fileSchema);