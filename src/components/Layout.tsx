import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  PhilippinePeso,
  Wrench,
  Clock,
  Calendar,
  Megaphone,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShieldCheck,
  BedDouble,
  UserCheck,
  Settings as SettingsIcon
} from 'lucide-react';
import Notifications from './Notifications';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payments', label: 'Payments', icon: PhilippinePeso },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'tasks', label: 'Task', icon: Calendar },
    { id: 'rooms', label: 'Room', icon: BedDouble },
    { id: 'students', label: 'User', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'logs', label: 'System Logs', icon: ShieldCheck },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    ...(user?.role === 'admin' ? [{ id: 'settings', label: 'Settings', icon: SettingsIcon }] : [])
  ];

  const studentMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payments', label: 'My Payments', icon: PhilippinePeso },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'tasks', label: 'Task', icon: Calendar },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const staffMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'tasks', label: 'Task', icon: Calendar },
    { id: 'rooms', label: 'Room', icon: BedDouble },
    { id: 'students', label: 'User', icon: Users },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const menuItems = (user?.role === 'admin' || user?.role === 'manager') ? adminMenuItems : (user?.role === 'staff' ? staffMenuItems : studentMenuItems);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-[#001F3F] text-white fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-[#FFD700]">DormSync</h1>
          <p className="text-sm text-white/70 mt-1">Management System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${isActive
                  ? 'bg-[#FFD700] text-[#001F3F]'
                  : 'text-white/80 hover:bg-white/10'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => onNavigate('profile')}
            className="w-full px-4 py-2 mb-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#FFD700] text-[#001F3F] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm text-white/90">{user?.name}</p>
                <p className="text-xs text-white/60 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#001F3F] text-white flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h1 className="text-[#FFD700]">DormSync</h1>
                <p className="text-sm text-white/70 mt-1">Management System</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white/80">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${isActive
                      ? 'bg-[#FFD700] text-[#001F3F]'
                      : 'text-white/80 hover:bg-white/10'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => { onNavigate('profile'); setSidebarOpen(false); }}
                className="w-full px-4 py-2 mb-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#FFD700] text-[#001F3F] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm text-white/90">{user?.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-[#001F3F] capitalize">
                {menuItems.find(item => item.id === currentPage)?.label || currentPage.replace('-', ' ')}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Notifications onNavigate={onNavigate} />
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <span>{new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}