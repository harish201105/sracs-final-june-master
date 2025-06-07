const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
const fileController = require('./controllers/fileController');
const departmentRoutes = require('./routes/departmentRoutes');
const fileRoutes = require('./routes/fileRoutes');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// File upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: false, // Changed to false to avoid temp file issues
  abortOnLimit: true,
  responseOnLimit: 'File size limit has been reached',
  debug: true // Enable debug mode to help diagnose issues
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Routes
app.use('/api', fileRoutes);

// ✅ API Routes
app.use('/api/departments', departmentRoutes);

// ✅ File controller endpoints
const {
  uploadAndConvert, getFilesByType, convertFileWithoutSaving, uploadReport,
  updateRemarks, getFileRemarks, saveTable, getFilesByDepartment, updateDeptRemarks,
  cleanupFileParagraphs, updateFileDates, getDashboardData, getFilesByDate,
  getDocumentTypes, filterFilesByCriteria, addRejoinderRemarks, getFileRejoinderRemarks,
  deleteFile, getFileDepartments, downloadFile, freezeFile, checkFileFrozen,
  assignRejoinderDepartments, rejoinderDepartmentReply, addRejoinderColumn,
  updateRejoinderFinalRemark
} = fileController;

const requiredFunctions = [
  uploadAndConvert, getFilesByType, convertFileWithoutSaving, uploadReport,
  updateRemarks, getFileRemarks, saveTable, getFilesByDepartment, updateDeptRemarks,
  cleanupFileParagraphs, updateFileDates, getDashboardData, getFilesByDate,
  getDocumentTypes, filterFilesByCriteria, addRejoinderRemarks, getFileRejoinderRemarks,
  deleteFile, getFileDepartments, downloadFile, freezeFile, checkFileFrozen,
  assignRejoinderDepartments, rejoinderDepartmentReply, addRejoinderColumn,
  updateRejoinderFinalRemark
];

if (requiredFunctions.some(fn => !fn)) {
  console.error('❌ Error: Missing required fileController functions.');
  process.exit(1);
}

// ✅ File controller routes
app.post('/api/upload-and-convert', uploadAndConvert);
app.get('/api/files-by-type', getFilesByType);
app.get('/api/convert-file/:id', convertFileWithoutSaving);
app.post('/api/uploadReport', uploadReport);
app.post('/api/updateRemarks', updateRemarks);
app.post('/api/getFileRemarks', getFileRemarks);
app.post('/api/saveTable', saveTable);
app.get('/api/files-by-department', getFilesByDepartment);
app.post('/api/updateDeptRemarks', updateDeptRemarks);
app.post('/api/cleanupFileParagraphs', cleanupFileParagraphs);
app.get('/api/files-filter', filterFilesByCriteria);
app.get('/api/document-types', getDocumentTypes);
app.get('/api/dashboard', getDashboardData);
app.put('/api/updateFileDates', updateFileDates);
app.post('/api/addRejoinderRemarks', addRejoinderRemarks);
app.post('/api/getFileRejoinderRemarks', getFileRejoinderRemarks);
app.delete('/api/delete-file/:id', deleteFile);
app.get('/api/file-departments', getFileDepartments);
app.get('/api/download/:fileName', downloadFile); 
app.post('/api/freeze-file', freezeFile); 
app.post('/api/check-file-frozen', checkFileFrozen);
app.post('/api/assignRejoinderDepartments', assignRejoinderDepartments);
app.post('/api/rejoinderDepartmentReply', rejoinderDepartmentReply);
app.post('/api/addRejoinderColumn', addRejoinderColumn);
app.post('/api/updateRejoinderFinalRemark', updateRejoinderFinalRemark);

// ✅ Health check endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Southern Railways Audit API Server' });
});

app.get('/api', (req, res) => {
  res.send('🚀 Backend API is live!');
});

// Catch all route to serve frontend for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      details: err.message
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = 'localhost'; // Listen only on localhost

console.log('Starting server with configuration:');
console.log(`PORT: ${PORT}`);
console.log(`HOST: ${HOST}`);

// Start the server
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server is running at http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Try to connect to MongoDB after server is running
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sracs')
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️ Server will continue running with limited functionality');
  });