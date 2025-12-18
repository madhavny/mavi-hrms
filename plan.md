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
- [x] **Department Management** - Full CRUD with hierarchy (TICKET-006)
- [x] **Designation Management** - Full CRUD with grade levels (TICKET-007)
- [x] **Location Management** - Full CRUD with address fields (TICKET-008)
- [x] **Role & Permission Management** - Custom roles, permission matrix (TICKET-009)
- [x] **Leave Type Management** - Full CRUD for leave policies
- [x] **Leave Approvals** - Manager approval interface
- [x] **Audit Log System** - Activity tracking with filters (TICKET-001)

### Database Models Implemented
- SuperAdmin, Tenant, User, Role, Permission, RolePermission
- Department, Designation, Location
- Attendance, LeaveType, LeaveBalance, LeaveRequest
- PasswordResetToken (TICKET-002)
- AuditLog (TICKET-001)
- SalaryComponent, SalaryStructure, SalaryStructureComponent (TICKET-010)
- Payslip, PayslipComponent (TICKET-011)
- TaxSlab, TaxDeclaration (TICKET-012)
- Notification (TICKET-025)
- EmailPreference (TICKET-026)
- WeeklyOffConfig, Holiday, OptionalHolidaySelection, OptionalHolidayQuota (TICKET-030)

- [x] **Payroll Module** - Salary components, structures, payslips, tax calculation (TICKET-010, 011, 012)
- [x] **Reports Dashboard** - Headcount, attendance, leave, payroll, turnover reports with charts (TICKET-023)
- [x] **Analytics Dashboard** - Employee trends, attendance rate, leave utilization, gender/department distribution, tenure, MoM/YoY comparisons (TICKET-024)
- [x] **In-App Notifications** - Bell icon, dropdown, unread count, mark as read (TICKET-025)
- [x] **Email Notifications** - Nodemailer service, HTML templates, user preferences, leave/payslip triggers (TICKET-026)
- [x] **Birthday & Anniversary Alerts** - Cron jobs for daily checks, dashboard widget, notifications (TICKET-027)
- [x] **Goal Setting (OKRs/KPIs)** - Goal CRUD, hierarchy, key results, progress tracking, roll-up calculations (TICKET-015)
- [x] **Bonus & Incentives** - Individual bonuses, incentive schemes, incentive records with approval workflows (TICKET-028)
- [x] **Custom Report Builder** - Drag-drop report designer with 10 data sources, filters, charts (TICKET-029)
- [x] **Holiday Management** - Weekly off patterns, fixed/optional holidays, bulk import, leave integration (TICKET-030)

---

## Phase 1: Core Infrastructure & Technical Debt

### TICKET-001: Audit Log System [COMPLETED]
**Priority:** High | **Effort:** 5 days | **Type:** Backend + Frontend

**Description:** Implement comprehensive audit logging for all CRUD operations.

**Backend Tasks:**
- [x] Create `AuditLog` model in Prisma schema
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
- [x] Create audit utility with logging functions (`/shared/utilities/audit.js`)
- [x] Add audit API endpoints:
  - `GET /tenant/audit` - List with filters
  - `GET /tenant/audit/stats` - Statistics
  - `GET /tenant/audit/entity-types` - Available entities
  - `GET /tenant/audit/actions` - Available actions
  - `GET /tenant/audit/:id` - Detail view
  - `GET /tenant/audit/user/:userId` - User activity
  - `GET /tenant/audit/entity/:entity/:entityId` - Entity history

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/audit-logs/page.tsx` - Audit log viewer
- [x] Add filters: date range, user, action type, entity type, search
- [x] Stats cards (Total Logs, Today's Activity, Active Users, Entity Types)
- [x] Action badges with color-coded icons
- [x] Detail modal with changes diff view

**Acceptance Criteria:**
- [x] All CRUD operations are logged with before/after values
- [x] Admin/HR can view audit logs with filtering
- [x] Audit logs are tenant-isolated

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

### TICKET-006: Department Management [COMPLETED]
**Priority:** High | **Effort:** 3 days | **Type:** Full Stack

**Description:** Full CRUD for departments with hierarchy support.

**Backend Tasks:**
- [x] Add department endpoints:
  - `GET /tenant/departments` - List with hierarchy (tree view)
  - `GET /tenant/departments?flat=true` - Flat list view
  - `GET /tenant/departments/:id` - Get single department
  - `POST /tenant/departments` - Create
  - `PATCH /tenant/departments/:id` - Update
  - `DELETE /tenant/departments/:id` - Delete (soft delete if has employees)
- [x] Add department head assignment
- [x] Support parent-child hierarchy
- [x] Employee count tracking

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/departments/page.tsx`
- [x] Add department tree view component with expand/collapse
- [x] Add create/edit department modal
- [x] Add department head selection
- [x] Stats cards (Total, Active, With Head, Employees)
- [x] Show/Hide inactive filter

**Acceptance Criteria:**
- [x] Create departments with optional parent
- [x] Assign department head from employees
- [x] View department hierarchy as tree
- [x] Prevent deletion if employees assigned (soft delete)

---

### TICKET-007: Designation Management [COMPLETED]
**Priority:** High | **Effort:** 2 days | **Type:** Full Stack

