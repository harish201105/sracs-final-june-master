const File = require('../models/File');
const DocumentElement = require('../models/DocumentElement');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const pdf_table_extractor = require('pdf-table-extractor');
const convertapi = require('convertapi')('secret_1DzsDOeeZo4hrZOz');
const pdf2table = require('pdf2table');
const mongoose = require('mongoose');

// Function to extract paragraphs from text
const extractPDFContent = async (filePath) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  const data = await pdf(fileBuffer);
  return data.text;
}
// NEW: Function to extract audit observation paragraphs using double-newline separation
// NEW: Function to extract audit observation paragraphs according to para numbers
// NEW: Function to extract audit observation paragraphs based on para number changes
function extractAuditObservations(text) {
  // Look for the marker indicating the start of the audit observations section.
  const marker = /Para No\. Audit(?:' |')s Observations/i;
  const markerIndex = text.search(marker);
  if (markerIndex === -1) {
    // If the marker isn't found, fall back to splitting by two or more newlines.
    return text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 20);
  }

  // Extract the audit section starting at the marker.
  const auditSection = text.substring(markerIndex);

  // Use matchAll to find all observation blocks.
  // This regex:
  // • Looks for a new line (or start) followed by optional whitespace,
  // • Captures a paragraph number (e.g. "1." or "4.1.") with a trailing space,
  // • Then captures all content lazily until the next paragraph number or end.
  const regex = /(?:^|\n)\s*(\d+(?:\.\d+)?\.\s+)([\s\S]*?)(?=\n\s*\d+(?:\.\d+)?\.\s+|$)/g;
  const paragraphs = [];
  for (const match of auditSection.matchAll(regex)) {
    // Combine the paragraph number with its content.
    const paraNumber = match[1].trim();
    const content = match[2].trim();
    // Only add if content is long enough
    if ((paraNumber + " " + content).length > 20) {
      paragraphs.push(paraNumber + " " + content);
    }
  }
  return paragraphs;
}

// Now update the conversion endpoints to use extractAuditObservations:

const convertFileWithoutSaving = async (req, res) => {
  try {
    const fileId = req.params.id;
    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required.' });
    }
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }
    const extractedText = await extractPDFContent(file.filePath);
    // Use the new function to extract audit observation paragraphs.
    const paragraphs = extractAuditObservations(extractedText);
    const elements = paragraphs.map((content, index) => ({
      type: 'paragraph',
      content,
      paraId: `${file.documentType}P${index + 1}`,
      pdfFileId: file._id,
      order: index + 1,
    }));
    res.status(200).json({
      message: 'File processed successfully.',
      elements,
    });
  } catch (error) {
    console.error('Error processing file without saving:', error);
    res.status(500).json({ message: 'Internal server error.' });  }
};

const uploadAndConvert = async (req, res) => {
  try {
    const { documentType } = req.body;
    if (!req.files || !req.files.file) {
      return res.status(400).send('No file uploaded.');
    }

    const pdfFile = req.files.file;

    // Check if file with same name exists
    const existingFile = await File.findOne({ fileName: pdfFile.name });
    if (existingFile) {
      return res.status(409).json({ 
        message: 'File with this name already exists. Please rename the file before uploading.'
      });
    }

    // Store file in uploads directory
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const uploadPath = path.join(uploadDir, pdfFile.name);
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await fs.promises.writeFile(uploadPath, pdfFile.data);

    // Save file in DB with relative path
    const file = new File({
      fileName: pdfFile.name,
      filePath: `uploads/${pdfFile.name}`, // Store relative path
      documentType,
    });
    await file.save();

    const extractedText = await extractPDFContent(uploadPath);
    const paragraphs = extractAuditObservations(extractedText);

    const paragraphElements = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const paraId = `${documentType}P${i + 1}`;
      const paraAuditId = `P${i + 1}`;

      // Ensure existing paraId is updated instead of duplication
      const element = await DocumentElement.findOneAndUpdate(
        { paraId },
        {
          type: 'paragraph',
          content: paragraphs[i],
          pdfFileId: file._id, // Assign the correct file ID
          paraId,
          paraAuditId,
          order: i + 1,
        },
        { new: true, upsert: true }
      );

      paragraphElements.push(element);
    }

    res.status(201).json({
      message: 'File uploaded and converted successfully',
      elements: paragraphElements,
    });
  } catch (error) {
    console.error('Error in uploadAndConvert:', error);
    res.status(500).send('File upload and conversion failed.');
  }
};



// Function to extract tables from the PDF and store them in MongoDB
async function extractTablesAndStore(filePath, documentType, pdfFileId) {
  return new Promise((resolve, reject) => {
    pdf_table_extractor(filePath, async (result) => {
      if (result && result.pageTables && result.pageTables.length > 0) {
        const filteredTables = result.pageTables
          .filter(table => table.data && table.data.length > 0)
          .map(table => table.data);

        try {
          const elements = [];
          for (let i = 0; i < filteredTables.length; i++) {
            const tableData = filteredTables[i];
            if (tableData && tableData.length > 0) {
              const structuredTableData = tableData.map(row => row.filter(cell => cell && cell.trim() !== '').map(cell => cell.trim()));

              const tableId = `${documentType}T${i + 1}`;
              const tableAuditId = `T1.${i + 1}`;

              const element = new DocumentElement({
                type: 'table',
                content: JSON.stringify({ data: structuredTableData }),
                pdfFileId,
                paraId: tableId,
                paraAuditId: tableAuditId,
                order: i,
              });

              await element.save();
              elements.push(element);
            }
          }

          resolve(elements);
        } catch (error) {
          console.error('Error storing tables in MongoDB:', error);
          reject(error);
        }
      } else {
        resolve([]);
      }
    }, (error) => {
      console.error('Error extracting tables from PDF:', error);
      reject(error);
    });
  });
}

// Function to extract remarks from PDF
const uploadReport = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).send('No file uploaded.');
    }

    const reportFile = req.files.file;
    const uploadPath = path.join(__dirname, '..', 'uploads', reportFile.name);

    // Save file to the server
    await fs.promises.writeFile(uploadPath, reportFile.data);

      // Create an entry for the file in the database
      const file = new File({
        fileName: reportFile.name,
        filePath: uploadPath,
        documentType: 'general',
      });
      await file.save();

      // Fetch or initialize remarks for the file
      const elements = [];
      for (let i = 0; i < 10; i++) {
        const paraId = `P${i + 1}`;
        const paraAuditId = `Audit-P${i + 1}`;

        const element = await DocumentElement.findOneAndUpdate(
          { paraId },
          {
            $setOnInsert: {
              type: 'paragraph',
              content: `Placeholder content for paragraph ${i + 1}`,
              pdfFileId: file._id,
              paraAuditId,
              order: i + 1,
              remarks: '',
            },
          },
          { new: true, upsert: true }
        );
        elements.push(element);
      }

      res.status(201).json({
        message: 'Report uploaded and elements initialized.',
        file,
        elements,
      });
  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).send('Failed to upload report and initialize elements.');
  }
};




// Route to upload and convert a PDF file
const getFileRemarks = async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ message: 'File name is required.' });
    }

    // First find the file
    const file = await File.findOne({ fileName });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Then find the elements for this file
    const elements = await DocumentElement.find({ pdfFileId: file._id }).sort({ order: 1 });

    res.status(200).json({
      message: 'File remarks fetched successfully.',
      file,
      elements,
    });
  } catch (error) {
    console.error('Error fetching file remarks:', error);
    res.status(500).json({ message: 'Failed to fetch file remarks.' });
  }
};



// Route to fetch files by document type
const getFilesByType = async (req, res) => {
  try {
    const { documentType } = req.query;
    console.log('Fetching files for document type:', documentType);

    if (!documentType) {
      console.log('No document type provided in request');
      return res.status(400).json({ message: 'Document type is required.' });
    }

    console.log('Querying database for files with documentType:', documentType);
    const files = await File.find({ documentType });
    console.log('Found files:', files.length);

    if (!files || files.length === 0) {
      console.log('No files found for document type:', documentType);
      return res.status(404).json({ message: 'No files found for this document type.' });
    }

    console.log('Successfully retrieved files:', files.map(f => ({ fileName: f.fileName, documentType: f.documentType })));
    res.status(200).json(files);
  } catch (error) {
    console.error('Error fetching files by document type:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Error fetching files. Please try again later.',
      error: error.message 
    });
  }
};

// Route to update remarks for a specific paraId
// controllers/fileController.js (excerpt)
// Update Remarks Endpoint – supports bulk update (e.g. after splittin
const updateRemarks = async (req, res) => {
  try {
    const { elements, fileName, assignmentDate } = req.body;
    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({ message: 'No elements provided.' });
    }

    // Update the file with assignment date if provided
    if (fileName && assignmentDate) {
      await File.findOneAndUpdate(
        { fileName },
        { assignmentDate },
        { new: true }
      );
    }

    const bulkOps = elements.map(element => ({
      updateOne: {
        filter: { paraId: element.paraId },
        update: {
          $set: {
            content: element.content,
            remarks: element.remarks,
            departments: element.departments || [],
            order: element.order,
            paraAuditId: element.paraAuditId,
            pdfFileId: element.pdfFileId, // preserve pdfFileId
            type: element.type            // preserve type
          }
        },
        upsert: true
      }
    }));

    await DocumentElement.bulkWrite(bulkOps);
    res.status(200).json({ message: 'Paragraphs updated successfully.' });
  } catch (error) {
    console.error('Error updating remarks:', error);
    res.status(500).json({ message: 'Failed to update paragraphs.', error: error.message });
  }
};






const saveTable = async (req, res) => {
  try {
    const { fileId, tableContent, paraId, paraAuditId, order } = req.body;
    if (!fileId || !tableContent || !paraId || !paraAuditId || order === undefined) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Verify file exists
    const fileExists = await File.exists({ _id: fileId });
    if (!fileExists) {
      return res.status(404).json({ message: 'File not found for the provided fileId.' });
    }

    // If tableContent is an object (e.g. a 2D array or structured object), convert it to a JSON string.
    const tableData = typeof tableContent === 'object'
      ? JSON.stringify(tableContent)
      : tableContent;

    // Create a new DocumentElement for the table with all additional fields initialized.
    const newTable = new DocumentElement({
      type: 'table',
      content: tableData,
      pdfFileId: fileId,
      paraId,
      paraAuditId,
      order,
      remarks: '',             // For final remarks
      departments: [],         // For department assignments
      deptRemarks: [],         // For department-specific remarks
      rejoinderRemarks: [],     // For rejoinder remarks
      rejoinderDepartmentReply: new Map(),
    });

    await newTable.save();

    res.status(201).json({
      message: 'Table saved successfully.',
      table: newTable,
    });
  } catch (error) {
    console.error('Error saving table:', error);
    res.status(500).json({ message: 'Failed to save table.' });
  }
};

const getFilesByDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ message: 'Department is required.' });
    }

    const regex = new RegExp(`^${department}$`, 'i');
    const elements = await DocumentElement.find({ departments: { $regex: regex } }).sort({ order: 1 });

    const validElements = elements.filter(el => el.pdfFileId);

    if (validElements.length === 0) {
      return res.status(404).json({ message: 'No assigned files found for this department.' });
    }

    const filesMap = {};
    validElements.forEach(el => {
      const fileId = el.pdfFileId.toString();
      if (!filesMap[fileId]) {
        filesMap[fileId] = { elements: [], fileId };
      }
      filesMap[fileId].elements.push(el);
    });

    const fileIds = Object.keys(filesMap);
    const files = await File.find({ _id: { $in: fileIds } });

    const filesWithElements = files.map(file => ({
      ...file.toObject(),
      elements: filesMap[file._id.toString()] || [],
    }));

    res.status(200).json(filesWithElements);
  } catch (error) {
    console.error('Error fetching files by department:', error);
    res.status(500).json({ message: 'Error fetching department files.' });
  }
};


