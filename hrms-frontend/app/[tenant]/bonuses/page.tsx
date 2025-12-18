'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  bonusApi,
  tenantApi,
  Bonus,
  BonusType,
  BonusStatus,
  BonusStats,
  BonusInput,
  IncentiveScheme,
  IncentiveSchemeInput,
  IncentiveRecord,
  IncentiveRecordInput,
  IncentiveStats,
  IncentiveFrequency,
  TenantUser,
} from '@/lib/api';
import {
  Gift,
  Plus,
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  Banknote,
} from 'lucide-react';

const BONUS_TYPES: { value: BonusType; label: string }[] = [
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'RETENTION', label: 'Retention' },
  { value: 'JOINING', label: 'Joining' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SPOT', label: 'Spot' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_COLORS: Record<BonusStatus, string> = {
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  APPROVED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  PAID: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  CANCELLED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
};

const FREQUENCY_OPTIONS: { value: IncentiveFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half Yearly' },
  { value: 'ANNUALLY', label: 'Annually' },
  { value: 'ONE_TIME', label: 'One Time' },
];

export default function BonusesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('bonuses');
  const [loading, setLoading] = useState(true);

  // Bonuses state
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [bonusStats, setBonusStats] = useState<BonusStats | null>(null);
  const [bonusSearch, setBonusSearch] = useState('');
  const [bonusTypeFilter, setBonusTypeFilter] = useState<string>('all');
  const [bonusStatusFilter, setBonusStatusFilter] = useState<string>('all');

  // Incentive Schemes state
  const [schemes, setSchemes] = useState<IncentiveScheme[]>([]);

  // Incentive Records state
  const [incentiveRecords, setIncentiveRecords] = useState<IncentiveRecord[]>([]);
  const [incentiveStats, setIncentiveStats] = useState<IncentiveStats | null>(null);

  // Users for selection
  const [users, setUsers] = useState<TenantUser[]>([]);

  // Modal state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
  const [editingScheme, setEditingScheme] = useState<IncentiveScheme | null>(null);
  const [editingIncentive, setEditingIncentive] = useState<IncentiveRecord | null>(null);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);

  // Form state
  const [bonusForm, setBonusForm] = useState<BonusInput>({
    userId: 0,
    bonusType: 'PERFORMANCE',
    title: '',
    amount: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const [schemeForm, setSchemeForm] = useState<IncentiveSchemeInput>({
    name: '',
    code: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const [incentiveForm, setIncentiveForm] = useState<IncentiveRecordInput>({
    schemeId: 0,
    userId: 0,
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    calculatedAmount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bonusRes, statsRes, schemesRes, incentivesRes, incentiveStatsRes, usersRes] = await Promise.all([
        bonusApi.listBonuses({ limit: 100 }),
        bonusApi.getBonusStats(),
        bonusApi.listIncentiveSchemes({ limit: 100 }),
        bonusApi.listIncentiveRecords({ limit: 100 }),
        bonusApi.getIncentiveStats(),
        tenantApi.getUsers({ limit: 500 }),
      ]);
      setBonuses(bonusRes.data?.bonuses || []);
      setBonusStats(statsRes.data || null);
      setSchemes(schemesRes.data?.schemes || []);
      setIncentiveRecords(incentivesRes.data?.records || []);
      setIncentiveStats(incentiveStatsRes.data || null);
      setUsers(usersRes.data?.users || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: 'Error', description: 'Failed to load bonus data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Bonus handlers
  const handleCreateBonus = async () => {
    try {
      await bonusApi.createBonus(bonusForm);
      toast({ title: 'Success', description: 'Bonus created successfully' });
      setShowBonusModal(false);
      resetBonusForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create bonus', variant: 'destructive' });
    }
  };

  const handleUpdateBonus = async () => {
    if (!editingBonus) return;
    try {
      await bonusApi.updateBonus(editingBonus.id, bonusForm);
      toast({ title: 'Success', description: 'Bonus updated successfully' });
      setShowBonusModal(false);
      setEditingBonus(null);
      resetBonusForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update bonus', variant: 'destructive' });
    }
  };

  const handleApproveBonus = async (id: number) => {
    try {
      await bonusApi.approveBonus(id);
      toast({ title: 'Success', description: 'Bonus approved' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve bonus', variant: 'destructive' });
    }
  };

  const handleRejectBonus = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      await bonusApi.rejectBonus(id, reason);
      toast({ title: 'Success', description: 'Bonus rejected' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject bonus', variant: 'destructive' });
    }
  };

  const handleMarkBonusPaid = async (id: number) => {
    try {
      await bonusApi.markBonusPaid(id);
      toast({ title: 'Success', description: 'Bonus marked as paid' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark bonus as paid', variant: 'destructive' });
    }
  };

  const handleDeleteBonus = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bonus?')) return;
    try {
      await bonusApi.deleteBonus(id);
      toast({ title: 'Success', description: 'Bonus deleted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete bonus', variant: 'destructive' });
    }
  };

  const resetBonusForm = () => {
    setBonusForm({
      userId: 0,
      bonusType: 'PERFORMANCE',
      title: '',
      amount: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
    });
  };

  const openEditBonus = (bonus: Bonus) => {
    setEditingBonus(bonus);
    setBonusForm({
      userId: bonus.userId,
      bonusType: bonus.bonusType,
      title: bonus.title,
      description: bonus.description,
      amount: bonus.amount,
      effectiveDate: bonus.effectiveDate.split('T')[0],
      isTaxable: bonus.isTaxable,
      remarks: bonus.remarks,
    });
    setShowBonusModal(true);
  };

  // Scheme handlers
  const handleCreateScheme = async () => {
    try {
      await bonusApi.createIncentiveScheme(schemeForm);
      toast({ title: 'Success', description: 'Incentive scheme created' });
      setShowSchemeModal(false);
      resetSchemeForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create scheme', variant: 'destructive' });
    }
  };

  const handleUpdateScheme = async () => {
    if (!editingScheme) return;
    try {
      await bonusApi.updateIncentiveScheme(editingScheme.id, schemeForm);
      toast({ title: 'Success', description: 'Scheme updated' });
      setShowSchemeModal(false);
      setEditingScheme(null);
      resetSchemeForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update scheme', variant: 'destructive' });
    }
  };

  const handleDeleteScheme = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scheme?')) return;
    try {
      await bonusApi.deleteIncentiveScheme(id);
      toast({ title: 'Success', description: 'Scheme deleted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete scheme', variant: 'destructive' });
    }
  };

  const resetSchemeForm = () => {
    setSchemeForm({
      name: '',
      code: '',
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const openEditScheme = (scheme: IncentiveScheme) => {
    setEditingScheme(scheme);
    setSchemeForm({
      name: scheme.name,
      code: scheme.code,
      description: scheme.description,
      frequency: scheme.frequency,
      criteria: scheme.criteria,
      targetType: scheme.targetType,
      targetValue: scheme.targetValue,
      targetUnit: scheme.targetUnit,
      payoutType: scheme.payoutType,
      payoutValue: scheme.payoutValue,
      maxPayout: scheme.maxPayout,
      applicableTo: scheme.applicableTo,
      startDate: scheme.startDate.split('T')[0],
      endDate: scheme.endDate?.split('T')[0],
    });
    setShowSchemeModal(true);
  };

  // Incentive Record handlers
  const handleCreateIncentive = async () => {
    try {
      await bonusApi.createIncentiveRecord(incentiveForm);
      toast({ title: 'Success', description: 'Incentive record created' });
      setShowIncentiveModal(false);
      resetIncentiveForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create incentive', variant: 'destructive' });
    }
  };

  const handleApproveIncentive = async (id: number) => {
    try {
      await bonusApi.approveIncentiveRecord(id);
      toast({ title: 'Success', description: 'Incentive approved' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve incentive', variant: 'destructive' });
    }
  };

  const handleRejectIncentive = async (id: number) => {
    try {
      await bonusApi.rejectIncentiveRecord(id);
      toast({ title: 'Success', description: 'Incentive rejected' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject incentive', variant: 'destructive' });
    }
  };

  const handleMarkIncentivePaid = async (id: number) => {
    try {
      await bonusApi.markIncentivePaid(id);
      toast({ title: 'Success', description: 'Incentive marked as paid' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark incentive as paid', variant: 'destructive' });
    }
  };

  const resetIncentiveForm = () => {
    setIncentiveForm({
      schemeId: 0,
      userId: 0,
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      calculatedAmount: 0,
    });
  };

  // Filter bonuses
  const filteredBonuses = bonuses.filter((bonus) => {
    const matchesSearch =
      bonus.title.toLowerCase().includes(bonusSearch.toLowerCase()) ||
      bonus.user?.firstName?.toLowerCase().includes(bonusSearch.toLowerCase()) ||
      bonus.user?.lastName?.toLowerCase().includes(bonusSearch.toLowerCase());
    const matchesType = bonusTypeFilter === 'all' || bonus.bonusType === bonusTypeFilter;
    const matchesStatus = bonusStatusFilter === 'all' || bonus.status === bonusStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout title="Bonus & Incentives">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bonus & Incentives">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bonuses</p>
                  <p className="text-2xl font-bold dark:text-white">{bonusStats?.totalBonuses || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(bonusStats?.totalAmount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold dark:text-white">{bonusStats?.byStatus?.PENDING || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(bonusStats?.pendingAmount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold dark:text-white">{bonusStats?.byStatus?.PAID || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(bonusStats?.paidAmount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Incentive Schemes</p>
                  <p className="text-2xl font-bold dark:text-white">{incentiveStats?.activeSchemes || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {incentiveStats?.totalRecords || 0} records
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
            <TabsTrigger value="schemes">Incentive Schemes</TabsTrigger>
            <TabsTrigger value="incentives">Incentive Records</TabsTrigger>
            <TabsTrigger value="my-bonuses">My Bonuses</TabsTrigger>
          </TabsList>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Bonuses</CardTitle>
                <Button onClick={() => setShowBonusModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bonus
                </Button>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bonuses..."
                      value={bonusSearch}
                      onChange={(e) => setBonusSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={bonusTypeFilter} onValueChange={setBonusTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {BONUS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={bonusStatusFilter} onValueChange={setBonusStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bonuses Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Employee</th>
                        <th className="text-left p-3 text-sm font-medium">Title</th>
                        <th className="text-left p-3 text-sm font-medium">Type</th>
                        <th className="text-right p-3 text-sm font-medium">Amount</th>
                        <th className="text-left p-3 text-sm font-medium">Date</th>
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                        <th className="text-right p-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBonuses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            No bonuses found
                          </td>
                        </tr>
                      ) : (
                        filteredBonuses.map((bonus) => (
                          <tr key={bonus.id} className="border-b dark:border-gray-700 hover:bg-muted/25">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium dark:text-white">
                                  {bonus.user?.firstName?.[0]}
                                  {bonus.user?.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-sm dark:text-white">
                                    {bonus.user?.firstName} {bonus.user?.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {bonus.user?.department?.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm dark:text-gray-300">{bonus.title}</td>
                            <td className="p-3">
                              <Badge variant="outline">{bonus.bonusType}</Badge>
                            </td>
                            <td className="p-3 text-right font-medium dark:text-white">
                              {formatCurrency(bonus.amount, bonus.currency)}
                            </td>
                            <td className="p-3 text-sm dark:text-gray-300">{formatDate(bonus.effectiveDate)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[bonus.status]}`}>
                                {bonus.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBonus(bonus);
                                    setShowDetailModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {bonus.status === 'PENDING' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApproveBonus(bonus.id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRejectBonus(bonus.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEditBonus(bonus)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {bonus.status === 'APPROVED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkBonusPaid(bonus.id)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Banknote className="h-4 w-4" />
                                  </Button>
                                )}
                                {['PENDING', 'CANCELLED'].includes(bonus.status) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteBonus(bonus.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incentive Schemes Tab */}
          <TabsContent value="schemes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Incentive Schemes</CardTitle>
                <Button onClick={() => setShowSchemeModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scheme
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {schemes.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No incentive schemes found. Create your first scheme.
                    </div>
                  ) : (
                    schemes.map((scheme) => (
                      <Card key={scheme.id} className="border dark:border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold dark:text-white">{scheme.name}</h3>
                                <Badge variant="outline">{scheme.code}</Badge>
                                <Badge variant={scheme.isActive ? 'default' : 'secondary'}>
                                  {scheme.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              {scheme.description && (
                                <p className="text-sm text-muted-foreground mb-2">{scheme.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {scheme.frequency}
                                </span>
                                {scheme.payoutValue && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    {scheme.payoutType === 'FIXED'
                                      ? formatCurrency(scheme.payoutValue)
                                      : `${scheme.payoutValue}%`}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Award className="h-4 w-4 text-muted-foreground" />
                                  {scheme._count?.records || 0} records
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditScheme(scheme)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteScheme(scheme.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incentive Records Tab */}
          <TabsContent value="incentives" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Incentive Records</CardTitle>
                <Button onClick={() => setShowIncentiveModal(true)} disabled={schemes.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Record
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Employee</th>
                        <th className="text-left p-3 text-sm font-medium">Scheme</th>
                        <th className="text-left p-3 text-sm font-medium">Period</th>
                        <th className="text-right p-3 text-sm font-medium">Achievement</th>
                        <th className="text-right p-3 text-sm font-medium">Amount</th>
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                        <th className="text-right p-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incentiveRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            No incentive records found
                          </td>
                        </tr>
                      ) : (
                        incentiveRecords.map((record) => (
                          <tr key={record.id} className="border-b dark:border-gray-700 hover:bg-muted/25">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium dark:text-white">
                                  {record.user?.firstName?.[0]}
                                  {record.user?.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-sm dark:text-white">
                                    {record.user?.firstName} {record.user?.lastName}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm dark:text-gray-300">{record.scheme?.name}</td>
                            <td className="p-3 text-sm dark:text-gray-300">
                              {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                            </td>
                            <td className="p-3 text-right text-sm dark:text-gray-300">
                              {record.achievementPercent ? `${record.achievementPercent.toFixed(1)}%` : '-'}
                            </td>
                            <td className="p-3 text-right font-medium dark:text-white">
                              {formatCurrency(record.finalAmount, record.currency)}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[record.status]}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-1">
                                {record.status === 'PENDING' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApproveIncentive(record.id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRejectIncentive(record.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {record.status === 'APPROVED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkIncentivePaid(record.id)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Banknote className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Bonuses Tab */}
          <TabsContent value="my-bonuses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Bonuses & Incentives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bonuses.filter((b) => b.status === 'PAID').length === 0 &&
                  incentiveRecords.filter((r) => r.status === 'PAID').length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No paid bonuses or incentives yet.
                    </div>
                  ) : (
                    <>
                      {bonuses
                        .filter((b) => b.status === 'PAID')
                        .map((bonus) => (
                          <div
                            key={`bonus-${bonus.id}`}
                            className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <p className="font-medium dark:text-white">{bonus.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {bonus.bonusType} Bonus - {formatDate(bonus.paymentDate || bonus.effectiveDate)}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              +{formatCurrency(bonus.amount, bonus.currency)}
                            </p>
                          </div>
                        ))}
                      {incentiveRecords
                        .filter((r) => r.status === 'PAID')
                        .map((record) => (
                          <div
                            key={`incentive-${record.id}`}
                            className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <p className="font-medium dark:text-white">{record.scheme?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Incentive - {formatDate(record.periodStart)} to {formatDate(record.periodEnd)}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              +{formatCurrency(record.finalAmount, record.currency)}
                            </p>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bonus Modal */}
        <Dialog open={showBonusModal} onOpenChange={setShowBonusModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingBonus ? 'Edit Bonus' : 'Add Bonus'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Employee</label>
                <Select
                  value={bonusForm.userId ? String(bonusForm.userId) : ''}
                  onValueChange={(v) => setBonusForm({ ...bonusForm, userId: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Bonus Type</label>
                <Select
                  value={bonusForm.bonusType}
                  onValueChange={(v) => setBonusForm({ ...bonusForm, bonusType: v as BonusType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BONUS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={bonusForm.title}
                  onChange={(e) => setBonusForm({ ...bonusForm, title: e.target.value })}
                  placeholder="e.g., Q4 Performance Bonus"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  value={bonusForm.amount}
                  onChange={(e) => setBonusForm({ ...bonusForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Effective Date</label>
                <Input
                  type="date"
                  value={bonusForm.effectiveDate}
                  onChange={(e) => setBonusForm({ ...bonusForm, effectiveDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  value={bonusForm.description || ''}
                  onChange={(e) => setBonusForm({ ...bonusForm, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBonusModal(false)}>
                Cancel
              </Button>
              <Button onClick={editingBonus ? handleUpdateBonus : handleCreateBonus}>
                {editingBonus ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scheme Modal */}
        <Dialog open={showSchemeModal} onOpenChange={setShowSchemeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingScheme ? 'Edit Scheme' : 'Add Incentive Scheme'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={schemeForm.name}
                  onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
                  placeholder="e.g., Sales Incentive Plan"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input
                  value={schemeForm.code}
                  onChange={(e) => setSchemeForm({ ...schemeForm, code: e.target.value })}
                  placeholder="e.g., SALES-Q1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Frequency</label>
                <Select
                  value={schemeForm.frequency || 'QUARTERLY'}
                  onValueChange={(v) => setSchemeForm({ ...schemeForm, frequency: v as IncentiveFrequency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Payout Type</label>
                <Select
                  value={schemeForm.payoutType || 'FIXED'}
                  onValueChange={(v) => setSchemeForm({ ...schemeForm, payoutType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="SLAB">Slab Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Payout Value</label>
                <Input
                  type="number"
                  value={schemeForm.payoutValue || ''}
                  onChange={(e) => setSchemeForm({ ...schemeForm, payoutValue: parseFloat(e.target.value) || undefined })}
                  placeholder={schemeForm.payoutType === 'PERCENTAGE' ? 'e.g., 10 for 10%' : 'Amount'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={schemeForm.startDate}
                  onChange={(e) => setSchemeForm({ ...schemeForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date (Optional)</label>
                <Input
                  type="date"
                  value={schemeForm.endDate || ''}
                  onChange={(e) => setSchemeForm({ ...schemeForm, endDate: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  value={schemeForm.description || ''}
                  onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSchemeModal(false)}>
                Cancel
              </Button>
              <Button onClick={editingScheme ? handleUpdateScheme : handleCreateScheme}>
                {editingScheme ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Incentive Record Modal */}
        <Dialog open={showIncentiveModal} onOpenChange={setShowIncentiveModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Incentive Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Scheme</label>
                <Select
                  value={incentiveForm.schemeId ? String(incentiveForm.schemeId) : ''}
                  onValueChange={(v) => setIncentiveForm({ ...incentiveForm, schemeId: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemes
                      .filter((s) => s.isActive)
                      .map((scheme) => (
                        <SelectItem key={scheme.id} value={String(scheme.id)}>
                          {scheme.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Employee</label>
                <Select
                  value={incentiveForm.userId ? String(incentiveForm.userId) : ''}
                  onValueChange={(v) => setIncentiveForm({ ...incentiveForm, userId: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Period Start</label>
                  <Input
                    type="date"
                    value={incentiveForm.periodStart}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, periodStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Period End</label>
                  <Input
                    type="date"
                    value={incentiveForm.periodEnd}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, periodEnd: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Value</label>
                  <Input
                    type="number"
                    value={incentiveForm.targetValue || ''}
                    onChange={(e) =>
                      setIncentiveForm({ ...incentiveForm, targetValue: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Achieved Value</label>
                  <Input
                    type="number"
                    value={incentiveForm.achievedValue || ''}
                    onChange={(e) =>
                      setIncentiveForm({ ...incentiveForm, achievedValue: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Calculated Amount</label>
                <Input
                  type="number"
                  value={incentiveForm.calculatedAmount}
                  onChange={(e) =>
                    setIncentiveForm({ ...incentiveForm, calculatedAmount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIncentiveModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIncentive}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bonus Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bonus Details</DialogTitle>
            </DialogHeader>
            {selectedBonus && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium dark:text-white">
                    {selectedBonus.user?.firstName?.[0]}
                    {selectedBonus.user?.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold dark:text-white">
                      {selectedBonus.user?.firstName} {selectedBonus.user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedBonus.user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium dark:text-white">{selectedBonus.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline">{selectedBonus.bonusType}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg dark:text-white">
                      {formatCurrency(selectedBonus.amount, selectedBonus.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedBonus.status]}`}>
                      {selectedBonus.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Effective Date</p>
                    <p className="dark:text-white">{formatDate(selectedBonus.effectiveDate)}</p>
                  </div>
                  {selectedBonus.paymentDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="dark:text-white">{formatDate(selectedBonus.paymentDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Taxable</p>
                    <p className="dark:text-white">{selectedBonus.isTaxable ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested By</p>
                    <p className="dark:text-white">
                      {selectedBonus.requester?.firstName} {selectedBonus.requester?.lastName}
                    </p>
                  </div>
                </div>
                {selectedBonus.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="dark:text-gray-300">{selectedBonus.description}</p>
                  </div>
                )}
                {selectedBonus.rejectionReason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rejection Reason</p>
                    <p className="text-red-600 dark:text-red-400">{selectedBonus.rejectionReason}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
