import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

// ----------------------------------------------------------------------

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsCompanyEmail({ data, onChange }: Props) {
  const [ccError, setCcError] = useState('');

  const ccEmailsArray = data.hr_cc_emails
    ? data.hr_cc_emails.split(',').map((email: string) => email.trim()).filter(Boolean)
    : [];

  const isPrimaryEmailValid = !data.hr_email || EMAIL_REGEX.test(data.hr_email.trim());

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Company Email Settings
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Configure default email addresses for HR notifications and communications.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={4}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Primary HR Email</Typography>
          <TextField
            fullWidth
            placeholder="hr@bbkexports.com"
            value={data.hr_email || ''}
            error={!isPrimaryEmailValid}
            helperText={
              !isPrimaryEmailValid
                ? 'Please enter a valid email address (e.g. hr@example.com)'
                : 'The main recipient email address for HR system notifications.'
            }
            onChange={(e) => onChange('hr_email', e.target.value)}
          />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">HR Email Name</Typography>
          <TextField
            fullWidth
            placeholder="HR Email Name"
            value={data.hr_name || ''}
            onChange={(e) => onChange('hr_name', e.target.value)}
          />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">CC Recipients</Typography>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={ccEmailsArray}
            onChange={(event, newValue) => {
              const flatTokens: string[] = [];
              newValue.forEach((item) => {
                if (typeof item === 'string') {
                  const splitItems = item.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
                  flatTokens.push(...splitItems);
                }
              });

              const uniqueTokens = Array.from(new Set(flatTokens));
              const invalidTokens = uniqueTokens.filter((email) => !EMAIL_REGEX.test(email));
              const validTokens = uniqueTokens.filter((email) => EMAIL_REGEX.test(email));

              if (invalidTokens.length > 0) {
                setCcError(`Invalid email address: "${invalidTokens.join(', ')}". Only valid email addresses are accepted.`);
              } else {
                setCcError('');
              }

              onChange('hr_cc_emails', validTokens.join(', '));
            }}
            renderTags={(value: string[], getTagProps) =>
              value.map((option: string, index: number) => {
                const isValid = EMAIL_REGEX.test(option.trim());
                return (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{
                      borderRadius: 1,
                      bgcolor: isValid ? '#059669' : '#ef4444',
                      color: '#ffffff',
                      fontWeight: 'fontWeightBold',
                      '& .MuiChip-deleteIcon': {
                        color: '#ffffff',
                        opacity: 0.7,
                        '&:hover': {
                          opacity: 1,
                          color: '#ffffff',
                        },
                      },
                    }}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                error={Boolean(ccError)}
                placeholder={ccEmailsArray.length === 0 ? "Add email and press enter..." : ""}
                helperText={
                  ccError ||
                  "Type an email address and press Enter to add it. Multiple emails are saved as comma-separated values."
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    p: 1,
                    gap: 1,
                  },
                }}
              />
            )}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
