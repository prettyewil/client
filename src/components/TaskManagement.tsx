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
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    useEffect(() => {
        fetchTasks();
        if (user?.role === 'admin' || user?.role === 'super_admin') {
            fetchRooms();
        }
    }, [user]);

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

        if (user?.role === 'admin' || user?.role === 'super_admin') {
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
                {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'super_admin') && (
                    <Button onClick={() => openModal()} className="w-full md:w-auto bg-[#001F3F] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Task
                    </Button>
                )}
            </div>

            <div className="bg-white p-2 md:p-4 rounded-lg shadow flex-1 h-[500px] md:h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
                {/* Custom CSS for Calendar Toolbar on Mobile */}
                <style>{`
                    .rbc-calendar {
                        font-family: inherit;
                    }
                    @media (max-width: 768px) {
                        .rbc-toolbar {
                            flex-direction: column;
                            gap: 8px;
                            align-items: stretch;
                            margin-bottom: 10px;
                        }
                        .rbc-toolbar-label {
                            margin: 4px 0;
                            text-align: center;
                            font-weight: bold;
                            font-size: 14px;
                        }
                        .rbc-btn-group {
                            display: flex;
                            justify-content: center;
                            width: 100%;
                            flex-wrap: wrap;
                        }
                        .rbc-btn-group button {
                            flex: 1;
                            font-size: 12px;
                            padding: 4px 8px;
                            white-space: nowrap;
                        }
                        .rbc-header {
                            font-size: 12px;
                            padding: 4px 0;
                        }
                        .rbc-event {
                            font-size: 10px;
                        }
                        .rbc-time-slot {
                            font-size: 10px;
                        }
                    }
                `}</style>
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
