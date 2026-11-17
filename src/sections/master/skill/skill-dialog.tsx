import type { Skill } from 'src/api/masters';

import { useState, useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { getSkill, createSkill, updateSkill, renameSkill } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  id?: string | null;
};

export function SkillDialog({ open, onClose, onSuccess, id }: Props) {
  const [skillName, setSkillName] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (open) {
        if (id) {
          try {
            setLoading(true);
            const data = await getSkill(id);
            setSkillName(data.skill_name || data.name || '');
            setStatus(data.is_active === 0 ? 'Inactive' : 'Active');
            setDescription(data.description || '');
          } catch (err) {
            console.error('Failed to fetch skill details:', err);
            setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
          } finally {
            setLoading(false);
          }
        } else {
          setSkillName('');
          setStatus('Active');
          setDescription('');
        }
        setError('');
      }
    };

    fetchData();
  }, [open, id]);

  const handleSubmit = async () => {
    const trimmedSkillName = skillName.trim();
    if (!trimmedSkillName) {
      setError('required');
      setSnackbar({ open: true, message: 'Skill Name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      let currentId = id;

      if (id && trimmedSkillName !== id) {
        await renameSkill(id, trimmedSkillName);
        currentId = trimmedSkillName;
      }

      const data: Partial<Skill> = {
        skill_name: trimmedSkillName,
        is_active: status === 'Active' ? 1 : 0,
        description: description.trim(),
      };

      if (currentId) {
        await updateSkill(currentId, data);
      } else {
        await createSkill(data);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save skill';
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
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{id ? 'Edit Skill' : 'New Skill'}</Typography>
        <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ py: 2 }}>
          <TextField
            required
            fullWidth
            label="Skill Name"
            placeholder="e.g. Highly Skilled, Skilled, Semi Skilled, Quality Inspector"
            value={skillName}
            onChange={(e) => {
              setSkillName(e.target.value);
              if (error === 'required') setError('');
            }}
            error={error === 'required'}
            helperText={error === 'required' ? 'Skill Name is required' : ''}
            disabled={loading}
            autoFocus
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
          />

          <FormControl fullWidth disabled={loading}>
            <InputLabel shrink>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            placeholder="Add a brief description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
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
