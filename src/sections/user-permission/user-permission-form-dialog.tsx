import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { getUsers, getDocTypes, getForValueOptions } from 'src/api/user-permissions';

import { Iconify } from 'src/components/iconify';

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
}));


// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    formData: any;
    setFormData: (data: any) => void;
    onSubmit: VoidFunction;
    isSubmitting?: boolean;
    isEdit?: boolean;
    hideUserField?: boolean;
};


export function UserPermissionFormDialog({
    open,
    onClose,
    formData,
    setFormData,
    onSubmit,
    isSubmitting = false,
    isEdit = false,
    hideUserField = false,
}: Props) {

    const [docTypes, setDocTypes] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [forValueOptions, setForValueOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            Promise.all([getDocTypes(), getUsers()])
                .then(([doctypes, usersList]) => {
                    setDocTypes(doctypes || []);
                    setUsers(usersList || []);
                })
                .catch((err: any) => console.error('Failed to fetch data:', err))
                .finally(() => setLoading(false));
        }
    }, [open]);

    useEffect(() => {
        const fetchOptions = async () => {
            if (!formData.allow) {
                setForValueOptions([]);
                return;
            }
            setLoadingOptions(true);
            try {
                const options = await getForValueOptions(formData.allow);
                setForValueOptions(options || []);
            } catch (error) {
                console.error('Failed to fetch options:', error);
                setForValueOptions([]);
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [formData.allow]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600 }}>
                {isEdit ? 'Edit User Permission' : 'Add User Permission'}
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={3} sx={{ pt: 2 }}>
                    {!hideUserField && (
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) => option.full_name ? `${option.full_name} (${option.email})` : option.email}
                            value={users.find((u) => u.email === formData.user) || null}
                            onChange={(e, newValue) => setFormData({ ...formData, user: newValue?.email || '' })}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="User"
                                    required
                                    placeholder="Select user"
                                />
                            )}
                            loading={loading}
                        />
                    )}

                    <Autocomplete
                        options={docTypes}
                        getOptionLabel={(option) => option.name}
                        value={docTypes.find((dt) => dt.name === formData.allow) || null}
                        onChange={(e, newValue) => {
                            setFormData({ ...formData, allow: newValue?.name || '', for_value: '' });
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Allow"
                                required
                                placeholder="Select doctype"
                            />
                        )}
                        loading={loading}
                    />

                    <Autocomplete
                        options={forValueOptions}
                        getOptionLabel={(option) => {
                            if (formData.allow === 'Employee' && option.employee_name) {
                                return `${option.name} - ${option.employee_name}`;
                            }
                            return option.name || '';
                        }}
                        value={forValueOptions.find((opt) => opt.name === formData.for_value) || null}
                        onChange={(e, newValue) => setFormData({ ...formData, for_value: newValue?.name || '' })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="For Value"
                                required
                                placeholder={formData.allow ? `Select ${formData.allow}` : 'Select value'}
                            />
                        )}
                        loading={loadingOptions}
                        disabled={!formData.allow}
                    />

                </Stack>
            </DialogContent>

            <DialogActions>
                <Android12LoadingButton
                    variant="contained"
                    color="primary"
                    onClick={onSubmit}
                    loading={isSubmitting}
                    disabled={!formData.user || !formData.allow || !formData.for_value}
                >
                    {isEdit ? 'Update' : 'Create'}
                </Android12LoadingButton>
            </DialogActions>


        </Dialog>
    );
}
