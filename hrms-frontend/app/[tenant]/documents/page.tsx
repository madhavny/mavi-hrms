'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  documentsApi,
  Document,
  EmployeeDocument,
  DocumentType,
  EmployeeDocumentType,
  DocumentStats,
  EmployeeDocumentStats,
  DocumentInput,
  EmployeeDocumentInput,
  tenantApi,
} from '@/lib/api';
import {
  FileText, Upload, Folder, Search, Download, Eye, Trash2, Edit, Plus,
  CheckCircle, XCircle, Clock, AlertTriangle, HardDrive, FileUp, Filter, MoreVertical
} from 'lucide-react';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'POLICY', label: 'Policy' },
  { value: 'TEMPLATE', label: 'Template' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'HANDBOOK', label: 'Handbook' },
  { value: 'FORM', label: 'Form' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'OTHER', label: 'Other' },
];

const EMPLOYEE_DOCUMENT_TYPES: { value: EmployeeDocumentType; label: string }[] = [
  { value: 'RESUME', label: 'Resume' },
  { value: 'ID_PROOF', label: 'ID Proof' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'PAN_CARD', label: 'PAN Card' },
  { value: 'AADHAR_CARD', label: 'Aadhar Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'BANK_DETAILS', label: 'Bank Details' },
  { value: 'OFFER_LETTER', label: 'Offer Letter' },
  { value: 'APPOINTMENT_LETTER', label: 'Appointment Letter' },
  { value: 'RELIEVING_LETTER', label: 'Relieving Letter' },
  { value: 'PAYSLIP', label: 'Payslip' },
  { value: 'TAX_FORM', label: 'Tax Form' },
  { value: 'OTHER', label: 'Other' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDocumentTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    POLICY: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    TEMPLATE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    CONTRACT: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    CERTIFICATE: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    HANDBOOK: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    FORM: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
    GUIDE: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    OTHER: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  };
  return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);

  // Company Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Employee Documents state
  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [employeeDocStats, setEmployeeDocStats] = useState<EmployeeDocumentStats | null>(null);
  const [empDocTypeFilter, setEmpDocTypeFilter] = useState<EmployeeDocumentType | 'all'>('all');

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [empUploadModalOpen, setEmpUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedEmpDoc, setSelectedEmpDoc] = useState<EmployeeDocument | null>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState<Partial<DocumentInput>>({
    name: '',
    type: 'OTHER',
    category: '',
    description: '',
    isPublic: false,
  });
  const [empUploadForm, setEmpUploadForm] = useState<Partial<EmployeeDocumentInput>>({
    documentType: 'OTHER',
    name: '',
    description: '',
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // For admin employee document management
  const [users, setUsers] = useState<Array<{ id: number; firstName?: string; lastName?: string; email: string }>>([]);

  const fetchDocuments = useCallback(async () => {
    try {
      const params: Record<string, string | undefined> = {};
      if (searchTerm) params.search = searchTerm;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await documentsApi.list(params as Parameters<typeof documentsApi.list>[0]);
      setDocuments(res.data?.documents || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' });
    }
  }, [searchTerm, typeFilter, categoryFilter, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await documentsApi.getStats();
      setStats(res.data || null);
    } catch {
      console.error('Failed to load stats');
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await documentsApi.getCategories();
      setCategories(res.data || []);
    } catch {
      console.error('Failed to load categories');
    }
  }, []);

  const fetchMyDocuments = useCallback(async () => {
    try {
      const res = await documentsApi.getMyDocuments();
      setMyDocuments(res.data?.documents || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load my documents', variant: 'destructive' });
    }
  }, [toast]);

  const fetchEmployeeDocStats = useCallback(async () => {
    try {
      const res = await documentsApi.getEmployeeDocumentStats();
      setEmployeeDocStats(res.data || null);
    } catch {
      console.error('Failed to load employee document stats');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await tenantApi.getUsers();
      setUsers(res.data?.users || []);
    } catch {
      console.error('Failed to load users');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDocuments(),
        fetchStats(),
        fetchCategories(),
        fetchMyDocuments(),
        fetchEmployeeDocStats(),
        fetchUsers(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDocuments, fetchStats, fetchCategories, fetchMyDocuments, fetchEmployeeDocStats, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter, categoryFilter, fetchDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, isEmployeeDoc = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0], isEmployeeDoc);
    }
  };

  const handleFileSelect = (file: File, isEmployeeDoc = false) => {
    // For demo purposes, we'll simulate a file URL
    // In production, this would upload to S3/cloudinary and return a URL
    const fakeUrl = `/uploads/${Date.now()}-${file.name}`;

    if (isEmployeeDoc) {
      setEmpUploadForm({
        ...empUploadForm,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileUrl: fakeUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      });
      setEmpUploadModalOpen(true);
    } else {
      setUploadForm({
        ...uploadForm,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileUrl: fakeUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      });
      setUploadModalOpen(true);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.name || !uploadForm.type || !uploadForm.category || !uploadForm.fileUrl) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      await documentsApi.create(uploadForm as DocumentInput);
      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setUploadModalOpen(false);
      setUploadForm({ name: '', type: 'OTHER', category: '', description: '', isPublic: false });
      fetchDocuments();
      fetchStats();
      fetchCategories();
    } catch {
      toast({ title: 'Error', description: 'Failed to upload document', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadEmployeeDocument = async () => {
    if (!empUploadForm.name || !empUploadForm.documentType || !empUploadForm.fileUrl) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      await documentsApi.createEmployeeDocument(empUploadForm as EmployeeDocumentInput);
      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setEmpUploadModalOpen(false);
      setEmpUploadForm({ documentType: 'OTHER', name: '', description: '' });
      fetchMyDocuments();
      fetchEmployeeDocStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to upload document', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentsApi.delete(id);
      toast({ title: 'Success', description: 'Document deleted successfully' });
      fetchDocuments();
      fetchStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const handleDeleteEmployeeDocument = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentsApi.deleteEmployeeDocument(id);
      toast({ title: 'Success', description: 'Document deleted successfully' });
      fetchMyDocuments();
      fetchEmployeeDocStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const openDocumentDetail = async (doc: Document) => {
    try {
      const res = await documentsApi.get(doc.id);
      setSelectedDocument(res.data || null);
      setDetailModalOpen(true);
    } catch {
      toast({ title: 'Error', description: 'Failed to load document details', variant: 'destructive' });
    }
  };

  const filteredMyDocuments = myDocuments.filter(doc => {
    if (empDocTypeFilter !== 'all' && doc.documentType !== empDocTypeFilter) return false;
    return true;
  });

  return (
    <DashboardLayout title="Document Repository">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats?.totalDocuments || 0}</div>
              <p className="text-xs text-muted-foreground">Company documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats?.recentUploads || 0}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats?.totalSizeMB?.toFixed(1) || 0} MB</div>
              <p className="text-xs text-muted-foreground">{formatFileSize(stats?.totalSizeBytes || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Documents</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{myDocuments.length}</div>
              <p className="text-xs text-muted-foreground">Personal documents</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="company">Company Documents</TabsTrigger>
            <TabsTrigger value="my">My Documents</TabsTrigger>
          </TabsList>

          {/* Company Documents Tab */}
          <TabsContent value="company" className="space-y-4">
            {/* Filters and Upload */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | 'all')}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setUploadModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, false)}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], false)}
                  />
                </label>
              </p>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate dark:text-white">{doc.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className={getDocumentTypeColor(doc.type)} variant="secondary">
                              {doc.type}
                            </Badge>
                            <Badge variant="outline">{doc.category}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>v{doc.version}</span>
                            {doc.isPublic && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 dark:text-green-400">Public</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-3 pt-3 border-t">
                        <Button size="sm" variant="ghost" onClick={() => openDocumentDetail(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={doc.fileUrl} download={doc.fileName}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Documents Tab */}
          <TabsContent value="my" className="space-y-4">
            {/* Filters and Upload */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <Select value={empDocTypeFilter} onValueChange={(v) => setEmpDocTypeFilter(v as EmployeeDocumentType | 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setEmpUploadModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload My Document
              </Button>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, true)}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your personal documents here, or{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], true)}
                  />
                </label>
              </p>
            </div>

            {/* My Documents List */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredMyDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No personal documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMyDocuments.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium dark:text-white">{doc.name}</h3>
                            {doc.isVerified ? (
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" variant="secondary">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending Verification
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {EMPLOYEE_DOCUMENT_TYPES.find(t => t.value === doc.documentType)?.label || doc.documentType}
                            {' • '}{formatFileSize(doc.fileSize)}
                            {doc.expiryDate && (
                              <>
                                {' • Expires: '}{new Date(doc.expiryDate).toLocaleDateString()}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <a href={doc.fileUrl} download={doc.fileName}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeDocument(doc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Company Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadForm.fileName && (
              <div className="p-3 bg-muted rounded flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{uploadForm.fileName}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(uploadForm.fileSize || 0)}</p>
                </div>
              </div>
            )}
            <div className="grid gap-4">
              <div>
                <Label>Document Name *</Label>
                <Input
                  value={uploadForm.name || ''}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type *</Label>
                  <Select
                    value={uploadForm.type}
                    onValueChange={(v) => setUploadForm({ ...uploadForm, type: v as DocumentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category *</Label>
                  <Input
                    value={uploadForm.category || ''}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    placeholder="e.g., HR, Finance, IT"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={uploadForm.description || ''}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadForm.isPublic || false}
                  onChange={(e) => setUploadForm({ ...uploadForm, isPublic: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPublic" className="text-sm">Make this document visible to all employees</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadDocument} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Employee Document Modal */}
      <Dialog open={empUploadModalOpen} onOpenChange={setEmpUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload My Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {empUploadForm.fileName && (
              <div className="p-3 bg-muted rounded flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{empUploadForm.fileName}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(empUploadForm.fileSize || 0)}</p>
                </div>
              </div>
            )}
            <div className="grid gap-4">
              <div>
                <Label>Document Name *</Label>
                <Input
                  value={empUploadForm.name || ''}
                  onChange={(e) => setEmpUploadForm({ ...empUploadForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Document Type *</Label>
                <Select
                  value={empUploadForm.documentType}
                  onValueChange={(v) => setEmpUploadForm({ ...empUploadForm, documentType: v as EmployeeDocumentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issued Date</Label>
                  <Input
                    type="date"
                    value={empUploadForm.issuedDate || ''}
                    onChange={(e) => setEmpUploadForm({ ...empUploadForm, issuedDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={empUploadForm.expiryDate || ''}
                    onChange={(e) => setEmpUploadForm({ ...empUploadForm, expiryDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Document Number</Label>
                  <Input
                    value={empUploadForm.documentNo || ''}
                    onChange={(e) => setEmpUploadForm({ ...empUploadForm, documentNo: e.target.value })}
                    placeholder="e.g., passport number"
                  />
                </div>
                <div>
                  <Label>Issuing Authority</Label>
                  <Input
                    value={empUploadForm.issuer || ''}
                    onChange={(e) => setEmpUploadForm({ ...empUploadForm, issuer: e.target.value })}
                    placeholder="e.g., Government of India"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={empUploadForm.description || ''}
                  onChange={(e) => setEmpUploadForm({ ...empUploadForm, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadEmployeeDocument} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p>
                    <Badge className={getDocumentTypeColor(selectedDocument.type)} variant="secondary">
                      {selectedDocument.type}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="dark:text-white">{selectedDocument.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">File Size</Label>
                  <p className="dark:text-white">{formatFileSize(selectedDocument.fileSize)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Version</Label>
                  <p className="dark:text-white">v{selectedDocument.version}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uploaded By</Label>
                  <p className="dark:text-white">
                    {selectedDocument.uploader?.firstName} {selectedDocument.uploader?.lastName || selectedDocument.uploader?.email}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uploaded On</Label>
                  <p className="dark:text-white">{new Date(selectedDocument.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedDocument.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm dark:text-gray-300">{selectedDocument.description}</p>
                </div>
              )}
              {selectedDocument.versions && selectedDocument.versions.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Version History</Label>
                  <div className="mt-2 space-y-2">
                    {selectedDocument.versions.map((ver) => (
                      <div key={ver.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <span>v{ver.version} - {new Date(ver.createdAt).toLocaleDateString()}</span>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={ver.fileUrl} download={ver.fileName}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
            {selectedDocument && (
              <Button asChild>
                <a href={selectedDocument.fileUrl} download={selectedDocument.fileName}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
