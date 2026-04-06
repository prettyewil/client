import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User, StudentProfile } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<any>;
  googleLogin: (credential: string) => Promise<any>;
  setSessionFromOauth: (token: string, apiUser: any) => void;
  updateProfile: (data: any) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
  isAppLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'dormsync_session';

function mapApiUser(apiUser: any): User {
  let studentProfile: StudentProfile | undefined;

  if (apiUser?.student_profile || apiUser?.studentProfile) {
    const sp = apiUser.student_profile || apiUser.studentProfile;
    studentProfile = {
      id: sp.id,
      userId: sp.user_id || sp.userId,
      roomId: sp.room_id || sp.roomId,
      roomNumber: sp.room_number || sp.roomNumber || sp.room?.code || '',
      phoneNumber: sp.phone_number || sp.phoneNumber,
      emergencyContactName: sp.emergency_contact_name || sp.emergencyContactName,
      emergencyContactPhone: sp.emergency_contact_phone || sp.emergencyContactPhone,
      enrollmentDate: sp.enrollment_date || sp.enrollmentDate,
      status: sp.status,
    };
  }

  return {
    id: apiUser.id || apiUser._id,
    name: apiUser.name,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    middleInitial: apiUser.middleInitial,
    email: apiUser.email,
    role: apiUser.role,
    status: apiUser.status || 'approved', // Default to approved for existing users
    studentProfile: studentProfile,
    studentId: apiUser.studentId
  }
}

function persistSession(token: string, user: User) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState<number>(15 * 60 * 1000); // 15 mins default
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.token) {
        setUser(parsed.user);
        setToken(parsed.token);
        axios.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setToken(null);
      }
    }
    setIsAppLoading(false);
  }, []);

  // Fetch settings whenever token changes to a valid one
  useEffect(() => {
    if (token) {
      axios.get('/api/settings').then((res) => {
        if (res.data && res.data.sessionTimeout) {
          setSessionTimeoutMs(res.data.sessionTimeout * 60 * 1000);
        }
      }).catch(err => console.error('Failed to fetch settings for timeout:', err));
    }
  }, [token]);

  // Activity tracker
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    if (user && token) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('click', handleActivity);
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [user, token]);

  // Inactivity checker
  useEffect(() => {
    if (!user || !token) return;

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > sessionTimeoutMs) {
        logout();
        window.location.href = '/login?timeout=1'; // Redirect or let protected route handle it
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [user, token, lastActivity, sessionTimeoutMs]);

  const setSession = (nextToken: string, apiUser: any) => {
    console.log('setSession apiUser:', apiUser);
    const mapped = mapApiUser(apiUser);
    console.log('setSession mapped:', mapped);
    setUser(mapped);
    setToken(nextToken);
    persistSession(nextToken, mapped);
  };

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email: identifier, password });
      
      if (res.data.requires2FA) {
        return res.data;
      }

      setSession(res.data.token, res.data);
      return res.data;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/google', { token: credential });

      if (res.data.requires2FA) {
        return res.data;
      }

      setSession(res.data.token, res.data);
      return res.data;
    } finally {
      setIsLoading(false);
    }
  };

  const setSessionFromOauth = (nextToken: string, apiUser: any) => {
    setSession(nextToken, apiUser);
  };

  const updateProfile = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await axios.put('/api/auth/profile', data);
      // If backend doesn't return a new token, keep the old one
      setSession(res.data.token || token!, res.data);
      return res.data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common.Authorization;
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, googleLogin, setSessionFromOauth, updateProfile, logout, isLoading, isAppLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
