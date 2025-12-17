# Mavi HRMS - Development Plan

## Current Status

### Implemented Modules
- [x] **Super Admin Portal** - Tenant management, dashboard, login
- [x] **Tenant Authentication** - Login, logout, session management
- [x] **Employee Management** - CRUD, search, filters, detail view
- [x] **Attendance Management** - Clock in/out, history, summary
- [x] **Leave Management** - Apply, balance, requests, approve/reject
- [x] **Settings Page** - Basic profile and preferences
- [x] **Password Reset** - Email-based password recovery (TICKET-002)
- [x] **Profile Picture Upload** - Avatar management (TICKET-003)
- [x] **Bulk Operations** - CSV import/export, bulk attendance (TICKET-004)
- [x] **Export to Excel/PDF** - Employee/attendance/leave reports (TICKET-005)

### Database Models Implemented
- SuperAdmin, Tenant, User, Role, Permission, RolePermission
- Department, Designation, Location
- Attendance, LeaveType, LeaveBalance, LeaveRequest
- PasswordResetToken (TICKET-002)

### Next Ticket: TICKET-006 (Department Management)

---

## Phase 1: Core Infrastructure & Technical Debt

### TICKET-001: Audit Log System
**Priority:** High | **Effort:** 5 days | **Type:** Backend + Frontend

**Description:** Implement comprehensive audit logging for all CRUD operations.

**Backend Tasks:**
- [ ] Create `AuditLog` model in Prisma schema
  ```prisma
  model AuditLog {
    id          Int      @id @default(autoincrement())
    tenantId    Int?
    userId      Int?
    action      String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity      String   // User, Attendance, LeaveRequest, etc.
    entityId    Int?
    oldValue    Json?
    newValue    Json?
    ipAddress   String?
    userAgent   String?
    createdAt   DateTime @default(now())
  }
  ```
- [ ] Create audit middleware to automatically log changes
- [ ] Add audit API endpoints: `GET /audit-logs`, `GET /audit-logs/:entityType/:entityId`

**Frontend Tasks:**
- [ ] Create `/[tenant]/audit-logs/page.tsx` - Audit log viewer
- [ ] Add filters: date range, user, action type, entity type
- [ ] Add audit trail tab to employee detail page

**Acceptance Criteria:**
- All CRUD operations are logged with before/after values
- Admin/HR can view audit logs with filtering
- Audit logs are tenant-isolated

---

### TICKET-002: Password Reset Flow [COMPLETED]
**Priority:** High | **Effort:** 3 days | **Type:** Full Stack

**Description:** Allow users to reset forgotten passwords via email.

**Backend Tasks:**
- [x] Create `PasswordResetToken` model
  ```prisma
  model PasswordResetToken {
    id        Int      @id @default(autoincrement())
    userId    Int
    token     String   @unique
    expiresAt DateTime
    usedAt    DateTime?
    createdAt DateTime @default(now())
  }
  ```
- [x] Add endpoints:
  - `POST /tenant/forgot-password` - Send reset email
  - `POST /tenant/reset-password` - Reset with token
  - `POST /tenant/verify-reset-token` - Validate token
- [x] Integrate email service (SendGrid/Nodemailer)
- [x] Generate secure tokens with 1-hour expiry

**Frontend Tasks:**
- [x] Create `/[tenant]/forgot-password/page.tsx`
- [x] Create `/[tenant]/reset-password/page.tsx`
- [x] Add "Forgot Password?" link to login page

**Acceptance Criteria:**
- [x] Users can request password reset via email
- [x] Reset links expire after 1 hour
- [x] Users can set new password with valid token
- [x] Old tokens are invalidated after use

---

### TICKET-003: Profile Picture Upload [COMPLETED]
**Priority:** Medium | **Effort:** 3 days | **Type:** Full Stack

**Description:** Allow users to upload and manage profile avatars.

**Backend Tasks:**
- [x] Set up file upload with Multer
- [x] Create `/uploads/avatars` directory structure
- [x] Add endpoints:
  - `POST /tenant/profile/avatar` - Upload avatar
  - `DELETE /tenant/profile/avatar` - Remove avatar
- [x] Add image validation (type, size ≤2MB, dimensions)
- [ ] Generate thumbnails (optional)

**Frontend Tasks:**
- [x] Add avatar upload component in Settings page
- [x] Add avatar display in header and employee list
- [ ] Add crop/preview before upload
- [x] Show loading state during upload

