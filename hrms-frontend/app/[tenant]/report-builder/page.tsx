'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  reportBuilderApi,
  ReportTemplate,
  ReportField,
  ReportDataSource,
  ChartType,
  ReportFilter,
  ReportSort,
  ReportAggregation,
  ReportBuilderStats,
  ReportRunResult,
} from '@/lib/api';
import {
  BarChart3,
  FileText,
  Play,
  Plus,
  Search,
  Settings,
  Trash2,
  Copy,
  Eye,
  GripVertical,
  X,
  ChevronRight,
  Database,
  Filter,
  SortAsc,
  PieChart,
  LineChart,
  Table as TableIcon,
  AreaChart,
  Download,
  Save,
  RefreshCw,
  Clock,
  Users,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart as RechartsLine,
  Line,
  AreaChart as RechartsArea,
  Area,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'TABLE', label: 'Table', icon: <TableIcon className="h-4 w-4" /> },
  { value: 'BAR', label: 'Bar Chart', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'LINE', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
  { value: 'PIE', label: 'Pie Chart', icon: <PieChart className="h-4 w-4" /> },
  { value: 'AREA', label: 'Area Chart', icon: <AreaChart className="h-4 w-4" /> },
  { value: 'DONUT', label: 'Donut Chart', icon: <PieChart className="h-4 w-4" /> },
];

const DATA_SOURCE_ICONS: Record<ReportDataSource, React.ReactNode> = {
  EMPLOYEES: <Users className="h-4 w-4" />,
  ATTENDANCE: <Clock className="h-4 w-4" />,
  LEAVE: <FileText className="h-4 w-4" />,
  PAYROLL: <Database className="h-4 w-4" />,
  GOALS: <BarChart3 className="h-4 w-4" />,
  REVIEWS: <FileText className="h-4 w-4" />,
  TRAINING: <Layers className="h-4 w-4" />,
  EXPENSES: <Database className="h-4 w-4" />,
  ASSETS: <Database className="h-4 w-4" />,
  RECRUITMENT: <Users className="h-4 w-4" />,
};

