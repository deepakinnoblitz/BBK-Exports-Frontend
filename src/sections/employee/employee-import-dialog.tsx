import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { useState, useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
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

import { COMMON_COLORS } from 'src/theme';
import { bulkImportEmployees } from 'src/api/employees';
import { fetchSalaryComponents } from 'src/api/hr-management';

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
    const [knownSalaryComponents, setKnownSalaryComponents] = useState<any[]>([]);

    // Processed data for preview
    const [previewRows, setPreviewRows] = useState<any[]>([]);
    const [updateExisting, setUpdateExisting] = useState(false);

    // Edit modal state
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>(null);
    const [newEarningName, setNewEarningName] = useState('');
    const [newEarningAmount, setNewEarningAmount] = useState('');
    const [newDeductionName, setNewDeductionName] = useState('');
    const [newDeductionAmount, setNewDeductionAmount] = useState('');

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

    useEffect(() => {
        if (open) {
            fetchSalaryComponents()
                .then((data) => setKnownSalaryComponents(data || []))
                .catch((err) => console.error('Failed to prefetch salary components:', err));
        }
    }, [open]);

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
        setEditingIndex(null);
        setEditForm(null);
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

                // Helper to detect category row above column headers
                const categoryRowIdx = headerRowIdx - 1;
                const categoryGrid = categoryRowIdx >= 0 ? rawGrid[categoryRowIdx] : [];

                const getCategoryForColumn = (colIdx: number): string => {
                    let cat = '';
                    if (categoryRowIdx >= 0 && worksheet['!merges']) {
                        const m = (worksheet['!merges'] as any[]).find(
                            (rng) => rng.s.r <= categoryRowIdx && rng.e.r >= categoryRowIdx && rng.s.c <= colIdx && rng.e.c >= colIdx
                        );
                        if (m) {
                            const val = rawGrid[m.s.r]?.[m.s.c];
                            if (val) cat = String(val).toLowerCase();
                        }
                    }
                    if (!cat && categoryGrid) {
                        for (let c = colIdx; c >= 0; c--) {
                            const val = String(categoryGrid[c] || '').toLowerCase().trim();
                            if (val) {
                                cat = val;
                                break;
                            }
                        }
                    }
                    return cat;
                };

                // Initialize automatic column mapping
                const initialMap: Record<number, string> = {};
                rawHeaders.forEach((rawH, idx) => {
                    const cleanH = rawH.toLowerCase().replace(/[*_()]/g, ' ').replace(/\s+/g, ' ').trim();
                    const parentCat = getCategoryForColumn(idx);

                    // 0. Skip Calculated summary columns if any
                    if (cleanH.includes('total earnings') || cleanH.includes('total deductions') || cleanH.includes('net salary')) {
                        initialMap[idx] = "Don't Import";
                        return;
                    }

                    // 1. If column is grouped under SALARY EARNINGS header
                    if (parentCat.includes('earnings') || parentCat.includes('salary earnings')) {
                        initialMap[idx] = `earning:${rawH.replace(/[*_]/g, '').trim()}`;
                        return;
                    }

                    // 2. If column is grouped under SALARY DEDUCTIONS header
                    if (parentCat.includes('deductions') || parentCat.includes('salary deductions')) {
                        initialMap[idx] = `deduction:${rawH.replace(/[*_]/g, '').trim()}`;
                        return;
                    }

                    // 3. Exact or prefix match with standard employee fields
                    const matchedStd = STANDARD_TARGET_FIELDS.find((f) => {
                        const cleanLabel = f.label.toLowerCase().replace(/[*_()]/g, ' ').replace(/\s+/g, ' ').trim();
                        return cleanH === f.value || cleanH === cleanLabel || cleanH.startsWith(f.value) || cleanH.startsWith(cleanLabel);
                    });

                    if (matchedStd) {
                        initialMap[idx] = matchedStd.value;
                        return;
                    }

                    // 4. Match against known salary components in the database
                    const matchedComp = knownSalaryComponents.find((sc) => {
                        const scName = (sc.component_name || sc.name || '').toLowerCase().trim();
                        return scName === cleanH || scName === rawH.toLowerCase().trim();
                    });

                    if (matchedComp) {
                        if (matchedComp.type === 'Deduction') {
                            initialMap[idx] = `deduction:${matchedComp.component_name || rawH}`;
                        } else {
                            initialMap[idx] = `earning:${matchedComp.component_name || rawH}`;
                        }
                        return;
                    }

                    // 5. Fuzzy checks for standard employee fields
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
                        cleanH.includes('pf') || cleanH.includes('esi') || cleanH.includes('professional tax') ||
                        cleanH.includes('loan') || cleanH.includes('recovery') || cleanH.includes('insurance') ||
                        cleanH.includes('deduction')
                    ) {
                        initialMap[idx] = `deduction:${rawH.replace(/[*_]/g, '').trim()}`;
                    } else if (
                        cleanH.includes('basic') || cleanH === 'da' || cleanH === 'hra' ||
                        cleanH.includes('allowance') || cleanH.includes('bata') || cleanH.includes('overtime') ||
                        cleanH.includes('bonus') || cleanH.includes('salary') || cleanH.includes('earning')
                    ) {
                        initialMap[idx] = `earning:${rawH.replace(/[*_]/g, '').trim()}`;
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
                    const isValEntered = cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
                    if (isValEntered) {
                        const numVal = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^0-9.-]/g, ''));
                        const amt = isNaN(numVal) ? 0 : numVal;
                        empRecord.earnings.push({ component_name: compName, amount: amt });
                    }
                } else if (targetField.startsWith('deduction:')) {
                    const compName = targetField.replace('deduction:', '');
                    const isValEntered = cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '';
                    if (isValEntered) {
                        const numVal = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^0-9.-]/g, ''));
                        const amt = isNaN(numVal) ? 0 : numVal;
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
    // Row Editing Handlers
    // ----------------------------------------------------
    const handleOpenEdit = (index: number) => {
        setEditingIndex(index);
        setEditForm(JSON.parse(JSON.stringify(previewRows[index])));
    };

    const handleSaveEdit = () => {
        if (editingIndex === null || !editForm) return;

        const updatedErrors: string[] = [];
        if (!editForm.employee_id?.trim()) updatedErrors.push('Missing Employee ID');
        if (!editForm.employee_name?.trim()) updatedErrors.push('Missing Employee Name');
        if (!editForm.email?.trim()) updatedErrors.push('Missing Email');

        const updated = {
            ...editForm,
            _errors: updatedErrors,
        };

        setPreviewRows((prev) => {
            const next = [...prev];
            next[editingIndex] = updated;
            return next;
        });

        setEditingIndex(null);
        setEditForm(null);
        enqueueSnackbar('Employee record updated successfully', { variant: 'success' });
    };

    const handleAddEarningToEdit = (name: string, amtStr: string) => {
        if (!name.trim()) return;
        const amt = parseFloat(amtStr) || 0;
        setEditForm((prev: any) => ({
            ...prev,
            earnings: [...(prev.earnings || []), { component_name: name.trim(), amount: amt }],
        }));
    };

    const handleRemoveEarningFromEdit = (idx: number) => {
        setEditForm((prev: any) => ({
            ...prev,
            earnings: (prev.earnings || []).filter((_: any, i: number) => i !== idx),
        }));
    };

    const handleAddDeductionToEdit = (name: string, amtStr: string) => {
        if (!name.trim()) return;
        const amt = parseFloat(amtStr) || 0;
        setEditForm((prev: any) => ({
            ...prev,
            deductions: [...(prev.deductions || []), { component_name: name.trim(), amount: amt }],
        }));
    };

    const handleRemoveDeductionFromEdit = (idx: number) => {
        setEditForm((prev: any) => ({
            ...prev,
            deductions: (prev.deductions || []).filter((_: any, i: number) => i !== idx),
        }));
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
                            <TableCell sx={{ bgcolor: 'background.neutral', borderBottom: 2, borderColor: 'divider', width: 90 }} align="center">Action</TableCell>
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
                                        {row.earnings?.length > 0 ? (
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {row.earnings.length} items (₹{row.earnings.reduce((s: number, it: any) => s + (it.amount || 0), 0)})
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 220, whiteSpace: 'normal' }}>
                                                    {row.earnings.map((e: any) => `${e.component_name}: ₹${e.amount}`).join(', ')}
                                                </Typography>
                                            </Box>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {row.deductions?.length > 0 ? (
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {row.deductions.length} items (₹{row.deductions.reduce((s: number, it: any) => s + (it.amount || 0), 0)})
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 220, whiteSpace: 'normal' }}>
                                                    {row.deductions.map((d: any) => `${d.component_name}: ₹${d.amount}`).join(', ')}
                                                </Typography>
                                            </Box>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenEdit(i)}
                                                title="Edit employee details"
                                            >
                                                <Iconify icon={"solar:pen-bold" as any} />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeletePreviewRow(i)}
                                                title="Delete record"
                                            >
                                                <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                                            </IconButton>
                                        </Stack>
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
                        <Button
                            variant="contained"
                            onClick={handleStartImport}
                            disabled={loading || previewRows.length === 0}
                            sx={{
                                bgcolor: COMMON_COLORS.emerald.main,
                                color: 'common.white',
                                '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
                            }}
                        >
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

            {/* Edit Employee Dialog */}
            <Dialog open={editingIndex !== null} onClose={() => setEditingIndex(null)} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Iconify icon={"solar:pen-bold" as any} width={22} sx={{ color: 'primary.main' }} />
                        <Typography variant="h6">
                            Edit Employee Details {editForm?.employee_name ? `(${editForm.employee_name})` : ''}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setEditingIndex(null)} size="small">
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ pt: 2, pb: 3, maxHeight: '72vh' }}>
                    {editForm && (
                        <Stack spacing={3}>
                            {/* 1. Mandatory & Personal Details */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
                                    PERSONAL & CONTACT DETAILS
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Employee ID *"
                                        size="small"
                                        value={editForm.employee_id || ''}
                                        onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                                        error={!editForm.employee_id?.trim()}
                                        helperText={!editForm.employee_id?.trim() ? 'Required' : ''}
                                    />
                                    <TextField
                                        label="Employee Name *"
                                        size="small"
                                        value={editForm.employee_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, employee_name: e.target.value })}
                                        error={!editForm.employee_name?.trim()}
                                        helperText={!editForm.employee_name?.trim() ? 'Required' : ''}
                                    />
                                    <TextField
                                        label="Email *"
                                        size="small"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        error={!editForm.email?.trim()}
                                        helperText={!editForm.email?.trim() ? 'Required' : ''}
                                    />
                                    <TextField
                                        label="Joining Date (YYYY-MM-DD)"
                                        size="small"
                                        value={editForm.date_of_joining || ''}
                                        onChange={(e) => setEditForm({ ...editForm, date_of_joining: e.target.value })}
                                    />
                                    <TextField
                                        label="Personal Phone"
                                        size="small"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                    <TextField
                                        label="Date of Birth"
                                        size="small"
                                        value={editForm.dob || ''}
                                        onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                    />
                                    <TextField
                                        label="Gender"
                                        size="small"
                                        value={editForm.sex || ''}
                                        onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                                    />
                                    <TextField
                                        label="Blood Group"
                                        size="small"
                                        value={editForm.blood_group || ''}
                                        onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                                    />
                                </Box>
                            </Box>

                            <Divider />

                            {/* 2. Employment & Organization */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
                                    EMPLOYMENT DETAILS
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Department"
                                        size="small"
                                        value={editForm.department || ''}
                                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                    />
                                    <TextField
                                        label="Designation"
                                        size="small"
                                        value={editForm.designation || ''}
                                        onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                                    />
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={editForm.status || 'Active'}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        >
                                            <MenuItem value="Active">Active</MenuItem>
                                            <MenuItem value="Inactive">Inactive</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Employee Type"
                                        size="small"
                                        value={editForm.employee_type || ''}
                                        onChange={(e) => setEditForm({ ...editForm, employee_type: e.target.value })}
                                    />
                                    <TextField
                                        label="Shift"
                                        size="small"
                                        value={editForm.shift || ''}
                                        onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
                                    />
                                    <TextField
                                        label="Monthly CTC"
                                        size="small"
                                        type="number"
                                        value={editForm.ctc || ''}
                                        onChange={(e) => setEditForm({ ...editForm, ctc: e.target.value })}
                                    />
                                </Box>
                            </Box>

                            <Divider />

                            {/* 3. Financial & Bank */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
                                    FINANCIAL & BANK DETAILS
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Bank Account"
                                        size="small"
                                        value={editForm.bank_account || ''}
                                        onChange={(e) => setEditForm({ ...editForm, bank_account: e.target.value })}
                                    />
                                    <TextField
                                        label="PF Number"
                                        size="small"
                                        value={editForm.pf_number || ''}
                                        onChange={(e) => setEditForm({ ...editForm, pf_number: e.target.value })}
                                    />
                                    <TextField
                                        label="ESI No"
                                        size="small"
                                        value={editForm.esi_no || ''}
                                        onChange={(e) => setEditForm({ ...editForm, esi_no: e.target.value })}
                                    />
                                    <TextField
                                        label="PAN Number"
                                        size="small"
                                        value={editForm.pan_number || ''}
                                        onChange={(e) => setEditForm({ ...editForm, pan_number: e.target.value })}
                                    />
                                </Box>
                            </Box>

                            <Divider />

                            {/* 4. Salary Earnings */}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
                                        EARNINGS COMPONENTS ({editForm.earnings?.length || 0})
                                    </Typography>
                                </Box>

                                <Stack spacing={1.5} sx={{ mb: 2 }}>
                                    {(editForm.earnings || []).length === 0 ? (
                                        <Typography variant="caption" color="text.secondary">
                                            No earnings components added
                                        </Typography>
                                    ) : (
                                        editForm.earnings.map((earn: any, eIdx: number) => (
                                            <Box
                                                key={eIdx}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    p: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    bgcolor: 'background.paper',
                                                }}
                                            >
                                                <Typography variant="subtitle2" sx={{ minWidth: 160, flexGrow: 1 }}>
                                                    {earn.component_name}
                                                </Typography>
                                                <TextField
                                                    label="Amount (₹)"
                                                    size="small"
                                                    type="number"
                                                    value={earn.amount ?? ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updatedEarnings = [...editForm.earnings];
                                                        updatedEarnings[eIdx] = { ...updatedEarnings[eIdx], amount: val };
                                                        setEditForm({ ...editForm, earnings: updatedEarnings });
                                                    }}
                                                    sx={{ width: 140 }}
                                                />
                                                <IconButton size="small" color="error" onClick={() => handleRemoveEarningFromEdit(eIdx)}>
                                                    <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                                                </IconButton>
                                            </Box>
                                        ))
                                    )}
                                </Stack>

                                {/* Add new earning */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <TextField
                                        placeholder="Component name (e.g. Basic Salary)"
                                        size="small"
                                        value={newEarningName}
                                        onChange={(e) => setNewEarningName(e.target.value)}
                                        sx={{ flexGrow: 1 }}
                                    />
                                    <TextField
                                        placeholder="Amount"
                                        size="small"
                                        type="number"
                                        value={newEarningAmount}
                                        onChange={(e) => setNewEarningAmount(e.target.value)}
                                        sx={{ width: 120 }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                            handleAddEarningToEdit(newEarningName, newEarningAmount);
                                            setNewEarningName('');
                                            setNewEarningAmount('');
                                        }}
                                        disabled={!newEarningName.trim()}
                                    >
                                        Add
                                    </Button>
                                </Box>
                            </Box>

                            <Divider />

                            {/* 5. Salary Deductions */}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                        DEDUCTIONS COMPONENTS ({editForm.deductions?.length || 0})
                                    </Typography>
                                </Box>

                                <Stack spacing={1.5} sx={{ mb: 2 }}>
                                    {(editForm.deductions || []).length === 0 ? (
                                        <Typography variant="caption" color="text.secondary">
                                            No deductions components added
                                        </Typography>
                                    ) : (
                                        editForm.deductions.map((ded: any, dIdx: number) => (
                                            <Box
                                                key={dIdx}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    p: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    bgcolor: 'background.paper',
                                                }}
                                            >
                                                <Typography variant="subtitle2" sx={{ minWidth: 160, flexGrow: 1 }}>
                                                    {ded.component_name}
                                                </Typography>
                                                <TextField
                                                    label="Amount (₹)"
                                                    size="small"
                                                    type="number"
                                                    value={ded.amount ?? ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updatedDeductions = [...editForm.deductions];
                                                        updatedDeductions[dIdx] = { ...updatedDeductions[dIdx], amount: val };
                                                        setEditForm({ ...editForm, deductions: updatedDeductions });
                                                    }}
                                                    sx={{ width: 140 }}
                                                />
                                                <IconButton size="small" color="error" onClick={() => handleRemoveDeductionFromEdit(dIdx)}>
                                                    <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                                                </IconButton>
                                            </Box>
                                        ))
                                    )}
                                </Stack>

                                {/* Add new deduction */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <TextField
                                        placeholder="Deduction name (e.g. PF)"
                                        size="small"
                                        value={newDeductionName}
                                        onChange={(e) => setNewDeductionName(e.target.value)}
                                        sx={{ flexGrow: 1 }}
                                    />
                                    <TextField
                                        placeholder="Amount"
                                        size="small"
                                        type="number"
                                        value={newDeductionAmount}
                                        onChange={(e) => setNewDeductionAmount(e.target.value)}
                                        sx={{ width: 120 }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                            handleAddDeductionToEdit(newDeductionName, newDeductionAmount);
                                            setNewDeductionName('');
                                            setNewDeductionAmount('');
                                        }}
                                        disabled={!newDeductionName.trim()}
                                    >
                                        Add
                                    </Button>
                                </Box>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setEditingIndex(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveEdit}
                        sx={{
                            bgcolor: COMMON_COLORS.emerald.main,
                            color: 'common.white',
                            '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
                        }}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
