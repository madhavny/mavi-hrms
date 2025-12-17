# Product Requirements Document (PRD)
## Mavi HRMS - Multi-Tenant SaaS Platform

**Version:** 2.0
**Last Updated:** November 2025
**Product Owner:** Karan Shergill

---

## 1. Executive Summary

Mavi HRMS is a comprehensive multi-tenant SaaS Human Resource Management System designed to streamline employee lifecycle management from hire to retire. The platform features a super admin portal for managing multiple tenant organizations, with each tenant having complete isolation of their HR data.

### Key Highlights
- **Architecture:** Multi-tenant SaaS with single database + tenant_id isolation
- **Users:** Super Admin → Tenant Admin → HR → Manager → Employee hierarchy
- **Tech Stack:** Node.js + Express + PostgreSQL + Prisma (Backend) | Next.js 16 + React 19 + TypeScript (Frontend)
- **Current Modules:** Tenant Management, Employee Management, Attendance Tracking, Leave Management
- **Planned Modules:** 21 modules covering complete hire-to-retire cycle

---

## 2. System Architecture

### 2.1 Architecture Pattern
**Multi-Tenant SaaS Model**
- Single PostgreSQL database with tenant_id column for data isolation
- Shared application infrastructure with tenant-specific data segregation
- Redis-based JWT token caching for authentication
- Role-based access control (RBAC) at tenant level

### 2.2 Technology Stack

#### Backend
```
- Runtime: Node.js 20+
- Framework: Express.js 5.1
- Database: PostgreSQL 14+
- ORM: Prisma 5.22.0
- Cache: Redis
- Authentication: JWT (jsonwebtoken)
- Validation: Joi
- Password: bcrypt
```

#### Frontend
```
- Framework: Next.js 16 (App Router)
- UI Library: React 19
- Language: TypeScript 5
- Styling: Tailwind CSS 4
- Components: Radix UI
- Icons: Lucide React
- State: Local State + Server State
```

### 2.3 Database Architecture

#### Core Models

**Super Admin Models:**
```prisma
SuperAdmin {
  id: Int (PK)
  email: String (unique)
  password: String (hashed)
  name: String
  isActive: Boolean
  lastLogin: DateTime
}

Tenant {
  id: Int (PK)
  name: String
  slug: String (unique, URL-friendly)
  email: String
  phone: String
  address: String
  status: Enum (ACTIVE, INACTIVE, SUSPENDED, TRIAL)
  enabledModules: String[]
  logo: String (optional)
  users: User[] (relation)
}
```

**Tenant-Level Models:**
```prisma
User {
  id: Int (PK)
  tenantId: Int (FK → Tenant)
  employeeCode: String (unique per tenant)
  email: String (unique per tenant)
  password: String (hashed)
  plainPassword: String (for super admin viewing only - SECURITY RISK)
  firstName: String
  lastName: String
  phone: String
  dateOfBirth: Date
  gender: Enum (MALE, FEMALE, OTHER)
  dateOfJoining: Date
  employmentType: Enum (FULL_TIME, PART_TIME, CONTRACT)
  roleId: Int (FK → Role)
  departmentId: Int (FK → Department)
  designationId: Int (FK → Designation)
  locationId: Int (FK → Location)
  reportingTo: Int (FK → User, self-reference)
  isActive: Boolean
  lastLogin: DateTime
}

Role {
  id: Int (PK)
  tenantId: Int (FK)
  name: String (Admin, HR, Manager, Employee)
  code: String (ADMIN, HR, MANAGER, EMPLOYEE)
  permissions: Permission[] (relation)
}

Permission {
  id: Int (PK)
  tenantId: Int (FK)
  module: String
  action: String (CREATE, READ, UPDATE, DELETE)
  roleId: Int (FK)
}

Department {
  id: Int (PK)
  tenantId: Int (FK)
  name: String
  code: String
  headOfDepartment: Int (FK → User)
}

Designation {
  id: Int (PK)
  tenantId: Int (FK)
  name: String
  code: String
  level: Int (hierarchy level)
}

Location {
  id: Int (PK)
  tenantId: Int (FK)
  name: String
  code: String
  city: String
  state: String
  country: String
}
```