const updateDeptRemarks = async (req, res) => {
  try {
    console.log("Received form data:", req.body); // Debug log

    const paraId = req.body.paraId;
    const department = req.body.department;
    const deptRemark = req.body.deptRemark;
    const signature = req.files?.signature;

    console.log("Extracted values:", { paraId, department, deptRemark }); // Debug log

    if (!paraId || !department || !deptRemark) {
      return res.status(400).json({ 
        message: 'Para ID, department, and remark are required.',
        received: { paraId, department, deptRemark }
      });
    }

    // Find the document element by paraId
    const documentElement = await DocumentElement.findOne({ paraId });
    if (!documentElement) {
      return res.status(404).json({ message: 'Document element not found.' });
    }

    // Handle signature file if present
    let signaturePath = '';
    if (signature) {
      const fileName = `${department}_${paraId}_${Date.now()}.${signature.name.split('.').pop()}`;
      signaturePath = `uploads/signatures/${fileName}`;
      await signature.mv(signaturePath);
    }

    // Check if there is already a remark for this department
    const existingIndex = documentElement.deptRemarks.findIndex(d => d.department === department);
    if (existingIndex !== -1) {
      documentElement.deptRemarks[existingIndex] = {
        department,
        remark: deptRemark,
        signaturePath: signaturePath || documentElement.deptRemarks[existingIndex].signaturePath,
        timestamp: new Date()
      };
    } else {
      documentElement.deptRemarks.push({
        department,
        remark: deptRemark,
        signaturePath,
        timestamp: new Date()
      });
    }

    const saved = await documentElement.save();
    console.log("Updated document element:", saved);

    res.status(200).json({
      message: 'Department remarks updated successfully.',
      updatedElement: saved
    });
  } catch (error) {
    console.error('Error updating department remarks:', error);
    res.status(500).json({ message: 'Failed to update department remarks.', error: error.message });
  }
};

const cleanupFileParagraphs = async (req, res) => {
  try {
    const { fileName, paraIds } = req.body;
    if (!fileName || !Array.isArray(paraIds)) {
      return res.status(400).json({ message: 'File name and paraIds are required.' });
    }
    const file = await File.findOne({ fileName });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }
    await DocumentElement.deleteMany({
      pdfFileId: file._id,
      paraId: { $nin: paraIds }
    });
    res.status(200).json({ message: 'Old paragraphs cleaned up successfully.' });
  } catch (error) {
    console.error('Error cleaning up paragraphs:', error);
    res.status(500).json({ message: 'Failed to clean up paragraphs.' });
  }
};



const updateFileDates = async (req, res) => {
  try {
    const { fileName, startDate, endDate, status } = req.body;

    if (!fileName) {
      return res.status(400).json({ message: 'File name is required.' });
    }

    // Set a timeout for the database operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), 20000);
    });

    const updateData = {};
    if (startDate) {
      updateData.startDate = new Date(startDate);
    } else {
      updateData.startDate = new Date();
    }

    if (endDate) {
      updateData.endDate = new Date(endDate);
    } else {
      const predictedEndDate = new Date(updateData.startDate);
      predictedEndDate.setDate(predictedEndDate.getDate() + 7);
      updateData.endDate = predictedEndDate;
    }

    updateData.status = status || 'Pending';

    // Race between the database operation and the timeout
    const updatedFile = await Promise.race([
      File.findOneAndUpdate(
        { fileName },
        updateData,
        { new: true, maxTimeMS: 15000 } // Add maxTimeMS to limit MongoDB operation time
      ),
      timeoutPromise
    ]);

    if (!updatedFile) {
      return res.status(404).json({ message: 'File not found.' });
    }

    res.status(200).json({
      message: 'File dates and status updated successfully.',
      updatedFile,
    });
  } catch (error) {
    console.error('Error updating file dates:', error);
    if (error.message === 'Database operation timed out') {
      return res.status(504).json({ message: 'Operation timed out. Please try again.' });
    }
    res.status(500).json({ message: 'Failed to update file dates and status.' });
  }
};

// Function to fetch dashboard data
// Function to fetch dashboard data with dynamic status


// Function to fetch files by date range
const getFilesByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required.' });
    }

    const files = await File.find({
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) },
    });

    if (!files.length) {
      return res.status(404).json({ message: 'No files found in the given date range.' });
    }

    res.status(200).json(files);
  } catch (error) {
    console.error('Error fetching files by date:', error);
    res.status(500).json({ message: 'Error fetching files by date.' });
  }
};
const getDashboardData = async (req, res) => {
  try {
    const files = await File.find({});

    const filesWithDetails = await Promise.all(files.map(async (file) => {
      const elements = await DocumentElement.find({ pdfFileId: file._id });

      const departmentsAssigned = elements.some(el => el.departments && el.departments.length > 0);
      const departmentRemarksGiven = elements.some(el => el.deptRemarks && el.deptRemarks.length > 0);
      const finalRemarksGiven = elements.every(el => el.remarks && el.remarks.trim() !== '');

      // Use the actual database status if it exists, otherwise compute it
      let status = file.status || 'Pending';

      // Only compute status if it's not already set to 'closed' in database
      if (status !== 'closed') {
        if (departmentsAssigned) status = 'Department Assigned';
        if (departmentRemarksGiven) status = 'Department Remarks Given';
        if (departmentRemarksGiven && !finalRemarksGiven) status = 'Final Remarks Pending';
        if (departmentRemarksGiven && finalRemarksGiven) status = 'Completed';
      }

      return {
        fileName: file.fileName,
        documentType: file.documentType,
        startDate: file.startDate,
        endDate: file.endDate,
        status: status,
        departmentsAssigned,
        departmentRemarksGiven,
        finalRemarksGiven,
      };
    }));

    res.status(200).json(filesWithDetails);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Fetch
// Fetch available document types
const getDocumentTypes = async (req, res) => {
  try {
    const documentTypes = await File.distinct('documentType');
    res.status(200).json(documentTypes);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Fetch files by date and document type
const filterFilesByCriteria = async (req, res) => {
  try {
    const { startDate, endDate, documentType } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    if (documentType) {
      query.documentType = documentType;
    }

    // Include all fields including assignmentDate and updatedAt in the response
    const files = await File.find(query).select('+assignmentDate +updatedAt');
    res.status(200).json(files);
  } catch (error) {
    console.error('Error fetching filtered files:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
const addRejoinderRemarks = async (req, res) => {
  try {
    const { paraId, rejoinderRemark, index } = req.body;
    if (!paraId || rejoinderRemark === undefined || index === undefined) {
      return res.status(400).json({ message: 'Para ID, rejoinder remark and index are required.' });
    }
    const documentElement = await DocumentElement.findOne({ paraId });
    if (!documentElement) {
      return res.status(404).json({ message: 'Paragraph not found.' });
    }
    // Ensure the rejoinderRemarks array is long enough.
    while (documentElement.rejoinderRemarks.length <= index) {
      documentElement.rejoinderRemarks.push('');
    }
    // Update the remark at the specified index.
    documentElement.rejoinderRemarks[index] = rejoinderRemark;
    await documentElement.save();

    // Fetch and return the updated elements.
    const elements = await DocumentElement.find({ pdfFileId: documentElement.pdfFileId }).sort({ order: 1 });
    res.status(200).json({
      message: 'Rejoinder remark updated successfully.',
      elements,
    });
  } catch (error) {
    console.error('Error updating rejoinder remark:', error);
    res.status(500).json({ message: 'Failed to update rejoinder remark.' });
  }
};



// Fetch Rejoinder Remarks
const getFileRejoinderRemarks = async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ message: 'File name is required.' });
    }

    const file = await File.findOne({ fileName });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const elements = await DocumentElement.find({ pdfFileId: file._id }).sort({ order: 1 });

    res.status(200).json({
      message: 'Rejoinder remarks fetched successfully.',
      elements,
    });
  } catch (error) {
    console.error('Error fetching rejoinder remarks:', error);
    res.status(500).json({ message: 'Failed to fetch rejoinder remarks.' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    console.log('Attempting to delete file with ID:', fileId);

    // Validate fileId
    if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
      console.error('Invalid file ID provided:', fileId);
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format'
      });
    }

    // Find the file first to get its details
    const file = await File.findById(fileId);
    if (!file) {
      console.error('File not found with ID:', fileId);
      return res.status(404).json({ 
        success: false,
        message: 'File not found in database' 
      });
    }

    console.log('Found file to delete:', {
      fileName: file.fileName,
      filePath: file.filePath,
      documentType: file.documentType
    });

    // Delete all associated document elements first
    try {
      const deleteResult = await DocumentElement.deleteMany({ pdfFileId: fileId });
      console.log('Deleted document elements:', deleteResult.deletedCount);
    } catch (docError) {
      console.error('Error deleting document elements:', docError);
      throw new Error(`Failed to delete associated document elements: ${docError.message}`);
    }

    // Delete the physical file if it exists
    if (file.filePath) {
      try {
        // Convert relative path to absolute path
        const absolutePath = path.join(__dirname, '..', file.filePath);
        console.log('Attempting to delete physical file at:', absolutePath);
        
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
          console.log('Successfully deleted physical file');
        } else {
          console.log('Physical file not found at path:', absolutePath);
          // Continue with database deletion even if file is not found
        }
      } catch (fsError) {
        console.error('Error deleting physical file:', fsError);
        // Continue with database deletion even if physical file deletion fails
      }
    } else {
      console.log('No file path found in database record');
    }

    // Delete any associated signature files if they exist
    try {
      const elements = await DocumentElement.find({ pdfFileId: fileId });
      console.log('Found', elements.length, 'elements with potential signature files');
      
      for (const element of elements) {
        if (element.deptRemarks) {
          for (const remark of element.deptRemarks) {
            if (remark.signaturePath) {
              try {
                // Convert relative path to absolute path
                const signaturePath = path.join(__dirname, '..', remark.signaturePath);
                if (fs.existsSync(signaturePath)) {
                  console.log('Deleting signature file:', signaturePath);
                  fs.unlinkSync(signaturePath);
                  console.log('Successfully deleted signature file');
                }
              } catch (fsError) {
                console.error('Error deleting signature file:', fsError);
                // Continue with other deletions even if signature deletion fails
              }
            }
          }
        }
      }
    } catch (signatureError) {
      console.error('Error processing signature files:', signatureError);
      // Continue with database deletion even if signature processing fails
    }

    // Finally delete the file record from database
    try {
      const deleteResult = await File.findByIdAndDelete(fileId);
      if (!deleteResult) {
        throw new Error('File record not found in database during final deletion');
      }
      console.log('Successfully deleted file record from database');
    } catch (dbError) {
      console.error('Error deleting file record from database:', dbError);
      throw new Error(`Failed to delete file record from database: ${dbError.message}`);
    }

    res.status(200).json({
      success: true,
      message: 'File and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteFile:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
};

const getFileDepartments = async (req, res) => {
    try {
        const { fileName } = req.query;
        console.log('Received request for file departments with query:', req.query);

        if (!fileName) {
            return res.status(400).json({ message: 'File name is required' });
        }

        const decodedFileName = decodeURIComponent(fileName);
        console.log('Searching for file (after decoding):', decodedFileName);

        // Find the file using case-insensitive regex
        const escapedFileName = decodedFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const fileRegex = new RegExp('^' + escapedFileName + '$', 'i');
        console.log('Using regex pattern:', fileRegex);

        const file = await File.findOne({ fileName: { $regex: fileRegex } });

        if (!file) {
            console.log('File not found. Available files:');
            const allFiles = await File.find({}, 'fileName');
            console.log(allFiles.map(f => f.fileName));

            return res.status(404).json({ 
                message: 'File not found',
                searchedFileName: decodedFileName,
                availableFiles: allFiles.map(f => f.fileName)
            });
        }

        console.log('Found file:', file.fileName, 'with ID:', file._id);

        // Find all document elements for this file
        const elements = await DocumentElement.find({ pdfFileId: file._id });
        console.log('Found', elements.length, 'document elements');

        // Track department status using a Map
        const departmentMap = new Map();

        // Process each element
        elements.forEach(element => {
            if (element.departments && element.departments.length > 0) {
                element.departments.forEach(dept => {
                    const deptName = dept.toLowerCase(); // Case-insensitive comparison
                    const currentDept = departmentMap.get(deptName) || { 
                        name: dept,
                        totalAssignments: 0,
                        remarksGiven: 0 
                    };

                    currentDept.totalAssignments++;
                    if (element.deptRemarks && element.deptRemarks.some(r => r.department.toLowerCase() === deptName)) {
                        currentDept.remarksGiven++;
                    }

                    departmentMap.set(deptName, currentDept);
                });
            }
        });

        // Convert Map to array and calculate percentages
        const departments = Array.from(departmentMap.values()).map(dept => ({
            name: dept.name,
            completionPercentage: Math.round((dept.remarksGiven / dept.totalAssignments) * 100),
            remarksGiven: dept.remarksGiven,
            totalAssignments: dept.totalAssignments
        }));

        console.log('Processed departments:', departments);

        return res.json({ 
            departments,
            fileId: file._id,
            fileName: file.fileName
        });
    } catch (error) {
        console.error('Error in getFileDepartments:', error);
        return res.status(500).json({ 
            message: 'Error fetching departments',
            error: error.message
        });
    }
};

const downloadFile = (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found.');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
};

const updateFinalRemarks = async (req, res) => {
  try {
    const { fileName, elements } = req.body;

    // Get the file to check if it's frozen
    const file = await File.findOne({ fileName });
    if (file.status === 'closed') {
      return res.status(403).json({ message: 'File is frozen and cannot be edited' });
    }

    // Update the file's final remarks in the database
    await File.findOneAndUpdate(
      { fileName },
      { finalRemarks: elements }
    );

    res.status(200).json({ message: 'Final remarks updated successfully' });
  } catch (error) {
    console.error('Error updating final remarks:', error);
    res.status(500).json({ message: 'Error updating final remarks' });
  }
};

const checkFileFrozen = async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ message: 'File name is required.' });
    }

    // Set a timeout for the database operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), 10000);
    });

    // Race between the database operation and the timeout
    const file = await Promise.race([
      File.findOne({ fileName }).maxTimeMS(5000),
      timeoutPromise
    ]);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const isFrozen = file.status === 'closed';
    res.status(200).json({ isFrozen });
  } catch (error) {
    console.error('Error checking file frozen status:', error);
    if (error.message === 'Database operation timed out') {
      return res.status(504).json({ message: 'Operation timed out. Please try again.' });
    }
    res.status(500).json({ message: 'Error checking file status' });
  }
};

