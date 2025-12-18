'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Sparkles,
  Calculator,
  IndianRupee,
  Percent,
} from 'lucide-react';
import Link from 'next/link';
import { payrollApi, TaxSlab, TaxRegime, TaxCalculationResult } from '@/lib/api';

export default function TaxSlabsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [grouped, setGrouped] = useState<{ OLD: TaxSlab[]; NEW: TaxSlab[] }>({
    OLD: [],
    NEW: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaxRegime>('NEW');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState<TaxSlab | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    regime: 'NEW' as TaxRegime,
    financialYear: '2024-25',
    fromAmount: '',
    toAmount: '',
    percentage: '',
  });

  // Calculator state
  const [calcData, setCalcData] = useState({
    annualIncome: '',
    regime: 'NEW' as TaxRegime,
    section80C: '',
    section80D: '',
    hra: '',
    nps: '',
  });
  const [calcResult, setCalcResult] = useState<TaxCalculationResult | null>(null);

  const financialYears = ['2024-25', '2025-26', '2023-24', '2022-23'];

  useEffect(() => {
    fetchSlabs();
  }, []);

  const fetchSlabs = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getTaxSlabs();
      if (response.success && response.data) {
        setSlabs(response.data.slabs);
        setGrouped(response.data.grouped);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tax slabs');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default Indian tax slabs for FY 2024-25 (both Old and New regime). Continue?')) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await payrollApi.initializeDefaultTaxSlabs('2024-25');
      if (response.success) {
        fetchSlabs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize defaults');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = (regime: TaxRegime) => {
    setSelectedSlab(null);
    setFormData({
      regime,
      financialYear: '2024-25',
      fromAmount: '',
      toAmount: '',
      percentage: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (slab: TaxSlab) => {
    setSelectedSlab(slab);
    setFormData({
      regime: slab.regime,
      financialYear: slab.financialYear,
      fromAmount: slab.fromAmount.toString(),
      toAmount: slab.toAmount?.toString() || '',
      percentage: slab.percentage.toString(),
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (slab: TaxSlab) => {
    setSelectedSlab(slab);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        regime: formData.regime,
        financialYear: formData.financialYear,
        fromAmount: parseFloat(formData.fromAmount),
        toAmount: formData.toAmount ? parseFloat(formData.toAmount) : undefined,
        percentage: parseFloat(formData.percentage),
      };

      if (selectedSlab) {
        await payrollApi.updateTaxSlab(selectedSlab.id, data);
      } else {
        await payrollApi.createTaxSlab(data);
      }

      setIsModalOpen(false);
      fetchSlabs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tax slab');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlab) return;

    setIsSubmitting(true);
    try {
      await payrollApi.deleteTaxSlab(selectedSlab.id);
      setIsDeleteModalOpen(false);
      fetchSlabs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tax slab');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateTax = async () => {
    if (!calcData.annualIncome) return;

    try {
      setIsSubmitting(true);
      const response = await payrollApi.calculateTax({
        annualIncome: parseFloat(calcData.annualIncome),
        regime: calcData.regime,
        section80C: calcData.section80C ? parseFloat(calcData.section80C) : undefined,
        section80D: calcData.section80D ? parseFloat(calcData.section80D) : undefined,
        hra: calcData.hra ? parseFloat(calcData.hra) : undefined,
        nps: calcData.nps ? parseFloat(calcData.nps) : undefined,
      });

      if (response.success && response.data) {
        setCalcResult(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate tax');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)} K`;
    return amount.toString();
  };

  const renderSlabTable = (regime: TaxRegime) => {
    const regimeSlabs = grouped[regime].sort((a, b) => a.fromAmount - b.fromAmount);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-white">
              {regime === 'NEW' ? 'New Tax Regime' : 'Old Tax Regime'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {regime === 'NEW'
                ? 'Lower rates with minimal deductions'
                : 'Standard rates with full deductions (80C, 80D, HRA, etc.)'}
            </p>
          </div>
          <Button size="sm" onClick={() => openCreateModal(regime)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Slab
          </Button>
        </div>

        {regimeSlabs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No tax slabs configured for {regime} regime</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Income Range</TableHead>
                <TableHead>Financial Year</TableHead>
                <TableHead className="text-right">Tax Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regimeSlabs.map((slab) => (
                <TableRow key={slab.id}>
                  <TableCell>
                    <span className="font-medium dark:text-white">
                      {formatAmount(slab.fromAmount)} - {slab.toAmount ? formatAmount(slab.toAmount) : 'Above'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                      ({formatCurrency(slab.fromAmount)} - {slab.toAmount ? formatCurrency(slab.toAmount) : '∞'})
                    </span>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">{slab.financialYear}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={slab.percentage === 0 ? 'secondary' : 'default'}
                      className={slab.percentage === 0 ? 'dark:bg-gray-700 dark:text-gray-300' : ''}
                    >
                      {slab.percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={slab.isActive ? 'default' : 'secondary'}
                      className={slab.isActive ? 'dark:bg-green-900/30 dark:text-green-300' : 'dark:bg-gray-700 dark:text-gray-300'}
                    >
                      {slab.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(slab)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(slab)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title="Tax Slabs">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href={`/${tenantSlug}/settings`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold dark:text-white">Tax Slabs</h1>
              <p className="text-gray-500 dark:text-gray-400">Configure Indian income tax slabs for Old and New regime</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCalculatorOpen(true)}>
              <Calculator className="h-4 w-4 mr-2" />
              Tax Calculator
            </Button>
            {slabs.length === 0 && (
              <Button onClick={handleInitializeDefaults} disabled={isSubmitting}>
                <Sparkles className="h-4 w-4 mr-2" />
                Initialize Defaults
              </Button>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <IndianRupee className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Indian Tax Regime Information</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                <strong>New Regime (Default from FY 2023-24):</strong> Lower tax rates but limited deductions allowed (only NPS 80CCD(2), standard deduction).
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                <strong>Old Regime:</strong> Higher rates but allows all deductions - 80C (₹1.5L), 80D (Health Insurance), HRA, Home Loan Interest, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaxRegime)}>
            <TabsList className="mb-6">
              <TabsTrigger value="NEW" className="flex items-center gap-2">
                New Regime
                <Badge variant="secondary" className="ml-1">
                  {grouped.NEW.length} slabs
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="OLD" className="flex items-center gap-2">
                Old Regime
                <Badge variant="secondary" className="ml-1">
                  {grouped.OLD.length} slabs
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="NEW" className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
              {renderSlabTable('NEW')}
            </TabsContent>

            <TabsContent value="OLD" className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
              {renderSlabTable('OLD')}
            </TabsContent>
          </Tabs>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedSlab ? 'Edit' : 'Create'} Tax Slab</DialogTitle>
              <DialogDescription>
                {selectedSlab ? 'Update tax slab details' : 'Add a new tax slab'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="regime">Tax Regime</Label>
                    <Select
                      value={formData.regime}
                      onValueChange={(value) => setFormData({ ...formData, regime: value as TaxRegime })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New Regime</SelectItem>
                        <SelectItem value="OLD">Old Regime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="financialYear">Financial Year</Label>
                    <Select
                      value={formData.financialYear}
                      onValueChange={(value) => setFormData({ ...formData, financialYear: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {financialYears.map((fy) => (
                          <SelectItem key={fy} value={fy}>
                            {fy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromAmount">From Amount (₹)</Label>
                    <Input
                      id="fromAmount"
                      type="number"
                      value={formData.fromAmount}
                      onChange={(e) => setFormData({ ...formData, fromAmount: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="toAmount">To Amount (₹)</Label>
                    <Input
                      id="toAmount"
                      type="number"
                      value={formData.toAmount}
                      onChange={(e) => setFormData({ ...formData, toAmount: e.target.value })}
                      placeholder="Leave empty for last slab"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="percentage">Tax Rate (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    step="0.01"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedSlab ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tax Slab</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the tax slab for range{' '}
                <strong>
                  {selectedSlab && formatCurrency(selectedSlab.fromAmount)} -{' '}
                  {selectedSlab?.toAmount ? formatCurrency(selectedSlab.toAmount) : 'Above'}
                </strong>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tax Calculator Modal */}
        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Income Tax Calculator</DialogTitle>
              <DialogDescription>
                Calculate estimated income tax based on annual income and deductions
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="calcIncome">Annual Income (₹)</Label>
                  <Input
                    id="calcIncome"
                    type="number"
                    value={calcData.annualIncome}
                    onChange={(e) => setCalcData({ ...calcData, annualIncome: e.target.value })}
                    placeholder="1200000"
                  />
                </div>

                <div>
                  <Label htmlFor="calcRegime">Tax Regime</Label>
                  <Select
                    value={calcData.regime}
                    onValueChange={(value) => setCalcData({ ...calcData, regime: value as TaxRegime })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New Regime</SelectItem>
                      <SelectItem value="OLD">Old Regime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {calcData.regime === 'OLD' && (
                  <>
                    <div>
                      <Label htmlFor="calc80C">Section 80C (₹)</Label>
                      <Input
                        id="calc80C"
                        type="number"
                        value={calcData.section80C}
                        onChange={(e) => setCalcData({ ...calcData, section80C: e.target.value })}
                        placeholder="Max 150000"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PPF, ELSS, LIC, etc. (Max ₹1.5L)</p>
                    </div>

                    <div>
                      <Label htmlFor="calc80D">Section 80D (₹)</Label>
                      <Input
                        id="calc80D"
                        type="number"
                        value={calcData.section80D}
                        onChange={(e) => setCalcData({ ...calcData, section80D: e.target.value })}
                        placeholder="Max 100000"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Health Insurance Premium</p>
                    </div>

                    <div>
                      <Label htmlFor="calcHRA">HRA Exemption (₹)</Label>
                      <Input
                        id="calcHRA"
                        type="number"
                        value={calcData.hra}
                        onChange={(e) => setCalcData({ ...calcData, hra: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="calcNPS">NPS 80CCD(1B) (₹)</Label>
                  <Input
                    id="calcNPS"
                    type="number"
                    value={calcData.nps}
                    onChange={(e) => setCalcData({ ...calcData, nps: e.target.value })}
                    placeholder="Max 50000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Additional ₹50K deduction</p>
                </div>

                <Button onClick={handleCalculateTax} disabled={isSubmitting || !calcData.annualIncome} className="w-full">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Calculate Tax
                </Button>
              </div>

              {/* Result Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                {calcResult ? (
                  <div className="space-y-4">
                    <div className="text-center pb-4 border-b dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Tax Payable</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(calcResult.totalTax)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monthly: {formatCurrency(calcResult.monthlyTax)}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Gross Income</span>
                        <span className="dark:text-white">{formatCurrency(calcResult.annualIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Total Deductions</span>
                        <span className="text-green-600 dark:text-green-400">-{formatCurrency(calcResult.totalDeductions)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="dark:text-white">Taxable Income</span>
                        <span className="dark:text-white">{formatCurrency(calcResult.taxableIncome)}</span>
                      </div>
                    </div>

                    <div className="border-t dark:border-gray-700 pt-4">
                      <p className="text-sm font-medium mb-2 dark:text-white">Tax Breakdown</p>
                      <div className="space-y-1">
                        {calcResult.slabwiseTax.map((slab, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              {slab.slab} @ {slab.rate}
                            </span>
                            <span className="dark:text-gray-300">{formatCurrency(slab.tax)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs pt-1 border-t dark:border-gray-700">
                          <span className="text-gray-500 dark:text-gray-400">Cess (4%)</span>
                          <span className="dark:text-gray-300">{formatCurrency(calcResult.cess)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Effective Tax Rate</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{calcResult.effectiveRate}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Calculator className="h-12 w-12 mb-4" />
                    <p>Enter income details and click calculate</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCalculatorOpen(false);
                setCalcResult(null);
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
