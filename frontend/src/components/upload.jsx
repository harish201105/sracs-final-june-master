import React, { useState } from 'react';
import axios from 'axios';
import Navbar from './navbar';
import { useNavigate } from 'react-router-dom';

function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [message, setMessage] = useState('');
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setIsAcknowledged(false);
  };

  const handleFileUpload = async () => {
    if (!file || selectedOption === '') {
      alert('Please choose a file type and upload a file.');
      return;
    }

    if (!isAcknowledged) {
      alert('Please acknowledge the document verification statement before proceeding.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', selectedOption);

    try {
      const response = await axios.post('/api/upload-and-convert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('File uploaded and converted successfully.');
      console.log('Navigating to files with document type:', selectedOption);
      navigate('/files', {
        state: { 
          fileName: file.name, 
          elements: response.data.elements,
          documentType: selectedOption
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Error uploading file. Please try again.');
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 mt-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <span className="mr-2">←</span> Back
        </button>
        <h1 className="text-center text-3xl font-bold my-5">
          Upload PDF and Select Document Type
        </h1>
        <div className="flex flex-col items-center space-y-5">
          <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors mb-4"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('border-blue-500');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-blue-500');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-blue-500');
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile && droppedFile.type === 'application/pdf') {
                  setFile(droppedFile);
                  setIsAcknowledged(false);
                } else {
                  alert('Please drop a PDF file only');
                }
              }}
            >
              <input 
                type="file" 
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 w-full"
                accept=".pdf"
              />
              <p className="text-gray-500 mt-2">or drag and drop your PDF file here</p>
            </div>

            {file && (
              <div className="mb-4">
                <p className="text-green-500">✔ File selected: {file.name}</p>
              </div>
            )}

            <select
              className="w-full p-2 border border-gray-300 rounded mb-4"
              value={selectedOption}
              onChange={(e) => {
                const value = e.target.value;
                console.log('Selected document type:', value);
                setSelectedOption(value);
              }}
            >
              <option value="" disabled>Choose document type</option>
              <option value="special-letter">Special Letter (30 days)</option>
              <option value="performance-audit">Performance/Theme Based Audit (6 weeks)</option>
              <option value="draft-paragraph">Draft Paragraph (6 weeks)</option>
              <option value="provisional-para">Provisional Para (2 weeks)</option>
              <option value="audit-para">Audit Para (3 weeks)</option>
              <option value="action-taken-notes">Action Taken Notes (3 weeks)</option>
            </select>

            <div className="flex items-start space-x-2 border-t pt-4 mb-4">
              <input
                type="checkbox"
                id="documentAcknowledgment"
                checked={isAcknowledged}
                onChange={(e) => setIsAcknowledged(e.target.checked)}
                className="mt-1"
                required
              />
              <label htmlFor="documentAcknowledgment" className="text-sm text-gray-700">
                <span className="text-red-500 mr-1">*</span>
                I hereby acknowledge and declare that the uploaded document is an official Southern Railways document in the appropriate format. 
                I understand that uploading unauthorized or incorrectly formatted documents may lead to processing errors and delays. 
                I confirm that I am authorized to upload this document and that it complies with all Southern Railways documentation standards.
              </label>
            </div>

            {!isAcknowledged && file && (
              <div className="mt-3 text-yellow-700 bg-yellow-50 p-3 rounded-md text-sm border border-yellow-200 mb-4">
                ⚠️ Please acknowledge the statement above to enable file upload.
              </div>
            )}

            <button
              className={`w-full ${
                !isAcknowledged || !file || !selectedOption
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] hover:opacity-90'
              } text-white font-bold py-2 px-6 rounded transition-all duration-300`}
              onClick={handleFileUpload}
              disabled={!isAcknowledged || !file || !selectedOption}
              title={
                !file 
                  ? 'Please select a file'
                  : !selectedOption
                    ? 'Please select a document type'
                    : !isAcknowledged
                      ? 'Please acknowledge the document verification statement'
                      : 'Upload and Convert'
              }
            >
              Upload and Convert
            </button>
          </div>

          {message && (
            <p className={`text-center p-3 rounded ${message.includes('Error') || message.includes('exists') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default Upload;