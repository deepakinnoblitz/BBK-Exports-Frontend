import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { Box, Stack, Divider, InputAdornment } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsDashboard({ data, onChange }: Props) {
  const theme = useTheme();

  return (
    <Card sx={{ p: 4, borderRadius: 3 }}>
      <Stack spacing={4}>
        {/* Section 1: Dashboard Sources */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Typography variant="h6">Dashboard Configuration</Typography>
          </Stack>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel id="weekly-chart-source-label">Weekly Chart Source</InputLabel>
                <Select
                  labelId="weekly-chart-source-label"
                  id="weekly-chart-source"
                  value={data.weekly_chart_source || 'Attendance'}
                  label="Weekly Chart Source"
                  onChange={(e) => onChange('weekly_chart_source', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Iconify icon={"solar:database-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Attendance">Attendance (Standard Records)</MenuItem>
                  <MenuItem value="Daily Log">Daily Log (Dynamic Sessions)</MenuItem>
                </Select>
                <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon="solar:info-circle-bold" width={16} />
                  Choose between official attendance records or real-time daily activity logs.
                </Typography>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Section 2: Attendance Rules */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Typography variant="h6">Attendance Thresholds (Daily Log Only)</Typography>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            Define the minimum working hours required to categorize employee daily logs.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Present Threshold"
                value={data.present_threshold || ''}
                onChange={(e) => onChange('present_threshold', e.target.value)}
                placeholder="e.g. 5"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                }}
                helperText="Minimum hours for 'Present' status."
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Half Day Threshold"
                value={data.half_day_threshold || ''}
                onChange={(e) => onChange('half_day_threshold', e.target.value)}
                placeholder="e.g. 3"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon={"solar:minus-circle-bold" as any} sx={{ color: 'warning.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                }}
                helperText="Minimum hours for 'Half Day' status."
              />
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </Card>
  );
}