**Description:** Full CRUD for designations with grade levels.

**Backend Tasks:**
- [x] Add designation endpoints:
  - `GET /tenant/designations` - List with employee count
  - `GET /tenant/designations/:id` - Get single designation
  - `POST /tenant/designations` - Create
  - `PATCH /tenant/designations/:id` - Update
  - `DELETE /tenant/designations/:id` - Delete (soft delete if has employees)
- [x] Grade level support (1-100, lower = higher rank)
- [x] Code uniqueness validation per tenant

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/designations/page.tsx`
- [x] Add designation list with level badges (Executive, Senior, Mid, Junior, Entry)
- [x] Add create/edit designation modal
- [x] Stats cards (Total, Employees, Active)
- [x] Grade Level Guide legend
- [x] Sorting by level, name, employees

**Acceptance Criteria:**
- [x] Create designations with name, code, level
- [x] Sort by level for hierarchy view
- [x] Prevent deletion if employees assigned (soft delete)

---

### TICKET-008: Location Management [COMPLETED]
**Priority:** Medium | **Effort:** 2 days | **Type:** Full Stack

**Description:** Full CRUD for office locations.

**Backend Tasks:**
- [x] Add location endpoints:
  - `GET /tenant/locations` - List with employee count
  - `GET /tenant/locations/:id` - Get single location
  - `POST /tenant/locations` - Create
  - `PATCH /tenant/locations/:id` - Update
  - `DELETE /tenant/locations/:id` - Delete (soft delete if has employees)
- [x] Address fields (address, city, state, country, pincode)
- [x] Default country: India

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/locations/page.tsx`
- [x] Add location list with address display
- [x] Add create/edit location modal with address fields
- [x] Stats cards (Total, Employees, Active, Countries)
- [x] Show/Hide inactive filter
- [x] Sorting by name, city, state, country, employees

**Acceptance Criteria:**
- [x] Create locations with full address
- [ ] Display locations on map (optional - not implemented)
- [x] Prevent deletion if employees assigned (soft delete)

---

### TICKET-009: Role & Permission Management [COMPLETED]
**Priority:** High | **Effort:** 4 days | **Type:** Full Stack

**Description:** Custom role creation and permission assignment.

**Backend Tasks:**
- [x] Add role management endpoints:
  - `GET /tenant/roles/manage` - List with permissions and user count
  - `GET /tenant/roles/manage/:id` - Get single role with permissions
  - `POST /tenant/roles/manage` - Create custom role
  - `PATCH /tenant/roles/manage/:id` - Update
  - `PUT /tenant/roles/manage/:id/permissions` - Update permissions
  - `DELETE /tenant/roles/manage/:id` - Delete (soft delete if has users)
  - `GET /tenant/permissions` - List all permissions
- [x] Permission management with module-based grouping
- [x] System role protection (cannot delete/deactivate)

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/roles/page.tsx`
- [x] Add role list with permission count and user count
- [x] Add permission matrix editor (module × action)
- [x] Visual permission toggle interface with Select All/Deselect All
- [x] Role type badges (System/Custom)
- [x] Stats cards (Total, Users, Active, System Roles)
- [x] Show/Hide inactive filter

**Acceptance Criteria:**
- [x] Create custom roles beyond default 4
- [x] Assign granular permissions per module
- [x] System roles (Admin, HR, Manager, Employee) protected
- [x] Permission changes take effect immediately

---

## Phase 3: Payroll Management

### TICKET-010: Salary Structure Setup [COMPLETED]
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
- [x] Create salary component endpoints (CRUD)
- [x] Create salary structure endpoints
- [x] Add employee salary assignment
- [x] Calculate CTC, gross, net salary

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/payroll/salary-components/page.tsx`
- [x] Add salary component management
- [x] Create `/[tenant]/payroll/salary-structures/page.tsx`
- [x] Add salary structure assignment modal
- [x] Show salary breakdown preview

---

### TICKET-011: Pay Slip Generation [COMPLETED]
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
- [x] Create payslip generation endpoint
- [x] Calculate salary based on attendance, leaves
- [x] Generate PDF payslip with template
- [x] Add payslip listing and filtering

**Frontend Tasks:**
- [x] Create `/[tenant]/payroll/payslips/page.tsx`
- [x] Add monthly payslip generation wizard
- [x] Add payslip preview and download
- [x] Employee self-service payslip view

---

### TICKET-012: Tax Calculation [COMPLETED]
**Priority:** Medium | **Effort:** 4 days | **Type:** Backend

**Description:** Implement Indian tax regime calculations.

**Backend Tasks:**
- [x] Create tax slab configuration
- [x] Implement old vs new tax regime
- [x] Calculate TDS based on salary
- [x] Generate Form 16 data
- [x] Add tax declaration endpoints

**Frontend Tasks:**
- [x] Create `/[tenant]/settings/payroll/tax-slabs/page.tsx`
- [x] Create tax declaration form for employees
- [x] Show tax projection with built-in calculator
- [x] Display slabwise breakdown

---

## Phase 4: Recruitment

### TICKET-013: Job Posting Management [COMPLETED]
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
- [x] Create job posting CRUD endpoints
- [x] Add job status management
- [x] Public job listing API

