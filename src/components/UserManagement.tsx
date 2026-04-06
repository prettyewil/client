import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Search, Plus, Edit, Trash2, UserCheck, UserX, Hash, Phone, Mail, Shield, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
// import { Tabs } from './ui/Tabs';
import { usePagination } from '../hooks/usePagination';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "./ui/pagination";
import { StudentHistoryModal } from './StudentHistoryModal';

// Reuse existing interfaces or define new ones
interface Student {
    _id: string;
    studentId?: string;
    student_id?: string;
    first_name?: string;
    last_name?: string;
    middle_initial?: string;
    name: string;
    email: string;
    role: 'student' | 'staff' | 'admin';
    studentProfile?: {
        room_id?: string;
        roomNumber: string;
        phoneNumber: string;
        emergencyContactName: string;
        emergencyContactPhone: string;
        enrollmentDate: string;
        status: 'active' | 'inactive';
    };
}

interface Staff {
    _id: string;
    name: string; // The backend returns 'name' (virtual/populated) for display
    firstName?: string;
    lastName?: string;
    middleInitial?: string;
    email: string;
    role: 'staff' | 'admin' | 'manager' | 'super_admin';
    status: 'active' | 'inactive';
    createdAt: string;
}

interface Room {
    _id: string;
    roomNumber: string;
    capacity: number;
    students_count: number;
    status?: string;
}

