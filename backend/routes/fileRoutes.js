const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middleware/uploadMiddleware');
const fileController = require('../controllers/fileController');

// File upload and conversion
router.post('/upload-and-convert', uploadMiddleware, fileController.uploadAndConvert);

// File operations
router.get('/files-by-type', fileController.getFilesByType);
router.get('/convert-file/:id', fileController.convertFileWithoutSaving);
router.post('/uploadReport', fileController.uploadReport);
router.post('/updateRemarks', fileController.updateRemarks);
router.post('/getFileRemarks', fileController.getFileRemarks);
router.post('/saveTable', fileController.saveTable);
router.get('/files-by-department', fileController.getFilesByDepartment);
router.post('/updateDeptRemarks', fileController.updateDeptRemarks);
router.post('/cleanupFileParagraphs', fileController.cleanupFileParagraphs);
router.get('/files-filter', fileController.filterFilesByCriteria);
router.get('/document-types', fileController.getDocumentTypes);
router.get('/dashboard', fileController.getDashboardData);
router.put('/updateFileDates', fileController.updateFileDates);
router.post('/addRejoinderRemarks', fileController.addRejoinderRemarks);
router.post('/getFileRejoinderRemarks', fileController.getFileRejoinderRemarks);
router.delete('/delete-file/:id', fileController.deleteFile);
router.get('/file-departments', fileController.getFileDepartments);
router.get('/download/:fileName', fileController.downloadFile);
router.post('/freeze-file', fileController.freezeFile);
router.post('/check-file-frozen', fileController.checkFileFrozen);
router.post('/assignRejoinderDepartments', fileController.assignRejoinderDepartments);
router.post('/rejoinderDepartmentReply', fileController.rejoinderDepartmentReply);
router.post('/addRejoinderColumn', fileController.addRejoinderColumn);
router.post('/updateRejoinderFinalRemark', fileController.updateRejoinderFinalRemark);

module.exports = router;