**Frontend Tasks:**
- [x] Create `/[tenant]/recruitment/page.tsx`
- [x] Add job posting form
- [x] Add job listing with status filters

---

### TICKET-014: Applicant Tracking System (ATS) [COMPLETED]
**Priority:** Medium | **Effort:** 6 days | **Type:** Full Stack

**Database Models:**
```prisma
model Interview {
  id            Int             @id @default(autoincrement())
  tenantId      Int
  applicationId Int
  interviewerId Int
  title         String          // Round 1, Technical Interview, HR Round, etc.
  type          InterviewType   @default(VIDEO)  // PHONE, VIDEO, IN_PERSON, TECHNICAL, HR, PANEL
  scheduledAt   DateTime
  duration      Int             @default(60)     // Duration in minutes
  location      String?         // Meeting link or physical location
  status        InterviewStatus @default(SCHEDULED)  // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
  feedback      String?         @db.Text
  rating        Int?            // 1-5 stars
  strengths     String?         @db.Text
  weaknesses    String?         @db.Text
  recommendation String?        // STRONG_HIRE, HIRE, NO_HIRE, STRONG_NO_HIRE
}
```

**Backend Tasks:**
- [x] Create application submission endpoint (in TICKET-013)
- [x] Add application status workflow
- [x] Add interview scheduling endpoints
- [x] Add candidate evaluation endpoints (feedback, rating, recommendation)

**Frontend Tasks:**
- [x] Enhanced `/[tenant]/recruitment/page.tsx` with Pipeline tab
- [x] Add Kanban board for application stages (drag & drop)
- [x] Add interview scheduling modal
- [x] Add candidate profile view with interview history

---

## Phase 5: Performance Management

### TICKET-015: Goal Setting (OKRs/KPIs) [COMPLETED]
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
- [x] Create goal CRUD endpoints
- [x] Add goal hierarchy (company → team → individual)
- [x] Add progress update endpoints
- [x] Calculate roll-up progress

**Frontend Tasks:**
- [x] Create `/[tenant]/goals/page.tsx`
- [x] Add goal creation wizard
- [x] Add goal tree visualization
- [x] Add progress tracking UI

---

### TICKET-016: Performance Reviews [COMPLETED]
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
- [x] Create review cycle management
- [x] Add review assignment
- [x] Add self-review submission
- [x] Add manager review and rating
- [x] Calculate final ratings

**Frontend Tasks:**
- [x] Create `/[tenant]/reviews/page.tsx`
- [x] Add review cycle setup wizard
- [x] Add review form with questions
- [x] Add review summary dashboard

---

## Phase 6: Training & Development

### TICKET-017: Training Program Management [COMPLETED]
**Priority:** Low | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model TrainingProgram {
  id              Int            @id @default(autoincrement())
  tenantId        Int
  name            String
  description     String?        @db.Text
  type            TrainingType   @default(INTERNAL)  // INTERNAL, EXTERNAL, ONLINE, WORKSHOP, CERTIFICATION
  category        String?        // Technical, Soft Skills, Leadership, Compliance, etc.
  duration        Int            // hours
  startDate       DateTime
  endDate         DateTime
  trainerId       Int?           // Internal trainer
  externalTrainer String?
  venue           String?
  maxParticipants Int?
  cost            Float?
  materials       String?        @db.Text
  prerequisites   String?        @db.Text
  objectives      String?        @db.Text
  status          TrainingStatus @default(PLANNED)  // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
  createdBy       Int
}

model TrainingEnrollment {
  id             Int              @id @default(autoincrement())
  tenantId       Int
  programId      Int
  userId         Int
  status         EnrollmentStatus @default(ENROLLED)  // ENROLLED, IN_PROGRESS, COMPLETED, DROPPED, FAILED
  enrolledAt     DateTime         @default(now())
  completedAt    DateTime?
  score          Float?           // 0-100
  feedback       String?          @db.Text
  rating         Int?             // 1-5
  certificateUrl String?
  notes          String?          @db.Text
}
```

**Backend Tasks:**
- [x] Create training program CRUD
- [x] Add enrollment endpoints (enroll, update, remove, bulk complete)
- [x] Track completion and scores
- [x] Program status workflow (start, complete, cancel)
- [x] Get stats and calendar endpoints

**Frontend Tasks:**
- [x] Create `/[tenant]/training/page.tsx`
- [x] Stats cards (programs, enrollments, completed)
- [x] Program list with filters and status actions
- [x] Add enrollment management modal
- [x] Program detail view with participants
- [x] My trainings tab for employees

---

### TICKET-018: Skill Matrix [COMPLETED]
**Priority:** Low | **Effort:** 3 days | **Type:** Full Stack

**Database Models:**
```prisma
enum SkillCategory {
  TECHNICAL
  SOFT
  DOMAIN
  LANGUAGE
  TOOL
  CERTIFICATION
}

model Skill {
  id          Int           @id @default(autoincrement())
  tenantId    Int
  name        String
  category    SkillCategory @default(TECHNICAL)
  description String?       @db.Text
  isActive    Boolean       @default(true)
}

model EmployeeSkill {
  id           Int       @id @default(autoincrement())
  tenantId     Int
  userId       Int
  skillId      Int
  level        Int       @default(1) // 1-5 (Beginner, Basic, Intermediate, Advanced, Expert)
  yearsOfExp   Float?
  lastUsed     DateTime?
  isCertified  Boolean   @default(false)
  certifiedAt  DateTime?
  certifiedBy  Int?      // Manager/HR who verified
  notes        String?   @db.Text
}
```

**Backend Tasks:**
- [x] Create skill management endpoints (CRUD, stats)
- [x] Add employee skill assignment (single and bulk)
- [x] Skill gap analysis (by department, by category)
- [x] Skill matrix endpoint (employees × skills grid)
- [x] My skills endpoints for employees

**Frontend Tasks:**
- [x] Create `/[tenant]/skills/page.tsx` (~600 lines)
- [x] Add skill matrix grid view with filters
- [x] Add skill gap analysis tab with progress bars
- [x] Add skill assignment modal
- [x] My Skills tab for self-management

---

## Phase 7: Asset Management

### TICKET-019: Asset Tracking [COMPLETED]
**Priority:** Low | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
enum AssetCategory {
  LAPTOP, DESKTOP, MONITOR, PHONE, TABLET, KEYBOARD, MOUSE, HEADSET, FURNITURE, VEHICLE, SOFTWARE, OTHER
}

enum AssetStatus {
  AVAILABLE, ASSIGNED, MAINTENANCE, REPAIR, RETIRED, LOST
}

enum AssetCondition {
  NEW, EXCELLENT, GOOD, FAIR, POOR, DAMAGED
}

model Asset {
  id            Int            @id @default(autoincrement())
  tenantId      Int
  name          String
  assetCode     String         // Unique per tenant
  category      AssetCategory  @default(OTHER)
  brand         String?
  model         String?
  serialNumber  String?
  description   String?        @db.Text
  purchaseDate  DateTime?
  purchasePrice Float?
  currency      String         @default("INR")
  warrantyEnd   DateTime?
  status        AssetStatus    @default(AVAILABLE)
  condition     AssetCondition @default(NEW)
  currentUserId Int?
  locationId    Int?
  notes         String?        @db.Text
}

model AssetAllocation {
  id             Int            @id @default(autoincrement())
  tenantId       Int
  assetId        Int
  userId         Int
  allocatedAt    DateTime       @default(now())
  allocatedBy    Int
  returnedAt     DateTime?
  returnedBy     Int?
  expectedReturn DateTime?
  conditionOut   AssetCondition @default(GOOD)
  conditionIn    AssetCondition?
  notes          String?        @db.Text
}
```

**Backend Tasks:**
- [x] Create asset CRUD endpoints with category/status/location filters
- [x] Add allocation/return endpoints with condition tracking
- [x] Track asset history with allocator/returner audit
- [x] Asset status updates (MAINTENANCE, REPAIR, RETIRED, LOST)
- [x] Stats: by status, by category, warranty expiring, upcoming returns

**Frontend Tasks:**
- [x] Create `/[tenant]/assets/page.tsx` (~650 lines)
- [x] Add asset inventory list with filters (category, status, search)
- [x] Add allocation modal with user selection and expected return
- [x] Return modal with condition tracking
- [x] My Assets tab for employees to view assigned assets
- [x] My Asset History tab showing past allocations

---

## Phase 8: Time Tracking

### TICKET-020: Project Time Tracking [COMPLETED]
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
- [x] Create project management endpoints
- [x] Add time log CRUD
- [x] Weekly timesheet submission
- [x] Timesheet approval workflow

**Frontend Tasks:**
- [x] Create `/[tenant]/timesheet/page.tsx`
- [x] Add weekly timesheet grid
- [x] Add project selection
- [x] Manager approval view

---

## Phase 9: Expense Management

### TICKET-021: Expense Claims [COMPLETED]
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
- [x] Create expense category management
- [x] Add expense claim submission
- [x] Receipt upload
- [x] Approval workflow

**Frontend Tasks:**
- [x] Create `/[tenant]/expenses/page.tsx`
- [x] Add expense claim form
- [x] Receipt capture/upload
- [x] Approval queue for managers

---

## Phase 10: Document Management

### TICKET-022: Document Repository [COMPLETED]
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
- [x] Create document upload endpoints
- [x] Add folder/category structure
- [x] Version control
- [x] Access control

**Frontend Tasks:**
- [x] Create `/[tenant]/documents/page.tsx`
- [x] Add document browser
- [x] Add upload with drag-drop
- [x] Employee document management

---

## Phase 11: Reports & Analytics

### TICKET-023: Reports Dashboard [COMPLETED]
**Priority:** High | **Effort:** 5 days | **Type:** Full Stack

**Description:** Comprehensive reporting system with visualizations.

**Reports to Build:**
- [x] Headcount Report (by department, designation, location, role, gender)
- [x] Attendance Report (daily, monthly, summary)
- [x] Leave Report (by type, employee, department, month)
- [x] Payroll Report (salary distribution, tax summary)
- [x] Turnover Report (joins, exits, retention rate, tenure distribution)

