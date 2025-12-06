'use client';

import { LayoutDashboard, Server, Activity, FileText, Shield, Bell, Settings, ChevronLeft, ChevronRight, Sun, Moon, Gauge, BarChart3, Route, Flame, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface SubMenuItem {
    name: string;
    icon: LucideIcon;
    href: string;
}

interface MenuItem {
    name: string;
    icon: LucideIcon;
    href: string;
    badge?: string;
    subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Custom Dashboard', icon: Gauge, href: '/custom-dashboard' },
    { name: 'Infrastructure', icon: Server, href: '/infrastructure' },
    {
        name: 'APM',
        icon: Activity,
        href: '/apm',
        subItems: [
            { name: 'Logs', icon: FileText, href: '/logs' },
            { name: 'Traces', icon: Route, href: '/traces' },
            { name: 'Metrics', icon: BarChart3, href: '/metrics' },
            { name: 'Profiling', icon: Flame, href: '/profiling' },
        ]
    },
    { name: 'Logs', icon: FileText, href: '/logs' },
    { name: 'Runtime Security', icon: Shield, href: '/security', badge: 'Soon' },
    { name: 'Alerts', icon: Bell, href: '/alerts' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();
    // const theme: string = 'light'; // temporary mock
    // const setTheme = (_t: string) => { }; // temporary mock

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div
            className={`h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-56'
                }`}
        >
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">ObsFly</span>
                    </div>
                )}
                <button
                    onClick={toggleCollapse}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            <nav className="flex-1 px-2 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isHovered = hoveredItem === item.name;

                    return (
                        <div
                            key={item.name}
                            className="relative"
                            onMouseEnter={() => setHoveredItem(item.name)}
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            <Link
                                href={item.href}
                                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600/10 text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                title={collapsed ? item.name : undefined}
                            >
                                <div className="flex items-center space-x-3">
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
                                </div>
                                {!collapsed && item.badge && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-300 dark:border-gray-700">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>

                            {/* Dropdown for sub-items */}
                            {hasSubItems && isHovered && (
                                <div
                                    className={`absolute ${collapsed ? 'left-full top-0 ml-2' : 'left-0 top-full mt-1'
                                        } bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px] z-50`}
                                >
                                    {item.subItems!.map((subItem) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                            <Link
                                                key={subItem.name}
                                                href={subItem.href}
                                                className={`flex items-center space-x-3 px-4 py-2 transition-colors ${isSubActive
                                                    ? 'bg-blue-600/10 text-blue-400'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                                                    }`}
                                            >
                                                <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                                <span className="font-medium text-sm">{subItem.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                {/* Theme Toggle - only render when mounted (client-side) */}
                {mounted && (
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg transition-colors`}
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
                    className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg transition-colors`}
                    title={collapsed ? 'Settings' : undefined}
                >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="font-medium text-sm">Settings</span>}
                </Link>
            </div>
        </div>
    );
}