const FILTER_OPERATORS: Record<string, { value: string; label: string }[]> = {
  TEXT: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
  ],
  NUMBER: [
    { value: 'equals', label: 'Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
  ],
  DATE: [
    { value: 'equals', label: 'Equals' },
    { value: 'gt', label: 'After' },
    { value: 'gte', label: 'On or After' },
    { value: 'lt', label: 'Before' },
    { value: 'lte', label: 'On or Before' },
  ],
  CURRENCY: [
    { value: 'equals', label: 'Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
  ],
  PERCENTAGE: [
    { value: 'equals', label: 'Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
  ],
  BOOLEAN: [{ value: 'equals', label: 'Equals' }],
  ENUM: [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'In List' },
  ],
};

export default function ReportBuilderPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportBuilderStats | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [dataSources, setDataSources] = useState<{ id: ReportDataSource; name: string; fieldCount: number }[]>([]);
  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<ReportDataSource | null>(null);

  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState<ReportSort[]>([]);
  const [chartType, setChartType] = useState<ChartType>('TABLE');
  const [isPublic, setIsPublic] = useState(false);

  // Preview and run state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewFields, setPreviewFields] = useState<ReportField[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Run report state
  const [showRunResult, setShowRunResult] = useState(false);
  const [runResult, setRunResult] = useState<ReportRunResult | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  // Drag state
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, templatesRes, fieldsRes] = await Promise.all([
        reportBuilderApi.getStats(),
        reportBuilderApi.listTemplates({ limit: 50 }),
        reportBuilderApi.getAvailableFields(),
      ]);
      setStats(statsRes.data || null);
      setTemplates(templatesRes.data?.templates || []);
      setDataSources(fieldsRes.data?.dataSources || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchFieldsForDataSource = async (ds: ReportDataSource) => {
    try {
      const res = await reportBuilderApi.getAvailableFields(ds);
      setAvailableFields(res.data?.fields || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load fields', variant: 'destructive' });
    }
  };

  const handleDataSourceChange = (ds: ReportDataSource) => {
    setSelectedDataSource(ds);
    setSelectedFields([]);
    setFilters([]);
    setSortBy([]);
    fetchFieldsForDataSource(ds);
  };

  const handleNewReport = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setSelectedDataSource(null);
    setSelectedFields([]);
    setFilters([]);
    setSortBy([]);
    setChartType('TABLE');
    setIsPublic(false);
    setAvailableFields([]);
    setShowBuilder(true);
  };

  const handleEditTemplate = async (template: ReportTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setSelectedDataSource(template.dataSource);
    setSelectedFields(template.selectedFields);
    setFilters(template.filters || []);
    setSortBy(template.sortBy || []);
    setChartType(template.chartType);
    setIsPublic(template.isPublic);
    await fetchFieldsForDataSource(template.dataSource);
    setShowBuilder(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !selectedDataSource || selectedFields.length === 0) {
      toast({ title: 'Error', description: 'Name, data source, and at least one field are required', variant: 'destructive' });
      return;
    }

    try {
      if (editingTemplate) {
        await reportBuilderApi.updateTemplate(editingTemplate.id, {
          name: templateName,
          description: templateDescription,
          selectedFields,
          filters,
          sortBy,
          chartType,
          isPublic,
        });
        toast({ title: 'Success', description: 'Report template updated' });
      } else {
        await reportBuilderApi.createTemplate({
          name: templateName,
          description: templateDescription,
          dataSource: selectedDataSource,
          selectedFields,
          filters,
          sortBy,
          chartType,
          isPublic,
        });
        toast({ title: 'Success', description: 'Report template created' });
      }
      setShowBuilder(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err?.message || 'Failed to save template', variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await reportBuilderApi.deleteTemplate(id);
      toast({ title: 'Success', description: 'Template deleted' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const handleDuplicateTemplate = async (template: ReportTemplate) => {
    try {
      await reportBuilderApi.duplicateTemplate(template.id);
      toast({ title: 'Success', description: 'Template duplicated' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to duplicate template', variant: 'destructive' });
    }
  };

  const handlePreview = async () => {
    if (!selectedDataSource || selectedFields.length === 0) {
      toast({ title: 'Error', description: 'Select a data source and at least one field', variant: 'destructive' });
      return;
    }

    try {
      setPreviewLoading(true);
      const res = await reportBuilderApi.preview({
        dataSource: selectedDataSource,
        selectedFields,
        filters,
        sortBy,
        limit: 10,
      });
      setPreviewData(res.data?.data || []);
      setPreviewFields(res.data?.fieldMeta || []);
      setShowPreview(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to preview report', variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunReport = async (template: ReportTemplate) => {
    try {
      setRunLoading(true);
      const res = await reportBuilderApi.runReport(template.id);
      setRunResult(res.data || null);
      setShowRunResult(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to run report', variant: 'destructive' });
    } finally {
      setRunLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (fieldId: string) => {
    setDraggedField(fieldId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnSelected = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedField && !selectedFields.includes(draggedField)) {
      setSelectedFields([...selectedFields, draggedField]);
    }
    setDraggedField(null);
  };

  const handleRemoveField = (fieldId: string) => {
    setSelectedFields(selectedFields.filter((f) => f !== fieldId));
  };

  const handleAddFilter = () => {
    if (availableFields.length === 0) return;
    const firstField = availableFields[0];
    const fieldType = firstField.type;
    const operators = FILTER_OPERATORS[fieldType] || FILTER_OPERATORS.TEXT;
    setFilters([...filters, { field: firstField.id, operator: operators[0].value, value: '' }]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, key: keyof ReportFilter, value: string | number | boolean | string[]) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [key]: value };
    setFilters(newFilters);
  };

  const handleAddSort = () => {
    if (selectedFields.length === 0) return;
    setSortBy([...sortBy, { field: selectedFields[0], direction: 'asc' }]);
  };

  const handleRemoveSort = (index: number) => {
    setSortBy(sortBy.filter((_, i) => i !== index));
  };

  const handleSortChange = (index: number, key: keyof ReportSort, value: string) => {
    const newSortBy = [...sortBy];
    newSortBy[index] = { ...newSortBy[index], [key]: value as 'asc' | 'desc' };
    setSortBy(newSortBy);
  };

  const exportToCSV = (data: Record<string, unknown>[], fields: ReportField[], filename: string) => {
    const headers = fields.map((f) => f.name).join(',');
    const rows = data.map((row) => fields.map((f) => JSON.stringify(row[f.id] ?? '')).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupFieldsByCategory = (fields: ReportField[]) => {
    const grouped: Record<string, ReportField[]> = {};
    fields.forEach((field) => {
      if (!grouped[field.category]) grouped[field.category] = [];
      grouped[field.category].push(field);
    });
    return grouped;
  };

  const renderChart = (data: Record<string, unknown>[], fields: ReportField[], type: ChartType) => {
    if (data.length === 0 || fields.length === 0) return null;

    const labelField = fields[0];
    const valueFields = fields.filter((f) => f.type === 'NUMBER' || f.type === 'CURRENCY' || f.type === 'PERCENTAGE');

    if (type === 'TABLE') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => (
                <TableHead key={f.id}>{f.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {fields.map((f) => (
                  <TableCell key={f.id}>
                    {f.type === 'DATE' && row[f.id]
                      ? new Date(row[f.id] as string).toLocaleDateString()
                      : f.type === 'CURRENCY'
                        ? `$${Number(row[f.id] || 0).toLocaleString()}`
                        : f.type === 'PERCENTAGE'
                          ? `${Number(row[f.id] || 0).toFixed(1)}%`
                          : f.type === 'BOOLEAN'
                            ? row[f.id]
                              ? 'Yes'
                              : 'No'
                            : String(row[f.id] ?? '-')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    const chartData = data.map((row) => ({
      name: String(row[labelField.id] ?? 'N/A'),
      ...valueFields.reduce(
        (acc, f) => ({
          ...acc,
          [f.name]: Number(row[f.id] || 0),
        }),
        {}
      ),
    }));

    if (type === 'BAR') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {valueFields.map((f, i) => (
              <Bar key={f.id} dataKey={f.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'LINE') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsLine data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {valueFields.map((f, i) => (
              <Line key={f.id} type="monotone" dataKey={f.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </RechartsLine>
        </ResponsiveContainer>
      );
    }

    if (type === 'AREA') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsArea data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {valueFields.map((f, i) => (
              <Area key={f.id} type="monotone" dataKey={f.name} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.3} />
            ))}
          </RechartsArea>
        </ResponsiveContainer>
      );
    }

    if (type === 'PIE' || type === 'DONUT') {
      const valueField = valueFields[0];
      if (!valueField) return <p className="text-muted-foreground">Add a numeric field to show pie chart</p>;
      const pieData = chartData.map((d) => ({ name: d.name, value: (d as Record<string, unknown>)[valueField.name] as number }));
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsPie>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={type === 'DONUT' ? 120 : 150}
              innerRadius={type === 'DONUT' ? 60 : 0}
              label
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPie>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const filteredTemplates = templates.filter(
    (t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.dataSource.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Report Builder">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Report Builder">
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.myTemplates}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Public Templates</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.publicTemplates}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGenerated}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.dataSources.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Builder</CardTitle>
                <CardDescription>Create custom reports with drag-and-drop field selection</CardDescription>
              </div>
              <Button onClick={handleNewReport}>
                <Plus className="mr-2 h-4 w-4" />
                New Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="templates">My Templates</TabsTrigger>
                <TabsTrigger value="public">Public Templates</TabsTrigger>
                <TabsTrigger value="history">Run History</TabsTrigger>
              </TabsList>

              <div className="my-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <TabsContent value="templates">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates
                    .filter((t) => !t.isPublic || t.createdBy === stats?.myTemplates)
                    .map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {DATA_SOURCE_ICONS[template.dataSource]}
                              <CardTitle className="text-base">{template.name}</CardTitle>
                            </div>
                            <Badge variant={template.isPublic ? 'default' : 'secondary'}>
                              {template.isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-2">{template.description || 'No description'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Badge variant="outline">{template.dataSource}</Badge>
                            <Badge variant="outline">{template.chartType}</Badge>
                            <span>{template.selectedFields.length} fields</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleRunReport(template)} disabled={runLoading}>
                              <Play className="h-3 w-3 mr-1" />
                              Run
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>
                              <Settings className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {filteredTemplates.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No templates found. Create your first report!
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="public">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates
                    .filter((t) => t.isPublic)
                    .map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {DATA_SOURCE_ICONS[template.dataSource]}
                              <CardTitle className="text-base">{template.name}</CardTitle>
                            </div>
                            <Badge>Public</Badge>
                          </div>
                          <CardDescription className="line-clamp-2">{template.description || 'No description'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Badge variant="outline">{template.dataSource}</Badge>
                            <span>by {template.creator?.firstName || 'Unknown'}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleRunReport(template)} disabled={runLoading}>
                              <Play className="h-3 w-3 mr-1" />
                              Run
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="history">
                {stats?.recentReports && stats.recentReports.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report</TableHead>
                        <TableHead>Data Source</TableHead>
                        <TableHead>Generated At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{report.template.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.template.dataSource}</Badge>
                          </TableCell>
                          <TableCell>{new Date(report.generatedAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No reports generated yet</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Report Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Report' : 'Create New Report'}</DialogTitle>
            <DialogDescription>Design your custom report by selecting fields and configuring options</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-6">
            {/* Left Panel - Available Fields */}
            <div className="space-y-4">
              <div>
                <Label>Data Source</Label>
                <Select
                  value={selectedDataSource || ''}
                  onValueChange={(v) => handleDataSourceChange(v as ReportDataSource)}
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        <div className="flex items-center gap-2">
                          {DATA_SOURCE_ICONS[ds.id]}
                          <span>{ds.name}</span>
                          <span className="text-muted-foreground text-xs">({ds.fieldCount} fields)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {availableFields.length > 0 && (
                <div>
                  <Label className="mb-2 block">Available Fields</Label>
                  <div className="border rounded-lg p-2 max-h-[400px] overflow-y-auto space-y-2">
                    {Object.entries(groupFieldsByCategory(availableFields)).map(([category, fields]) => (
                      <div key={category}>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{category}</div>
                        {fields.map((field) => (
                          <div
                            key={field.id}
                            draggable
                            onDragStart={() => handleDragStart(field.id)}
                            className={`flex items-center gap-2 p-2 rounded cursor-move hover:bg-accent ${
                              selectedFields.includes(field.id) ? 'opacity-50' : ''
                            }`}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{field.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {field.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Center Panel - Selected Fields & Configuration */}
            <div className="space-y-4">
              <div>
                <Label>Report Name</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Enter report name" />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Optional description" rows={2} />
              </div>

              <div>
                <Label className="mb-2 block">Selected Fields (Drag here)</Label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnSelected}
                  className="border-2 border-dashed rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto"
                >
                  {selectedFields.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <ChevronRight className="h-8 w-8 mx-auto mb-2" />
                      <p>Drag fields here</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {selectedFields.map((fieldId) => {
                        const field = availableFields.find((f) => f.id === fieldId);
                        return (
                          <div key={fieldId} className="flex items-center justify-between p-2 bg-accent rounded">
                            <span className="text-sm">{field?.name || fieldId}</span>
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveField(fieldId)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked as boolean)} />
                <Label htmlFor="isPublic">Make this report public</Label>
              </div>
            </div>

            {/* Right Panel - Filters & Sort */}
            <div className="space-y-4">
              <div>
                <Label>Chart Type</Label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Filters</Label>
                  <Button size="sm" variant="outline" onClick={handleAddFilter} disabled={availableFields.length === 0}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {filters.map((filter, index) => {
                    const field = availableFields.find((f) => f.id === filter.field);
                    const operators = FILTER_OPERATORS[field?.type || 'TEXT'] || FILTER_OPERATORS.TEXT;
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Select value={filter.field} onValueChange={(v) => handleFilterChange(index, 'field', v)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={filter.operator} onValueChange={(v) => handleFilterChange(index, 'operator', v)}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={String(filter.value)}
                          onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                          className="flex-1"
                          placeholder="Value"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveFilter(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Sort By</Label>
                  <Button size="sm" variant="outline" onClick={handleAddSort} disabled={selectedFields.length === 0}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {sortBy.map((sort, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select value={sort.field} onValueChange={(v) => handleSortChange(index, 'field', v)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFields.map((fieldId) => {
                            const field = availableFields.find((f) => f.id === fieldId);
                            return (
                              <SelectItem key={fieldId} value={fieldId}>
                                {field?.name || fieldId}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Select value={sort.direction} onValueChange={(v) => handleSortChange(index, 'direction', v)}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveSort(index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={previewLoading || !selectedDataSource || selectedFields.length === 0}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>Showing first 10 records</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {renderChart(previewData, previewFields, chartType)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Result Dialog */}
      <Dialog open={showRunResult} onOpenChange={setShowRunResult}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{runResult?.templateName || 'Report Results'}</DialogTitle>
            <DialogDescription>
              {runResult?.rowCount || 0} records · Generated {runResult?.generatedAt ? new Date(runResult.generatedAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {runResult && renderChart(runResult.data, runResult.fieldMeta, runResult.chartType)}
          </div>
          {runResult?.summary && Object.keys(runResult.summary).length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Summary</h4>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(runResult.summary).map(([key, value]) => (
                  <div key={key} className="bg-accent rounded p-2">
                    <span className="text-sm text-muted-foreground">{key}: </span>
                    <span className="font-semibold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => runResult && exportToCSV(runResult.data, runResult.fieldMeta, runResult.templateName)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setShowRunResult(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
