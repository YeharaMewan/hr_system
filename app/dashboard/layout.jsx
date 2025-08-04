'use client'; 

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar'; 
import Header from '../components/Header'; 

export default function DashboardLayout({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Sidebar එක toggle කිරීමේ function එක
    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    return (
        // ප්‍රධාන පසුබිම තද වර්ණයකට වෙනස් කිරීම (login page එකට ගැලපෙන සේ)
        <div className="bg-zinc-950 text-white min-h-screen">
            
            {/* Sidebar component එකට props යැවීම */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="md:ml-64 transition-all duration-300 ease-in-out">
                {/* Mobile වලදී Sidebar open වූ විට පෙන්වන Overlay එක */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"
                        onClick={toggleSidebar}
                    ></div>
                )}
                
                {/* Header component එකට menu button click event එක යැවීම */}
                <Header onMenuButtonClick={toggleSidebar} />
                
                {/* page.jsx හි අන්තර්ගතය මෙම main tag එක තුලට පැමිණේ */}
                <main className="p-4 md:p-6 lg:p-8">
                    {children} 
                </main>
            </div>
        </div>
    );
}