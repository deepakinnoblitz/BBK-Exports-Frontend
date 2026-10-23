import ExcelJS from 'exceljs';

export interface DynamicHeadCountRow {
    department?: string;
    designation?: string;
    category: string;
    manpower: number;
    present: number;
    absent: number;
    absent_pct: number;
    sub_items?: DynamicHeadCountRow[];
}

export interface DailyReportData {
    attendance_by_department: Array<{
        employee: string;
        employee_name: string;
        department: string;
        designation: string;
        in_time: string;
        out_time: string;
        status: string;
        is_present: boolean;
        line_order?: string;
        attendance_name?: string | null;
    }>;
    department_summaries?: Array<{
        department: string;
        total: number;
        present: number;
        absent: number;
    }>;
    head_count: {
        staff?: DynamicHeadCountRow[];
        staff_departments?: DynamicHeadCountRow[];
        staff_designations?: DynamicHeadCountRow[];
        staff_total: { category: string; manpower: number; present: number; absent: number; absent_pct: number };
        workers?: DynamicHeadCountRow[];
        worker_departments?: DynamicHeadCountRow[];
        worker_designations?: DynamicHeadCountRow[];
        workers_total: { category: string; manpower: number; present: number; absent: number; absent_pct: number };
        factory_total: { category: string; manpower: number; present: number; absent: number; absent_pct: number };
    };
    line_wise: {
        production_sections: Array<{
            section_name: string;
            lines: Array<{
                line_name: string;
                existing: { str: number; pre: number; abs: number; abs_pct: number };
                new_join: { str: number; pre: number; abs: number; abs_pct: number };
                north_indian: { str: number; pre: number; abs: number; abs_pct: number };
                total: { str: number; pre: number; abs: number; abs_pct: number };
            }>;
            total: {
                line_name: string;
                existing: { str: number; pre: number; abs: number; abs_pct: number };
                new_join: { str: number; pre: number; abs: number; abs_pct: number };
                north_indian: { str: number; pre: number; abs: number; abs_pct: number };
                total: { str: number; pre: number; abs: number; abs_pct: number };
            };
        }>;
        production_grand_total: {
            line_name: string;
            existing: { str: number; pre: number; abs: number; abs_pct: number };
            new_join: { str: number; pre: number; abs: number; abs_pct: number };
            north_indian: { str: number; pre: number; abs: number; abs_pct: number };
            total: { str: number; pre: number; abs: number; abs_pct: number };
        };
        non_production_section: {
            section_name: string;
            lines: Array<{
                line_name: string;
                existing: { str: number; pre: number; abs: number; abs_pct: number };
                new_join: { str: number; pre: number; abs: number; abs_pct: number };
                north_indian: { str: number; pre: number; abs: number; abs_pct: number };
                total: { str: number; pre: number; abs: number; abs_pct: number };
            }>;
            total: {
                line_name: string;
                existing: { str: number; pre: number; abs: number; abs_pct: number };
                new_join: { str: number; pre: number; abs: number; abs_pct: number };
                north_indian: { str: number; pre: number; abs: number; abs_pct: number };
                total: { str: number; pre: number; abs: number; abs_pct: number };
            };
        };
        factory_grand_total: {
            line_name: string;
            existing: { str: number; pre: number; abs: number; abs_pct: number };
            new_join: { str: number; pre: number; abs: number; abs_pct: number };
            north_indian: { str: number; pre: number; abs: number; abs_pct: number };
            total: { str: number; pre: number; abs: number; abs_pct: number };
        };
    };
    meta: {
        date: string;
        total_employees: number;
        total_present: number;
        total_absent: number;
        present_pct: number;
    };
}