**Attendance Models:**
```prisma
Attendance {
  id: Int (PK)
  tenantId: Int (FK)
  userId: Int (FK → User)
  date: Date (unique with userId)
  clockIn: DateTime
  clockOut: DateTime
  totalHours: Float (calculated)
  status: Enum (PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE, HOLIDAY, WEEKEND)
  remarks: String
  approvedBy: Int (FK → User)
  approvedAt: DateTime
}
```

**Leave Management Models:**
```prisma
LeaveType {
  id: Int (PK)
  tenantId: Int (FK)
  name: String (Casual Leave, Sick Leave, Earned Leave)
  code: String (CL, SL, EL)
  isPaid: Boolean
  maxDaysPerYear: Int
  carryForward: Boolean
  requiresDocument: Boolean
  isActive: Boolean
}

LeaveBalance {
  id: Int (PK)
  tenantId: Int (FK)
  userId: Int (FK → User)
  leaveTypeId: Int (FK → LeaveType)
  year: Int (financial year)
  totalDays: Float
  usedDays: Float
  pendingDays: Float
  availableDays: Float (calculated: total - used - pending)
}

LeaveRequest {
  id: Int (PK)
  tenantId: Int (FK)
  userId: Int (FK → User)
  leaveTypeId: Int (FK → LeaveType)
  fromDate: Date
  toDate: Date
  totalDays: Float (supports 0.5 for half day)
  reason: String
  documentUrl: String (medical certificate, etc.)
  status: Enum (PENDING, APPROVED, REJECTED, CANCELLED)
  appliedTo: Int (FK → User, manager/HR)
  reviewedBy: Int (FK → User)
  reviewedAt: DateTime
  reviewComments: String
}
```

### 2.4 Data Relationships

```
Tenant (1) ----< (Many) Users
User (1) ----< (Many) Attendance Records
User (1) ----< (Many) Leave Requests
User (1) ----< (Many) Leave Balances
User (Many) ----< (1) Role
User (Many) ----< (1) Department
User (Many) ----< (1) Designation
User (Many) ----< (1) Location
User (1) ----< (Many) Users (Manager → Subordinates)
LeaveType (1) ----< (Many) Leave Balances
LeaveType (1) ----< (Many) Leave Requests
```

---

## 3. API Architecture

### 3.1 Base URL Structure
```
http://localhost:9000/api/v1
```

### 3.2 API Modules

#### **Super Admin APIs**
```
POST   /super-admin/login
GET    /super-admin/dashboard
POST   /super-admin/tenants
GET    /super-admin/tenants
GET    /super-admin/tenants/:id
PATCH  /super-admin/tenants/:id
PATCH  /super-admin/tenants/:id/status
DELETE /super-admin/tenants/:id
DELETE /super-admin/tenants/:id/permanent
```

#### **Tenant User APIs**
```
POST   /tenant/login
GET    /tenant/profile
GET    /tenant/dashboard
GET    /tenant/users
POST   /tenant/users
GET    /tenant/users/:id
PATCH  /tenant/users/:id
DELETE /tenant/users/:id
GET    /tenant/roles
GET    /tenant/departments
GET    /tenant/designations
GET    /tenant/locations
```

#### **Attendance APIs**
```
POST   /attendance/clock-in
POST   /attendance/clock-out
GET    /attendance/my-attendance
GET    /attendance/my-summary
GET    /attendance
POST   /attendance/mark
PATCH  /attendance/:id
GET    /attendance/summary
```

#### **Leave APIs**
```
# Leave Types
GET    /leave/types
POST   /leave/types
PATCH  /leave/types/:id
DELETE /leave/types/:id

# Leave Balances
GET    /leave/my-balance
GET    /leave/balances
POST   /leave/balances/allocate

# Leave Requests
POST   /leave/apply
GET    /leave/my-requests
GET    /leave/requests
GET    /leave/requests/:id
PATCH  /leave/requests/:id/review
PATCH  /leave/requests/:id/cancel
```

