# Mavi HRMS - Development Progress

> **Last Updated:** 2025-12-19
> **Next Ticket:** All core tickets completed! Ready for new features.

---

## Quick Start for New Session

When starting a new session, read this file first to understand the current state. Then continue with the next pending ticket from the plan.md file.

```bash
# Backend (port 9000)
cd hrms-backend && npm run dev

# Frontend (port 3000) - usually already running
cd hrms-frontend && npm run dev

# Database
PGPASSWORD=hrmsMavi1234 psql -h localhost -U hrmsUser -d hrmsDb
```

**Test Credentials:**
- Tenant: `test-company`
- User: `john.doe@testcompany.com`
- Password: `NewPassword123!`

---

## Completed Tickets

### TICKET-002: Password Reset Flow
**Status:** COMPLETED
**Date:** 2025-12-17

**Implementation:**
- Backend:
  - `PasswordResetToken` model in Prisma schema (hashed tokens, 60-min expiry)
  - Email service with Ethereal for dev (`/hrms-backend/shared/utilities/email.js`)
  - Audit logging for password resets (`/hrms-backend/shared/utilities/audit.js`)
  - Endpoints: `POST /tenant/forgot-password`, `POST /tenant/verify-reset-token`, `POST /tenant/reset-password`
- Frontend:
  - `/[tenant]/forgot-password/page.tsx` - Email input form
  - `/[tenant]/reset-password/page.tsx` - Token verification, new password form
  - "Forgot your password?" link on login page

**Key Files:**
- `/hrms-backend/prisma/schema.prisma` - PasswordResetToken model
- `/hrms-backend/shared/utilities/email.js` - Email service
- `/hrms-backend/shared/utilities/audit.js` - Audit logging
- `/hrms-backend/web/tenant/index.js` - forgotPassword, verifyResetToken, resetPassword
- `/hrms-backend/web/tenant/routes.js` - Password reset routes
- `/hrms-backend/web/tenant/schema.js` - Joi validation schemas
- `/hrms-frontend/app/[tenant]/forgot-password/page.tsx`
- `/hrms-frontend/app/[tenant]/reset-password/page.tsx`
- `/hrms-frontend/lib/api.ts` - forgotPassword, verifyResetToken, resetPassword methods

**Test Results:** All passed

---

### TICKET-003: Profile Picture Upload
**Status:** COMPLETED
**Date:** 2025-12-17

**Implementation:**
- Backend:
  - Multer middleware for file uploads (`/hrms-backend/shared/middlewares/upload.middleware.js`)
  - Static file serving at `/uploads` path
  - Endpoints: `POST /tenant/profile/avatar`, `DELETE /tenant/profile/avatar`
  - Max 2MB, JPG/PNG/GIF/WebP formats
  - Unique filename: `userId_timestamp_random.ext`
- Frontend:
  - Avatar upload UI in Settings page (96px preview, Camera/Trash2 icons)
  - Avatar display in header (32px circle)
  - Avatar display in employee list (32px next to name)
  - Delete functionality with file removal

**Key Files:**
- `/hrms-backend/shared/middlewares/upload.middleware.js` - Multer config, uploadAvatar, deleteFile
- `/hrms-backend/web/tenant/index.js` - uploadAvatar, deleteAvatar functions
- `/hrms-backend/web/tenant/routes.js` - Avatar routes
- `/hrms-backend/server.js` - Static file serving
- `/hrms-backend/uploads/avatars/` - Storage directory
- `/hrms-frontend/lib/api.ts` - uploadAvatar (FormData), deleteAvatar methods
- `/hrms-frontend/app/[tenant]/settings/page.tsx` - Avatar upload UI
- `/hrms-frontend/components/layout/DashboardLayout.tsx` - Header avatar display
- `/hrms-frontend/app/[tenant]/employees/page.tsx` - Employee list avatar display

**Test Results:** All passed

---

### TICKET-004: Bulk Operations
**Status:** COMPLETED
**Date:** 2025-12-17

**Implementation:**
- Backend:
  - CSV utility (`/hrms-backend/shared/utilities/csv.js`) - parseCSV, generateCSV, validation
  - Bulk controller (`/hrms-backend/web/tenant/bulk.js`) - 5 endpoints
  - uploadCSV middleware (memoryStorage, 5MB max)
  - Template download with 14 columns
  - Max limits: 500 employees per import, 1000 attendance records per bulk mark
- Frontend:
  - Template download button
  - Import modal with file upload, result display
  - Export button for CSV
  - Bulk attendance marking page at `/[tenant]/attendance/manage`
  - Checkbox selection, select all functionality

**Key Files:**
- `/hrms-backend/shared/utilities/csv.js` - CSV parsing/generation
- `/hrms-backend/web/tenant/bulk.js` - Bulk operation endpoints
- `/hrms-backend/shared/middlewares/upload.middleware.js` - uploadCSV middleware
- `/hrms-backend/web/tenant/routes.js` - Bulk operation routes
- `/hrms-frontend/lib/api.ts` - Bulk API methods and types
- `/hrms-frontend/app/[tenant]/employees/page.tsx` - Import/Export UI
- `/hrms-frontend/app/[tenant]/attendance/manage/page.tsx` - Bulk attendance page
- `/hrms-frontend/components/ui/checkbox.tsx` - Checkbox component

**Test Results:** All passed (template download, export, import 3 employees, bulk attendance 4 employees)

---

### TICKET-005: Export to Excel/PDF
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Installed `exceljs` and `pdfkit` packages
  - Excel utility (`/hrms-backend/shared/utilities/excel.js`) - styled workbooks
  - PDF utility (`/hrms-backend/shared/utilities/pdf.js`) - A4 landscape/portrait
  - Export controller (`/hrms-backend/web/tenant/exports.js`) - 6 endpoints
  - Endpoints for: Employee Excel/PDF, Attendance Excel/PDF, Leave Excel/PDF
  - All exports include tenant branding, filters, styling
- Frontend:
  - Export dropdown on employees page (CSV, Excel, PDF options)
  - Export dropdown on attendance manage page with date range filters
  - 6 export API methods in api.ts
  - Progress indicator during export

**Key Files:**
- `/hrms-backend/shared/utilities/excel.js` - generateExcel(), column definitions
- `/hrms-backend/shared/utilities/pdf.js` - generatePDF(), column definitions
- `/hrms-backend/web/tenant/exports.js` - 6 export endpoints
- `/hrms-backend/web/tenant/routes.js` - Export routes (lines 40-46)
- `/hrms-frontend/lib/api.ts` - Export methods and types (ExportParams, AttendanceExportParams, LeaveExportParams)
- `/hrms-frontend/app/[tenant]/employees/page.tsx` - Export dropdown with CSV/Excel/PDF
- `/hrms-frontend/app/[tenant]/attendance/manage/page.tsx` - Export dropdown with date filters

**Test Results:** All passed
- Employee Excel: `employees_*.xlsx` - SUCCESS
- Employee PDF: `employees_*.pdf` - SUCCESS
- Attendance Excel: `attendance_*.xlsx` - SUCCESS
- Attendance PDF: `attendance_*.pdf` - SUCCESS

---

### TICKET-006: Department Management
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Department controller (`/hrms-backend/web/tenant/departments.js`) with full CRUD
  - Tree hierarchy support with parent-child relationships
  - Department head assignment (links to User)
  - Circular reference prevention in hierarchy
  - Soft delete for departments with dependencies
  - Validation schemas for create/update
  - Endpoints: `GET /tenant/departments`, `GET /tenant/departments/:id`, `POST /tenant/departments`, `PATCH /tenant/departments/:id`, `DELETE /tenant/departments/:id`, `GET /tenant/departments/employees`
- Frontend:
  - Department management page at `/[tenant]/settings/departments/page.tsx`
  - Tree view component with expand/collapse functionality
  - Flat list view option
  - Create/Edit department modal with parent and head selection
  - Delete confirmation with dependency warning
  - Stats cards (Total, Employees, Root departments)
  - API methods in `lib/api.ts` for department operations

**Key Files:**
- `/hrms-backend/web/tenant/departments.js` - Department CRUD controller
- `/hrms-backend/web/tenant/routes.js` - Department routes (lines 59-65)
- `/hrms-backend/web/tenant/schema.js` - Department validation schemas
- `/hrms-frontend/app/[tenant]/settings/departments/page.tsx` - Department management UI
- `/hrms-frontend/lib/api.ts` - Department API methods and types

