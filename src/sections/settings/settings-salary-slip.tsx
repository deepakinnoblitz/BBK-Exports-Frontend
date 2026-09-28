import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import { InputAdornment } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { COMMON_COLORS, COMMON_BUTTON_STYLES } from 'src/theme';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PTSlabItem {
  from_amount: number;
  to_amount: number | null;
  tax_amount: number;
}

const DEFAULT_PT_SLABS: PTSlabItem[] = [
  { from_amount: 0, to_amount: 20000, tax_amount: 0 },
  { from_amount: 20001, to_amount: 30000, tax_amount: 155 },
  { from_amount: 30001, to_amount: 45000, tax_amount: 375 },
  { from_amount: 45001, to_amount: 60000, tax_amount: 750 },
  { from_amount: 60001, to_amount: 75000, tax_amount: 1115 },
  { from_amount: 75001, to_amount: null, tax_amount: 1250 },
];

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsSalarySlip({ data, onChange }: Props) {
  const getParsedSlabs = (): PTSlabItem[] => {
    if (!data.pt_slabs) return DEFAULT_PT_SLABS;
    if (Array.isArray(data.pt_slabs)) return data.pt_slabs;
    try {
      const parsed = typeof data.pt_slabs === 'string' ? JSON.parse(data.pt_slabs) : data.pt_slabs;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
    return DEFAULT_PT_SLABS;
  };

  const slabs = getParsedSlabs();

  const handleUpdateSlab = (index: number, field: keyof PTSlabItem, val: any) => {
    const updated = slabs.map((item, i) => {
      if (i === index) {
        let parsedVal: any = val;
        if (field === 'to_amount') {
          parsedVal = val === '' || val === null || val === undefined ? null : Number(val);
        } else {
          parsedVal = val === '' ? 0 : Number(val);
        }
        return {
          ...item,
          [field]: parsedVal,
        };
      }
      return item;
    });
    onChange('pt_slabs', JSON.stringify(updated));
  };

  const handleAddSlab = () => {
    const last = slabs[slabs.length - 1];
    const nextFrom = last && last.to_amount != null ? Number(last.to_amount) + 1 : 0;
    const updated = [...slabs, { from_amount: nextFrom, to_amount: null, tax_amount: 0 }];
    onChange('pt_slabs', JSON.stringify(updated));
  };

  const handleRemoveSlab = (index: number) => {
    const updated = slabs.filter((_, i) => i !== index);
    onChange('pt_slabs', JSON.stringify(updated));
  };

  const handleResetSlabs = () => {
    onChange('pt_slabs', JSON.stringify(DEFAULT_PT_SLABS));
  };

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
                  <Iconify icon={"eva:info-outline" as any} width={16} sx={{ color: 'info.main', flexShrink: 0 }} />
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
                  <Iconify icon={"eva:info-outline" as any} width={16} sx={{ color: 'info.main', flexShrink: 0 }} />
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
                  <Iconify icon={"eva:info-outline" as any} width={16} sx={{ color: 'info.main', flexShrink: 0 }} />
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
                  <Iconify icon={"eva:info-outline" as any} width={16} sx={{ color: 'info.main', flexShrink: 0 }} />
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
                    <Iconify icon={"eva:info-outline" as any} width={16} sx={{ color: 'info.main', flexShrink: 0 }} />
                    Months in which the PT deduction will automatically apply.
                  </Typography>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* Dynamic PT Slab Configurator */}
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Professional Tax (PT) Slab Tiers
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Define the Gross salary ranges and their corresponding tax amounts. Leave Max Gross empty for the top slab (above).
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<Iconify icon="solar:restart-bold" />}
                  onClick={handleResetSlabs}
                  sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  Reset to Defaults
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Iconify icon="solar:add-circle-bold" />}
                  onClick={handleAddSlab}
                  sx={{
                    ...COMMON_BUTTON_STYLES.primary,
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Add Slab Tier
                </Button>
              </Stack>
            </Stack>

            <TableContainer
              sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
              }}
            >
              <Table size="small">
                <TableHead
                  sx={{
                    bgcolor: (theme) => (theme.palette.mode === 'light' ? '#f4f6f8' : 'background.neutral'),
                    '& th': {
                      color: 'text.secondary',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      py: 1.5,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  }}
                >
                  <TableRow>
                    <TableCell align="center" sx={{ width: 70 }}>S.No</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>Min Gross Salary (₹)</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Max Gross Salary (₹)</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>Tax / PT Amount (₹)</TableCell>
                    <TableCell align="center" sx={{ width: 80 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slabs.map((slab, index) => (
                    <TableRow
                      key={index}
                      hover
                      sx={{
                        '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}`, py: 1.25 },
                        '&:last-child td, &:last-child th': { borderBottom: 0 },
                      }}
                    >
                      <TableCell align="center">
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            display: 'flex',
                            borderRadius: '50%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: COMMON_COLORS.snoBadge.bg,
                            color: COMMON_COLORS.snoBadge.color,
                            typography: 'subtitle2',
                            fontWeight: 800,
                            border: COMMON_COLORS.snoBadge.border,
                            mx: 'auto',
                            transition: (theme) =>
                              theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                            '&:hover': {
                              bgcolor: COMMON_COLORS.snoBadge.hoverBg,
                              color: COMMON_COLORS.snoBadge.hoverColor,
                              transform: 'scale(1.1)',
                            },
                          }}
                        >
                          {index + 1}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={slab.from_amount ?? 0}
                          onChange={(e) => handleUpdateSlab(index, 'from_amount', e.target.value)}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                </InputAdornment>
                              ),
                            },
                            htmlInput: { min: 0, step: 1 },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.25,
                              bgcolor: (theme) =>
                                theme.palette.mode === 'light' ? '#FFFFFF' : 'background.paper',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          placeholder="No Limit (Above)"
                          value={slab.to_amount ?? ''}
                          onChange={(e) => handleUpdateSlab(index, 'to_amount', e.target.value)}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                </InputAdornment>
                              ),
                            },
                            htmlInput: { min: 0, step: 1 },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.25,
                              bgcolor: (theme) =>
                                theme.palette.mode === 'light' ? '#FFFFFF' : 'background.paper',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={slab.tax_amount ?? 0}
                          onChange={(e) => handleUpdateSlab(index, 'tax_amount', e.target.value)}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                </InputAdornment>
                              ),
                            },
                            htmlInput: { min: 0, step: 1 },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.25,
                              bgcolor: (theme) =>
                                theme.palette.mode === 'light' ? '#FFFFFF' : 'background.paper',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Delete Slab Tier">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={slabs.length <= 1}
                              onClick={() => handleRemoveSlab(index)}
                              sx={{
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                                },
                              }}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
                        <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
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
                        <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
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