**Backend Tasks:**
- [x] Create report generation endpoints (`/hrms-backend/web/tenant/reports.js`)
- [x] Add date range filtering
- [x] Department/location filtering
- [x] Export to CSV (frontend implementation)

**Frontend Tasks:**
- [x] Create `/[tenant]/reports/page.tsx`
- [x] Add report selection cards
- [x] Add date range picker and filters
- [x] Add charts (bar, pie, line, area) using Recharts
- [x] Add data tables with CSV export

---

### TICKET-024: Analytics Dashboard [COMPLETED]
**Priority:** Medium | **Effort:** 4 days | **Type:** Frontend Heavy

**Description:** Real-time analytics with key HR metrics.

**Metrics to Display:**
- [x] Employee count trends
- [x] Attendance rate
- [x] Leave utilization
- [x] Department distribution
- [x] Gender diversity
- [x] Average tenure
- [x] Training completion rate

**Frontend Tasks:**
- [x] Enhance dashboard with analytics widgets
- [x] Add recharts integration
- [x] Add drill-down capabilities
- [x] Add comparison views (MoM, YoY)

---

## Phase 12: Notifications & Alerts

### TICKET-025: In-App Notifications [COMPLETED]
**Priority:** High | **Effort:** 4 days | **Type:** Full Stack

**Database Models:**
```prisma
model Notification {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  userId      Int
  type        NotificationType
  title       String
  message     String
  link        String?  // URL to navigate
  metadata    Json?
  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())
}
```

**Backend Tasks:**
- [x] Create notification service (notifications.js)
- [x] Add notification endpoints (list, mark read, mark all read, delete)
- [x] Trigger notifications on events (leave apply, approve, reject)
- [ ] Add WebSocket for real-time (optional - not implemented)

**Frontend Tasks:**
- [x] Add notification bell icon in header
- [x] Add notification dropdown with popover
- [x] Add notification badge count (red badge with unread count)
- [x] Mark as read on click
- [x] Mark all as read
- [x] Delete notifications
- [x] Polling for new notifications (30 second interval)

---

### TICKET-026: Email Notifications [COMPLETED]
**Priority:** High | **Effort:** 3 days | **Type:** Backend

**Description:** Send email notifications for important events.

**Email Triggers:**
- [x] Leave request submitted
- [x] Leave approved/rejected
- [x] Password reset
- [x] Payslip generated
- [x] Birthday/anniversary reminders (templates ready)
- [x] Company announcements

**Backend Tasks:**
- [x] Set up email service (Nodemailer with SMTP)
- [x] Create email templates (HTML with responsive design)
- [x] Add email queue with retry mechanism
- [x] Add email preferences per user (EmailPreference model)

**Frontend Tasks:**
- [x] Email preferences settings page
- [x] Toggle individual notification types
- [x] Enable/disable all emails
- [x] Daily digest option

---

### TICKET-027: Birthday & Anniversary Alerts [COMPLETED]
**Priority:** Low | **Effort:** 2 days | **Type:** Backend + Frontend

**Backend Tasks:**
- [x] Create daily cron job for birthday check
- [x] Create cron job for work anniversary
- [x] Send notifications to relevant users

**Frontend Tasks:**
- [x] Add birthday widget on dashboard
- [x] Add anniversary celebrations banner

---

## Implementation Priority Matrix

| Priority | Tickets | Status |
|----------|---------|--------|
| **Critical** | TICKET-001, 002, 025, 026 | 001, 002, 025, 026 DONE |
| **High** | TICKET-006, 007, 009, 010, 011, 023 | 006, 007, 009, 010, 011, 023 DONE |
| **Medium** | TICKET-003, 004, 005, 008, 012, 015, 016, 020, 021, 024 | 003, 004, 005, 008, 012, 015, 016, 020, 021, 024 DONE |
| **Low** | TICKET-013, 014, 017, 018, 019, 022, 027 | 013, 014, 017, 018, 019, 022, 027 DONE |

**Completed Tickets:** 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030 (30 tickets - 100% COMPLETE!)
**Status:** ALL TICKETS COMPLETED! + TICKET-028 Bonus & Incentives + TICKET-029 Report Builder + TICKET-030 Holiday Management

---

## Recommended Implementation Order

### Sprint 1-2: Core Infrastructure (2 weeks) - COMPLETED
1. ~~TICKET-001: Audit Log System~~ ✅
2. ~~TICKET-002: Password Reset Flow~~ ✅
3. ~~TICKET-025: In-App Notifications~~ ✅

### Sprint 3-4: Organization Management (2 weeks) - COMPLETED
4. ~~TICKET-006: Department Management~~ ✅
5. ~~TICKET-007: Designation Management~~ ✅
6. ~~TICKET-008: Location Management~~ ✅
7. ~~TICKET-009: Role & Permission Management~~ ✅

### Sprint 5-6: Payroll Foundation (2 weeks) - COMPLETED
8. ~~TICKET-010: Salary Structure Setup~~ ✅
9. ~~TICKET-011: Pay Slip Generation~~ ✅
10. ~~TICKET-012: Tax Calculation~~ ✅

### Sprint 7-8: Reports & Analytics (2 weeks) - COMPLETED
11. ~~TICKET-023: Reports Dashboard~~ ✅
12. ~~TICKET-024: Analytics Dashboard~~ ✅
13. ~~TICKET-005: Export to Excel/PDF~~ ✅