**Acceptance Criteria:**
- [x] Users can upload JPG/PNG images up to 2MB
- [x] Avatar displays in sidebar, header, and employee cards
- [x] Default avatar shown when no image uploaded

---

### TICKET-004: Bulk Operations [COMPLETED]
**Priority:** Medium | **Effort:** 4 days | **Type:** Full Stack

**Description:** Enable bulk import/export of employees and bulk attendance marking.

**Backend Tasks:**
- [x] Add endpoints:
  - `POST /tenant/users/bulk-import` - CSV/Excel import
  - `GET /tenant/users/export` - Export to CSV/Excel
  - `POST /attendance/bulk-mark` - Bulk mark attendance
- [x] Create CSV parser with validation
- [x] Add template download endpoints
- [x] Handle partial failures with error report

**Frontend Tasks:**
- [x] Add "Import Employees" button with file upload
- [x] Add "Export" button to employee list
- [x] Create bulk attendance marking modal
- [x] Show import progress and error summary

**Acceptance Criteria:**
- [x] Import 100+ employees via CSV in single operation
- [x] Export all employees with filters to CSV
- [x] Mark attendance for multiple employees at once
- [x] Clear error messages for invalid rows

---

### TICKET-005: Export to Excel/PDF [COMPLETED]
**Priority:** Medium | **Effort:** 3 days | **Type:** Backend + Frontend

**Description:** Add export functionality for reports and lists.

**Backend Tasks:**
- [x] Integrate `exceljs` for Excel generation
- [x] Integrate `puppeteer` or `pdfkit` for PDF generation
- [x] Add export endpoints for:
  - Employee list
  - Attendance reports
  - Leave reports
- [x] Add date range and filter parameters

**Frontend Tasks:**
- [x] Add export dropdown (Excel/PDF) to all list pages
- [x] Show export progress indicator
- [x] Handle large exports with async download

**Acceptance Criteria:**
- [x] Export employee list to Excel with all columns
- [x] Export attendance report with date range filter
- [x] Export leave report by employee/department
- [x] PDF reports have proper formatting and branding

---

## Phase 2: Organization Management

### TICKET-006: Department Management
**Priority:** High | **Effort:** 3 days | **Type:** Full Stack

**Description:** Full CRUD for departments with hierarchy support.

**Backend Tasks:**
- [ ] Add department endpoints:
  - `GET /tenant/departments` - List with hierarchy
  - `POST /tenant/departments` - Create
  - `PATCH /tenant/departments/:id` - Update
  - `DELETE /tenant/departments/:id` - Delete
- [ ] Add department head assignment
- [ ] Support parent-child hierarchy

**Frontend Tasks:**
- [ ] Create `/[tenant]/settings/departments/page.tsx`
- [ ] Add department tree view component
- [ ] Add create/edit department modal
- [ ] Add department head selection

**Acceptance Criteria:**
- Create departments with optional parent
- Assign department head from employees
- View department hierarchy as tree
- Prevent deletion if employees assigned

---

### TICKET-007: Designation Management
**Priority:** High | **Effort:** 2 days | **Type:** Full Stack

**Description:** Full CRUD for designations with grade levels.

**Backend Tasks:**
- [ ] Add designation endpoints:
  - `GET /tenant/designations` - List
  - `POST /tenant/designations` - Create
  - `PATCH /tenant/designations/:id` - Update
  - `DELETE /tenant/designations/:id` - Delete

**Frontend Tasks:**
- [ ] Create `/[tenant]/settings/designations/page.tsx`
- [ ] Add designation list with level badges
- [ ] Add create/edit designation modal

**Acceptance Criteria:**
- Create designations with name, code, level
- Sort by level for hierarchy view
- Prevent deletion if employees assigned

---

### TICKET-008: Location Management
**Priority:** Medium | **Effort:** 2 days | **Type:** Full Stack

**Description:** Full CRUD for office locations.

**Backend Tasks:**
- [ ] Add location endpoints:
  - `GET /tenant/locations` - List
  - `POST /tenant/locations` - Create
  - `PATCH /tenant/locations/:id` - Update
  - `DELETE /tenant/locations/:id` - Delete

**Frontend Tasks:**
- [ ] Create `/[tenant]/settings/locations/page.tsx`
- [ ] Add location list with address display
- [ ] Add create/edit location modal with address fields

**Acceptance Criteria:**
- Create locations with full address
- Display locations on map (optional)
- Prevent deletion if employees assigned

---

### TICKET-009: Role & Permission Management
**Priority:** High | **Effort:** 4 days | **Type:** Full Stack

**Description:** Custom role creation and permission assignment.

**Backend Tasks:**
- [ ] Add role management endpoints:
  - `GET /tenant/roles` - List with permissions
  - `POST /tenant/roles` - Create custom role
  - `PATCH /tenant/roles/:id` - Update
  - `PATCH /tenant/roles/:id/permissions` - Update permissions
  - `DELETE /tenant/roles/:id` - Delete
- [ ] Seed default permissions for all modules
- [ ] Implement permission checking middleware

**Frontend Tasks:**
- [ ] Create `/[tenant]/settings/roles/page.tsx`
- [ ] Add role list with permission count
- [ ] Add permission matrix editor (module × action)
- [ ] Visual permission toggle interface

**Acceptance Criteria:**
- Create custom roles beyond default 4
- Assign granular permissions per module
- System roles (Admin, HR, Manager, Employee) protected
- Permission changes take effect immediately

---

## Phase 3: Payroll Management

### TICKET-010: Salary Structure Setup
**Priority:** High | **Effort:** 5 days | **Type:** Full Stack

**Database Models:**
```prisma
model SalaryComponent {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String   // Basic, HRA, DA, Medical, etc.
  code        String
  type        String   // EARNING, DEDUCTION, REIMBURSEMENT
  isTaxable   Boolean  @default(true)
  isFixed     Boolean  @default(true) // vs percentage
  isActive    Boolean  @default(true)
}

model SalaryStructure {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  basicSalary Float
  effectiveFrom DateTime
  effectiveTo   DateTime?
  components  SalaryStructureComponent[]
}

model SalaryStructureComponent {
  id                Int      @id @default(autoincrement())
  salaryStructureId Int
  componentId       Int
  amount            Float?   // Fixed amount
  percentage        Float?   // Percentage of basic
}
```

**Backend Tasks:**
- [ ] Create salary component endpoints (CRUD)
- [ ] Create salary structure endpoints
- [ ] Add employee salary assignment
- [ ] Calculate CTC, gross, net salary

**Frontend Tasks:**
- [ ] Create `/[tenant]/payroll/setup/page.tsx`
- [ ] Add salary component management
- [ ] Add salary structure assignment modal
- [ ] Show salary breakdown preview

---

### TICKET-011: Pay Slip Generation
**Priority:** High | **Effort:** 5 days | **Type:** Full Stack

**Database Models:**
```prisma
model Payslip {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  month       Int
  year        Int
  basicSalary Float
  grossSalary Float
  totalDeductions Float
  netSalary   Float
  status      String   // DRAFT, PROCESSED, PAID
  paidAt      DateTime?
  pdfUrl      String?
  components  PayslipComponent[]
}

model PayslipComponent {
  id          Int      @id @default(autoincrement())
  payslipId   Int
  componentName String
  componentType String
  amount      Float
}
```

**Backend Tasks:**
- [ ] Create payslip generation endpoint
- [ ] Calculate salary based on attendance, leaves
- [ ] Generate PDF payslip with template
- [ ] Add payslip listing and filtering

**Frontend Tasks:**
- [ ] Create `/[tenant]/payroll/payslips/page.tsx`
- [ ] Add monthly payslip generation wizard
- [ ] Add payslip preview and download
- [ ] Employee self-service payslip view

---

### TICKET-012: Tax Calculation
**Priority:** Medium | **Effort:** 4 days | **Type:** Backend

**Description:** Implement Indian tax regime calculations.

**Backend Tasks:**
- [ ] Create tax slab configuration
- [ ] Implement old vs new tax regime
- [ ] Calculate TDS based on salary
- [ ] Generate Form 16 data
- [ ] Add tax declaration endpoints

**Frontend Tasks:**
- [ ] Create tax declaration form for employees
- [ ] Show tax projection
- [ ] Display Form 16 summary

---

## Phase 4: Recruitment

