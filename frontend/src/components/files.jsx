import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './navbar';

function Files() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileName = location.state?.fileName || 'No file selected';
  const elementsFromState = location.state?.elements || [];
  const documentType = location.state?.documentType || '';
  
  // Debug useEffect
  useEffect(() => {
    console.log('Current document type:', documentType);
  }, [documentType]);

  const [editableElements, setEditableElements] = useState(elementsFromState);
  const [departments, setDepartments] = useState([]);
  const [isFrozen, setIsFrozen] = useState(false);

  // Debug log for location state
  useEffect(() => {
    console.log('Location state:', location.state);
  }, [location.state]);

  // Initialize dates from state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Update end date when start date changes
  useEffect(() => {
    if (startDate) {
      const calculatedEndDate = calculateEndDate(startDate, documentType);
      if (calculatedEndDate) {
        setEndDate(calculatedEndDate);
      }
    }
  }, [startDate, documentType]);

  // Format date string to YYYY-MM-DD
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  // Set dates from state when component mounts
  useEffect(() => {
    if (location.state?.startDate) {
      console.log('Setting start date from state:', location.state.startDate);
      const formattedStartDate = formatDateForInput(location.state.startDate);
      console.log('Formatted start date:', formattedStartDate);
      setStartDate(formattedStartDate);
    }
    if (location.state?.endDate) {
      console.log('Setting end date from state:', location.state.endDate);
      const formattedEndDate = formatDateForInput(location.state.endDate);
      console.log('Formatted end date:', formattedEndDate);
      setEndDate(formattedEndDate);
    }
  }, [location.state]);

  // Calculate end date based on document type and start date
  const calculateEndDate = (start, docType) => {
    console.log('calculateEndDate called with:', { start, docType });
    
    if (!start) {
      console.log('No start date provided');
      return '';
    }
    
    // If we already have an end date from the state, use that instead of calculating
    if (location.state?.endDate && start === location.state?.startDate) {
      console.log('Using existing end date from state:', location.state.endDate);
      return location.state.endDate;
    }
    
    const startDate = new Date(start);
    let daysToAdd = 0;

    console.log('Processing document type:', docType);
    
    switch (docType) {
      case 'special-letter':
        daysToAdd = 30;
        console.log('Special letter - adding 30 days');
        break;
      case 'performance-audit':
      case 'draft-paragraph':
        daysToAdd = 42; // 6 weeks
        console.log('Performance audit/Draft paragraph - adding 42 days');
        break;
      case 'provisional-para':
        daysToAdd = 14; // 2 weeks
        console.log('Provisional para - adding 14 days');
        break;
      case 'audit-para':
        daysToAdd = 21; // 3 weeks
        console.log('Audit para - adding 21 days');
        break;
      case 'action-taken-notes':
        daysToAdd = 21; // 3 weeks
        console.log('Action Taken Notes - adding 21 days');
        break;
      default:
        console.log('Unknown document type:', docType);
        return '';
    }

    startDate.setDate(startDate.getDate() + daysToAdd);
    const endDate = startDate.toISOString().split('T')[0];
    console.log('Calculated end date:', endDate);
    return endDate;
  };

  // State for table insertion
  const [showTableForm, setShowTableForm] = useState(false);
  const [tablePosition, setTablePosition] = useState(''); // where to insert the table (1-indexed)
  const [tableRows, setTableRows] = useState(0);
  const [tableCols, setTableCols] = useState(0);
  // tableContent is a 2D array: rows x cols
  const [tableContent, setTableContent] = useState([]);

  // Check if file is frozen
  const checkFrozenStatus = async () => {
    try {
      const response = await axios.post('/api/check-file-frozen', { fileName });
      setIsFrozen(response.data.isFrozen);
    } catch (error) {
      console.error('Error checking file frozen status:', error);
    }
  };

  // Fetch remarks and departments whenever the file changes.
  useEffect(() => {
    fetchRemarks();
    checkFrozenStatus();
    axios
      .get('/api/departments')
      .then(response => {
        // Extract department names.
        setDepartments(response.data.map(d => d.departmentName));
      })
      .catch(err => console.error('Error fetching departments:', err));
  }, [fileName]);

  // Retrieve paragraphs from the backend.
  const fetchRemarks = async () => {
    try {
      const response = await axios.post('/api/getFileRemarks', { fileName });
      if (response.status === 200 && response.data.elements) {
        setEditableElements(response.data.elements);
      } else {
        console.error('Failed to fetch remarks.');
      }
    } catch (error) {
      console.error('Error fetching remarks:', error);
    }
  };

  // Handle changes in paragraph content.
  const handleContentChange = (index, newContent) => {
    const updated = [...editableElements];
    updated[index].content = newContent;
    setEditableElements(updated);
  };

  // Update department assignment for a paragraph.
  const handleDepartmentChange = (index, dept, isChecked) => {
    setEditableElements(prevElements =>
      prevElements.map((el, idx) => {
        if (idx === index) {
          let newDepartments = el.departments ? [...el.departments] : [];
          if (isChecked) {
            if (!newDepartments.includes(dept)) {
              newDepartments.push(dept);
            }
          } else {
            newDepartments = newDepartments.filter(d => d !== dept);
          }
          return { ...el, departments: newDepartments };
        }
        return el;
      })
    );
  };

  // State to track which paragraph is being split and cursor position
  const [splittingIndex, setSplittingIndex] = useState(null);
  const [splitPosition, setSplitPosition] = useState(null);

  // Handle textarea click to capture cursor position
  const handleTextareaClick = (index, event) => {
    if (splittingIndex === index) {
      const cursorPosition = event.target.selectionStart;
      setSplitPosition(cursorPosition);
    }
  };

  // Start split mode for a paragraph
  const handleStartSplit = (index) => {
    setSplittingIndex(index);
    setSplitPosition(null);
    alert("Click on the text where you want to split the paragraph, then click 'Confirm Split'");
  };

  // Cancel split mode
  const handleCancelSplit = () => {
    setSplittingIndex(null);
    setSplitPosition(null);
  };

  // Confirm split at the selected position
  const handleConfirmSplit = async (index) => {
    if (splitPosition === null) {
      alert("Please click on the text where you want to split first.");
      return;
    }

    const original = editableElements[index];
    const firstPart = original.content.substring(0, splitPosition).trim();
    const secondPart = original.content.substring(splitPosition).trim();

    if (!firstPart || !secondPart) {
      alert("Split position results in an empty part. Please choose a different position.");
      return;
    }

    // Create two new paragraph objects
    const newParas = [
      { ...original, content: firstPart, pdfFileId: original.pdfFileId },
      { ...original, content: secondPart, pdfFileId: original.pdfFileId }
    ];

    // Replace the original paragraph with the two new paragraphs.
    const updatedElements = [
      ...editableElements.slice(0, index),
      ...newParas,
      ...editableElements.slice(index + 1)
    ];

    // Recalculate sequential order and assign new consecutive paraIds and audit IDs.
    const recalculated = updatedElements.map((el, idx) => ({
      ...el,
      order: idx + 1,
      paraId: `${documentType}P${idx + 1}`,
      paraAuditId: `P${idx + 1}`,
    }));

    setEditableElements(recalculated);

    // Reset split state
    setSplittingIndex(null);
    setSplitPosition(null);

    try {
      await axios.post('/api/updateRemarks', { elements: recalculated });
      const newParaIds = recalculated.map(el => el.paraId);
      await axios.post('/api/cleanupFileParagraphs', { fileName, paraIds: newParaIds });
      fetchRemarks();
      alert("Paragraph split successfully!");
    } catch (error) {
      console.error('Error saving split paragraphs:', error);
      alert("Failed to save split paragraphs.");
    }
  };

  // State for captured date
  const [capturedDate, setCapturedDate] = useState('');

  // Handle confirm function
  const handleConfirm = async () => {
    try {
      // Capture current date and time
      const currentDate = new Date().toLocaleString();
      setCapturedDate(currentDate);
      console.log("Captured Date:", currentDate);

      if (!editableElements || editableElements.length === 0) {
        alert('No elements to update');
        return;
      }

      // Validate required fields and clean data
      const cleanedElements = editableElements.map(el => ({
        ...el,
        content: el.content?.trim() || '',
        departments: el.departments || [],
        paraId: el.paraId || '',
        paraAuditId: el.paraAuditId || '',
        pdfFileId: el.pdfFileId || ''
      }));

      const invalidElements = cleanedElements.filter(el => !el.content);
      if (invalidElements.length > 0) {
        alert('Some elements have empty content. Please fill all required fields.');
        return;
      }

      await axios.post('/api/updateRemarks', { 
        elements: cleanedElements,
        fileName: fileName,
        assignmentDate: currentDate // Add the captured date to the request
      });

      const currentParaIds = editableElements.map(el => el.paraId);
      await axios.post('/api/cleanupFileParagraphs', { 
        fileName, 
        paraIds: currentParaIds 
      });

      alert('Assignments saved successfully.');
      
      // Navigate back to remarks page after successful save
      if (location.state?.fromRemarks) {
        navigate('/remarks');
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error updating assignments:', error);
      const errorMessage = error.response?.data?.message || error.message;
      alert(`Failed to save assignments: ${errorMessage}`);
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        navigate('/', { replace: true });
      }
    }
  };

  // Handle updating file dates in the backend.
  const handleUpdateFileDates = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      console.log('Updating file dates:', { fileName, startDate, endDate });
      const response = await axios.put('/api/updateFileDates', {
        fileName,
        startDate,
        endDate
      });
      if (response.status === 200) {
        alert('File dates updated successfully!');
        // Update the location state with new dates
        navigate('', {
          state: {
            ...location.state,
            startDate,
            endDate
          },
          replace: true
        });
      }
    } catch (error) {
      console.error('Error updating file dates:', error);
      alert('Error updating file dates. Please try again.');
    }
  };

  // -------------------- TABLE INSERTION SECTION --------------------

  // Toggle table form visibility
  const toggleTableForm = () => {
    setShowTableForm(!showTableForm);
  };

  // When the user sets the number of rows/cols, initialize the tableContent 2D array.
  const initializeTableContent = (rows, cols) => {
    const content = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(''); // Empty cell
      }
      content.push(row);
    }
    setTableContent(content);
  };

  // Handle change for individual table cell
  const handleTableCellChange = (row, col, value) => {
    setTableContent(prev => {
      const newContent = prev.map(r => [...r]);
      newContent[row][col] = value;
      return newContent;
    });
  };

  // Save the table element
  const handleSaveTable = async () => {
    // Validate position
    const pos = parseInt(tablePosition);
    if (isNaN(pos) || pos < 1 || pos > editableElements.length + 1) {
      alert('Invalid table position.');
      return;
    }
    // Ensure rows and cols are positive
    if (tableRows <= 0 || tableCols <= 0) {
      alert('Rows and Columns must be greater than zero.');
      return;
    }
    // Assume fileId can be taken from the first element (all elements share same pdfFileId)
    const fileId = editableElements[0]?.pdfFileId;
    if (!fileId) {
      alert('File ID not found.');
      return;
    }
    // Generate unique paraId and paraAuditId for the table element.
    const paraId = `T_${Date.now()}`;
    const order = pos; // Use the given position
    const paraAuditId = `T${order}`;

    try {
      // Call the saveTable endpoint.
      await axios.post('/api/saveTable', {
        fileId,
        tableContent: tableContent, // will be converted to JSON string in backend if needed
        paraId,
        paraAuditId,
        order,
      });
      alert('Table saved successfully.');
      setShowTableForm(false);
      // Optionally, insert the table element in the local UI at the given position.
      await fetchRemarks();
      setShowTableForm(false);
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Failed to save table.');
    }
  };

  // -------------------- END TABLE INSERTION SECTION --------------------

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 mt-10">
        <button
          onClick={() => {
            if (location.state?.fromRemarks) {
              navigate('/remarks');
            } else {
              navigate(-1);
            }
          }}
          className="mb-4 flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <span className="mr-2">←</span> Back
        </button>

        <h1 className="text-center text-3xl font-bold my-5">File: {fileName}</h1>

        {/* File Dates UI Section */}
        <div className="my-5 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-3">Update File Dates</h2>
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block mb-1">Date of Issue:</label>
              <input
                type="date"
                value={formatDateForInput(startDate)}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  console.log('Start date changed to:', newStartDate);
                  setStartDate(newStartDate);
                  if (documentType) {
                    const calculatedEndDate = calculateEndDate(newStartDate, documentType);
                    console.log('Setting end date to:', calculatedEndDate);
                    setEndDate(calculatedEndDate);
                  } else {
                    console.warn('No document type available');
                  }
                }}
                className="p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Date of Expiry:</label>
              <input
                type="date"
                value={formatDateForInput(endDate)}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border rounded"
                readOnly
              />
            </div>
            <button
              onClick={handleUpdateFileDates}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all duration-300 self-end"
            >
              Update File Dates
            </button>
          </div>
        </div>

        {/* Table Insertion Section */}
        <div className="my-5 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-3">Insert Table</h2>
          <button 
            onClick={toggleTableForm} 
            className="p-2 bg-gradient-to-r from-purple-600 to-purple-400 text-white rounded hover:opacity-90 transition-all duration-300"
          >
            {showTableForm ? 'Hide Table Form' : 'Show Table Form'}
          </button>
          {showTableForm && (
            <div className="mt-4">
              <div className="mb-2">
                <label className="block text-sm font-medium">Insert Position (1 to {editableElements.length + 1}):</label>
                <input
                  type="number"
                  value={tablePosition}
                  onChange={(e) => setTablePosition(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium">Number of Rows:</label>
                <input
                  type="number"
                  value={tableRows}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTableRows(val);
                    if (val > 0 && tableCols > 0) {
                      initializeTableContent(val, tableCols);
                    }
                  }}
                  className="border rounded px-2 py-1"
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium">Number of Columns:</label>
                <input
                  type="number"
                  value={tableCols}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTableCols(val);
                    if (tableRows > 0 && val > 0) {
                      initializeTableContent(tableRows, val);
                    }
                  }}
                  className="border rounded px-2 py-1"
                />
              </div>
              {tableContent.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Enter Table Content:</p>
                  <table className="border-collapse">
                    <tbody>
                      {tableContent.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, colIndex) => (
                            <td key={colIndex} className="border p-1">
                              <textarea
                                value={tableContent[rowIndex][colIndex]}
                                onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                                className="border p-1"
                                rows={2}
                                cols={15}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={handleSaveTable} className="mt-4 p-2 bg-green-500 text-white rounded">
                Save Table
              </button>
            </div>
          )}
        </div>

        <h3 className="text-center text-xl">Document Content</h3>
        <table className="w-full mt-5 border">
          <thead>
            <tr>
              <th className="border px-4 py-2">Sl.no</th>
              <th className="border px-4 py-2">Para Audit_Id</th>
              <th className="border px-4 py-2">Para Id</th>
              <th className="border px-4 py-2">Para Description</th>
              <th className="border px-4 py-2">Departments</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {editableElements.map((element, index) => (
              <tr key={element.paraId || index}>
                <td className="border px-4 py-2">{index + 1}</td>
                <td className="border px-4 py-2">{element.paraAuditId || 'N/A'}</td>
                <td className="border px-4 py-2">{element.paraId || 'N/A'}</td>
                <td className="border px-4 py-2">
                  {element.type === 'paragraph' ? (
                    <textarea
                      value={element.content || ''}
                      onChange={(e) => handleContentChange(index, e.target.value)}
                      onClick={(e) => handleTextareaClick(index, e)}
                      style={{ 
                        width: '100%', 
                        height: '50px',
                        backgroundColor: splittingIndex === index ? '#fffbeb' : 'white',
                        border: splittingIndex === index ? '2px solid #f59e0b' : '1px solid #d1d5db'
                      }}
                      disabled={isFrozen}
                      placeholder={splittingIndex === index ? "Click where you want to split..." : ""}
                    />
                  ) : (
                    // For table type, display the table content (you may choose to render it more prettily)
                    <pre className="whitespace-pre-wrap">{element.content}</pre>
                  )}
                  {splittingIndex === index && splitPosition !== null && (
                    <div className="text-sm text-orange-600 mt-1">
                      Split position: {splitPosition} | Preview: "{element.content.substring(splitPosition-10, splitPosition)}|{element.content.substring(splitPosition, splitPosition+10)}"
                    </div>
                  )}
                </td>
                <td className="border px-4 py-2">
                  {departments.map((dept) => (
                    <label key={dept} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={element.departments?.includes(dept) || false}
                        onChange={(e) => handleDepartmentChange(index, dept, e.target.checked)}
                        disabled={isFrozen}
                      />
                      <span>{dept}</span>
                    </label>
                  ))}
                </td>
                <td className="border px-4 py-2">
                  {splittingIndex === index ? (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleConfirmSplit(index)}
                        className="p-1 bg-gradient-to-r from-green-500 to-green-400 text-white rounded hover:opacity-90 transition-all duration-300 text-xs"
                        disabled={splitPosition === null}
                      >
                        Confirm Split
                      </button>
                      <button
                        onClick={handleCancelSplit}
                        className="p-1 bg-gradient-to-r from-red-500 to-red-400 text-white rounded hover:opacity-90 transition-all duration-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartSplit(index)}
                      className="p-2 bg-gradient-to-r from-yellow-500 to-yellow-400 text-white rounded hover:opacity-90 transition-all duration-300"
                      disabled={isFrozen || splittingIndex !== null}
                    >
                      Split
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="my-5">
          {!isFrozen && (
            <div className="space-y-2">
              <button 
                className="p-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded hover:opacity-90 transition-all duration-300" 
                onClick={handleConfirm}
              >
                Confirm
              </button>
              {capturedDate && (
                <p className="text-sm text-gray-600">Last confirmed at: {capturedDate}</p>
              )}
            </div>
          )}
          {isFrozen && <p className="text-red-500">This file is frozen and cannot be edited.</p>}
        </div>
      </div>
    </>
  );
}

export default Files;