'use client'; // Hooks භාවිතා කරන නිසා client component විය යුතුය

import React from 'react';
import { usePathname, useRouter } from 'next/navigation'; // useRouter එකතු කරගන්න
import { Menu, UserCircle, ArrowLeft } from 'lucide-react'; // ArrowLeft icon එකතු කරගන්න

const Header = ({ onMenuButtonClick }) => {
    const router = useRouter(); // router instance එක ලබාගැනීම
    const pathname = usePathname();

    // ✅ නිවැරදි කිරීම: path එක nested ද යන්න පරීක්ෂා කිරීම
    // path එකේ '/' ලකුණු 3කට වඩා ඇත්නම්, එය nested route එකක් ලෙස සලකමු. (e.g., /dashboard/attendance/add)
    const isNestedRoute = pathname.split('/').length > 3;

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

                <div className="flex items-center w-8">
                    <button className="p-2 rounded-full hover:bg-zinc-800" aria-label="User profile">
                        <UserCircle className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;