### Sprint 9-10: User Experience (2 weeks) - COMPLETED
14. ~~TICKET-003: Profile Picture Upload~~ ✅
15. ~~TICKET-004: Bulk Operations~~ ✅
16. ~~TICKET-026: Email Notifications~~ ✅

### Sprint 11-14: Advanced Modules (4 weeks)
17. ~~TICKET-015: Goal Setting~~ ✅
18. ~~TICKET-016: Performance Reviews~~ ✅
19. ~~TICKET-020: Project Time Tracking~~ ✅
20. ~~TICKET-021: Expense Claims~~ ✅

### Sprint 15-18: Additional Modules (4 weeks) - COMPLETED
21. ~~TICKET-013: Job Posting Management~~ ✅
22. ~~TICKET-014: Applicant Tracking System~~ ✅
23. ~~TICKET-017: Training Program Management~~ ✅
24. ~~TICKET-018: Skill Matrix~~ ✅

### Sprint 19-20: Remaining Modules (2 weeks) - COMPLETED
25. ~~TICKET-019: Asset Tracking~~ ✅
26. ~~TICKET-022: Document Repository~~ ✅
27. ~~TICKET-027: Birthday & Anniversary Alerts~~ ✅

### Sprint 21: Additional Enhancements - COMPLETED
28. ~~TICKET-028: Bonus & Incentives~~ ✅
29. ~~TICKET-029: Custom Report Builder~~ ✅
30. ~~TICKET-030: Holiday Management~~ ✅

---

## TICKET-028: Bonus & Incentives [COMPLETED]
**Priority:** Medium | **Effort:** 4 days | **Type:** Full Stack

**Description:** Comprehensive bonus and incentive management system including individual bonuses, incentive schemes, and incentive records with approval workflows.

**Database Models (schema.prisma):**
- `BonusType` enum: PERFORMANCE, FESTIVAL, REFERRAL, RETENTION, JOINING, ANNUAL, SPOT, PROJECT, OTHER
- `BonusStatus` enum: PENDING, APPROVED, REJECTED, PAID, CANCELLED
- `IncentiveFrequency` enum: MONTHLY, QUARTERLY, HALF_YEARLY, ANNUALLY, ONE_TIME
- `Bonus` model: userId, bonusType, title, description, amount, currency, effectiveDate, paymentDate, status, requestedBy, approvedBy, isTaxable, taxAmount, netAmount, payslipId
- `IncentiveScheme` model: name, code, description, frequency, criteria, targetType/Value/Unit, payoutType/Value, slabs, maxPayout, applicableTo, applicableIds, startDate, endDate, isActive
- `IncentiveRecord` model: schemeId, userId, periodStart/End, targetValue, achievedValue, achievementPercent, calculatedAmount, adjustedAmount, finalAmount, status, approvedBy, paidAt, payslipId

**Backend Tasks (bonuses.js ~1000 lines):**
- [x] Bonus CRUD: list, get, create, update, delete
- [x] Bonus workflow: approve, reject, markPaid, cancel
- [x] Bonus statistics by status, type, monthly trend
- [x] Incentive Scheme CRUD: list, get, create, update, delete
- [x] Incentive Record CRUD: list, get, create, update, delete
- [x] Incentive workflow: approve, reject, markPaid
- [x] Incentive statistics by scheme, quarterly trend

**Routes (routes.js lines 396-424):**
- 10 bonus endpoints: GET/POST/PUT/DELETE /bonuses, /stats, /approve, /reject, /pay, /cancel
- 5 incentive scheme endpoints: GET/POST/PUT/DELETE /incentive-schemes
- 9 incentive record endpoints: GET/POST/PUT/DELETE /incentives, /stats, /approve, /reject, /pay

**Frontend Tasks:**
- [x] bonusApi with TypeScript interfaces (api.ts lines 4169-4535)
- [x] `/[tenant]/bonuses/page.tsx` (~750 lines)
- [x] 4 Tabs: Bonuses, Incentive Schemes, Incentive Records, My Bonuses
- [x] Stats cards: Total Bonuses, Pending Approval, Paid, Incentive Schemes
- [x] Bonus table with filters (type, status, search)
- [x] Scheme cards with frequency, payout, records count
- [x] Incentive records table with achievement percentage
- [x] Modals: Create/Edit Bonus, Create/Edit Scheme, Create Incentive Record, Bonus Details
- [x] Sidebar: Gift icon + Bonuses for ALL roles (line 221)

**Acceptance Criteria:**
- [x] Create individual bonuses with type and amount
- [x] Approval workflow for bonuses (approve, reject, mark paid)
- [x] Define incentive schemes with frequency and payout rules
- [x] Create incentive records linking employees to schemes
- [x] Track achievement percentage and calculate payouts
- [x] Link bonuses and incentives to payslips
- [x] Tax handling for bonus payments

---

## TICKET-029: Custom Report Builder [COMPLETED]
**Priority:** Medium | **Effort:** 3 days | **Type:** Full Stack

