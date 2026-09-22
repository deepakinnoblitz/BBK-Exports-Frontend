import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    interview: any;
};

export function InterviewDetailsDialog({ open, onClose, interview }: Props) {
    const [tab, setTab] = useState(0);

    if (!interview) return null;

    // ── helpers ────────────────────────────────────────────────────────────

    const statusColor = (status: string): 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' => {
        switch (status) {
            case 'Selected':
            case 'Completed': return 'success';
            case 'Rejected':
            case 'Cancelled':
            case 'No-Show': return 'error';
            case 'On Hold':
            case 'Rescheduled': return 'warning';
            case 'Scheduled':
            case 'In Progress': return 'info';
            default: return 'primary';
        }
    };

    const fmt = (val: any) => (val != null && val !== '') ? String(val) : '—';

    /** Read-only block that displays details as text instead of an input field with an icon */
    const readField = (
        label: string,
        value: any,
        icon?: string,
        opts?: { colSpan?: boolean; multiline?: boolean; rows?: number }
    ) => (
        <Stack
            direction="row"
            spacing={2}
            alignItems={opts?.multiline ? 'flex-start' : 'center'}
            sx={{
                width: 1,
                ...(opts?.colSpan && { gridColumn: 'span 2' })
            }}
        >
            {icon && (
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.25,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        ...(opts?.multiline && { mt: 0.5 })
                    }}
                >
                    <Iconify icon={icon as any} width={22} />
                </Box>
            )}
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                    {fmt(value)}
                </Typography>
            </Box>
        </Stack>
    );

    // ── Header card ────────────────────────────────────────────────────────

    const renderHeader = (
        <Box
            sx={{
                p: 2.5, mb: 2,
                bgcolor: 'background.neutral',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }} noWrap>
                    {interview.job_applicant}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {interview.job_applied && (
                        <Chip label={interview.job_applied} size="small" variant="outlined" />
                    )}
                    {interview.designation && (
                        <Chip label={interview.designation} size="small" variant="outlined" />
                    )}
                    {interview.email_id && (
                        <Typography variant="caption" color="text.secondary">
                            {interview.email_id}
                        </Typography>
                    )}
                </Stack>
            </Box>
            <Label
                variant="filled"
                color={statusColor(interview.overall_status)}
                sx={{ flexShrink: 0, height: 32, px: 2, borderRadius: 1 }}
            >
                {interview.overall_status}
            </Label>
        </Box>
    );

    // ── Tab 0 · Applicant Details ──────────────────────────────────────────

    const renderApplicantDetails = (
        <Stack spacing={3}>
            {/* Job info */}
            <Divider sx={{ borderStyle: 'dashed' }}>Job Applicant Details</Divider>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {readField('Job Applicant', interview.job_applicant, 'solar:user-bold')}
                {readField('Job Applied', interview.job_applied, 'solar:case-bold')}
                {readField('Designation', interview.designation, 'solar:user-id-bold')}
                {readField('Overall Status', interview.overall_status, 'solar:info-circle-bold')}
            </Box>

            {/* Contact */}
            <Divider sx={{ borderStyle: 'dashed' }}>Contact Information</Divider>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {readField('Email Address', interview.email_id, 'solar:letter-bold')}
                {readField('Phone Number', interview.phone_number, 'solar:phone-bold')}
                {readField('Country', interview.country, 'solar:global-bold')}
                {readField('State', interview.state, 'solar:map-point-bold')}
                {readField('City', interview.city, 'solar:city-bold')}
            </Box>

            {/* Notes */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr' }}>
                {readField('Notes', interview.notes, 'solar:notes-bold', { multiline: true, rows: 3 })}
            </Box>

            {/* Resume */}
            <Divider sx={{ borderStyle: 'dashed' }}>Resume</Divider>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {readField('Resume Link', interview.resume_link, 'solar:link-bold')}

                {/* Resume Attachment — styled consistent with other text details blocks */}
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: 1 }}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 1.25,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Iconify icon="solar:document-bold" width={22} />
                    </Box>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                            Resume Attachment
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {interview.resume_attachment ? (
                                <>
                                    <Typography variant="subtitle2" noWrap sx={{ flex: 1, fontWeight: 800 }}>
                                        {interview.resume_attachment.split('/').pop()}
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Iconify icon="solar:download-bold" width={14} />}
                                        href={interview.resume_attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        component="a"
                                        sx={{ flexShrink: 0 }}
                                    >
                                        Download
                                    </Button>
                                </>
                            ) : (
                                <Typography variant="body2" sx={{ color: 'text.disabled' }}>No file attached</Typography>
                            )}
                        </Box>
                    </Box>
                </Stack>

                {readField('Cover Letter', interview.cover_letter, 'solar:document-text-bold', { colSpan: true, multiline: true, rows: 3 })}
            </Box>

            {/* Salary */}
            <Divider sx={{ borderStyle: 'dashed' }}>Salary Expectation</Divider>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
                {readField('Currency', interview.currency, 'solar:dollar-bold')}
                {readField('Lower Range', interview.lower_range, 'solar:wad-of-money-bold')}
                {readField('Upper Range', interview.upper_range, 'solar:wad-of-money-bold')}
            </Box>
        </Stack>
    );

    // ── Tab 1 · Interview Details ──────────────────────────────────────────

    const renderInterviewDetails = (
        <Stack spacing={3}>
            {/* Schedule */}
            <Divider sx={{ borderStyle: 'dashed' }}>Schedule</Divider>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {readField('Scheduled On', interview.scheduled_on ? new Date(interview.scheduled_on).toLocaleDateString('en-GB') : '', 'solar:calendar-bold')}
                <Box />
                {readField('From Time', interview.from_time, 'solar:clock-circle-bold')}
                {readField('To Time', interview.to_time, 'solar:clock-circle-bold')}
            </Box>

            {/* Summary */}
            <Divider sx={{ borderStyle: 'dashed' }}>Interview Summary</Divider>
            {readField('Interview Summary', interview.interview_summary, 'solar:clipboard-bold', { multiline: true, rows: 5 })}
        </Stack>
    );

    // ── Tab 2 · Performance ───────────────────────────────────────────────

    const renderPerformance = (
        <Stack spacing={3}>
            {readField('Overall Performance', interview.overall_performance, 'solar:chart-bold', { multiline: true, rows: 3 })}

            <Divider sx={{ borderStyle: 'dashed' }}>Feedbacks</Divider>

            {interview.feedbacks?.length ? (
                interview.feedbacks.map((fb: any, index: number) => (
                    <Box
                        key={index}
                        sx={{
                            border: (theme) => `1px dashed ${theme.vars.palette.divider}`,
                            borderRadius: 1.5,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Card header */}
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                                px: 2, py: 1,
                                bgcolor: 'background.neutral',
                                borderBottom: (t) => `1px dashed ${t.vars.palette.divider}`,
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                Feedback #{index + 1}
                            </Typography>
                            <Rating value={fb.rating != null ? (Number(fb.rating) <= 1 && Number(fb.rating) > 0 ? Math.round(Number(fb.rating) * 5) : Number(fb.rating)) : 0} readOnly size="small" />
                        </Stack>

                        {/* Card body */}
                        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, p: 2 }}>
                            {readField('Interview Type', fb.interview_type, 'solar:dialog-bold')}
                            {readField('Interviewer', fb.interviewer, 'solar:user-bold')}
                            {readField('Notes', fb.notes, 'solar:notes-bold', { colSpan: true, multiline: true, rows: 2 })}
                        </Box>
                    </Box>
                ))
            ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                    <Iconify icon={"solar:document-bold" as any} width={40} sx={{ mb: 1, opacity: 0.4 }} />
                    <Typography variant="body2">No feedback recorded yet.</Typography>
                </Box>
            )}
        </Stack>
    );

    // ── Render ────────────────────────────────────────────────────────────

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
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Interview Details</Typography>
                <IconButton onClick={onClose} sx={{ color: 'text.disabled' }}>
                    <Iconify icon="mingcute:close-line" width={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, flexGrow: 1, overflowY: 'auto' }}>
                <Box sx={{ px: 3 }}>
                    <Tabs
                        value={tab}
                        onChange={(_, val) => setTab(val)}
                        sx={{
                            mb: 3,
                            borderBottom: (t) => `1px solid ${t.vars.palette.divider}`,
                        }}
                    >
                        <Tab label="Applicant Details" />
                        <Tab label="Interview Details" />
                        <Tab label="Performance" />
                    </Tabs>
                </Box>

                <Box sx={{ px: { xs: 3, sm: 5 }, pb: 5 }}>
                    {tab === 0 && renderApplicantDetails}
                    {tab === 1 && renderInterviewDetails}
                    {tab === 2 && renderPerformance}
                </Box>
            </DialogContent>
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

function DetailItem({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Iconify icon={icon as any} width={20} sx={{ color: 'text.disabled', mt: 0.2 }} />
            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {value}
                </Typography>
            </Box>
        </Stack>
    );
}
