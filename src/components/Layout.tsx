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
  Settings as SettingsIcon,
  Ticket
} from 'lucide-react';
import Notifications from './Notifications';
import { FeedbackModal } from './FeedbackModal';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [fabExpanded, setFabExpanded] = useState(false);
  const [showLogoutFeedback, setShowLogoutFeedback] = useState(false);

  const handleLogoutClick = () => {
    if (user?.role === 'student') {
      setShowLogoutFeedback(true);
    } else {
      executeLogout();
    }
  };

  const executeLogout = () => {
    setShowLogoutFeedback(false);
    logout();
  };

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payments', label: 'Payments', icon: PhilippinePeso },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'passes', label: 'Passes', icon: Ticket },
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
    { id: 'passes', label: 'Passes', icon: Ticket },
    { id: 'tasks', label: 'Task', icon: Calendar },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const staffMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'passes', label: 'Passes', icon: Ticket },
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
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {/* Mobile Sidebar logic removed in favor of FAB menu */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* FAB removed from here */}
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
      {/* Mobile FAB Menu */}
      <div className="md:hidden">
        {/* Backdrop */}
        {fabExpanded && (
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 transition-all duration-300"
            onClick={() => setFabExpanded(false)}
          />
        )}

        {/* Menu Items Stack */}
        <div
          className={`fixed bottom-24 right-6 flex flex-col items-end gap-3 z-50 transition-all duration-300 ${fabExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            }`}
        >
          {/* Profile Option in FAB */}
          <button
            onClick={() => {
              onNavigate('profile');
              setFabExpanded(false);
            }}
            className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${currentPage === 'profile'
              ? 'bg-[#FFD700] text-[#001F3F] font-bold'
              : 'bg-[#001F3F] text-white'
              }`}
            style={{ transitionDelay: '0ms' }}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-sm whitespace-nowrap">Profile</span>
          </button>

          {/* Regular Menu Items */}
          {[...menuItems].reverse().map((item, index) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setFabExpanded(false);
                }}
                className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${isActive
                  ? 'bg-[#FFD700] text-[#001F3F] font-bold'
                  : 'bg-[#001F3F] text-white'
                  }`}
                style={{ transitionDelay: `${(index + 1) * 40}ms` }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}

          {/* Logout Option in FAB */}
          <button
            onClick={() => {
              setFabExpanded(false);
              handleLogoutClick();
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 bg-gray-600 text-white"
            style={{ transitionDelay: `${(menuItems.length + 2) * 40}ms` }}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm whitespace-nowrap">Logout</span>
          </button>
        </div>

        {/* Main FAB Toggle */}
        <button
          onClick={() => setFabExpanded(!fabExpanded)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 transition-all duration-300 border-2 ${fabExpanded
            ? 'bg-[#C84C3E] border-[#C84C3E] text-white rotate-90 scale-110'
            : 'bg-[#001F3F] border-[#FFD700]/20 text-[#FFD700] hover:scale-110'
            }`}
          aria-label={fabExpanded ? "Close Menu" : "Open Menu"}
        >
          {fabExpanded ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      <FeedbackModal
        isOpen={showLogoutFeedback}
        onClose={() => setShowLogoutFeedback(false)}
        context="logout"
        onSkip={executeLogout}
      />
    </div>
  );
}