### TICKET-013: Job Posting Management
**Priority:** Medium | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model JobPosting {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  title           String
  departmentId    Int?
  designationId   Int?
  locationId      Int?
  description     String   @db.Text
  requirements    String   @db.Text
  experience      String   // 0-2 years, 3-5 years, etc.
  salaryRange     String?
  employmentType  String   // FULL_TIME, PART_TIME, CONTRACT
  status          String   // DRAFT, ACTIVE, CLOSED
  postedAt        DateTime?
  closingDate     DateTime?
  applications    JobApplication[]
}
```

**Backend Tasks:**
- [ ] Create job posting CRUD endpoints
- [ ] Add job status management
- [ ] Public job listing API

**Frontend Tasks:**
- [ ] Create `/[tenant]/recruitment/jobs/page.tsx`
- [ ] Add job posting form
- [ ] Add job listing with status filters

---

### TICKET-014: Applicant Tracking System (ATS)
**Priority:** Medium | **Effort:** 6 days | **Type:** Full Stack

**Database Models:**
```prisma
model JobApplication {
  id            Int      @id @default(autoincrement())
  tenantId      Int
  jobPostingId  Int
  name          String
  email         String
  phone         String
  resumeUrl     String
  coverLetter   String?  @db.Text
  status        String   // NEW, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED
  currentStage  String
  rating        Int?     // 1-5
  notes         String?  @db.Text
  appliedAt     DateTime @default(now())
  interviews    Interview[]
}

model Interview {
  id              Int      @id @default(autoincrement())
  applicationId   Int
  scheduledAt     DateTime
  interviewerId   Int      // User ID
  type            String   // PHONE, VIDEO, IN_PERSON
  status          String   // SCHEDULED, COMPLETED, CANCELLED
  feedback        String?  @db.Text
  rating          Int?
}
```

**Backend Tasks:**
- [ ] Create application submission endpoint
- [ ] Add application status workflow
- [ ] Add interview scheduling endpoints
- [ ] Add candidate evaluation endpoints

**Frontend Tasks:**
- [ ] Create `/[tenant]/recruitment/applications/page.tsx`
- [ ] Add Kanban board for application stages
- [ ] Add interview scheduling modal
- [ ] Add candidate profile view

---

## Phase 5: Performance Management

### TICKET-015: Goal Setting (OKRs/KPIs)
**Priority:** Medium | **Effort:** 5 days | **Type:** Full Stack

**Database Models:**
```prisma
model Goal {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  title       String
  description String?  @db.Text
  type        String   // INDIVIDUAL, TEAM, COMPANY
  category    String   // OKR, KPI
  targetValue Float?
  currentValue Float?
  unit        String?  // %, $, count
  startDate   DateTime
  dueDate     DateTime
  status      String   // NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED
  progress    Float    @default(0) // 0-100
  parentId    Int?     // For cascading goals
  keyResults  KeyResult[]
}

model KeyResult {
  id          Int      @id @default(autoincrement())
  goalId      Int
  title       String
  targetValue Float
  currentValue Float   @default(0)
  unit        String?
  status      String
}
```

**Backend Tasks:**
- [ ] Create goal CRUD endpoints
- [ ] Add goal hierarchy (company → team → individual)
- [ ] Add progress update endpoints
- [ ] Calculate roll-up progress

**Frontend Tasks:**
- [ ] Create `/[tenant]/performance/goals/page.tsx`
- [ ] Add goal creation wizard
- [ ] Add goal tree visualization
- [ ] Add progress tracking UI

---

### TICKET-016: Performance Reviews
**Priority:** Medium | **Effort:** 6 days | **Type:** Full Stack

**Database Models:**
```prisma
model ReviewCycle {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String   // Q1 2025, Annual 2025
  startDate   DateTime
  endDate     DateTime
  status      String   // SETUP, IN_PROGRESS, COMPLETED
  reviews     PerformanceReview[]
}

model PerformanceReview {
  id            Int      @id @default(autoincrement())
  cycleId       Int
  employeeId    Int
  reviewerId    Int
  status        String   // PENDING, SELF_REVIEW, MANAGER_REVIEW, COMPLETED
  selfRating    Float?
  managerRating Float?
  finalRating   Float?
  strengths     String?  @db.Text
  improvements  String?  @db.Text
  comments      String?  @db.Text
  responses     ReviewResponse[]
}

model ReviewQuestion {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  question    String
  category    String   // COMPETENCY, BEHAVIOR, GOALS
  type        String   // RATING, TEXT, MULTIPLE_CHOICE
  isRequired  Boolean  @default(true)
  order       Int
}

model ReviewResponse {
  id          Int      @id @default(autoincrement())
  reviewId    Int
  questionId  Int
  rating      Int?
  response    String?  @db.Text
  respondentType String // SELF, MANAGER, PEER
}
```

**Backend Tasks:**
- [ ] Create review cycle management
- [ ] Add review assignment
- [ ] Add self-review submission
- [ ] Add manager review and rating
- [ ] Calculate final ratings

**Frontend Tasks:**
- [ ] Create `/[tenant]/performance/reviews/page.tsx`
- [ ] Add review cycle setup wizard
- [ ] Add review form with questions
- [ ] Add review summary dashboard

---

## Phase 6: Training & Development

### TICKET-017: Training Program Management
**Priority:** Low | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model TrainingProgram {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String
  description String?  @db.Text
  type        String   // INTERNAL, EXTERNAL, ONLINE
  duration    Int      // hours
  startDate   DateTime
  endDate     DateTime
  trainerId   Int?     // Internal trainer
  externalTrainer String?
  maxParticipants Int?
  status      String   // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
  enrollments TrainingEnrollment[]
}

model TrainingEnrollment {
  id            Int      @id @default(autoincrement())
  programId     Int
  userId        Int
  status        String   // ENROLLED, COMPLETED, DROPPED
  completedAt   DateTime?
  score         Float?
  feedback      String?  @db.Text
  certificateUrl String?
}
```

**Backend Tasks:**
- [ ] Create training program CRUD
- [ ] Add enrollment endpoints
- [ ] Track completion and scores
- [ ] Generate certificates

**Frontend Tasks:**
- [ ] Create `/[tenant]/training/page.tsx`
- [ ] Add training calendar view
- [ ] Add enrollment management
- [ ] Employee training history

---

### TICKET-018: Skill Matrix
**Priority:** Low | **Effort:** 3 days | **Type:** Full Stack

**Database Models:**
```prisma
model Skill {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String
  category    String   // TECHNICAL, SOFT, DOMAIN
  description String?
}

model EmployeeSkill {
  id          Int      @id @default(autoincrement())
  userId      Int
  skillId     Int
  level       Int      // 1-5
  certifiedAt DateTime?
  certifiedBy Int?     // Manager who verified
}
```

**Backend Tasks:**
- [ ] Create skill management endpoints
- [ ] Add employee skill assignment
- [ ] Skill gap analysis

**Frontend Tasks:**
- [ ] Create `/[tenant]/training/skills/page.tsx`
- [ ] Add skill matrix grid view
- [ ] Add skill assignment modal

---

## Phase 7: Asset Management

### TICKET-019: Asset Tracking
**Priority:** Low | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model Asset {
  id            Int      @id @default(autoincrement())
  tenantId      Int
  name          String
  assetCode     String   @unique
  category      String   // LAPTOP, PHONE, FURNITURE, etc.
  brand         String?
  model         String?
  serialNumber  String?
  purchaseDate  DateTime?
  purchasePrice Float?
  warrantyEnd   DateTime?
  status        String   // AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED
  currentUserId Int?
  locationId    Int?
  allocations   AssetAllocation[]
}

model AssetAllocation {
  id          Int      @id @default(autoincrement())
  assetId     Int
  userId      Int
  allocatedAt DateTime
  returnedAt  DateTime?
  condition   String?  // GOOD, DAMAGED
  notes       String?
}
```

**Backend Tasks:**
- [ ] Create asset CRUD endpoints
- [ ] Add allocation/return endpoints
- [ ] Track asset history
- [ ] Asset condition updates

**Frontend Tasks:**
- [ ] Create `/[tenant]/assets/page.tsx`
- [ ] Add asset inventory list
- [ ] Add allocation modal
- [ ] Employee asset view

---

## Phase 8: Time Tracking

### TICKET-020: Project Time Tracking
**Priority:** Medium | **Effort:** 5 days | **Type:** Full Stack

**Database Models:**
```prisma
model Project {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String
  code        String
  clientName  String?
  startDate   DateTime
  endDate     DateTime?
  status      String   // ACTIVE, COMPLETED, ON_HOLD
  budgetHours Float?
  members     ProjectMember[]
  timeLogs    TimeLog[]
}