**Description:** Drag-and-drop custom report builder allowing users to create, save, and run custom reports from various data sources with configurable fields, filters, sorting, and visualization options.

**Database Models (schema.prisma):**
- `ReportDataSource` enum: EMPLOYEES, ATTENDANCE, LEAVE, PAYROLL, GOALS, REVIEWS, TRAINING, EXPENSES, ASSETS, RECRUITMENT
- `ReportFieldType` enum: TEXT, NUMBER, DATE, BOOLEAN, CURRENCY, PERCENTAGE, ENUM
- `ChartType` enum: TABLE, BAR, LINE, PIE, AREA, DONUT
- `AggregationType` enum: NONE, COUNT, SUM, AVG, MIN, MAX
- `ReportTemplate` model: name, description, dataSource, selectedFields (JSON), filters (JSON), groupBy (JSON), sortBy (JSON), aggregations (JSON), chartType, chartConfig (JSON), isPublic, isSystem, schedule, lastRunAt, nextRunAt
- `GeneratedReport` model: templateId, parameters (JSON), data (JSON), summary (JSON), rowCount, exportFormat, exportUrl, generatedBy, generatedAt, expiresAt

**Backend Tasks (report-builder.js ~800 lines):**
- [x] Available fields API with data source metadata and filter operators
- [x] Report Template CRUD: list, get, create, update, delete
- [x] Template duplication for quick creation
- [x] Report preview (run with sample data)
- [x] Report execution with full data fetch and aggregation
- [x] Generated reports history: list, get, delete
- [x] Report builder stats dashboard
- [x] Dynamic Prisma query building from config
- [x] Field extraction and data transformation

**Routes (routes.js lines 427-444):**
- 3 builder endpoints: GET /fields, GET /stats, POST /preview
- 7 template endpoints: GET/POST/PUT/DELETE /templates, /duplicate, /run
- 3 generated reports endpoints: GET/DELETE /reports

**Frontend Tasks:**
- [x] reportBuilderApi with TypeScript interfaces (api.ts lines 4537-4784)
- [x] `/[tenant]/report-builder/page.tsx` (~850 lines)
- [x] 3 Tabs: My Templates, Public Templates, Run History
- [x] Stats cards: My Templates, Public Templates, Reports Generated, Data Sources
- [x] Template cards with data source, chart type, field count
- [x] Full-featured report builder dialog with:
  - Data source selection
  - Drag-and-drop field selection (grouped by category)
  - Filter configuration with field-type-aware operators
  - Sort configuration with direction
  - Chart type selection (Table, Bar, Line, Pie, Area, Donut)
  - Public/Private toggle
- [x] Live preview with configurable limit
- [x] Report run result dialog with chart visualization
- [x] CSV export functionality
- [x] Template duplication and deletion
- [x] Sidebar: Wrench icon + Report Builder for ADMIN, HR roles (line 222)

**Available Data Sources & Fields:**
- EMPLOYEES: 28 fields (Basic, Employment, Organization, Address, Bank, Tax, System)
- ATTENDANCE: 13 fields (Employee, Attendance, Timing)
- LEAVE: 15 fields (Employee, Leave, Approval, System)
- PAYROLL: 17 fields (Employee, Period, Earnings, Deductions, Summary, Days, Payment)
- GOALS: 15 fields (Basic, Owner, Progress, Timeline, Metrics)
- REVIEWS: 12 fields (Employee, Cycle, Review, Rating, Timeline)
- TRAINING: 11 fields (Basic, Schedule, Details, Stats)
- EXPENSES: 12 fields (Employee, Expense, Workflow)
- ASSETS: 12 fields (Basic, Details, Status, Purchase, Value, Assignment)
- RECRUITMENT: 13 fields (Job, Candidate, Pipeline, Evaluation, Salary, Timeline)

**Acceptance Criteria:**
- [x] Select from 10 data sources with field metadata
- [x] Drag-drop interface for field selection
- [x] Configure filters with type-specific operators
- [x] Sort by selected fields with direction
- [x] Choose visualization type (table or chart)
- [x] Preview report before saving
- [x] Save and reuse report templates
- [x] Make templates public for team access
- [x] Run saved reports and view results
- [x] Export results to CSV
- [x] View report generation history

---

## TICKET-030: Holiday Management [COMPLETED]
**Priority:** Medium | **Effort:** 3 days | **Type:** Full Stack

**Description:** Comprehensive holiday management system with configurable weekly off patterns, fixed/optional holidays, bulk upload capability, and automatic leave day calculation integration.

**Database Models (schema.prisma lines 2113-2200):**
- `WeeklyOffPattern` enum: ALL_SATURDAYS_SUNDAYS, ONLY_SUNDAYS, SECOND_FOURTH_SAT_SUNDAYS, SECOND_LAST_SAT_SUNDAYS, ALTERNATE_SATURDAYS_SUNDAYS, CUSTOM
- `HolidayType` enum: FIXED, OPTIONAL, RESTRICTED
- `WeeklyOffConfig` model: tenantId, pattern, customDays (JSON for CUSTOM), effectiveFrom, isActive
- `Holiday` model: tenantId, name, date, type, description, isActive, createdBy
- `OptionalHolidaySelection` model: tenantId, holidayId, userId, year, status, selectedAt
- `OptionalHolidayQuota` model: tenantId, year, maxOptional (default 3)

