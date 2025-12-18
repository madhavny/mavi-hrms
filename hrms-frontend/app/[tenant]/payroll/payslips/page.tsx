'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Play,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  IndianRupee,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Download,
} from 'lucide-react';
import { payrollApi, Payslip, PayslipStatus, PayrollSummary } from '@/lib/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayslipsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generateResult, setGenerateResult] = useState<{
    success: { userId: number; payslipId: number; name: string }[];
    skipped: { userId: number; name: string; reason: string }[];
    failed: { userId: number; name: string; error: string }[];
  } | null>(null);

  useEffect(() => {
    fetchPayslips();
    fetchSummary();
  }, [selectedMonth, selectedYear, statusFilter]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getPayslips({
        month: selectedMonth,
        year: selectedYear,
        status: statusFilter !== 'all' ? statusFilter as PayslipStatus : undefined,
      });
      if (response.success && response.data) {
        setPayslips(response.data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await payrollApi.getPayrollSummary(selectedMonth, selectedYear);
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch {
      // Summary is optional, don't show error
    }
  };

  const handleBulkGenerate = async () => {
    setIsSubmitting(true);
    setError(null);
    setGenerateResult(null);

    try {
      const response = await payrollApi.bulkGeneratePayslips({
        month: selectedMonth,
        year: selectedYear,
      });
      if (response.success && response.data) {
        setGenerateResult(response.data);
        fetchPayslips();
        fetchSummary();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payslips');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (payslipId: number, newStatus: PayslipStatus) => {
    try {
      await payrollApi.updatePayslipStatus(payslipId, newStatus);
      fetchPayslips();
      fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const openViewModal = async (payslip: Payslip) => {
    try {
      const response = await payrollApi.getPayslip(payslip.id);
      if (response.success && response.data) {
        setSelectedPayslip(response.data);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payslip details');
    }
  };

  const getStatusColor = (status: PayslipStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'PROCESSED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <DashboardLayout title="Payslips">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Payslips</h1>
            <p className="text-gray-500 dark:text-gray-400">Generate and manage monthly payslips</p>
          </div>
          <Button onClick={() => setIsGenerateModalOpen(true)} className="w-full sm:w-auto">
            <Play className="h-4 w-4 mr-2" />
            Generate Payslips
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Payslips</p>
                  <p className="text-xl font-semibold dark:text-white">{summary.totalPayslips}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gross Earnings</p>
                  <p className="text-xl font-semibold dark:text-white">{formatCurrency(summary.totalGrossEarnings)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Deductions</p>
                  <p className="text-xl font-semibold dark:text-white">{formatCurrency(summary.totalDeductions)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Payable</p>
                  <p className="text-xl font-semibold dark:text-white">{formatCurrency(summary.totalNetSalary)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PROCESSED">Processed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Payslips Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No payslips found</p>
              <p className="text-sm">Generate payslips for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>Days Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip) => (
                      <TableRow key={payslip.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium dark:text-white">
                              {payslip.user?.firstName} {payslip.user?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{payslip.user?.employeeCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-white">{payslip.user?.department?.name || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(payslip.grossEarnings)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(payslip.totalDeductions)}
                        </TableCell>
                        <TableCell className="text-right font-bold dark:text-white">
                          {formatCurrency(payslip.netSalary)}
                        </TableCell>
                        <TableCell className="dark:text-white">
                          {payslip.daysWorked}/{payslip.totalWorkingDays}
                          {payslip.lopDays > 0 && (
                            <span className="text-red-500 dark:text-red-400 text-sm ml-1">
                              (LOP: {payslip.lopDays})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(payslip.status)}>
                            {payslip.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openViewModal(payslip)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payslip.status === 'DRAFT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(payslip.id, 'PROCESSED')}
                              >
                                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </Button>
                            )}
                            {payslip.status === 'PROCESSED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(payslip.id, 'PAID')}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {payslips.map((payslip) => (
                  <Card key={payslip.id} className="dark:border-gray-700">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium dark:text-white">
                            {payslip.user?.firstName} {payslip.user?.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{payslip.user?.employeeCode}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{payslip.user?.department?.name || '-'}</p>
                        </div>
                        <Badge className={getStatusColor(payslip.status)}>
                          {payslip.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Gross</p>
                          <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(payslip.grossEarnings)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Deductions</p>
                          <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(payslip.totalDeductions)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Net Salary</p>
                          <p className="font-bold dark:text-white">{formatCurrency(payslip.netSalary)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Days Worked</p>
                          <p className="dark:text-white">
                            {payslip.daysWorked}/{payslip.totalWorkingDays}
                            {payslip.lopDays > 0 && (
                              <span className="text-red-500 dark:text-red-400 text-xs ml-1">
                                (LOP: {payslip.lopDays})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => openViewModal(payslip)} className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {payslip.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(payslip.id, 'PROCESSED')}
                            className="flex-1 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-gray-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Process
                          </Button>
                        )}
                        {payslip.status === 'PROCESSED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(payslip.id, 'PAID')}
                            className="flex-1 text-green-600 dark:text-green-400 border-green-300 dark:border-gray-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Generate Modal */}
        <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Payslips</DialogTitle>
              <DialogDescription>
                Generate payslips for all employees for {MONTHS[selectedMonth - 1]} {selectedYear}
              </DialogDescription>
            </DialogHeader>

            {generateResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{generateResult.success.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Generated</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 text-center">
                    <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{generateResult.skipped.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Skipped</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{generateResult.failed.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                  </div>
                </div>

                {generateResult.skipped.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                    <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Skipped:</p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      {generateResult.skipped.map((item, i) => (
                        <li key={i}>{item.name}: {item.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generateResult.failed.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                    <p className="font-medium text-red-800 dark:text-red-300 mb-2">Failed:</p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {generateResult.failed.map((item, i) => (
                        <li key={i}>{item.name}: {item.error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => {
                    setIsGenerateModalOpen(false);
                    setGenerateResult(null);
                  }}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium dark:text-white">Bulk Generation</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This will generate payslips for all employees with active salary structures.
                        Existing payslips for this period will be skipped.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkGenerate} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Generate All
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* View Payslip Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedPayslip && (
              <>
                <DialogHeader>
                  <DialogTitle>Payslip - {MONTHS[selectedPayslip.month - 1]} {selectedPayslip.year}</DialogTitle>
                  <DialogDescription>
                    {selectedPayslip.user?.firstName} {selectedPayslip.user?.lastName} ({selectedPayslip.user?.employeeCode})
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Employee Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Employee</p>
                      <p className="font-medium dark:text-white">{selectedPayslip.user?.firstName} {selectedPayslip.user?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Employee Code</p>
                      <p className="font-medium dark:text-white">{selectedPayslip.user?.employeeCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium dark:text-white">{selectedPayslip.user?.department?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Designation</p>
                      <p className="font-medium dark:text-white">{selectedPayslip.user?.designation?.name || '-'}</p>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-3 dark:text-white">Attendance Summary</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Working Days</p>
                        <p className="font-medium dark:text-white">{selectedPayslip.totalWorkingDays}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Days Worked</p>
                        <p className="font-medium dark:text-white">{selectedPayslip.daysWorked}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Leave Days</p>
                        <p className="font-medium dark:text-white">{selectedPayslip.leaveDays}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">LOP Days</p>
                        <p className="font-medium text-red-600 dark:text-red-400">{selectedPayslip.lopDays}</p>
                      </div>
                    </div>
                  </div>

                  {/* Earnings & Deductions */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-green-600 dark:text-green-400">Earnings</h4>
                      <div className="space-y-2">
                        {selectedPayslip.components
                          .filter(c => c.componentType === 'EARNING')
                          .map((comp) => (
                            <div key={comp.id} className="flex justify-between text-sm dark:text-gray-300">
                              <span>{comp.componentName}</span>
                              <span>{formatCurrency(comp.amount)}</span>
                            </div>
                          ))}
                        <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-medium">
                          <span className="dark:text-white">Total Earnings</span>
                          <span className="text-green-600 dark:text-green-400">{formatCurrency(selectedPayslip.grossEarnings)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-red-600 dark:text-red-400">Deductions</h4>
                      <div className="space-y-2">
                        {selectedPayslip.components
                          .filter(c => c.componentType === 'DEDUCTION')
                          .map((comp) => (
                            <div key={comp.id} className="flex justify-between text-sm dark:text-gray-300">
                              <span>{comp.componentName}</span>
                              <span>{formatCurrency(comp.amount)}</span>
                            </div>
                          ))}
                        <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-medium">
                          <span className="dark:text-white">Total Deductions</span>
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(selectedPayslip.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium dark:text-white">Net Salary</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(selectedPayslip.netSalary)}
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                    Close
                  </Button>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
