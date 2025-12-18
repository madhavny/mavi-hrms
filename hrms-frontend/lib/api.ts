const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Super Admin APIs
export const superAdminApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string } }>(
      '/super-admin/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  getDashboard: () =>
    request<{ totalTenants: number; activeTenants: number; totalUsers: number }>(
      '/super-admin/dashboard'
    ),

  getTenants: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ tenants: Tenant[]; total: number; page: number; limit: number }>(
      `/super-admin/tenants${query ? `?${query}` : ''}`
    );
  },

  getTenant: (id: number) => request<Tenant>(`/super-admin/tenants/${id}`),

  createTenant: (data: CreateTenantInput) =>
    request<{
      tenant: Tenant;
      adminUser: { id: number; email: string; firstName: string; lastName: string };
      credentials: {
        email: string;
        password: string;
        loginUrl: string;
        warning: string;
      };
    }>(
      '/super-admin/tenants',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  updateTenant: (id: number, data: Partial<Tenant>) =>
    request<Tenant>(`/super-admin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteTenant: (id: number) =>
    request<{ message: string }>(`/super-admin/tenants/${id}`, { method: 'DELETE' }),

  changeTenantStatus: (id: number, status: string) =>
    request<{ tenant: Tenant; message: string }>(`/super-admin/tenants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  permanentlyDeleteTenant: (id: number) =>
    request<{ message: string }>(`/super-admin/tenants/${id}/permanent`, { method: 'DELETE' }),
};

// Tenant APIs
export const tenantApi = {
  login: (email: string, password: string, tenant: string) =>
    request<{
      token: string;
      user: TenantUser;
      tenant: { id: number; name: string; slug: string; logo?: string };
    }>('/tenant/login', { method: 'POST', body: JSON.stringify({ email, password, tenant }) }),

  getProfile: () => request<TenantUser>('/tenant/profile'),

  getDashboard: () =>
    request<{ totalUsers: number; activeUsers: number; departments: number }>('/tenant/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ users: TenantUser[]; total: number; page: number; limit: number }>(
      `/tenant/users${query ? `?${query}` : ''}`
    );
  },

  createUser: (data: CreateUserInput) =>
    request<TenantUser>('/tenant/users', { method: 'POST', body: JSON.stringify(data) }),

  getUser: (id: number) => request<TenantUser>(`/tenant/users/${id}`),

  updateUser: (id: number, data: Partial<CreateUserInput>) =>
    request<TenantUser>(`/tenant/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (id: number) =>
    request<{ message: string }>(`/tenant/users/${id}`, { method: 'DELETE' }),

  getRoles: () => request<{ id: number; name: string; code: string }[]>('/tenant/roles'),

  getDepartments: () =>
    request<{ id: number; name: string; code: string }[]>('/tenant/departments'),

  getDesignations: () =>
    request<{ id: number; name: string; code: string; level: number }[]>('/tenant/designations'),

  getLocations: () =>
    request<{ id: number; name: string; code: string; city?: string; state?: string }[]>('/tenant/locations'),

  // Designation Management
  getDesignationsWithDetails: (params?: { includeInactive?: boolean }) => {
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return request<Designation[]>(`/tenant/designations${query ? `?${query}` : ''}`);
  },

  getDesignationDetail: (id: number) =>
    request<DesignationDetail>(`/tenant/designations/${id}`),

  createDesignation: (data: CreateDesignationInput) =>
    request<Designation>('/tenant/designations', { method: 'POST', body: JSON.stringify(data) }),

  updateDesignation: (id: number, data: UpdateDesignationInput) =>
    request<Designation>(`/tenant/designations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteDesignation: (id: number, force?: boolean) =>
    request<{ message: string }>(`/tenant/designations/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),

  // Location Management
  getLocationsWithDetails: (params?: { includeInactive?: boolean }) => {
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return request<{ locations: Location[]; total: number }>(`/tenant/locations${query ? `?${query}` : ''}`);
  },

  getLocationDetail: (id: number) =>
    request<{ location: LocationDetail }>(`/tenant/locations/${id}`),

  createLocation: (data: CreateLocationInput) =>
    request<{ location: Location }>('/tenant/locations', { method: 'POST', body: JSON.stringify(data) }),

  updateLocation: (id: number, data: UpdateLocationInput) =>
    request<{ location: Location }>(`/tenant/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteLocation: (id: number, force?: boolean) =>
    request<{ message: string }>(`/tenant/locations/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),

  // Role Management
  getRolesWithDetails: (params?: { includeInactive?: boolean }) => {
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return request<{ roles: Role[]; total: number }>(`/tenant/roles/manage${query ? `?${query}` : ''}`);
  },

  getRoleDetail: (id: number) =>
    request<{ role: RoleDetail }>(`/tenant/roles/manage/${id}`),

  createRole: (data: CreateRoleInput) =>
    request<{ role: Role }>('/tenant/roles/manage', { method: 'POST', body: JSON.stringify(data) }),

  updateRole: (id: number, data: UpdateRoleInput) =>
    request<{ role: Role }>(`/tenant/roles/manage/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteRole: (id: number, force?: boolean) =>
    request<{ message: string }>(`/tenant/roles/manage/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),

  updateRolePermissions: (id: number, permissionIds: number[]) =>
    request<{ role: Role }>(`/tenant/roles/manage/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds })
    }),

  // Permission Management
  getPermissions: () =>
    request<{ permissions: Permission[]; permissionsByModule: Record<string, Permission[]>; total: number }>('/tenant/permissions'),

  // Password Reset
  forgotPassword: (email: string, tenant: string) =>
    request<{ message: string }>('/tenant/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, tenant }),
    }),

  verifyResetToken: (token: string, tenant: string) =>
    request<{ email: string; firstName: string }>('/tenant/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token, tenant }),
    }),

  resetPassword: (token: string, password: string, tenant: string) =>
    request<{ message: string }>('/tenant/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, tenant }),
    }),

  // Avatar Upload
  uploadAvatar: async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE}/tenant/profile/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload avatar');
    }
    return data as { success: boolean; message: string; data: { avatar: string; avatarUrl: string } };
  },

  deleteAvatar: () =>
    request<{ message: string }>('/tenant/profile/avatar', { method: 'DELETE' }),

  // Department Management
  getDepartmentsWithHierarchy: (params?: { includeInactive?: boolean; flat?: boolean }) => {
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return request<Department[] | DepartmentFlat[]>(`/tenant/departments${query ? `?${query}` : ''}`);
  },

  getDepartment: (id: number) =>
    request<DepartmentDetail>(`/tenant/departments/${id}`),

  createDepartment: (data: CreateDepartmentInput) =>
    request<Department>('/tenant/departments', { method: 'POST', body: JSON.stringify(data) }),

  updateDepartment: (id: number, data: UpdateDepartmentInput) =>
    request<Department>(`/tenant/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteDepartment: (id: number, force?: boolean) =>
    request<{ message: string }>(`/tenant/departments/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),

  getEmployeesForDepartmentHead: () =>
    request<EmployeeForHead[]>('/tenant/departments/employees'),

  // Bulk Operations
  downloadEmployeeTemplate: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE}/tenant/users/template`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  bulkImportEmployees: async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/tenant/users/bulk-import`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to import employees');
    }
    return data as BulkImportResult;
  },

  exportEmployees: async (params?: { search?: string; roleId?: number; departmentId?: number; isActive?: boolean }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
      ) as Record<string, string>
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/users/export${query ? `?${query}` : ''}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export employees');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  getEmployeesForAttendance: (params?: { search?: string; departmentId?: number }) => {
    const query = params ? new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
      ) as Record<string, string>
    ).toString() : '';
    return request<EmployeeForAttendance[]>(`/tenant/attendance/employees${query ? `?${query}` : ''}`);
  },

  bulkMarkAttendance: (records: BulkAttendanceRecord[]) =>
    request<BulkAttendanceResult>('/tenant/attendance/bulk-mark', {
      method: 'POST',
      body: JSON.stringify({ records }),
    }),

  // Export to Excel/PDF
  exportEmployeesExcel: async (params?: ExportParams) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/export/employees/excel${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) throw new Error('Failed to export employees');
    const blob = await response.blob();
    downloadFile(blob, `employees_${Date.now()}.xlsx`);
  },

  exportEmployeesPDF: async (params?: ExportParams) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/export/employees/pdf${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) throw new Error('Failed to export employees');
    const blob = await response.blob();
    downloadFile(blob, `employees_${Date.now()}.pdf`);
  },

  exportAttendanceExcel: async (params?: AttendanceExportParams) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/export/attendance/excel${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) throw new Error('Failed to export attendance');
    const blob = await response.blob();
    downloadFile(blob, `attendance_${Date.now()}.xlsx`);
  },

  exportAttendancePDF: async (params?: AttendanceExportParams) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/export/attendance/pdf${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) throw new Error('Failed to export attendance');
    const blob = await response.blob();
    downloadFile(blob, `attendance_${Date.now()}.pdf`);
  },

  exportLeaveExcel: async (params?: LeaveExportParams) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/export/leave/excel${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) throw new Error('Failed to export leave report');
    const blob = await response.blob();
    downloadFile(blob, `leave_report_${Date.now()}.xlsx`);
  },

  exportLeavePDF: async (params?: LeaveExportParams) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString() : '';

    const response = await fetch(`${API_BASE}/tenant/export/leave/pdf${query ? `?${query}` : ''}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) throw new Error('Failed to export leave report');
    const blob = await response.blob();
    downloadFile(blob, `leave_report_${Date.now()}.pdf`);
  },
};

// Helper function for file downloads
function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Attendance APIs
export const attendanceApi = {
  clockIn: () => request<Attendance>('/attendance/clock-in', { method: 'POST' }),

  clockOut: () => request<Attendance>('/attendance/clock-out', { method: 'POST' }),

  getMyAttendance: (params?: { month?: number; year?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<Attendance[]>(`/attendance/my-attendance${query ? `?${query}` : ''}`);
  },

  getAttendance: (params?: {
    userId?: number;
    date?: string;
    month?: number;
    year?: number;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ records: Attendance[]; total: number; page: number; limit: number }>(
      `/attendance${query ? `?${query}` : ''}`
    );
  },

  markAttendance: (data: MarkAttendanceInput) =>
    request<Attendance>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),

  updateAttendance: (id: number, data: Partial<MarkAttendanceInput>) =>
    request<Attendance>(`/attendance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getAttendanceSummary: (params?: { userId?: number; month?: number; year?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<AttendanceSummary>(`/attendance/summary${query ? `?${query}` : ''}`);
  },
};

// Leave APIs
export const leaveApi = {
  // Leave Types
  getLeaveTypes: () => request<LeaveType[]>('/leave/types'),

  createLeaveType: (data: CreateLeaveTypeInput) =>
    request<LeaveType>('/leave/types', { method: 'POST', body: JSON.stringify(data) }),

  updateLeaveType: (id: number, data: Partial<CreateLeaveTypeInput>) =>
    request<LeaveType>(`/leave/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteLeaveType: (id: number) =>
    request<{ message: string }>(`/leave/types/${id}`, { method: 'DELETE' }),

  // Leave Balances
  getMyLeaveBalance: (params?: { year?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<LeaveBalance[]>(`/leave/my-balance${query ? `?${query}` : ''}`);
  },

  getLeaveBalances: (params?: { userId?: number; year?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ balances: LeaveBalance[]; total: number; page: number; limit: number }>(
      `/leave/balances${query ? `?${query}` : ''}`
    );
  },

  allocateLeaveBalance: (data: AllocateLeaveBalanceInput) =>
    request<LeaveBalance>('/leave/balances/allocate', { method: 'POST', body: JSON.stringify(data) }),

  // Leave Requests
  applyLeave: (data: ApplyLeaveInput) =>
    request<LeaveRequest>('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),

  getMyLeaveRequests: (params?: { status?: string; year?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ requests: LeaveRequest[]; total: number; page: number; limit: number }>(
      `/leave/my-requests${query ? `?${query}` : ''}`
    );
  },

  getLeaveRequests: (params?: {
    userId?: number;
    status?: string;
    year?: number;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ requests: LeaveRequest[]; total: number; page: number; limit: number }>(
      `/leave/requests${query ? `?${query}` : ''}`
    );
  },

  getLeaveRequest: (id: number) => request<LeaveRequest>(`/leave/requests/${id}`),

  reviewLeaveRequest: (id: number, data: { status: 'APPROVED' | 'REJECTED'; reviewComments?: string }) =>
    request<LeaveRequest>(`/leave/requests/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }),

  cancelLeaveRequest: (id: number) =>
    request<{ message: string }>(`/leave/requests/${id}/cancel`, { method: 'PATCH' }),
};

// Types
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
  enabledModules: string[];
  createdAt: string;
  _count?: { users: number };
  adminUsers?: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    createdAt?: string;
  }>;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName?: string;
  enabledModules?: string[];
}

export interface TenantUser {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  employeeCode?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  role: { id: number; name: string; code: string };
  department?: { id: number; name: string };
  designation?: { id: number; name: string };
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  employeeCode?: string;
  roleId: number;
  departmentId?: number;
  designationId?: number;
  locationId?: number;
  reportingTo?: number;
  dateOfJoining?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

// Attendance Types
export interface Attendance {
  id: number;
  tenantId: number;
  userId: number;
  date: string;
  clockIn?: string;
  clockOut?: string;
  totalHours?: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND';
  remarks?: string;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    employeeCode?: string;
    department?: { name: string };
  };
}

