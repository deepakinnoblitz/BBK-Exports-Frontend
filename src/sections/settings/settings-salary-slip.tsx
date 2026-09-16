import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { Box, Stack, Divider, InputAdornment, alpha } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsSalarySlip({ data, onChange }: Props) {
  return (
    <Card sx={{ p: 4, borderRadius: 3 }}>
      <Stack spacing={4}>
        {/* Section 1: Salary Calculation */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Typography variant="h6">Salary Calculation Rules</Typography>
          </Stack>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="salary-calculation-source-label">Calculation Source</InputLabel>
                <Select
                  labelId="salary-calculation-source-label"
                  id="salary_calculation_source"
                  value={data.salary_calculation_source || 'Attendance'}
                  label="Calculation Source"
                  onChange={(e) => onChange('salary_calculation_source', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Iconify icon={"solar:calendar-search-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Attendance">Attendance (Standard Records)</MenuItem>
                  {/* <MenuItem value="Daily Log">Daily Log (Dynamic Sessions)</MenuItem> */}
                </Select>
                <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon={"solar:info-circle-bold" as any} width={16} />
                  Source data for calculating present/absent days.
                </Typography>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="salary-holiday-handling-label">Holiday Handling</InputLabel>
                <Select
                  labelId="salary-holiday-handling-label"
                  id="salary_holiday_handling"
                  value={data.salary_holiday_handling || 'Include in Working Days'}
                  label="Holiday Handling"
                  onChange={(e) => onChange('salary_holiday_handling', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Iconify icon={"solar:map-arrow-square-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Include in Working Days">Include in Working Days (Paid)</MenuItem>
                  <MenuItem value="Exclude from Working Days">Exclude from Working Days (Unpaid)</MenuItem>
                </Select>
                <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon={"solar:info-circle-bold" as any} width={16} />
                  Determines if holidays count towards the monthly working days.
                </Typography>
              </FormControl>
            </Grid>
          </Grid>
          
          {/* {data.salary_calculation_source === 'Daily Log' && (
            <Box sx={{ mt: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Daily Log Thresholds</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
                Define the minimum working hours required to categorize employee daily logs for salary calculation.
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Present Threshold"
                    value={data.salary_slip_present_threshold || ''}
                    onChange={(e) => onChange('salary_slip_present_threshold', e.target.value)}
                    placeholder="5"
                    helperText="Minimum hours for 'Present' status."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Half Day Threshold"
                    value={data.salary_slip_half_day_threshold || ''}
                    onChange={(e) => onChange('salary_slip_half_day_threshold', e.target.value)}
                    placeholder="3"
                    helperText="Minimum hours for 'Half Day' status."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Absent Threshold"
                    value={data.salary_slip_absent_threshold || ''}
                    onChange={(e) => onChange('salary_slip_absent_threshold', e.target.value)}
                    placeholder="3"
                    helperText="Hours below this are marked as 'Absent'."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ 
                mt: 3, 
                p: 2, 
                borderRadius: 1.5, 
                bgcolor: (theme) => alpha(theme.palette.info.main, 0.05),
                border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.1)}`
              }}>
                <Typography variant="subtitle2" sx={{ color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:info-circle-bold" width={18} />
                  Calculation Logic
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>• Hours ≥ Present Threshold → 1.0 Present</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>• Hours ≥ Half Day Threshold → 0.5 Present / 0.5 Absent</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>• Hours {'<'} Absent Threshold → 1.0 Absent</Typography>
                </Stack>
              </Box>
            </Box>
          )} */}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Section 2: Info */}
        <Box sx={{ 
          p: 2, 
          borderRadius: 1.5, 
          bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'grey.900',
          border: (theme) => `1px dashed ${theme.palette.divider}`
        }}>
          <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
            <Iconify icon={"solar:shield-warning-bold" as any} sx={{ color: 'warning.main', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 0.5, color: 'text.primary' }}>Important Note</Typography>
              <Typography variant="body2">
                Changing these settings will affect how the system automatically calculates Loss of Pay (LOP) and Gross Pay for all new salary slips. Existing slips will not be modified.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
