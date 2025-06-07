import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

// Define file types for each role with both database and display values
const FILE_TYPES = {
  'special-letter': {
    display: 'Special Letters',
    role: 'audit-sr'
  },
  'performance-audit': {
    display: 'Performance Based Audit',
    role: 'audit-sr'
  },
  'theme-audit': {
    display: 'Theme Based Audit',
    role: 'audit-sr'
  },
  'draft-paragraph': {
    display: 'Draft Paragraph',
    role: 'audit-sr'
  },
  'provisional-para': {
    display: 'Provisional Para',
    role: 'audit-rb'
  },
  'audit-para': {
    display: 'Audit Para',
    role: 'audit-rb'
  },
  'action-taken-notes': {
    display: 'Action Taken Notes',
    role: 'audit-rb'
  }
};

// Create arrays for each role based on FILE_TYPES
const AUDIT_SR_FILE_TYPES = Object.entries(FILE_TYPES)
  .filter(([_, value]) => value.role === 'audit-sr')
  .map(([key]) => key);

const AUDIT_RB_FILE_TYPES = Object.entries(FILE_TYPES)
  .filter(([_, value]) => value.role === 'audit-rb')
  .map(([key]) => key);

// Helper function to get display name
const getDocumentTypeDisplay = (type) => {
  return FILE_TYPES[type]?.display || type;
};

function AuditTrails() {
  const [closedFiles, setClosedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Get user role from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('User data from localStorage:', JSON.stringify(userData, null, 2));
        setUserRole(userData.role);
      } catch (err) {
        console.error('Error parsing user data:', err);
        setError('Error loading user data');
      }
    } else {
      console.error('No user data found in localStorage');
      setError('No user data found');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    // Clear all session storage to remove cached data
    sessionStorage.clear();
    navigate('/');
  };

  const fetchClosedFiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching files for role:', userRole);
      
      const response = await axios.get('/api/dashboard');
      console.log('API Response data:', JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data)) {
        console.error('API response is not an array:', response.data);
        setError('Invalid data format received');
        return;
      }

      // Filter files based on status and user role
      const closed = response.data.filter(file => {
        // Log each file being processed
        console.log('Processing file:', JSON.stringify({
          fileName: file.fileName,
          documentType: file.documentType,
          status: file.status,
          startDate: file.startDate,
          endDate: file.endDate
        }, null, 2));

        // Check if required fields exist
        if (!file.documentType || !file.status) {
          console.log('File missing required fields:', JSON.stringify(file, null, 2));
          return false;
        }

        // Convert strings to lowercase for comparison
        const docType = file.documentType.toLowerCase();
        const status = file.status.toLowerCase();

        console.log('Document type check:', {
          fileDocType: docType,
          userRole,
          validTypesForRole: userRole === 'audit-sr' ? AUDIT_SR_FILE_TYPES : AUDIT_RB_FILE_TYPES,
          isValidType: (userRole === 'audit-sr' ? AUDIT_SR_FILE_TYPES : AUDIT_RB_FILE_TYPES).includes(docType),
          status,
          isClosedStatus: status === 'closed'
        });

        // Check if file is closed
        if (status !== 'closed') {
          console.log('File not closed:', file.fileName);
          return false;
        }

        // Check document type based on role
        const validTypes = userRole === 'audit-sr' ? AUDIT_SR_FILE_TYPES : AUDIT_RB_FILE_TYPES;
        const isValidType = validTypes.includes(docType);

        console.log('File type validation:', {
          fileName: file.fileName,
          documentType: docType,
          userRole,
          isValidType,
          validTypes
        });

        return isValidType;
      });

      console.log('Filtered files:', JSON.stringify(closed, null, 2));
      setClosedFiles(closed);
      
      if (closed.length === 0) {
        console.log('Available document types for current role:', {
          role: userRole,
          types: userRole === 'audit-sr' ? AUDIT_SR_FILE_TYPES : AUDIT_RB_FILE_TYPES
        });
      }

      setError('');
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to fetch files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch files when user role changes
  useEffect(() => {
    if (userRole) {
      console.log('Fetching files for role:', userRole);
      fetchClosedFiles();
    } else {
      console.log('No user role set yet');
    }
  }, [userRole]);

  const handleViewPDF = (fileName) => {
    // Create a link to download the PDF
    const link = document.createElement('a');
    link.href = `/api/download/${fileName}`;
    link.target = '_blank';
    link.click();
  };

  const handleRejoinder = (fileName) => {
    navigate('/audit-rejoinder', { state: { fileName } });
  };

  if (loading) {
    return (
      <>
        <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center">
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
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-xl">Loading closed files...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
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
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {userRole === 'audit-sr' ? 'Southern Railways' : 'Railway Board'} - Audit Trails
            </h1>
            <div className="text-sm text-gray-600">
              Available document types: {
                (userRole === 'audit-sr' ? AUDIT_SR_FILE_TYPES : AUDIT_RB_FILE_TYPES)
                  .map(getDocumentTypeDisplay)
                  .join(', ')
              }
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {closedFiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No closed files found for your role.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Type
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closedFiles.map((file, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.fileName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getDocumentTypeDisplay(file.documentType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.startDate ? new Date(file.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.endDate ? new Date(file.endDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {file.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewPDF(file.fileName)}
                          className="bg-gradient-to-r from-[#0066cc] to-[#0099ff] text-white px-3 py-1 rounded-md hover:opacity-90 transition-all duration-300"
                        >
                          View PDF
                        </button>
                        <button
                          onClick={() => handleRejoinder(file.fileName)}
                          className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white px-3 py-1 rounded-md hover:opacity-90 transition-all duration-300"
                        >
                          Rejoinder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AuditTrails;