export interface MarkAttendanceInput {
  userId: number;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND';
  clockIn?: string;
  clockOut?: string;
  remarks?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  onLeave: number;
  totalHours: string;
}

// Leave Types
export interface LeaveType {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  isPaid: boolean;
  maxDaysPerYear?: number;
  carryForward: boolean;
  requiresDocument: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveTypeInput {
  name: string;
  code: string;
  isPaid?: boolean;
  maxDaysPerYear?: number;
  carryForward?: boolean;
  requiresDocument?: boolean;
  isActive?: boolean;
}

export interface LeaveBalance {
  id: number;
  tenantId: number;
  userId: number;
  leaveTypeId: number;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    department?: { name: string };
  };
  leaveType?: {
    id: number;
    name: string;
    code: string;
    isPaid?: boolean;
  };
}

export interface AllocateLeaveBalanceInput {
  userId: number;
  leaveTypeId: number;
  year: number;
  totalDays: number;
}

export interface LeaveRequest {
  id: number;
  tenantId: number;
  userId: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  documentUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appliedTo?: number;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    employeeCode?: string;
    department?: { name: string };
  };
  leaveType?: {
    name: string;
    code: string;
    isPaid?: boolean;
  };
  appliedToUser?: {
    firstName: string;
    lastName?: string;
    email?: string;
  };
  reviewer?: {
    firstName: string;
    lastName?: string;
    email?: string;
  };
}

export interface ApplyLeaveInput {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  documentUrl?: string;
  appliedTo?: number;
}

// Audit Types
export interface AuditLog {
  id: number;
  tenantId?: number;
  userId?: number;
  userEmail?: string;
  userType: string;
  action: string;
  entity: string;
  entityId?: number;
  entityName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changes?: Record<string, { from: unknown; to: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalLogs: number;
  todayCount: number;
  uniqueUsers: number;
  byAction: { action: string; count: number }[];
  byEntity: { entity: string; count: number }[];
  recentActivity: { action: string; count: number }[];
}

// Audit APIs
export const auditApi = {
  // Get audit logs with filters
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    entity?: string;
    entityId?: number;
    action?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')
      ) as Record<string, string>
    ).toString();
    return request<AuditLogListResponse>(`/tenant/audit${query ? `?${query}` : ''}`);
  },

  // Get single audit log detail
  getAuditLogDetail: (id: number) => request<AuditLog>(`/tenant/audit/${id}`),

  // Get audit logs for a specific entity
  getEntityAuditLogs: (entity: string, entityId: number, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<AuditLogListResponse>(`/tenant/audit/entity/${entity}/${entityId}${query ? `?${query}` : ''}`);
  },

  // Get available entity types
  getEntityTypes: () => request<string[]>('/tenant/audit/entity-types'),

  // Get available actions
  getActions: () => request<string[]>('/tenant/audit/actions'),

  // Get audit statistics
  getAuditStats: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<AuditStats>(`/tenant/audit/stats${query ? `?${query}` : ''}`);
  },

  // Get user activity
  getUserActivity: (userId: number, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<AuditLogListResponse>(`/tenant/audit/user/${userId}${query ? `?${query}` : ''}`);
  },
};

// Bulk Operations Types
export interface BulkImportResult {
  success: boolean;
  message: string;
  data: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
    created: Array<Record<string, unknown> & { id: number }>;
    updated?: Array<Record<string, unknown> & { id: number }>;
  };
}

export interface EmployeeForAttendance {
  id: number;
  name: string;
  employeeCode?: string;
  department?: string;
}

export interface BulkAttendanceRecord {
  employee_code: string;
  date: string;
  status: string;
  clock_in?: string;
  clock_out?: string;
  remarks?: string;
}

export interface BulkAttendanceResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  created: { id: number; userId: number; date: string }[];
  updated: { id: number; userId: number; date: string }[];
}

// Export Parameter Types
export interface ExportParams {
  search?: string;
  roleId?: string;
  departmentId?: string;
  isActive?: string;
}

export interface AttendanceExportParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  departmentId?: string;
  status?: string;
}

export interface LeaveExportParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  departmentId?: string;
  status?: string;
  leaveTypeId?: string;
}

// Department Types
export interface Department {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  headId: number | null;
  isActive: boolean;
  employeeCount: number;
  childCount: number;
  children: Department[];
}

export interface DepartmentFlat {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  parentName: string | null;
  headId: number | null;
  isActive: boolean;
  employeeCount: number;
  childCount: number;
}

export interface DepartmentDetail {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  headId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent: { id: number; name: string; code: string } | null;
  head: EmployeeForHead | null;
  children: { id: number; name: string; code: string }[];
  users: EmployeeForHead[];
  employeeCount: number;
  childCount: number;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  parentId?: number | null;
  headId?: number | null;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  parentId?: number | null;
  headId?: number | null;
  isActive?: boolean;
}

export interface EmployeeForHead {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  employeeCode?: string;
  avatar?: string;
  designation?: { id: number; name: string };
  department?: { id: number; name: string };
}

// Designation Types
export interface Designation {
  id: number;
  name: string;
  code: string;
  level: number;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignationDetail extends Designation {
  users: EmployeeForHead[];
}

export interface CreateDesignationInput {
  name: string;
  code: string;
  level?: number;
}

export interface UpdateDesignationInput {
  name?: string;
  code?: string;
  level?: number;
  isActive?: boolean;
}

// Location Types
export interface Location {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationDetail extends Location {
  employees: EmployeeForHead[];
}

export interface CreateLocationInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isActive?: boolean;
}

// Role Types
export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetail extends Role {
  permissions: Permission[];
  permissionsByModule: Record<string, Permission[]>;
  users: EmployeeForHead[];
}

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleInput {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

// Permission Types
export interface Permission {
  id: number;
  module: string;
  action: string;
  description?: string;
}

// ==================== PAYROLL TYPES ====================

export type SalaryComponentType = 'EARNING' | 'DEDUCTION' | 'REIMBURSEMENT';
export type CalculationType = 'FIXED' | 'PERCENTAGE';
export type PayslipStatus = 'DRAFT' | 'PROCESSED' | 'PAID' | 'CANCELLED';
export type TaxRegime = 'OLD' | 'NEW';
export type DeclarationStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface SalaryComponent {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  type: SalaryComponentType;
  calculationType: CalculationType;
  defaultValue?: number;
  isTaxable: boolean;
  isStatutory: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    structureComponents: number;
    payslipComponents: number;
  };
}

export interface CreateSalaryComponentInput {
  name: string;
  code: string;
  type: SalaryComponentType;
  calculationType?: CalculationType;
  defaultValue?: number;
  isTaxable?: boolean;
  isStatutory?: boolean;
  isActive?: boolean;
  order?: number;
}

export interface SalaryStructureComponent {
  id: number;
  salaryStructureId: number;
  salaryComponentId: number;
  calculationType: CalculationType;
  amount?: number;
  percentage?: number;
  calculatedAmount: number;
  salaryComponent: SalaryComponent;
}

export interface SalaryStructure {
  id: number;
  tenantId: number;
  userId: number;
  ctc: number;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    email: string;
    department?: { name: string };
    designation?: { name: string };
  };
  components: SalaryStructureComponent[];
  groupedComponents?: {
    earnings: SalaryStructureComponent[];
    deductions: SalaryStructureComponent[];
    reimbursements: SalaryStructureComponent[];
  };
}

export interface CreateSalaryStructureInput {
  userId: number;
  ctc: number;
  basicSalary: number;
  effectiveFrom: string;
  remarks?: string;
  components: {
    salaryComponentId: number;
    calculationType: CalculationType;
    amount?: number;
    percentage?: number;
  }[];
}

export interface PayslipComponent {
  id: number;
  payslipId: number;
  salaryComponentId: number;
  componentName: string;
  componentType: SalaryComponentType;
  amount: number;
  salaryComponent?: SalaryComponent;
}

export interface Payslip {
  id: number;
  tenantId: number;
  userId: number;
  month: number;
  year: number;
  basicSalary: number;
  grossEarnings: number;
  totalDeductions: number;
  netSalary: number;
  totalWorkingDays: number;
  daysWorked: number;
  leaveDays: number;
  lopDays: number;
  status: PayslipStatus;
  generatedAt?: string;
  processedAt?: string;
  paidAt?: string;
  paidBy?: number;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    email: string;
    phone?: string;
    dateOfJoining?: string;
    department?: { name: string };
    designation?: { name: string };
    location?: { name: string };
  };
  components: PayslipComponent[];
  groupedComponents?: {
    earnings: PayslipComponent[];
    deductions: PayslipComponent[];
    reimbursements: PayslipComponent[];
  };
}

export interface TaxSlab {
  id: number;
  tenantId: number;
  regime: TaxRegime;
  financialYear: string;
  fromAmount: number;
  toAmount?: number;
  percentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxDeclaration {
  id: number;
  tenantId: number;
  userId: number;
  financialYear: string;
  regime: TaxRegime;
  section80C: number;
  section80D: number;
  section80E: number;
  section80G: number;
  hra: number;
  rentPaid: number;
  homeLoanInterest: number;
  homeLoanPrincipal: number;
  nps: number;
  otherDeductions: number;
  totalDeductions: number;
  taxableIncome: number;
  estimatedTax: number;
  status: DeclarationStatus;
  submittedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    email: string;
    department?: { name: string };
    designation?: { name: string };
  };
}

export interface PayrollSummary {
  totalPayslips: number;
  totalGrossEarnings: number;
  totalDeductions: number;
  totalNetSalary: number;
  statusBreakdown: Record<string, number>;
}

export interface TaxCalculationResult {
  annualIncome: number;
  regime: TaxRegime;
  totalDeductions: number;
  taxableIncome: number;
  baseTax: number;
  cess: number;
  totalTax: number;
  monthlyTax: number;
  effectiveRate: string;
  slabwiseTax: {
    slab: string;
    rate: string;
    income: number;
    tax: number;
  }[];
}

// ==================== PAYROLL APIs ====================

