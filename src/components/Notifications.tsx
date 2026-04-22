import React, { Fragment, useState, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { stashNotificationFocus } from '../utils/notificationFocus';

interface Notification {
    _id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
    relatedId?: string;
    onModel?: 'Payment' | 'MaintenanceRequest' | 'User' | 'Announcement';
}

function targetPageForNotification(n: Notification, role: string | undefined): string | null {
    const model = n.onModel;
    const hasRef = Boolean(n.relatedId);

    if (!model) {
        return null;
    }

    switch (model) {
        case 'Payment':
            if (role === 'admin' || role === 'manager' || role === 'student') {
                return 'payments';
            }
            return 'dashboard';
        case 'MaintenanceRequest':
            if (role === 'admin' || role === 'manager' || role === 'staff' || role === 'student') {
                return 'maintenance';
            }
            return null;
        case 'User':
            if (role === 'admin' || role === 'manager' || role === 'staff') {
                return 'students';
            }
            if (role === 'student') {
                return 'profile';
            }
            return 'dashboard';
        case 'Announcement':
            if (role === 'admin' || role === 'manager' || role === 'student') {
                return 'announcements';
            }
            return 'dashboard';
        default:
            return null;
    }
}

interface NotificationsProps {
    onNavigate: (page: string) => void;
}

export default function Notifications({ onNavigate }: NotificationsProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user } = useAuth();

    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data);
            setUnreadCount(data.filter((n: Notification) => !n.read).length);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read', error);
        }
    };

    const markAllRead = async () => {
        try {
            await axios.put('/api/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all read', error);
        }
    };

    const handleItemClick = async (
        notification: Notification,
        close: () => void,
    ) => {
        if (!notification.read) {
            await markAsRead(notification._id);
        }

        const page = targetPageForNotification(notification, user?.role);
        if (
            page &&
            notification.relatedId &&
            notification.onModel &&
            ((notification.onModel === 'Payment' && page === 'payments') ||
                (notification.onModel === 'MaintenanceRequest' && page === 'maintenance'))
        ) {
            stashNotificationFocus({
                onModel: notification.onModel,
                relatedId: String(notification.relatedId),
            });
        }

        if (page) {
            onNavigate(page);
        }
        close();
    };

    return (
        <Popover className="relative">
            {({ open, close }) => (
                <>
                    <Popover.Button
                        className={`
                group inline-flex items-center rounded-md p-2 text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 relative
                ${open ? 'text-gray-900' : 'text-gray-500'}
            `}
                        aria-expanded={open}
                    >
                        <Bell className="h-6 w-6" aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                        )}
                    </Popover.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute right-0 z-50 mt-3 w-80 max-w-sm transform px-4 sm:px-0 lg:max-w-3xl">
                            <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                                <div className="bg-white p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAllRead();
                                                }}
                                                className="text-xs text-[#001F3F] hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {notifications.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">No notifications</p>
                                        ) : (
                                            notifications.map((notification) => {
                                                const navigable = Boolean(
                                                    targetPageForNotification(notification, user?.role),
                                                );
                                                return (
                                                    <button
                                                        type="button"
                                                        key={notification._id}
                                                        onClick={() => handleItemClick(notification, close)}
                                                        className={`w-full text-left p-3 rounded-md text-sm transition-colors border border-transparent
                                                            ${notification.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}
                                                            ${navigable ? 'cursor-pointer ring-1 ring-gray-100 hover:ring-[#001F3F]/20' : 'cursor-default opacity-90'}
                                                        `}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p
                                                                    className={`font-medium ${notification.type === 'error' ? 'text-red-700' : 'text-gray-900'}`}
                                                                >
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                                                </p>
                                                            </div>
                                                            {navigable && (
                                                                <ChevronRight
                                                                    className="w-4 h-4 shrink-0 text-[#001F3F]/60 mt-0.5"
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </div>
                                                        {navigable && (
                                                            <p className="text-[10px] text-[#001F3F]/70 mt-1.5 font-medium uppercase tracking-wide">
                                                                Open related page
                                                            </p>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}
