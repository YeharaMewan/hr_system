'use client'; 

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { LayoutDashboard, Users, Settings, LogOut, Zap, ClipboardList, UserCheck, Calendar, BarChart3 } from 'lucide-react'; // නව icons එකතු කරගන්න

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const pathname = usePathname();

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
        
        { 
            name: 'Task Allocation', 
            href: '/dashboard/daily-task-allocation', 
            icon: ClipboardList,
        },
        { 
            name: 'Labour Allocation', 
            href: '/dashboard/daily-labour-allocation', 
            icon: Users,
        },
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
            suppressHydrationWarning={true}
        >
            <div className="flex flex-col h-full" suppressHydrationWarning={true}>
                <div className="flex items-center justify-center h-20 border-b border-zinc-800" suppressHydrationWarning={true}>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Image src="/RiseHRLogo.png" alt="Rise HR Logo" width={120} height={120} />
                    </Link>
                </div>

                <nav className="flex-grow px-3 py-4 overflow-y-auto">
                    <ul className="space-y-2 font-medium">
                        {navLinks.map((link) => {
                            // ✅ නිවැරදි කිරීම: Dashboard exact match, අනිත් routes සඳහා startsWith
                            const isActive = link.href === '/dashboard' 
                                ? pathname === '/dashboard'
                                : pathname.startsWith(link.href);
                            
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
                                        <span className="ms-3 flex-1">{link.name}</span>
                                        {link.badge && (
                                            <span className={`
                                                px-2 py-1 text-xs font-medium rounded-full
                                                ${isActive 
                                                    ? 'bg-violet-800 text-violet-200' 
                                                    : 'bg-zinc-700 text-zinc-300 group-hover:bg-zinc-600'
                                                }
                                            `}>
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="px-3 py-4 mt-auto border-t border-zinc-800" suppressHydrationWarning={true}>
                    <button 
                        onClick={() => signOut({ 
                            callbackUrl: '/login',
                            redirect: true 
                        })}
                        className="w-full flex items-center p-2 rounded-lg group text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                        <span className="ms-3">Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;