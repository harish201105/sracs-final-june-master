import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FaTrain, FaSignOutAlt } from 'react-icons/fa';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

function DepartmentFile() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileFromState = location.state?.file || {};
  const user = JSON.parse(localStorage.getItem('user'));
  const department = user?.department;

  const [file, setFile] = useState(fileFromState);
  const [filteredElements, setFilteredElements] = useState([]);
  const [deptRemarksInputs, setDeptRemarksInputs] = useState({});
  const [signature, setSignature] = useState(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingPara, setCurrentEditingPara] = useState(null);
  const [currentEditingRemark, setCurrentEditingRemark] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('user');
    // Clear all session storage to remove cached data
    sessionStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    if (file && file.fileName) {
      if (Array.isArray(file.elements) && file.elements.length > 0) {
        const filtered = file.elements.filter((el) => (el.departments || []).includes(department));
        setFilteredElements(filtered);
        setLoading(false);
      } else {
        axios
          .post('/api/getFileRemarks', { fileName: file.fileName })
          .then((response) => {
            if (response.data && response.data.elements) {
              setFile({ ...file, elements: response.data.elements });
              const filtered = response.data.elements.filter((el) =>
                (el.departments || []).includes(department)
              );
              setFilteredElements(filtered);
            }
          })
          .catch((error) => console.error('Error fetching file remarks:', error))
          .finally(() => setLoading(false));
      }
    }
  }, [file, department, file.fileName]);

  useEffect(() => {
    const initialInputs = {};
    filteredElements.forEach((el) => {
      const existing = el.deptRemarks?.find((d) => d.department === department);
      initialInputs[el.paraId] = existing ? existing.remark : '';
    });
    setDeptRemarksInputs(initialInputs);
  }, [filteredElements, department]);

  const handleDeptRemarkChange = (paraId, value) => {
    setDeptRemarksInputs((prev) => ({ ...prev, [paraId]: value }));
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignature(file);
      setIsAcknowledged(false); // Reset acknowledgment when new signature is uploaded
    }
  };

  const handleSaveDeptRemark = async (paraId) => {
    if (!signature) {
      alert('Please upload your signature before saving remarks.');
      return;
    }

    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('paraId', paraId);
      formData.append('department', department);
      formData.append('deptRemark', deptRemarksInputs[paraId]);
      formData.append('signature', signature);

      const response = await axios.post('/api/updateDeptRemarks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200 && response.data.updatedElement) {
        // Update the local state with the new remark
        setFile(prevFile => ({
          ...prevFile,
          elements: prevFile.elements.map(el => {
            if (el.paraId === paraId) {
              return {
                ...el,
                deptRemarks: response.data.updatedElement.deptRemarks
              };
            }
            return el;
          })
        }));

        // Update filtered elements
        setFilteredElements(prev => prev.map(el => {
          if (el.paraId === paraId) {
            return {
              ...el,
              deptRemarks: response.data.updatedElement.deptRemarks
            };
          }
          return el;
        }));

        alert('Remark saved successfully!');
        closeModal(); // Close the modal after successful save
      } else {
        alert('Failed to save remark. Please try again.');
      }
    } catch (error) {
      console.error('Error saving department remark:', error);
      alert('An error occurred while saving your remark. Please try again.');
    }
  };

  const openModal = (paraId) => {
    if (!signature) {
      alert('Please upload your signature before editing remarks.');
      return;
    }

    if (!isAcknowledged) {
      alert('Please acknowledge the signature verification statement before editing remarks.');
      return;
    }

    setCurrentEditingPara(paraId);
    setCurrentEditingRemark(deptRemarksInputs[paraId] || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentEditingPara(null);
    setCurrentEditingRemark('');
  };

  const handleModalSave = async () => {
    if (!signature) {
      alert('Please upload your signature before saving remarks.');
      return;
    }

    if (!isAcknowledged) {
      alert('Please acknowledge the signature verification statement before proceeding.');
      return;
    }

    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('paraId', currentEditingPara);
      formData.append('department', department);
      formData.append('deptRemark', currentEditingRemark);
      formData.append('signature', signature);

      const response = await axios.post('/api/updateDeptRemarks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200 && response.data.updatedElement) {
        // Update the local state with the new remark
        setFile(prevFile => ({
          ...prevFile,
          elements: prevFile.elements.map(el => {
            if (el.paraId === currentEditingPara) {
              return {
                ...el,
                deptRemarks: response.data.updatedElement.deptRemarks
              };
            }
            return el;
          })
        }));

        // Update filtered elements
        setFilteredElements(prev => prev.map(el => {
          if (el.paraId === currentEditingPara) {
            return {
              ...el,
              deptRemarks: response.data.updatedElement.deptRemarks
            };
          }
          return el;
        }));

        // Update the deptRemarksInputs state
        setDeptRemarksInputs(prev => ({
          ...prev,
          [currentEditingPara]: currentEditingRemark
        }));

        alert('Remark saved successfully!');
        closeModal();
      } else {
        alert('Failed to save remark. Please try again.');
      }
    } catch (error) {
      console.error('Error saving department remark:', error);
      alert('An error occurred while saving your remark. Please try again.');
    }
  };

  if (loading) {
    return (
      <div>
        <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <Link 
              to="/department" 
              className="flex items-center group transition-all duration-300"
            >
              <img 
                src={indianRailwaysLogo}
                alt="Southern Railways Logo" 
                className="h-12 w-12 mr-3 rounded-full shadow-md transition-transform duration-300 group-hover:rotate-6"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight group-hover:text-gray-200 transition-colors duration-300">
                  <FaTrain className="inline-block mr-2 text-white" />
                  Southern Railways
                </span>
                <span className="text-sm text-gray-200 group-hover:text-gray-300 transition-colors duration-300">
                  Audit Compilation System
                </span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] rounded-md hover:opacity-90 transition-all duration-300 text-sm font-medium flex items-center"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
          </div>
        </nav>
        <div className="container mx-auto px-4 mt-10">
          <h1 className="text-center text-3xl font-bold my-5">Loading file details…</h1>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] p-4 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300">
            Back
          </button>
          <Link 
            to="/department" 
            className="flex items-center group transition-all duration-300"
          >
            <img 
              src={indianRailwaysLogo}
              alt="Southern Railways Logo" 
              className="h-12 w-12 mr-3 rounded-full shadow-md transition-transform duration-300 group-hover:rotate-6"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight group-hover:text-gray-200 transition-colors duration-300">
                <FaTrain className="inline-block mr-2 text-white" />
                Southern Railways
              </span>
              <span className="text-sm text-gray-200 group-hover:text-gray-300 transition-colors duration-300">
                Audit Compilation System
              </span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] rounded-md hover:opacity-90 transition-all duration-300 text-sm font-medium flex items-center"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 mt-10">
        <h1 className="text-center text-3xl font-bold my-5">File: {file.fileName}</h1>
        <h3 className="text-center text-xl mb-5">Elements assigned to {department}</h3>

        {/* Signature Upload Section with Acknowledgment */}
        <div className="mb-5 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md">
            <label className="text-lg font-semibold mb-2 block">Upload Your Signature:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleSignatureUpload} 
              className="border p-2 w-full mb-4" 
            />
            {signature && (
              <div className="mb-4">
                <p className="text-green-500 mb-2">✔ Signature file selected: {signature.name}</p>
              </div>
            )}

            <div className="flex items-start space-x-2 border-t pt-4">
              <input
                type="checkbox"
                id="signatureAcknowledgment"
                checked={isAcknowledged}
                onChange={(e) => setIsAcknowledged(e.target.checked)}
                className="mt-1"
                required
              />
              <label htmlFor="signatureAcknowledgment" className="text-sm text-gray-700">
                <span className="text-red-500 mr-1">*</span>
                I hereby acknowledge and declare that I am uploading my authorized signature file. 
                I understand that uploading an unauthorized or forged signature is a serious offense, 
                and I agree to face legal consequences if found using an improper signature file. 
                I confirm that I am authorized by Southern Railways to use this signature for official purposes.
              </label>
            </div>

            {!isAcknowledged && signature && (
              <div className="mt-3 text-yellow-700 bg-yellow-50 p-3 rounded-md text-sm border border-yellow-200">
                ⚠️ Please acknowledge the statement above to enable remark editing.
              </div>
            )}
          </div>
        </div>

        {filteredElements.length > 0 ? (
          <table className="table-auto w-full border">
            <thead>
              <tr>
                <th className="px-4 py-2">Sl.no</th>
                <th className="px-4 py-2">Para ID</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Your Dept Remark</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredElements.map((el, index) => (
                <tr key={el.paraId}>
                  <td className="border px-4 py-2">{index + 1}</td>
                  <td className="border px-4 py-2">{el.paraId}</td>
                  <td className="border px-4 py-2">{el.content}</td>
                  <td className="border px-4 py-2">
                    {deptRemarksInputs[el.paraId] && deptRemarksInputs[el.paraId].length > 0
                      ? deptRemarksInputs[el.paraId]
                      : 'No remark added'}
                  </td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => openModal(el.paraId)}
                      disabled={!signature || !isAcknowledged}
                      className={`p-2 rounded text-white ${
                        signature && isAcknowledged 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      title={
                        !signature 
                          ? 'Please upload your signature first'
                          : !isAcknowledged 
                            ? 'Please acknowledge the signature verification statement'
                            : 'Edit remark'
                      }
                    >
                      Edit Remark
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center">No elements assigned to {department}.</p>
        )}
      </div>

      {/* Modal for editing remark */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              Edit Remark for Para ID: {currentEditingPara}
            </h2>
            {!isAcknowledged && signature && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                Please acknowledge the signature verification statement above before saving remarks.
              </div>
            )}
            <textarea
              value={currentEditingRemark}
              onChange={(e) => setCurrentEditingRemark(e.target.value)}
              className="w-full p-2 border rounded resize-y"
              style={{ minHeight: '150px' }}
              placeholder={`Enter your ${department} remark...`}
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
                disabled={!isAcknowledged && signature}
                className={`px-4 py-2 text-white rounded ${
                  !isAcknowledged && signature
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentFile;