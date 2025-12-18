import { Router } from 'express';
import { login, getProfile, listUsers, createUser, getUser, updateUser, deleteUser, getRoles, getDashboardStats, forgotPassword, verifyResetToken, resetPassword, uploadAvatar, deleteAvatar } from './index.js';
import { downloadEmployeeTemplate, bulkImportEmployees, exportEmployees, bulkMarkAttendance, getEmployeesForAttendance } from './bulk.js';
import { exportEmployeesExcel, exportEmployeesPDF, exportAttendanceExcel, exportAttendancePDF, exportLeaveExcel, exportLeavePDF } from './exports.js';
import { listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, getEmployeesForHead } from './departments.js';
import { listDesignations, getDesignation, createDesignation, updateDesignation, deleteDesignation } from './designations.js';
import { listLocations, getLocation, createLocation, updateLocation, deleteLocation } from './locations.js';
import { listRoles, getRole, createRole, updateRole, deleteRole, listPermissions, updateRolePermissions } from './roles.js';
import { listAuditLogs, getAuditLogDetail, getEntityAuditLogs, getEntityTypes, getAuditStats, getUserActivity, getActions } from './audit.js';
import { listSalaryComponents, getSalaryComponent, createSalaryComponent, updateSalaryComponent, deleteSalaryComponent, updateComponentOrder, initializeDefaultComponents } from './salaryComponents.js';
import { listSalaryStructures, getSalaryStructure, getEmployeeSalaryStructure, getEmployeeSalaryHistory, createSalaryStructure, updateSalaryStructure, deleteSalaryStructure, calculateSalaryPreview } from './salaryStructures.js';
import { listPayslips, getPayslip, getEmployeePayslip, generatePayslip, bulkGeneratePayslips, updatePayslipStatus, bulkUpdatePayslipStatus, deletePayslip, getPayrollSummary } from './payslips.js';
import { listTaxSlabs, createTaxSlab, updateTaxSlab, deleteTaxSlab, initializeDefaultTaxSlabs, listTaxDeclarations, getTaxDeclaration, getEmployeeTaxDeclaration, saveTaxDeclaration, submitTaxDeclaration, reviewTaxDeclaration, calculateTaxPreview } from './tax.js';
import { getReportOverview, getHeadcountReport, getAttendanceReport, getLeaveReport, getPayrollReport, getTurnoverReport } from './reports.js';
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, deleteReadNotifications, createAnnouncement } from './notifications.js';
import { getDashboardAnalytics, getEmployeeGrowthAnalytics, getAttendanceAnalytics } from './analytics.js';
import { getEmailPreferences, updateEmailPreferences, toggleAllEmails, testEmailConfiguration } from './emailPreferences.js';
import { listUpcomingBirthdays, listUpcomingAnniversaries, listAllCelebrations, triggerCheck } from './celebrations.js';
import { listGoals, getGoal, createGoal, updateGoal, updateGoalProgress, deleteGoal, addKeyResult, updateKeyResult, deleteKeyResult, getGoalHierarchy, getGoalStats } from './goals.js';
import { listReviewCycles, getReviewCycle, createReviewCycle, updateReviewCycle, deleteReviewCycle, activateCycle, listReviewQuestions, createReviewQuestion, updateReviewQuestion, deleteReviewQuestion, addQuestionToCycle, removeQuestionFromCycle, listReviews, getReview, submitSelfReview, submitManagerReview, getReviewStats } from './reviews.js';
import { listProjects, getProject, createProject, updateProject, deleteProject, addProjectMember, removeProjectMember, listTimeLogs, getWeeklyTimesheet, createTimeLog, updateTimeLog, deleteTimeLog, submitTimesheet, approveTimeLogs, rejectTimeLogs, getTimesheetStats } from './timetracking.js';
import { listExpenseCategories, getExpenseCategory, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory, listExpenseClaims, getExpenseClaim, createExpenseClaim, updateExpenseClaim, deleteExpenseClaim, submitExpenseClaim, approveExpenseClaims, rejectExpenseClaims, markAsReimbursed, getExpenseStats } from './expenses.js';
import { listJobPostings, getJobPosting, createJobPosting, updateJobPosting, deleteJobPosting, publishJob, pauseJob, closeJob, listApplications, getApplication, createApplication, updateApplicationStatus, deleteApplication, getRecruitmentStats, listInterviews, getInterview, scheduleInterview, updateInterview, cancelInterview, submitInterviewFeedback, deleteInterview, getMyInterviews, getApplicationWithInterviews } from './jobs.js';
import { listTrainingPrograms, getTrainingProgram, createTrainingProgram, updateTrainingProgram, deleteTrainingProgram, startProgram, completeProgram, cancelProgram, enrollParticipants, updateEnrollment, removeEnrollment, bulkCompleteEnrollments, getMyTrainings, submitFeedback, getTrainingStats, getTrainingCalendar } from './training.js';
import { listSkills, getSkill, createSkill, updateSkill, deleteSkill, getEmployeeSkills, assignSkill, updateEmployeeSkill, removeEmployeeSkill, bulkAssignSkill, getSkillMatrix, getSkillGapAnalysis, getSkillStats, getMySkills, updateMySkill, addMySkill } from './skills.js';
import { listAssets, getAsset, createAsset, updateAsset, deleteAsset, allocateAsset, returnAsset, updateAssetStatus, getAssetHistory, getMyAssets, getMyAssetHistory, getAssetStats } from './assets.js';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, uploadNewVersion, getDocumentCategories, getDocumentStats, listEmployeeDocuments, getEmployeeDocument, createEmployeeDocument, updateEmployeeDocument, deleteEmployeeDocument, verifyEmployeeDocument, getExpiringDocuments, getMyDocuments, getEmployeeDocumentStats } from './documents.js';
import { listBonuses, getBonus, createBonus, updateBonus, approveBonus, rejectBonus, markBonusPaid, cancelBonus, deleteBonus, getBonusStats, listIncentiveSchemes, getIncentiveScheme, createIncentiveScheme, updateIncentiveScheme, deleteIncentiveScheme, listIncentiveRecords, getIncentiveRecord, createIncentiveRecord, updateIncentiveRecord, approveIncentiveRecord, rejectIncentiveRecord, markIncentivePaid, deleteIncentiveRecord, getIncentiveStats } from './bonuses.js';
import { getAvailableFields, listReportTemplates, getReportTemplate, createReportTemplate, updateReportTemplate, deleteReportTemplate, duplicateReportTemplate, runReport, previewReport, listGeneratedReports, getGeneratedReport, deleteGeneratedReport, getReportBuilderStats } from './report-builder.js';
import { getWeeklyOffConfig, updateWeeklyOffConfig, listHolidays, getHoliday, createHoliday, updateHoliday, deleteHoliday, downloadHolidayTemplate, bulkImportHolidays, getOptionalHolidayQuota, updateOptionalHolidayQuota, getMyOptionalHolidays, selectOptionalHoliday, cancelOptionalHolidaySelection, getHolidayStats } from './holidays.js';
import { downloadTemplate, importDepartments, importDesignations, importLocations, importRoles, importLeaveTypes, importSalaryComponents, importExpenseCategories, importSkills, importProjects, importEmployees, importEmployeeSkills, importSalaryStructures, importLeaveBalances, importAttendance, importLeaveRequests, importAssets, importAssetAllocations } from './data-import.js';
import { loginSchema, createUserSchema, updateUserSchema, forgotPasswordSchema, verifyResetTokenSchema, resetPasswordSchema, createDepartmentSchema, updateDepartmentSchema, createDesignationSchema, updateDesignationSchema, createLocationSchema, updateLocationSchema, createRoleSchema, updateRoleSchema, updateRolePermissionsSchema } from './schema.js';
import validate from '@shared/middlewares/validate.middleware.js';
import { verifyTenantUser } from '@shared/middlewares/tenant.middleware.js';
import { uploadAvatar as uploadAvatarMiddleware, uploadCSV, handleMulterError } from '@shared/middlewares/upload.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// Public
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/verify-reset-token', validate(verifyResetTokenSchema), asyncHandler(verifyResetToken));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPassword));

