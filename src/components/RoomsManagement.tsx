import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { Room } from '../types';
import { usePagination } from '../hooks/usePagination';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "./ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

const RoomsManagement: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRoom, setCurrentRoom] = useState<Partial<Room>>({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await axios.get('/api/rooms');
            setRooms(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setIsLoading(false);
            Swal.fire('Error', 'Failed to fetch rooms', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/rooms/${id}`);
                setRooms(rooms.filter(room => room._id !== id));
                Swal.fire('Deleted!', 'Room has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting room:', error);
                Swal.fire('Error', 'Failed to delete room', 'error');
            }
        }
    };

    const checkRoomExists = (roomNumber: string) => {
        return rooms.some(room => room.roomNumber === roomNumber && room._id !== currentRoom._id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (checkRoomExists(currentRoom.roomNumber || '')) {
            Swal.fire('Error', 'Room number already exists', 'error');
            return;
        }

        try {
            if (isEditing && currentRoom._id) {
                const response = await axios.put(`/api/rooms/${currentRoom._id}`, currentRoom);
                setRooms(rooms.map(room => (room._id === currentRoom._id ? response.data : room)));
                Swal.fire('Success', 'Room updated successfully', 'success');
            } else {
                const response = await axios.post('/api/rooms', currentRoom);
                setRooms([...rooms, response.data]);
                Swal.fire('Success', 'Room created successfully', 'success');
            }
            closeModal();
        } catch (error: any) {
            console.error('Error saving room:', error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to save room', 'error');
        }
    };

    const openModal = (room?: Room) => {
        if (room) {
            setCurrentRoom({ ...room });
            setIsEditing(true);
        } else {
            setCurrentRoom({
                status: 'Available',
                features: []
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRoom({});
        setIsEditing(false);
    };

    const handleFeatureChange = (feature: string) => {
        const currentFeatures = currentRoom.features || [];
        if (currentFeatures.includes(feature)) {
            setCurrentRoom({
                ...currentRoom,
                features: currentFeatures.filter(f => f !== feature)
            });
        } else {
            setCurrentRoom({
                ...currentRoom,
                features: [...currentFeatures, feature]
            });
        }
    };

    const currencyFormatter = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });

    const filteredRooms = rooms.filter(room =>
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(filteredRooms, 10);
    const currentRooms = currentData();

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Room Management</h1>
                <Button
                    onClick={() => openModal()}
                    className="bg-[#001F3F] hover:bg-[#003366] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto"
                >
                    <Plus size={20} />
                    Add Room
                </Button>
            </div>

            {/* Unified Grid View */}
            <div className="mb-6">
                 <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search rooms..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : currentRooms.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No rooms found</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentRooms.map((room) => {
                        const derivedStatus = (room.status === 'Available' && (room.capacity - (room.students_count || 0)) <= 0) ? 'Occupied' : room.status;
                        const slotsLeft = Math.max(0, room.capacity - (room.students_count || 0));
                        return (
                        <div key={room._id} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 ${derivedStatus === 'Available' ? 'border-l-emerald-500' : derivedStatus === 'Occupied' ? 'border-l-blue-500' : 'border-l-amber-500'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-[#001F3F] text-lg">Room {room.roomNumber}</h3>
                                    <p className="text-indigo-600 font-semibold">{currencyFormatter.format(room.price)}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => openModal(room)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                        <Edit size={16} />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(room._id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Capacity:</span>
                                    <span className="text-slate-900">{room.capacity} people</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Availability:</span>
                                    <span className="text-right">
                                        <span className={`font-bold ${slotsLeft === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {slotsLeft} slots left
                                        </span>
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-slate-500 block mb-1">Occupants:</span>
                                    {room.student_names && room.student_names.length > 0 ? (
                                        <ul className="list-disc pl-5 text-slate-900">
                                            {room.student_names.map((name: string, i: number) => (
                                                <li key={i}>{name}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-slate-400 italic">No students assigned</span>
                                    )}
                                </div>
                                <div className="text-sm pt-2 border-t border-slate-100">
                                    <span className="text-slate-500 block mb-1">Features:</span>
                                    <p className="text-slate-900 line-clamp-2">{room.features?.join(', ') || 'None'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end items-center pt-3 border-t border-slate-100">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${derivedStatus === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                                    derivedStatus === 'Occupied' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                    {derivedStatus}
                                </span>
                            </div>
                        </div>
                    )})}
                </div>
            )}
            
            {/* Pagination Controls */}
            {maxPage > 1 && (
                <div className="flex justify-center pt-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={(e) => { e.preventDefault(); prev(); }}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {Array.from({ length: maxPage }).map((_, i) => (
                                <PaginationItem key={i} className="hidden md:inline-block">
                                    <PaginationLink
                                        isActive={currentPage === i + 1}
                                        onClick={(e) => { e.preventDefault(); jump(i + 1); }}
                                        className="cursor-pointer"
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem className="md:hidden">
                                <span className="mx-2 text-sm">{currentPage} / {maxPage}</span>
                            </PaginationItem>
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
                <DialogContent className="bg-white z-[100] border-2 border-gray-200 shadow-xl w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
                                <input
                                    type="text"
                                    value={currentRoom.roomNumber || ''}
                                    onChange={(e) => setCurrentRoom({ ...currentRoom, roomNumber: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={currentRoom.capacity || ''}
                                    onChange={(e) => setCurrentRoom({ ...currentRoom, capacity: parseInt(e.target.value) })}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                            <input
                                type="number"
                                min="0"
                                value={currentRoom.price || ''}
                                onChange={(e) => setCurrentRoom({ ...currentRoom, price: parseFloat(e.target.value) })}
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={currentRoom.status || 'Available'}
                                onChange={(e) => setCurrentRoom({ ...currentRoom, status: e.target.value as any })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Available">Available</option>
                                <option value="Occupied">Occupied</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
                            <div className="space-y-2">
                                {['Air Conditioning', 'Private Bathroom', 'Balcony', 'Study Desk', 'Wi-Fi'].map((feature) => (
                                    <label key={feature} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentRoom.features?.includes(feature) || false}
                                            onChange={() => handleFeatureChange(feature)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-slate-600">{feature}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-[#001F3F] hover:bg-[#003366] text-white"
                            >
                                {isEditing ? 'Save Changes' : 'Create Room'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoomsManagement;