### 3.3 Authentication Flow

**Super Admin:**
```
1. POST /super-admin/login {email, password}
2. Response: {token, user, permissions}
3. Store JWT token in Redis: key="super_admin:{token}", ttl=8h
4. All subsequent requests: Authorization: Bearer {token}
5. Middleware: verifySuperAdmin()
```

**Tenant User:**
```
1. POST /tenant/login {email, password, tenant: "slug"}
2. Find tenant by slug → Find user in tenant
3. Response: {token, user, tenant, role}
4. Store JWT token in Redis: key="tenant:{token}", ttl=8h
5. All subsequent requests: Authorization: Bearer {token}
6. Middleware: verifyTenantUser() → extracts tenantId, userId, role
```

**JWT Token Structure:**
```javascript
SuperAdmin Token: {
  id: superAdminId,
  email: string,
  type: "super_admin",
  exp: timestamp
}

Tenant User Token: {
  id: userId,
  tenantId: number,
  tenantSlug: string,
  email: string,
  role: string (ADMIN, HR, MANAGER, EMPLOYEE),
  type: "tenant_user",
  exp: timestamp
}
```

---

## 4. Frontend Architecture

### 4.1 Route Structure

```
/
├── /super-admin
│   ├── /login                    # Super admin login page
│   └── /dashboard                # Tenant management dashboard
│
├── /[tenant]                     # Dynamic tenant routes
│   ├── /login                    # Tenant user login
│   └── /dashboard                # Tenant dashboard (with sidebar layout)
│       ├── /employees            # Employee CRUD
│       ├── /attendance           # Attendance tracking
│       ├── /leave                # Leave management
│       └── /settings             # Tenant settings
```

### 4.2 Component Architecture

```
app/
├── [tenant]/
│   ├── dashboard/
│   │   └── page.tsx              # Dashboard home
│   ├── employees/
│   │   └── page.tsx              # Employee list + CRUD modals
│   ├── attendance/
│   │   └── page.tsx              # Clock in/out + history
│   └── leave/
│       └── page.tsx              # Leave balance + requests
│
components/
├── layout/
│   └── DashboardLayout.tsx       # Shared sidebar layout
└── ui/                           # Radix UI components
    ├── button.tsx
    ├── input.tsx
    ├── dialog.tsx
    ├── table.tsx
    ├── card.tsx
    ├── select.tsx
    ├── alert.tsx
    ├── textarea.tsx
    ├── tabs.tsx
    └── sidebar.tsx
│
lib/
└── api.ts                        # TypeScript API client
```

### 4.3 State Management

**Client-Side Storage:**
```javascript
localStorage.setItem('token', jwt_token)
localStorage.setItem('user', JSON.stringify(user_object))
localStorage.setItem('tenant', JSON.stringify(tenant_object))
```

**Data Fetching Pattern:**
```javascript
// API Client (lib/api.ts)
export const tenantApi = {
  getUsers: (params) => request('/tenant/users', params),
  createUser: (data) => request('/tenant/users', {method: 'POST', body: data})
}

// Component Usage
const [users, setUsers] = useState([])
useEffect(() => {
  tenantApi.getUsers().then(res => setUsers(res.data.users))
}, [])
```

---

## 5. User Roles & Permissions

### 5.1 Super Admin
**Access:** Global across all tenants
- Create/manage tenants
- View all tenant data
- Activate/suspend/delete tenants
- View tenant admin credentials (plainPassword field)
- Enable/disable modules per tenant

### 5.2 Tenant Admin
**Access:** Full control within their tenant
- Manage all employees
- Configure departments, designations, locations
- Manage leave types and policies
- Allocate leave balances
- Approve/reject leave requests
- Mark attendance for all employees
- View all reports

### 5.3 HR
**Access:** HR operations within tenant
- Manage employees (CRUD)
- Allocate leave balances
- Approve/reject leave requests
- Mark attendance
- View attendance reports

### 5.4 Manager
**Access:** Team management
- View team members
- Approve/reject team leave requests
- View team attendance
- Mark attendance for team

### 5.5 Employee
**Access:** Self-service
- View own profile
- Clock in/out
- View own attendance history
- View leave balance
- Apply for leave
- View/cancel own leave requests

---

## 6. Core Features (Implemented)

### 6.1 Tenant Management (Super Admin)
✅ Create new tenant organization
✅ Auto-generate tenant slug for URL routing
✅ Create default admin user for tenant
✅ Store both hashed and plain passwords (SECURITY RISK - for super admin viewing)
✅ Seed default roles (Admin, HR, Manager, Employee) per tenant
✅ View tenant credentials (email + password)
✅ Change tenant status (Active, Inactive, Suspended, Trial)
✅ Soft delete and permanent delete
✅ Dashboard with tenant statistics

**Workflow:**
```
1. Super admin creates tenant via form
2. System generates:
   - Tenant record
   - Admin role, HR role, Manager role, Employee role
   - Default permissions for each role
   - Admin user account
   - Department, Designation, Location (optional)
3. Returns tenant credentials to super admin
4. Tenant admin can login at /{tenant-slug}/login
```

### 6.2 Employee Management (Tenant Level)
✅ Employee listing with search and filters
✅ Create new employee
✅ Edit employee details
✅ Deactivate employee (soft delete)
✅ View employee details
✅ Assign role, department, designation, location
✅ Manager hierarchy (reportingTo field)
✅ Employment type (Full-time, Part-time, Contract)

**UI Features:**
- Search by name, email, employee code
- Filter by role, department
- Pagination (20 per page)
- Modal-based create/edit forms
- Role and status badges
- Action buttons (View, Edit, Delete)

### 6.3 Attendance Management
✅ Employee self-service clock in/out
✅ Real-time clock display
✅ Automatic working hours calculation
✅ Monthly attendance history
✅ Attendance summary (Present, Absent, Leave, Total Hours)
✅ Admin/HR mark attendance for employees
✅ Multiple status types (Present, Absent, Half Day, Late, On Leave, Holiday, Weekend)
✅ Remarks and approval tracking

**Workflow:**
```
Employee:
1. Opens /attendance page
2. Sees current time + today's status
3. Clicks "Clock In" → Record created with clockIn timestamp
4. Works...
5. Clicks "Clock Out" → Record updated with clockOut timestamp
6. System calculates totalHours = (clockOut - clockIn) / 3600

Admin/HR:
1. Can mark attendance for any employee
2. Select date, user, status
3. Optionally set clock in/out times
4. Add remarks
```

### 6.4 Leave Management
✅ Leave types configuration (Casual, Sick, Earned)
✅ Leave policies (paid/unpaid, max days, carry forward, document required)
✅ Leave balance tracking per employee per year
✅ Apply for leave with date range
✅ Automatic days calculation
✅ Balance validation before application
✅ Leave request approval workflow
✅ Cancel pending requests
✅ Automatic attendance marking on approval
✅ Leave history with status filters

**Workflow:**
```
Setup (Admin/HR):
1. Create leave types (CL, SL, EL, etc.)
2. Allocate balances to employees for the year
   Example: User A → CL: 12 days, SL: 10 days

Employee Apply:
1. Select leave type
2. Select from/to dates
3. System calculates days
4. Checks if balance.availableDays >= requestedDays
5. Creates leave request with status=PENDING
6. Updates balance.pendingDays += requestedDays
7. Updates balance.availableDays -= requestedDays

Manager/HR Approval:
1. Reviews leave request
2. Approves or Rejects with comments
3. If Approved:
   - balance.pendingDays -= requestedDays
   - balance.usedDays += requestedDays
   - Create attendance records with status=ON_LEAVE for date range
4. If Rejected:
   - balance.pendingDays -= requestedDays
   - balance.availableDays += requestedDays (refund)

Employee Cancel:
1. Can cancel only PENDING requests
2. balance.pendingDays -= requestedDays
3. balance.availableDays += requestedDays (refund)
```

