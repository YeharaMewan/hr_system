'use client'; 

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, Users, Settings, LogOut, Zap } from 'lucide-react'; // Zap icon එකත් එකතු කරගමු

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const pathname = usePathname();

    const navLinks = [
        { name: 'Attendance', href: '/dashboard/attendance', icon: LayoutDashboard },
        { name: 'Users', href: '/dashboard/users', icon: Users },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <aside
            className={`
                fixed top-0 left-0 z-40 w-64 h-screen bg-zinc-900 md:border-r border-zinc-800
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}
            aria-label="Sidebar"
        >
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-center h-20 border-b border-zinc-800">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Image src="/RiseHRLogo.png" alt="Rise HR Logo" width={120} height={120} />
                    </Link>
                </div>

                <nav className="flex-grow px-3 py-4 overflow-y-auto">
                    <ul className="space-y-2 font-medium">
                        {navLinks.map((link) => {
                            // ✅ නිවැරදි කිරීම: '===' වෙනුවට 'startsWith' භාවිතා කිරීම
                            const isActive = pathname.startsWith(link.href);
                            
                            return (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        onClick={toggleSidebar}
                                        className={`
                                            flex items-center p-2 rounded-lg group transition-colors
                                            ${isActive
                                                ? 'bg-violet-600 text-white shadow-lg'
                                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                            }
                                        `}
                                    >
                                        <link.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`} />
                                        <span className="ms-3">{link.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="px-3 py-4 mt-auto border-t border-zinc-800">
                    <button className="w-full flex items-center p-2 rounded-lg group text-zinc-400 hover:bg-zinc-800 hover:text-white">
                        <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                        <span className="ms-3">Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;