export async function exportDailyReportToExcel(data: DailyReportData, formattedDate: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BBK Exports HRMS';
    workbook.created = new Date();

    const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'medium', color: { argb: 'FF1F2937' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'medium', color: { argb: 'FF1F2937' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    };

    // ==========================================
    // SHEET 1: attendance
    // ==========================================
    const wsAttendance = workbook.addWorksheet('attendance', {
        views: [{ showGridLines: true }],
    });

    wsAttendance.columns = [
        { width: 16 }, // Emp ID
        { width: 32 }, // Name
        { width: 26 }, // Department
        { width: 24 }, // Designation
        { width: 14 }, // In Time
        { width: 14 }, // Out Time
        { width: 16 }, // Present Status
    ];

    // Title Row
    const attTitleRow = wsAttendance.addRow(['BBK EXPORTS (P) LTD.,']);
    attTitleRow.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    wsAttendance.mergeCells('A1:G1');

    const attSubTitleRow = wsAttendance.addRow([`Daily Attendance Report - ${formattedDate}`]);
    attSubTitleRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF4B5563' } };
    wsAttendance.mergeCells('A2:G2');
    wsAttendance.addRow([]); // Blank spacer

    // Header Row
    const attHeader = wsAttendance.addRow([
        'Employee ID',
        'Employee Name',
        'Department',
        'Designation',
        'In Time',
        'Out Time',
        'Present',
    ]);
    attHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    attHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    attHeader.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF059669' }, // Emerald theme
        };
        cell.border = headerBorder;
    });

    data.attendance_by_department.forEach((emp) => {
        const row = wsAttendance.addRow([
            emp.employee,
            emp.employee_name,
            emp.department,
            emp.designation,
            emp.in_time || '--',
            emp.out_time || '--',
            emp.status,
        ]);
        row.font = { name: 'Calibri', size: 10 };
        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

        // Highlight status
        const statusCell = row.getCell(7);
        if (emp.status === 'Present') {
            statusCell.font = { bold: true, color: { argb: 'FF065F46' } };
        } else if (emp.status === 'MP') {
            statusCell.font = { bold: true, color: { argb: 'FFB45309' } };
        } else if (emp.status === 'Absent') {
            statusCell.font = { bold: true, color: { argb: 'FF991B1B' } };
        }

        row.eachCell((cell) => {
            cell.border = thinBorder;
        });
    });

    // ==========================================
    // SHEET 2: head count report
    // ==========================================
    const wsHeadCount = workbook.addWorksheet('head count report', {
        views: [{ showGridLines: true }],
    });

    wsHeadCount.columns = [
        { width: 22 }, // Section / Group
        { width: 26 }, // Category Name
        { width: 14 }, // Manpower
        { width: 16 }, // Actual - Present
        { width: 14 }, // Absent
        { width: 14 }, // Absent %
    ];

    // Titles
    const hcTitle = wsHeadCount.addRow(['BBK  EXPORTS  PVT  LTD']);
    hcTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    wsHeadCount.mergeCells('A1:F1');

    const hcSubTitle = wsHeadCount.addRow([`Factory Head Count   -   ${formattedDate}`]);
    hcSubTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF374151' } };
    wsHeadCount.mergeCells('A2:F2');
    wsHeadCount.addRow([]); // Blank spacer

    // Staff Table Header
    const staffHdr = wsHeadCount.addRow(['Staff Department', '', 'Manpower', 'Actual - Present', 'Absent', 'Absent %']);
    wsHeadCount.mergeCells(`A${staffHdr.number}:B${staffHdr.number}`);
    staffHdr.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
    staffHdr.alignment = { vertical: 'middle', horizontal: 'center' };
    staffHdr.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFA9D08E' }, // Soft green as in Excel
        };
        cell.border = headerBorder;
    });

    // Staff Rows (Dynamic)
    const staffRows = data.head_count.staff_departments || data.head_count.staff || [];
    staffRows.forEach((st) => {
        const r = wsHeadCount.addRow([
            st.department || st.category,
            '',
            st.manpower,
            st.present,
            st.absent,
            `${st.absent_pct.toFixed(1)}%`,
        ]);
        wsHeadCount.mergeCells(`A${r.number}:B${r.number}`);
        r.font = { name: 'Calibri', size: 10 };
        r.alignment = { vertical: 'middle' };
        r.getCell(3).alignment = { horizontal: 'right' };
        r.getCell(4).alignment = { horizontal: 'right' };
        r.getCell(5).alignment = { horizontal: 'right' };
        r.getCell(6).alignment = { horizontal: 'right' };
        r.eachCell((cell) => {
            cell.border = thinBorder;
        });
    });

    // Staff Total
    const stTotal = wsHeadCount.addRow([
        'Staff Total',
        '',
        data.head_count.staff_total.manpower,
        data.head_count.staff_total.present,
        data.head_count.staff_total.absent,
        `${data.head_count.staff_total.absent_pct.toFixed(1)}%`,
    ]);
    wsHeadCount.mergeCells(`A${stTotal.number}:B${stTotal.number}`);
    stTotal.font = { name: 'Calibri', size: 10, bold: true };
    stTotal.alignment = { vertical: 'middle' };
    stTotal.getCell(3).alignment = { horizontal: 'right' };
    stTotal.getCell(4).alignment = { horizontal: 'right' };
    stTotal.getCell(5).alignment = { horizontal: 'right' };
    stTotal.getCell(6).alignment = { horizontal: 'right' };
    stTotal.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        cell.border = headerBorder;
    });

    wsHeadCount.addRow([]); // Blank spacer

    // Worker's Section Header
    const wkrHdr = wsHeadCount.addRow(["Worker's Department", '', 'Manpower', 'Actual - Present', 'Absent', 'Absent %']);
    wsHeadCount.mergeCells(`A${wkrHdr.number}:B${wkrHdr.number}`);
    wkrHdr.font = { name: 'Calibri', size: 11, bold: true };
    wkrHdr.alignment = { vertical: 'middle', horizontal: 'center' };
    wkrHdr.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } };
        cell.border = headerBorder;
    });

    // Worker Rows (Dynamic)
    const workerRows = data.head_count.worker_departments || data.head_count.workers || [];
    workerRows.forEach((w) => {
        const r = wsHeadCount.addRow([
            w.department || w.category,
            '',
            w.manpower,
            w.present,
            w.absent,
            `${w.absent_pct.toFixed(1)}%`,
        ]);
        wsHeadCount.mergeCells(`A${r.number}:B${r.number}`);
        r.font = { name: 'Calibri', size: 10 };
        r.alignment = { vertical: 'middle' };
        r.getCell(3).alignment = { horizontal: 'right' };
        r.getCell(4).alignment = { horizontal: 'right' };
        r.getCell(5).alignment = { horizontal: 'right' };
        r.getCell(6).alignment = { horizontal: 'right' };
        r.eachCell((cell) => {
            cell.border = thinBorder;
        });
    });

    // Worker's Total
    const wkrTotalRow = wsHeadCount.addRow([
        "Worker's Total",
        '',
        data.head_count.workers_total.manpower,
        data.head_count.workers_total.present,
        data.head_count.workers_total.absent,
        `${data.head_count.workers_total.absent_pct.toFixed(1)}%`,
    ]);
    wsHeadCount.mergeCells(`A${wkrTotalRow.number}:B${wkrTotalRow.number}`);
    wkrTotalRow.font = { name: 'Calibri', size: 10, bold: true };
    wkrTotalRow.alignment = { vertical: 'middle' };
    wkrTotalRow.getCell(3).alignment = { horizontal: 'right' };
    wkrTotalRow.getCell(4).alignment = { horizontal: 'right' };
    wkrTotalRow.getCell(5).alignment = { horizontal: 'right' };
    wkrTotalRow.getCell(6).alignment = { horizontal: 'right' };
    wkrTotalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        cell.border = headerBorder;
    });
    wsHeadCount.mergeCells(`A${wkrTotalRow.number}:B${wkrTotalRow.number}`);
    wkrTotalRow.font = { name: 'Calibri', size: 10, bold: true };
    wkrTotalRow.alignment = { vertical: 'middle' };
    wkrTotalRow.getCell(3).alignment = { horizontal: 'right' };
    wkrTotalRow.getCell(4).alignment = { horizontal: 'right' };
    wkrTotalRow.getCell(5).alignment = { horizontal: 'right' };
    wkrTotalRow.getCell(6).alignment = { horizontal: 'right' };
    wkrTotalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        cell.border = headerBorder;
    });

    wsHeadCount.addRow([]); // Blank spacer

    // Factory Total (Yellow highlight)
    const factTotalRow = wsHeadCount.addRow([
        'Factory Total',
        '',
        data.head_count.factory_total.manpower,
        data.head_count.factory_total.present,
        data.head_count.factory_total.absent,
        `${data.head_count.factory_total.absent_pct.toFixed(1)}%`,
    ]);
    wsHeadCount.mergeCells(`A${factTotalRow.number}:B${factTotalRow.number}`);
    factTotalRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1F2937' } };
    factTotalRow.alignment = { vertical: 'middle' };
    factTotalRow.getCell(3).alignment = { horizontal: 'right' };
    factTotalRow.getCell(4).alignment = { horizontal: 'right' };
    factTotalRow.getCell(5).alignment = { horizontal: 'right' };
    factTotalRow.getCell(6).alignment = { horizontal: 'right' };
    factTotalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Light Yellow
        cell.border = {
            top: { style: 'medium', color: { argb: 'FFD97706' } },
            bottom: { style: 'double', color: { argb: 'FFD97706' } },
            left: { style: 'medium', color: { argb: 'FFD97706' } },
            right: { style: 'medium', color: { argb: 'FFD97706' } },
        };
    });

    // ==========================================
    // SHEET 3: Line wise report
    // ==========================================
    const wsLineWise = workbook.addWorksheet('Line wise report', {
        views: [{ showGridLines: true }],
    });

    wsLineWise.columns = [
        { width: 18 }, // SECTION
        { width: 28 }, // LINE
        // Existing
        { width: 9 },  // STR
        { width: 9 },  // PRE
        { width: 9 },  // ABS
        { width: 11 }, // ABS%
        // New Join
        { width: 9 },  // STR
        { width: 9 },  // PRE
        { width: 9 },  // ABS
        { width: 11 }, // ABS%
        // North Indian
        { width: 9 },  // STR
        { width: 9 },  // PRE
        { width: 9 },  // ABS
        { width: 11 }, // ABS%
        // Total
        { width: 10 }, // STR
        { width: 10 }, // PRE
        { width: 10 }, // ABS
        { width: 12 }, // ABS%
    ];

    // Title Row
    const lwTitle = wsLineWise.addRow(['BBK EXPORTS - DAILY LINE WISE MANPOWER - ATTENDANCE']);
    lwTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    wsLineWise.mergeCells('A1:R1');

    // Date & Dimension Header Row (Row 3)
    const dimHeader = wsLineWise.addRow([
        formattedDate,
        '',
        'EXISTING', '', '', '',
        'NEW JOIN', '', '', '',
        'NORTH INDIAN', '', '', '',
        'TOTAL', '', '', ''
    ]);
    dimHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    dimHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    wsLineWise.mergeCells('C2:F2');
    wsLineWise.mergeCells('G2:J2');
    wsLineWise.mergeCells('K2:N2');
    wsLineWise.mergeCells('O2:R2');

    // Colors for top groups
    for (let col = 3; col <= 6; col++) {
        dimHeader.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Blue
    }
    for (let col = 7; col <= 10; col++) {
        dimHeader.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }; // Teal
    }
    for (let col = 11; col <= 14; col++) {
        dimHeader.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple
    }
    for (let col = 15; col <= 18; col++) {
        dimHeader.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Emerald
    }

    // Sub-columns header Row (Row 3)
    const subHeader = wsLineWise.addRow([
        'SECTION', 'LINE / DEPARTMENT',
        'STR', 'PRE', 'ABS', 'ABS%',
        'STR', 'PRE', 'ABS', 'ABS%',
        'STR', 'PRE', 'ABS', 'ABS%',
        'STR', 'PRE', 'ABS', 'ABS%',
    ]);
    subHeader.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1F2937' } };
    subHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    subHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        cell.border = headerBorder;
    });

    const addLineWiseRow = (
        secName: string,
        lineName: string,
        stats: {
            existing: { str: number; pre: number; abs: number; abs_pct: number };
            new_join: { str: number; pre: number; abs: number; abs_pct: number };
            north_indian: { str: number; pre: number; abs: number; abs_pct: number };
            total: { str: number; pre: number; abs: number; abs_pct: number };
        },
        isTotal = false,
        bgArgb?: string
    ) => {
        const r = wsLineWise.addRow([
            secName,
            lineName,
            stats.existing.str, stats.existing.pre, stats.existing.abs, `${stats.existing.abs_pct.toFixed(1)}%`,
            stats.new_join.str, stats.new_join.pre, stats.new_join.abs, `${stats.new_join.abs_pct.toFixed(1)}%`,
            stats.north_indian.str, stats.north_indian.pre, stats.north_indian.abs, `${stats.north_indian.abs_pct.toFixed(1)}%`,
            stats.total.str, stats.total.pre, stats.total.abs, `${stats.total.abs_pct.toFixed(1)}%`,
        ]);
        r.font = { name: 'Calibri', size: 9, bold: isTotal };
        r.alignment = { vertical: 'middle' };
        for (let c = 3; c <= 18; c++) {
            r.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        r.eachCell((cell) => {
            if (bgArgb) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
            }
            cell.border = isTotal ? headerBorder : thinBorder;
        });
    };

    // Render Production Sections
    data.line_wise.production_sections.forEach((sec) => {
        sec.lines.forEach((l, idx) => {
            addLineWiseRow(idx === 0 ? sec.section_name : '', l.line_name, l, false);
        });
        if (data.line_wise.production_sections.length > 1) {
            addLineWiseRow(sec.section_name, 'TOTAL', sec.total, true, 'FFE2EFDA');
        }
    });

    // Grand Total of Production
    addLineWiseRow('', 'Grand Total of Production', data.line_wise.production_grand_total, true, 'FFD9E1F2');

    // Non-Production Section
    const nonProdSec = data.line_wise.non_production_section;
    nonProdSec.lines.forEach((l, idx) => {
        addLineWiseRow(idx === 0 ? nonProdSec.section_name : '', l.line_name, l, false);
    });
    addLineWiseRow(nonProdSec.section_name, 'TOTAL', nonProdSec.total, true, 'FFE2EFDA');

    // Factory Grand Total
    addLineWiseRow('', 'GRAND TOTAL OF FACTORY', data.line_wise.factory_grand_total, true, 'FFFFF2CC');

    // Export to File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daily_Report_${formattedDate.replace(/[/\\?%*:|"<>]/g, '-')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
