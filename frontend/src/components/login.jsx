import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaBuilding } from 'react-icons/fa';
import Navbar from './auth_navbar';
import { clearSensitiveData } from '../utils/authMiddleware';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

  // Clear any existing session data on component mount
  useEffect(() => {
    clearSensitiveData();
  }, []);

  useEffect(() => {
    // Fetch departments with error handling
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/departments');
        setDepartments(response.data);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments. Please try again later.');
      }
    };
    fetchDepartments();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let userData = null;
      let expirationTime = Date.now() + (10 * 60 * 1000); // 10 minutes
      let redirectPath = '/home'; // Default redirect path

      // Main user login
      if (email === 'main@gmail.com' && password === '123') {
        userData = { 
          email, 
          role: 'main',
          expiresAt: expirationTime 
        };
        redirectPath = '/home';
      }
      // Audit SR user login
      else if (email === 'audit-sr@gmail.com' && password === '123') {
        userData = { 
          email, 
          role: 'audit-sr',
          expiresAt: expirationTime 
        };
        redirectPath = '/audit-trails';
      }
      // Audit RB user login
      else if (email === 'audit-rb@gmail.com' && password === '123') {
        userData = { 
          email, 
          role: 'audit-rb',
          expiresAt: expirationTime 
        };
        redirectPath = '/audit-trails';
      }
      // Department login
      else {
        const deptRecord = departments.find(
          (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password
        );
        
        if (deptRecord) {
          if (selectedDept !== deptRecord.departmentName) {
            setError(`Please select the correct department: ${deptRecord.departmentName}`);
            return;
          }
          userData = {
            email,
            role: 'department',
            department: deptRecord.departmentName,
            expiresAt: expirationTime
          };
          redirectPath = '/department'; // Set redirect path for department users
        }
      }

      if (userData) {
        // Store user data securely
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Clear any existing session data
        sessionStorage.clear();
        
        // Use the stored redirect path or the role-specific path
        const storedRedirectPath = localStorage.getItem('redirectPath');
        if (storedRedirectPath) {
          localStorage.removeItem('redirectPath');
          navigate(storedRedirectPath, { replace: true });
        } else {
          navigate(redirectPath, { replace: true });
        }
      } else {
        setError('Invalid credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-4">
        <div className="mt-16 p-8 bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">

          <div className="flex flex-col items-center mb-6">
            {/* Logo removed as per instruction */}
            <h2 className="text-2xl font-bold text-[#0A3871] tracking-tight">
              Audit Compilation System
            </h2>
            <p className="text-gray-600 text-sm">Southern Railways</p>
          </div>

          <div className="h-0.5 bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] mb-6"></div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                <FaEnvelope className="inline-block mr-2 text-gray-500" /> Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0CAFFF] focus:border-[#0CAFFF] focus:outline-none transition duration-150 ease-in-out"
                placeholder="Enter your email"
              />
              <FaEnvelope className="absolute left-3 top-11 text-gray-400" />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                <FaLock className="inline-block mr-2 text-gray-500" /> Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0CAFFF] focus:border-[#0CAFFF] focus:outline-none transition duration-150 ease-in-out"
                placeholder="Enter your password"
              />
              <FaLock className="absolute left-3 top-11 text-gray-400" />
            </div>

            {email.toLowerCase() !== 'main@gmail.com' && 
             email.toLowerCase() !== 'audit-sr@gmail.com' && 
             email.toLowerCase() !== 'audit-rb@gmail.com' && (
              <div className="relative">
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  <FaBuilding className="inline-block mr-2 text-gray-500" /> Department
                </label>
                <select
                  id="department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0CAFFF] focus:border-[#0CAFFF] focus:outline-none transition duration-150 ease-in-out"
                >
                  <option value="">Select your department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.departmentName}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>

              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] hover:from-[#0CAFFF] hover:to-[#0A3871] transition-all duration-300 font-medium shadow-md"
            >
              Login <span className="ml-2 group-hover:animate-pulse">→</span>
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {new Date().getFullYear()} Southern Railways
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;