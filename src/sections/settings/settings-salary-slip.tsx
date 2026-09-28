import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';

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
            <Grid size={{ xs: 12, md: (data.salary_working_days_basis === 'Fixed Number of Days') ? 6 : 12 }}>
              <FormControl fullWidth>
                <InputLabel id="salary-working-days-basis-label">Working Days Basis</InputLabel>
                <Select
                  labelId="salary-working-days-basis-label"
                  id="salary_working_days_basis"
                  value={data.salary_working_days_basis || 'Actual Days in Month'}
                  label="Working Days Basis"
                  onChange={(e) => onChange('salary_working_days_basis', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Iconify icon={"solar:calendar-date-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Actual Days in Month">Actual Days in Month (Dynamic)</MenuItem>
                  <MenuItem value="Fixed Number of Days">Fixed Number of Days (Standard)</MenuItem>
                </Select>
                <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon={"solar:info-circle-bold" as any} width={16} />
                  Choose whether the monthly divisor is based on calendar days or a fixed number of days.
                </Typography>
              </FormControl>
            </Grid>

            {data.salary_working_days_basis === 'Fixed Number of Days' && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Fixed Working Days"
                  value={data.salary_fixed_working_days ?? '26'}
                  onChange={(e) => onChange('salary_fixed_working_days', e.target.value)}
                  placeholder="26"
                  helperText="Standard working days per month used as the divisor for daily wage and LOP."
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon={"solar:calculator-minimalistic-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                        </InputAdornment>
                      ),
                      endAdornment: <InputAdornment position="end">days</InputAdornment>,
                    },
                    htmlInput: {
                      min: 1,
                      max: 31,
                      step: 0.5,
                    },
                  }}
                />
              </Grid>
            )}

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
                </Select>
                <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon={"solar:info-circle-bold" as any} width={16} />
                  Source data for calculating present/absent days and overtime hours.
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
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Section 2: Professional Tax (PT) Settings */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <Iconify icon="solar:bill-list-bold" width={22} sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Professional Tax (PT) Rules</Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
            Configure the Professional Tax slab calculation cycle and deduction frequency.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: (data.pt_deduction_frequency === 'Half-Yearly Deduction') ? 6 : 12 }}>
              <FormControl fullWidth>
                <InputLabel id="pt-deduction-frequency-label">PT Deduction Frequency</InputLabel>
                <Select
                  labelId="pt-deduction-frequency-label"
                  id="pt_deduction_frequency"
                  value={data.pt_deduction_frequency || 'Half-Yearly Deduction'}
                  label="PT Deduction Frequency"
                  onChange={(e) => onChange('pt_deduction_frequency', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Iconify icon={"solar:history-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Half-Yearly Deduction">Option A: Half-Yearly Deduction (Standard Cycles)</MenuItem>
                  <MenuItem value="Every Month Deduction">Option B: Every Month Deduction</MenuItem>
                </Select>
                <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Iconify icon={"solar:info-circle-bold" as any} width={16} />
                  {data.pt_deduction_frequency === 'Every Month Deduction'
                    ? 'PT is deducted in every monthly salary slip based on monthly Gross.'
                    : 'Full PT slab amount is only deducted during designated half-yearly months.'}
                </Typography>
              </FormControl>
            </Grid>

            {data.pt_deduction_frequency !== 'Every Month Deduction' && (
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="pt-half-yearly-months-label">PT Half-Yearly Cycle Months</InputLabel>
                  <Select
                    labelId="pt-half-yearly-months-label"
                    id="pt_half_yearly_months"
                    value={data.pt_half_yearly_months || 'April, September'}
                    label="PT Half-Yearly Cycle Months"
                    onChange={(e) => onChange('pt_half_yearly_months', e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <Iconify icon={"solar:calendar-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="April, September">April & September</MenuItem>
                    <MenuItem value="March, September">March & September</MenuItem>
                    <MenuItem value="April, October">April & October</MenuItem>
                  </Select>
                  <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Iconify icon={"solar:info-circle-bold" as any} width={16} />
                    Months in which the PT deduction will automatically apply.
                  </Typography>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* PT Slab Info Box */}
          <Box sx={{
            mt: 3,
            p: 2.5,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
            border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.12)}`
          }}>
            <Typography variant="subtitle2" sx={{ color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:info-circle-bold" width={18} />
              Active Professional Tax (PT) Slabs
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              • Up to ₹20,000 → <b>₹0 (Nil)</b> | • ₹20,001 to ₹30,000 → <b>₹155.00</b> | • ₹30,001 to ₹45,000 → <b>₹375.00</b>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              • ₹45,001 to ₹60,000 → <b>₹750.00</b> | • ₹60,001 to ₹75,000 → <b>₹1,115.00</b> | • ₹75,001 and above → <b>₹1,250.00</b>
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Section 3: Overtime & Bonus Rules */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <Iconify icon="solar:wad-of-money-bold" width={22} sx={{ color: 'success.main' }} />
            <Typography variant="h6">Overtime (OT) & Attendance Bonus Rules</Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
            Configure role-based Overtime calculation formulas and attendance bonus policies.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Workers OT Multiplier"
                value={data.workers_ot_rate_multiplier ?? '2'}
                onChange={(e) => onChange('workers_ot_rate_multiplier', e.target.value)}
                placeholder="2"
                helperText="Double Rate: (Gross / 26 / 8) × OT Hours × Multiplier"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon={"solar:calculator-minimalistic-bold" as any} sx={{ color: 'text.disabled', ml: 1 }} />
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">x</InputAdornment>,
                  },
                  htmlInput: { min: 1, max: 5, step: 0.5 },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="North Indian OT Rate"
                value={data.north_indian_ot_rate ?? '100'}
                onChange={(e) => onChange('north_indian_ot_rate', e.target.value)}
                placeholder="100"
                helperText="Fixed hourly rate for North Indian Staff."
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">/hr</InputAdornment>,
                  },
                  htmlInput: { min: 0, step: 10 },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Workers Attendance Bonus"
                value={data.workers_attendance_bonus ?? '1500'}
                onChange={(e) => onChange('workers_attendance_bonus', e.target.value)}
                placeholder="1500"
                helperText="Bonus for 100% full attendance in month (0 absent/LOP)."
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { min: 0, step: 100 },
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Section 4: Info */}
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
                Changing these settings will affect how the system automatically calculates Loss of Pay (LOP), Overtime, Attendance Bonus, and Professional Tax for newly previewed and generated salary slips.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
