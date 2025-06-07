import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSignOutAlt } from 'react-icons/fa';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

function RejoinderDepartmentReply() {
  const location = useLocation();
  const navigate = useNavigate();
  const { file } = location.state || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [rejoinderText, setRejoinderText] = useState({});
  const [rejoinderRemarks, setRejoinderRemarks] = useState([]);
  const [filteredRemarks, setFilteredRemarks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingPara, setCurrentEditingPara] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentRejoinderIndex, setCurrentRejoinderIndex] = useState(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState('');

  const user = JSON.parse(localStorage.getItem('user'));
  const department = user?.department;

  useEffect(() => {
    if (!file) {
      navigate('/department');
      return;
    }
    fetchParagraphs();
    fetchRejoinderRemarks();
  }, [file, navigate]);

  useEffect(() => {
    // Filter rejoinder remarks based on the logged-in department
    if (rejoinderRemarks.length > 0 && department) {
      const filtered = rejoinderRemarks.filter(remark => 
        remark.rejoinderDepartments && 
        remark.rejoinderDepartments.includes(department)
      );
      setFilteredRemarks(filtered);
    }
  }, [rejoinderRemarks, department]);

  const fetchParagraphs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/getFileRemarks', {
        fileName: file.fileName
      });
      setParagraphs(response.data.elements || []);
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
      setError('Error fetching paragraphs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRejoinderRemarks = async () => {
    try {
      const response = await axios.post('/api/getFileRejoinderRemarks', {
        fileName: file.fileName
      });
      if (response.status === 200) {
        setRejoinderRemarks(response.data.elements || []);
      }
    } catch (error) {
      console.error('Error fetching rejoinder remarks:', error);
    }
  };

  const handleRejoinderChange = (paraId, text) => {
    setRejoinderText(prev => ({
      ...prev,
      [paraId]: text
    }));
  };

  const handleSaveRejoinder = async (paraId) => {
    try {
      await axios.post('/api/rejoinderDepartmentReply', {
        paraId,
        department,
        rejoinderText: rejoinderText[paraId]
      });
      alert('Rejoinder saved successfully!');
      fetchRejoinderRemarks(); // Refresh rejoinder remarks after saving
    } catch (error) {
      console.error('Error saving rejoinder:', error);
      alert('Error saving rejoinder. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const openReplyModal = (para, rejoinderIdx) => {
    setCurrentEditingPara(para);
    setCurrentRejoinderIndex(rejoinderIdx);
    setEditingContent(
      (para.rejoinderDepartmentReply &&
        ((para.rejoinderDepartmentReply[department + '-' + rejoinderIdx]) ||
         (para.rejoinderDepartmentReply.get && para.rejoinderDepartmentReply.get(department + '-' + rejoinderIdx)))
      ) || ''
    );
    setIsModalOpen(true);
  };

  const closeReplyModal = () => {
    setIsModalOpen(false);
    setCurrentEditingPara(null);
    setEditingContent('');
  };

  const handleModalSave = async () => {
    if (!currentEditingPara || currentRejoinderIndex === null) return;
    try {
      await axios.post('/api/rejoinderDepartmentReply', {
        paraId: currentEditingPara.paraId,
        department: department + '-' + currentRejoinderIndex,
        rejoinderText: editingContent
      });
      setRejoinderText(prev => ({ ...prev, [currentEditingPara.paraId + '-' + currentRejoinderIndex]: editingContent }));
      alert('Rejoinder saved successfully!');
      fetchRejoinderRemarks();
      closeReplyModal();
    } catch (error) {
      console.error('Error saving rejoinder:', error);
      alert('Error saving rejoinder. Please try again.');
    }
  };

  const handleViewDescription = (content) => {
    setSelectedDescription(content);
    setShowDescriptionModal(true);
  };

  // Calculate the max number of rejoinder remarks
  const maxRejoinderColumns = Math.max(
    ...filteredRemarks.map(r => r.rejoinderRemarks?.length || 0),
    1
  );

  const isReplyEditable = (remark, rejoinderIndex) => {
    // If there are no rejoinder remarks, it's not editable
    if (!remark.rejoinderRemarks?.[rejoinderIndex]) {
      return false;
    }

    // If a department reply already exists for this rejoinder index, lock it
    if (
      remark.rejoinderDepartmentReply &&
      (remark.rejoinderDepartmentReply[department + '-' + rejoinderIndex] ||
        (remark.rejoinderDepartmentReply.get && remark.rejoinderDepartmentReply.get(department + '-' + rejoinderIndex)))
    ) {
      return false;
    }

    // Otherwise, allow editing
    return true;
  };

  if (!file) {
    return null;
  }

  return (
    <div>
      <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/department')} 
              className="px-4 py-2 bg-white bg-opacity-20 rounded-md hover:bg-opacity-30 transition-all duration-300 flex items-center"
            >
              ← Back to Department Portal
            </button>
            <div className="flex items-center group transition-all duration-300">
              <img 
                src={indianRailwaysLogo}
                alt="Southern Railways Logo" 
                className="h-12 w-12 mr-3 rounded-full shadow-md transition-transform duration-300 group-hover:rotate-6"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight group-hover:text-gray-200 transition-colors duration-300">
                  Audit Compilation System
                </span>
                <span className="text-sm text-gray-200 group-hover:text-gray-300 transition-colors duration-300">
                  Southern Railways
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] rounded-full hover:opacity-90 transition-all duration-300 text-sm font-medium flex items-center"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Rejoinder Reply - {file.fileName}</h1>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : filteredRemarks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No rejoinder remarks assigned to your department.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sl.no</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Para ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    {Array.from({ length: maxRejoinderColumns }).map((_, i) => [
                      <th key={`rejoinder-remark-header-${i}`} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejoinder Remark {i + 1}</th>,
                      <th key={`rejoinder-reply-header-${i}`} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejoinder Department Reply {i + 1}</th>
                    ])}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRemarks.map((remark, index) => (
                    <tr key={remark._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{remark.paraId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <button
                          onClick={() => handleViewDescription(remark.content)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {remark.content.length > 100 ? `${remark.content.substring(0, 100)}...` : remark.content}
                        </button>
                      </td>
                      {Array.from({ length: maxRejoinderColumns }).map((_, i) => [
                        <td key={`rejoinder-remark-cell-${remark.paraId}-${i}`} className="px-6 py-4 text-sm text-gray-900">
                          {remark.rejoinderRemarks?.[i] || 'No rejoinder remark'}
                        </td>,
                        <td key={`rejoinder-reply-cell-${remark.paraId}-${i}`} className="px-6 py-4 text-sm text-gray-900">
                          {/* Display the saved reply for this department and rejoinder index, if any */}
                          {remark.rejoinderDepartmentReply &&
                            (remark.rejoinderDepartmentReply[department + '-' + i] ||
                              (remark.rejoinderDepartmentReply.get && remark.rejoinderDepartmentReply.get(department + '-' + i))) ? (
                            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                              {(remark.rejoinderDepartmentReply[department + '-' + i] ||
                                (remark.rejoinderDepartmentReply.get && remark.rejoinderDepartmentReply.get(department + '-' + i))) || ''}
                            </div>
                          ) : null}
                          <button
                            onClick={() => openReplyModal(remark, i)}
                            disabled={!remark.rejoinderRemarks?.[i] || !isReplyEditable(remark, i)}
                            className={`w-full px-4 py-2 rounded-md transition-all duration-300 ${
                              !remark.rejoinderRemarks?.[i] || !isReplyEditable(remark, i)
                                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                : 'bg-gradient-to-r from-[#0066cc] to-[#0099ff] text-white hover:opacity-90'
                            }`}
                          >
                            {!remark.rejoinderRemarks?.[i]
                              ? 'No Rejoinder Remark'
                              : !isReplyEditable(remark, i)
                                ? 'Reply Locked'
                                : remark.rejoinderDepartmentReply &&
                                  (remark.rejoinderDepartmentReply[department + '-' + i] ||
                                    (remark.rejoinderDepartmentReply.get && remark.rejoinderDepartmentReply.get(department + '-' + i)))
                                  ? 'Edit Reply'
                                  : 'Add Reply'}
                          </button>
                        </td>
                      ])}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for editing reply */}
      {isModalOpen && currentEditingPara && currentRejoinderIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Edit Remark for Para ID: {currentEditingPara.paraId} (Rejoinder {currentRejoinderIndex + 1})</h3>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full h-32 p-2 border rounded-md mb-4"
              placeholder="Enter Rejoinder Department Reply..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeReplyModal}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
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
  );
}

export default RejoinderDepartmentReply; 