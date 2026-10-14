import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface SalaryComponentConfig {
    name: string;
    type: 'Earning' | 'Deduction';
}

export interface TemplateOptions {
    profileName: string; // 'Staff' | 'Driver' | 'Custom'
    earnings: string[];
    deductions: string[];
    includeSampleRow?: boolean;
}

export const STAFF_DEFAULT_EARNINGS = [
    'Basic Salary',
    'DA',
    'HRA',
    'Conveyance Allowance',
    'Medical Allowance',
    'Other Allowance',
];

export const STAFF_DEFAULT_DEDUCTIONS = [
    'PF',
    'ESI',
    'Professional Tax',
];

export const DRIVER_DEFAULT_EARNINGS = [
    'Basic Salary',
    'DA',
    'Driver Bata / Trip Allowance',
    'Overtime Allowance',
    'Special Allowance',
];

export const DRIVER_DEFAULT_DEDUCTIONS = [
    'PF',
    'ESI',
    'Loan Recovery',
];

// Definition of standard employee columns
export const PERSONAL_FIELDS = [
    { label: 'Employee ID *', key: 'employee_id', sample: 'EMP001', width: 16 },
    { label: 'Employee Name *', key: 'employee_name', sample: 'Rajesh Kumar', width: 22 },
    { label: 'Father/Husband Name', key: 'father_husband_name', sample: 'Suresh Kumar', width: 20 },
    { label: 'Email *', key: 'email', sample: 'rajesh.kumar@bbkexports.com', width: 28 },
    { label: 'Personal Email', key: 'personal_email', sample: 'rajesh.personal@gmail.com', width: 26 },
    { label: 'Personal Phone', key: 'phone', sample: '9876543210', width: 16 },
    { label: 'Office Phone', key: 'office_phone_number', sample: '044-2345678', width: 16 },
    { label: 'Date of Birth (DD-MM-YYYY)', key: 'dob', sample: '15-08-1992', width: 20 },
    { label: 'Blood Group', key: 'blood_group', sample: 'O+', width: 14 },
    { label: 'Gender (Male/Female/Other)', key: 'sex', sample: 'Male', width: 16 },
    { label: 'Marital Status', key: 'marital_status', sample: 'Married', width: 16 },
    { label: 'Qualification', key: 'qualification', sample: 'Graduate', width: 16 },
    { label: 'Aadhar Number', key: 'aadhar_number', sample: '123456789012', width: 18 },
    { label: 'Country', key: 'country', sample: 'India', width: 14 },
    { label: 'State', key: 'state', sample: 'Tamil Nadu', width: 16 },
    { label: 'City', key: 'city', sample: 'Chennai', width: 16 },
];

export const EMPLOYMENT_FIELDS = [
    { label: 'Department', key: 'department', sample: 'Production', width: 18 },
    { label: 'Designation', key: 'designation', sample: 'Staff Member', width: 18 },
    { label: 'Employee Type', key: 'employee_type', sample: 'Staff - CTC', width: 18 },
    { label: 'Production Type', key: 'production_type', sample: 'Production', width: 16 },
    { label: 'Line Order', key: 'line_order', sample: '', width: 14 },
    { label: 'Shift', key: 'shift', sample: 'General Shift', width: 16 },
    { label: 'Bus Travel Route', key: 'bus_travel_route', sample: '', width: 18 },
    { label: 'Bus Route Point', key: 'bus_route_point', sample: '', width: 18 },
    { label: 'Joining Date * (DD-MM-YYYY)', key: 'date_of_joining', sample: '01-04-2024', width: 20 },
    { label: 'Status * (Active/Inactive)', key: 'status', sample: 'Active', width: 16 },
    { label: 'Date of Leaving', key: 'date_of_leaving', sample: '', width: 18 },
    { label: 'Skip Probation (Yes/No)', key: 'skip_probation', sample: 'No', width: 16 },
    { label: 'User Login Email', key: 'user', sample: '', width: 24 },
];

export const BANK_FIELDS = [
    { label: 'Bank Account', key: 'bank_account', sample: 'SBI - 123456789', width: 22 },
    { label: 'PF Number', key: 'pf_number', sample: 'TN/MAS/0012345/000/1234567', width: 22 },
    { label: 'UAN Number', key: 'uan_number', sample: '100123456789', width: 18 },
    { label: 'ESI Number', key: 'esi_no', sample: '51001234560001001', width: 20 },
    { label: 'PAN Number', key: 'pan_number', sample: 'ABCDE1234F', width: 16 },
];

