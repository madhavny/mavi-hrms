'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { assetsApi, tenantApi, Asset, AssetAllocation, AssetStats, AssetCategory, AssetStatus, AssetCondition } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Package, Users, Wrench, AlertTriangle, Plus, Edit, Trash2, Search, ArrowLeftRight, RotateCcw, History } from 'lucide-react';

const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'KEYBOARD', label: 'Keyboard' },
  { value: 'MOUSE', label: 'Mouse' },
  { value: 'HEADSET', label: 'Headset' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'OTHER', label: 'Other' },
];

const ASSET_STATUS_CONFIG: Record<AssetStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  REPAIR: { label: 'Repair', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
  RETIRED: { label: 'Retired', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
  LOST: { label: 'Lost', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
};

const ASSET_CONDITIONS: { value: AssetCondition; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'DAMAGED', label: 'Damaged' },
];

interface Location {
  id: number;
  name: string;
  code: string;
}

interface TenantUser {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
}

export default function AssetsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [myHistory, setMyHistory] = useState<AssetAllocation[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');

  // Modal states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState({
    name: '',
    assetCode: '',
    category: 'OTHER' as AssetCategory,
    brand: '',
    model: '',
    serialNumber: '',
    description: '',
    purchaseDate: '',
    purchasePrice: '',
    currency: 'INR',
    warrantyEnd: '',
    condition: 'NEW' as AssetCondition,
    locationId: '',
    notes: '',
  });
  const [allocateForm, setAllocateForm] = useState({ userId: '', expectedReturn: '', conditionOut: 'GOOD' as AssetCondition, notes: '' });
  const [returnForm, setReturnForm] = useState({ conditionIn: 'GOOD' as AssetCondition, notes: '' });

  const fetchStats = useCallback(async () => {
    try {
      const res = await assetsApi.getStats();
      setStats(res.data || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const params: { category?: AssetCategory; status?: AssetStatus; search?: string } = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const res = await assetsApi.list(params);
      setAssets(res.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch assets', variant: 'destructive' });
    }
  }, [categoryFilter, statusFilter, search, toast]);

  const fetchMyAssets = useCallback(async () => {
    try {
      const res = await assetsApi.getMyAssets();
      setMyAssets(res.data || []);
    } catch (err) {
      console.error('Failed to fetch my assets:', err);
    }
  }, []);

  const fetchMyHistory = useCallback(async () => {
    try {
      const res = await assetsApi.getMyHistory();
      setMyHistory(res.data || []);
    } catch (err) {
      console.error('Failed to fetch my history:', err);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await tenantApi.getLocations();
      setLocations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await tenantApi.getUsers({ limit: 500 });
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchAssets(), fetchLocations(), fetchUsers(), fetchMyAssets()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchAssets, fetchLocations, fetchUsers, fetchMyAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, categoryFilter, statusFilter, search]);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyAssets();
      fetchMyHistory();
    }
  }, [activeTab, fetchMyAssets, fetchMyHistory]);

  const openAssetModal = (asset?: Asset) => {
    if (asset) {
      setSelectedAsset(asset);
      setAssetForm({
        name: asset.name,
        assetCode: asset.assetCode,
        category: asset.category,
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        description: asset.description || '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
        purchasePrice: asset.purchasePrice?.toString() || '',
        currency: asset.currency,
        warrantyEnd: asset.warrantyEnd ? asset.warrantyEnd.split('T')[0] : '',
        condition: asset.condition,
        locationId: asset.locationId?.toString() || '',
        notes: asset.notes || '',
      });
    } else {
      setSelectedAsset(null);
      setAssetForm({
        name: '',
        assetCode: '',
        category: 'OTHER',
        brand: '',
        model: '',
        serialNumber: '',
        description: '',
        purchaseDate: '',
        purchasePrice: '',
        currency: 'INR',
        warrantyEnd: '',
        condition: 'NEW',
        locationId: '',
        notes: '',
      });
    }
    setShowAssetModal(true);
  };

  const openDetailModal = async (assetId: number) => {
    try {
      const res = await assetsApi.get(assetId);
      setSelectedAsset(res.data || null);
      setShowDetailModal(true);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch asset details', variant: 'destructive' });
    }
  };

  const openAllocateModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setAllocateForm({ userId: '', expectedReturn: '', conditionOut: asset.condition || 'GOOD', notes: '' });
    setShowAllocateModal(true);
  };

  const openReturnModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setReturnForm({ conditionIn: asset.condition || 'GOOD', notes: '' });
    setShowReturnModal(true);
  };

  const handleSaveAsset = async () => {
    try {
      if (!assetForm.name.trim() || !assetForm.assetCode.trim()) {
        toast({ title: 'Error', description: 'Name and asset code are required', variant: 'destructive' });
        return;
      }

      const data = {
        name: assetForm.name,
        assetCode: assetForm.assetCode,
        category: assetForm.category,
        brand: assetForm.brand || undefined,
        model: assetForm.model || undefined,
        serialNumber: assetForm.serialNumber || undefined,
        description: assetForm.description || undefined,
        purchaseDate: assetForm.purchaseDate || undefined,
        purchasePrice: assetForm.purchasePrice ? parseFloat(assetForm.purchasePrice) : undefined,
        currency: assetForm.currency,
        warrantyEnd: assetForm.warrantyEnd || undefined,
        condition: assetForm.condition,
        locationId: assetForm.locationId ? parseInt(assetForm.locationId) : undefined,
        notes: assetForm.notes || undefined,
      };

      if (selectedAsset) {
        await assetsApi.update(selectedAsset.id, data);
        toast({ title: 'Success', description: 'Asset updated' });
      } else {
        await assetsApi.create(data);
        toast({ title: 'Success', description: 'Asset created' });
      }
      setShowAssetModal(false);
      fetchAssets();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to save asset', variant: 'destructive' });
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await assetsApi.delete(id);
      toast({ title: 'Success', description: 'Asset deleted' });
      fetchAssets();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to delete asset', variant: 'destructive' });
    }
  };

  const handleAllocate = async () => {
    if (!selectedAsset || !allocateForm.userId) {
      toast({ title: 'Error', description: 'Please select a user', variant: 'destructive' });
      return;
    }
    try {
      await assetsApi.allocate(selectedAsset.id, {
        userId: parseInt(allocateForm.userId),
        expectedReturn: allocateForm.expectedReturn || undefined,
        conditionOut: allocateForm.conditionOut,
        notes: allocateForm.notes || undefined,
      });
      toast({ title: 'Success', description: 'Asset allocated successfully' });
      setShowAllocateModal(false);
      fetchAssets();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to allocate asset', variant: 'destructive' });
    }
  };

  const handleReturn = async () => {
    if (!selectedAsset) return;
    try {
      await assetsApi.return(selectedAsset.id, {
        conditionIn: returnForm.conditionIn,
        notes: returnForm.notes || undefined,
      });
      toast({ title: 'Success', description: 'Asset returned successfully' });
      setShowReturnModal(false);
      fetchAssets();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to return asset', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (asset: Asset, newStatus: AssetStatus) => {
    try {
      await assetsApi.updateStatus(asset.id, { status: newStatus });
      toast({ title: 'Success', description: 'Asset status updated' });
      fetchAssets();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    }
  };

  const getStatusConfig = (status: AssetStatus) => ASSET_STATUS_CONFIG[status] || ASSET_STATUS_CONFIG.AVAILABLE;
  const getCategoryLabel = (category: AssetCategory) => ASSET_CATEGORIES.find((c) => c.value === category)?.label || category;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="Asset Management">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Asset Management">
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Asset Management</h1>
          <p className="text-muted-foreground">Track and manage company assets</p>
        </div>
        <Button onClick={() => openAssetModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalValue ? formatCurrency(stats.totalValue, 'INR') : '-'} total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.byStatus?.find((s) => s.status === 'ASSIGNED')?.count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">
              {(stats?.byStatus?.find((s) => s.status === 'MAINTENANCE')?.count || 0) +
                (stats?.byStatus?.find((s) => s.status === 'REPAIR')?.count || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warranty Expiring</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.warrantyExpiring?.length || 0}</div>
            <p className="text-xs text-muted-foreground">in next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assets">All Assets</TabsTrigger>
          <TabsTrigger value="my">My Assets</TabsTrigger>
        </TabsList>

        {/* All Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as AssetCategory | 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {ASSET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssetStatus | 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(ASSET_STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset) => (
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetailModal(asset.id)}>
                      <TableCell>
                        <div>
                          <div className="font-medium dark:text-white">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.assetCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{getCategoryLabel(asset.category)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusConfig(asset.status).color}>{getStatusConfig(asset.status).label}</Badge>
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {asset.currentUser ? `${asset.currentUser.firstName} ${asset.currentUser.lastName || ''}`.trim() : '-'}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{asset.location?.name || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{asset.condition}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {asset.status === 'AVAILABLE' && (
                            <Button size="sm" variant="outline" onClick={() => openAllocateModal(asset)}>
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                          )}
                          {asset.status === 'ASSIGNED' && (
                            <Button size="sm" variant="outline" onClick={() => openReturnModal(asset)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => openAssetModal(asset)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteAsset(asset.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* My Assets Tab */}
        <TabsContent value="my" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets Assigned to Me</CardTitle>
              <CardDescription>Currently assigned assets</CardDescription>
            </CardHeader>
            <CardContent>
              {myAssets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No assets currently assigned to you</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssets.map((asset) => (
                    <Card key={asset.id} className="cursor-pointer hover:shadow-md dark:hover:shadow-gray-900/50" onClick={() => openDetailModal(asset.id)}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{asset.name}</CardTitle>
                            <CardDescription>{asset.assetCode}</CardDescription>
                          </div>
                          <Badge className={getStatusConfig(asset.status).color}>{getCategoryLabel(asset.category)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1 dark:text-gray-300">
                          {asset.brand && <p>Brand: {asset.brand}</p>}
                          {asset.model && <p>Model: {asset.model}</p>}
                          {asset.serialNumber && <p>S/N: {asset.serialNumber}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" /> My Asset History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Condition Out</TableHead>
                    <TableHead>Condition In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    myHistory.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium dark:text-white">{alloc.asset?.name}</div>
                            <div className="text-sm text-muted-foreground">{alloc.asset?.assetCode}</div>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-gray-300">{new Date(alloc.allocatedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="dark:text-gray-300">{alloc.returnedAt ? new Date(alloc.returnedAt).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="dark:text-gray-300">{alloc.conditionOut}</TableCell>
                        <TableCell className="dark:text-gray-300">{alloc.conditionIn || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Asset Modal */}
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
            <DialogDescription>Enter asset details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Asset Code *</Label>
              <Input
                value={assetForm.assetCode}
                onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value.toUpperCase() })}
                placeholder="e.g., LAP-001"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={assetForm.category} onValueChange={(v) => setAssetForm({ ...assetForm, category: v as AssetCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={assetForm.condition} onValueChange={(v) => setAssetForm({ ...assetForm, condition: v as AssetCondition })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={assetForm.brand} onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })} />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={assetForm.model} onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })} />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={assetForm.serialNumber} onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={assetForm.locationId} onValueChange={(v) => setAssetForm({ ...assetForm, locationId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })} />
            </div>
            <div>
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={assetForm.purchasePrice}
                onChange={(e) => setAssetForm({ ...assetForm, purchasePrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Warranty End</Label>
              <Input type="date" value={assetForm.warrantyEnd} onChange={(e) => setAssetForm({ ...assetForm, warrantyEnd: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={assetForm.description} onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssetModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsset}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name}</DialogTitle>
            <DialogDescription>Asset Code: {selectedAsset?.assetCode}</DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="dark:text-white">{getCategoryLabel(selectedAsset.category)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <Badge className={getStatusConfig(selectedAsset.status).color}>{getStatusConfig(selectedAsset.status).label}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Brand / Model</Label>
                  <p className="dark:text-white">{[selectedAsset.brand, selectedAsset.model].filter(Boolean).join(' / ') || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Serial Number</Label>
                  <p className="dark:text-white">{selectedAsset.serialNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Condition</Label>
                  <p className="dark:text-white">{selectedAsset.condition}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="dark:text-white">{selectedAsset.location?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current User</Label>
                  <p className="dark:text-white">
                    {selectedAsset.currentUser
                      ? `${selectedAsset.currentUser.firstName} ${selectedAsset.currentUser.lastName || ''}`.trim()
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Price</Label>
                  <p className="dark:text-white">{selectedAsset.purchasePrice ? formatCurrency(selectedAsset.purchasePrice, selectedAsset.currency) : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Date</Label>
                  <p className="dark:text-white">{selectedAsset.purchaseDate ? new Date(selectedAsset.purchaseDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Warranty End</Label>
                  <p className="dark:text-white">{selectedAsset.warrantyEnd ? new Date(selectedAsset.warrantyEnd).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              {selectedAsset.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm dark:text-gray-300">{selectedAsset.description}</p>
                </div>
              )}
              {selectedAsset.allocations && selectedAsset.allocations.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Recent Allocations</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Returned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAsset.allocations.slice(0, 5).map((alloc) => (
                        <TableRow key={alloc.id}>
                          <TableCell className="dark:text-white">
                            {alloc.user?.firstName} {alloc.user?.lastName}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">{new Date(alloc.allocatedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="dark:text-gray-300">{alloc.returnedAt ? new Date(alloc.returnedAt).toLocaleDateString() : 'Current'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      {/* Allocate Modal */}
      <Dialog open={showAllocateModal} onOpenChange={setShowAllocateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Asset</DialogTitle>
            <DialogDescription>
              Assign {selectedAsset?.name} ({selectedAsset?.assetCode}) to an employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assign To *</Label>
              <Select value={allocateForm.userId} onValueChange={(v) => setAllocateForm({ ...allocateForm, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expected Return Date</Label>
              <Input
                type="date"
                value={allocateForm.expectedReturn}
                onChange={(e) => setAllocateForm({ ...allocateForm, expectedReturn: e.target.value })}
              />
            </div>
            <div>
              <Label>Condition</Label>
              <Select
                value={allocateForm.conditionOut}
                onValueChange={(v) => setAllocateForm({ ...allocateForm, conditionOut: v as AssetCondition })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={allocateForm.notes} onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocate}>Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>
              Return {selectedAsset?.name} ({selectedAsset?.assetCode})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Condition on Return</Label>
              <Select value={returnForm.conditionIn} onValueChange={(v) => setReturnForm({ ...returnForm, conditionIn: v as AssetCondition })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturn}>Return Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
