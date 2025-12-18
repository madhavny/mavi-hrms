'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { dataImportApi, BulkImportResult } from '@/lib/api';
import {
  Upload,
  Download,
  Building2,
  Briefcase,
  MapPin,
  Shield,
  Calendar,
  DollarSign,
  Receipt,
  Lightbulb,
  FolderKanban,
  Users,
  Award,
  Wallet,
  Clock,
  CalendarCheck,
  Laptop,
  Link2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

// Module definitions with metadata
const IMPORT_MODULES = {
  // Phase 1: Master Data
  departments: {
    name: 'Departments',
    description: 'Organizational departments with hierarchy support',
    icon: Building2,
    phase: 1,
    color: 'bg-blue-500',
    dependencies: [],
    maxRecords: 500,
  },
  designations: {
    name: 'Designations',
    description: 'Job titles and grade levels',
    icon: Briefcase,
    phase: 1,
    color: 'bg-indigo-500',
    dependencies: [],
    maxRecords: 500,
  },
  locations: {
    name: 'Locations',
    description: 'Office locations with address details',
    icon: MapPin,
    phase: 1,
    color: 'bg-green-500',
    dependencies: [],
    maxRecords: 500,
  },
  roles: {
    name: 'Roles',
    description: 'Custom roles (non-system)',
    icon: Shield,
    phase: 1,
    color: 'bg-purple-500',
    dependencies: [],
    maxRecords: 100,
  },
  'leave-types': {
    name: 'Leave Types',
    description: 'Leave categories and policies',
    icon: Calendar,
    phase: 1,
    color: 'bg-orange-500',
    dependencies: [],
    maxRecords: 50,
  },
  'salary-components': {
    name: 'Salary Components',
    description: 'Earnings and deductions',
    icon: DollarSign,
    phase: 1,
    color: 'bg-emerald-500',
    dependencies: [],
    maxRecords: 100,
  },
  'expense-categories': {
    name: 'Expense Categories',
    description: 'Expense claim categories',
    icon: Receipt,
    phase: 1,
    color: 'bg-pink-500',
    dependencies: [],
    maxRecords: 50,
  },
  skills: {
    name: 'Skills',
    description: 'Employee skill categories',
    icon: Lightbulb,
    phase: 1,
    color: 'bg-yellow-500',
    dependencies: [],
    maxRecords: 500,
  },
  projects: {
    name: 'Projects',
    description: 'Project master data',
    icon: FolderKanban,
    phase: 1,
    color: 'bg-cyan-500',
    dependencies: [],
    maxRecords: 200,
  },

  // Phase 2: Employee Data
  employees: {
    name: 'Employees',
    description: 'Employee records with all details',
    icon: Users,
    phase: 2,
    color: 'bg-blue-600',
    dependencies: ['departments', 'designations', 'locations', 'roles'],
    maxRecords: 500,
  },
  'employee-skills': {
    name: 'Employee Skills',
    description: 'Skill assignments to employees',
    icon: Award,
    phase: 2,
    color: 'bg-amber-500',
    dependencies: ['employees', 'skills'],
    maxRecords: 1000,
  },
  'salary-structures': {
    name: 'Salary Structures',
    description: 'Employee salary configurations',
    icon: Wallet,
    phase: 2,
    color: 'bg-green-600',
    dependencies: ['employees'],
    maxRecords: 500,
  },

  // Phase 3: Transactional Data
  'leave-balances': {
    name: 'Leave Balances',
    description: 'Initial leave balances',
    icon: CalendarCheck,
    phase: 3,
    color: 'bg-teal-500',
    dependencies: ['employees', 'leave-types'],
    maxRecords: 2000,
  },
  attendance: {
    name: 'Attendance',
    description: 'Historical attendance records',
    icon: Clock,
    phase: 3,
    color: 'bg-slate-500',
    dependencies: ['employees'],
    maxRecords: 5000,
  },
  'leave-requests': {
    name: 'Leave Requests',
    description: 'Historical leave applications',
    icon: Calendar,
    phase: 3,
    color: 'bg-red-500',
    dependencies: ['employees', 'leave-types'],
    maxRecords: 2000,
  },
  assets: {
    name: 'Assets',
    description: 'Company asset inventory',
    icon: Laptop,
    phase: 3,
    color: 'bg-violet-500',
    dependencies: [],
    maxRecords: 1000,
  },
  'asset-allocations': {
    name: 'Asset Allocations',
    description: 'Asset assignments to employees',
    icon: Link2,
    phase: 3,
    color: 'bg-fuchsia-500',
    dependencies: ['employees', 'assets'],
    maxRecords: 500,
  },
};

type ModuleKey = keyof typeof IMPORT_MODULES;

export default function DataImportPage() {
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<ModuleKey | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadTemplate = async (module: ModuleKey) => {
    setDownloading(module);
    try {
      await dataImportApi.downloadTemplate(module);
      toast({
        title: 'Template Downloaded',
        description: `${IMPORT_MODULES[module].name} template has been downloaded.`,
      });
    } catch {
      toast({
        title: 'Download Failed',
        description: 'Failed to download template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleOpenImport = (module: ModuleKey) => {
    setSelectedModule(module);
    setSelectedFile(null);
    setImportResult(null);
    setShowImportDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedModule) return;

    setImporting(true);
    try {
      const result = await dataImportApi.import(selectedModule, selectedFile);
      setImportResult(result);
      if (result.data.successful > 0) {
        toast({
          title: 'Import Completed',
          description: `${result.data.successful} records imported successfully.`,
        });
      } else if (result.data.failed > 0) {
        toast({
          title: 'Import Failed',
          description: 'No records were imported. Check the errors below.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Import Error',
        description: err instanceof Error ? err.message : 'Failed to import data',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const renderModuleCard = (moduleKey: ModuleKey) => {
    const module = IMPORT_MODULES[moduleKey];
    const Icon = module.icon;
    const hasDependencies = module.dependencies.length > 0;

    return (
      <Card key={moduleKey} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${module.color} text-white`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs text-muted-foreground">Phase {module.phase}</span>
          </div>
          <CardTitle className="text-lg">{module.name}</CardTitle>
          <CardDescription className="text-sm">{module.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasDependencies && (
            <div className="mb-3 text-xs text-muted-foreground">
              <span className="font-medium">Requires:</span>{' '}
              {module.dependencies.map(d => IMPORT_MODULES[d as ModuleKey].name).join(', ')}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleDownloadTemplate(moduleKey)}
              disabled={downloading === moduleKey}
            >
              {downloading === moduleKey ? (
                <Spinner className="h-4 w-4 mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Template
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleOpenImport(moduleKey)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const phase1Modules = Object.keys(IMPORT_MODULES).filter(
    k => IMPORT_MODULES[k as ModuleKey].phase === 1
  ) as ModuleKey[];
  const phase2Modules = Object.keys(IMPORT_MODULES).filter(
    k => IMPORT_MODULES[k as ModuleKey].phase === 2
  ) as ModuleKey[];
  const phase3Modules = Object.keys(IMPORT_MODULES).filter(
    k => IMPORT_MODULES[k as ModuleKey].phase === 3
  ) as ModuleKey[];

  return (
    <DashboardLayout title="Data Import">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Data Migration</h1>
          <p className="text-muted-foreground dark:text-gray-400 mt-1">
            Import data from your previous HRMS system. Follow the phase order for best results.
          </p>
        </div>

        {/* Import Guide */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300">Import Order Guide</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-blue-800 dark:text-blue-300">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">Phase 1: Master Data</span>
                  <ArrowRight className="h-4 w-4 hidden sm:block" />
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">Phase 2: Employees</span>
                  <ArrowRight className="h-4 w-4 hidden sm:block" />
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">Phase 3: Transactions</span>
                </div>
                <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                  Import master data first, then employees, then transactional data. Each module shows its dependencies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase 1: Master Data */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
              Phase 1
            </span>
            <h2 className="text-lg font-semibold dark:text-white">Master Data</h2>
            <span className="text-muted-foreground dark:text-gray-400 text-sm">(No dependencies)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase1Modules.map(renderModuleCard)}
          </div>
        </div>

        {/* Phase 2: Employee Data */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-medium">
              Phase 2
            </span>
            <h2 className="text-lg font-semibold dark:text-white">Employee Data</h2>
            <span className="text-muted-foreground dark:text-gray-400 text-sm">(Requires Phase 1)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase2Modules.map(renderModuleCard)}
          </div>
        </div>

        {/* Phase 3: Transactional Data */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium">
              Phase 3
            </span>
            <h2 className="text-lg font-semibold dark:text-white">Transactional Data</h2>
            <span className="text-muted-foreground dark:text-gray-400 text-sm">(Requires Phase 1 & 2)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase3Modules.map(renderModuleCard)}
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedModule && (
                <>
                  {(() => {
                    const Icon = IMPORT_MODULES[selectedModule].icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  Import {IMPORT_MODULES[selectedModule]?.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to import data. Maximum {selectedModule ? IMPORT_MODULES[selectedModule].maxRecords.toLocaleString() : 0} records per import.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Dependencies Warning */}
            {selectedModule && IMPORT_MODULES[selectedModule].dependencies.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">Prerequisites:</span> Import these modules first:{' '}
                    {IMPORT_MODULES[selectedModule].dependencies
                      .map(d => IMPORT_MODULES[d as ModuleKey].name)
                      .join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Template Download */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium dark:text-white">Step 1: Download Template</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Get the CSV template with sample data
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => selectedModule && handleDownloadTemplate(selectedModule)}
                  disabled={!selectedModule || downloading === selectedModule}
                >
                  {downloading === selectedModule ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Download Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="p-4 border-2 border-dashed dark:border-gray-700 rounded-lg">
              <p className="font-medium mb-2 dark:text-white">Step 2: Upload CSV File</p>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFile ? selectedFile.name : 'Choose a CSV file...'}
                  </span>
                </label>
                {selectedFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-3">
                <p className="font-medium dark:text-white">Import Results</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-2xl font-bold dark:text-white">{importResult.data.total}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Rows</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importResult.data.successful}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">Successful</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {importResult.data.failed}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                  </div>
                </div>

                {/* Created Records */}
                {importResult.data.created && importResult.data.created.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-300">
                        Created ({importResult.data.created.length})
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-sm text-green-700 dark:text-green-300">
                      {importResult.data.created.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="truncate">
                          {(item.name as string) || (item.email as string) || (item.code as string) || `Record ${item.id}`}
                        </div>
                      ))}
                      {importResult.data.created.length > 10 && (
                        <div className="text-green-600 dark:text-green-400 font-medium mt-1">
                          ...and {importResult.data.created.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {importResult.data.errors && importResult.data.errors.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-300">
                        Errors ({importResult.data.errors.length})
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto text-sm text-red-700 dark:text-red-300 space-y-1">
                      {importResult.data.errors.slice(0, 20).map((error, idx) => (
                        <div key={idx} className="truncate">{error}</div>
                      ))}
                      {importResult.data.errors.length > 20 && (
                        <div className="text-red-600 dark:text-red-400 font-medium mt-1">
                          ...and {importResult.data.errors.length - 20} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importing}
              >
                {importing ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
