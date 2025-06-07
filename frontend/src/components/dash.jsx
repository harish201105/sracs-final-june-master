import React, { useState, useEffect } from 'react';
import Navbar from './navbar';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dash() {
  const navigate = useNavigate();
  const [filesData, setFilesData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDocumentTypes();
    fetchAllFiles(); // Fetch all files when component mounts
  }, []);

  const fetchAllFiles = async () => {
    try {
      const response = await axios.get('/api/files-filter');
      if (response.status === 200) {
        if (response.data.length === 0) {
          setMessage('No files found');
        } else {
          setMessage('');
        }
        // Fetch department status for each file
        const filesWithDepartments = await Promise.all(
          response.data.map(async (file) => {
            try {
              const deptResponse = await axios.get('/api/file-departments', {
                params: {
                  fileName: encodeURIComponent(file.fileName)
                }
              });

              const departments = deptResponse.data.departments || [];
              // New status logic: only 'closed' is Closed, else Pending
              let status = file.status === 'closed' ? 'Closed' : 'Pending';

              return {
                ...file,
                departments,
                status
              };
            } catch (err) {
              console.error(`Error fetching departments for ${file.fileName}:`, err);
              return {
                ...file,
                departments: [],
                status: file.status === 'closed' ? 'Closed' : 'Pending'
              };
            }
          })
        );
        setFilesData(filesWithDepartments);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setMessage('Error occurred while fetching files');
      setFilesData([]);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const response = await axios.get('/api/document-types');
      if (response.status === 200) {
        setDocumentTypes(response.data);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  };

  const handleFilterFiles = async () => {
    try {
      const response = await axios.get(`/api/files-filter`, {
        params: { startDate, endDate, documentType, status },
      });

      if (response.status === 200) {
        let filteredFiles = response.data;
        // Fetch department status for each file
        const filesWithDepartments = await Promise.all(
          filteredFiles.map(async (file) => {
            try {
              const deptResponse = await axios.get('/api/file-departments', {
                params: {
                  fileName: encodeURIComponent(file.fileName)
                }
              });

              const departments = deptResponse.data.departments || [];
              // New status logic: only 'closed' is Closed, else Pending
              let statusValue = file.status === 'closed' ? 'Closed' : 'Pending';

              return {
                ...file,
                departments,
                status: statusValue
              };
            } catch (err) {
              console.error(`Error fetching departments for ${file.fileName}:`, err);
              return {
                ...file,
                departments: [],
                status: file.status === 'closed' ? 'Closed' : 'Pending'
              };
            }
          })
        );
        // Apply status filter on the frontend
        let finalFiles = filesWithDepartments;
        if (status === 'Pending') {
          finalFiles = filesWithDepartments.filter(f => f.status !== 'Closed');
        } else if (status === 'Closed') {
          finalFiles = filesWithDepartments.filter(f => f.status === 'Closed');
        }
        if (finalFiles.length === 0) {
          setMessage('No files found for the selected filters');
        } else {
          setMessage('');
        }
        setFilesData(finalFiles);
      }
    } catch (error) {
      console.error('Error filtering files:', error);
      setMessage('Error occurred while fetching files');
      setFilesData([]);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <span className="mr-2">←</span> Back
        </button>
        <h1 className="text-3xl font-bold mb-8 text-center">Dashboard</h1>

        {/* Filters for Date Range & Document Type */}
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex flex-wrap justify-center items-end gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Date of Issue:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Date of Expiry:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Document Type:</label>
              <select
                className="border rounded-md p-2 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="">All</option>
                {documentTypes.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Status:</label>
              <select
                className="border rounded-md p-2 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <button
                onClick={handleFilterFiles}
                className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white px-6 py-2 rounded-md hover:opacity-90 transition-all duration-300"
              >
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Files Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
          {message ? (
            <div className="text-center text-gray-500">{message}</div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filesData.map((file, index) => (
                  <div key={index} className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                        #{index + 1}
                      </span>
                      <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        file.status === 'Closed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                        {file.status === 'Closed' ? '✔ Closed' : '❗ Pending'}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-3 truncate" title={file.fileName}>
                      {file.fileName}
                    </h3>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 font-medium mb-1">File Type: {file.documentType || 'Special letter'}</p>
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p>Date of Issue: {new Date(file.startDate).toLocaleDateString()}</p>
                          <p>Date of Expiry: {new Date(file.endDate).toLocaleDateString()}</p>
                          {file.updatedAt && (
                            <p>Date of Assignment: {new Date(file.updatedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dash;