**Backend Tasks (holidays.js ~600 lines):**
- [x] Weekly Off Config: getWeeklyOffConfig, updateWeeklyOffConfig
- [x] isWeeklyOff helper: Calculates 2nd/4th/last Saturday using Math.ceil(dayOfMonth/7) and isLastWeek check
- [x] Holiday CRUD: listHolidays (with year/type/month filters), getHoliday, createHoliday, updateHoliday, deleteHoliday
- [x] Bulk Import: downloadHolidayTemplate (CSV), bulkImportHolidays
- [x] Optional Holidays: getOptionalHolidayQuota, updateOptionalHolidayQuota
- [x] Optional Selection: selectOptionalHoliday, cancelOptionalHolidaySelection, getMyOptionalHolidays
- [x] Utilities: getHolidayStats, getHolidaysInRange, calculateWorkingDays (exported for leave integration)

**Routes (routes.js lines 447-464):**
- 2 weekly off endpoints: GET/PUT /weekly-off
- 9 holiday endpoints: GET/POST/PATCH/DELETE /holidays, /stats, /template, /bulk-import
- 6 optional holiday endpoints: GET/PUT /optional/quota, GET/POST/DELETE /optional/my-selections, /optional/:id/select, /optional/:id/cancel

**Leave Integration (leave/index.js):**
- [x] Import calculateWorkingDays from holidays.js (line 4)
- [x] Modified applyLeave() to auto-exclude holidays and weekly offs (lines 185-218)
- [x] Returns excludedInfo object with breakdown of excluded days
- [x] Validates that not all days are excluded

**Frontend Tasks:**
- [x] holidayApi with TypeScript interfaces (api.ts lines 4786-4964)
- [x] `/[tenant]/settings/holidays/page.tsx` (~700 lines)
- [x] Stats Cards: Total Holidays, Fixed Holidays, Optional Holidays (with selection count), Weekly Off Pattern
- [x] Year Selector: Navigation arrows to filter by year
- [x] Holiday Calendar with tabs: All Holidays, Fixed, Optional
- [x] Holiday Table: Date, Name, Type badge (FIXED/OPTIONAL), Description, Actions (Edit/Delete/Select)
- [x] Weekly Off Config Dialog: 6 pattern options with descriptions
- [x] Add/Edit Holiday Modal: Name, Date, Type selector, Description
- [x] Bulk Import Dialog: CSV template download, drag-drop upload with preview
- [x] Configure Quota Button: Set max optional holidays per year
- [x] Sidebar: CalendarDays icon + Holidays for ADMIN, HR roles (line 223)

**Weekly Off Pattern Options:**
1. All Saturdays & Sundays - Both Saturday and Sunday off every week
2. Only Sundays - Only Sunday off, all Saturdays working
3. 2nd & 4th Saturday + Sundays - 2nd and 4th Saturday off, plus all Sundays
4. 2nd & Last Saturday + Sundays - 2nd and last Saturday off, plus all Sundays
5. Alternate Saturdays + Sundays - Every alternate Saturday off, plus all Sundays
6. Custom - Select specific days as weekly off

**CSV Template Format:**
```csv
name,date,type,description
Republic Day,2025-01-26,FIXED,National Holiday
Holi,2025-03-14,OPTIONAL,Festival of Colors
```

**Acceptance Criteria:**
- [x] Configure tenant-wide weekly off patterns
- [x] Add fixed holidays (mandatory for all employees)
- [x] Add optional holidays (employee choice with quota limit)
- [x] Bulk import holidays via CSV
- [x] Set max optional holidays per year
- [x] Employees can select/cancel optional holidays
- [x] Leave calculation auto-excludes holidays and weekly offs
- [x] Stats cards show real-time counts

---

## Future Enhancements (From PRD - Not Yet Planned)

The following features are mentioned in the PRD but not yet implemented. These can be planned for future releases:

### Payroll Enhancements
- [x] Bonus and incentives management (TICKET-028 - COMPLETED)
- [ ] Payment processing integration (bank transfers, payroll providers)

### Recruitment Enhancements
- [ ] Resume parsing (auto-extract data from uploaded resumes)

### Performance Management Enhancements
- [ ] Performance Improvement Plans (PIPs)
- [ ] 360-degree feedback (peer reviews) - partial support via PEER respondent type

### Time Tracking Enhancements
- [ ] Client billing integration

### Document Management Enhancements
- [ ] E-signatures integration (DocuSign, etc.)

### Reports Enhancements
- [x] Custom report builder (drag-drop report designer) - TICKET-029 COMPLETED

### Notifications Enhancements
- [ ] SMS alerts integration (Twilio, MSG91, etc.)
- [ ] WebSocket for real-time notifications

### Security & Production Readiness
- [ ] Remove `plainPassword` field from User model (security risk)
- [ ] Restrict CORS for production environment
- [ ] API rate limiting
- [ ] Request logging and monitoring

### Testing & Quality
- [ ] Unit tests (80% coverage target)
- [ ] E2E tests for critical flows (Playwright/Cypress)
- [ ] API documentation (Swagger/OpenAPI)

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
