import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { useState, useRef } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Stepper from '@mui/material/Stepper';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import StepLabel from '@mui/material/StepLabel';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { bulkImportEmployees } from 'src/api/employees';

import { Iconify } from 'src/components/iconify';

import { EmployeeTemplateDialog } from './employee-template-dialog';

const STEPS = ['Upload', 'Map Columns', 'Preview', 'Import'];

// Available standard target fields for mapping
const STANDARD_TARGET_FIELDS = [
    { value: 'employee_id', label: 'Employee ID *', reqd: true },
    { value: 'employee_name', label: 'Employee Name *', reqd: true },
    { value: 'email', label: 'Email *', reqd: true },
    { value: 'date_of_joining', label: 'Joining Date *', reqd: true },
    { value: 'status', label: 'Status *', reqd: true },
    { value: 'father_husband_name', label: 'Father/Husband Name' },
    { value: 'personal_email', label: 'Personal Email' },
    { value: 'phone', label: 'Personal Phone Number' },
    { value: 'office_phone_number', label: 'Office Phone Number' },
    { value: 'dob', label: 'Date of Birth' },
    { value: 'blood_group', label: 'Blood Group' },
    { value: 'sex', label: 'Gender' },
    { value: 'marital_status', label: 'Marital Status' },
    { value: 'qualification', label: 'Qualification' },
    { value: 'aadhar_number', label: 'Aadhar Number' },
    { value: 'country', label: 'Country' },
    { value: 'state', label: 'State' },
    { value: 'city', label: 'City' },
    { value: 'department', label: 'Department' },
    { value: 'designation', label: 'Designation' },
    { value: 'employee_type', label: 'Employee Type' },
    { value: 'production_type', label: 'Production Type' },
    { value: 'line_order', label: 'Line Order' },
    { value: 'shift', label: 'Shift' },
    { value: 'bus_travel_route', label: 'Bus - Travel Route' },
    { value: 'bus_route_point', label: 'Bus Route Point' },
    { value: 'date_of_leaving', label: 'Date of Leaving' },
    { value: 'skip_probation', label: 'Skip Probation' },
    { value: 'user', label: 'User Login Email' },
    { value: 'bank_account', label: 'Bank Account' },
    { value: 'pf_number', label: 'PF Number' },
    { value: 'uan_number', label: 'UAN Number' },
    { value: 'esi_no', label: 'ESI No' },
    { value: 'pan_number', label: 'PAN Number' },
    { value: 'ctc', label: 'CTC (Monthly)' },
];

type Props = {
    open: boolean;
    onClose: VoidFunction;
    onSuccess: VoidFunction;
};

