import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

function AuditRejoinder() {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejoinderRemarks, setRejoinderRemarks] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const fileName = location.state?.fileName;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear all session storage to remove cached data
    sessionStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    if (fileName) {
      fetchFileElements();
    }
  }, [fileName]);

  const fetchFileElements = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/getFileRejoinderRemarks', {
        fileName: fileName
      });

      setElements(response.data.elements || []);

      // Initialize rejoinder remarks state
      const initialRemarks = {};
      response.data.elements?.forEach((element, index) => {
        initialRemarks[element.paraId] = element.rejoinderRemarks?.[0] || '';
      });
      setRejoinderRemarks(initialRemarks);

      setError('');
    } catch (err) {
      console.error('Error fetching file elements:', err);
      setError('Failed to fetch file data');
    } finally {
      setLoading(false);
    }
  };

  const handleRejoinderChange = (paraId, value) => {
    setRejoinderRemarks(prev => ({
      ...prev,
      [paraId]: value
    }));
  };

  const handleSaveRejoinder = async (paraId) => {
    try {
      await axios.post('/api/addRejoinderRemarks', {
        paraId: paraId,
        rejoinderRemark: rejoinderRemarks[paraId] || '',
        index: 0
      });

      // Refresh the data
      fetchFileElements();

      alert('Rejoinder remark saved successfully');
    } catch (err) {
      console.error('Error saving rejoinder remark:', err);
      alert('Failed to save rejoinder remark');
    }
  };

  // Calculate the max number of rejoinder columns (either remarks or final remarks)
  const maxRejoinderColumns = Math.max(
    ...elements.map(el => Math.max(
      el.rejoinderRemarks?.length || 0,
      el.rejoinderFinalRemarks?.length || 0
    )),
    1
  );

  // Add Rejoinder Remark column handler
  const handleAddRejoinderColumn = () => {
    // This is a UI-only addition; backend should handle new rejoinder on save
    // Optionally, you can call an API to add a new rejoinder column if needed
    // Here, we just let the UI render the new column
    elements.forEach(el => {
      if (!el.rejoinderRemarks) el.rejoinderRemarks = [];
      if (el.rejoinderRemarks.length < maxRejoinderColumns + 1) {
        el.rejoinderRemarks.push('');
      }
      if (!el.rejoinderFinalRemarks) el.rejoinderFinalRemarks = [];
      if (el.rejoinderFinalRemarks.length < maxRejoinderColumns + 1) {
        el.rejoinderFinalRemarks.push('');
      }
    });
    setElements([...elements]);
  };

  // Close file handler (dummy, replace with actual API call if needed)
  const handleCloseFile = () => {
    // Implement your close file logic here (API call etc.)
    alert('File closed!');
  };

  // Save handler for a specific rejoinder index
  const handleSaveRejoinderAtIndex = async (paraId, index) => {
    try {
      const para = elements.find(el => el.paraId === paraId || el.paraAuditId === paraId);
      await axios.post('/api/addRejoinderRemarks', {
        paraId: paraId,
        rejoinderRemark: para.rejoinderRemarks[index] || '',
        index: index
      });
      fetchFileElements();
      alert(`Rejoinder remark ${index + 1} saved successfully`);
    } catch (err) {
      console.error('Error saving rejoinder remark:', err);
      alert('Failed to save rejoinder remark');
    }
  };

  const isRowColumnLocked = (element, columnIndex) => {
    // For the first rejoinder, always allow
    if (columnIndex === 0) return false;
    // For subsequent rejoinders, only allow if previous final remark is available
    return !(
      element.rejoinderFinalRemarks &&
      element.rejoinderFinalRemarks[columnIndex - 1] &&
      element.rejoinderFinalRemarks[columnIndex - 1].trim() !== ''
    );
  };

  const isRejoinderEditable = (element, columnIndex) => {
    // Only the last column can be editable, and only if not locked by the per-row logic
    return columnIndex === maxRejoinderColumns - 1 && !isRowColumnLocked(element, columnIndex);
  };

  const DepartmentNavbar = () => (
    <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          {/* Back to Audit Trails button */}
          <button
            onClick={() => navigate('/audit-trails')}
            className="mr-4 px-4 py-2 bg-gray-100 text-[#0A3871] rounded hover:bg-gray-200 font-semibold transition-colors shadow-sm border border-gray-200"
          >
            Back to Audit Trails
          </button>
          <img 
            src={indianRailwaysLogo} 
            alt="Southern Railways Logo" 
            className="h-12 w-12 mr-3 rounded-full shadow-md"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight">
              Audit Compilation System
            </span>
            <span className="text-sm text-gray-200">
              Southern Railways
            </span>
          </div>
        </div>
        <div className="relative">
          <div 
            className="flex items-center bg-white bg-opacity-20 rounded-full p-2 cursor-pointer hover:bg-opacity-30 transition-all duration-300" 
            onClick={() => setShowPopup(!showPopup)}
          >
            <FaUser size={20} className="text-white" />
          </div>
          {showPopup && (
            <div className="absolute top-full right-0 mt-2 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-50 w-48">
              <button 
                className="w-full flex items-center justify-center bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] text-white px-4 py-2 rounded-md hover:opacity-90 transition-all duration-300 font-medium"
                onClick={handleLogout}
              >
                <FaSignOutAlt className="mr-2" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  if (!fileName) {
    return (
      <>
        <DepartmentNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600">No file selected</p>
            <button
              onClick={() => navigate('/audit-trails')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Audit Trails
            </button>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <DepartmentNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-xl">Loading file data...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DepartmentNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Audit Rejoinder for File: {fileName}</h1>
          </div>
          <div className="flex justify-end mb-4 space-x-2">
            <button
              onClick={handleAddRejoinderColumn}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Add Rejoinder Remark
            </button>
            <button
              onClick={handleCloseFile}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Close File
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {elements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No paragraphs found for this file.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
                <div style={{ overflowX: 'auto', width: '100%', border: '2px solid red' }}>
                  <table style={{ minWidth: '2000px', border: '2px solid blue' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sl.no</th>
                        <th className="px-6 py-3">Para ID</th>
                        <th className="px-6 py-3 min-w-[200px]">Description</th>
                        <th className="px-6 py-3 min-w-[200px]">Final Remark</th>
                        {Array.from({ length: maxRejoinderColumns }).map((_, i) => [
                          <th key={`rejoinder-remark-header-${i}`} className="px-6 py-3 min-w-[200px]">Rejoinder Remark {i + 1}</th>,
                          <th key={`rejoinder-final-header-${i}`} className="px-6 py-3 min-w-[200px]">Rejoinder Final Remark {i + 1}</th>
                        ])}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {elements.map((element, index) => (
                        <tr key={element._id || index}>
                          <td className="px-6 py-4">{index + 1}</td>
                          <td className="px-6 py-4">{element.paraAuditId || element.paraId}</td>
                          <td className="px-6 py-4">
                            <div className="p-2 bg-gray-50 rounded-md mb-2 whitespace-pre-wrap">
                              {element.type === 'table'
                                ? `[Table Content - ${JSON.parse(element.content || '{}').data?.length || 0} rows]`
                                : <>
                                    {(element.content && element.content.length > 100)
                                      ? <>
                                          {element.content.substring(0, 100)}...
                                          <button
                                            className="ml-2 text-blue-600 underline text-xs"
                                            onClick={() => {
                                              setSelectedDescription(element.content);
                                              setShowDescriptionModal(true);
                                            }}
                                          >View Description</button>
                                        </>
                                      : element.content}
                                  </>
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="p-2 bg-blue-50 rounded-md whitespace-pre-wrap">
                              {element.remarks || 'No final remarks available'}
                            </div>
                          </td>
                          {Array.from({ length: maxRejoinderColumns }).map((_, i) => [
                            <td key={`rejoinder-remark-cell-${element.paraId}-${i}`} className="px-6 py-4">
                              <textarea
                                value={element.rejoinderRemarks && element.rejoinderRemarks[i] ? element.rejoinderRemarks[i] : ''}
                                onChange={e => {
                                  if (!isRejoinderEditable(element, i)) return; // Prevent changes if column is locked
                                  const newValue = e.target.value;
                                  setElements(prev => prev.map((el, idx) => {
                                    if (idx !== index) return el;
                                    const rejoinderRemarks = [...(el.rejoinderRemarks || [])];
                                    rejoinderRemarks[i] = newValue;
                                    return { ...el, rejoinderRemarks };
                                  }));
                                }}
                                className={`w-full p-3 border border-gray-300 rounded resize-none text-sm ${
                                  !isRejoinderEditable(element, i) ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                                rows="3"
                                placeholder={`Enter rejoinder remark ${i + 1}...`}
                                disabled={!isRejoinderEditable(element, i)}
                              />
                              <button
                                onClick={() => isRejoinderEditable(element, i) && handleSaveRejoinderAtIndex(element.paraId, i)}
                                className={`mt-2 px-3 py-1 text-white rounded transition-colors text-sm ${
                                  !isRejoinderEditable(element, i)
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600'
                                }`}
                                disabled={!isRejoinderEditable(element, i)}
                              >
                                {!isRejoinderEditable(element, i)
                                  ? 'Column Locked'
                                  : element.rejoinderRemarks && element.rejoinderRemarks[i] && element.rejoinderRemarks[i].trim() !== ''
                                    ? `Save Rejoinder ${i + 1}`
                                    : `Add Rejoinder ${i + 1}`}
                              </button>
                            </td>,
                            <td key={`rejoinder-final-cell-${element.paraId}-${i}`} className="px-6 py-4">
                              <div className="p-2 bg-gray-50 rounded-md">
                                {element.rejoinderFinalRemarks && element.rejoinderFinalRemarks[i]
                                  ? element.rejoinderFinalRemarks[i]
                                  : 'No rejoinder final remark available'}
                              </div>
                            </td>
                          ])}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Full Description</h2>
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-grow">
              <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                {selectedDescription}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuditRejoinder;