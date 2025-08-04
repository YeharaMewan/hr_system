'use client';

import React, { useState } from 'react';
import AttendanceModal from './AttendanceModal'; // Make sure this path is correct

const statusStyles = {
    "Present":              { badge: "bg-green-500/10 text-green-400",         border: "border-green-500" },
    "Work from home":       { badge: "bg-sky-500/10 text-sky-400",             border: "border-sky-500" },
    "Planned Leave":        { badge: "bg-yellow-500/10 text-yellow-400",       border: "border-yellow-500" },
    "Sudden Leave":         { badge: "bg-red-500/10 text-red-400",             border: "border-red-500" },
    "Medical Leave":        { badge: "bg-pink-500/10 text-pink-400",           border: "border-pink-500" },
    "Holiday Leave":        { badge: "bg-indigo-500/10 text-indigo-400",       border: "border-indigo-500" },
    "Lieu leave":           { badge: "bg-purple-500/10 text-purple-400",       border: "border-purple-500" },
    "Work from out of Rise":{ badge: "bg-teal-500/10 text-teal-400",           border: "border-teal-500" },
    "Default":              { badge: "bg-zinc-700 text-zinc-400",              border: "border-zinc-700" }
};

// ✅ නව: Relative time format කරන function එක
function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    if (seconds < 10) return "just now";
    return Math.floor(seconds) + " seconds ago";
}

export default function QuickAttendanceToday({ staff, isLoading, onUpdateAttendance }) {
    const [modalState, setModalState] = useState({ isOpen: false, selectedStaff: null });

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayDateFormatted = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const openModal = (staffMember) => setModalState({ isOpen: true, selectedStaff: staffMember });
    const closeModal = () => setModalState({ isOpen: false, selectedStaff: null });

    const handleUpdateStatus = (userId, newStatus) => {
        onUpdateAttendance(userId, todayKey, newStatus);
    };

    return (
        <>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-xl shadow-2xl text-white">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold">Quick Attendance</h2>
                    <p className="text-zinc-400 text-base mt-1">Mark attendance for Today, {todayDateFormatted}</p>
                </div>
                
                <div className="space-y-4"> {/* Increased spacing for the new text line */}
                    {staff.map(s => {
                        const attendanceRecord = s.attendance?.[todayKey];
                        const currentStatus = attendanceRecord?.status || 'Not Marked';
                        const styles = statusStyles[currentStatus] || statusStyles.Default;

                        return (
                            <div
                                key={s._id}
                                onClick={() => openModal(s)}
                                className={`flex items-center justify-between p-4 rounded-lg border-l-4 bg-zinc-800/30 border-transparent 
                                            hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 ${styles.border}`}
                            >
                                {/* ✅ නිවැරදි කිරීම: නමට යටින් updated time එක පෙන්වීම */}
                                <div>
                                    <p className="font-medium text-lg text-zinc-100">{s.name}</p>
                                    {attendanceRecord?.updatedAt && (
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Updated {formatRelativeTime(attendanceRecord.updatedAt)}
                                        </p>
                                    )}
                                </div>
                                
                                <span className={`text-sm font-semibold px-3.5 py-1.5 rounded-full self-center ${styles.badge}`}>
                                    {currentStatus}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <AttendanceModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                staffMember={modalState.selectedStaff}
                onUpdateStatus={handleUpdateStatus}
                todayKey={todayKey}
            />
        </>
    );
}