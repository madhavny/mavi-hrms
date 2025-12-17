'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tenantApi, attendanceApi, Attendance, EmployeeForAttendance, BulkAttendanceResult } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, Calendar, CheckCircle2, AlertCircle, X, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';

export default function AttendanceManagePage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeForAttendance[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Bulk marking state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkStatus, setBulkStatus] = useState<string>('PRESENT');
  const [bulkClockIn, setBulkClockIn] = useState('09:00');
  const [bulkClockOut, setBulkClockOut] = useState('18:00');
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [marking, setMarking] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkAttendanceResult | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, [search, departmentFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await tenantApi.getEmployeesForAttendance({
        search: search || undefined,
        departmentId: departmentFilter ? parseInt(departmentFilter) : undefined,
      });
      if (res.data) {
        setEmployees(res.data);
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await tenantApi.getDepartments();
      if (res.data) setDepartments(res.data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const toggleEmployee = (id: number) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(e => e !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const openBulkModal = () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'No Employees Selected',
        description: 'Please select at least one employee to mark attendance.',
        variant: 'destructive',
      });
      return;
    }
    setShowBulkModal(true);
    setBulkResult(null);
  };

  const closeBulkModal = () => {
    setShowBulkModal(false);
    setBulkResult(null);
    setBulkRemarks('');
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await tenantApi.exportAttendanceExcel({
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        departmentId: departmentFilter || undefined,
      });
      toast({
        title: 'Export Successful',
        description: 'Attendance report exported to Excel.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to export attendance',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await tenantApi.exportAttendancePDF({
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        departmentId: departmentFilter || undefined,
      });
      toast({
        title: 'Export Successful',
        description: 'Attendance report exported to PDF.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to export attendance',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleBulkMark = async () => {
    setMarking(true);

    // Build records from selected employees
    const selectedEmps = employees.filter(e => selectedEmployees.includes(e.id));
    const records = selectedEmps.map(emp => ({
      employee_code: emp.employeeCode || '',
      date: bulkDate,
      status: bulkStatus,
      clock_in: bulkStatus === 'PRESENT' || bulkStatus === 'LATE' || bulkStatus === 'HALF_DAY' ? bulkClockIn : undefined,
      clock_out: bulkStatus === 'PRESENT' || bulkStatus === 'LATE' ? bulkClockOut : undefined,
      remarks: bulkRemarks || undefined,
    }));

    try {
      const result = await tenantApi.bulkMarkAttendance(records);
      setBulkResult(result);
      toast({
        title: result.data.failed === 0 ? 'Attendance Marked' : 'Marking Completed with Errors',
        description: result.message,
        variant: result.data.failed === 0 ? 'default' : 'destructive',
      });

      if (result.data.successful > 0) {
        setSelectedEmployees([]);
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to mark attendance',
        variant: 'destructive',
      });
    } finally {
      setMarking(false);
    }
  };

  const attendanceStatuses = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'LATE', label: 'Late' },
    { value: 'ON_LEAVE', label: 'On Leave' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'WEEKEND', label: 'Weekend' },
  ];

  return (
    <DashboardLayout title="Attendance Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter || "all"} onValueChange={(val) => setDepartmentFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  {exporting ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exporting ? 'Exporting...' : 'Export Report'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Export Attendance Report</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">From</Label>
                      <Input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">To</Label>
                      <Input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={openBulkModal}
              disabled={selectedEmployees.length === 0}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Mark Attendance ({selectedEmployees.length})
            </Button>
          </div>
        </div>

        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={employees.length > 0 && selectedEmployees.length === employees.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEmployees.includes(employee.id)}
                            onCheckedChange={() => toggleEmployee(employee.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {employee.employeeCode || '-'}
                        </TableCell>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.department || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Mark Attendance Modal */}
        <Dialog open={showBulkModal} onOpenChange={closeBulkModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Mark attendance for {selectedEmployees.length} selected employee{selectedEmployees.length > 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clock In/Out (conditional) */}
              {(bulkStatus === 'PRESENT' || bulkStatus === 'LATE' || bulkStatus === 'HALF_DAY') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Clock In</Label>
                    <Input
                      type="time"
                      value={bulkClockIn}
                      onChange={(e) => setBulkClockIn(e.target.value)}
                    />
                  </div>
                  {(bulkStatus === 'PRESENT' || bulkStatus === 'LATE') && (
                    <div className="space-y-2">
                      <Label>Clock Out</Label>
                      <Input
                        type="time"
                        value={bulkClockOut}
                        onChange={(e) => setBulkClockOut(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <Input
                  value={bulkRemarks}
                  onChange={(e) => setBulkRemarks(e.target.value)}
                  placeholder="Add any notes..."
                />
              </div>

              {/* Result */}
              {bulkResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xl font-bold">{bulkResult.data.total}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-600">{bulkResult.data.successful}</p>
                      <p className="text-xs text-green-600">Success</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-600">{bulkResult.data.failed}</p>
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                  </div>

                  {bulkResult.data.errors.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800">Errors</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        <ul className="text-sm text-red-700 space-y-1">
                          {bulkResult.data.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeBulkModal} disabled={marking}>
                {bulkResult ? 'Close' : 'Cancel'}
              </Button>
              {!bulkResult && (
                <Button onClick={handleBulkMark} disabled={marking}>
                  {marking && <Spinner size="sm" className="mr-2" />}
                  {marking ? 'Marking...' : 'Mark Attendance'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
