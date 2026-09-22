import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsLiveKit({ data, onChange }: Props) {
  const FIELDS = [
    {
      label: 'LiveKit Server URL',
      fieldname: 'livekit_url',
      description: 'The WebSocket URL of your LiveKit server (e.g., wss://project.livekit.cloud).',
      icon: 'solar:link-bold-duotone',
      color: '#059669',
      placeholder: 'wss://...',
    },
    {
      label: 'LiveKit API Key',
      fieldname: 'livekit_api_key',
      description: 'The API Key generated from your LiveKit dashboard.',
      icon: 'solar:key-minimalistic-square-bold-duotone',
      color: '#FFAB00',
      placeholder: 'devkey...',
    },
    {
      label: 'LiveKit API Secret',
      fieldname: 'livekit_api_secret',
      description: 'The API Secret for authentication. (Stored securely as a password).',
      icon: 'solar:lock-password-bold-duotone',
      color: '#FF5630',
      placeholder: 'devsecret...',
      type: 'password',
    },
  ];

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Call Integration Settings (LiveKit)
      </Typography>

      <Stack spacing={3}>
        {FIELDS.map((item) => (
          <Stack
            key={item.fieldname}
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
              p: 2,
              borderRadius: 1.5,
              border: (theme) => `solid 1px ${theme.palette.divider}`,
              transition: (theme) => theme.transitions.create(['all']),
              '&:hover': {
                bgcolor: 'background.neutral',
              },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => (theme.palette.mode === 'light' ? `${item.color}14` : `${item.color}29`),
                color: item.color,
              }}
            >
              <Iconify icon={item.icon as any} width={28} />
            </Box>

            <ListItemText
              primary={item.label}
              secondary={item.description}
              primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 'fontWeightBold' }}
              secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
            />

            <TextField
              fullWidth
              size="small"
              type={item.type || 'text'}
              placeholder={item.placeholder}
              value={data?.[item.fieldname] || ''}
              onChange={(event) => onChange(item.fieldname, event.target.value)}
              sx={{ 
                maxWidth: 320,
                '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.neutral',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                    border: (theme) => `solid 1px ${theme.palette.divider}`,
                    borderRadius: 1,
                }
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
