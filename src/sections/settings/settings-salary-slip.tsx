import { useState, useEffect } from 'react';
import { 
  LuCalculator, 
  LuReceipt, 
  LuShieldCheck, 
  LuGift, 
  LuBuilding2, 
  LuTriangleAlert, 
  LuCalendarDays, 
  LuCalendar,
  LuCalendarCheck,
  LuUser, 
  LuHistory, 
  LuInfo, 
  LuRotateCcw, 
  LuCirclePlus, 
  LuTrash2, 
  LuWallet, 
  LuHeartPulse 
} from 'react-icons/lu';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
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
import ListItemText from '@mui/material/ListItemText';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fetchSalaryComponents } from 'src/api/hr-management';
import { COMMON_COLORS, COMMON_BUTTON_STYLES } from 'src/theme';

import { CustomSwitch } from 'src/sections/email-settings/view/email-settings-view';

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

const SETTINGS_TABS = [
  {
    value: 'salary_rules',
    label: 'Salary Calculation Rules',
    icon: <LuCalculator size={19} />,
  },
  {
    value: 'pt_rules',
    label: 'Professional Tax (PT) Rules',
    icon: <LuReceipt size={19} />,
  },
  {
    value: 'employee_statutory',
    label: 'Employee Statutory (PF & ESI)',
    icon: <LuShieldCheck size={19} />,
  },
  {
    value: 'ot_bonus_rules',
    label: 'Overtime & Bonus Rules',
    icon: <LuGift size={19} />,
  },
  {
    value: 'employer_statutory',
    label: 'Employer Statutory & CTC',
    icon: <LuBuilding2 size={19} />,
  },
];

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsSalarySlip({ data, onChange }: Props) {
  const [currentTab, setCurrentTab] = useState('salary_rules');
  const [salaryComponents, setSalaryComponents] = useState<any[]>([]);

  useEffect(() => {
    fetchSalaryComponents()
      .then((comps) => {
        if (Array.isArray(comps)) {
          setSalaryComponents(comps);
        }
      })
      .catch((err) => console.error('Failed to load salary components for HRMS Settings:', err));
  }, []);

  const earningComponents = salaryComponents.filter((c) => c.type === 'Earning');
  const earningOptions = earningComponents.length > 0
    ? earningComponents.map((c) => c.component_name)
    : ['Basic Pay', 'DA', 'Other Allowance'];

  const getSelectedPfComponents = (): string[] => {
    if (!data.pf_wage_basis) return earningOptions;
    if (Array.isArray(data.pf_wage_basis)) return data.pf_wage_basis;
    if (typeof data.pf_wage_basis === 'string') {
      try {
        const parsed = JSON.parse(data.pf_wage_basis);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        if (data.pf_wage_basis === 'Earned Basic + DA') {
          return earningOptions.filter((name: string) => /basic|da|dearness/i.test(name));
        }
        if (data.pf_wage_basis === 'Earned Gross (Basic + DA + Others)') {
          return earningOptions;
        }
        if (data.pf_wage_basis.includes(',')) {
          return data.pf_wage_basis.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        return [data.pf_wage_basis];
      }
    }
    return earningOptions;
  };

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
    <Stack spacing={3}>
      {/* Top Tabs Navigation */}
      <Box
        sx={{
          width: 1,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          mb: 1,
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_e, val) => setCurrentTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              height: 2.5,
              borderRadius: '2px 2px 0 0',
              bgcolor: 'primary.main',
            },
          }}
        >
          {SETTINGS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{
                minWidth: 'auto',
                px: 2.5,
                minHeight: 48,
                fontSize: 14,
                textTransform: 'none',
                fontWeight: 500,
                color: 'text.secondary',
                gap: 1.25,
                '&:hover': {
                  color: 'text.primary',
                },
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 700,
                },
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Panel 1: Salary Calculation Rules */}
      {currentTab === 'salary_rules' && (
        <Card sx={{ p: 4, borderRadius: 3 }}>
          <Stack spacing={4}>
            {/* Important Note Banner */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              }}
            >
              <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', alignItems: 'flex-start' }}>
                <Box sx={{ color: 'warning.main', mt: 0.25, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <LuTriangleAlert size={22} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 0.5, color: 'text.primary', fontWeight: 700 }}>
                    Important Note
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Changing these settings will affect how the system automatically calculates Loss of Pay (LOP), Overtime, Attendance Bonus, and Professional Tax for newly previewed and generated salary slips.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                  <LuCalculator size={22} />
                </Box>
                <Typography variant="h6">Salary Calculation Rules</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
                Configure working days basis, calculation data sources, leave allocation rules, and holiday handling.
              </Typography>

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
                          <LuCalendarDays size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="Actual Days in Month">Actual Days in Month (Dynamic)</MenuItem>
                      <MenuItem value="Fixed Number of Days">Fixed Number of Days (Standard)</MenuItem>
                    </Select>
                    <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
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
                              <LuCalculator size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
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
                          <LuCalendar size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="Attendance">Attendance (Standard Records)</MenuItem>
                    </Select>
                    <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
                      Source data for calculating present/absent days and overtime hours.
                    </Typography>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="salary-leave-calculation-source-label">Leave Calculation Source</InputLabel>
                    <Select
                      labelId="salary-leave-calculation-source-label"
                      id="salary_leave_calculation_source"
                      value={data.salary_leave_calculation_source || 'Via Leave Application'}
                      label="Leave Calculation Source"
                      onChange={(e) => onChange('salary_leave_calculation_source', e.target.value)}
                      startAdornment={
                        <InputAdornment position="start">
                          <LuUser size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="Via Leave Application">Via Leave Application (Standard Requests)</MenuItem>
                      <MenuItem value="Via Direct Allocation">Via Direct Allocation (From Total Leaves Taken)</MenuItem>
                    </Select>
                    <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
                      {data.salary_leave_calculation_source === 'Via Direct Allocation'
                        ? 'Paid leaves are taken directly from Leave Allocation (Total Leaves Taken).'
                        : 'Paid leaves are calculated from approved Leave Application records.'}
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
                          <LuCalendarCheck size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="Include in Working Days">Include in Working Days (Paid)</MenuItem>
                      <MenuItem value="Exclude from Working Days">Exclude from Working Days (Unpaid)</MenuItem>
                    </Select>
                    <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
                      Determines if holidays count towards the monthly working days.
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Card>
      )}

      {/* Tab Panel 2: Professional Tax (PT) Rules */}
      {currentTab === 'pt_rules' && (
        <Card sx={{ p: 4, borderRadius: 3 }}>
          <Stack spacing={3.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                  <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                    <LuReceipt size={22} />
                  </Box>
                  <Typography variant="h6">Professional Tax (PT) Rules</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Configure the Professional Tax slab calculation cycle, deduction frequency, and statutory slabs.
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: (data.enable_pt !== 0 && data.enable_pt !== false && data.enable_pt !== '0') ? '#059669' : 'text.secondary',
                  }}
                >
                  {(data.enable_pt !== 0 && data.enable_pt !== false && data.enable_pt !== '0') ? 'Enabled' : 'Disabled'}
                </Typography>
                <CustomSwitch
                  checked={data.enable_pt !== 0 && data.enable_pt !== false && data.enable_pt !== '0'}
                  onChange={(e) => onChange('enable_pt', e.target.checked ? 1 : 0)}
                />
              </Stack>
            </Stack>

            <Divider />

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
                    disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                    startAdornment={
                      <InputAdornment position="start">
                        <LuHistory size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="Half-Yearly Deduction">Option A: Half-Yearly Deduction (Standard Cycles)</MenuItem>
                    <MenuItem value="Every Month Deduction">Option B: Every Month Deduction</MenuItem>
                  </Select>
                  <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
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
                      disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                      startAdornment={
                        <InputAdornment position="start">
                          <LuCalendarDays size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="April, September">April & September</MenuItem>
                      <MenuItem value="March, September">March & September</MenuItem>
                      <MenuItem value="April, October">April & October</MenuItem>
                    </Select>
                    <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
                      Months in which the PT deduction will automatically apply.
                    </Typography>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            {/* Dynamic PT Slab Configurator */}
            <Box sx={{ mt: 1 }}>
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
                    startIcon={<LuRotateCcw size={15} />}
                    onClick={handleResetSlabs}
                    disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                    sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                  >
                    Reset Defaults
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<LuCirclePlus size={15} />}
                    onClick={handleAddSlab}
                    disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      bgcolor: 'primary.main',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    Add Slab Tier
                  </Button>
                </Stack>
              </Stack>

              <TableContainer
                sx={{
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  opacity: (data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0') ? 0.6 : 1,
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Min Gross Salary (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Max Gross Salary (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tax Deducted (₹)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slabs.map((slab, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={slab.from_amount}
                            onChange={(e) => handleUpdateSlab(index, 'from_amount', e.target.value)}
                            disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: { min: 0 },
                            }}
                            sx={{ width: 160 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Above (No Limit)"
                            value={slab.to_amount ?? ''}
                            onChange={(e) => handleUpdateSlab(index, 'to_amount', e.target.value)}
                            disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                            slotProps={{
                              input: {
                                startAdornment: slab.to_amount != null ? (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                  </InputAdornment>
                                ) : undefined,
                              },
                              htmlInput: { min: 0 },
                            }}
                            sx={{ width: 180 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={slab.tax_amount}
                            onChange={(e) => handleUpdateSlab(index, 'tax_amount', e.target.value)}
                            disabled={data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0'}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: { min: 0 },
                            }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveSlab(index)}
                            disabled={slabs.length <= 1 || (data.enable_pt === 0 || data.enable_pt === false || data.enable_pt === '0')}
                          >
                            <LuTrash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </Card>
      )}

      {/* Tab Panel 3: Employee Statutory Deductions (PF & ESI) */}
      {currentTab === 'employee_statutory' && (
        <Card sx={{ p: 4, borderRadius: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                  <LuShieldCheck size={22} />
                </Box>
                <Typography variant="h6">Employee Statutory Deductions (PF & ESI) Rules</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
                Configure automatic Employee Provident Fund (PF) and Employee State Insurance (ESI) deduction formulas, rates, and statutory ceilings.
              </Typography>

              <Grid container spacing={3}>
                {/* PF Config Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LuWallet size={20} style={{ color: 'var(--mui-palette-primary-main, #00A76F)' }} />
                          Employee PF (Provident Fund)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Auto-calculate EPF deduction based on earned wage & ceiling cap.
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: (data.enable_auto_pf !== 0 && data.enable_auto_pf !== false && data.enable_auto_pf !== '0') ? '#059669' : 'text.secondary',
                          }}
                        >
                          {(data.enable_auto_pf !== 0 && data.enable_auto_pf !== false && data.enable_auto_pf !== '0') ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <CustomSwitch
                          checked={data.enable_auto_pf !== 0 && data.enable_auto_pf !== false && data.enable_auto_pf !== '0'}
                          onChange={(e) => onChange('enable_auto_pf', e.target.checked ? 1 : 0)}
                        />
                      </Stack>
                    </Stack>

                    <Stack spacing={2.5}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Employee PF Rate (%)"
                            value={data.employee_pf_rate ?? '12'}
                            onChange={(e) => onChange('employee_pf_rate', e.target.value)}
                            placeholder="12"
                            helperText="Standard EPF rate (12%)."
                            disabled={data.enable_auto_pf === 0 || data.enable_auto_pf === false || data.enable_auto_pf === '0'}
                            slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                              },
                              htmlInput: { min: 0, max: 100, step: 0.1 },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="PF Wage Ceiling"
                            value={data.pf_wage_ceiling ?? '15000'}
                            onChange={(e) => onChange('pf_wage_ceiling', e.target.value)}
                            placeholder="15000"
                            helperText="Wage threshold (e.g. ₹15,000)."
                            disabled={data.enable_auto_pf === 0 || data.enable_auto_pf === false || data.enable_auto_pf === '0'}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: { min: 0, step: 1000 },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Max Employee PF Deduction"
                            value={data.employee_pf_max_amount ?? '1800'}
                            onChange={(e) => onChange('employee_pf_max_amount', e.target.value)}
                            placeholder="1800"
                            helperText="Cap applied when wage ≥ ceiling (₹1,800)."
                            disabled={data.enable_auto_pf === 0 || data.enable_auto_pf === false || data.enable_auto_pf === '0'}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: { min: 0, step: 100 },
                            }}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ width: '100%' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            PF Wage Basis Components
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Button
                              size="small"
                              variant="text"
                              disabled={data.enable_auto_pf === 0 || data.enable_auto_pf === false || data.enable_auto_pf === '0'}
                              onClick={() => onChange('pf_wage_basis', JSON.stringify(earningOptions))}
                              sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none' }}
                            >
                              Select All
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              color="inherit"
                              disabled={data.enable_auto_pf === 0 || data.enable_auto_pf === false || data.enable_auto_pf === '0'}
                              onClick={() => onChange('pf_wage_basis', JSON.stringify([]))}
                              sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                            >
                              Clear
                            </Button>
                          </Stack>
                        </Stack>

                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          disabled={data.enable_auto_pf === 0 || data.enable_auto_pf === false || data.enable_auto_pf === '0'}
                          options={earningOptions}
                          value={getSelectedPfComponents()}
                          onChange={(_event, newValue) => {
                            onChange('pf_wage_basis', JSON.stringify(newValue));
                          }}
                          renderOption={(props, option, { selected }) => (
                            <li {...props} key={option}>
                              <Checkbox
                                size="small"
                                checked={selected}
                                sx={{ mr: 1, p: 0.5 }}
                              />
                              <Typography variant="body2">{option}</Typography>
                            </li>
                          )}
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
                              <Chip
                                label={option}
                                size="small"
                                {...getTagProps({ index })}
                                key={option}
                                sx={{
                                  borderRadius: '6px',
                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.dark',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  height: 24,
                                }}
                              />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={getSelectedPfComponents().length === 0 ? "Select components for PF calculation" : ""}
                              helperText={`Wage basis includes sum of ${getSelectedPfComponents().length} selected earning component(s).`}
                            />
                          )}
                        />
                      </Box>
                    </Stack>
                  </Box>
                </Grid>

                {/* ESI Config Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
                      border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LuHeartPulse size={20} style={{ color: '#0288d1' }} />
                          Employee ESI (State Insurance)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Auto-calculate ESI if gross wage is within eligibility ceiling.
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: (data.enable_auto_esi !== 0 && data.enable_auto_esi !== false && data.enable_auto_esi !== '0') ? '#059669' : 'text.secondary',
                          }}
                        >
                          {(data.enable_auto_esi !== 0 && data.enable_auto_esi !== false && data.enable_auto_esi !== '0') ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <CustomSwitch
                          checked={data.enable_auto_esi !== 0 && data.enable_auto_esi !== false && data.enable_auto_esi !== '0'}
                          onChange={(e) => onChange('enable_auto_esi', e.target.checked ? 1 : 0)}
                        />
                      </Stack>
                    </Stack>

                    <Stack spacing={2.5}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Employee ESI Rate (%)"
                            value={data.employee_esi_rate ?? '0.75'}
                            onChange={(e) => onChange('employee_esi_rate', e.target.value)}
                            placeholder="0.75"
                            helperText="Standard employee contribution (0.75%)."
                            disabled={data.enable_auto_esi === 0 || data.enable_auto_esi === false || data.enable_auto_esi === '0'}
                            slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                              },
                              htmlInput: { min: 0, max: 100, step: 0.05 },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="ESI Wage Ceiling"
                            value={data.esi_wage_ceiling ?? '21000'}
                            onChange={(e) => onChange('esi_wage_ceiling', e.target.value)}
                            placeholder="21000"
                            helperText="Statutory threshold (Gross <= ₹21,000)."
                            disabled={data.enable_auto_esi === 0 || data.enable_auto_esi === false || data.enable_auto_esi === '0'}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: { min: 0, step: 1000 },
                            }}
                          />
                        </Grid>
                      </Grid>

                      <FormControl fullWidth disabled={data.enable_auto_esi === 0 || data.enable_auto_esi === false || data.enable_auto_esi === '0'}>
                        <InputLabel id="esi-wage-basis-label">ESI Wage Basis</InputLabel>
                        <Select
                          labelId="esi-wage-basis-label"
                          id="esi_wage_basis"
                          value={data.esi_wage_basis || 'Earned Gross Salary'}
                          label="ESI Wage Basis"
                          onChange={(e) => onChange('esi_wage_basis', e.target.value)}
                        >
                          <MenuItem value="Earned Gross Salary">Earned Gross Salary (Standard Statutory)</MenuItem>
                        </Select>
                        <Typography variant="caption" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LuInfo size={15} style={{ color: '#0288d1', flexShrink: 0 }} />
                          ESI 0.75% is applied on full Earned Gross if standard wage is ≤ ₹21,000.
                        </Typography>
                      </FormControl>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Card>
      )}

      {/* Tab Panel 4: Overtime, Allowance & Attendance Bonus */}
      {currentTab === 'ot_bonus_rules' && (
        <Card sx={{ p: 4, borderRadius: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                  <LuGift size={22} />
                </Box>
                <Typography variant="h6">Overtime (OT), Allowance & Attendance Bonus Rules</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
                Configure role-based Overtime calculation formulas, tea allowances, and attendance bonus policies.
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                            <LuCalculator size={18} style={{ opacity: 0.6, marginLeft: 8 }} />
                          </InputAdornment>
                        ),
                        endAdornment: <InputAdornment position="end">x</InputAdornment>,
                      },
                      htmlInput: { min: 1, max: 5, step: 0.5 },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Workers Attendance Bonus"
                    value={data.workers_attendance_bonus ?? '1500'}
                    onChange={(e) => onChange('workers_attendance_bonus', e.target.value)}
                    placeholder="1500"
                    helperText="Bonus awarded for Full Present (0 LOP days)."
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

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Workers Tea Allowance"
                    value={data.workers_tea_allowance_per_day ?? '5'}
                    onChange={(e) => onChange('workers_tea_allowance_per_day', e.target.value)}
                    placeholder="5"
                    helperText="Allowance per day worked (Days Worked × ₹/day)."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                          </InputAdornment>
                        ),
                        endAdornment: <InputAdornment position="end">/day</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: 1 },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Card>
      )}

      {/* Tab Panel 5: Employer Statutory Contributions & CTC Rules */}
      {currentTab === 'employer_statutory' && (
        <Card sx={{ p: 4, borderRadius: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ color: '#0288d1', display: 'flex', alignItems: 'center' }}>
                  <LuBuilding2 size={22} />
                </Box>
                <Typography variant="h6">Employer Statutory Contributions & CTC Rules</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3, display: 'block' }}>
                Configure employer statutory contribution percentages, administrative charges, and annual CTC provision policies.
              </Typography>

              <Grid container spacing={2.5}>
                {/* Employer PF Rate */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Employer PF Rate (%)"
                    value={data.employer_pf_rate ?? '12'}
                    onChange={(e) => onChange('employer_pf_rate', e.target.value)}
                    placeholder="12"
                    helperText="Statutory EPF rate: 12%."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                      htmlInput: { min: 0, max: 100, step: 0.1 },
                    }}
                  />
                </Grid>

                {/* Employer PF Wage Ceiling */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Employer PF Wage Ceiling"
                    value={data.employer_pf_wage_ceiling ?? data.pf_wage_ceiling ?? '15000'}
                    onChange={(e) => onChange('employer_pf_wage_ceiling', e.target.value)}
                    placeholder="15000"
                    helperText="Wage basis threshold (e.g. ₹15,000)."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                          </InputAdornment>
                        ),
                      },
                      htmlInput: { min: 0, step: 1000 },
                    }}
                  />
                </Grid>

                {/* Max Employer PF Contribution */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Employer PF Contribution"
                    value={data.employer_pf_max_amount ?? '1800'}
                    onChange={(e) => onChange('employer_pf_max_amount', e.target.value)}
                    placeholder="1800"
                    helperText="Contribution cap applied when wage ≥ ceiling (₹1,800)."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', mr: 0.25 }}>₹</Typography>
                          </InputAdornment>
                        ),
                      },
                      htmlInput: { min: 0, step: 100 },
                    }}
                  />
                </Grid>

                {/* PF Admin Charges */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="PF Admin Charges (%)"
                    value={data.pf_admin_rate ?? '0.5'}
                    onChange={(e) => onChange('pf_admin_rate', e.target.value)}
                    placeholder="0.5"
                    helperText="EPFO Admin charges rate."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                      htmlInput: { min: 0, max: 10, step: 0.01 },
                    }}
                  />
                </Grid>

                {/* EDLI Charges */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="EDLI Charges (%)"
                    value={data.edli_rate ?? '0.5'}
                    onChange={(e) => onChange('edli_rate', e.target.value)}
                    placeholder="0.5"
                    helperText="Deposit Linked Insurance."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                      htmlInput: { min: 0, max: 10, step: 0.01 },
                    }}
                  />
                </Grid>

                {/* Employer ESI Rate */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Employer ESI Rate (%)"
                    value={data.employer_esi_rate ?? '3.25'}
                    onChange={(e) => onChange('employer_esi_rate', e.target.value)}
                    placeholder="3.25"
                    helperText="ESI Contribution (Gross ≤ ₹21,000)."
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                      htmlInput: { min: 0, max: 100, step: 0.05 },
                    }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Section 7: Mail Notification Settings */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Typography variant="h6">Mail Notification Settings</Typography>
          </Stack>

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
              <Iconify icon={"solar:bill-bold-duotone" as any} width={28} />
            </Box>

            <ListItemText
              primary="Salary Slip Mail"
              secondary="Receive email alerts when salary slips are generated or submitted."
              primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 'fontWeightBold' }}
              secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
            />

            <CustomSwitch
              checked={data.salary_slip_notification !== 0 && data.salary_slip_notification !== false && data.salary_slip_notification !== '0'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange('salary_slip_notification', event.target.checked ? 1 : 0)}
            />
          </Stack>
        </Box>
      </Stack>
    </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* Bonus Provision Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Bonus Provision (Payment of Bonus Act)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Calculate monthly bonus provision towards annual bonus payment.
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: (data.enable_bonus_provision !== 0 && data.enable_bonus_provision !== false && data.enable_bonus_provision !== '0') ? '#059669' : 'text.secondary',
                          }}
                        >
                          {(data.enable_bonus_provision !== 0 && data.enable_bonus_provision !== false && data.enable_bonus_provision !== '0') ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <CustomSwitch
                          checked={data.enable_bonus_provision !== 0 && data.enable_bonus_provision !== false && data.enable_bonus_provision !== '0'}
                          onChange={(e) => onChange('enable_bonus_provision', e.target.checked ? 1 : 0)}
                        />
                      </Stack>
                    </Stack>

                    {(data.enable_bonus_provision !== 0 && data.enable_bonus_provision !== false && data.enable_bonus_provision !== '0') && (
                      <TextField
                        fullWidth
                        size="medium"
                        type="number"
                        label="Bonus Provision Rate (%)"
                        value={data.bonus_provision_rate ?? '8.33'}
                        onChange={(e) => onChange('bonus_provision_rate', e.target.value)}
                        placeholder="8.33"
                        helperText="Default standard statutory rate: 8.33% (1 month basic pay/year)."
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          },
                          htmlInput: { min: 0, max: 100, step: 0.01 },
                        }}
                      />
                    )}
                  </Box>
                </Grid>

                {/* Earned Leave (EL) Provision Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                      border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Earned Leave (EL) Provision
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Calculate monthly provision for annual earned leave accruals.
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: (data.enable_el_provision !== 0 && data.enable_el_provision !== false && data.enable_el_provision !== '0') ? '#059669' : 'text.secondary',
                          }}
                        >
                          {(data.enable_el_provision !== 0 && data.enable_el_provision !== false && data.enable_el_provision !== '0') ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <CustomSwitch
                          checked={data.enable_el_provision !== 0 && data.enable_el_provision !== false && data.enable_el_provision !== '0'}
                          onChange={(e) => onChange('enable_el_provision', e.target.checked ? 1 : 0)}
                        />
                      </Stack>
                    </Stack>

                    {(data.enable_el_provision !== 0 && data.enable_el_provision !== false && data.enable_el_provision !== '0') && (
                      <TextField
                        fullWidth
                        size="medium"
                        type="number"
                        label="EL Provision Days / Year"
                        value={data.el_provision_days_per_year ?? '15.6'}
                        onChange={(e) => onChange('el_provision_days_per_year', e.target.value)}
                        placeholder="15.6"
                        helperText="Formula: (Basic / 26) × (EL Days / 12 months). Default: 15.6 days."
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end">days/yr</InputAdornment>,
                          },
                          htmlInput: { min: 0, max: 365, step: 0.1 },
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
