import type { Invoice } from 'src/api/invoice';

import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
    IoMdArrowBack, IoMdTrash, IoMdCreate, IoMdDocument, 
    IoMdPerson, IoMdCalendar, IoMdCash, IoMdAlert, 
    IoMdCheckmarkCircle, IoMdListBox, IoMdListBox as IoMdNotes
} from "react-icons/io";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

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

import { getInvoice } from 'src/api/invoice';
import { DashboardContent } from 'src/layouts/dashboard';
import { getInvoiceCollection, deleteInvoiceCollection, fetchInvoiceCollections } from 'src/api/invoice-collection';

import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export function InvoiceCollectionDetailsView() {
    const { id } = useParams();
    const router = useRouter();
    const location = useLocation();
    const navigate = useNavigate();

    const handleGoBack = () => {
        if (location.state?.from) {
            navigate(location.state.from);
        } else {
            router.push('/deals?tab=invoices&subtab=collections');
        }
    };

    const [collection, setCollection] = useState<any>(null);
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.invoice_collection;
    const canEditCollection = hasCustomPerms ? !!user?.permissions?.actions?.invoice_collection?.edit : true;
    const canDeleteCollection = hasCustomPerms ? !!user?.permissions?.actions?.invoice_collection?.delete : true;
    const [fetching, setFetching] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [isLatest, setIsLatest] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState<Invoice | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (id) {
            getInvoiceCollection(id)
                .then((data) => {
                    setCollection(data);
                    // Fetch Invoice Details
                    getInvoice(data.invoice).then((inv) => {
                        setInvoiceDetails(inv);
                    }).catch((err) => console.error("Failed to fetch invoice details", err));

                    // Check if latest
                    fetchInvoiceCollections({
                        page: 1,
                        page_size: 1,
                        filters: { invoice: data.invoice }
                    }).then((res) => {
                        if (res.data.length > 0) {
                            setIsLatest(res.data[0].name === data.name);
                        }
                    });
                })
                .catch((error) => {
                    console.error('Failed to fetch collection:', error);
                    setSnackbar({ open: true, message: 'Failed to load collection details', severity: 'error' });
                })
                .finally(() => setFetching(false));
        }
    }, [id]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!collection) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Invoice Collection not found</Typography>
                <Button onClick={handleGoBack} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const {
        invoice,
        customer,
        customer_name,
        collection_date,
        amount_to_pay,
        amount_collected,
        amount_pending,
        mode_of_payment,
        remarks,
    } = collection;

    const handleDelete = async () => {
        if (!id) return;
        try {
            setDeleting(true);
            await deleteInvoiceCollection(id);
            setSnackbar({ open: true, message: 'Collection deleted successfully', severity: 'success' });
            setTimeout(() => handleGoBack(), 1500);
        } catch (error) {
            console.error('Failed to delete collection:', error);
            setSnackbar({ open: true, message: 'Failed to delete collection', severity: 'error' });
        } finally {
            setDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">Invoice Collection: {id}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleGoBack}
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
                    {isLatest && canDeleteCollection && (
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
                    {isLatest && canEditCollection && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => router.push(`/invoice-collections/${encodeURIComponent(id || '')}/edit`)}
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
                            Edit Collection
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
                        {/* Invoice Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdListBox size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Invoice Details</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdListBox size={14} style={{ color: '#919EAB' }} />
                                    <Typography variant="caption" color="text.disabled">Invoice Number</Typography>
                                </Stack>
                                <Typography variant="subtitle1" color="primary.main" sx={{ mt: 0.5 }}>{invoice}</Typography>
                                {invoiceDetails && (
                                    <>
                                        <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <IoMdCash size={14} style={{ color: '#919EAB' }} />
                                            <Typography variant="caption" color="text.disabled">Grand Total</Typography>
                                        </Stack>
                                        <Typography variant="subtitle1" sx={{ mt: 0.5 }}>{renderCurrency(invoiceDetails.grand_total || 0, '18px')}</Typography>
                                    </>
                                )}
                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdCash size={14} style={{ color: '#919EAB' }} />
                                    <Typography variant="caption" color="text.disabled">Amount to Pay</Typography>
                                </Stack>
                                <Typography variant="h6" sx={{ mt: 0.5 }}>{renderCurrency(amount_to_pay, '18px')}</Typography>
                            </Box>
                        </Stack>

                        {/* Customer Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdPerson size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer Details</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdListBox size={14} style={{ color: '#919EAB' }} />
                                    <Typography variant="caption" color="text.disabled">Customer ID</Typography>
                                </Stack>
                                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>{customer}</Typography>
                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdPerson size={14} style={{ color: '#919EAB' }} />
                                    <Typography variant="caption" color="text.disabled">Name</Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>{customer_name || '-'}</Typography>
                            </Box>
                        </Stack>

                        {/* Collection Details Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdCalendar size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Collection Info</Typography>
                            </Stack>
                            <Stack spacing={2} sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <IoMdCalendar size={14} style={{ color: '#919EAB' }} />
                                        <Typography variant="caption" color="text.disabled">Collection Date</Typography>
                                    </Stack>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{collection_date}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <IoMdListBox size={14} style={{ color: '#919EAB' }} />
                                        <Typography variant="caption" color="text.disabled">Payment Mode</Typography>
                                    </Stack>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{mode_of_payment}</Typography>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Payment Summary */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, color: 'text.secondary' }}>
                            <IoMdCash size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Summary</Typography>
                        </Stack>
                        <Stack spacing={2} sx={{ p: 3, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <IoMdListBox size={18} style={{ color: '#7e7e7e' }} />
                                    <Typography variant="body2" color="text.secondary">Amount to Pay</Typography>
                                </Stack>
                                <Typography variant="subtitle2">{renderCurrency(amount_to_pay)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <IoMdCash size={20} style={{ color: '#02c281' }} />
                                    <Typography variant="body2" color="text.secondary">Amount Collected</Typography>
                                </Stack>
                                <Typography variant="subtitle2" color="success.main">{renderCurrency(amount_collected)}</Typography>
                            </Stack>
                            <Divider sx={{ borderStyle: 'dashed' }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    {(amount_pending || 0) > 0 ? (
                                        <IoMdAlert size={24} style={{ color: '#FF5630' }} />
                                    ) : (
                                        <IoMdCheckmarkCircle size={24} style={{ color: '#02c281' }} />
                                    )}
                                    <Typography variant="subtitle1" sx={{ color: (amount_pending || 0) > 0 ? 'error.main' : 'success.main' }}>Amount Pending</Typography>
                                </Stack>
                                <Typography variant="h5" color={(amount_pending || 0) > 0 ? "error.main" : "success.main"}>{renderCurrency(amount_pending, '20px')}</Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Remarks Section */}
                    {remarks && (
                        <Stack spacing={1}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdNotes size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Remarks</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                whiteSpace: 'pre-wrap',
                                minHeight: 80,
                                color: 'text.secondary'
                            }}>
                                {remarks}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    sx={{
                        width: '100%',
                        boxShadow: (theme) => theme.customShadows.z20
                    }}
                >
                    <AlertTitle>{snackbar.severity === 'success' ? 'Success' : 'Error'}</AlertTitle>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => !deleting && setConfirmDeleteOpen(false)}
                title="Confirm Delete"
                content="Are you sure you want to delete this invoice collection?"
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
        </DashboardContent>
    );
}