**Test Results:** All passed
- List departments (tree view) - SUCCESS
- List departments (flat view) - SUCCESS
- Create department - SUCCESS
- Create with parent hierarchy - SUCCESS
- Update department - SUCCESS
- Delete department (no dependencies) - SUCCESS
- Delete protection (has children) - SUCCESS
- Get single department details - SUCCESS

### TICKET-007: Designation Management
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Designation controller (`/hrms-backend/web/tenant/designations.js`) with full CRUD
  - Grade level support with level field (1-100, lower = higher rank)
  - Code uniqueness validation per tenant
  - Employee count tracking
  - Soft delete for designations with employees
  - Validation schemas for create/update
  - Endpoints: `GET /tenant/designations`, `GET /tenant/designations/:id`, `POST /tenant/designations`, `PATCH /tenant/designations/:id`, `DELETE /tenant/designations/:id`
- Frontend:
  - Designation management page at `/[tenant]/settings/designations/page.tsx`
  - Table view with sorting (by level, name, employees)
  - Level badges with color coding (Executive, Senior, Mid-Level, Junior, Entry)
  - Create/Edit modal with name, code, level fields
  - Delete confirmation with dependency warning
  - Stats cards (Total, Employees, Active)
  - Grade Level Guide legend

**Key Files:**
- `/hrms-backend/web/tenant/designations.js` - Designation CRUD controller
- `/hrms-backend/web/tenant/routes.js` - Designation routes (lines 69-74)
- `/hrms-backend/web/tenant/schema.js` - Designation validation schemas
- `/hrms-frontend/app/[tenant]/settings/designations/page.tsx` - Designation management UI
- `/hrms-frontend/lib/api.ts` - Designation API methods and types

**Test Results:** All passed

---

### TICKET-008: Location Management
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Location controller (`/hrms-backend/web/tenant/locations.js`) with full CRUD
  - Address fields (address, city, state, country, pincode)
  - Code uniqueness validation per tenant
  - Employee count tracking
  - Soft delete for locations with employees
  - Default country: India
  - Endpoints: `GET /tenant/locations`, `GET /tenant/locations/:id`, `POST /tenant/locations`, `PATCH /tenant/locations/:id`, `DELETE /tenant/locations/:id`
- Frontend:
  - Location management page at `/[tenant]/settings/locations/page.tsx`
  - Table view with sorting (by name, city, state, country, employees)
  - Create/Edit modal with all address fields
  - Delete confirmation with dependency warning
  - Show/Hide inactive filter
  - Stats cards (Total, Employees, Active, Countries)

**Key Files:**
- `/hrms-backend/web/tenant/locations.js` - Location CRUD controller
- `/hrms-backend/web/tenant/routes.js` - Location routes (lines 76-81)
- `/hrms-backend/web/tenant/schema.js` - Location validation schemas
- `/hrms-frontend/app/[tenant]/settings/locations/page.tsx` - Location management UI
- `/hrms-frontend/lib/api.ts` - Location API methods and types

**Test Results:** All passed

---

### TICKET-009: Role & Permission Management
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Role controller (`/hrms-backend/web/tenant/roles.js`) with full CRUD
  - Permission management with module-based grouping
  - System role protection (cannot delete/deactivate)
  - Role-Permission assignment via transactions
  - User count tracking
  - Soft delete for roles with users
  - Endpoints: `GET /tenant/roles/manage`, `GET /tenant/roles/manage/:id`, `POST /tenant/roles/manage`, `PATCH /tenant/roles/manage/:id`, `DELETE /tenant/roles/manage/:id`, `PUT /tenant/roles/manage/:id/permissions`, `GET /tenant/permissions`
- Frontend:
  - Role management page at `/[tenant]/settings/roles/page.tsx`
  - Table view with role type badges (System/Custom)
  - Permission management modal with module grouping
  - Select All/Deselect All per module
  - Create/Edit modal with name, code, description
  - System role restrictions in UI
  - Delete confirmation with dependency warning
  - Show/Hide inactive filter
  - Stats cards (Total, Users, Active, System Roles)

