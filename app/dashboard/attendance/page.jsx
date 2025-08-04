'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const leaveTypes = [
    "Present", "Work from home", "Planned Leave", "Sudden Leave",
    "Medical Leave", "Holiday Leave", "Lieu leave", "Work from out of Rise"
];

const statusColors = {
    "Present": "bg-green-500/20 text-green-300",
    "Work from home": "bg-sky-500/20 text-sky-300",
    "Planned Leave": "bg-yellow-500/20 text-yellow-300",
    "Sudden Leave": "bg-red-500/20 text-red-300",
    "Medical Leave": "bg-pink-500/20 text-pink-300",
    "Holiday Leave": "bg-indigo-500/20 text-indigo-300",
    "Lieu leave": "bg-purple-500/20 text-purple-300",
    "Work from out of Rise": "bg-teal-500/20 text-teal-300",
    "Default": "hover:bg-zinc-700"
};

function useAttendanceCalendar(initialDate) {
    const [currentDate, setCurrentDate] = useState(initialDate);

    const dateInfo = useMemo(() => {
        const d = new Date(currentDate);
        const year = d.getFullYear();
        const month = d.getMonth(); // 0-11 for JS month
        const monthName = d.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        return { year, month, monthName, daysInMonth };
    }, [currentDate]);

    const changeMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    return { ...dateInfo, changeMonth };
}


