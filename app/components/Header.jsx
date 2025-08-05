'use client'; // Hooks භාවිතා කරන නිසා client component විය යුතුය

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // useRouter එකතු කරගන්න
import { useSession, signOut } from 'next-auth/react';
import { Menu, UserCircle, ArrowLeft, ChevronDown, User, Mail, Shield, LogOut } from 'lucide-react'; // නව icons එකතු කරගන්න

const Header = ({ onMenuButtonClick }) => {
    const router = useRouter(); // router instance එක ලබාගැනීම
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // ✅ නිවැරදි කිරීම: path එක nested ද යන්න පරීක්ෂා කිරීම
    // path එකේ '/' ලකුණු 3කට වඩා ඇත්නම්, එය nested route එකක් ලෙස සලකමු. (e.g., /dashboard/attendance/add)
    const isNestedRoute = pathname.split('/').length > 3;

    // Dropdown එක පිටතින් click කරන විට close කිරීම
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        signOut({ 
            callbackUrl: '/login',
            redirect: true 
        });
        setIsDropdownOpen(false);
    };

    // Role එක සිංහලෙන් පෙන්වීම
    const getRoleDisplay = (role) => {
        switch(role) {
            case 'hr': return 'HR Manager';
            case 'leader': return 'Team Leader';
            case 'labour': return 'Labour';
            default: return role;
        }
    };

    return (
        <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-50">
            <div className="flex items-center justify-between">
                
                <div className="w-8"> {/* වම්පස icon එක සඳහා ඉඩක් තබාගැනීම */}
                    {isNestedRoute ? (
                        // ✅ නිවැරදි කිරීම: Nested route එකකදී Back Button එක පෙන්වීම
                        <button
                            onClick={() => router.back()} // පෙර පිටුවට යාමට
                            className="text-zinc-400 hover:text-white transition-colors"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    ) : (
                        // ✅ නිවැරදි කිරීම: Base route එකකදී Menu Button එක පෙන්වීම
                        <>
                            <button
                                onClick={onMenuButtonClick}
                                className="md:hidden text-zinc-400 hover:text-white transition-colors"
                                aria-label="Open sidebar"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            {/* Desktop වලදී හිස්තැනක් පිරවීමට */}
                            <div className="hidden md:block w-6"></div>
                        </>
                    )}
                </div>

                <h1 className="text-xl font-semibold text-white">
                    Dashboard
                </h1>

                <div className="flex items-center relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 p-2 rounded-full hover:bg-zinc-800 transition-colors" 
                        aria-label="User profile"
                    >
                        <UserCircle className="w-6 h-6 text-zinc-400" />
                        {session?.user && (
                            <>
                                <span className="hidden sm:block text-sm text-zinc-300">
                                    {session.user.name}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </>
                        )}
                    </button>

                    {/* User Dropdown */}
                    {isDropdownOpen && session?.user && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50">
                            <div className="p-4 border-b border-zinc-700">
                                <div className="flex items-center gap-3">
                                    <UserCircle className="w-10 h-10 text-zinc-400" />
                                    <div>
                                        <p className="text-white font-medium">{session.user.name}</p>
                                        <p className="text-zinc-400 text-sm">{getRoleDisplay(session.user.role)}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-2">
                                <div className="px-3 py-2 text-sm">
                                    <div className="flex items-center gap-2 text-zinc-300 mb-2">
                                        <Mail className="w-4 h-4" />
                                        <span className="break-all">{session.user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-300 mb-2">
                                        <Shield className="w-4 h-4" />
                                        <span>{getRoleDisplay(session.user.role)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-300">
                                        <User className="w-4 h-4" />
                                        <span>ID: {session.user.id?.slice(-6) || 'N/A'}</span>
                                    </div>
                                </div>
                                
                                <hr className="border-zinc-700 my-2" />
                                
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 rounded-md transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;