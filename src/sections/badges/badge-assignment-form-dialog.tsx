import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fetchEmployees } from 'src/api/employees';
import { assignBadge, fetchAllBadges } from 'src/api/badges';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  selectedAssignment?: any | null;
};

export function BadgeAssignmentFormDialog({ open, onClose, onSuccess, onError, selectedAssignment }: Props) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    employee: '',
    badge: '',
    reason: '',
    awarded_on: dayjs().format('YYYY-MM-DD'),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const empRes = await fetchEmployees({ page_size: 100, page: 1 });
        setEmployees(empRes.data);
        const badgeRes = await fetchAllBadges();
        setBadges(badgeRes);
      } catch (error) {
        console.error(error);
      }
    };
    if (open) loadData();
  }, [open]);

  useEffect(() => {
    if (selectedAssignment) {
      setFormData({
        employee: selectedAssignment.employee || '',
        badge: selectedAssignment.badge || '',
        reason: selectedAssignment.reason || '',
        awarded_on: selectedAssignment.awarded_on || dayjs().format('YYYY-MM-DD'),
      });
    } else {
      setFormData({
        employee: '',
        badge: '',
        reason: '',
        awarded_on: dayjs().format('YYYY-MM-DD'),
      });
    }
  }, [selectedAssignment, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.employee) newErrors.employee = 'Employee is required';
    if (!formData.badge) newErrors.badge = 'Badge is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      const errs: string[] = [];
      if (!formData.employee) errs.push('employee');
      if (!formData.badge) errs.push('badge');
      
      if (errs.length > 1) {
        onError('Please fill in all required fields');
      } else if (errs[0] === 'employee') {
        onError('Employee is required');
      } else {
        onError('Badge is required');
      }
      return;
    }

    setLoading(true);
    try {
      await assignBadge(formData);
      onSuccess('Badge assigned successfully');
      onClose();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || 'Failed to assign badge';
      onError(errorMsg);
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
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
          Assign Badge
        </Typography>
        <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Autocomplete
              fullWidth
              options={employees}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.employee_name ? `${option.employee_name} (${option.name})` : option.name;
              }}
              value={employees.find((e) => e.name === formData.employee) || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, employee: newValue?.name || '' });
                if (errors.employee) setErrors({ ...errors, employee: '' });
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props as any;
                return (
                  <li key={key} {...optionProps}>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {option.employee_name || option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        ID: {option.name}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Employee"
                  required
                  error={!!errors.employee}
                  helperText={errors.employee}
                  InputLabelProps={{ shrink: true }}
                  placeholder="Select Employee"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    },
                  }}
                />
              )}
            />

            <Autocomplete
              fullWidth
              options={badges}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.badge_name || option.name;
              }}
              value={badges.find((b) => b.name === formData.badge) || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, badge: newValue?.name || '' });
                if (errors.badge) setErrors({ ...errors, badge: '' });
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props as any;
                return (
                  <li key={key} {...optionProps}>
                    <Stack spacing={0.5} direction="row" alignItems="center">
                      {option.icon && (
                         <Box component="img" src={option.icon} sx={{ width: 24, height: 24, mr: 1, borderRadius: 0.5 }} />
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {option.badge_name || option.name}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Badge"
                  required
                  error={!!errors.badge}
                  helperText={errors.badge}
                  InputLabelProps={{ shrink: true }}
                  placeholder="Select Badge"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    },
                  }}
                />
              )}
            />

            <DatePicker
              label="Awarded On"
              format="DD-MM-YYYY"
              value={dayjs(formData.awarded_on)}
              onChange={(newValue: any) => setFormData({ ...formData, awarded_on: newValue?.format('YYYY-MM-DD') || '' })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    },
                  },
                },
              }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Why is this badge being awarded?"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                },
              }}
            />
          </Stack>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ p: 1.5 }}>
        <LoadingButton
          variant="contained"
          onClick={handleSave}
          loading={loading}
          sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
        >
          Assign
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

