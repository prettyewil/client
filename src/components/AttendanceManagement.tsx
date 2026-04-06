
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Calendar, Clock, UserCheck, UserX, Scan, Search } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { usePagination } from '../hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

interface AttendanceLogDto {
  _id: string; // Changed from id: number
  student: { _id: string; name: string; studentProfile?: { roomNumber?: string } } | string;
  date: string;
  timeIn?: string | null; // Changed from check_in
  timeOut?: string | null; // Changed from check_out
  status: 'present' | 'absent' | 'late';
}

interface StudentOption {
  _id: string;
  name: string;
  studentProfile?: { roomNumber?: string };
}

export function AttendanceManagement() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceLogDto[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStudentId, setManualStudentId] = useState('');

  useEffect(() => {
    if (user?.role !== 'student') {
      fetchAttendance(selectedDate);
      fetchTotalStudents();
    }
  }, [selectedDate, user]);

  const fetchTotalStudents = async () => {
    try {
      const res = await axios.get('/api/students');
      setStudentsList(res.data);
      setTotalStudents(res.data.length);
    } catch (error) {
      console.error('Error fetching students', error);
    }
  };

  const fetchAttendance = async (date: string) => {
    try {
      const res = await axios.get('/api/attendance', { params: { date } });
      setAttendance(res.data);
    } catch (error) {
      console.error('Error fetching attendance', error);
      Swal.fire('Error', 'Failed to load attendance logs.', 'error');
    }
  };

  const getStatusBasedOnTime = (date: Date): 'present' | 'late' => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const ninePM = 21 * 60; // 9:00 PM

    if (timeInMinutes < ninePM) {
      return 'present';
    } else {
      return 'late';
    }
  };

  const recordAttendance = async (studentId: string, date: string, type: 'check_in' | 'check_out', logId?: string) => {
    try {
      const now = new Date();
      const status = type === 'check_in' ? getStatusBasedOnTime(now) : 'present'; // Default to present/late logic

      // Backend expects 'student', 'date', 'timeIn', 'timeOut'
      const payload: any = {
        student: studentId,
        date: date,
      };

      if (type === 'check_in') {
        payload.timeIn = now;
        payload.status = status;
      } else {
        payload.timeOut = now;
        // Do not update status on check-out, preserve original check-in status
      }

      if (logId) {
        await axios.put(`/api/attendance/${logId}`, payload);
      } else {
        await axios.post('/api/attendance', payload);
      }
      await fetchAttendance(selectedDate);
    } catch (error: any) {
      throw error;
    }
  };

  const processAttendanceAction = async (studentId: string, studentName: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await axios.get('/api/attendance', { params: { date: today } });
      const logs: AttendanceLogDto[] = res.data;

      const existingLog = logs.find((l) => {
        const sId = typeof l.student === 'string' ? l.student : l.student?._id;
        return sId === studentId;
      });

      let type: 'check_in' | 'check_out' = 'check_in';

      if (existingLog) {
        if (existingLog.timeIn && !existingLog.timeOut) {
          type = 'check_out';
        } else if (existingLog.timeIn && existingLog.timeOut) {
          Swal.fire('Already Recorded', `${studentName} has already checked in and out today.`, 'info');
          return;
        }
      }

      await recordAttendance(studentId, today, type, existingLog?._id);

      const status = type === 'check_in' ? getStatusBasedOnTime(new Date()) : (existingLog?.status || 'present');

      Swal.fire(
        'Success',
        `${type === 'check_in' ? `Check-In Recorded (${status.toUpperCase()})` : 'Check-Out Recorded'} for ${studentName}`,
        'success'
      );
    } catch (error: any) {
      console.error('Attendance Error', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Operation Failed';
      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const handleScan = async (text: string) => {
    if (!text) return;

    try {
      const data = JSON.parse(text);
      if (!data.id) throw new Error('Invalid QR Code: Missing ID');

      setIsScannerOpen(false);
      await processAttendanceAction(data.id, data.name);
    } catch (error: any) {
      console.error('Scan Error', error);
      Swal.fire('Error', 'Invalid QR Code or Scan Failed', 'error');
    }
  };

  const handleManualSubmit = async () => {
    if (!manualStudentId) {
       Swal.fire('Error', 'Please select a student', 'warning');
       return;
    }
    const student = studentsList.find(s => s._id === manualStudentId);
    if (!student) return;

    setIsManualModalOpen(false);
    await processAttendanceAction(student._id, student.name);
    setManualStudentId('');
  };

  const formatTime = (time?: string | null) => {
    if (!time) return null;
    const date = new Date(time);
    if (isNaN(date.getTime())) return null; // Invalid date
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredAttendance = attendance.filter((log) => {
    if (!searchTerm) return true;
    const student = typeof log.student === 'string' ? null : log.student;
    const name = student?.name || 'Unknown';
    const room = student?.studentProfile?.roomNumber || 'N/A';
    const term = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(term) || room.toLowerCase().includes(term);
  });
  
  const presentCount = filteredAttendance.filter(a => a.status === 'present').length;
  const lateCount = filteredAttendance.filter(a => a.status === 'late').length;

  // Calculate Absent: 
  // 1. Explicitly marked 'absent' in logs (manual override or past logic)
  // 2. PLUS students who haven't checked in by 11:59 PM
  const explicitAbsentCount = filteredAttendance.filter(a => a.status === 'absent').length;

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const currentTime = new Date();

  // Absent only counts if day is effectively over (passed 11:59 PM for today)
  // Since we can't check 'passed 11:59PM' for *today* while it is *today* (it would be tomorrow),
  // we count absent for today only if the time is essentially end of day? 
  // Or maybe the user implies checking *at* 11:59.
  // Let's strictly follow: "when the student did not apear in 11:59 the student should be absent"
  // This implies we can only definitively say they are absent once 11:59 PM has passed.
  const isEndOfDay = currentTime.getHours() === 23 && currentTime.getMinutes() >= 59;

  // If viewing past dates, any missing log is absent.
  // For today, only count as absent if it's 11:59 PM or later.
  const isPastDate = new Date(selectedDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const missingLogsVal = totalStudents - filteredAttendance.length;

  const unaccountedAbsent = (isPastDate || (isToday && isEndOfDay))
    ? Math.max(0, missingLogsVal)
    : 0;

  const absentCount = explicitAbsentCount + unaccountedAbsent;

  const { currentData, currentPage, maxPage, jump, next, prev } = usePagination(filteredAttendance, 10);
  const currentLogs = currentData();

  if (user?.role === 'student') {
    const qrData = JSON.stringify({
      id: user.id || (user as any)._id,
      name: user.name,
      room: user.studentProfile?.roomNumber || 'N/A'
    });

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-10">
        <h2 className="text-2xl font-bold text-[#001F3F] mb-6">My Digital ID</h2>
        <div className="bg-white p-4 rounded-xl border-4 border-[#001F3F]">
          <QRCode
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={qrData}
            viewBox={`0 0 256 256`}
          />
        </div>
        <div className="mt-6 text-center">
          <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
          <p className="text-gray-600">Room: {user.studentProfile?.roomNumber || 'N/A'}</p>

        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg w-full text-center">
          <p className="text-sm text-[#001F3F]">
            Show this QR code to the admin to Check In or Check Out.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-[#001F3F] text-2xl font-bold">Attendance & Curfew Management</h2>
          <p className="text-gray-600 text-sm mt-1">Track student check-in and check-out logs</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {user && (
            <Button
              onClick={() => setShowMyQR(true)}
              variant="outline"
              className="w-full md:w-auto flex items-center justify-center gap-2 border-[#001F3F] text-[#001F3F] hover:bg-gray-50"
            >
              <Scan className="w-5 h-5" />
              My QR
            </Button>
          )}
          <Button
            onClick={() => setIsManualModalOpen(true)}
            variant="outline"
            className="w-full md:w-auto flex items-center justify-center gap-2 border-[#001F3F] text-[#001F3F] hover:bg-gray-50"
          >
            <UserCheck className="w-5 h-5" />
            Manual Entry
          </Button>
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="w-full md:w-auto bg-[#001F3F] text-white hover:bg-[#003366] flex items-center justify-center gap-2"
          >
            <Scan className="w-5 h-5" />
            Scan QR
          </Button>
        </div>
      </div>

      {/* Scanner Modal */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Scan Student QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm aspect-square overflow-hidden rounded-lg bg-black relative">
              <Scanner
                onScan={(result) => result?.[0]?.rawValue && handleScan(result[0].rawValue)}
                onError={(error) => console.error(error)}
                components={{ torch: false }}
              />
              <div className="absolute inset-0 border-2 border-[#FFD700] opacity-50 pointer-events-none"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              Align the QR code within the frame to scan.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* My QR Code Modal */}
      <Dialog open={showMyQR} onOpenChange={setShowMyQR}>
        <DialogContent className="sm:max-w-md flex flex-col items-center bg-white">
          <DialogHeader>
             <DialogTitle>My QR Code</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-4 rounded-xl border-4 border-[#001F3F] mt-4">
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={JSON.stringify({
                id: user?.id || (user as any)?._id,
                name: user?.name,
                room: user?.role === 'staff' ? 'Staff' : 'Admin'
              })}
              viewBox={`0 0 256 256`}
            />
          </div>
          <p className="mt-4 text-[#001F3F] text-center text-sm font-medium">Scan this to log your attendance.</p>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Modal */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <label className="text-sm font-medium text-gray-700">Select Student</label>
            <select
              className="w-full border rounded p-2 text-sm"
              value={manualStudentId}
              onChange={(e) => setManualStudentId(e.target.value)}
            >
              <option value="">-- Choose a Student --</option>
              {studentsList.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.studentProfile?.roomNumber || 'No Room'})</option>
              ))}
            </select>
            <Button className="bg-[#001F3F] text-white hover:bg-[#003366] mt-4" onClick={handleManualSubmit}>
              Submit Attendance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters (Date & Search) */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700 flex items-center gap-2 font-medium">
            <Calendar className="w-5 h-5 text-gray-600" />
            Select Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
          />
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search student or room..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 border-gray-300 focus:ring-[#FFD700]"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#001F3F]">
          <p className="text-sm text-gray-600 mb-1">Total Students</p>
          <p className="text-2xl text-[#001F3F]">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-600">Present</p>
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl text-green-700">{presentCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-600">Late</p>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl text-orange-700">{lateCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-600">Absent</p>
            <UserX className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl text-red-700">{absentCount}</p>
        </div>
      </div>

      {/* Desktop Attendance Table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-[#001F3F] font-semibold">
            Attendance Log -{' '}
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#001F3F] text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm">Student Name</th>
                <th className="px-6 py-3 text-left text-sm">Room Number</th>
                <th className="px-6 py-3 text-left text-sm">Check-In Time</th>
                <th className="px-6 py-3 text-left text-sm">Check-Out Time</th>
                <th className="px-6 py-3 text-left text-sm">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentLogs.map((log) => {
                const student = typeof log.student === 'string' ? null : log.student;
                const name = student?.name || 'Unknown';
                const initials = name
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('');
                const room = student?.studentProfile?.roomNumber || 'N/A';

                return (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#001F3F] text-white rounded-full flex items-center justify-center text-sm">
                          {initials}
                        </div>
                        <span>{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 px-3 py-1 rounded text-sm">{room}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatTime(log.timeIn) ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          {formatTime(log.timeIn)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatTime(log.timeOut) ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          {formatTime(log.timeOut)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs ${log.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : log.status === 'late'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                          } `}
                      >
                        {log.status === 'present' ? (
                          <UserCheck className="w-3 h-3" />
                        ) : log.status === 'late' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <UserX className="w-3 h-3" />
                        )}
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
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
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        <h3 className="text-[#001F3F] font-semibold px-1">
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h3>
        {currentLogs.map((log) => {
          const student = typeof log.student === 'string' ? null : log.student;
          const name = student?.name || 'Unknown';
          const initials = name
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .join('');
          const room = student?.studentProfile?.roomNumber || 'N/A';

          return (
            <div key={log._id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#001F3F] text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {initials}
                  </div>
                  <div>
                    <div className="font-semibold text-[#001F3F]">{name}</div>
                    <div className="text-xs text-gray-500">Room: {room}</div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${log.status === 'present'
                    ? 'bg-green-100 text-green-700'
                    : log.status === 'late'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                    } `}
                >
                  {log.status === 'present' ? (
                    <UserCheck className="w-3 h-3" />
                  ) : log.status === 'late' ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    <UserX className="w-3 h-3" />
                  )}
                  {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
                <div>
                  <span className="text-gray-500 text-xs block mb-1">Check-In</span>
                  {formatTime(log.timeIn) ? (
                    <div className="flex items-center gap-1 font-medium text-gray-700">
                      <Clock className="w-3 h-3 text-green-600" />
                      {formatTime(log.timeIn)}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-1">Check-Out</span>
                  {formatTime(log.timeOut) ? (
                    <div className="flex items-center gap-1 font-medium text-gray-700">
                      <Clock className="w-3 h-3 text-red-600" />
                      {formatTime(log.timeOut)}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
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
    </div>
  );
}

