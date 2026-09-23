import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface AttachmentsUploadProps {
  attachments: any[];
  uploading?: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  error?: boolean;
  helperText?: string;
}

export function AttachmentsUpload({
  attachments,
  uploading = false,
  onFileChange,
  onRemove,
  error,
  helperText,
}: AttachmentsUploadProps) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
        border: (theme) =>
          error
            ? `1px dashed ${theme.palette.error.main}`
            : `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack spacing={0.25}>
          <Typography variant="h6">Resume Attachment</Typography>
          {error && helperText && (
            <Typography variant="caption" color="error">
              {helperText}
            </Typography>
          )}
        </Stack>

        <Button
          variant="contained"
          component="label"
          sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
          color="primary"
          size="small"
          startIcon={<Iconify icon={"solar:upload-bold" as any} />}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" hidden onChange={onFileChange} />
        </Button>
      </Stack>

      <Stack spacing={1}>
        {attachments.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 3, color: 'text.disabled' }}>
            <Iconify icon={"solar:file-bold" as any} width={40} height={40} sx={{ mb: 1, opacity: 0.48 }} />
            <Typography variant="body2">No attachments yet</Typography>
          </Stack>
        ) : (
          attachments.map((file: any, index) => (
            <Stack
              key={index}
              direction="row"
              alignItems="center"
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
              }}
            >
              <Iconify
                icon={"solar:link-bold" as any}
                width={20}
                sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }}
              />
              <Typography variant="body2" noWrap sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}>
                {typeof file === 'string'
                  ? file.split('/').pop()
                  : file instanceof File
                  ? file.name
                  : file.url
                  ? file.url.split('/').pop()
                  : file.name || 'Attachment'}
              </Typography>
              <Button
                size="small"
                color="inherit"
                onClick={() => onRemove(index)}
                sx={{
                  px: 1.5,
                  py: 0,
                  height: 26,
                  borderRadius: 1.5,
                  minWidth: 'auto',
                  typography: 'caption',
                  bgcolor: 'background.paper',
                  border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                  },
                }}
              >
                Clear
              </Button>
            </Stack>
          ))
        )}
      </Stack>
    </Box>
  );
}
