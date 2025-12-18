'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { emailPreferencesApi, EmailPreference } from '@/lib/api';
import {
  Mail,
  Calendar,
  CreditCard,
  Bell,
  Cake,
  Award,
  Megaphone,
  AlertCircle,
  Save,
  Power,
  PowerOff,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface PreferenceItem {
  key: keyof EmailPreference;
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const preferenceItems: PreferenceItem[] = [
  // Leave notifications
  {
    key: 'leaveRequested',
    label: 'Leave Requests',
    description: 'Receive emails when employees submit leave requests (for managers/HR)',
    icon: Calendar,
    category: 'Leave Notifications',
  },
  {
    key: 'leaveApproved',
    label: 'Leave Approved',
    description: 'Receive emails when your leave requests are approved',
    icon: Calendar,
    category: 'Leave Notifications',
  },
  {
    key: 'leaveRejected',
    label: 'Leave Rejected',
    description: 'Receive emails when your leave requests are rejected',
    icon: Calendar,
    category: 'Leave Notifications',
  },
  // Payroll notifications
  {
    key: 'payslipGenerated',
    label: 'Payslip Generated',
    description: 'Receive emails when your payslip is available',
    icon: CreditCard,
    category: 'Payroll Notifications',
  },
  {
    key: 'salaryRevised',
    label: 'Salary Revised',
    description: 'Receive emails when your salary is updated',
    icon: CreditCard,
    category: 'Payroll Notifications',
  },
  // Reminders
  {
    key: 'birthdayReminder',
    label: 'Birthday Reminders',
    description: 'Receive emails about upcoming birthdays of colleagues',
    icon: Cake,
    category: 'Reminders',
  },
  {
    key: 'anniversaryReminder',
    label: 'Work Anniversary Reminders',
    description: 'Receive emails about work anniversaries of colleagues',
    icon: Award,
    category: 'Reminders',
  },
  // General
  {
    key: 'announcements',
    label: 'Company Announcements',
    description: 'Receive emails for company-wide announcements',
    icon: Megaphone,
    category: 'General',
  },
  {
    key: 'systemAlerts',
    label: 'System Alerts',
    description: 'Receive important system notifications and alerts',
    icon: AlertCircle,
    category: 'General',
  },
];

export default function EmailPreferencesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreference | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await emailPreferencesApi.getPreferences();
      if (response.data) {
        setPreferences(response.data);
      }
    } catch (err) {
      console.error('Failed to load email preferences:', err);
      setError('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof EmailPreference, value: boolean) => {
    if (!preferences) return;

    // Optimistically update UI
    setPreferences({ ...preferences, [key]: value });

    try {
      const response = await emailPreferencesApi.updatePreferences({ [key]: value });
      if (response.data) {
        setPreferences(response.data);
        showSuccess('Preference updated');
      }
    } catch (err) {
      // Revert on error
      setPreferences({ ...preferences, [key]: !value });
      console.error('Failed to update preference:', err);
      setError('Failed to update preference');
    }
  };

  const handleToggleAll = async (enabled: boolean) => {
    try {
      setSaving(true);
      const response = await emailPreferencesApi.toggleAll(enabled);
      if (response.data) {
        setPreferences(response.data);
        showSuccess(enabled ? 'All email notifications enabled' : 'All email notifications disabled');
      }
    } catch (err) {
      console.error('Failed to toggle all preferences:', err);
      setError('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Group preferences by category
  const groupedPreferences = preferenceItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PreferenceItem[]>);

  if (loading) {
    return (
      <DashboardLayout title="Email Preferences">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Email Preferences">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${tenantSlug}/settings`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleAll(false)}
              disabled={saving}
            >
              <PowerOff className="h-4 w-4 mr-2" />
              Disable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleAll(true)}
              disabled={saving}
            >
              <Power className="h-4 w-4 mr-2" />
              Enable All
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Description Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notification Preferences
            </CardTitle>
            <CardDescription>
              Control which email notifications you receive. In-app notifications are not affected by these settings.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Preference Categories */}
        {Object.entries(groupedPreferences).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const Icon = item.icon;
                const value = preferences?.[item.key as keyof EmailPreference] as boolean;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={value ?? true}
                      onCheckedChange={(checked) => handleToggle(item.key as keyof EmailPreference, checked)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Digest Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Digest</CardTitle>
            <CardDescription>
              Instead of receiving individual emails, get a daily summary of all notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Bell className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Enable Daily Digest</p>
                  <p className="text-sm text-gray-500">
                    Receive a single email each day with all your notifications (at {preferences?.digestTime || '09:00'})
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.digestEnabled ?? false}
                onCheckedChange={(checked) => handleToggle('digestEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