// Protected - Tenant users
router.use(verifyTenantUser);

router.get('/profile', asyncHandler(getProfile));
router.get('/dashboard', asyncHandler(getDashboardStats));

// Profile Avatar
router.post('/profile/avatar', uploadAvatarMiddleware, handleMulterError, asyncHandler(uploadAvatar));
router.delete('/profile/avatar', asyncHandler(deleteAvatar));

// User Management
router.get('/users', asyncHandler(listUsers));
router.post('/users', validate(createUserSchema), asyncHandler(createUser));

// Bulk Operations (must come before :id routes)
router.get('/users/template', asyncHandler(downloadEmployeeTemplate));
router.get('/users/export', asyncHandler(exportEmployees));
router.post('/users/bulk-import', uploadCSV, handleMulterError, asyncHandler(bulkImportEmployees));
router.post('/attendance/bulk-mark', asyncHandler(bulkMarkAttendance));
router.get('/attendance/employees', asyncHandler(getEmployeesForAttendance));

// Export to Excel/PDF
router.get('/export/employees/excel', asyncHandler(exportEmployeesExcel));
router.get('/export/employees/pdf', asyncHandler(exportEmployeesPDF));
router.get('/export/attendance/excel', asyncHandler(exportAttendanceExcel));
router.get('/export/attendance/pdf', asyncHandler(exportAttendancePDF));
router.get('/export/leave/excel', asyncHandler(exportLeaveExcel));
router.get('/export/leave/pdf', asyncHandler(exportLeavePDF));

// User by ID
router.get('/users/:id', asyncHandler(getUser));
router.patch('/users/:id', validate(updateUserSchema), asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));

// Master Data (simple list for dropdowns)
router.get('/roles', asyncHandler(getRoles));
// Note: /locations is now handled by the Location Management section below

// Department Management (full CRUD with hierarchy)
router.get('/departments', asyncHandler(listDepartments));
router.get('/departments/employees', asyncHandler(getEmployeesForHead));
router.post('/departments', validate(createDepartmentSchema), asyncHandler(createDepartment));
router.get('/departments/:id', asyncHandler(getDepartment));
router.patch('/departments/:id', validate(updateDepartmentSchema), asyncHandler(updateDepartment));
router.delete('/departments/:id', asyncHandler(deleteDepartment));

// Designation Management (full CRUD with grade levels)
router.get('/designations', asyncHandler(listDesignations));
router.post('/designations', validate(createDesignationSchema), asyncHandler(createDesignation));
router.get('/designations/:id', asyncHandler(getDesignation));
router.patch('/designations/:id', validate(updateDesignationSchema), asyncHandler(updateDesignation));
router.delete('/designations/:id', asyncHandler(deleteDesignation));

// Location Management (full CRUD with address details)
router.get('/locations', asyncHandler(listLocations));
router.post('/locations', validate(createLocationSchema), asyncHandler(createLocation));
router.get('/locations/:id', asyncHandler(getLocation));
router.patch('/locations/:id', validate(updateLocationSchema), asyncHandler(updateLocation));
router.delete('/locations/:id', asyncHandler(deleteLocation));

// Role Management (full CRUD with permissions)
router.get('/roles/manage', asyncHandler(listRoles));
router.post('/roles/manage', validate(createRoleSchema), asyncHandler(createRole));
router.get('/roles/manage/:id', asyncHandler(getRole));
router.patch('/roles/manage/:id', validate(updateRoleSchema), asyncHandler(updateRole));
router.delete('/roles/manage/:id', asyncHandler(deleteRole));
router.put('/roles/manage/:id/permissions', validate(updateRolePermissionsSchema), asyncHandler(updateRolePermissions));

// Permission Management
router.get('/permissions', asyncHandler(listPermissions));

// Audit Log Management
router.get('/audit', asyncHandler(listAuditLogs));
router.get('/audit/stats', asyncHandler(getAuditStats));
router.get('/audit/entity-types', asyncHandler(getEntityTypes));
router.get('/audit/actions', asyncHandler(getActions));
router.get('/audit/user/:userId', asyncHandler(getUserActivity));
router.get('/audit/entity/:entity/:entityId', asyncHandler(getEntityAuditLogs));
router.get('/audit/:id', asyncHandler(getAuditLogDetail));

// ==================== PAYROLL MANAGEMENT ====================

// Salary Components
router.get('/salary-components', asyncHandler(listSalaryComponents));
router.post('/salary-components', asyncHandler(createSalaryComponent));
router.post('/salary-components/initialize', asyncHandler(initializeDefaultComponents));
router.put('/salary-components/order', asyncHandler(updateComponentOrder));
router.get('/salary-components/:id', asyncHandler(getSalaryComponent));
router.patch('/salary-components/:id', asyncHandler(updateSalaryComponent));
router.delete('/salary-components/:id', asyncHandler(deleteSalaryComponent));

// Salary Structures
router.get('/salary-structures', asyncHandler(listSalaryStructures));
router.post('/salary-structures', asyncHandler(createSalaryStructure));
router.post('/salary-structures/preview', asyncHandler(calculateSalaryPreview));
router.get('/salary-structures/:id', asyncHandler(getSalaryStructure));
router.patch('/salary-structures/:id', asyncHandler(updateSalaryStructure));
router.delete('/salary-structures/:id', asyncHandler(deleteSalaryStructure));
router.get('/employees/:userId/salary', asyncHandler(getEmployeeSalaryStructure));
router.get('/employees/:userId/salary-history', asyncHandler(getEmployeeSalaryHistory));

// Payslips
router.get('/payslips', asyncHandler(listPayslips));
router.post('/payslips/generate', asyncHandler(generatePayslip));
router.post('/payslips/bulk-generate', asyncHandler(bulkGeneratePayslips));
router.get('/payslips/summary', asyncHandler(getPayrollSummary));
router.patch('/payslips/bulk-status', asyncHandler(bulkUpdatePayslipStatus));
router.get('/payslips/:id', asyncHandler(getPayslip));
router.patch('/payslips/:id/status', asyncHandler(updatePayslipStatus));
router.delete('/payslips/:id', asyncHandler(deletePayslip));
router.get('/employees/:userId/payslips/:month/:year', asyncHandler(getEmployeePayslip));

// Tax Management
router.get('/tax/slabs', asyncHandler(listTaxSlabs));
router.post('/tax/slabs', asyncHandler(createTaxSlab));
router.post('/tax/slabs/initialize', asyncHandler(initializeDefaultTaxSlabs));
router.patch('/tax/slabs/:id', asyncHandler(updateTaxSlab));
router.delete('/tax/slabs/:id', asyncHandler(deleteTaxSlab));
router.post('/tax/calculate', asyncHandler(calculateTaxPreview));

// Tax Declarations
router.get('/tax/declarations', asyncHandler(listTaxDeclarations));
router.post('/tax/declarations', asyncHandler(saveTaxDeclaration));
router.get('/tax/declarations/:id', asyncHandler(getTaxDeclaration));
router.post('/tax/declarations/:id/submit', asyncHandler(submitTaxDeclaration));
router.post('/tax/declarations/:id/review', asyncHandler(reviewTaxDeclaration));
router.get('/employees/:userId/tax-declaration/:financialYear', asyncHandler(getEmployeeTaxDeclaration));

// ==================== REPORTS ====================

router.get('/reports', asyncHandler(getReportOverview));
router.get('/reports/headcount', asyncHandler(getHeadcountReport));
router.get('/reports/attendance', asyncHandler(getAttendanceReport));
router.get('/reports/leave', asyncHandler(getLeaveReport));
router.get('/reports/payroll', asyncHandler(getPayrollReport));
router.get('/reports/turnover', asyncHandler(getTurnoverReport));

// ==================== ANALYTICS ====================

router.get('/analytics', asyncHandler(getDashboardAnalytics));
router.get('/analytics/employee-growth', asyncHandler(getEmployeeGrowthAnalytics));
router.get('/analytics/attendance', asyncHandler(getAttendanceAnalytics));

// ==================== NOTIFICATIONS ====================

router.get('/notifications', asyncHandler(listNotifications));
router.get('/notifications/unread-count', asyncHandler(getUnreadCount));
router.post('/notifications/mark-all-read', asyncHandler(markAllAsRead));
router.delete('/notifications/read', asyncHandler(deleteReadNotifications));
router.patch('/notifications/:id/read', asyncHandler(markAsRead));
router.delete('/notifications/:id', asyncHandler(deleteNotification));
router.post('/notifications/announcement', asyncHandler(createAnnouncement));

// ==================== EMAIL PREFERENCES ====================

router.get('/email-preferences', asyncHandler(getEmailPreferences));
router.put('/email-preferences', asyncHandler(updateEmailPreferences));
router.post('/email-preferences/toggle-all', asyncHandler(toggleAllEmails));
router.get('/email-preferences/test', asyncHandler(testEmailConfiguration));

// ==================== CELEBRATIONS (Birthdays & Anniversaries) ====================

router.get('/celebrations', asyncHandler(listAllCelebrations));
router.get('/celebrations/birthdays', asyncHandler(listUpcomingBirthdays));
router.get('/celebrations/anniversaries', asyncHandler(listUpcomingAnniversaries));
router.post('/celebrations/trigger-check', asyncHandler(triggerCheck));

// ==================== GOALS (OKRs/KPIs) ====================

router.get('/goals', asyncHandler(listGoals));
router.get('/goals/stats', asyncHandler(getGoalStats));
router.get('/goals/hierarchy', asyncHandler(getGoalHierarchy));
router.get('/goals/:id', asyncHandler(getGoal));
router.post('/goals', asyncHandler(createGoal));
router.put('/goals/:id', asyncHandler(updateGoal));
router.patch('/goals/:id/progress', asyncHandler(updateGoalProgress));
router.delete('/goals/:id', asyncHandler(deleteGoal));

// Key Results
router.post('/goals/:id/key-results', asyncHandler(addKeyResult));
router.put('/goals/:id/key-results/:krId', asyncHandler(updateKeyResult));
router.delete('/goals/:id/key-results/:krId', asyncHandler(deleteKeyResult));

// ==================== PERFORMANCE REVIEWS ====================

// Review Cycles
router.get('/review-cycles', asyncHandler(listReviewCycles));
router.get('/review-cycles/:id', asyncHandler(getReviewCycle));
router.post('/review-cycles', asyncHandler(createReviewCycle));
router.put('/review-cycles/:id', asyncHandler(updateReviewCycle));
router.delete('/review-cycles/:id', asyncHandler(deleteReviewCycle));
router.post('/review-cycles/:id/activate', asyncHandler(activateCycle));
router.post('/review-cycles/:id/questions', asyncHandler(addQuestionToCycle));
router.delete('/review-cycles/:id/questions/:questionId', asyncHandler(removeQuestionFromCycle));

// Review Questions
router.get('/review-questions', asyncHandler(listReviewQuestions));
router.post('/review-questions', asyncHandler(createReviewQuestion));
router.put('/review-questions/:id', asyncHandler(updateReviewQuestion));
router.delete('/review-questions/:id', asyncHandler(deleteReviewQuestion));

// Performance Reviews
router.get('/reviews', asyncHandler(listReviews));
router.get('/reviews/stats', asyncHandler(getReviewStats));
router.get('/reviews/:id', asyncHandler(getReview));
router.post('/reviews/:id/self-review', asyncHandler(submitSelfReview));
router.post('/reviews/:id/manager-review', asyncHandler(submitManagerReview));

// ==================== TIME TRACKING ====================

// Projects
router.get('/projects', asyncHandler(listProjects));
router.get('/projects/:id', asyncHandler(getProject));
router.post('/projects', asyncHandler(createProject));
router.put('/projects/:id', asyncHandler(updateProject));
router.delete('/projects/:id', asyncHandler(deleteProject));
router.post('/projects/:id/members', asyncHandler(addProjectMember));
router.delete('/projects/:id/members/:userId', asyncHandler(removeProjectMember));

// Time Logs
router.get('/timelogs', asyncHandler(listTimeLogs));
router.get('/timelogs/weekly', asyncHandler(getWeeklyTimesheet));
router.get('/timelogs/stats', asyncHandler(getTimesheetStats));
router.post('/timelogs', asyncHandler(createTimeLog));
router.put('/timelogs/:id', asyncHandler(updateTimeLog));
router.delete('/timelogs/:id', asyncHandler(deleteTimeLog));
router.post('/timelogs/submit', asyncHandler(submitTimesheet));
router.post('/timelogs/approve', asyncHandler(approveTimeLogs));
router.post('/timelogs/reject', asyncHandler(rejectTimeLogs));

// ==================== EXPENSES ====================

// Expense Categories
router.get('/expense-categories', asyncHandler(listExpenseCategories));
router.get('/expense-categories/:id', asyncHandler(getExpenseCategory));
router.post('/expense-categories', asyncHandler(createExpenseCategory));
router.put('/expense-categories/:id', asyncHandler(updateExpenseCategory));
router.delete('/expense-categories/:id', asyncHandler(deleteExpenseCategory));

// Expense Claims
router.get('/expenses', asyncHandler(listExpenseClaims));
router.get('/expenses/stats', asyncHandler(getExpenseStats));
router.get('/expenses/:id', asyncHandler(getExpenseClaim));
router.post('/expenses', asyncHandler(createExpenseClaim));
router.put('/expenses/:id', asyncHandler(updateExpenseClaim));
router.delete('/expenses/:id', asyncHandler(deleteExpenseClaim));
router.post('/expenses/:id/submit', asyncHandler(submitExpenseClaim));
router.post('/expenses/approve', asyncHandler(approveExpenseClaims));
router.post('/expenses/reject', asyncHandler(rejectExpenseClaims));
router.post('/expenses/reimburse', asyncHandler(markAsReimbursed));

// ==================== RECRUITMENT ====================

// Job Postings
router.get('/jobs', asyncHandler(listJobPostings));
router.get('/jobs/stats', asyncHandler(getRecruitmentStats));
router.get('/jobs/:id', asyncHandler(getJobPosting));
router.post('/jobs', asyncHandler(createJobPosting));
router.put('/jobs/:id', asyncHandler(updateJobPosting));
router.delete('/jobs/:id', asyncHandler(deleteJobPosting));
router.post('/jobs/:id/publish', asyncHandler(publishJob));
router.post('/jobs/:id/pause', asyncHandler(pauseJob));
router.post('/jobs/:id/close', asyncHandler(closeJob));

// Applications
router.get('/applications', asyncHandler(listApplications));
router.get('/applications/:id', asyncHandler(getApplication));
router.get('/applications/:id/full', asyncHandler(getApplicationWithInterviews));
router.post('/applications', asyncHandler(createApplication));
router.put('/applications/:id', asyncHandler(updateApplicationStatus));
router.delete('/applications/:id', asyncHandler(deleteApplication));

// Interviews
router.get('/interviews', asyncHandler(listInterviews));
router.get('/interviews/my', asyncHandler(getMyInterviews));
router.get('/interviews/:id', asyncHandler(getInterview));
router.post('/interviews', asyncHandler(scheduleInterview));
router.put('/interviews/:id', asyncHandler(updateInterview));
router.post('/interviews/:id/cancel', asyncHandler(cancelInterview));
router.post('/interviews/:id/feedback', asyncHandler(submitInterviewFeedback));
router.delete('/interviews/:id', asyncHandler(deleteInterview));

// Training Programs
router.get('/training', asyncHandler(listTrainingPrograms));
router.get('/training/stats', asyncHandler(getTrainingStats));
router.get('/training/calendar', asyncHandler(getTrainingCalendar));
router.get('/training/my', asyncHandler(getMyTrainings));
router.get('/training/:id', asyncHandler(getTrainingProgram));
router.post('/training', asyncHandler(createTrainingProgram));
router.put('/training/:id', asyncHandler(updateTrainingProgram));
router.delete('/training/:id', asyncHandler(deleteTrainingProgram));
router.post('/training/:id/start', asyncHandler(startProgram));
router.post('/training/:id/complete', asyncHandler(completeProgram));
router.post('/training/:id/cancel', asyncHandler(cancelProgram));
router.post('/training/:id/enroll', asyncHandler(enrollParticipants));
router.post('/training/:id/bulk-complete', asyncHandler(bulkCompleteEnrollments));
router.post('/training/:id/feedback', asyncHandler(submitFeedback));
router.put('/training/:id/enrollments/:enrollmentId', asyncHandler(updateEnrollment));
router.delete('/training/:id/enrollments/:enrollmentId', asyncHandler(removeEnrollment));

// Skills
router.get('/skills', asyncHandler(listSkills));
router.get('/skills/stats', asyncHandler(getSkillStats));
router.get('/skills/matrix', asyncHandler(getSkillMatrix));
router.get('/skills/gap-analysis', asyncHandler(getSkillGapAnalysis));
router.get('/skills/my', asyncHandler(getMySkills));
router.post('/skills/my', asyncHandler(addMySkill));
router.put('/skills/my/:skillId', asyncHandler(updateMySkill));
router.get('/skills/:id', asyncHandler(getSkill));
router.post('/skills', asyncHandler(createSkill));
router.put('/skills/:id', asyncHandler(updateSkill));
router.delete('/skills/:id', asyncHandler(deleteSkill));
router.get('/skills/employee/:userId', asyncHandler(getEmployeeSkills));
router.post('/skills/employee/:userId', asyncHandler(assignSkill));
router.put('/skills/employee/:userId/:skillId', asyncHandler(updateEmployeeSkill));
router.delete('/skills/employee/:userId/:skillId', asyncHandler(removeEmployeeSkill));
router.post('/skills/bulk-assign', asyncHandler(bulkAssignSkill));

// Assets
router.get('/assets', asyncHandler(listAssets));
router.get('/assets/stats', asyncHandler(getAssetStats));
router.get('/assets/my', asyncHandler(getMyAssets));
router.get('/assets/my/history', asyncHandler(getMyAssetHistory));
router.get('/assets/:id', asyncHandler(getAsset));
router.get('/assets/:id/history', asyncHandler(getAssetHistory));
router.post('/assets', asyncHandler(createAsset));
router.put('/assets/:id', asyncHandler(updateAsset));
router.delete('/assets/:id', asyncHandler(deleteAsset));
router.post('/assets/:id/allocate', asyncHandler(allocateAsset));
router.post('/assets/:id/return', asyncHandler(returnAsset));
router.patch('/assets/:id/status', asyncHandler(updateAssetStatus));

// Documents (Company Documents)
router.get('/documents', asyncHandler(listDocuments));
router.get('/documents/categories', asyncHandler(getDocumentCategories));
router.get('/documents/stats', asyncHandler(getDocumentStats));
router.get('/documents/:id', asyncHandler(getDocument));
router.post('/documents', asyncHandler(createDocument));
router.put('/documents/:id', asyncHandler(updateDocument));
router.delete('/documents/:id', asyncHandler(deleteDocument));
router.post('/documents/:id/version', asyncHandler(uploadNewVersion));

// Employee Documents
router.get('/employee-documents', asyncHandler(listEmployeeDocuments));
router.get('/employee-documents/my', asyncHandler(getMyDocuments));
router.get('/employee-documents/expiring', asyncHandler(getExpiringDocuments));
router.get('/employee-documents/stats', asyncHandler(getEmployeeDocumentStats));
router.get('/employee-documents/:id', asyncHandler(getEmployeeDocument));
router.post('/employee-documents', asyncHandler(createEmployeeDocument));
router.put('/employee-documents/:id', asyncHandler(updateEmployeeDocument));
router.delete('/employee-documents/:id', asyncHandler(deleteEmployeeDocument));
router.patch('/employee-documents/:id/verify', asyncHandler(verifyEmployeeDocument));

// Bonus Management
router.get('/bonuses', asyncHandler(listBonuses));
router.get('/bonuses/stats', asyncHandler(getBonusStats));
router.get('/bonuses/:id', asyncHandler(getBonus));
router.post('/bonuses', asyncHandler(createBonus));
router.put('/bonuses/:id', asyncHandler(updateBonus));
router.delete('/bonuses/:id', asyncHandler(deleteBonus));
router.patch('/bonuses/:id/approve', asyncHandler(approveBonus));
router.patch('/bonuses/:id/reject', asyncHandler(rejectBonus));
router.patch('/bonuses/:id/pay', asyncHandler(markBonusPaid));
router.patch('/bonuses/:id/cancel', asyncHandler(cancelBonus));

// Incentive Schemes
router.get('/incentive-schemes', asyncHandler(listIncentiveSchemes));
router.get('/incentive-schemes/:id', asyncHandler(getIncentiveScheme));
router.post('/incentive-schemes', asyncHandler(createIncentiveScheme));
router.put('/incentive-schemes/:id', asyncHandler(updateIncentiveScheme));
router.delete('/incentive-schemes/:id', asyncHandler(deleteIncentiveScheme));

// Incentive Records
router.get('/incentives', asyncHandler(listIncentiveRecords));
router.get('/incentives/stats', asyncHandler(getIncentiveStats));
router.get('/incentives/:id', asyncHandler(getIncentiveRecord));
router.post('/incentives', asyncHandler(createIncentiveRecord));
router.put('/incentives/:id', asyncHandler(updateIncentiveRecord));
router.delete('/incentives/:id', asyncHandler(deleteIncentiveRecord));
router.patch('/incentives/:id/approve', asyncHandler(approveIncentiveRecord));
router.patch('/incentives/:id/reject', asyncHandler(rejectIncentiveRecord));
router.patch('/incentives/:id/pay', asyncHandler(markIncentivePaid));

// Custom Report Builder
router.get('/report-builder/fields', asyncHandler(getAvailableFields));
router.get('/report-builder/stats', asyncHandler(getReportBuilderStats));
router.post('/report-builder/preview', asyncHandler(previewReport));

// Report Templates
router.get('/report-builder/templates', asyncHandler(listReportTemplates));
router.get('/report-builder/templates/:id', asyncHandler(getReportTemplate));
router.post('/report-builder/templates', asyncHandler(createReportTemplate));
router.put('/report-builder/templates/:id', asyncHandler(updateReportTemplate));
router.delete('/report-builder/templates/:id', asyncHandler(deleteReportTemplate));
router.post('/report-builder/templates/:id/duplicate', asyncHandler(duplicateReportTemplate));
router.post('/report-builder/templates/:id/run', asyncHandler(runReport));

// Generated Reports
router.get('/report-builder/reports', asyncHandler(listGeneratedReports));
router.get('/report-builder/reports/:id', asyncHandler(getGeneratedReport));
router.delete('/report-builder/reports/:id', asyncHandler(deleteGeneratedReport));

// Holiday Management - Weekly Off Config
router.get('/weekly-off', asyncHandler(getWeeklyOffConfig));
router.put('/weekly-off', asyncHandler(updateWeeklyOffConfig));

// Holidays
router.get('/holidays', asyncHandler(listHolidays));
router.get('/holidays/stats', asyncHandler(getHolidayStats));
router.get('/holidays/template', asyncHandler(downloadHolidayTemplate));
router.post('/holidays/bulk-import', asyncHandler(bulkImportHolidays));
router.get('/holidays/optional/quota', asyncHandler(getOptionalHolidayQuota));
router.put('/holidays/optional/quota', asyncHandler(updateOptionalHolidayQuota));
router.get('/holidays/optional/my-selections', asyncHandler(getMyOptionalHolidays));
router.post('/holidays/optional/:id/select', asyncHandler(selectOptionalHoliday));
router.delete('/holidays/optional/:id/cancel', asyncHandler(cancelOptionalHolidaySelection));
router.get('/holidays/:id', asyncHandler(getHoliday));
router.post('/holidays', asyncHandler(createHoliday));
router.patch('/holidays/:id', asyncHandler(updateHoliday));
router.delete('/holidays/:id', asyncHandler(deleteHoliday));

// ==================== DATA IMPORT (Migration) ====================

// Template Downloads
router.get('/import/template/:module', asyncHandler(downloadTemplate));

// Phase 1: Master Data Imports
router.post('/import/departments', uploadCSV, handleMulterError, asyncHandler(importDepartments));
router.post('/import/designations', uploadCSV, handleMulterError, asyncHandler(importDesignations));
router.post('/import/locations', uploadCSV, handleMulterError, asyncHandler(importLocations));
router.post('/import/roles', uploadCSV, handleMulterError, asyncHandler(importRoles));
router.post('/import/leave-types', uploadCSV, handleMulterError, asyncHandler(importLeaveTypes));
router.post('/import/salary-components', uploadCSV, handleMulterError, asyncHandler(importSalaryComponents));
router.post('/import/expense-categories', uploadCSV, handleMulterError, asyncHandler(importExpenseCategories));
router.post('/import/skills', uploadCSV, handleMulterError, asyncHandler(importSkills));
router.post('/import/projects', uploadCSV, handleMulterError, asyncHandler(importProjects));

// Phase 2: Employee Data Imports
router.post('/import/employees', uploadCSV, handleMulterError, asyncHandler(importEmployees));
router.post('/import/employee-skills', uploadCSV, handleMulterError, asyncHandler(importEmployeeSkills));
router.post('/import/salary-structures', uploadCSV, handleMulterError, asyncHandler(importSalaryStructures));

// Phase 3: Transactional Data Imports
router.post('/import/leave-balances', uploadCSV, handleMulterError, asyncHandler(importLeaveBalances));
router.post('/import/attendance', uploadCSV, handleMulterError, asyncHandler(importAttendance));
router.post('/import/leave-requests', uploadCSV, handleMulterError, asyncHandler(importLeaveRequests));
router.post('/import/assets', uploadCSV, handleMulterError, asyncHandler(importAssets));
router.post('/import/asset-allocations', uploadCSV, handleMulterError, asyncHandler(importAssetAllocations));

export default router;
