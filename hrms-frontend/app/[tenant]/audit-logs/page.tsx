'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auditApi, AuditLog, AuditStats } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import {
  Search,
  Filter,
  Eye,
  Activity,
  Users,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  LOGIN_FAILED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  PASSWORD_CHANGE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  CLOCK_IN: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  CLOCK_OUT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  LEAVE_APPLY: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  LEAVE_APPROVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  LEAVE_REJECT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  LEAVE_CANCEL: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  STATUS_CHANGE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'PASSWORD_CHANGE',
  'CLOCK_IN',
  'CLOCK_OUT',
  'LEAVE_APPLY',
  'LEAVE_APPROVE',
  'LEAVE_REJECT',
  'LEAVE_CANCEL',
  'STATUS_CHANGE',
];

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, entityFilter, actionFilter, startDate, endDate]);

  useEffect(() => {
    loadEntityTypes();
    loadStats();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await auditApi.getAuditLogs({
        page,
        limit: 20,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      });

      if (res.data) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEntityTypes = async () => {
    try {
      const res = await auditApi.getEntityTypes();
      if (res.data) {
        setEntityTypes(res.data);
      }
    } catch (err) {
      console.error('Failed to load entity types', err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await auditApi.getAuditStats({});
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleViewDetail = async (log: AuditLog) => {
    try {
      setDetailLoading(true);
      const res = await auditApi.getAuditLogDetail(log.id);
      if (res.data) {
        setSelectedLog(res.data);
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load audit log detail',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChanges = (changes: Record<string, { from: unknown; to: unknown }> | undefined) => {
    if (!changes || Object.keys(changes).length === 0) return null;

    return (
      <div className="space-y-2">
        {Object.entries(changes).map(([field, { from, to }]) => (
          <div key={field} className="text-sm">
            <span className="font-medium dark:text-white">{field}:</span>
            <div className="ml-4 text-gray-600 dark:text-gray-400">
              <div className="text-red-600 dark:text-red-400">- {JSON.stringify(from)}</div>
              <div className="text-green-600 dark:text-green-400">+ {JSON.stringify(to)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
                    <p className="text-2xl font-bold dark:text-white">{total}</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Entities Tracked</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.byEntity.length}</p>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Action Types</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.byAction.length}</p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Recent Activity</p>
                    <p className="text-2xl font-bold dark:text-white">
                      {stats.recentActivity.reduce((sum, r) => sum + r.count, 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Select value={entityFilter || 'all'} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={handleSearch}>Apply Filters</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setEntityFilter('');
                  setActionFilter('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="w-[80px]">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Spinner className="mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap dark:text-white">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm dark:text-white">{log.userEmail || 'System'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{log.userType}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm dark:text-white">{log.entity}</p>
                            {log.entityId && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">ID: {log.entityId}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate dark:text-white">
                          {log.entityName || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} logs
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm dark:text-white">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Audit Log Detail</DialogTitle>
              <DialogDescription>
                Detailed view of the audit log entry
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : selectedLog ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Timestamp</p>
                    <p className="font-medium dark:text-white">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Action</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        ACTION_COLORS[selectedLog.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {selectedLog.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User</p>
                    <p className="font-medium dark:text-white">{selectedLog.userEmail || 'System'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedLog.userType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Entity</p>
                    <p className="font-medium dark:text-white">{selectedLog.entity}</p>
                    {selectedLog.entityId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {selectedLog.entityId}</p>
                    )}
                  </div>
                  {selectedLog.entityName && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Entity Name</p>
                      <p className="font-medium dark:text-white">{selectedLog.entityName}</p>
                    </div>
                  )}
                  {selectedLog.ipAddress && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">IP Address</p>
                      <p className="font-medium dark:text-white">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                </div>

                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Changes</p>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      {renderChanges(selectedLog.changes)}
                    </div>
                  </div>
                )}

                {selectedLog.oldValue && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Previous Value</p>
                    <pre className="bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValue && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">New Value</p>
                    <pre className="bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User Agent</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