**Key Files:**
- `/hrms-backend/web/tenant/roles.js` - Role & Permission CRUD controller
- `/hrms-backend/web/tenant/routes.js` - Role routes (lines 83-92)
- `/hrms-backend/web/tenant/schema.js` - Role validation schemas
- `/hrms-frontend/app/[tenant]/settings/roles/page.tsx` - Role management UI
- `/hrms-frontend/lib/api.ts` - Role & Permission API methods and types

**Test Results:** All passed

---

### TICKET-010: Leave Type Management
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Leave type endpoints already existed in `/hrms-backend/web/leave/`
  - Endpoints: `GET /leave/types`, `POST /leave/types`, `PATCH /leave/types/:id`, `DELETE /leave/types/:id`
  - Features: isPaid, maxDaysPerYear, carryForward, requiresDocument
- Frontend:
  - Leave type management page at `/[tenant]/settings/leave-types/page.tsx`
  - Table view with feature badges (Paid, Carry Forward, Document Required)
  - Create/Edit modal with Switch toggles for boolean fields
  - Soft delete (deactivate) for leave types
  - Show/Hide inactive filter
  - Stats cards (Total, Active, Paid, Carry Forward)
  - Badge component added (`/hrms-frontend/components/ui/badge.tsx`)
  - Switch component added (`/hrms-frontend/components/ui/switch.tsx`)

**Key Files:**
- `/hrms-frontend/app/[tenant]/settings/leave-types/page.tsx` - Leave type management UI
- `/hrms-frontend/components/ui/badge.tsx` - Badge component
- `/hrms-frontend/components/ui/switch.tsx` - Switch component
- `/hrms-frontend/lib/api.ts` - Leave API methods and types

**Test Results:** All passed

---

### TICKET-011: Leave Approvals Page
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Frontend:
  - Leave approvals page at `/[tenant]/leave-approvals/page.tsx`
  - View and manage leave requests from employees
  - Approve/Reject functionality with comments
  - Filter by status (Pending, Approved, Rejected, Cancelled)
  - Date range filtering
  - Employee details display
  - Leave type and duration information

**Key Files:**
- `/hrms-frontend/app/[tenant]/leave-approvals/page.tsx` - Leave approvals UI

**Test Results:** All passed

---

