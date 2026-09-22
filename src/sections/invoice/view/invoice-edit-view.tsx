import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IoMdArrowBack, IoMdCube, IoMdListBox, IoMdCalculator, IoMdPricetags, IoMdWallet, IoMdPrint, IoMdSwap } from "react-icons/io";

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

import { getContact } from 'src/api/contacts';
import { uploadFile } from 'src/api/data-import';
import { getDoc, getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { getInvoice, createItem, updateInvoice } from 'src/api/invoice';

import { Iconify } from 'src/components/iconify';

import { PaymentTermsDialog } from 'src/sections/master/payment-terms/payment-terms-dialog';

import { TaxTypeFormDialog } from '../tax-type-form-dialog';
import { ContactFormDialog } from '../../contact/contact-form-dialog';

// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

type ItemRow = {
    name?: string;
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
    cgst: number;
    sgst: number;
    igst: number;
    sub_total: number;
};

export function InvoiceEditView() {
    const { id } = useParams();
    const router = useRouter();

    const [customerOptions, setCustomerOptions] = useState<any[]>([]);
    const [itemOptions, setItemOptions] = useState<any[]>([]);
    const [taxOptions, setTaxOptions] = useState<any[]>([]);
    const [paymentTermsOptions, setPaymentTermsOptions] = useState<any[]>([]);
    const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);

    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [billingName, setBillingName] = useState('');
    const [billingNameOptions, setBillingNameOptions] = useState<{ name: string; account_name: string }[]>([]);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [poNo, setPoNo] = useState('');
    const [poDate, setPoDate] = useState('');
    const [billingAddress, setBillingAddress] = useState('');
    const [description, setDescription] = useState('');
    const [remarks, setRemarks] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    const [items, setItems] = useState<ItemRow[]>([]);

    const [discountType, setDiscountType] = useState<'Flat' | 'Percentage'>('Flat');
    const [discountValue, setDiscountValue] = useState(0);

    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [newItem, setNewItem] = useState<{ item_name: string; item_code: string; rate: number | '' }>({ item_name: '', item_code: '', rate: 0 });
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const [creatingItem, setCreatingItem] = useState(false);

    const [taxTypeDialogOpen, setTaxTypeDialogOpen] = useState(false);
    const [newTaxInitialName, setNewTaxInitialName] = useState('');

    const [contactDialogOpen, setContactDialogOpen] = useState(false);

    const [paymentTermsDialogOpen, setPaymentTermsDialogOpen] = useState(false);

    const fetchPaymentTermsOptions = async () => {
        try {
            const opts = await getDoctypeList('Payment Terms', ['name', 'payment_terms', 'creation', 'modified']);
            setPaymentTermsOptions(opts);
            return opts;
        } catch (error) {
            console.error('Failed to fetch payment terms options:', error);
            return [];
        }
    };
    const [customerError, setCustomerError] = useState(false);
    const [billingNameError, setBillingNameError] = useState(false);
    const [itemError, setItemError] = useState(false);
    const [paymentTermsError, setPaymentTermsError] = useState(false);

    useEffect(() => {
        getDoctypeList('Contacts', ['name', 'first_name', 'company_name', 'address']).then(setCustomerOptions);
        getDoctypeList('Item', ['name', 'item_name', 'rate', 'item_code']).then(setItemOptions);
        getDoctypeList('Tax Types', ['name', 'tax_name', 'tax_percentage', 'tax_type']).then(setTaxOptions);
        getDoctypeList('Company Bank Account', ['name', 'account_holder_name', 'account_no']).then(setBankAccountOptions);
        fetchPaymentTermsOptions();

        if (id) {
            getInvoice(id)
                .then(async (data) => {
                    setCustomerId(data.customer_id || data.client_name || '');
                    setCustomerName(data.customer_name || '');
                    setBillingName(data.billing_name || '');
                    setInvoiceDate(data.invoice_date || '');
                    setDueDate(data.due_date || '');
                    setPaymentTerms(data.payment_terms || '');
                    setPoNo(data.po_no || '');
                    setPoDate(data.po_date || '');
                    setBillingAddress(data.billing_address || '');
                    // Fetch contact to populate billing name options
                    const clientId = data.customer_id || data.client_name;
                    if (clientId) {
                        try {
                            const contact = await getContact(clientId);
                            const mappedOptions = contact.company_names?.map((cid: string, idx: number) => ({
                                name: cid,
                                account_name: contact.company_name_list?.[idx] || cid
                            })) || [];
                            setBillingNameOptions(mappedOptions);
                        } catch (err) {
                            console.error('Failed to fetch contact details for invoice initial load:', err);
                        }
                    }
                    setDescription(data.description || '');
                    setRemarks(data.terms_and_conditions || '');
                    setBankAccount(data.bank_account || '');
                    if (data.attachments) {
                        try {
                            const parsed = JSON.parse(data.attachments);
                            if (Array.isArray(parsed)) {
                                setAttachments(parsed);
                            } else {
                                // Fallback if it's JSON but not an array
                                setAttachments([{ name: data.attachments.split('/').pop() || 'Attachment', url: data.attachments }]);
                            }
                        } catch {
                            // If parsing fails, treat it as a single URL string (standard Frappe Attach field)
                            setAttachments([{ name: data.attachments.split('/').pop() || 'Attachment', url: data.attachments }]);
                        }
                    } else {
                        setAttachments([]);
                    }
                    setDiscountType(data.overall_discount_type || 'Flat');
                    setDiscountValue(data.overall_discount || 0);
                    setItems(data.table_qecz?.map((item: any) => ({
                        ...item,
                        tax_percent: item.tax_percent || 0 // Assuming tax_percent might need to be fetched or stored
                    })) || []);
                })
                .finally(() => setFetching(false));
        }
    }, [id]);

    type BillingNameOption = {
        name: string;
        account_name: string;
    };

    const handleCustomerChange = async (name: string) => {
        setCustomerId(name);

        if (name) {
            setCustomerError(false);

            try {
                const contact = await getContact(name);

                setCustomerName(contact.first_name || '');
                setBillingAddress(contact.address || '');

                // Explicitly type the mapped array so TypeScript can infer the type of `opt`
                const mappedOptions: BillingNameOption[] =
                    contact.company_names?.map((cid: string, idx: number) => ({
                        name: cid,
                        account_name: contact.company_name_list?.[idx] || cid,
                    })) || [];

                setBillingNameOptions(mappedOptions);

                // Auto-select if only one billing option is available
                if (mappedOptions.length === 1) {
                    setBillingName(mappedOptions[0].name);
                    setBillingNameError(false);
                }
                // Clear current billing name if it does not exist in the new options
                else if (!mappedOptions.find((opt) => opt.name === billingName)) {
                    setBillingName('');
                }
            } catch (error) {
                console.error('Failed to fetch contact details:', error);
            }
        } else {
            // Reset all related fields when customer is cleared
            setCustomerName('');
            setBillingName('');
            setBillingNameOptions([]);
            setBillingAddress('');
        }
    };

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
                cgst: 0,
                sgst: 0,
                igst: 0,
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
            setItemError(false);
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

        let taxCategory = '';
        if (field === 'tax_type') {
            const selectedTax = taxOptions.find((opt) => opt.name === value);
            if (selectedTax) {
                item.tax_percent = selectedTax.tax_percentage || 0;
                taxCategory = selectedTax.tax_type || '';
            } else {
                item.tax_percent = 0;
                taxCategory = '';
            }
        } else if (item.tax_type) {
            const selectedTax = taxOptions.find((opt) => opt.name === item.tax_type);
            taxCategory = selectedTax?.tax_type || '';
        }

        // Calculations
        const amount = item.quantity * item.price;
        const discountAmount = item.discount_type === 'Flat' ? item.discount : (amount * item.discount) / 100;
        const taxableAmount = Math.max(0, amount - discountAmount);

        item.tax_amount = (taxableAmount * item.tax_percent) / 100;
        item.sub_total = taxableAmount + item.tax_amount;

        // GST Split
        if (taxCategory === 'GST') {
            item.cgst = item.tax_amount / 2;
            item.sgst = item.tax_amount / 2;
            item.igst = 0;
        } else if (taxCategory === 'IGST') {
            item.cgst = 0;
            item.sgst = 0;
            item.igst = item.tax_amount;
        } else {
            item.cgst = 0;
            item.sgst = 0;
            item.igst = 0;
        }

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

            // Add to item options with proper field mapping
            const formattedItem = {
                name: createdItem.name,
                item_name: createdItem.item_name,
                item_code: createdItem.item_code || '',
                rate: createdItem.rate || 0
            };
            setItemOptions((prev) => [...prev, formattedItem]);

            // Directly populate the row with all fields
            if (activeRowIndex !== null) {
                const newItems = [...items];
                newItems[activeRowIndex] = {
                    ...newItems[activeRowIndex],
                    service: createdItem.name,
                    description: createdItem.item_name || '',
                    hsn_code: createdItem.item_code || '',
                    price: createdItem.rate || 0
                };

                // Recalculate totals for this row
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
        if (!id) return;
        if (!customerId) {
            setCustomerError(true);
            enqueueSnackbar('Please select a Client', { variant: 'error' });
            return;
        }
        setCustomerError(false);

        if (!billingName) {
            setBillingNameError(true);
            enqueueSnackbar('Please select a Billing Name', { variant: 'error' });
            return;
        }
        setBillingNameError(false);

        if (!paymentTerms || paymentTerms === 'Select Payment terms') {
            setPaymentTermsError(true);
            enqueueSnackbar('Please select Payment Terms', { variant: 'error' });
            return;
        }
        setPaymentTermsError(false);

        const validItems = items.filter((item) => item.service !== '');
        if (validItems.length === 0) {
            setItemError(true);
            enqueueSnackbar('Please add at least one item', { variant: 'error' });
            return;
        }
        setItemError(false);

        try {
            setLoading(true);

            // Upload files if any are new local Files
            let attachmentUrl = '';
            if (attachments.length > 0 && attachments[0] instanceof File) {
                setUploading(true);
                try {
                    const uploaded = await uploadFile(attachments[0], 'Invoice', id, 'attachments');
                    attachmentUrl = uploaded.file_url;
                } catch (error: any) {
                    throw new Error(`File upload failed: ${error.message}`);
                } finally {
                    setUploading(false);
                }
            } else if (attachments.length > 0) {
                attachmentUrl = attachments[0].url || '';
            }

            const invoiceData = {
                client_name: customerId,
                customer_name: customerName,
                billing_name: billingName,
                invoice_date: invoiceDate,
                due_date: dueDate,
                payment_terms: paymentTerms,
                po_no: poNo,
                po_date: poDate,
                billing_address: billingAddress,
                description,
                terms_and_conditions: remarks,
                bank_account: bankAccount,
                attachments: attachmentUrl,
                overall_discount_type: discountType,
                overall_discount: discountValue,
                total_qty: totalQty,
                total_amount: itemsTotalTaxable,
                grand_total: grandTotal,
                table_qecz: validItems.map((item) => ({
                    name: item.name,
                    service: item.service,
                    hsn_code: item.hsn_code,
                    description: item.description,
                    quantity: item.quantity,
                    price: item.price,
                    discount_type: item.discount_type,
                    discount: item.discount,
                    tax_type: item.tax_type,
                    tax_amount: item.tax_amount,
                    cgst: item.cgst,
                    sgst: item.sgst,
                    igst: item.igst,
                    sub_total: item.sub_total,
                })),
            };

            await updateInvoice(id, invoiceData);
            enqueueSnackbar('Invoice updated successfully', { variant: 'success' });
            setTimeout(() => router.push('/deals?tab=invoices'), 600);
        } catch (err: any) {
            console.error(err);
            enqueueSnackbar(err.message || 'Failed to update invoice', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">Edit Invoice: {id}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" color="inherit" startIcon={<IoMdArrowBack size={20} />} onClick={() => router.push('/deals?tab=invoices')}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            }
                        }}>
                        Go Back
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleSave} loading={loading} sx={{ borderRadius: 1.5, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}>
                        Update Invoice
                    </Button>
                </Stack>
            </Stack>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Card sx={{ p: 4 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 3,
                            rowGap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Autocomplete
                                fullWidth
                                options={customerOptions}
                                getOptionLabel={(option) => (option.first_name ? `${option.name} - ${option.first_name}` : option.name || '')}
                                value={customerOptions.find((opt) => opt.name === customerId) || null}
                                onChange={(_e, newValue) => handleCustomerChange(newValue?.name || '')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Client ID"
                                        required
                                        error={customerError}
                                        helperText={customerError ? 'Please select a Client' : ''}
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
                            {customerId && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setContactDialogOpen(true)}
                                    sx={{ height: 35, px: 2, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}                                >
                                    Edit
                                </Button>
                            )}
                        </Stack>

                        <TextField
                            fullWidth
                            label="Client Name"
                            value={customerName}
                            InputProps={{
                                readOnly: true,
                            }}
                            sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08) }}
                        />

                        <Autocomplete
                            fullWidth
                            options={billingNameOptions}
                            getOptionLabel={(option) => option.account_name || option.name || ''}
                            value={billingNameOptions.find((opt) => opt.name === billingName) || null}
                            onChange={(_e, newValue) => {
                                setBillingName(newValue?.name || '');
                                if (newValue?.name) {
                                    setBillingNameError(false);
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Billing Name"
                                    required
                                    error={billingNameError}
                                    helperText={billingNameError ? 'Please select a Billing Name' : ''}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.name}>
                                    <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                            {option.account_name}
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
                            label="Billing Address"
                            multiline
                            rows={2}
                            value={billingAddress}
                            InputProps={{
                                readOnly: true,
                            }}
                            sx={{
                                gridColumn: 'span 2',
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                            }}
                        />

                        <Divider sx={{ my: 2, gridColumn: 'span 2' }} />

                        <Autocomplete
                            fullWidth
                            options={paymentTermsOptions}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                return option.payment_terms || option.name || '';
                            }}
                            filterOptions={(options, params) => {
                                const filtered = filter(options, params);
                                // Always add "+ Create Payment Terms" option at the end
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
                                }
                            }}
                            ListboxProps={{
                                sx: {
                                    maxHeight: '300px',
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Payment Terms"
                                    error={paymentTermsError}
                                    helperText={paymentTermsError ? 'Payment Terms is required' : ''}
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

                        <TextField
                            fullWidth
                            label="PO No"
                            value={poNo}
                            onChange={(e) => setPoNo(e.target.value)}
                        />

                        <DatePicker
                            label="PO Date"
                            value={poDate ? dayjs(poDate) : null}
                            onChange={(newValue) => setPoDate(newValue?.format('YYYY-MM-DD') || '')}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    InputLabelProps: { shrink: true },
                                },
                            }}
                        />

                        <DatePicker
                            label="Invoice Date"
                            value={invoiceDate ? dayjs(invoiceDate) : null}
                            onChange={(newValue) => setInvoiceDate(newValue?.format('YYYY-MM-DD') || '')}
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
                        border: (theme) => itemError ? `2px solid ${theme.palette.error.main}` : `1px solid ${theme.palette.divider}`,
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

                                                            // Always add "+ Create item" option at the end
                                                            filtered.push({
                                                                inputValue: inputValue || '',
                                                                item_name: inputValue ? `+ Create "${inputValue}"` : '+ Create item',
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
                        <Stack spacing={2} sx={{ width: 500, mt: 3 }}>
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
                                            py: 0.4, '&:hover': {
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
                        <Stack spacing={3}>
                            <Autocomplete
                                fullWidth
                                options={bankAccountOptions}
                                getOptionLabel={(option) => (option.account_no ? `${option.account_holder_name} - ${option.account_no}` : option.account_holder_name || option.name || '')}
                                value={bankAccountOptions.find((opt) => opt.name === bankAccount) || null}
                                onChange={(_e, newValue) => setBankAccount(newValue?.name || '')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Bank Account"
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.name}>
                                        <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                {option.account_no ? `${option.account_holder_name} - ${option.account_no}` : option.account_holder_name || option.name}
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
                                label="Description"
                                multiline
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />

                            <TextField
                                fullWidth
                                label="Terms & Conditions / Remarks"
                                multiline
                                rows={4}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Stack>

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
                                    attachments.map((file, index) => (
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
            </LocalizationProvider>

            <ContactFormDialog
                open={contactDialogOpen}
                onClose={() => setContactDialogOpen(false)}
                contactId={customerId}
                onSuccess={() => {
                    if (customerId) handleCustomerChange(customerId);
                }}
            />

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
        </DashboardContent>
    );
}
