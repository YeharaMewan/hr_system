// app/dashboard/daily-task-allocation/page.jsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DailyTaskAllocationDashboard from '@/app/components/DailyTaskAllocationDashboard';

export default function DailyTaskAllocationPage() {
  const { data: session, status } = useSession();

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading Task Allocation Dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  return <DailyTaskAllocationDashboard />;
}
