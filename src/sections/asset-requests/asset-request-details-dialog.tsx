import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { MdOutlineDescription } from 'react-icons/md';
import { FaLaptop, FaBarcode, FaRegCalendarAlt, FaExclamationCircle } from 'react-icons/fa';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { getEmployee } from 'src/api/employees';
import { getAssetRequest } from 'src/api/asset-requests';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
    Draft: 'default',
    'Pending Approval': 'warning',
    Approved: 'success',
    Rejected: 'error',
    Completed: 'info',
};

const PRIORITY_COLORS: Record<string, 'default' | 'warning' | 'error' | 'info'> = {
    Low: 'info',
    Medium: 'warning',
    High: 'error',
};

type Props = {
    open: boolean;
    onClose: () => void;
    requestName: string | null;
    isHR: boolean;
    canEdit?: boolean;
    onApprove?: (request: any) => void;
    onReject?: (request: any) => void;
};

export function AssetRequestDetailsDialog({ open, onClose, requestName, isHR, canEdit = true, onApprove, onReject }: Props) {
    const theme = useTheme();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && requestName) {
            setLoading(true);
            setError(null);
            getAssetRequest(requestName)
                .then(async (data) => {
                    if (data && data.employee) {
                        try {
                            const emp = await getEmployee(data.employee);
                            if (emp && emp.profile_picture) {
                                data.profile_picture = emp.profile_picture;
                            }
                        } catch (err) {
                            console.error('Failed to fetch employee details for avatar:', err);
                        }
                    }
                    setRequest(data);
                })
                .catch((err) => {
                    console.error('Failed to fetch Asset Request:', err);
                    setError('Failed to load request details.');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [open, requestName]);

    const handleApproveAction = () => {
        if (onApprove && request) {
            onApprove(request);
            onClose();
        }
    };

    const handleRejectAction = () => {
        if (onReject && request) {
            onReject(request);
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            TransitionProps={{ onExited: () => setRequest(null) }}
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (t) => t.customShadows?.z24 || '0 24px 48px 0 rgba(0,0,0,0.16)',
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Asset Request Details</Typography>
                <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                    <Iconify icon={"mingcute:close-line" as any} />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 4 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : error ? (
                    <Box sx={{ py: 6, textTransform: 'none', textAlign: 'center' }}>
                        <Iconify icon={"solar:danger-bold-duotone" as any} width={56} sx={{ color: 'error.main', mb: 2 }} />
                        <Typography variant="subtitle1" color="text.secondary" fontWeight={700}>
                            {error}
                        </Typography>
                    </Box>
                ) : request ? (
                    <Stack spacing={4}>
                        {/* Header Employee Info */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                <Avatar
                                    src={request.profile_picture}
                                    sx={{
                                        width: 86,
                                        height: 86,
                                        borderRadius: '50%',
                                        border: `2px solid ${theme.palette.common.white}`,
                                        boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.12)}`,
                                        bgcolor: () => {
                                            const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                            let hash = 0;
                                            const name = request.employee_name || '';
                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                            return colors[Math.abs(hash) % colors.length];
                                        },
                                        color: alpha(theme.palette.common.black, 0.65),
                                        fontSize: '1.75rem',
                                        fontWeight: 900,
                                    }}
                                >
                                    {request.employee_name?.charAt(0) || 'U'}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                                        {request.employee_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '12px', mt: 0.5 }}>
                                        ID: {request.employee}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
                                <Label variant="soft" color={STATUS_COLORS[request.status] || 'default'} sx={{ textTransform: 'uppercase', fontWeight: 800, px: 1.5, py: 0.5, fontSize: 11 }}>
                                    {request.status}
                                </Label>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                    ID: {request.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Request Overview Grid */}
                        <Box>
                            <SectionHeader title="Request Overview" />
                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                                    <DetailCard label="Request Type" value={request.request_type} icon={<MdOutlineDescription size={18} />} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                                    <DetailCard label="Asset Category" value={request.asset_category || '-'} icon={<FaLaptop size={18} />} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                                    <DetailCard label="Priority" value={request.priority} icon={<FaExclamationCircle size={18} />} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                                    <DetailCard label="Date Created" value={request.creation ? dayjs(request.creation).format('DD MMM YYYY · HH:mm') : '-'} icon={<FaRegCalendarAlt size={18} />} />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Conditional Details based on type */}
                        <Box>
                            <SectionHeader title="Asset Details" />
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                                {request.request_type === 'Declaration' ? (
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Asset Name"
                                                value={request.asset_name}
                                                icon={<FaLaptop size={18} />}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Asset Tag / Serial Number"
                                                value={request.asset_tag}
                                                icon={<FaBarcode size={18} />}
                                            />
                                        </Grid>
                                    </Grid>
                                ) : request.request_type === 'Return Request' ? (
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Asset to Return"
                                                value={request.asset || request.asset_name}
                                                icon={<FaLaptop size={18} />}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Return Date"
                                                value={request.return_date ? dayjs(request.return_date).format('DD MMM YYYY') : '-'}
                                                icon={<FaRegCalendarAlt size={18} />}
                                            />
                                        </Grid>
                                        {request.return_attachment && (
                                            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>                                                 <Button
                                                variant="outlined"
                                                color="primary"
                                                size="medium"
                                                startIcon={<Iconify icon={"solar:document-bold-duotone" as any} />}
                                                href={request.return_attachment}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 800,
                                                    borderRadius: 1.5,
                                                    px: 2.5,
                                                    py: 1,
                                                }}
                                            >
                                                View / Download Attachment
                                            </Button>
                                            </Grid>
                                        )}
                                    </Grid>
                                ) : (
                                    // New Request
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Requested Item"
                                                value={request.asset_category}
                                                icon={<FaLaptop size={18} />}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Assigned Asset Tag"
                                                value={
                                                    request.assigned_asset ? (
                                                        <Box component="span" sx={{ color: 'success.main', fontWeight: 800 }}>
                                                            {request.assigned_asset}
                                                        </Box>
                                                    ) : (
                                                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                            Not yet assigned
                                                        </Box>
                                                    )
                                                }
                                                icon={<FaBarcode size={18} />}
                                            />
                                        </Grid>
                                    </Grid>
                                )}
                            </Card>
                        </Box>

                        {/* Purpose / Description */}
                        <Box>
                            <SectionHeader title="Purpose / Description" />
                            <Box
                                sx={{
                                    p: 3,
                                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {request.purpose || 'No description provided.'}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Remarks if processed */}
                        {request.hr_remarks && (
                            <Box>
                                <SectionHeader title="Remarks" />
                                <Box
                                    sx={{
                                        p: 3,
                                        bgcolor: alpha(theme.palette.grey[500], 0.04),
                                        borderRadius: 2,
                                        border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                        {request.hr_remarks}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Stack>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold-duotone" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No details available</Typography>
                    </Box>
                )}
            </DialogContent>

            {isHR && request?.status === 'Pending Approval' && canEdit && (
                <DialogActions sx={{ px: 4, py: 3, bgcolor: alpha(theme.palette.grey[500], 0.04) }}>
                    <Stack direction="row" spacing={1.5} sx={{ width: 1 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="large"
                            startIcon={<Iconify icon={"mingcute:close-line" as any} />}
                            onClick={handleRejectAction}
                            sx={{ fontWeight: 800 }}
                        >
                            Reject
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<Iconify icon={"solar:check-circle-bold" as any} />}
                            onClick={handleApproveAction}
                            sx={{
                                fontWeight: 800,
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' },
                                boxShadow: `0 8px 16px 0 ${alpha(theme.palette.success.main, 0.24)}`,
                            }}
                        >
                            Approve
                        </Button>
                    </Stack>
                </DialogActions>
            )}
        </Dialog>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', fontSize: 12 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon }: { label: string; value?: React.ReactNode; icon: React.ReactNode }) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5, fontSize: 11 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}


function DetailCard({ label, value, icon, highlight = false }: { label: string; value?: string | null; icon: React.ReactNode; highlight?: boolean }) {
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => highlight ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.warning.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                    color: 'warning.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        display: 'block',
                        fontSize: 11,
                        mb: 0.2,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 900,
                        color: 'text.primary',
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
