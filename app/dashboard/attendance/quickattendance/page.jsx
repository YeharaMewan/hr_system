'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuickAttendanceToday from '@/app/components/QuickAttendanceToday'; 

// Loading State Component
const LoadingState = () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-zinc-400">Loading Quick Attendance...</p>
        </div>
    </div>
);

// Unauthorized State Component
const UnauthorizedState = ({ onSignIn }) => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/10">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
            </div>
            <p className="text-zinc-400">Please log in to access the quick attendance dashboard</p>
            <button 
                onClick={onSignIn}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
                Sign In
            </button>
        </div>
    </div>
);

export default function quickattendancePage() {
    const {  session, status } = useSession();
    const router = useRouter();
    
    // --- සියලුම useState ඉහළින්, return කිරීමට පෙර ---
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const fetchStaffAndAttendance = useCallback(async () => {
        if (status !== 'authenticated' || !session) {
            setIsLoading(false);
            return;
        }
        
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
            setStaff([]);
        }
        setIsLoading(false);
    }, [year, month, status, session]);

    useEffect(() => {
        if (status === 'authenticated' && session) {
            fetchStaffAndAttendance();
        }
    }, [fetchStaffAndAttendance, status, session]);

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
            // සාර්ථක යාවත්කාලීන කිරීම, optimistic update එක වලංගුයි
        } catch (error) {
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
            setStaff(originalStaff);
        }
    };

    // Handle authentication states AFTER all hooks are declared
    if (status === 'loading') {
        return <LoadingState />;
    }
    
    if (status === 'unauthenticated') {
        return <UnauthorizedState onSignIn={() => signIn()} />;
    }

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