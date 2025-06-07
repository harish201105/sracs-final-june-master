const mongoose = require('mongoose');

const DocumentElementSchema = new mongoose.Schema({
  type: { type: String, required: true },
  content: { type: String },
  pdfFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  paraId: { type: String, required: true, unique: true },
  paraAuditId: { type: String },
  order: { type: Number },
  remarks: { type: String, default: '' }, // Final remarks by the main user
  departments: { type: [String], default: [] }, // Assigned departments
  deptRemarks: { 
    type: [
      {
        department: { type: String },
        remark: { type: String, default: '' },
        signaturePath: { type: String },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  rejoinderRemarks: {
    type: [String],
    default: []
  },
  rejoinderFinalRemarks: {  // New field for rejoinder final remarks
    type: [String],
    default: []
  },
  rejoinderDepartment: {
    type: String,
    default: ''
  },
  rejoinderDepartments: {
    type: [String],
    default: []
  },
  rejoinderDepartmentReply: {
    type: Map,
    of: String,
    default: {}
  },
}, { timestamps: true });

module.exports = mongoose.model('DocumentElement', DocumentElementSchema);