model ProjectMember {
  id          Int      @id @default(autoincrement())
  projectId   Int
  userId      Int
  role        String   // LEAD, MEMBER
  hourlyRate  Float?   // For billing
}

model TimeLog {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  projectId   Int?
  date        DateTime @db.Date
  hours       Float
  description String?
  isBillable  Boolean  @default(true)
  status      String   // DRAFT, SUBMITTED, APPROVED
  approvedBy  Int?
}
```

**Backend Tasks:**
- [ ] Create project management endpoints
- [ ] Add time log CRUD
- [ ] Weekly timesheet submission
- [ ] Timesheet approval workflow

**Frontend Tasks:**
- [ ] Create `/[tenant]/timesheet/page.tsx`
- [ ] Add weekly timesheet grid
- [ ] Add project selection
- [ ] Manager approval view

---

## Phase 9: Expense Management

### TICKET-021: Expense Claims
**Priority:** Medium | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model ExpenseCategory {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String   // Travel, Food, Accommodation
  maxLimit    Float?   // Per claim limit
  requiresReceipt Boolean @default(true)
}

model ExpenseClaim {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  categoryId  Int
  amount      Float
  currency    String   @default("INR")
  date        DateTime
  description String
  receiptUrl  String?
  status      String   // PENDING, APPROVED, REJECTED, REIMBURSED
  approvedBy  Int?
  approvedAt  DateTime?
  reimbursedAt DateTime?
}
```

**Backend Tasks:**
- [ ] Create expense category management
- [ ] Add expense claim submission
- [ ] Receipt upload
- [ ] Approval workflow

**Frontend Tasks:**
- [ ] Create `/[tenant]/expenses/page.tsx`
- [ ] Add expense claim form
- [ ] Receipt capture/upload
- [ ] Approval queue for managers

---

## Phase 10: Document Management

### TICKET-022: Document Repository
**Priority:** Low | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model Document {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String
  type        String   // POLICY, TEMPLATE, CONTRACT, CERTIFICATE
  category    String
  fileUrl     String
  fileSize    Int
  mimeType    String
  uploadedBy  Int
  isPublic    Boolean  @default(false) // Visible to all employees
  version     Int      @default(1)
  parentId    Int?     // For versioning
  createdAt   DateTime @default(now())
}

