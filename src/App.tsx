import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import axios from 'axios';
import Swal from 'sweetalert2';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { UserManagement } from './components/UserManagement';
import { PaymentsManagement } from './components/PaymentsManagement';
import { MaintenanceManagement } from './components/MaintenanceManagement';
import { AttendanceManagement } from './components/AttendanceManagement';
import { TaskManagement } from './components/TaskManagement';
import { AnnouncementsManagement } from './components/AnnouncementsManagement';
import RoomsManagement from './components/RoomsManagement';
import { SystemLogs } from './components/SystemLogs';
import { StudentPayments } from './components/StudentPayments';
import { CompleteProfile } from './components/CompleteProfile';
import { PendingValidation } from './components/PendingValidation';
import { SystemSettings } from './components/SystemSettings';
import { ErrorPage } from './components/ErrorPage';


function AppContent() {
  const { user, isAppLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);

  // Reset to dashboard when user logs in
  useEffect(() => {
    if (user) {
      setCurrentPage('dashboard');
    }
  }, [user]);

  if (isAppLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#001F3F] border-t-[#FFD700] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showLogin ? (
      <div className="relative">
        <button
          onClick={() => setShowLogin(false)}
          className="absolute top-4 left-4 z-50 text-white hover:underline flex items-center gap-2"
        >
          &larr; Back to Home
        </button>
        <Login />
      </div>
    ) : (
      <LandingPage onGetStarted={() => setShowLogin(true)} />
    );
  }



  // ... (inside AppContent)

  // Force redirect if user is rejected (optional, maybe just logout?)
  const userStatus = (user as any).status || (user as any).studentProfile?.status;

  if (userStatus === 'rejected') {
    return <Login />;
  }

  // Pending/Unverified users: everyone completes profile / waits for admin approval
  if (userStatus === 'pending' || userStatus === 'unverified') {
    // Only students are forced to CompleteProfile if studentId is missing
    if (user.role === 'student' && !user.studentId) {
      return <CompleteProfile />;
    }
    // Non-students or students with IDs wait for validation
    return <PendingValidation />;
  }

  const renderPage = () => {
    if (user.role === 'admin' || user.role === 'manager') {
      switch (currentPage) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setCurrentPage} />;
        case 'profile':
          return <StudentProfile />;
        case 'rooms':
          return <RoomsManagement />;
        case 'students':
          return <UserManagement />;
        case 'payments':
          return <PaymentsManagement />;
        case 'maintenance':
          return <MaintenanceManagement />;
        case 'attendance':
          return <AttendanceManagement />;
        case 'tasks':
          return <TaskManagement />;
        case 'announcements':
          return <AnnouncementsManagement />;
        case 'logs':
          return <SystemLogs />;
        case 'settings':
          return <SystemSettings />;
        default:
          return <ErrorPage code="404" title="PAGE NOT FOUND" onAction={() => setCurrentPage('dashboard')} />;
      }
    } else if (user.role === 'staff') {
      switch (currentPage) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setCurrentPage} />;
        case 'profile':
          return <StudentProfile />;
        case 'rooms':
          return <RoomsManagement />;
        case 'students':
          return <UserManagement />;
        case 'maintenance':
          return <MaintenanceManagement />;
        case 'attendance':
          return <AttendanceManagement />;
        case 'tasks':
          return <TaskManagement />;
        default:
          return <ErrorPage code="404" title="PAGE NOT FOUND" onAction={() => setCurrentPage('dashboard')} />;
      }
    } else {
      switch (currentPage) {
        case 'dashboard':
          return <StudentDashboard onNavigate={setCurrentPage} />;
        case 'profile':
          return <StudentProfile />;
        case 'payments':
          return <StudentPayments />;
        case 'maintenance':
          return <MaintenanceManagement />;
        case 'tasks':
          return <TaskManagement />;
        case 'attendance':
          return <AttendanceManagement />;
        case 'announcements':
          return <AnnouncementsManagement />;
        default:
          return <ErrorPage code="404" title="PAGE NOT FOUND" onAction={() => setCurrentPage('dashboard')} />;
      }
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

// Student-specific components (simplified versions)
function StudentProfile() {
  const { user, updateProfile } = useAuth();
  // Ideally, useAuth should expose a setUser function, but we can just reload or rely on backend response.
  // Actually, login function sets session. We might need a way to just update the user in context.
  // For now, we will just update the UI state.

  // Use user.studentProfile directly for display to ensure it's always up to date.

  // Initialize formData with current user data, but we also need to update it when user changes.
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    studentId: user?.studentId || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    phoneNumber: user?.studentProfile?.phoneNumber || '',
    emergencyContactName: user?.studentProfile?.emergencyContactName || '',
    emergencyContactPhone: user?.studentProfile?.emergencyContactPhone || ''
  });

  const isStudent = user?.role === 'student';

  // Sync formData with user when user updates
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        studentId: user.studentId || '',
        email: user.email || '',
        phoneNumber: user.studentProfile?.phoneNumber || '',
        emergencyContactName: user.studentProfile?.emergencyContactName || '',
        emergencyContactPhone: user.studentProfile?.emergencyContactName || ''
      }));
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      Swal.fire('Error', 'Passwords do not match', 'error');
      return;
    }

    if (!formData.email.endsWith('@student.buksu.edu.ph')) {
      Swal.fire('Error', 'Email must end with @student.buksu.edu.ph', 'error');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        studentId: formData.studentId,
        email: formData.email,
        studentProfile: {
          phoneNumber: formData.phoneNumber,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactPhone: formData.emergencyContactPhone
        }
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      await updateProfile(payload);

      Swal.fire('Success', 'Profile updated successfully.', 'success');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Update profile error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update profile', 'error');
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h2 className="text-[#001F3F] text-xl font-bold">My Profile</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[#001F3F] hover:text-[#003366] underline text-sm"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\sñÑ-]/g, '') })}
                />
              </div>
              {isStudent && (
                <div>
                  <label className="block text-sm text-gray-700">Student ID</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value.replace(/[^0-9-]/g, '') })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Phone Number</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/[^0-9+ ]/g, '') })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Emergency Contact Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value.replace(/[^a-zA-Z\sñÑ-]/g, '') })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Emergency Contact Phone</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value.replace(/[^0-9+ ]/g, '') })}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-700">Change Password (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700">New Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border rounded"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border rounded"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-[#001F3F] text-white px-6 py-2 rounded hover:bg-[#003366]">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-6 border-b text-center md:text-left">
              <div className="w-24 h-24 bg-[#001F3F] text-white rounded-full flex items-center justify-center text-3xl shrink-0">
                {user?.name?.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className-[#001F3F] text-xl font-bold">{user?.name}</h3>
                <p className="text-gray-600">{user?.email}</p>
                {isStudent && user?.studentProfile?.roomNumber && (
                  <p className="text-gray-600 text-sm mt-1">Room {user.studentProfile.roomNumber}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isStudent && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Student ID</p>
                  <p className="text-[#001F3F] font-semibold">{user?.studentId || 'N/A'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                <p className="text-[#001F3F]">{user?.studentProfile?.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Emergency Contact</p>
                <p className="text-[#001F3F]">{user?.studentProfile?.emergencyContactName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Emergency Phone</p>
                <p className="text-[#001F3F]">{user?.studentProfile?.emergencyContactPhone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-green-100 text-green-700 text-sm">
                  {user?.studentProfile?.status || 'active'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}
