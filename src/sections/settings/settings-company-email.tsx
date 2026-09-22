import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsCompanyEmail({ data, onChange }: Props) {
  const ccEmailsArray = data.hr_cc_emails
    ? data.hr_cc_emails.split(',').map((email: string) => email.trim()).filter(Boolean)
    : [];

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
            placeholder="hr@innoblitz.global"
            value={data.hr_email}
            onChange={(e) => onChange('hr_email', e.target.value)}
            helperText="The main recipient email address for HR system notifications."
          />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">HR Email Name</Typography>
          <TextField
            fullWidth
            placeholder="HR Email Name"
            value={data.hr_name}
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
              onChange('hr_cc_emails', newValue.join(', '));
            }}
            renderTags={(value: string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                  sx={{
                    borderRadius: 1,
                    bgcolor: '#059669',
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
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                placeholder={ccEmailsArray.length === 0 ? "Add email and press enter..." : ""}
                helperText="Type an email address and press Enter to add it. These will be saved as comma-separated values in the backend."
                sx={{
                    '& .MuiOutlinedInput-root': {
                        p: 1,
                        gap: 1,
                    }
                }}
              />
            )}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
