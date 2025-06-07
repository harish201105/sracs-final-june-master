import React, { useEffect, useState } from 'react';
import Navbar from './navbar';

function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showSecondText, setShowSecondText] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
      setShowSecondText(position > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: `url('https://t4.ftcdn.net/jpg/06/14/22/83/360_F_614228326_oNI45dDAFTzWlWIVFGpzmGjaotf331U6.jpg')`
          }}
        ></div>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <h1 
              className={`text-5xl md:text-6xl font-bold text-[#0A3871] transition-all duration-500 leading-tight`}
              style={{
                transform: showSecondText ? 'translateY(-10px)' : 'translateY(0)',
              }}
            >
              Audit Compilation System
            </h1>
            <h2 
              className={`text-3xl md:text-4xl font-semibold transition-all duration-500`}
              style={{
                opacity: 1,
                transform: showSecondText ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              <span className="text-red-600">Southern</span> <span className="text-red-600">Railways</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Streamlining audit processes and compliance management for efficient railway operations
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-[#0A3871] mb-4">Key Features</h3>
              <p className="text-gray-600 text-lg">Comprehensive audit management solutions</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-[#0A3871] rounded-full flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-[#0A3871] mb-3 text-center">Document Management</h4>
                <p className="text-gray-600 text-center">Efficiently manage and track audit documents with secure digital workflows</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-green-700 mb-3 text-center">Department Collaboration</h4>
                <p className="text-gray-600 text-center">Seamless coordination between different railway departments and audit teams</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-purple-700 mb-3 text-center">Real-time Analytics</h4>
                <p className="text-gray-600 text-center">Advanced reporting and analytics for audit progress tracking and compliance monitoring</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-orange-700 mb-3 text-center">Secure Compliance</h4>
                <p className="text-gray-600 text-center">Robust security measures and regulatory compliance standards for audit data protection</p>
              </div>

              {user.role === 'department' && (
                <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/department')}>
                  <h3 className="text-xl font-semibold mb-2 text-[#0A3871]">Department Portal</h3>
                  <p className="text-gray-600">Access department-specific audit files and provide remarks</p>
                </div>
              )}

              {user.role === 'audit' && (
                <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/audit-trails')}>
                  <h3 className="text-xl font-semibold mb-2 text-[#0A3871]">Audit Trails</h3>
                  <p className="text-gray-600">View closed files and manage rejoinder remarks</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] py-20">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join the digital transformation of railway audit management
            </p>
            <button className="bg-white text-[#0A3871] px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg">
              Access Dashboard
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Southern Railways - Audit Compilation System
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;