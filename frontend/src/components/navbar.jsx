import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaHome, FaChartLine, FaUpload, FaComments, FaFileAlt, FaPlus } from 'react-icons/fa';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

function Navbar() {
    const [showPopup, setShowPopup] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('user');
        // Clear all session storage to remove cached data
        sessionStorage.clear();
        navigate('/');
    };

    const isActive = (path) => {
        return location.pathname === path 
            ? 'text-white bg-white bg-opacity-25 shadow-lg scale-105 border-l-4 border-white' 
            : 'text-white hover:text-gray-200';
    };

    const navItems = [
        { path: '/dash', label: 'Tracking Dashboard', icon: FaChartLine },
        { path: '/upload', label: 'Upload & Convert', icon: FaUpload },
        { path: '/remarks', label: 'File Management', icon: FaComments },
        { path: '/remarks2', label: 'Furnish Remarks', icon: FaComments },
        { path: '/reports', label: 'Reports', icon: FaFileAlt },
        { path: '/add-department', label: 'Add Department', icon: FaPlus }
    ];

    return (
        <nav className="bg-gradient-to-r from-[#0A3871] via-[#0B4A8C] to-[#0CAFFF] p-4 text-white shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
            
            <div className="container mx-auto flex justify-between items-center max-w-7xl">
                {/* Left section */}
                <div className="flex items-center space-x-4 min-w-0 flex-shrink-0">
                    {/* Home button with enhanced styling */}
                    <Link 
                        to="/home" 
                        className="flex items-center p-3 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-300 transform hover:scale-110 group"
                        title="Home"
                    >
                        <FaHome size={24} className="group-hover:text-yellow-300 transition-colors" />
                    </Link>
                    
                    {/* Logo and title section */}
                    <div className="flex items-center group transition-all duration-300 cursor-default">
                        <img 
                            src={indianRailwaysLogo} 
                            alt="Southern Railways Logo" 
                            className="h-14 w-14 mr-4 rounded-full border-2 border-white/30 transition-all duration-300 group-hover:scale-105 group-hover:border-white/60 shadow-lg"
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-xl group-hover:text-gray-100 transition-colors duration-300 tracking-tight">
                                Audit Compilation System
                            </span>
                            <span className="text-sm text-gray-200 group-hover:text-gray-100 transition-colors duration-300 font-medium">
                                Southern Railways
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center navigation */}
                <div className="hidden lg:flex items-center justify-center space-x-1 flex-1 ml-8">
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <Link 
                                key={item.path}
                                to={item.path} 
                                className={`px-3 py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 font-medium text-sm ${isActive(item.path)}`}
                            >
                                <IconComponent size={14} />
                                <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Right section */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                    {/* User profile */}
                    <div className="relative">
                        <div 
                            className="flex items-center bg-white bg-opacity-20 rounded-full p-3 cursor-pointer hover:bg-opacity-30 transition-all duration-300 transform hover:scale-110 group border border-white/30" 
                            onClick={() => setShowPopup(!showPopup)}
                        >
                            <FaUser size={18} className="group-hover:text-yellow-300 transition-colors" />
                        </div>
                        {showPopup && (
                            <div className="absolute top-full right-0 mt-2 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 z-50 w-56 transform transition-all duration-300">
                                <div className="mb-4 pb-3 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] rounded-full flex items-center justify-center">
                                            <FaUser className="text-white" size={16} />
                                        </div>
                                        <div>
                                            <p className="text-gray-800 font-semibold">Admin User</p>
                                            <p className="text-gray-500 text-sm">System Administrator</p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className="w-full flex items-center justify-center bg-gradient-to-r from-[#FF3B30] to-[#FF6B6B] text-white px-4 py-3 rounded-lg hover:from-[#FF6B6B] hover:to-[#FF3B30] transition-all duration-300 font-medium transform hover:scale-105 shadow-lg"
                                    onClick={handleLogout}
                                >
                                    <FaSignOutAlt className="mr-2" />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile navigation menu (hidden on larger screens) */}
            <div className="lg:hidden mt-4 border-t border-white/20 pt-4">
                <div className="grid grid-cols-2 gap-3 max-w-full">
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <Link 
                                key={item.path}
                                to={item.path} 
                                className={`px-3 py-2.5 rounded-lg transition-all duration-300 flex items-center justify-start space-x-2 text-sm font-medium ${isActive(item.path)}`}
                            >
                                <IconComponent size={14} className="flex-shrink-0" />
                                <span className="truncate text-left">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;