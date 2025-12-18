'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  expensesApi,
  ExpenseCategory,
  ExpenseClaim,
  ExpenseStats,
  ExpenseStatus,
} from '@/lib/api';
import {
  Receipt,
  Plus,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  Trash2,
  Tag,
  Wallet,
  CreditCard,
  Edit,
} from 'lucide-react';

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: Edit },
  PENDING: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
  REIMBURSED: { label: 'Reimbursed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: CreditCard },
};

const formatCurrency = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function ExpensesPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [activeTab, setActiveTab] = useState('claims');
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ExpenseClaim[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; role?: { code: string } } | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | ''>('');

  // Claim Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ExpenseClaim | null>(null);
  const [claimForm, setClaimForm] = useState({
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receiptUrl: '',
    notes: '',
  });

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    maxLimit: '',
    requiresReceipt: true,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [claimsRes, categoriesRes, statsRes] = await Promise.all([
        expensesApi.listClaims({ myClaims: true, status: filterStatus || undefined }),
        expensesApi.listCategories(),
        expensesApi.getStats({ myClaims: true }),
      ]);

      if (claimsRes.data) setClaims(claimsRes.data.data || []);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (statsRes.data) setStats(statsRes.data);

      // Load pending approvals for managers
      if (user?.role?.code === 'ADMIN' || user?.role?.code === 'HR' || user?.role?.code === 'MANAGER') {
        const approvalsRes = await expensesApi.listClaims({ toApprove: true });
        if (approvalsRes.data) setPendingApprovals(approvalsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async (submit: boolean = false) => {
    try {
      if (editingClaim) {
        await expensesApi.updateClaim(editingClaim.id, {
          categoryId: parseInt(claimForm.categoryId),
          amount: parseFloat(claimForm.amount),
          date: claimForm.date,
          description: claimForm.description,
          receiptUrl: claimForm.receiptUrl || undefined,
          notes: claimForm.notes || undefined,
        });
        if (submit) {
          await expensesApi.submitClaim(editingClaim.id);
        }
      } else {
        await expensesApi.createClaim({
          categoryId: parseInt(claimForm.categoryId),
          amount: parseFloat(claimForm.amount),
          date: claimForm.date,
          description: claimForm.description,
          receiptUrl: claimForm.receiptUrl || undefined,
          notes: claimForm.notes || undefined,
          submit,
        });
      }
      setShowClaimModal(false);
      setEditingClaim(null);
      setClaimForm({
        categoryId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receiptUrl: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      console.error('Failed to save claim:', err);
    }
  };

  const handleEditClaim = (claim: ExpenseClaim) => {
    setEditingClaim(claim);
    setClaimForm({
      categoryId: claim.categoryId.toString(),
      amount: claim.amount.toString(),
      date: claim.date.split('T')[0],
      description: claim.description,
      receiptUrl: claim.receiptUrl || '',
      notes: claim.notes || '',
    });
    setShowClaimModal(true);
  };

  const handleDeleteClaim = async (id: number) => {
    if (!confirm('Are you sure you want to delete this claim?')) return;
    try {
      await expensesApi.deleteClaim(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete claim:', err);
    }
  };

  const handleSubmitClaim = async (id: number) => {
    try {
      await expensesApi.submitClaim(id);
      loadData();
    } catch (err) {
      console.error('Failed to submit claim:', err);
    }
  };

  const handleApprove = async (claimIds: number[]) => {
    try {
      await expensesApi.approveClaims(claimIds);
      loadData();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (claimIds: number[]) => {
    const reason = prompt('Enter rejection reason (optional):');
    try {
      await expensesApi.rejectClaims(claimIds, reason || undefined);
      loadData();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleReimburse = async (claimIds: number[]) => {
    try {
      await expensesApi.markAsReimbursed(claimIds);
      loadData();
    } catch (err) {
      console.error('Failed to reimburse:', err);
    }
  };

  const handleCreateCategory = async () => {
    try {
      await expensesApi.createCategory({
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        maxLimit: categoryForm.maxLimit ? parseFloat(categoryForm.maxLimit) : undefined,
        requiresReceipt: categoryForm.requiresReceipt,
      });
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '', maxLimit: '', requiresReceipt: true });
      loadData();
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await expensesApi.deleteCategory(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const isAdmin = user?.role?.code === 'ADMIN' || user?.role?.code === 'HR';
  const isManager = user?.role?.code === 'MANAGER' || isAdmin;

  if (loading) {
    return (
      <DashboardLayout title="Expenses">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Expenses">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Claims</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.total}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold dark:text-white">{formatCurrency(stats.pendingAmount)}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                  <p className="text-2xl font-bold dark:text-white">{formatCurrency(stats.approvedAmount)}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reimbursed</p>
                  <p className="text-2xl font-bold dark:text-white">{formatCurrency(stats.reimbursedAmount)}</p>
                </div>
                <Wallet className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="claims">My Claims</TabsTrigger>
            {isManager && <TabsTrigger value="approvals">Approvals ({pendingApprovals.length})</TabsTrigger>}
            {isAdmin && <TabsTrigger value="categories">Categories</TabsTrigger>}
          </TabsList>

          {activeTab === 'claims' && (
            <Button onClick={() => { setEditingClaim(null); setShowClaimModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          )}
          {isAdmin && activeTab === 'categories' && (
            <Button onClick={() => setShowCategoryModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          )}
        </div>

        {/* Claims Tab */}
        <TabsContent value="claims">
          <div className="flex items-center gap-4 mb-4">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ExpenseStatus | '')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REIMBURSED">Reimbursed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {claims.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No expense claims</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Submit your first expense claim</p>
                  <Button onClick={() => setShowClaimModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Claim
                  </Button>
                </CardContent>
              </Card>
            ) : (
              claims.map((claim) => (
                <Card key={claim.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={STATUS_CONFIG[claim.status].color}>
                            {STATUS_CONFIG[claim.status].label}
                          </Badge>
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {claim.category?.name}
                          </Badge>
                          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(claim.amount, claim.currency)}
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-white mb-1">{claim.description}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(claim.date).toLocaleDateString()}
                          {claim.rejectedReason && (
                            <span className="text-red-500 dark:text-red-400 ml-2">
                              Rejected: {claim.rejectedReason}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {claim.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubmitClaim(claim.id)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Submit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClaim(claim)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClaim(claim.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {claim.status === 'REJECTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClaim(claim)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit & Resubmit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Approvals Tab */}
        {isManager && (
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p>No pending expense approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={claim.user?.avatar || undefined} />
                            <AvatarFallback>
                              {claim.user?.firstName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium dark:text-white">
                              {claim.user?.firstName} {claim.user?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {claim.category?.name} | {new Date(claim.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{claim.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(claim.amount, claim.currency)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject([claim.id])}
                            >
                              <XCircle className="h-4 w-4 mr-1 text-red-500" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove([claim.id])}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Categories Tab */}
        {isAdmin && (
          <TabsContent value="categories">
            <div className="space-y-4">
              {categories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Tag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No categories</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Create expense categories for claims</p>
                    <Button onClick={() => setShowCategoryModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Category
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                categories.map((cat) => (
                  <Card key={cat.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-lg dark:text-white">{cat.name}</h3>
                            {cat.requiresReceipt && (
                              <Badge variant="outline">Receipt Required</Badge>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{cat.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {cat.maxLimit && (
                              <span>Max: {formatCurrency(cat.maxLimit)}</span>
                            )}
                            <span>{cat._count?.claims || 0} claims</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Claim Modal */}
      <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClaim ? 'Edit Expense Claim' : 'New Expense Claim'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Category *</Label>
              <Select
                value={claimForm.categoryId}
                onValueChange={(v) => setClaimForm({ ...claimForm, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                      {cat.maxLimit && ` (Max: ${formatCurrency(cat.maxLimit)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (INR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={claimForm.amount}
                  onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={claimForm.date}
                  onChange={(e) => setClaimForm({ ...claimForm, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                placeholder="Describe the expense..."
                rows={2}
              />
            </div>
            <div>
              <Label>Receipt URL</Label>
              <Input
                value={claimForm.receiptUrl}
                onChange={(e) => setClaimForm({ ...claimForm, receiptUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={claimForm.notes}
                onChange={(e) => setClaimForm({ ...claimForm, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowClaimModal(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateClaim(false)}
              disabled={!claimForm.categoryId || !claimForm.amount || !claimForm.date || !claimForm.description}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleCreateClaim(true)}
              disabled={!claimForm.categoryId || !claimForm.amount || !claimForm.date || !claimForm.description}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Expense Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Travel, Food, Office Supplies"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label>Max Limit per Claim (INR)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={categoryForm.maxLimit}
                onChange={(e) => setCategoryForm({ ...categoryForm, maxLimit: e.target.value })}
                placeholder="Leave empty for no limit"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresReceipt"
                checked={categoryForm.requiresReceipt}
                onChange={(e) => setCategoryForm({ ...categoryForm, requiresReceipt: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="requiresReceipt" className="cursor-pointer">
                Receipt required for claims
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!categoryForm.name}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
