'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { skillsApi, tenantApi, Skill, EmployeeSkill, SkillMatrix, SkillGapItem, SkillStats, SkillCategory } from '@/lib/api';
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
import { BookOpen, Users, Award, TrendingUp, Plus, Edit, Trash2, Search, Check } from 'lucide-react';

const SKILL_CATEGORIES: { value: SkillCategory; label: string; color: string }[] = [
  { value: 'TECHNICAL', label: 'Technical', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { value: 'SOFT', label: 'Soft Skills', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  { value: 'DOMAIN', label: 'Domain', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  { value: 'LANGUAGE', label: 'Language', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  { value: 'TOOL', label: 'Tool', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
  { value: 'CERTIFICATION', label: 'Certification', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
];

const SKILL_LEVELS = [
  { value: 1, label: 'Beginner', color: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  { value: 2, label: 'Basic', color: 'bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 3, label: 'Intermediate', color: 'bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { value: 4, label: 'Advanced', color: 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  { value: 5, label: 'Expert', color: 'bg-purple-200 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
];

interface Department {
  id: number;
  name: string;
}

export default function SkillsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [matrix, setMatrix] = useState<SkillMatrix | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<SkillGapItem[]>([]);
  const [mySkills, setMySkills] = useState<EmployeeSkill[]>([]);
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'ALL'>('ALL');

  // Modal states
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillForm, setSkillForm] = useState({ name: '', category: 'TECHNICAL' as SkillCategory, description: '' });
  const [assignForm, setAssignForm] = useState({ skillId: 0, level: 1, yearsOfExp: '', lastUsed: '', isCertified: false, notes: '' });

  const fetchStats = useCallback(async () => {
    try {
      const res = await skillsApi.getStats();
      setStats(res.data || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const params: { category?: SkillCategory; search?: string } = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (search) params.search = search;
      const res = await skillsApi.list(params);
      setSkills(res.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch skills', variant: 'destructive' });
    }
  }, [categoryFilter, search]);

  const fetchMatrix = useCallback(async () => {
    try {
      const params: { departmentId?: number; skillCategory?: SkillCategory } = {};
      if (departmentFilter !== 'ALL') params.departmentId = departmentFilter;
      if (categoryFilter !== 'ALL') params.skillCategory = categoryFilter;
      const res = await skillsApi.getMatrix(params);
      setMatrix(res.data || null);
    } catch (err) {
      console.error('Failed to fetch matrix:', err);
    }
  }, [departmentFilter, categoryFilter]);

  const fetchGapAnalysis = useCallback(async () => {
    try {
      const params: { departmentId?: number } = {};
      if (departmentFilter !== 'ALL') params.departmentId = departmentFilter;
      const res = await skillsApi.getGapAnalysis(params);
      setGapAnalysis(res.data || []);
    } catch (err) {
      console.error('Failed to fetch gap analysis:', err);
    }
  }, [departmentFilter]);

  const fetchMySkills = useCallback(async () => {
    try {
      const res = await skillsApi.getMySkills();
      setMySkills(res.data || []);
    } catch (err) {
      console.error('Failed to fetch my skills:', err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await tenantApi.getDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchSkills(), fetchDepartments(), fetchMySkills()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchSkills, fetchDepartments, fetchMySkills]);

  useEffect(() => {
    if (activeTab === 'matrix') fetchMatrix();
    if (activeTab === 'gap') fetchGapAnalysis();
  }, [activeTab, fetchMatrix, fetchGapAnalysis]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills, categoryFilter, search]);

  const openSkillModal = (skill?: Skill) => {
    if (skill) {
      setSelectedSkill(skill);
      setSkillForm({ name: skill.name, category: skill.category, description: skill.description || '' });
    } else {
      setSelectedSkill(null);
      setSkillForm({ name: '', category: 'TECHNICAL', description: '' });
    }
    setShowSkillModal(true);
  };

  const openDetailModal = async (skillId: number) => {
    try {
      const res = await skillsApi.get(skillId);
      setSelectedSkill(res.data || null);
      setShowDetailModal(true);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch skill details', variant: 'destructive' });
    }
  };

  const openAssignModal = (skillId: number) => {
    setAssignForm({ skillId, level: 1, yearsOfExp: '', lastUsed: '', isCertified: false, notes: '' });
    setShowAssignModal(true);
  };

  const handleSaveSkill = async () => {
    try {
      if (!skillForm.name.trim()) {
        toast({ title: 'Error', description: 'Skill name is required', variant: 'destructive' });
        return;
      }

      if (selectedSkill) {
        await skillsApi.update(selectedSkill.id, skillForm);
        toast({ title: 'Success', description: 'Skill updated' });
      } else {
        await skillsApi.create(skillForm);
        toast({ title: 'Success', description: 'Skill created' });
      }
      setShowSkillModal(false);
      fetchSkills();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to save skill', variant: 'destructive' });
    }
  };

  const handleDeleteSkill = async (id: number) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      await skillsApi.delete(id);
      toast({ title: 'Success', description: 'Skill deleted' });
      fetchSkills();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to delete skill', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (skill: Skill) => {
    try {
      await skillsApi.update(skill.id, { isActive: !skill.isActive });
      toast({ title: 'Success', description: skill.isActive ? 'Skill deactivated' : 'Skill activated' });
      fetchSkills();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update skill', variant: 'destructive' });
    }
  };

  const handleAddMySkill = async () => {
    try {
      await skillsApi.addMySkill({
        skillId: assignForm.skillId,
        level: assignForm.level,
        yearsOfExp: assignForm.yearsOfExp ? parseFloat(assignForm.yearsOfExp) : undefined,
        lastUsed: assignForm.lastUsed || undefined,
      });
      toast({ title: 'Success', description: 'Skill added to your profile' });
      setShowAssignModal(false);
      fetchMySkills();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({ title: 'Error', description: error.message || 'Failed to add skill', variant: 'destructive' });
    }
  };

  const handleUpdateMySkill = async (skillId: number, level: number) => {
    try {
      await skillsApi.updateMySkill(skillId, { level });
      toast({ title: 'Success', description: 'Skill level updated' });
      fetchMySkills();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update skill', variant: 'destructive' });
    }
  };

  const getCategoryConfig = (category: SkillCategory) =>
    SKILL_CATEGORIES.find((c) => c.value === category) || SKILL_CATEGORIES[0];

  const getLevelConfig = (level: number) => SKILL_LEVELS.find((l) => l.value === level) || SKILL_LEVELS[0];

  const renderLevelCell = (level: number, isCertified: boolean) => {
    const config = getLevelConfig(level);
    return (
      <div className="flex items-center gap-1">
        <Badge className={config.color}>{level}</Badge>
        {isCertified && <Award className="h-3 w-3 text-yellow-500" />}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Skills Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Skills Management">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Skills Management</h1>
          <p className="text-muted-foreground">Manage skill inventory and track employee competencies</p>
        </div>
        <Button onClick={() => openSkillModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Skill
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.totalSkills || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.totalAssignments || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certified</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.certifiedCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{stats?.byCategory?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="matrix">Skill Matrix</TabsTrigger>
          <TabsTrigger value="gap">Gap Analysis</TabsTrigger>
          <TabsTrigger value="my">My Skills</TabsTrigger>
        </TabsList>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as SkillCategory | 'ALL')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {SKILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No skills found
                    </TableCell>
                  </TableRow>
                ) : (
                  skills.map((skill) => (
                    <TableRow key={skill.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetailModal(skill.id)}>
                      <TableCell className="font-medium">{skill.name}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryConfig(skill.category).color}>{getCategoryConfig(skill.category).label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{skill.description || '-'}</TableCell>
                      <TableCell>{skill._count?.employeeSkills || 0}</TableCell>
                      <TableCell>
                        <Badge variant={skill.isActive ? 'default' : 'secondary'}>{skill.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openSkillModal(skill)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleActive(skill)}>
                            {skill.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSkill(skill.id)}>
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

        {/* Skill Matrix Tab */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={String(departmentFilter)} onValueChange={(v) => setDepartmentFilter(v === 'ALL' ? 'ALL' : parseInt(v))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as SkillCategory | 'ALL')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {SKILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchMatrix}>
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Skill Matrix</CardTitle>
              <CardDescription>Employee skill levels across all skills</CardDescription>
            </CardHeader>
            <CardContent>
              {matrix && matrix.skills.length > 0 && matrix.employees.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Employee</TableHead>
                        {matrix.skills.map((skill) => (
                          <TableHead key={skill.id} className="text-center min-w-[80px]">
                            <div className="flex flex-col items-center">
                              <span className="text-xs truncate max-w-[80px]">{skill.name}</span>
                              <Badge variant="outline" className="text-xs mt-1">
                                {getCategoryConfig(skill.category).label.substring(0, 3)}
                              </Badge>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrix.employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-xs text-muted-foreground">{emp.department}</div>
                            </div>
                          </TableCell>
                          {matrix.skills.map((skill) => {
                            const empSkill = emp.skills[skill.id];
                            return (
                              <TableCell key={skill.id} className="text-center">
                                {empSkill ? renderLevelCell(empSkill.level, empSkill.isCertified) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No data to display</div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Skill Levels Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {SKILL_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center gap-2">
                    <Badge className={level.color}>{level.value}</Badge>
                    <span className="text-sm">{level.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Certified</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gap Analysis Tab */}
        <TabsContent value="gap" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={String(departmentFilter)} onValueChange={(v) => setDepartmentFilter(v === 'ALL' ? 'ALL' : parseInt(v))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchGapAnalysis}>
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Skill Gap Analysis</CardTitle>
              <CardDescription>Identify skill gaps in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>With Skill</TableHead>
                    <TableHead>Without Skill</TableHead>
                    <TableHead>Proficient (3+)</TableHead>
                    <TableHead>Expert (5)</TableHead>
                    <TableHead>Gap %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gapAnalysis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    gapAnalysis.map((item) => (
                      <TableRow key={item.skillId}>
                        <TableCell className="font-medium">{item.skillName}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryConfig(item.category).color}>{getCategoryConfig(item.category).label}</Badge>
                        </TableCell>
                        <TableCell>{item.withSkill}</TableCell>
                        <TableCell>{item.withoutSkill}</TableCell>
                        <TableCell>{item.proficient}</TableCell>
                        <TableCell>{item.expert}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${item.gapPercentage > 70 ? 'bg-red-500' : item.gapPercentage > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${item.gapPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium dark:text-white">{item.gapPercentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Skills Tab */}
        <TabsContent value="my" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Your skill profile</p>
            <Button onClick={() => openAssignModal(0)}>
              <Plus className="h-4 w-4 mr-2" /> Add Skill
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySkills.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8 text-muted-foreground">
                  You haven&apos;t added any skills yet
                </CardContent>
              </Card>
            ) : (
              mySkills.map((es) => (
                <Card key={es.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{es.skill?.name}</CardTitle>
                        <Badge className={getCategoryConfig(es.skill?.category || 'TECHNICAL').color}>
                          {getCategoryConfig(es.skill?.category || 'TECHNICAL').label}
                        </Badge>
                      </div>
                      {es.isCertified && <Award className="h-5 w-5 text-yellow-500" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Proficiency Level</Label>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <button
                              key={level}
                              onClick={() => handleUpdateMySkill(es.skillId, level)}
                              className={`w-6 h-6 rounded cursor-pointer ${level <= es.level ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{getLevelConfig(es.level).label}</p>
                      </div>
                      {es.yearsOfExp && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Experience</Label>
                          <p className="text-sm">{es.yearsOfExp} years</p>
                        </div>
                      )}
                      {es.lastUsed && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Used</Label>
                          <p className="text-sm">{new Date(es.lastUsed).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Skill Modal */}
      <Dialog open={showSkillModal} onOpenChange={setShowSkillModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSkill ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
            <DialogDescription>Create or update a skill in the inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} placeholder="e.g., React.js" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={skillForm.category} onValueChange={(v) => setSkillForm({ ...skillForm, category: v as SkillCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkillModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSkill}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSkill?.name}</DialogTitle>
            <DialogDescription>
              <Badge className={getCategoryConfig(selectedSkill?.category || 'TECHNICAL').color}>
                {getCategoryConfig(selectedSkill?.category || 'TECHNICAL').label}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSkill?.description && <p className="text-muted-foreground">{selectedSkill.description}</p>}
            <div>
              <h4 className="font-medium mb-2">Employees with this skill ({selectedSkill?.employeeSkills?.length || 0})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Certified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSkill?.employeeSkills?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No employees have this skill
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedSkill?.employeeSkills?.map((es) => (
                      <TableRow key={es.id}>
                        <TableCell>
                          {es.user?.firstName} {es.user?.lastName}
                        </TableCell>
                        <TableCell>{es.user?.department?.name || '-'}</TableCell>
                        <TableCell>{renderLevelCell(es.level, es.isCertified)}</TableCell>
                        <TableCell>
                          {es.isCertified ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <Check className="h-4 w-4" /> Yes
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add My Skill Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill to Profile</DialogTitle>
            <DialogDescription>Add a skill to your profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Skill</Label>
              <Select value={String(assignForm.skillId)} onValueChange={(v) => setAssignForm({ ...assignForm, skillId: parseInt(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills
                    .filter((s) => s.isActive && !mySkills.find((ms) => ms.skillId === s.id))
                    .map((skill) => (
                      <SelectItem key={skill.id} value={String(skill.id)}>
                        {skill.name} ({getCategoryConfig(skill.category).label})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proficiency Level</Label>
              <div className="flex items-center gap-2 mt-1">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setAssignForm({ ...assignForm, level: level.value })}
                    className={`px-3 py-1 rounded text-sm cursor-pointer ${assignForm.level === level.value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  >
                    {level.value}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getLevelConfig(assignForm.level).label}</p>
            </div>
            <div>
              <Label>Years of Experience</Label>
              <Input
                type="number"
                step="0.5"
                value={assignForm.yearsOfExp}
                onChange={(e) => setAssignForm({ ...assignForm, yearsOfExp: e.target.value })}
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <Label>Last Used</Label>
              <Input type="date" value={assignForm.lastUsed} onChange={(e) => setAssignForm({ ...assignForm, lastUsed: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMySkill} disabled={!assignForm.skillId}>
              Add Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
