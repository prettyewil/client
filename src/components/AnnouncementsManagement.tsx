import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Plus, Trash2, Edit, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useAuth } from '../context/AuthContext';
import { usePagination } from '../hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

interface AnnouncementDto {
  _id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  creator?: { name?: string } | null;
  created_at: string;
}

export function AnnouncementsManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // FIX: Explicitly define the type for formData so priority can be any of the 3 values
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    priority: AnnouncementDto['priority'];
  }>({
    title: '',
    content: '',
    priority: 'normal'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/announcements');
      setAnnouncements(res.data);
    } catch (error) {
      console.error('Error fetching announcements', error);
    }
  };

  const openModal = (ann: AnnouncementDto | null = null) => {
    if (ann) {
      setEditingId(ann._id);
      setFormData({
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', content: '', priority: 'normal' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!isAdmin) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      Swal.fire('Missing fields', 'Title and content are required.', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`/api/announcements/${editingId}`, formData);
        Swal.fire('Updated', 'Announcement updated successfully.', 'success');
      } else {
        await axios.post('/api/announcements', formData);
        Swal.fire('Posted', 'Announcement created successfully.', 'success');
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (e: any) {
      console.error(e);
      Swal.fire(
        'Error',
        e.response?.data?.message || 'Failed to save announcement.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;

    const res = await Swal.fire({
      title: 'Delete announcement?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it',
    });

    if (res.isConfirmed) {
      try {
        await axios.delete(`/api/announcements/${id}`);
        fetchAnnouncements();
        Swal.fire('Deleted', 'Announcement removed.', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to delete announcement.', 'error');
      }
    }
  };

  const priorityColor = (priority: AnnouncementDto['priority']) => {
    if (priority === 'urgent') return 'border-red-500';
    if (priority === 'important') return 'border-orange-500';
    return 'border-blue-500';
  };

  const priorityBadge = (priority: AnnouncementDto['priority']) => {
    if (priority === 'urgent') return 'bg-red-100 text-red-700';
    if (priority === 'important') return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(announcements, 5);
  const currentAnnouncements = currentData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-[#001F3F] text-2xl font-bold">Announcements</h2>
        {isAdmin && (
          <Button
            onClick={() => openModal()}
            className="w-full md:w-auto bg-[#001F3F] text-white hover:bg-[#003366] font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {currentAnnouncements.map((a) => (
          <div
            key={a._id}
            className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${priorityColor(a.priority)} transition-all hover:shadow-md`}
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg text-[#001F3F]">{a.title}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${priorityBadge(
                      a.priority
                    )}`}
                  >
                    {a.priority}
                  </span>
                </div>
                <p className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">{a.content}</p>
                <div className="mt-3 text-xs text-gray-400 flex flex-wrap items-center gap-1">
                  <span>Posted by: {a.creator?.name || 'System Admin'}</span>
                  <span className="hidden md:inline">•</span>
                  <span className="block md:inline w-full md:w-auto">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  <Button size="icon" variant="ghost" onClick={() => openModal(a)} className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(a._id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

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

        {announcements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
            <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
            <p>No announcements yet.</p>
            {isAdmin && <p className="text-sm mt-1">Click "Create" to post the first one.</p>}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white z-[100] border-2 border-gray-200 shadow-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
              <Input
                placeholder="e.g. Scheduled Maintenance"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Priority</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001F3F]"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as AnnouncementDto['priority'],
                  })
                }
              >
                <option value="normal">Normal (Blue)</option>
                <option value="important">Important (Orange)</option>
                <option value="urgent">Urgent (Red)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Content</label>
              <Textarea
                placeholder="Write your announcement here..."
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-[#001F3F] text-white hover:bg-[#003366]" disabled={loading}>
              {loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Post Announcement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}