---

## 7. Security Considerations

### 7.1 Authentication
- JWT tokens with 8-hour expiry
- Redis-based token storage for invalidation
- Separate auth flows for super admin and tenant users
- Password hashing with bcrypt (salt rounds: 10)

### 7.2 Authorization
- Middleware-based role checking
- Tenant data isolation via tenantId in all queries
- Role-based API access control
- Frontend route guards

### 7.3 Known Security Risks
⚠️ **CRITICAL:** `plainPassword` field in User model
- Stores unencrypted passwords for super admin viewing
- Violation of security best practices
- Recommended: Remove this field or implement secure credential recovery flow

### 7.4 CORS Configuration
```javascript
// Development mode
cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
})

// Production: Should restrict to specific frontend domain
```

---

## 8. Data Flow Diagrams

### 8.1 Super Admin → Tenant Creation Flow
```
[Super Admin Login Page]
        ↓
[POST /super-admin/login]
        ↓
[JWT Token Generated] → [Stored in Redis & localStorage]
        ↓
[Super Admin Dashboard]
        ↓
[Click "Create Tenant"]
        ↓
[Fill Form: name, slug, email, admin details]
        ↓
[POST /super-admin/tenants]
        ↓
[Database Transaction]:
  1. Create Tenant record
  2. Create 4 default Roles
  3. Create default Permissions
  4. Create Admin User
  5. Hash adminPassword → password
  6. Store adminPassword → plainPassword
        ↓
[Return: tenant + adminUsers[email, plainPassword]]
        ↓
[Display Credentials Modal]
        ↓
[Super Admin shares credentials with client]
        ↓
[Client can login at /{tenant-slug}/login]
```

### 8.2 Tenant User → Employee Management Flow
```
[Tenant Login Page: /{slug}/login]
        ↓
[POST /tenant/login {email, password, tenant: slug}]
        ↓
[Find Tenant by slug] → [Find User in Tenant]
        ↓
[JWT Token with tenantId, userId, role]
        ↓
[Navigate to /{slug}/employees]
        ↓
[GET /tenant/users?tenantId=X] (auto-injected by middleware)
        ↓
[Display Employee Table]
        ↓
[Click "Add Employee"]
        ↓
[POST /tenant/users {employee data}]
        ↓
[Database: Create User with tenantId]
        ↓
[Refresh Table]
```

### 8.3 Employee → Attendance Flow
```
[Employee Dashboard: /{slug}/attendance]
        ↓
[Real-time Clock Display (setInterval 1s)]
        ↓
[Check Today's Attendance Record]
        ↓
IF no record or no clockIn:
  [Show "Clock In" button]
        ↓
  [POST /attendance/clock-in]
        ↓
  [Create/Update Attendance: {date: today, clockIn: now, status: PRESENT}]
        ↓
ELSE IF clockIn exists but no clockOut:
  [Show "Clock Out" button]
        ↓
  [POST /attendance/clock-out]
        ↓
  [Update Attendance: {clockOut: now, totalHours: calculated}]
        ↓
[Display Today's Summary + Monthly History]
```

