import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './navbar';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

function Reports() {
    const navigate = useNavigate(); // Initialize useNavigate
    const [filesData, setFilesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [documentTypes, setDocumentTypes] = useState([]);
    const [status, setStatus] = useState(''); // Add status state
    const [message, setMessage] = useState('Please select a date range to view files');

    useEffect(() => {
        fetchDocumentTypes();
        fetchAllFiles(); // Fetch all files when component mounts
    }, []);

    const fetchAllFiles = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/files-filter');

            // Fetch department status for each file
            const filesWithDepartments = await Promise.all(
                response.data.map(async (file) => {
                    try {
                        const deptResponse = await axios.get('/api/file-departments', {
                            params: { 
                                fileName: encodeURIComponent(file.fileName)
                            }
                        });

                        // Update status based on freeze status
                        const displayStatus = file.status === 'closed' ? 'Completed' : 'Pending';

                        return {
                            ...file,
                            status: displayStatus,
                            departments: deptResponse.data.departments || []
                        };
                    } catch (err) {
                        console.error(`Error fetching departments for ${file.fileName}:`, err);
                        return {
                            ...file,
                            status: file.status === 'closed' ? 'Completed' : 'Pending',
                            departments: []
                        };
                    }
                })
            );

            if (filesWithDepartments.length === 0) {
                setMessage('No files found');
            } else {
                setMessage('');
            }
            setFilesData(filesWithDepartments);
            setError('');
        } catch (err) {
            setError('Failed to fetch files');
            setMessage('Error occurred while fetching files');
            setFilesData([]);
            console.error('Error fetching files:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocumentTypes = async () => {
        try {
            const response = await axios.get('/api/document-types');
            setDocumentTypes(response.data);
        } catch (err) {
            console.error('Error fetching document types:', err);
        }
    };

    const handleFilterFiles = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/files-filter', {
                params: { startDate, endDate, documentType }
            });

            // Fetch department status for each file
            const filesWithDepartments = await Promise.all(
                response.data.map(async (file) => {
                    try {
                        const deptResponse = await axios.get('/api/file-departments', {
                            params: { 
                                fileName: encodeURIComponent(file.fileName)
                            }
                        });

                        // Update status based on freeze status
                        const displayStatus = file.status === 'closed' ? 'Completed' : 'Pending';

                        return {
                            ...file,
                            status: displayStatus,
                            departments: deptResponse.data.departments || []
                        };
                    } catch (err) {
                        console.error(`Error fetching departments for ${file.fileName}:`, err);
                        return {
                            ...file,
                            status: file.status === 'closed' ? 'Completed' : 'Pending',
                            departments: []
                        };
                    }
                })
            );

            // Apply status filter on the frontend
            let finalFiles = filesWithDepartments;
            if (status === 'Pending') {
                finalFiles = filesWithDepartments.filter(f => f.status !== 'Completed');
            } else if (status === 'Closed') {
                finalFiles = filesWithDepartments.filter(f => f.status === 'Completed');
            }

            if (finalFiles.length === 0) {
                setMessage('No files found for the selected filters');
            } else {
                setMessage('');
            }
            setFilesData(finalFiles);
            setError('');
        } catch (err) {
            setError('Failed to filter files');
            setMessage('Error occurred while fetching files');
            setFilesData([]);
            console.error('Error filtering files:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateReport = () => {
        const doc = new jsPDF();

        // Add header
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('SOUTHERN RAILWAY - HQ/FINANCE', 105, 20, null, null, 'center');
        
        // Add subtitle with current date
        const currentDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        doc.text(`SUMMARY OF AUDIT OBJECTIONS AS ON ${currentDate}`, 105, 30, null, null, 'center');

        // Group files by document type and count them
        const categoryMap = {};
        const categoryNames = {
            'special-letter': 'Special Letters',
            'performance-audit': 'Theme Based/Performance Audit',
            'draft-paragraph': 'Draft Para (New)',
            'provisional-para': 'Provisional Para',
            'audit-para': 'Audit Para/ATN'
        };

        filesData.forEach(file => {
            const category = categoryNames[file.documentType] || file.documentType;
            if (!categoryMap[category]) {
                categoryMap[category] = 0;
            }
            categoryMap[category]++;
        });

        // Prepare table data
        const tableData = [];
        let serialNo = 1;
        let totalCases = 0;

        // Add category rows
        Object.entries(categoryMap).forEach(([category, count]) => {
            tableData.push([serialNo.toString(), category, count.toString()]);
            serialNo++;
            totalCases += count;
        });

        // Add total row
        tableData.push(['', 'Total', totalCases.toString()]);

        // Create the summary table
        doc.autoTable({
            startY: 50,
            head: [['S.No.', 'Category', 'No. of Cases']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineWidth: 0.5,
                lineColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineWidth: 0.5,
                lineColor: [0, 0, 0]
            },
            alternateRowStyles: {
                fillColor: [255, 255, 255]
            },
            styles: {
                fontSize: 12,
                cellPadding: 5,
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 30 },
                1: { halign: 'left', cellWidth: 120 },
                2: { halign: 'center', cellWidth: 40 }
            },
            margin: { left: 20, right: 20 }
        });

        // Add detailed breakdown if needed
        if (filesData.length > 0) {
            let finalY = doc.lastAutoTable.finalY + 20;
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('DETAILED BREAKDOWN', 20, finalY);
            
            // Detailed table with file information
            const detailedData = filesData.map((file, index) => {
                const pendingDepts = file.departments ? 
                    file.departments
                        .filter(dept => dept.remarksGiven < dept.totalAssignments)
                        .map(dept => dept.name)
                        .join(', ') || 'None'
                    : 'None';
                
                return [
                    (index + 1).toString(),
                    file.fileName,
                    new Date(file.uploadDate || Date.now()).toLocaleDateString('en-GB'),
                    categoryNames[file.documentType] || file.documentType,
                    file.status,
                    pendingDepts
                ];
            });

            doc.autoTable({
                startY: finalY + 10,
                head: [['S.No.', 'File Name', 'Date of Issue', 'Category', 'Status', 'Remarks Pending From']],
                body: detailedData,
                theme: 'grid',
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    lineWidth: 0.5,
                    lineColor: [0, 0, 0],
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    lineWidth: 0.5,
                    lineColor: [0, 0, 0],
                    fontSize: 10
                },
                styles: {
                    cellPadding: 3,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    1: { halign: 'left', cellWidth: 40 },
                    2: { halign: 'center', cellWidth: 25 },
                    3: { halign: 'left', cellWidth: 35 },
                    4: { halign: 'center', cellWidth: 25 },
                    5: { halign: 'left', cellWidth: 50 }
                },
                margin: { left: 5, right: 5 }
            });
        }

        // Save the PDF
        doc.save(`southern-railways-audit-summary-${currentDate.replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                    <span className="mr-2">←</span> Back
                </button>
                <h1 className="text-3xl font-bold mb-8 text-center">Reports Dashboard</h1>

                {/* Filter Section */}
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
                    <div className="flex flex-wrap justify-center items-end gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Start Date:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">End Date:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Document Type:</label>
                            <select
                                className="border rounded-md p-2 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                            >
                                <option value="">All</option>
                                {documentTypes.map((type, index) => (
                                    <option key={index} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Status:</label>
                            <select
                                className="border rounded-md p-2 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="Pending">Pending</option>
                                <option value="Closed">Completed</option>
                            </select>
                        </div>
                        <div>
                            <button
                                onClick={handleFilterFiles}
                                className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white px-6 py-2 rounded-md hover:opacity-90 transition-all duration-300"
                            >
                                Filter
                            </button>
                        </div>
                    </div>
                </div>

                {/* Generate Report Button */}
                {filesData.length > 0 && (
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={generateReport}
                            className="bg-gradient-to-r from-[#0A3871] to-[#0CAFFF] text-white py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
                        >
                            Generate Report
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Loading State or Message */}
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
                    </div>
                ) : message ? (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
                        <div className="text-center text-gray-500">{message}</div>
                    </div>
                ) : (
                    /* Files Table */
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks Received From</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks Pending From</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filesData.map((file, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{file.fileName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{file.documentType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${file.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                                    file.status === 'Department Assigned' ? 'bg-yellow-100 text-yellow-800' :
                                                    file.status === 'Department Remarks Given' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                                {file.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {Array.isArray(file.departments) && file.departments.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {file.departments
                                                        .filter(dept => dept.remarksGiven > 0)
                                                        .map((dept, i) => (
                                                            <div 
                                                                key={i} 
                                                                className="flex items-center justify-between bg-green-50 p-2 rounded-lg"
                                                            >
                                                                <span className="font-medium text-green-800">
                                                                    {dept.name}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                                                        <div 
                                                                            className="bg-green-600 h-2.5 rounded-full"
                                                                            style={{ width: `${dept.completionPercentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs text-green-800">
                                                                        {dept.remarksGiven}/{dept.totalAssignments}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic">No departments assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {Array.isArray(file.departments) && file.departments.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {file.departments
                                                        .filter(dept => dept.remarksGiven < dept.totalAssignments)
                                                        .map((dept, i) => (
                                                            <div 
                                                                key={i} 
                                                                className="flex items-center justify-between bg-red-50 p-2 rounded-lg"
                                                            >
                                                                <span className="font-medium text-red-800">
                                                                    {dept.name}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                                                        <div 
                                                                            className="bg-red-600 h-2.5 rounded-full"
                                                                            style={{ width: `${((dept.totalAssignments - dept.remarksGiven) / dept.totalAssignments) * 100}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs text-red-800">
                                                                        {dept.totalAssignments - dept.remarksGiven}/{dept.totalAssignments}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic">No departments assigned</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Reports;