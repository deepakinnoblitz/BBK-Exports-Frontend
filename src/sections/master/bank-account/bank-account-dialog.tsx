import type { BankAccount } from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { getDoctypeList } from 'src/api/leads';
import { getBankAccount, getDistinctBanks, createBankAccount, updateBankAccount, getBankDetailsByIfsc } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function isBankNameMatching(inputName: string, expectedName: string): boolean {
    const a = (inputName || '').trim().toLowerCase();
    const b = (expectedName || '').trim().toLowerCase();
    if (!a || !b) return false;
    if (a === b) return true;

    const sanitize = (s: string) =>
        s
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\b(ltd|limited|bank|the)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();

    const cleanA = sanitize(a);
    const cleanB = sanitize(b);

    if (cleanA && cleanB) {
        if (cleanA === cleanB) return true;
        if (cleanA.length >= 4 && cleanB.length >= 4) {
            if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
        }
    }

    const rawA = a.replace(/[^a-z0-9]/g, '');
    const rawB = b.replace(/[^a-z0-9]/g, '');
    return rawA.length >= 3 && rawA === rawB;
}

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
    const [existingBankAccounts, setExistingBankAccounts] = useState<any[]>([]);
    const [ifscLoading, setIfscLoading] = useState(false);
    const [ifscVerified, setIfscVerified] = useState<boolean | null>(null);
    const [ifscErrorMsg, setIfscErrorMsg] = useState('');
    const [verifiedBankDetails, setVerifiedBankDetails] = useState<{
        bank_name: string;
        branch: string;
        ifsc: string;
    } | null>(null);

    const isDuplicateAccountNumber = (accToCheck: string) => {
        const trimmed = accToCheck.trim();
        if (!trimmed) return false;
        return existingBankAccounts.some((acc) => {
            if (id && (acc.name === id || acc.account_number === id)) return false;
            return (acc.account_number || '').trim() === trimmed;
        });
    };

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

        const loadBankAccounts = async () => {
            try {
                const res = await getDoctypeList('Bank Account', ['name', 'bank_account_name', 'account_number'], undefined, 1000);
                setExistingBankAccounts(res || []);
            } catch (err) {
                console.error('Failed to load existing bank accounts:', err);
            }
        };

        if (open) {
            fetchBanks();
            loadBankAccounts();
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
                            try {
                                setIfscLoading(true);
                                const res = await getBankDetailsByIfsc(data.ifsc_code);
                                if (res.success && res.data) {
                                    const details = {
                                        bank_name: res.data.bank_name,
                                        branch: res.data.branch || '',
                                        ifsc: data.ifsc_code.toUpperCase(),
                                    };
                                    setVerifiedBankDetails(details);
                                    const matches = isBankNameMatching(data.bank_name || '', res.data.bank_name);
                                    setIfscVerified(matches);
                                    if (!matches) {
                                        setIfscErrorMsg(`Bank name does not match the entered IFSC code (Expected: ${res.data.bank_name})`);
                                    }
                                } else {
                                    setIfscVerified(false);
                                    setIfscErrorMsg(res.message || 'IFSC code not found');
                                }
                            } catch {
                                setIfscVerified(null);
                            } finally {
                                setIfscLoading(false);
                            }
                        } else {
                            setIfscVerified(null);
                            setVerifiedBankDetails(null);
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
                    setVerifiedBankDetails(null);
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
        setVerifiedBankDetails(null);

        if (error.split(',').some((err) => ['IFSC Code', 'ifsc_format', 'bank_mismatch'].includes(err))) {
            setError((prev) => prev.split(',').filter((err) => !['IFSC Code', 'ifsc_format', 'bank_mismatch'].includes(err)).join(','));
        }

        if (clean.length === 11) {
            try {
                setIfscLoading(true);
                const res = await getBankDetailsByIfsc(clean);
                if (res.success && res.data) {
                    const details = {
                        bank_name: res.data.bank_name,
                        branch: res.data.branch || '',
                        ifsc: clean,
                    };
                    setVerifiedBankDetails(details);
                    setBankOptions((prev) => (prev.includes(res.data!.bank_name) ? prev : [res.data!.bank_name, ...prev]));

                    let currentBank = bankName;
                    if (!currentBank.trim()) {
                        setBankName(res.data.bank_name);
                        currentBank = res.data.bank_name;
                    }
                    if (!branch.trim() && res.data.branch) {
                        setBranch(res.data.branch);
                    }

                    const matches = isBankNameMatching(currentBank, res.data.bank_name);
                    setIfscVerified(matches);
                    if (!matches) {
                        setIfscErrorMsg(`Bank name does not match the entered IFSC code (Expected: ${res.data.bank_name})`);
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

    const handleBankNameChange = (val: string) => {
        setBankName(val);
        if (error.split(',').some((err) => ['Bank Name', 'bank_mismatch'].includes(err))) {
            setError((prev) => prev.split(',').filter((err) => !['Bank Name', 'bank_mismatch'].includes(err)).join(','));
        }
        if (verifiedBankDetails && ifscCode.trim().length === 11) {
            const matches = isBankNameMatching(val, verifiedBankDetails.bank_name);
            setIfscVerified(matches);
            if (!matches) {
                setIfscErrorMsg(`Bank name does not match the entered IFSC code (Expected: ${verifiedBankDetails.bank_name})`);
            } else {
                setIfscErrorMsg('');
            }
        }
    };

    const has11DigitIfsc = ifscCode.trim().length === 11;
    const isBankMismatch = !!verifiedBankDetails && has11DigitIfsc && !isBankNameMatching(bankName, verifiedBankDetails.bank_name);
    const isBothMatch = !!verifiedBankDetails && has11DigitIfsc && isBankNameMatching(bankName, verifiedBankDetails.bank_name);
    const isIfscInvalid = ifscVerified === false && !isBankMismatch;

    const isAccountRequiredError = error.split(',').includes('Account Number');
    const isAccountDuplicateError = error.split(',').includes('account_number_duplicate') || (accountNumber.trim() !== '' && isDuplicateAccountNumber(accountNumber));
    const isAccountNumericError = error.split(',').includes('account_number_numeric');
    const accountHasError = isAccountRequiredError || isAccountDuplicateError || isAccountNumericError;

    let accountHelperText = '';
    if (isAccountRequiredError) {
        accountHelperText = 'Account Number is required';
    } else if (isAccountDuplicateError) {
        accountHelperText = 'Account Number already exists';
    } else if (isAccountNumericError) {
        accountHelperText = 'Account Number must contain only numeric digits';
    }

    const handleSubmit = async () => {
        const errs: string[] = [];
        const bAccName = bankAccountName.trim();
        const accNum = accountNumber.trim();
        const ifsc = ifscCode.trim();
        const brn = branch.trim();
        const bName = bankName.trim();

        if (!bAccName) errs.push('Bank Account Name');

        if (!accNum) {
            errs.push('Account Number');
        } else if (!/^\d+$/.test(accNum)) {
            errs.push('account_number_numeric');
        } else if (isDuplicateAccountNumber(accNum)) {
            errs.push('account_number_duplicate');
        }

        if (!ifsc) {
            errs.push('IFSC Code');
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
            errs.push('ifsc_format');
        }

        if (!brn) errs.push('Branch');
        if (!bName) errs.push('Bank Name');

        if (ifsc && bName && verifiedBankDetails && verifiedBankDetails.ifsc === ifsc) {
            if (!isBankNameMatching(bName, verifiedBankDetails.bank_name)) {
                errs.push('bank_mismatch');
            }
        } else if (ifsc && ifscVerified === false) {
            errs.push('ifsc_invalid');
        }

        if (errs.length > 0) {
            setError(errs.join(','));
            let msg = 'Please fill in all required fields';
            if (errs.includes('account_number_numeric')) {
                msg = 'Account Number must contain only numeric digits.';
            } else if (errs.includes('account_number_duplicate')) {
                msg = 'Account Number already exists. Please enter a unique account number.';
            } else if (errs.includes('ifsc_format')) {
                msg = 'Invalid IFSC Code format. Must be 11 characters (e.g. HDFC0000003).';
            } else if (errs.includes('bank_mismatch')) {
                msg = `Bank name does not match the entered IFSC code (Expected: ${verifiedBankDetails?.bank_name}).`;
            } else if (errs.includes('ifsc_invalid')) {
                msg = ifscErrorMsg || 'Please enter a valid IFSC code.';
            } else if (errs.length === 1) {
                msg = `${errs[0]} is required`;
            }
            setSnackbar({ 
                open: true, 
                message: msg, 
                severity: 'error' 
            });
            return;
        }

        try {
            setLoading(true);
            setError('');

            const data: Partial<BankAccount> = {
                bank_account_name: bAccName,
                account_number: accNum,
                bank_name: bName,
                branch: brn,
                ifsc_code: ifsc,
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
            const rawMsg = err.message || 'Failed to save';
            const lowerMsg = rawMsg.toLowerCase();
            let displayMsg = rawMsg;
            if (lowerMsg.includes('account number') && (lowerMsg.includes('numeric') || lowerMsg.includes('digit'))) {
                displayMsg = 'Account Number must contain only numeric digits.';
            } else if (lowerMsg.includes('account number') && (lowerMsg.includes('already exists') || lowerMsg.includes('unique') || lowerMsg.includes('duplicate'))) {
                displayMsg = 'Account Number already exists. Please enter a unique account number.';
            } else if (lowerMsg.includes('does not match') || lowerMsg.includes('mismatch')) {
                displayMsg = rawMsg;
            }
            setError(displayMsg);
            setSnackbar({ open: true, message: displayMsg, severity: 'error' });
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
                                const val = e.target.value.replace(/\D/g, '');
                                setAccountNumber(val);
                                if (error.split(',').some((err) => ['Account Number', 'account_number_duplicate', 'account_number_numeric'].includes(err))) {
                                    setError(error.split(',').filter((err) => !['Account Number', 'account_number_duplicate', 'account_number_numeric'].includes(err)).join(','));
                                }
                            }}
                            error={accountHasError}
                            helperText={accountHelperText}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
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
                                    setError((prev) => prev.split(',').filter((err) => err !== 'IFSC Code').join(','));
                                }
                            }}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ maxLength: 11, style: { textTransform: 'uppercase' } }}
                            error={error.split(',').includes('IFSC Code') || error.split(',').includes('ifsc_format') || isBankMismatch || isIfscInvalid}
                            helperText={
                                isBothMatch
                                    ? `✓ Verified: ${verifiedBankDetails.bank_name}${branch ? ` (${branch})` : ''}`
                                    : isBankMismatch
                                    ? `Bank name does not match the entered IFSC code (Expected: ${verifiedBankDetails?.bank_name})`
                                    : isIfscInvalid
                                    ? (ifscErrorMsg || 'IFSC code not found')
                                    : error.split(',').includes('IFSC Code')
                                    ? 'IFSC Code is required'
                                    : error.split(',').includes('ifsc_format')
                                    ? 'Invalid IFSC Code format (11 characters required)'
                                    : 'Enter 11-digit IFSC to auto-fill Bank & Branch'
                            }
                            FormHelperTextProps={{
                                sx: {
                                    color: isBothMatch ? 'success.main' : (error.split(',').includes('IFSC Code') || error.split(',').includes('ifsc_format') || isBankMismatch || isIfscInvalid) ? 'error.main' : 'text.secondary',
                                    fontWeight: isBothMatch || isBankMismatch ? 600 : 400,
                                },
                            }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {ifscLoading && <CircularProgress size={20} />}
                                        {isBothMatch && (
                                            <Chip
                                                size="small"
                                                color="success"
                                                icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                                                label="Verified"
                                                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700 }}
                                            />
                                        )}
                                        {isBankMismatch && (
                                            <Chip
                                                size="small"
                                                color="error"
                                                icon={<Iconify icon="solar:close-circle-bold" width={16} />}
                                                label="Mismatch"
                                                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700 }}
                                            />
                                        )}
                                        {isIfscInvalid && (
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
                            handleBankNameChange(newValue || '');
                        }}
                        onInputChange={(_, newInputValue) => {
                            handleBankNameChange(newInputValue || '');
                        }}
                        disabled={loading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                required
                                fullWidth
                                label="Bank Name"
                                placeholder="Search bank name or auto-filled via IFSC"
                                error={error.split(',').includes('Bank Name') || isBankMismatch}
                                helperText={
                                    error.split(',').includes('Bank Name')
                                        ? 'Bank Name is required'
                                        : isBankMismatch
                                        ? `Bank name does not match the entered IFSC code (Expected: ${verifiedBankDetails?.bank_name})`
                                        : ''
                                }
                                FormHelperTextProps={{
                                    sx: {
                                        color: isBankMismatch ? 'error.main' : undefined,
                                        fontWeight: isBankMismatch ? 600 : undefined,
                                    },
                                }}
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
