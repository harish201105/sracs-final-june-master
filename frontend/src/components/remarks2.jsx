import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './navbar';
import { useNavigate, useLocation } from 'react-router-dom';

function Remarks2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedOption, setSelectedOption] = useState('');
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Restore state when returning from other pages
  useEffect(() => {
    // Check if user is authenticated and get current user
    const currentUser = localStorage.getItem('user');
    const lastUser = sessionStorage.getItem('lastUser');
    
    // If user changed or no user, clear cached state
    if (!currentUser || currentUser !== lastUser) {
      sessionStorage.removeItem('remarks2PageState');
      setSelectedOption('');
      setUploadedFiles([]);
      setMessage('');
      if (currentUser) {
        sessionStorage.setItem('lastUser', currentUser);
      }
      return;
    }
    
    // Restore state for the same user
    const savedState = sessionStorage.getItem('remarks2PageState');
    if (savedState) {
      const { selectedOption: savedOption, uploadedFiles: savedFiles } = JSON.parse(savedState);
      if (savedOption) {
        setSelectedOption(savedOption);
        setUploadedFiles(savedFiles || []);
      }
    }
  }, []);

  // Save state when navigating away
  useEffect(() => {
    const saveState = () => {
      if (selectedOption || uploadedFiles.length > 0) {
        sessionStorage.setItem('remarks2PageState', JSON.stringify({
          selectedOption,
          uploadedFiles
        }));
      }
    };

    const handleBeforeUnload = () => saveState();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveState();
    };
  }, [selectedOption, uploadedFiles]);

  // Fetch files by document type
  const fetchFilesByType = async () => {
    if (!selectedOption) {
      setMessage('Please select a document type');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`/api/files-by-type?documentType=${selectedOption}`);
      // Log the response to see what data we're getting
      console.log('Files by type response:', response.data);

      // Map over the files to ensure we have all necessary data
      const filesWithDates = response.data.map(file => ({
        ...file,
        startDate: file.startDate || '',
        endDate: file.endDate || ''
      }));

      setUploadedFiles(filesWithDates);
      setMessage('');
    } catch (error) {
      console.error('Error fetching files:', error);
      setMessage('Error fetching files. Please try again.');
      setUploadedFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Rejoinder
  const handleRejoinderButtonClick = async (file) => {
    try {
      const response = await axios.post('/api/getFileRemarks', {
        fileName: file.fileName,
      });
      if (response.status === 200) {
        // Save current state before navigating
        sessionStorage.setItem('remarks2PageState', JSON.stringify({
          selectedOption,
          uploadedFiles
        }));

        navigate('/rejoinder', {
          state: {
            fileName: file.fileName,
            elements: response.data.elements,
            documentType: file.documentType,
            fromRemarks2: true
          },
        });
      }
    } catch (error) {
      console.error('Error fetching file remarks:', error);
      setMessage('Error fetching rejoinder data. Please try again.');
    }
  };

  // Navigate to Final Remarks page
  const handleFinalRemarks = async (file) => {
    try {
      const response = await axios.post('/api/getFileRemarks', {
        fileName: file.fileName,
      });
      if (response.status === 200) {
        // Save current state before navigating
        sessionStorage.setItem('remarks2PageState', JSON.stringify({
          selectedOption,
          uploadedFiles
        }));

        navigate('/final-remarks', {
          state: {
            fileName: file.fileName,
            elements: response.data.elements,
            documentType: file.documentType,
            fromRemarks2: true
          },
        });
      }
    } catch (error) {
      console.error('Error fetching final remarks data:', error);
      setMessage('Error fetching final remarks data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <span className="mr-2">←</span> Back
        </button>
        <h1 className="text-3xl font-bold mb-8 text-center">Furnish Remarks</h1>

        {/* Document selection section - constrained width */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Document Type:
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                >
                  <option value="" disabled>Choose document type</option>
                  <option value="special-letter">Special Letter (30 days)</option>
                  <option value="performance-audit">Performance/Theme Based Audit (6 weeks)</option>
                  <option value="draft-paragraph">Draft Paragraph (6 weeks)</option>
                  <option value="provisional-para">Provisional Para (2 weeks)</option>
                  <option value="audit-para">Audit Para (3 weeks)</option>
                  <option value="action-taken-notes">Action Taken Notes (3 weeks)</option>
                </select>
              </div>

              <button
                className="w-full bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white font-bold py-3 px-6 rounded-md hover:opacity-90 transition-all duration-300 disabled:opacity-50"
                onClick={fetchFilesByType}
                disabled={!selectedOption || isLoading}
              >
                {isLoading ? 'Fetching...' : 'Fetch Files'}
              </button>
            </div>
          </div>

          {message && (
            <div className={`mt-4 text-center p-3 rounded-md ${
              message.includes('Error') 
                ? 'text-red-500 bg-red-50' 
                : 'text-green-500 bg-green-50'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Table section - full width */}
        {uploadedFiles.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-md">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-[8%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.NO
                  </th>
                  <th scope="col" className="w-[25%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FILE NAME
                  </th>
                  <th scope="col" className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DOCUMENT TYPE
                  </th>
                  <th scope="col" className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th scope="col" className="w-[27%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadedFiles.map((file, index) => (
                  <tr key={file._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate">
                      {file.fileName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate">
                      {file.documentType}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate">
                      {file.remarks || 'No remarks'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleFinalRemarks(file)}
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white text-sm font-medium rounded-md hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Final Remarks
                        </button>
                        <button
                          onClick={() => handleRejoinderButtonClick(file)}
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-medium rounded-md hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Rejoinder
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Toast */}
      {message && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="whitespace-pre-line text-sm">
            {message}
          </div>
        </div>
      )}
    </div>
  );
}

export default Remarks2; 