export function UserManagement() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    const [activeUserTab, setActiveUserTab] = useState<'students' | 'employees' | 'pending'>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [pendingUsers, setPendingUsers] = useState<Student[]>([]); // Using Student interface for pending users
    const [employeeList, setEmployeeList] = useState<Staff[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

    // Role Edit State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleEditData, setRoleEditData] = useState<{ id: string, name: string, currentRole: string, newRole: string } | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // History Modal State
    const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Permissions
    const isSuperAdmin = user?.role === 'super_admin';
    const canManageEmployees = ['admin', 'manager', 'super_admin'].includes(user?.role || '');
    const canViewEmployees = ['admin', 'super_admin'].includes(user?.role || '');

    // Student Form State
    const initialStudentForm = {
        student_id: '',
        first_name: '',
        last_name: '',
        middle_initial: '',
        email: '',
        room_id: '',
        phone_number: '',
        enrollment_date: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        status: 'active' as 'active' | 'inactive',
    };
    const [studentFormData, setStudentFormData] = useState(initialStudentForm);
    const initialStaffForm = {
        firstName: '',
        lastName: '',
        middleInitial: '',
        name: '', // Deprecated for input, used for display fallback
        email: '',
        password: '',
        role: 'staff',
    };
    const [staffFormData, setStaffFormData] = useState(initialStaffForm);

    const getErrorMessage = (error: any) => {
        return error.response?.data?.message || error.message || 'An unknown error occurred';
    };

    useEffect(() => {
        if (canManageEmployees || user?.role === 'staff') {
            if (activeUserTab === 'students') {
                fetchStudents();
                fetchRooms();
            } else {
                fetchEmployees();
            }
        }
    }, [canManageEmployees, user?.role, activeUserTab]);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/students');
            setStudents(res.data);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('/api/users/staff'); // Endpoint returns all employees now
            setEmployeeList(res.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    const fetchPendingUsers = async () => {
        try {
            const res = await axios.get('/api/users/pending');
            setPendingUsers(res.data);
        } catch (error) {
            console.error('Error fetching pending users:', error);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await axios.get('/api/rooms');
            setRooms(res.data);
        } catch (err) {
            console.error('Error fetching rooms:', err);
        }
    };

    useEffect(() => {
        if (activeUserTab === 'students') {
            fetchStudents();
            fetchRooms();
        } else if (activeUserTab === 'employees') {
            fetchEmployees();
        } else if (activeUserTab === 'pending') {
            fetchPendingUsers();
        }
    }, [activeUserTab]);

    // --- Student Actions ---

    const openStudentModal = (student: Student | null = null) => {
        if (student) {
            setEditingId(student._id);
            const nameParts = student.name.split(' ');
            const firstName = student.first_name || nameParts[0] || '';
            const lastName = student.last_name || nameParts.slice(1).join(' ') || '';

            setStudentFormData({
                student_id: student.studentId || student.student_id || '',
                first_name: firstName,
                last_name: lastName,
                middle_initial: student.middle_initial || '',
                email: student.email,
                room_id: student.studentProfile?.room_id?.toString() || '',
                phone_number: student.studentProfile?.phoneNumber || '',
                enrollment_date: '',
                emergency_contact_name: student.studentProfile?.emergencyContactName || '',
                emergency_contact_phone: student.studentProfile?.emergencyContactPhone || '',
                status: student.studentProfile?.status || 'active'
            });
        } else {
            setEditingId(null);
            setStudentFormData(initialStudentForm);
        }
        setIsModalOpen(true);
    };

    const handleStudentSubmit = async () => {
        if (!studentFormData.first_name || !studentFormData.last_name) {
            Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in First Name and Last Name.' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...studentFormData,
                middle_initial: studentFormData.middle_initial || undefined,
                student_id: studentFormData.student_id || undefined
            };

            if (editingId) {
                await axios.put(`/api/students/${editingId}`, payload);
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Student record updated successfully.', timer: 1500, showConfirmButton: false });
            } else {
                await axios.post('/api/students', payload);
                Swal.fire({ icon: 'success', title: 'Created', text: 'New student registered successfully.', timer: 1500, showConfirmButton: false });
            }

            setIsModalOpen(false);
            fetchStudents();
            fetchRooms();
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: string, type: 'student' | 'employee') => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `This will remove the ${type} account permanently.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                if (type === 'student') {
                    await axios.delete(`/api/students/${id}`);
                } else {
                    await axios.delete(`/api/users/${id}`);
                }
                Swal.fire('Deleted!', `${type === 'student' ? 'Student' : 'Employee'} has been removed.`, 'success');
                if (type === 'student') {
                    fetchStudents();
                    fetchRooms();
                } else {
                    fetchEmployees();
                }
            } catch (error: any) {
                Swal.fire('Error', getErrorMessage(error), 'error');
            }
        }
    };

    const openHistoryModal = (id: string) => {
        setHistoryStudentId(id);
        setIsHistoryModalOpen(true);
    };

    const handleApproveUser = async (id: string) => {
        try {
            await axios.put(`/api/users/${id}/approve`);
            Swal.fire('Approved', 'User approval successful.', 'success');
            fetchPendingUsers();
        } catch (error: any) {
            Swal.fire('Error', getErrorMessage(error), 'error');
        }
    };

    const handleRejectUser = async (id: string) => {
        const result = await Swal.fire({
            title: 'Reject User?',
            text: 'Please provide a reason for rejection:',
            input: 'text',
            inputPlaceholder: 'Reason...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, reject',
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write a reason!';
                }
            }
        });

        if (result.isConfirmed) {
            try {
                await axios.put(`/api/users/${id}/reject`, { reason: result.value });
                Swal.fire('Rejected', 'User has been rejected.', 'success');
                fetchPendingUsers();
            } catch (error: any) {
                Swal.fire('Error', getErrorMessage(error), 'error');
            }
        }
    };




    // --- Staff/Employee Actions ---

    const openStaffModal = () => {
        setStaffFormData(initialStaffForm);
        setIsStaffModalOpen(true);
    };

    const handleStaffSubmit = async () => {
        if (!staffFormData.firstName || !staffFormData.lastName || !staffFormData.email || !staffFormData.password) {
            Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in Name, Email and Password.' });
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/users/staff', staffFormData);
            Swal.fire({ icon: 'success', title: 'Created', text: 'New employee added.', timer: 1500, showConfirmButton: false });
            setIsStaffModalOpen(false);
            fetchEmployees();
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(error) });
        } finally {
            setLoading(false);
        }
    };

    const openRoleModal = (employee: Staff) => {
        setRoleEditData({
            id: employee._id,
            name: employee.name,
            currentRole: employee.role,
            newRole: employee.role
        });
        setIsRoleModalOpen(true);
    };

    const handleRoleUpdate = async () => {
        if (!roleEditData) return;

        try {
            await axios.put(`/api/users/${roleEditData.id}/role`, { role: roleEditData.newRole });
            Swal.fire('Updated', 'User role updated successfully.', 'success');
            setIsRoleModalOpen(false);
            fetchEmployees();
        } catch (error: any) {
            Swal.fire('Error', getErrorMessage(error), 'error');
        }
    };

    // --- Filtering & Pagination ---

    // We filter based on the active tab's data
    const dataToFilter = activeUserTab === 'students' ? students :
        activeUserTab === 'employees' ? employeeList : pendingUsers;

    const filtered = (dataToFilter as any[]).filter((item) => {
        const term = searchTerm.toLowerCase();
        if (activeUserTab === 'students' || activeUserTab === 'pending') {
            const s = item as Student;
            return s.name?.toLowerCase().includes(term) ||
                s.studentProfile?.roomNumber?.toLowerCase().includes(term) ||
                (s.studentId || s.student_id)?.toLowerCase().includes(term) ||
                s.email?.toLowerCase().includes(term);
        } else {
            const s = item as Staff;
            const staffName = s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '';
            return staffName.toLowerCase().includes(term) ||
                (s.email ? s.email.toLowerCase().includes(term) : false) ||
                (s.role ? s.role.toLowerCase().includes(term) : false);
        }
    });

    const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(filtered, 10);
    const currentItems = currentData();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>

                {/* Add Button based on Tab */}
                {canManageEmployees && activeUserTab !== 'pending' && (
                    <Button
                        onClick={() => activeUserTab === 'students' ? openStudentModal() : openStaffModal()}
                        className="bg-[#001F3F] text-white hover:bg-[#003366] gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {activeUserTab === 'students' ? 'Add Student' : 'Add Employee'}
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => { setActiveUserTab('students'); setSearchTerm(''); }}
                    className={`pb-2 px-4 font-semibold text-sm transition-colors relative ${activeUserTab === 'students' ? 'text-[#001F3F] border-b-2 border-[#001F3F]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    All Students
                </button>
                {canViewEmployees && (
                    <button
                        onClick={() => { setActiveUserTab('employees'); setSearchTerm(''); }}
                        className={`pb-2 px-4 font-semibold text-sm transition-colors relative ${activeUserTab === 'employees' ? 'text-[#001F3F] border-b-2 border-[#001F3F]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Employees
                    </button>
                )}
                <button
                    onClick={() => { setActiveUserTab('pending'); setSearchTerm(''); }}
                    className={`pb-2 px-4 font-semibold text-sm transition-colors relative ${activeUserTab === 'pending' ? 'text-[#001F3F] border-b-2 border-[#001F3F]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pending Validation
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={activeUserTab === 'students' ? "Search by name, ID, or room..." : "Search by name, email, or role..."}
                        className="pl-10 border-gray-200"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {currentItems.length > 0 ? (
                    currentItems.map((item: any) => (
                        <div key={item._id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-semibold text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {activeUserTab === 'students' ? (
                                            (item.studentId || item.student_id) && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> {item.studentId || item.student_id}
                                                </span>
                                            )
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {item.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {activeUserTab === 'students' ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${item.studentProfile?.status === 'active'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                        {item.studentProfile?.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                ) : activeUserTab === 'pending' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                        Pending
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                        Active
                                    </span>
                                )}
                            </div>

                            {activeUserTab !== 'pending' && (
                                <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                                    {activeUserTab === 'students' ? (
                                        <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                            Room: {item.studentProfile?.roomNumber || 'N/A'}
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700' :
                                            item.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                                            item.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            <Shield className="w-3 h-3" /> {item.role === 'super_admin' ? 'Super Admin' : item.role === 'admin' ? 'Admin' : item.role === 'manager' ? 'Manager' : 'Staff'}
                                        </span>
                                    )}
                                </div>
                            )}

                            {activeUserTab === 'students' && (
                                <div className="text-sm text-gray-600 mb-3">
                                    {item.studentProfile?.phoneNumber ? (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3 h-3" /> {item.studentProfile.phoneNumber}
                                        </div>
                                    ) : <span className="text-xs text-gray-400 italic">No phone</span>}
                                </div>
                            )}

                            {canManageEmployees && (
                                <div className="flex justify-end gap-2 border-t pt-3 mt-2">
                                    {activeUserTab === 'students' && (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => openHistoryModal(item._id)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-8">
                                                <FileText className="w-4 h-4 mr-1" /> History
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => openStudentModal(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8">
                                                <Edit className="w-4 h-4 mr-1" /> Edit
                                            </Button>
                                        </>
                                    )}
                                    {activeUserTab === 'pending' && (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => handleApproveUser(item._id)} className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8">
                                                <UserCheck className="w-4 h-4 mr-1" /> Approve
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleRejectUser(item._id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8">
                                                <UserX className="w-4 h-4 mr-1" /> Reject
                                            </Button>
                                        </>
                                    )}
                                    {activeUserTab === 'employees' && isSuperAdmin && (
                                        <Button variant="ghost" size="sm" onClick={() => openRoleModal(item)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8">
                                            <Edit className="w-4 h-4 mr-1" /> Manage
                                        </Button>
                                    )}
                                    {activeUserTab !== 'pending' && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(item._id, activeUserTab === 'students' ? 'student' : 'employee')} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8">
                                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-100">
                        <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p>No {activeUserTab} found.</p>
                        </div>
                    </div>
                )}
                {/* Pagination Controls Mobile */}
                {maxPage > 1 && (
                    <div className="flex justify-center pt-2">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={(e) => { e.preventDefault(); prev(); }}
                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                                <PaginationItem>
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
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#001F3F] text-white uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-semibold tracking-wider">Name</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">{activeUserTab === 'students' ? 'Room' : 'Email'}</th>
                            {activeUserTab !== 'pending' && <th className="px-6 py-4 font-semibold tracking-wider">{activeUserTab === 'students' ? 'Contact' : 'Role'}</th>}
                            <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                            {canManageEmployees && <th className="px-6 py-4 text-right font-semibold tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentItems.length > 0 ? (
                            currentItems.map((item: any) => (
                                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{item.name}</div>
                                        {activeUserTab === 'students' && (item.studentId || item.student_id) && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    <Hash className="w-3 h-3" /> {item.studentId || item.student_id}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {activeUserTab === 'students' ? (
                                            <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                {item.studentProfile?.roomNumber || 'No Room'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 flex items-center gap-2">
                                                <Mail className="w-3 h-3" /> {item.email}
                                            </span>
                                        )}
                                    </td>
                                    {activeUserTab !== 'pending' && (
                                        <td className="px-6 py-4 text-gray-600">
                                            {activeUserTab === 'students' ? (
                                                item.studentProfile?.phoneNumber ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3 h-3" /> {item.studentProfile.phoneNumber}
                                                    </div>
                                                ) : <span className="text-xs text-gray-400 italic">Not set</span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${item.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700' :
                                                    item.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                                                    item.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    <Shield className="w-3 h-3" /> {item.role === 'super_admin' ? 'Super Admin' : item.role === 'admin' ? 'Admin' : item.role === 'manager' ? 'Manager' : 'Staff'}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        {activeUserTab === 'students' ? (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${item.studentProfile?.status === 'active'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}>
                                                {item.studentProfile?.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                                {item.studentProfile?.status === 'active' ? 'Active' : 'Unverified/Inactive'}
                                            </span>
                                        ) : activeUserTab === 'pending' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                <UserX className="w-3 h-3" /> Pending
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                <UserCheck className="w-3 h-3" /> Active
                                            </span>
                                        )}
                                    </td>
                                    {canManageEmployees && (
                                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                                            {activeUserTab === 'students' && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => openHistoryModal(item._id)} className="h-8 w-8 text-teal-600 hover:bg-teal-50" title="View History">
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openStudentModal(item)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {activeUserTab === 'pending' && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleApproveUser(item._id)} className="h-8 w-8 text-green-600 hover:bg-green-50" title="Approve">
                                                        <UserCheck className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRejectUser(item._id)} className="h-8 w-8 text-red-600 hover:bg-red-50" title="Reject">
                                                        <UserX className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {activeUserTab === 'employees' && isSuperAdmin && (
                                                <Button variant="ghost" size="sm" onClick={() => openRoleModal(item)} className="text-indigo-600 hover:bg-indigo-50 h-8 mx-1">
                                                    <Edit className="w-4 h-4 mr-1 inline" /> Manage
                                                </Button>
                                            )}
                                            {activeUserTab !== 'pending' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(item._id, activeUserTab === 'students' ? 'student' : 'employee')} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="w-8 h-8 opacity-20" />
                                        <p>No {activeUserTab} found.</p>
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

            {/* Student Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[700px] bg-white z-[100] border-2 border-gray-200 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-[#001F3F] text-xl font-bold flex items-center gap-2">
                            <Edit className="w-5 h-5" />
                            {editingId ? 'Edit Student' : 'Add New Student'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {/* Simplified for brevity - utilizing same form inputs as original StudentsManagement */}
                        <div className="col-span-1 md:col-span-2">
                            <Label>First Name <span className="text-red-500">*</span></Label>
                            <Input value={studentFormData.first_name} onChange={e => setStudentFormData({ ...studentFormData, first_name: e.target.value })} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <Label>Last Name <span className="text-red-500">*</span></Label>
                            <Input value={studentFormData.last_name} onChange={e => setStudentFormData({ ...studentFormData, last_name: e.target.value })} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <Label>Email <span className="text-red-500">*</span></Label>
                            <Input value={studentFormData.email} onChange={e => setStudentFormData({ ...studentFormData, email: e.target.value })} />
                        </div>
                        <div>
                            <Label>Student ID</Label>
                            <Input value={studentFormData.student_id} onChange={e => setStudentFormData({ ...studentFormData, student_id: e.target.value })} />
                        </div>

                        <div>
                            <Label>Contact Number</Label>
                            <Input value={studentFormData.phone_number} onChange={e => setStudentFormData({ ...studentFormData, phone_number: e.target.value })} placeholder="e.g. 0912 345 6789" />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <Label>Room</Label>
                            <div className="flex gap-2 items-center">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={studentFormData.room_id}
                                    onChange={e => setStudentFormData({ ...studentFormData, room_id: e.target.value })}
                                >
                                    <option value="">Select Room</option>
                                    {rooms
                                        .filter((room) => room._id === studentFormData.room_id || (room.status !== 'Occupied' && (room.students_count || 0) < room.capacity))
                                        .map(r => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
                                </select>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                        const availableRoom = rooms.find(room => room._id !== studentFormData.room_id && room.status !== 'Occupied' && (room.students_count || 0) < room.capacity);
                                        if (availableRoom) {
                                            setStudentFormData({ ...studentFormData, room_id: availableRoom._id });
                                        } else {
                                            Swal.fire('No Rooms', 'There are no other available rooms at the moment.', 'info');
                                        }
                                    }}
                                    className="whitespace-nowrap bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200 h-10"
                                >
                                    Assign Available Room
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleStudentSubmit} className="bg-[#001F3F] text-white">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Staff Modal */}
            <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
                <DialogContent className="sm:max-w-[500px] bg-white z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-[#001F3F] text-xl font-bold">Add Employee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>First Name <span className="text-red-500">*</span></Label>
                                <Input
                                    value={staffFormData.firstName}
                                    onChange={e => setStaffFormData({ ...staffFormData, firstName: e.target.value })}
                                    placeholder="First Name"
                                />
                            </div>
                            <div>
                                <Label>Last Name <span className="text-red-500">*</span></Label>
                                <Input
                                    value={staffFormData.lastName}
                                    onChange={e => setStaffFormData({ ...staffFormData, lastName: e.target.value })}
                                    placeholder="Last Name"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Middle Initial</Label>
                                <Input
                                    value={staffFormData.middleInitial}
                                    onChange={e => setStaffFormData({ ...staffFormData, middleInitial: e.target.value })}
                                    placeholder="M.I."
                                    maxLength={2}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input
                                value={staffFormData.email}
                                onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                                placeholder="staff@dorm.com"
                                type="email"
                            />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <select
                                className="w-full border rounded p-2 mt-1"
                                value={staffFormData.role}
                                onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                            >
                                <option value="staff">Staff</option>
                                {isSuperAdmin && <option value="manager">Manager</option>}
                                {isSuperAdmin && <option value="admin">Admin</option>}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Label>Password</Label>
                            <Input
                                value={staffFormData.password}
                                onChange={e => setStaffFormData({ ...staffFormData, password: e.target.value })}
                                placeholder="Initial Password"
                                type="password"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStaffModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleStaffSubmit} className="bg-[#001F3F] text-white">Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Role Edit Modal */}
            {isRoleModalOpen && roleEditData && (
                <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                    <DialogContent className="sm:max-w-[400px] bg-white z-[100]">
                        <DialogHeader>
                            <DialogTitle className="text-[#001F3F] text-xl font-bold">Change Role</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-sm text-gray-500">Updating role for <strong>{roleEditData.name}</strong></p>
                            <div>
                                <Label>Role</Label>
                                <select
                                    className="w-full border rounded p-2 mt-1"
                                    value={roleEditData.newRole}
                                    onChange={(e) => setRoleEditData({ ...roleEditData, newRole: e.target.value })}
                                >
                                    <option value="staff">Staff</option>
                                    {isSuperAdmin && <option value="manager">Manager</option>}
                                    {isSuperAdmin && <option value="admin">Admin</option>}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleRoleUpdate} className="bg-[#001F3F] text-white">Update Role</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <StudentHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                studentId={historyStudentId}
            />
        </div>
    );
}
