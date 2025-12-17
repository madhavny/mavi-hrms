import PDFDocument from 'pdfkit';

/**
 * Generate a PDF report
 * @param {Object} options - Export options
 * @param {string} options.title - Report title
 * @param {Array} options.columns - Column definitions [{header, key, width}]
 * @param {Array} options.data - Data rows
 * @param {Object} options.filters - Applied filters for header info
 * @param {string} options.tenantName - Tenant name for branding
 * @param {string} options.orientation - 'portrait' or 'landscape'
 * @returns {Promise<Buffer>} PDF file buffer
 */
export async function generatePDF({ title, columns, data, filters = {}, tenantName = '', orientation = 'landscape' }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: orientation,
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = orientation === 'landscape' ? 842 : 595;
      const pageHeight = orientation === 'landscape' ? 595 : 842;
      const contentWidth = pageWidth - 80; // margins
      const startX = 40;

      // Colors
      const primaryColor = '#3B82F6';
      const headerBg = '#1F2937';
      const textColor = '#374151';
      const lightGray = '#9CA3AF';
      const borderColor = '#E5E7EB';

      // Header section
      doc.fontSize(20).fillColor(headerBg).text(title, startX, 40, { align: 'center', width: contentWidth });

      let currentY = 70;

      // Tenant name
      if (tenantName) {
        doc.fontSize(12).fillColor(lightGray).text(tenantName, startX, currentY, { align: 'center', width: contentWidth });
        currentY += 20;
      }

      // Filter info
      const filterText = Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

      if (filterText) {
        doc.fontSize(9).fillColor(lightGray).text(filterText, startX, currentY, { align: 'center', width: contentWidth });
        currentY += 15;
      }

      // Generated date
      doc.fontSize(8).fillColor(lightGray).text(`Generated: ${new Date().toLocaleString()}`, startX, currentY, { align: 'right', width: contentWidth });
      currentY += 25;

      // Calculate column widths
      const totalWidth = columns.reduce((sum, col) => sum + (col.width || 15), 0);
      const scaleFactor = contentWidth / totalWidth;
      const scaledColumns = columns.map(col => ({
        ...col,
        scaledWidth: (col.width || 15) * scaleFactor,
      }));

      // Table header
      const headerHeight = 25;
      doc.rect(startX, currentY, contentWidth, headerHeight).fill(primaryColor);

      let headerX = startX;
      scaledColumns.forEach((col) => {
        doc.fontSize(9).fillColor('#FFFFFF').text(
          col.header,
          headerX + 4,
          currentY + 7,
          { width: col.scaledWidth - 8, align: 'left' }
        );
        headerX += col.scaledWidth;
      });
      currentY += headerHeight;

      // Table rows
      const rowHeight = 22;
      const maxY = pageHeight - 60; // Leave space for footer

      data.forEach((rowData, rowIndex) => {
        // Check if we need a new page
        if (currentY + rowHeight > maxY) {
          doc.addPage();
          currentY = 40;

          // Repeat header on new page
          doc.rect(startX, currentY, contentWidth, headerHeight).fill(primaryColor);
          let hX = startX;
          scaledColumns.forEach((col) => {
            doc.fontSize(9).fillColor('#FFFFFF').text(
              col.header,
              hX + 4,
              currentY + 7,
              { width: col.scaledWidth - 8, align: 'left' }
            );
            hX += col.scaledWidth;
          });
          currentY += headerHeight;
        }

        // Alternate row background
        if (rowIndex % 2 === 1) {
          doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F9FAFB');
        }

        // Row border
        doc.moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke(borderColor);

        // Cell data
        let cellX = startX;
        scaledColumns.forEach((col) => {
          let value = rowData[col.key];

          // Format dates
          if (value instanceof Date) {
            value = value.toLocaleDateString();
          } else if (col.key.toLowerCase().includes('date') && value) {
            try {
              value = new Date(value).toLocaleDateString();
            } catch {
              // Keep original value
            }
          }

          // Format time fields
          if ((col.key === 'clockIn' || col.key === 'clockOut') && value) {
            try {
              value = new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } catch {
              // Keep original value
            }
          }

          // Truncate long text
          const maxChars = Math.floor(col.scaledWidth / 5);
          const displayValue = value ? String(value).substring(0, maxChars) : '-';

          doc.fontSize(8).fillColor(textColor).text(
            displayValue,
            cellX + 4,
            currentY + 6,
            { width: col.scaledWidth - 8, align: 'left' }
          );
          cellX += col.scaledWidth;
        });

        currentY += rowHeight;
      });

      // Summary
      currentY += 15;
      doc.fontSize(10).fillColor(textColor).text(`Total Records: ${data.length}`, startX, currentY);

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(lightGray).text(
          `Page ${i + 1} of ${pages.count} | Mavi HRMS`,
          startX,
          pageHeight - 30,
          { align: 'center', width: contentWidth }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Employee PDF columns (narrower for PDF)
 */
export const employeePDFColumns = [
  { header: 'Code', key: 'employeeCode', width: 12 },
  { header: 'Name', key: 'fullName', width: 18 },
  { header: 'Email', key: 'email', width: 22 },
  { header: 'Role', key: 'roleName', width: 12 },
  { header: 'Department', key: 'departmentName', width: 15 },
  { header: 'Joining Date', key: 'dateOfJoining', width: 12 },
  { header: 'Status', key: 'status', width: 9 },
];

/**
 * Attendance PDF columns
 */
export const attendancePDFColumns = [
  { header: 'Date', key: 'date', width: 12 },
  { header: 'Code', key: 'employeeCode', width: 10 },
  { header: 'Name', key: 'employeeName', width: 16 },
  { header: 'Dept', key: 'department', width: 12 },
  { header: 'In', key: 'clockIn', width: 10 },
  { header: 'Out', key: 'clockOut', width: 10 },
  { header: 'Hours', key: 'totalHours', width: 8 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Remarks', key: 'remarks', width: 12 },
];

/**
 * Leave PDF columns
 */
export const leavePDFColumns = [
  { header: 'Code', key: 'employeeCode', width: 10 },
  { header: 'Name', key: 'employeeName', width: 16 },
  { header: 'Dept', key: 'department', width: 12 },
  { header: 'Type', key: 'leaveType', width: 12 },
  { header: 'From', key: 'fromDate', width: 11 },
  { header: 'To', key: 'toDate', width: 11 },
  { header: 'Days', key: 'totalDays', width: 6 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Reason', key: 'reason', width: 12 },
];
