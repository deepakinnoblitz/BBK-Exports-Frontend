import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { usePdfExport } from 'src/hooks/use-pdf-export';

import { fCurrency } from 'src/utils/format-number';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/purchase';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { generatePurchasePdf } from 'src/components/export/pdf/purchase-pdf-generator';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
  const formatted = fCurrency(amount);
  if (!formatted) return '—';
  const index = formatted.indexOf('₹');
  if (index !== -1) {
    return (
      <>
        {formatted.substring(0, index)}
        <span style={{ fontFamily: 'Arial', fontSize: symbolFontSize, display: 'inline-block', verticalAlign: 'baseline', lineHeight: 'normal' }}>₹</span>{' '}
        {formatted.substring(index + 1)}
      </>
    );
  }
  return formatted;
};

export function PurchaseReportView() {
    const { user } = useAuth();

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.purchase_report;
    const canExport = hasCustomPerms && user?.permissions?.actions?.purchase_report ? !!user?.permissions?.actions?.purchase_report?.export : true;

    const navigate = useNavigate();
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [summaryData, setSummaryData] = useState<any[]>([]);

    const { exportingPdf, handleExportPdf } = usePdfExport();

    // Filters
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [vendor, setVendor] = useState<any>(null);
    const [sortBy, setSortBy] = useState('modified_desc');

    // Options
    const [vendorOptions, setVendorOptions] = useState<{ name: string; first_name: string }[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);



    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = reportData.map((n) => n.name);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            if (reportData.length === 0) {
                setLoading(false);
                return;
            }

            // Build filters
            const listFilters: Record<string, any> = {};
            if (vendor) listFilters.vendor_name = vendor.name;
            if (fromDate) listFilters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) listFilters.to_date = toDate.format('YYYY-MM-DD');
            if (user?.has_crm_permission) listFilters.owner = user.name;

            const res = await fetch(`/api/method/company.company.crm_api.get_purchase_export_data?filters=${encodeURIComponent(JSON.stringify(listFilters))}`, {
                method: 'GET',
                credentials: "include"
            });

            if (!res.ok) throw new Error("Failed to fetch data for export");

            const jsonResponse = await res.json();
            const data = jsonResponse.message || [];

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Purchase Report');

            // Define sheet columns in the exact order requested
            const columns = [
                { header: 'Purchase ID', key: 'purchase_id' },
                { header: 'Vendor', key: 'vendor_real_name' },
                { header: 'Vendor ID', key: 'vendor_name' },
                { header: 'Bill No', key: 'bill_no' },
                { header: 'Bill Date', key: 'bill_date' },
                { header: 'Service', key: 'service' },
                { header: 'HSN', key: 'hsn_code' },
                { header: 'Description', key: 'description' },
                { header: 'Qty', key: 'qty' },
                { header: 'Price', key: 'price' },
                { header: 'Discount', key: 'discount' },
                { header: 'Tax Type', key: 'tax_type' },
                { header: 'Tax Amount', key: 'tax_amount' },
                { header: 'Total', key: 'total' },
                { header: 'Grand Total', key: 'grand_total' },
                { header: 'Total Tax', key: 'total_tax' },
                { header: 'Overall Discount', key: 'overall_discount' },
                { header: 'Overall Discount Type', key: 'overall_discount_type' },
                { header: 'Payment Type', key: 'payment_type' },
                { header: 'Owner', key: 'owner' },
                { header: 'Attachments', key: 'attachments' },
            ];

            sheet.columns = columns;
            const colCount = columns.length;

            // Header Row Styling (Teal/blue fill FF0ea5e9, bold white font)
            for (let i = 1; i <= colCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            sheet.getRow(1).height = 25;

            // Group items by purchase ID
            const groups: Record<string, any[]> = {};
            const purchaseIdsOrdered: string[] = [];

            data.forEach((item: any) => {
                const purId = item.purchase_id;
                if (!groups[purId]) {
                    groups[purId] = [];
                    purchaseIdsOrdered.push(purId);
                }
                groups[purId].push(item);
            });

            let currentRow = 2; // header is row 1
            const groupEndRows: number[] = [];

            // Populate rows dynamically
            purchaseIdsOrdered.forEach((purId, groupIdx) => {
                const items = groups[purId];
                const totalTax = items.reduce((sum, it) => sum + (Number(it.tax_amount) || 0), 0);
                const startRow = currentRow;
                const endRow = startRow + items.length - 1;
                groupEndRows.push(endRow);

                items.forEach((item, itemIdx) => {
                    const rowDataObj: Record<string, any> = {};

                    // Purchase-level fields (merged columns) are populated on the first row only of the group
                    if (itemIdx === 0) {
                        rowDataObj.purchase_id = item.purchase_id || '-';
                        rowDataObj.vendor_real_name = item.vendor_real_name || '-';
                        rowDataObj.vendor_name = item.vendor_name || '-';
                        rowDataObj.bill_no = item.bill_no || '-';
                        rowDataObj.bill_date = item.bill_date ? dayjs(item.bill_date).format('YYYY-MM-DD') : '-';
                        rowDataObj.owner = item.owner || '-';

                        rowDataObj.grand_total = item.grand_total !== undefined && item.grand_total !== null && !isNaN(Number(item.grand_total)) ? Number(item.grand_total) : '-';
                        rowDataObj.total_tax = !isNaN(Number(totalTax)) ? Number(totalTax) : totalTax;
                        rowDataObj.overall_discount = item.overall_discount !== undefined && item.overall_discount !== null && !isNaN(Number(item.overall_discount)) ? Number(item.overall_discount) : '-';
                        rowDataObj.overall_discount_type = item.overall_discount_type || '-';
                        rowDataObj.payment_type = item.payment_type || '-';
                        rowDataObj.attachments = ''; // Will be set as link object below
                    } else {
                        rowDataObj.purchase_id = '';
                        rowDataObj.vendor_real_name = '';
                        rowDataObj.vendor_name = '';
                        rowDataObj.bill_no = '';
                        rowDataObj.bill_date = '';
                        rowDataObj.owner = '';

                        rowDataObj.grand_total = '';
                        rowDataObj.total_tax = '';
                        rowDataObj.overall_discount = '';
                        rowDataObj.overall_discount_type = '';
                        rowDataObj.payment_type = '';
                        rowDataObj.attachments = '';
                    }

                    // Item-level fields (unmerged columns) populated on every row as numbers if numeric
                    rowDataObj.service = item.service || '-';
                    rowDataObj.hsn_code = item.hsn_code !== undefined && item.hsn_code !== null && !isNaN(Number(item.hsn_code)) ? Number(item.hsn_code) : (item.hsn_code || '-');
                    rowDataObj.description = item.description || '-';
                    rowDataObj.qty = item.qty !== undefined && item.qty !== null && !isNaN(Number(item.qty)) ? Number(item.qty) : '-';
                    rowDataObj.price = item.price !== undefined && item.price !== null && !isNaN(Number(item.price)) ? Number(item.price) : '-';
                    rowDataObj.discount = item.discount !== undefined && item.discount !== null && !isNaN(Number(item.discount)) ? Number(item.discount) : '-';
                    rowDataObj.tax_type = item.tax_type || '-';
                    rowDataObj.tax_amount = item.tax_amount !== undefined && item.tax_amount !== null && !isNaN(Number(item.tax_amount)) ? Number(item.tax_amount) : '-';
                    rowDataObj.total = item.total !== undefined && item.total !== null && !isNaN(Number(item.total)) ? Number(item.total) : '-';

                    const newRow = sheet.addRow(rowDataObj);
                    (newRow as any).isDataRow = true;
                    currentRow++;
                });

                // Apply merging for purchase-level columns:
                if (items.length > 1) {
                    const columnsToMerge = [
                        1,  // purchase_id
                        2,  // vendor_real_name
                        3,  // vendor_name
                        4,  // bill_no
                        5,  // bill_date
                        15, // grand_total
                        16, // total_tax
                        17, // overall_discount
                        18, // overall_discount_type
                        19, // payment_type
                        20, // owner
                        21, // attachments
                    ];

                    columnsToMerge.forEach(colIndex => {
                        sheet.mergeCells(startRow, colIndex, endRow, colIndex);
                    });
                }

                // Add Hyperlink with actual filename to Attachments cell on the first row of the group
                const attachCell = sheet.getCell(startRow, 21);
                if (items[0].attachments && items[0].attachments !== '-') {
                    const attachmentUrl = items[0].attachments;
                    const parts = attachmentUrl.split('/');
                    const filename = parts[parts.length - 1] || 'Download';
                    const token = items[0].attachment_token;
                    const dlUrl = `${window.location.origin}/api/method/company.company.crm_api.download_purchase_attachment?file_path=${encodeURIComponent(attachmentUrl)}&token=${encodeURIComponent(token)}`;

                    attachCell.value = {
                        text: filename,
                        hyperlink: dlUrl
                    };
                    attachCell.font = {
                        color: { argb: 'FF0000FF' },
                        underline: true
                    };
                } else {
                    attachCell.value = '-';
                }
            });

            // Row styling (thin black border, white background, alignments)
            const totalRows = sheet.rowCount;
            for (let r = 1; r <= totalRows; r++) {
                const row = sheet.getRow(r);
                const isHeader = r === 1;
                for (let c = 1; c <= colCount; c++) {
                    const cell = row.getCell(c);
                    
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    
                    const isGroupEnd = groupEndRows.includes(r);
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: isGroupEnd ? 'medium' : 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    };

                    if (isHeader) {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                    } else {
                        // Use a clean, uniform white background for all rows
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                        
                        // Retain the download style font if it was set on first-row attachments cell
                        const isAttachmentHyperlink = (c === 21 && cell.value && typeof cell.value === 'object' && (cell.value as any).hyperlink);
                        if (!isAttachmentHyperlink) {
                            // Default font styling
                            cell.font = { name: 'Arial', size: 10 };
                        }
                    }
                }
            }

            // Auto-fit column widths
            sheet.columns?.forEach((column: any) => {
                if (!column) return;
                let maxLen = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell: any) => {
                        let value = '';
                        if (cell.value) {
                            if (typeof cell.value === 'object') {
                                value = cell.value.text ? String(cell.value.text) : '';
                            } else {
                                value = String(cell.value);
                            }
                        }
                        if (value.length > maxLen) {
                            maxLen = value.length;
                        }
                    });
                }
                
                let minWidth = 12;
                if (column.key === 'description') minWidth = 25;
                if (column.key === 'attachments') minWidth = 15;
                if (column.key === 'owner') minWidth = 20;
                column.width = Math.max(maxLen + 4, minWidth);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Purchase_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    const handleViewPurchase = useCallback((id: string) => {
        navigate(`/purchase/${encodeURIComponent(id)}`);
    }, [navigate]);

    const onChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');
            if (vendor) filters.vendor = vendor.name;
            if (user?.has_crm_permission) filters.owner = user.name;

            console.log('Fetching Purchase Report with filters:', filters);
            const result = await runReport('Purchase Report', filters);
            console.log('Purchase Report Result Received:', result);

            if (result && result.result) {
                setReportData(result.result || []);
                setSummaryData(result.report_summary || []);
            } else if (Array.isArray(result)) {
                // Some versions return the array directly if it's a simple report call
                setReportData(result);
            } else {
                setReportData([]);
                setSummaryData([]);
            }
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch purchase report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, vendor, user]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        setVendor(null);
        setSortBy('modified_desc');
    };

    useEffect(() => {
        getDoctypeList('Contacts', ['name', 'first_name'], { customer_type: 'Purchase' }).then((contacts: any[]) => {
            setVendorOptions(contacts);
        });
    }, []);

    const filteredData = [...reportData].sort((a, b) => {
        if (sortBy === 'creation_desc') {
            return dayjs(b.creation).diff(dayjs(a.creation));
        }
        if (sortBy === 'creation_asc') {
            return dayjs(a.creation).diff(dayjs(b.creation));
        }
        if (sortBy === 'modified_desc') {
            return dayjs(b.modified).diff(dayjs(a.modified));
        }
        if (sortBy === 'modified_asc') {
            return dayjs(a.modified).diff(dayjs(b.modified));
        }
        if (sortBy === 'purchase_date_desc') {
            return dayjs(b.bill_date).diff(dayjs(a.bill_date));
        }
        if (sortBy === 'purchase_date_asc') {
            return dayjs(a.bill_date).diff(dayjs(b.bill_date));
        }
        return 0;
    });

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Purchase Report</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
                            onClick={fetchReport}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Iconify icon="solar:restart-bold" />}
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    </Stack>
                </Stack>

                <Card
                    sx={{
                        py: 2.5,
                        px: 2,
                        display: 'flex',
                        columnGap: 2,
                        rowGap: 1.5,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        bgcolor: 'background.neutral',
                        border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="From Date"
                            format="DD-MM-YYYY"
                            value={fromDate}
                            onChange={(newValue) => setFromDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 190, '& .MuiInputBase-root': { height: 48, alignItems: 'center' } }
                                }
                            }}
                        />
                        <DatePicker
                            label="To Date"
                            format="DD-MM-YYYY"
                            value={toDate}
                            onChange={(newValue) => setToDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 190, '& .MuiInputBase-root': { height: 48, alignItems: 'center' } }
                                }
                            }}
                        />
                    </LocalizationProvider>
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 240 }}
                        options={vendorOptions}
                        getOptionLabel={(option) => option ? `${option.first_name} (${option.name})` : ''}
                        value={vendor}
                        onChange={(event, newValue) => setVendor(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Search vendors..."
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        bgcolor: 'background.neutral',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                    },
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.name}>
                                <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {option.first_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        ID: {option.name}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            sx={{ height: 40 }}
                        >
                            <MenuItem value="creation_desc">Created ↓ (Latest)</MenuItem>
                            <MenuItem value="creation_asc">Created ↑ (Oldest)</MenuItem>
                            <MenuItem value="modified_desc">Modified ↓ (Latest)</MenuItem>
                            <MenuItem value="modified_asc">Modified ↑ (Oldest)</MenuItem>
                            <MenuItem value="purchase_date_desc">Purchase Date ↓ (Latest)</MenuItem>
                            <MenuItem value="purchase_date_asc">Purchase Date ↑ (Oldest)</MenuItem>
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} />
                    {canExport &&(
                        <>
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon={"solar:export-bold" as any} />}
                                onClick={handleExport}
                                disabled={reportData.length === 0}
                                sx={{ mr: 1 }}
                            >
                                Export Excel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                onClick={() => handleExportPdf(() => generatePurchasePdf({
                                    reportData: filteredData,
                                    selected,
                                    summary: summaryData.length > 0 ? summaryData : [
                                        { label: 'Total Purchase Bills', value: reportData.length },
                                        { label: 'Sub Total Amount', value: reportData.reduce((acc, curr) => acc + (curr.sub_total || 0), 0) },
                                        { label: 'Tax Amount', value: reportData.reduce((acc, curr) => acc + (curr.tax_amount || 0), 0) },
                                        { label: 'Grand Total Amount', value: reportData.reduce((acc, curr) => acc + (curr.grand_total || 0), 0) }
                                    ]
                                }))}
                                disabled={exportingPdf || reportData.length === 0}
                                sx={{
                                    bgcolor: '#f43f5e',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#e11d48' },
                                    height: 37,
                                    px: 3,
                                }}
                            >
                                {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
                            </Button>
                        </>
                    )}
                </Card>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                        },
                    }}
                >
                    {summaryData.map((item, index) => (
                        <SummaryCard key={index} item={item} />
                    ))}
                    {summaryData.length === 0 && (
                        <>
                            <SummaryCard item={{ label: 'Total Purchase Amount', value: 0, indicator: 'blue', datatype: 'Currency' }} />
                            <SummaryCard item={{ label: 'Total Quantity Purchased', value: 0, indicator: 'green', datatype: 'Float' }} />
                            <SummaryCard item={{ label: 'Purchase Records', value: 0, indicator: 'orange' }} />
                        </>
                    )}
                </Box>

                <Card>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Scrollbar>
                            <Table
                                size="medium"
                                stickyHeader
                                sx={{ borderCollapse: 'collapse' }}
                            >
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={selected.length > 0 && selected.length < reportData.length}
                                                checked={reportData.length > 0 && selected.length === reportData.length}
                                                onChange={handleSelectAllClick}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Purchase ID</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Vendor</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Bill No</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Bill Date</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Qty</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Grand Total</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', position: 'sticky', right: 0, bgcolor: '#f4f6f8', zIndex: 11 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                                                const isSelected = selected.indexOf(row.name) !== -1;
                                                return (
                                                    <TableRow
                                                        key={index}
                                                        hover
                                                        role="checkbox"
                                                        aria-checked={isSelected}
                                                        selected={isSelected}
                                                        sx={{
                                                            '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                            '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox checked={isSelected} onClick={(event) => handleClick(event, row.name)} />
                                                        </TableCell>
                                                        <TableCell>{row.name}</TableCell>
                                                        <TableCell align="left" sx={{ maxWidth: 240 }}>
                                                            <Stack spacing={0.5}>
                                                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                                                    {row.vendor_real_name || row.vendor_name || '-'}
                                                                </Typography>
                                                                {row.vendor_name && (
                                                                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                                                        {row.vendor_name}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>{row.bill_no}</TableCell>
                                                        <TableCell>{row.bill_date ? dayjs(row.bill_date).format('DD MMM YYYY') : '-'}</TableCell>
                                                        <TableCell>{row.quantity}</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>{renderCurrency(row.grand_total, '16px')}</TableCell>
                                                        <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', boxShadow: '-2px 0 4px rgba(145, 158, 171, 0.08)' }}>
                                                            <IconButton onClick={() => handleViewPurchase(row.name)} sx={{ color: 'info.main' }}>
                                                                <Iconify icon="solar:eye-bold" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {reportData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                                        <Stack spacing={1} alignItems="center">
                                                            <Iconify icon={"eva:slash-outline" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>No data found</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </Scrollbar>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={reportData.length}
                        page={page}
                        onPageChange={onChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
            </Stack>


        </DashboardContent>
    );
}

function SummaryCard({ item }: { item: any }) {
    const theme = useTheme();

    const getIndicatorColor = (indicator: string) => {
        switch (indicator?.toLowerCase()) {
            case 'blue': return theme.palette.info.main;
            case 'green': return theme.palette.success.main;
            case 'orange': return theme.palette.warning.main;
            case 'red': return theme.palette.error.main;
            default: return theme.palette.primary.main;
        }
    };

    const getIcon = (label: string) => {
        const t = label.toLowerCase();
        if (t.includes('amount')) return 'solar:wad-of-money-bold-duotone';
        if (t.includes('quantity')) return 'solar:box-bold-duotone';
        if (t.includes('records')) return 'solar:document-text-bold-duotone';
        return 'solar:chart-2-bold-duotone';
    };

    const color = getIndicatorColor(item.indicator);

    return (
        <Card
            sx={{
                p: 3,
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                bgcolor: alpha(color, 0.04),
                border: `1px solid ${alpha(color, 0.1)}`,
                transition: theme.transitions.create(['transform', 'box-shadow']),
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px -4px ${alpha(color, 0.12)}`,
                },
            }}
        >
            <Stack direction="row" alignItems="center" spacing={2.5}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        display: 'flex',
                        borderRadius: 1.5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        bgcolor: alpha(color, 0.1),
                    }}
                >
                    <Iconify icon={getIcon(item.label) as any} width={28} />
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>
                        {item.label}
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                        {item.datatype === 'Currency' || (typeof item.value === 'number' && item.label.toLowerCase().includes('amount'))
                            ? renderCurrency(item.value, '24px')
                            : item.value?.toLocaleString()}
                    </Typography>
                </Box>
            </Stack>

            <Box
                sx={{
                    top: -16,
                    right: -16,
                    width: 80,
                    height: 80,
                    opacity: 0.08,
                    position: 'absolute',
                    borderRadius: '50%',
                    bgcolor: color,
                }}
            />
        </Card>
    );
}
