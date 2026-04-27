import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Ticket, 
    Plus, 
    Trash2, 
    CheckCircle, 
    XCircle, 
    FileText, 
    Download, 
    Filter,
    Calendar,
    Clock,
    User,
    Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { usePagination } from '../hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

const PASS_TYPES = ['Going home', 'Late night pass', 'Overnight'];

export function PassManagement() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'staff';
    const [passes, setPasses] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');

    const [formData, setFormData] = useState({
        passType: 'Going home',
        reason: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchPasses();
    }, []);

    const fetchPasses = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/passes');
            setPasses(res.data);
        } catch (error: any) {
            console.error('Error fetching passes:', error);
            const errMsg = error.response?.data?.message || error.message || 'Failed to load passes';
            Swal.fire('Error', errMsg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.reason || !formData.startDate || !formData.endDate) {
            Swal.fire('Warning', 'All fields are required', 'warning');
            return;
        }

        try {
            await axios.post('/api/passes', formData);
            Swal.fire('Success', 'Pass request submitted successfully', 'success');
            setIsModalOpen(false);
            setFormData({
                passType: 'Going home',
                reason: '',
                startDate: '',
                endDate: '',
            });
            fetchPasses();
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'Failed to submit request', 'error');
        }
    };

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        let rejectionReason = '';
        if (status === 'rejected') {
            const { value: reason } = await Swal.fire({
                title: 'Reject Pass Request',
                input: 'textarea',
                inputLabel: 'Reason for rejection',
                inputPlaceholder: 'Type the reason here...',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                inputValidator: (value) => {
                    if (!value) return 'You need to provide a reason for rejection';
                }
            });
            if (!reason) return;
            rejectionReason = reason;
        } else {
            const confirm = await Swal.fire({
                title: 'Approve Pass?',
                text: 'Are you sure you want to approve this pass request?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#001F3F',
            });
            if (!confirm.isConfirmed) return;
        }

        try {
            await axios.patch(`/api/passes/${id}/status`, { status, rejectionReason });
            Swal.fire('Success', `Pass request ${status}`, 'success');
            fetchPasses();
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'Failed to update status', 'error');
        }
    };

    const handleDeletePass = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'Delete Request?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
        });

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`/api/passes/${id}`);
                Swal.fire('Deleted', 'Request removed.', 'success');
                fetchPasses();
            } catch (error: any) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete request', 'error');
            }
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('DormSync Pass Requests Log', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${moment().format('MMMM DD, YYYY HH:mm')}`, 14, 30);

        const tableColumn = ["Student", "Type", "Start Date", "End Date", "Reason", "Status"];
        const tableRows: any[] = [];

        filteredPasses.forEach(pass => {
            const rowData = [
                pass.student?.name || 'N/A',
                pass.passType,
                moment(pass.startDate).format('MMM DD, YYYY'),
                moment(pass.endDate).format('MMM DD, YYYY'),
                pass.reason,
                pass.status.toUpperCase()
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 31, 63] }
        });

        doc.save(`Pass_Logs_${moment().format('YYYYMMDD')}.pdf`);
    };

    const exportToCSV = () => {
        const headers = ["Student", "Student ID", "Type", "Start Date", "End Date", "Reason", "Status", "Approved By", "Rejection Reason"];
        const rows = filteredPasses.map(pass => [
            pass.student?.name || 'N/A',
            pass.student?.studentId || 'N/A',
            pass.passType,
            moment(pass.startDate).format('YYYY-MM-DD HH:mm'),
            moment(pass.endDate).format('YYYY-MM-DD HH:mm'),
            pass.reason,
            pass.status,
            pass.approvedBy?.name || 'N/A',
            pass.rejectionReason || ''
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Pass_Logs_${moment().format('YYYYMMDD')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredPasses = passes.filter(p => {
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus.toLowerCase();
        const matchesType = filterType === 'All' || p.passType === filterType;
        return matchesStatus && matchesType;
    });

    const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(filteredPasses, 10);
    const currentPasses = currentData();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-[#001F3F] text-2xl font-bold">Pass Management</h2>
                    <p className="text-gray-600 text-sm mt-1">Manage student leave and late passes</p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <>
                            <Button 
                                onClick={exportToCSV}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                                <Download className="w-4 h-4 mr-2" /> CSV
                            </Button>
                            <Button 
                                onClick={exportToPDF}
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                                <FileText className="w-4 h-4 mr-2" /> PDF
                            </Button>
                        </>
                    )}
                    {!isAdmin && (
                        <Button 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-[#001F3F] text-white hover:bg-[#003366]"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Request Pass
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Filter:</span>
                </div>
                <div className="grid grid-cols-2 md:flex gap-4 w-full">
                    <select 
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FFD700] outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <select 
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FFD700] outline-none"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="All">All Types</option>
                        {PASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#001F3F] text-white text-left">
                            <tr>
                                {isAdmin && <th className="px-6 py-4">Student</th>}
                                <th className="px-6 py-4">Pass Type</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-[#001F3F] border-t-transparent rounded-full animate-spin" />
                                            Loading passes...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentPasses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        No pass requests found.
                                    </td>
                                </tr>
                            ) : (
                                currentPasses.map((pass: any) => (
                                    <tr key={pass._id} className="hover:bg-gray-50">
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{pass.student?.name}</div>
                                                <div className="text-xs text-gray-500">{pass.student?.studentId}</div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-2">
                                                <Ticket className="w-4 h-4 text-[#001F3F]" />
                                                {pass.passType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600">
                                                From: {moment(pass.startDate).format('MMM DD, YYYY HH:mm')}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                To: {moment(pass.endDate).format('MMM DD, YYYY HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs truncate" title={pass.reason}>
                                                {pass.reason}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${pass.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                  pass.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                                  'bg-yellow-100 text-yellow-800'}`}>
                                                {pass.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : 
                                                 pass.status === 'rejected' ? <XCircle className="w-3 h-3" /> : 
                                                 <Clock className="w-3 h-3" />}
                                                {pass.status}
                                            </span>
                                            {pass.status === 'rejected' && pass.rejectionReason && (
                                                <div className="mt-1 text-[10px] text-red-500 max-w-[150px] italic">
                                                    Reason: {pass.rejectionReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {isAdmin && pass.status === 'pending' && (
                                                    <>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleUpdateStatus(pass._id, 'approved')}
                                                            className="bg-green-600 text-white hover:bg-green-700"
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleUpdateStatus(pass._id, 'rejected')}
                                                            variant="destructive"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {!isAdmin && pass.status === 'pending' && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => handleDeletePass(pass._id)}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {pass.status !== 'pending' && (
                                                    <span className="text-gray-400 text-xs italic">Processed</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {maxPage > 1 && (
                    <div className="p-4 border-t">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious onClick={prev} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                                </PaginationItem>
                                {Array.from({ length: maxPage }).map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink isActive={currentPage === i + 1} onClick={() => jump(i + 1)} className="cursor-pointer">
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext onClick={next} className={currentPage === maxPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </div>

            {/* Request Pass Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request a Pass</DialogTitle>
                        <DialogDescription>
                            Please provide the details for your pass request.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreatePass} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="passType">Pass Type</Label>
                            <select 
                                id="passType"
                                className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FFD700]"
                                value={formData.passType}
                                onChange={(e) => setFormData({...formData, passType: e.target.value})}
                            >
                                {PASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date & Time</Label>
                                <Input 
                                    id="startDate"
                                    type="datetime-local" 
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date & Time</Label>
                                <Input 
                                    id="endDate"
                                    type="datetime-local" 
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea 
                                id="reason"
                                placeholder="Explain why you need this pass..."
                                value={formData.reason}
                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-[#001F3F] text-white hover:bg-[#003366]">Submit Request</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
