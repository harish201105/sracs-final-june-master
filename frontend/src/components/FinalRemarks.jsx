import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './navbar';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import { useNavigate } from 'react-router-dom';

function FinalRemarks() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileName = location.state?.fileName || 'No file selected';
  const initialElements = location.state?.elements || [];

  const [elements, setElements] = useState(initialElements);
  const isRejoinderMode = location.state?.isRejoinderMode || false;
  const [isFinalRemarksEditable, setIsFinalRemarksEditable] = useState(!isRejoinderMode);
  const [maxRejoinderColumns, setMaxRejoinderColumns] = useState(0);
  const [editingRejoinderCells, setEditingRejoinderCells] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingElement, setCurrentEditingElement] = useState(null);
  const [currentEditingType, setCurrentEditingType] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentRejoinderIndex, setCurrentRejoinderIndex] = useState(null);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [message, setMessage] = useState('');
  const [canFreeze, setCanFreeze] = useState(false);
  const [freezeWarning, setFreezeWarning] = useState('');
  const [rejoinderFinalRemarks, setRejoinderFinalRemarks] = useState([]);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');

  useEffect(() => {
    fetchRejoinderRemarks();
    const checkFrozenStatus = async () => {
      try {
        const response = await axios.post('/api/check-file-frozen', { fileName });
        setIsFrozen(response.data.isFrozen);
        if (response.data.isFrozen) {
          setIsFinalRemarksEditable(false);
        }
      } catch (error) {
        console.error('Error checking frozen status:', error);
      }
    };
    checkFrozenStatus();
  }, []);

  // Check if freeze is allowed whenever elements change
  useEffect(() => {
    validateFreezeConditions();
  }, [elements]);

  const validateFreezeConditions = () => {
    if (!elements || elements.length === 0) {
      setCanFreeze(false);
      setFreezeWarning('No elements found to validate.');
      return;
    }

    const issues = [];
    
    // Check if all elements have final remarks
    const elementsWithoutRemarks = elements.filter(el => !el.remarks || el.remarks.trim() === '');
    if (elementsWithoutRemarks.length > 0) {
      issues.push(`${elementsWithoutRemarks.length} paragraph(s) missing final remarks: ${elementsWithoutRemarks.map(el => el.paraId).join(', ')}`);
    }

    // Check if all assigned departments have provided remarks
    const elementsWithMissingDeptRemarks = [];
    elements.forEach(el => {
      if (el.departments && el.departments.length > 0) {
        const missingDepts = el.departments.filter(dept => {
          return !el.deptRemarks || !el.deptRemarks.some(remark => remark.department === dept && remark.remark && remark.remark.trim() !== '');
        });
        if (missingDepts.length > 0) {
          elementsWithMissingDeptRemarks.push(`${el.paraId}: ${missingDepts.join(', ')}`);
        }
      }
    });

    if (elementsWithMissingDeptRemarks.length > 0) {
      issues.push(`Missing department remarks for: ${elementsWithMissingDeptRemarks.join('; ')}`);
    }

    if (issues.length === 0) {
      setCanFreeze(true);
      setFreezeWarning('');
    } else {
      setCanFreeze(false);
      setFreezeWarning(issues.join('\n\n'));
    }
  };

  const fetchRejoinderRemarks = async () => {
    try {
      const response = await axios.post('/api/getFileRejoinderRemarks', { fileName });
      if (response.status === 200) {
        const updatedElements = response.data.elements || [];
        setElements(updatedElements);
        const maxCols = Math.max(...updatedElements.map(el => el.rejoinderRemarks?.length || 0));
        setMaxRejoinderColumns(maxCols);
      }
    } catch (error) {
      console.error('Error fetching rejoinder remarks:', error);
    }
  };

  const handleSaveFinalRemark = async (paraId, finalRemark) => {
    if (!isFinalRemarksEditable) return;
    try {
      const elementToUpdate = elements.find(el => el.paraId === paraId);
      if (!elementToUpdate) return alert('Element not found.');
      const updatedElement = { ...elementToUpdate, remarks: finalRemark };
      await axios.post('/api/updateRemarks', { elements: [updatedElement] });
      alert(`Final remark for ${paraId} saved successfully.`);
      fetchRejoinderRemarks();
    } catch (error) {
      console.error('Error saving final remark:', error);
      alert('Failed to save final remark.');
    }
  };

  const handleSave = async () => {
    try {
      await axios.post('/api/updateFinalRemarks', {
        fileName,
        elements,
      });
      setMessage('Final remarks saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving final remarks:', error);
      setMessage('Error saving final remarks. Please try again.');
    }
  };

  const handleFreeze = async () => {
    if (!canFreeze) {
      setMessage('Cannot freeze file. Please resolve all issues first.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      await axios.post('/api/freeze-file', {
        fileName,
      });
      setIsFrozen(true);
      setIsFinalRemarksEditable(false);
      setShowFreezeModal(false);
      setMessage('File has been frozen successfully. No further edits are allowed.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error freezing file:', error);
      setMessage('Error freezing file. Please try again.');
    }
  };

  const handleFreezeClick = () => {
    if (!canFreeze) {
      setMessage(`Cannot freeze file:\n\n${freezeWarning}`);
      setTimeout(() => setMessage(''), 8000);
      return;
    }
    setShowFreezeModal(true);
  };

  const openModal = (element, type, rejoinderIndex = null) => {
    setCurrentEditingElement(element);
    setCurrentEditingType(type);
    setCurrentRejoinderIndex(rejoinderIndex);
    if (type === 'final') {
      setEditingContent(element.remarks || '');
    } else if (type === 'rejoinder') {
      const value = element.rejoinderRemarks?.[rejoinderIndex] || '';
      setEditingContent(value);
    } else if (type === 'rejoinderFinal') {
      const value = rejoinderFinalRemarks[rejoinderIndex] || '';
      setEditingContent(value);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentEditingElement(null);
    setCurrentEditingType(null);
    setCurrentRejoinderIndex(null);
    setEditingContent('');
  };

  const handleModalSave = async () => {
    try {
      if (currentEditingType === 'final') {
        await handleSaveFinalRemark(currentEditingElement.paraId, editingContent);
      } else if (currentEditingType === 'rejoinder') {
        await axios.post('/api/addRejoinderRemarks', {
          paraId: currentEditingElement.paraId,
          rejoinderRemark: editingContent.trim(),
          index: currentRejoinderIndex
        });
        alert(`Rejoinder remark for ${currentEditingElement.paraId} saved successfully.`);
        setEditingRejoinderCells(prev => ({
          ...prev,
          [`${currentEditingElement.paraId}-${currentRejoinderIndex}`]: false
        }));
        fetchRejoinderRemarks();
      } else if (currentEditingType === 'rejoinderFinal') {
        await handleSaveRejoinderFinalRemark(currentEditingElement.paraId, editingContent, currentRejoinderIndex);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving remark:', error);
      alert('Failed to save remark. Please try again.');
    }
  };

  const handleAddRejoinder = async () => {
    try {
      const newIndex = maxRejoinderColumns;
      await axios.post('/api/addRejoinderColumn', { fileName, index: newIndex });
      setMaxRejoinderColumns(newIndex + 1);
      fetchRejoinderRemarks();
      setMessage('New rejoinder column added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding rejoinder column:', error);
      setMessage('Error adding rejoinder column. Please try again.');
    }
  };

  const handleSaveRejoinderFinalRemark = async (paraId, remark, index) => {
    try {
      await axios.post('/api/updateRejoinderFinalRemark', {
        paraId,
        remark,
        index
      });
      fetchRejoinderRemarks();
      setMessage('Rejoinder final remark saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving rejoinder final remark:', error);
      setMessage('Error saving rejoinder final remark. Please try again.');
    }
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Final Remarks Report for File: ${fileName}`, 10, 10);

    const tableHeader = [
      "Sl.no", "Para ID", "Description", "Department Remarks", "Final Remark",
      ...Array.from({ length: maxRejoinderColumns }, (_, i) => `Rejoinder ${i + 1}`)
    ];

    const tableRows = elements.map((el, idx) => {
      const deptRemarksStr = el.departments?.map(dept => {
        const found = el.deptRemarks?.find(d => d.department === dept);
        return `${dept}: ${found?.remark || "No remarks"}`;
      }).join('\n') || "No department assigned";

      const rowBase = [
        idx + 1,
        el.paraId,
        el.content || "No content",
        deptRemarksStr,
        el.remarks || "No final remark"
      ];

      const rowRejoinders = Array.from({ length: maxRejoinderColumns }, (_, i) =>
        (el.rejoinderRemarks && el.rejoinderRemarks[i]) ? el.rejoinderRemarks[i] : "No Rejoinder"
      );

      return [...rowBase, ...rowRejoinders];
    });

    doc.autoTable({
      head: [tableHeader],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 10 }
    });

    doc.save(`${fileName}-final-remarks.pdf`);
  };

  const handleViewDescription = (content) => {
    setSelectedDescription(content);
    setShowDescriptionModal(true);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return 'No content';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
          Final Remarks for File: {fileName}
        </h1>

        {/* Guidelines Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Final Remarks Card */}
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Final Remarks Guidelines</h3>
            <div className="text-gray-600">
              <div>Please provide comprehensive final remarks after reviewing all department responses.</div>
              <ul className="list-disc ml-5 mt-2">
                <li>Address all points raised by departments</li>
                <li>Be clear and specific in your conclusions</li>
                <li>Maintain professional language and tone</li>
              </ul>
            </div>
          </div>

          {/* Rejoinder Card */}
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
            <h3 className="text-lg font-semibold text-orange-700 mb-2">Rejoinder Guidelines</h3>
            <div className="text-gray-600">
              <ul className="list-disc ml-5 mt-2">
                <li>Address any unresolved issues from final remarks</li>
                <li>Provide additional context if needed</li>
                <li>Note that previous rejoinders cannot be edited once saved</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{isRejoinderMode ? 'Rejoinder Remarks' : 'Final Remarks'} for {fileName}</h1>
        </div>

        {/* Validation Status */}
        {!isFrozen && (
          <div className={`mb-4 p-4 rounded-lg border-l-4 ${
            canFreeze 
              ? 'bg-green-50 border-green-400' 
              : 'bg-yellow-50 border-yellow-400'
          }`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                canFreeze ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <div>
                <h3 className={`font-semibold ${
                  canFreeze ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {canFreeze ? 'Ready to Freeze' : 'Freeze Requirements Not Met'}
                </h3>
                {!canFreeze && (
                  <div className="text-sm text-yellow-700 mt-1 whitespace-pre-line">
                    {freezeWarning}
                  </div>
                )}
                {canFreeze && (
                  <p className="text-sm text-green-700 mt-1">
                    All final remarks and department remarks are complete. File can be frozen.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex justify-between items-center"
        >
          <div className="space-x-4">
            <div className="space-x-4">
              <button
                onClick={generatePDFReport}
                className="bg-gradient-to-r from-green-600 to-green-400 text-white py-2 px-4 rounded hover:opacity-90"
              >
                Generate PDF
              </button>
              {!isFrozen && (
                <button
                  onClick={handleFreezeClick}
                  className={`py-2 px-4 rounded transition-all duration-300 ${
                    canFreeze
                      ? 'bg-gradient-to-r from-red-600 to-red-400 text-white hover:opacity-90 cursor-pointer'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                  }`}
                  title={canFreeze ? 'Freeze file' : 'Complete all final remarks and department remarks to enable freeze'}
                >
                  Freeze {!canFreeze && '(Disabled)'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">Sl.no</th>
                  <th className="px-6 py-3 sticky left-[72px] bg-gray-50">Para ID</th>
                  <th className="px-6 py-3 min-w-[200px]">Description</th>
                  <th className="px-6 py-3 min-w-[200px]">Department Remarks</th>
                  <th className="px-6 py-3 min-w-[200px]">Final Remark</th>
                  {isFrozen && (
                    <>
                      {Array.from({ length: maxRejoinderColumns }, (_, i) => (
                        <React.Fragment key={i}>
                          <th className="px-6 py-3 min-w-[200px]">Rejoinder {i + 1}</th>
                          <th className="px-6 py-3 min-w-[200px]">Rejoinder Department Reply</th>
                          <th className="px-6 py-3 min-w-[200px]">Rejoinder Final Remark {i + 1}</th>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {elements.map((el, index) => (
                  <tr key={el.paraId}>
                    <td className="px-6 py-4 sticky left-0 bg-white">{index + 1}</td>
                    <td className="px-6 py-4 sticky left-[72px] bg-white">{el.paraId}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px]">
                        <div className="p-2 bg-gray-50 rounded-md mb-2">
                          {truncateText(el.content)}
                        </div>
                        <button
                          onClick={() => handleViewDescription(el.content)}
                          className="w-full bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white py-2 px-4 rounded-md hover:opacity-90"
                        >
                          View Description
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {el.departments?.map(dept => {
                        const found = el.deptRemarks?.find(d => d.department === dept);
                        return (
                          <div key={dept} className="mb-2 last:mb-0">
                            <strong className="text-blue-600">{dept}:</strong>
                            <span className="ml-2 text-gray-600">{found?.remark || 'No remarks'}</span>
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="p-2 bg-gray-50 rounded-md">{el.remarks || 'No final remark'}</div>
                        {isFinalRemarksEditable && !isFrozen && (
                          <button
                            onClick={() => openModal(el, 'final')}
                            className="w-full bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white py-2 px-4 rounded-md hover:opacity-90"
                          >
                            {el.remarks ? 'Edit Final Remark' : 'Add Final Remark'}
                          </button>
                        )}
                        {isFrozen && (
                          <button disabled className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md cursor-not-allowed">
                            Edit Locked (File Frozen)
                          </button>
                        )}
                      </div>
                    </td>
                    {isFrozen && (
                      <>
                        {Array.from({ length: maxRejoinderColumns }, (_, i) => (
                          <React.Fragment key={i}>
                            <td className="px-6 py-4">
                              <div className="p-2 bg-gray-50 rounded-md">
                                {el.rejoinderRemarks && el.rejoinderRemarks[i] ? el.rejoinderRemarks[i] : 'No rejoinder'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="p-2 bg-gray-50 rounded-md">
                                {el.rejoinderDepartmentReply && Object.keys(el.rejoinderDepartmentReply).length > 0 ? (
                                  <div className="space-y-2">
                                    {/* Only show replies for the current rejoinder index (i) */}
                                    {(() => {
                                      const repliesForCurrentIndex = Object.entries(el.rejoinderDepartmentReply)
                                        .filter(([deptKey]) => deptKey.endsWith(`-${i}`))
                                        .map(([deptKey, reply]) => {
                                          const dept = deptKey.split('-')[0];
                                          return { dept, reply };
                                        });

                                      if (repliesForCurrentIndex.length === 0) {
                                        return <div className="text-gray-500 italic text-sm">No department replies</div>;
                                      }

                                      return (
                                        <ul className="list-disc ml-4 space-y-1">
                                          {repliesForCurrentIndex.map(({ dept, reply }) => (
                                            <li key={dept} className="text-sm">
                                              <span className="font-medium text-blue-700">{dept}:</span>{' '}
                                              <span className="text-gray-600">{reply}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-gray-500 italic text-sm">No department replies</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="p-2 bg-gray-50 rounded-md">
                                  {el.rejoinderRemarks && el.rejoinderRemarks[i] ? (
                                    el.rejoinderFinalRemarks && el.rejoinderFinalRemarks[i] 
                                      ? el.rejoinderFinalRemarks[i] 
                                      : 'No rejoinder final remarks'
                                  ) : (
                                    <span className="text-gray-500 italic">No rejoinder remark available</span>
                                  )}
                                </div>
                                {el.rejoinderRemarks && el.rejoinderRemarks[i] && (
                                  <button
                                    onClick={() => openModal(el, 'rejoinderFinal', i)}
                                    disabled={maxRejoinderColumns > i + 1}
                                    className={`w-full py-2 px-4 rounded-md ${
                                      maxRejoinderColumns > i + 1
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white hover:opacity-90'
                                    }`}
                                    title={maxRejoinderColumns > i + 1 
                                      ? 'Cannot edit previous rejoinder final remarks when a new rejoinder is added' 
                                      : el.rejoinderFinalRemarks && el.rejoinderFinalRemarks[i] 
                                        ? 'Edit Rejoinder Final Remark' 
                                        : 'Add Rejoinder Final Remark'
                                    }
                                  >
                                    {maxRejoinderColumns > i + 1
                                      ? 'Edit Disabled (New Rejoinder Added)'
                                      : el.rejoinderFinalRemarks && el.rejoinderFinalRemarks[i]
                                        ? 'Edit Rejoinder Final Remark'
                                        : 'Add Rejoinder Final Remark'
                                    }
                                  </button>
                                )}
                              </div>
                            </td>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && currentEditingElement && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {currentEditingType === 'final' ? 'Edit Final Remark' :
               currentEditingType === 'rejoinder' ? 'Edit Rejoinder Remark' :
               'Edit Rejoinder Final Remark'} for Para ID: {currentEditingElement.paraId}
            </h2>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full p-2 border rounded resize-y mb-4"
              style={{ minHeight: '150px' }}
              placeholder={
                currentEditingType === 'final' ? `Enter your final remark for ${currentEditingElement.paraId}...` :
                currentEditingType === 'rejoinder' ? `Enter rejoinder ${currentRejoinderIndex + 1} for ${currentEditingElement.paraId}...` :
                `Enter rejoinder final remark ${currentRejoinderIndex + 1} for ${currentEditingElement.paraId}...`
              }
            />
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Confirmation Modal */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-lg">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Freeze Action</h2>
            <div className="mb-4 text-gray-700">
              <div>Are you sure you want to freeze this file? Once frozen:</div>
              <ul className="list-disc ml-5 mt-2">
                <li>No further edits to final remarks will be allowed</li>
                <li>This action cannot be undone</li>
                <li>Only rejoinder remarks can be added after freezing</li>
              </ul>
            </div>
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={() => setShowFreezeModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleFreeze}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="whitespace-pre-line text-sm">
            {message}
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
    </>
  );
}

export default FinalRemarks;