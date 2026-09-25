import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { frappeRequest } from 'src/utils/csrf';

import { createBadge, updateBadge, renameBadge } from 'src/api/badges';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  selectedBadge?: any | null;
};

const TYPE_OPTIONS = ['Performance', 'Behavior', 'Achievement'];

export function BadgeFormDialog({ open, onClose, onSuccess, onError, selectedBadge }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    badge_name: '',
    badge_type: 'Achievement',
    icon: '',
    description: '',
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedBadge) {
      setFormData({
        badge_name: selectedBadge.badge_name || '',
        badge_type: selectedBadge.badge_type || 'Achievement',
        icon: selectedBadge.icon || '',
        description: selectedBadge.description || '',
      });
    } else {
      setFormData({
        badge_name: '',
        badge_type: 'Achievement',
        icon: '',
        description: '',
      });
      setPreviewUrl(null);
    }
  }, [selectedBadge, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.badge_name) newErrors.badge_name = 'Badge Name is required';
    if (!formData.icon) newErrors.icon = 'Badge Icon is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      const errs: string[] = [];
      if (!formData.badge_name) errs.push('name');
      if (!formData.icon) errs.push('icon');
      
      if (errs.length > 1) {
        onError('Please fill in all required fields');
      } else if (errs[0] === 'name') {
        onError('Badge Name is required');
      } else {
        onError('Badge Icon is required');
      }
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      if (selectedBadge) {
        const currentName = formData.badge_name;
        if (currentName !== selectedBadge.name) {
          await renameBadge(selectedBadge.name, currentName);
        }
        await updateBadge(currentName, formData);
      } else {
        await createBadge(formData);
      }

      onSuccess(selectedBadge ? 'Badge updated successfully' : 'Badge created successfully');
      onClose();
    } catch (error: any) {
      console.error('Save failed:', error);
      let message = 'An error occurred while saving the badge.';

      try {
        const errorData = JSON.parse(error.message);
        if (errorData._server_messages) {
          const messages = JSON.parse(errorData._server_messages);
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMsg = JSON.parse(messages[0]);
            // Strip HTML tags if present (common in Frappe messages)
            message = firstMsg.message.replace(/<[^>]*>?/gm, '');
          }
        } else if (errorData.exception) {
          if (errorData.exception.includes('DuplicateEntryError')) {
            message = `Badge Name "${formData.badge_name}" already exists. Please use a different name.`;
          } else {
            message = errorData.exception.split(':').pop()?.trim() || message;
          }
        }
      } catch (e) {
        // Fallback for non-JSON errors
        if (error.message) message = error.message;
      }

      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrors((prev) => ({ ...prev, icon: '' }));
    
    if (file.type !== 'image/png') {
      setErrors((prev) => ({ ...prev, icon: 'Only PNG images are allowed' }));
      setUploading(false);
      return;
    }

    const localUrl = URL.createObjectURL(file);

    const img = new Image();
    img.src = localUrl;
    img.onload = async () => {
      if (img.width !== img.height) {
        setErrors((prev) => ({ ...prev, icon: 'Image must be 1:1 ratio (square)' }));
        setUploading(false);
        setPreviewUrl(null);
        return;
      }
      
      setPreviewUrl(localUrl);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file, file.name);
      formDataUpload.append('is_private', '0');

      try {
        const response = await frappeRequest('/api/method/upload_file', {
          method: 'POST',
          body: formDataUpload,
        });
        const result = await response.json();
        
        const fileUrl = result.message?.file_url || result.file_url;
        if (fileUrl) {
          setFormData((prev) => ({ ...prev, icon: fileUrl }));
        } else {
          console.warn('Unexpected upload response format:', result);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setErrors((prev) => ({ ...prev, icon: 'Upload failed' }));
      } finally {
        setUploading(false);
      }
    };
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
          {selectedBadge ? 'Edit Badge' : 'New Badge'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Badge Name"
            required
            value={formData.badge_name}
            onChange={(e) => setFormData({ ...formData, badge_name: e.target.value })}
            error={!!errors.badge_name}
            helperText={errors.badge_name}
          />

          <TextField
            select
            fullWidth
            label="Type"
            value={formData.badge_type}
            onChange={(e) => setFormData({ ...formData, badge_type: e.target.value })}
          >
            {TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">
              Badge Icon <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            
            <Alert severity="info" sx={{ py: 0, justifyContent: 'center' }}>
              Only <Box component="span" sx={{ fontWeight: 'bold' }}>PNG</Box> format is allowed with a <Box component="span" sx={{ fontWeight: 'bold' }}>1:1 ratio</Box> (square).
            </Alert>

            <Stack direction="row" spacing={3} justifyContent="center" sx={{ pt: 1 }}>
              <Button
                component="label"
                variant="outlined"
                disabled={uploading}
                color={errors.icon ? 'error' : 'primary'}
                sx={{
                  borderStyle: 'dashed',
                  width: 140,
                  height: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <Iconify icon={"solar:upload-minimalistic-bold" as any} width={32} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {uploading ? '...' : 'Upload'}
                </Typography>
                <input type="file" hidden accept="image/png" onChange={handleFileUpload} />
              </Button>

              <Box
                sx={{
                  width: 140,
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1.5,
                  bgcolor: 'background.neutral',
                  border: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  overflow: 'hidden',
                  p: 1.5,
                }}
              >
                 {previewUrl || formData.icon ? (
                  <Box
                    component="img"
                    src={previewUrl || formData.icon}
                    sx={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain',
                      borderRadius: 1,
                    }}
                  />
                ) : (
                  <Stack alignItems="center" spacing={1} sx={{ color: 'text.disabled' }}>
                    <Iconify icon={"solar:camera-bold" as any} width={32} />
                    <Typography variant="caption">Preview</Typography>
                  </Stack>
                )}
              </Box>
            </Stack>

            {errors.icon && (
              <Typography variant="caption" color="error" sx={{ px: 1, textAlign: 'center', display: 'block' }}>
                {errors.icon}
              </Typography>
            )}
          </Stack>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 1.5 }}>
        <LoadingButton
          variant="contained"
          onClick={handleSave}
          loading={loading}
          sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
        >
          {selectedBadge ? 'Update' : 'Create'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
