import type {
  CompanyBankAccount
} from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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

import {
  getCompanyBankAccount,
  createCompanyBankAccount,
  updateCompanyBankAccount,
  getBankDetailsByIfsc,
  getDistinctBanks
} from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  id?: string | null;
};

export function CompanyBankAccountDialog({ open, onClose, onSuccess, id }: Props) {
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [status, setStatus] = useState<CompanyBankAccount['status']>('Active');

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
            const data = await getCompanyBankAccount(id);
            setBankName(data.bank_name || '');
            setAccountHolderName(data.account_holder_name || '');
            setAccountNo(data.account_no || '');
            setIfscCode(data.ifsc_code || '');
            setUpiId(data.upi_id || '');
            setStatus(data.status || 'Active');
            if (data.ifsc_code && data.ifsc_code.length === 11) {
              setIfscVerified(true);
            } else {
              setIfscVerified(null);
            }
          } catch (err) {
            console.error('Failed to fetch company bank account:', err);
            setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
          } finally {
            setLoading(false);
          }
        } else {
          setBankName('');
          setAccountHolderName('');
          setAccountNo('');
          setIfscCode('');
          setUpiId('');
          setStatus('Active');
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
            if (error === 'Bank Name') setError('');
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
    if (!ifscCode.trim()) {
      setError('IFSC Code');
      setSnackbar({ open: true, message: 'IFSC Code is required', severity: 'error' });
      return;
    }

    if (!bankName.trim()) {
      setError('Bank Name');
      setSnackbar({ open: true, message: 'Bank Name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data: Partial<CompanyBankAccount> = {
        bank_name: bankName,
        account_holder_name: accountHolderName,
        account_no: accountNo,
        ifsc_code: ifscCode,
        upi_id: upiId,
        status,
      };

      if (id) {
        await updateCompanyBankAccount(id, data);
      } else {
        await createCompanyBankAccount(data);
      }

      await onSuccess();
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar) => themeVar.customShadows.z24,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{id ? 'Edit Company Bank Account' : 'New Company Bank Account'}</Typography>
        <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
      </DialogTitle>

      <DialogContent dividers>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} sx={{ py: 2 }}>
          <TextField
            required
            fullWidth
            label="IFSC Code"
            placeholder="e.g. BARB0AMBATT"
            value={ifscCode}
            onChange={(e) => {
              handleIfscChange(e.target.value);
              if (error === 'IFSC Code') setError('');
            }}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 11, style: { textTransform: 'uppercase' } }}
            error={error === 'IFSC Code' || ifscVerified === false}
            helperText={
              ifscVerified === true
                ? `✓ Verified: ${bankName}`
                : error === 'IFSC Code'
                ? 'IFSC Code is required'
                : ifscErrorMsg || 'Enter 11-digit IFSC to auto-fill Bank Name'
            }
            FormHelperTextProps={{
              sx: {
                color: ifscVerified === true ? 'success.main' : (error === 'IFSC Code' || ifscVerified === false) ? 'error.main' : 'text.secondary',
                fontWeight: ifscVerified !== null ? 600 : 400,
              },
            }}
            sx={{ gridColumn: '1 / -1', '& .MuiFormLabel-asterisk': { color: 'red' } }}
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

          <Autocomplete
            freeSolo
            options={bankOptions}
            value={bankName}
            onChange={(_, newValue) => {
              setBankName(newValue || '');
              if (error === 'Bank Name') setError('');
            }}
            onInputChange={(_, newInputValue) => {
              setBankName(newInputValue || '');
              if (error === 'Bank Name') setError('');
            }}
            disabled={loading}
            sx={{ gridColumn: '1 / -1' }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                label="Bank Name"
                placeholder="Search bank name or auto-filled via IFSC"
                error={error === 'Bank Name'}
                helperText={error === 'Bank Name' ? 'Bank Name is required' : ''}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
              />
            )}
          />

          <TextField
            fullWidth
            label="Account Holder Name"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Account No"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />


          <TextField
            fullWidth
            label="UPI ID"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            fullWidth
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CompanyBankAccount['status'])}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
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
