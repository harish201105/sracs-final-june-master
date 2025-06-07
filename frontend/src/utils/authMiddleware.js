import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

let lastActivityTime = Date.now();
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

// Define role-based route access
const ROUTE_ACCESS = {
  '/': ['*'], // Public route
  '/home': ['main', 'department'],
  '/dash': ['main'],
  '/upload': ['main'],
  '/files': ['main'],
  '/remarks': ['main'],
  '/remarks2': ['main'],
  '/final-remarks': ['main'],
  '/rejoinder': ['main'],
  '/rejoinder-department-reply': ['main', 'department'],
  '/department': ['department'],
  '/department-file': ['department'],
  '/add-department': ['main'],
  '/reports': ['main'],
  '/audit-trails': ['audit-sr', 'audit-rb'],
  '/audit-rejoinder': ['audit-sr', 'audit-rb']
};

const updateLastActivity = () => {
  lastActivityTime = Date.now();
  // Update the session expiration time in localStorage
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      userData.expiresAt = Date.now() + SESSION_TIMEOUT;
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error updating session expiration:', error);
    }
  }
};

// Add event listeners for user activity
if (typeof window !== 'undefined') {
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, updateLastActivity, true);
  });
}

export const checkAuth = () => {
  const user = localStorage.getItem('user');
  if (!user) {
    // Clear session storage if no user is found
    sessionStorage.clear();
    return null;
  }

  try {
    const userData = JSON.parse(user);
    const currentTime = Date.now();
    
    // Check if the session has expired due to inactivity
    if (userData.expiresAt && currentTime > userData.expiresAt) {
      // Only log out if the user has been inactive
      if (currentTime - lastActivityTime > SESSION_TIMEOUT) {
        localStorage.removeItem('user');
        sessionStorage.clear();
        return null;
      } else {
        // If there's been activity, update the expiration time
        userData.expiresAt = currentTime + SESSION_TIMEOUT;
        localStorage.setItem('user', JSON.stringify(userData));
      }
    }
    return userData;
  } catch (error) {
    localStorage.removeItem('user');
    sessionStorage.clear();
    return null;
  }
};

// Check if user has access to a specific route
export const hasRouteAccess = (path, userRole) => {
  // Allow access to public routes
  if (path === '/') return true;
  
  const allowedRoles = ROUTE_ACCESS[path];
  if (!allowedRoles) return false; // Deny access to undefined routes
  
  return allowedRoles.includes('*') || allowedRoles.includes(userRole);
};

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkAuthentication = () => {
      const userData = checkAuth();
      
      if (!userData) {
        // Not authenticated
        localStorage.setItem('redirectPath', location.pathname);
        navigate('/', { replace: true });
        return;
      }

      // Check role-based access
      if (!hasRouteAccess(location.pathname, userData.role)) {
        // User doesn't have access to this route
        navigate('/home', { replace: true });
        return;
      }

      // Additional role check if requiredRole is specified
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(userData.role)) {
          navigate('/home', { replace: true });
          return;
        }
      }
    };

    checkAuthentication();
    const interval = setInterval(checkAuthentication, 30000); // Check auth every 30 seconds
    
    // Add security headers
    const addSecurityHeaders = () => {
      // Prevent clickjacking
      document.body.style.setProperty('X-Frame-Options', 'DENY');
      // Enable XSS protection
      document.body.style.setProperty('X-XSS-Protection', '1; mode=block');
      // Prevent MIME type sniffing
      document.body.style.setProperty('X-Content-Type-Options', 'nosniff');
    };

    addSecurityHeaders();

    return () => {
      clearInterval(interval);
      setMounted(false);
    };
  }, [navigate, location, mounted, requiredRole]);

  // Double-check authentication before rendering
  const userData = checkAuth();
  if (!userData || !hasRouteAccess(location.pathname, userData.role)) {
    return null;
  }

  return children;
};

// Utility function to clear sensitive data
export const clearSensitiveData = () => {
  localStorage.removeItem('user');
  sessionStorage.clear();
  // Clear any other sensitive data that might be stored
  document.cookie.split(';').forEach(cookie => {
    document.cookie = cookie
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
  });
};

// Export a function to handle secure logout
export const secureLogout = (navigate) => {
  clearSensitiveData();
  navigate('/', { replace: true });
};