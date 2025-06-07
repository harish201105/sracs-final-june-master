import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import axios from '../axiosConfig';

function Rejoinder() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileName = location.state?.fileName || 'No file selected';
  const elementsFromState = location.state?.elements || [];
  const documentType = location.state?.documentType || '';

  const [elements, setElements] = useState(elementsFromState);
  const [isFrozen, setIsFrozen] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingElement, setCurrentEditingElement] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentRejoinderIndex, setCurrentRejoinderIndex] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [rejoinderDepartments, setRejoinderDepartments] = useState({});
  const [filteredRemarks, setFilteredRemarks] = useState([]);
  const [department, setDepartment] = useState(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');

  // Check if file is frozen
  const checkFrozenStatus = async () => {
    try {
      const response = await axios.post('/api/check-file-frozen', { fileName });
      setIsFrozen(response.data.isFrozen);
    } catch (error) {
      console.error('Error checking file frozen status:', error);
    }
  };

  // Fetch departments and rejoinder remarks whenever the file changes
  useEffect(() => {
    fetchRejoinderRemarks();
    checkFrozenStatus();
    axios
      .get('/api/departments')
      .then(response => {
        setDepartments(response.data.map(d => d.departmentName));
      })
      .catch(err => console.error('Error fetching departments:', err));
  }, [fileName]);

  // Retrieve rejoinder remarks from the backend
  const fetchRejoinderRemarks = async () => {
    try {
      const response = await axios.post('/api/getFileRejoinderRemarks', { fileName });
      if (response.status === 200 && response.data.elements) {
        setElements(response.data.elements);
        
        // Preserve existing rejoinderDepartments state and merge with backend data
        setRejoinderDepartments(prevDepts => {
          const updatedDepts = { ...prevDepts };
          
          response.data.elements.forEach(element => {
            // For each rejoinder remark, set the departments if they exist
            if (element.rejoinderRemarks && element.rejoinderRemarks.length > 0) {
              element.rejoinderRemarks.forEach((_, index) => {
                const key = `${element.paraId}-${index}`;
                // Only update if we don't already have this in our state (to preserve unsaved changes)
                if (!updatedDepts[key] && element.rejoinderDepartments && element.rejoinderDepartments.length > 0) {
                  updatedDepts[key] = element.rejoinderDepartments;
                }
              });
            }
          });
          
          return updatedDepts;
        });
        
        setFilteredRemarks(response.data.elements);
      } else {
        console.error('Failed to fetch rejoinder remarks.');
      }
    } catch (error) {
      console.error('Error fetching rejoinder remarks:', error);
    }
  };

  useEffect(() => {
    if (elements.length > 0 && department) {
      const filtered = elements.filter(element => 
        element.rejoinderDepartments && 
        element.rejoinderDepartments.includes(department)
      );
      setFilteredRemarks(filtered);
    }
  }, [elements, department]);

  const openModal = (element, rejoinderIndex) => {
    setCurrentEditingElement(element);
    setCurrentRejoinderIndex(rejoinderIndex);
    const value = element.rejoinderRemarks?.[rejoinderIndex] || '';
    setEditingContent(value);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentEditingElement(null);
    setCurrentRejoinderIndex(null);
    setEditingContent('');
  };

  const handleModalSave = async () => {
    try {
      await axios.post('/api/addRejoinderRemarks', {
        paraId: currentEditingElement.paraId,
        rejoinderRemark: editingContent.trim(),
        index: currentRejoinderIndex
      });
      setMessage(`Rejoinder remark for ${currentEditingElement.paraId} saved successfully.`);
      setTimeout(() => setMessage(''), 3000);
      fetchRejoinderRemarks();
      closeModal();
    } catch (error) {
      console.error('Error saving rejoinder remark:', error);
      setMessage('Failed to save rejoinder remark. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Calculate the max number of rejoinder columns
  const maxRejoinderColumns = Math.max(
    ...elements.map(el => el.rejoinderRemarks?.length || 0),
    1
  );

  // Save departments for a specific rejoinder index
  const handleSaveRejoinderDepartments = async (paraId, index) => {
    try {
      const selectedDepartments = rejoinderDepartments[`${paraId}-${index}`] || [];
      const response = await axios.post('/api/assignRejoinderDepartments', {
        paraId: paraId,
        departments: selectedDepartments,
        index: index
      });
      
      // Update local state to maintain checkbox selections
      setRejoinderDepartments(prevDepts => ({
        ...prevDepts,
        [`${paraId}-${index}`]: selectedDepartments
      }));
      
      setMessage(`Departments assigned successfully for ${paraId} (Rejoinder ${index + 1})`);
      setTimeout(() => setMessage(''), 3000);
      fetchRejoinderRemarks();
    } catch (error) {
      console.error('Error assigning rejoinder departments:', error);
      setMessage(`Failed to assign departments: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Update rejoinder department assignment for a paragraph and rejoinder index
  const handleRejoinderDepartmentChange = (paraId, dept, isChecked, index) => {
    setRejoinderDepartments(prevDepts => {
      const key = `${paraId}-${index}`;
      const currentDepts = prevDepts[key] || [];
      let newDepts;
      if (isChecked) {
        if (!currentDepts.includes(dept)) {
          newDepts = [...currentDepts, dept];
        } else {
          newDepts = currentDepts;
        }
      } else {
        newDepts = currentDepts.filter(d => d !== dept);
      }
      return {
        ...prevDepts,
        [key]: newDepts
      };
    });
  };

  // Add this function above the return statement
  const isDepartmentEditable = (rejoinderIdx) => {
    return rejoinderIdx === maxRejoinderColumns - 1;
  };

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

        <h1 className="text-3xl font-bold text-center my-5">
          Rejoinder for File: {fileName}
        </h1>

        {/* Guidelines Card */}
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500 mb-6">
          <h3 className="text-lg font-semibold text-orange-700 mb-2">Rejoinder Guidelines</h3>
          <ul className="list-disc ml-5 mt-2 text-gray-600">
            <li>Address any unresolved issues from final remarks</li>
            <li>Provide additional context if needed</li>
            <li>Note that previous rejoinders cannot be edited once saved</li>
            <li>Be clear and specific in your responses</li>
            <li>Maintain professional language and tone</li>
          </ul>
        </div>

        {/* Message Toast */}
        {message && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
            <div className="whitespace-pre-line text-sm">
              {message}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sl.no</th>
                <th className="px-6 py-3">Para ID</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Final Remark</th>
                <th className="px-6 py-3">Previously Assigned Departments</th>
                {Array.from({ length: maxRejoinderColumns }).map((_, i) => [
                  <th key={`rejoinder-remark-header-${i}`} className="px-6 py-3">Rejoinder Remark {i + 1}</th>,
                  <th key={`rejoinder-dept-header-${i}`} className="px-6 py-3">Rejoinder {i + 1} Department</th>
                ])}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRemarks.length > 0 ? (
                filteredRemarks.map((element, index) => (
                  <tr key={element.paraId}>
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4">{element.paraId}</td>
                    <td className="px-6 py-4">
                      <div className="whitespace-pre-wrap">
                        {element.content && element.content.length > 100 ? (
                          <>
                            {element.content.substring(0, 100)}...
                            <button
                              className="ml-2 text-blue-600 underline text-xs"
                              onClick={() => {
                                setSelectedDescription(element.content);
                                setShowDescriptionModal(true);
                              }}
                            >View Description</button>
                          </>
                        ) : (
                          element.content
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="p-2 bg-gray-50 rounded-md">
                        {element.remarks || 'No final remark'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {element.departments && element.departments.length > 0 ? (
                          element.departments.map((dept, deptIndex) => (
                            <div key={deptIndex} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">
                              {dept}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500 italic text-sm">No departments assigned</span>
                        )}
                      </div>
                    </td>
                    {Array.from({ length: maxRejoinderColumns }).map((_, rejoinderIdx) => [
                      <td key={`rejoinder-remark-cell-${element.paraId}-${rejoinderIdx}`} className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="p-2 bg-gray-50 rounded-md">
                            {element.rejoinderRemarks?.[rejoinderIdx] || 'No rejoinder'}
                          </div>
                          {!isFrozen && (
                            <button
                              onClick={() => openModal(element, rejoinderIdx)}
                              className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white py-2 px-4 rounded-md hover:opacity-90"
                            >
                              {element.rejoinderRemarks?.[rejoinderIdx] ? 'Edit Rejoinder' : 'Add Rejoinder'}
                            </button>
                          )}
                        </div>
                      </td>,
                      <td key={`rejoinder-dept-cell-${element.paraId}-${rejoinderIdx}`} className="px-6 py-4">
                        {element.rejoinderRemarks?.[rejoinderIdx] ? (
                          <div className="space-y-2">
                            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                              {departments.map((dept) => (
                                <label key={`${element.paraId}-${rejoinderIdx}-${dept}`} className="flex items-center space-x-2 text-sm p-1 mb-1 cursor-pointer hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={rejoinderDepartments[`${element.paraId}-${rejoinderIdx}`]?.includes(dept) || false}
                                    onChange={(e) => handleRejoinderDepartmentChange(element.paraId, dept, e.target.checked, rejoinderIdx)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                    disabled={!isDepartmentEditable(rejoinderIdx)}
                                  />
                                  <span>{dept}</span>
                                </label>
                              ))}
                            </div>
                            <button
                              onClick={() => handleSaveRejoinderDepartments(element.paraId, rejoinderIdx)}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-400 text-white py-2 px-4 rounded-md hover:opacity-90"
                              disabled={!isDepartmentEditable(rejoinderIdx)}
                            >
                              Save Departments
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-sm">Add rejoinder first</span>
                        )}
                      </td>
                    ])}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5 + (maxRejoinderColumns * 2)} className="px-6 py-4 text-center text-gray-500">
                    No rejoinder remarks assigned to your department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal for editing rejoinder remarks */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Edit Rejoinder Remark</h3>
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full h-32 p-2 border rounded-md mb-4"
                placeholder="Enter your rejoinder remark..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </>
  );
}

export default Rejoinder;