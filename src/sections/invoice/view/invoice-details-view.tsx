import { useSnackbar } from 'notistack';
import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
    IoMdArrowBack, IoMdCube, IoMdListBox, IoMdCalculator, IoMdPricetags, 
    IoMdWallet, IoMdPrint, IoMdTrash, IoMdCreate, IoMdPerson, 
    IoMdCalendar, IoMdCash, IoMdList, IoMdLink, IoMdDownload,
    IoMdCheckmarkCircle, IoMdAlert
} from "react-icons/io";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import Backdrop from '@mui/material/Backdrop';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { handleDirectPrint } from 'src/utils/print';

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

import { getDoctypeList } from 'src/api/purchase';
import { DashboardContent } from 'src/layouts/dashboard';
import { getInvoice, deleteInvoice, getInvoicePrintUrl } from 'src/api/invoice';

import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export function InvoiceDetailsView() {
    const { id } = useParams();
    const router = useRouter();
    const location = useLocation() as any;
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState<any>(null);
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.invoice;
    const canEditInvoice = hasCustomPerms ? !!user?.permissions?.actions?.invoice?.edit : true;
    const canDeleteInvoice = hasCustomPerms ? !!user?.permissions?.actions?.invoice?.delete : true;
    const canCreateCollection = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.invoice_collection ? !!user?.permissions?.actions?.invoice_collection?.create : true;
    const [itemNames, setItemNames] = useState<Record<string, string>>({});
    const [accountName, setAccountName] = useState<string>('');
    const [bankAccountDetails, setBankAccountDetails] = useState<any>(null);
    const [fetching, setFetching] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        if (id) {
            getInvoice(id)
                .then(setInvoice)
                .finally(() => setFetching(false));
        }
    }, [id]);

    useEffect(() => {
        if (invoice?.bank_account) {
            getDoctypeList('Company Bank Account', ['name', 'bank_name', 'account_holder_name', 'account_no', 'ifsc_code'], { name: invoice.bank_account })
                .then((accounts: any[]) => {
                    if (accounts && accounts.length > 0) {
                        setBankAccountDetails(accounts[0]);
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch Bank Account details:', err);
                    setBankAccountDetails(null);
                });
        }
    }, [invoice?.bank_account]);

    useEffect(() => {
        if (invoice?.billing_name) {
            getDoctypeList('Accounts', ['name', 'account_name'])
                .then((accounts: any[]) => {
                    const account = accounts.find((acc: any) => acc.name === invoice.billing_name);
                    if (account?.account_name) {
                        setAccountName(account.account_name);
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch Account details:', err);
                    setAccountName('');
                });
        }
    }, [invoice?.billing_name]);

    useEffect(() => {
        const services = Array.from(new Set((invoice?.table_qecz || [])
            .map((item: any) => item?.service)
            .filter(Boolean)));

        if (!services.length) {
            setItemNames({});
            return;
        }

        getDoctypeList('Item', ['name', 'item_name'], { name: ['in', services] })
            .then((items: any[]) => {
                const mapped = items.reduce((acc: Record<string, string>, item: any) => {
                    if (item?.name) {
                        acc[item.name] = item.item_name || item.name;
                    }
                    return acc;
                }, {});
                setItemNames(mapped);
            })
            .catch((err) => {
                console.error('Failed to fetch Item names:', err);
            });
    }, [invoice?.table_qecz]);

    const convertedShown = useRef(false);

    useEffect(() => {
        if (location.state?.converted && !convertedShown.current) {
            convertedShown.current = true;
            enqueueSnackbar('Converted from estimation successfully!', { variant: 'success' });
            // Clear navigation state to prevent re-showing on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, enqueueSnackbar, navigate, location.pathname]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!invoice) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Invoice not found</Typography>
                <Button onClick={() => router.push('/deals?tab=invoices')} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const {
        client_name,
        customer_name,
        billing_name,
        invoice_date,
        billing_address,
        description,
        terms_and_conditions,
        attachments,
        overall_discount_type,
        overall_discount,
        total_amount,
        grand_total,
        received_amount,
        balance_amount,
        table_qecz = [],
        bank_account,
        converted_from_estimation,
        converted_estimation_id,
    } = invoice;

    let parsedAttachments: { name: string; url: string }[] = [];
    if (attachments) {
        try {
            const parsed = JSON.parse(attachments);
            if (Array.isArray(parsed)) {
                parsedAttachments = parsed;
            } else {
                parsedAttachments = [{ name: attachments.split('/').pop() || 'Attachment', url: attachments }];
            }
        } catch {
            parsedAttachments = [{ name: attachments.split('/').pop() || 'Attachment', url: attachments }];
        }
    }

    const totalTax = table_qecz.reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0);
    const subTotal = total_amount + totalTax;
    const discountAmount = overall_discount_type === 'Flat' ? overall_discount : (subTotal * overall_discount) / 100;

    const handlePrint = () => {
        if (id) {
            handleDirectPrint(
                getInvoicePrintUrl(id),
                () => setPrinting(true),
                () => setPrinting(false)
            );
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            setDeleting(true);
            await deleteInvoice(id);
            router.push('/deals?tab=invoices');
        } catch (error) {
            console.error('Failed to delete invoice:', error);
        } finally {
            setDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3} className="no-print">
                <Typography variant="h4">Invoice: {id}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                            if (location.state?.from) {
                                navigate(location.state.from, { state: location.state?.parentState || location.state });
                            } else {
                                navigate(-1);
                            }
                        }}
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
                    <Button
                        variant="contained"
                        onClick={handlePrint}
                        startIcon={<IoMdPrint size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            bgcolor: '#2065D1',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#103996' }
                        }}
                    >
                        Print
                    </Button>
                    {received_amount === 0 && canDeleteInvoice && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setConfirmDeleteOpen(true)}
                            startIcon={<IoMdTrash size={20} />}
                            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none' }}
                        >
                            Delete
                        </Button>
                    )}
                    {received_amount === 0 && canEditInvoice && (
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/invoices/${encodeURIComponent(id || '')}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            Edit Invoice
                        </Button>
                    )}
                    {(balance_amount || 0) > 0 && canCreateCollection && (
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/invoice-collections/new?invoice=${encodeURIComponent(id || '')}`)}
                            startIcon={<IoMdCash size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#36b37e',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#2b9065' }
                            }}
                        >
                            Create Collection
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Card sx={{ p: 4, borderRadius: 2 }}>
                <Stack spacing={4}>
                    {/* Header Info Sections */}
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 4,
                            rowGap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        }}
                    >
                        {/* Customer Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                                <IoMdPerson size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Customer Details</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                                    {accountName || billing_name || 'No Company Name'}
                                </Typography>
                                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 500 }}>
                                    ID: {billing_name}
                                </Typography>
                                <Typography variant="body2" color="text.primary" sx={{ mt: 1, fontWeight: 600, fontSize: '15px' }}>
                                    {customer_name || 'No Contact Name'}
                                </Typography>
                                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 500 }}>
                                    ID: {client_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{billing_address || 'No address provided'}</Typography>
                            </Box>
                        </Stack>

                        {/* Document Logistics Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                                <IoMdCalendar size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Doc Logistics</Typography>
                            </Stack>
                            <Stack spacing={2} sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">Invoice Date</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{invoice_date}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">Reference</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>#{id}</Typography>
                                </Stack>
                                {converted_estimation_id && (
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">Converted Estimation ID</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{converted_estimation_id}</Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Stack>

                        {/* Summary Stats Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                                <IoMdCash size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Financial Status</Typography>
                            </Stack>
                            <Stack spacing={2} sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha((balance_amount || 0) > 0 ? theme.palette.error.main : theme.palette.success.main, 0.04), border: (theme) => `1px solid ${alpha((balance_amount || 0) > 0 ? theme.palette.error.main : theme.palette.success.main, 0.12)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <IoMdWallet size={18} style={{ color: '#7e7e7e' }} />
                                        <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                                    </Stack>
                                    <Typography variant="subtitle1" color="primary.main">{renderCurrency(grand_total, '18px')}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        {(balance_amount || 0) > 0 ? <IoMdAlert size={18} style={{ color: '#FF5630' }} /> : <IoMdCheckmarkCircle size={18} style={{ color: '#02c281' }} />}
                                        <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                                    </Stack>
                                    <Typography variant="h6" color={(balance_amount || 0) > 0 ? "error.main" : "success.main"}>{renderCurrency(balance_amount, '18px')}</Typography>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Table Section */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, color: '#059669' }}>
                            <IoMdList size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Invoice Items</Typography>
                        </Stack>
                        <TableContainer sx={{
                            overflow: 'unset',
                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                            borderRadius: 1.5,
                        }}>
                            <Table sx={{ minWidth: 800 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04) }}>
                                        <TableCell sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Service</TableCell>
                                        <TableCell sx={{ fontWeight: 'fontWeightBold', py: 2 }}>HSN</TableCell>
                                        <TableCell sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Description</TableCell>
                                        <TableCell width={60} align="center" sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Qty</TableCell>
                                        <TableCell width={120} align="right" sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Price</TableCell>
                                        <TableCell width={100} align="right" sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Discount</TableCell>
                                        <TableCell width={100} align="right" sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Tax Type</TableCell>
                                        <TableCell width={100} align="right" sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Tax Amt</TableCell>
                                        <TableCell width={120} align="right" sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {table_qecz.map((row: any, index: number) => (
                                        <TableRow key={index} sx={{ '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) } }}>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography variant="subtitle2">{itemNames[row.service] || row.service || '-'}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography variant="body2">{row.hsn_code || '-'}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 200 }}>{row.description}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2 }}>{row.quantity}</TableCell>
                                            <TableCell align="right" sx={{ py: 2 }}>{renderCurrency(row.price)}</TableCell>
                                            <TableCell align="right" sx={{ py: 2 }}>
                                                {row.discount > 0 ? (
                                                    <Typography variant="caption" color="success.main">
                                                        -{row.discount_type === 'Flat' ? renderCurrency(row.discount) : `${row.discount}%`}
                                                    </Typography>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 2 }}>
                                                <Typography variant="caption" color="text.secondary">{row.tax_type || '-'}</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 2 }}>{renderCurrency(row.tax_amount)}</TableCell>
                                            <TableCell align="right" sx={{ py: 2 }}>
                                                <Typography variant="subtitle2" color="primary">{renderCurrency(row.sub_total)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    {/* Footer Row */}
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 4,
                            rowGap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
                            alignItems: 'start'
                        }}
                    >
                        {/* Terms, Description & Attachments Group */}
                        <Stack spacing={3}>
                            {description && (
                                <Stack spacing={1}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Scope & Description</Typography>
                                    <Typography variant="body2" sx={{
                                        p: 2,
                                        borderRadius: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                        whiteSpace: 'pre-wrap',
                                        minHeight: 80,
                                        color: 'text.secondary'
                                    }}>
                                        {description}
                                    </Typography>
                                </Stack>
                            )}

                            <Stack spacing={1}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Terms & Conditions</Typography>
                                <Typography variant="body2" sx={{
                                    p: 2,
                                    borderRadius: 1.5,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                    whiteSpace: 'pre-wrap',
                                    minHeight: 80
                                }}>
                                    {terms_and_conditions || 'No specific terms provided.'}
                                </Typography>
                            </Stack>

                            <Stack spacing={1}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Company Bank Account</Typography>
                                {bank_account ? (
                                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                        <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700, fontSize: '16px'}}>
                                            {bankAccountDetails?.bank_name || 'Loading...'}
                                        </Typography>
                                        <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 500 }}>
                                            ID: {bank_account}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-wrap'  }}>
                                            Account Holder:{' '}
                                            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', mb: 20 }}>
                                                {bankAccountDetails?.account_holder_name || '-'}
                                            </Box>
                                              <Box sx={{ mb: 0.5 }} />
                                             Account No:{' '}
                                            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                {bankAccountDetails?.account_no || '-'}
                                            </Box>
                                           <Box sx={{ mb: 0.5 }} />
                                            IFSC:{' '}
                                            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                {bankAccountDetails?.ifsc_code || '-'}
                                            </Box>
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" sx={{
                                        p: 2,
                                        borderRadius: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                        color: 'text.secondary'
                                    }}>
                                        No bank account selected.
                                    </Typography>
                                )}
                            </Stack>

                            {parsedAttachments.length > 0 && (
                                <Stack spacing={1}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Attachments</Typography>
                                    <Stack spacing={1}>
                                        {parsedAttachments.map((file, index) => (
                                            <Stack
                                                key={index}
                                                direction="row"
                                                alignItems="center"
                                                component="a"
                                                href={file.url}
                                                target="_blank"
                                                sx={{
                                                    px: 2,
                                                    py: 1,
                                                    borderRadius: 1.5,
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                                    transition: (theme) => theme.transitions.create(['background-color', 'transform']),
                                                    '&:hover': {
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                        transform: 'translateY(-1px)'
                                                    },
                                                }}
                                            >
                                                <IoMdLink size={18} style={{ marginRight: 8, color: '#059669', flexShrink: 0 }} />
                                                <Typography variant="body2" noWrap sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}>{file.name || file.url.split('/').pop()}</Typography>
                                                <IoMdDownload size={16} style={{ marginLeft: 8, color: '#919EAB' }} />
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>

                        {/* Totals Breakdown */}
                        <Stack spacing={2} sx={{ p: 3, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdListBox size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Taxable Amount</Typography>
                                </Stack>
                                <Typography variant="subtitle2">{renderCurrency(table_qecz.reduce((sum: number, row: any) => sum + (row.sub_total - row.tax_amount), 0))}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdCalculator size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Total Tax</Typography>
                                </Stack>
                                <Typography variant="subtitle2" color="error.main">+{renderCurrency(totalTax)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdPricetags size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Discount ({overall_discount_type === 'Flat' ? 'Flat' : `${overall_discount}%`})</Typography>
                                </Stack>
                                <Typography variant="subtitle2" color="success.main">-{renderCurrency(discountAmount)}</Typography>
                            </Stack>
                            <Divider sx={{ borderStyle: 'dashed' }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <IoMdWallet size={24} style={{ color: '#059669' }} />
                                    <Typography variant="subtitle1" sx={{ color: '#059669' }}>Grand Total</Typography>
                                </Stack>
                                <Typography variant="h5" color="primary.main">{renderCurrency(grand_total, '20px')}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <IoMdCheckmarkCircle size={18} style={{ color: '#02c281' }} />
                                    <Typography variant="body2" color="text.secondary">Received Amount</Typography>
                                </Stack>
                                <Typography variant="subtitle2" color="success.main">{renderCurrency(received_amount)}</Typography>
                            </Stack>
                            <Divider sx={{ borderStyle: 'dashed' }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    {(balance_amount || 0) > 0 ? <IoMdAlert size={24} style={{ color: '#FF5630' }} /> : <IoMdCheckmarkCircle size={24} style={{ color: '#02c281' }} />}
                                    <Typography variant="subtitle1" sx={{ color: (balance_amount || 0) > 0 ? 'error.main' : 'success.main' }}>Balance Due</Typography>
                                </Stack>
                                <Typography variant="h5" color={(balance_amount || 0) > 0 ? "error.main" : "success.main"}>{renderCurrency(balance_amount, '20px')}</Typography>
                            </Stack>
                        </Stack>
                    </Box>
                </Stack>
            </Card >

            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => !deleting && setConfirmDeleteOpen(false)}
                title="Confirm Delete"
                content="Are you sure you want to delete this invoice?"
                action={
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        disabled={deleting}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                }
            />

            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={printing}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </DashboardContent >
    );
}
