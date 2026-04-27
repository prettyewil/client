import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

interface Room {
    _id: string;
    roomNumber: string;
}

export function CompleteProfile() {
    const { user, updateProfile, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        studentId: '',
        // room_id removed
        phoneNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.studentId || !formData.phoneNumber) {
            Swal.fire('Missing Fields', 'Please fill in all required fields.', 'warning');
            return;
        }

        setLoading(true);
        try {
            // First update the profile
            const payload = {
                studentId: formData.studentId,
                studentProfile: {
                    // room_id removed
                    phoneNumber: formData.phoneNumber,
                    emergencyContactName: formData.emergencyContactName,
                    emergencyContactPhone: formData.emergencyContactPhone,
                    status: 'pending' // Still pending until admin approves
                }
            };

            await updateProfile(payload);

            // Should now be redirected to "Pending Validation" screen by App.tsx
            Swal.fire({
                title: 'Profile Submitted',
                text: 'Your details have been saved. Please wait for admin approval.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.reload(); // Reload to refresh user state and trigger app routing checks
            });

        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isStudent = user?.role === 'student';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-[#001F3F]">
                    Complete Your Profile
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Please provide your details to finish registration.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {isStudent && (
                            <div>
                                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                                    Student ID <span className="text-red-500">*</span>
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="studentId"
                                        name="studentId"
                                        type="text"
                                        required
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#001F3F] focus:border-[#001F3F] sm:text-sm"
                                        value={formData.studentId}
                                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Room selection removed */}

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="phone"
                                    name="phone"
                                    type="text"
                                    required
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#001F3F] focus:border-[#001F3F] sm:text-sm"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="emergencyName" className="block text-sm font-medium text-gray-700">
                                Emergency Contact Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="emergencyName"
                                    name="emergencyName"
                                    type="text"
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#001F3F] focus:border-[#001F3F] sm:text-sm"
                                    value={formData.emergencyContactName}
                                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">
                                Emergency Contact Phone
                            </label>
                            <div className="mt-1">
                                <input
                                    id="emergencyPhone"
                                    name="emergencyPhone"
                                    type="text"
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#001F3F] focus:border-[#001F3F] sm:text-sm"
                                    value={formData.emergencyContactPhone}
                                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#001F3F] hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001F3F]"
                            >
                                {loading ? 'Saving...' : 'Complete Registration'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Or
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={logout}
                                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001F3F]"
                            >
                                Cancel & Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