### TICKET-001: Audit Log System
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Audit utility already existed (`/hrms-backend/shared/utilities/audit.js`) with comprehensive logging functions
  - AuditLog model already defined in Prisma schema with all necessary fields
  - Created audit controller (`/hrms-backend/web/tenant/audit.js`) with:
    - `GET /tenant/audit` - List audit logs with filters (entity, action, date range, search, pagination)
    - `GET /tenant/audit/stats` - Get audit statistics (total logs, today's count, unique users, by action/entity)
    - `GET /tenant/audit/entity-types` - Get available entity types for filtering
    - `GET /tenant/audit/actions` - Get all available audit actions
    - `GET /tenant/audit/user/:userId` - Get user activity logs
    - `GET /tenant/audit/entity/:entity/:entityId` - Get entity-specific audit logs
    - `GET /tenant/audit/:id` - Get single audit log detail
- Frontend:
  - Audit logs page at `/[tenant]/settings/audit-logs/page.tsx`
  - Stats cards (Total Logs, Today's Activity, Active Users, Entity Types)
  - Filters panel (Search, Entity Type, Action, Date Range)
  - Table with pagination showing timestamp, user, action, entity, name, IP
  - Action badges with color-coded icons for each action type
  - Detail modal showing full audit log info (changes, old/new values, user agent)
  - date-fns package added for date formatting

**Key Files:**
- `/hrms-backend/shared/utilities/audit.js` - Audit logging utility (pre-existing)
- `/hrms-backend/web/tenant/audit.js` - Audit controller (NEW)
- `/hrms-backend/web/tenant/routes.js` - Added audit routes (lines 95-102)
- `/hrms-frontend/app/[tenant]/settings/audit-logs/page.tsx` - Audit logs UI (NEW)
- `/hrms-frontend/lib/api.ts` - Audit API methods (updated paths)

**Test Results:** All API endpoints tested and working
- Stats: Returns totalLogs, todayCount, uniqueUsers, byAction, byEntity, recentActivity
- Logs: Returns paginated audit logs with filters
- Detail: Returns full audit log with old/new values and changes

---

### TICKET-010: Salary Components (Payroll Module)
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Prisma models for complete payroll system:
    - `SalaryComponent` - earnings, deductions, reimbursements with taxable/statutory flags
    - `SalaryStructure` - employee salary assignment with CTC, basic, gross, net
    - `SalaryStructureComponent` - component breakdown with fixed/percentage calculation
    - `Payslip` - monthly payslip with working days, LOP, status workflow
    - `PayslipComponent` - individual payslip line items
    - `TaxSlab` - Indian tax regime configuration (Old/New)
    - `TaxDeclaration` - employee tax declarations with 80C/80D sections
  - Salary components controller (`/hrms-backend/web/tenant/salaryComponents.js`)
  - Endpoints: `GET/POST /tenant/salary-components`, `POST /tenant/salary-components/initialize`, `PUT /tenant/salary-components/order`, `GET/PATCH/DELETE /tenant/salary-components/:id`
  - Default components initialization (Basic, HRA, DA, PF, ESI, PT, TDS, etc.)
- Frontend:
  - Salary components page at `/[tenant]/settings/payroll/salary-components/page.tsx`
  - Grouped view (Earnings, Deductions, Reimbursements)
  - Create/Edit modal with type, calculation method, taxable/statutory flags
  - Initialize defaults button for new tenants
  - Delete protection for components in use

**Key Files:**
- `/hrms-backend/prisma/schema.prisma` - Payroll models and enums
- `/hrms-backend/web/tenant/salaryComponents.js` - Salary component CRUD
- `/hrms-backend/web/tenant/routes.js` - Payroll routes (lines 108-117)
- `/hrms-frontend/app/[tenant]/settings/payroll/salary-components/page.tsx` - UI
- `/hrms-frontend/lib/api.ts` - Payroll types and API methods

---

### TICKET-011: Payslip Generation (Payroll Module)
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Payslip controller (`/hrms-backend/web/tenant/payslips.js`)
  - Single and bulk payslip generation with attendance/leave integration
  - Automatic LOP calculation based on attendance
  - Status workflow: DRAFT -> PROCESSED -> PAID
  - Endpoints: `GET /tenant/payslips`, `POST /tenant/payslips/generate`, `POST /tenant/payslips/bulk-generate`, `GET /tenant/payslips/summary`, `PATCH /tenant/payslips/:id/status`, `PATCH /tenant/payslips/bulk-status`, `DELETE /tenant/payslips/:id`
- Frontend:
  - Payslips page at `/[tenant]/payroll/payslips/page.tsx`
  - Month/Year selector with status filter
  - Summary cards (Total Payslips, Gross Earnings, Deductions, Net Payable)
  - Bulk generate modal with success/skipped/failed results
  - View payslip modal with earnings/deductions breakdown
  - Status change actions (Process, Mark Paid)

**Key Files:**
- `/hrms-backend/web/tenant/payslips.js` - Payslip generation and management
- `/hrms-backend/web/tenant/routes.js` - Payslip routes (lines 129-138)
- `/hrms-frontend/app/[tenant]/payroll/payslips/page.tsx` - Payslips UI
- `/hrms-frontend/lib/api.ts` - Payslip types and API methods

---

### TICKET-012: Tax Calculation (Payroll Module)
**Status:** COMPLETED
**Date:** 2025-12-18

**Implementation:**
- Backend:
  - Tax controller (`/hrms-backend/web/tenant/tax.js`)
  - Tax slab management with Old/New regime support
  - Indian tax calculation with slabs and 4% cess
  - Tax declaration with sections (80C, 80D, 80E, 80G, HRA, Home Loan, NPS)
  - Declaration workflow: DRAFT -> SUBMITTED -> APPROVED/REJECTED
  - Endpoints:
    - Tax Slabs: `GET /tenant/tax/slabs`, `POST /tenant/tax/slabs`, `POST /tenant/tax/slabs/initialize`, `PATCH/DELETE /tenant/tax/slabs/:id`, `POST /tenant/tax/calculate`
    - Tax Declarations: `GET /tenant/tax/declarations`, `POST /tenant/tax/declarations`, `GET /tenant/tax/declarations/:id`, `POST /tenant/tax/declarations/:id/submit`, `POST /tenant/tax/declarations/:id/review`
- Frontend:
  - API types and methods added to `lib/api.ts`
  - Tax management can be added to settings later

**Key Files:**
- `/hrms-backend/web/tenant/tax.js` - Tax calculation and declaration management
- `/hrms-backend/web/tenant/salaryStructures.js` - Salary structure assignment
- `/hrms-backend/web/tenant/routes.js` - Tax routes (lines 140-154)
- `/hrms-frontend/lib/api.ts` - Tax types and API methods

---

### TICKET-030: Holiday Management
**Status:** COMPLETED
**Date:** 2025-12-19

**Implementation:**
- Backend:
  - Holiday controller (`/hrms-backend/web/tenant/holidays.js`) with CRUD, bulk import, calendar view
  - Weekly off configuration with 6 pattern options (All Saturdays & Sundays, Only Sundays, 2nd & 4th Saturday + Sundays, 2nd & Last Saturday + Sundays, No Weekly Offs, Custom)
  - Holiday types: FIXED (mandatory), OPTIONAL (selectable), RESTRICTED
  - Leave integration: `calculateWorkingDays(startDate, endDate, tenantId)` auto-excludes holidays and weekly offs
  - Endpoints: `GET/POST /tenant/holidays`, `PATCH/DELETE /tenant/holidays/:id`, `GET /tenant/holidays/calendar/:year`, `GET /tenant/holidays/template`, `POST /tenant/holidays/bulk-import`, `GET/PUT /tenant/weekly-off`
- Frontend:
  - Holiday management page at `/[tenant]/settings/holidays/page.tsx`
  - Stats cards (Total, Fixed, Optional, Weekly Off Pattern)
  - Create/Edit holiday modal with date picker, type selector
  - Weekly off configuration dialog with 6 pattern options
  - Bulk import from CSV with template download
  - Year navigation and calendar view

**Key Files:**
- `/hrms-backend/prisma/schema.prisma` - WeeklyOffConfig, Holiday, UserOptionalHoliday, HolidayExcludedDay models
- `/hrms-backend/web/tenant/holidays.js` - Holiday CRUD and weekly off logic
- `/hrms-backend/web/tenant/routes.js` - Holiday routes (lines 447-464)
- `/hrms-backend/web/leave/index.js` - Leave integration with calculateWorkingDays
- `/hrms-frontend/app/[tenant]/settings/holidays/page.tsx` - Holiday management UI
- `/hrms-frontend/lib/api.ts` - Holiday API methods and types

**Test Results:** All passed via browser testing
- Created Republic Day (FIXED) and Holi (OPTIONAL) holidays
- Changed weekly off pattern to "2nd & Last Saturday + Sundays"
- Leave calculation test: 5 calendar days → 3 working days (excludes holiday + weekly off)

---

### TICKET-031: Data Migration Importers
**Status:** COMPLETED
**Date:** 2025-12-19

**Implementation:**
- Backend:
  - Data import controller (`/hrms-backend/web/tenant/data-import.js`) with 17 import modules (~1400 lines)
  - Template download endpoint with embedded CSV samples
  - Phase 1 (Master Data): Departments (with hierarchy), Designations, Locations, Roles, Leave Types, Salary Components, Expense Categories, Skills, Projects
  - Phase 2 (Employee Data): Employees (with reporting_to lookup), Employee Skills, Salary Structures
  - Phase 3 (Transactional): Leave Balances (upsert), Attendance (upsert), Leave Requests, Assets, Asset Allocations
  - Helper functions: parseDate (multi-format), parseBoolean, validateEnum, cleanString
  - Auto-match by code (case-insensitive foreign key lookup)
  - Partial success support: continues processing valid rows even if some fail
  - Endpoints: `GET /import/template/:module`, `POST /import/{module}` x17
- Frontend:
  - Data import page at `/[tenant]/settings/data-import/page.tsx` (~600 lines)
  - Module cards grid organized by phase with color coding
  - Import wizard dialog: Template download → File upload → Results display
  - Dependency warnings for phase-dependent modules
  - Success/error counts with created records list and error details

**Key Files:**
- `/hrms-backend/web/tenant/data-import.js` - 17 import functions + template download
- `/hrms-backend/web/tenant/routes.js` - 18 import routes (lines 467-493)
- `/hrms-frontend/app/[tenant]/settings/data-import/page.tsx` - Import wizard UI
- `/hrms-frontend/lib/api.ts` - dataImportApi methods (lines 4970-5013)
- `/hrms-frontend/components/layout/DashboardLayout.tsx` - Upload icon + Data Import menu item

**Test Results:** ALL 17 MODULES VERIFIED via API/browser testing

**Phase 1 - Master Data (9/9 modules):**
- Departments: 2/2 (hierarchy support, duplicate detection working)
- Designations: 2/2 (Vice President, Director with levels)
- Locations: 2/2 (Chennai Office, Kolkata Office with address fields)
- Roles: 5/5 (HR_EXEC, TEAM_LEAD, INTERN, CONSULTANT, NEW_ROLE with descriptions)
- Leave Types: 2/2 (Work From Home, Compensatory Off with policy fields)
- Salary Components: 8/8 (BASIC, HRA, DA, CONV, MED, PF, PT, TDS with type/calculation/taxable)
- Expense Categories: 7/7 (Travel, Food, Accommodation, etc. with max limits)
- Skills: 11/11 (JavaScript, TypeScript, React, etc. with TECHNICAL/SOFT/LANGUAGE categories)
- Projects: 4/5 (status enum validation - PLANNED invalid, ACTIVE/COMPLETED/ON_HOLD/CANCELLED valid)

**Phase 2 - Employee Data (3/3 modules):**
- Employees: 3/3 (all lookups + reporting_to hierarchy working)
- Employee Skills: 13/13 (employee + skill lookup, level/exp/certified fields)
- Salary Structures: 3/3 (CTC, basic, gross, net, effective dates)

**Phase 3 - Transactional Data (5/5 modules):**
- Leave Balances: 8/8 (upsert working, auto-calculate available days)
- Attendance: 11/12 (status enum validation - WORK_FROM_HOME invalid)
- Leave Requests: 6/6 (APPROVED/PENDING/REJECTED statuses)
- Assets: 5/6 (category enum validation - MOBILE invalid, use PHONE)
- Asset Allocations: 5/5 (auto-updates asset status to ASSIGNED)

---

## All Core Tickets Completed!

The following features are now fully implemented:
1. Password Reset Flow (TICKET-002)
2. Profile Picture Upload (TICKET-003)
3. Bulk Operations (TICKET-004)
4. Export to Excel/PDF (TICKET-005)
5. Department Management (TICKET-006)
6. Designation Management (TICKET-007)
7. Location Management (TICKET-008)
8. Role & Permission Management (TICKET-009)
9. Leave Type Management (Old TICKET-010)
10. Leave Approvals Page (Old TICKET-011)
11. Audit Log System (TICKET-001)

**Payroll Module:**
12. Salary Components (TICKET-010) - Configure earnings, deductions, reimbursements
13. Payslip Generation (TICKET-011) - Bulk generate and manage monthly payslips
14. Tax Calculation (TICKET-012) - Indian tax regime support with declarations

**Additional Modules:**
15. Holiday Management (TICKET-030) - Holiday calendar, weekly off patterns, leave integration
16. Data Migration Importers (TICKET-031) - 17 bulk import modules for client migration

---

## Technical Notes

### Database
- PostgreSQL with credentials: `hrmsUser` / `hrmsMavi1234` / `hrmsDb`
- Prisma ORM with migrations via `npx prisma db push`

### Backend Architecture
- Express.js with ES modules
- Path alias: `@shared` -> `shared/`
- Port: 9000
- JWT authentication for tenant users
- Multer for file uploads
- Static files served at `/uploads`

### Frontend Architecture
- Next.js 14 with App Router
- Tailwind CSS + shadcn/ui components
- Port: 3000
- API base: `http://localhost:9000`
- Token stored in localStorage

### Common Patterns
- API methods return `{ success, message, data }`
- FormData for file uploads (don't set Content-Type header)
- Avatar URLs: `${API_BASE}/${user.avatar}`
- Blob downloads for file exports

### Lessons Learned
- Express route ordering: static routes before `:id` routes
- Radix Select: can't use empty string value, use "all" placeholder
- URLSearchParams: filter undefined values before creating
- Multer filename: `${userId}_${timestamp}_${random}${ext}`
- Test images: use gravatar for reliable downloads

---

## Files Changed Since Initial Commit

### Backend New Files
- `/hrms-backend/shared/utilities/email.js`
- `/hrms-backend/shared/utilities/audit.js`
- `/hrms-backend/shared/utilities/csv.js`
- `/hrms-backend/shared/utilities/excel.js`
- `/hrms-backend/shared/utilities/pdf.js`
- `/hrms-backend/shared/middlewares/upload.middleware.js`
- `/hrms-backend/web/tenant/bulk.js`
- `/hrms-backend/web/tenant/exports.js`
- `/hrms-backend/web/tenant/departments.js`
- `/hrms-backend/web/tenant/designations.js`
- `/hrms-backend/web/tenant/locations.js`
- `/hrms-backend/web/tenant/roles.js`
- `/hrms-backend/web/tenant/audit.js`
- `/hrms-backend/web/tenant/salaryComponents.js` - Salary component CRUD
- `/hrms-backend/web/tenant/salaryStructures.js` - Salary structure assignment
- `/hrms-backend/web/tenant/payslips.js` - Payslip generation & management
- `/hrms-backend/web/tenant/tax.js` - Tax slabs & declarations
- `/hrms-backend/web/tenant/holidays.js` - Holiday CRUD & weekly off configuration
- `/hrms-backend/web/tenant/data-import.js` - 17 bulk import modules for client migration
- `/hrms-backend/uploads/avatars/` (directory)

### Backend Modified Files
- `/hrms-backend/prisma/schema.prisma` - Added PasswordResetToken model, Payroll models (SalaryComponent, SalaryStructure, Payslip, TaxSlab, TaxDeclaration)
- `/hrms-backend/web/tenant/index.js` - Added password reset, avatar functions
- `/hrms-backend/web/tenant/routes.js` - Added all new routes including payroll
- `/hrms-backend/web/tenant/schema.js` - Added validation schemas
- `/hrms-backend/server.js` - Added static file serving

### Frontend New Files
- `/hrms-frontend/app/[tenant]/forgot-password/page.tsx`
- `/hrms-frontend/app/[tenant]/reset-password/page.tsx`
- `/hrms-frontend/app/[tenant]/attendance/manage/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/departments/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/designations/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/locations/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/roles/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/leave-types/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/audit-logs/page.tsx`
- `/hrms-frontend/app/[tenant]/settings/payroll/salary-components/page.tsx` - Salary components UI
- `/hrms-frontend/app/[tenant]/settings/holidays/page.tsx` - Holiday management UI
- `/hrms-frontend/app/[tenant]/settings/data-import/page.tsx` - Data import wizard UI
- `/hrms-frontend/app/[tenant]/leave-approvals/page.tsx`
- `/hrms-frontend/app/[tenant]/payroll/payslips/page.tsx` - Payslips management UI
- `/hrms-frontend/components/ui/checkbox.tsx`
- `/hrms-frontend/components/ui/badge.tsx`
- `/hrms-frontend/components/ui/switch.tsx`

### Frontend Modified Files
- `/hrms-frontend/lib/api.ts` - Added all API methods and types including Payroll
- `/hrms-frontend/app/[tenant]/settings/page.tsx` - Avatar upload UI, Salary Components link
- `/hrms-frontend/app/[tenant]/employees/page.tsx` - Avatar display, bulk ops, export dropdown
- `/hrms-frontend/components/layout/DashboardLayout.tsx` - Header avatar, settings navigation
- `/hrms-frontend/app/[tenant]/login/page.tsx` - Forgot password link

---

## How to Continue Development

1. Read this file to understand current state
2. Check plan.md for next ticket details
3. Start backend server: `cd hrms-backend && npm run dev`
4. Verify frontend is running on port 3000
5. Implement next ticket following the pattern of completed tickets
6. Update this PROGRESS.md file after completing each ticket
