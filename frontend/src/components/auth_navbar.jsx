import React from 'react';
import indianRailwaysLogo from '../assets/indian_railways_logo.jpg';

function Navbar() {
    return (
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
            </div>
        </nav>
    );
}

export default Navbar;