import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import {
  getSafeLogoUrl,
  DEFAULT_COMPANY_NAME,
  ALLOWED_LOGO_EXTENSIONS,
  MAX_LOGO_FILE_SIZE_BYTES,
} from 'src/utils/branding';

import { uploadFile } from 'src/api/data-import';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  value?: string;
  companyName?: string | null;
  error?: string | null;
  errorHighlightKey?: number;
  onErrorChange?: (error: string | null) => void;
  onUpload: (url: string) => void;
  onCompanyNameChange: (name: string) => void;
  hasUnsavedChanges?: boolean;
};

export function SettingsLogo({
  value,
  companyName,
  error = null,
  errorHighlightKey = 0,
  onErrorChange,
  onUpload,
  onCompanyNameChange,
  hasUnsavedChanges = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const alertRef = useRef<HTMLDivElement | null>(null);

  const activeError = onErrorChange ? error : localError;

  const setError = (msg: string | null) => {
    if (onErrorChange) {
      onErrorChange(msg);
    } else {
      setLocalError(msg);
    }
  };

  const previewUrl = getSafeLogoUrl(value, '');
  const displayCompanyName =
    companyName === undefined || companyName === null ? DEFAULT_COMPANY_NAME : companyName;

  useEffect(() => {
    setPreviewError(false);
  }, [value]);

  useEffect(() => {
    if (!errorHighlightKey || !activeError) return undefined;
    setIsHighlighted(true);
    alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setIsHighlighted(false), 1600);
    return () => window.clearTimeout(timer);
  }, [errorHighlightKey, activeError]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_LOGO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExt) {
      setError('Please select a *.png, *.jpg, *.jpeg, or *.svg image file.');
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      setError('Logo image exceeds the maximum size of 2MB.');
      return;
    }

    try {
      setUploading(true);
      // Upload as public so the logo is also visible on the logged-out sign-in page
      const uploaded = await uploadFile(
        file,
        'HRMS Settings',
        'HRMS Settings',
        'app_logo',
        { isPrivate: false }
      );
      if (uploaded?.file_url) {
        onUpload(uploaded.file_url);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Logo & Branding
      </Typography>

      <Stack spacing={3}>
        {activeError && (
          <Alert
            ref={alertRef}
            severity="error"
            onClose={() => setError(null)}
            sx={(theme) => ({
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderColor: isHighlighted ? theme.palette.error.main : alpha(theme.palette.error.main, 0.35),
              boxShadow: isHighlighted
                ? `0 0 0 4px ${alpha(theme.palette.error.main, 0.2)}`
                : 'none',
              transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
            })}
          >
            {activeError}
          </Alert>
        )}

        {hasUnsavedChanges && (
          <Alert severity="info">
            Preview updated. Click <strong>Save Settings</strong> above to apply changes across the sidebar and sign-in page.
          </Alert>
        )}

        <TextField
          fullWidth
          label="Company Name"
          value={displayCompanyName}
          placeholder={DEFAULT_COMPANY_NAME}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          slotProps={{
            htmlInput: { maxLength: 140 },
          }}
          helperText="Displayed below the logo in the sidebar menu, sign-in page, and kiosk header. Leave empty to show the logo only."
          sx={{ maxWidth: 440 }}
        />

        <Divider />

        <Stack spacing={2} alignItems="center">
          <Typography variant="subtitle2" sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}>
            Application Logo
          </Typography>

          <Box
            sx={(theme) => ({
              width: 140,
              height: 140,
              p: 1,
              borderRadius: 2,
              border: activeError
                ? `2px dashed ${theme.palette.error.main}`
                : `1px dashed ${theme.palette.divider}`,
              boxShadow:
                isHighlighted && activeError
                  ? `0 0 0 4px ${alpha(theme.palette.error.main, 0.2)}`
                  : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              bgcolor: activeError
                ? alpha(theme.palette.error.main, 0.04)
                : theme.palette.background.neutral,
              transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
            })}
          >
            {previewUrl && !previewError ? (
              <Box
                component="img"
                src={previewUrl}
                alt={displayCompanyName || 'Application Logo'}
                onError={() => setPreviewError(true)}
                sx={{ width: 1, height: 1, objectFit: 'contain' }}
              />
            ) : (
              <Iconify icon={"solar:gallery-bold" as any} width={48} sx={{ color: 'text.disabled' }} />
            )}
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              component="label"
              startIcon={
                uploading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Iconify icon={"solar:upload-minimalistic-bold" as any} />
                )
              }
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload New Logo'}
              <input
                type="file"
                hidden
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                onChange={handleFileUpload}
              />
            </Button>

            {value && (
              <Button
                variant="outlined"
                color="inherit"
                disabled={uploading}
                onClick={() => {
                  setError(null);
                  onUpload('');
                }}
              >
                Reset to Default
              </Button>
            )}
          </Stack>

          <Typography
            variant="caption"
            sx={{ color: activeError ? 'error.main' : 'text.secondary', textAlign: 'center', fontWeight: activeError ? 600 : 400 }}
          >
            Allowed *.jpeg, *.jpg, *.png, *.svg
            <br /> max size of 2MB
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
