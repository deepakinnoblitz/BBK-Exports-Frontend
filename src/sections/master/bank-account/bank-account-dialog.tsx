import type { BankAccount } from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { getBankAccount, createBankAccount, updateBankAccount, getBankDetailsByIfsc, getDistinctBanks } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const ACCOUNT_TYPES = [
    { value: 'Savings', label: 'Savings' },
    { value: 'Current', label: 'Current' },
    { value: 'Salary Account', label: 'Salary Account' },
    { value: 'Other', label: 'Other' },
];

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: (data?: any) => void;
    id?: string | null;
};

export function BankAccountDialog({ open, onClose, onSuccess, id }: Props) {
    const [bankAccountName, setBankAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [branch, setBranch] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [accountType, setAccountType] = useState<BankAccount['account_type']>('Savings');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [bankOptions, setBankOptions] = useState<string[]>([]);
    const [ifscLoading, setIfscLoading] = useState(false);
    const [ifscVerified, setIfscVerified] = useState<boolean | null>(null);
    const [ifscErrorMsg, setIfscErrorMsg] = useState('');

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const res = await getDistinctBanks();
                if (res?.banks) {
                    setBankOptions(res.banks);
                }
            } catch (err) {
                console.error('Failed to load bank list:', err);
            }
        };
        if (open) {
            fetchBanks();
        }
    }, [open]);

    useEffect(() => {
        const fetchData = async () => {
            if (open) {
                if (id) {
                    try {
                        setLoading(true);
                        const data = await getBankAccount(id);
                        setBankAccountName(data.bank_account_name || '');
                        setAccountNumber(data.account_number || '');
                        setBankName(data.bank_name || '');
                        setBranch(data.branch || '');
                        setIfscCode(data.ifsc_code || '');
                        setAccountType(data.account_type || 'Savings');
                        if (data.ifsc_code && data.ifsc_code.length === 11) {
                            setIfscVerified(true);
                        } else {
                            setIfscVerified(null);
                        }
                    } catch (err) {
                        console.error('Failed to fetch bank account:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setBankAccountName('');
                    setAccountNumber('');
                    setBankName('');
                    setBranch('');
                    setIfscCode('');
                    setAccountType('Savings');
                    setIfscVerified(null);
                    setIfscErrorMsg('');
                }
                setError('');
            }
        };

        fetchData();
    }, [open, id]);

    const handleIfscChange = async (val: string) => {
        const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
        setIfscCode(clean);
        setIfscVerified(null);
        setIfscErrorMsg('');

        if (clean.length === 11) {
            try {
                setIfscLoading(true);
                const res = await getBankDetailsByIfsc(clean);
                if (res.success && res.data) {
                    setIfscVerified(true);
                    if (res.data.bank_name) {
                        setBankName(res.data.bank_name);
                        setBankOptions((prev) => (prev.includes(res.data!.bank_name) ? prev : [res.data!.bank_name, ...prev]));
                        setError((prevErr) => prevErr.split(',').filter((err) => err !== 'Bank Name').join(','));
                    }
                    if (res.data.branch) {
                        setBranch(res.data.branch);
                    }
                } else {
                    setIfscVerified(false);
                    setIfscErrorMsg(res.message || 'IFSC code not found');
                }
            } catch (err: any) {
                setIfscVerified(false);
                setIfscErrorMsg(err.message || 'Lookup failed');
            } finally {
                setIfscLoading(false);
            }
        }
    };


    const handleSubmit = async () => {
        const errs: string[] = [];
        if (!bankAccountName.trim()) errs.push('Bank Account Name');
        if (!accountNumber.trim()) errs.push('Account Number');
        if (!ifscCode.trim()) errs.push('IFSC Code');
        if (!branch.trim()) errs.push('Branch');
        if (!bankName.trim()) errs.push('Bank Name');

        if (errs.length > 0) {
            setError(errs.join(','));
            setSnackbar({ 
                open: true, 
                message: errs.length > 1 ? 'Please fill in all required fields' : `${errs[0]} is required`, 
                severity: 'error' 
            });
            return;
        }

        try {
            setLoading(true);
            setError('');

            const data: Partial<BankAccount> = {
                bank_account_name: bankAccountName,
                account_number: accountNumber,
                bank_name: bankName,
                branch,
                ifsc_code: ifscCode,
                account_type: accountType,
            };

            let res: any = null;
            if (id) {
                res = await updateBankAccount(id, data);
            } else {
                res = await createBankAccount(data);
            }

            onSuccess(res || data);
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save';
            setError(msg);
            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{id ? 'Edit Bank Account' : 'New Bank Account'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3} sx={{ py: 2 }}>
                    <TextField
                        required
                        fullWidth
                        label="Bank Account Name"
                        placeholder="e.g. Salary Account"
                        value={bankAccountName}
                        onChange={(e) => {
                             setBankAccountName(e.target.value);
                             if (error.split(',').includes('Bank Account Name')) {
                                 setError(error.split(',').filter(err => err !== 'Bank Account Name').join(','));
                             }
                        }}
                        error={error.split(',').includes('Bank Account Name')}
                        helperText={error.split(',').includes('Bank Account Name') ? 'Bank Account Name is required' : ''}
                        disabled={loading}
                        autoFocus
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                        <TextField
                            required
                            fullWidth
                            label="Account Number"
                            value={accountNumber}
                            onChange={(e) => {
                                setAccountNumber(e.target.value);
                                if (error.split(',').includes('Account Number')) {
                                    setError(error.split(',').filter(err => err !== 'Account Number').join(','));
                                }
                            }}
                            error={error.split(',').includes('Account Number')}
                            helperText={error.split(',').includes('Account Number') ? 'Account Number is required' : ''}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Account Type"
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value as any)}
                            disabled={loading}
                        >
                            {ACCOUNT_TYPES.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                        <TextField
                            required
                            fullWidth
                            label="IFSC Code"
                            placeholder="e.g. BARB0AMBATT"
                            value={ifscCode}
                            onChange={(e) => {
                                handleIfscChange(e.target.value);
                                if (error.split(',').includes('IFSC Code')) {
                                    setError(error.split(',').filter((err) => err !== 'IFSC Code').join(','));
                                }
                            }}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ maxLength: 11, style: { textTransform: 'uppercase' } }}
                            error={error.split(',').includes('IFSC Code') || ifscVerified === false}
                            helperText={
                                ifscVerified === true
                                    ? `✓ Verified: ${bankName}${branch ? ` (${branch})` : ''}`
                                    : error.split(',').includes('IFSC Code')
                                    ? 'IFSC Code is required'
                                    : ifscErrorMsg || 'Enter 11-digit IFSC to auto-fill Bank & Branch'
                            }
                            FormHelperTextProps={{
                                sx: {
                                    color: ifscVerified === true ? 'success.main' : (error.split(',').includes('IFSC Code') || ifscVerified === false) ? 'error.main' : 'text.secondary',
                                    fontWeight: ifscVerified !== null ? 600 : 400,
                                },
                            }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {ifscLoading && <CircularProgress size={20} />}
                                        {ifscVerified === true && (
                                            <Chip
                                                size="small"
                                                color="success"
                                                icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                                                label="Verified"
                                                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700 }}
                                            />
                                        )}
                                        {ifscVerified === false && (
                                            <Chip
                                                size="small"
                                                color="error"
                                                icon={<Iconify icon="solar:close-circle-bold" width={16} />}
                                                label="Invalid"
                                                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700 }}
                                            />
                                        )}
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            required
                            fullWidth
                            label="Branch"
                            placeholder="e.g. Ambattur Branch"
                            value={branch}
                            onChange={(e) => {
                                setBranch(e.target.value);
                                if (error.split(',').includes('Branch')) {
                                    setError(error.split(',').filter((err) => err !== 'Branch').join(','));
                                }
                            }}
                            error={error.split(',').includes('Branch')}
                            helperText={error.split(',').includes('Branch') ? 'Branch is required' : ''}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />
                    </Box>

                    <Autocomplete
                        freeSolo
                        options={bankOptions}
                        value={bankName}
                        onChange={(_, newValue) => {
                            setBankName(newValue || '');
                            if (error.split(',').includes('Bank Name')) {
                                setError(error.split(',').filter((err) => err !== 'Bank Name').join(','));
                            }
                        }}
                        onInputChange={(_, newInputValue) => {
                            setBankName(newInputValue || '');
                            if (error.split(',').includes('Bank Name')) {
                                setError(error.split(',').filter((err) => err !== 'Bank Name').join(','));
                            }
                        }}
                        disabled={loading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                required
                                fullWidth
                                label="Bank Name"
                                placeholder="Search bank name or auto-filled via IFSC"
                                error={error.split(',').includes('Bank Name')}
                                helperText={error.split(',').includes('Bank Name') ? 'Bank Name is required' : ''}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            />
                        )}
                    />


                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    fullWidth
                    disabled={loading} 
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                >
                    {id ? 'Save Changes' : 'Create'}
                </Button>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
