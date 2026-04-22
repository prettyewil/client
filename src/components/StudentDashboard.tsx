import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PhilippinePeso, Wrench, Megaphone, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudentPayments } from './StudentPayments';

interface StudentPayment {
  id: number;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'verified' | 'rejected' | 'submitted';
}

interface StudentRequest {
  _id: string; // Add _id
  id?: number; // Keep optional for backward compat if needed
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'resolved';
  created_at: string;
}

interface StudentAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  created_at: string;
}

interface StudentDashboardProps {
  onNavigate: (page: string) => void;
}

export function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [paymentsRes, requestsRes, announcementsRes] = await Promise.all([
          axios.get('/api/payments/my-history'),
          axios.get('/api/maintenance/my-requests'),
          axios.get('/api/announcements'),
        ]);
        setPayments(paymentsRes.data);
        setRequests(requestsRes.data);
        setAnnouncements(announcementsRes.data);
      } catch (error) {
        console.error('Error loading student dashboard data', error);
      }
    };
    load();
  }, [user]);

  const studentPayments = payments;
  const studentRequests = requests;

  const totalDue = studentPayments
    .filter((p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'rejected')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const overdueCount = studentPayments.filter((p) => p.status === 'overdue').length;
  const pendingRequests = studentRequests.filter((r) => r.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#001F3F] to-[#003366] text-white rounded-lg shadow-lg p-8">
        <h2>Welcome back, {user?.name?.split(' ')[0]}!</h2>
        <p className="text-white/80 mt-2">
          Room {user?.studentProfile?.roomNumber} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Announcements Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#001F3F]">Announcements</h3>
        </div>
        {announcements.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {announcements.map((a) => (
              <div key={a.id} className="border-l-4 border-[#FFD700] pl-4 py-2">
                <div className="flex items-start justify-between">
                  <h4 className="text-[#001F3F] font-semibold">{a.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    a.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : a.priority === 'important'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {a.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No announcements at this time</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[#FFD700]">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-[#FFD700] text-[#001F3F] p-3 rounded-lg">
              <PhilippinePeso className="w-6 h-6" />
            </div>
            {overdueCount > 0 && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className="text-3xl mb-1">₱{totalDue.toFixed(2)}</p>
          <p className="text-sm text-gray-600">Current Balance</p>
          {overdueCount > 0 && (
            <p className="text-xs text-red-600 mt-2">{overdueCount} overdue payment(s)</p>
          )}
        </div>

        {/* Maintenance Requests */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[#001F3F]">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-[#001F3F] text-white p-3 rounded-lg">
              <Wrench className="w-6 h-6" />
            </div>
            {pendingRequests > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">Active</span>
            )}
          </div>
          <p className="text-3xl mb-1">{pendingRequests}</p>
          <p className="text-sm text-gray-600">Pending Requests</p>
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 text-white p-3 rounded-lg">
              <Megaphone className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl mb-1">{announcements.length}</p>
          <p className="text-sm text-gray-600">Active Announcements</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          {/* My Maintenance Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-[#001F3F] mb-4">My Maintenance Requests</h3>
            <div className="space-y-3">
              {studentRequests.length > 0 ? (
                studentRequests.map((request) => (
                  <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-[#001F3F]">{request.title}</h4>
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${request.status === 'resolved'
                        ? 'bg-green-100 text-green-700'
                        : request.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {request.status === 'resolved' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : request.status === 'in-progress' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {request.status.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${request.urgency === 'high'
                        ? 'bg-red-100 text-red-700'
                        : request.urgency === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                        {request.urgency} priority
                      </span>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No maintenance requests</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#001F3F]">Announcements</h3>
            </div>
            {announcements.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {announcements.map((a) => (
                  <div key={a.id} className="border-l-4 border-[#FFD700] pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-[#001F3F] font-semibold">{a.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        a.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : a.priority === 'important'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {a.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Megaphone className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No announcements at this time</p>
              </div>
            )}
          </div>
        </div>

        {/* My Payments (live API) */}
        <StudentPayments />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-[#001F3F] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('maintenance')}
            className="flex items-center justify-center gap-2 bg-[#001F3F] text-white px-4 py-3 rounded-lg hover:bg-[#003366] transition-colors"
          >
            <Wrench className="w-5 h-5" />
            <span>Submit Maintenance Request</span>
          </button>

        </div>
      </div>
    </div>
  );
}