// =================================================================
// Main Component
// =================================================================
export default function InteractiveAttendance() {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [editModal, setEditModal] = useState({ isOpen: false, cell: null });
    const [selectUserModal, setSelectUserModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null });

    const { year, month, monthName, daysInMonth, changeMonth } = useAttendanceCalendar(new Date());

    const fetchStaffAndAttendance = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/attendance?year=${year}&month=${month}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch attendance data');
            }
            const { data } = await res.json();
            setStaff(data || []); 
        } catch (error) {
            console.error("Error fetching staff:", error);
            setStaff([]); 
        }
        setIsLoading(false);
    }, [year, month]);

    useEffect(() => {
        fetchStaffAndAttendance();
    }, [fetchStaffAndAttendance]);

    const handleUpdateAttendance = async (newStatus, customUserId = null, customDate = null) => {
        const userId = customUserId || editModal.cell?.userId;
        const date = customDate || editModal.cell?.date;
        if (!userId || !date) return;

        const originalStaff = JSON.parse(JSON.stringify(staff)); // Deep copy for reliable rollback

        // නිවැරදි කිරීම: Local state එක update කිරීමේදී API structure එකට ගැලපෙන object එකක් යෙදීම
        const updatedStaffList = staff.map(s => {
            if (s._id === userId) {
                const newAttendance = { ...s.attendance };
                if (newStatus === "" || newStatus === null) {
                    delete newAttendance[date];
                } else {
                    newAttendance[date] = {
                        status: newStatus,
                        updatedAt: new Date().toISOString() // For optimistic UI
                    };
                }
                return { ...s, attendance: newAttendance };
            }
            return s;
        });
        setStaff(updatedStaffList);
        if (editModal.isOpen) setEditModal({ isOpen: false, cell: null });

        try {
            const res = await fetch('/api/attendance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, date, status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update');
            // Optionally, re-fetch or update state with response from API for full consistency
        } catch (error) {
            console.error(error);
            setStaff(originalStaff); // Rollback on failure
        }
    };

    const handleAddUserToSheet = (userId) => {
        if (!userId) return;
        
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        handleUpdateAttendance("Present", userId, todayDateString);
        setSelectUserModal(false);
    };

    const handleDeleteUser = async () => {
        if (deleteModal.userId) {
            const userIdToDelete = deleteModal.userId;
            const originalStaff = [...staff];
            setStaff(staff.filter(s => s._id !== userIdToDelete));
            setDeleteModal({ isOpen: false, userId: null });
            try {
                const res = await fetch(`/api/users/${userIdToDelete}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete user');
            } catch (error) {
                console.error(error);
                setStaff(originalStaff);
            }
        }
    };

    // නිවැරදි කිරීම: `record.status` ලෙස object එකේ property එකට access කිරීම
    const calculateWorkedDays = (attendance) => {
        if (!attendance) return 0;
        return Object.values(attendance).filter(record => 
            record.status === 'Present' || record.status === 'Work from home' || record.status === 'Work from out of Rise'
        ).length;
    };
    
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-xl shadow-2xl text-white font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white">Daily Attendance</h1>
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 rounded-md hover:bg-zinc-700"><ChevronLeft size={20} /></button>
                    <p className="font-semibold w-28 text-center">{monthName} {year}</p>
                    <button onClick={() => changeMonth(1)} className="p-1 rounded-md hover:bg-zinc-700"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* ✅ 2. නිවැරදි කිරීම: Button දෙකම එකට පෙන්වීමට div එකක් යෙදීම */}
            <div className="flex items-center gap-3">
                <Link 
                    href="attendance/quickattendance" 
                    className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <Zap size={18} />
                    Quick Mark
                </Link>
                <button 
                    onClick={() => setSelectUserModal(true)} 
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <PlusCircle size={18} /> Add Employee
                </button>
            </div>
        </div>

        {isLoading ? (
          <div className="text-center p-10">Loading...</div>
        ) : (
          staff.length > 0 ? (
            <div className="overflow-x-auto border border-zinc-700 rounded-lg">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col style={{ minWidth: '200px' }} />
                  <col span={daysInMonth} style={{ width: '50px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                </colgroup>
                <thead className="bg-zinc-900/70 backdrop-blur-sm">
                  <tr>
                    <th className="sticky left-0 z-20 bg-zinc-900 p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-r border-zinc-700 text-left">Employee</th>
                    {[...Array(daysInMonth)].map((_, i) => <th key={i} className="p-3 text-xs font-semibold border-l border-zinc-700">{i + 1}</th>)}
                    <th className="sticky right-[160px] z-20 bg-zinc-900 p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-l border-zinc-700">Total Days</th>
                    <th className="sticky right-[80px] z-20 bg-zinc-900 p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-l border-zinc-700">Work Days</th>
                    <th className="sticky right-0 z-20 bg-zinc-900 p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-l border-zinc-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-zinc-900">
                  {staff.map((user) => (
                    <tr key={user._id} className="border-t border-zinc-700 group">
                      <td className="sticky left-0 z-10 bg-zinc-900 group-hover:bg-zinc-800 p-3 text-sm font-medium whitespace-nowrap border-r border-zinc-700 text-left">{user.name}</td>
                      {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        
                        // නිවැරදි කිරීම: status object එකෙන් status string එක ලබාගැනීම
                        const attendanceRecord = user.attendance?.[date];
                        const statusString = attendanceRecord?.status || '';
                        
                        const colorClass = statusColors[statusString] || 'hover:bg-zinc-700';
                        
                        return (
                          <td key={date} className={`p-2 text-center text-xs border-l border-zinc-700 cursor-pointer transition-colors ${colorClass}`} onClick={() => setEditModal({ isOpen: true, cell: { userId: user._id, date } })}>
                            {statusString.substring(0, 3)}
                          </td>
                        );
                      })}
                      <td className="sticky right-[160px] z-10 bg-zinc-900 group-hover:bg-zinc-800 p-3 text-sm font-medium text-center border-l border-zinc-700">{daysInMonth}</td>
                      <td className="sticky right-[80px] z-10 bg-zinc-900 group-hover:bg-zinc-800 p-3 text-sm font-medium text-center border-l border-zinc-700">{calculateWorkedDays(user.attendance)}</td>
                      <td className="sticky right-0 z-10 bg-zinc-900 group-hover:bg-zinc-800 p-3 text-center border-l border-zinc-700">
                        <button onClick={() => setDeleteModal({ isOpen: true, userId: user._id })} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-700 rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState onAdd={() => setSelectUserModal(true)} />
        )}
        
        <AttendanceLegend />

        <AnimatePresence>
          {editModal.isOpen && <EditAttendanceModal key="edit-modal" cell={editModal.cell} staffList={staff} onClose={() => setEditModal({ isOpen: false, cell: null })} onUpdate={handleUpdateAttendance} />}
          {selectUserModal && <SelectUserModal key="select-user-modal" onClose={() => setSelectUserModal(false)} onAdd={handleAddUserToSheet} currentStaffIds={staff.map(s => s._id)} />}
          {deleteModal.isOpen && <ConfirmDeleteModal key="delete-modal" onClose={() => setDeleteModal({ isOpen: false, userId: null })} onConfirm={handleDeleteUser} />}
        </AnimatePresence>
      </div>
    );
}

// =================================================================
// Sub-Components
// =================================================================

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
};

function SelectUserModal({ onClose, onAdd, currentStaffIds }) {
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                // ⭐ වෙනස්කම: Leaders පමණක් fetch කරන API route එක භාවිතා කරන්න
                const res = await fetch('/api/users/leaders');
                const { data } = await res.json();
                const availableUsers = data.filter(user => !currentStaffIds.includes(user._id));
                setAllUsers(availableUsers);
                if (availableUsers.length > 0) {
                    setSelectedUserId(availableUsers[0]._id);
                }
            } catch (error) {
                console.error("Failed to fetch leaders", error);
            }
            setIsLoading(false);
        };
        fetchUsers();
    }, [currentStaffIds]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedUserId) {
            onAdd(selectedUserId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleSubmit} variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Add Leader to Attendance Sheet</h3>
                    <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                </div>
                {isLoading ? (
                    <p>Loading leaders...</p>
                ) : allUsers.length > 0 ? (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="user-select" className="block text-sm font-medium text-zinc-400 mb-2">Select a Leader</label>
                            <select 
                                id="user-select"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white"
                            >
                                {allUsers.map(user => (
                                    <option key={user._id} value={user._id}>{user.name} (Leader)</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold">Cancel</button>
                            <button type="submit" className="py-2 px-4 bg-violet-600 hover:bg-violet-700 rounded-lg font-semibold">Add to Sheet</button>
                        </div>
                    </div>
                ) : (
                    <p className="text-zinc-400">All leaders are already on the attendance sheet.</p>
                )}
            </motion.form>
        </div>
    );
}

function EditAttendanceModal({ cell, staffList, onClose, onUpdate }) {
    if (!cell) return null;
    const staffMember = staffList.find(s => s._id === cell.userId);
    
    // නිවැරදි කිරීම: status object එකෙන් status string එක ලබාගැනීම
    const currentStatus = staffMember?.attendance?.[cell.date]?.status || "";

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
             <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-white">Update Attendance</h3>
                     <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                 </div>
                 <div className="space-y-4">
                     <p><span className="font-semibold text-zinc-400">Employee:</span> <span className="text-white">{staffMember?.name}</span></p>
                     <p><span className="font-semibold text-zinc-400">Date:</span> <span className="text-white">{new Date(cell.date).toLocaleDateString('en-CA')}</span></p>
                     <div>
                         <label htmlFor="status-select" className="block text-sm font-medium text-zinc-400 mb-2">Status</label>
                         <select id="status-select" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500" onChange={(e) => onUpdate(e.target.value)} defaultValue={currentStatus}>
                             <option value="">- Select -</option>
                             {leaveTypes.map(type => <option key={type} value={type}>{type}</option>)}
                         </select>
                     </div>
                 </div>
             </motion.div>
        </div>
    );
}

function ConfirmDeleteModal({ onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                <h3 className="text-lg font-bold text-white">Are you sure?</h3>
                <p className="text-zinc-400 my-2">This will permanently delete the user and all their attendance data.</p>
                <div className="flex justify-center gap-3 pt-4">
                    <button onClick={onClose} className="py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold w-24">Cancel</button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold w-24">Delete</button>
                </div>
            </motion.div>
        </div>
    );
}

function EmptyState({ onAdd }) {
    return (
        <div className="text-center border-2 border-dashed border-zinc-700 rounded-lg p-12">
            <h3 className="text-xl font-semibold text-white">No Employees Found</h3>
            <p className="text-zinc-400 mt-2 mb-6">Get started by adding your first team member.</p>
            <button onClick={onAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-violet-900/40 mx-auto">
                <PlusCircle size={18} /> Add Employee
            </button>
        </div>
    );
}

function AttendanceLegend() {
    return (
        <div className="mt-6 border-t border-zinc-700 pt-4">
            <h4 className="text-md font-semibold text-zinc-300 mb-3">Legend</h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {leaveTypes.map(type => {
                    const colorClass = statusColors[type];
                    if (!colorClass) return null;
                    const bgColor = colorClass.split(' ')[0];
                    return (
                        <div key={type} className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-sm ${bgColor}`}></div>
                            <span className="text-xs text-zinc-400">{type}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}