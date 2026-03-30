import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { Settings, Save, Clock, Database, ShieldAlert, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function SystemSettings() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';

    const [settings, setSettings] = useState({
        sessionTimeout: 15,
        backupFrequency: 'weekly',
        maintenanceMode: false,
        allowRegistration: true,
        passwordMinLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSpecialChar: true,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data) {
                setSettings({
                    sessionTimeout: res.data.sessionTimeout || 15,
                    backupFrequency: res.data.backupFrequency || 'weekly',
                    maintenanceMode: res.data.maintenanceMode || false,
                    allowRegistration: res.data.allowRegistration !== false, // default true
                    passwordMinLength: res.data.passwordMinLength || 8,
                    requireUppercase: res.data.requireUppercase !== false,
                    requireNumber: res.data.requireNumber !== false,
                    requireSpecialChar: res.data.requireSpecialChar !== false,
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const handleSave = async () => {
        if (!isSuperAdmin) {
            Swal.fire('Unauthorized', 'Only Super Admins can change settings.', 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.put('/api/settings', settings);
            Swal.fire({
                icon: 'success',
                title: 'Settings Saved',
                text: 'System settings have been updated successfully.',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.message || 'Failed to save settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 border-b pb-4">
                <Settings className="w-8 h-8 text-[#001F3F]" />
                <div>
                    <h1 className="text-2xl font-bold text-[#001F3F]">System Settings</h1>
                    <p className="text-sm text-gray-500">Configure global application behavior</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
                {/* Security Section */}
                <section>
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2 text-gray-800">
                        <Clock className="w-5 h-5 text-blue-500" /> Security & Sessions
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="block mb-2 text-gray-700">Session Timeout (minutes)</Label>
                            <Input
                                type="number"
                                min="1"
                                max="1440"
                                value={settings.sessionTimeout}
                                onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
                                className="max-w-[200px]"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Users will be logged out automatically after this duration of inactivity.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Password Policy Section */}
                <section>
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2 text-gray-800">
                        <ShieldAlert className="w-5 h-5 text-red-500" /> Password Policy
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="block mb-2 text-gray-700">Minimum Password Length</Label>
                            <Input
                                type="number"
                                min="6"
                                max="32"
                                value={settings.passwordMinLength}
                                onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
                                className="max-w-[200px]"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Enforce minimum characters for new passwords.
                            </p>
                        </div>
                        <div className="space-y-3 pt-2">
                            <Label className="block font-medium text-gray-800">Complexity Requirements</Label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="requireUppercase"
                                    checked={settings.requireUppercase}
                                    onChange={(e) => setSettings({ ...settings, requireUppercase: e.target.checked })}
                                    className="w-4 h-4 text-[#001F3F] rounded border-gray-300 cursor-pointer"
                                />
                                <Label htmlFor="requireUppercase" className="text-sm cursor-pointer block">Require Uppercase Letter</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="requireNumber"
                                    checked={settings.requireNumber}
                                    onChange={(e) => setSettings({ ...settings, requireNumber: e.target.checked })}
                                    className="w-4 h-4 text-[#001F3F] rounded border-gray-300 cursor-pointer"
                                />
                                <Label htmlFor="requireNumber" className="text-sm cursor-pointer block">Require Number</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="requireSpecialChar"
                                    checked={settings.requireSpecialChar}
                                    onChange={(e) => setSettings({ ...settings, requireSpecialChar: e.target.checked })}
                                    className="w-4 h-4 text-[#001F3F] rounded border-gray-300 cursor-pointer"
                                />
                                <Label htmlFor="requireSpecialChar" className="text-sm cursor-pointer block">Require Special Character</Label>
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Maintenance Section */}
                <section>
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2 text-gray-800">
                        <Database className="w-5 h-5 text-purple-500" /> System Maintenance
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="block mb-2 text-gray-700">Backup Frequency</Label>
                            <select
                                className="w-full max-w-[200px] border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#001F3F] focus:outline-none"
                                value={settings.backupFrequency}
                                onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-2">How often automated database backups run.</p>
                        </div>
                        <div className="flex items-start gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="maintenanceMode"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                className="w-5 h-5 text-red-600 rounded mt-1 cursor-pointer border-gray-300 focus:ring-red-500"
                            />
                            <div>
                                <Label htmlFor="maintenanceMode" className="font-medium text-red-600 block cursor-pointer">
                                    Enable Maintenance Mode
                                </Label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Restricts access to the system for all non-admin users.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Registration Section */}
                <section>
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2 text-gray-800">
                        <UserPlus className="w-5 h-5 text-green-500" /> Onboarding
                    </h2>
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="allowRegistration"
                            checked={settings.allowRegistration}
                            onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                            className="w-5 h-5 text-[#001F3F] rounded mt-1 cursor-pointer border-gray-300 focus:ring-[#001F3F]"
                        />
                        <div>
                            <Label htmlFor="allowRegistration" className="font-medium text-gray-800 block cursor-pointer">
                                Allow New Registrations
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">
                                When disabled, the registration page will be blocked.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="pt-6 border-t flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-[#001F3F] text-white hover:bg-[#002244] px-6"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Configuration
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
