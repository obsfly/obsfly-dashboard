'use client';


import { Sidebar } from './Sidebar';
import { useState, useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Listen for sidebar state changes
        const handleStorageChange = () => {
            const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
            setSidebarCollapsed(collapsed);
        };

        // Initial check
        handleStorageChange();

        // Listen for changes
        window.addEventListener('storage', handleStorageChange);

        // Custom event for same-window updates
        window.addEventListener('sidebar-toggle', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('sidebar-toggle', handleStorageChange);
        };
    }, []);

    return (
        <div className="flex">
            <Sidebar />
            <div
                className={`flex-1 min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'
                    }`}
            >
                {children}
            </div>
        </div>
    );
}
