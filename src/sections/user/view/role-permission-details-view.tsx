import { useState, useEffect } from 'react';
import { IoMdArrowBack } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getRolePermission, type PermissionAccess } from 'src/api/permission-management';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { isActionAllowed } from './role-permission-create-view';

interface RolePermissionDetailsViewProps {
    name: string;
    onBack?: () => void;
    onEdit?: () => void;
}

export function RolePermissionDetailsView({ name, onBack, onEdit }: RolePermissionDetailsViewProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [frontendRoleName, setFrontendRoleName] = useState('');
    const [backendMasterRole, setBackendMasterRole] = useState('');
    const [status, setStatus] = useState<'Enabled' | 'Disabled'>('Enabled');
    const [permissions, setPermissions] = useState<PermissionAccess[]>([]);

    useEffect(() => {
        const loadRecord = async () => {
            setLoading(true);
            try {
                const doc = await getRolePermission(name);
                setFrontendRoleName(doc.frontend_role_name);
                setBackendMasterRole(doc.backend_master_role);
                setStatus(doc.status);
                setPermissions(doc.permissions || []);
            } catch (err: any) {
                setFormError(err.message || 'Failed to fetch details');
            } finally {
                setLoading(false);
            }
        };
        loadRecord();
    }, [name]);

    const getRowSpan = (rows: PermissionAccess[], index: number) => {
        const currentFriendly = getFriendlyModuleName(rows[index].module_id);
        if (index > 0 && getFriendlyModuleName(rows[index - 1].module_id) === currentFriendly) {
            return 0;
        }
        let span = 1;
        for (let i = index + 1; i < rows.length; i++) {
            if (getFriendlyModuleName(rows[i].module_id) === currentFriendly) {
                span++;
            } else {
                break;
            }
        }
        return span;
    };

    const getFriendlyModuleName = (module: string) => {
        if (module === 'deal') return 'Prospects';
        if (module === 'account') return 'Company';
        if (module === 'contact') return 'Clients';
        if (module === 'purchase_collection') return 'Purchase Settlement';
        if (module.startsWith('email_') || module.startsWith('whatsapp_')) {
            return module.startsWith('email_') ? 'Mail Automation' : 'WhatsApp Automation';
        }
        if (module.startsWith('asset_')) return 'Asset';
        if (module === 'expense_tracker' || module === 'reimbursement_claims') return 'Expenses';
        if (module === 'crm_expenses') return 'CRM Expense Tracker';
        if (module === 'employee_evaluation' || module === 'badges' || module === 'employee_monthly_award') return 'Employee Performance';
        if (module === 'job_openings' || module === 'job_applicants' || module === 'interviews' || module === 'employee_referrals') return 'Recruitment';
        if (module === 'attendance_list' || module === 'daily_log' || module === 'wfh_attendance') return 'Attendance';
        if (module.startsWith('meta_') || module === 'webhook_logs') return 'Lead Integration';
        if (module.startsWith('master_')) return 'Masters';
        if (module.startsWith('report_')) return 'Reports';
        return module.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getFriendlyScreenName = (screen: string) => {
        if (screen === 'Purchase Collections') return 'Purchase Settlements';
        return screen;
    };

    const renderToggleIcon = (row: PermissionAccess, key: keyof PermissionAccess) => {
        const allowed = isActionAllowed(row.module_id, row.screen_id, key);
        if (!allowed) {
            return (
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', color: 'text.disabled' }}>
                    -
                </TableCell>
            );
        }
        const value = row[key];
        return (
            <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                {value ? (
                    <Iconify icon="solar:check-circle-bold" sx={{ color: '#00a76f' }} width={24} />
                ) : (
                    <Iconify icon="solar:close-circle-bold" sx={{ color: '#919eab' }} width={24} />
                )}
            </TableCell>
        );
    };

    const handleGoBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push('/users?subtab=role_permissions');
        }
    };

    const handleGoEdit = () => {
        if (onEdit) {
            onEdit();
        } else {
            router.push(`/role-permissions/${name}/edit`);
        }
    };

    return (
        <DashboardContent maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">Role Permission Details</Typography>
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
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleGoEdit}
                        sx={{
                            borderRadius: 1.5,
                            bgcolor: '#059669',
                            color: 'common.white',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2.5,
                            '&:hover': { bgcolor: '#047857' }
                        }}
                    >
                        Edit Details
                    </Button>
                </Stack>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Card sx={{ p: 3 }}>
                    {formError && <Alert severity="error" sx={{ mb: 3 }}>{formError}</Alert>}

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                        <Box>
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Frontend Role Name</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{frontendRoleName}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Backend Master Role</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{backendMasterRole}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Status</Typography>
                            <Box sx={{ mt: 0.5 }}>
                                <Label variant="soft" color={status === 'Enabled' ? 'success' : 'error'}>
                                    {status}
                                </Label>
                            </Box>
                        </Box>
                    </Box>

                    {permissions.length > 0 && (
                        <TableContainer sx={{ border: '1px solid rgba(224, 224, 224, 1)', borderRadius: 1 }}>
                            <Scrollbar>
                                <Table size="medium">
                                    <TableRow sx={{ bgcolor: '#059669' }}>
                                        <TableCell sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Menu Name</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Access Name</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Add</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Edit</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>View</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Delete</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Export</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Import</TableCell>
                                    </TableRow>

                                    <TableBody>
                                        {permissions.map((row, idx) => {
                                            const span = getRowSpan(permissions, idx);
                                            return (
                                                <TableRow key={idx} hover sx={{ borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                                                    {span > 0 && (
                                                        <TableCell
                                                            rowSpan={span}
                                                            sx={{
                                                                verticalAlign: 'middle',
                                                                borderRight: '1px solid rgba(224, 224, 224, 1)',
                                                                fontWeight: 'bold',
                                                                color: 'text.primary',
                                                                bgcolor: 'rgba(244, 246, 248, 0.4)'
                                                            }}
                                                        >
                                                            {getFriendlyModuleName(row.module_id)}
                                                        </TableCell>
                                                    )}
                                                    <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                                        {row.screen_id}
                                                    </TableCell>
                                                    {renderToggleIcon(row, 'add_permission')}
                                                    {renderToggleIcon(row, 'edit_permission')}
                                                    {renderToggleIcon(row, 'view_permission')}
                                                    {renderToggleIcon(row, 'delete_permission')}
                                                    {renderToggleIcon(row, 'export_permission')}
                                                    {renderToggleIcon(row, 'import_permission')}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Scrollbar>
                        </TableContainer>
                    )}
                </Card>
            )}
        </DashboardContent>
    );
}
