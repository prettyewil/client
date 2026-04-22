import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Search, Plus, Edit, Trash2, UserCheck, UserX, Hash, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { Tabs } from './ui/tabs';
import { usePagination } from '../hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

interface Payment {
  id: number;
  amount: number;
  type: string;
  status: string;
  due_date: string;
}

interface Maintenance {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

interface Attendance {
  id: number;
  status: string;
  date: string;
  time_in: string;
  time_out: string;
}

interface Student {
  _id: string; // Mongo ID is _id
  id?: string; // Virtual might exist
  studentId?: string;
  student_id?: string;
  first_name?: string;
  last_name?: string;
  middle_initial?: string;
  name: string;
  email: string;
  studentProfile?: {
    room_id?: string; // We might want to persist this in backend User schema too if used for editing
    roomNumber: string;
    phoneNumber: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    enrollmentDate: string;
    status: 'active' | 'inactive';
  };
}

interface Room {
  _id: string;
  roomNumber: string;
  capacity: number;
  students_count: number;
  status?: string;
}

export function StudentsManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager';

  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // History State
  const [activeTab, setActiveTab] = useState('profile');
  const [history, setHistory] = useState({
    payments: [] as Payment[],
    maintenance: [] as Maintenance[],
    attendance: [] as Attendance[]
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  const initialForm = {
    student_id: '',
    first_name: '',
    last_name: '',
    middle_initial: '',
    email: '',
    room_id: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    status: 'active' as 'active' | 'inactive',
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    // Only fetch if admin, otherwise the backend might throw 403
    if (isAdmin) {
      fetchStudents();
      fetchRooms();
    }
  }, [isAdmin]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/students');
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/rooms');
      setRooms(res.data); // Backend returns _id and roomNumber
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const openModal = (student: Student | null = null) => {
    if (student) {
      setEditingId(student._id);
      const nameParts = student.name.split(' ');
      const firstName = student.first_name || nameParts[0] || '';
      const lastName = student.last_name || nameParts.slice(1).join(' ') || '';

      setFormData({
        student_id: student.studentId || student.student_id || '', // Handle camelCase from backend if applicable
        first_name: firstName,
        last_name: lastName,
        middle_initial: student.middle_initial || '',
        email: student.email,
        // Safely access nested profile data, fallback to empty string if missing
        room_id: student.studentProfile?.room_id?.toString() || '',
        phone_number: student.studentProfile?.phoneNumber || '',
        emergency_contact_name: student.studentProfile?.emergencyContactName || '',
        emergency_contact_phone: student.studentProfile?.emergencyContactPhone || '',
        status: student.studentProfile?.status || 'active'
      });
    } else {
      setEditingId(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
    setActiveTab('profile'); // Reset tab
    setHistory({ payments: [], maintenance: [], attendance: [] }); // Reset history
  };

  useEffect(() => {
    if (editingId && activeTab !== 'profile') {
      fetchStudentHistory(editingId);
    }
  }, [activeTab, editingId]);

  const fetchStudentHistory = async (studentId: string) => {
    setHistoryLoading(true);
    try {
      const [payRes, mainRes, attRes] = await Promise.allSettled([
        axios.get('/api/payments', { params: { student_id: studentId } }),
        axios.get('/api/maintenance', { params: { student_id: studentId } }),
        axios.get('/api/attendance', { params: { student_id: studentId } })
      ]);

      setHistory({
        payments: payRes.status === 'fulfilled' ? payRes.value.data : [],
        maintenance: mainRes.status === 'fulfilled' ? mainRes.value.data : [],
        attendance: attRes.status === 'fulfilled' ? attRes.value.data : []
      });
    } catch (error) {
      console.error('Error fetching history', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Room is optional for creation/inactive status if we want, but usually required. 
    // If room_id is string, !room_id checks for empty string.
    if (!formData.first_name || !formData.last_name || !formData.student_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in Student ID, First Name, and Last Name.',
        confirmButtonColor: '#001F3F'
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        student_id: formData.student_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_initial: formData.middle_initial || undefined,
        email: formData.email,
        room_id: formData.room_id,
        phone_number: formData.phone_number || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        status: formData.status,
      };

      if (editingId) {
        await axios.put(`/api/students/${editingId}`, payload);
        Swal.fire({
          icon: 'success',
          title: 'Updated',
          text: 'Student record updated successfully.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        await axios.post('/api/students', payload);
        Swal.fire({
          icon: 'success',
          title: 'Created',
          text: 'New student registered successfully.',
          timer: 2000,
          showConfirmButton: false
        });
      }

      setIsModalOpen(false);
      fetchStudents();
      fetchRooms(); // Refresh rooms to update capacity counts
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to save student record.',
        confirmButtonColor: '#d33'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (student: Student) => {
    const result = await Swal.fire({
      title: 'Approve Student',
      text: `Enter Student ID for ${student.name}`,
      input: 'text',
      inputPlaceholder: 'e.g. 2024-001',
      showCancelButton: true,
      confirmButtonColor: '#001F3F',
      confirmButtonText: 'Approve',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write a Student ID!';
        }
      }
    });

    if (result.isConfirmed && result.value) {
      setLoading(true);
      try {
        await axios.put(`/api/students/${student._id}`, {
          status: 'active',
          student_id: result.value
        });
        Swal.fire({
          icon: 'success',
          title: 'Approved',
          text: 'Student account is now active.',
          timer: 1500,
          showConfirmButton: false
        });
        fetchStudents();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to approve student.',
          confirmButtonColor: '#d33'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReject = async (id: string) => {
    const result = await Swal.fire({
      title: 'Reject Student?',
      text: "This will remove the registration request permanently.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Reject'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/api/students/${id}`);
        Swal.fire({
          title: 'Rejected',
          text: 'Student request has been removed.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchStudents();
        fetchRooms();
      } catch (error) {
        Swal.fire('Error', 'Failed to reject student.', 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will remove the student account permanently.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/api/students/${id}`);
        Swal.fire({
          title: 'Deleted!',
          text: 'Student has been removed.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchStudents();
        fetchRooms();
      } catch (error) {
        Swal.fire('Error', 'Failed to delete student.', 'error');
      }
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentProfile?.roomNumber?.includes(searchTerm) ||
      (s.studentId || s.student_id)?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(filtered, 10);
  const currentStudents = currentData();

  // ... (isAdmin check)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Students Management</h1>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          className={`pb-2 px-4 font-semibold text-sm transition-colors relative text-[#001F3F] border-b-2 border-[#001F3F]`}
        >
          All Students
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, ID, or room..."
            className="pl-10 border-gray-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#001F3F] text-white uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Student Info</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Room</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Contact</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th className="px-6 py-4 text-right font-semibold tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentStudents.length > 0 ? (
              currentStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{student.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {(student.studentId || student.student_id) && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          <Hash className="w-3 h-3" /> {student.studentId || student.student_id}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {student.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {student.studentProfile?.roomNumber || 'No Room'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {student.studentProfile?.phoneNumber ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" /> {student.studentProfile.phoneNumber}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${student.studentProfile?.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                      {student.studentProfile?.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {student.studentProfile?.status === 'active' ? 'Active' : 'Unverified/Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openModal(student)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(student._id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>No students found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {maxPage > 1 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => { e.preventDefault(); prev(); }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: maxPage }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === i + 1}
                      onClick={(e) => { e.preventDefault(); jump(i + 1); }}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => { e.preventDefault(); next(); }}
                    className={currentPage === maxPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white z-[100] border-2 border-gray-200 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-[#001F3F] text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {editingId ? 'Edit Student Details' : 'Add New Student'}
            </DialogTitle>
          </DialogHeader>


          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              { id: 'profile', label: 'Profile' },
              { id: 'payments', label: 'Payments' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'maintenance', label: 'Maintenance' }
            ]}
          />

          {activeTab === 'profile' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">

              {/* Personal Information Section */}
              <div className="col-span-1 md:col-span-2">
                <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 border-b pb-1">
                  {editingId ? 'Student Information' : 'Personal Information'}
                </h4>
              </div>

              {!editingId && (
                <>
                  <div>
                    <Label>First Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.first_name}
                      onChange={e => { const val = e.target.value.replace(/[^a-zA-Z\sñÑ-]/g, ''); setFormData({ ...formData, first_name: val }); }}
                      placeholder="e.g. Juan"
                    />
                  </div>
                  <div>
                    <Label>Middle Initial</Label>
                    <Input
                      value={formData.middle_initial}
                      onChange={e => { const val = e.target.value.replace(/[^a-zA-Z\sñÑ-]/g, ''); setFormData({ ...formData, middle_initial: val }); }}
                      placeholder="e.g. D"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label>Last Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.last_name}
                      onChange={e => { const val = e.target.value.replace(/[^a-zA-Z\sñÑ-]/g, ''); setFormData({ ...formData, last_name: val }); }}
                      placeholder="e.g. Dela Cruz"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Label>Email Address <span className="text-red-500">*</span></Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="student@school.edu" />
                  </div>
                </>
              )}

              {/* For Editing Mode - Show Name as Read-only Text */}
              {editingId && (
                <div className="col-span-1 md:col-span-2 mb-2">
                  <div className="p-3 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Student Name</p>
                    <p className="text-lg font-bold text-gray-800">{formData.first_name} {formData.middle_initial ? formData.middle_initial + '. ' : ''} {formData.last_name}</p>
                    <p className="text-sm text-gray-500 mt-1">{formData.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ID: {formData.student_id}</p>
                  </div>
                </div>
              )}

              {/* Academic & Dorm Section */}
              <div className="col-span-1 md:col-span-2 mt-2">
                <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 border-b pb-1">Dormitory Details</h4>
              </div>

              {!editingId && (
                <div>
                  <Label>Student ID <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.student_id}
                    onChange={e => { const val = e.target.value.replace(/[^0-9-]/g, ''); setFormData({ ...formData, student_id: val }); }}
                    placeholder="e.g. 2025-001"
                  />
                </div>
              )}

              <div className={editingId ? "col-span-1 md:col-span-2" : ""}>
                <Label>Assigned Room <span className="text-red-500">*</span></Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001F3F]"
                  value={formData.room_id}
                  onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                >
                  <option value="">Select a room</option>
                  {rooms
                    .filter((room) => room._id === formData.room_id || (room.status !== 'Occupied' && room.status !== 'Maintenance' && (room.students_count || 0) < room.capacity))
                    .map((room) => (
                    <option key={room._id} value={room._id}>
                      Room {room.roomNumber} ({room.students_count}/{room.capacity} occupants)
                    </option>
                  ))}
                </select>
              </div>

              <div className={editingId ? "col-span-1 md:col-span-2" : "col-span-1 md:col-span-2"}>
                <Label>Contact Number</Label>
                <Input type="tel" inputMode="numeric" pattern="[0-9+ ]*" value={formData.phone_number} onChange={e => { const val = e.target.value.replace(/[^0-9+ ]/g, ''); setFormData({ ...formData, phone_number: val }); }} placeholder="e.g. 0912 345 6789" />
              </div>

              {editingId && (
                <div className="col-span-1 md:col-span-2">
                  <Label>Account Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001F3F]"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              {/* Contact Section - Only show when creating new student */}
              {!editingId && (
                <>
                  <div className="col-span-1 md:col-span-2 mt-2">
                    <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 border-b pb-1">Emergency Contact</h4>
                  </div>

                  <div>
                    <Label>Contact Name</Label>
                    <Input value={formData.emergency_contact_name} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z\sñÑ-]/g, ''); setFormData({ ...formData, emergency_contact_name: val }); }} placeholder="Parent/Guardian Name" />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input type="tel" inputMode="numeric" pattern="[0-9+ ]*" value={formData.emergency_contact_phone} onChange={e => { const val = e.target.value.replace(/[^0-9+ ]/g, ''); setFormData({ ...formData, emergency_contact_phone: val }); }} placeholder="0912 345 6789" />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-4 min-h-[300px]">
              {historyLoading ? (
                <div className="text-center py-10 text-gray-500">Loading history...</div>
              ) : (
                <div className="space-y-4">
                  {activeTab === 'payments' && (
                    <div>
                      <h4 className="font-bold mb-3">Payment History</h4>
                      {history.payments.length === 0 ? <p className="text-sm text-gray-500">No payment records found.</p> : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Type</th>
                              <th className="p-2 text-left">Amount</th>
                              <th className="p-2 text-left">Status</th>
                              <th className="p-2 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.payments.map((p: any) => (
                              <tr key={p._id || p.id} className="border-b">
                                <td className="p-2 capitalize">{p.type}</td>
                                <td className="p-2">{p.amount}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td className="p-2">{new Date(p.dueDate || p.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {activeTab === 'attendance' && (
                    <div>
                      <h4 className="font-bold mb-3">Attendance Log</h4>
                      {history.attendance.length === 0 ? <p className="text-sm text-gray-500">No attendance records found.</p> : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-left">Status</th>
                              <th className="p-2 text-left">Time In</th>
                              <th className="p-2 text-left">Time Out</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.attendance.map((a: any) => (
                              <tr key={a._id || a.id} className="border-b">
                                <td className="p-2">{new Date(a.date).toLocaleDateString()}</td>
                                <td className="p-2 capitalize">{a.status}</td>
                                <td className="p-2">{a.timeIn || '--'}</td>
                                <td className="p-2">{a.timeOut || '--'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {activeTab === 'maintenance' && (
                    <div>
                      <h4 className="font-bold mb-3">Maintenance Requests</h4>
                      {history.maintenance.length === 0 ? <p className="text-sm text-gray-500">No maintenance requests found.</p> : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Title</th>
                              <th className="p-2 text-left">Status</th>
                              <th className="p-2 text-left">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.maintenance.map((m: any) => (
                              <tr key={m._id || m.id} className="border-b">
                                <td className="p-2">{m.title}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${m.status === 'completed' || m.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {m.status}
                                  </span>
                                </td>
                                <td className="p-2">{new Date(m.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-[#001F3F] text-white hover:bg-[#003366]" disabled={loading}>
              {loading ? 'Saving Record...' : (editingId ? 'Update Student' : 'Register Student')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}