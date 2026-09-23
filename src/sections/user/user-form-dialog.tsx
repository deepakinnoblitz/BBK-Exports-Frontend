import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Avatar from '@mui/material/Avatar';
import Snackbar from '@mui/material/Snackbar';
import { styled } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { uploadFile } from 'src/api/data-import';
import { getRoles, getModules } from 'src/api/users';
import { fetchRolePermissions } from 'src/api/permission-management';
import {
  fetchUserPermissions,
  createUserPermission,
  deleteUserPermission,
} from 'src/api/user-permissions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { isActionAllowed } from './view/role-permission-create-view';
import { UserPermissionFormDialog } from '../user-permission/user-permission-form-dialog';

// Android 12 Switch Style
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
    return (module || '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getFriendlyScreenName = (screen: string) => {
    if (screen === 'Purchase Collections') return 'Purchase Settlements';
    return screen;
};

const getRowSpan = (rows: any[], index: number) => {
    const currentFriendly = getFriendlyModuleName(rows[index]?.module_id || '');
    if (index > 0 && getFriendlyModuleName(rows[index - 1]?.module_id || '') === currentFriendly) {
        return 0;
    }
    let span = 1;
    for (let i = index + 1; i < rows.length; i++) {
        if (getFriendlyModuleName(rows[i]?.module_id || '') === currentFriendly) {
            span++;
        } else {
            break;
        }
    }
    return span;
};

const renderToggleIcon = (row: any, key: string) => {
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
const Android12Switch = styled(Switch)(({ theme }) => ({
  width: 36,
  height: 20,
  padding: 0,
  marginRight: 10,
  marginLeft: 20,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 3,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
        border: 0,
      },
      '& .MuiSwitch-thumb': {
        backgroundColor: theme.palette.primary.contrastText,
        width: 14,
        height: 14,
      },
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.5,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 14,
    height: 14,
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 20 / 2,
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 300,
    }),
  },
}));

// Android 12 Button Style
const Android12Button = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  textTransform: 'none',
  fontWeight: 500,
  padding: '8px 20px',
  fontSize: '0.925rem',

  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
}));

// Android 12 Loading Button Style
const Android12LoadingButton = styled(LoadingButton)(({ theme }) => ({
  borderRadius: 20,
  textTransform: 'none',
  fontWeight: 500,
  padding: '8px 20px',
  fontSize: '0.925rem',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
  '&.MuiLoadingButton-loading': {
    backgroundColor: '#059669',
    color: '#ffffff',
  },
  '& .MuiLoadingButton-loadingIndicator': {
    color: '#ffffff',
  },
}));

// ----------------------------------------------------------------------


type Props = {
  open: boolean;
  onClose: VoidFunction;
  selectedUser: any;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: VoidFunction;
  onChangePassword?: (userId: string, newPassword: string) => Promise<void>;
  isSubmitting?: boolean;
};

