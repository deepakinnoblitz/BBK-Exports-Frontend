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
        employee_types?: Array<{
            employee_type: string;
            category: string;
            manpower: number;
            present: number;
            absent: number;
            absent_pct: number;
            departments: DynamicHeadCountRow[];
            designations: DynamicHeadCountRow[];
        }>;
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
        { width: 16 }, // Line
        { width: 28 }, // Designation
        { width: 14 }, // In Time
        { width: 14 }, // Out Time
        { width: 16 }, // Status
    ];

    // Title Row
    const attTitleRow = wsAttendance.addRow(['BBK EXPORTS PRIVATE LIMITED']);
    attTitleRow.height = 20;
    attTitleRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    attTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    wsAttendance.mergeCells('A1:H1');
    for (let c = 1; c <= 8; c++) {
        attTitleRow.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
        };
    }

    const attSubTitleRow = wsAttendance.addRow([`Daily Attendance Report - ${formattedDate}`]);
    attSubTitleRow.height = 16;
    attSubTitleRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
    attSubTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    wsAttendance.mergeCells('A2:H2');
    for (let c = 1; c <= 8; c++) {
        attSubTitleRow.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
        };
    }
    const attSpacer = wsAttendance.addRow([]); // Blank spacer
    attSpacer.height = 4;

    // Header Row
    const attHeader = wsAttendance.addRow([
        'Employee ID',
        'Employee Name',
        'Department',
        'Line',
        'Designation',
        'In Time',
        'Out Time',
        'Status',
    ]);
    attHeader.height = 19;
    attHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    attHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    attHeader.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF059669' }, // Emerald theme
        };
        cell.border = headerBorder;
    });

    // Sort by Employee ID ascending
    const sortedAttendance = [...data.attendance_by_department].sort((a, b) =>
        (a.employee || '').localeCompare(b.employee || '', undefined, { numeric: true, sensitivity: 'base' })
    );

    sortedAttendance.forEach((emp, index) => {
        const row = wsAttendance.addRow([
            emp.employee,
            emp.employee_name,
            emp.department,
            emp.line_order || '--',
            emp.designation,
            emp.in_time || '--',
            emp.out_time || '--',
            emp.status,
        ]);
        row.height = 15.5;
        row.font = { name: 'Calibri', size: 9.5 };
        row.alignment = { vertical: 'middle' };

        // Column margins and alignments
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }; // Emp ID
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; // Name with margin
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; // Department with margin
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }; // Line
        row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; // Designation with margin
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }; // In Time
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }; // Out Time
        row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }; // Status

        // Highlight status
        const statusCell = row.getCell(8);
        if (emp.status === 'Present') {
            statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
        } else if (emp.status === 'MP') {
            statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
        } else if (emp.status === 'Absent') {
            statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
        } else if (emp.status === 'Holiday') {
            statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF4B5563' } };
        } else {
            statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1F2937' } };
        }

        const isEven = index % 2 === 1;
        row.eachCell((cell) => {
            cell.border = thinBorder;
            if (isEven) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF9FAFB' }, // Clean subtle zebra striping
                };
            }
        });
    });

    // ==========================================
    // SHEET 2: head count report
    // ==========================================
    const wsHeadCount = workbook.addWorksheet('head count report', {
        views: [{ showGridLines: true }],
    });

    // 5 clean compact columns (no awkward merged A:B)
    wsHeadCount.columns = [
        { width: 30 }, // Department / Category Name
        { width: 14 }, // Manpower
        { width: 16 }, // Actual - Present
        { width: 14 }, // Absent
        { width: 14 }, // Absent %
    ];

    // Titles - Compact & Elegant Executive Header
    const hcTitle = wsHeadCount.addRow(['BBK EXPORTS PRIVATE LIMITED']);
    hcTitle.height = 20;
    hcTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    hcTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    wsHeadCount.mergeCells('A1:E1');
    for (let c = 1; c <= 5; c++) {
        hcTitle.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
        };
    }

    const hcSubTitle = wsHeadCount.addRow([`Factory Head Count   -   ${formattedDate}`]);
    hcSubTitle.height = 16;
    hcSubTitle.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
    hcSubTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    wsHeadCount.mergeCells('A2:E2');
    for (let c = 1; c <= 5; c++) {
        hcSubTitle.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
        };
    }
    const hcSpacer = wsHeadCount.addRow([]); // Reduced spacer height
    hcSpacer.height = 5;

    // Employee Type Sections
    const typeGroups = (data.head_count.employee_types && data.head_count.employee_types.length > 0)
        ? data.head_count.employee_types
        : [
            {
                employee_type: 'Staff',
                manpower: data.head_count.staff_total.manpower,
                present: data.head_count.staff_total.present,
                absent: data.head_count.staff_total.absent,
                absent_pct: data.head_count.staff_total.absent_pct,
                departments: data.head_count.staff_departments || data.head_count.staff || [],
            },
            {
                employee_type: "Worker's",
                manpower: data.head_count.workers_total.manpower,
                present: data.head_count.workers_total.present,
                absent: data.head_count.workers_total.absent,
                absent_pct: data.head_count.workers_total.absent_pct,
                departments: data.head_count.worker_departments || data.head_count.workers || [],
            },
        ];

    typeGroups.forEach((tg) => {
        // Executive Group Header in Emerald Green (matching Attendance sheet)
        const tgHdr = wsHeadCount.addRow([
            `${tg.employee_type} Department`,
            'Manpower',
            'Actual - Present',
            'Absent',
            'Absent %'
        ]);
        tgHdr.height = 19; // Reduced height
        tgHdr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        tgHdr.alignment = { vertical: 'middle', horizontal: 'center' };
        tgHdr.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        tgHdr.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF059669' }, // Emerald Green matching Sheet 1
            };
            cell.border = headerBorder;
        });

        const rows = tg.departments || [];
        rows.forEach((st, idx) => {
            const pctVal = typeof st.absent_pct === 'number' ? st.absent_pct / 100 : 0;
            const r = wsHeadCount.addRow([
                st.department || st.category,
                Number(st.manpower || 0),
                Number(st.present || 0),
                Number(st.absent || 0),
                pctVal,
            ]);
            r.height = 15.5; // Compact row height
            r.font = { name: 'Calibri', size: 9.5 };
            r.alignment = { vertical: 'middle' };

            // Cell styling and alignments
            r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

            r.getCell(2).numFmt = '#,##0';
            r.getCell(3).numFmt = '#,##0';
            r.getCell(4).numFmt = '#,##0';
            r.getCell(5).numFmt = '0.0%';

            // Colorize Present (Green) & Absent (Red) for quick visual scanning
            r.getCell(3).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF059669' } };
            if (st.absent > 0) {
                r.getCell(4).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
            }

            const isEven = idx % 2 === 1;
            r.eachCell((cell) => {
                cell.border = thinBorder;
                if (isEven) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' }, // Clean light zebra striping
                    };
                }
            });
        });

        // Total row for this employee type (Clean Subtotal styling)
        const totalPctVal = typeof tg.absent_pct === 'number' ? tg.absent_pct / 100 : 0;
        const tgTotalRow = wsHeadCount.addRow([
            `${tg.employee_type} Total`,
            Number(tg.manpower || 0),
            Number(tg.present || 0),
            Number(tg.absent || 0),
            totalPctVal,
        ]);
        tgTotalRow.height = 16.5; // Reduced height
        tgTotalRow.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        tgTotalRow.alignment = { vertical: 'middle' };
        tgTotalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        tgTotalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        tgTotalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        tgTotalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        tgTotalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

        tgTotalRow.getCell(2).numFmt = '#,##0';
        tgTotalRow.getCell(3).numFmt = '#,##0';
        tgTotalRow.getCell(4).numFmt = '#,##0';
        tgTotalRow.getCell(5).numFmt = '0.0%';

        tgTotalRow.getCell(3).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF059669' } };
        if (tg.absent > 0) {
            tgTotalRow.getCell(4).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
        }

        tgTotalRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // Soft light green
            cell.border = headerBorder;
        });

        const spacer = wsHeadCount.addRow([]); // Reduced blank spacer
        spacer.height = 4;
    });

    // Factory Total (Warm Gold highlight with single bottom line - no double line)
    const factPctVal = typeof data.head_count.factory_total.absent_pct === 'number'
        ? data.head_count.factory_total.absent_pct / 100
        : 0;
    const factTotalRow = wsHeadCount.addRow([
        'Factory Total',
        Number(data.head_count.factory_total.manpower || 0),
        Number(data.head_count.factory_total.present || 0),
        Number(data.head_count.factory_total.absent || 0),
        factPctVal,
    ]);
    factTotalRow.height = 18; // Reduced height
    factTotalRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF78350F' } };
    factTotalRow.alignment = { vertical: 'middle' };
    factTotalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    factTotalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    factTotalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    factTotalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    factTotalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    factTotalRow.getCell(2).numFmt = '#,##0';
    factTotalRow.getCell(3).numFmt = '#,##0';
    factTotalRow.getCell(4).numFmt = '#,##0';
    factTotalRow.getCell(5).numFmt = '0.0%';

    factTotalRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF059669' } };
    factTotalRow.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };

    factTotalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Warm Amber Gold
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD97706' } },
            bottom: { style: 'thin', color: { argb: 'FFD97706' } }, // Single thin border instead of double
            left: { style: 'thin', color: { argb: 'FFD97706' } },
            right: { style: 'thin', color: { argb: 'FFD97706' } },
        };
    });

    // ==========================================
    // SHEET 3: Line wise report (Exact Factory Statutory Template)
    // ==========================================
    const wsLineWise = workbook.addWorksheet('Line wise report', {
        views: [{ showGridLines: true }],
    });

    const blackThinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    // Columns: Col A is empty spacer, Col B is Section, Col C is Line / Dept, D..S are 16 metrics
    wsLineWise.columns = [
        { width: 3 },   // Col A: Margin Spacer
        { width: 7 },   // Col B: SECTION (vertical text)
        { width: 28 },  // Col C: LINE / DEPARTMENT
        // Existing
        { width: 6 },   // D: STR
        { width: 6 },   // E: PRE
        { width: 6 },   // F: ABS
        { width: 7.5 }, // G: ABS%
        // New Join
        { width: 6 },   // H: STR
        { width: 6 },   // I: PRE
        { width: 6 },   // J: ABS
        { width: 7.5 }, // K: ABS%
        // North Indian
        { width: 6 },   // L: STR
        { width: 6 },   // M: PRE
        { width: 6 },   // N: ABS
        { width: 7.5 }, // O: ABS%
        // Total
        { width: 6 },   // P: STR
        { width: 6 },   // Q: PRE
        { width: 6 },   // R: ABS
        { width: 7.5 }, // S: ABS%
    ];

    // Rows 1 & 2: Empty Spacer Rows
    const r1 = wsLineWise.addRow([]);
    r1.height = 12;
    const r2 = wsLineWise.addRow([]);
    r2.height = 12;

    // Row 3: Title Row (B3:S3 merged)
    const lwTitle = wsLineWise.addRow([
        '', // A
        'BBK EXPORTS - DAILY  LINE WISE MANPOWER - ATTENDANCE',
    ]);
    lwTitle.height = 20;
    lwTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
    lwTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    wsLineWise.mergeCells('B3:S3');
    for (let c = 2; c <= 19; c++) {
        lwTitle.getCell(c).border = blackThinBorder;
    }

    // Format Date as DD-MMM-YY (e.g. 29-Oct-26 or 22-Sep-26)
    let displayDateStr = formattedDate;
    try {
        const dObj = new Date(formattedDate);
        if (!isNaN(dObj.getTime())) {
            const day = String(dObj.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[dObj.getMonth()];
            const year = String(dObj.getFullYear()).slice(-2);
            displayDateStr = `${day}-${month}-${year}`;
        }
    } catch {
        // keep formattedDate as fallback
    }

    // Row 4: Dimension Header (B4:C4 Date, D4:G4 Existing, H4:K4 New Join, L4:O4 North Indian, P4:S4 Total)
    const dimHeader = wsLineWise.addRow([
        '', // A
        displayDateStr,
        '', // C
        'EXISTING', '', '', '',
        'NEW JOIN', '', '', '',
        'NORTH INDIAN', '', '', '',
        'TOTAL', '', '', ''
    ]);
    dimHeader.height = 20;
    dimHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    dimHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    wsLineWise.mergeCells('B4:C4');
    wsLineWise.mergeCells('D4:G4');
    wsLineWise.mergeCells('H4:K4');
    wsLineWise.mergeCells('L4:O4');
    wsLineWise.mergeCells('P4:S4');

    // Emerald Green with White Bold Text for all cells B4 to S4
    for (let c = 2; c <= 19; c++) {
        dimHeader.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
        dimHeader.getCell(c).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        dimHeader.getCell(c).border = blackThinBorder;
    }

    // Row 5: Sub-columns Header (B5:C5 SECTION, D5..S5 STR, PRE, ABS, ABS%)
    const subHeader = wsLineWise.addRow([
        '', // A
        'SECTION',
        '', // C
        'STR', 'PRE', 'ABS', 'ABS%',
        'STR', 'PRE', 'ABS', 'ABS%',
        'STR', 'PRE', 'ABS', 'ABS%',
        'STR', 'PRE', 'ABS', 'ABS%',
    ]);
    subHeader.height = 20;
    subHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
    subHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    wsLineWise.mergeCells('B5:C5');

    // Soft Light Green with minimal opacity for sub-header columns B through S
    for (let c = 2; c <= 19; c++) {
        subHeader.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        subHeader.getCell(c).border = blackThinBorder;
    }

    const addLineWiseDataRow = (
        lineName: string,
        stats: {
            existing: { str: number; pre: number; abs: number; abs_pct: number };
            new_join: { str: number; pre: number; abs: number; abs_pct: number };
            north_indian: { str: number; pre: number; abs: number; abs_pct: number };
            total: { str: number; pre: number; abs: number; abs_pct: number };
        }
    ) => {
        const r = wsLineWise.addRow([
            '', // A
            '', // B (Section - merged across rows)
            lineName, // C (Line name centered)
            Number(stats.existing.str || 0),
            Number(stats.existing.pre || 0),
            Number(stats.existing.abs || 0),
            (stats.existing.abs_pct || 0) / 100,
            Number(stats.new_join.str || 0),
            Number(stats.new_join.pre || 0),
            Number(stats.new_join.abs || 0),
            (stats.new_join.abs_pct || 0) / 100,
            Number(stats.north_indian.str || 0),
            Number(stats.north_indian.pre || 0),
            Number(stats.north_indian.abs || 0),
            (stats.north_indian.abs_pct || 0) / 100,
            Number(stats.total.str || 0),
            Number(stats.total.pre || 0),
            Number(stats.total.abs || 0),
            (stats.total.abs_pct || 0) / 100,
        ]);
        r.height = 18;
        r.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
        r.alignment = { vertical: 'middle' };

        // Col C centered
        r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

        // Numbers & percentages centered
        for (let col = 4; col <= 19; col++) {
            const cell = r.getCell(col);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (col === 7 || col === 11 || col === 15 || col === 19) {
                cell.numFmt = '0%';
            } else {
                cell.numFmt = '#,##0';
            }
        }
        for (let col = 2; col <= 19; col++) {
            r.getCell(col).border = blackThinBorder;
        }
        return r;
    };

    const addLineWiseTotalRow = (
        title: string,
        stats: {
            existing: { str: number; pre: number; abs: number; abs_pct: number };
            new_join: { str: number; pre: number; abs: number; abs_pct: number };
            north_indian: { str: number; pre: number; abs: number; abs_pct: number };
            total: { str: number; pre: number; abs: number; abs_pct: number };
        },
        bgArgb = 'FFE2EFDA'
    ) => {
        const r = wsLineWise.addRow([
            '', // A
            title, // B
            '', // C
            Number(stats.existing.str || 0),
            Number(stats.existing.pre || 0),
            Number(stats.existing.abs || 0),
            (stats.existing.abs_pct || 0) / 100,
            Number(stats.new_join.str || 0),
            Number(stats.new_join.pre || 0),
            Number(stats.new_join.abs || 0),
            (stats.new_join.abs_pct || 0) / 100,
            Number(stats.north_indian.str || 0),
            Number(stats.north_indian.pre || 0),
            Number(stats.north_indian.abs || 0),
            (stats.north_indian.abs_pct || 0) / 100,
            Number(stats.total.str || 0),
            Number(stats.total.pre || 0),
            Number(stats.total.abs || 0),
            (stats.total.abs_pct || 0) / 100,
        ]);
        r.height = 18;
        r.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
        r.alignment = { vertical: 'middle' };

        wsLineWise.mergeCells(`B${r.number}:C${r.number}`);
        r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

        for (let col = 4; col <= 19; col++) {
            const cell = r.getCell(col);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (col === 7 || col === 11 || col === 15 || col === 19) {
                cell.numFmt = '0%';
            } else {
                cell.numFmt = '#,##0';
            }
        }
        for (let col = 2; col <= 19; col++) {
            const cell = r.getCell(col);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgArgb },
            };
            cell.border = blackThinBorder;
        }
        return r;
    };

    // Render Production Sections with Vertical Rotated Section Name
    data.line_wise.production_sections.forEach((sec) => {
        if (!sec.lines || sec.lines.length === 0) return;

        const startRowNum = wsLineWise.rowCount + 1;
        sec.lines.forEach((l) => {
            addLineWiseDataRow(l.line_name, l);
        });
        const endRowNum = wsLineWise.rowCount;

        const firstCell = wsLineWise.getCell(`B${startRowNum}`);
        firstCell.value = sec.section_name;
        firstCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };

        if (endRowNum > startRowNum) {
            wsLineWise.mergeCells(`B${startRowNum}:B${endRowNum}`);
        }
        firstCell.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };

        for (let rIdx = startRowNum; rIdx <= endRowNum; rIdx++) {
            wsLineWise.getCell(`B${rIdx}`).border = blackThinBorder;
        }

        // Section Total Row
        addLineWiseTotalRow('TOTAL', sec.total, 'FFE2EFDA');
    });

    // Grand Total of Production
    addLineWiseTotalRow('Grand Total of Production', data.line_wise.production_grand_total, 'FFE2EFDA');

    // Non-Production Section
    const nonProdSec = data.line_wise.non_production_section;
    if (nonProdSec && nonProdSec.lines && nonProdSec.lines.length > 0) {
        const startRowNum = wsLineWise.rowCount + 1;
        nonProdSec.lines.forEach((l) => {
            addLineWiseDataRow(l.line_name, l);
        });
        const endRowNum = wsLineWise.rowCount;

        const firstCell = wsLineWise.getCell(`B${startRowNum}`);
        firstCell.value = nonProdSec.section_name || 'Non Production';
        firstCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };

        if (endRowNum > startRowNum) {
            wsLineWise.mergeCells(`B${startRowNum}:B${endRowNum}`);
        }
        firstCell.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };

        for (let rIdx = startRowNum; rIdx <= endRowNum; rIdx++) {
            wsLineWise.getCell(`B${rIdx}`).border = blackThinBorder;
        }

        addLineWiseTotalRow('TOTAL', nonProdSec.total, 'FFE2EFDA');
    }

    // Factory Grand Total
    addLineWiseTotalRow('GRAND TOTAL OF FACTORY', data.line_wise.factory_grand_total, 'FFE2EFDA');

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