### 8.4 Employee → Leave Request Flow
```
[Employee Dashboard: /{slug}/leave]
        ↓
[GET /leave/my-balance] → Display balance cards
        ↓
[Click "Apply Leave"]
        ↓
[Select Leave Type] → Show available balance
        ↓
[Select From Date, To Date] → Auto-calculate days
        ↓
[Enter Reason (min 10 chars)]
        ↓
[POST /leave/apply]
        ↓
[Backend Validation]:
  1. Check balance.availableDays >= totalDays
  2. If insufficient → Return error
        ↓
[Database Transaction]:
  1. Create LeaveRequest {status: PENDING}
  2. Update LeaveBalance:
     - pendingDays += totalDays
     - availableDays -= totalDays
        ↓
[Success Message + Refresh Requests Table]
        ↓
[Manager/HR receives notification (future feature)]
        ↓
[Manager Reviews at /leave/requests]
        ↓
[PATCH /leave/requests/:id/review {status: APPROVED/REJECTED}]
        ↓
IF APPROVED:
  [Transaction]:
    1. Update LeaveRequest {status: APPROVED, reviewedBy, reviewedAt}
    2. Update LeaveBalance:
       - pendingDays -= totalDays
       - usedDays += totalDays
    3. Create Attendance records for date range {status: ON_LEAVE}
        ↓
IF REJECTED:
  [Transaction]:
    1. Update LeaveRequest {status: REJECTED}
    2. Update LeaveBalance:
       - pendingDays -= totalDays
       - availableDays += totalDays (refund)
```

---

## 9. File Structure

### Backend Structure
```
hrms-backend/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.js                    # Seed super admin + permissions
│   └── migrations/                # Migration history
│
├── shared/
│   ├── config/
│   │   ├── database.js            # Prisma client singleton
│   │   └── redis.js               # Redis client
│   ├── middlewares/
│   │   ├── superAdmin.middleware.js
│   │   ├── tenant.middleware.js
│   │   └── validate.middleware.js
│   ├── utilities/
│   │   └── password.js            # bcrypt helpers
│   └── helpers/
│       └── asyncHandler.js        # Error wrapper
│
├── web/
│   ├── super-admin/
│   │   ├── index.js               # Controllers
│   │   ├── routes.js              # Route definitions
│   │   └── schema.js              # Joi validation schemas
│   ├── tenant/
│   │   ├── index.js
│   │   ├── routes.js
│   │   └── schema.js
│   ├── attendance/
│   │   ├── index.js
│   │   ├── routes.js
│   │   └── schema.js
│   ├── leave/
│   │   ├── index.js
│   │   ├── routes.js
│   │   └── schema.js
│   ├── routes/
│   │   └── index.js               # Main route aggregator
│   └── app.js                     # Express app setup
│
├── .env                           # Environment variables
├── server.js                      # Entry point
└── package.json
```

### Frontend Structure
```
hrms-frontend/
├── app/
│   ├── super-admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   │
│   └── [tenant]/                  # Dynamic tenant routes
│       ├── login/
│       │   └── page.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       ├── employees/
│       │   └── page.tsx
│       ├── attendance/
│       │   └── page.tsx
│       └── leave/
│           └── page.tsx
│
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx    # Shared layout with sidebar
│   └── ui/                        # Radix UI components
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       ├── card.tsx
│       ├── select.tsx
│       ├── alert.tsx
│       ├── tabs.tsx
│       └── ...
│
├── lib/
│   ├── api.ts                     # TypeScript API client
│   └── utils.ts                   # Utility functions
│
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 10. Environment Variables

### Backend (.env)
```bash
# Server
APP_PORT=9000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://neelmadhav:password@localhost:5432/hrms_db"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="8h"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# Super Admin Seed
SUPER_ADMIN_EMAIL="admin@mavihrms.com"
SUPER_ADMIN_PASSWORD="admin123"
SUPER_ADMIN_NAME="Super Admin"
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:9000/api/v1
```

---

## 11. Future Modules (Planned - 21 Total Modules)

### Phase 3: Payroll Management
- Salary structures
- Pay slips generation
- Tax calculations
- Bonus and incentives
- Payment processing integration

### Phase 4: Recruitment
- Job postings
- Applicant tracking system (ATS)
- Resume parsing
- Interview scheduling
- Candidate evaluation

### Phase 5: Performance Management
- Goal setting (OKRs/KPIs)
- Performance reviews
- 360-degree feedback
- Appraisal cycles
- Performance improvement plans

### Phase 6: Training & Development
- Training programs
- Course management
- Skill tracking
- Certifications
- Learning paths

### Phase 7: Asset Management
- Asset allocation
- Asset tracking
- Return/handover process
- Maintenance logs

### Phase 8: Time Tracking
- Project time tracking
- Billable/non-billable hours
- Timesheet approvals
- Client billing integration

### Phase 9: Expense Management
- Expense claims
- Approval workflows
- Reimbursement processing
- Policy compliance

### Phase 10: Document Management
- Document repository
- Document templates
- E-signatures
- Version control

### Phase 11: Reports & Analytics
- Attendance reports
- Leave reports
- Payroll reports
- Turnover analysis
- Headcount analytics
- Custom report builder

### Phase 12: Notifications & Alerts
- Email notifications
- In-app notifications
- SMS alerts
- Birthday/anniversary reminders
- Leave approval alerts

---

## 12. Technical Specifications

### 12.1 Performance Requirements
- API response time: < 500ms (95th percentile)
- Page load time: < 2s
- Database query optimization with proper indexing
- Redis caching for frequently accessed data
- Pagination for all list endpoints

### 12.2 Scalability Considerations
- Horizontal scaling capability
- Database connection pooling
- Redis for session management
- CDN for static assets (future)
- Load balancer support (future)

### 12.3 Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 12.4 Mobile Responsiveness
- Fully responsive design using Tailwind CSS
- Mobile-first approach
- Touch-friendly UI elements

---

## 13. Deployment Architecture (Production Ready)

### 13.1 Infrastructure
```
[Load Balancer]
      ↓
