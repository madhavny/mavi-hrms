// Module configuration for tenant module visibility control

export interface Module {
  id: string;
  label: string;
  description: string;
  category: string;
}

export const AVAILABLE_MODULES: Module[] = [
  // Core
  { id: 'dashboard', label: 'Dashboard', description: 'Main dashboard with overview', category: 'Core' },
  { id: 'employees', label: 'Employees', description: 'Employee management', category: 'Core' },
  { id: 'attendance', label: 'Attendance', description: 'Attendance tracking', category: 'Core' },
  { id: 'leave', label: 'Leave', description: 'Leave management', category: 'Core' },
  { id: 'leave-approvals', label: 'Leave Approvals', description: 'Approve/reject leave requests', category: 'Core' },

  // Performance
  { id: 'goals', label: 'Goals', description: 'Goal setting and tracking', category: 'Performance' },
  { id: 'reviews', label: 'Reviews', description: 'Performance reviews', category: 'Performance' },

  // Time & Projects
  { id: 'timesheet', label: 'Timesheet', description: 'Time tracking and timesheets', category: 'Time & Projects' },

  // Finance
  { id: 'expenses', label: 'Expenses', description: 'Expense claims and reimbursements', category: 'Finance' },
  { id: 'bonuses', label: 'Bonuses', description: 'Bonus management', category: 'Finance' },
  { id: 'payroll', label: 'Payroll', description: 'Salary structures and payslips', category: 'Finance' },

  // Learning
  { id: 'training', label: 'Training', description: 'Training programs', category: 'Learning' },
  { id: 'skills', label: 'Skills', description: 'Skills management', category: 'Learning' },

  // Resources
  { id: 'assets', label: 'Assets', description: 'Asset allocation and tracking', category: 'Resources' },
  { id: 'documents', label: 'Documents', description: 'Document management', category: 'Resources' },

  // HR
  { id: 'recruitment', label: 'Recruitment', description: 'Job postings and applications', category: 'HR' },

  // Analytics
  { id: 'reports', label: 'Reports', description: 'Standard reports', category: 'Analytics' },
  { id: 'analytics', label: 'Analytics', description: 'Advanced analytics', category: 'Analytics' },
  { id: 'report-builder', label: 'Report Builder', description: 'Custom report builder', category: 'Analytics' },

  // Admin
  { id: 'audit-logs', label: 'Audit Logs', description: 'Activity audit logs', category: 'Admin' },
  { id: 'holidays', label: 'Holidays', description: 'Holiday management', category: 'Admin' },
  { id: 'settings', label: 'Settings', description: 'System settings', category: 'Admin' },
];

// All modules enabled by default for new tenants
export const DEFAULT_ENABLED_MODULES = AVAILABLE_MODULES.map(m => m.id);

// These cannot be disabled by super admin (always enabled)
export const CORE_MODULES = ['dashboard', 'settings'];

// Module categories for grouping in UI
export const MODULE_CATEGORIES = [
  'Core',
  'Performance',
  'Time & Projects',
  'Finance',
  'Learning',
  'Resources',
  'HR',
  'Analytics',
  'Admin',
];

// Helper function to get modules by category
export const getModulesByCategory = () => {
  const grouped: Record<string, Module[]> = {};
  MODULE_CATEGORIES.forEach(category => {
    grouped[category] = AVAILABLE_MODULES.filter(m => m.category === category);
  });
  return grouped;
};

// Helper function to check if a module is a core module (cannot be disabled)
export const isCoreModule = (moduleId: string) => CORE_MODULES.includes(moduleId);
