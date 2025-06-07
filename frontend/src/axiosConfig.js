import axios from 'axios';

// Get the current host and determine the backend URL
const getBackendURL = () => {
  if (import.meta.env.DEV) {
    // In development, use localhost
    return 'http://localhost:3000';
  }
  // In production, use relative URLs
  return '';
};

// Create axios instance with dynamic base URL
const axiosInstance = axios.create({
  baseURL: getBackendURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Axios error:', error.message);
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - check if backend is running on:', getBackendURL());
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
