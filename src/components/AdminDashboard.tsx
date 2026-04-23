import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Wrench, Calendar, PhilippinePeso, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  pendingMaintenance: number;
  pendingCleaning: number;
  overduePayments: number;
}

interface DashboardAnnouncement {
  _id: string; // Changed from id: number to _id: string matching Mongo
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  createdAt: string;
}

interface DashboardMaintenance {
  _id: string; // Changed from id: number to _id: string matching Mongo
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  roomNumber?: string;
  createdAt: string;
  student?: {
    name: string;
    studentProfile?: {
      roomNumber: string;
    }
  };
}

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [urgentMaintenance, setUrgentMaintenance] = useState<DashboardMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/dashboard/admin/stats');
        setStats(res.data.stats);
        setRecentAnnouncements(res.data.recentAnnouncements || []);
        setUrgentMaintenance(res.data.urgentMaintenance || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#001F3F]">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#001F3F] text-white p-2 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl mb-0.5">{stats?.totalStudents ?? (loading ? '—' : 0)}</p>
          <p className="text-xs text-gray-600">Total Students</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#FFD700]">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#FFD700] text-[#001F3F] p-2 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            {(stats?.pendingMaintenance ?? 0) > 0 && (
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded">Pending</span>
            )}
          </div>
          <p className="text-2xl mb-0.5">{stats?.pendingMaintenance ?? (loading ? '—' : 0)}</p>
          <p className="text-xs text-gray-600">Pending Maintenance</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl mb-0.5">{stats?.pendingCleaning ?? (loading ? '—' : 0)}</p>
          <p className="text-xs text-gray-600">Tasks</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-red-500 text-white p-2 rounded-lg">
              <PhilippinePeso className="w-5 h-5" />
            </div>
            {stats?.overduePayments && stats.overduePayments > 0 && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className="text-2xl mb-0.5">{stats?.overduePayments ?? (loading ? '—' : 0)}</p>
          <p className="text-xs text-gray-600">Overdue Payments</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-[#001F3F] text-base font-semibold mb-4">Recent Announcements</h3>
          <div className="space-y-4">
            {recentAnnouncements.map((announcement) => (
              <div key={announcement._id} className="border-l-4 border-[#FFD700] pl-4 py-2">
                <div className="flex items-start justify-between">
                  <h4 className="text-[#001F3F]">{announcement.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${announcement.priority === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : announcement.priority === 'important'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>
                    {announcement.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent Maintenance */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-[#001F3F] text-base font-semibold mb-4">Urgent Maintenance Requests</h3>
          <div className="space-y-4">
            {urgentMaintenance.length > 0 ? (
              urgentMaintenance.map((request) => (
                <div key={request._id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-[#001F3F]">{request.title}</h4>
                      <p className="text-sm text-gray-600">
                        Room {request.roomNumber || request.student?.studentProfile?.roomNumber || 'N/A'} - {request.student?.name ?? 'Unknown'}
                      </p>
                    </div>
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">HIGH</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{request.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${request.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {request.status.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No urgent maintenance requests</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-[#001F3F] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('students')}
            className="flex items-center justify-center gap-2 bg-[#001F3F] text-white px-4 py-3 rounded-lg hover:bg-[#003366] transition-colors"
          >
            <Users className="w-5 h-5" />
            <span>Add New Student</span>
          </button>
          <button
            onClick={() => onNavigate('payments')}
            className="flex items-center justify-center gap-2 bg-[#FFD700] text-[#001F3F] px-4 py-3 rounded-lg hover:bg-[#FFC700] transition-colors"
          >
            <PhilippinePeso className="w-5 h-5" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => onNavigate('announcements')}
            className="flex items-center justify-center gap-2 bg-[#001F3F] text-white px-4 py-3 rounded-lg hover:bg-[#003366] transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span>Create Announcement</span>
          </button>
        </div>
      </div>
    </div>
  );
}