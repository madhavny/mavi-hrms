'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { auditApi, AuditLog, AuditStats } from '@/lib/api';
import {
  Activity,
  Calendar,
  Clock,
  Eye,
  Filter,
  History,
  Search,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Trash2,
  Edit,
  LogIn,
  LogOut,
  Key,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Action badge colors and icons
const actionConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  CREATE: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: <UserPlus className="h-3 w-3" /> },
  UPDATE: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: <Edit className="h-3 w-3" /> },
  DELETE: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: <Trash2 className="h-3 w-3" /> },
  LOGIN: { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: <LogIn className="h-3 w-3" /> },
  LOGOUT: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: <LogOut className="h-3 w-3" /> },
  LOGIN_FAILED: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
  PASSWORD_CHANGE: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: <Key className="h-3 w-3" /> },
  PASSWORD_RESET: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: <Key className="h-3 w-3" /> },
  CLOCK_IN: { color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', icon: <Clock className="h-3 w-3" /> },
  CLOCK_OUT: { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: <Clock className="h-3 w-3" /> },
  LEAVE_APPLY: { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', icon: <Calendar className="h-3 w-3" /> },
  LEAVE_APPROVE: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: <CheckCircle className="h-3 w-3" /> },
  LEAVE_REJECT: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
  LEAVE_CANCEL: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: <UserMinus className="h-3 w-3" /> },
  STATUS_CHANGE: { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: <AlertCircle className="h-3 w-3" /> },
  BULK_IMPORT: { color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', icon: <FileText className="h-3 w-3" /> },
  EXPORT: { color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300', icon: <FileText className="h-3 w-3" /> },
};

function ActionBadge({ action }: { action: string }) {
  const config = actionConfig[action] || { color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: <Activity className="h-3 w-3" /> };
  return (
    <Badge variant="secondary" className={`${config.color} flex items-center gap-1`}>
      {config.icon}
      <span className="capitalize">{action.toLowerCase().replace(/_/g, ' ')}</span>
    </Badge>
  );
}

export default function AuditLogsPage() {
  const { toast } = useToast();

  // Data state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filter state
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await auditApi.getAuditLogs({
        page,
        limit,
        entity: filters.entity || undefined,
        action: filters.action || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        search: filters.search || undefined,
      });
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await auditApi.getAuditStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchEntityTypes = useCallback(async () => {
    try {
      const response = await auditApi.getEntityTypes();
      if (response.success && response.data) {
        setEntityTypes(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch entity types:', error);
    }
  }, []);

  const fetchActions = useCallback(async () => {
    try {
      const response = await auditApi.getActions();
      if (response.success && response.data) {
        setActions(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
    fetchEntityTypes();
    fetchActions();
  }, [fetchStats, fetchEntityTypes, fetchActions]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      entity: '',
      action: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    setPage(1);
  };

  const handleViewDetail = async (log: AuditLog) => {
    setDetailLoading(true);
    try {
      const response = await auditApi.getAuditLogDetail(log.id);
      if (response.success && response.data) {
        setSelectedLog(response.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch audit log details',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <DashboardLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Audit Logs</h1>
            <p className="text-muted-foreground dark:text-gray-400">
              Track all changes and activities in your organization.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" onClick={() => { fetchLogs(); fetchStats(); }} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="w-full sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Total Logs</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.totalLogs.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Today's Activity</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.todayCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.uniqueUsers}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Entity Types</p>
                  <p className="text-2xl font-bold dark:text-white">{entityTypes.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select
                    value={filters.entity || 'all'}
                    onValueChange={(v) => handleFilterChange('entity', v === 'all' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entities</SelectItem>
                      {entityTypes.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={filters.action || 'all'}
                    onValueChange={(v) => handleFilterChange('action', v === 'all' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      {actions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  Showing {logs.length} of {total.toLocaleString()} records
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found.</p>
                {hasActiveFilters && (
                  <p className="text-sm">Try adjusting your filters.</p>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground dark:text-gray-400">
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                            <span className="text-sm truncate max-w-[150px]">
                              {log.userEmail || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="dark:border-gray-700">{log.entity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.entityName || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground dark:text-gray-400">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(log)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {logs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium dark:text-white">
                                {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground dark:text-gray-400">
                                {format(new Date(log.createdAt), 'HH:mm:ss')}
                              </div>
                            </div>
                            <ActionBadge action={log.action} />
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                              <span className="dark:text-white">{log.userEmail || 'System'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground dark:text-gray-400">Entity:</span>
                              <Badge variant="outline" className="dark:border-gray-700">{log.entity}</Badge>
                            </div>
                            {log.entityName && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground dark:text-gray-400">Name:</span>
                                <span className="dark:text-white">{log.entityName}</span>
                              </div>
                            )}
                            {log.ipAddress && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground dark:text-gray-400">IP:</span>
                                <span className="dark:text-white">{log.ipAddress}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t dark:border-gray-700">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(log)}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
            <DialogDescription>
              Complete information about this activity.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLog.createdAt), 'PPpp')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedLog.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedLog.userEmail || 'System'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.userType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <div className="mt-1">
                    <ActionBadge action={selectedLog.action} />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity</Label>
                  <p className="font-medium">{selectedLog.entity}</p>
                  {selectedLog.entityId && (
                    <p className="text-xs text-muted-foreground">ID: {selectedLog.entityId}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity Name</Label>
                  <p className="font-medium">{selectedLog.entityName || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {/* Changes */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Changes</Label>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    {Object.entries(selectedLog.changes as Record<string, { from: unknown; to: unknown }>).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <span className="font-medium capitalize min-w-[120px]">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-red-600 line-through">
                          {value.from !== undefined ? String(value.from) : '(empty)'}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-600">
                          {value.to !== undefined ? String(value.to) : '(empty)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Old Value */}
              {selectedLog.oldValue && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Previous State</Label>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Value */}
              {selectedLog.newValue && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">New State</Label>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">User Agent</Label>
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
