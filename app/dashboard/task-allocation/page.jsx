// app/task-allocation/page.jsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import TaskAllocationDashboard from '../../components/TaskAllocationDashboard';

export default function TaskAllocationPage() {
  const { data: session, status } = useSession();

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading Task Allocation...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Only allow HR users
  if (session?.user?.role !== 'hr') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-900/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-3xl">🚫</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4 text-white">Access Denied</h1>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            You need HR privileges to access the Task Allocation Dashboard. 
            Please contact your administrator if you believe this is an error.
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TaskAllocationDashboard />;
}