import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash, FaEdit, FaKey, FaBuilding, FaEnvelope, FaLock } from 'react-icons/fa';
import Navbar from './navbar';

function AddDepartment() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [departmentName, setDepartmentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Edit states
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/departments');
      console.log('Fetched departments:', response.data);
      // Validate department data structure
      const validDepartments = response.data.filter(dept => {
        const isValid = dept && dept._id && dept.departmentName && dept.email;
        if (!isValid) {
          console.warn('Invalid department data:', dept);
        }
        return isValid;
      });
      setDepartments(validDepartments);
      setError('');
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate input
      if (!departmentName.trim() || !email.trim() || !password.trim()) {
        setError('All fields are required');
        return;
      }

      // Check if department name or email already exists
      const exists = departments.some(
        dept => dept.departmentName.toLowerCase() === departmentName.toLowerCase() ||
                dept.email.toLowerCase() === email.toLowerCase()
      );

      if (exists) {
        setError('Department name or email already exists');
        return;
      }

      const response = await axios.post('/api/departments', {
        departmentName,
        email,
        password
      });

      setDepartments([...departments, response.data]);
      setSuccess('Department added successfully');
      
      // Clear form
      setDepartmentName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Error adding department:', err);
      setError('Failed to add department. Please try again.');
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      await axios.delete(`/api/departments/${departmentId}`);
      setDepartments(departments.filter(dept => dept._id !== departmentId));
      setSuccess('Department deleted successfully');
    } catch (err) {
      console.error('Error deleting department:', err);
      setError('Failed to delete department. Please try again.');
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate input
      if (!editName.trim() || !editEmail.trim()) {
        setError('Department name and email are required');
        return;
      }

      if (!editingDepartment || !editingDepartment._id) {
        console.error('No department selected for editing');
        setError('No department selected for editing');
        return;
      }

      console.log('Editing department:', {
        id: editingDepartment._id,
        currentName: editingDepartment.departmentName,
        currentEmail: editingDepartment.email,
        newName: editName,
        newEmail: editEmail
      });

      // Check if new name or email conflicts with other departments
      const conflict = departments.some(
        dept => dept._id !== editingDepartment._id && 
               (dept.departmentName.toLowerCase() === editName.toLowerCase() ||
                dept.email.toLowerCase() === editEmail.toLowerCase())
      );

      if (conflict) {
        setError('Department name or email already exists');
        return;
      }

      const url = `/api/departments/${editingDepartment._id}`;
      console.log('Making PUT request to:', url, 'with data:', {
        departmentName: editName,
        email: editEmail
      });
      
      const response = await axios.put(url, {
        departmentName: editName,
        email: editEmail
      });

      console.log('Update response:', response.data);

      if (!response.data || !response.data._id) {
        throw new Error('Invalid response data from server');
      }

      setDepartments(departments.map(dept => 
        dept._id === editingDepartment._id ? response.data : dept
      ));
      setSuccess('Department updated successfully');
      setEditingDepartment(null);
    } catch (err) {
      console.error('Error updating department:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url,
        data: err.config?.data
      });
      
      // More specific error messages based on the error type
      if (err.response?.status === 404) {
        setError('Department not found. Please refresh the page and try again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid department data. Please check your input.');
      } else if (err.response?.status === 409) {
        setError('Department name or email already exists.');
      } else {
        setError('Failed to update department. Please try again.');
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!newPassword.trim()) {
        setError('New password is required');
        return;
      }

      await axios.put(`/api/departments/${editingDepartment._id}/password`, {
        password: newPassword
      });

      setSuccess('Password updated successfully');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password. Please try again.');
    }
  };

  const startEditing = (department) => {
    console.log('Starting to edit department:', department);
    if (!department || !department._id) {
      console.error('Invalid department data:', department);
      setError('Invalid department data. Please try again.');
      return;
    }
    setEditingDepartment(department);
    setEditName(department.departmentName || '');
    setEditEmail(department.email || '');
    setEditPassword('');
  };

  const cancelEditing = () => {
    setEditingDepartment(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading departments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Department Management</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
              {success}
            </div>
          )}

          {/* Add Department Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Department</h2>
            <form onSubmit={handleAddDepartment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaBuilding className="inline-block mr-2" /> Department Name
                </label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter department name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaEnvelope className="inline-block mr-2" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter department email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaLock className="inline-block mr-2" /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter department password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
              >
                <FaPlus className="mr-2" /> Add Department
              </button>
            </form>
          </div>

          {/* Departments List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Departments</h2>
            <div className="space-y-4">
              {departments.map((department) => (
                <div key={department._id} className="border border-gray-200 rounded-lg p-4">
                  {editingDepartment?._id === department._id ? (
                    // Edit Form
                    <form onSubmit={handleEditDepartment} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Department Info
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-800">{department.departmentName}</h3>
                        <p className="text-sm text-gray-600">{department.email}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(department)}
                          className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          title="Edit Department"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDepartment(department);
                            setShowPasswordModal(true);
                          }}
                          className="p-2 text-yellow-600 hover:text-yellow-800 transition-colors duration-200"
                          title="Change Password"
                        >
                          <FaKey />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department._id)}
                          className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                          title="Delete Department"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Change Password for {editingDepartment?.departmentName}
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddDepartment;