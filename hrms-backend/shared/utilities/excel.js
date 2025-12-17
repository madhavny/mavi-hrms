import ExcelJS from 'exceljs';

/**
 * Create an Excel workbook with styled data
 * @param {Object} options - Export options
 * @param {string} options.title - Report title
 * @param {string} options.sheetName - Worksheet name
 * @param {Array} options.columns - Column definitions [{header, key, width}]
 * @param {Array} options.data - Data rows
 * @param {Object} options.filters - Applied filters for header info
 * @param {string} options.tenantName - Tenant name for branding
 * @returns {Promise<Buffer>} Excel file buffer
 */
export async function generateExcel({ title, sheetName, columns, data, filters = {}, tenantName = '' }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mavi HRMS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName || 'Report');

  // Add title row
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Add tenant name
  if (tenantName) {
    worksheet.mergeCells(2, 1, 2, columns.length);
    const tenantCell = worksheet.getCell('A2');
    tenantCell.value = tenantName;
    tenantCell.font = { size: 12, color: { argb: 'FF6B7280' } };
    tenantCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Add filter info
  const filterText = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');

  if (filterText) {
    const filterRow = tenantName ? 3 : 2;
    worksheet.mergeCells(filterRow, 1, filterRow, columns.length);
    const filterCell = worksheet.getCell(`A${filterRow}`);
    filterCell.value = filterText;
    filterCell.font = { size: 10, italic: true, color: { argb: 'FF9CA3AF' } };
    filterCell.alignment = { horizontal: 'center' };
  }

  // Add generated date
  const dateRow = (tenantName ? 3 : 2) + (filterText ? 1 : 0);
  worksheet.mergeCells(dateRow, 1, dateRow, columns.length);
  const dateCell = worksheet.getCell(`A${dateRow}`);
  dateCell.value = `Generated: ${new Date().toLocaleString()}`;
  dateCell.font = { size: 9, color: { argb: 'FF9CA3AF' } };
  dateCell.alignment = { horizontal: 'right' };

  // Add empty row before header
  const headerRow = dateRow + 2;

  // Setup columns
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Move column headers to the correct row
  const headerRowObj = worksheet.getRow(headerRow);
  columns.forEach((col, index) => {
    const cell = headerRowObj.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2563EB' } },
      bottom: { style: 'thin', color: { argb: 'FF2563EB' } },
      left: { style: 'thin', color: { argb: 'FF2563EB' } },
      right: { style: 'thin', color: { argb: 'FF2563EB' } },
    };
  });
  headerRowObj.height = 25;

  // Add data rows
  data.forEach((rowData, rowIndex) => {
    const row = worksheet.getRow(headerRow + 1 + rowIndex);
    columns.forEach((col, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      let value = rowData[col.key];

      // Format dates
      if (value instanceof Date) {
        value = value.toLocaleDateString();
      } else if (col.key.toLowerCase().includes('date') && value) {
        value = new Date(value).toLocaleDateString();
      }

      cell.value = value ?? '';
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    // Alternate row coloring
    if (rowIndex % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      });
    }
  });

  // Add summary row at the bottom
  const summaryRow = worksheet.getRow(headerRow + data.length + 2);
  summaryRow.getCell(1).value = `Total Records: ${data.length}`;
  summaryRow.getCell(1).font = { bold: true, size: 10 };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Employee export columns
 */
export const employeeExcelColumns = [
  { header: 'Employee Code', key: 'employeeCode', width: 15 },
  { header: 'First Name', key: 'firstName', width: 15 },
  { header: 'Last Name', key: 'lastName', width: 15 },
  { header: 'Email', key: 'email', width: 25 },
  { header: 'Phone', key: 'phone', width: 15 },
  { header: 'Role', key: 'roleName', width: 15 },
  { header: 'Department', key: 'departmentName', width: 20 },
  { header: 'Designation', key: 'designationName', width: 20 },
  { header: 'Location', key: 'locationName', width: 15 },
  { header: 'Date of Joining', key: 'dateOfJoining', width: 15 },
  { header: 'Employment Type', key: 'employmentType', width: 15 },
  { header: 'Status', key: 'status', width: 10 },
];

/**
 * Attendance export columns
 */
export const attendanceExcelColumns = [
  { header: 'Date', key: 'date', width: 12 },
  { header: 'Employee Code', key: 'employeeCode', width: 15 },
  { header: 'Employee Name', key: 'employeeName', width: 20 },
  { header: 'Department', key: 'department', width: 18 },
  { header: 'Clock In', key: 'clockIn', width: 12 },
  { header: 'Clock Out', key: 'clockOut', width: 12 },
  { header: 'Total Hours', key: 'totalHours', width: 12 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Remarks', key: 'remarks', width: 25 },
];

/**
 * Leave report export columns
 */
export const leaveExcelColumns = [
  { header: 'Employee Code', key: 'employeeCode', width: 15 },
  { header: 'Employee Name', key: 'employeeName', width: 20 },
  { header: 'Department', key: 'department', width: 18 },
  { header: 'Leave Type', key: 'leaveType', width: 15 },
  { header: 'From Date', key: 'fromDate', width: 12 },
  { header: 'To Date', key: 'toDate', width: 12 },
  { header: 'Total Days', key: 'totalDays', width: 10 },
  { header: 'Reason', key: 'reason', width: 30 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Applied On', key: 'createdAt', width: 12 },
];
