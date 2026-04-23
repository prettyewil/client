import React, { useEffect, useState } from 'react';
import { PhilippinePeso, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { usePagination } from '../hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { takeNotificationFocus } from '../utils/notificationFocus';
import { generatePaymentSlip } from '../utils/pdfGenerator';

interface Payment {
  _id: string;
  amount: number;
  type: string;
  status: 'paid' | 'pending' | 'overdue' | 'verified' | 'submitted' | 'rejected';
  dueDate: string; // Changed from due_date
  receiptUrl?: string; // Changed/Standardized
}

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

export function StudentPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [receiptLinks, setReceiptLinks] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [highlightPaymentId, setHighlightPaymentId] = useState<string | null>(null);

  const actionablePayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'rejected'
  );
  const historyPayments = payments
    .filter((p) => ['paid', 'verified', 'submitted'].includes(p.status))
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 1);

  const displayedPayments = [...actionablePayments, ...historyPayments].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );

  // Find the next due payment (soonest pending/overdue)
  const nextDuePayment = actionablePayments
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(displayedPayments, 5);
  const currentPayments = currentData();

  useEffect(() => {
    if (!user) return;
    fetchPayments();
  }, [user]);

  useEffect(() => {
    if (!payments.length) return;
    const focus = takeNotificationFocus();
    if (focus?.onModel === 'Payment' && focus.relatedId) {
      const id = String(focus.relatedId);
      setHighlightPaymentId(id);
      requestAnimationFrame(() => {
        document.getElementById(`payment-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [payments]);

  const fetchPayments = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/payments/my-history');
      setPayments(res.data);
    } catch (error) {
      console.error('Error loading payments', error);
    }
  };

  const handleFileChange = (paymentId: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [paymentId]: file }));
  };

  const handleUrlChange = (paymentId: string, url: string) => {
    setReceiptLinks((prev) => ({ ...prev, [paymentId]: url }));
  };

  const handleSubmitReceipt = async (payment: Payment) => {
    const file = files[payment._id];

    if (!file) {
      Swal.fire('Missing Receipt', 'Please select an image file to upload.', 'warning');
      return;
    }

    setSubmittingId(payment._id);

    try {
      const formData = new FormData();
      // Since we are uploading a receipt, we can assume the status implies 'paid' or 'verification pending'.
      // However, the backend logic for updates relies on 'status' being passed if we want to change it.
      // Let's set it to 'paid' as per original logic, or maybe just upload the file.
      // The instructions say "admin can see the receipt", usually this implies a state change to 'paid' or 'pending approval'.
      // Let's set it to 'submitted' so admin can verify it.
      formData.append('status', 'submitted');
      formData.append('receipt_image', file);

      await axios.patch(`/api/payments/${payment._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Swal.fire('Submitted', 'Your receipt was uploaded. Please wait for admin approval.', 'success');
      setFiles((prev) => ({ ...prev, [payment._id]: null }));
      fetchPayments();
    } catch (error: any) {
      console.error(error);
      Swal.fire(
        'Error',
        error.response?.data?.message || 'Failed to submit receipt. Please try again.',
        'error',
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const pendingOrOverdue = payments.filter(
    (p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'rejected',
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-[#001F3F] mb-4">Recent Payments</h3>

      {/* Next Due Payment Banner */}
      {nextDuePayment && (
        <div className="mb-4 p-4 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 text-white p-2 rounded-full animate-pulse shadow-sm">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-700 flex items-center gap-2 uppercase tracking-tight">
                Next Payment Due
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">
                  {nextDuePayment.status === 'overdue'
                    ? `${Math.abs(getDaysUntilDue(nextDuePayment.dueDate))} days late`
                    : getDaysUntilDue(nextDuePayment.dueDate) === 0
                      ? 'Today'
                      : `in ${getDaysUntilDue(nextDuePayment.dueDate)} days`
                  }
                </span>
              </p>
              <p className="text-lg font-bold text-red-900 leading-tight">
                {currencyFormatter.format(nextDuePayment.amount)} · {nextDuePayment.type}
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block border-l pl-4 border-red-200">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Due Date</p>
            <p className="text-sm font-bold text-gray-700">
              {moment(nextDuePayment.dueDate).format('MMM DD, YYYY')}
            </p>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">No payment records found.</p>
      ) : (
        <div className="space-y-4">
          {currentPayments.map((p) => {
            const isHi = highlightPaymentId && highlightPaymentId === p._id;
            const isNextDue = nextDuePayment && nextDuePayment._id === p._id;
            const needsAction = p.status === 'pending' || p.status === 'overdue' || p.status === 'rejected';

            return (
              <div
                key={p._id}
                id={`payment-row-${p._id}`}
                className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                  isHi
                    ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/30'
                    : isNextDue
                      ? 'border-red-200 bg-white'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      p.status === 'verified' || p.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-600'
                        : p.status === 'submitted'
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-amber-100 text-amber-600'
                    }`}>
                      <PhilippinePeso className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900">{currencyFormatter.format(p.amount)}</span>
                        <span className="text-xs font-medium text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded uppercase">{p.type}</span>
                        {isNextDue && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white tracking-tight">NEXT DUE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">
                          Due: {moment(p.dueDate).format('MMM DD, YYYY')}
                        </span>
                        <span className={`flex items-center gap-1 font-medium capitalize ${
                          p.status === 'verified' ? 'text-emerald-600' :
                          p.status === 'submitted' ? 'text-indigo-600' :
                          p.status === 'overdue' ? 'text-red-600' :
                          'text-amber-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'verified' ? 'bg-emerald-500' :
                            p.status === 'submitted' ? 'bg-indigo-500' :
                            p.status === 'overdue' ? 'bg-red-500' :
                            'bg-amber-500'
                          }`} />
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {/* Payment Slip Button - Always available for unpaid or verified/paid */}
                    {(needsAction || p.status === 'verified' || p.status === 'paid') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => generatePaymentSlip(p, user)}
                      >
                        Download Slip
                      </Button>
                    )}

                    {/* Submit Proof Section */}
                    {needsAction && (p.status === 'rejected' || !p.receiptUrl) && (
                      <div className="flex items-center gap-2 border-l pl-2 ml-2 border-gray-200">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(p._id, e.target.files ? e.target.files[0] : null)}
                          />
                          <div className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                            files[p._id] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}>
                            {files[p._id] ? files[p._id]?.name.slice(0, 10) + '...' : 'Select Receipt'}
                          </div>
                        </label>
                        <Button
                          size="sm"
                          className="h-8 bg-[#001F3F] text-white hover:bg-[#003366] text-xs"
                          onClick={() => handleSubmitReceipt(p)}
                          disabled={submittingId === p._id || !files[p._id]}
                        >
                          {submittingId === p._id ? '...' : 'Upload'}
                        </Button>
                      </div>
                    )}

                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:underline px-2 py-1 bg-blue-50 rounded"
                      >
                        View Proof
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {maxPage > 1 && (
        <div className="mt-4">
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

      {pendingOrOverdue.length === 0 && (
        <p className="text-xs text-gray-500 mt-4">
          You have no pending, overdue, or rejected payments requiring proof at the moment.
        </p>
      )}
    </div>
  );
}




