import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { usePagination } from '../hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

import { useAuth } from '../context/AuthContext';

const initialForm = {
  student_id: '',
  title: '',
  description: '',
  urgency: 'low',
  status: 'pending',
  room_number: '',
  syncToCalendar: false,
};

export function MaintenanceManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<typeof initialForm>(initialForm);

  useEffect(() => {
    if (user) {
      fetchRequests();
      if (user.role === 'admin' || user.role === 'super_admin') {
        fetchStudents();
      }
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/api/maintenance/my-requests' : '/api/maintenance';
      const res = await axios.get(endpoint);
      setRequests(res.data);
    } catch (error) {
      console.error('Error fetching maintenance requests', error);
      Swal.fire('Error', 'Failed to load maintenance requests.', 'error');
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/students');
      setStudents(res.data);
    } catch (error) {
      console.error('Error fetching students', error);
    }
  };

  const openModal = (req: any = null) => {
    if (req) {
      setEditingId(req.id || req._id);
      setFormData({
        student_id: String(req.student_id || req.student?._id || req.student || ''),
        title: req.title || '',
        description: req.description || '',
        urgency: req.urgency || 'low',
        status: req.status || 'pending',
        room_number: req.roomNumber || req.room_number || '', // Backend uses roomNumber
        syncToCalendar: !!req.googleEventId,
      });
    } else {
      setEditingId(null);
      // If student, pre-fill their ID and room
      if (user?.role === 'student') {
        setFormData({
          ...initialForm,
          student_id: user.id,
          room_number: user.studentProfile?.roomNumber || ''
        });
      } else {
        setFormData(initialForm);
      }
    }
    setIsModalOpen(true);
  };

  const handleStudentChange = (studentId: string) => {
    const selected = students.find((s: any) => String(s.id) === studentId);
    setFormData({
      ...formData,
      student_id: studentId,
      room_number: selected?.studentProfile?.roomNumber || '',
    });
  };

  const handleSubmit = async () => {
    if (((user?.role === 'admin' || user?.role === 'super_admin') && !formData.student_id) || !formData.title.trim() || !formData.description.trim()) {
      Swal.fire('Missing fields', 'Title and description are required.', 'warning');
      return;
    }

    try {
      const payload = {
        ...formData,
        student_id: Number(formData.student_id),
      };

      if (editingId) {
        await axios.put(`/api/maintenance/${editingId}`, payload);
        setIsModalOpen(false);
        Swal.fire('Updated', 'Request updated successfully.', 'success');
      } else {
        await axios.post('/api/maintenance', payload);
        setIsModalOpen(false);
        Swal.fire('Created', 'Request submitted successfully.', 'success');
      }
      await fetchRequests();
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', e.response?.data?.message || 'Failed to save request.', 'error');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/maintenance/${id}/status`, { status });
      Swal.fire('Updated', `Request marked as ${status}.`, 'success');
      fetchRequests();
    } catch (error: any) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  const handleDelete = async (id: number | string) => {
    const res = await Swal.fire({
      title: 'Delete request?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it',
    });
    if (res.isConfirmed) {
      try {
        await axios.delete(`/api/maintenance/${id}`);
        await fetchRequests();
        Swal.fire('Deleted', 'Maintenance request removed.', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to delete request.', 'error');
      }
    }
  }


  const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(requests, 9);
  const currentRequests = currentData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-[#001F3F] text-2xl font-bold">Maintenance</h2>
        {user?.role === 'student' && (
          <Button
            onClick={() => openModal()}
            className="w-full md:w-auto bg-[#001F3F] text-white hover:bg-[#003366]"
          >
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentRequests.map((req: any) => (
          <div
            key={req._id || req.id}
            className={`bg-white p-4 rounded shadow border-l-4 ${req.urgency === 'high'
              ? 'border-red-500'
              : req.urgency === 'medium'
                ? 'border-yellow-500'
                : 'border-blue-500'
              }`}
          >
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold text-[#001F3F]">{req.title}</h3>
                <p className="text-xs text-gray-500">
                  {req.student?.name ? `For: ${req.student.name}` : 'Unassigned'}
                </p>
              </div>

              <div className="flex gap-1">
                {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'super_admin') ? (
                  <>
                    {req.status === 'pending' && (
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                        onClick={() => handleStatusUpdate(req._id || req.id, 'in-progress')}
                      >
                        Start
                      </Button>
                    )}
                    {req.status !== 'resolved' && (
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white text-xs"
                        onClick={() => handleStatusUpdate(req._id || req.id, 'resolved')}
                      >
                        Done
                      </Button>
                    )}
                  </>
                ) : (
                  req.status === 'pending' && ( /* Students can only edit pending requests, theoretically, but for now just show edit if student? actually students probably shouldn't edit after submission either, but let's stick to admin request */
                    <Button size="sm" variant="ghost" onClick={() => openModal(req)}>
                      <Edit className="w-4 h-4 text-blue-500" />
                    </Button>
                  )
                )}
                <Button size="sm" variant="ghost" onClick={() => handleDelete(req._id || req.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-3">{req.description}</p>
            <div className="mt-3 flex justify-between items-center">
              <span
                className={`text-xs px-2 py-1 rounded uppercase font-semibold ${req.status === 'resolved'
                  ? 'bg-green-100 text-green-700'
                  : req.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}
              >
                {req.status}
              </span>
              <span className="text-xs text-gray-400">
                Room: {req.roomNumber || req.room_number || 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>

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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white z-[100] border-2 border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Request' : 'New Request'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <>
                <div>
                  <Label>Student</Label>
                  <select
                    className="w-full border rounded p-2"
                    value={formData.student_id}
                    onChange={(e) => handleStudentChange(e.target.value)}
                  >
                    <option value="">Select student</option>
                    {students.map((s: any) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Room Number</Label>
                  <Input
                    value={formData.room_number}
                    onChange={(e) =>
                      setFormData({ ...formData, room_number: e.target.value })
                    }
                    placeholder="Auto-filled from student profile (optional override)"
                  />
                </div>
              </>
            )}
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Urgency</Label>
              <select
                className="w-full border rounded p-2"
                value={formData.urgency}
                onChange={(e) =>
                  setFormData({ ...formData, urgency: e.target.value })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'super_admin') && ( // Only admin/staff can change status from here
              <div>
                <Label>Status</Label>
                <select
                  className="w-full border rounded p-2"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <input
                    type="checkbox"
                    id="syncToCalendar"
                    checked={formData.syncToCalendar}
                    onChange={(e) => setFormData({ ...formData, syncToCalendar: e.target.checked })}
                    className="w-4 h-4 text-[#001F3F] rounded border-gray-300"
                />
                <Label htmlFor="syncToCalendar" className="cursor-pointer font-medium mb-0">
                    Sync with Google Calendar
                </Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} className="bg-[#001F3F] text-white hover:bg-[#003366]">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}