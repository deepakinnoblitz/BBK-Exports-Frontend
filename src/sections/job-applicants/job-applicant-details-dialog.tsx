import { AiOutlineDownload } from "react-icons/ai";

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';


// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    applicant: any;
};

// ── Status config ──
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
    'Accepted': { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
    'Rejected': { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    'Hold': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    'Open': { color: '#0ea5e9', bg: '#e0f2fe', border: '#bae6fd' },
    'Received': { color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
    'Replied': { color: '#6366f1', bg: '#eef2ff', border: '#e0e7ff' },
};

function StatusLabel({ status }: { status: string }) {
    const conf = STATUS_CONFIG[status] || { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.75,
                py: 0.75,
                borderRadius: 1.5,
                bgcolor: conf.bg,
                border: `1px solid ${conf.border}`
            }}
        >
            <Typography variant="caption" sx={{ fontWeight: 800, color: conf.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {status}
            </Typography>
        </Box>
    );
}

function DetailItem({ icon, iconColor, label, value, isLink, href }: { icon: string; iconColor: string; label: string; value: React.ReactNode; isLink?: boolean; href?: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: `${iconColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Iconify icon={icon as any} width={22} sx={{ color: iconColor }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>{label}</Typography>
                {isLink && typeof value === 'string' ? (
                    <Link href={href} color="primary" variant="body2" sx={{ fontWeight: 800, mt: 0.1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                        {value}
                    </Link>
                ) : (
                    <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.1 }}>{value}</Typography>
                )}
            </Box>
        </Stack>
    );
}

export function JobApplicantDetailsDialog({ open, onClose, applicant }: Props) {
    if (!applicant) return null;

    const renderHeader = (
        <Box
            sx={{
                p: 3,
                bgcolor: '#f8fafb',
                borderRadius: 3,
                border: '1px solid',
                borderColor: '#ebedf0',
                my: 2,
                mb: 4
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#1c252e' }}>
                        {applicant.applicant_name}
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Iconify icon={"solar:briefcase-bold" as any} width={16} sx={{ color: 'primary.main', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                {applicant.job_title || 'No Job Assigned'}
                            </Typography>
                        </Stack>

                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />

                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Iconify icon="solar:user-id-bold" width={16} sx={{ color: 'primary.main', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                {applicant.designation || 'No Designation'}
                            </Typography>
                        </Stack>

                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />

                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Iconify icon="solar:map-point-bold" width={16} sx={{ color: 'primary.main', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                {applicant.city || applicant.state || applicant.country || 'Location N/A'}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>
                <StatusLabel status={applicant.status} />
            </Stack>
        </Box>
    );

    const renderDetails = (
        <Box
            sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                mb: 4,
                px: 1,
            }}
        >
            <DetailItem icon="solar:letter-bold" iconColor="#059669" label="Email" value={applicant.email_id} />
            <DetailItem icon="solar:phone-bold" iconColor="#059669" label="Phone" value={applicant.phone_number || '-'} />
            <DetailItem icon="solar:share-bold" iconColor="#059669" label="Source" value={applicant.source || '-'} />
            <DetailItem
                icon="solar:wad-of-money-bold"
                iconColor="#059669"
                label="Expected Salary"
                value={
                    applicant.lower_range ? (
                        <>
                            <Box component="span" sx={{ fontFamily: 'Arial' }}>
                                {applicant.currency || '₹'}
                            </Box>{' '}
                            {applicant.lower_range} - {applicant.upper_range}
                        </>
                    ) : (
                        'Not Disclosed'
                    )
                }
            />
        </Box>
    );

    const renderResume = (
        <Box sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '16px', pl:1 }}>
                    Application Details
                </Typography>
            </Stack>

            <Box sx={{ display: 'grid', gap: 3.5, px: 1 }}>
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                        Cover Letter
                    </Typography>
                    <Box sx={{ p: 2.5, bgcolor: '#f4f6f8', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                            {applicant.cover_letter || 'No cover letter provided.'}
                        </Typography>
                    </Box>
                </Box>

                {(applicant.resume_attachment || applicant.resume_link) && (
                    <Box>
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                            Resume / Portfolio
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            {applicant.resume_attachment && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    startIcon={<AiOutlineDownload size={20}/>}
                                    href={applicant.resume_attachment}
                                    target="_blank"
                                    sx={{ borderRadius: 1.5, fontWeight: 800, p: 1 }}
                                >
                                    Download Resume
                                </Button>
                            )}
                            {applicant.resume_link && (
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    startIcon={<Iconify icon={"solar:link-bold" as any} />}
                                    href={applicant.resume_link}
                                    target="_blank"
                                    sx={{ borderRadius: 1.5, fontWeight: 800, px: 3 }}
                                >
                                    View Portfolio
                                </Button>
                            )}
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
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
                    boxShadow: (theme) => theme.customShadows.z24,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Job Applicant Details</Typography>
                <IconButton onClick={onClose} sx={{ color: 'text.disabled' }}>
                    <Iconify icon="mingcute:close-line" width={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto', mx: 1, my: 2 }}>
                {renderHeader}
                {renderDetails}
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderResume}
            </DialogContent>
        </Dialog>
    );
}