export const payrollApi = {
  // Salary Components
  getSalaryComponents: (params?: {
    type?: SalaryComponentType;
    isActive?: boolean;
    isTaxable?: boolean;
    isStatutory?: boolean;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<{
      components: SalaryComponent[];
      grouped: {
        earnings: SalaryComponent[];
        deductions: SalaryComponent[];
        reimbursements: SalaryComponent[];
      };
      total: number;
    }>(`/tenant/salary-components${query ? `?${query}` : ''}`);
  },

  getSalaryComponent: (id: number) =>
    request<SalaryComponent>(`/tenant/salary-components/${id}`),

  createSalaryComponent: (data: CreateSalaryComponentInput) =>
    request<SalaryComponent>('/tenant/salary-components', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSalaryComponent: (id: number, data: Partial<CreateSalaryComponentInput>) =>
    request<SalaryComponent>(`/tenant/salary-components/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSalaryComponent: (id: number) =>
    request<{ message: string }>(`/tenant/salary-components/${id}`, { method: 'DELETE' }),

  initializeDefaultComponents: () =>
    request<{ count: number }>('/tenant/salary-components/initialize', { method: 'POST' }),

  updateComponentOrder: (components: { id: number; order: number }[]) =>
    request<{ message: string }>('/tenant/salary-components/order', {
      method: 'PUT',
      body: JSON.stringify({ components }),
    }),

  // Salary Structures
  getSalaryStructures: (params?: {
    userId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<{
      data: SalaryStructure[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/tenant/salary-structures${query ? `?${query}` : ''}`);
  },

  getSalaryStructure: (id: number) =>
    request<SalaryStructure>(`/tenant/salary-structures/${id}`),

  getEmployeeSalaryStructure: (userId: number) =>
    request<SalaryStructure>(`/tenant/employees/${userId}/salary`),

  getEmployeeSalaryHistory: (userId: number) =>
    request<SalaryStructure[]>(`/tenant/employees/${userId}/salary-history`),

  createSalaryStructure: (data: CreateSalaryStructureInput) =>
    request<SalaryStructure>('/tenant/salary-structures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSalaryStructure: (id: number, data: Partial<CreateSalaryStructureInput>) =>
    request<SalaryStructure>(`/tenant/salary-structures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSalaryStructure: (id: number) =>
    request<{ message: string }>(`/tenant/salary-structures/${id}`, { method: 'DELETE' }),

  calculateSalaryPreview: (data: {
    basicSalary: number;
    components: {
      salaryComponentId: number;
      calculationType: CalculationType;
      amount?: number;
      percentage?: number;
    }[];
  }) =>
    request<{
      basicSalary: number;
      grossEarnings: number;
      totalDeductions: number;
      totalReimbursements: number;
      grossSalary: number;
      netSalary: number;
      annualCTC: number;
      components: {
        salaryComponentId: number;
        componentName: string;
        componentCode: string;
        componentType: SalaryComponentType;
        calculationType: CalculationType;
        amount?: number;
        percentage?: number;
        calculatedAmount: number;
      }[];
    }>('/tenant/salary-structures/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Payslips
  getPayslips: (params?: {
    userId?: number;
    month?: number;
    year?: number;
    status?: PayslipStatus;
    page?: number;
    limit?: number;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<{
      data: Payslip[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/tenant/payslips${query ? `?${query}` : ''}`);
  },

  getPayslip: (id: number) => request<Payslip>(`/tenant/payslips/${id}`),

  getEmployeePayslip: (userId: number, month: number, year: number) =>
    request<Payslip>(`/tenant/employees/${userId}/payslips/${month}/${year}`),

  generatePayslip: (data: { userId: number; month: number; year: number }) =>
    request<Payslip>('/tenant/payslips/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkGeneratePayslips: (data: { month: number; year: number; userIds?: number[] }) =>
    request<{
      success: { userId: number; payslipId: number; name: string }[];
      skipped: { userId: number; name: string; reason: string }[];
      failed: { userId: number; name: string; error: string }[];
    }>('/tenant/payslips/bulk-generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePayslipStatus: (id: number, status: PayslipStatus) =>
    request<Payslip>(`/tenant/payslips/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  bulkUpdatePayslipStatus: (payslipIds: number[], status: PayslipStatus) =>
    request<{ updatedCount: number }>('/tenant/payslips/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ payslipIds, status }),
    }),

  deletePayslip: (id: number) =>
    request<{ message: string }>(`/tenant/payslips/${id}`, { method: 'DELETE' }),

  getPayrollSummary: (month: number, year: number) =>
    request<PayrollSummary>(`/tenant/payslips/summary?month=${month}&year=${year}`),

  // Tax Management
  getTaxSlabs: (params?: {
    regime?: TaxRegime;
    financialYear?: string;
    isActive?: boolean;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<{
      slabs: TaxSlab[];
      grouped: { OLD: TaxSlab[]; NEW: TaxSlab[] };
    }>(`/tenant/tax/slabs${query ? `?${query}` : ''}`);
  },

  createTaxSlab: (data: {
    regime: TaxRegime;
    financialYear: string;
    fromAmount: number;
    toAmount?: number;
    percentage: number;
  }) =>
    request<TaxSlab>('/tenant/tax/slabs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTaxSlab: (id: number, data: Partial<TaxSlab>) =>
    request<TaxSlab>(`/tenant/tax/slabs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTaxSlab: (id: number) =>
    request<{ message: string }>(`/tenant/tax/slabs/${id}`, { method: 'DELETE' }),

  initializeDefaultTaxSlabs: (financialYear?: string) =>
    request<{ count: number }>('/tenant/tax/slabs/initialize', {
      method: 'POST',
      body: JSON.stringify({ financialYear }),
    }),

  calculateTax: (data: {
    annualIncome: number;
    regime?: TaxRegime;
    section80C?: number;
    section80D?: number;
    section80E?: number;
    section80G?: number;
    hra?: number;
    homeLoanInterest?: number;
    nps?: number;
    otherDeductions?: number;
    financialYear?: string;
  }) =>
    request<TaxCalculationResult>('/tenant/tax/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tax Declarations
  getTaxDeclarations: (params?: {
    userId?: number;
    financialYear?: string;
    status?: DeclarationStatus;
    page?: number;
    limit?: number;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<{
      data: TaxDeclaration[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/tenant/tax/declarations${query ? `?${query}` : ''}`);
  },

  getTaxDeclaration: (id: number) =>
    request<TaxDeclaration>(`/tenant/tax/declarations/${id}`),

  getEmployeeTaxDeclaration: (userId: number, financialYear: string) =>
    request<TaxDeclaration>(`/tenant/employees/${userId}/tax-declaration/${financialYear}`),

  saveTaxDeclaration: (data: Partial<TaxDeclaration> & { userId: number; financialYear: string }) =>
    request<TaxDeclaration>('/tenant/tax/declarations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitTaxDeclaration: (id: number) =>
    request<TaxDeclaration>(`/tenant/tax/declarations/${id}/submit`, { method: 'POST' }),

  reviewTaxDeclaration: (id: number, action: 'approve' | 'reject', comments?: string) =>
    request<TaxDeclaration>(`/tenant/tax/declarations/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comments }),
    }),
};

// ==================== REPORTS APIs ====================

export interface ReportOverview {
  currentMonth: string;
  quickStats: {
    totalEmployees: number;
    activeEmployees: number;
    thisMonthAttendance: number;
    thisMonthLeaves: number;
    thisMonthPayslips: number;
  };
  availableReports: {
    id: string;
    name: string;
    description: string;
    icon: string;
  }[];
}

export interface HeadcountReportData {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    maleCount: number;
    femaleCount: number;
    otherGenderCount: number;
  };
  groupBy: string;
  breakdown: {
    id: number | null;
    name: string;
    code: string;
    count: number;
    activeCount: number;
    level?: number;
    city?: string;
    state?: string;
  }[];
}

export interface AttendanceReportData {
  reportType: string;
  dateRange: { start: string; end: string };
  summary?: {
    totalEmployees: number;
    workingDays: number;
    avgAttendanceRate: number;
    totalPresentInstances: number;
    totalAbsentInstances: number;
    totalLateArrivals: number;
    totalEarlyDepartures: number;
  };
  totalEmployees?: number;
  employees?: {
    employee: {
      id: number;
      name: string;
      employeeCode?: string;
      department: string;
      designation: string;
    };
    workingDays: number;
    presentDays: number;
    halfDays: number;
    absentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    attendancePercentage: number;
    totalHoursWorked: number;
    totalMinutesWorked: number;
    avgHoursPerDay: number | string;
  }[];
  dailyData?: {
    date: string;
    dayOfWeek: string;
    isWeekend: boolean;
    totalEmployees: number;
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    lateArrivals: number;
    attendanceRate: number;
  }[];
  monthlyData?: {
    month: string;
    monthName: string;
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    lateArrivals: number;
    totalRecords: number;
  }[];
}

export interface LeaveReportData {
  dateRange: { start: string; end: string };
  groupBy: string;
  summary: {
    totalRequests: number;
    totalDays: number;
    approved: number;
    pending: number;
    rejected: number;
    cancelled: number;
    approvedDays: number;
  };
  leaveTypes: { id: number; name: string; code: string }[];
  breakdown: {
    employee?: {
      id: number;
      name: string;
      employeeCode?: string;
      department: string;
    };
    leaveType?: { id: number; name: string; code: string };
    department?: { id: number | string; name: string };
    month?: string;
    monthName?: string;
    totalRequests: number;
    totalDays: number;
    approved: number;
    pending: number;
    rejected: number;
    employeeCount?: number;
    byType?: Record<string, number>;
  }[];
}

export interface PayrollReportData {
  reportType: string;
  summary: {
    month: number;
    year: number;
    monthName: string;
    totalPayslips: number;
    processedCount: number;
    paidCount: number;
    draftCount: number;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetSalary: number;
    averageSalary: number;
  };
  departmentBreakdown?: {
    department: { id: number | string; name: string };
    employeeCount: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
  }[];
  payslips?: {
    id: number;
    employee: {
      id: number;
      name: string;
      employeeCode?: string;
      department: string;
      designation: string;
    };
    basicSalary: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    status: string;
  }[];
  salaryDistribution?: {
    min: number;
    max: number;
    label: string;
    count: number;
    totalAmount: number;
  }[];
  componentBreakdown?: {
    name: string;
    type: string;
    totalAmount: number;
    count: number;
  }[];
  taxBreakdown?: {
    name: string;
    totalAmount: number;
    employeeCount: number;
  }[];
  totalTaxDeductions?: number;
}

export interface TurnoverReportData {
  dateRange: { start: string; end: string };
  summary: {
    currentHeadcount: number;
    startHeadcount: number;
    totalJoins: number;
    totalExits: number;
    netChange: number;
    turnoverRate: string;
    retentionRate: string;
    avgTenureYears: number;
  };
  monthlyTrend: {
    month: string;
    monthName: string;
    joins: number;
    exits: number;
    netChange: number;
    headcount: number;
  }[];
  departmentBreakdown: {
    department: { id: number | string; name: string };
    totalEmployees: number;
    activeEmployees: number;
    joins: number;
    exits: number;
  }[];
  tenureDistribution: {
    min: number;
    max: number;
    label: string;
    count: number;
  }[];
  recentJoins: {
    id: number;
    name: string;
    department: string;
    joiningDate: string;
  }[];
  recentExits: {
    id: number;
    name: string;
    department: string;
    exitDate: string;
  }[];
}

export const reportsApi = {
  getOverview: () => request<ReportOverview>('/tenant/reports'),

  getHeadcountReport: (params?: {
    groupBy?: 'department' | 'designation' | 'location' | 'role' | 'gender';
    includeInactive?: boolean;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<HeadcountReportData>(`/tenant/reports/headcount${query ? `?${query}` : ''}`);
  },

  getAttendanceReport: (params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: number;
    locationId?: number;
    userId?: number;
    reportType?: 'summary' | 'daily' | 'monthly';
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<AttendanceReportData>(`/tenant/reports/attendance${query ? `?${query}` : ''}`);
  },

  getLeaveReport: (params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: number;
    leaveTypeId?: number;
    userId?: number;
    status?: string;
    groupBy?: 'employee' | 'leaveType' | 'department' | 'month';
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<LeaveReportData>(`/tenant/reports/leave${query ? `?${query}` : ''}`);
  },

  getPayrollReport: (params?: {
    month?: number;
    year?: number;
    departmentId?: number;
    reportType?: 'summary' | 'distribution' | 'taxSummary';
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<PayrollReportData>(`/tenant/reports/payroll${query ? `?${query}` : ''}`);
  },

  getTurnoverReport: (params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: number;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<TurnoverReportData>(`/tenant/reports/turnover${query ? `?${query}` : ''}`);
  },
};

// ==================== NOTIFICATION TYPES ====================

export type NotificationType =
  | 'LEAVE_REQUESTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_REGULARIZATION'
  | 'PAYSLIP_GENERATED'
  | 'SALARY_REVISED'
  | 'EMPLOYEE_JOINED'
  | 'EMPLOYEE_EXIT'
  | 'PASSWORD_CHANGED'
  | 'PROFILE_UPDATED'
  | 'BIRTHDAY_REMINDER'
  | 'ANNIVERSARY_REMINDER'
  | 'ANNOUNCEMENT'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: number;
  tenantId: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== NOTIFICATION APIs ====================

export const notificationsApi = {
  // List notifications for current user
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: NotificationType;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<NotificationListResponse>(
      `/tenant/notifications${query ? `?${query}` : ''}`
    );
  },

  // Get unread notification count
  getUnreadCount: () =>
    request<{ unreadCount: number }>('/tenant/notifications/unread-count'),

  // Mark a notification as read
  markAsRead: (id: number) =>
    request<Notification>(`/tenant/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  // Mark all notifications as read
  markAllAsRead: () =>
    request<{ updatedCount: number }>('/tenant/notifications/mark-all-read', {
      method: 'POST',
    }),

  // Delete a notification
  deleteNotification: (id: number) =>
    request<{ message: string }>(`/tenant/notifications/${id}`, {
      method: 'DELETE',
    }),

  // Delete all read notifications
  deleteReadNotifications: () =>
    request<{ deletedCount: number }>('/tenant/notifications/read', {
      method: 'DELETE',
    }),

  // Create an announcement (admin only)
  createAnnouncement: (data: {
    title: string;
    message: string;
    link?: string;
    targetRoles?: string[];
  }) =>
    request<{ sentTo: number }>('/tenant/notifications/announcement', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== ANALYTICS API ====================

export interface QuickStats {
  totalEmployees: number;
  todayPresent: number;
  pendingLeaveRequests: number;
  averageTenureYears: number;
  attendanceRate: number;
  turnoverRate: number;
}

export interface GenderDistribution {
  male: number;
  female: number;
  other: number;
  notSpecified: number;
}

export interface DepartmentDistribution {
  name: string;
  count: number;
}

export interface TenureDistribution {
  lessThan1Year: number;
  oneToThreeYears: number;
  threeToFiveYears: number;
  fiveToTenYears: number;
  moreThanTenYears: number;
}

export interface TrendItem {
  month: string;
  count?: number;
  rate?: number;
  present?: number;
  expected?: number;
  days?: number;
  requests?: number;
  joins?: number;
  exits?: number;
  netChange?: number;
}

export interface LeaveUtilization {
  name: string;
  code: string;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  utilizationRate: number;
}

export interface ComparisonMetric {
  current: number;
  lastMonth?: number;
  lastYear?: number;
  currentYear?: number;
  change: number;
  changePercent?: number;
}

export interface DashboardAnalytics {
  quickStats: QuickStats;
  genderDistribution: GenderDistribution;
  departmentDistribution: DepartmentDistribution[];
  tenureDistribution: TenureDistribution;
  employeeTrend: TrendItem[];
  attendanceTrend: TrendItem[];
  leaveUtilization: LeaveUtilization[];
  leaveTrend: TrendItem[];
  turnoverTrend: TrendItem[];
  comparison: {
    employees: ComparisonMetric;
    attendance: ComparisonMetric;
    turnover: ComparisonMetric;
  };
}

export interface EmployeeGrowthData {
  targetYear: number;
  previousYear: number;
  monthlyData: Array<{
    month: string;
    currentYear: number;
    previousYear: number;
    growth: number;
  }>;
}

export interface AttendanceAnalytics {
  statusBreakdown: {
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    holiday: number;
    weekOff: number;
  };
  departmentAttendance: Array<{
    name: string;
    present: number;
    absent: number;
    total: number;
    rate: number;
  }>;
  dailyTrend: Array<{
    date: string;
    present: number;
    absent: number;
    total: number;
  }>;
  month: string;
}

export const analyticsApi = {
  // Get comprehensive dashboard analytics
  getDashboardAnalytics: () =>
    request<DashboardAnalytics>('/tenant/analytics'),

  // Get employee growth with YoY comparison
  getEmployeeGrowth: (year?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    const query = params.toString();
    return request<EmployeeGrowthData>(`/tenant/analytics/employee-growth${query ? `?${query}` : ''}`);
  },

  // Get detailed attendance analytics
  getAttendanceAnalytics: () =>
    request<AttendanceAnalytics>('/tenant/analytics/attendance'),
};

// ==================== EMAIL PREFERENCES API ====================

export interface EmailPreference {
  id: number;
  tenantId: number;
  userId: number;
  leaveRequested: boolean;
  leaveApproved: boolean;
  leaveRejected: boolean;
  payslipGenerated: boolean;
  salaryRevised: boolean;
  birthdayReminder: boolean;
  anniversaryReminder: boolean;
  announcements: boolean;
  systemAlerts: boolean;
  digestEnabled: boolean;
  digestTime: string;
  createdAt: string;
  updatedAt: string;
}

export const emailPreferencesApi = {
  // Get current user's email preferences
  getPreferences: () =>
    request<EmailPreference>('/tenant/email-preferences'),

  // Update email preferences
  updatePreferences: (data: Partial<EmailPreference>) =>
    request<EmailPreference>('/tenant/email-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Toggle all email notifications on/off
  toggleAll: (enabled: boolean) =>
    request<EmailPreference>('/tenant/email-preferences/toggle-all', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  // Test email configuration (admin only)
  testConfiguration: () =>
    request<{ message: string }>('/tenant/email-preferences/test'),
};

// ==================== CELEBRATIONS API ====================

export interface CelebrationPerson {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  avatar: string | null;
  department: { name: string } | null;
  designation: { name: string } | null;
  daysUntil: number;
  isToday: boolean;
}

export interface BirthdayPerson extends CelebrationPerson {
  dateOfBirth: string;
  birthdayDate: string;
}

export interface AnniversaryPerson extends CelebrationPerson {
  dateOfJoining: string;
  anniversaryDate: string;
  years: number;
}

export interface CelebrationWithType extends CelebrationPerson {
  type: 'birthday' | 'anniversary';
  years?: number;
}

export interface BirthdaysResponse {
  today: BirthdayPerson[];
  upcoming: BirthdayPerson[];
  total: number;
}

export interface AnniversariesResponse {
  today: AnniversaryPerson[];
  upcoming: AnniversaryPerson[];
  total: number;
}

export interface CelebrationsResponse {
  today: {
    birthdays: BirthdayPerson[];
    anniversaries: AnniversaryPerson[];
    total: number;
  };
  upcoming: CelebrationWithType[];
  summary: {
    totalBirthdays: number;
    totalAnniversaries: number;
    total: number;
  };
}

export const celebrationsApi = {
  // Get all celebrations (birthdays + anniversaries)
  getCelebrations: (days: number = 7) =>
    request<CelebrationsResponse>(`/tenant/celebrations?days=${days}`),

  // Get upcoming birthdays
  getBirthdays: (days: number = 7) =>
    request<BirthdaysResponse>(`/tenant/celebrations/birthdays?days=${days}`),

  // Get upcoming anniversaries
  getAnniversaries: (days: number = 7) =>
    request<AnniversariesResponse>(`/tenant/celebrations/anniversaries?days=${days}`),

  // Trigger celebration check (admin only)
  triggerCheck: () =>
    request<{ message: string }>('/tenant/celebrations/trigger-check', {
      method: 'POST',
    }),
};

// ==================== GOALS API ====================

export type GoalType = 'INDIVIDUAL' | 'TEAM' | 'COMPANY';
export type GoalCategory = 'OKR' | 'KPI';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface KeyResult {
  id: number;
  goalId: number;
  title: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  weight: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: number;
  tenantId: number;
  userId: number;
  title: string;
  description: string | null;
  type: GoalType;
  category: GoalCategory;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  startDate: string;
  dueDate: string;
  status: GoalStatus;
  progress: number;
  weight: number;
  parentId: number | null;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; firstName: string; lastName: string; avatar?: string };
  department?: { id: number; name: string };
  parent?: { id: number; title: string; progress?: number };
  children?: { id: number; title: string; progress: number; status: GoalStatus; dueDate?: string }[];
  keyResults?: KeyResult[];
}

export interface GoalListParams {
  page?: number;
  limit?: number;
  type?: GoalType;
  category?: GoalCategory;
  status?: GoalStatus;
  userId?: number;
  departmentId?: number;
  parentId?: number | 'null';
  includeKeyResults?: boolean;
  myGoals?: boolean;
}

export interface GoalCreateInput {
  title: string;
  description?: string;
  type?: GoalType;
  category?: GoalCategory;
  targetValue?: number;
  unit?: string;
  startDate: string;
  dueDate: string;
  weight?: number;
  parentId?: number;
  departmentId?: number;
  assignedUserId?: number;
  keyResults?: Array<{
    title: string;
    description?: string;
    targetValue: number;
    unit?: string;
    weight?: number;
  }>;
}

export interface GoalUpdateInput {
  title?: string;
  description?: string;
  type?: GoalType;
  category?: GoalCategory;
  targetValue?: number;
  unit?: string;
  startDate?: string;
  dueDate?: string;
  status?: GoalStatus;
  weight?: number;
  parentId?: number | null;
  departmentId?: number | null;
}

export interface KeyResultInput {
  title: string;
  description?: string;
  targetValue: number;
  unit?: string;
  weight?: number;
}

export interface KeyResultUpdateInput {
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
  status?: GoalStatus;
}

export interface GoalStats {
  total: number;
  avgProgress: number;
  overdue: number;
  byStatus: Record<GoalStatus, number>;
  byType: Record<GoalType, number>;
  byCategory: Record<GoalCategory, number>;
}

export interface GoalListResponse {
  data: Goal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const goalsApi = {
  // List goals with filters and pagination
  list: (params: GoalListParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.type) searchParams.append('type', params.type);
    if (params.category) searchParams.append('category', params.category);
    if (params.status) searchParams.append('status', params.status);
    if (params.userId) searchParams.append('userId', params.userId.toString());
    if (params.departmentId) searchParams.append('departmentId', params.departmentId.toString());
    if (params.parentId !== undefined) searchParams.append('parentId', params.parentId.toString());
    if (params.includeKeyResults !== undefined) searchParams.append('includeKeyResults', params.includeKeyResults.toString());
    if (params.myGoals) searchParams.append('myGoals', params.myGoals.toString());
    const qs = searchParams.toString();
    return request<GoalListResponse>(`/tenant/goals${qs ? `?${qs}` : ''}`);
  },

  // Get single goal
  get: (id: number) => request<Goal>(`/tenant/goals/${id}`),

  // Create goal
  create: (data: GoalCreateInput) =>
    request<Goal>('/tenant/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update goal
  update: (id: number, data: GoalUpdateInput) =>
    request<Goal>(`/tenant/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Update goal progress
  updateProgress: (id: number, currentValue: number, note?: string) =>
    request<Goal>(`/tenant/goals/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ currentValue, note }),
    }),

  // Delete goal
  delete: (id: number) =>
    request<{ message: string }>(`/tenant/goals/${id}`, { method: 'DELETE' }),

  // Get goal stats
  getStats: (params?: { userId?: number; departmentId?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId.toString());
    if (params?.departmentId) searchParams.append('departmentId', params.departmentId.toString());
    const qs = searchParams.toString();
    return request<GoalStats>(`/tenant/goals/stats${qs ? `?${qs}` : ''}`);
  },

  // Get goal hierarchy
  getHierarchy: (rootId?: number) => {
    const qs = rootId ? `?rootId=${rootId}` : '';
    return request<Goal[]>(`/tenant/goals/hierarchy${qs}`);
  },

  // Key Results
  addKeyResult: (goalId: number, data: KeyResultInput) =>
    request<KeyResult>(`/tenant/goals/${goalId}/key-results`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateKeyResult: (goalId: number, krId: number, data: KeyResultUpdateInput) =>
    request<KeyResult>(`/tenant/goals/${goalId}/key-results/${krId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteKeyResult: (goalId: number, krId: number) =>
    request<{ message: string }>(`/tenant/goals/${goalId}/key-results/${krId}`, {
      method: 'DELETE',
    }),
};

// ==================== PERFORMANCE REVIEWS API ====================

export type ReviewCycleStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ReviewStatus = 'PENDING' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'CALIBRATION' | 'COMPLETED';
export type QuestionCategory = 'COMPETENCY' | 'BEHAVIOR' | 'GOALS' | 'CULTURE' | 'LEADERSHIP';
export type QuestionType = 'RATING' | 'TEXT' | 'MULTIPLE_CHOICE' | 'YES_NO';
export type RespondentType = 'SELF' | 'MANAGER' | 'PEER' | 'SKIP_LEVEL';

export interface ReviewQuestion {
  id: number;
  tenantId: number;
  question: string;
  description: string | null;
  category: QuestionCategory;
  type: QuestionType;
  options: string | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
}

export interface ReviewCycleQuestion {
  id: number;
  cycleId: number;
  questionId: number;
  order: number;
  weight: number;
  question: ReviewQuestion;
}

export interface ReviewCycle {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  selfReviewDeadline: string | null;
  managerReviewDeadline: string | null;
  status: ReviewCycleStatus;
  isActive: boolean;
  createdAt: string;
  questions?: ReviewCycleQuestion[];
  reviews?: PerformanceReview[];
  _count?: { reviews: number; questions: number };
}

export interface ReviewResponse {
  id: number;
  reviewId: number;
  questionId: number;
  respondentType: RespondentType;
  rating: number | null;
  response: string | null;
}

export interface ReviewGoal {
  id: number;
  reviewId: number;
  goalId: number | null;
  title: string;
  achievement: number | null;
  selfComment: string | null;
  managerComment: string | null;
}

export interface PerformanceReview {
  id: number;
  cycleId: number;
  employeeId: number;
  reviewerId: number;
  status: ReviewStatus;
  selfRating: number | null;
  managerRating: number | null;
  finalRating: number | null;
  selfStrengths: string | null;
  selfImprovements: string | null;
  selfComments: string | null;
  managerStrengths: string | null;
  managerImprovements: string | null;
  managerComments: string | null;
  selfReviewDate: string | null;
  managerReviewDate: string | null;
  completedAt: string | null;
  createdAt: string;
  cycle?: ReviewCycle;
  employee?: { id: number; firstName: string; lastName: string; email: string; avatar?: string; department?: { name: string }; designation?: { name: string } };
  reviewer?: { id: number; firstName: string; lastName: string };
  responses?: ReviewResponse[];
  goals?: ReviewGoal[];
}

export interface ReviewStats {
  total: number;
  byStatus: Record<ReviewStatus, number>;
  avgSelfRating: number | null;
  avgManagerRating: number | null;
  avgFinalRating: number | null;
  completionRate: number;
}

export interface ReviewCycleCreateInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  selfReviewDeadline?: string;
  managerReviewDeadline?: string;
  questionIds?: number[];
}

export interface ReviewQuestionCreateInput {
  question: string;
  description?: string;
  category?: QuestionCategory;
  type?: QuestionType;
  options?: string[];
  isRequired?: boolean;
  order?: number;
}

export interface SelfReviewInput {
  responses: Array<{ questionId: number; rating?: number; response?: string }>;
  strengths?: string;
  improvements?: string;
  comments?: string;
  goals?: Array<{ goalId?: number; title: string; achievement?: number; selfComment?: string }>;
}

export interface ManagerReviewInput {
  responses: Array<{ questionId: number; rating?: number; response?: string }>;
  strengths?: string;
  improvements?: string;
  comments?: string;
  goals?: Array<{ id: number; achievement?: number; managerComment?: string }>;
  finalRating?: number;
}

export const reviewsApi = {
  // Review Cycles
  listCycles: (params?: { status?: ReviewCycleStatus; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: ReviewCycle[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/review-cycles${qs ? `?${qs}` : ''}`);
  },

  getCycle: (id: number) => request<ReviewCycle>(`/tenant/review-cycles/${id}`),

  createCycle: (data: ReviewCycleCreateInput) =>
    request<ReviewCycle>('/tenant/review-cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCycle: (id: number, data: Partial<ReviewCycleCreateInput> & { status?: ReviewCycleStatus }) =>
    request<ReviewCycle>(`/tenant/review-cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCycle: (id: number) =>
    request<{ message: string }>(`/tenant/review-cycles/${id}`, { method: 'DELETE' }),

  activateCycle: (id: number, data?: { departmentIds?: number[]; userIds?: number[] }) =>
    request<{ message: string; reviewsCreated: number }>(`/tenant/review-cycles/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  addQuestionToCycle: (cycleId: number, questionId: number, order?: number, weight?: number) =>
    request<ReviewCycleQuestion>(`/tenant/review-cycles/${cycleId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ questionId, order, weight }),
    }),

  removeQuestionFromCycle: (cycleId: number, questionId: number) =>
    request<{ message: string }>(`/tenant/review-cycles/${cycleId}/questions/${questionId}`, {
      method: 'DELETE',
    }),

  // Review Questions
  listQuestions: (params?: { category?: QuestionCategory; type?: QuestionType }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.type) searchParams.append('type', params.type);
    const qs = searchParams.toString();
    return request<ReviewQuestion[]>(`/tenant/review-questions${qs ? `?${qs}` : ''}`);
  },

  createQuestion: (data: ReviewQuestionCreateInput) =>
    request<ReviewQuestion>('/tenant/review-questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuestion: (id: number, data: Partial<ReviewQuestionCreateInput>) =>
    request<ReviewQuestion>(`/tenant/review-questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteQuestion: (id: number) =>
    request<{ message: string }>(`/tenant/review-questions/${id}`, { method: 'DELETE' }),

  // Performance Reviews
  listReviews: (params?: { cycleId?: number; status?: ReviewStatus; myReviews?: boolean; toReview?: boolean; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.cycleId) searchParams.append('cycleId', params.cycleId.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.myReviews) searchParams.append('myReviews', params.myReviews.toString());
    if (params?.toReview) searchParams.append('toReview', params.toReview.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: PerformanceReview[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/reviews${qs ? `?${qs}` : ''}`);
  },

  getReview: (id: number) => request<PerformanceReview>(`/tenant/reviews/${id}`),

  submitSelfReview: (id: number, data: SelfReviewInput) =>
    request<PerformanceReview>(`/tenant/reviews/${id}/self-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitManagerReview: (id: number, data: ManagerReviewInput) =>
    request<PerformanceReview>(`/tenant/reviews/${id}/manager-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStats: (cycleId?: number) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : '';
    return request<ReviewStats>(`/tenant/reviews/stats${qs}`);
  },
};

// ==================== TIME TRACKING API ====================

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type ProjectMemberRole = 'LEAD' | 'MEMBER';
export type TimeLogStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Project {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  description: string | null;
  clientName: string | null;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  budgetHours: number | null;
  isActive: boolean;
  createdAt: string;
  members?: ProjectMember[];
  _count?: { members: number; timeLogs: number };
  totalHours?: number;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectMemberRole;
  hourlyRate: number | null;
  joinedAt: string;
  leftAt: string | null;
  user?: { id: number; firstName: string; lastName: string; email?: string; avatar?: string };
}

export interface TimeLog {
  id: number;
  tenantId: number;
  userId: number;
  projectId: number | null;
  date: string;
  hours: number;
  description: string | null;
  isBillable: boolean;
  status: TimeLogStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  user?: { id: number; firstName: string; lastName: string; avatar?: string };
  project?: { id: number; name: string; code: string };
  approver?: { id: number; firstName: string; lastName: string };
}

export interface WeeklyTimesheet {
  weekOf: string;
  weekDays: string[];
  projects: { id: number; name: string; code: string }[];
  logs: TimeLog[];
  logsMap: Record<string, Record<string | number, TimeLog>>;
  totalHours: number;
  submittedHours: number;
}

export interface TimesheetStats {
  weekOf: string;
  totalHours: number;
  draftHours: number;
  submittedHours: number;
  approvedHours: number;
  billableHours: number;
  projectsWorkedOn: number;
  entriesCount: number;
}

export interface ProjectCreateInput {
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  startDate: string;
  endDate?: string;
  budgetHours?: number;
  memberIds?: number[];
}

export interface TimeLogCreateInput {
  projectId?: number;
  date: string;
  hours: number;
  description?: string;
  isBillable?: boolean;
}

export const timetrackingApi = {
  // Projects
  listProjects: (params?: { status?: ProjectStatus; myProjects?: boolean; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.myProjects) searchParams.append('myProjects', params.myProjects.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: Project[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/projects${qs ? `?${qs}` : ''}`);
  },

  getProject: (id: number) => request<Project>(`/tenant/projects/${id}`),

  createProject: (data: ProjectCreateInput) =>
    request<Project>('/tenant/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: number, data: Partial<ProjectCreateInput> & { status?: ProjectStatus }) =>
    request<Project>(`/tenant/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: number) =>
    request<{ message: string }>(`/tenant/projects/${id}`, { method: 'DELETE' }),

  addProjectMember: (projectId: number, userId: number, role?: ProjectMemberRole, hourlyRate?: number) =>
    request<ProjectMember>(`/tenant/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role, hourlyRate }),
    }),

  removeProjectMember: (projectId: number, userId: number) =>
    request<{ message: string }>(`/tenant/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Time Logs
  listTimeLogs: (params?: { projectId?: number; startDate?: string; endDate?: string; status?: TimeLogStatus; myLogs?: boolean; toApprove?: boolean; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.append('projectId', params.projectId.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.myLogs) searchParams.append('myLogs', params.myLogs.toString());
    if (params?.toApprove) searchParams.append('toApprove', params.toApprove.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: TimeLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/timelogs${qs ? `?${qs}` : ''}`);
  },

  getWeeklyTimesheet: (weekOf?: string, targetUserId?: number) => {
    const searchParams = new URLSearchParams();
    if (weekOf) searchParams.append('weekOf', weekOf);
    if (targetUserId) searchParams.append('targetUserId', targetUserId.toString());
    const qs = searchParams.toString();
    return request<WeeklyTimesheet>(`/tenant/timelogs/weekly${qs ? `?${qs}` : ''}`);
  },

  getTimesheetStats: (weekOf?: string) => {
    const qs = weekOf ? `?weekOf=${weekOf}` : '';
    return request<TimesheetStats>(`/tenant/timelogs/stats${qs}`);
  },

  createTimeLog: (data: TimeLogCreateInput) =>
    request<TimeLog>('/tenant/timelogs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTimeLog: (id: number, data: Partial<TimeLogCreateInput>) =>
    request<TimeLog>(`/tenant/timelogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTimeLog: (id: number) =>
    request<{ message: string }>(`/tenant/timelogs/${id}`, { method: 'DELETE' }),

  submitTimesheet: (weekOf?: string) =>
    request<{ message: string; submittedCount: number }>('/tenant/timelogs/submit', {
      method: 'POST',
      body: JSON.stringify({ weekOf }),
    }),

  approveTimeLogs: (logIds: number[]) =>
    request<{ message: string; approvedCount: number }>('/tenant/timelogs/approve', {
      method: 'POST',
      body: JSON.stringify({ logIds }),
    }),

  rejectTimeLogs: (logIds: number[], reason?: string) =>
    request<{ message: string; rejectedCount: number }>('/tenant/timelogs/reject', {
      method: 'POST',
      body: JSON.stringify({ logIds, reason }),
    }),
};

// ==================== EXPENSE MANAGEMENT API ====================

export type ExpenseStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

export interface ExpenseCategory {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  maxLimit: number | null;
  requiresReceipt: boolean;
  isActive: boolean;
  _count?: { claims: number };
}

export interface ExpenseClaim {
  id: number;
  tenantId: number;
  userId: number;
  categoryId: number;
  amount: number;
  currency: string;
  date: string;
  description: string;
  receiptUrl: string | null;
  notes: string | null;
  status: ExpenseStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  reimbursedAt: string | null;
  createdAt: string;
  user?: { id: number; firstName: string; lastName: string; avatar?: string; department?: { name: string } };
  category?: ExpenseCategory;
  approver?: { id: number; firstName: string; lastName: string };
}

export interface ExpenseStats {
  total: number;
  totalAmount: number;
  byStatus: Record<ExpenseStatus, { count: number; amount: number }>;
  byCategory: Array<{ categoryId: number; categoryName: string; count: number; amount: number }>;
  pendingAmount: number;
  approvedAmount: number;
  reimbursedAmount: number;
}

export interface ExpenseCategoryCreateInput {
  name: string;
  description?: string;
  maxLimit?: number;
  requiresReceipt?: boolean;
}

export interface ExpenseClaimCreateInput {
  categoryId: number;
  amount: number;
  currency?: string;
  date: string;
  description: string;
  receiptUrl?: string;
  notes?: string;
  submit?: boolean;
}

export const expensesApi = {
  // Expense Categories
  listCategories: () => request<ExpenseCategory[]>('/tenant/expense-categories'),

  getCategory: (id: number) => request<ExpenseCategory>(`/tenant/expense-categories/${id}`),

  createCategory: (data: ExpenseCategoryCreateInput) =>
    request<ExpenseCategory>('/tenant/expense-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: number, data: Partial<ExpenseCategoryCreateInput>) =>
    request<ExpenseCategory>(`/tenant/expense-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: number) =>
    request<{ message: string }>(`/tenant/expense-categories/${id}`, { method: 'DELETE' }),

  // Expense Claims
  listClaims: (params?: { status?: ExpenseStatus; categoryId?: number; startDate?: string; endDate?: string; myClaims?: boolean; toApprove?: boolean; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.myClaims) searchParams.append('myClaims', params.myClaims.toString());
    if (params?.toApprove) searchParams.append('toApprove', params.toApprove.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: ExpenseClaim[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/expenses${qs ? `?${qs}` : ''}`);
  },

  getClaim: (id: number) => request<ExpenseClaim>(`/tenant/expenses/${id}`),

  createClaim: (data: ExpenseClaimCreateInput) =>
    request<ExpenseClaim>('/tenant/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClaim: (id: number, data: Partial<ExpenseClaimCreateInput>) =>
    request<ExpenseClaim>(`/tenant/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteClaim: (id: number) =>
    request<{ message: string }>(`/tenant/expenses/${id}`, { method: 'DELETE' }),

  submitClaim: (id: number) =>
    request<ExpenseClaim>(`/tenant/expenses/${id}/submit`, { method: 'POST' }),

  approveClaims: (claimIds: number[]) =>
    request<{ message: string; approvedCount: number }>('/tenant/expenses/approve', {
      method: 'POST',
      body: JSON.stringify({ claimIds }),
    }),

  rejectClaims: (claimIds: number[], reason?: string) =>
    request<{ message: string; rejectedCount: number }>('/tenant/expenses/reject', {
      method: 'POST',
      body: JSON.stringify({ claimIds, reason }),
    }),

  markAsReimbursed: (claimIds: number[]) =>
    request<{ message: string; reimbursedCount: number }>('/tenant/expenses/reimburse', {
      method: 'POST',
      body: JSON.stringify({ claimIds }),
    }),

  getStats: (params?: { startDate?: string; endDate?: string; myClaims?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.myClaims) searchParams.append('myClaims', params.myClaims.toString());
    const qs = searchParams.toString();
    return request<ExpenseStats>(`/tenant/expenses/stats${qs ? `?${qs}` : ''}`);
  },
};

// ==================== RECRUITMENT API ====================

export type JobStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type ApplicationStatus = 'NEW' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';

export interface JobPosting {
  id: number;
  tenantId: number;
  title: string;
  departmentId: number | null;
  designationId: number | null;
  locationId: number | null;
  description: string;
  requirements: string;
  responsibilities: string | null;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  employmentType: EmploymentType;
  skills: string | null;
  openings: number;
  status: JobStatus;
  postedAt: string | null;
  closingDate: string | null;
  isRemote: boolean;
  createdBy: number;
  createdAt: string;
  department?: { id: number; name: string } | null;
  designation?: { id: number; name: string } | null;
  location?: { id: number; name: string; city?: string } | null;
  creator?: { id: number; firstName: string; lastName: string };
  _count?: { applications: number };
}

export interface JobApplication {
  id: number;
  tenantId: number;
  jobPostingId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl: string | null;
  coverLetter: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  currentCompany: string | null;
  currentRole: string | null;
  noticePeriod: string | null;
  expectedSalary: number | null;
  status: ApplicationStatus;
  rating: number | null;
  notes: string | null;
  source: string | null;
  referredBy: number | null;
  appliedAt: string;
  jobPosting?: { id: number; title: string };
  referrer?: { id: number; firstName: string; lastName: string } | null;
}

export interface RecruitmentStats {
  jobs: { total: number; active: number; draft: number; paused: number; closed: number };
  applications: {
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    new: number;
    screening: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  };
}

export interface JobPostingCreateInput {
  title: string;
  departmentId?: number;
  designationId?: number;
  locationId?: number;
  description: string;
  requirements: string;
  responsibilities?: string;
  experience: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  employmentType?: EmploymentType;
  skills?: string;
  openings?: number;
  closingDate?: string;
  isRemote?: boolean;
}

export interface JobApplicationCreateInput {
  jobPostingId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentRole?: string;
  noticePeriod?: string;
  expectedSalary?: number;
  source?: string;
  referredBy?: number;
}

export const recruitmentApi = {
  // Job Postings
  listJobs: (params?: { status?: JobStatus; departmentId?: number; locationId?: number; employmentType?: EmploymentType; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.departmentId) searchParams.append('departmentId', params.departmentId.toString());
    if (params?.locationId) searchParams.append('locationId', params.locationId.toString());
    if (params?.employmentType) searchParams.append('employmentType', params.employmentType);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: JobPosting[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/jobs${qs ? `?${qs}` : ''}`);
  },

  getJob: (id: number) => request<JobPosting>(`/tenant/jobs/${id}`),

  createJob: (data: JobPostingCreateInput) =>
    request<JobPosting>('/tenant/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateJob: (id: number, data: Partial<JobPostingCreateInput>) =>
    request<JobPosting>(`/tenant/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteJob: (id: number) =>
    request<{ message: string }>(`/tenant/jobs/${id}`, { method: 'DELETE' }),

  publishJob: (id: number) =>
    request<JobPosting>(`/tenant/jobs/${id}/publish`, { method: 'POST' }),

  pauseJob: (id: number) =>
    request<JobPosting>(`/tenant/jobs/${id}/pause`, { method: 'POST' }),

  closeJob: (id: number) =>
    request<JobPosting>(`/tenant/jobs/${id}/close`, { method: 'POST' }),

  getStats: () => request<RecruitmentStats>('/tenant/jobs/stats'),

  // Applications
  listApplications: (params?: { jobId?: number; status?: ApplicationStatus; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.jobId) searchParams.append('jobId', params.jobId.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: JobApplication[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/applications${qs ? `?${qs}` : ''}`);
  },

  getApplication: (id: number) => request<JobApplication>(`/tenant/applications/${id}`),

  createApplication: (data: JobApplicationCreateInput) =>
    request<JobApplication>('/tenant/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateApplication: (id: number, data: { status?: ApplicationStatus; rating?: number; notes?: string }) =>
    request<JobApplication>(`/tenant/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteApplication: (id: number) =>
    request<{ message: string }>(`/tenant/applications/${id}`, { method: 'DELETE' }),

  getApplicationFull: (id: number) =>
    request<JobApplicationFull>(`/tenant/applications/${id}/full`),
};

// ==================== INTERVIEW API ====================

export type InterviewType = 'PHONE' | 'VIDEO' | 'IN_PERSON' | 'TECHNICAL' | 'HR' | 'PANEL';
export type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type InterviewRecommendation = 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE';

export interface Interview {
  id: number;
  tenantId: number;
  applicationId: number;
  interviewerId: number;
  title: string;
  type: InterviewType;
  scheduledAt: string;
  duration: number;
  location: string | null;
  status: InterviewStatus;
  feedback: string | null;
  rating: number | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendation: string | null;
  createdAt: string;
  application?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    jobPosting?: { id: number; title: string };
  };
  interviewer?: { id: number; firstName: string; lastName: string; email: string };
}

export interface JobApplicationFull extends JobApplication {
  interviews: Interview[];
}

export interface ScheduleInterviewInput {
  applicationId: number;
  interviewerId: number;
  title: string;
  type?: InterviewType;
  scheduledAt: string;
  duration?: number;
  location?: string;
}

export interface InterviewFeedbackInput {
  feedback?: string;
  rating?: number;
  strengths?: string;
  weaknesses?: string;
  recommendation?: InterviewRecommendation;
  status?: InterviewStatus;
}

export const interviewApi = {
  listInterviews: (params?: { applicationId?: number; interviewerId?: number; status?: InterviewStatus; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.applicationId) searchParams.append('applicationId', params.applicationId.toString());
    if (params?.interviewerId) searchParams.append('interviewerId', params.interviewerId.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: Interview[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/interviews${qs ? `?${qs}` : ''}`);
  },

  getInterview: (id: number) => request<Interview>(`/tenant/interviews/${id}`),

  getMyInterviews: (params?: { status?: InterviewStatus; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const qs = searchParams.toString();
    return request<Interview[]>(`/tenant/interviews/my${qs ? `?${qs}` : ''}`);
  },

  scheduleInterview: (data: ScheduleInterviewInput) =>
    request<Interview>('/tenant/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInterview: (id: number, data: Partial<ScheduleInterviewInput>) =>
    request<Interview>(`/tenant/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cancelInterview: (id: number) =>
    request<Interview>(`/tenant/interviews/${id}/cancel`, { method: 'POST' }),

  submitFeedback: (id: number, data: InterviewFeedbackInput) =>
    request<Interview>(`/tenant/interviews/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteInterview: (id: number) =>
    request<{ message: string }>(`/tenant/interviews/${id}`, { method: 'DELETE' }),
};

// ==================== TRAINING API ====================

export type TrainingType = 'INTERNAL' | 'EXTERNAL' | 'ONLINE' | 'WORKSHOP' | 'CERTIFICATION';
export type TrainingStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED' | 'FAILED';

export interface TrainingProgram {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  type: TrainingType;
  category: string | null;
  duration: number;
  startDate: string;
  endDate: string;
  trainerId: number | null;
  externalTrainer: string | null;
  venue: string | null;
  maxParticipants: number | null;
  cost: number | null;
  currency: string;
  materials: string | null;
  prerequisites: string | null;
  objectives: string | null;
  status: TrainingStatus;
  createdBy: number;
  createdAt: string;
  trainer?: { id: number; firstName: string; lastName: string };
  creator?: { id: number; firstName: string; lastName: string };
  enrollments?: TrainingEnrollment[];
  _count?: { enrollments: number };
}

export interface TrainingEnrollment {
  id: number;
  tenantId: number;
  programId: number;
  userId: number;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  score: number | null;
  feedback: string | null;
  rating: number | null;
  certificateUrl: string | null;
  notes: string | null;
  user?: { id: number; firstName: string; lastName: string; email: string; department?: { name: string } };
  program?: TrainingProgram;
}

export interface TrainingStats {
  programs: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  enrollments: {
    total: number;
    enrolled: number;
    inProgress: number;
    completed: number;
    dropped: number;
  };
  byCategory: { category: string; count: number }[];
  upcomingPrograms: TrainingProgram[];
}

export interface CreateTrainingInput {
  name: string;
  description?: string;
  type?: TrainingType;
  category?: string;
  duration: number;
  startDate: string;
  endDate: string;
  trainerId?: number;
  externalTrainer?: string;
  venue?: string;
  maxParticipants?: number;
  cost?: number;
  currency?: string;
  materials?: string;
  prerequisites?: string;
  objectives?: string;
}

export const trainingApi = {
  listPrograms: (params?: { status?: TrainingStatus; type?: TrainingType; category?: string; trainerId?: number; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.trainerId) searchParams.append('trainerId', params.trainerId.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return request<{ data: TrainingProgram[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/tenant/training${qs ? `?${qs}` : ''}`);
  },

  getProgram: (id: number) => request<TrainingProgram>(`/tenant/training/${id}`),

  createProgram: (data: CreateTrainingInput) =>
    request<TrainingProgram>('/tenant/training', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProgram: (id: number, data: Partial<CreateTrainingInput> & { status?: TrainingStatus }) =>
    request<TrainingProgram>(`/tenant/training/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProgram: (id: number) =>
    request<{ message: string }>(`/tenant/training/${id}`, { method: 'DELETE' }),

  startProgram: (id: number) =>
    request<TrainingProgram>(`/tenant/training/${id}/start`, { method: 'POST' }),

  completeProgram: (id: number) =>
    request<TrainingProgram>(`/tenant/training/${id}/complete`, { method: 'POST' }),

  cancelProgram: (id: number) =>
    request<TrainingProgram>(`/tenant/training/${id}/cancel`, { method: 'POST' }),

  enrollParticipants: (id: number, userIds: number[]) =>
    request<{ message: string }>(`/tenant/training/${id}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),

  updateEnrollment: (programId: number, enrollmentId: number, data: { status?: EnrollmentStatus; score?: number; feedback?: string; rating?: number; certificateUrl?: string; notes?: string }) =>
    request<TrainingEnrollment>(`/tenant/training/${programId}/enrollments/${enrollmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeEnrollment: (programId: number, enrollmentId: number) =>
    request<{ message: string }>(`/tenant/training/${programId}/enrollments/${enrollmentId}`, { method: 'DELETE' }),

  bulkCompleteEnrollments: (id: number, enrollmentIds: number[], scores?: number[]) =>
    request<{ message: string }>(`/tenant/training/${id}/bulk-complete`, {
      method: 'POST',
      body: JSON.stringify({ enrollmentIds, scores }),
    }),

  getMyTrainings: (params?: { status?: EnrollmentStatus }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    const qs = searchParams.toString();
    return request<TrainingEnrollment[]>(`/tenant/training/my${qs ? `?${qs}` : ''}`);
  },

  submitFeedback: (programId: number, data: { feedback?: string; rating?: number }) =>
    request<TrainingEnrollment>(`/tenant/training/${programId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStats: () => request<TrainingStats>('/tenant/training/stats'),

  getCalendar: (startDate: string, endDate: string) =>
    request<TrainingProgram[]>(`/tenant/training/calendar?startDate=${startDate}&endDate=${endDate}`),
};

// ==================== SKILLS API ====================

export type SkillCategory = 'TECHNICAL' | 'SOFT' | 'DOMAIN' | 'LANGUAGE' | 'TOOL' | 'CERTIFICATION';

export interface Skill {
  id: number;
  tenantId: number;
  name: string;
  category: SkillCategory;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { employeeSkills: number };
  employeeSkills?: EmployeeSkill[];
}

export interface EmployeeSkill {
  id: number;
  tenantId: number;
  userId: number;
  skillId: number;
  level: number; // 1-5
  yearsOfExp?: number;
  lastUsed?: string;
  isCertified: boolean;
  certifiedAt?: string;
  certifiedBy?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  skill?: Skill;
  user?: { id: number; firstName: string; lastName?: string; email: string; department?: { name: string }; designation?: { name: string } };
  certifier?: { id: number; firstName: string; lastName?: string };
}

export interface SkillMatrix {
  skills: Skill[];
  employees: {
    id: number;
    name: string;
    department?: string;
    designation?: string;
    skills: { [skillId: number]: { level: number; isCertified: boolean } };
  }[];
}

export interface SkillGapItem {
  skillId: number;
  skillName: string;
  category: SkillCategory;
  totalEmployees: number;
  withSkill: number;
  withoutSkill: number;
  proficient: number;
  expert: number;
  gapPercentage: number;
  levelDistribution: { [level: number]: number };
}

export interface SkillStats {
  totalSkills: number;
  totalAssignments: number;
  certifiedCount: number;
  byCategory: { category: SkillCategory; count: number }[];
  topSkills: { skillId: number; skillName: string; count: number }[];
}

export interface SkillInput {
  name: string;
  category?: SkillCategory;
  description?: string;
}

export interface EmployeeSkillInput {
  skillId: number;
  level?: number;
  yearsOfExp?: number;
  lastUsed?: string;
  isCertified?: boolean;
  notes?: string;
}

export interface SkillUpdateInput {
  level?: number;
  yearsOfExp?: number;
  lastUsed?: string;
  isCertified?: boolean;
  notes?: string;
}

export const skillsApi = {
  // Skill CRUD
  list: (params?: { category?: SkillCategory; isActive?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return request<Skill[]>(`/tenant/skills${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<Skill>(`/tenant/skills/${id}`),

  create: (data: SkillInput) =>
    request<Skill>('/tenant/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<SkillInput> & { isActive?: boolean }) =>
    request<Skill>(`/tenant/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/tenant/skills/${id}`, { method: 'DELETE' }),

  // Employee Skills
  getEmployeeSkills: (userId: number) => request<EmployeeSkill[]>(`/tenant/skills/employee/${userId}`),

  assignSkill: (userId: number, data: EmployeeSkillInput) =>
    request<EmployeeSkill>(`/tenant/skills/employee/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmployeeSkill: (userId: number, skillId: number, data: SkillUpdateInput) =>
    request<EmployeeSkill>(`/tenant/skills/employee/${userId}/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeEmployeeSkill: (userId: number, skillId: number) =>
    request<{ message: string }>(`/tenant/skills/employee/${userId}/${skillId}`, { method: 'DELETE' }),

  bulkAssign: (data: { skillId: number; userIds: number[]; level?: number }) =>
    request<EmployeeSkill[]>('/tenant/skills/bulk-assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Skill Matrix & Analysis
  getMatrix: (params?: { departmentId?: number; skillCategory?: SkillCategory }) => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.skillCategory) searchParams.set('skillCategory', params.skillCategory);
    const qs = searchParams.toString();
    return request<SkillMatrix>(`/tenant/skills/matrix${qs ? `?${qs}` : ''}`);
  },

  getGapAnalysis: (params?: { departmentId?: number; minLevel?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.minLevel) searchParams.set('minLevel', String(params.minLevel));
    const qs = searchParams.toString();
    return request<SkillGapItem[]>(`/tenant/skills/gap-analysis${qs ? `?${qs}` : ''}`);
  },

  getStats: () => request<SkillStats>('/tenant/skills/stats'),

  // My Skills
  getMySkills: () => request<EmployeeSkill[]>('/tenant/skills/my'),

  addMySkill: (data: { skillId: number; level?: number; yearsOfExp?: number; lastUsed?: string }) =>
    request<EmployeeSkill>('/tenant/skills/my', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMySkill: (skillId: number, data: { level?: number; yearsOfExp?: number; lastUsed?: string }) =>
    request<EmployeeSkill>(`/tenant/skills/my/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== ASSETS API ====================

export type AssetCategory = 'LAPTOP' | 'DESKTOP' | 'MONITOR' | 'PHONE' | 'TABLET' | 'KEYBOARD' | 'MOUSE' | 'HEADSET' | 'FURNITURE' | 'VEHICLE' | 'SOFTWARE' | 'OTHER';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'REPAIR' | 'RETIRED' | 'LOST';
export type AssetCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface Asset {
  id: number;
  tenantId: number;
  name: string;
  assetCode: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency: string;
  warrantyEnd?: string;
  status: AssetStatus;
  condition: AssetCondition;
  currentUserId?: number;
  locationId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  currentUser?: { id: number; firstName: string; lastName?: string; email: string; department?: { name: string } };
  location?: { id: number; name: string; code: string; city?: string };
  _count?: { allocations: number };
  allocations?: AssetAllocation[];
}

export interface AssetAllocation {
  id: number;
  tenantId: number;
  assetId: number;
  userId: number;
  allocatedAt: string;
  allocatedBy: number;
  returnedAt?: string;
  returnedBy?: number;
  expectedReturn?: string;
  conditionOut: AssetCondition;
  conditionIn?: AssetCondition;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  asset?: { id: number; name: string; assetCode: string; category: AssetCategory; brand?: string; model?: string };
  user?: { id: number; firstName: string; lastName?: string; email: string; department?: { name: string } };
  allocator?: { id: number; firstName: string; lastName?: string };
  returner?: { id: number; firstName: string; lastName?: string };
}

export interface AssetStats {
  total: number;
  totalValue: number;
  byStatus: { status: AssetStatus; count: number }[];
  byCategory: { category: AssetCategory; count: number }[];
  recentAllocations: AssetAllocation[];
  upcomingReturns: AssetAllocation[];
  warrantyExpiring: { id: number; name: string; assetCode: string; warrantyEnd: string }[];
}

export interface AssetInput {
  name: string;
  assetCode: string;
  category?: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency?: string;
  warrantyEnd?: string;
  condition?: AssetCondition;
  locationId?: number;
  notes?: string;
}

export interface AllocateAssetInput {
  userId: number;
  expectedReturn?: string;
  conditionOut?: AssetCondition;
  notes?: string;
}

export interface ReturnAssetInput {
  conditionIn?: AssetCondition;
  notes?: string;
}

export const assetsApi = {
  // Asset CRUD
  list: (params?: { category?: AssetCategory; status?: AssetStatus; locationId?: number; currentUserId?: number; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.locationId) searchParams.set('locationId', String(params.locationId));
    if (params?.currentUserId) searchParams.set('currentUserId', String(params.currentUserId));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<Asset[]>(`/tenant/assets${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<Asset>(`/tenant/assets/${id}`),

  create: (data: AssetInput) =>
    request<Asset>('/tenant/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<AssetInput>) =>
    request<Asset>(`/tenant/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/tenant/assets/${id}`, { method: 'DELETE' }),

  // Allocation
  allocate: (id: number, data: AllocateAssetInput) =>
    request<AssetAllocation>(`/tenant/assets/${id}/allocate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  return: (id: number, data?: ReturnAssetInput) =>
    request<AssetAllocation>(`/tenant/assets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  updateStatus: (id: number, data: { status: AssetStatus; notes?: string }) =>
    request<Asset>(`/tenant/assets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // History
  getHistory: (id: number, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<AssetAllocation[]>(`/tenant/assets/${id}/history${qs ? `?${qs}` : ''}`);
  },

  // My Assets
  getMyAssets: () => request<Asset[]>('/tenant/assets/my'),

  getMyHistory: () => request<AssetAllocation[]>('/tenant/assets/my/history'),

  // Stats
  getStats: () => request<AssetStats>('/tenant/assets/stats'),
};

// ==================== DOCUMENTS API ====================

export type DocumentType = 'POLICY' | 'TEMPLATE' | 'CONTRACT' | 'CERTIFICATE' | 'HANDBOOK' | 'FORM' | 'GUIDE' | 'OTHER';

export type EmployeeDocumentType =
  | 'RESUME' | 'ID_PROOF' | 'ADDRESS_PROOF' | 'CERTIFICATE' | 'EDUCATION'
  | 'PAN_CARD' | 'AADHAR_CARD' | 'PASSPORT' | 'BANK_DETAILS'
  | 'OFFER_LETTER' | 'APPOINTMENT_LETTER' | 'RELIEVING_LETTER'
  | 'PAYSLIP' | 'TAX_FORM' | 'OTHER';

export interface Document {
  id: number;
  tenantId: number;
  name: string;
  type: DocumentType;
  category: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  isPublic: boolean;
  version: number;
  parentId?: number;
  isActive: boolean;
  tags?: string;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  _count?: {
    versions: number;
  };
  versions?: Document[];
  parent?: {
    id: number;
    name: string;
    version: number;
  };
}

export interface EmployeeDocument {
  id: number;
  tenantId: number;
  userId: number;
  documentType: EmployeeDocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string;
  issuedDate?: string;
  issuer?: string;
  documentNo?: string;
  isVerified: boolean;
  verifiedBy?: number;
  verifiedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    employeeCode?: string;
  };
  verifier?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface DocumentStats {
  totalDocuments: number;
  byType: Array<{ type: DocumentType; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  recentUploads: number;
  totalSizeBytes: number;
  totalSizeMB: number;
}

export interface EmployeeDocumentStats {
  totalDocuments: number;
  verifiedCount: number;
  unverifiedCount: number;
  expiringCount: number;
  byType: Array<{ type: EmployeeDocumentType; count: number }>;
}

export interface DocumentInput {
  name: string;
  type: DocumentType;
  category: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface EmployeeDocumentInput {
  userId?: number;
  documentType: EmployeeDocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string;
  issuedDate?: string;
  issuer?: string;
  documentNo?: string;
}

export const documentsApi = {
  // Company Documents
  list: (params?: {
    page?: number;
    limit?: number;
    type?: DocumentType;
    category?: string;
    isPublic?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.isPublic !== undefined) searchParams.set('isPublic', String(params.isPublic));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    const qs = searchParams.toString();
    return request<{ documents: Document[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tenant/documents${qs ? `?${qs}` : ''}`
    );
  },

  get: (id: number) => request<Document>(`/tenant/documents/${id}`),

  create: (data: DocumentInput) =>
    request<Document>('/tenant/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Pick<Document, 'name' | 'description' | 'isPublic' | 'category'> & { tags?: string[] }>) =>
    request<Document>(`/tenant/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/tenant/documents/${id}`, {
      method: 'DELETE',
    }),

  uploadNewVersion: (id: number, data: { fileUrl: string; fileName: string; fileSize: number; mimeType: string; description?: string }) =>
    request<Document>(`/tenant/documents/${id}/version`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCategories: () => request<string[]>('/tenant/documents/categories'),

  getStats: () => request<DocumentStats>('/tenant/documents/stats'),

  // Employee Documents
  listEmployeeDocuments: (params?: {
    userId?: number;
    documentType?: EmployeeDocumentType;
    isVerified?: boolean;
    expiringBefore?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', String(params.userId));
    if (params?.documentType) searchParams.set('documentType', params.documentType);
    if (params?.isVerified !== undefined) searchParams.set('isVerified', String(params.isVerified));
    if (params?.expiringBefore) searchParams.set('expiringBefore', params.expiringBefore);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<{ documents: EmployeeDocument[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tenant/employee-documents${qs ? `?${qs}` : ''}`
    );
  },

  getEmployeeDocument: (id: number) => request<EmployeeDocument>(`/tenant/employee-documents/${id}`),

  createEmployeeDocument: (data: EmployeeDocumentInput) =>
    request<EmployeeDocument>('/tenant/employee-documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmployeeDocument: (id: number, data: Partial<Pick<EmployeeDocument, 'name' | 'description' | 'expiryDate' | 'issuedDate' | 'issuer' | 'documentNo'>>) =>
    request<EmployeeDocument>(`/tenant/employee-documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEmployeeDocument: (id: number) =>
    request<{ message: string }>(`/tenant/employee-documents/${id}`, {
      method: 'DELETE',
    }),

  verifyEmployeeDocument: (id: number, isVerified: boolean) =>
    request<EmployeeDocument>(`/tenant/employee-documents/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    }),

  getExpiringDocuments: (days?: number) => {
    const qs = days ? `?days=${days}` : '';
    return request<EmployeeDocument[]>(`/tenant/employee-documents/expiring${qs}`);
  },

  getMyDocuments: () =>
    request<{ documents: EmployeeDocument[]; grouped: Record<EmployeeDocumentType, EmployeeDocument[]>; total: number }>(
      '/tenant/employee-documents/my'
    ),

  getEmployeeDocumentStats: () => request<EmployeeDocumentStats>('/tenant/employee-documents/stats'),
};

// ==================== BONUS & INCENTIVES ====================

export type BonusType =
  | 'PERFORMANCE'
  | 'FESTIVAL'
  | 'REFERRAL'
  | 'RETENTION'
  | 'JOINING'
  | 'ANNUAL'
  | 'SPOT'
  | 'PROJECT'
  | 'OTHER';

export type BonusStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export type IncentiveFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUALLY' | 'ONE_TIME';

export interface Bonus {
  id: number;
  tenantId: number;
  userId: number;
  bonusType: BonusType;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  effectiveDate: string;
  paymentDate?: string;
  status: BonusStatus;
  requestedBy: number;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  isTaxable: boolean;
  taxAmount?: number;
  netAmount?: number;
  payslipId?: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    employeeCode?: string;
    avatar?: string;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
  };
  requester?: { id: number; firstName: string; lastName?: string };
  approver?: { id: number; firstName: string; lastName?: string };
  payslip?: { id: number; month: number; year: number; status: string };
}

export interface BonusInput {
  userId: number;
  bonusType: BonusType;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  effectiveDate: string;
  isTaxable?: boolean;
  remarks?: string;
}

export interface BonusStats {
  totalBonuses: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  byStatus: Record<BonusStatus, number>;
  byType: Record<BonusType, { count: number; amount: number }>;
  monthlyTrend: { month: number; count: number; amount: number }[];
}

export interface IncentiveScheme {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  description?: string;
  frequency: IncentiveFrequency;
  criteria?: string;
  targetType?: string;
  targetValue?: number;
  targetUnit?: string;
  payoutType: string;
  payoutValue?: number;
  slabs?: { from: number; to: number; amount?: number; percent?: number }[];
  maxPayout?: number;
  applicableTo: string;
  applicableIds: number[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  creator?: { id: number; firstName: string; lastName?: string };
  _count?: { records: number };
}

export interface IncentiveSchemeInput {
  name: string;
  code: string;
  description?: string;
  frequency?: IncentiveFrequency;
  criteria?: string;
  targetType?: string;
  targetValue?: number;
  targetUnit?: string;
  payoutType?: string;
  payoutValue?: number;
  slabs?: { from: number; to: number; amount?: number; percent?: number }[];
  maxPayout?: number;
  applicableTo?: string;
  applicableIds?: number[];
  startDate: string;
  endDate?: string;
}

export interface IncentiveRecord {
  id: number;
  tenantId: number;
  schemeId: number;
  userId: number;
  periodStart: string;
  periodEnd: string;
  targetValue?: number;
  achievedValue?: number;
  achievementPercent?: number;
  calculatedAmount: number;
  adjustedAmount?: number;
  finalAmount: number;
  currency: string;
  isTaxable: boolean;
  taxAmount?: number;
  netAmount?: number;
  status: BonusStatus;
  approvedBy?: number;
  approvedAt?: string;
  paidAt?: string;
  payslipId?: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  scheme?: IncentiveScheme;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    department?: { id: number; name: string };
  };
  approver?: { id: number; firstName: string; lastName?: string };
  payslip?: { id: number; month: number; year: number; status: string };
}

export interface IncentiveRecordInput {
  schemeId: number;
  userId: number;
  periodStart: string;
  periodEnd: string;
  targetValue?: number;
  achievedValue?: number;
  calculatedAmount: number;
  adjustedAmount?: number;
  remarks?: string;
}

export interface IncentiveStats {
  totalSchemes: number;
  activeSchemes: number;
  totalRecords: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  byStatus: Record<BonusStatus, number>;
  byScheme: Record<string, { count: number; amount: number }>;
  quarterlyTrend: { quarter: string; count: number; amount: number }[];
}

export const bonusApi = {
  // Bonuses
  listBonuses: (params?: {
    page?: number;
    limit?: number;
    userId?: number;
    bonusType?: BonusType;
    status?: BonusStatus;
    fromDate?: string;
    toDate?: string;
    search?: string;
    myBonuses?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.userId) searchParams.set('userId', String(params.userId));
    if (params?.bonusType) searchParams.set('bonusType', params.bonusType);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.myBonuses) searchParams.set('myBonuses', 'true');
    const qs = searchParams.toString();
    return request<{ bonuses: Bonus[]; total: number; page: number; limit: number }>(
      `/tenant/bonuses${qs ? `?${qs}` : ''}`
    );
  },

  getBonus: (id: number) => request<Bonus>(`/tenant/bonuses/${id}`),

  createBonus: (data: BonusInput) =>
    request<Bonus>('/tenant/bonuses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBonus: (id: number, data: Partial<BonusInput>) =>
    request<Bonus>(`/tenant/bonuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteBonus: (id: number) =>
    request<{ message: string }>(`/tenant/bonuses/${id}`, {
      method: 'DELETE',
    }),

  approveBonus: (id: number) =>
    request<Bonus>(`/tenant/bonuses/${id}/approve`, {
      method: 'PATCH',
    }),

  rejectBonus: (id: number, rejectionReason?: string) =>
    request<Bonus>(`/tenant/bonuses/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason }),
    }),

  markBonusPaid: (id: number, data?: { paymentDate?: string; payslipId?: number; taxAmount?: number; netAmount?: number }) =>
    request<Bonus>(`/tenant/bonuses/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    }),

  cancelBonus: (id: number) =>
    request<Bonus>(`/tenant/bonuses/${id}/cancel`, {
      method: 'PATCH',
    }),

  getBonusStats: (year?: number) => {
    const qs = year ? `?year=${year}` : '';
    return request<BonusStats>(`/tenant/bonuses/stats${qs}`);
  },

  // Incentive Schemes
  listIncentiveSchemes: (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    frequency?: IncentiveFrequency;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.frequency) searchParams.set('frequency', params.frequency);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return request<{ schemes: IncentiveScheme[]; total: number; page: number; limit: number }>(
      `/tenant/incentive-schemes${qs ? `?${qs}` : ''}`
    );
  },

  getIncentiveScheme: (id: number) => request<IncentiveScheme>(`/tenant/incentive-schemes/${id}`),

  createIncentiveScheme: (data: IncentiveSchemeInput) =>
    request<IncentiveScheme>('/tenant/incentive-schemes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateIncentiveScheme: (id: number, data: Partial<IncentiveSchemeInput & { isActive?: boolean }>) =>
    request<IncentiveScheme>(`/tenant/incentive-schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteIncentiveScheme: (id: number) =>
    request<{ message: string }>(`/tenant/incentive-schemes/${id}`, {
      method: 'DELETE',
    }),

  // Incentive Records
  listIncentiveRecords: (params?: {
    page?: number;
    limit?: number;
    schemeId?: number;
    userId?: number;
    status?: BonusStatus;
    fromDate?: string;
    toDate?: string;
    myIncentives?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.schemeId) searchParams.set('schemeId', String(params.schemeId));
    if (params?.userId) searchParams.set('userId', String(params.userId));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    if (params?.myIncentives) searchParams.set('myIncentives', 'true');
    const qs = searchParams.toString();
    return request<{ records: IncentiveRecord[]; total: number; page: number; limit: number }>(
      `/tenant/incentives${qs ? `?${qs}` : ''}`
    );
  },

  getIncentiveRecord: (id: number) => request<IncentiveRecord>(`/tenant/incentives/${id}`),

  createIncentiveRecord: (data: IncentiveRecordInput) =>
    request<IncentiveRecord>('/tenant/incentives', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateIncentiveRecord: (id: number, data: Partial<Pick<IncentiveRecord, 'targetValue' | 'achievedValue' | 'calculatedAmount' | 'adjustedAmount' | 'remarks'>>) =>
    request<IncentiveRecord>(`/tenant/incentives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteIncentiveRecord: (id: number) =>
    request<{ message: string }>(`/tenant/incentives/${id}`, {
      method: 'DELETE',
    }),

  approveIncentiveRecord: (id: number) =>
    request<IncentiveRecord>(`/tenant/incentives/${id}/approve`, {
      method: 'PATCH',
    }),

  rejectIncentiveRecord: (id: number, remarks?: string) =>
    request<IncentiveRecord>(`/tenant/incentives/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks }),
    }),

  markIncentivePaid: (id: number, data?: { paidAt?: string; payslipId?: number; taxAmount?: number; netAmount?: number }) =>
    request<IncentiveRecord>(`/tenant/incentives/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    }),

  getIncentiveStats: (year?: number) => {
    const qs = year ? `?year=${year}` : '';
    return request<IncentiveStats>(`/tenant/incentives/stats${qs}`);
  },
};

// ==================== CUSTOM REPORT BUILDER ====================

export type ReportDataSource = 'EMPLOYEES' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'GOALS' | 'REVIEWS' | 'TRAINING' | 'EXPENSES' | 'ASSETS' | 'RECRUITMENT';

export type ReportFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'CURRENCY' | 'PERCENTAGE' | 'ENUM';

export type ChartType = 'TABLE' | 'BAR' | 'LINE' | 'PIE' | 'AREA' | 'DONUT';

export type AggregationType = 'NONE' | 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export interface ReportField {
  id: string;
  name: string;
  type: ReportFieldType;
  category: string;
  options?: string[];
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: string | number | boolean | string[] | [number, number];
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportAggregation {
  field: string;
  type: AggregationType;
}

export interface ReportTemplate {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  dataSource: ReportDataSource;
  selectedFields: string[];
  filters?: ReportFilter[];
  groupBy?: string[];
  sortBy?: ReportSort[];
  aggregations?: ReportAggregation[];
  chartType: ChartType;
  chartConfig?: Record<string, unknown>;
  isPublic: boolean;
  isSystem: boolean;
  schedule?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    firstName?: string;
    lastName?: string;
  };
  _count?: {
    generatedReports: number;
  };
}

export interface GeneratedReport {
  id: number;
  tenantId: number;
  templateId: number;
  parameters?: Record<string, unknown>;
  data: Record<string, unknown>[];
  summary?: Record<string, number>;
  rowCount: number;
  exportFormat?: string;
  exportUrl?: string;
  generatedBy: number;
  generatedAt: string;
  expiresAt?: string;
  template?: ReportTemplate;
  generator?: {
    id: number;
    firstName?: string;
    lastName?: string;
  };
  fieldMeta?: ReportField[];
}

export interface ReportRunResult {
  id: number;
  templateId: number;
  templateName: string;
  dataSource: ReportDataSource;
  chartType: ChartType;
  chartConfig?: Record<string, unknown>;
  selectedFields: string[];
  data: Record<string, unknown>[];
  summary?: Record<string, number>;
  rowCount: number;
  generatedAt: string;
  fieldMeta: ReportField[];
}

export interface ReportPreviewResult {
  preview: boolean;
  data: Record<string, unknown>[];
  rowCount: number;
  fieldMeta: ReportField[];
}

export interface ReportBuilderStats {
  totalTemplates: number;
  myTemplates: number;
  publicTemplates: number;
  totalGenerated: number;
  recentReports: Array<{
    id: number;
    generatedAt: string;
    template: {
      name: string;
      dataSource: ReportDataSource;
    };
  }>;
  templatesBySource: Array<{
    dataSource: ReportDataSource;
    count: number;
  }>;
  dataSources: Array<{
    id: ReportDataSource;
    name: string;
    fieldCount: number;
  }>;
}

export interface DataSourceInfo {
  id: ReportDataSource;
  name: string;
  fieldCount: number;
}

export interface AvailableFieldsResponse {
  fields?: ReportField[];
  operators: Record<string, string[]>;
  dataSources?: DataSourceInfo[];
}

export interface ReportTemplateInput {
  name: string;
  description?: string;
  dataSource: ReportDataSource;
  selectedFields: string[];
  filters?: ReportFilter[];
  groupBy?: string[];
  sortBy?: ReportSort[];
  aggregations?: ReportAggregation[];
  chartType?: ChartType;
  chartConfig?: Record<string, unknown>;
  isPublic?: boolean;
  schedule?: string;
}

export interface ReportPreviewInput {
  dataSource: ReportDataSource;
  selectedFields: string[];
  filters?: ReportFilter[];
  sortBy?: ReportSort[];
  limit?: number;
}

export const reportBuilderApi = {
  // Get available fields for a data source (or all data sources if not specified)
  getAvailableFields: (dataSource?: ReportDataSource) => {
    const qs = dataSource ? `?dataSource=${dataSource}` : '';
    return request<AvailableFieldsResponse>(`/tenant/report-builder/fields${qs}`);
  },

  // Get stats for report builder dashboard
  getStats: () => request<ReportBuilderStats>('/tenant/report-builder/stats'),

  // Preview report data without saving
  preview: (data: ReportPreviewInput) =>
    request<ReportPreviewResult>('/tenant/report-builder/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Report Templates
  listTemplates: (params?: { dataSource?: ReportDataSource; isPublic?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.dataSource) qs.append('dataSource', params.dataSource);
    if (params?.isPublic !== undefined) qs.append('isPublic', String(params.isPublic));
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const queryString = qs.toString();
    return request<{ templates: ReportTemplate[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tenant/report-builder/templates${queryString ? `?${queryString}` : ''}`
    );
  },

  getTemplate: (id: number) => request<ReportTemplate>(`/tenant/report-builder/templates/${id}`),

  createTemplate: (data: ReportTemplateInput) =>
    request<ReportTemplate>('/tenant/report-builder/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTemplate: (id: number, data: Partial<ReportTemplateInput>) =>
    request<ReportTemplate>(`/tenant/report-builder/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id: number) =>
    request<{ message: string }>(`/tenant/report-builder/templates/${id}`, {
      method: 'DELETE',
    }),

  duplicateTemplate: (id: number, name?: string) =>
    request<ReportTemplate>(`/tenant/report-builder/templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  runReport: (id: number, parameters?: Record<string, unknown>) =>
    request<ReportRunResult>(`/tenant/report-builder/templates/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ parameters }),
    }),

  // Generated Reports
  listGeneratedReports: (params?: { templateId?: number; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.templateId) qs.append('templateId', String(params.templateId));
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const queryString = qs.toString();
    return request<{ reports: GeneratedReport[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tenant/report-builder/reports${queryString ? `?${queryString}` : ''}`
    );
  },

  getGeneratedReport: (id: number) => request<GeneratedReport>(`/tenant/report-builder/reports/${id}`),

  deleteGeneratedReport: (id: number) =>
    request<{ message: string }>(`/tenant/report-builder/reports/${id}`, {
      method: 'DELETE',
    }),
};

// ==================== HOLIDAY MANAGEMENT ====================

export type WeeklyOffPattern =
  | 'ALL_SATURDAYS_SUNDAYS'
  | 'ONLY_SUNDAYS'
  | 'SECOND_FOURTH_SAT_SUNDAYS'
  | 'SECOND_LAST_SAT_SUNDAYS'
  | 'ALTERNATE_SATURDAYS_SUNDAYS'
  | 'CUSTOM';

export type HolidayType = 'FIXED' | 'OPTIONAL' | 'RESTRICTED';

export interface WeeklyOffConfig {
  id: number;
  tenantId: number;
  pattern: WeeklyOffPattern;
  customDays: number[] | null;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: number;
  tenantId: number;
  name: string;
  date: string;
  type: HolidayType;
  description: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    firstName: string;
    lastName: string | null;
  };
  _count?: {
    optionalSelections: number;
  };
}

export interface OptionalHolidaySelection {
  id: number;
  tenantId: number;
  holidayId: number;
  userId: number;
  year: number;
  status: string;
  selectedAt: string;
  holiday?: Holiday;
  user?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
}

export interface OptionalHolidayQuota {
  id: number;
  tenantId: number;
  year: number;
  maxOptional: number;
  createdAt: string;
  updatedAt: string;
  used?: number;
  available?: number;
}

export interface HolidayStats {
  year: number;
  totalHolidays: number;
  fixedHolidays: number;
  optionalHolidays: number;
  upcomingHolidays: Holiday[];
  weeklyOffPattern: WeeklyOffPattern;
  optionalQuota: {
    max: number;
    used: number;
    available: number;
  };
}

export interface BulkImportResult {
  created: number;
  failed: number;
  results: {
    success: Array<{ name: string; date: string; type: string }>;
    errors: Array<{ row: number; error: string }>;
  };
}

export const holidayApi = {
  // Weekly Off Config
  getWeeklyOffConfig: () => request<WeeklyOffConfig>('/tenant/weekly-off'),

  updateWeeklyOffConfig: (data: { pattern: WeeklyOffPattern; customDays?: number[]; effectiveFrom?: string }) =>
    request<WeeklyOffConfig>('/tenant/weekly-off', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Holidays
  listHolidays: (params?: { year?: number; type?: HolidayType; month?: number; page?: number; limit?: number; includeInactive?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.year) qs.append('year', String(params.year));
    if (params?.type) qs.append('type', params.type);
    if (params?.month) qs.append('month', String(params.month));
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.includeInactive) qs.append('includeInactive', String(params.includeInactive));
    const queryString = qs.toString();
    return request<{ holidays: Holiday[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tenant/holidays${queryString ? `?${queryString}` : ''}`
    );
  },

  getHoliday: (id: number) => request<Holiday>(`/tenant/holidays/${id}`),

  createHoliday: (data: { name: string; date: string; type?: HolidayType; description?: string }) =>
    request<Holiday>('/tenant/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateHoliday: (id: number, data: { name?: string; date?: string; type?: HolidayType; description?: string; isActive?: boolean }) =>
    request<Holiday>(`/tenant/holidays/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteHoliday: (id: number) =>
    request<{ message: string }>(`/tenant/holidays/${id}`, {
      method: 'DELETE',
    }),

  getStats: (year?: number) => {
    const qs = year ? `?year=${year}` : '';
    return request<HolidayStats>(`/tenant/holidays/stats${qs}`);
  },

  downloadTemplate: () => request<string>('/tenant/holidays/template'),

  bulkImportHolidays: (holidays: Array<{ name: string; date: string; type?: string; description?: string }>) =>
    request<BulkImportResult>('/tenant/holidays/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ holidays }),
    }),

  // Optional Holidays
  getOptionalQuota: (year?: number) => {
    const qs = year ? `?year=${year}` : '';
    return request<OptionalHolidayQuota & { used: number; available: number }>(`/tenant/holidays/optional/quota${qs}`);
  },

  updateOptionalQuota: (data: { year?: number; maxOptional: number }) =>
    request<OptionalHolidayQuota>('/tenant/holidays/optional/quota', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getMyOptionalSelections: (year?: number) => {
    const qs = year ? `?year=${year}` : '';
    return request<OptionalHolidaySelection[]>(`/tenant/holidays/optional/my-selections${qs}`);
  },

  selectOptionalHoliday: (holidayId: number) =>
    request<OptionalHolidaySelection>(`/tenant/holidays/optional/${holidayId}/select`, {
      method: 'POST',
    }),

  cancelOptionalHoliday: (holidayId: number) =>
    request<OptionalHolidaySelection>(`/tenant/holidays/optional/${holidayId}/cancel`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// DATA IMPORT API (Migration)
// ============================================================================

export const dataImportApi = {
  downloadTemplate: async (module: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE}/tenant/import/template/${module}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  import: async (module: string, file: File): Promise<BulkImportResult> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/tenant/import/${module}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Import failed');
    }
    return data;
  },
};
