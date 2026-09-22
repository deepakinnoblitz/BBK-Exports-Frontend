import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { IoMdArrowBack } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { alpha, styled } from '@mui/material/styles';
import FormHelperText from '@mui/material/FormHelperText';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';


// Android 12 Switch Style
const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 40,
    height: 24,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 4,
        transitionDuration: '200ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                backgroundColor: '#fff',
                width: 16,
                height: 16,
            },
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.5,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 16,
        height: 16,
        backgroundColor: '#fff',
        boxShadow: 'none',
    },
    '& .MuiSwitch-track': {
        borderRadius: 24 / 2,
        backgroundColor: '#cbd5e1',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 200,
        }),
    },
}));


import { DashboardContent } from 'src/layouts/dashboard';
import { createRolePermission, type PermissionAccess, getPopulatedPermissions } from 'src/api/permission-management';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

interface RolePermissionCreateViewProps {
    onBack?: () => void;
}

export function RolePermissionCreateView({ onBack }: RolePermissionCreateViewProps = {}) {
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [frontendRoleName, setFrontendRoleName] = useState('');
    const [backendMasterRole, setBackendMasterRole] = useState('');
    const [status, setStatus] = useState<'Enabled' | 'Disabled'>('Enabled');
    const [permissions, setPermissions] = useState<PermissionAccess[]>([]);

    const [frontendRoleNameError, setFrontendRoleNameError] = useState(false);
    const [backendMasterRoleError, setBackendMasterRoleError] = useState(false);

    const handleMasterRoleChange = async (newRole: string) => {
        setBackendMasterRole(newRole);
        setFormError(null);

        if (!newRole) {
            setPermissions([]);
            return;
        }

        try {
            const populated = await getPopulatedPermissions(newRole);
            setPermissions(populated);
        } catch (err: any) {
            console.error(err);
            enqueueSnackbar(err.message || "Failed to fetch default permissions", { variant: 'error' });
            setPermissions([]);
        }
    };

    const togglePermission = (idx: number, field: keyof PermissionAccess) => {
        if (!isActionAllowed(permissions[idx].module_id, permissions[idx].screen_id, field)) return;
        const updated = [...permissions];
        const val = updated[idx][field] as number;
        const newVal = val ? 0 : 1;
        updated[idx] = {
            ...updated[idx],
            [field]: newVal
        };

        if (field !== 'view_permission' && newVal === 1) {
            updated[idx]['view_permission'] = 1;
        }

        setPermissions(updated);
    };

    const isRowAllChecked = (row: PermissionAccess) => {
        const fields: (keyof PermissionAccess)[] = [
            'add_permission',
            'edit_permission',
            'view_permission',
            'delete_permission',
            'export_permission',
            'import_permission'
        ];
        return fields.every((f) => {
            if (!isActionAllowed(row.module_id, row.screen_id, f)) return true;
            return !!row[f];
        });
    };

    const allSelected = permissions.length > 0 && permissions.every(isRowAllChecked);

    const handleSelectAll = () => {
        const targetVal = allSelected ? 0 : 1;
        const updated = permissions.map((p) => ({
            ...p,
            add_permission: isActionAllowed(p.module_id, p.screen_id, 'add_permission') ? targetVal : 0,
            edit_permission: isActionAllowed(p.module_id, p.screen_id, 'edit_permission') ? targetVal : 0,
            view_permission: isActionAllowed(p.module_id, p.screen_id, 'view_permission') ? targetVal : 0,
            delete_permission: isActionAllowed(p.module_id, p.screen_id, 'delete_permission') ? targetVal : 0,
            export_permission: isActionAllowed(p.module_id, p.screen_id, 'export_permission') ? targetVal : 0,
            import_permission: isActionAllowed(p.module_id, p.screen_id, 'import_permission') ? targetVal : 0,
        }));
        setPermissions(updated);
    };

    const toggleAllRowPermissions = (idx: number) => {
        const updated = [...permissions];
        const row = updated[idx];
        const allChecked = isRowAllChecked(row);
        const targetVal = allChecked ? 0 : 1;

        updated[idx] = {
            ...row,
            add_permission: isActionAllowed(row.module_id, row.screen_id, 'add_permission') ? targetVal : 0,
            edit_permission: isActionAllowed(row.module_id, row.screen_id, 'edit_permission') ? targetVal : 0,
            view_permission: isActionAllowed(row.module_id, row.screen_id, 'view_permission') ? targetVal : 0,
            delete_permission: isActionAllowed(row.module_id, row.screen_id, 'delete_permission') ? targetVal : 0,
            export_permission: isActionAllowed(row.module_id, row.screen_id, 'export_permission') ? targetVal : 0,
            import_permission: isActionAllowed(row.module_id, row.screen_id, 'import_permission') ? targetVal : 0,
        };

        setPermissions(updated);
    };

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

    const handleSave = async () => {
        let hasError = false;
        if (!frontendRoleName.trim()) {
            setFrontendRoleNameError(true);
            hasError = true;
        }
        if (!backendMasterRole) {
            setBackendMasterRoleError(true);
            hasError = true;
        }
        if (hasError) {
            enqueueSnackbar('Please fill all required fields', { variant: 'error' });
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const cleanedPermissions = permissions.map((p) => ({
                ...p,
                add_permission: (isActionAllowed(p.module_id, p.screen_id, 'add_permission') && p.add_permission) ? 1 : 0,
                edit_permission: (isActionAllowed(p.module_id, p.screen_id, 'edit_permission') && p.edit_permission) ? 1 : 0,
                view_permission: (isActionAllowed(p.module_id, p.screen_id, 'view_permission') && p.view_permission) ? 1 : 0,
                delete_permission: (isActionAllowed(p.module_id, p.screen_id, 'delete_permission') && p.delete_permission) ? 1 : 0,
                export_permission: (isActionAllowed(p.module_id, p.screen_id, 'export_permission') && p.export_permission) ? 1 : 0,
                import_permission: (isActionAllowed(p.module_id, p.screen_id, 'import_permission') && p.import_permission) ? 1 : 0,
            }));

            const payload = {
                frontend_role_name: frontendRoleName,
                backend_master_role: backendMasterRole,
                status,
                permissions: cleanedPermissions,
            };
            await createRolePermission(payload);
            enqueueSnackbar('Role permission created successfully', { variant: 'success' });
            if (onBack) {
                onBack();
            } else {
                router.push('/users?subtab=role_permissions');
            }
        } catch (err: any) {
            setFormError(err.message || 'Failed to save configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleGoBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push('/users?subtab=role_permissions');
        }
    };

    const renderToggleCell = (row: PermissionAccess, idx: number, key: keyof PermissionAccess) => {
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
                <Android12Switch
                    checked={!!value}
                    onChange={() => togglePermission(idx, key)}
                />
            </TableCell>
        );
    };

    return (
        <DashboardContent maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">New Role Permission</Typography>
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
                        variant="outlined"
                        color="primary"
                        onClick={handleSelectAll}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            borderColor: '#059669',
                            color: '#059669',
                            '&:hover': {
                                bgcolor: (theme) => alpha('#059669', 0.04),
                                borderColor: '#047857',
                                color: '#047857',
                            }
                        }}
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
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
                        {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Role Permission'}
                    </Button>
                </Stack>
            </Stack>

            <Card sx={{ p: 3 }}>
                {formError && <Alert severity="error" sx={{ mb: 3 }}>{formError}</Alert>}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                    <TextField
                        required
                        fullWidth
                        label="Frontend Role Name"
                        value={frontendRoleName}
                        error={frontendRoleNameError}
                        helperText={frontendRoleNameError ? 'Frontend Role Name is required' : ''}
                        onChange={(e) => {
                            setFrontendRoleName(e.target.value);
                            if (frontendRoleNameError) setFrontendRoleNameError(false);
                        }}
                    />

                    <FormControl fullWidth required error={backendMasterRoleError}>
                        <InputLabel id="backend-master-role-select-label">Backend Master Role</InputLabel>
                        <Select
                            labelId="backend-master-role-select-label"
                            label="Backend Master Role"
                            value={backendMasterRole}
                            onChange={(e) => {
                                handleMasterRoleChange(e.target.value);
                                if (backendMasterRoleError) setBackendMasterRoleError(false);
                            }}
                        >
                            <MenuItem value="HR">HR</MenuItem>
                            <MenuItem value="Employee">Employee</MenuItem>
                            <MenuItem value="CRM And Sales">CRM And Sales</MenuItem>
                        </Select>
                        {backendMasterRoleError && (
                            <FormHelperText>Please select a backend master role</FormHelperText>
                        )}
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="status-select-label">Status</InputLabel>
                        <Select
                            labelId="status-select-label"
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                        >
                            <MenuItem value="Enabled">Enabled</MenuItem>
                            <MenuItem value="Disabled">Disabled</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <TableContainer sx={{ border: '1px solid rgba(224, 224, 224, 1)', borderRadius: 2 }}>
                    <Scrollbar>
                        <Table size="medium">
                            <TableRow sx={{ bgcolor: '#059669', position: 'sticky', top: 0, zIndex: 1 }}>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Modules</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Screens</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>All</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Add</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Edit</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>View</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Delete</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Export</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Import</TableCell>
                            </TableRow>

                            <TableBody>
                                {permissions.length > 0 ? (
                                    permissions.map((row, idx) => {
                                        const span = getRowSpan(permissions, idx);
                                        return (
                                            <TableRow key={idx} hover sx={{ borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                                                {span > 0 && (
                                                    <TableCell
                                                        rowSpan={span}
                                                        align="center"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: 'text.primary',
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                                                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                                                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                                            verticalAlign: 'middle',
                                                            py: 2,
                                                        }}
                                                    >
                                                        {getFriendlyModuleName(row.module_id)}
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                                    {getFriendlyScreenName(row.screen_id)}
                                                </TableCell>
                                                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                                    <Android12Switch
                                                        checked={isRowAllChecked(row)}
                                                        onChange={() => toggleAllRowPermissions(idx)}
                                                    />
                                                </TableCell>
                                                {renderToggleCell(row, idx, 'add_permission')}
                                                {renderToggleCell(row, idx, 'edit_permission')}
                                                {renderToggleCell(row, idx, 'view_permission')}
                                                {renderToggleCell(row, idx, 'delete_permission')}
                                                {renderToggleCell(row, idx, 'export_permission')}
                                                {renderToggleCell(row, idx, 'import_permission')}
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                            <EmptyContent
                                                title="Select Backend Master Role to load the fields."
                                                icon="solar:video-library-bold-duotone"
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Scrollbar>
                </TableContainer>
            </Card>
        </DashboardContent>
    );
}

export const isActionAllowed = (moduleId: string, screenId: string, key: string) => {
    const mod = moduleId ? moduleId.toLowerCase() : '';
    const scr = screenId ? screenId.toLowerCase() : '';

    // 1. Dashboards only have View permission
    if (scr.includes('dashboard') || mod.includes('dashboard')) {
        return key === 'view_permission';
    }

    // 1.5. Profile / My Profile only have View and Edit permission
    if (scr === 'my profile' || mod === 'profile') {
        return key === 'view_permission' || key === 'edit_permission';
    }

    // 1.8. My Attendance and My Daily Log only have View permission
    if (scr === 'my attendance' || scr === 'my daily log' || scr === 'my salary slip' || scr ==='my asset list') {
        return key === 'view_permission';
    }

    // 1.9. Only View and Add permission for Employee application/request screens
    const onlyViewAndAddScreens = [
        'my leave application',
        'my request list',
        'my wfh attendance',
        'my salary slip',
        'my reimbursement claim',
        'my asset requests',
        'refer a friend'
    ];
    if (onlyViewAndAddScreens.includes(scr)) {
        return key === 'view_permission' || key === 'add_permission';
    }

    // Meta Account only has View and Add permissions (no Edit, Delete, Export, Import)
    if (mod === 'meta_account') {
        return key === 'view_permission';
    }

    // My Timesheet does not have Delete permission
    if (scr === 'my timesheet' && key === 'delete_permission') {
        return false;
    }

    // 2. Reports only have View and Export permissions
    const isReport = scr.includes('report') || mod.startsWith('report_');
    if (isReport) {
        return key === 'view_permission' || key === 'export_permission';
    }

    // 3. Only reports have export permission, other modules do not
    if (key === 'export_permission') {
        return false;
    }

    // 4. Only Lead, Clients, and Company have Import permission. Other modules do not.
    if (key === 'import_permission') {
        const isImportAllowedModule = mod === 'lead' || mod === 'clients' || mod === 'company' || mod === 'attendance' || mod === 'asset_record';
        const isImportAllowedScreen = scr === 'leads' || scr === 'clients' || scr === 'company' || mod === 'attendance_list' || mod === 'asset_list' || mod === 'asset_assignments';
        return isImportAllowedModule || isImportAllowedScreen;
    }

    return true;
};
