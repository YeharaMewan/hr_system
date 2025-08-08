'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { PlusCircle, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
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
    const { data: session, status } = useSession();
    
    // Show loading while checking session
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-zinc-400">Loading Attendance Dashboard...</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated
    if (status === 'unauthenticated') {
        redirect('/login');
    }

    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedRole, setSelectedRole] = useState('all');
    
    const [editModal, setEditModal] = useState({ isOpen: false, cell: null });
    const [selectUserModal, setSelectUserModal] = useState(false);

    const { year, month, monthName, daysInMonth, changeMonth } = useAttendanceCalendar(new Date());

    const fetchStaffAndAttendance = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                year: year.toString(),
                month: month.toString(),
            });
            
            // Add department filter if not 'all'
            if (selectedDepartment !== 'all') {
                params.append('department', selectedDepartment);
            }
            
            // Add role filter if not 'all'
            if (selectedRole !== 'all') {
                params.append('role', selectedRole);
            }
            
            const res = await fetch(`/api/attendance?${params.toString()}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch attendance data');
            }
            const { data } = await res.json();
            setStaff(data || []); 
        } catch (error) {
            // Error handled silently
            setStaff([]); 
        }
        setIsLoading(false);
    }, [year, month, selectedDepartment, selectedRole]);

    useEffect(() => {
        fetchStaffAndAttendance();
    }, [fetchStaffAndAttendance]);

    // Fetch departments and roles on component mount
    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [deptRes, rolesRes] = await Promise.all([
                    fetch('/api/users/departments'),
                    fetch('/api/users/roles')
                ]);
                
                if (deptRes.ok) {
                    const { data } = await deptRes.json();
                    setDepartments(data || []);
                }
                
                if (rolesRes.ok) {
                    const { data } = await rolesRes.json();
                    setRoles(data || []);
                }
            } catch (error) {
                // Error handled silently
            }
        };
        fetchFiltersData();
    }, []);

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
            // Error handled silently
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

    // නිවැරදි කිරීම: `record.status` ලෙස object එකේ property එකට access කිරීම
    const calculateWorkedDays = (attendance) => {
        if (!attendance) return 0;
        return Object.values(attendance).filter(record => 
            record.status === 'Present' || record.status === 'Work from home' || record.status === 'Work from out of Rise'
        ).length;
    };

    // Role අනුව sort කරන function
    const sortStaffByRole = (staffList) => {
        const roleOrder = { 'hr': 1, 'leader': 2, 'employee': 3 };
        return [...staffList].sort((a, b) => {
            const aOrder = roleOrder[a.role] || 999;
            const bOrder = roleOrder[b.role] || 999;
            
            // Same role වෙලාවේ name අනුව sort කරන්න
            if (aOrder === bOrder) {
                return a.name.localeCompare(b.name);
            }
            
            return aOrder - bOrder;
        });
    };

    // Sorted staff list with group separators
    const sortedStaff = useMemo(() => {
        return sortStaffByRole(staff);
    }, [staff]);

    // Function to check if current user is first in their role group
    const isFirstInRoleGroup = (currentUser, index, staffList) => {
        if (index === 0) return true;
        return staffList[index - 1].role !== currentUser.role;
    };

    // Function to get role group name
    const getRoleGroupName = (role) => {
        const roleNames = {
            'hr': 'HR Team',
            'leader': 'Leadership Team', 
            'employee': 'Employees'
        };
        return roleNames[role] || role;
    };
    
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-xl shadow-2xl text-white font-sans flex flex-col h-[calc(100vh-2rem)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Daily Attendance</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => changeMonth(-1)} className="p-1 rounded-md hover:bg-zinc-700"><ChevronLeft size={20} /></button>
                        <p className="font-semibold w-28 text-center">{monthName} {year}</p>
                        <button onClick={() => changeMonth(1)} className="p-1 rounded-md hover:bg-zinc-700"><ChevronRight size={20} /></button>
                    </div>
                </div>
                
                {/* Filters Container */}
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    {/* Department Filter Dropdown */}
                    <div className="flex flex-col">
                        <label htmlFor="department-filter" className="text-sm font-medium text-zinc-400 mb-1">Department</label>
                        <select 
                            id="department-filter"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm min-w-[150px] focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    {/* Role Filter Dropdown */}
                    <div className="flex flex-col">
                        <label htmlFor="role-filter" className="text-sm font-medium text-zinc-400 mb-1">Role</label>
                        <select 
                            id="role-filter"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm min-w-[120px] focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="all">All Roles</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reset Filters Button */}
                    {(selectedDepartment !== 'all' || selectedRole !== 'all') && (
                        <button
                            onClick={() => {
                                setSelectedDepartment('all');
                                setSelectedRole('all');
                            }}
                            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* ✅ 2. නිවැරදි කිරීම: Button දෙකම එකට පෙන්වීමට div එකක් යෙදීම */}
            <div className="flex items-center gap-3">
                <Link 
                    href="attendance/quickattendance" 
                    className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <Zap size={18} />
                    Quick Mark
                </Link>
            </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading attendance data...</p>
            </div>
          </div>
        ) : (
          sortedStaff.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Table Container with flex-1 and overflow */}
              <div className="flex-1 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600 hover:scrollbar-thumb-zinc-500">
                  <table className="w-full border-collapse">
                    <thead className="bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-30">
                      <tr>
                        <th className="sticky left-0 z-40 bg-zinc-900/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-r border-zinc-700 text-left min-w-[200px]">Employee</th>
                        <th className="sticky left-[200px] z-40 bg-zinc-900/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-r border-zinc-700 text-left min-w-[150px]">Department</th>
                        <th className="sticky left-[350px] z-40 bg-zinc-900/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-r border-zinc-700 text-left min-w-[100px]">Role</th>
                        {[...Array(daysInMonth)].map((_, i) => 
                          <th key={i} className="p-3 text-xs font-semibold border-l border-zinc-700 min-w-[40px] w-[40px] text-center bg-zinc-900/95">
                            {i + 1}
                          </th>
                        )}
                        <th className="sticky right-[80px] z-40 bg-zinc-900/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-l border-zinc-700 min-w-[80px] text-center">Total Days</th>
                        <th className="sticky right-0 z-40 bg-zinc-900/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 uppercase tracking-wider border-l border-zinc-700 min-w-[80px] text-center">Work Days</th>
                      </tr>
                    </thead>
                <tbody className="bg-zinc-900">
                  {sortedStaff.map((user, index) => (
                    <React.Fragment key={user._id}>
                      {/* Role Group Header */}
                      {isFirstInRoleGroup(user, index, sortedStaff) && (
                        <tr className="sticky top-[49px] z-30 bg-zinc-800/95 backdrop-blur-sm border-t-2 border-zinc-600">
                          <td className="sticky left-0 z-40 bg-zinc-800/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 border-r border-zinc-700 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                user.role === 'hr' ? 'bg-purple-500' :
                                user.role === 'leader' ? 'bg-blue-500' :
                                user.role === 'employee' ? 'bg-green-500' :
                                'bg-gray-500'
                              }`}></div>
                              {getRoleGroupName(user.role)}
                            </div>
                          </td>
                          <td className="sticky left-[200px] z-40 bg-zinc-800/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 border-r border-zinc-700 min-w-[150px]"></td>
                          <td className="sticky left-[350px] z-40 bg-zinc-800/95 backdrop-blur-sm p-3 text-sm font-semibold text-zinc-300 border-r border-zinc-700 min-w-[100px]"></td>
                          {[...Array(daysInMonth)].map((_, i) => 
                            <td key={`group-${user.role}-day-${i}`} className="p-3 bg-zinc-800/95 backdrop-blur-sm border-l border-zinc-700 min-w-[40px]"></td>
                          )}
                          <td className="sticky right-[80px] z-40 bg-zinc-800/95 backdrop-blur-sm p-3 border-l border-zinc-700 min-w-[80px]"></td>
                          <td className="sticky right-0 z-40 bg-zinc-800/95 backdrop-blur-sm p-3 border-l border-zinc-700 min-w-[80px]"></td>
                        </tr>
                      )}
                      
                      {/* User Row */}
                      <tr className="border-t border-zinc-700 group hover:bg-zinc-800/30 transition-colors">
                        <td className="sticky left-0 z-10 bg-zinc-900 group-hover:bg-zinc-800/50 p-3 text-sm font-medium border-r border-zinc-700 text-left min-w-[200px]">
                          <div className="truncate">{user.name}</div>
                        </td>
                        <td className="sticky left-[200px] z-10 bg-zinc-900 group-hover:bg-zinc-800/50 p-3 text-sm text-zinc-400 border-r border-zinc-700 text-left min-w-[150px]">
                          <div className="truncate">{user.department || 'N/A'}</div>
                        </td>
                        <td className="sticky left-[350px] z-10 bg-zinc-900 group-hover:bg-zinc-800/50 p-3 text-sm border-r border-zinc-700 text-left min-w-[100px]">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'leader' ? 'bg-blue-500/20 text-blue-300' :
                            user.role === 'hr' ? 'bg-purple-500/20 text-purple-300' :
                            user.role === 'employee' ? 'bg-green-500/20 text-green-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                      {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        
                        // නිවැරදි කිරීම: status object එකෙන් status string එක ලබාගැනීම
                        const attendanceRecord = user.attendance?.[date];
                        const statusString = attendanceRecord?.status || '';
                        
                        const colorClass = statusColors[statusString] || 'hover:bg-zinc-700';
                        
                        return (
                          <td 
                            key={date} 
                            className={`p-2 text-center text-xs border-l border-zinc-700 cursor-pointer transition-colors min-w-[40px] w-[40px] ${colorClass}`} 
                            onClick={() => setEditModal({ isOpen: true, cell: { userId: user._id, date } })}
                          >
                            <div className="truncate">
                              {statusString ? statusString.substring(0, 3) : ''}
                            </div>
                          </td>
                        );
                      })}
                      <td className="sticky right-[80px] z-10 bg-zinc-900 group-hover:bg-zinc-800/50 p-3 text-sm font-medium text-center border-l border-zinc-700 min-w-[80px]">
                        {daysInMonth}
                      </td>
                      <td className="sticky right-0 z-10 bg-zinc-900 group-hover:bg-zinc-800/50 p-3 text-sm font-medium text-center border-l border-zinc-700 min-w-[80px]">
                        {calculateWorkedDays(user.attendance)}
                      </td>
                    </tr>
                    </React.Fragment>
                  ))}
                </tbody>
                  </table>
                </div>
              </div>
              
              {/* Fixed Legend at bottom */}
              <div className="mt-4 border-t border-zinc-700 pt-4 flex-shrink-0 bg-zinc-900">
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
            </div>
          ) : <EmptyState onAdd={() => setSelectUserModal(true)} />
        )}

        <AnimatePresence>
          {editModal.isOpen && <EditAttendanceModal key="edit-modal" cell={editModal.cell} staffList={sortedStaff} onClose={() => setEditModal({ isOpen: false, cell: null })} onUpdate={handleUpdateAttendance} />}
          {selectUserModal && <SelectUserModal key="select-user-modal" onClose={() => setSelectUserModal(false)} onAdd={handleAddUserToSheet} currentStaffIds={sortedStaff.map(s => s._id)} />}
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
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedRole, setSelectedRole] = useState('all');
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [deptRes, rolesRes] = await Promise.all([
                    fetch('/api/users/departments'),
                    fetch('/api/users/roles')
                ]);
                
                if (deptRes.ok) {
                    const { data } = await deptRes.json();
                    setDepartments(data || []);
                }
                
                if (rolesRes.ok) {
                    const { data } = await rolesRes.json();
                    setRoles(data || []);
                }
            } catch (error) {
                // Error handled silently
            }
        };
        fetchFiltersData();
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/users/all');
                const { data } = await res.json();
                let filteredUsers = data.filter(user => !currentStaffIds.includes(user._id));
                
                // Filter by department if selected
                if (selectedDepartment !== 'all') {
                    filteredUsers = filteredUsers.filter(user => user.department === selectedDepartment);
                }
                
                // Filter by role if selected
                if (selectedRole !== 'all') {
                    filteredUsers = filteredUsers.filter(user => user.role === selectedRole);
                }
                
                setAllUsers(filteredUsers);
                if (filteredUsers.length > 0) {
                    setSelectedUserId(filteredUsers[0]._id);
                } else {
                    setSelectedUserId('');
                }
            } catch (error) {
                // Error handled silently
            }
            setIsLoading(false);
        };
        fetchUsers();
    }, [currentStaffIds, selectedDepartment, selectedRole]);

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
                    <h3 className="text-lg font-bold text-white">Add User to Attendance Sheet</h3>
                    <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                </div>
                {isLoading ? (
                    <p>Loading users...</p>
                ) : allUsers.length > 0 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="department-select" className="block text-sm font-medium text-zinc-400 mb-2">Filter by Department</label>
                                <select 
                                    id="department-select"
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white"
                                >
                                    <option value="all">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="role-select" className="block text-sm font-medium text-zinc-400 mb-2">Filter by Role</label>
                                <select 
                                    id="role-select"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white"
                                >
                                    <option value="all">All Roles</option>
                                    {roles.map(role => (
                                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="user-select" className="block text-sm font-medium text-zinc-400 mb-2">Select a User</label>
                            <select 
                                id="user-select"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white"
                            >
                                {allUsers.map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.name} - {user.department || 'No Department'} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold">Cancel</button>
                            <button type="submit" className="py-2 px-4 bg-violet-600 hover:bg-violet-700 rounded-lg font-semibold">Add to Sheet</button>
                        </div>
                    </div>
                ) : (
                    <p className="text-zinc-400">
                        All users 
                        {selectedDepartment !== 'all' && ` in ${selectedDepartment} department`}
                        {selectedRole !== 'all' && ` with ${selectedRole} role`}
                        {(selectedDepartment !== 'all' || selectedRole !== 'all') && ' '}
                        are already on the attendance sheet.
                    </p>
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

function EmptyState({ onAdd }) {
    return (
        <div className="text-center border-2 border-dashed border-zinc-700 rounded-lg p-12 flex-1 flex items-center justify-center">
            <div>
                <h3 className="text-xl font-semibold text-white">No Users Found</h3>
                <p className="text-zinc-400 mt-2 mb-6">Get started by adding your first user.</p>
                <button onClick={onAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-violet-900/40 mx-auto">
                    <PlusCircle size={18} /> Add User
                </button>
            </div>
        </div>
    );
}