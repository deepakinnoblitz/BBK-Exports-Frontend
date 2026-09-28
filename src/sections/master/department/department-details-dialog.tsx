import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getDoc } from 'src/api/leads';
import { getDepartment } from 'src/api/masters';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    departmentId: string | null;
};

export function DepartmentDetailsDialog({ open, onClose, departmentId }: Props) {
    const [department, setDepartment] = useState<any>(null);
    const [employeeName, setEmployeeName] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (open && departmentId) {
                try {
                    setLoading(true);
                    const doc = await getDepartment(departmentId);
                    setDepartment(doc);

                    if (doc.department_head) {
                        try {
                            const emp = await getDoc('Employee', doc.department_head);
                            setEmployeeName(emp.employee_name || '');
                        } catch (e) {
                            console.error('Failed to fetch employee name:', e);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch department details:', err);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchData();
    }, [open, departmentId]);

    const renderStatus = (status: string) => (
        <Label variant="soft" color={status === 'Active' ? 'success' : 'error'} sx={{ textTransform: 'uppercase', fontWeight: 800 }}>
            {status}
        </Label>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            TransitionProps={{ onExited: () => setDepartment(null) }}
        >
            <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.neutral' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Department Profile</Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500], bgcolor: 'background.paper', boxShadow: (theme) => theme.customShadows?.z1 }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : department ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {/* Header Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                                    color: 'white',
                                    flexShrink: 0,
                                    position: 'relative',
                                    boxShadow: (theme) => theme.customShadows?.z8 || theme.shadows[8],
                                }}
                            >
                                <Iconify icon={"solar:buildings-bold" as any} width={32} />
                            </Box>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>{department.department_name}</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Code: {department.department_code || 'N/A'}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                {renderStatus(department.status)}
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                                    ID: {department.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Department Overview */}
                        <Box>
                            <SectionHeader title="Department Overview" icon="" />
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 3,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                }}
                            >
                                <DetailItem label="Department Name" value={department.department_name} icon="solar:buildings-bold" />
                                <DetailItem label="Department Code" value={department.department_code} icon="solar:plain-2-bold" />
                                <DetailItem 
                                    label="Department Head" 
                                    value={
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                {employeeName || '-'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                {department.department_head}
                                            </Typography>
                                        </Box>
                                    } 
                                    icon="solar:user-id-bold" 
                                />
                                <DetailItem label="Status" value={department.status} isStatus />
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Department Description */}
                        <Box>
                            <SectionHeader title="Department Description" icon="" />
                            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-line', p: 3, bgcolor: 'background.neutral', borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                                {department.description || 'No description provided for this department.'}
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Details Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog >
    );
}

// ----------------------------------------------------------------------

function SectionHeader({ title, icon, noMargin = false }: { title: string; icon?: string, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: noMargin ? 0 : 3 }}>
            {icon && <Iconify icon={icon as any} width={24} sx={{ color: 'primary.main' }} />}
            <Typography variant="h6" sx={{
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.875rem',
                color: 'text.primary',
            }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon, color = 'text.primary', isStatus = false }: { label: string; value?: any; icon?: string; color?: string; isStatus?: boolean }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {icon && (
                    <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main'
                    }}>
                        <Iconify icon={icon as any} width={18} />
                    </Box>
                )}
                {isStatus ? (
                    <Label variant="soft" color={value === 'Active' ? 'success' : 'error'} sx={{ textTransform: 'uppercase', fontWeight: 800 }}>
                        {value || 'Unknown'}
                    </Label>
                ) : (
                    <>
                        {typeof value === 'string' ? (
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color }}>
                                {value || '-'}
                            </Typography>
                        ) : (
                            value
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}
