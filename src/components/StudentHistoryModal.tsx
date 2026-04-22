import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Loader2, Calendar, CreditCard, Wrench } from 'lucide-react';
import { format } from 'date-fns';

interface StudentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string | null;
}

interface AttendanceRecord {
    _id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    timeIn?: string;
    timeOut?: string;
    remarks?: string;
}

interface PaymentRecord {
    _id: string;
    type: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    dueDate: string;
    paidDate?: string;
    createdAt: string;
}

interface MaintenanceRecord {
    _id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'resolved';
    urgency: 'low' | 'medium' | 'high';
    createdAt: string;
}

interface StudentData {
    name: string;
    email: string;
    roomNumber: string;
}

export function StudentHistoryModal({ isOpen, onClose, studentId }: StudentHistoryModalProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{
        student: StudentData;
        attendance: AttendanceRecord[];
        payments: PaymentRecord[];
        maintenance: MaintenanceRecord[];
    } | null>(null);

    const [activeTab, setActiveTab] = useState<'attendance' | 'payments' | 'maintenance'>('attendance');

    useEffect(() => {
        if (isOpen && studentId) {
            fetchHistory();
        } else {
            setData(null);
        }
    }, [isOpen, studentId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/users/${studentId}/history`);
            setData(res.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#001F3F] text-xl font-bold">
                        Student History
                    </DialogTitle>
                    {data?.student && (
                        <div className="text-sm text-gray-500 mt-1">
                            Records for <span className="font-semibold text-gray-900">{data.student.name}</span>
                            {data.student.roomNumber && ` (Room ${data.student.roomNumber})`}
                        </div>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#001F3F]" />
                    </div>
                ) : data ? (
                    <div className="mt-4">
                        <div className="flex gap-4 border-b border-gray-200 mb-4">
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`pb-2 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'attendance' ? 'text-[#001F3F] border-b-2 border-[#001F3F]' : 'text-gray-500'}`}
                            >
                                <Calendar className="w-4 h-4" /> Attendance
                            </button>
                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`pb-2 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'payments' ? 'text-[#001F3F] border-b-2 border-[#001F3F]' : 'text-gray-500'}`}
                            >
                                <CreditCard className="w-4 h-4" /> Payments
                            </button>
                            <button
                                onClick={() => setActiveTab('maintenance')}
                                className={`pb-2 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'maintenance' ? 'text-[#001F3F] border-b-2 border-[#001F3F]' : 'text-gray-500'}`}
                            >
                                <Wrench className="w-4 h-4" /> Maintenance
                            </button>
                        </div>

                        {/* Attendance Tab */}
                        {activeTab === 'attendance' && (
                            <div className="space-y-4">
                                {data.attendance.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold">
                                            <tr>
                                                <th className="px-4 py-2">Date</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2">Time In</th>
                                                <th className="px-4 py-2">Time Out</th>
                                                <th className="px-4 py-2">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data.attendance.map((record) => (
                                                <tr key={record._id}>
                                                    <td className="px-4 py-2">{format(new Date(record.date), 'MMM d, yyyy')}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                                                            ${record.status === 'present' ? 'bg-green-100 text-green-700' :
                                                                record.status === 'absent' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">{record.timeIn ? format(new Date(record.timeIn), 'h:mm a') : '-'}</td>
                                                    <td className="px-4 py-2">{record.timeOut ? format(new Date(record.timeOut), 'h:mm a') : '-'}</td>
                                                    <td className="px-4 py-2 text-gray-500">{record.remarks || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No attendance records found.</p>
                                )}
                            </div>
                        )}

                        {/* Payments Tab */}
                        {activeTab === 'payments' && (
                            <div className="space-y-4">
                                {data.payments.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold">
                                            <tr>
                                                <th className="px-4 py-2">Date Created</th>
                                                <th className="px-4 py-2">Type</th>
                                                <th className="px-4 py-2">Amount</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2">Due Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data.payments.map((record) => (
                                                <tr key={record._id}>
                                                    <td className="px-4 py-2">{format(new Date(record.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-4 py-2 font-medium">{record.type}</td>
                                                    <td className="px-4 py-2">₱{record.amount.toLocaleString()}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                                                            ${record.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                                record.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">{format(new Date(record.dueDate), 'MMM d, yyyy')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No payment records found.</p>
                                )}
                            </div>
                        )}

                        {/* Maintenance Tab */}
                        {activeTab === 'maintenance' && (
                            <div className="space-y-4">
                                {data.maintenance.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold">
                                            <tr>
                                                <th className="px-4 py-2">Date</th>
                                                <th className="px-4 py-2">Title</th>
                                                <th className="px-4 py-2">Urgency</th>
                                                <th className="px-4 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data.maintenance.map((record) => (
                                                <tr key={record._id}>
                                                    <td className="px-4 py-2">{format(new Date(record.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-4 py-2 font-medium">{record.title}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                                                            ${record.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                                                record.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-green-100 text-green-700'}`}>
                                                            {record.urgency}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                                                            ${record.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                                record.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-gray-100 text-gray-700'}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No maintenance requests found.</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
