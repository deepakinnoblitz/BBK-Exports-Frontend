import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { IoMdArrowBack, IoMdCube, IoMdListBox, IoMdCalculator, IoMdPricetags, IoMdWallet } from "react-icons/io";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';

import { createItem } from 'src/api/invoice';
import { getDoctypeList } from 'src/api/leads';
import { uploadFile } from 'src/api/data-import';
import { createPurchase } from 'src/api/purchase';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { PaymentTypeDialog } from 'src/sections/master/payment-type/payment-type-dialog';
import { PaymentTermsDialog } from 'src/sections/master/payment-terms/payment-terms-dialog';

import { TaxTypeFormDialog } from '../../invoice/tax-type-form-dialog';

// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

type ItemRow = {
    service: string;
    hsn_code: string;
    description: string;
    quantity: number;
    price: number;
    discount_type: 'Flat' | 'Percentage';
    discount: number;
    tax_type: string;
    tax_percent: number;
    tax_amount: number;
    sub_total: number;
};

export function PurchaseCreateView() {
    const router = useRouter();

    const [vendorOptions, setVendorOptions] = useState<any[]>([]);
    const [itemOptions, setItemOptions] = useState<any[]>([]);
    const [taxOptions, setTaxOptions] = useState<any[]>([]);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState<any[]>([]);
    const [paymentTermsOptions, setPaymentTermsOptions] = useState<any[]>([]);

    const [vendorName, setVendorName] = useState('');
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentType, setPaymentType] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    const [items, setItems] = useState<ItemRow[]>([
        {
            service: '',
            hsn_code: '',
            description: '',
            quantity: 1,
            price: 0,
            discount_type: 'Percentage',
            discount: 0,
            tax_type: '',
            tax_percent: 0,
            tax_amount: 0,
            sub_total: 0,
        },
    ]);

    const [discountType, setDiscountType] = useState<'Flat' | 'Percentage'>('Flat');
    const [discountValue, setDiscountValue] = useState(0);

    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();
    const [errors, setErrors] = useState<{ vendor?: boolean; billNo?: boolean; items?: boolean; paymentType?: boolean; paymentTerms?: boolean }>({});

    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [newItem, setNewItem] = useState<{ item_name: string; item_code: string; rate: number | '' }>({ item_name: '', item_code: '', rate: 0 });
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const [creatingItem, setCreatingItem] = useState(false);

    const [taxTypeDialogOpen, setTaxTypeDialogOpen] = useState(false);
    const [newTaxInitialName, setNewTaxInitialName] = useState('');
    const [paymentTermsDialogOpen, setPaymentTermsDialogOpen] = useState(false);
    const [paymentTypeDialogOpen, setPaymentTypeDialogOpen] = useState(false);

    const fetchPaymentTermsOptions = async () => {
        try {
            const opts = await getDoctypeList('Payment Terms', ['name', 'payment_terms', 'creation', 'modified']);
            setPaymentTermsOptions(opts);
            return opts;
        } catch (error) {
            console.error('Failed to load Payment Terms data:', error);
            return [];
        }
    };

    const fetchPaymentTypeOptions = async () => {
        try {
            const opts = await getDoctypeList('Payment Type', ['name', 'payment_type', 'creation', 'modified']);
            setPaymentTypeOptions(opts);
            return opts;
        } catch (error) {
            console.error('Failed to load Payment Type data:', error);
            return [];
        }
    };

    useEffect(() => {
        getDoctypeList('Contacts', ['name', 'first_name', 'company_name', 'customer_type'])
            .then((data) => {
                console.log('Vendor data loaded:', data);
                // Filter only Purchase type contacts
                const purchaseContacts = data.filter((contact: any) => contact.customer_type === 'Purchase');
                setVendorOptions(purchaseContacts);
            })
            .catch((error) => {
                console.error('Failed to load Vendor data:', error);
                setVendorOptions([]);
            });

        getDoctypeList('Item', ['name', 'item_name', 'rate', 'item_code'])
            .then(setItemOptions)
            .catch((error) => console.error('Failed to load Item data:', error));

        getDoctypeList('Tax Types', ['name', 'tax_name', 'tax_percentage', 'tax_type'])
            .then(setTaxOptions)
            .catch((error) => console.error('Failed to load Tax Types data:', error));

        fetchPaymentTypeOptions();
        fetchPaymentTermsOptions();
    }, []);

    const handleAddRow = () => {
        setItems([
            ...items,
            {
                service: '',
                hsn_code: '',
                description: '',
                quantity: 1,
                price: 0,
                discount_type: 'Percentage',
                discount: 0,
                tax_type: '',
                tax_percent: 0,
                tax_amount: 0,
                sub_total: 0,
            },
        ]);
    };

    const handleRemoveRow = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleItemChange = async (index: number, field: keyof ItemRow, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        if (field === 'service') {
            const selectedItem = itemOptions.find((opt) => opt.name === value);
            if (selectedItem) {
                item.price = selectedItem.rate || 0;
                item.description = selectedItem.item_name || '';
                item.hsn_code = selectedItem.item_code || '';
            } else {
                item.price = 0;
                item.description = '';
                item.hsn_code = '';
                item.quantity = 1;
                item.discount = 0;
                item.tax_type = '';
                item.tax_percent = 0;
            }
        }

        if (field === 'tax_type') {
            const selectedTax = taxOptions.find((opt) => opt.name === value);
            if (selectedTax) {
                item.tax_percent = selectedTax.tax_percentage || 0;
            } else {
                item.tax_percent = 0;
            }
        }

        // Calculations
        const amount = item.quantity * item.price;
        const discountAmount = item.discount_type === 'Flat' ? item.discount : (amount * item.discount) / 100;
        const taxableAmount = Math.max(0, amount - discountAmount);

        item.tax_amount = (taxableAmount * item.tax_percent) / 100;
        item.sub_total = taxableAmount + item.tax_amount;

        newItems[index] = item;
        setItems(newItems);
    };

    const handleCreateItem = async () => {
        if (!newItem.item_name) {
            enqueueSnackbar('Please enter Item Name', { variant: 'error' });
            return;
        }

        try {
            setCreatingItem(true);
            const payload = {
                ...newItem,
                rate: newItem.rate === '' ? 0 : Number(newItem.rate)
            };
            const createdItem = await createItem(payload);

            const formattedItem = {
                name: createdItem.name,
                item_name: createdItem.item_name,
                item_code: createdItem.item_code || '',
                rate: createdItem.rate || 0
            };
            setItemOptions((prev) => [...prev, formattedItem]);

            if (activeRowIndex !== null) {
                const newItems = [...items];
                newItems[activeRowIndex] = {
                    ...newItems[activeRowIndex],
                    service: createdItem.name,
                    description: createdItem.item_name || '',
                    hsn_code: createdItem.item_code || '',
                    price: createdItem.rate || 0
                };

                const item = newItems[activeRowIndex];
                const amount = item.quantity * item.price;
                const discountAmount = item.discount_type === 'Flat' ? item.discount : (amount * item.discount) / 100;
                const taxableAmount = Math.max(0, amount - discountAmount);
                item.tax_amount = (taxableAmount * item.tax_percent) / 100;
                item.sub_total = taxableAmount + item.tax_amount;

                setItems(newItems);
            }

            setItemDialogOpen(false);
            setNewItem({ item_name: '', item_code: '', rate: 0 });
            enqueueSnackbar('Item created successfully', { variant: 'success' });
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Failed to create item', { variant: 'error' });
        } finally {
            setCreatingItem(false);
        }
    };

    const itemsTotalTaxable = items.reduce((sum, item) => {
        const amount = item.quantity * item.price;
        const itemDiscount = item.discount_type === 'Flat' ? item.discount : (amount * item.discount) / 100;
        return sum + (amount - itemDiscount);
    }, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const subTotal = itemsTotalTaxable + totalTax;

    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

    const discountAmount = discountType === 'Flat' ? discountValue : (subTotal * discountValue) / 100;
    const grandTotal = Math.max(0, subTotal - discountAmount);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Store the local file object
        setAttachments([file]);
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const newErrors: { vendor?: boolean; billNo?: boolean; items?: boolean; paymentType?: boolean; paymentTerms?: boolean } = {};
        if (!vendorName) newErrors.vendor = true;
        if (!billNo) newErrors.billNo = true;
        if (!paymentType) newErrors.paymentType = true;
        if (!paymentTerms) newErrors.paymentTerms = true;
        const validItems = items.filter((item) => item.service !== '');
        if (validItems.length === 0) newErrors.items = true;

        setErrors(newErrors);

        if (newErrors.vendor) {
            enqueueSnackbar('Please select a vendor', { variant: 'error' });
            return;
        }

        if (newErrors.billNo) {
            enqueueSnackbar('Please enter bill number', { variant: 'error' });
            return;
        }

        if (newErrors.paymentType) {
            enqueueSnackbar('Please select payment type', { variant: 'error' });
            return;
        }

        if (newErrors.paymentTerms) {
            enqueueSnackbar('Please select payment terms', { variant: 'error' });
            return;
        }

        if (newErrors.items) {
            enqueueSnackbar('Please add at least one item', { variant: 'error' });
            return;
        }

        try {
            setLoading(true);

            // Upload files if any
            let attachmentUrl = '';
            if (attachments.length > 0 && attachments[0] instanceof File) {
                setUploading(true);
                try {
                    const uploaded = await uploadFile(attachments[0]);
                    attachmentUrl = uploaded.file_url;
                } catch (error: any) {
                    throw new Error(`File upload failed: ${error.message}`);
                } finally {
                    setUploading(false);
                }
            } else if (attachments.length > 0) {
                attachmentUrl = attachments[0].url || '';
            }

            const selectedVendor = vendorOptions.find((opt) => opt.name === vendorName);
            const actualVendorName = selectedVendor ? (selectedVendor.first_name || selectedVendor.name) : vendorName;

            const purchaseData = {
                vendor_name: vendorName,
                vendor_id: vendorName,
                bill_no: billNo,
                bill_date: billDate,
                payment_type: paymentType,
                payment_terms: paymentTerms,
                due_date: dueDate,
                description,
                attach: attachmentUrl,
                overall_discount_type: discountType,
                overall_discount: discountValue,
                total_qty: totalQty,
                total_amount: itemsTotalTaxable,
                grand_total: grandTotal,
                table_qecz: validItems.map((item) => ({
                    service: item.service,
                    hsn_code: item.hsn_code,
                    description: item.description,
                    quantity: item.quantity,
                    price: item.price,
                    discount_type: item.discount_type,
                    discount: item.discount,
                    tax_type: item.tax_type,
                    tax_amount: item.tax_amount,
                    sub_total: item.sub_total,
                })),
            };

            await createPurchase(purchaseData);
            enqueueSnackbar('Purchase created successfully', { variant: 'success' });
            setTimeout(() => router.push('/purchase'), 1500);
        } catch (err: any) {
            console.error(err);
            enqueueSnackbar(err.message || 'Failed to create purchase', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/purchase');
    };

    const renderCurrency = (amount: any, symbolFontSize: string = '16px') => {
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

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DashboardContent maxWidth="xl">
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                    <Typography variant="h4">New Purchase</Typography>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={handleCancel}
                            startIcon={<IoMdArrowBack size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 2.5,
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                    borderColor: 'text.primary',
                                }
                            }}
                        >
                            Go Back
                        </Button>
                        <Button variant="contained" color="primary" onClick={handleSave} loading={loading} sx={{ borderRadius: 1.5, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}>
                            Save Purchase
                        </Button>
                    </Stack>
                </Stack>


                <Card sx={{ p: 4 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 3,
                            rowGap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                        }}
                    >
                        <Autocomplete
                            fullWidth
                            options={vendorOptions}
                            getOptionLabel={(option) => (option.first_name ? `${option.first_name} (${option.name})` : option.name || '')}
                            value={vendorOptions.find((opt) => opt.name === vendorName) || null}
                            onChange={(_e, newValue) => {
                                setVendorName(newValue?.name || '');
                                if (newValue?.name) setErrors((prev) => ({ ...prev, vendor: false }));
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Vendor"
                                    required
                                    error={errors.vendor}
                                    helperText={errors.vendor ? 'Please select a vendor' : ''}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.name}>
                                    <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                            {option.first_name || option.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            ID: {option.name}
                                        </Typography>
                                    </Stack>
                                </li>
                            )}
                        />

                        <TextField
                            fullWidth
                            label="Bill No"
                            value={billNo}
                            onChange={(e) => {
                                setBillNo(e.target.value);
                                if (e.target.value) setErrors((prev) => ({ ...prev, billNo: false }));
                            }}
                            required
                            error={errors.billNo}
                            helperText={errors.billNo ? 'Please enter bill number' : ''}
                        />

                        <DatePicker
                            label="Bill Date"
                            value={dayjs(billDate)}
                            onChange={(newValue) => setBillDate(newValue?.format('YYYY-MM-DD') || '')}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    InputLabelProps: { shrink: true },
                                },
                            }}
                        />

                        <Autocomplete
                            fullWidth
                            options={paymentTypeOptions.filter((opt) => opt.name !== paymentType)}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.payment_type || option.name || '';
                            }}
                            filterOptions={(options, params) => {
                                const filtered = options.filter((opt) => opt.name !== paymentType);
                                filtered.push({
                                    name: 'create_payment_type_custom_option',
                                    payment_type: 'Create Payment Type',
                                    isNew: true,
                                });
                                return filtered;
                            }}
                            value={paymentTypeOptions.find((opt) => opt.name === paymentType) || (paymentType ? { name: paymentType, payment_type: paymentType } : null)}
                            onChange={(_e, newValue) => {
                                if (newValue?.isNew) {
                                    setPaymentTypeDialogOpen(true);
                                } else {
                                    setPaymentType(newValue?.name || '');
                                    if (newValue?.name) setErrors((prev) => ({ ...prev, paymentType: false }));
                                }
                            }}
                            ListboxProps={{
                                sx: {
                                    maxHeight: '300px',
                                    '& .MuiAutocomplete-option': {
                                        fontSize: '14px !important',
                                    }
                                }
                            }}
                            sx={{
                                '& .MuiInputBase-input': {
                                    fontSize: '14px !important',
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Payment Type"
                                    required
                                    error={errors.paymentType}
                                    helperText={errors.paymentType ? 'Please select payment type' : ''}
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box
                                    component="li"
                                    {...props}
                                    sx={{
                                        ...(option.isNew && {
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                            py: '8px !important',
                                            px: '16px !important',
                                            mt: 0.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                            }
                                        })
                                    }}
                                >
                                    {option.isNew ? (
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                                            <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Create Payment Type</Typography>
                                        </Stack>
                                    ) : (
                                        option.payment_type || option.name
                                    )}
                                </Box>
                            )}
                        />

                        <Autocomplete
                            fullWidth
                            options={paymentTermsOptions.filter((opt) => opt.name !== paymentTerms)}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.payment_terms || option.name || '';
                            }}
                            filterOptions={(options, params) => {
                                const filtered = options.filter((opt) => opt.name !== paymentTerms);
                                filtered.push({
                                    name: 'create_payment_term_custom_option',
                                    payment_terms: 'Create Payment Terms',
                                    isNew: true,
                                });
                                return filtered;
                            }}
                            value={paymentTermsOptions.find((opt) => opt.name === paymentTerms) || (paymentTerms ? { name: paymentTerms, payment_terms: paymentTerms } : null)}
                            onChange={(_e, newValue) => {
                                if (newValue?.isNew) {
                                    setPaymentTermsDialogOpen(true);
                                } else {
                                    setPaymentTerms(newValue?.name || '');
                                    if (newValue?.name) setErrors((prev) => ({ ...prev, paymentTerms: false }));
                                }
                            }}
                            ListboxProps={{
                                sx: {
                                    maxHeight: '300px',
                                    '& .MuiAutocomplete-option': {
                                        fontSize: '14px !important',
                                    }
                                }
                            }}
                            sx={{
                                '& .MuiInputBase-input': {
                                    fontSize: '14px !important',
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Payment Terms"
                                    required
                                    error={errors.paymentTerms}
                                    helperText={errors.paymentTerms ? 'Please select payment terms' : ''}
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box
                                    component="li"
                                    {...props}
                                    sx={{
                                        ...(option.isNew && {
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                            py: '8px !important',
                                            px: '16px !important',
                                            mt: 0.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                            }
                                        })
                                    }}
                                >
                                    {option.isNew ? (
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                                            <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Create Payment Terms</Typography>
                                        </Stack>
                                    ) : (
                                        option.payment_terms || option.name
                                    )}
                                </Box>
                            )}
                        />

                        <DatePicker
                            label="Due Date"
                            value={dueDate ? dayjs(dueDate) : null}
                            onChange={(newValue) => setDueDate(newValue?.format('YYYY-MM-DD') || '')}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    InputLabelProps: { shrink: true },
                                },
                            }}
                        />
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Items
                    </Typography>

                    <TableContainer sx={{
                        overflow: 'unset',
                        border: (theme) => errors.items ? `2px solid ${theme.palette.error.main}` : `1px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        boxShadow: (theme) => theme.customShadows.z8,
                    }}>
                        <Table sx={{ minWidth: 960 }}>
                            <TableHead sx={{
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                '& th:first-of-type': { borderTopLeftRadius: 11 },
                                '& th:last-of-type': { borderTopRightRadius: 11 }
                            }}>
                                <TableRow>
                                    <TableCell width={180} sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Service</TableCell>
                                    <TableCell width={80} sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>HSN</TableCell>
                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Description</TableCell>
                                    <TableCell width={80} align="right" sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Qty</TableCell>
                                    <TableCell width={120} align="right" sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Price</TableCell>
                                    <TableCell width={140} align="right" sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Discount</TableCell>
                                    <TableCell width={150} sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Tax Type</TableCell>
                                    <TableCell width={120} align="right" sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Tax Amt</TableCell>
                                    <TableCell width={120} align="right" sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, py: 1.5, fontWeight: 'fontWeightSemiBold' }}>Total</TableCell>
                                    <TableCell width={40} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((row, index) => (
                                    <TableRow
                                        key={index}
                                        sx={{
                                            verticalAlign: 'top',
                                            transition: (theme) => theme.transitions.create('background-color'),
                                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) },
                                            '&:nth-of-type(even)': { bgcolor: (theme) => alpha(theme.palette.grey[500], 0.02) },
                                        }}
                                    >
                                        {[
                                            {
                                                field: 'service', component: (
                                                    <Autocomplete
                                                        fullWidth
                                                        size="small"
                                                        options={itemOptions}
                                                        getOptionLabel={(option) => {
                                                            if (typeof option === 'string') return option;
                                                            if (option.inputValue) return option.inputValue;
                                                            return option.item_name || option.name || '';
                                                        }}
                                                        filterOptions={(options, params) => {
                                                            const filtered = filter(options, params);
                                                            const { inputValue } = params;

                                                            filtered.push({
                                                                inputValue: inputValue || '',
                                                                item_name: inputValue ? `+ Create "${inputValue}"` : '+ Create Item',
                                                                isNew: true,
                                                            });

                                                            return filtered;
                                                        }}
                                                        value={itemOptions.find((opt) => opt.name === row.service) || null}
                                                        onChange={(_e, newValue) => {
                                                            if (typeof newValue === 'string') {
                                                                handleItemChange(index, 'service', newValue);
                                                            } else if (newValue && newValue.isNew) {
                                                                setActiveRowIndex(index);
                                                                setNewItem((prev) => ({ ...prev, item_name: newValue.inputValue }));
                                                                setItemDialogOpen(true);
                                                            } else {
                                                                handleItemChange(index, 'service', newValue?.name || '');
                                                            }
                                                        }}
                                                        ListboxProps={{
                                                            sx: {
                                                                '& .MuiAutocomplete-option': {
                                                                    py: 1.5,
                                                                    px: 2,
                                                                    borderRadius: 0.75,
                                                                    mx: 0.5,
                                                                    my: 0.25,
                                                                    whiteSpace: 'nowrap',
                                                                }
                                                            }
                                                        }}
                                                        slotProps={{
                                                            paper: {
                                                                sx: {
                                                                    mt: 0.5,
                                                                    boxShadow: (theme) => theme.customShadows.z20,
                                                                    borderRadius: 1.5,
                                                                    minWidth: '350px',
                                                                }
                                                            },
                                                            popper: {
                                                                placement: 'bottom-start',
                                                                sx: {
                                                                    width: 'fit-content !important',
                                                                },
                                                                modifiers: [
                                                                    {
                                                                        name: 'flip',
                                                                        enabled: true,
                                                                    },
                                                                    {
                                                                        name: 'preventOverflow',
                                                                        enabled: true,
                                                                    },
                                                                ],
                                                            }
                                                        }}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                placeholder="Select Service"
                                                                variant="standard"
                                                                InputProps={{
                                                                    ...params.InputProps,
                                                                    disableUnderline: true,
                                                                    sx: { typography: 'body2' }
                                                                }}
                                                            />
                                                        )}
                                                        renderOption={(props, option) => (
                                                            <Box component="li" {...props} sx={{
                                                                typography: 'body2',
                                                                ...(option.isNew && {
                                                                    color: 'primary.main',
                                                                    fontWeight: 600,
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                                    mt: 0.5,
                                                                    '&:hover': {
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                                    }
                                                                })
                                                            }}>
                                                                {option.isNew ? (
                                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                        <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                                                        <Stack spacing={0}>
                                                                            <Typography variant="subtitle2" sx={{ lineHeight: 1, fontWeight: 700 }}>Create</Typography>
                                                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>Item</Typography>
                                                                        </Stack>
                                                                    </Stack>
                                                                ) : (
                                                                    option.item_name || option.name
                                                                )}
                                                            </Box>
                                                        )}
                                                    />
                                                )
                                            },
                                            {
                                                field: 'hsn_code', component: (
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        variant="standard"
                                                        value={row.hsn_code}
                                                        onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                                                        InputProps={{ disableUnderline: true, sx: { typography: 'body2' } }}
                                                    />
                                                )
                                            },
                                            {
                                                field: 'description', component: (
                                                    <TextField
                                                        fullWidth
                                                        multiline
                                                        size="small"
                                                        variant="standard"
                                                        value={row.description}
                                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        InputProps={{ disableUnderline: true, sx: { typography: 'body2' } }}
                                                    />
                                                )
                                            },
                                            {
                                                field: 'quantity', component: (
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        type="number"
                                                        variant="standard"
                                                        value={row.quantity === 0 ? '' : row.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                                        onFocus={(e) => e.target.select()}
                                                        inputProps={{ sx: { textAlign: 'right', typography: 'body2', px: 0 } }}
                                                        InputProps={{ disableUnderline: true }}
                                                    />
                                                )
                                            },
                                            {
                                                field: 'price', component: (
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        type="number"
                                                        variant="standard"
                                                        value={row.price === 0 ? '' : row.price}
                                                        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                                        onFocus={(e) => e.target.select()}
                                                        inputProps={{ sx: { textAlign: 'right', typography: 'body2', px: 0 } }}
                                                        InputProps={{ disableUnderline: true }}
                                                    />
                                                )
                                            },
                                            {
                                                field: 'discount', component: (
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <ToggleButtonGroup
                                                            size="small"
                                                            value={row.discount_type}
                                                            exclusive
                                                            onChange={(e, nextView) => {
                                                                if (nextView !== null) {
                                                                    handleItemChange(index, 'discount_type', nextView);
                                                                }
                                                            }}
                                                            sx={{
                                                                height: 28,
                                                                '& .MuiToggleButton-root': {
                                                                    px: 1,
                                                                    py: 0,
                                                                    border: 'none',
                                                                    typography: 'body2',
                                                                    '&.Mui-selected': {
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                                                        color: 'primary.main',
                                                                        '&:hover': {
                                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <ToggleButton value="Flat"><span style={{ fontFamily: 'Arial' }}>₹</span></ToggleButton>
                                                            <ToggleButton value="Percentage">%</ToggleButton>
                                                        </ToggleButtonGroup>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            type="number"
                                                            variant="standard"
                                                            value={row.discount === 0 ? '' : row.discount}
                                                            onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                                                            onFocus={(e) => e.target.select()}
                                                            inputProps={{ sx: { textAlign: 'right', typography: 'body2', px: 0 } }}
                                                            InputProps={{ disableUnderline: true }}
                                                        />
                                                    </Stack>
                                                )
                                            },
                                            {
                                                field: 'tax_type', component: (
                                                    <Autocomplete
                                                        fullWidth
                                                        size="small"
                                                        options={taxOptions}
                                                        getOptionLabel={(option) => {
                                                            if (typeof option === 'string') return option;
                                                            if (option.inputValue) return option.inputValue;
                                                            return option.tax_name || option.name || '';
                                                        }}
                                                        filterOptions={(options, params) => {
                                                            const filtered = filter(options, params);
                                                            const { inputValue } = params;

                                                            filtered.push({
                                                                inputValue: inputValue || '',
                                                                tax_name: inputValue ? `+ Create "${inputValue}"` : 'Create Tax Type',
                                                                isNew: true,
                                                            });

                                                            return filtered;
                                                        }}
                                                        value={taxOptions.find((opt) => opt.name === row.tax_type) || null}
                                                        onChange={(_e, newValue) => {
                                                            if (typeof newValue === 'string') {
                                                                handleItemChange(index, 'tax_type', newValue);
                                                            } else if (newValue && newValue.isNew) {
                                                                setActiveRowIndex(index);
                                                                setNewTaxInitialName(newValue.inputValue);
                                                                setTaxTypeDialogOpen(true);
                                                            } else {
                                                                handleItemChange(index, 'tax_type', newValue?.name || '');
                                                            }
                                                        }}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                placeholder="Select Tax"
                                                                variant="standard"
                                                                InputProps={{
                                                                    ...params.InputProps,
                                                                    disableUnderline: true,
                                                                    sx: { typography: 'body2' }
                                                                }}
                                                            />
                                                        )}
                                                        renderOption={(props, option) => (
                                                            <Box component="li" {...props} sx={{
                                                                typography: 'body2',
                                                                ...(option.isNew && {
                                                                    color: 'primary.main',
                                                                    fontWeight: 600,
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                                    mt: 0.5,
                                                                    '&:hover': {
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                                    }
                                                                })
                                                            }}>
                                                                {option.isNew ? (
                                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                        <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                                                                        <Stack spacing={0}>
                                                                            <Typography variant="subtitle2" sx={{ lineHeight: 1, fontWeight: 700 }}>Create</Typography>
                                                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>Tax Type</Typography>
                                                                        </Stack>
                                                                    </Stack>
                                                                ) : (
                                                                    option.tax_name || option.name
                                                                )}
                                                            </Box>
                                                        )}
                                                    />
                                                )
                                            },
                                        ].map((cell, idx) => (
                                            <TableCell
                                                key={idx}
                                                sx={{
                                                    px: 1,
                                                    py: 1,
                                                    borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                                                    transition: (theme) => theme.transitions.create(['background-color', 'box-shadow']),
                                                    '&:focus-within': {
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                                    }
                                                }}
                                            >
                                                {cell.component}
                                            </TableCell>
                                        ))}
                                        <TableCell align="right" sx={{ px: 1, py: 1, borderRight: (theme) => `1px solid ${theme.palette.divider}` }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'fontWeightMedium' }}>{renderCurrency(row.tax_amount)}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ px: 1, py: 1, borderRight: (theme) => `1px solid ${theme.palette.divider}` }}>
                                            <Typography variant="subtitle2" color="primary.main">{renderCurrency(row.sub_total)}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ px: 1, py: 1 }}>
                                            <IconButton color="error" onClick={() => handleRemoveRow(index)} size="small" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Button
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleAddRow}
                        sx={{ mt: 2 }}
                    >
                        Add Item
                    </Button>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Stack spacing={2} sx={{ width: 400, mt: 3 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdCube size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
                                </Stack>
                                <Typography variant="subtitle2" sx={{ width: 120, textAlign: 'right' }}>{totalQty}</Typography>
                            </Stack>

                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdListBox size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Taxable Amount</Typography>
                                </Stack>
                                <Typography variant="subtitle2" sx={{ width: 120, textAlign: 'right' }}>{renderCurrency(itemsTotalTaxable)}</Typography>
                            </Stack>

                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdCalculator size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Total Tax</Typography>
                                </Stack>
                                <Typography variant="subtitle2" sx={{ width: 120, textAlign: 'right' }}>{renderCurrency(totalTax)}</Typography>
                            </Stack>

                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
                                    <IoMdPricetags size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Overall Discount</Typography>
                                </Stack>
                                <ToggleButtonGroup
                                    size="small"
                                    value={discountType}
                                    exclusive
                                    onChange={(e, nextView) => {
                                        if (nextView !== null) {
                                            setDiscountType(nextView as any);
                                        }
                                    }}
                                    sx={{
                                        height: 32,
                                        mr: 6,
                                        '& .MuiToggleButton-root': {
                                            px: 1,
                                            py: 0,
                                            typography: 'body2',
                                            '&.Mui-selected': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                                color: 'primary.main',
                                                '&:hover': {
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <ToggleButton value="Flat"><span style={{ fontFamily: 'Arial' }}>₹</span></ToggleButton>
                                    <ToggleButton value="Percentage">%</ToggleButton>
                                </ToggleButtonGroup>
                                <TextField
                                    size="small"
                                    type="number"
                                    variant="standard"
                                    value={discountValue === 0 ? '' : discountValue}
                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    sx={{
                                        width: 150,
                                        '& .MuiInputBase-root': {
                                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                            borderRadius: 0.75,
                                            px: 1.25,
                                            py: 0.4,
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
                                            },
                                            '&.Mui-focused': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            }
                                        }
                                    }}
                                    inputProps={{ sx: { textAlign: 'right', typography: 'body2' } }}
                                />
                            </Stack>

                            <Divider />
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <IoMdWallet size={24} style={{ color: '#059669' }} />
                                    <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>Grand Total</Typography>
                                </Stack>
                                <Typography variant="h6" color="primary" sx={{ width: 120, textAlign: 'right' }}>{renderCurrency(grandTotal, '20px')}</Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    <Divider sx={{ my: 4, borderStyle: 'dashed' }} />

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                                <Typography variant="h6">Attachments</Typography>

                                <Button
                                    variant="contained"
                                    component="label"
                                    sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                                    color="primary"
                                    size="small"
                                    startIcon={<Iconify icon={"solar:upload-bold" as any} />}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : 'Upload File'}
                                    <input type="file" hidden onChange={handleFileUpload} />
                                </Button>
                            </Stack>

                            <Stack spacing={1}>
                                {attachments.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ py: 3, color: 'text.disabled' }}>
                                        <Iconify icon={"solar:file-bold" as any} width={40} height={40} sx={{ mb: 1, opacity: 0.48 }} />
                                        <Typography variant="body2">No attachments yet</Typography>
                                    </Stack>
                                ) : (
                                    attachments.map((file: any, index) => (
                                        <Stack
                                            key={index}
                                            direction="row"
                                            alignItems="center"
                                            sx={{
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 1.5,
                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                            }}
                                        >
                                            <Iconify icon={"solar:link-bold" as any} width={20} sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }} />
                                            <Typography variant="body2" noWrap sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}>
                                                {typeof file === 'string' ? file : (file.url || file.name)}
                                            </Typography>
                                            <Button
                                                size="small"
                                                color="inherit"
                                                onClick={() => handleRemoveAttachment(index)}
                                                sx={{
                                                    px: 1.5,
                                                    py: 0,
                                                    height: 26,
                                                    borderRadius: 1.5,
                                                    minWidth: 'auto',
                                                    typography: 'caption',
                                                    bgcolor: 'background.paper',
                                                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                                                    '&:hover': {
                                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                    }
                                                }}
                                            >
                                                Clear
                                            </Button>
                                        </Stack>
                                    ))
                                )}
                            </Stack>
                        </Box>
                    </Box>
                </Card>

                <Dialog open={itemDialogOpen} onClose={() => !creatingItem && setItemDialogOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle sx={{ pb: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                        Create Item
                        <IconButton
                            onClick={() => !creatingItem && setItemDialogOpen(false)}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ mt: 2 }}>
                        <Stack spacing={3} sx={{ pt: 1 }}>
                            <TextField
                                fullWidth
                                label="Item Name"
                                value={newItem.item_name}
                                onChange={(e) => setNewItem((prev) => ({ ...prev, item_name: e.target.value }))}
                                required
                            />
                            <TextField
                                fullWidth
                                label="HSN Code"
                                value={newItem.item_code}
                                onChange={(e) => setNewItem((prev) => ({ ...prev, item_code: e.target.value }))}
                            />
                            <TextField
                                fullWidth
                                label="Rate"
                                type="number"
                                value={newItem.rate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewItem((prev) => ({ ...prev, rate: val === '' ? '' : Number(val) }));
                                }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="contained" onClick={handleCreateItem} disabled={creatingItem} sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}>
                            {creatingItem ? <CircularProgress size={24} /> : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
                <TaxTypeFormDialog
                    open={taxTypeDialogOpen}
                    initialName={newTaxInitialName}
                    onClose={() => setTaxTypeDialogOpen(false)}
                    onSuccess={(newTax) => {
                        setTaxOptions((prev) => [...prev, newTax]);
                        if (activeRowIndex !== null) {
                            handleItemChange(activeRowIndex, 'tax_type', newTax.name);
                        }
                    }}
                />
                <PaymentTermsDialog
                    open={paymentTermsDialogOpen}
                    onClose={() => setPaymentTermsDialogOpen(false)}
                    onSuccess={async () => {
                        const opts = await fetchPaymentTermsOptions();
                        if (opts && opts.length > 0) {
                            const newest = [...opts].sort((a, b) => (b.creation || '').localeCompare(a.creation || ''))[0];
                            if (newest) {
                                setPaymentTerms(newest.name);
                            }
                        }
                    }}
                />
                <PaymentTypeDialog
                    open={paymentTypeDialogOpen}
                    onClose={() => setPaymentTypeDialogOpen(false)}
                    onSuccess={async () => {
                        const opts = await fetchPaymentTypeOptions();
                        if (opts && opts.length > 0) {
                            const newest = [...opts].sort((a, b) => (b.creation || '').localeCompare(a.creation || ''))[0];
                            if (newest) {
                                setPaymentType(newest.name);
                            }
                        }
                    }}
                />
            </DashboardContent>
        </LocalizationProvider>
    );
}
