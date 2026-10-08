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
  LuHeartPulse,
  LuChevronDown,
  LuHardHat,
  LuMountain,
  LuBriefcase
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
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import { InputAdornment } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';

import { fetchSalaryComponents } from 'src/api/hr-management';

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

type CategoryKey = 'staff_ctc' | 'staff_non_ctc' | 'workers' | 'north_indian' | 'general';

const CATEGORIES: { key: CategoryKey; title: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    key: 'staff_ctc',
    title: 'Staff - CTC Settings',
    subtitle: 'Rules for Staff on CTC: Uncapped 12% PF on Basic+DA, Bonus/EL in Gross, ₹0 Employer EL/Bonus Provision',
    icon: <LuBriefcase size={20} style={{ color: '#6366f1' }} />,
  },
  {
    key: 'staff_non_ctc',
    title: 'Staff - Non CTC Settings',
    subtitle: 'Rules for Non-CTC Staff: Capped ₹1,800 PF (at ₹15k wage), Statutory ESI under ₹21k',
    icon: <LuUser size={20} style={{ color: '#8b5cf6' }} />,
  },
  {
    key: 'workers',
    title: 'Workers Settings',
    subtitle: 'Rules & statutory policies for Factory / Worker staff (2x OT, ₹1,500 Attendance Bonus, Capped PF)',
    icon: <LuHardHat size={20} style={{ color: '#d97706' }} />,
  },
  {
    key: 'north_indian',
    title: 'North Indian Settings',
    subtitle: 'Rules & hourly overtime rates for North Indian staff (₹100/hr OT, Capped PF)',
    icon: <LuMountain size={20} style={{ color: '#0288d1' }} />,
  },
  {
    key: 'general',
    title: 'Company Default Settings',
    subtitle: 'Default fallback salary calculation policies across all employee types',
    icon: <LuBuilding2 size={20} style={{ color: '#64748b' }} />,
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

  // Helper to read category-specific value or fallback
  const getFieldVal = (cat: CategoryKey, baseField: string, fallbackDefault: any = '') => {
    if (cat === 'staff_ctc') {
      const field = `staff_ctc_${baseField}`;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        return data[field];
      }
      if (baseField === 'apply_pf_ceiling') return 0;
      if (baseField === 'pf_wage_ceiling') return 0;
      if (baseField === 'employee_pf_max_amount') return 0;
      if (baseField === 'enable_bonus_provision') return 0;
      if (baseField === 'enable_el_provision') return 0;
      if (baseField === 'pf_wage_basis') return JSON.stringify(['Basic Pay', 'DA']);
    } else if (cat === 'staff_non_ctc') {
      const field = `staff_non_ctc_${baseField}`;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        return data[field];
      }
      if (baseField === 'apply_pf_ceiling') return 1;
      if (baseField === 'pf_wage_ceiling') return 15000;
      if (baseField === 'employee_pf_max_amount') return 1800;
    } else if (cat === 'workers') {
      const wField = `workers_${baseField}`;
      if (data[wField] !== undefined && data[wField] !== null && data[wField] !== '') {
        return data[wField];
      }
    } else if (cat === 'north_indian') {
      const niField = `north_indian_${baseField}`;
      if (data[niField] !== undefined && data[niField] !== null && data[niField] !== '') {
        return data[niField];
      }
    }
    return data[baseField] !== undefined && data[baseField] !== null ? data[baseField] : fallbackDefault;
  };

  // Helper to update category-specific field
  const setFieldVal = (cat: CategoryKey, baseField: string, value: any) => {
    if (cat === 'staff_ctc') {
      onChange(`staff_ctc_${baseField}`, value);
    } else if (cat === 'staff_non_ctc') {
      onChange(`staff_non_ctc_${baseField}`, value);
    } else if (cat === 'workers') {
      onChange(`workers_${baseField}`, value);
    } else if (cat === 'north_indian') {
      onChange(`north_indian_${baseField}`, value);
    } else {
      onChange(baseField, value);
    }
  };

  const isCheckEnabled = (val: any) => val === 1 || val === true || val === '1';

  // PT Slabs per Category
  const getParsedSlabs = (cat: CategoryKey): PTSlabItem[] => {
    const rawSlabs = getFieldVal(cat, 'pt_slabs');
    if (!rawSlabs) return DEFAULT_PT_SLABS;
    if (Array.isArray(rawSlabs)) return rawSlabs;
    try {
      const parsed = typeof rawSlabs === 'string' ? JSON.parse(rawSlabs) : rawSlabs;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
    return DEFAULT_PT_SLABS;
  };

  const handleUpdateSlab = (cat: CategoryKey, index: number, field: keyof PTSlabItem, val: any) => {
    const currentSlabs = getParsedSlabs(cat);
    const updated = currentSlabs.map((item, i) => {
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
    setFieldVal(cat, 'pt_slabs', JSON.stringify(updated));
  };

  const handleAddSlab = (cat: CategoryKey) => {
    const currentSlabs = getParsedSlabs(cat);
    const last = currentSlabs[currentSlabs.length - 1];
    const nextFrom = last && last.to_amount != null ? Number(last.to_amount) + 1 : 0;
    const updated = [...currentSlabs, { from_amount: nextFrom, to_amount: null, tax_amount: 0 }];
    setFieldVal(cat, 'pt_slabs', JSON.stringify(updated));
  };

  const handleRemoveSlab = (cat: CategoryKey, index: number) => {
    const currentSlabs = getParsedSlabs(cat);
    const updated = currentSlabs.filter((_, i) => i !== index);
    setFieldVal(cat, 'pt_slabs', JSON.stringify(updated));
  };

  const handleResetSlabs = (cat: CategoryKey) => {
    setFieldVal(cat, 'pt_slabs', JSON.stringify(DEFAULT_PT_SLABS));
  };

  // PF Components per Category
  const getSelectedPfComponents = (cat: CategoryKey): string[] => {
    const rawVal = getFieldVal(cat, 'pf_wage_basis');
    if (!rawVal) return earningOptions;
    if (Array.isArray(rawVal)) return rawVal;
    if (typeof rawVal === 'string') {
      try {
        const parsed = JSON.parse(rawVal);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        if (rawVal === 'Earned Basic + DA') {
          return earningOptions.filter((name: string) => /basic|da|dearness/i.test(name));
        }
        if (rawVal === 'Earned Gross (Basic + DA + Others)') {
          return earningOptions;
        }
        if (rawVal.includes(',')) {
          return rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        return [rawVal];
      }
    }
    return earningOptions;
  };

  // Common Accordion Wrapper
  const renderCategoryAccordion = (
    cat: typeof CATEGORIES[0],
    defaultExpanded: boolean,
    children: React.ReactNode
  ) => (
    <Accordion
      key={cat.key}
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: '12px !important',
        mb: 2.5,
        '&:before': { display: 'none' },
        boxShadow: 'none',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&.Mui-expanded': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.35),
          boxShadow: (theme) => `0 4px 16px ${alpha(theme.palette.common.black, 0.04)}`,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<LuChevronDown size={20} />}
        sx={{
          px: 3,
          py: 1.25,
          bgcolor: (theme) => alpha(theme.palette.grey[500], 0.03),
          borderBottom: '1px solid transparent',
          '&.Mui-expanded': {
            borderBottomColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
          },
          '& .MuiAccordionSummary-content': {
            my: 0.5,
            alignItems: 'center',
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', pr: 1 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {cat.icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {cat.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {cat.subtitle}
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: 'background.paper' }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );

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

      {/* Tab Panel 1: Salary Calculation Rules (Company-Wide) */}
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
                <Typography variant="h6">Salary Calculation Rules (Company-Wide)</Typography>
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

      {/* Tab Panel 2: Professional Tax (PT) Rules (With Collapsible per Category) */}
      {currentTab === 'pt_rules' && (
        <Box>
          {CATEGORIES.map((cat, idx) => {
            const slabs = getParsedSlabs(cat.key);
            const ptEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_pt', 1));
            const ptFreq = getFieldVal(cat.key, 'pt_deduction_frequency', 'Half-Yearly Deduction');
            const ptMonths = getFieldVal(cat.key, 'pt_half_yearly_months', 'April, September');

            return renderCategoryAccordion(
              cat,
              idx === 0, // Workers expanded by default
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Professional Tax (PT) Rules ({cat.title})
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Configure Professional Tax slab deduction rules and cycles for {cat.title}.
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: ptEnabled ? '#059669' : 'text.secondary',
                      }}
                    >
                      {ptEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <CustomSwitch
                      checked={ptEnabled}
                      onChange={(e) => setFieldVal(cat.key, 'enable_pt', e.target.checked ? 1 : 0)}
                    />
                  </Stack>
                </Stack>

                <Divider />

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: ptFreq === 'Half-Yearly Deduction' ? 6 : 12 }}>
                    <FormControl fullWidth>
                      <InputLabel id={`pt-freq-label-${cat.key}`}>PT Deduction Frequency</InputLabel>
                      <Select
                        labelId={`pt-freq-label-${cat.key}`}
                        id={`pt_deduction_frequency_${cat.key}`}
                        value={ptFreq}
                        label="PT Deduction Frequency"
                        onChange={(e) => setFieldVal(cat.key, 'pt_deduction_frequency', e.target.value)}
                        disabled={!ptEnabled}
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
                        {ptFreq === 'Every Month Deduction'
                          ? 'PT is deducted in every monthly salary slip based on monthly Gross.'
                          : 'Full PT slab amount is only deducted during designated half-yearly months.'}
                      </Typography>
                    </FormControl>
                  </Grid>

                  {ptFreq !== 'Every Month Deduction' && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel id={`pt-months-label-${cat.key}`}>PT Half-Yearly Cycle Months</InputLabel>
                        <Select
                          labelId={`pt-months-label-${cat.key}`}
                          id={`pt_half_yearly_months_${cat.key}`}
                          value={ptMonths}
                          label="PT Half-Yearly Cycle Months"
                          onChange={(e) => setFieldVal(cat.key, 'pt_half_yearly_months', e.target.value)}
                          disabled={!ptEnabled}
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
                        Professional Tax (PT) Slab Tiers ({cat.title})
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Define the Gross salary ranges and their corresponding tax amounts.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<LuRotateCcw size={15} />}
                        onClick={() => handleResetSlabs(cat.key)}
                        disabled={!ptEnabled}
                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                      >
                        Reset Defaults
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<LuCirclePlus size={15} />}
                        onClick={() => handleAddSlab(cat.key)}
                        disabled={!ptEnabled}
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
                      opacity: !ptEnabled ? 0.6 : 1,
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
                                onChange={(e) => handleUpdateSlab(cat.key, index, 'from_amount', e.target.value)}
                                disabled={!ptEnabled}
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
                                onChange={(e) => handleUpdateSlab(cat.key, index, 'to_amount', e.target.value)}
                                disabled={!ptEnabled}
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
                                onChange={(e) => handleUpdateSlab(cat.key, index, 'tax_amount', e.target.value)}
                                disabled={!ptEnabled}
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
                                onClick={() => handleRemoveSlab(cat.key, index)}
                                disabled={slabs.length <= 1 || !ptEnabled}
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
            );
          })}
        </Box>
      )}

      {/* Tab Panel 3: Employee Statutory Deductions (PF & ESI) (With Collapsible per Category) */}
      {currentTab === 'employee_statutory' && (
        <Box>
          {CATEGORIES.map((cat, idx) => {
            const autoPfEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_auto_pf', 1));
            const autoEsiEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_auto_esi', 1));
            const applyPfCeiling = isCheckEnabled(getFieldVal(cat.key, 'apply_pf_ceiling', cat.key === 'staff_ctc' ? 0 : 1));
            const selectedPfComps = getSelectedPfComponents(cat.key);

            return renderCategoryAccordion(
              cat,
              idx === 0,
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
                            color: autoPfEnabled ? '#059669' : 'text.secondary',
                          }}
                        >
                          {autoPfEnabled ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <CustomSwitch
                          checked={autoPfEnabled}
                          onChange={(e) => setFieldVal(cat.key, 'enable_auto_pf', e.target.checked ? 1 : 0)}
                        />
                      </Stack>
                    </Stack>

                    <Stack spacing={2.5}>
                      {/* Ceiling Toggle Switch */}
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
                          border: (theme) => `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Apply PF Wage Ceiling Cap (₹15,000 / ₹1,800 Cap)
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {applyPfCeiling
                              ? 'Deduction is capped at max ₹1,800 when wage basis exceeds ₹15,000.'
                              : 'Uncapped contribution: 12% is calculated on the entire wage basis.'}
                          </Typography>
                        </Box>
                        <CustomSwitch
                          checked={applyPfCeiling}
                          onChange={(e) => setFieldVal(cat.key, 'apply_pf_ceiling', e.target.checked ? 1 : 0)}
                          disabled={!autoPfEnabled}
                        />
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: applyPfCeiling ? 4 : 12 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Employee PF Rate (%)"
                            value={getFieldVal(cat.key, 'employee_pf_rate', '12')}
                            onChange={(e) => setFieldVal(cat.key, 'employee_pf_rate', e.target.value)}
                            placeholder="12"
                            helperText="Standard EPF rate (12%)."
                            disabled={!autoPfEnabled}
                            slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                              },
                              htmlInput: { min: 0, max: 100, step: 0.1 },
                            }}
                          />
                        </Grid>
                        {applyPfCeiling && (
                          <>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField
                                fullWidth
                                type="number"
                                label="PF Wage Ceiling"
                                value={getFieldVal(cat.key, 'pf_wage_ceiling', '15000')}
                                onChange={(e) => setFieldVal(cat.key, 'pf_wage_ceiling', e.target.value)}
                                placeholder="15000"
                                helperText="Statutory threshold (₹15,000)."
                                disabled={!autoPfEnabled}
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
                                label="Max PF Deduction"
                                value={getFieldVal(cat.key, 'employee_pf_max_amount', '1800')}
                                onChange={(e) => setFieldVal(cat.key, 'employee_pf_max_amount', e.target.value)}
                                placeholder="1800"
                                helperText="Cap applied when wage ≥ ceiling (₹1,800)."
                                disabled={!autoPfEnabled}
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
                          </>
                        )}
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
                              disabled={!autoPfEnabled}
                              onClick={() => setFieldVal(cat.key, 'pf_wage_basis', JSON.stringify(earningOptions))}
                              sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none' }}
                            >
                              Select All
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              color="inherit"
                              disabled={!autoPfEnabled}
                              onClick={() => setFieldVal(cat.key, 'pf_wage_basis', JSON.stringify([]))}
                              sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                            >
                              Clear
                            </Button>
                          </Stack>
                        </Stack>

                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          disabled={!autoPfEnabled}
                          options={earningOptions}
                          value={selectedPfComps}
                          onChange={(_event, newValue) => {
                            setFieldVal(cat.key, 'pf_wage_basis', JSON.stringify(newValue));
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
                              placeholder={selectedPfComps.length === 0 ? "Select components for PF calculation" : ""}
                              helperText={`Wage basis includes sum of ${selectedPfComps.length} selected earning component(s).`}
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
                            color: autoEsiEnabled ? '#059669' : 'text.secondary',
                          }}
                        >
                          {autoEsiEnabled ? 'Enabled' : 'Disabled'}
                        </Typography>
                        <CustomSwitch
                          checked={autoEsiEnabled}
                          onChange={(e) => setFieldVal(cat.key, 'enable_auto_esi', e.target.checked ? 1 : 0)}
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
                            value={getFieldVal(cat.key, 'employee_esi_rate', '0.75')}
                            onChange={(e) => setFieldVal(cat.key, 'employee_esi_rate', e.target.value)}
                            placeholder="0.75"
                            helperText="Standard employee contribution (0.75%)."
                            disabled={!autoEsiEnabled}
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
                            value={getFieldVal(cat.key, 'esi_wage_ceiling', '21000')}
                            onChange={(e) => setFieldVal(cat.key, 'esi_wage_ceiling', e.target.value)}
                            placeholder="21000"
                            helperText="Statutory threshold (Gross <= ₹21,000)."
                            disabled={!autoEsiEnabled}
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

                      <FormControl fullWidth disabled={!autoEsiEnabled}>
                        <InputLabel id={`esi-rounding-label-${cat.key}`}>ESI Rounding Method</InputLabel>
                        <Select
                          labelId={`esi-rounding-label-${cat.key}`}
                          id={`esi_rounding_method_${cat.key}`}
                          value={getFieldVal(cat.key, 'esi_rounding_method', 'Round Up to Next Rupee (ROUNDUP / CEIL)')}
                          label="ESI Rounding Method"
                          onChange={(e) => setFieldVal(cat.key, 'esi_rounding_method', e.target.value)}
                        >
                          <MenuItem value="Round Up to Next Rupee (ROUNDUP / CEIL)">Round Up to Next Rupee (ROUNDUP / CEIL)</MenuItem>
                          <MenuItem value="Standard Math Round (ROUND)">Standard Math Round (ROUND)</MenuItem>
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
            );
          })}
        </Box>
      )}

      {/* Tab Panel 4: Overtime, Allowance & Attendance Bonus (With Collapsible per Category) */}
      {currentTab === 'ot_bonus_rules' && (
        <Box>
          {CATEGORIES.map((cat, idx) => (
            renderCategoryAccordion(
              cat,
              idx === 0,
              <Stack spacing={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Overtime (OT) & Bonus Rules ({cat.title})
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -2 }}>
                  Configure Overtime formulas, hourly rates, and attendance bonus policies for {cat.title}.
                </Typography>

                <Grid container spacing={3}>
                  {(cat.key === 'workers' || cat.key === 'general') && (
                    <Grid size={{ xs: 12, sm: 6, md: cat.key === 'workers' ? 6 : 4 }}>
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
                  )}

                  {(cat.key === 'north_indian' || cat.key === 'general') && (
                    <Grid size={{ xs: 12, sm: 6, md: cat.key === 'north_indian' ? 12 : 4 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="North Indian OT Fixed Rate"
                        value={data.north_indian_ot_rate ?? '100'}
                        onChange={(e) => onChange('north_indian_ot_rate', e.target.value)}
                        placeholder="100"
                        helperText="Fixed hourly rate for North Indian Staff (OT Hours × Rate)."
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
                  )}

                  {(cat.key === 'workers' || cat.key === 'general') && (
                    <Grid size={{ xs: 12, sm: 6, md: cat.key === 'workers' ? 6 : 4 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Workers Attendance Bonus"
                        value={data.workers_attendance_bonus ?? '1500'}
                        onChange={(e) => onChange('workers_attendance_bonus', e.target.value)}
                        placeholder="1500"
                        helperText="Bonus awarded for Full Present (0 absent days)."
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
                  )}
                </Grid>
              </Stack>
            )
          ))}
        </Box>
      )}

      {/* Tab Panel 5: Employer Statutory Contributions & CTC Rules (With Collapsible per Category) */}
      {currentTab === 'employer_statutory' && (
        <Box>
          {CATEGORIES.map((cat, idx) => {
            const bonusEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_bonus_provision', 1));
            const elEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_el_provision', 1));
            const teaEnabled = isCheckEnabled(data.enable_workers_tea_allowance ?? 1);

            return renderCategoryAccordion(
              cat,
              idx === 0,
              <Stack spacing={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Employer Statutory Contributions & CTC Rules ({cat.title})
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -2 }}>
                  Configure employer contributions, PF/ESI rates, and CTC provisions for {cat.title}.
                </Typography>

                <Grid container spacing={2.5}>
                  {/* Employer PF Rate */}
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Employer PF Rate (%)"
                      value={getFieldVal(cat.key, 'employer_pf_rate', '12')}
                      onChange={(e) => setFieldVal(cat.key, 'employer_pf_rate', e.target.value)}
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
                      value={getFieldVal(cat.key, 'employer_pf_wage_ceiling', getFieldVal(cat.key, 'pf_wage_ceiling', '15000'))}
                      onChange={(e) => setFieldVal(cat.key, 'employer_pf_wage_ceiling', e.target.value)}
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
                      value={getFieldVal(cat.key, 'employer_pf_max_amount', '1800')}
                      onChange={(e) => setFieldVal(cat.key, 'employer_pf_max_amount', e.target.value)}
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
                      value={getFieldVal(cat.key, 'pf_admin_rate', '0.5')}
                      onChange={(e) => setFieldVal(cat.key, 'pf_admin_rate', e.target.value)}
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
                      value={getFieldVal(cat.key, 'edli_rate', '0.5')}
                      onChange={(e) => setFieldVal(cat.key, 'edli_rate', e.target.value)}
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
                      value={getFieldVal(cat.key, 'employer_esi_rate', '3.25')}
                      onChange={(e) => setFieldVal(cat.key, 'employer_esi_rate', e.target.value)}
                      placeholder="3.25"
                      helperText="ESI Contribution (Gross ≤ ₹21,000)."
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        },
                        htmlInput: { min: 0, max: 100, step: 0.05 },
                      }}
                    />
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
                              color: bonusEnabled ? '#059669' : 'text.secondary',
                            }}
                          >
                            {bonusEnabled ? 'Enabled' : 'Disabled'}
                          </Typography>
                          <CustomSwitch
                            checked={bonusEnabled}
                            onChange={(e) => setFieldVal(cat.key, 'enable_bonus_provision', e.target.checked ? 1 : 0)}
                          />
                        </Stack>
                      </Stack>

                      {bonusEnabled && (
                        <TextField
                          fullWidth
                          size="medium"
                          type="number"
                          label="Bonus Provision Rate (%)"
                          value={getFieldVal(cat.key, 'bonus_provision_rate', '8.33')}
                          onChange={(e) => setFieldVal(cat.key, 'bonus_provision_rate', e.target.value)}
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
                              color: elEnabled ? '#059669' : 'text.secondary',
                            }}
                          >
                            {elEnabled ? 'Enabled' : 'Disabled'}
                          </Typography>
                          <CustomSwitch
                            checked={elEnabled}
                            onChange={(e) => setFieldVal(cat.key, 'enable_el_provision', e.target.checked ? 1 : 0)}
                          />
                        </Stack>
                      </Stack>

                      {elEnabled && (
                        <TextField
                          fullWidth
                          size="medium"
                          type="number"
                          label="EL Provision Days / Year"
                          value={getFieldVal(cat.key, 'el_provision_days_per_year', '15.6')}
                          onChange={(e) => setFieldVal(cat.key, 'el_provision_days_per_year', e.target.value)}
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

                  {/* Tea Expenses (Employer) Card */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Tea Expenses (Employer CTC)
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Company tea expense incurred per day worked for {cat.title}.
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: isCheckEnabled(getFieldVal(cat.key, 'enable_tea_allowance', 1)) ? '#059669' : 'text.secondary',
                            }}
                          >
                            {isCheckEnabled(getFieldVal(cat.key, 'enable_tea_allowance', 1)) ? 'Enabled' : 'Disabled'}
                          </Typography>
                          <CustomSwitch
                            checked={isCheckEnabled(getFieldVal(cat.key, 'enable_tea_allowance', 1))}
                            onChange={(e) => setFieldVal(cat.key, 'enable_tea_allowance', e.target.checked ? 1 : 0)}
                          />
                        </Stack>
                      </Stack>

                      {isCheckEnabled(getFieldVal(cat.key, 'enable_tea_allowance', 1)) && (
                        <TextField
                          fullWidth
                          size="medium"
                          type="number"
                          label="Tea Expense Rate (₹/day)"
                          value={getFieldVal(cat.key, 'tea_allowance_per_day', cat.key.includes('staff') ? '14' : '5')}
                          onChange={(e) => setFieldVal(cat.key, 'tea_allowance_per_day', e.target.value)}
                          placeholder={cat.key.includes('staff') ? '14' : '5'}
                          helperText={`Calculated on Employer CTC (Present Days × ₹/day). Default: ₹${cat.key.includes('staff') ? '14' : '5'}/day.`}
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
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
