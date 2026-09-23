import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
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

import { DashboardContent } from 'src/layouts/dashboard';
import { getPurchase, deletePurchase, getPurchasePrintUrl, getDoctypeList } from 'src/api/purchase';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export function PurchaseDetailsView() {
    const { id } = useParams();
    const router = useRouter();
    const navigate = useNavigate();
    const location = useLocation();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.purchase;
    const canEditPurchase = hasCustomPerms ? !!user?.permissions?.actions?.purchase?.edit : true;
    const canDeletePurchase = hasCustomPerms ? !!user?.permissions?.actions?.purchase?.delete : true;
    const canCreateCollection = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.purchase_collection ? !!user?.permissions?.actions?.purchase_collection?.create : true;

    const [purchase, setPurchase] = useState<any>(null);
    const [contactDetails, setContactDetails] = useState<any>(null);
    const [itemNames, setItemNames] = useState<Record<string, string>>({});
    const [fetching, setFetching] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    useEffect(() => {
        if (id) {
            getPurchase(id)
                .then(setPurchase)
                .catch((err) => console.error('Failed to fetch purchase details:', err))
                .finally(() => setFetching(false));
        }
    }, [id]);

    useEffect(() => {
        if (purchase?.vendor_id || purchase?.vendor || purchase?.vendor_name) {
            const vid = purchase.vendor_id || purchase.vendor || purchase.vendor_name;
            getDoctypeList('Contacts', ['name', 'first_name', 'company_name'])
                .then((contacts) => {
                    const found = contacts.find((c: any) => c.name === vid);
                    if (found) setContactDetails(found);
                })
                .catch(err => console.error('Failed to fetch contact details', err));
        }
    }, [purchase]);

    useEffect(() => {
        const services = Array.from(new Set((purchase?.table_qecz || [])
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
    }, [purchase?.table_qecz]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!purchase) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Purchase not found</Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const {
        vendor_id,
        vendor,
        vendor_name,
        bill_date,
        bill_no,
        payment_type,
        payment_terms,
        due_date,
        description,
        attach,
        overall_discount_type,
        overall_discount,
        total_amount,
        grand_total,
        paid_amount,
        balance_amount,
        table_qecz = [],
    } = purchase;

    let parsedAttachments: { name: string; url: string }[] = [];
    if (attach) {
        try {
            const parsed = JSON.parse(attach);
            if (Array.isArray(parsed)) {
                parsedAttachments = parsed;
            } else {
                parsedAttachments = [{ name: attach.split('/').pop() || 'Attachment', url: attach }];
            }
        } catch {
            parsedAttachments = [{ name: attach.split('/').pop() || 'Attachment', url: attach }];
        }
    }

    const totalTax = table_qecz.reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0);
    const subTotal = total_amount + totalTax;
    const discountAmount = overall_discount_type === 'Flat' ? overall_discount : (subTotal * overall_discount) / 100;

    const parts = (vendor_name || '').split(' - ');
    const fallbackCompanyName = parts.length > 1 ? parts[1] : parts[0];
    const fallbackContactName = parts.length > 1 ? parts[0] : '';

    const companyName = contactDetails?.company_name || fallbackCompanyName;
    const contactName = contactDetails?.first_name || fallbackContactName;
    const displayId = vendor_id || vendor || contactDetails?.name || fallbackCompanyName;


    const handleDelete = async () => {
        if (!id) return;
        try {
            setDeleting(true);
            await deletePurchase(id);
            router.push('/purchase');
        } catch (error) {
            console.error('Failed to delete purchase:', error);
        } finally {
            setDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3} className="no-print">
                <Typography variant="h4">Purchase: {id}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                            if (location.state?.from) {
                                navigate(location.state.from, { state: location.state });
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
                    {paid_amount === 0 && canDeletePurchase && (
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
                    {paid_amount === 0 && canEditPurchase &&(
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => router.push(`/purchase/edit/${encodeURIComponent(id || '')}`)}
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
                            Edit Purchase
                        </Button>
                    )}
                    {(balance_amount || 0) >= 0 && canCreateCollection && (
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/purchase-collections/new?purchase=${encodeURIComponent(id || '')}`)}
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
                            Create Settlement
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
                        {/* Vendor Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdPerson size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Vendor Details</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack spacing={0.5}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {companyName || '-'}
                                    </Typography>
                                    {contactName && (
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {contactName}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, pt: 0.5 }}>
                                        ID: {displayId}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>

                        {/* Document Logistics Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdCalendar size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Doc Logistics</Typography>
                            </Stack>
                            <Stack spacing={2} sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.disabled">Bill Date</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{bill_date}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.disabled">Bill No</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{bill_no || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.disabled">Due Date</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', color: 'error.main' }}>{due_date || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.disabled">Payment Type</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{payment_type || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.disabled">Payment Terms</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{payment_terms || '-'}</Typography>
                                </Stack>
                            </Stack>
                        </Stack>

                        {/* Summary Stats Section */}
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdCash size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Financial Status</Typography>
                            </Stack>
                            <Stack spacing={2} sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha((balance_amount || 0) > 0 ? theme.palette.error.main : theme.palette.success.main, 0.04), border: (theme) => `1px solid ${alpha((balance_amount || 0) > 0 ? theme.palette.error.main : theme.palette.success.main, 0.12)}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <IoMdWallet size={18} style={{ color: '#059669' }} />
                                        <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                                    </Stack>
                                    <Typography variant="subtitle1" color="primary.main">{renderCurrency(grand_total, '18px')}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        {(balance_amount || 0) > 0 ? (
                                            <IoMdAlert size={18} style={{ color: '#FF5630' }} />
                                        ) : (
                                            <IoMdCheckmarkCircle size={18} style={{ color: '#02c281' }} />
                                        )}
                                        <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                                    </Stack>
                                    <Typography variant="h6" color={(balance_amount || 0) > 0 ? "error.main" : "success.main"}>{renderCurrency(balance_amount, '18px')}</Typography>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Table Section */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, color: 'text.secondary' }}>
                            <IoMdList size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Purchase Items</Typography>
                        </Stack>
                        <TableContainer sx={{
                            overflow: 'unset',
                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                            borderRadius: 1.5,
                        }}>
                            <Table sx={{ minWidth: 800 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04) }}>
                                        <TableCell sx={{ fontWeight: 'fontWeightBold', py: 2 }}>Item</TableCell>
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
                        {/* Description & Attachments Group */}
                        <Stack spacing={3}>
                            {description && (
                                <Stack spacing={1}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Typography>
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
                                                <IoMdLink size={18} style={{ marginRight: 8, color: '#059669' }} />
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
                                    <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>Grand Total</Typography>
                                </Stack>
                                <Typography variant="h6">{renderCurrency(grand_total, '20px')}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <IoMdCash size={20} style={{ color: '#02c281' }} />
                                    <Typography variant="body2" color="text.secondary">Paid Amount</Typography>
                                </Stack>
                                <Typography variant="subtitle2" color="success.main">{renderCurrency(paid_amount)}</Typography>
                            </Stack>
                            <Divider sx={{ borderStyle: 'dashed' }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    {(balance_amount || 0) > 0 ? (
                                        <IoMdAlert size={24} style={{ color: '#FF5630' }} />
                                    ) : (
                                        <IoMdCheckmarkCircle size={24} style={{ color: '#02c281' }} />
                                    )}
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
                content="Are you sure you want to delete this purchase?"
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
        </DashboardContent >
    );
}