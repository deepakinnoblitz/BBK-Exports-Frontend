import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import { useState, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { COMMON_COLORS } from 'src/theme';
import { bulkImportCanteenEntries } from 'src/api/canteen';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const MEAL_TYPES = ['Lunch', 'Breakfast', 'Dinner', 'Snacks', 'Tea'];

type ParsedRow = {
  emp_number: string;
  employee_name: string;
  days: Record<string, number>;
  total_meals: number;
};

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
};

export function CanteenImportDialog({ open, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [mealType, setMealType] = useState<string>('Lunch');

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [detectedDaysCount, setDetectedDaysCount] = useState<number>(31);
  const [totalMealsCount, setTotalMealsCount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    created_count: number;
    updated_count: number;
    total_meals: number;
    error_count: number;
    errors: string[];
  } | null>(null);

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setTotalMealsCount(0);
    setErrorMessage(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Helper to detect Month and Year from strings like "LUNCH EXPENSES FOR THE MONTH OF AUG-26" or "August 2026"
  const extractMonthYearFromText = (text: string) => {
    if (!text) return null;
    const clean = text.toUpperCase();

    const monthAbbrs: Record<string, number> = {
      JAN: 1,
      FEB: 2,
      MAR: 3,
      APR: 4,
      MAY: 5,
      JUN: 6,
      JUL: 7,
      AUG: 8,
      SEP: 9,
      OCT: 10,
      NOV: 11,
      DEC: 12,
      JANUARY: 1,
      FEBRUARY: 2,
      MARCH: 3,
      APRIL: 4,
      JUNE: 6,
      JULY: 7,
      AUGUST: 8,
      SEPTEMBER: 9,
      OCTOBER: 10,
      NOVEMBER: 11,
      DECEMBER: 12,
    };

    for (const [abbr, mNum] of Object.entries(monthAbbrs)) {
      if (clean.includes(abbr)) {
        // Look for year like 2026 or 26
        const yrMatch = clean.match(/(20\d{2}|\b\d{2}\b)/);
        let yr = dayjs().year();
        if (yrMatch) {
          const num = parseInt(yrMatch[1], 10);
          yr = num < 100 ? 2000 + num : num;
        }
        return { month: mNum, year: yr };
      }
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const processExcelFile = async (file: File) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setImportResult(null);
      setSelectedFile(file);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Prefer sheet named "Lunch" or "Canteen" or fallback to first sheet
      const sheetName =
        workbook.SheetNames.find((s) => /lunch|canteen|expenses/i.test(s)) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!rawData || rawData.length === 0) {
        throw new Error('The selected Excel file is empty.');
      }

      // Check top rows for month / year title (e.g. "LUNCH EXPENSES FOR THE MONTH OF AUG-26")
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const rowText = rawData[i].join(' ');
        const detected = extractMonthYearFromText(rowText);
        if (detected) {
          setSelectedMonth(detected.month);
          setSelectedYear(detected.year);
          break;
        }
      }

      // Locate header row containing "Emp Number" or "Employee" or Day numbers 1..31
      let headerRowIndex = -1;
      let empNumCol = -1;
      let empNameCol = -1;
      const dayColMap: { [day: number]: number } = {};

      for (let r = 0; r < Math.min(10, rawData.length); r++) {
        const row = rawData[r];
        let foundEmp = false;
        let dayColsFound = 0;

        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim();
          if (/emp.*(num|id|code|no)|employee/i.test(cell)) {
            empNumCol = c;
            foundEmp = true;
          } else if (/name|employee name/i.test(cell) && !/emp.*(num|id)/i.test(cell)) {
            empNameCol = c;
          } else if (/^\d{1,2}$/.test(cell)) {
            const d = parseInt(cell, 10);
            if (d >= 1 && d <= 31) {
              dayColMap[d] = c;
              dayColsFound++;
            }
          }
        }

        if (foundEmp || dayColsFound >= 5) {
          headerRowIndex = r;
          if (empNumCol === -1) {
            // Fallback: column B is usually Emp Number (index 1), column C is Name (index 2)
            empNumCol = 1;
            empNameCol = 2;
          }
          break;
        }
      }

      if (headerRowIndex === -1 || Object.keys(dayColMap).length === 0) {
        throw new Error(
          'Could not find day columns (1..31) in the Excel file. Please ensure format matches Image 1.'
        );
      }

      setDetectedDaysCount(Object.keys(dayColMap).length);

      // Parse data rows
      const rows: ParsedRow[] = [];
      let totalMeals = 0;

      for (let r = headerRowIndex + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || row.length === 0) continue;

        const rawEmpId = String(row[empNumCol] || '').trim();
        const rawEmpName = empNameCol !== -1 ? String(row[empNameCol] || '').trim() : '';

        // Skip header re-occurrence or summary footer rows (e.g., "Total" in emp column)
        if (
          !rawEmpId ||
          /total|sum|grand/i.test(rawEmpId) ||
          /total|sum|grand/i.test(rawEmpName)
        ) {
          continue;
        }

        const daysMap: Record<string, number> = {};
        let empTotal = 0;

        for (const [dayStr, colIdx] of Object.entries(dayColMap)) {
          const dayNum = parseInt(dayStr, 10);
          const cellVal = String(row[colIdx] || '').trim();
          if (cellVal && !isNaN(Number(cellVal))) {
            const count = Math.floor(Number(cellVal));
            if (count > 0) {
              daysMap[String(dayNum)] = count;
              empTotal += count;
              totalMeals += count;
            }
          }
        }

        // Only include rows if employee number is valid
        if (rawEmpId.length >= 2) {
          rows.push({
            emp_number: rawEmpId,
            employee_name: rawEmpName,
            days: daysMap,
            total_meals: empTotal,
          });
        }
      }

      if (rows.length === 0) {
        throw new Error('No employee records could be extracted from the file.');
      }

      setParsedRows(rows);
      setTotalMealsCount(totalMeals);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'Failed to parse Excel file.');
      setParsedRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const daysInMonth = 31;
    const monthAbbr = MONTHS.find((m) => m.value === selectedMonth)?.label.toUpperCase().slice(0, 3) || 'AUG';
    const yearShort = String(selectedYear).slice(-2);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BBK Exports';
    workbook.lastModifiedBy = 'BBK Exports';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Lunch', {
      views: [{ showGridLines: true }],
    });

    // Determine which days in the selected month/year are Sundays (or default to 5, 12, 19, 26 matching the image)
    const sundayDays = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      if (dateObj.getDay() === 0) {
        sundayDays.add(d);
      }
    }
    if (sundayDays.size === 0) {
      [5, 12, 19, 26].forEach((d) => sundayDays.add(d));
    }

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    // Row 1: Company Name
    sheet.mergeCells(1, 1, 1, 35);
    const row1Cell = sheet.getCell('A1');
    row1Cell.value = 'BBK EXPORTS PRIVATE LIMITED';
    row1Cell.font = { name: 'Calibri', size: 11, bold: true };
    row1Cell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 20;

    // Row 2: Title
    sheet.mergeCells(2, 1, 2, 35);
    const row2Cell = sheet.getCell('A2');
    row2Cell.value = `LUNCH EXPENSES FOR THE MONTH OF ${monthAbbr}-${yearShort}`;
    row2Cell.font = { name: 'Calibri', size: 11, bold: true };
    row2Cell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    for (let c = 1; c <= 35; c++) {
      sheet.getRow(1).getCell(c).border = thinBorder;
      sheet.getRow(2).getCell(c).border = thinBorder;
    }

    // Row 3: Headers
    const headers = ['Sl.No', 'Emp\nNumber', 'Name'];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(String(d));
    }
    headers.push('Total');

    const headerRow = sheet.getRow(3);
    headerRow.height = 26;
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;

      if (idx >= 3 && idx <= 33) {
        const dayNum = idx - 2;
        if (sundayDays.has(dayNum)) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' }, // Yellow fill matching Image 4
          };
        }
      }
    });

    // 20 Employee Rows matching the exact image dataset
    const rawEmployees = [
      { sl: 1, id: 'BEPL0002', name: 'Sivakumar D S', days: {} },
      { sl: 2, id: 'BEPL0072', name: 'Deepika S', days: {} },
      { sl: 3, id: 'BEPL0074', name: 'Rajarajeshwari S', days: { 4: 1, 6: 1, 7: 1, 13: 1, 23: 1 } },
      { sl: 4, id: 'BEPL0075', name: 'Banu P', days: { 25: 1, 29: 1 } },
      { sl: 5, id: 'BEPL0080', name: 'Ranjith Kumar J', days: {} },
      { sl: 6, id: 'BEPL0086', name: 'Arun Kumar S', days: {} },
      { sl: 7, id: 'BEPL0088', name: 'Ramesh Kumar R', days: { 22: 1 } },
      { sl: 8, id: 'BEPL0097', name: 'Althaf M', days: {} },
      { sl: 9, id: 'BEPL0102', name: 'Sudhish K', days: {} },
      { sl: 10, id: 'BEPL0107', name: 'Prakash T', days: {} },
      { sl: 11, id: 'BEPL0108', name: 'Sangeetha R', days: {} },
      { sl: 12, id: 'BEPL0109', name: 'Muthaiya I', days: { 9: 1, 27: 1 } },
      { sl: 13, id: 'BEPL0114', name: 'Kruthika R', days: {} },
      { sl: 14, id: 'BEPL0117', name: 'Ali M D', days: {} },
      { sl: 15, id: 'BEPL0127', name: 'Deepa R', days: { 4: 1, 8: 1, 10: 1, 13: 1, 14: 1, 19: 1, 21: 1, 24: 1, 28: 1, 30: 1 } },
      { sl: 16, id: 'BEPL0131', name: 'Manikandan B', days: {} },
      { sl: 17, id: 'BEPL0135', name: 'Remiyath S', days: {} },
      { sl: 18, id: 'BEPL0141', name: 'Sushmitha J', days: {} },
      { sl: 19, id: 'BEPL0153', name: 'Manigandan P', days: {} },
      { sl: 20, id: 'BEPL0164', name: 'Kumar A', days: { 1: 2, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1, 8: 2, 11: 2, 12: 2, 13: 1, 14: 2, 15: 1, 18: 1, 19: 1, 20: 1, 21: 2, 22: 2, 23: 2, 25: 2, 27: 2 } },
    ];

    rawEmployees.forEach((emp, rIdx) => {
      const rowNum = 4 + rIdx;
      const row = sheet.getRow(rowNum);
      row.height = 18;

      let rowTotal = 0;

      // Col 1: Sl.No
      const cellSl = row.getCell(1);
      cellSl.value = emp.sl;
      cellSl.font = { name: 'Calibri', size: 10 };
      cellSl.alignment = { horizontal: 'center', vertical: 'middle' };
      cellSl.border = thinBorder;

      // Col 2: Emp Number
      const cellId = row.getCell(2);
      cellId.value = emp.id;
      cellId.font = { name: 'Calibri', size: 10 };
      cellId.alignment = { horizontal: 'center', vertical: 'middle' };
      cellId.border = thinBorder;

      // Col 3: Name
      const cellName = row.getCell(3);
      cellName.value = emp.name;
      cellName.font = { name: 'Calibri', size: 10 };
      cellName.alignment = { horizontal: 'left', vertical: 'middle' };
      cellName.border = thinBorder;

      // Cols 4..34: Days 1..31
      for (let d = 1; d <= daysInMonth; d++) {
        const cellDay = row.getCell(3 + d);
        const count = (emp.days as any)[d] || '';
        if (count) {
          cellDay.value = Number(count);
          rowTotal += Number(count);
        } else {
          cellDay.value = '';
        }
        cellDay.font = { name: 'Calibri', size: 10 };
        cellDay.alignment = { horizontal: 'center', vertical: 'middle' };
        cellDay.border = thinBorder;
      }

      // Col 35: Total
      const cellTotal = row.getCell(35);
      cellTotal.value = rowTotal;
      cellTotal.font = { name: 'Calibri', size: 10 };
      cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTotal.border = thinBorder;
    });

    // Set Column Widths to match Image 4
    sheet.getColumn(1).width = 5.5;   // Sl.No
    sheet.getColumn(2).width = 12;    // Emp Number
    sheet.getColumn(3).width = 24;    // Name
    for (let c = 4; c <= 34; c++) {
      sheet.getColumn(c).width = 3.6; // Days 1..31
    }
    sheet.getColumn(35).width = 6.5;  // Total

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Salary - ${monthAbbr}'${yearShort}.xlsx`);
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;

    try {
      setImporting(true);
      setErrorMessage(null);

      const res = await bulkImportCanteenEntries({
        month: selectedMonth,
        year: selectedYear,
        rows: parsedRows,
        meal_type: mealType,
      });

      setImportResult(res);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import canteen entries.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
              color: COMMON_COLORS.emerald.main,
            }}
          >
            <Iconify icon={"solar:document-add-bold-duotone" as any} width={24} />
          </Box>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Import Canteen Data
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Upload Excel sheet matching the Lunch Expenses template format
            </Typography>
          </div>
        </Stack>

        <IconButton size="small" onClick={handleClose}>
          <Iconify icon="solar:close-circle-bold" width={22} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2.5, pb: 3 }}>
        <Stack spacing={3}>
          {errorMessage && (
            <Alert severity="error" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {importResult && (
            <Alert
              severity={importResult.error_count > 0 ? 'warning' : 'success'}
              onClose={() => setImportResult(null)}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Import Completed!
              </Typography>
              <Typography variant="body2">
                Created: <strong>{importResult.created_count}</strong> | Updated:{' '}
                <strong>{importResult.updated_count}</strong> | Total Meals Recorded:{' '}
                <strong>{importResult.total_meals}</strong>
              </Typography>
              {importResult.error_count > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                    {importResult.error_count} warnings / errors encountered:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem', color: 'error.dark' }}>
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </Box>
                </Box>
              )}
            </Alert>
          )}

          {/* Month, Year & Meal Type Configuration */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              type="number"
              label="Year"
              fullWidth
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Meal Type</InputLabel>
              <Select
                value={mealType}
                label="Meal Type"
                onChange={(e) => setMealType(e.target.value)}
              >
                {MEAL_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              size="medium"
              startIcon={<Iconify icon={"solar:download-minimalistic-bold" as any} />}
              onClick={handleDownloadTemplate}
              sx={{ whiteSpace: 'nowrap', minWidth: 170 }}
            >
              Template
            </Button>
          </Stack>

          {/* File Upload Drop Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 3.5,
              border: `2px dashed ${selectedFile ? theme.palette.primary.main : theme.palette.divider}`,
              borderRadius: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: selectedFile
                ? alpha(theme.palette.primary.main, 0.04)
                : alpha(theme.palette.grey[500], 0.04),
              transition: theme.transitions.create(['border-color', 'background-color']),
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              },
            }}
          >
            <Iconify
              icon={(selectedFile ? 'solar:file-check-bold' : 'solar:cloud-upload-bold-duotone') as any}
              width={48}
              sx={{
                mb: 1.5,
                color: selectedFile ? theme.palette.primary.main : 'text.secondary',
              }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {selectedFile ? selectedFile.name : 'Click to upload or drag & drop Excel sheet'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Supports .xlsx, .xls formats (Image 1 "Lunch Expenses" structure)
            </Typography>
          </Box>

          {loading && (
            <Stack spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Parsing spreadsheet...
              </Typography>
              <LinearProgress />
            </Stack>
          )}

          {/* Preview Section */}
          {parsedRows.length > 0 && (
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 0.5 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Parsed Data Preview
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Label color="info">{parsedRows.length} Employees</Label>
                  <Label color="success">{totalMealsCount} Total Meals</Label>
                  <Label color="default">{detectedDaysCount} Days</Label>
                </Stack>
              </Stack>

              <TableContainer
                component={Card}
                variant="outlined"
                sx={{ maxHeight: 240, overflowY: 'auto' }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'background.neutral', fontWeight: 700 } }}>
                      <TableCell>Emp ID</TableCell>
                      <TableCell>Employee Name</TableCell>
                      <TableCell align="center">Days with Meals</TableCell>
                      <TableCell align="center">Total Meals</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.emp_number}</TableCell>
                        <TableCell>{row.employee_name || '-'}</TableCell>
                        <TableCell align="center">{Object.keys(row.days).length} days</TableCell>
                        <TableCell align="center">
                          <Label color="primary">{row.total_meals}</Label>
                        </TableCell>
                      </TableRow>
                    ))}
                    {parsedRows.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 1 }}>
                          ... and {parsedRows.length - 10} more employee rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" color="inherit" onClick={handleClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImportSubmit}
          disabled={parsedRows.length === 0 || importing || loading}
          startIcon={<Iconify icon="solar:upload-bold" />}
          sx={{
            bgcolor: COMMON_COLORS.emerald.main,
            color: '#fff',
            '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
          }}
        >
          {importing ? 'Importing Data...' : `Import ${parsedRows.length} Records`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
