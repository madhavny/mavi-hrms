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
    request<{ tenant: Tenant; adminUser: { id: number; email: string } }>(
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
};

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
    plainPassword?: string;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
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
