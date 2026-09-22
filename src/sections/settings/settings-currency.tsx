import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'AUD', label: 'Australian Dollar', symbol: '$' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: '$' },
];

const LOCALE_OPTIONS = [
  { value: 'en-IN', label: 'English (India)', icon: 'circle-flags:in' },
  { value: 'en-US', label: 'English (United States)', icon: 'circle-flags:us' },
  { value: 'en-GB', label: 'English (United Kingdom)', icon: 'circle-flags:gb' },
  { value: 'de-DE', label: 'German (Germany)', icon: 'circle-flags:de' },
  { value: 'fr-FR', label: 'French (France)', icon: 'circle-flags:fr' },
  { value: 'ja-JP', label: 'Japanese (Japan)', icon: 'circle-flags:jp' },
];

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsCurrency({ data, onChange }: Props) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Currency & Locale Settings
      </Typography>

      <Stack spacing={3}>
        {/* Default Currency */}
        <Stack
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
              bgcolor: (theme) => (theme.palette.mode === 'light' ? '#FF563014' : '#FF563029'),
              color: '#FF5630',
            }}
          >
            <Iconify icon={"solar:global-bold-duotone" as any} width={28} />
          </Box>

          <ListItemText
            primary="Default Currency"
            secondary="Primary currency for financial displays."
            primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 'fontWeightBold' }}
            secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
          />

          <TextField
            select
            size="small"
            value={data?.default_currency || 'INR'}
            onChange={(event) => onChange('default_currency', event.target.value)}
            SelectProps={{
              MenuProps: { PaperProps: { sx: { maxHeight: 240 } } },
            }}
            sx={{ 
                minWidth: 180,
                '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.neutral',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                    border: (theme) => `solid 1px ${theme.palette.divider}`,
                    borderRadius: 1,
                }
            }}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ py: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 24, textAlign: 'center', fontWeight: 'bold', color: 'primary.main' }}>
                    {option.symbol}
                  </Box>
                  <Typography variant="body2">{option.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Default Locale */}
        <Stack
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
              bgcolor: (theme) => (theme.palette.mode === 'light' ? '#05966914' : '#05966929'),
              color: '#059669',
            }}
          >
            <Iconify icon="solar:letter-bold-duotone" width={28} />
          </Box>

          <ListItemText
            primary="Default Locale"
            secondary="Regional formatting for dates and numbers."
            primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 'fontWeightBold' }}
            secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
          />

          <TextField
            select
            size="small"
            value={data?.default_locale || 'en-IN'}
            onChange={(event) => onChange('default_locale', event.target.value)}
            SelectProps={{
                MenuProps: { PaperProps: { sx: { maxHeight: 240 } } },
            }}
            sx={{ 
                minWidth: 180,
                '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.neutral',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                    border: (theme) => `solid 1px ${theme.palette.divider}`,
                    borderRadius: 1,
                }
            }}
          >
            {LOCALE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ py: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Iconify icon={option.icon as any} width={20} />
                  <Typography variant="body2">{option.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
    </Card>
  );
}