export function EmployeeImportDialog({ open, onClose, onSuccess }: Props) {
    const { enqueueSnackbar } = useSnackbar();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [openTemplateDialog, setOpenTemplateDialog] = useState(false);

    // Raw parsed data
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetRows, setSheetRows] = useState<any[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
    const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);

    // Processed data for preview
    const [previewRows, setPreviewRows] = useState<any[]>([]);
    const [updateExisting, setUpdateExisting] = useState(false);

    // Import execution state
    const [progress, setProgress] = useState(0);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        total_records: number;
        created_count: number;
        updated_count: number;
        error_count: number;
        errors: string[];
    } | null>(null);

    const resetState = () => {
        setActiveStep(0);
        setFile(null);
        setLoading(false);
        setError('');
        setSheetHeaders([]);
        setSheetRows([]);
        setColumnMapping({});
        setHiddenIndices([]);
        setPreviewRows([]);
        setUpdateExisting(false);
        setProgress(0);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (!loading) {
            resetState();
            onClose();
        }
    };

    // ----------------------------------------------------
    // STEP 0: Upload & Parse File
    // ----------------------------------------------------
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setError('');
        }
    };

    const handleUpload = () => {
        if (!file) return;
        setLoading(true);
        setError('');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawGrid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (!rawGrid || rawGrid.length === 0) {
                    setError('The uploaded Excel file is empty.');
                    setLoading(false);
                    return;
                }

                // Intelligently find header row (look for "Employee ID" or "Employee Name" or "Name")
                let headerRowIdx = 0;
                for (let r = 0; r < Math.min(rawGrid.length, 10); r++) {
                    const rowText = (rawGrid[r] || []).map((c) => String(c).toLowerCase().trim()).join(' ');
                    if (rowText.includes('employee id') || rowText.includes('employee name') || (rowText.includes('name') && rowText.includes('email'))) {
                        headerRowIdx = r;
                        break;
                    }
                }

                const rawHeaders = (rawGrid[headerRowIdx] || []).map((h) => String(h || '').trim());
                while (rawHeaders.length > 0 && !rawHeaders[rawHeaders.length - 1]) {
                    rawHeaders.pop();
                }

                const dataRows = rawGrid.slice(headerRowIdx + 1).filter((row) => {
                    const hasData = row.some((c) => String(c).trim().length > 0);
                    return hasData;
                });

                if (dataRows.length === 0) {
                    setError('No employee data rows found in the sheet.');
                    setLoading(false);
                    return;
                }

                setSheetHeaders(rawHeaders);
                setSheetRows(dataRows);

                // Initialize automatic column mapping
                const initialMap: Record<number, string> = {};
                rawHeaders.forEach((rawH, idx) => {
                    const cleanH = rawH.toLowerCase().replace(/[*_()]/g, ' ').replace(/\s+/g, ' ').trim();

                    // 1. Exact or prefix match with standard employee fields
                    const matchedStd = STANDARD_TARGET_FIELDS.find((f) => {
                        const cleanLabel = f.label.toLowerCase().replace(/[*_()]/g, ' ').replace(/\s+/g, ' ').trim();
                        return cleanH === f.value || cleanH === cleanLabel || cleanH.startsWith(f.value) || cleanH.startsWith(cleanLabel);
                    });

                    if (matchedStd) {
                        initialMap[idx] = matchedStd.value;
                        return;
                    }

                    // 2. Fuzzy checks
                    if (cleanH.includes('employee id') || cleanH === 'id' || cleanH === 'emp id' || cleanH === 'emp code') {
                        initialMap[idx] = 'employee_id';
                    } else if (cleanH.includes('employee name') || cleanH === 'name' || cleanH === 'emp name') {
                        initialMap[idx] = 'employee_name';
                    } else if (cleanH.includes('joining date') || cleanH.includes('doj') || cleanH === 'date of joining') {
                        initialMap[idx] = 'date_of_joining';
                    } else if (cleanH.includes('personal phone') || cleanH === 'phone' || cleanH === 'mobile') {
                        initialMap[idx] = 'phone';
                    } else if (cleanH.includes('office phone')) {
                        initialMap[idx] = 'office_phone_number';
                    } else if (cleanH.includes('birth') || cleanH === 'dob') {
                        initialMap[idx] = 'dob';
                    } else if (cleanH === 'gender' || cleanH === 'sex') {
                        initialMap[idx] = 'sex';
                    } else if (cleanH === 'ctc' || cleanH.includes('ctc')) {
                        initialMap[idx] = 'ctc';
                    } else if (
                        cleanH === 'pf' || cleanH === 'esi' || cleanH.includes('professional tax') ||
                        cleanH.includes('loan recovery') || cleanH.includes('deduction')
                    ) {
                        initialMap[idx] = `deduction:${rawH.replace(/[*_]/g, '').trim()}`;
                    } else if (
                        cleanH.includes('basic') || cleanH === 'da' || cleanH === 'hra' ||
                        cleanH.includes('allowance') || cleanH.includes('bata') || cleanH.includes('overtime') ||
                        cleanH.includes('bonus')
                    ) {
                        initialMap[idx] = `earning:${rawH.replace(/[*_]/g, '').trim()}`;
                    } else if (cleanH.includes('total') || cleanH.includes('net salary')) {
                        initialMap[idx] = "Don't Import";
                    } else {
                        initialMap[idx] = "Don't Import";
                    }
                });

                setColumnMapping(initialMap);
                setActiveStep(1);
            } catch (err: any) {
                console.error('Error reading Excel file:', err);
                setError(err.message || 'Failed to read Excel file');
            } finally {
                setLoading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // ----------------------------------------------------
    // STEP 1: Map Columns -> STEP 2: Preview
    // ----------------------------------------------------
    const handleSaveMapping = () => {
        const mappedTargets = Object.values(columnMapping);
        const hasId = mappedTargets.includes('employee_id');
        const hasName = mappedTargets.includes('employee_name');
        const hasEmail = mappedTargets.includes('email');

        if (!hasId || !hasName || !hasEmail) {
            setError('Please ensure Employee ID, Employee Name, and Email columns are mapped.');
            return;
        }

        setError('');

        // Transform rows
        const processedRows: any[] = [];
        const seenIds = new Set<string>();

        sheetRows.forEach((row, rIdx) => {
            const empRecord: any = {
                _rowIndex: rIdx + 1,
                _errors: [] as string[],
                earnings: [] as any[],
                deductions: [] as any[],
                _rawRow: row,
            };

            Object.entries(columnMapping).forEach(([colIdxStr, targetField]) => {
                const colIdx = parseInt(colIdxStr, 10);
                if (targetField === "Don't Import" || targetField === '__skip__' || !targetField) return;

                let cellVal = row[colIdx];
                if (cellVal instanceof Date) {
                    const y = cellVal.getFullYear();
                    const m = String(cellVal.getMonth() + 1).padStart(2, '0');
                    const d = String(cellVal.getDate()).padStart(2, '0');
                    cellVal = `${y}-${m}-${d}`;
                } else {
                    cellVal = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
                }

                if (targetField.startsWith('earning:')) {
                    const compName = targetField.replace('earning:', '');
                    const amt = parseFloat(cellVal) || 0;
                    if (amt > 0 || cellVal !== '') {
                        empRecord.earnings.push({ component_name: compName, amount: amt });
                    }
                } else if (targetField.startsWith('deduction:')) {
                    const compName = targetField.replace('deduction:', '');
                    const amt = parseFloat(cellVal) || 0;
                    if (amt > 0 || cellVal !== '') {
                        empRecord.deductions.push({ component_name: compName, amount: amt });
                    }
                } else {
                    empRecord[targetField] = cellVal;
                }
            });

            // Validation
            if (!empRecord.employee_id) {
                empRecord._errors.push('Missing Employee ID');
            } else if (seenIds.has(empRecord.employee_id.toUpperCase())) {
                empRecord._errors.push('Duplicate Employee ID in sheet');
            } else {
                seenIds.add(empRecord.employee_id.toUpperCase());
            }

            if (!empRecord.employee_name) {
                empRecord._errors.push('Missing Employee Name');
            }

            if (!empRecord.email) {
                empRecord._errors.push('Missing Email');
            }

            processedRows.push(empRecord);
        });

        setPreviewRows(processedRows);
        setActiveStep(2);
    };

    // ----------------------------------------------------
    // STEP 2: Preview -> STEP 3: Import
    // ----------------------------------------------------
    const handleStartImport = async () => {
        setLoading(true);
        setActiveStep(3);
        setProgress(10);

        try {
            const cleanRows = previewRows.map((r) => {
                const { _rowIndex, _errors, _rawRow, ...rest } = r;
                return rest;
            });

            setProgress(40);
            const res = await bulkImportEmployees(cleanRows, updateExisting);
            setProgress(100);
            setImportResult(res);

            if (res.created_count > 0 || res.updated_count > 0) {
                enqueueSnackbar(
                    `Import completed: ${res.created_count} created, ${res.updated_count} updated`,
                    { variant: 'success' }
                );
                onSuccess();
            } else {
                enqueueSnackbar('No employee records were imported.', { variant: 'warning' });
            }
        } catch (err: any) {
            console.error('Bulk import error:', err);
            setError(err.message || 'Import failed');
            setImportResult({
                success: false,
                total_records: previewRows.length,
                created_count: 0,
                updated_count: 0,
                error_count: previewRows.length,
                errors: [err.message || 'Import failed'],
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRow = (idx: number) => {
        setColumnMapping({ ...columnMapping, [idx]: "Don't Import" });
        setHiddenIndices([...hiddenIndices, idx]);
    };

    const handleShowAll = () => {
        setHiddenIndices([]);
    };

    const handleDeletePreviewRow = (rowIndex: number) => {
        setPreviewRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    };

    // ----------------------------------------------------
    // STEP RENDERERS (MATCHING ATTENDANCE IMPORT DIALOG)
    // ----------------------------------------------------

    // Step 0: Upload
    const renderUpload = (
        <Box sx={{ py: 4, display: 'flex', flexFlow: 'column', alignItems: 'center' }}>
            <Box
                sx={{
                    p: 5,
                    width: '100%',
                    maxWidth: 400,
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    bgcolor: 'background.neutral',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: (theme) => theme.transitions.create('opacity'),
                    '&:hover': { opacity: 0.72 },
                    position: 'relative',
                    overflow: 'hidden',
                }}
                component="label"
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                />
                <Iconify
                    icon={"solar:cloud-upload-bold-duotone" as any}
                    width={64}
                    sx={{ mb: 2, color: 'primary.main', position: 'relative', zIndex: 1 }}
                />
                <Typography variant="h6" sx={{ position: 'relative', zIndex: 1 }}>
                    {file ? file.name : 'Select data file'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', position: 'relative', zIndex: 1 }}>
                    Drop file here or click to browse
                </Typography>
            </Box>

            <Button
                size="small"
                color="primary"
                startIcon={<Iconify icon={"solar:download-bold-duotone" as any} />}
                onClick={() => setOpenTemplateDialog(true)}
                sx={{ mt: 2 }}
            >
                Download Sample Template
            </Button>
        </Box>
    );

    // Step 1: Mapping
    const renderMapping = (
        <Box>
            {hiddenIndices.length > 0 && (
                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" variant="text" onClick={handleShowAll} startIcon={<Iconify icon={"solar:eye-bold" as any} />}>
                        Show {hiddenIndices.length} skipped columns
                    </Button>
                </Box>
            )}

            <TableContainer sx={{ mt: 1, maxHeight: 400 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>File Column</TableCell>
                            <TableCell>Employee Field</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sheetHeaders
                            .filter((_, idx) => !hiddenIndices.includes(idx))
                            .map((header) => {
                                const actualIdx = sheetHeaders.indexOf(header);
                                const sampleVal = sheetRows[0]?.[actualIdx];

                                return (
                                    <TableRow key={actualIdx}>
                                        <TableCell>
                                            <Typography variant="subtitle2">{header || `Column ${actualIdx + 1}`}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                Sample: {sampleVal !== undefined && sampleVal !== '' ? String(sampleVal).slice(0, 40) : 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        value={columnMapping[actualIdx] || "Don't Import"}
                                                        onChange={(e) =>
                                                            setColumnMapping({ ...columnMapping, [actualIdx]: e.target.value })
                                                        }
                                                    >
                                                        <MenuItem value="Don't Import">Don&apos;t Import</MenuItem>
                                                        <MenuItem disabled sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                                                            ── STANDARD EMPLOYEE FIELDS ──
                                                        </MenuItem>
                                                        {STANDARD_TARGET_FIELDS.map((f) => (
                                                            <MenuItem key={f.value} value={f.value}>
                                                                {f.label}
                                                            </MenuItem>
                                                        ))}
                                                        <MenuItem disabled sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                                                            ── SALARY COMPONENTS ──
                                                        </MenuItem>
                                                        <MenuItem value={`earning:${header.replace(/[*_]/g, '').trim()}`}>
                                                            [Earning] {header.replace(/[*_]/g, '').trim()}
                                                        </MenuItem>
                                                        <MenuItem value={`deduction:${header.replace(/[*_]/g, '').trim()}`}>
                                                            [Deduction] {header.replace(/[*_]/g, '').trim()}
                                                        </MenuItem>
                                                    </Select>
                                                </FormControl>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteRow(actualIdx)}
                                                >
                                                    <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    // Step 2: Preview
    const renderPreview = (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    Review parsed employees ({previewRows.length} records ready)
                </Typography>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={updateExisting}
                            onChange={(e) => setUpdateExisting(e.target.checked)}
                            size="small"
                        />
                    }
                    label={
                        <Typography variant="body2">
                            Update existing records if Employee ID exists
                        </Typography>
                    }
                />
            </Box>

            <TableContainer sx={{ maxHeight: 400, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider', width: 45 }}>#</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Status</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Employee ID</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Employee Name</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Email</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Joining Date</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Department</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Designation</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Earnings</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider' }}>Deductions</TableCell>
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider', width: 50 }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {previewRows.map((row, i) => {
                            const hasErrors = row._errors && row._errors.length > 0;
                            return (
                                <TableRow key={i} hover sx={{ bgcolor: hasErrors ? 'error.lighter' : 'inherit' }}>
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>
                                        {hasErrors ? (
                                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                                                {row._errors.join(', ')}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                                                Valid
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{row.employee_id || '-'}</TableCell>
                                    <TableCell>{row.employee_name || '-'}</TableCell>
                                    <TableCell>{row.email || '-'}</TableCell>
                                    <TableCell>{row.date_of_joining || '-'}</TableCell>
                                    <TableCell>{row.department || '-'}</TableCell>
                                    <TableCell>{row.designation || '-'}</TableCell>
                                    <TableCell>
                                        {row.earnings?.length > 0
                                            ? `${row.earnings.length} items (₹${row.earnings.reduce((s: number, it: any) => s + (it.amount || 0), 0)})`
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {row.deductions?.length > 0
                                            ? `${row.deductions.length} items (₹${row.deductions.reduce((s: number, it: any) => s + (it.amount || 0), 0)})`
                                            : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="error" onClick={() => handleDeletePreviewRow(i)}>
                                            <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    // Step 3: Import Status
    const renderImport = (
        <Box sx={{ py: 4 }}>
            <Stack spacing={3}>
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1">Importing...</Typography>
                        <Typography variant="body2">{Math.round(progress)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
                </Box>

                {importResult && (
                    <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1, display: 'flex', gap: 4 }}>
                        <Box>
                            <Typography variant="caption" display="block" color="text.secondary">Total</Typography>
                            <Typography variant="h6">{importResult.total_records}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" display="block" color="success.main">Success</Typography>
                            <Typography variant="h6" color="success.main">
                                {importResult.created_count + importResult.updated_count}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" display="block" color="error.main">Failed</Typography>
                            <Typography variant="h6" color="error.main">{importResult.error_count}</Typography>
                        </Box>
                    </Box>
                )}

                {importResult?.errors && importResult.errors.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Detailed Error Logs</Typography>
                        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 300 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Row</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Message / Exception</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {importResult.errors.map((msg, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{i + 1}</TableCell>
                                            <TableCell>
                                                <Iconify
                                                    icon={"solar:close-circle-bold" as any}
                                                    color="error.main"
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem' }}>
                                                <Typography variant="caption" color="error" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {msg}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Stack>
        </Box>
    );

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Import Employees
                    <IconButton onClick={handleClose} disabled={loading}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ pb: 4 }}>
                    <Stepper activeStep={activeStep} sx={{ py: 2 }}>
                        {STEPS.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    {activeStep === 0 && renderUpload}
                    {activeStep === 1 && renderMapping}
                    {activeStep === 2 && renderPreview}
                    {activeStep === 3 && renderImport}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    {activeStep > 0 && activeStep < 3 && (
                        <Button variant="outlined" onClick={() => setActiveStep(activeStep - 1)} disabled={loading}>
                            Back
                        </Button>
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    {activeStep === 0 && (
                        <Button variant="contained" onClick={handleUpload} disabled={!file || loading}>
                            {loading ? 'Processing...' : 'Next: Mapping'}
                        </Button>
                    )}

                    {activeStep === 1 && (
                        <Button variant="contained" onClick={handleSaveMapping} disabled={loading}>
                            {loading ? 'Saving...' : 'Next: Preview'}
                        </Button>
                    )}

                    {activeStep === 2 && (
                        <Button variant="contained" onClick={handleStartImport} disabled={loading || previewRows.length === 0}>
                            Start Import
                        </Button>
                    )}

                    {activeStep === 3 && !loading && (
                        <Button variant="contained" onClick={handleClose}>
                            Finish
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <EmployeeTemplateDialog
                open={openTemplateDialog}
                onClose={() => setOpenTemplateDialog(false)}
            />
        </>
    );
}
