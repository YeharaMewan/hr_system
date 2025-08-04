// app/task-allocation/layout.jsx
'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function TaskAllocationLayout({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    return (
        <div className="bg-zinc-950 text-white min-h-screen">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="md:ml-64 transition-all duration-300 ease-in-out">
                {/* Mobile වලදී Sidebar open වූ විට පෙන්වන Overlay එක */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                        onClick={toggleSidebar}
                    ></div>
                )}
                
                {/* Header component එකට menu button click event එක යැවීම */}
                <Header onMenuButtonClick={toggleSidebar} />
                
                {/* Task allocation page එකේ අන්තර්ගතය */}
                <main className="p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}