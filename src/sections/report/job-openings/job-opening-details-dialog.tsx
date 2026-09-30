import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onRefer?: (jobName: string) => void;
    job: any;
};

export function JobOpeningDetailsDialog({ open, onClose, onRefer, job }: Props) {
    const theme = useTheme();

    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.employee_referral_list;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canCreateReferral = hasCustomPerms ? !!actionPerms?.create : true;


    if (!job) return null;

    const formatDate = (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
    };

    const renderHeader = (

        <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, my: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2}>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, fontSize: { xs: '18px', sm: '22px' }, wordBreak: 'break-word' }}>
                        {job.job_title}
                    </Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 0.5, sm: 1 }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        {job.designation && (
                            <Typography variant="subtitle2" color="text.secondary">
                                {job.designation}
                            </Typography>
                        )}
                        {job.designation && job.location && (
                            <Divider
                                orientation="vertical"
                                flexItem
                                sx={{
                                    height: 12,
                                    my: 'auto',
                                    display: { xs: 'none', sm: 'block' }
                                }}
                            />
                        )}
                        {job.location && (
                            <Typography variant="subtitle2" color="text.secondary">
                                {job.location}
                            </Typography>
                        )}
                    </Stack>
                </Box>
                <Label
                    variant="soft"
                    color={(job.status === 'Open' && 'success') || (job.status === 'Closed' && 'error') || 'default'}
                    sx={{ height: 32, px: 2, borderRadius: 1, alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}
                >
                    {job.status}
                </Label>
            </Stack>
        </Box>
    );

    const renderDetails = (
        <Box
            sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                mb: 4,
                ml: 2,
            }}
        >
            <DetailItem icon="solar:calendar-date-bold" label="Posted On" value={formatDate(job.posted_on)} />
            <DetailItem icon="solar:calendar-add-bold" label="Closes On" value={formatDate(job.closes_on)} />
            <DetailItem icon="solar:clock-circle-bold" label="Shift" value={job.shift} />
            <DetailItem icon="solar:ranking-bold" label="Experience" value={job.experience} />
            <DetailItem
                icon="solar:wad-of-money-bold"
                label="Salary Range"
                value={job.lower_range ? `₹${job.lower_range} - ₹${job.upper_range} per ${job.salary_per}` : 'Not Disclosed'}
            />
            <DetailItem icon="solar:settings-bold" label="Skills Required" value={job.skills_required || '-'} />
        </Box>
    );

    const renderDescription = (
        <Stack spacing={3} sx={{ mt: 2, mb: 5, ml: 2 }}>
            <Box>
                <SectionHeader title="Small Description" icon="" />
                <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="body2">
                        {job.small_description || 'No small description provided.'}
                    </Typography>
                </Box>
            </Box>

            <Box>
                <SectionHeader title="Job Description" icon="" />
                <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="body2">
                        {job.description || 'No description provided.'}
                    </Typography>
                </Box>
            </Box>
        </Stack>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (themeVar) => themeVar.customShadows.z24,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                    Job Opening Details
                </Typography>
                <IconButton onClick={onClose} sx={{ color: theme.palette.grey[500] }}>
                    <Iconify icon={"mingcute:close-line" as any} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, flexGrow: 1, overflowY: 'auto' }}>
                {renderHeader}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2.5,
                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                        mb: 4,
                        ml: 2
                    }}
                >
                    <DetailItem icon="solar:calendar-date-bold" label="Posted On" value={formatDate(job.posted_on)} />
                    <DetailItem icon="solar:calendar-add-bold" label="Closes On" value={formatDate(job.closes_on)} />
                    <DetailItem icon="solar:clock-circle-bold" label="Shift" value={job.shift} />
                    <DetailItem icon="solar:ranking-bold" label="Experience" value={job.experience} />
                    <DetailItem
                        icon="solar:wad-of-money-bold"
                        label="Salary Range"
                        value={
                            job.lower_range ? (
                                <>
                                    <Box component="span" sx={{ fontFamily: 'Arial' }}>₹</Box>
                                    {job.lower_range} - <Box component="span" sx={{ fontFamily: 'Arial' }}>₹</Box>{job.upper_range} per {job.salary_per}
                                </>
                            ) : (
                                'Not Disclosed'
                            )
                        }
                    />
                    <DetailItem icon="solar:settings-bold" label="Skills Required" value={job.skills_required || '-'} />
                </Box>
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderDescription}
            </DialogContent>

            {onRefer && canCreateReferral && (
                <DialogActions sx={{ p: 1.5 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={<Iconify icon={"solar:user-plus-bold" as any} />}
                        onClick={() => {
                            onRefer(job.name);
                            onClose();
                        }}
                        sx={{
                            bgcolor: COMMON_COLORS.primaryButton.bg,
                            color: COMMON_COLORS.primaryButton.color,
                            '&:hover': {
                                bgcolor: COMMON_COLORS.primaryButton.hoverBg,
                            },
                        }}
                    >
                        Refer a Friend for this Position
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({ title, icon }: { title: string; icon: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Iconify icon={icon as any} width={24} sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <Box
                sx={{
                    p: 1.3,
                    mr: 2,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: COMMON_COLORS.emerald.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Iconify icon={icon as any} width={18} />
            </Box>
            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}