[Next.js Frontend] (Vercel/AWS)
      ↓
[Express Backend] (AWS EC2 / ECS)
      ↓
[PostgreSQL] (AWS RDS)
      ↓
[Redis] (AWS ElastiCache)
```

### 13.2 CI/CD Pipeline (Recommended)
```
GitHub → GitHub Actions → Docker Build → AWS ECR → AWS ECS
```

### 13.3 Monitoring (Future)
- Application monitoring: New Relic / Datadog
- Error tracking: Sentry
- Log aggregation: CloudWatch / ELK Stack
- Uptime monitoring: Pingdom / UptimeRobot

---

## 14. API Response Standards

### Success Response
```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "message": "Operation successful" // optional
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ // optional, for validation errors
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

## 15. Testing Strategy (Recommended)

### Backend Testing
- Unit tests: Jest
- Integration tests: Supertest
- Database tests: Separate test database
- Coverage target: 80%+

### Frontend Testing
- Component tests: React Testing Library
- E2E tests: Playwright / Cypress
- Visual regression: Chromatic

---

## 16. Known Issues & Technical Debt

1. **Security Risk:** Plain password storage in `User.plainPassword` field
2. **No audit logs:** Need to implement change tracking
3. **No soft delete timestamps:** Consider adding `deletedAt` field
4. **No email notifications:** Leave approvals, password resets
5. **No password reset flow:** Users cannot reset passwords
6. **No profile picture upload:** Avatar management needed
7. **No bulk operations:** Bulk employee import, bulk attendance marking
8. **No export functionality:** Export to Excel/PDF
9. **CORS wide open:** Restrict in production

---

## 17. Glossary

| Term | Definition |
|------|------------|
| **Tenant** | A separate organization/company using the HRMS |
| **Tenant Slug** | URL-friendly identifier for tenant (e.g., "acme-corp") |
| **Multi-tenant** | Single application serving multiple isolated tenants |
| **RBAC** | Role-Based Access Control |
| **ORM** | Object-Relational Mapping (Prisma) |
| **JWT** | JSON Web Token for authentication |
| **Soft Delete** | Mark as deleted without removing from database |
| **Hard Delete** | Permanent removal from database |
| **Self-service** | Employee actions without admin intervention |

---

## 18. Contact & Support

**Developer:** Karan Shergill
**Repository:** Private
**Documentation:** This PRD
**API Docs:** To be generated with Swagger/OpenAPI

---

**End of PRD**

This document is intended for technical architecture visualization and should be updated as the project evolves.
