import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Trash2, Edit, CopyPlus, FileText, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { Textarea } from './ui/textarea';
import { usePagination } from '../hooks/usePagination';
import { takeNotificationFocus } from '../utils/notificationFocus';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const emptyPayment = {
  student_id: '',
  amount: '',
  type: 'rent',
  due_date: '',
  status: 'pending',
  notes: '',
  receiptUrl: '',
  referenceNumber: '',
};

export function PaymentsManagement() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [formData, setFormData] = useState({ ...emptyPayment });
  const [bulkRows, setBulkRows] = useState([{ ...emptyPayment }]);
  /* Removed unused file state & handler */

  // Receipt Modal State
  const [viewingPayment, setViewingPayment] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [highlightPaymentId, setHighlightPaymentId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchStudents();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!payments.length) return;
    const focus = takeNotificationFocus();
    if (focus?.onModel === 'Payment' && focus.relatedId) {
      const id = String(focus.relatedId);
      setHighlightPaymentId(id);
      requestAnimationFrame(() => {
        document
          .querySelector(`#payment-row-desktop-${id}, #payment-row-mobile-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [payments]);

  const fetchPayments = async () => {
    const res = await axios.get('/api/payments');
    setPayments(res.data);
  };

  const fetchStudents = async () => {
    const res = await axios.get('/api/students');
    setStudents(res.data);
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/rooms'); // Assuming this endpoint exists and is accessible
      setRooms(res.data);
    } catch (error) {
      console.error("Failed to fetch rooms for pricing lookup", error);
    }
  };

  const getRentPrice = (studentId: string) => {
    const student = students.find(s => s._id === studentId);
    if (!student || !student.studentProfile?.roomNumber) return '';

    const room = rooms.find(r => r.roomNumber === student.studentProfile.roomNumber);
    return room ? String(room.price) : '';
  };

  const handleStudentChange = (studentId: string) => {
    let newAmount = formData.amount;

    // Auto-fill rent if type is rent
    if (formData.type === 'rent') {
      const rent = getRentPrice(studentId);
      if (rent) newAmount = rent;
    }

    setFormData({ ...formData, student_id: studentId, amount: newAmount });
  };

  const handleTypeChange = (type: string) => {
    let newAmount = formData.amount;

    // Auto-fill rent if switching TO rent and student is selected
    if (type === 'rent' && formData.student_id) {
      const rent = getRentPrice(formData.student_id);
      if (rent) newAmount = rent;
    }

    setFormData({ ...formData, type, amount: newAmount });
  };

  const openModal = (payment: any = null) => {
    if (payment) {
      setEditingId(payment.id);
      // Ensure we get the ID string whether it's populated or not
      const studentId = payment.student && typeof payment.student === 'object'
        ? payment.student._id
        : payment.student;

      setFormData({
        student_id: studentId || '',
        amount: String(payment.amount),
        type: payment.type,
        due_date: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : '', // Handle different date formats if needed
        status: payment.status,
        notes: payment.notes || '',
        receiptUrl: payment.receiptUrl || '',
        referenceNumber: payment.referenceNumber || '',
      });
    } else {
      setEditingId(null);
      setFormData({ ...emptyPayment });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const modalContent = document.getElementById('payment-modal-content');

    if (!formData.student_id || !formData.amount || !formData.due_date) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing fields',
        text: 'Student, amount, and due date are required.',
        confirmButtonColor: '#001F3F',
        target: modalContent || 'body'
      });
      return;
    }

    const payload = {
      student: formData.student_id, // Match backend expectation "student"
      amount: Number(formData.amount),
      type: formData.type,
      dueDate: formData.due_date, // Match backend expectation "dueDate"
      status: formData.status,
      notes: formData.notes,
      receiptUrl: formData.receiptUrl,
      referenceNumber: formData.referenceNumber,
    };

    try {
      if (editingId) {
        await axios.put(`/api/payments/${editingId}`, payload);
        setIsModalOpen(false);
        await Swal.fire({
          icon: 'success',
          title: 'Updated',
          text: 'Payment record updated.',
          confirmButtonColor: '#001F3F'
        });
      } else {
        await axios.post('/api/payments', payload);
        setIsModalOpen(false);
        await Swal.fire({
          icon: 'success',
          title: 'Created',
          text: 'Payment recorded.',
          confirmButtonColor: '#001F3F'
        });
      }
      fetchPayments();
    } catch (e) {
      console.error(e);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: (e as any).response?.data?.message || 'Operation failed.',
        confirmButtonColor: '#d33',
        target: modalContent || 'body'
      });
    }
  };

  const handleDelete = async (id: number) => {
    const res = await Swal.fire({
      title: 'Delete?',
      text: 'Confirm deletion?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });
    if (res.isConfirmed) {
      try {
        await axios.delete(`/api/payments/${id}`);
        fetchPayments();
        Swal.fire('Deleted', '', 'success');
      } catch (error) {
        Swal.fire('Error', 'Failed to delete payment.', 'error');
      }
    }
  };

  const handleReject = async (id: string | number) => {
    const { value: text } = await Swal.fire({
      title: 'Reject Payment',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Type your message here...',
      inputAttributes: {
        'aria-label': 'Reason for rejection'
      },
      showCancelButton: true,
      confirmButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write a reason!'
        }
      }
    });

    if (text) {
      try {
        const payment = payments.find(p => (p._id || p.id) === id);
        if (!payment) return;

        const updatedNotes = payment.notes 
          ? `${payment.notes}\nRejection Reason: ${text}` 
          : `Rejection Reason: ${text}`;

        const payload = {
          student: payment.student?._id || payment.student,
          amount: payment.amount,
          type: payment.type,
          dueDate: payment.dueDate,
          status: 'rejected',
          notes: updatedNotes,
          receiptUrl: payment.receiptUrl,
          referenceNumber: payment.referenceNumber,
        };

        await axios.put(`/api/payments/${id}`, payload);
        fetchPayments();
        Swal.fire('Rejected', 'Payment has been rejected.', 'success');
      } catch (error) {
        Swal.fire('Error', 'Failed to reject payment.', 'error');
      }
    }
  };

  const openBulkModal = () => {
    setBulkRows([{ ...emptyPayment }]);
    setIsBulkModalOpen(true);
  };

  const updateBulkRow = (idx: number, field: string, value: string) => {
    setBulkRows((rows) =>
      rows.map((row, i) => {
        if (i !== idx) return row;

        const updatedRow = { ...row, [field]: value };

        // Bulk Auto-fill Logic
        if (field === 'student_id') {
          if (updatedRow.type === 'rent') {
            const rent = getRentPrice(value);
            if (rent) updatedRow.amount = rent;
          }
        }

        if (field === 'type') {
          if (value === 'rent' && updatedRow.student_id) {
            const rent = getRentPrice(updatedRow.student_id);
            if (rent) updatedRow.amount = rent;
          }
        }

        return updatedRow;
      })
    );
  };

  const addBulkRow = () => setBulkRows((rows) => [...rows, { ...emptyPayment }]);

  const removeBulkRow = (idx: number) => {
    if (bulkRows.length === 1) return;
    setBulkRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleBulkSubmit = async () => {
    const invalid = bulkRows.some(
      (row) => !row.student_id || !row.amount || !row.due_date
    );

    if (invalid) {
      Swal.fire('Missing fields', 'Every row needs student, amount, and due date.', 'warning');
      return;
    }

    const payload = {
      payments: bulkRows.map((row) => ({
        ...row,
        student_id: Number(row.student_id),
        amount: Number(row.amount),
        referenceNumber: (row as any).referenceNumber,
      })),
    };

    try {
      await axios.post('/api/payments/bulk', payload);
      Swal.fire('Success', 'Bulk payments recorded.', 'success');
      setIsBulkModalOpen(false);
      fetchPayments();
    } catch (error) {
      Swal.fire('Error', 'Failed to save bulk payments.', 'error');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('DormSync Payment Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ["Student", "Ref #", "Amount", "Type", "Due Date", "Status", "Notes"];
    const tableRows: any[] = [];

    const dataToExport = payments; // Export all loaded payments, or change to currentPayments for current page only

    dataToExport.forEach(payment => {
      const paymentData = [
        payment.student?.name || 'Unknown',
        payment.referenceNumber || '--',
        `PHP ${Number(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        payment.type,
        new Date(payment.dueDate).toLocaleDateString(),
        payment.status,
        payment.notes || ''
      ];
      tableRows.push(paymentData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 31, 63] } // Match brand color
    });

    doc.save(`dormsync-payments-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const summary = {
    total: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    pending: payments.filter((p) => p.status === 'pending').length,
    overdue: payments.filter((p) => p.status === 'overdue').length,
    awaitingApproval: payments.filter((p) => p.status === 'submitted').length,
  };

  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return p.status === 'pending' || p.status === 'submitted' || p.status === 'overdue';
    if (activeTab === 'Approved') return p.status === 'paid' || p.status === 'verified';
    if (activeTab === 'Rejected') return p.status === 'rejected';
    return true;
  });

  const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(filteredPayments, 10);
  const currentPayments = currentData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[#001F3F] text-2xl font-bold">Payments</h2>
          <p className="text-gray-500 text-sm">Manage student payments and financial records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={exportToPDF}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50 text-xs md:text-sm px-2 md:px-4 flex-1 md:flex-none"
          >
            <FileText className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Export
          </Button>
          {!isStaff && (
            <>
              <Button
                onClick={openBulkModal}
                variant="outline"
                className="border-[#001F3F] text-[#001F3F] text-xs md:text-sm px-2 md:px-4 flex-1 md:flex-none"
              >
                <CopyPlus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Bulk Add
              </Button>
              <Button
                onClick={() => openModal()}
                className="bg-[#FFD700] text-[#001F3F] hover:bg-[#e6c200] text-xs md:text-sm px-2 md:px-4 flex-1 md:flex-none"
              >
                <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Record
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#001F3F]">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-2xl text-[#001F3F]">
            {currencyFormatter.format(summary.total)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">Pending Records</p>
          <p className="text-2xl text-orange-600">{summary.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Overdue Records</p>
          <p className="text-2xl text-red-600">{summary.overdue}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Awaiting Approval</p>
          <p className="text-2xl text-green-600">{summary.awaitingApproval}</p>
        </div>
      </div>

      {/* Shopee-style Status Tabs */}
      <div className="flex border-b border-gray-200 mt-6 mb-4 overflow-x-auto no-scrollbar">
        {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); jump(1); }}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-[#EE4D2D] text-[#EE4D2D]'
                : 'border-transparent text-gray-500 hover:text-[#EE4D2D]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#001F3F] text-white">
            <tr>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Ref #</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3">Proof</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentPayments.map((p: any) => {
              const pid = String(p._id || p.id);
              const isHi = highlightPaymentId && highlightPaymentId === pid;
              return (
              <tr
                key={pid}
                id={`payment-row-desktop-${pid}`}
                className={isHi ? 'bg-amber-50 ring-2 ring-inset ring-[#FFD700]' : undefined}
              >
                <td className="px-6 py-4">{p.student?.name || 'Unknown'}</td>
                <td className="px-6 py-4 font-mono text-xs">{p.referenceNumber || '--'}</td>
                <td className="px-6 py-4">{currencyFormatter.format(Number(p.amount || 0))}</td>
                <td className="px-6 py-4 capitalize">{p.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-6 py-4 text-sm">
                  {p.receiptUrl ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => window.open(p.receiptUrl, '_blank')}
                      >
                        View Receipt
                      </Button>
                    </div>
                  ) : p.status === 'paid' ? (
                    <span className="text-xs text-red-500 italic">No receipt</span>
                  ) : (
                    <span className="text-gray-400 text-xs">--</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs capitalize ${p.status === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : p.status === 'paid'
                        ? 'bg-blue-100 text-blue-800'
                        : p.status === 'submitted'
                          ? 'bg-indigo-100 text-indigo-800'
                          : p.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : p.status === 'rejected'
                              ? 'bg-gray-200 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  {p.status !== 'rejected' && p.status !== 'paid' && p.status !== 'verified' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setViewingPayment(p);
                        setIsReceiptModalOpen(true);
                      }}
                      title="View Receipt / Update Status"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                  )}



                  {!isStaff && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(p._id || p.id)}
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>

        {/* Pagination Controls Desktop */}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {currentPayments.map((p: any) => {
          const pid = String(p._id || p.id);
          const isHi = highlightPaymentId && highlightPaymentId === pid;
          return (
          <div
            key={pid}
            id={`payment-row-mobile-${pid}`}
            className={`bg-white p-4 rounded-lg shadow border ${isHi ? 'border-[#FFD700] ring-2 ring-[#FFD700]' : 'border-gray-100'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-[#001F3F]">{p.student?.name || 'Unknown'}</div>
                <div className="text-xs text-gray-500 mt-1">Ref: {p.referenceNumber || '--'}</div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs capitalize ${p.status === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : p.status === 'paid'
                    ? 'bg-blue-100 text-blue-800'
                    : p.status === 'submitted'
                      ? 'bg-indigo-100 text-indigo-800'
                      : p.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : p.status === 'rejected'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                  }`}
              >
                {p.status}
              </span>
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="text-xl font-bold text-[#001F3F]">{currencyFormatter.format(Number(p.amount || 0))}</span>
              <span className="text-sm text-gray-600 capitalize">{p.type}</span>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Due Date:</span> {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '--'}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <div>
                {p.receiptUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => window.open(p.receiptUrl, '_blank')}
                  >
                    <FileText className="w-3 h-3 mr-1" /> Receipt
                  </Button>
                ) : p.status === 'paid' ? (
                  <span className="text-xs text-red-500 italic">No receipt</span>
                ) : (
                  <span className="text-gray-400 text-xs">--</span>
                )}
              </div>
              <div className="flex gap-2">
                {p.status !== 'rejected' && p.status !== 'paid' && p.status !== 'verified' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setViewingPayment(p);
                      setIsReceiptModalOpen(true);
                    }}
                    className="h-8 w-8 text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}



                {!isStaff && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(p._id || p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
        })}
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

      {/* Single payment modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent id="payment-modal-content" className="bg-white z-[100] border-2 border-gray-200 shadow-xl w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Payment' : 'New Payment'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the payment details below.' : 'Enter the payment details below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Student</Label>
              <select
                className="w-full border rounded p-2"
                value={formData.student_id}
                onChange={(e) => handleStudentChange(e.target.value)}
              >
                <option value="">Select Student</option>
                {students.map((s: any) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount (PHP)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full border rounded p-2"
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full border rounded p-2"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="submitted">Submitted (Review)</option>
                <option value="paid">Paid</option>
                <option value="verified">Verified</option>
                <option value="overdue">Overdue</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <Label>Reference / Receipt #</Label>
              <Input
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="e.g. OR-12345"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional remarks about this payment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} className="bg-[#001F3F] text-white hover:bg-[#003366]">
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="bg-white z-[100] border-2 border-gray-200 shadow-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Add Payments</DialogTitle>
            <DialogDescription>
              Add multiple payment records at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                {bulkRows.length > 1 && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 text-xs text-red-500"
                    onClick={() => removeBulkRow(idx)}
                  >
                    Remove
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Student</Label>
                    <select
                      className="w-full border rounded p-2"
                      value={row.student_id}
                      onChange={(e) => updateBulkRow(idx, 'student_id', e.target.value)}
                    >
                      <option value="">Select Student</option>
                      {students.map((s: any) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Amount (PHP)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateBulkRow(idx, 'amount', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Reference #</Label>
                    <Input
                      value={(row as any).referenceNumber || ''}
                      onChange={(e) => updateBulkRow(idx, 'referenceNumber', e.target.value)}
                      placeholder="e.g. OR-12345"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full border rounded p-2"
                      value={row.type}
                      onChange={(e) => updateBulkRow(idx, 'type', e.target.value)}
                    >
                      <option value="rent">Rent</option>
                      <option value="utilities">Utilities</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={row.due_date}
                      onChange={(e) => updateBulkRow(idx, 'due_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full border rounded p-2"
                      value={row.status}
                      onChange={(e) => updateBulkRow(idx, 'status', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={row.notes}
                    onChange={(e) => updateBulkRow(idx, 'notes', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addBulkRow}>
              Add Another Payment
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={handleBulkSubmit} className="bg-[#001F3F] text-white hover:bg-[#003366]">
              Save Bulk Payments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Student Receipt Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="bg-white z-[100] border-2 border-gray-200 shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center pb-2 border-b">Student receipt</DialogTitle>
            <DialogDescription className="sr-only">View and verify student payment receipt</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center p-4 min-h-[300px]">
            {viewingPayment?.receiptUrl ? (
              <div className="w-full relative border rounded-lg overflow-hidden">
                <img
                  src={viewingPayment.receiptUrl}
                  alt="Receipt"
                  className="w-full h-auto object-contain max-h-[60vh]"
                />
                <a
                  href={viewingPayment.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded"
                >
                  Open Original
                </a>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                No uploaded receipt yet
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-center gap-2 sm:justify-center">
            {!isStaff && (
              <>
                <Button
                  className="bg-[#001F3F] hover:bg-[#003366] text-white min-w-[100px]"
                  onClick={async () => {
                    if (!viewingPayment) return;
                    try {
                      await axios.patch(`/api/payments/${viewingPayment._id || viewingPayment.id}`, { status: 'paid' });
                      setIsReceiptModalOpen(false);
                      fetchPayments();
                      Swal.fire('Updated', 'Payment marked as Paid.', 'success');
                    } catch (e) {
                      console.error(e);
                      Swal.fire('Error', 'Failed to update status.', 'error');
                    }
                  }}
                >
                  Paid
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]"
                  onClick={async () => {
                    if (!viewingPayment) return;
                    const { value: text } = await Swal.fire({
                      title: 'Reject Payment',
                      input: 'textarea',
                      inputLabel: 'Reason for rejection',
                      inputPlaceholder: 'Enter reason here...',
                      showCancelButton: true
                    });
                    if (text) {
                      try {
                        await axios.patch(`/api/payments/${viewingPayment._id || viewingPayment.id}`, { status: 'rejected', notes: text });
                        setIsReceiptModalOpen(false);
                        fetchPayments();
                        Swal.fire('Rejected', 'Payment was rejected.', 'success');
                      } catch (e) {
                        console.error(e);
                        Swal.fire('Error', 'Failed to update status.', 'error');
                      }
                    }
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            <Button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 min-w-[100px]"
              onClick={() => setIsReceiptModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}