export async function generateEmployeeExcelTemplate(options: TemplateOptions) {
    const { profileName, earnings, deductions, includeSampleRow = true } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BBK Exports';
    workbook.lastModifiedBy = 'BBK Exports';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Employee Import', {
        views: [{ showGridLines: true }],
    });

    const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    // Calculate total columns
    // Personal (16) + Employment (13) + Bank (5) + CTC (1) + Earnings (N) + Deductions (M)
    const personalColCount = PERSONAL_FIELDS.length;
    const employmentColCount = EMPLOYMENT_FIELDS.length;
    const bankColCount = BANK_FIELDS.length;
    const earningsColCount = earnings.length;
    const deductionsColCount = deductions.length;

    const totalCols = personalColCount + employmentColCount + bankColCount + 1 + earningsColCount + deductionsColCount;

    // Helper: Excel column letter
    const getColumnLetter = (colIdx: number): string => {
        let temp: number;
        let letter = '';
        let num = colIdx;
        while (num > 0) {
            temp = (num - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            num = (num - temp - 1) / 26;
        }
        return letter;
    };

    // ----------------------------------------------------
    // Row 1: Company Banner
    // ----------------------------------------------------
    sheet.mergeCells(1, 1, 1, totalCols);
    const row1 = sheet.getCell('A1');
    row1.value = 'BBK EXPORTS PRIVATE LIMITED';
    row1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    row1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }, // Emerald main
    };
    row1.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    // ----------------------------------------------------
    // Row 2: Sub-header / Title
    // ----------------------------------------------------
    sheet.mergeCells(2, 1, 2, totalCols);
    const row2 = sheet.getCell('A2');
    row2.value = 'EMPLOYEE BULK IMPORT TEMPLATE (Fields marked with * are mandatory)';
    row2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    row2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
    };
    row2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 22;

    // ----------------------------------------------------
    // Row 3: Category Section Group Headers
    // ----------------------------------------------------
    let currentStartCol = 1;

    // 1. Personal Info
    sheet.mergeCells(3, currentStartCol, 3, currentStartCol + personalColCount - 1);
    const personalCatCell = sheet.getCell(3, currentStartCol);
    personalCatCell.value = 'PERSONAL INFORMATION';
    personalCatCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } };
    personalCatCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }; // Light sky blue
    personalCatCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentStartCol += personalColCount;

    // 2. Employment Details
    sheet.mergeCells(3, currentStartCol, 3, currentStartCol + employmentColCount - 1);
    const empCatCell = sheet.getCell(3, currentStartCol);
    empCatCell.value = 'EMPLOYMENT DETAILS';
    empCatCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
    empCatCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light emerald
    empCatCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentStartCol += employmentColCount;

    // 3. Financial & Bank
    sheet.mergeCells(3, currentStartCol, 3, currentStartCol + bankColCount - 1);
    const bankCatCell = sheet.getCell(3, currentStartCol);
    bankCatCell.value = 'FINANCIAL & BANK DETAILS';
    bankCatCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
    bankCatCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Light amber
    bankCatCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentStartCol += bankColCount;

    // 4. CTC
    const ctcCol = currentStartCol;
    const ctcCatCell = sheet.getCell(3, ctcCol);
    ctcCatCell.value = 'CTC';
    ctcCatCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF4338CA' } };
    ctcCatCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; // Indigo
    ctcCatCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentStartCol += 1;

    // 5. Earnings Components
    if (earningsColCount > 0) {
        sheet.mergeCells(3, currentStartCol, 3, currentStartCol + earningsColCount - 1);
        const earnCatCell = sheet.getCell(3, currentStartCol);
        earnCatCell.value = 'SALARY EARNINGS (MONTHLY)';
        earnCatCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
        earnCatCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        earnCatCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentStartCol += earningsColCount;
    }

    // 6. Deductions Components
    if (deductionsColCount > 0) {
        sheet.mergeCells(3, currentStartCol, 3, currentStartCol + deductionsColCount - 1);
        const dedCatCell = sheet.getCell(3, currentStartCol);
        dedCatCell.value = 'SALARY DEDUCTIONS (MONTHLY)';
        dedCatCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFBE123C' } };
        dedCatCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
        dedCatCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentStartCol += deductionsColCount;
    }

    sheet.getRow(3).height = 22;

    // Apply borders to row 1, 2, 3
    for (let c = 1; c <= totalCols; c++) {
        sheet.getRow(1).getCell(c).border = thinBorder;
        sheet.getRow(2).getCell(c).border = thinBorder;
        sheet.getRow(3).getCell(c).border = thinBorder;
    }

    // ----------------------------------------------------
    // Row 4: Column Labels
    // ----------------------------------------------------
    const row4 = sheet.getRow(4);
    row4.height = 28;

    const columnDefs: { label: string; key: string; width: number; sample: string; type?: string }[] = [];

    PERSONAL_FIELDS.forEach(f => columnDefs.push({ ...f }));
    EMPLOYMENT_FIELDS.forEach(f => columnDefs.push({ ...f }));
    BANK_FIELDS.forEach(f => columnDefs.push({ ...f }));

    // CTC
    columnDefs.push({ label: 'CTC (Monthly)', key: 'ctc', sample: '25000', width: 16, type: 'currency' });

    // Earnings
    earnings.forEach(e => {
        columnDefs.push({ label: e, key: `earning_${e}`, sample: '10000', width: 16, type: 'currency' });
    });

    // Deductions
    deductions.forEach(d => {
        columnDefs.push({ label: d, key: `deduction_${d}`, sample: '1200', width: 16, type: 'currency' });
    });

    columnDefs.forEach((col, idx) => {
        const colNum = idx + 1;
        const cell = row4.getCell(colNum);
        cell.value = col.label;
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;

        // Apply column-specific styling
        if (col.label.includes('*')) {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } }; // Red for required
        }

        sheet.getColumn(colNum).width = col.width || 16;
    });

    // ----------------------------------------------------
    // Row 5: Sample Row (if requested)
    // ----------------------------------------------------
    if (includeSampleRow) {
        const row5 = sheet.getRow(5);
        row5.height = 20;

        columnDefs.forEach((col, idx) => {
            const colNum = idx + 1;
            const cell = row5.getCell(colNum);
            cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
            cell.alignment = { horizontal: col.type === 'currency' ? 'right' : 'left', vertical: 'middle' };
            cell.border = thinBorder;

            if (col.type === 'currency') {
                cell.value = parseFloat(col.sample) || 0;
                cell.numFmt = '#,##0.00';
            } else {
                cell.value = col.sample;
            }
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const filename = `Employee_Bulk_Import_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, filename);
}
