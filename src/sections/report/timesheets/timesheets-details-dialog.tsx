import { FaUser } from "react-icons/fa6";
import { useState, useEffect } from 'react';
import { LuHistory, LuCalendar } from 'react-icons/lu';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { fDate } from 'src/utils/format-time';

import { getEmployee } from 'src/api/employees';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    timesheet: any;
};

export function TimesheetDetailsDialog({ open, onClose, timesheet }: Props) {
    const theme = useTheme();
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [localTimesheet, setLocalTimesheet] = useState<any>(null);

    useEffect(() => {
        if (open && timesheet) {
            setLocalTimesheet(timesheet);
        }
    }, [open, timesheet]);

    useEffect(() => {
        if (open && localTimesheet?.employee) {
            getEmployee(localTimesheet.employee)
                .then((emp) => {
                    if (emp && emp.profile_picture) {
                        setProfilePicture(emp.profile_picture);
                    } else {
                        setProfilePicture(undefined);
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch employee details for avatar:', err);
                    setProfilePicture(undefined);
                });
        }
    }, [open, localTimesheet?.employee]);

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="md" 
            TransitionProps={{ 
                onExited: () => {
                    setProfilePicture(undefined);
                    setLocalTimesheet(null);
                } 
            }}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Timesheet Details</Typography>
                <IconButton onClick={onClose} sx={{ color: theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 4 }}>
                {localTimesheet ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Header Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                            <Avatar
                                src={profilePicture}
                                sx={{
                                    width: 76,
                                    height: 76,
                                    borderRadius: '50%',
                                    border: `3px solid ${theme.palette.common.white}`,
                                    boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.12)}`,
                                    bgcolor: profilePicture 
                                        ? 'transparent' 
                                        : (() => {
                                            const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                            let hash = 0;
                                            const name = localTimesheet.employee_name || '';
                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                            return colors[Math.abs(hash) % colors.length];
                                        })(),
                                    color: alpha(theme.palette.common.black, 0.65),
                                    fontSize: '1.5rem',
                                    fontWeight: 900,
                                }}
                            >
                                {localTimesheet.employee_name?.charAt(0) || 'U'}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                    {localTimesheet.employee_name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '12px' }}>
                                    ID: {localTimesheet.employee}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                    {localTimesheet.total_hours || 0} hrs
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                                    ID: {localTimesheet.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Timesheet Information Section */}
                        <Box>
                            <SectionHeader title="Timesheet Information" icon="" />
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2.5,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                }}
                            >
                                <DetailCard label="Employee" value={localTimesheet.employee_name} icon={<FaUser size={20} />} />
                                <DetailCard
                                    label="Date"
                                    value={localTimesheet.timesheet_date ? fDate(localTimesheet.timesheet_date, 'DD-MM-YYYY') : '-'}
                                    icon={<LuCalendar size={20} />}
                                />
                                <DetailCard
                                    label="Total Hours"
                                    value={`${localTimesheet.total_hours || 0} hours`}
                                    icon={<LuHistory size={20} />}
                                />
                            </Box>
                        </Box>

                        {/* Notes Section */}
                        {localTimesheet.notes && (
                            <Box>
                                <SectionHeader title="Notes" icon="" />
                                <Box
                                    sx={{
                                        p: 3,
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        borderRadius: 2,
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                        {localTimesheet.notes}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Timesheet Entries Section */}
                        {localTimesheet.timesheet_entries && localTimesheet.timesheet_entries.length > 0 && (
                            <Box>
                                <SectionHeader title="Timesheet Entries" icon="" />
                                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <Box component="thead" sx={{ bgcolor: 'background.neutral' }}>
                                                <Box component="tr">
                                                    <Box component="th" sx={{ p: 2, textAlign: 'left', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', fontSize: '0.875rem' }}>
                                                        Project
                                                    </Box>
                                                    <Box component="th" sx={{ p: 2, textAlign: 'left', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', fontSize: '0.875rem' }}>
                                                        Activity Type
                                                    </Box>
                                                    <Box component="th" sx={{ p: 2, textAlign: 'left', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', fontSize: '0.875rem' }}>
                                                        Hours
                                                    </Box>
                                                    <Box component="th" sx={{ p: 2, textAlign: 'left', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', fontSize: '0.875rem' }}>
                                                        Description
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box component="tbody">
                                                {localTimesheet.timesheet_entries.map((entry: any, index: number) => (
                                                    <Box component="tr" key={index} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {entry.project}
                                                            </Typography>
                                                        </Box>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                            <Typography variant="body2">
                                                                {entry.activity_type}
                                                            </Typography>
                                                        </Box>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                                {entry.hours} hrs
                                                            </Typography>
                                                        </Box>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                                {entry.description || '-'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold-duotone" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Timesheet Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({ title, icon }: { title: string; icon?: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            {icon && (
                <Box sx={{ display: 'flex', p: 0.75, borderRadius: 1, bgcolor: 'primary.main', color: 'common.white' }}>
                    <Iconify icon={icon as any} width={14} />
                </Box>
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontSize: 12 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailCard({ label, value, icon, highlight = false }: { label: string; value?: string | null; icon: React.ReactNode; highlight?: boolean }) {
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => highlight ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.info.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
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
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.12),
                    color: 'info.main',
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