const freezeFile = async (req, res) => {
  try {
    const { fileName } = req.body;

    // Update the file status to 'closed'
    const updatedFile = await File.findOneAndUpdate(
      { fileName },
      { status: 'closed' },
      { new: true }
    );

    if (!updatedFile) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.status(200).json({ 
      message: 'File frozen successfully',
      isFrozen: true 
    });
  } catch (error) {
    console.error('Error freezing file:', error);
    res.status(500).json({ message: 'Error freezing file' });
  }
};

const getFileStatus = async (req, res) => {
  try {
    const { fileName } = req.params;
    const file = await File.findOne({ fileName });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.status(200).json({ status: file.status || 'pending' });
  } catch (error) {
    console.error('Error getting file status:', error);
    res.status(500).json({ message: 'Error getting file status' });
  }
};

//New Function to assign rejoinder department
const assignRejoinderDepartments = async (req, res) => {
  try {
    const { paraId, departments } = req.body;

    if (!paraId || !Array.isArray(departments)) {
      return res.status(400).json({ message: 'Para ID and departments array are required.' });
    }

    const documentElement = await DocumentElement.findOne({ paraId });

    if (!documentElement) {
      return res.status(404).json({ message: 'Document element not found.' });
    }

    documentElement.rejoinderDepartments = departments;
    await documentElement.save();

    res.status(200).json({ message: 'Rejoinder departments assigned successfully.', documentElement });

  } catch (error) {
    console.error('Error assigning rejoinder departments:', error);
    res.status(500).json({ message: 'Failed to assign rejoinder departments.', error: error.message });
  }
};