model EmployeeDocument {
  id          Int      @id @default(autoincrement())
  userId      Int
  documentType String  // RESUME, ID_PROOF, ADDRESS_PROOF, CERTIFICATE
  name        String
  fileUrl     String
  expiryDate  DateTime?
  verifiedBy  Int?
  verifiedAt  DateTime?
}
```

**Backend Tasks:**
- [ ] Create document upload endpoints
- [ ] Add folder/category structure
- [ ] Version control
- [ ] Access control

**Frontend Tasks:**
- [ ] Create `/[tenant]/documents/page.tsx`
- [ ] Add document browser
- [ ] Add upload with drag-drop
- [ ] Employee document management

---

## Phase 11: Reports & Analytics

### TICKET-023: Reports Dashboard
**Priority:** High | **Effort:** 5 days | **Type:** Full Stack

**Description:** Comprehensive reporting system with visualizations.

**Reports to Build:**
- [ ] Headcount Report (by department, designation, location)
- [ ] Attendance Report (daily, monthly, summary)
- [ ] Leave Report (by type, employee, department)
- [ ] Payroll Report (salary distribution, tax summary)
- [ ] Turnover Report (joins, exits, retention rate)

**Backend Tasks:**
- [ ] Create report generation endpoints
- [ ] Add date range filtering
- [ ] Department/location filtering
- [ ] Export to Excel/PDF

**Frontend Tasks:**
- [ ] Create `/[tenant]/reports/page.tsx`
- [ ] Add report selection sidebar
- [ ] Add date range picker
- [ ] Add charts (bar, pie, line)
- [ ] Add data tables with export

---

### TICKET-024: Analytics Dashboard
**Priority:** Medium | **Effort:** 4 days | **Type:** Frontend Heavy

**Description:** Real-time analytics with key HR metrics.

**Metrics to Display:**
- Employee count trends
- Attendance rate
- Leave utilization
- Department distribution
- Gender diversity
- Average tenure
- Training completion rate

**Frontend Tasks:**
- [ ] Enhance dashboard with analytics widgets
- [ ] Add chart.js or recharts integration
- [ ] Add drill-down capabilities
- [ ] Add comparison views (MoM, YoY)

---

## Phase 12: Notifications & Alerts

### TICKET-025: In-App Notifications
**Priority:** High | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model Notification {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  type        String   // LEAVE_REQUEST, LEAVE_APPROVED, BIRTHDAY, etc.
  title       String
  message     String
  link        String?  // URL to navigate
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

**Backend Tasks:**
- [ ] Create notification service
- [ ] Add notification endpoints (list, mark read)
- [ ] Trigger notifications on events
- [ ] Add WebSocket for real-time (optional)

**Frontend Tasks:**
- [ ] Add notification bell icon in header
- [ ] Add notification dropdown
- [ ] Add notification badge count
- [ ] Mark as read on click

---

### TICKET-026: Email Notifications
**Priority:** High | **Effort:** 3 days | **Type:** Backend

**Description:** Send email notifications for important events.

**Email Triggers:**
- Leave request submitted
- Leave approved/rejected
- Password reset
- Birthday/anniversary reminders
- Performance review due
- Asset allocation

**Backend Tasks:**
- [ ] Set up email service (SendGrid/SES)
- [ ] Create email templates (HTML)
- [ ] Add email queue with retry
- [ ] Add email preferences per user

---

### TICKET-027: Birthday & Anniversary Alerts
**Priority:** Low | **Effort:** 2 days | **Type:** Backend + Frontend

**Backend Tasks:**
- [ ] Create daily cron job for birthday check
- [ ] Create cron job for work anniversary
- [ ] Send notifications to relevant users

**Frontend Tasks:**
- [ ] Add birthday widget on dashboard
- [ ] Add anniversary celebrations banner

---

## Implementation Priority Matrix

| Priority | Tickets | Estimated Effort |
|----------|---------|------------------|
| **Critical** | TICKET-001, 002, 025, 026 | 15 days |
| **High** | TICKET-006, 007, 009, 010, 011, 023 | 24 days |
| **Medium** | TICKET-003, 004, 005, 008, 012, 015, 016, 020, 021, 024 | 40 days |
| **Low** | TICKET-013, 014, 017, 018, 019, 022, 027 | 27 days |

**Total Estimated Effort:** ~106 days (5+ months for single developer)

---

## Recommended Implementation Order

### Sprint 1-2: Core Infrastructure (2 weeks)
1. TICKET-001: Audit Log System
2. TICKET-002: Password Reset Flow
3. TICKET-025: In-App Notifications

### Sprint 3-4: Organization Management (2 weeks)
4. TICKET-006: Department Management
5. TICKET-007: Designation Management
6. TICKET-008: Location Management
7. TICKET-009: Role & Permission Management

### Sprint 5-6: Payroll Foundation (2 weeks)
8. TICKET-010: Salary Structure Setup
9. TICKET-011: Pay Slip Generation
10. TICKET-012: Tax Calculation

### Sprint 7-8: Reports & Analytics (2 weeks)
11. TICKET-023: Reports Dashboard
12. TICKET-024: Analytics Dashboard
13. TICKET-005: Export to Excel/PDF

### Sprint 9-10: User Experience (2 weeks)
14. TICKET-003: Profile Picture Upload
15. TICKET-004: Bulk Operations
16. TICKET-026: Email Notifications

### Sprint 11-14: Advanced Modules (4 weeks)
17. TICKET-015: Goal Setting
18. TICKET-016: Performance Reviews
19. TICKET-020: Project Time Tracking
20. TICKET-021: Expense Claims

### Sprint 15-18: Additional Modules (4 weeks)
21. TICKET-013: Job Posting Management
22. TICKET-014: Applicant Tracking System
23. TICKET-017: Training Program Management
24. TICKET-018: Skill Matrix

### Sprint 19-20: Remaining Modules (2 weeks)
25. TICKET-019: Asset Tracking
26. TICKET-022: Document Repository
27. TICKET-027: Birthday & Anniversary Alerts

---

## Notes

- Each ticket should be broken into subtasks during sprint planning
- Backend and frontend work can be parallelized where possible
- All new modules should include:
  - API documentation
  - Unit tests (80% coverage)
  - E2E tests for critical flows
  - Mobile responsive design
  - Accessibility compliance (WCAG 2.1 AA)
- Consider feature flags for gradual rollout
- Update PRD after each phase completion
