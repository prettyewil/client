export type UserRole = 'admin' | 'manager' | 'student' | 'staff';

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  email: string;
  role: UserRole;
  studentProfile?: StudentProfile;
  studentId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  /** Seeded test accounts: skip pending gates and go to main dashboard */
  skipEmailOtp?: boolean;
}

export interface StudentProfile {
  id: number;
  userId: number;
  roomId?: number;
  roomNumber: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  enrollmentDate: string;
  status: 'active' | 'inactive';
}

export interface Payment {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  type: 'rent' | 'utilities' | 'maintenance' | 'deposit';
  status: 'paid' | 'pending' | 'overdue' | 'verified';
  dueDate: string;
  paidDate?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface MaintenanceRequest {
  id: number;
  studentId: number;
  studentName: string;
  roomNumber: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  attachmentUrl?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  priority: 'normal' | 'important' | 'urgent';
}

export interface AttendanceLog {
  id: number;
  studentId: number;
  studentName: string;
  roomNumber: string;
  checkIn?: string;
  checkOut?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface CleaningSchedule {
  id: number;
  area: string;
  assignedTo: string;
  scheduledDate: string;
  status: 'pending' | 'completed';
  notes?: string;
  calendarEventId?: string;
}

export interface DashboardStats {
  totalStudents: number;
  pendingMaintenance: number;
  pendingCleaning: number;
  overduePayments: number;
}

export interface Room {
  _id: string; // MongoDB ID
  roomNumber: string;
  type?: string;
  capacity: number;
  price: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
  features: string[];
  students_count?: number;
  student_names?: string[];
}
