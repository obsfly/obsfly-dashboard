'use client';

import { LayoutDashboard, Server, Activity, FileText, Shield, Bell, Settings, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Infrastructure', icon: Server, href: '/infrastructure' },
    { name: 'APM', icon: Activity, href: '/apm' },
    { name: 'Logs', icon: FileText, href: '/logs' },
    { name: 'Runtime Security', icon: Shield, href: '/security', badge: 'Soon' },
    { name: 'Alerts', icon: Bell, href: '/alerts' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('sidebar-collapsed');
        if (stored) {
            setCollapsed(stored === 'true');
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        if (mounted) {
            localStorage.setItem('sidebar-collapsed', String(newState));
            window.dispatchEvent(new Event('sidebar-toggle'));
        }
    };

    return (
        <div
            className={`h-screen bg-gray-900 dark:bg-gray-900 light:bg-white border-r border-gray-800 dark:border-gray-800 light:border-gray-200 flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-56'
                }`}
        >
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white dark:text-white light:text-gray-900">ObsFly</span>
                    </div>
                )}
                <button
                    onClick={toggleCollapse}
                    className="p-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-gray-100 text-gray-400 dark:text-gray-400 light:text-gray-600 transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            <nav className="flex-1 px-2 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600/10 text-blue-400'
                                    : 'text-gray-400 dark:text-gray-400 light:text-gray-600 hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-gray-100 hover:text-gray-200 dark:hover:text-gray-200 light:hover:text-gray-900'
                                }`}
                            title={collapsed ? item.name : undefined}
                        >
                            <div className="flex items-center space-x-3">
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
                            </div>
                            {!collapsed && item.badge && (
                                <span className="px-2 py-0.5 text-xs bg-gray-800 dark:bg-gray-800 light:bg-gray-200 text-gray-400 dark:text-gray-400 light:text-gray-600 rounded-full border border-gray-700 dark:border-gray-700 light:border-gray-300">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-2 border-t border-gray-800 dark:border-gray-800 light:border-gray-200 space-y-1">
                {/* Theme Toggle - only render when mounted (client-side) */}
                {mounted && (
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 text-gray-400 dark:text-gray-400 light:text-gray-600 hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-gray-100 hover:text-gray-200 dark:hover:text-gray-200 light:hover:text-gray-900 rounded-lg transition-colors`}
                        title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-4 h-4 flex-shrink-0 text-yellow-400" />
                        ) : (
                            <Moon className="w-4 h-4 flex-shrink-0 text-gray-700" />
                        )}
                        {!collapsed && <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>
                )}

                {/* Settings */}
                <Link
                    href="/settings"
                    className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 text-gray-400 dark:text-gray-400 light:text-gray-600 hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-gray-100 hover:text-gray-200 dark:hover:text-gray-200 light:hover:text-gray-900 rounded-lg transition-colors`}
                    title={collapsed ? 'Settings' : undefined}
                >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="font-medium text-sm">Settings</span>}
                </Link>
            </div>
        </div>
    );
}
