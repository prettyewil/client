import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, Mail, AlertCircle, ShieldCheck, User, Briefcase } from 'lucide-react';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [step, setStep] = useState<'details' | 'otp' | 'reset-otp' | 'reset-password'>('details');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, googleLogin, isLoading, setSessionFromOauth } = useAuth();

  // To store email for OTP verification
  const [registerEmail, setRegisterEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await login(identifier, password);
    } catch (err: any) {
      if (err.response?.status === 403 && (err.response?.data?.code === 'PENDING_APPROVAL' || err.response?.data?.message?.includes('pending'))) {
        setError('Account is pending approval. Please wait for admin confirmation.');
        return;
      }
      const message = err.response?.data?.message || 'Invalid credentials';
      setError(String(message));
    }
  };

  const onGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        const result = await googleLogin(credentialResponse.credential);
        if (result && result.status === 'pending') {
          setSuccess('Registration successful. Please wait for admin approval.');
          return;
        }
      }
    } catch (err: any) {
      console.error("Google Login Error", err);
      if (err.response?.status === 403 && (err.response?.data?.code === 'PENDING_APPROVAL' || err.response?.data?.message?.includes('pending'))) {
        setError('Account is pending approval. Please wait for admin confirmation.');
        return;
      }

      setError('Google login failed.');
    }
  };

  const onGoogleError = () => {
    setError('Google login failed.');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (role === 'student' && !studentId) {
      setError('Student ID is required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          middleInitial,
          email: identifier,
          studentId: role === 'student' ? studentId : undefined,
          password,
          role,
          studentProfile: role === 'student' ? {
            roomNumber: 'TBD',
            phoneNumber: phoneNumber ? `+63${phoneNumber.replace(/^0+/, '')}` : '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            status: 'inactive'
          } : undefined
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as any;
        throw new Error(data.message || 'Registration failed');
      }

      const data = await res.json();
      setRegisterEmail(identifier);
      setSuccess('OTP sent to your email. You have 10 minutes.');
      setStep('otp');

    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          otp
        }),
      });
      const data = await res.json();
      console.log('Verify OTP Response:', data);
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      if (data.token) {
        console.log('Token received, setting session...');
        setSessionFromOauth(data.token, data);
      } else {
        console.log('No token received, switching to login mode.');
        setSuccess('Verification successful. Please login.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRegisterEmail(identifier);
      setSuccess('OTP sent to your email.');
      setStep('reset-otp');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess('OTP Verified. Please set your new password.');
      setStep('reset-password');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          otp,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess('Password reset successfully. Please login.');
      setMode('login');
      setStep('details');
    } catch (err: any) {
      setError(err.message);
    }
  };


  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001F3F] to-[#003366] p-4">
      {/* Back Button for Login/Register modes */}

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFD700] rounded-full mb-4">
              <Lock className="w-8 h-8 text-[#001F3F]" />
            </div>
            <h1 className="text-[#001F3F]">DormSync</h1>
            <p className="text-gray-600 mt-2">Dormitory Management System</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Mode Toggle */}
          {mode !== 'forgot-password' && (
            <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200">
              <button
                type="button"
                onClick={() => { setMode('login'); setStep('details'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-[#001F3F] text-white' : 'bg-white text-gray-700'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setStep('details'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'bg-[#001F3F] text-white' : 'bg-white text-gray-700'}`}
              >
                Register
              </button>
            </div>
          )}

          {mode === 'forgot-password' ? (
            step === 'details' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <h3 className="text-center font-semibold text-[#001F3F]">Recovery</h3>
                <p className="text-sm text-center text-gray-600">Enter your email to receive an OTP.</p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                    placeholder="Email Address"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-[#001F3F] text-white py-2.5 rounded-lg hover:bg-[#003366]">
                  Send OTP
                </button>
                <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                  Back to Login
                </button>
              </form>
            ) : step === 'reset-otp' ? (
              <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                <h3 className="text-center font-semibold text-[#001F3F]">Verify OTP</h3>
                <p className="text-sm text-center text-gray-600">Enter the 6-digit code sent to {registerEmail}</p>
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center text-2xl tracking-[0.5em] font-bold px-3 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#FFD700]"
                    placeholder="000000"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-[#001F3F] text-white py-2.5 rounded-lg hover:bg-[#003366]">
                  Verify OTP
                </button>
                <button type="button" onClick={() => setStep('details')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                  Back
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <h3 className="text-center font-semibold text-[#001F3F]">Set New Password</h3>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-[#001F3F] text-white py-2.5 rounded-lg hover:bg-[#003366]">
                  Reset Password
                </button>
              </form>
            )
          ) : isRegister ? (
            step === 'details' ? (
              <form onSubmit={handleRegister} className="space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                      placeholder="First Name"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={middleInitial}
                      onChange={(e) => setMiddleInitial(e.target.value)}
                      maxLength={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                      placeholder="M.I."
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                    placeholder="Last Name"
                    required
                  />
                </div>

                {role === 'student' && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                        placeholder="Student ID"
                        required
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">+63</span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                        placeholder="9123456789"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                    placeholder="Email Address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                      placeholder="Password"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                      placeholder="Confirm"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#001F3F] text-white py-2.5 rounded-lg hover:bg-[#003366] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Sending OTP...' : 'Next: Verify Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-600">Enter the 6-digit code sent to <span className="font-bold">{registerEmail}</span>{phoneNumber && <span> and <span className="font-bold">+63{phoneNumber}</span></span>}</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center text-2xl tracking-[0.5em] font-bold px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#001F3F] text-white py-2.5 rounded-lg hover:bg-[#003366] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Details
                </button>
              </form>
            )
          ) : (
            // Login view
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                      placeholder="Email or Student ID"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent outline-none"
                      placeholder="Password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot-password'); setStep('details'); setError(''); }}
                    className="text-sm text-[#001F3F] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#FFD700] text-[#001F3F] py-3 rounded-lg hover:bg-[#FFC700] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6">
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={onGoogleError}
                    useOneTap
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/70 text-sm mt-6">
          © 2026 DormSync. All rights reserved.
        </p>
      </div>
    </div>
  );
}