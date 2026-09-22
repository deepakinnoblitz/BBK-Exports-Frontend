import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { createItem, updateItem, Item } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentItem?: Item | null;
};

export function ItemDialog({ open, onClose, onSuccess, currentItem }: Props) {
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [rate, setRate] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  useEffect(() => {
    if (open) {
      if (currentItem) {
        setItemCode(currentItem.item_code || '');
        setItemName(currentItem.item_name || '');
        setRate(currentItem.rate ?? '');
      } else {
        setItemCode('');
        setItemName('');
        setRate('');
      }
      setError('');
    }
  }, [open, currentItem]);

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      setError('Item Name');
      setSnackbar({ open: true, message: 'Item Name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      const parsedRate = rate === '' ? 0 : Number(rate);

      if (currentItem) {
        await updateItem(currentItem.name, {
          item_code: itemCode,
          item_name: itemName,
          rate: parsedRate
        });
      } else {
        await createItem({
          item_code: itemCode,
          item_name: itemName,
          rate: parsedRate
        });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save item';
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
          boxShadow: (themeVar: any) => themeVar.customShadows.z24,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{currentItem ? 'Edit Item' : 'New Item'}</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            margin: '1rem',
            columnGap: 2,
            rowGap: 3,
            gridTemplateColumns: '1fr',
          }}
        >
          <TextField
            fullWidth
            label="HSN Code"
            value={itemCode}
            onChange={(e) => {
              setItemCode(e.target.value);
            }}
            disabled={loading}
            placeholder="e.g. 84713010"
          />

          <TextField
            required
            fullWidth
            label="Item Name"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              if (error === 'Item Name') setError('');
            }}
            error={error === 'Item Name'}
            helperText={error === 'Item Name' ? 'Item Name is required' : ''}
            disabled={loading}
            placeholder="e.g. Laptop"
          />

          <TextField
            fullWidth
            type="number"
            label="Rate"
            value={rate}
            onChange={(e) => {
              const val = e.target.value;
              setRate(val === '' ? '' : Number(val));
            }}
            disabled={loading}
            placeholder="e.g. 50000"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
        >
          {loading ? (currentItem ? 'Updating...' : 'Creating...') : (currentItem ? 'Update' : 'Create')}
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
