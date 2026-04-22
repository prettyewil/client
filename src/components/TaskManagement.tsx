import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Plus, CheckCircle, Clock, Trash2, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
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

// Setup the localizer by providing the moment (or globalize, or Luxon) instance.
const localizer = momentLocalizer(moment);

interface Task {
    _id: string;
    title: string;
    type: string;
    area: string;
    assignedRoom: string;
    dueDate: string;
    status: 'pending' | 'completed';
    notes?: string;
    googleEventId?: string;
    isHoliday?: boolean;
}

interface RoomDto {
    roomNumber: string;
}

export function TaskManagement() {
    const { user, isAppLoading } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    const initialForm = {
        title: '',
        type: 'cleaning',
        area: '',
        assignedRoom: '',
        dueDate: '', // YYYY-MM-DDTHH:mm
        status: 'pending' as 'pending' | 'completed',
        notes: '',
        syncToCalendar: false,
    };
    const [formData, setFormData] = useState(initialForm);

    const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(tasks.filter(t => !t.isHoliday), 10);
    const currentTasks = currentData();

    useEffect(() => {
        if (isAppLoading || !user) return;
        void fetchTasks();
        if (user.role === 'admin') {
            void fetchRooms();
        }
    }, [user, isAppLoading]);

    const fetchTasks = async () => {
        try {
            const res = await axios.get('/api/tasks');
            setTasks(res.data);

            const mappedEvents = res.data.map((task: Task) => ({
                id: task._id,
                title: task.isHoliday ? task.title : `${task.title} (Room ${task.assignedRoom || 'Unassigned'})`,
                start: new Date(task.dueDate),
                end: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000),
                allDay: !!task.isHoliday,
                resource: task,
                status: task.status
            }));
            setEvents(mappedEvents);
        } catch (error) {
            console.error('Error fetching tasks', error);
            Swal.fire('Error', 'Failed to load tasks.', 'error');
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await axios.get('/api/rooms');
            setRooms(res.data);
        } catch (error) {
            console.error('Error fetching rooms', error);
        }
    };

    const openModal = (task: Task | null = null) => {
        if (task) {
            if (task.isHoliday) return; // Cannot edit holidays
            setEditingId(task._id);
            setFormData({
                title: task.title,
                type: task.type,
                area: task.area,
                assignedRoom: task.assignedRoom,
                dueDate: moment(task.dueDate).format('YYYY-MM-DDTHH:mm'),
                status: task.status,
                notes: task.notes || '',
                syncToCalendar: !!task.googleEventId,
            });
        } else {
            setEditingId(null);
            setFormData(initialForm);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.assignedRoom || !formData.dueDate) {
            Swal.fire('Missing fields', 'Title, Assigned Room, and Due Date are required.', 'warning');
            return;
        }

        try {
            if (editingId) {
                await axios.put(`/api/tasks/${editingId}`, formData);
                Swal.fire('Updated', 'Task updated successfully.', 'success');
            } else {
                await axios.post('/api/tasks', formData);
                Swal.fire('Created', 'Task created and assigned to Room.', 'success');
            }
            setIsModalOpen(false);
            fetchTasks();
        } catch (error: any) {
            console.error(error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to save task.', 'error');
        }
    };

    const handleDelete = async (id: string, googleEventId?: string) => {
        const res = await Swal.fire({
            title: 'Delete task?',
            text: googleEventId ? 'This will also remove the event from Google Calendar.' : 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it'
        });
        if (res.isConfirmed) {
            try {
                await axios.delete(`/api/tasks/${id}`);
                Swal.fire('Deleted', 'Task removed.', 'success');
                fetchTasks();
            } catch (error) {
                Swal.fire('Error', 'Failed to delete task.', 'error');
            }
        }
    };

    // Event styling
    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3174ad';

        // Check for holiday
        if (event.resource.isHoliday || event.resource.type === 'holiday') {
            backgroundColor = '#8B5CF6';
        } else if (event.status === 'completed') {
            backgroundColor = '#10B981';
        } else if (new Date(event.start) < new Date() && event.status !== 'completed') {
            backgroundColor = '#EF4444';
        } else {
            backgroundColor = '#F59E0B';
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    const onSelectEvent = (event: any) => {
        if (event.resource.isHoliday) {
            Swal.fire({
                title: event.resource.title,
                text: 'Public Holiday',
                icon: 'info'
            });
            return;
        }

        if (user?.role === 'admin') {
            openModal(event.resource);
        } else {
            // Student view details
            Swal.fire({
                title: event.resource.title,
                html: `<div class="text-left">
                        <p><strong>Type:</strong> ${event.resource.type}</p>
                        <p><strong>Area:</strong> ${event.resource.area}</p>
                        <p><strong>Assigned Room:</strong> ${event.resource.assignedRoom}</p>
                        <p><strong>Notes:</strong> ${event.resource.notes || 'None'}</p>
                        <p><strong>Status:</strong> ${event.resource.status}</p>
                      </div>`,
                icon: 'info'
            });
        }
    };

    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<any>(window.innerWidth < 768 ? 'agenda' : 'month');

    const onNavigate = (newDate: Date) => {
        setDate(newDate);
    };

    const onView = (newView: any) => {
        setView(newView);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-[#001F3F] text-2xl font-bold">Task Management</h2>
                    <p className="text-gray-600">Sanitation, Maintenance, and Inspections</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-[#001F3F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#001F3F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            List
                        </button>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                        <Button onClick={() => openModal()} className="bg-[#001F3F] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Add Task
                        </Button>
                    )}
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="bg-white p-2 md:p-4 rounded-lg shadow flex-1 h-[500px] md:h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
                    {/* ... (Existing Calendar Code) ... */}
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        onSelectEvent={onSelectEvent}
                        views={['month', 'week', 'day', 'agenda']}
                        date={date}
                        view={view}
                        onNavigate={onNavigate}
                        onView={onView}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Desktop View */}
                    <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#001F3F] text-white">
                                <tr>
                                    <th className="px-6 py-3">Task Title</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Room</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentTasks.map((task) => (
                                    <tr key={task._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{task.title}</td>
                                        <td className="px-6 py-4 capitalize">{task.type}</td>
                                        <td className="px-6 py-4">Room {task.assignedRoom}</td>
                                        <td className="px-6 py-4">{moment(task.dueDate).format('MMM DD, YYYY hh:mm A')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => openModal(task)}>
                                                <Edit className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(task._id, task.googleEventId)}>
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {currentTasks.map((task) => (
                            <div key={task._id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-[#001F3F]">{task.title}</h3>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {task.status}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p><span className="font-semibold text-gray-700">Type:</span> <span className="capitalize">{task.type}</span></p>
                                    <p><span className="font-semibold text-gray-700">Room:</span> Room {task.assignedRoom}</p>
                                    <p><span className="font-semibold text-gray-700">Due:</span> {moment(task.dueDate).format('MMM DD, h:mm A')}</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => openModal(task)} className="h-8 text-xs">
                                        <Edit className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(task._id, task.googleEventId)} className="h-8 text-xs text-red-600 border-red-100">
                                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {maxPage > 1 && (
                        <div className="flex justify-center mt-6">
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
            )}

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-white max-w-lg z-[100]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Task' : 'New Task'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Task Title</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., General Inspection"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <select
                                    className="w-full border rounded p-2"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="cleaning">Cleaning</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="inspection">Inspection</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <Label>Area</Label>
                                <Input
                                    value={formData.area}
                                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                    placeholder="e.g., Room 101"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Assigned Room</Label>
                            <select
                                className="w-full border rounded p-2"
                                value={formData.assignedRoom}
                                onChange={(e) => setFormData({ ...formData, assignedRoom: e.target.value })}
                            >
                                <option value="">Select Room</option>
                                {rooms.map(room => (
                                    <option key={room.roomNumber} value={room.roomNumber}>
                                        Room {room.roomNumber}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Due Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Status</Label>
                                <select
                                    className="w-full border rounded p-2"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' })}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label>Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional instructions..."
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
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
                        {editingId && (
                            <Button variant="destructive" onClick={() => handleDelete(editingId, tasks.find(t => t._id === editingId)?.googleEventId)}>
                                Delete
                            </Button>
                        )}
                        <Button onClick={handleSubmit} className="bg-[#001F3F] text-white">
                            Save Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