export function UserFormDialog({
  open,
  onClose,
  selectedUser,
  formData,
  setFormData,
  onSubmit,
  onChangePassword,
  isSubmitting = false,
}: Props) {
  const [currentTab, setCurrentTab] = useState('details');
  const [roles, setRoles] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  // User Permissions state
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [openPermissionDialog, setOpenPermissionDialog] = useState(false);

  // Role Permissions state (Permission Management)
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false);
  const [selectedRoleForView, setSelectedRoleForView] = useState<any | null>(null);
  const [permissionFormData, setPermissionFormData] = useState({
    allow: 'Employee',
    for_value: '',
  });

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const showNewPassword = useBoolean();
  const showConfirmPassword = useBoolean();
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const docname = selectedUser?.name || undefined;
      const fileDoc = await uploadFile(file, docname ? 'User' : undefined, docname, docname ? 'user_image' : undefined);
      setFormData({ ...formData, user_image: fileDoc.file_url || '' });
    } catch (error) {
      console.error('Failed to upload user image:', error);
    } finally {
      setUploading(false);
    }
  };

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [validationSnackbar, setValidationSnackbar] = useState('');

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.first_name) {
      newErrors.first_name = 'First Name is required';
    }

    // New user validation
    if (!selectedUser) {
      if (!newPassword) {
        newErrors.password = 'Password is required';
      } else if (newPassword.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (newPassword !== confirmPassword) {
        newErrors.password = 'Passwords do not match';
      }

      if (!formData.roles || formData.roles.length === 0) {
        newErrors.roles = 'At least one role is required';
      }
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmitWrapper = () => {
    const validationErrors = validate();
    const errorKeys = Object.keys(validationErrors);

    if (errorKeys.length === 0) {
      onSubmit();
    } else {
      if (errorKeys.length > 1) {
        setValidationSnackbar('Please fill in all required fields');
      } else {
        setValidationSnackbar(validationErrors[errorKeys[0]]);
      }

      // Jump to the first tab with an error
      if (validationErrors.email || validationErrors.first_name) {
        setCurrentTab('details');
      } else if (validationErrors.roles) {
        setCurrentTab('roles');
      } else if (validationErrors.password) {
        setCurrentTab('password');
      }
    }
  };

  useEffect(() => {
    if (open) {
      // Fetch roles and modules when dialog opens
      getRoles()
        .then(setRoles)
        .catch((err: any) => console.error('Failed to fetch roles:', err));

      getModules()
        .then(setModules)
        .catch((err: any) => console.error('Failed to fetch modules:', err));

      // Fetch user permissions if editing existing user
      if (selectedUser) {
        loadUserPermissions();
      }
    }
  }, [open, selectedUser]);

  useEffect(() => {
    const fullName = [formData.first_name, formData.middle_name, formData.last_name]
      .filter(Boolean)
      .join(' ');
    if (formData.full_name !== fullName) {
      setFormData({ ...formData, full_name: fullName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.first_name, formData.middle_name, formData.last_name]);

  useEffect(() => {
    if (newPassword && confirmPassword && newPassword === confirmPassword) {
      // Only sync if it meets minimum length to prevent backend crash on super-weak passwords
      if (newPassword.length >= 6) {
        if (formData.new_password !== newPassword) {
          setFormData({ ...formData, new_password: newPassword });
        }
      } else if (formData.new_password !== '') {
        setFormData({ ...formData, new_password: '' });
      }
    } else if (!newPassword && !confirmPassword) {
      if (formData.new_password !== '') {
        setFormData({ ...formData, new_password: '' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPassword, confirmPassword]);

  const loadUserPermissions = async () => {
    if (!selectedUser?.email) return;
    setLoadingPermissions(true);
    try {
      const result = await fetchUserPermissions({
        page: 1,
        page_size: 100,
        filters: { user: selectedUser.email },
      });
      setUserPermissions(result.data);
    } catch (error: any) {
      console.error('Failed to load user permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadRolePermissions = useCallback(async () => {
    const selectedRoles = formData.roles || [];
    if (selectedRoles.length === 0) {
      setRolePermissions([]);
      setFormData((prev: any) => ({ ...prev, custom_permissions: [] }));
      return;
    }
    setLoadingRolePermissions(true);
    try {
      const data = await fetchRolePermissions(selectedRoles);
      setRolePermissions(data);

      const validPmNames = new Set(data.map((rp: any) => rp.name));
      setFormData((prev: any) => {
        const currentCustom = prev.custom_permissions || [];
        const filteredCustom = currentCustom.filter((p: any) => validPmNames.has(p.permission_manager));
        if (filteredCustom.length !== currentCustom.length) {
          return { ...prev, custom_permissions: filteredCustom };
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to load role permissions:', err);
    } finally {
      setLoadingRolePermissions(false);
    }
  }, [formData.roles, setFormData]);

  useEffect(() => {
    if (open) {
      loadRolePermissions();
    }
  }, [open, loadRolePermissions]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  };

  const handleRoleToggle = (roleName: string) => {
    const currentRoles = formData.roles || [];
    const newRoles = currentRoles.includes(roleName)
      ? currentRoles.filter((r: string) => r !== roleName)
      : [...currentRoles, roleName];
    setFormData({ ...formData, roles: newRoles });
  };

  const handleModuleToggle = (moduleName: string) => {
    const currentModules = formData.block_modules || [];
    const newModules = currentModules.includes(moduleName)
      ? currentModules.filter((m: string) => m !== moduleName)
      : [...currentModules, moduleName];
    setFormData({ ...formData, block_modules: newModules });
  };

  const handleSelectAllRoles = () => {
    setFormData({ ...formData, roles: roles.map((r) => r.name) });
  };

  const handleUnselectAllRoles = () => {
    setFormData({ ...formData, roles: [] });
  };

  const handleAllowAllModules = () => {
    setFormData({ ...formData, block_modules: [] });
  };

  const handleBlockAllModules = () => {
    setFormData({ ...formData, block_modules: modules.map((m) => m.name) });
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (onChangePassword && selectedUser) {
      try {
        await onChangePassword(selectedUser.name, newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
      } catch (error: any) {
        setPasswordError(error.message || 'Failed to change password');
      }
    } else {
      // For new user, update formData
      if (newPassword.length < 6) {
        setFormData({ ...formData, new_password: '' }); // Reset if invalid
      } else {
        setFormData({ ...formData, new_password: newPassword });
      }
      // Don't reset newPassword/confirmPassword yet, let user see it's synced
      setPasswordError('');
    }
  };

  const handleCreatePermission = async () => {
    if (!selectedUser?.email || !permissionFormData.allow || !permissionFormData.for_value) return;

    setIsSubmittingPermission(true);
    try {
      await createUserPermission({
        user: selectedUser.email,
        allow: permissionFormData.allow,
        for_value: permissionFormData.for_value,
      });
      setOpenPermissionDialog(false);
      setPermissionFormData({ allow: 'Employee', for_value: '' });
      loadUserPermissions();
    } catch (error: any) {
      console.error('Failed to create permission:', error);
    } finally {
      setIsSubmittingPermission(false);
    }
  };

  const handleDeletePermission = async (permissionName: string) => {
    try {
      await deleteUserPermission(permissionName);
      loadUserPermissions();
    } catch (error: any) {
      console.error('Failed to delete permission:', error);
    }
  };

  const renderUserDetailsTab = (
    <Box sx={{ p: 3, px: 4 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Profile Picture
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={formData.user_image || ''}
                alt={formData.full_name || 'User'}
                sx={{
                  width: 80,
                  height: 80,
                  border: '2px solid rgba(8, 163, 205, 0.3)',
                }}
              />
              {uploading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.4)',
                    borderRadius: '50%',
                  }}
                >
                  <CircularProgress size={24} sx={{ color: 'common.white' }} />
                </Box>
              )}
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                component="label"
                size="small"
                disabled={uploading}
                sx={{
                  bgcolor: '#059669',
                  color: 'common.white',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  borderRadius: 1.5,
                  px: 2,
                }}
              >
                {formData.user_image ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
              {formData.user_image && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => setFormData({ ...formData, user_image: '' })}
                  sx={{ textTransform: 'none', borderRadius: 1.5, px: 2 }}
                >
                  Remove
                </Button>
              )}
            </Stack>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Android12Switch
                checked={formData.enabled === 1}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked ? 1 : 0 })}
              />
            }
            label="Enabled"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            required
            label="Email"
            value={formData.email || ''}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            disabled={!!selectedUser}
            error={!!errors.email}
            helperText={errors.email || (selectedUser ? 'Email cannot be changed' : '')}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.full_name || ''}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            InputProps={{ readOnly: true }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            required
            label="First Name"
            value={formData.first_name || ''}
            onChange={(e) => {
              setFormData({ ...formData, first_name: e.target.value });
              if (errors.first_name) setErrors({ ...errors, first_name: '' });
            }}
            error={!!errors.first_name}
            helperText={errors.first_name}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Username"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Middle Name"
            value={formData.middle_name || ''}
            onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Last Name"
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
        </Grid>

        {/* <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="User Type"
            value={formData.user_type || 'System User'}
            onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
            SelectProps={{ native: true }}
          >
            <option value="System User">System User</option>
            <option value="Website User">Website User</option>
          </TextField>
        </Grid> */}

        {!selectedUser && (
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Android12Switch
                  checked={formData.send_welcome_email === 1}
                  onChange={(e) =>
                    setFormData({ ...formData, send_welcome_email: e.target.checked ? 1 : 0 })
                  }
                />
              }
              label="Send Welcome Email"
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderRolesTab = (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2}>
          <Android12Button variant="outlined" size="small" onClick={handleSelectAllRoles}>
            Select All
          </Android12Button>
          <Android12Button variant="outlined" size="small" onClick={handleUnselectAllRoles}>
            Unselect All
          </Android12Button>
        </Stack>

        <Grid container spacing={3}>
          {roles.map((role) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={role.name}>
              <FormControlLabel
                control={
                  <Android12Switch
                    checked={(formData.roles || []).includes(role.name)}
                    onChange={() => handleRoleToggle(role.name)}
                    size="small"
                  />
                }
                label={role.name}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );

  const renderModulesTab = (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Select modules to allow. Unselected modules will be blocked.
        </Typography>

        <Stack direction="row" spacing={2}>
          <Android12Button variant="outlined" size="small" onClick={handleAllowAllModules}>
            Allow All
          </Android12Button>
          <Android12Button variant="outlined" size="small" onClick={handleBlockAllModules}>
            Block All
          </Android12Button>
        </Stack>

        <Grid container spacing={1}>
          {modules.map((module) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={module.name}>
              <FormControlLabel
                control={
                  <Android12Switch
                    checked={!(formData.block_modules || []).includes(module.name)}
                    onChange={() => handleModuleToggle(module.name)}
                    size="small"
                  />
                }
                label={module.name}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );

  const renderPasswordTab = (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {selectedUser ? 'Change Password' : 'Set Password'}
      </Typography>
      <Stack spacing={3}>
        {passwordError && <Alert severity="error">{passwordError}</Alert>}

        <TextField
          fullWidth
          label="New Password"
          type={showNewPassword.value ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          autoComplete="new-password"
          error={!!errors.password}
          helperText={errors.password}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={showNewPassword.onToggle} edge="end">
                  <Iconify
                    icon={showNewPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Confirm New Password"
          type={showConfirmPassword.value ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={!!newPassword && !!confirmPassword && newPassword !== confirmPassword}
          helperText={
            !!newPassword && !!confirmPassword && newPassword !== confirmPassword
              ? 'Passwords do not match'
              : ''
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={showConfirmPassword.onToggle} edge="end">
                  <Iconify
                    icon={showConfirmPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Password button removed, synced to formData and triggered by main Update/Create button */}
      </Stack>
    </Box>
  );

  const renderUserPermissionsTab = (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6">User Permissions</Typography>
            {selectedUser && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() => setOpenPermissionDialog(true)}
              >
                Add Permission
              </Button>
            )}
          </Stack>

          {!selectedUser && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Permissions can be added once the user has been created.
            </Alert>
          )}
        </Box>

        {loadingPermissions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <Typography>Loading permissions...</Typography>
          </Box>
        ) : userPermissions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No permissions found
            </Typography>
          </Box>
        ) : (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              {userPermissions.map((permission) => (
                <Box
                  key={permission.name}
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2">{permission.allow}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      For Value: {permission.for_value}
                    </Typography>
                  </Box>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleDeletePermission(permission.name)}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>

      <UserPermissionFormDialog
        open={openPermissionDialog}
        onClose={() => setOpenPermissionDialog(false)}
        formData={{ ...permissionFormData, user: selectedUser?.email }}
        setFormData={(data) =>
          setPermissionFormData({
            allow: data.allow,
            for_value: data.for_value,
          })
        }
        onSubmit={handleCreatePermission}
        isSubmitting={isSubmittingPermission}
        hideUserField
      />
    </Box>
  );

  const handlePermissionToggle = (pmName: string, pmLabel: string) => {
    const currentPerms = formData.custom_permissions || [];
    const exists = currentPerms.some((p: any) => p.permission_manager === pmName);
    let newPerms;
    if (exists) {
      newPerms = currentPerms.filter((p: any) => p.permission_manager !== pmName);
    } else {
      newPerms = [...currentPerms, { permission_manager: pmName, permission_name: pmLabel }];
    }
    setFormData({ ...formData, custom_permissions: newPerms });
  };

  const renderRolePermissionsTab = (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Role Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            Select the specific frontend roles (permissions) to assign to this user.
          </Typography>
        </Box>

        {loadingRolePermissions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : rolePermissions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              No active permissions found. Make sure at least one role (e.g. HR, CRM And Sales, Employee) is selected in the Roles tab.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {rolePermissions.map((rp) => {
              const isChecked = (formData.custom_permissions || []).some(
                (p: any) => p.permission_manager === rp.name
              );
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rp.name}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                    <FormControlLabel
                      control={
                        <Android12Switch
                          checked={isChecked}
                          onChange={() => handlePermissionToggle(rp.name, rp.frontend_role_name)}
                          size="small"
                        />
                      }
                      label={
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontWeight: 600, pl: 1 }}>
                            {rp.frontend_role_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', pl: 1 }}>
                            {rp.backend_master_role}
                          </Typography>
                        </Stack>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={() => setSelectedRoleForView(rp)}
                      sx={{
                        p: 0.5,
                        width: 28,
                        height: 28,
                        color: 'text.secondary',
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected', color: 'primary.main' }
                      }}
                    >
                      <Iconify icon="solar:eye-bold" width={16} height={16} />
                    </IconButton>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
        <DialogTitle sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}`, }}>
          {selectedUser ? 'Edit User' : 'New User'}
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="User Details" value="details" />
          <Tab label="Roles" value="roles" />
          <Tab label="Role Permission" value="role-permissions" />
          {/* <Tab label="Allow Modules" value="modules" /> */}
          {selectedUser && <Tab label="User Permissions" value="permissions" />}
          <Tab label="Password" value="password" />
        </Tabs>

        <DialogContent sx={{ p: 0 }}>
          {currentTab === 'details' && renderUserDetailsTab}
          {currentTab === 'roles' && renderRolesTab}
          {currentTab === 'role-permissions' && renderRolePermissionsTab}
          {/* {currentTab === 'modules' && renderModulesTab} */}
          {currentTab === 'permissions' && selectedUser && renderUserPermissionsTab}
          {currentTab === 'password' && renderPasswordTab}
        </DialogContent>

        <DialogActions>
          <Android12LoadingButton
            variant="contained"
            onClick={handleSubmitWrapper}
            loading={isSubmitting}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            {selectedUser ? 'Update' : 'Create'}
          </Android12LoadingButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!validationSnackbar}
        autoHideDuration={4000}
        onClose={() => setValidationSnackbar('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setValidationSnackbar('')} severity="error" sx={{ width: '100%' }}>
          {validationSnackbar}
        </Alert>
      </Snackbar>

      {/* Role Details Viewer Dialog */}
      <Dialog
        open={!!selectedRoleForView}
        onClose={() => setSelectedRoleForView(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}`, pr: 6 }}>
          Role Permissions: {selectedRoleForView?.frontend_role_name}
          <IconButton onClick={() => setSelectedRoleForView(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {(() => {
            const dialogPermissions = selectedRoleForView?.permissions || [];

            return dialogPermissions.length > 0 ? (
              <TableContainer sx={{ border: '1px solid rgba(224, 224, 224, 1)', borderRadius: 1 }}>
                <Scrollbar>
                  <Table size="medium">
                      <TableRow sx={{ bgcolor: '#059669' }}>
                        <TableCell sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Menu Name</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Access Name</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Add</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Edit</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>View</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Delete</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Export</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'common.white', borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: '#059669' }}>Import</TableCell>
                      </TableRow>
                    <TableBody>
                      {dialogPermissions.map((row: any, idx: number) => {
                        const span = getRowSpan(dialogPermissions, idx);
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
                              {getFriendlyScreenName(row.screen_id)}
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
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No screen permissions defined.</Typography>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}