// Save Rejoinder Department Reply
const rejoinderDepartmentReply = async (req, res) => {
  try {
    const { paraId, department, rejoinderText } = req.body;
    if (!paraId || !department) {
      return res.status(400).json({ message: 'Para ID and department are required.' });
    }
    let documentElement = await DocumentElement.findOne({ paraId });
    if (!documentElement) {
      documentElement = new DocumentElement({
        paraId,
        type: 'paragraph',
        content: '',
        pdfFileId: null,
        order: 0,
        rejoinderDepartmentReply: new Map()
      });
    }
    // Ensure it's a Map for Mongoose
    if (!(documentElement.rejoinderDepartmentReply instanceof Map)) {
      documentElement.rejoinderDepartmentReply = new Map(Object.entries(documentElement.rejoinderDepartmentReply || {}));
    }
    documentElement.rejoinderDepartmentReply.set(department, rejoinderText || '');
    await documentElement.save();
    res.status(200).json({ message: 'Rejoinder department reply saved successfully.', documentElement });
  } catch (error) {
    console.error('Error saving rejoinder department reply:', error);
    res.status(500).json({ message: 'Failed to save rejoinder department reply.' });
  }
};

const addRejoinderColumn = async (req, res) => {
  try {
    const { fileName, index } = req.body;
    if (!fileName || index === undefined) {
      return res.status(400).json({ message: 'File name and index are required.' });
    }

    const file = await File.findOne({ fileName });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Update all document elements to ensure they have arrays long enough for the new index
    await DocumentElement.updateMany(
      { pdfFileId: file._id },
      {
        $set: {
          [`rejoinderRemarks.${index}`]: '',
          [`rejoinderFinalRemarks.${index}`]: ''
        }
      }
    );

    res.status(200).json({ message: 'Rejoinder column added successfully.' });
  } catch (error) {
    console.error('Error adding rejoinder column:', error);
    res.status(500).json({ message: 'Failed to add rejoinder column.' });
  }
};

