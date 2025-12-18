'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  holidayApi,
  Holiday,
  HolidayStats,
  WeeklyOffConfig,
  WeeklyOffPattern,
  HolidayType,
  OptionalHolidaySelection,
} from '@/lib/api';
import {
  CalendarDays,
  Plus,
  Upload,
  Download,
  Settings,
  Trash2,
  Edit,
  Calendar,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  AlertCircle,
} from 'lucide-react';

// Weekly off pattern options with labels
const WEEKLY_OFF_PATTERNS: { value: WeeklyOffPattern; label: string; description: string }[] = [
  { value: 'ALL_SATURDAYS_SUNDAYS', label: 'All Saturdays & Sundays', description: 'Both Saturday and Sunday off every week' },
  { value: 'ONLY_SUNDAYS', label: 'Only Sundays', description: 'Only Sunday off, all Saturdays working' },
  { value: 'SECOND_FOURTH_SAT_SUNDAYS', label: '2nd & 4th Saturday + Sundays', description: '2nd and 4th Saturday off, plus all Sundays' },
  { value: 'SECOND_LAST_SAT_SUNDAYS', label: '2nd & Last Saturday + Sundays', description: '2nd and last Saturday off, plus all Sundays' },
  { value: 'ALTERNATE_SATURDAYS_SUNDAYS', label: 'Alternate Saturdays + Sundays', description: 'Every alternate Saturday off, plus all Sundays' },
  { value: 'CUSTOM', label: 'Custom', description: 'Select specific days as weekly off' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export default function HolidaysPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HolidayStats | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyOffConfig, setWeeklyOffConfig] = useState<WeeklyOffConfig | null>(null);
  const [myOptionalSelections, setMyOptionalSelections] = useState<OptionalHolidaySelection[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState<HolidayType | 'ALL'>('ALL');

  // Dialog states
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [showWeeklyOffConfig, setShowWeeklyOffConfig] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuotaConfig, setShowQuotaConfig] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  // Form states
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'FIXED' as HolidayType,
    description: '',
  });
  const [weeklyOffForm, setWeeklyOffForm] = useState({
    pattern: 'ALL_SATURDAYS_SUNDAYS' as WeeklyOffPattern,
    customDays: [] as number[],
  });
  const [quotaForm, setQuotaForm] = useState({ maxOptional: 3 });
  const [bulkImportData, setBulkImportData] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, holidaysRes, configRes, selectionsRes] = await Promise.all([
        holidayApi.getStats(selectedYear),
        holidayApi.listHolidays({ year: selectedYear }),
        holidayApi.getWeeklyOffConfig(),
        holidayApi.getMyOptionalSelections(selectedYear),
      ]);

      setStats(statsRes.data || null);
      setHolidays(holidaysRes.data?.holidays || []);
      setWeeklyOffConfig(configRes.data || null);
      setMyOptionalSelections(selectionsRes.data || []);

      if (configRes.data) {
        setWeeklyOffForm({
          pattern: configRes.data.pattern,
          customDays: configRes.data.customDays || [],
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load holiday data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // Handlers
  const handleCreateHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      toast({ title: 'Error', description: 'Name and date are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingHoliday) {
        await holidayApi.updateHoliday(editingHoliday.id, holidayForm);
        toast({ title: 'Success', description: 'Holiday updated successfully' });
      } else {
        await holidayApi.createHoliday(holidayForm);
        toast({ title: 'Success', description: 'Holiday created successfully' });
      }
      setShowHolidayForm(false);
      resetHolidayForm();
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to save holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deletingHoliday) return;

    setSaving(true);
    try {
      await holidayApi.deleteHoliday(deletingHoliday.id);
      toast({ title: 'Success', description: 'Holiday deleted successfully' });
      setShowDeleteConfirm(false);
      setDeletingHoliday(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to delete holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWeeklyOff = async () => {
    setSaving(true);
    try {
      await holidayApi.updateWeeklyOffConfig(weeklyOffForm);
      toast({ title: 'Success', description: 'Weekly off pattern updated successfully' });
      setShowWeeklyOffConfig(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to update weekly off pattern', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuota = async () => {
    setSaving(true);
    try {
      await holidayApi.updateOptionalQuota({ year: selectedYear, maxOptional: quotaForm.maxOptional });
      toast({ title: 'Success', description: 'Optional holiday quota updated successfully' });
      setShowQuotaConfig(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to update quota', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportData.trim()) {
      toast({ title: 'Error', description: 'Please enter holiday data', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Parse CSV data
      const lines = bulkImportData.trim().split('\n');
      const holidays = lines.slice(1).map(line => {
        const [name, date, type, description] = line.split(',').map(s => s.trim());
        return { name, date, type, description };
      }).filter(h => h.name && h.date);

      if (holidays.length === 0) {
        toast({ title: 'Error', description: 'No valid holidays found in the data', variant: 'destructive' });
        return;
      }

      const result = await holidayApi.bulkImportHolidays(holidays);
      toast({
        title: 'Import Complete',
        description: `Created ${result.data?.created || 0} holidays. ${result.data?.failed || 0} failed.`,
      });
      setShowBulkImport(false);
      setBulkImportData('');
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to import holidays', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOptionalHoliday = async (holidayId: number) => {
    try {
      await holidayApi.selectOptionalHoliday(holidayId);
      toast({ title: 'Success', description: 'Optional holiday selected' });
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to select holiday', variant: 'destructive' });
    }
  };

  const handleCancelOptionalHoliday = async (holidayId: number) => {
    try {
      await holidayApi.cancelOptionalHoliday(holidayId);
      toast({ title: 'Success', description: 'Optional holiday cancelled' });
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Failed to cancel selection', variant: 'destructive' });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const result = await holidayApi.downloadTemplate();
      const blob = new Blob([result.data || ''], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'holiday-template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' });
    }
  };

  const resetHolidayForm = () => {
    setHolidayForm({ name: '', date: '', type: 'FIXED', description: '' });
    setEditingHoliday(null);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      type: holiday.type,
      description: holiday.description || '',
    });
    setShowHolidayForm(true);
  };

  const toggleCustomDay = (day: number) => {
    setWeeklyOffForm(prev => ({
      ...prev,
      customDays: prev.customDays.includes(day)
        ? prev.customDays.filter(d => d !== day)
        : [...prev.customDays, day],
    }));
  };

  // Filter holidays
  const filteredHolidays = holidays.filter(h => {
    if (typeFilter !== 'ALL' && h.type !== typeFilter) return false;
    if (activeTab === 'fixed' && h.type !== 'FIXED') return false;
    if (activeTab === 'optional' && h.type !== 'OPTIONAL') return false;
    return true;
  });

  // Check if user has selected an optional holiday
  const isHolidaySelected = (holidayId: number) => {
    return myOptionalSelections.some(s => s.holidayId === holidayId);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get pattern label
  const getPatternLabel = (pattern: WeeklyOffPattern) => {
    return WEEKLY_OFF_PATTERNS.find(p => p.value === pattern)?.label || pattern;
  };

  return (
    <DashboardLayout title="Holiday Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Holiday Management</h1>
            <p className="text-muted-foreground dark:text-gray-400">
              Configure weekly offs, manage holidays, and set optional holiday quotas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" onClick={() => setShowWeeklyOffConfig(true)} className="w-full sm:w-auto">
              <Settings className="w-4 h-4 mr-2" />
              Weekly Off
            </Button>
            <Button variant="outline" onClick={() => setShowBulkImport(true)} className="w-full sm:w-auto">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => { resetHolidayForm(); setShowHolidayForm(true); }} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold w-20 text-center dark:text-white">{selectedYear}</span>
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Holidays</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats?.totalHolidays || 0}</div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">in {selectedYear}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fixed Holidays</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats?.fixedHolidays || 0}</div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">mandatory for all</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Optional Holidays</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats?.optionalHolidays || 0}</div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                {stats?.optionalQuota?.used || 0}/{stats?.optionalQuota?.max || 3} selected
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Off</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Sun className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium dark:text-white">{getPatternLabel(stats?.weeklyOffPattern || 'ALL_SATURDAYS_SUNDAYS')}</div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">current pattern</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Holidays */}
        {stats?.upcomingHolidays && stats.upcomingHolidays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {stats.upcomingHolidays.map(holiday => (
                  <div
                    key={holiday.id}
                    className="flex-shrink-0 p-3 border rounded-lg bg-muted/50 min-w-[200px]"
                  >
                    <div className="font-medium dark:text-white">{holiday.name}</div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">{formatDate(holiday.date)}</div>
                    <Badge variant={holiday.type === 'FIXED' ? 'default' : 'secondary'} className="mt-1 dark:bg-blue-900/30 dark:text-blue-300">
                      {holiday.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Holiday List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Holiday Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowQuotaConfig(true); setQuotaForm({ maxOptional: stats?.optionalQuota?.max || 3 }); }}>
                  Configure Quota
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Holidays</TabsTrigger>
                <TabsTrigger value="fixed">Fixed</TabsTrigger>
                <TabsTrigger value="optional">Optional</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredHolidays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No holidays found for {selectedYear}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <Table className="hidden md:table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHolidays.map(holiday => (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">{formatDate(holiday.date)}</TableCell>
                            <TableCell>{holiday.name}</TableCell>
                            <TableCell>
                              <Badge variant={holiday.type === 'FIXED' ? 'default' : holiday.type === 'OPTIONAL' ? 'secondary' : 'outline'} className="dark:bg-blue-900/30 dark:text-blue-300">
                                {holiday.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground dark:text-gray-400 max-w-[200px] truncate">
                              {holiday.description || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {holiday.type === 'OPTIONAL' && (
                                  <>
                                    {isHolidaySelected(holiday.id) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelOptionalHoliday(holiday.id)}
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Cancel
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSelectOptionalHoliday(holiday.id)}
                                        disabled={new Date(holiday.date) < new Date()}
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Select
                                      </Button>
                                    )}
                                  </>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(holiday)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setDeletingHoliday(holiday); setShowDeleteConfirm(true); }}
                                  className="dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {filteredHolidays.map(holiday => (
                        <Card key={holiday.id}>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold dark:text-white">{holiday.name}</h3>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">{formatDate(holiday.date)}</p>
                                </div>
                                <Badge variant={holiday.type === 'FIXED' ? 'default' : holiday.type === 'OPTIONAL' ? 'secondary' : 'outline'} className="dark:bg-blue-900/30 dark:text-blue-300">
                                  {holiday.type}
                                </Badge>
                              </div>
                              {holiday.description && (
                                <p className="text-sm text-muted-foreground dark:text-gray-400">{holiday.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700">
                                {holiday.type === 'OPTIONAL' && (
                                  <>
                                    {isHolidaySelected(holiday.id) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelOptionalHoliday(holiday.id)}
                                        className="flex-1"
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Cancel
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSelectOptionalHoliday(holiday.id)}
                                        disabled={new Date(holiday.date) < new Date()}
                                        className="flex-1"
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Select
                                      </Button>
                                    )}
                                  </>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(holiday)}>
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setDeletingHoliday(holiday); setShowDeleteConfirm(true); }}
                                  className="dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Holiday Form Dialog */}
        <Dialog open={showHolidayForm} onOpenChange={setShowHolidayForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
              <DialogDescription>
                {editingHoliday ? 'Update holiday details' : 'Add a new holiday to the calendar'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Holiday Name *</Label>
                <Input
                  id="name"
                  value={holidayForm.name}
                  onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Republic Day"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={holidayForm.date}
                  onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={holidayForm.type}
                  onValueChange={(v: HolidayType) => setHolidayForm(f => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed (Mandatory)</SelectItem>
                    <SelectItem value="OPTIONAL">Optional</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={holidayForm.description}
                  onChange={e => setHolidayForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHolidayForm(false)}>Cancel</Button>
              <Button onClick={handleCreateHoliday} disabled={saving}>
                {saving ? 'Saving...' : editingHoliday ? 'Update' : 'Add Holiday'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Weekly Off Config Dialog */}
        <Dialog open={showWeeklyOffConfig} onOpenChange={setShowWeeklyOffConfig}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Weekly Off Configuration</DialogTitle>
              <DialogDescription>
                Configure which days are weekly offs for your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                {WEEKLY_OFF_PATTERNS.map(pattern => (
                  <div
                    key={pattern.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      weeklyOffForm.pattern === pattern.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setWeeklyOffForm(f => ({ ...f, pattern: pattern.value }))}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{pattern.label}</div>
                        <div className="text-sm text-muted-foreground">{pattern.description}</div>
                      </div>
                      {weeklyOffForm.pattern === pattern.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {weeklyOffForm.pattern === 'CUSTOM' && (
                <div className="space-y-2 pt-2">
                  <Label>Select Weekly Off Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        variant={weeklyOffForm.customDays.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleCustomDay(day.value)}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWeeklyOffConfig(false)}>Cancel</Button>
              <Button onClick={handleUpdateWeeklyOff} disabled={saving}>
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Holidays</DialogTitle>
              <DialogDescription>
                Import multiple holidays at once using CSV format
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <div className="space-y-2">
                <Label>CSV Data</Label>
                <Textarea
                  value={bulkImportData}
                  onChange={e => setBulkImportData(e.target.value)}
                  placeholder={`name,date,type,description
Republic Day,2025-01-26,FIXED,National Holiday
Holi,2025-03-14,OPTIONAL,Festival of Colors`}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p>Format: name, date (YYYY-MM-DD), type (FIXED/OPTIONAL), description</p>
                  <p>First row should be header. Maximum 100 holidays per import.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkImport(false)}>Cancel</Button>
              <Button onClick={handleBulkImport} disabled={saving}>
                {saving ? 'Importing...' : 'Import Holidays'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Optional Quota Config Dialog */}
        <Dialog open={showQuotaConfig} onOpenChange={setShowQuotaConfig}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Optional Holiday Quota</DialogTitle>
              <DialogDescription>
                Set the maximum number of optional holidays an employee can select for {selectedYear}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="maxOptional">Maximum Optional Holidays</Label>
                <Input
                  id="maxOptional"
                  type="number"
                  min={0}
                  max={20}
                  value={quotaForm.maxOptional}
                  onChange={e => setQuotaForm({ maxOptional: parseInt(e.target.value) || 0 })}
                />
                <p className="text-sm text-muted-foreground">
                  Employees can select up to this many optional holidays per year
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuotaConfig(false)}>Cancel</Button>
              <Button onClick={handleUpdateQuota} disabled={saving}>
                {saving ? 'Saving...' : 'Save Quota'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingHoliday?.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteHoliday} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
