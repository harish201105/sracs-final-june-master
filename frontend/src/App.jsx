import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';
import { ProtectedRoute } from './utils/authMiddleware';
import Login from './components/login';
import Home from './components/Home';
import Dash from './components/dash';
import Upload from './components/upload';
import Files from './components/files';
import DepartmentPortal from './components/DepartmentPortal';
import DepartmentFile from './components/DepartmentFile';
import FinalRemarks from './components/FinalRemarks';
import AddDepartment from './components/AddDepartment';
import Remarks from './components/remarks';
import Remarks2 from './components/remarks2';
import Reports from './components/Reports';
import AuditTrails from './components/AuditTrails';
import AuditRejoinder from './components/AuditRejoinder';
import Rejoinder from './components/Rejoinder';
import RejoinderDepartmentReply from './components/RejoinderDepartmentReply';

// Enable future flags
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  return (
    <Router future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_prependBasename: true,
      v7_normalizeFormMethod: true
    }}>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />
        
        {/* Main user routes */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/dash" element={<ProtectedRoute requiredRole="main"><Dash /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute requiredRole="main"><Upload /></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute requiredRole="main"><Files /></ProtectedRoute>} />
        <Route path="/remarks" element={<ProtectedRoute requiredRole="main"><Remarks /></ProtectedRoute>} />
        <Route path="/remarks2" element={<ProtectedRoute requiredRole="main"><Remarks2 /></ProtectedRoute>} />
        <Route path="/final-remarks" element={<ProtectedRoute requiredRole="main"><FinalRemarks /></ProtectedRoute>} />
        <Route path="/rejoinder" element={<ProtectedRoute requiredRole="main"><Rejoinder /></ProtectedRoute>} />
        <Route path="/rejoinder-department-reply" element={<ProtectedRoute><RejoinderDepartmentReply /></ProtectedRoute>} />
        
        {/* Department portal routes */}
        <Route path="/department" element={<ProtectedRoute requiredRole="department"><DepartmentPortal /></ProtectedRoute>} />
        <Route path="/department-file" element={<ProtectedRoute requiredRole="department"><DepartmentFile /></ProtectedRoute>} />
        
        {/* Admin routes */}
        <Route path="/add-department" element={<ProtectedRoute requiredRole="main"><AddDepartment /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute requiredRole="main"><Reports /></ProtectedRoute>} />
        
        {/* Audit routes */}
        <Route path="/audit-trails" element={<ProtectedRoute requiredRole={['audit-sr', 'audit-rb']}><AuditTrails /></ProtectedRoute>} />
        <Route path="/audit-rejoinder" element={<ProtectedRoute requiredRole={['audit-sr', 'audit-rb']}><AuditRejoinder /></ProtectedRoute>} />
        
        {/* Catch-all route - redirect to home if authenticated, otherwise to login */}
        <Route path="*" element={<CatchAllRoute />} />
      </Routes>
    </Router>
  );
}

// Component to handle catch-all routes
function CatchAllRoute() {
  const location = useLocation();
  const user = localStorage.getItem('user');
  
  if (user) {
    const userData = JSON.parse(user);
    if (userData.role === 'audit-sr' || userData.role === 'audit-rb') {
      return <Navigate to="/audit-trails" replace />;
    }
    return <Navigate to="/home" replace />;
  }
  
  return <Navigate to="/" state={{ from: location }} replace />;
}

export default App;