const updateRejoinderFinalRemark = async (req, res) => {
  try {
    const { paraId, remark, index } = req.body;
    if (!paraId || index === undefined) {
      return res.status(400).json({ message: 'Para ID and index are required.' });
    }

    const documentElement = await DocumentElement.findOne({ paraId });
    if (!documentElement) {
      return res.status(404).json({ message: 'Document element not found.' });
    }

    // Initialize rejoinderFinalRemarks if it doesn't exist
    if (!documentElement.rejoinderFinalRemarks) {
      documentElement.rejoinderFinalRemarks = [];
    }

    // Ensure the array is long enough
    while (documentElement.rejoinderFinalRemarks.length <= index) {
      documentElement.rejoinderFinalRemarks.push('');
    }

    // Update the remark at the specified index
    documentElement.rejoinderFinalRemarks[index] = remark || '';

    // Save the document
    await documentElement.save();

    // Fetch the updated element to return
    const updatedElement = await DocumentElement.findOne({ paraId });

    res.status(200).json({
      message: 'Rejoinder final remark updated successfully.',
      documentElement: updatedElement
    });
  } catch (error) {
    console.error('Error updating rejoinder final remark:', error);
    res.status(500).json({ 
      message: 'Failed to update rejoinder final remark.',
      error: error.message 
    });
  }
};

module.exports = {
  uploadAndConvert,
  getFilesByType,
  getFileRemarks,
  convertFileWithoutSaving,
  uploadReport,
  updateRemarks,
  saveTable,
  getFilesByDepartment,
  updateDeptRemarks,
  cleanupFileParagraphs,
  updateFileDates,
  getDashboardData,
  getFilesByDate,
  getDocumentTypes,
  filterFilesByCriteria,
  addRejoinderRemarks,
  getFileRejoinderRemarks,
  deleteFile,
  getFileDepartments,
  downloadFile, 
  freezeFile,
  checkFileFrozen,
  getFileStatus,
  uploadFile: uploadAndConvert,
  assignRejoinderDepartments,
  rejoinderDepartmentReply,
  addRejoinderColumn,
  updateRejoinderFinalRemark
};