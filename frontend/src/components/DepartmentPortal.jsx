import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

function DepartmentPortal() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const department = user?.department;

  const fetchDepartmentFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/files-by-department?department=${department}`);
      const filesData = response.data;
      const filesArray = Array.isArray(filesData) ? filesData : [filesData];
      setFiles(filesArray.filter(file => file && file._id));
    } catch (error) {
      console.error('Error fetching department files:', error);
      setError('Error fetching files. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!department) {
      navigate('/');
      return;
    }
    fetchDepartmentFiles();
  }, [department, navigate]);

  const handleViewDetails = (file) => {
    navigate('/department-file', { state: { file } });
  };

  const handleRejoinderReply = (file) => {
    navigate('/rejoinder-department-reply', { state: { file } });
  };

  const handleDownloadPDF = (file) => {
    const downloadUrl = `/api/download/${encodeURIComponent(file.fileName)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    // Clear all session storage to remove cached data
    sessionStorage.clear();
    navigate('/');
  };

  if (!department) {
    return null;
  }

  return (
    <div>
      <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
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
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] rounded-md hover:opacity-90 transition-all duration-300 text-sm font-medium flex items-center"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Department Portal - {department}</h1>
        <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : files.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">S.NO</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">FILE NAME</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">DOCUMENT TYPE</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <tr key={file._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{file.fileName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{file.documentType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex justify-center space-x-3">
                          <button
                            onClick={() => handleViewDetails(file)}
                            className="bg-gradient-to-r from-[#0066cc] to-[#0099ff] text-white px-4 py-2 rounded-md hover:opacity-90 transition-all duration-300"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleRejoinderReply(file)}
                            className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white px-4 py-2 rounded-md hover:opacity-90 transition-all duration-300"
                          >
                            Rejoinder Reply
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(file)}
                            className="bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white px-4 py-2 rounded-md hover:opacity-90 transition-all duration-300"
                          >
                            Download PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No files assigned to your department yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DepartmentPortal;