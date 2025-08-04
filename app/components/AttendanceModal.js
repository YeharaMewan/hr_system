'use client';

import React from 'react';

const leaveTypes = [
    "Present", "Work from home", "Planned Leave", "Sudden Leave",
    "Medical Leave", "Holiday Leave", "Lieu leave", "Work from out of Rise"
];

export default function AttendanceModal({ isOpen, onClose, staffMember, onUpdateStatus, todayKey }) {
    if (!isOpen || !staffMember) return null;

    const handleStatusSelect = (status) => {
        onUpdateStatus(staffMember._id, status);
        onClose(); 
    };

    const currentStatus = staffMember.attendance?.[todayKey]?.status;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div
                className="bg-zinc-900 border border-zinc-700/50 text-white rounded-xl shadow-2xl p-8 w-11/12 max-w-lg transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-8">
                    {/* Font Change: උප-මාතෘකාවේ අකුරු විශාල කරන ලදී */}
                    <p className="text-base text-zinc-400 mb-1">Mark Attendance for</p>
                    {/* Font Change: ප්‍රධාන නම සඳහා සුදුසු ප්‍රමාණය තහවුරු කරන ලදී */}
                    <h2 className="text-4xl font-bold text-zinc-100">{staffMember.name}</h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaveTypes.map(type => {
                        const isActive = currentStatus === type;
                        return (
                            <button
                                key={type}
                                onClick={() => handleStatusSelect(type)}
                                // Font Change: බොත්තම් වල අකුරු විශාල කර, පැහැදිලි බව වැඩි කරන ලදී
                                className={`p-4 text-lg text-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-violet-500
                                            ${isActive 
                                                ? 'bg-violet-600 text-white shadow-lg' 
                                                : 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300'
                                            }`}
                            >
                                {type}
                            </button>
                        );
                    })}
                </div>

                 <div className="text-center mt-8">
                    {/* Font Change: 'Clear' බොත්තමේ අකුරු විශාල කරන ලදී */}
                    <button 
                        onClick={() => handleStatusSelect('')} 
                        className="text-zinc-500 hover:text-zinc-300 text-base transition-colors"
                    >
                        Mark as Not Marked (Clear)
                    </button>
                </div>

            </div>
        </div>
    );
}