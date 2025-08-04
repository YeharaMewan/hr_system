'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QuickAttendanceToday from '@/app/components/QuickAttendanceToday'; 

export default function quickattendancePage() {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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

    // ✅ නිවැරදි කරන ලද සම්පූර්ණ ශ්‍රිතය
    const handleUpdateAttendance = async (userId, date, newStatus) => {
        if (!userId || !date) return;
        
        // Deep copy for a reliable rollback on API failure
        const originalStaff = JSON.parse(JSON.stringify(staff));

        // --- Optimistic UI Update ---
        // නිවැරදි කිරීම: Local state එක update කිරීමේදී API structure එකට ගැලපෙන object එකක් යෙදීම
        const updatedStaffList = staff.map(s => {
            if (s._id === userId) {
                const newAttendance = { ...s.attendance };
                
                if (newStatus === "" || newStatus === null) {
                    // Status එක ඉවත් කරනවා නම්, attendance object එකෙන් එම date key එක ඉවත් කරන්න
                    delete newAttendance[date];
                } else {
                    // Status එකක් යොදනවා නම්, object එකක් ලෙස යොදන්න
                    newAttendance[date] = {
                        status: newStatus,
                        // Optimistic update එක සඳහා වත්මන් වේලාව යොදමු
                        updatedAt: new Date().toISOString(),
                        // පවතින record එකක් නම්, පැරණි createdAt එකම තබාගන්න. නැත්නම් අලුතින් යොදන්න.
                        createdAt: s.attendance?.[date]?.createdAt || new Date().toISOString()
                    };
                }
                return { ...s, attendance: newAttendance };
            }
            return s;
        });
        setStaff(updatedStaffList);

        // --- API Call ---
        try {
            const res = await fetch('/api/attendance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, date, status: newStatus }),
            });
            if (!res.ok) {
                // API එක fail වුවහොත්, state එක පෙර තිබූ තත්වයට පත් කරන්න
                setStaff(originalStaff);
                throw new Error('Failed to update attendance');
            }
            // සාර්ථක නම්, නැවත fetch කිරීමක් අවශ්‍ය නැත. optimistic update එක නිවැරදියි.
            // නමුත් අවශ්‍ය නම්, response එකෙන් ලැබෙන data වලින් state එක නැවත update කල හැක.
        } catch (error) {
            console.error(error);
            setStaff(originalStaff); // Revert on failure
        }
    };
    
    const handleDeleteUser = async (userId) => {
        if (!userId) return;
        
        const originalStaff = [...staff];
        setStaff(staff.filter(s => s._id !== userId));

        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete user');
        } catch (error) {
            console.error(error);
            setStaff(originalStaff);
        }
    };

    return (
        <div className="space-y-8">
            <QuickAttendanceToday
                staff={staff}
                isLoading={isLoading}
                onUpdateAttendance={handleUpdateAttendance}
            />
        </div>
    );
}