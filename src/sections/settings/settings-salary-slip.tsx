import dayjs from 'dayjs';
import { useState, useEffect, startTransition } from 'react';
import { 
  LuCar, 
  LuGift, 
  LuUser, 
  LuInfo, 
  LuPlus, 
  LuTrash2, 
  LuWallet,
  LuCoffee,
  LuLayers, 
  LuReceipt, 
  LuHistory, 
  LuHardHat, 
  LuCalendar, 
  LuMountain, 
  LuUtensils, 
  LuBuilding2,
  LuRotateCcw,
  LuBriefcase,
  LuCalculator,
  LuCirclePlus,
  LuHeartPulse,
  LuShieldCheck,
  LuChevronDown,
  LuCalendarDays,
  LuTriangleAlert,
  LuCalendarCheck
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
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { fetchSalaryComponents } from 'src/api/hr-management';
import { fetchDepartments, fetchDesignations, fetchEmployeeTypes } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { CustomSwitch } from 'src/sections/email-settings/view/email-settings-view';
import { EmployeeSelectorDialog } from 'src/sections/shift-rotation/employee-selector-dialog';

// ----------------------------------------------------------------------

export interface CustomSalaryRule {
  id: string;
  name: string;
  type: 'Earning' | 'Deduction';
  enabled: boolean | number;
  calculation_mode: 'fixed' | 'per_day' | 'per_ot_hour' | 'percent_gross' | 'percent_component';
  selected_components?: string[];
  amount: number | '';
  applicability: 'always_active' | 'specific_month';
  applicable_month?: string;
  target_type: 'all' | 'categories' | 'assignees';
  target_categories?: string[];
  target_employee_ids?: string[];
  description?: string;
}

export interface BonusScheme {
  id: string;
  scheme_name: string;
  is_active: number | boolean | string;
  payout_months: string[];
  categories: string[];
  departments?: string[];
  designations?: string[];
  calc_method: 'Percentage of Selected Components' | 'Percentage of Gross' | 'Flat Fixed Amount' | string;
  calculation_components?: string[];
  percentage?: number | '';
  wage_ceiling?: number;
  flat_amount?: number;
  payout_month?: string;
  components?: string[];
}

export interface OtherOvertimeRule {
  id: string;
  employee_type: string;
  enabled: number | boolean;
  calculation_type: 'gross' | 'fixed';
  multiplier: number;
  fixed_rate: number;
  working_days_basis: number;
  shift_hours: number;
  attendance_bonus: number;
  notes?: string;
}

const BONUS_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'staff_ctc', label: 'Staff - CTC' },
  { value: 'staff_non_ctc', label: 'Staff - Non CTC' },
  { value: 'workers', label: 'Workers' },
  { value: 'north_indian', label: 'North Indian Workers' },
  { value: 'drivers', label: 'Drivers' },
];

const ALL_CATEGORY_VALUES = ['staff_ctc', 'staff_non_ctc', 'workers', 'north_indian', 'drivers'];

const BONUS_CALC_METHODS = [
  'Percentage of Selected Components',
  'Percentage of Gross',
  'Flat Fixed Amount',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

export interface OtherPTRule {
  id: string;
  employee_type: string;
  enabled: number | boolean;
  pt_deduction_frequency: 'Half-Yearly Deduction' | 'Every Month Deduction';
  pt_half_yearly_months: string;
  pt_deduction_component?: string;
  pt_slabs: PTSlabItem[];
  notes?: string;
}

export interface OtherStatutoryRule {
  id: string;
  employee_type: string;
  enabled: number | boolean;
  // Employee PF
  enable_auto_pf: number | boolean;
  pf_deduction_component?: string;
  apply_pf_ceiling: number | boolean;
  employee_pf_rate: number;
  pf_wage_ceiling: number;
  employee_pf_max_amount: number;
  pf_wage_basis: string[];
  // Employee ESI
  enable_auto_esi: number | boolean;
  esi_deduction_component?: string;
  employee_esi_rate: number;
  esi_wage_ceiling: number;
  // Tea Deduction
  enable_employee_tea_deduction: number | boolean;
  tea_deduction_component?: string;
  employee_tea_deduction_per_day: number;
  // Canteen Deduction
  enable_employee_canteen_deduction: number | boolean;
  canteen_deduction_component?: string;
  employee_canteen_deduction_per_meal: number;
  notes?: string;
}

export interface OtherEmployerStatutoryRule {
  id: string;
  employee_type: string;
  enabled: number | boolean;
  // Employer PF
  employer_pf_rate: number;
  employer_pf_wage_ceiling: number;
  employer_pf_max_amount: number;
  pf_admin_edli_basis: 'Statutory PF Wage (Capped at Ceiling)' | 'Percentage of Gross Salary' | 'Actual PF Wage (Uncapped)';
  pf_admin_edli_gross_percent: number;
  pf_admin_rate: number;
  edli_rate: number;
  // Employer ESI
  employer_esi_rate: number;
  esi_wage_ceiling: number;
  // Bonus Provision
  enable_bonus_provision: number | boolean;
  bonus_provision_rate: number;
  // EL Provision
  enable_el_provision: number | boolean;
  el_provision_days_per_year: number;
  // Tea Expenses (Employer CTC)
  enable_tea_allowance: number | boolean;
  tea_allowance_per_day: number;
  // Lunch Expenses (Employer CTC)
  enable_lunch_allowance: number | boolean;
  lunch_allowance_per_meal: number;
  notes?: string;
}

export interface TDSSlabItem {
  from_amount: number;
  to_amount: number | null;
  rate_percent: number;
}

const DEFAULT_TDS_NEW_SLABS: TDSSlabItem[] = [
  { from_amount: 0, to_amount: 300000, rate_percent: 0 },
  { from_amount: 300001, to_amount: 700000, rate_percent: 5 },
  { from_amount: 700001, to_amount: 1000000, rate_percent: 10 },
  { from_amount: 1000001, to_amount: 1200000, rate_percent: 15 },
  { from_amount: 1200001, to_amount: 1500000, rate_percent: 20 },
  { from_amount: 1500001, to_amount: null, rate_percent: 30 },
];

const DEFAULT_TDS_OLD_SLABS: TDSSlabItem[] = [
  { from_amount: 0, to_amount: 250000, rate_percent: 0 },
  { from_amount: 250001, to_amount: 500000, rate_percent: 5 },
  { from_amount: 500001, to_amount: 1000000, rate_percent: 20 },
  { from_amount: 1000001, to_amount: null, rate_percent: 30 },
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
    label: 'Employee Statutory & Deductions',
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
  {
    value: 'lwf_rules',
    label: 'Labour Welfare Fund (LWF)',
    icon: <LuHeartPulse size={19} />,
  },
  {
    value: 'tds_rules',
    label: 'TDS (Income Tax) Rules',
    icon: <LuCalculator size={19} />,
  },
  {
    value: 'custom_components',
    label: 'Custom Earnings & Deductions',
    icon: <LuLayers size={19} />,
  },
];

type CategoryKey = 'staff_ctc' | 'staff_non_ctc' | 'workers' | 'north_indian' | 'drivers' | 'general';

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
    key: 'drivers',
    title: 'Drivers Settings',
    subtitle: 'Rules for Drivers: Fixed 26-Day basis, 2x OT, Capped PF, ₹5/day Tea Allowance, Bonus & EL Provisions',
    icon: <LuCar size={20} style={{ color: '#10b981' }} />,
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
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    salary_rules: true,
  });

  const handleTabChange = (_e: React.SyntheticEvent, val: string) => {
    setVisitedTabs((prev) => (prev[val] ? prev : { ...prev, [val]: true }));
    startTransition(() => {
      setCurrentTab(val);
    });
  };

  const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [, setDesignationOptions] = useState<string[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchSalaryComponents()
      .then((comps) => {
        if (Array.isArray(comps)) {
          setSalaryComponents(comps);
        }
      })
      .catch((err) => console.error('Failed to load salary components for HRMS Settings:', err));

    fetchDepartments({ page_size: 100 })
      .then((res: any) => {
        const list = res?.data || [];
        setDepartmentOptions(list.map((d: any) => d.department_name || d.name).filter(Boolean));
      })
      .catch((err) => console.error('Failed to load departments:', err));

    fetchDesignations({ page_size: 100 })
      .then((res: any) => {
        const list = res?.data || [];
        setDesignationOptions(list.map((d: any) => d.designation_name || d.name).filter(Boolean));
      })
      .catch((err) => console.error('Failed to load designations:', err));

    fetchEmployeeTypes({ page_size: 100 })
      .then((res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setEmployeeTypes(list.map((et: any) => et.employee_type || et.name).filter(Boolean));
        }
      })
      .catch((err) => console.error('Failed to load employee types for HRMS Settings:', err));
  }, []);

  const earningComponents = salaryComponents.filter((c) => c.type === 'Earning');
  const earningOptions = earningComponents.length > 0
    ? earningComponents.map((c) => c.component_name)
    : ['Basic Pay', 'DA', 'Other Allowance'];

  const deductionComponents = salaryComponents.filter((c) => c.type === 'Deduction');
  const deductionOptions = deductionComponents.length > 0
    ? Array.from(new Set(['Professional Tax', 'Prof.Tax', 'PF', 'ESI', 'Labour Welfare Fund', 'LWF', ...deductionComponents.map((c) => c.component_name || c.name).filter(Boolean)]))
    : ['Professional Tax', 'Prof.Tax', 'PF', 'ESI', 'ESI/Health Insurance', 'TDS', 'Labour Welfare Fund', 'LWF', 'Loan Recovery', 'Canteen', 'Uniform', 'ADV'];

  const DEFAULT_EMPLOYEE_TYPES = [
    'Staff - CTC',
    'Staff - Non CTC',
    'Workers',
    'North Indian - CTC',
    'North Indian - Non CTC',
    'Drivers',
    'House Keeping',
    'Security',
    'STP',
    'Contractor',
    'STP Employees',
  ];

  const allEmployeeTypeOptions = employeeTypes.length > 0
    ? employeeTypes
    : DEFAULT_EMPLOYEE_TYPES;

  const allMasterComponents = salaryComponents.map((c) => c.component_name || c.name).filter(Boolean);
  const allComponentOptions = allMasterComponents.length > 0
    ? allMasterComponents
    : ['Basic Pay', 'DA', 'HRA', 'Attendance Bonus', 'Tea Allowance', 'Other Allowances', 'Medical Allowances', 'Conveyance Allowances', 'Earned Leave', 'Bonus', 'Other Allowance', 'Basic Pay + DA'];

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
      if (baseField === 'pf_admin_edli_basis') return 'Statutory PF Wage (Capped at Ceiling)';
      if (baseField === 'pf_admin_edli_gross_percent') return 100;
    } else if (cat === 'staff_non_ctc') {
      const field = `staff_non_ctc_${baseField}`;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        return data[field];
      }
      if (baseField === 'apply_pf_ceiling') return 1;
      if (baseField === 'pf_wage_ceiling') return 15000;
      if (baseField === 'employee_pf_max_amount') return 1800;
      if (baseField === 'pf_admin_edli_basis') return 'Percentage of Gross Salary';
      if (baseField === 'pf_admin_edli_gross_percent') return 90;
    } else if (cat === 'workers') {
      const wField = `workers_${baseField}`;
      if (data[wField] !== undefined && data[wField] !== null && data[wField] !== '') {
        return data[wField];
      }
      if (baseField === 'pf_admin_edli_basis') return 'Statutory PF Wage (Capped at Ceiling)';
      if (baseField === 'pf_admin_edli_gross_percent') return 100;
    } else if (cat === 'north_indian') {
      const niField = `north_indian_${baseField}`;
      if (data[niField] !== undefined && data[niField] !== null && data[niField] !== '') {
        return data[niField];
      }
      if (baseField === 'pf_admin_edli_basis') return 'Statutory PF Wage (Capped at Ceiling)';
      if (baseField === 'pf_admin_edli_gross_percent') return 100;
    } else if (cat === 'drivers') {
      const dField = `drivers_${baseField}`;
      if (data[dField] !== undefined && data[dField] !== null && data[dField] !== '') {
        return data[dField];
      }
      if (baseField === 'fixed_working_days') return 26;
      if (baseField === 'salary_working_days_basis') return 'Fixed Working Days (e.g. 26)';
      if (baseField === 'ot_rate_multiplier') return 2.0;
      if (baseField === 'tea_allowance_per_day') return 5;
      if (baseField === 'bonus_provision_rate') return 8.33;
      if (baseField === 'el_provision_days_per_year') return 15;
      if (baseField === 'pf_admin_edli_basis') return 'Statutory PF Wage (Capped at Ceiling)';
      if (baseField === 'pf_admin_edli_gross_percent') return 100;
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
    } else if (cat === 'drivers') {
      onChange(`drivers_${baseField}`, value);
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

  // Dynamic Bonus Schemes Handlers
  const getParsedBonusSchemes = (): BonusScheme[] => {
    const raw = data.bonus_schemes;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map((s: any, idx: number) => {
          let calcMethod = s.calc_method || 'Percentage of Selected Components';
          if (calcMethod === 'Percentage of Basic + DA') {
            calcMethod = 'Percentage of Selected Components';
          }

          const rawCats = Array.isArray(s.categories) ? s.categories : ['all'];
          const normCats = rawCats.map((c: string) => (c === 'north_indian_workers' ? 'north_indian' : c));

          let calcComponents = s.calculation_components || s.components;
          if (!Array.isArray(calcComponents) || calcComponents.length === 0) {
            calcComponents = ['Basic Pay', 'DA'];
          }

          return {
            id: s.id || `scheme-${idx + 1}`,
            scheme_name: s.scheme_name || 'Annual Bonus',
            is_active: s.is_active !== undefined ? s.is_active : 1,
            payout_months: Array.isArray(s.payout_months)
              ? s.payout_months
              : (s.payout_month ? String(s.payout_month).split(',').map((m: string) => m.trim()).filter(Boolean) : ['October']),
            categories: normCats.length === 0 ? ['all'] : normCats,
            departments: Array.isArray(s.departments) ? s.departments : [],
            designations: Array.isArray(s.designations) ? s.designations : [],
            calc_method: calcMethod,
            calculation_components: calcComponents,
            percentage: s.percentage !== undefined ? Number(s.percentage) : 8.33,
            wage_ceiling: s.wage_ceiling !== undefined ? Number(s.wage_ceiling) : 7000,
            flat_amount: s.flat_amount !== undefined ? Number(s.flat_amount) : 0,
          };
        });
      }
    } catch {
      // ignore
    }
    return [];
  };

  const handleUpdateBonusSchemes = (updated: BonusScheme[]) => {
    const normalized = updated.map((s) => ({
      ...s,
      payout_month: (s.payout_months || []).join(', '),
      payout_months: s.payout_months || [],
      calculation_components: s.calculation_components || [],
      components: s.calculation_components || [],
    }));
    onChange('bonus_schemes', JSON.stringify(normalized));
  };

  const handleAddBonusScheme = () => {
    const current = getParsedBonusSchemes();
    const newScheme: BonusScheme = {
      id: `scheme-${Date.now()}`,
      scheme_name: 'Festival Bonus',
      is_active: 1,
      payout_months: ['October'],
      categories: ['all'],
      departments: [],
      designations: [],
      calc_method: 'Percentage of Selected Components',
      calculation_components: ['Basic Pay', 'DA'],
      percentage: 8.33,
      wage_ceiling: 7000,
      flat_amount: 0,
    };
    handleUpdateBonusSchemes([...current, newScheme]);
  };

  const handleRemoveBonusScheme = (schemeId: string) => {
    const current = getParsedBonusSchemes();
    handleUpdateBonusSchemes(current.filter((s) => s.id !== schemeId));
  };

  const handleUpdateSingleScheme = (schemeId: string, field: keyof BonusScheme, value: any) => {
    const current = getParsedBonusSchemes();
    const updated = current.map((s) => (s.id === schemeId ? { ...s, [field]: value } : s));
    handleUpdateBonusSchemes(updated);
  };

  // Dynamic Company Other Overtime Rules Handlers
  const getParsedOtherOvertimeRules = (): OtherOvertimeRule[] => {
    const raw = data.other_overtime_rules;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map((r: any, idx: number) => ({
          id: r.id || `other-ot-rule-${idx + 1}`,
          employee_type: r.employee_type || '',
          enabled: r.enabled !== undefined ? (isCheckEnabled(r.enabled) ? 1 : 0) : 1,
          calculation_type: r.calculation_type === 'fixed' ? 'fixed' : 'gross',
          multiplier: r.multiplier !== undefined ? Number(r.multiplier) : 2.0,
          fixed_rate: r.fixed_rate !== undefined ? Number(r.fixed_rate) : 100,
          working_days_basis: r.working_days_basis !== undefined ? Number(r.working_days_basis) : 26,
          shift_hours: r.shift_hours !== undefined ? Number(r.shift_hours) : 8,
          attendance_bonus: r.attendance_bonus !== undefined ? Number(r.attendance_bonus) : 0,
          notes: r.notes || '',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  };

  const handleUpdateOtherOvertimeRules = (updated: OtherOvertimeRule[]) => {
    onChange('other_overtime_rules', JSON.stringify(updated));
  };

  const isDedicatedOvertimeCategory = (type: string) => {
    const t = (type || '').trim().toLowerCase();
    return (
      t === 'workers' ||
      t === 'drivers' ||
      t.includes('worker') ||
      t.includes('driver') ||
      t.includes('north indian')
    );
  };

  const handleAddOtherOvertimeRule = () => {
    const current = getParsedOtherOvertimeRules();
    const usedTypes = current.map((r) => (r.employee_type || '').trim().toLowerCase());
    const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;
    const availableTypes = baseOptions.filter((t) => {
      const lower = (t || '').trim().toLowerCase();
      return !isDedicatedOvertimeCategory(lower) && !usedTypes.includes(lower);
    });
    const defaultType = availableTypes[0] || '';

    const newRule: OtherOvertimeRule = {
      id: `other-ot-rule-${Date.now()}`,
      employee_type: defaultType,
      enabled: 1,
      calculation_type: 'gross',
      multiplier: 2.0,
      fixed_rate: 100,
      working_days_basis: 26,
      shift_hours: 8,
      attendance_bonus: 0,
      notes: '',
    };
    handleUpdateOtherOvertimeRules([...current, newRule]);
  };

  const handleRemoveOtherOvertimeRule = (ruleId: string) => {
    const current = getParsedOtherOvertimeRules();
    handleUpdateOtherOvertimeRules(current.filter((r) => r.id !== ruleId));
  };

  const handleUpdateSingleOtherOvertimeRule = (ruleId: string, field: keyof OtherOvertimeRule, value: any) => {
    const current = getParsedOtherOvertimeRules();
    const updated = current.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r));
    handleUpdateOtherOvertimeRules(updated);
  };

  // Dynamic Other Employee PT Rules Handlers
  const getParsedOtherPTRules = (): OtherPTRule[] => {
    const raw = data.other_pt_rules;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `other-pt-rule-${idx}`,
          employee_type: item.employee_type || '',
          enabled: item.enabled ?? 1,
          pt_deduction_frequency: item.pt_deduction_frequency || 'Half-Yearly Deduction',
          pt_half_yearly_months: item.pt_half_yearly_months || 'April, September',
          pt_deduction_component: item.pt_deduction_component || 'Prof.Tax',
          pt_slabs: Array.isArray(item.pt_slabs) && item.pt_slabs.length > 0 ? item.pt_slabs : DEFAULT_PT_SLABS,
          notes: item.notes || '',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  };

  const handleUpdateOtherPTRules = (updated: OtherPTRule[]) => {
    onChange('other_pt_rules', JSON.stringify(updated));
  };

  const isDedicatedPTCategory = (type: string) => {
    const t = (type || '').trim().toLowerCase();
    return (
      t.includes('worker') ||
      t.includes('driver') ||
      t.includes('north indian') ||
      t.includes('staff')
    );
  };

  const handleAddOtherPTRule = () => {
    const current = getParsedOtherPTRules();
    const usedTypes = current.map((r) => (r.employee_type || '').trim().toLowerCase());
    const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;
    const availableTypes = baseOptions.filter((t) => {
      const lower = (t || '').trim().toLowerCase();
      return !isDedicatedPTCategory(lower) && !usedTypes.includes(lower);
    });
    const defaultType = availableTypes[0] || '';

    const newRule: OtherPTRule = {
      id: `other-pt-rule-${Date.now()}`,
      employee_type: defaultType,
      enabled: 1,
      pt_deduction_frequency: 'Half-Yearly Deduction',
      pt_half_yearly_months: 'April, September',
      pt_deduction_component: 'Prof.Tax',
      pt_slabs: [...DEFAULT_PT_SLABS],
      notes: '',
    };
    handleUpdateOtherPTRules([...current, newRule]);
  };

  const handleRemoveOtherPTRule = (ruleId: string) => {
    const current = getParsedOtherPTRules();
    handleUpdateOtherPTRules(current.filter((r) => r.id !== ruleId));
  };

  const handleUpdateSingleOtherPTRule = (ruleId: string, field: keyof OtherPTRule, value: any) => {
    const current = getParsedOtherPTRules();
    const updated = current.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r));
    handleUpdateOtherPTRules(updated);
  };

  const handleAddSlabToOtherPTRule = (ruleId: string) => {
    const current = getParsedOtherPTRules();
    const rule = current.find((r) => r.id === ruleId);
    if (!rule) return;
    const slabs = rule.pt_slabs && rule.pt_slabs.length > 0 ? rule.pt_slabs : DEFAULT_PT_SLABS;
    const lastSlab = slabs[slabs.length - 1];
    const newFrom = lastSlab ? (lastSlab.to_amount ? lastSlab.to_amount + 1 : lastSlab.from_amount + 15000) : 0;
    const newSlabs = [...slabs, { from_amount: newFrom, to_amount: null, tax_amount: 0 }];
    handleUpdateSingleOtherPTRule(ruleId, 'pt_slabs', newSlabs);
  };

  const handleRemoveSlabFromOtherPTRule = (ruleId: string, slabIndex: number) => {
    const current = getParsedOtherPTRules();
    const rule = current.find((r) => r.id === ruleId);
    if (!rule) return;
    const newSlabs = (rule.pt_slabs || []).filter((_, i) => i !== slabIndex);
    handleUpdateSingleOtherPTRule(ruleId, 'pt_slabs', newSlabs);
  };

  const handleUpdateSlabInOtherPTRule = (ruleId: string, slabIndex: number, field: keyof PTSlabItem, val: any) => {
    const current = getParsedOtherPTRules();
    const rule = current.find((r) => r.id === ruleId);
    if (!rule) return;
    const currentSlabs = rule.pt_slabs || DEFAULT_PT_SLABS;
    const updatedSlabs = currentSlabs.map((item, i) => {
      if (i === slabIndex) {
        let parsedVal: any = val;
        if (field === 'to_amount') {
          parsedVal = val === '' || val === null || val === undefined ? null : Number(val);
        } else {
          parsedVal = Number(val) || 0;
        }
        return { ...item, [field]: parsedVal };
      }
      return item;
    });
    handleUpdateSingleOtherPTRule(ruleId, 'pt_slabs', updatedSlabs);
  };

  const handleResetSlabsInOtherPTRule = (ruleId: string) => {
    handleUpdateSingleOtherPTRule(ruleId, 'pt_slabs', [...DEFAULT_PT_SLABS]);
  };

  // Dynamic Other Employee Statutory & Deduction Rules Handlers
  const getParsedOtherStatutoryRules = (): OtherStatutoryRule[] => {
    const raw = data.other_statutory_rules;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `other-stat-rule-${idx}`,
          employee_type: item.employee_type || '',
          enabled: item.enabled ?? 1,
          enable_auto_pf: item.enable_auto_pf ?? 1,
          pf_deduction_component: item.pf_deduction_component || 'PF',
          apply_pf_ceiling: item.apply_pf_ceiling ?? 1,
          employee_pf_rate: item.employee_pf_rate !== undefined ? Number(item.employee_pf_rate) : 12,
          pf_wage_ceiling: item.pf_wage_ceiling !== undefined ? Number(item.pf_wage_ceiling) : 15000,
          employee_pf_max_amount: item.employee_pf_max_amount !== undefined ? Number(item.employee_pf_max_amount) : 1800,
          pf_wage_basis: Array.isArray(item.pf_wage_basis) ? item.pf_wage_basis : (earningOptions.length > 0 ? earningOptions : ['Basic Pay', 'DA']),
          enable_auto_esi: item.enable_auto_esi ?? 1,
          esi_deduction_component: item.esi_deduction_component || 'ESI',
          employee_esi_rate: item.employee_esi_rate !== undefined ? Number(item.employee_esi_rate) : 0.75,
          esi_wage_ceiling: item.esi_wage_ceiling !== undefined ? Number(item.esi_wage_ceiling) : 21000,
          enable_employee_tea_deduction: item.enable_employee_tea_deduction ?? 0,
          tea_deduction_component: item.tea_deduction_component || 'Tea Deduction',
          employee_tea_deduction_per_day: item.employee_tea_deduction_per_day !== undefined ? Number(item.employee_tea_deduction_per_day) : 0,
          enable_employee_canteen_deduction: item.enable_employee_canteen_deduction ?? 0,
          canteen_deduction_component: item.canteen_deduction_component || 'Canteen Deduction',
          employee_canteen_deduction_per_meal: item.employee_canteen_deduction_per_meal !== undefined ? Number(item.employee_canteen_deduction_per_meal) : 0,
          notes: item.notes || '',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  };

  const handleUpdateOtherStatutoryRules = (updated: OtherStatutoryRule[]) => {
    onChange('other_statutory_rules', JSON.stringify(updated));
  };

  const isDedicatedStatutoryCategory = (type: string) => {
    const t = (type || '').trim().toLowerCase();
    return (
      t.includes('worker') ||
      t.includes('driver') ||
      t.includes('north indian') ||
      t.includes('staff')
    );
  };

  const handleAddOtherStatutoryRule = () => {
    const current = getParsedOtherStatutoryRules();
    const usedTypes = current.map((r) => (r.employee_type || '').trim().toLowerCase());
    const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;
    const availableTypes = baseOptions.filter((t) => {
      const lower = (t || '').trim().toLowerCase();
      return !isDedicatedStatutoryCategory(lower) && !usedTypes.includes(lower);
    });
    const defaultType = availableTypes[0] || '';

    const newRule: OtherStatutoryRule = {
      id: `other-stat-rule-${Date.now()}`,
      employee_type: defaultType,
      enabled: 1,
      enable_auto_pf: 1,
      pf_deduction_component: 'PF',
      apply_pf_ceiling: 1,
      employee_pf_rate: 12,
      pf_wage_ceiling: 15000,
      employee_pf_max_amount: 1800,
      pf_wage_basis: earningOptions.length > 0 ? earningOptions : ['Basic Pay', 'DA'],
      enable_auto_esi: 1,
      esi_deduction_component: 'ESI',
      employee_esi_rate: 0.75,
      esi_wage_ceiling: 21000,
      enable_employee_tea_deduction: 0,
      tea_deduction_component: 'Tea Deduction',
      employee_tea_deduction_per_day: 0,
      enable_employee_canteen_deduction: 0,
      canteen_deduction_component: 'Canteen Deduction',
      employee_canteen_deduction_per_meal: 0,
      notes: '',
    };
    handleUpdateOtherStatutoryRules([...current, newRule]);
  };

  const handleRemoveOtherStatutoryRule = (ruleId: string) => {
    const current = getParsedOtherStatutoryRules();
    handleUpdateOtherStatutoryRules(current.filter((r) => r.id !== ruleId));
  };

  const handleUpdateSingleOtherStatutoryRule = (ruleId: string, field: keyof OtherStatutoryRule, value: any) => {
    const current = getParsedOtherStatutoryRules();
    const updated = current.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r));
    handleUpdateOtherStatutoryRules(updated);
  };

  // Dynamic Other Employee Employer Statutory & CTC Rules Handlers
  const getParsedOtherEmployerStatutoryRules = (): OtherEmployerStatutoryRule[] => {
    const raw = data.other_employer_statutory_rules;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `other-empr-stat-rule-${idx}`,
          employee_type: item.employee_type || '',
          enabled: item.enabled ?? 1,
          employer_pf_rate: item.employer_pf_rate !== undefined ? Number(item.employer_pf_rate) : 12,
          employer_pf_wage_ceiling: item.employer_pf_wage_ceiling !== undefined ? Number(item.employer_pf_wage_ceiling) : 15000,
          employer_pf_max_amount: item.employer_pf_max_amount !== undefined ? Number(item.employer_pf_max_amount) : 1800,
          pf_admin_edli_basis: item.pf_admin_edli_basis || 'Statutory PF Wage (Capped at Ceiling)',
          pf_admin_edli_gross_percent: item.pf_admin_edli_gross_percent !== undefined ? Number(item.pf_admin_edli_gross_percent) : 100,
          pf_admin_rate: item.pf_admin_rate !== undefined ? Number(item.pf_admin_rate) : 0.5,
          edli_rate: item.edli_rate !== undefined ? Number(item.edli_rate) : 0.5,
          employer_esi_rate: item.employer_esi_rate !== undefined ? Number(item.employer_esi_rate) : 3.25,
          esi_wage_ceiling: item.esi_wage_ceiling !== undefined ? Number(item.esi_wage_ceiling) : 21000,
          enable_bonus_provision: item.enable_bonus_provision ?? 1,
          bonus_provision_rate: item.bonus_provision_rate !== undefined ? Number(item.bonus_provision_rate) : 8.33,
          enable_el_provision: item.enable_el_provision ?? 1,
          el_provision_days_per_year: item.el_provision_days_per_year !== undefined ? Number(item.el_provision_days_per_year) : 15.6,
          enable_tea_allowance: item.enable_tea_allowance ?? 1,
          tea_allowance_per_day: item.tea_allowance_per_day !== undefined ? Number(item.tea_allowance_per_day) : 5,
          enable_lunch_allowance: item.enable_lunch_allowance ?? 1,
          lunch_allowance_per_meal: item.lunch_allowance_per_meal !== undefined ? Number(item.lunch_allowance_per_meal) : 50,
          notes: item.notes || '',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  };

  const handleUpdateOtherEmployerStatutoryRules = (updated: OtherEmployerStatutoryRule[]) => {
    onChange('other_employer_statutory_rules', JSON.stringify(updated));
  };

  const isDedicatedEmployerStatutoryCategory = (type: string) => {
    const t = (type || '').trim().toLowerCase();
    return (
      t.includes('worker') ||
      t.includes('driver') ||
      t.includes('north indian') ||
      t.includes('staff')
    );
  };

  const handleAddOtherEmployerStatutoryRule = () => {
    const current = getParsedOtherEmployerStatutoryRules();
    const usedTypes = current.map((r) => (r.employee_type || '').trim().toLowerCase());
    const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;
    const availableTypes = baseOptions.filter((t) => {
      const lower = (t || '').trim().toLowerCase();
      return !isDedicatedEmployerStatutoryCategory(lower) && !usedTypes.includes(lower);
    });
    const defaultType = availableTypes[0] || '';

    const newRule: OtherEmployerStatutoryRule = {
      id: `other-empr-stat-rule-${Date.now()}`,
      employee_type: defaultType,
      enabled: 1,
      employer_pf_rate: 12,
      employer_pf_wage_ceiling: 15000,
      employer_pf_max_amount: 1800,
      pf_admin_edli_basis: 'Statutory PF Wage (Capped at Ceiling)',
      pf_admin_edli_gross_percent: 100,
      pf_admin_rate: 0.5,
      edli_rate: 0.5,
      employer_esi_rate: 3.25,
      esi_wage_ceiling: 21000,
      enable_bonus_provision: 1,
      bonus_provision_rate: 8.33,
      enable_el_provision: 1,
      el_provision_days_per_year: 15.6,
      enable_tea_allowance: 1,
      tea_allowance_per_day: 5,
      enable_lunch_allowance: 1,
      lunch_allowance_per_meal: 50,
      notes: '',
    };
    handleUpdateOtherEmployerStatutoryRules([...current, newRule]);
  };

  const handleRemoveOtherEmployerStatutoryRule = (ruleId: string) => {
    const current = getParsedOtherEmployerStatutoryRules();
    handleUpdateOtherEmployerStatutoryRules(current.filter((r) => r.id !== ruleId));
  };

  const handleUpdateSingleOtherEmployerStatutoryRule = (ruleId: string, field: keyof OtherEmployerStatutoryRule, value: any) => {
    const current = getParsedOtherEmployerStatutoryRules();
    const updated = current.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r));
    handleUpdateOtherEmployerStatutoryRules(updated);
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

  const getSelectedLwfComponents = (): string[] => {
    const rawVal = data.lwf_wage_basis;
    if (rawVal === undefined || rawVal === null || rawVal === '') return ['Gross Pay'];
    if (Array.isArray(rawVal)) return rawVal;
    if (typeof rawVal === 'string') {
      try {
        const parsed = JSON.parse(rawVal);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        if (rawVal.includes(',')) {
          return rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        return [rawVal];
      }
    }
    return ['Gross Pay'];
  };

  const getSelectedLwfCategories = (): string[] => {
    const rawVal = data.lwf_applicable_categories;
    if (rawVal === undefined || rawVal === null || rawVal === '') return allEmployeeTypeOptions;
    let list: string[] = [];
    if (Array.isArray(rawVal)) {
      list = rawVal;
    } else if (typeof rawVal === 'string') {
      try {
        const parsed = JSON.parse(rawVal);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        if (rawVal.includes(',')) {
          list = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
          list = [rawVal];
        }
      }
    }

    const legacyMap: Record<string, string> = {
      staff_ctc: 'Staff - CTC',
      staff_non_ctc: 'Staff - Non CTC',
      workers: 'Workers',
      north_indian: 'North Indian - CTC',
      drivers: 'Drivers',
    };

    return list.map((item) => legacyMap[item] || item);
  };

  // TDS Slabs Handlers
  const getParsedTdsNewSlabs = (): TDSSlabItem[] => {
    const rawSlabs = data.tds_new_regime_slabs;
    if (!rawSlabs) return DEFAULT_TDS_NEW_SLABS;
    if (Array.isArray(rawSlabs)) return rawSlabs;
    try {
      const parsed = typeof rawSlabs === 'string' ? JSON.parse(rawSlabs) : rawSlabs;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
    return DEFAULT_TDS_NEW_SLABS;
  };

  const handleUpdateTdsNewSlab = (index: number, field: keyof TDSSlabItem, val: any) => {
    const currentSlabs = getParsedTdsNewSlabs();
    const updated = currentSlabs.map((item, i) => {
      if (i === index) {
        let parsedVal: any = val;
        if (field === 'to_amount') {
          parsedVal = val === '' || val === null || val === undefined ? null : Number(val);
        } else {
          parsedVal = val === '' ? 0 : Number(val);
        }
        return { ...item, [field]: parsedVal };
      }
      return item;
    });
    onChange('tds_new_regime_slabs', JSON.stringify(updated));
  };

  const handleAddTdsNewSlab = () => {
    const currentSlabs = getParsedTdsNewSlabs();
    const last = currentSlabs[currentSlabs.length - 1];
    const nextFrom = last && last.to_amount != null ? Number(last.to_amount) + 1 : 0;
    const updated = [...currentSlabs, { from_amount: nextFrom, to_amount: null, rate_percent: 0 }];
    onChange('tds_new_regime_slabs', JSON.stringify(updated));
  };

  const handleRemoveTdsNewSlab = (index: number) => {
    const currentSlabs = getParsedTdsNewSlabs();
    const updated = currentSlabs.filter((_, i) => i !== index);
    onChange('tds_new_regime_slabs', JSON.stringify(updated));
  };

  const handleResetTdsNewSlabs = () => {
    onChange('tds_new_regime_slabs', JSON.stringify(DEFAULT_TDS_NEW_SLABS));
  };

  const getParsedTdsOldSlabs = (): TDSSlabItem[] => {
    const rawSlabs = data.tds_old_regime_slabs;
    if (!rawSlabs) return DEFAULT_TDS_OLD_SLABS;
    if (Array.isArray(rawSlabs)) return rawSlabs;
    try {
      const parsed = typeof rawSlabs === 'string' ? JSON.parse(rawSlabs) : rawSlabs;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
    return DEFAULT_TDS_OLD_SLABS;
  };

  const handleUpdateTdsOldSlab = (index: number, field: keyof TDSSlabItem, val: any) => {
    const currentSlabs = getParsedTdsOldSlabs();
    const updated = currentSlabs.map((item, i) => {
      if (i === index) {
        let parsedVal: any = val;
        if (field === 'to_amount') {
          parsedVal = val === '' || val === null || val === undefined ? null : Number(val);
        } else {
          parsedVal = val === '' ? 0 : Number(val);
        }
        return { ...item, [field]: parsedVal };
      }
      return item;
    });
    onChange('tds_old_regime_slabs', JSON.stringify(updated));
  };

  const handleAddTdsOldSlab = () => {
    const currentSlabs = getParsedTdsOldSlabs();
    const last = currentSlabs[currentSlabs.length - 1];
    const nextFrom = last && last.to_amount != null ? Number(last.to_amount) + 1 : 0;
    const updated = [...currentSlabs, { from_amount: nextFrom, to_amount: null, rate_percent: 0 }];
    onChange('tds_old_regime_slabs', JSON.stringify(updated));
  };

  const handleRemoveTdsOldSlab = (index: number) => {
    const currentSlabs = getParsedTdsOldSlabs();
    const updated = currentSlabs.filter((_, i) => i !== index);
    onChange('tds_old_regime_slabs', JSON.stringify(updated));
  };

  const handleResetTdsOldSlabs = () => {
    onChange('tds_old_regime_slabs', JSON.stringify(DEFAULT_TDS_OLD_SLABS));
  };

  const getSelectedTdsCategories = (): string[] => {
    const rawVal = data.tds_applicable_categories;
    if (rawVal === undefined || rawVal === null || rawVal === '') return allEmployeeTypeOptions;
    let list: string[] = [];
    if (Array.isArray(rawVal)) {
      list = rawVal;
    } else if (typeof rawVal === 'string') {
      try {
        const parsed = JSON.parse(rawVal);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        if (rawVal.includes(',')) {
          list = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
          list = [rawVal];
        }
      }
    }
    return list;
  };

  // Custom Salary Component Rules State & Handlers
  const [activeAssigneeRuleIndex, setActiveAssigneeRuleIndex] = useState<number | null>(null);

  const getParsedCustomRules = (): CustomSalaryRule[] => {
    const raw = data.custom_salary_component_rules;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
    return [];
  };

  const handleUpdateCustomRules = (updatedRules: CustomSalaryRule[]) => {
    onChange('custom_salary_component_rules', JSON.stringify(updatedRules));
  };

  const handleAddCustomRule = () => {
    const current = getParsedCustomRules();
    const newRule: CustomSalaryRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      type: 'Deduction',
      enabled: true,
      calculation_mode: 'fixed',
      selected_components: ['Basic Pay', 'DA'],
      amount: '',
      applicability: 'always_active',
      applicable_month: dayjs().format('YYYY-MM'),
      target_type: 'all',
      target_categories: [],
      target_employee_ids: [],
      description: '',
    };
    handleUpdateCustomRules([...current, newRule]);
  };

  const handleModifyCustomRule = (index: number, patch: Partial<CustomSalaryRule>) => {
    const current = getParsedCustomRules();
    const updated = current.map((r, i) => (i === index ? { ...r, ...patch } : r));
    handleUpdateCustomRules(updated);
  };

  const handleRemoveCustomRule = (index: number) => {
    const current = getParsedCustomRules();
    handleUpdateCustomRules(current.filter((_, i) => i !== index));
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
      TransitionProps={{ unmountOnExit: true }}
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
          onChange={handleTabChange}
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
      <Box sx={{ display: currentTab === 'salary_rules' ? 'block' : 'none' }}>
        {visitedTabs.salary_rules && (
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
      </Box>

      {/* Tab Panel 2: Professional Tax (PT) Rules (With Collapsible per Category) */}
      <Box sx={{ display: currentTab === 'pt_rules' ? 'block' : 'none' }}>
        {visitedTabs.pt_rules && (
          <Box>
          {CATEGORIES.filter((cat) => cat.key !== 'general').map((cat, idx) => {
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
                  <Grid size={{ xs: 12, md: ptFreq === 'Half-Yearly Deduction' ? 4 : 6 }}>
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
                    <Grid size={{ xs: 12, md: 4 }}>
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

                  <Grid size={{ xs: 12, md: ptFreq === 'Half-Yearly Deduction' ? 4 : 6 }}>
                    <Autocomplete
                      freeSolo
                      openOnFocus
                      forcePopupIcon
                      autoHighlight
                      disabled={!ptEnabled}
                      options={deductionOptions}
                      value={getFieldVal(cat.key, 'pt_deduction_component', 'Prof.Tax')}
                      onChange={(_event, newValue) => {
                        setFieldVal(cat.key, 'pt_deduction_component', newValue || '');
                      }}
                      onInputChange={(_event, newInputValue) => {
                        if (newInputValue !== undefined) {
                          setFieldVal(cat.key, 'pt_deduction_component', newInputValue);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="PT Deduction Salary Component"
                          placeholder="Select or type component name..."
                          helperText="Salary Component used for PT deduction on salary slips (e.g. Professional Tax)"
                        />
                      )}
                    />
                  </Grid>
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

          {/* Other Employee Professional Tax (PT) Rules */}
          <Card
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: (theme) => theme.customShadows?.z1 || 'none',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LuReceipt size={20} style={{ color: '#059669' }} />
                  Other Employee Professional Tax (PT) Rules
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  Configure custom Professional Tax slab deduction rules and cycles for other Employee Types.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<LuPlus size={16} />}
                onClick={handleAddOtherPTRule}
                sx={{
                  bgcolor: '#059669',
                  color: '#fff',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1.5,
                }}
              >
                Add PT Rule
              </Button>
            </Box>

            {getParsedOtherPTRules().length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  px: 2,
                  textAlign: 'center',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                  borderRadius: 2,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, mt: 2, fontWeight: 600 }}>
                  No custom employee type PT rules configured yet.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 2 }}>
                  Click &quot;Add PT Rule&quot; to configure custom Professional Tax slabs and deduction frequency for other employee types (e.g. Security, House Keeping, STP).
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {getParsedOtherPTRules().map((rule, idx) => {
                  const ptEnabled = isCheckEnabled(rule.enabled);
                  const ptFreq = rule.pt_deduction_frequency || 'Half-Yearly Deduction';
                  const ptMonths = rule.pt_half_yearly_months || 'April, September';
                  const slabs = rule.pt_slabs && rule.pt_slabs.length > 0 ? rule.pt_slabs : DEFAULT_PT_SLABS;

                  const allOtherRules = getParsedOtherPTRules();
                  const assignedToOtherRules = allOtherRules
                    .filter((r) => r.id !== rule.id && r.employee_type)
                    .map((r) => r.employee_type.trim().toLowerCase());

                  const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;

                  const availableEmployeeTypeOptions = baseOptions.filter((type) => {
                    const t = (type || '').trim().toLowerCase();
                    if (rule.employee_type && t === rule.employee_type.trim().toLowerCase()) {
                      return true;
                    }
                    if (isDedicatedPTCategory(t)) {
                      return false;
                    }
                    if (assignedToOtherRules.includes(t)) {
                      return false;
                    }
                    return true;
                  });

                  return (
                    <Card
                      key={rule.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${ptEnabled ? alpha('#059669', 0.35) : theme.palette.divider}`,
                        bgcolor: (theme) => (ptEnabled ? alpha('#059669', 0.02) : theme.palette.background.paper),
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Rule Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                          <Chip
                            label={`Rule No: ${idx + 1}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: ptEnabled ? alpha('#059669', 0.12) : alpha('#64748b', 0.12),
                              color: ptEnabled ? '#059669' : 'text.secondary',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {rule.employee_type || 'Unassigned Employee Type'}
                          </Typography>
                          <Chip
                            label={ptFreq === 'Every Month Deduction' ? 'Every Month' : 'Half-Yearly'}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: '#059669',
                              color: '#059669',
                              bgcolor: alpha('#059669', 0.05),
                            }}
                          />
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: ptEnabled ? '#059669' : 'text.disabled',
                              }}
                            >
                              {ptEnabled ? 'Enabled' : 'Disabled'}
                            </Typography>
                            <CustomSwitch
                              checked={ptEnabled}
                              onChange={(e) => handleUpdateSingleOtherPTRule(rule.id, 'enabled', e.target.checked ? 1 : 0)}
                            />
                          </Stack>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveOtherPTRule(rule.id)}
                            sx={{
                              bgcolor: alpha('#ef4444', 0.08),
                              '&:hover': { bgcolor: alpha('#ef4444', 0.16) },
                            }}
                          >
                            <LuTrash2 size={16} />
                          </IconButton>
                        </Stack>
                      </Box>

                      <Divider sx={{ mb: 2.5 }} />

                      {/* Rule Fields */}
                      <Grid container spacing={2.5}>
                        {/* Employee Type Autocomplete */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Autocomplete
                            freeSolo
                            options={availableEmployeeTypeOptions}
                            value={rule.employee_type || ''}
                            onChange={(_, val) => handleUpdateSingleOtherPTRule(rule.id, 'employee_type', val || '')}
                            onInputChange={(_, val, reason) => {
                              if (reason === 'input') {
                                handleUpdateSingleOtherPTRule(rule.id, 'employee_type', val);
                              }
                            }}
                            disabled={!ptEnabled}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Employee Type"
                                placeholder="Select or type employee type..."
                                helperText="Applicable employee type for this PT rule"
                                slotProps={{
                                  input: {
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <InputAdornment position="start">
                                          <LuUser size={18} style={{ opacity: 0.6, marginLeft: 4 }} />
                                        </InputAdornment>
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  },
                                }}
                              />
                            )}
                          />
                        </Grid>

                        {/* PT Deduction Salary Component */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Autocomplete
                            freeSolo
                            openOnFocus
                            forcePopupIcon
                            autoHighlight
                            disabled={!ptEnabled}
                            options={deductionOptions}
                            value={rule.pt_deduction_component || ''}
                            onChange={(_event, newValue) => {
                              handleUpdateSingleOtherPTRule(rule.id, 'pt_deduction_component', newValue || '');
                            }}
                            onInputChange={(_event, newInputValue) => {
                              if (newInputValue !== undefined) {
                                handleUpdateSingleOtherPTRule(rule.id, 'pt_deduction_component', newInputValue);
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="PT Deduction Salary Component"
                                placeholder="Select or type component name (e.g. Professional Tax)..."
                                helperText="Salary Component used for PT deduction on salary slips"
                              />
                            )}
                          />
                        </Grid>

                        {/* PT Deduction Frequency */}
                        <Grid size={{ xs: 12, md: ptFreq === 'Half-Yearly Deduction' ? 6 : 12 }}>
                          <FormControl fullWidth disabled={!ptEnabled}>
                            <InputLabel id={`other-pt-freq-${rule.id}`}>PT Deduction Frequency</InputLabel>
                            <Select
                              labelId={`other-pt-freq-${rule.id}`}
                              value={ptFreq}
                              label="PT Deduction Frequency"
                              onChange={(e) => handleUpdateSingleOtherPTRule(rule.id, 'pt_deduction_frequency', e.target.value)}
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

                        {/* PT Half-Yearly Cycle Months (if Half-Yearly) */}
                        {ptFreq !== 'Every Month Deduction' && (
                          <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth disabled={!ptEnabled}>
                              <InputLabel id={`other-pt-months-${rule.id}`}>PT Half-Yearly Cycle Months</InputLabel>
                              <Select
                                labelId={`other-pt-months-${rule.id}`}
                                value={ptMonths}
                                label="PT Half-Yearly Cycle Months"
                                onChange={(e) => handleUpdateSingleOtherPTRule(rule.id, 'pt_half_yearly_months', e.target.value)}
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

                      {/* Dynamic PT Slab Configurator for this Rule */}
                      <Box sx={{ mt: 3 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              Professional Tax (PT) Slab Tiers ({rule.employee_type || 'Custom Type'})
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
                              onClick={() => handleResetSlabsInOtherPTRule(rule.id)}
                              disabled={!ptEnabled}
                              sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                            >
                              Reset Defaults
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<LuCirclePlus size={15} />}
                              onClick={() => handleAddSlabToOtherPTRule(rule.id)}
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
                              {slabs.map((slab, slabIdx) => (
                                <TableRow key={slabIdx} hover>
                                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    {slabIdx + 1}
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={slab.from_amount}
                                      onChange={(e) => handleUpdateSlabInOtherPTRule(rule.id, slabIdx, 'from_amount', e.target.value)}
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
                                      onChange={(e) => handleUpdateSlabInOtherPTRule(rule.id, slabIdx, 'to_amount', e.target.value)}
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
                                      onChange={(e) => handleUpdateSlabInOtherPTRule(rule.id, slabIdx, 'tax_amount', e.target.value)}
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
                                      onClick={() => handleRemoveSlabFromOtherPTRule(rule.id, slabIdx)}
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
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Box>
        )}
      </Box>

      {/* Tab Panel 3: Employee Statutory Deductions (PF & ESI) (With Collapsible per Category) */}
      <Box sx={{ display: currentTab === 'employee_statutory' ? 'block' : 'none' }}>
        {visitedTabs.employee_statutory && (
          <Box>
          {CATEGORIES.filter((cat) => cat.key !== 'general').map((cat, idx) => {
            const autoPfEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_auto_pf', 1));
            const autoEsiEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_auto_esi', 1));
            const applyPfCeiling = isCheckEnabled(getFieldVal(cat.key, 'apply_pf_ceiling', cat.key === 'staff_ctc' ? 0 : 1));
            const selectedPfComps = getSelectedPfComponents(cat.key);
            const empTeaEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_employee_tea_deduction', 0));
            const empCanteenEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_employee_canteen_deduction', 0));
            const defaultTeaRate = String(data['employee_tea_deduction_per_day'] || '0');
            const defaultCanteenRate = String(data['employee_canteen_deduction_per_meal'] || '0');

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
                      <Autocomplete
                        freeSolo
                        openOnFocus
                        forcePopupIcon
                        autoHighlight
                        disabled={!autoPfEnabled}
                        options={deductionOptions}
                        value={getFieldVal(cat.key, 'pf_deduction_component', 'PF')}
                        onChange={(_event, newValue) => {
                          setFieldVal(cat.key, 'pf_deduction_component', newValue || '');
                        }}
                        onInputChange={(_event, newInputValue) => {
                          if (newInputValue !== undefined) {
                            setFieldVal(cat.key, 'pf_deduction_component', newInputValue);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Employee PF Deduction Salary Component"
                            placeholder="Select or type component name (e.g. PF or Provident Fund)..."
                            helperText="Salary Component used for Employee PF deduction on salary slips"
                          />
                        )}
                      />

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
                                helperText="Cap applied when wage is above or equal to ceiling (₹1,800)."
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
                      <Autocomplete
                        freeSolo
                        openOnFocus
                        forcePopupIcon
                        autoHighlight
                        disabled={!autoEsiEnabled}
                        options={deductionOptions}
                        value={getFieldVal(cat.key, 'esi_deduction_component', 'ESI')}
                        onChange={(_event, newValue) => {
                          setFieldVal(cat.key, 'esi_deduction_component', newValue || '');
                        }}
                        onInputChange={(_event, newInputValue) => {
                          if (newInputValue !== undefined) {
                            setFieldVal(cat.key, 'esi_deduction_component', newInputValue);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Employee ESI Deduction Salary Component"
                            placeholder="Select or type component name (e.g. ESI or ESIC)..."
                            helperText="Salary Component used for Employee ESI deduction on salary slips"
                          />
                        )}
                      />

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
                            helperText={`Statutory threshold (Gross less than or equal to ₹${Number(getFieldVal(cat.key, 'esi_wage_ceiling', '21000') || 21000).toLocaleString('en-IN')}).`}
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
                    </Stack>
                  </Box>
                </Grid>

                {/* Employee Tea Deduction Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                      border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LuCoffee size={20} style={{ color: '#d97706' }} />
                            Tea Deduction (Employee)
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {cat.key === 'general'
                              ? 'Company-wide default employee tea expense deduction per day worked.'
                              : `Employee tea expense deduction per day worked for ${cat.title}.`}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: empTeaEnabled ? '#059669' : 'text.secondary',
                            }}
                          >
                            {empTeaEnabled ? 'Enabled' : 'Disabled'}
                          </Typography>
                          <CustomSwitch
                            checked={empTeaEnabled}
                            onChange={(e) => setFieldVal(cat.key, 'enable_employee_tea_deduction', e.target.checked ? 1 : 0)}
                          />
                        </Stack>
                      </Stack>

                      {empTeaEnabled && (
                        <Stack spacing={2.5}>
                          <Autocomplete
                            freeSolo
                            openOnFocus
                            forcePopupIcon
                            autoHighlight
                            disabled={!empTeaEnabled}
                            options={deductionOptions}
                            value={getFieldVal(cat.key, 'tea_deduction_component', 'Tea Deduction')}
                            onChange={(_event, newValue) => {
                              setFieldVal(cat.key, 'tea_deduction_component', newValue || '');
                            }}
                            onInputChange={(_event, newInputValue) => {
                              if (newInputValue !== undefined) {
                                setFieldVal(cat.key, 'tea_deduction_component', newInputValue);
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Tea Deduction Salary Component"
                                placeholder="Select or type component name (e.g. Tea Deduction)..."
                                helperText={
                                  cat.key === 'general'
                                    ? 'Salary Component used for Employee Tea expense deduction on salary slips'
                                    : `Deduction component for ${cat.title}. ${
                                        data[`${cat.key}_tea_deduction_component`] === undefined || data[`${cat.key}_tea_deduction_component`] === ''
                                          ? `(Inheriting Company Default: ${data.tea_deduction_component || 'Tea Deduction'})`
                                          : ''
                                      }`
                                }
                              />
                            )}
                          />

                          <TextField
                            fullWidth
                            size="medium"
                            type="number"
                            label="Tea Deduction Rate (₹/day)"
                            value={getFieldVal(cat.key, 'employee_tea_deduction_per_day', defaultTeaRate)}
                            onChange={(e) => setFieldVal(cat.key, 'employee_tea_deduction_per_day', e.target.value)}
                            placeholder={cat.key === 'general' ? '0' : defaultTeaRate}
                            helperText={
                              cat.key === 'general'
                                ? 'Default baseline deducted from Gross Pay (Present Days × ₹/day).'
                                : `Deducted from Employee Gross Pay (Present Days × ₹/day). ${
                                    data[`${cat.key}_employee_tea_deduction_per_day`] === undefined || data[`${cat.key}_employee_tea_deduction_per_day`] === ''
                                      ? `(Inheriting Company Default: ₹${defaultTeaRate}/day)`
                                      : ''
                                  }`
                            }
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
                        </Stack>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Employee Canteen Deduction Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                      border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LuUtensils size={20} style={{ color: '#059669' }} />
                            Canteen / Lunch Deduction (Employee)
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {cat.key === 'general'
                              ? 'Company-wide default employee canteen deduction per meal.'
                              : `Employee canteen deduction per meal for ${cat.title}.`}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: empCanteenEnabled ? '#059669' : 'text.secondary',
                            }}
                          >
                            {empCanteenEnabled ? 'Enabled' : 'Disabled'}
                          </Typography>
                          <CustomSwitch
                            checked={empCanteenEnabled}
                            onChange={(e) => setFieldVal(cat.key, 'enable_employee_canteen_deduction', e.target.checked ? 1 : 0)}
                          />
                        </Stack>
                      </Stack>

                      {empCanteenEnabled && (
                        <Stack spacing={2.5}>
                          <Autocomplete
                            freeSolo
                            openOnFocus
                            forcePopupIcon
                            autoHighlight
                            disabled={!empCanteenEnabled}
                            options={deductionOptions}
                            value={getFieldVal(cat.key, 'canteen_deduction_component', 'Canteen Deduction')}
                            onChange={(_event, newValue) => {
                              setFieldVal(cat.key, 'canteen_deduction_component', newValue || '');
                            }}
                            onInputChange={(_event, newInputValue) => {
                              if (newInputValue !== undefined) {
                                setFieldVal(cat.key, 'canteen_deduction_component', newInputValue);
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Canteen Deduction Salary Component"
                                placeholder="Select or type component name (e.g. Canteen Deduction)..."
                                helperText={
                                  cat.key === 'general'
                                    ? 'Salary Component used for Employee Canteen / Lunch deduction on salary slips'
                                    : `Deduction component for ${cat.title}. ${
                                        data[`${cat.key}_canteen_deduction_component`] === undefined || data[`${cat.key}_canteen_deduction_component`] === ''
                                          ? `(Inheriting Company Default: ${data.canteen_deduction_component || 'Canteen Deduction'})`
                                          : ''
                                      }`
                                }
                              />
                            )}
                          />

                          <TextField
                            fullWidth
                            size="medium"
                            type="number"
                            label="Canteen Deduction Rate (₹/meal)"
                            value={getFieldVal(cat.key, 'employee_canteen_deduction_per_meal', defaultCanteenRate)}
                            onChange={(e) => setFieldVal(cat.key, 'employee_canteen_deduction_per_meal', e.target.value)}
                            placeholder={cat.key === 'general' ? '0' : defaultCanteenRate}
                            helperText={
                              cat.key === 'general'
                                ? 'Default baseline deducted from Gross Pay (Canteen Entries × ₹/meal).'
                                : `Deducted from Employee Gross Pay (All Canteen Entries × ₹/meal). ${
                                    data[`${cat.key}_employee_canteen_deduction_per_meal`] === undefined || data[`${cat.key}_employee_canteen_deduction_per_meal`] === ''
                                      ? `(Inheriting Company Default: ₹${defaultCanteenRate}/meal)`
                                      : ''
                                  }`
                            }
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                                  </InputAdornment>
                                ),
                                endAdornment: <InputAdornment position="end">/meal</InputAdornment>,
                              },
                              htmlInput: { min: 0, step: 1 },
                            }}
                          />
                        </Stack>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            );
          })}

          {/* Other Employee Statutory & Deductions Rules */}
          <Card
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: (theme) => theme.customShadows?.z1 || 'none',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LuShieldCheck size={20} style={{ color: '#059669' }} />
                  Other Employee Statutory &amp; Deductions Rules
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  Configure custom PF, ESI, Tea, and Canteen deduction policies for other Employee Types.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<LuPlus size={16} />}
                onClick={handleAddOtherStatutoryRule}
                sx={{
                  bgcolor: '#059669',
                  color: '#fff',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1.5,
                }}
              >
                Add Statutory Rule
              </Button>
            </Box>

            {getParsedOtherStatutoryRules().length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  px: 2,
                  textAlign: 'center',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                  borderRadius: 2,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, mt: 2, fontWeight: 600 }}>
                  No custom employee type statutory rules configured yet.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 2 }}>
                  Click &quot;Add Statutory Rule&quot; to configure custom PF, ESI, tea, and canteen deductions for other employee types (e.g. Security, House Keeping, STP).
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {getParsedOtherStatutoryRules().map((rule, idx) => {
                  const ruleActive = isCheckEnabled(rule.enabled);
                  const autoPfEnabled = isCheckEnabled(rule.enable_auto_pf);
                  const autoEsiEnabled = isCheckEnabled(rule.enable_auto_esi);
                  const applyPfCeiling = isCheckEnabled(rule.apply_pf_ceiling);
                  const selectedPfComps = Array.isArray(rule.pf_wage_basis) ? rule.pf_wage_basis : [];
                  const empTeaEnabled = isCheckEnabled(rule.enable_employee_tea_deduction);
                  const empCanteenEnabled = isCheckEnabled(rule.enable_employee_canteen_deduction);

                  const allOtherRules = getParsedOtherStatutoryRules();
                  const assignedToOtherRules = allOtherRules
                    .filter((r) => r.id !== rule.id && r.employee_type)
                    .map((r) => r.employee_type.trim().toLowerCase());

                  const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;

                  const availableEmployeeTypeOptions = baseOptions.filter((type) => {
                    const t = (type || '').trim().toLowerCase();
                    if (rule.employee_type && t === rule.employee_type.trim().toLowerCase()) {
                      return true;
                    }
                    if (isDedicatedStatutoryCategory(t)) {
                      return false;
                    }
                    if (assignedToOtherRules.includes(t)) {
                      return false;
                    }
                    return true;
                  });

                  return (
                    <Card
                      key={rule.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${ruleActive ? alpha('#059669', 0.35) : theme.palette.divider}`,
                        bgcolor: (theme) => (ruleActive ? alpha('#059669', 0.02) : theme.palette.background.paper),
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Rule Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                          <Chip
                            label={`Rule No: ${idx + 1}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: ruleActive ? alpha('#059669', 0.12) : alpha('#64748b', 0.12),
                              color: ruleActive ? '#059669' : 'text.secondary',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {rule.employee_type || 'Unassigned Employee Type'}
                          </Typography>
                          <Chip
                            label={autoPfEnabled ? `PF: ${rule.employee_pf_rate ?? 12}%` : 'PF: Disabled'}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: autoPfEnabled ? '#059669' : 'text.disabled',
                              color: autoPfEnabled ? '#059669' : 'text.disabled',
                              bgcolor: autoPfEnabled ? alpha('#059669', 0.05) : 'transparent',
                            }}
                          />
                          <Chip
                            label={autoEsiEnabled ? `ESI: ${rule.employee_esi_rate ?? 0.75}%` : 'ESI: Disabled'}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: autoEsiEnabled ? '#0288d1' : 'text.disabled',
                              color: autoEsiEnabled ? '#0288d1' : 'text.disabled',
                              bgcolor: autoEsiEnabled ? alpha('#0288d1', 0.05) : 'transparent',
                            }}
                          />
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: ruleActive ? '#059669' : 'text.disabled',
                              }}
                            >
                              {ruleActive ? 'Enabled' : 'Disabled'}
                            </Typography>
                            <CustomSwitch
                              checked={ruleActive}
                              onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'enabled', e.target.checked ? 1 : 0)}
                            />
                          </Stack>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveOtherStatutoryRule(rule.id)}
                            sx={{
                              bgcolor: alpha('#ef4444', 0.08),
                              '&:hover': { bgcolor: alpha('#ef4444', 0.16) },
                            }}
                          >
                            <LuTrash2 size={16} />
                          </IconButton>
                        </Stack>
                      </Box>

                      {/* Employee Type Selector */}
                      <Box sx={{ mb: 3 }}>
                        <Autocomplete
                          freeSolo
                          options={availableEmployeeTypeOptions}
                          value={rule.employee_type || ''}
                          onChange={(_, val) => handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_type', val || '')}
                          onInputChange={(_, val, reason) => {
                            if (reason === 'input') {
                              handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_type', val);
                            }
                          }}
                          disabled={!ruleActive}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Employee Type"
                              placeholder="Select or type employee type..."
                              helperText="Applicable employee type for this statutory rule"
                              slotProps={{
                                input: {
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <InputAdornment position="start">
                                        <LuUser size={18} style={{ opacity: 0.6, marginLeft: 4 }} />
                                      </InputAdornment>
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                },
                              }}
                            />
                          )}
                        />
                      </Box>

                      <Divider sx={{ mb: 2.5 }} />

                      {/* Rule Config Sub-cards */}
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
                                  Auto-calculate EPF deduction based on earned wage &amp; ceiling cap.
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
                                  onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'enable_auto_pf', e.target.checked ? 1 : 0)}
                                  disabled={!ruleActive}
                                />
                              </Stack>
                            </Stack>

                            <Stack spacing={2.5}>
                              <Autocomplete
                                freeSolo
                                openOnFocus
                                forcePopupIcon
                                autoHighlight
                                disabled={!ruleActive || !autoPfEnabled}
                                options={deductionOptions}
                                value={rule.pf_deduction_component || ''}
                                onChange={(_event, newValue) => {
                                  handleUpdateSingleOtherStatutoryRule(rule.id, 'pf_deduction_component', newValue || '');
                                }}
                                onInputChange={(_event, newInputValue) => {
                                  if (newInputValue !== undefined) {
                                    handleUpdateSingleOtherStatutoryRule(rule.id, 'pf_deduction_component', newInputValue);
                                  }
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Employee PF Deduction Salary Component"
                                    placeholder="Select or type component name (e.g. PF or Provident Fund)..."
                                    helperText="Salary Component used for Employee PF deduction on salary slips"
                                  />
                                )}
                              />

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
                                  onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'apply_pf_ceiling', e.target.checked ? 1 : 0)}
                                  disabled={!ruleActive || !autoPfEnabled}
                                />
                              </Stack>

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: applyPfCeiling ? 4 : 12 }}>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    label="Employee PF Rate (%)"
                                    value={rule.employee_pf_rate ?? 12}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_pf_rate', Number(e.target.value))}
                                    placeholder="12"
                                    helperText="Standard EPF rate (12%)."
                                    disabled={!ruleActive || !autoPfEnabled}
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
                                        value={rule.pf_wage_ceiling ?? 15000}
                                        onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'pf_wage_ceiling', Number(e.target.value))}
                                        placeholder="15000"
                                        helperText="Statutory threshold (₹15,000)."
                                        disabled={!ruleActive || !autoPfEnabled}
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
                                        value={rule.employee_pf_max_amount ?? 1800}
                                        onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_pf_max_amount', Number(e.target.value))}
                                        placeholder="1800"
                                        helperText="Cap applied when wage is above or equal to ceiling (₹1,800)."
                                        disabled={!ruleActive || !autoPfEnabled}
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
                                      disabled={!ruleActive || !autoPfEnabled}
                                      onClick={() => handleUpdateSingleOtherStatutoryRule(rule.id, 'pf_wage_basis', earningOptions)}
                                      sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none' }}
                                    >
                                      Select All
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="text"
                                      color="inherit"
                                      disabled={!ruleActive || !autoPfEnabled}
                                      onClick={() => handleUpdateSingleOtherStatutoryRule(rule.id, 'pf_wage_basis', [])}
                                      sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                                    >
                                      Clear
                                    </Button>
                                  </Stack>
                                </Stack>

                                <Autocomplete
                                  multiple
                                  disableCloseOnSelect
                                  disabled={!ruleActive || !autoPfEnabled}
                                  options={earningOptions}
                                  value={selectedPfComps}
                                  onChange={(_event, newValue) => {
                                    handleUpdateSingleOtherStatutoryRule(rule.id, 'pf_wage_basis', newValue);
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
                                  onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'enable_auto_esi', e.target.checked ? 1 : 0)}
                                  disabled={!ruleActive}
                                />
                              </Stack>
                            </Stack>

                            <Stack spacing={2.5}>
                              <Autocomplete
                                freeSolo
                                openOnFocus
                                forcePopupIcon
                                autoHighlight
                                disabled={!ruleActive || !autoEsiEnabled}
                                options={deductionOptions}
                                value={rule.esi_deduction_component || ''}
                                onChange={(_event, newValue) => {
                                  handleUpdateSingleOtherStatutoryRule(rule.id, 'esi_deduction_component', newValue || '');
                                }}
                                onInputChange={(_event, newInputValue) => {
                                  if (newInputValue !== undefined) {
                                    handleUpdateSingleOtherStatutoryRule(rule.id, 'esi_deduction_component', newInputValue);
                                  }
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Employee ESI Deduction Salary Component"
                                    placeholder="Select or type component name (e.g. ESI or ESIC)..."
                                    helperText="Salary Component used for Employee ESI deduction on salary slips"
                                  />
                                )}
                              />

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    label="Employee ESI Rate (%)"
                                    value={rule.employee_esi_rate ?? 0.75}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_esi_rate', Number(e.target.value))}
                                    placeholder="0.75"
                                    helperText="Standard employee contribution (0.75%)."
                                    disabled={!ruleActive || !autoEsiEnabled}
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
                                    value={rule.esi_wage_ceiling ?? 21000}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'esi_wage_ceiling', Number(e.target.value))}
                                    placeholder="21000"
                                    helperText={`Statutory threshold (Gross \u2264 \u20b9${Number(rule.esi_wage_ceiling ?? 21000).toLocaleString('en-IN')}).`}
                                    disabled={!ruleActive || !autoEsiEnabled}
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
                            </Stack>
                          </Box>
                        </Grid>

                        {/* Employee Tea Deduction Card */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box
                            sx={{
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                              border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LuCoffee size={20} style={{ color: '#d97706' }} />
                                    Tea Deduction (Employee)
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Employee tea expense deduction per day worked for {rule.employee_type || 'Custom Type'}.
                                  </Typography>
                                </Box>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: empTeaEnabled ? '#059669' : 'text.secondary',
                                    }}
                                  >
                                    {empTeaEnabled ? 'Enabled' : 'Disabled'}
                                  </Typography>
                                  <CustomSwitch
                                    checked={empTeaEnabled}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'enable_employee_tea_deduction', e.target.checked ? 1 : 0)}
                                    disabled={!ruleActive}
                                  />
                                </Stack>
                              </Stack>

                              {empTeaEnabled && (
                                <Stack spacing={2.5}>
                                  <Autocomplete
                                    freeSolo
                                    openOnFocus
                                    forcePopupIcon
                                    autoHighlight
                                    disabled={!empTeaEnabled || !ruleActive}
                                    options={deductionOptions}
                                    value={rule.tea_deduction_component || 'Tea Deduction'}
                                    onChange={(_event, newValue) => {
                                      handleUpdateSingleOtherStatutoryRule(rule.id, 'tea_deduction_component', newValue || '');
                                    }}
                                    onInputChange={(_event, newInputValue) => {
                                      if (newInputValue !== undefined) {
                                        handleUpdateSingleOtherStatutoryRule(rule.id, 'tea_deduction_component', newInputValue);
                                      }
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        label="Tea Deduction Salary Component"
                                        placeholder="Select or type component name (e.g. Tea Deduction)..."
                                        helperText="Salary Component used for Employee Tea expense deduction on salary slips"
                                      />
                                    )}
                                  />

                                  <TextField
                                    fullWidth
                                    size="medium"
                                    type="number"
                                    label="Tea Deduction Rate (₹/day)"
                                    value={rule.employee_tea_deduction_per_day ?? 0}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_tea_deduction_per_day', Number(e.target.value))}
                                    placeholder="0"
                                    disabled={!ruleActive}
                                    helperText="Deducted from Employee Gross Pay (Present Days × ₹/day)."
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
                                </Stack>
                              )}
                            </Box>
                          </Box>
                        </Grid>

                        {/* Employee Canteen Deduction Card */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box
                            sx={{
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                              border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LuUtensils size={20} style={{ color: '#059669' }} />
                                    Canteen / Lunch Deduction (Employee)
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Employee canteen deduction per meal for {rule.employee_type || 'Custom Type'}.
                                  </Typography>
                                </Box>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: empCanteenEnabled ? '#059669' : 'text.secondary',
                                    }}
                                  >
                                    {empCanteenEnabled ? 'Enabled' : 'Disabled'}
                                  </Typography>
                                  <CustomSwitch
                                    checked={empCanteenEnabled}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'enable_employee_canteen_deduction', e.target.checked ? 1 : 0)}
                                    disabled={!ruleActive}
                                  />
                                </Stack>
                              </Stack>

                              {empCanteenEnabled && (
                                <Stack spacing={2.5}>
                                  <Autocomplete
                                    freeSolo
                                    openOnFocus
                                    forcePopupIcon
                                    autoHighlight
                                    disabled={!empCanteenEnabled || !ruleActive}
                                    options={deductionOptions}
                                    value={rule.canteen_deduction_component || 'Canteen Deduction'}
                                    onChange={(_event, newValue) => {
                                      handleUpdateSingleOtherStatutoryRule(rule.id, 'canteen_deduction_component', newValue || '');
                                    }}
                                    onInputChange={(_event, newInputValue) => {
                                      if (newInputValue !== undefined) {
                                        handleUpdateSingleOtherStatutoryRule(rule.id, 'canteen_deduction_component', newInputValue);
                                      }
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        label="Canteen Deduction Salary Component"
                                        placeholder="Select or type component name (e.g. Canteen Deduction)..."
                                        helperText="Salary Component used for Employee Canteen / Lunch deduction on salary slips"
                                      />
                                    )}
                                  />

                                  <TextField
                                    fullWidth
                                    size="medium"
                                    type="number"
                                    label="Canteen Deduction Rate (₹/meal)"
                                    value={rule.employee_canteen_deduction_per_meal ?? 0}
                                    onChange={(e) => handleUpdateSingleOtherStatutoryRule(rule.id, 'employee_canteen_deduction_per_meal', Number(e.target.value))}
                                    placeholder="0"
                                    disabled={!ruleActive}
                                    helperText="Deducted from Employee Gross Pay (All Canteen Entries × ₹/meal)."
                                    slotProps={{
                                      input: {
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                                          </InputAdornment>
                                        ),
                                        endAdornment: <InputAdornment position="end">/meal</InputAdornment>,
                                      },
                                      htmlInput: { min: 0, step: 1 },
                                    }}
                                  />
                                </Stack>
                              )}
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Box>
        )}
      </Box>

      {/* Tab Panel: Custom Earnings & Deductions */}
      <Box sx={{ display: currentTab === 'custom_components' ? 'block' : 'none' }}>
        {visitedTabs.custom_components && (
          <Box>
            {/* Header Banner */}
            <Card
              sx={{
                p: 3,
                mb: 3,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
              }}
            >
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Custom & Periodic Salary Components
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 780 }}>
                  Configure periodic or ad-hoc components (e.g. <b>Uniform Deductions</b>, <b>Safety Shoes</b>, <b>Festival Bonuses</b>, <b>Production Incentives</b>).
                  Deductions are appended directly to the Salary Slip <code>deductions</code> child table, and Earnings are appended to <code>earnings</code>, dynamically updating Net or Gross Pay.
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={handleAddCustomRule}
                startIcon={<LuPlus size={18} />}
                sx={{
                  bgcolor: COMMON_COLORS.primaryButton.bg,
                  color: COMMON_COLORS.primaryButton.color,
                  '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
                  borderRadius: '10px',
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  boxShadow: (theme) => `0 4px 12px ${alpha(COMMON_COLORS.emerald.main, 0.25)}`,
                  whiteSpace: 'nowrap',
                }}
              >
                Add Component Rule
              </Button>
            </Card>

            {/* Rules List or Empty State */}
            {getParsedCustomRules().length === 0 ? (
              <Card
                variant="outlined"
                sx={{
                  py: 6,
                  px: 3,
                  borderRadius: '14px',
                  bgcolor: 'background.paper',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <EmptyContent
                  icon="solar:document-text-bold-duotone"
                  title="No Custom Components Found"
                  description="Create and manage custom salary rules for earnings and deductions here."
                />
              </Card>
            ) : (
              <Stack spacing={2.5}>
                {getParsedCustomRules().map((rule, idx) => {
                  const isEarning = rule.type === 'Earning';
                  const isEnabled = isCheckEnabled(rule.enabled);
                  const selectedAssigneesCount = rule.target_employee_ids?.length || 0;

                  return (
                    <Card
                      key={rule.id || `rule-${idx}`}
                      variant="outlined"
                      sx={{
                        p: 3,
                        borderRadius: '14px',
                        border: (theme) =>
                          `1.5px solid ${
                            isEnabled
                              ? isEarning
                                ? alpha(COMMON_COLORS.emerald.main, 0.35)
                                : alpha(theme.palette.warning.main, 0.35)
                              : theme.palette.divider
                          }`,
                        boxShadow: (theme) =>
                          isEnabled
                            ? `0 4px 16px ${alpha(isEarning ? COMMON_COLORS.emerald.main : theme.palette.warning.main, 0.06)}`
                            : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Rule Top Bar */}
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        spacing={2}
                        sx={{ pb: 2.5, mb: 2.5, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
                          <Box
                            sx={{
                              px: 1.25,
                              py: 0.5,
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                              color: 'text.primary',
                              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              letterSpacing: 0.2,
                            }}
                          >
                            Rule No: {idx + 1}
                          </Box>

                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              px: 1.25,
                              py: 0.5,
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              bgcolor: isEarning
                                ? alpha(COMMON_COLORS.emerald.main, 0.1)
                                : alpha('#d97706', 0.1),
                              color: isEarning
                                ? COMMON_COLORS.emerald.darker
                                : '#b45309',
                              border: `1px solid ${isEarning ? alpha(COMMON_COLORS.emerald.main, 0.28) : alpha('#d97706', 0.28)}`,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                bgcolor: isEarning ? COMMON_COLORS.emerald.main : '#d97706',
                              }}
                            />
                            {isEarning ? 'Earning (Add to Gross)' : 'Deduction (Subtract from Net)'}
                          </Box>

                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.6,
                              px: 1.25,
                              py: 0.5,
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                              color: 'info.dark',
                              border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                            }}
                          >
                            <LuCalculator size={13} />
                            {rule.calculation_mode === 'fixed'
                              ? 'Fixed Flat Amount'
                              : rule.calculation_mode === 'per_day'
                              ? 'Per Present Day'
                              : rule.calculation_mode === 'per_ot_hour'
                              ? 'Per OT Hour'
                              : rule.calculation_mode === 'percent_gross'
                              ? '% of Gross Salary'
                              : rule.calculation_mode === 'percent_component'
                              ? '% of Selected Components'
                              : 'Calculation'}
                          </Box>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.25}
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleModifyCustomRule(idx, { enabled: !isEnabled })}
                          >
                            <CustomSwitch
                              checked={isEnabled}
                              onChange={(e: any) => handleModifyCustomRule(idx, { enabled: e.target.checked })}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: isEnabled ? 'text.primary' : 'text.disabled',
                                lineHeight: 1,
                              }}
                            >
                              {isEnabled ? 'Enabled' : 'Disabled'}
                            </Typography>
                          </Stack>

                          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

                          <Tooltip title="Delete Rule">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveCustomRule(idx)}
                              sx={{
                                width: 32,
                                height: 32,
                                color: 'error.main',
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                                '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.16) },
                              }}
                            >
                              <LuTrash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      {/* Fields Form */}
                      <Grid container spacing={2.5}>
                        {/* Row 1: Component Name (Autocomplete with freeSolo) */}
                        <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                          <Autocomplete
                            freeSolo
                            options={
                              rule.type === 'Earning'
                                ? Array.from(new Set([...earningOptions, 'Incentive', 'Production Bonus', 'Special Allowance', 'Night Shift Allowance', 'Attendance Bonus']))
                                : Array.from(new Set([...deductionOptions, 'Uniform Deduction', 'Safety Shoes', 'Mess Fee', 'Security Deposit', 'ID Card Fine', 'Loan Recovery', 'Advance Salary', 'Penalty']))
                            }
                            value={rule.name || ''}
                            onInputChange={(_e, newInputValue) => handleModifyCustomRule(idx, { name: newInputValue })}
                            onChange={(_e, newValue) => handleModifyCustomRule(idx, { name: newValue || '' })}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Component Name"
                                placeholder="Select or type component..."
                                helperText="Appears as child table row on the salary slip"
                                required
                              />
                            )}
                          />
                        </Grid>

                        {/* Row 1: Component Type */}
                        <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                          <FormControl fullWidth size="medium">
                            <InputLabel id={`rule-type-label-${idx}`}>Component Type</InputLabel>
                            <Select
                              labelId={`rule-type-label-${idx}`}
                              value={rule.type}
                              label="Component Type"
                              onChange={(e) => handleModifyCustomRule(idx, { type: e.target.value as any })}
                            >
                              <MenuItem value="Deduction">Deduction (Child Table: Deductions)</MenuItem>
                              <MenuItem value="Earning">Earning (Child Table: Earnings)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Row 1: Calculation Mode */}
                        <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                          <FormControl fullWidth size="medium">
                            <InputLabel id={`calc-mode-label-${idx}`}>Calculation Mode</InputLabel>
                            <Select
                              labelId={`calc-mode-label-${idx}`}
                              value={rule.calculation_mode}
                              label="Calculation Mode"
                              onChange={(e) => handleModifyCustomRule(idx, { calculation_mode: e.target.value as any })}
                            >
                              <MenuItem value="fixed">Fixed Flat Amount (₹)</MenuItem>
                              <MenuItem value="per_day">Per Present Day (₹/day)</MenuItem>
                              <MenuItem value="per_ot_hour">Per OT Hour (₹/hr)</MenuItem>
                              <MenuItem value="percent_gross">% of Gross Salary</MenuItem>
                              <MenuItem value="percent_component">% of Selected Component(s)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Row 2: Rate / Amount */}
                        <Grid size={{ xs: 12, sm: 6, md: rule.calculation_mode === 'percent_component' ? 3 : 4 }}>
                          <TextField
                            fullWidth
                            size="medium"
                            type="number"
                            label={
                              rule.calculation_mode === 'fixed'
                                ? 'Flat Amount'
                                : rule.calculation_mode === 'percent_gross' || rule.calculation_mode === 'percent_component'
                                ? 'Percentage Rate (%)'
                                : 'Rate per Unit (₹)'
                            }
                            value={rule.amount}
                            onChange={(e) =>
                              handleModifyCustomRule(idx, {
                                amount: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            placeholder="0"
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    {rule.calculation_mode === 'percent_gross' || rule.calculation_mode === 'percent_component' ? (
                                      '%'
                                    ) : (
                                      <Typography
                                        component="span"
                                        sx={{
                                          fontFamily: "Arial, 'sans-serif'",
                                          fontWeight: 700,
                                          fontSize: '0.875rem',
                                          color: 'text.secondary',
                                        }}
                                      >
                                        ₹
                                      </Typography>
                                    )}
                                  </InputAdornment>
                                ),
                                endAdornment: (
                                  <InputAdornment position="end">
                                    {rule.calculation_mode === 'per_day'
                                      ? '/day'
                                      : rule.calculation_mode === 'per_ot_hour'
                                      ? '/hr'
                                      : ''}
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: { min: 0, step: 0.01 },
                            }}
                            helperText={
                              rule.calculation_mode === 'fixed'
                                ? 'Fixed sum applied to each eligible employee'
                                : rule.calculation_mode === 'per_day'
                                ? 'Calculated as: Present Days × Rate'
                                : rule.calculation_mode === 'per_ot_hour'
                                ? 'Calculated as: Total OT Hours × Rate'
                                : rule.calculation_mode === 'percent_gross'
                                ? 'Calculated as: Rate% × Grand Gross Pay'
                                : rule.calculation_mode === 'percent_component'
                                ? 'Calculated as: Rate% × Selected Components Sum'
                                : ''
                            }
                          />
                        </Grid>

                        {/* Row 2: Selected Components (if percent_component) */}
                        {rule.calculation_mode === 'percent_component' && (
                          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                            <Autocomplete
                              multiple
                              options={earningOptions.length > 0 ? earningOptions : ['Basic Pay', 'DA', 'HRA', 'Other Allowance']}
                              value={rule.selected_components || []}
                              onChange={(_e, val) => handleModifyCustomRule(idx, { selected_components: val })}
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
                                  label="Components for % Calculation"
                                  placeholder="Select components (e.g. Basic Pay, DA)"
                                  helperText="Percentage will calculate from sum of these components"
                                />
                              )}
                            />
                          </Grid>
                        )}

                        {/* Row 2: Applicability Timing */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <FormControl fullWidth size="medium">
                            <InputLabel id={`timing-label-${idx}`}>Payroll Applicability</InputLabel>
                            <Select
                              labelId={`timing-label-${idx}`}
                              value={rule.applicability}
                              label="Payroll Applicability"
                              onChange={(e) => handleModifyCustomRule(idx, { applicability: e.target.value as any })}
                            >
                              <MenuItem value="always_active">Always Active (Every Payroll Month)</MenuItem>
                              <MenuItem value="specific_month">Specific Month Only (One-Time / Periodic)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Row 2: Specific Month (if applicable) */}
                        {rule.applicability === 'specific_month' && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                              <DatePicker
                                views={['year', 'month']}
                                label="Applicable Month"
                                value={rule.applicable_month ? dayjs(rule.applicable_month, 'YYYY-MM') : dayjs()}
                                onChange={(newVal: any) => {
                                  if (newVal && dayjs(newVal).isValid()) {
                                    handleModifyCustomRule(idx, {
                                      applicable_month: dayjs(newVal).format('YYYY-MM'),
                                    });
                                  }
                                }}
                                format="MMMM, YYYY"
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: 'medium',
                                    helperText: 'Rule executes ONLY for salary slips in this pay period',
                                  },
                                }}
                              />
                            </LocalizationProvider>
                          </Grid>
                        )}

                        {/* Row 3: Target Assignees Scope (ALWAYS on its own row) */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <FormControl fullWidth size="medium">
                            <InputLabel id={`target-type-label-${idx}`}>Target Assignees</InputLabel>
                            <Select
                              labelId={`target-type-label-${idx}`}
                              value={rule.target_type}
                              label="Target Assignees"
                              onChange={(e) => handleModifyCustomRule(idx, { target_type: e.target.value as any })}
                            >
                              <MenuItem value="all">All Active Employees (Universal)</MenuItem>
                              <MenuItem value="categories">By Employee Category</MenuItem>
                              <MenuItem value="assignees">Specific Assignees (Individual Employees)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Row 4: Target Categories (if categories) - ALWAYS full-width row */}
                        {rule.target_type === 'categories' && (
                          <Grid size={{ xs: 12 }}>
                            <Autocomplete
                              multiple
                              options={allEmployeeTypeOptions}
                              value={rule.target_categories || []}
                              onChange={(_e, val) => handleModifyCustomRule(idx, { target_categories: val })}
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
                                  label="Applicable Employee Categories"
                                  placeholder="Select employee types"
                                  helperText="Component will only be computed for employees belonging to selected categories"
                                />
                              )}
                            />
                          </Grid>
                        )}

                        {/* Row 4: Target Assignees Card (if assignees) - ALWAYS full-width row */}
                        {rule.target_type === 'assignees' && (
                          <Grid size={{ xs: 12 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  fontSize: '12px',
                                  color: 'text.secondary',
                                }}
                              >
                                Target Assignees ({selectedAssigneesCount} selected)
                              </Typography>

                              {selectedAssigneesCount > 0 && (
                                <Button
                                  size="small"
                                  variant="text"
                                  color="error"
                                  onClick={() => handleModifyCustomRule(idx, { target_employee_ids: [] })}
                                  sx={{ fontSize: '12px' }}
                                  startIcon={<Iconify icon={"solar:trash-bin-minimalistic-bold" as any} />}
                                >
                                  Clear All
                                </Button>
                              )}
                            </Stack>

                            <Card
                              variant="outlined"
                              sx={{
                                p: 2.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor:
                                  selectedAssigneesCount > 0
                                    ? alpha(COMMON_COLORS.emerald.main, 0.04)
                                    : (theme) => alpha(theme.palette.grey[500], 0.04),
                                borderColor:
                                  selectedAssigneesCount > 0
                                    ? alpha(COMMON_COLORS.emerald.main, 0.3)
                                    : 'divider',
                                borderRadius: 1.5,
                                gap: 2,
                                flexWrap: 'wrap',
                              }}
                            >
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor:
                                      selectedAssigneesCount > 0
                                        ? alpha(COMMON_COLORS.emerald.main, 0.12)
                                        : (theme) => alpha(theme.palette.grey[500], 0.12),
                                    color:
                                      selectedAssigneesCount > 0
                                        ? COMMON_COLORS.emerald.main
                                        : 'text.secondary',
                                  }}
                                >
                                  <Iconify icon={"solar:users-group-rounded-bold" as any} width={24} />
                                </Box>

                                <div>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 800,
                                      color:
                                        selectedAssigneesCount > 0
                                          ? COMMON_COLORS.emerald.darker
                                          : 'text.primary',
                                    }}
                                  >
                                    {selectedAssigneesCount === 0
                                      ? 'No Employees Selected'
                                      : `${selectedAssigneesCount} employees selected for this ${rule.type.toLowerCase()}`}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    {selectedAssigneesCount === 0
                                      ? 'Filter by Department, Shift, and Line Order.'
                                      : 'Will receive this component in their salary slip child table.'}
                                  </Typography>
                                </div>
                              </Stack>

                              <Button
                                size="small"
                                variant={selectedAssigneesCount > 0 ? 'outlined' : 'contained'}
                                onClick={() => setActiveAssigneeRuleIndex(idx)}
                                startIcon={<Iconify icon={"solar:filter-bold" as any} width={16} />}
                                sx={{
                                  ...(selectedAssigneesCount === 0
                                    ? {
                                        bgcolor: COMMON_COLORS.primaryButton.bg,
                                        color: COMMON_COLORS.primaryButton.color,
                                        '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
                                      }
                                    : {
                                        color: COMMON_COLORS.emerald.main,
                                        borderColor: COMMON_COLORS.emerald.main,
                                        '&:hover': {
                                          borderColor: COMMON_COLORS.emerald.darker,
                                          bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                                        },
                                      }),
                                }}
                              >
                                {selectedAssigneesCount === 0
                                  ? 'Select Assignees'
                                  : `Edit Selection (${selectedAssigneesCount})`}
                              </Button>
                            </Card>
                          </Grid>
                        )}
                      </Grid>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Tab Panel 4: Overtime, Allowance & Attendance Bonus (With Collapsible per Category) */}
      <Box sx={{ display: currentTab === 'ot_bonus_rules' ? 'block' : 'none' }}>
        {visitedTabs.ot_bonus_rules && (
          <Box>
          {CATEGORIES.filter((cat) => ['workers', 'drivers', 'north_indian'].includes(cat.key)).map((cat, idx) => {
            const rawVal = getFieldVal(cat.key, 'enable_overtime', null);
            let otEnabled = true;
            if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
              otEnabled = isCheckEnabled(rawVal);
            } else {
              try {
                const saved = localStorage.getItem('salary_slip_ot_rules_enabled');
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed && parsed[cat.key] !== undefined) {
                    otEnabled = isCheckEnabled(parsed[cat.key]);
                  }
                }
              } catch {
                // ignore
              }
            }

            return renderCategoryAccordion(
              cat,
              idx === 0,
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Overtime (OT) & Attendance Bonus Rules ({cat.title})
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Configure Overtime formulas, hourly rates, and attendance bonus policies for {cat.title}.
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: otEnabled ? '#059669' : 'text.secondary',
                      }}
                    >
                      {otEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <CustomSwitch
                      checked={otEnabled}
                      onChange={(e) => {
                        const nextVal = e.target.checked ? 1 : 0;
                        setFieldVal(cat.key, 'enable_overtime', nextVal);
                        try {
                          const saved = localStorage.getItem('salary_slip_ot_rules_enabled');
                          const parsed = saved ? JSON.parse(saved) : {};
                          parsed[cat.key] = nextVal;
                          localStorage.setItem('salary_slip_ot_rules_enabled', JSON.stringify(parsed));
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  </Stack>
                </Stack>

                <Divider />

                <Grid container spacing={3}>
                  {cat.key === 'workers' && (
                    <>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Workers OT Multiplier"
                          value={data.workers_ot_rate_multiplier ?? '2'}
                          onChange={(e) => onChange('workers_ot_rate_multiplier', e.target.value)}
                          placeholder="2"
                          disabled={!otEnabled}
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
                            htmlInput: { min: 0, max: 5, step: 0.5 },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Workers Attendance Bonus"
                          value={data.workers_attendance_bonus ?? '1500'}
                          onChange={(e) => onChange('workers_attendance_bonus', e.target.value)}
                          placeholder="1500"
                          disabled={!otEnabled}
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
                    </>
                  )}

                  {cat.key === 'drivers' && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Drivers OT Multiplier"
                        value={data.drivers_ot_rate_multiplier ?? '2'}
                        onChange={(e) => onChange('drivers_ot_rate_multiplier', e.target.value)}
                        placeholder="2"
                        disabled={!otEnabled}
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
                          htmlInput: { min: 0, max: 5, step: 0.5 },
                        }}
                      />
                    </Grid>
                  )}

                  {cat.key === 'north_indian' && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="North Indian OT Fixed Rate"
                        value={data.north_indian_ot_rate ?? '100'}
                        onChange={(e) => onChange('north_indian_ot_rate', e.target.value)}
                        placeholder="100"
                        disabled={!otEnabled}
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
                </Grid>
              </Stack>
            );
          })}

          {/* Company Other Employee Overtime Settings Configuration */}
          <Card
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: (theme) => theme.customShadows?.z1 || 'none',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LuCalculator size={20} style={{ color: '#059669' }} />
                  Company Other Employee Overtime Settings
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  Configure custom overtime rules and calculation formulas (via Basic Salary, Fixed Hourly Rate, or Gross Salary) for other Employee Types.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<LuPlus size={16} />}
                onClick={handleAddOtherOvertimeRule}
                sx={{
                  bgcolor: '#059669',
                  color: '#fff',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1.5,
                }}
              >
                Add Overtime Rule
              </Button>
            </Box>

            {getParsedOtherOvertimeRules().length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  px: 2,
                  textAlign: 'center',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                  borderRadius: 2,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, mt: 2, fontWeight: 600 }}>
                  No custom employee type overtime rules configured yet.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 2 }}>
                  Click &quot;Add Overtime Rule&quot; to configure custom overtime policies for other employee types (e.g. Security, Staff, House Keeping).
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {getParsedOtherOvertimeRules().map((rule, idx) => {
                  const isFixed = rule.calculation_type === 'fixed';
                  const isGross = rule.calculation_type !== 'fixed';

                  const allOtherRules = getParsedOtherOvertimeRules();
                  const assignedToOtherRules = allOtherRules
                    .filter((r) => r.id !== rule.id && r.employee_type)
                    .map((r) => r.employee_type.trim().toLowerCase());

                  const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;

                  const availableEmployeeTypeOptions = baseOptions.filter((type) => {
                    const t = (type || '').trim().toLowerCase();
                    // Always include the current rule's selected type so it stays selected in this card
                    if (rule.employee_type && t === rule.employee_type.trim().toLowerCase()) {
                      return true;
                    }
                    // Exclude types that already have their dedicated section (Workers, Drivers, North Indian)
                    if (isDedicatedOvertimeCategory(t)) {
                      return false;
                    }
                    // Exclude types already chosen in other rule cards
                    if (assignedToOtherRules.includes(t)) {
                      return false;
                    }
                    return true;
                  });

                  return (
                    <Card
                      key={rule.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${rule.enabled ? alpha('#059669', 0.35) : theme.palette.divider}`,
                        bgcolor: (theme) => (rule.enabled ? alpha('#059669', 0.02) : theme.palette.background.paper),
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Rule Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                          <Chip
                            label={`Rule No: ${idx + 1}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: rule.enabled ? alpha('#059669', 0.12) : alpha('#64748b', 0.12),
                              color: rule.enabled ? '#059669' : 'text.secondary',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {rule.employee_type || 'Unassigned Employee Type'}
                          </Typography>
                          <Chip
                            label={
                              isFixed
                                ? `₹${rule.fixed_rate || 100}/hr (Fixed Rate)`
                                : `${rule.multiplier || 2}× Rate (Via Gross)`
                            }
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: isFixed ? '#f59e0b' : '#059669',
                              color: isFixed ? '#d97706' : '#059669',
                              bgcolor: isFixed ? alpha('#f59e0b', 0.05) : alpha('#059669', 0.05),
                            }}
                          />
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: rule.enabled ? '#059669' : 'text.secondary',
                              }}
                            >
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </Typography>
                            <CustomSwitch
                              checked={Boolean(rule.enabled)}
                              onChange={(e) => handleUpdateSingleOtherOvertimeRule(rule.id, 'enabled', e.target.checked ? 1 : 0)}
                            />
                          </Stack>
                          <Tooltip title="Remove Rule">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveOtherOvertimeRule(rule.id)}
                              sx={{ color: 'error.main', '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
                            >
                              <LuTrash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>

                      <Divider sx={{ mb: 2.5 }} />

                      {/* Rule Fields */}
                      <Grid container spacing={2.5}>
                        {/* Employee Type Autocomplete */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Autocomplete
                            value={rule.employee_type || ''}
                            onChange={(_e, val) => handleUpdateSingleOtherOvertimeRule(rule.id, 'employee_type', val || '')}
                            options={availableEmployeeTypeOptions}
                            disabled={!rule.enabled}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                label="Employee Type"
                                placeholder="Select Employee Type"
                                helperText="Employee category this overtime formula applies to"
                                slotProps={{
                                  input: {
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <InputAdornment position="start">
                                          <LuUser size={18} style={{ opacity: 0.6, marginLeft: 6 }} />
                                        </InputAdornment>
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  },
                                }}
                              />
                            )}
                          />
                        </Grid>

                        {/* Calculation Formula Type */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth disabled={!rule.enabled}>
                            <InputLabel>Calculation Formula</InputLabel>
                            <Select
                              value={rule.calculation_type || 'gross'}
                              label="Calculation Formula"
                              onChange={(e) => handleUpdateSingleOtherOvertimeRule(rule.id, 'calculation_type', e.target.value)}
                            >
                              <MenuItem value="gross">Formula via Gross Salary (Gross ÷ Days ÷ Hours)</MenuItem>
                              <MenuItem value="fixed">Fixed Hourly Rate (₹ / hr)</MenuItem>
                            </Select>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, ml: 1.5 }}>
                              {isFixed
                                ? 'Fixed amount per OT hour regardless of monthly salary'
                                : 'Rate = (Gross Salary ÷ Working Days ÷ Shift Hours) × Multiplier'}
                            </Typography>
                          </FormControl>
                        </Grid>

                        {/* Dynamic parameters for Gross */}
                        {isGross && (
                          <>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField
                                fullWidth
                                type="number"
                                label="OT Multiplier"
                                value={rule.multiplier ?? 2}
                                onChange={(e) => handleUpdateSingleOtherOvertimeRule(rule.id, 'multiplier', Number(e.target.value))}
                                placeholder="2"
                                disabled={!rule.enabled}
                                helperText="e.g. 1.0 (Single Rate), 2.0 (Double Rate)"
                                slotProps={{
                                  input: {
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <LuCalculator size={18} style={{ opacity: 0.6, marginLeft: 6 }} />
                                      </InputAdornment>
                                    ),
                                    endAdornment: <InputAdornment position="end">x</InputAdornment>,
                                  },
                                  htmlInput: { min: 0.5, max: 5, step: 0.5 },
                                }}
                              />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField
                                fullWidth
                                type="number"
                                label="Working Days Basis"
                                value={rule.working_days_basis ?? 26}
                                onChange={(e) => handleUpdateSingleOtherOvertimeRule(rule.id, 'working_days_basis', Number(e.target.value))}
                                placeholder="26"
                                disabled={!rule.enabled}
                                helperText="Standard divisor days (default 26 days/month)"
                                slotProps={{
                                  input: {
                                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                                  },
                                  htmlInput: { min: 20, max: 31, step: 1 },
                                }}
                              />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField
                                fullWidth
                                type="number"
                                label="Shift Hours per Day"
                                value={rule.shift_hours ?? 8}
                                onChange={(e) => handleUpdateSingleOtherOvertimeRule(rule.id, 'shift_hours', Number(e.target.value))}
                                placeholder="8"
                                disabled={!rule.enabled}
                                helperText="Standard shift length (default 8 hours/day)"
                                slotProps={{
                                  input: {
                                    endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                                  },
                                  htmlInput: { min: 4, max: 12, step: 1 },
                                }}
                              />
                            </Grid>
                          </>
                        )}

                        {/* Dynamic parameters for Fixed Rate */}
                        {isFixed && (
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Fixed Rate per Hour"
                              value={rule.fixed_rate ?? 100}
                              onChange={(e) => handleUpdateSingleOtherOvertimeRule(rule.id, 'fixed_rate', Number(e.target.value))}
                              placeholder="100"
                              disabled={!rule.enabled}
                              helperText="Fixed amount paid per overtime hour (OT Hours × Rate)"
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

                        {/* Live Formula Preview */}
                        <Grid size={{ xs: 12 }}>
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: (theme) => alpha(rule.enabled ? '#059669' : theme.palette.grey[500], 0.05),
                              borderRadius: 1.5,
                              border: (theme) => `1px dashed ${rule.enabled ? '#059669' : theme.palette.divider}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <LuCalculator size={18} style={{ color: rule.enabled ? '#059669' : '#64748b', flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                              {isGross && `Formula: (${rule.employee_type || 'Employee'} Gross Salary ÷ ${rule.working_days_basis || 26} days ÷ ${rule.shift_hours || 8} hrs) × ${rule.multiplier || 2}× × OT Hours`}
                              {isFixed && `Formula: ₹${rule.fixed_rate || 0} / hr × OT Hours`}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>

          {/* Annual & Festival Bonus Schemes Configuration */}
          <Card
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: (theme) => theme.customShadows?.z1 || 'none',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LuGift size={20} style={{ color: '#059669' }} />
                  Annual & Festival Bonus Schemes
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  Configure periodic bonus schemes (e.g. Diwali Bonus, Annual Statutory Bonus) with eligible employee categories, calculation formulas, and payout months.
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="small"
                startIcon={<LuCirclePlus size={18} />}
                onClick={handleAddBonusScheme}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 1.5,
                }}
              >
                Add Bonus Scheme
              </Button>
            </Box>

            {getParsedBonusSchemes().length === 0 ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
                  borderRadius: 1.5,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <LuGift size={32} style={{ opacity: 0.4, color: '#059669', marginBottom: 8 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  No bonus schemes configured yet.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                  Click &quot;Add Bonus Scheme&quot; above to configure Diwali, annual, or custom festival bonuses.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {getParsedBonusSchemes().map((scheme, sIdx) => {
                  const isActive = isCheckEnabled(scheme.is_active);
                  return (
                    <Card
                      key={scheme.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 1.5,
                        bgcolor: isActive ? 'background.paper' : (theme) => alpha(theme.palette.action.disabledBackground, 0.3),
                        border: 1,
                        borderColor: isActive ? 'divider' : 'action.disabledBackground',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isActive ? 2.5 : 0 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Chip
                            label={`Scheme ${sIdx + 1}`}
                            size="small"
                            sx={{
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                              color: 'primary.dark',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {scheme.scheme_name || 'Bonus Scheme'}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            onClick={() => handleUpdateSingleScheme(scheme.id, 'is_active', isActive ? 0 : 1)}
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <CustomSwitch
                              checked={isActive}
                              onChange={(e) => handleUpdateSingleScheme(scheme.id, 'is_active', e.target.checked ? 1 : 0)}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: isActive ? '#059669' : 'text.disabled',
                              }}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Typography>
                          </Stack>

                          <Tooltip title="Delete Scheme">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveBonusScheme(scheme.id)}
                              sx={{
                                color: 'error.main',
                                p: 0.75,
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                                },
                              }}
                            >
                              <LuTrash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>

                      <Collapse in={isActive}>
                        <Grid container spacing={2.5}>
                        {/* Scheme Name */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <TextField
                            fullWidth
                            size="medium"
                            label="Bonus Scheme Name"
                            value={scheme.scheme_name}
                            onChange={(e) => handleUpdateSingleScheme(scheme.id, 'scheme_name', e.target.value)}
                            placeholder="e.g. Diwali Annual Bonus"
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>

                        {/* Payout Month(s) - Chip selector */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <Autocomplete
                            multiple
                            size="medium"
                            options={MONTH_NAMES}
                            value={scheme.payout_months || []}
                            onChange={(_e, val) => handleUpdateSingleScheme(scheme.id, 'payout_months', val)}
                            renderTags={(tagValue, getTagProps) =>
                              tagValue.map((option, index) => (
                                <Chip
                                  label={option}
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                  sx={{
                                    bgcolor: '#00875a',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    borderRadius: '16px',
                                    height: 26,
                                    fontSize: '0.8rem',
                                    '& .MuiChip-deleteIcon': {
                                      color: 'rgba(255, 255, 255, 0.85)',
                                      '&:hover': { color: '#ffffff' },
                                    },
                                  }}
                                />
                              ))
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="medium"
                                label="Payout Month(s)"
                                placeholder={(!scheme.payout_months || scheme.payout_months.length === 0) ? 'Select month' : ''}
                                InputLabelProps={{ shrink: true }}
                              />
                            )}
                          />
                        </Grid>

                        {/* Calculation Method */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <FormControl fullWidth size="medium">
                            <InputLabel id={`calc-method-label-${scheme.id}`} shrink>Calculation Method</InputLabel>
                            <Select
                              labelId={`calc-method-label-${scheme.id}`}
                              size="medium"
                              value={scheme.calc_method || 'Percentage of Selected Components'}
                              onChange={(e) => handleUpdateSingleScheme(scheme.id, 'calc_method', e.target.value)}
                              label="Calculation Method"
                            >
                              {BONUS_CALC_METHODS.map((method) => (
                                <MenuItem key={method} value={method}>{method}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Calculation Base Components (Component Select Functionality) */}
                        {scheme.calc_method !== 'Flat Fixed Amount' && scheme.calc_method !== 'Percentage of Gross' && (
                          <Grid size={{ xs: 12 }}>
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                border: '1px dashed',
                                borderColor: (theme) => alpha(theme.palette.primary.main, 0.28),
                              }}
                            >
                              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Calculation Base Components (Earning Basis)
                                  </Typography>
                                  <Chip
                                    label="Bonus % calculated on sum of selected components"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.68rem',
                                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                      color: 'primary.dark',
                                      fontWeight: 600,
                                    }}
                                  />
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => handleUpdateSingleScheme(scheme.id, 'calculation_components', earningOptions)}
                                    sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: '#059669', fontWeight: 700 }}
                                  >
                                    Select All
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => handleUpdateSingleScheme(scheme.id, 'calculation_components', ['Basic Pay', 'DA'].filter((c) => earningOptions.includes(c)))}
                                    sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: '#059669', fontWeight: 600 }}
                                  >
                                    Reset to Basic + DA
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="inherit"
                                    onClick={() => handleUpdateSingleScheme(scheme.id, 'calculation_components', [])}
                                    sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                                  >
                                    Clear
                                  </Button>
                                </Stack>
                              </Stack>

                              <Autocomplete
                                multiple
                                size="medium"
                                options={earningOptions}
                                value={scheme.calculation_components || ['Basic Pay', 'DA']}
                                onChange={(_e, val) => handleUpdateSingleScheme(scheme.id, 'calculation_components', val)}
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => (
                                    <Chip
                                      label={option}
                                      size="small"
                                      {...getTagProps({ index })}
                                      key={option}
                                      sx={{
                                        bgcolor: '#00875a',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                        borderRadius: '16px',
                                        height: 26,
                                        fontSize: '0.8rem',
                                        '& .MuiChip-deleteIcon': {
                                          color: 'rgba(255, 255, 255, 0.85)',
                                          '&:hover': { color: '#ffffff' },
                                        },
                                      }}
                                    />
                                  ))
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="medium"
                                    placeholder={(!scheme.calculation_components || scheme.calculation_components.length === 0) ? 'Select components (e.g. Basic Pay, DA)' : ''}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                )}
                              />
                            </Box>
                          </Grid>
                        )}

                        {/* Applicable Categories (All Filter Support) */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ width: '100%' }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                Applicable Categories
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => handleUpdateSingleScheme(scheme.id, 'categories', ['all'])}
                                  sx={{ fontSize: '0.75rem', py: 0, px: 0.8, textTransform: 'none', color: '#059669', fontWeight: 700 }}
                                >
                                  All Categories
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  color="inherit"
                                  onClick={() => handleUpdateSingleScheme(scheme.id, 'categories', [])}
                                  sx={{ fontSize: '0.75rem', py: 0, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                                >
                                  Clear
                                </Button>
                              </Stack>
                            </Stack>

                            <Autocomplete
                              multiple
                              size="medium"
                              options={BONUS_CATEGORY_OPTIONS.map((c) => c.value)}
                              getOptionLabel={(val) => BONUS_CATEGORY_OPTIONS.find((c) => c.value === val)?.label || val}
                              value={
                                (scheme.categories || []).includes('all') || (scheme.categories || []).length === ALL_CATEGORY_VALUES.length
                                  ? ['all']
                                  : (scheme.categories || [])
                              }
                              onChange={(_e, val) => {
                                if (val.includes('all')) {
                                  const wasAll = (scheme.categories || []).includes('all') || (scheme.categories || []).length === ALL_CATEGORY_VALUES.length;
                                  if (wasAll) {
                                    handleUpdateSingleScheme(scheme.id, 'categories', val.filter((v) => v !== 'all'));
                                  } else {
                                    handleUpdateSingleScheme(scheme.id, 'categories', ['all']);
                                  }
                                } else {
                                  handleUpdateSingleScheme(scheme.id, 'categories', val);
                                }
                              }}
                              renderTags={(tagValue, getTagProps) =>
                                tagValue.map((option, index) => {
                                  const label = BONUS_CATEGORY_OPTIONS.find((c) => c.value === option)?.label || option;
                                  return (
                                    <Chip
                                      label={label}
                                      size="small"
                                      {...getTagProps({ index })}
                                      key={option}
                                      sx={{
                                        bgcolor: '#00875a',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                        borderRadius: '16px',
                                        height: 26,
                                        fontSize: '0.8rem',
                                        '& .MuiChip-deleteIcon': {
                                          color: 'rgba(255, 255, 255, 0.85)',
                                          '&:hover': { color: '#ffffff' },
                                        },
                                      }}
                                    />
                                  );
                                })
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  size="medium"
                                  placeholder={(!scheme.categories || scheme.categories.length === 0) ? 'All Categories' : ''}
                                  InputLabelProps={{ shrink: true }}
                                />
                              )}
                            />
                          </Box>
                        </Grid>

                        {/* Applicable Departments (All Filter Support) */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ width: '100%' }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                Applicable Departments
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => handleUpdateSingleScheme(scheme.id, 'departments', ['all'])}
                                  sx={{ fontSize: '0.75rem', py: 0, px: 0.8, textTransform: 'none', color: '#059669', fontWeight: 700 }}
                                >
                                  All Departments
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  color="inherit"
                                  onClick={() => handleUpdateSingleScheme(scheme.id, 'departments', [])}
                                  sx={{ fontSize: '0.75rem', py: 0, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                                >
                                  Clear
                                </Button>
                              </Stack>
                            </Stack>

                            <Autocomplete
                              multiple
                              size="medium"
                              options={['all', ...departmentOptions]}
                              getOptionLabel={(val) => (val === 'all' ? 'All Departments' : val)}
                              value={
                                (scheme.departments || []).includes('all') ||
                                ((scheme.departments || []).length === departmentOptions.length && departmentOptions.length > 0)
                                  ? ['all']
                                  : (scheme.departments || [])
                              }
                              onChange={(_e, val) => {
                                if (val.includes('all')) {
                                  const wasAll = (scheme.departments || []).includes('all');
                                  if (wasAll) {
                                    handleUpdateSingleScheme(scheme.id, 'departments', val.filter((v) => v !== 'all'));
                                  } else {
                                    handleUpdateSingleScheme(scheme.id, 'departments', ['all']);
                                  }
                                } else {
                                  handleUpdateSingleScheme(scheme.id, 'departments', val);
                                }
                              }}
                              renderTags={(tagValue, getTagProps) =>
                                tagValue.map((option, index) => (
                                  <Chip
                                    label={option === 'all' ? 'All Departments' : option}
                                    size="small"
                                    {...getTagProps({ index })}
                                    key={option}
                                    sx={{
                                      bgcolor: '#00875a',
                                      color: '#ffffff',
                                      fontWeight: 600,
                                      borderRadius: '16px',
                                      height: 26,
                                      fontSize: '0.8rem',
                                      '& .MuiChip-deleteIcon': {
                                        color: 'rgba(255, 255, 255, 0.85)',
                                        '&:hover': { color: '#ffffff' },
                                      },
                                    }}
                                  />
                                ))
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  size="medium"
                                  placeholder={
                                    !scheme.departments || scheme.departments.length === 0
                                      ? 'All Departments'
                                      : ''
                                  }
                                  InputLabelProps={{ shrink: true }}
                                />
                              )}
                            />
                          </Box>
                        </Grid>

                        {/* Percentage & Ceiling OR Flat Amount */}
                        {scheme.calc_method === 'Flat Fixed Amount' ? (
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              fullWidth
                              size="medium"
                              type="number"
                              label="Flat Bonus Amount (₹)"
                              value={scheme.flat_amount ?? 0}
                              onChange={(e) => handleUpdateSingleScheme(scheme.id, 'flat_amount', e.target.value === '' ? 0 : Number(e.target.value))}
                              InputLabelProps={{ shrink: true }}
                              slotProps={{
                                input: {
                                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                },
                              }}
                            />
                          </Grid>
                        ) : (
                          <>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <TextField
                                fullWidth
                                size="medium"
                                type="number"
                                label="Bonus Percentage (%)"
                                value={scheme.percentage ?? 8.33}
                                onChange={(e) => handleUpdateSingleScheme(scheme.id, 'percentage', e.target.value === '' ? '' : Number(e.target.value))}
                                InputLabelProps={{ shrink: true }}
                                slotProps={{
                                  input: {
                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                  },
                                  htmlInput: { step: '0.01', min: 0, max: 100 },
                                }}
                                helperText="Statutory default: 8.33%"
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <TextField
                                fullWidth
                                size="medium"
                                type="number"
                                label="Wage Ceiling Limit (₹)"
                                value={scheme.wage_ceiling ?? 7000}
                                onChange={(e) => handleUpdateSingleScheme(scheme.id, 'wage_ceiling', e.target.value === '' ? 0 : Number(e.target.value))}
                                InputLabelProps={{ shrink: true }}
                                slotProps={{
                                  input: {
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  },
                                  htmlInput: { step: 500, min: 0 },
                                }}
                                helperText="e.g. ₹7,000 ceiling (0 for uncapped)"
                              />
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Collapse>
                  </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Box>
        )}
      </Box>

      {/* Tab Panel 5: Employer Statutory Contributions & CTC Rules (With Collapsible per Category) */}
      <Box sx={{ display: currentTab === 'employer_statutory' ? 'block' : 'none' }}>
        {visitedTabs.employer_statutory && (
          <Box>
          {CATEGORIES.filter((cat) => cat.key !== 'general').map((cat, idx) => {
            const rawStatutoryVal = getFieldVal(cat.key, 'enable_employer_statutory', null);
            let employerStatutoryEnabled = true;
            if (rawStatutoryVal !== null && rawStatutoryVal !== undefined && rawStatutoryVal !== '') {
              employerStatutoryEnabled = isCheckEnabled(rawStatutoryVal);
            } else {
              try {
                const saved = localStorage.getItem('salary_slip_employer_statutory_rules_enabled');
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed && parsed[cat.key] !== undefined) {
                    employerStatutoryEnabled = isCheckEnabled(parsed[cat.key]);
                  }
                }
              } catch {
                // ignore
              }
            }

            const bonusEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_bonus_provision', 1));
            const elEnabled = isCheckEnabled(getFieldVal(cat.key, 'enable_el_provision', 1));

            return renderCategoryAccordion(
              cat,
              idx === 0,
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Employer Statutory Contributions & CTC Rules ({cat.title})
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Configure employer contributions, PF/ESI rates, and CTC provisions for {cat.title}.
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: employerStatutoryEnabled ? '#059669' : 'text.secondary',
                      }}
                    >
                      {employerStatutoryEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <CustomSwitch
                      checked={employerStatutoryEnabled}
                      onChange={(e) => {
                        const nextVal = e.target.checked ? 1 : 0;
                        setFieldVal(cat.key, 'enable_employer_statutory', nextVal);
                        try {
                          const saved = localStorage.getItem('salary_slip_employer_statutory_rules_enabled');
                          const parsed = saved ? JSON.parse(saved) : {};
                          parsed[cat.key] = nextVal;
                          localStorage.setItem('salary_slip_employer_statutory_rules_enabled', JSON.stringify(parsed));
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  </Stack>
                </Stack>

                <Divider />

                <Box
                  sx={{
                    opacity: employerStatutoryEnabled ? 1 : 0.6,
                    pointerEvents: employerStatutoryEnabled ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease',
                  }}
                >
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
                        disabled={!employerStatutoryEnabled}
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
                        disabled={!employerStatutoryEnabled}
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
                        disabled={!employerStatutoryEnabled}
                        helperText="Contribution cap applied when wage is above or equal to ceiling (₹1,800)."
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

                    {/* PF Admin & EDLI Wage Basis (Not needed for CTC Staff) */}
                    {cat.key !== 'staff_ctc' && (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <FormControl fullWidth disabled={!employerStatutoryEnabled}>
                          <InputLabel id={`admin-edli-basis-label-${cat.key}`}>PF Admin & EDLI Basis</InputLabel>
                          <Select
                            labelId={`admin-edli-basis-label-${cat.key}`}
                            id={`pf_admin_edli_basis_${cat.key}`}
                            value={getFieldVal(cat.key, 'pf_admin_edli_basis', cat.key === 'staff_non_ctc' ? 'Percentage of Gross Salary' : 'Statutory PF Wage (Capped at Ceiling)')}
                            label="PF Admin & EDLI Basis"
                            onChange={(e) => setFieldVal(cat.key, 'pf_admin_edli_basis', e.target.value)}
                            disabled={!employerStatutoryEnabled}
                          >
                            <MenuItem value="Statutory PF Wage (Capped at Ceiling)">Statutory PF Wage (Capped at Ceiling)</MenuItem>
                            <MenuItem value="Percentage of Gross Salary">Percentage of Gross Salary</MenuItem>
                            <MenuItem value="Actual PF Wage (Uncapped)">Actual PF Wage (Uncapped)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {/* PF Admin & EDLI Gross Basis % */}
                    {cat.key !== 'staff_ctc' && getFieldVal(cat.key, 'pf_admin_edli_basis', cat.key === 'staff_non_ctc' ? 'Percentage of Gross Salary' : 'Statutory PF Wage (Capped at Ceiling)') === 'Percentage of Gross Salary' && (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Admin & EDLI Gross Basis (%)"
                          value={getFieldVal(cat.key, 'pf_admin_edli_gross_percent', cat.key === 'staff_non_ctc' ? '90' : '100')}
                          onChange={(e) => setFieldVal(cat.key, 'pf_admin_edli_gross_percent', e.target.value)}
                          placeholder="90"
                          disabled={!employerStatutoryEnabled}
                          helperText="Calculated on: (Gross × % ) × Rate."
                          slotProps={{
                            input: {
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            },
                            htmlInput: { min: 0, max: 100, step: 1 },
                          }}
                        />
                      </Grid>
                    )}

                    {/* PF Admin Charges */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="PF Admin Charges (%)"
                        value={getFieldVal(cat.key, 'pf_admin_rate', '0.5')}
                        onChange={(e) => setFieldVal(cat.key, 'pf_admin_rate', e.target.value)}
                        placeholder="0.5"
                        disabled={!employerStatutoryEnabled}
                        helperText={
                          cat.key === 'staff_ctc'
                            ? `EPFO Admin Charges (Capped at ₹${(Number(getFieldVal(cat.key, 'employer_pf_wage_ceiling', '15000') || 15000) * (Number(getFieldVal(cat.key, 'pf_admin_rate', '0.5') || 0.5) / 100)).toFixed(0)} = ₹${Number(getFieldVal(cat.key, 'employer_pf_wage_ceiling', '15000') || 15000).toLocaleString('en-IN')} × ${getFieldVal(cat.key, 'pf_admin_rate', '0.5')}%)`
                            : "EPFO Admin charges rate."
                        }
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
                        disabled={!employerStatutoryEnabled}
                        helperText={
                          cat.key === 'staff_ctc'
                            ? `Deposit Linked Insurance (Capped at ₹${(Number(getFieldVal(cat.key, 'employer_pf_wage_ceiling', '15000') || 15000) * (Number(getFieldVal(cat.key, 'edli_rate', '0.5') || 0.5) / 100)).toFixed(0)} = ₹${Number(getFieldVal(cat.key, 'employer_pf_wage_ceiling', '15000') || 15000).toLocaleString('en-IN')} × ${getFieldVal(cat.key, 'edli_rate', '0.5')}%)`
                            : "Deposit Linked Insurance."
                        }
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
                        disabled={!employerStatutoryEnabled}
                        helperText={`ESI Contribution (Gross less than or equal to ₹${Number(getFieldVal(cat.key, 'esi_wage_ceiling', '21000') || 21000).toLocaleString('en-IN')}).`}
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          },
                          htmlInput: { min: 0, max: 100, step: 0.05 },
                        }}
                      />
                    </Grid>

                    {/* ESI Wage Ceiling */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="ESI Wage Ceiling"
                        value={getFieldVal(cat.key, 'esi_wage_ceiling', '21000')}
                        onChange={(e) => setFieldVal(cat.key, 'esi_wage_ceiling', e.target.value)}
                        placeholder="21000"
                        disabled={!employerStatutoryEnabled}
                        helperText={`Statutory threshold (Gross <= ₹${Number(getFieldVal(cat.key, 'esi_wage_ceiling', '21000') || 21000).toLocaleString('en-IN')}).`}
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
                              disabled={!employerStatutoryEnabled}
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
                            disabled={!employerStatutoryEnabled}
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
                              disabled={!employerStatutoryEnabled}
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
                            disabled={!employerStatutoryEnabled}
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
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
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
                                disabled={!employerStatutoryEnabled}
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
                              disabled={!employerStatutoryEnabled}
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
                      </Box>
                    </Grid>

                    {/* Lunch Expenses (Employer CTC) Card */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                          border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Lunch Expenses (Employer CTC)
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Company lunch expense incurred per canteen meal for {cat.title}.
                              </Typography>
                            </Box>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: isCheckEnabled(getFieldVal(cat.key, 'enable_lunch_allowance', 1)) ? '#059669' : 'text.secondary',
                                }}
                              >
                                {isCheckEnabled(getFieldVal(cat.key, 'enable_lunch_allowance', 1)) ? 'Enabled' : 'Disabled'}
                              </Typography>
                              <CustomSwitch
                                checked={isCheckEnabled(getFieldVal(cat.key, 'enable_lunch_allowance', 1))}
                                disabled={!employerStatutoryEnabled}
                                onChange={(e) => setFieldVal(cat.key, 'enable_lunch_allowance', e.target.checked ? 1 : 0)}
                              />
                            </Stack>
                          </Stack>

                          {isCheckEnabled(getFieldVal(cat.key, 'enable_lunch_allowance', 1)) && (
                            <TextField
                              fullWidth
                              size="medium"
                              type="number"
                              label="Lunch Expense Rate (₹/meal)"
                              value={getFieldVal(cat.key, 'lunch_allowance_per_meal', '50')}
                              onChange={(e) => setFieldVal(cat.key, 'lunch_allowance_per_meal', e.target.value)}
                              placeholder="50"
                              disabled={!employerStatutoryEnabled}
                              helperText="Calculated from Canteen entries (All Canteen Entries × ₹/meal). Default: ₹50/meal."
                              slotProps={{
                                input: {
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                                    </InputAdornment>
                                  ),
                                  endAdornment: <InputAdornment position="end">/meal</InputAdornment>,
                                },
                                htmlInput: { min: 0, step: 1 },
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            );
          })}

          {/* Other Employee Employer Statutory & CTC Rules */}
          <Card
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: (theme) => theme.customShadows?.z1 || 'none',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LuBuilding2 size={20} style={{ color: '#059669' }} />
                  Other Employee Employer Statutory &amp; CTC Rules
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  Configure custom Employer PF, ESI, Admin/EDLI, Bonus &amp; EL provisions, and Employer expenses for other Employee Types.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<LuPlus size={16} />}
                onClick={handleAddOtherEmployerStatutoryRule}
                sx={{
                  bgcolor: '#059669',
                  color: '#fff',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 1.5,
                }}
              >
                Add Employer Statutory Rule
              </Button>
            </Box>

            {getParsedOtherEmployerStatutoryRules().length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  px: 2,
                  textAlign: 'center',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                  borderRadius: 2,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, mt: 2, fontWeight: 600 }}>
                  No custom employee type employer statutory rules configured yet.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 2 }}>
                  Click &quot;Add Employer Statutory Rule&quot; to configure custom employer PF, ESI, and CTC contributions for other employee types (e.g. Security, House Keeping, STP).
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {getParsedOtherEmployerStatutoryRules().map((rule, idx) => {
                  const ruleActive = isCheckEnabled(rule.enabled);
                  const bonusEnabled = isCheckEnabled(rule.enable_bonus_provision);
                  const elEnabled = isCheckEnabled(rule.enable_el_provision);
                  const teaEnabled = isCheckEnabled(rule.enable_tea_allowance);
                  const lunchEnabled = isCheckEnabled(rule.enable_lunch_allowance);

                  const allOtherRules = getParsedOtherEmployerStatutoryRules();
                  const assignedToOtherRules = allOtherRules
                    .filter((r) => r.id !== rule.id && r.employee_type)
                    .map((r) => r.employee_type.trim().toLowerCase());

                  const baseOptions = employeeTypes.length > 0 ? employeeTypes : DEFAULT_EMPLOYEE_TYPES;

                  const availableEmployeeTypeOptions = baseOptions.filter((type) => {
                    const t = (type || '').trim().toLowerCase();
                    if (rule.employee_type && t === rule.employee_type.trim().toLowerCase()) {
                      return true;
                    }
                    if (isDedicatedEmployerStatutoryCategory(t)) {
                      return false;
                    }
                    if (assignedToOtherRules.includes(t)) {
                      return false;
                    }
                    return true;
                  });

                  return (
                    <Card
                      key={rule.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${ruleActive ? alpha('#059669', 0.35) : theme.palette.divider}`,
                        bgcolor: (theme) => (ruleActive ? alpha('#059669', 0.02) : theme.palette.background.paper),
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Rule Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                          <Chip
                            label={`Rule No: ${idx + 1}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: ruleActive ? alpha('#059669', 0.12) : alpha('#64748b', 0.12),
                              color: ruleActive ? '#059669' : 'text.secondary',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {rule.employee_type || 'Unassigned Employee Type'}
                          </Typography>
                          <Chip
                            label={`Employer PF: ${rule.employer_pf_rate ?? 12}%`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: '#059669',
                              color: '#059669',
                              bgcolor: alpha('#059669', 0.05),
                            }}
                          />
                          <Chip
                            label={`Employer ESI: ${rule.employer_esi_rate ?? 3.25}%`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderColor: '#0288d1',
                              color: '#0288d1',
                              bgcolor: alpha('#0288d1', 0.05),
                            }}
                          />
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: ruleActive ? '#059669' : 'text.disabled',
                              }}
                            >
                              {ruleActive ? 'Enabled' : 'Disabled'}
                            </Typography>
                            <CustomSwitch
                              checked={ruleActive}
                              onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'enabled', e.target.checked ? 1 : 0)}
                            />
                          </Stack>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveOtherEmployerStatutoryRule(rule.id)}
                            sx={{
                              bgcolor: alpha('#ef4444', 0.08),
                              '&:hover': { bgcolor: alpha('#ef4444', 0.16) },
                            }}
                          >
                            <LuTrash2 size={16} />
                          </IconButton>
                        </Stack>
                      </Box>

                      {/* Employee Type Selector */}
                      <Box sx={{ mb: 3 }}>
                        <Autocomplete
                          freeSolo
                          options={availableEmployeeTypeOptions}
                          value={rule.employee_type || ''}
                          onChange={(_, val) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'employee_type', val || '')}
                          onInputChange={(_, val, reason) => {
                            if (reason === 'input') {
                              handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'employee_type', val);
                            }
                          }}
                          disabled={!ruleActive}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Employee Type"
                              placeholder="Select or type employee type..."
                              helperText="Applicable employee type for this employer statutory rule"
                              slotProps={{
                                input: {
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <InputAdornment position="start">
                                        <LuUser size={18} style={{ opacity: 0.6, marginLeft: 4 }} />
                                      </InputAdornment>
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                },
                              }}
                            />
                          )}
                        />
                      </Box>

                      <Divider sx={{ mb: 2.5 }} />

                      {/* Configuration Controls */}
                      <Grid container spacing={2.5}>
                        {/* Employer PF Rate */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Employer PF Rate (%)"
                            value={rule.employer_pf_rate ?? 12}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'employer_pf_rate', Number(e.target.value))}
                            placeholder="12"
                            disabled={!ruleActive}
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
                            value={rule.employer_pf_wage_ceiling ?? 15000}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'employer_pf_wage_ceiling', Number(e.target.value))}
                            placeholder="15000"
                            disabled={!ruleActive}
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
                            value={rule.employer_pf_max_amount ?? 1800}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'employer_pf_max_amount', Number(e.target.value))}
                            placeholder="1800"
                            disabled={!ruleActive}
                            helperText="Contribution cap applied when wage is above or equal to ceiling (₹1,800)."
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

                        {/* PF Admin & EDLI Basis */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <FormControl fullWidth disabled={!ruleActive}>
                            <InputLabel id={`other-admin-edli-basis-label-${rule.id}`}>PF Admin &amp; EDLI Basis</InputLabel>
                            <Select
                              labelId={`other-admin-edli-basis-label-${rule.id}`}
                              value={rule.pf_admin_edli_basis || 'Statutory PF Wage (Capped at Ceiling)'}
                              label="PF Admin & EDLI Basis"
                              onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'pf_admin_edli_basis', e.target.value)}
                            >
                              <MenuItem value="Statutory PF Wage (Capped at Ceiling)">Statutory PF Wage (Capped at Ceiling)</MenuItem>
                              <MenuItem value="Percentage of Gross Salary">Percentage of Gross Salary</MenuItem>
                              <MenuItem value="Actual PF Wage (Uncapped)">Actual PF Wage (Uncapped)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* PF Admin & EDLI Gross Basis % */}
                        {rule.pf_admin_edli_basis === 'Percentage of Gross Salary' && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Admin &amp; EDLI Gross Basis (%)"
                              value={rule.pf_admin_edli_gross_percent ?? 100}
                              onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'pf_admin_edli_gross_percent', Number(e.target.value))}
                              placeholder="100"
                              disabled={!ruleActive}
                              helperText="Calculated on: (Gross × %) × Rate."
                              slotProps={{
                                input: {
                                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                },
                                htmlInput: { min: 0, max: 100, step: 1 },
                              }}
                            />
                          </Grid>
                        )}

                        {/* PF Admin Charges */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="PF Admin Charges (%)"
                            value={rule.pf_admin_rate ?? 0.5}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'pf_admin_rate', Number(e.target.value))}
                            placeholder="0.5"
                            disabled={!ruleActive}
                            helperText="EPFO Admin charges rate (default: 0.5%)."
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
                            value={rule.edli_rate ?? 0.5}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'edli_rate', Number(e.target.value))}
                            placeholder="0.5"
                            disabled={!ruleActive}
                            helperText="Deposit Linked Insurance rate (default: 0.5%)."
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
                            value={rule.employer_esi_rate ?? 3.25}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'employer_esi_rate', Number(e.target.value))}
                            placeholder="3.25"
                            disabled={!ruleActive}
                            helperText={`ESI Contribution (Gross \u2264 \u20b9${Number(rule.esi_wage_ceiling ?? 21000).toLocaleString('en-IN')}).`}
                            slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                              },
                              htmlInput: { min: 0, max: 100, step: 0.05 },
                            }}
                          />
                        </Grid>

                        {/* ESI Wage Ceiling */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="ESI Wage Ceiling"
                            value={rule.esi_wage_ceiling ?? 21000}
                            onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'esi_wage_ceiling', Number(e.target.value))}
                            placeholder="21000"
                            disabled={!ruleActive}
                            helperText={`Statutory threshold (Gross \u2264 \u20b9${Number(rule.esi_wage_ceiling ?? 21000).toLocaleString('en-IN')}).`}
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

                      {/* Provisions & Employer Expenses Sub-Cards */}
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
                                  disabled={!ruleActive}
                                  onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'enable_bonus_provision', e.target.checked ? 1 : 0)}
                                />
                              </Stack>
                            </Stack>

                            {bonusEnabled && (
                              <TextField
                                fullWidth
                                size="medium"
                                type="number"
                                label="Bonus Provision Rate (%)"
                                value={rule.bonus_provision_rate ?? 8.33}
                                onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'bonus_provision_rate', Number(e.target.value))}
                                placeholder="8.33"
                                disabled={!ruleActive}
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
                                  disabled={!ruleActive}
                                  onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'enable_el_provision', e.target.checked ? 1 : 0)}
                                />
                              </Stack>
                            </Stack>

                            {elEnabled && (
                              <TextField
                                fullWidth
                                size="medium"
                                type="number"
                                label="EL Provision Days / Year"
                                value={rule.el_provision_days_per_year ?? 15.6}
                                onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'el_provision_days_per_year', Number(e.target.value))}
                                placeholder="15.6"
                                disabled={!ruleActive}
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
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Tea Expenses (Employer CTC)
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Company tea expense incurred per day worked for {rule.employee_type || 'Custom Type'}.
                                  </Typography>
                                </Box>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: teaEnabled ? '#059669' : 'text.secondary',
                                    }}
                                  >
                                    {teaEnabled ? 'Enabled' : 'Disabled'}
                                  </Typography>
                                  <CustomSwitch
                                    checked={teaEnabled}
                                    disabled={!ruleActive}
                                    onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'enable_tea_allowance', e.target.checked ? 1 : 0)}
                                  />
                                </Stack>
                              </Stack>

                              {teaEnabled && (
                                <TextField
                                  fullWidth
                                  size="medium"
                                  type="number"
                                  label="Tea Expense Rate (₹/day)"
                                  value={rule.tea_allowance_per_day ?? 5}
                                  onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'tea_allowance_per_day', Number(e.target.value))}
                                  placeholder="5"
                                  disabled={!ruleActive}
                                  helperText="Calculated on Employer CTC (Present Days × ₹/day)."
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
                          </Box>
                        </Grid>

                        {/* Lunch Expenses (Employer CTC) Card */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box
                            sx={{
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                              border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Lunch Expenses (Employer CTC)
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Company lunch expense incurred per canteen meal for {rule.employee_type || 'Custom Type'}.
                                  </Typography>
                                </Box>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: lunchEnabled ? '#059669' : 'text.secondary',
                                    }}
                                  >
                                    {lunchEnabled ? 'Enabled' : 'Disabled'}
                                  </Typography>
                                  <CustomSwitch
                                    checked={lunchEnabled}
                                    disabled={!ruleActive}
                                    onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'enable_lunch_allowance', e.target.checked ? 1 : 0)}
                                  />
                                </Stack>
                              </Stack>

                              {lunchEnabled && (
                                <TextField
                                  fullWidth
                                  size="medium"
                                  type="number"
                                  label="Lunch Expense Rate (₹/meal)"
                                  value={rule.lunch_allowance_per_meal ?? 50}
                                  onChange={(e) => handleUpdateSingleOtherEmployerStatutoryRule(rule.id, 'lunch_allowance_per_meal', Number(e.target.value))}
                                  placeholder="50"
                                  disabled={!ruleActive}
                                  helperText="Calculated from Canteen entries (All Canteen Entries × ₹/meal)."
                                  slotProps={{
                                    input: {
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Typography component="span" sx={{ fontFamily: "Arial, 'sans-serif'", fontWeight: 700, fontSize: '0.875rem', color: 'text.secondary', ml: 1, mr: 0.5 }}>₹</Typography>
                                        </InputAdornment>
                                      ),
                                      endAdornment: <InputAdornment position="end">/meal</InputAdornment>,
                                    },
                                    htmlInput: { min: 0, step: 1 },
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Box>
        )}
      </Box>

      {/* Tab Panel 6: Labour Welfare Fund (LWF) Rules */}
      <Box sx={{ display: currentTab === 'lwf_rules' ? 'block' : 'none' }}>
        {visitedTabs.lwf_rules && (
          <Stack spacing={3}>
            {/* Master Control Card */}
            <Card sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    >
                      <LuHeartPulse size={22} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Tamil Nadu Labour Welfare Fund (LWF)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Under the Tamil Nadu Labour Welfare Fund Act, 1972 (Administered by TN Labour Welfare Board)
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: isCheckEnabled(data.enable_lwf ?? 1) ? '#059669' : 'text.secondary',
                    }}
                  >
                    {isCheckEnabled(data.enable_lwf ?? 1) ? 'LWF Calculation Active' : 'Disabled'}
                  </Typography>
                  <CustomSwitch
                    checked={isCheckEnabled(data.enable_lwf ?? 1)}
                    onChange={(e) => onChange('enable_lwf', e.target.checked ? 1 : 0)}
                  />
                </Stack>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              {/* Statutory Contributions Summary Banner */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                  mb: 3,
                }}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                        Employee Deduction
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main', mt: 0.5 }}>
                        ₹{data.lwf_employee_contribution ?? '20'} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>/ year</Typography>
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        Deducted from employee salary in configured month.
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                        Employer Contribution
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main', mt: 0.5 }}>
                        ₹{data.lwf_employer_contribution ?? '40'} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>/ year</Typography>
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        Company statutory expense; added to CTC (₹0 impact on Net Pay).
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                        Total Remittance to Board
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5 }}>
                        ₹{Number(data.lwf_employee_contribution ?? 20) + Number(data.lwf_employer_contribution ?? 40)} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>/ employee</Typography>
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        Remitted to TN Labour Welfare Board by {data.lwf_remittance_deadline || '31st January'}.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Policy Inputs Grid */}
              <Grid container spacing={2.5}>
                {/* State / Governing Board */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="State / Governing Board"
                    value={data.lwf_state ?? 'Tamil Nadu'}
                    onChange={(e) => onChange('lwf_state', e.target.value)}
                    helperText="Governing Labour Welfare Act"
                  />
                </Grid>

                {/* LWF Deduction Salary Component */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Autocomplete
                    freeSolo
                    openOnFocus
                    forcePopupIcon
                    autoHighlight
                    disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                    options={deductionOptions}
                    value={data.lwf_deduction_component || 'Labour Welfare Fund'}
                    onChange={(_event, newValue) => {
                      onChange('lwf_deduction_component', newValue || 'Labour Welfare Fund');
                    }}
                    onInputChange={(_event, newInputValue) => {
                      if (newInputValue !== undefined) {
                        onChange('lwf_deduction_component', newInputValue);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="LWF Deduction Salary Component"
                        placeholder="Select or type component name..."
                        helperText="Salary Component used for LWF deduction on salary slips"
                      />
                    )}
                  />
                </Grid>

                {/* Remittance Deadline */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Remittance Deadline"
                    value={data.lwf_remittance_deadline ?? '31st January'}
                    onChange={(e) => onChange('lwf_remittance_deadline', e.target.value)}
                    helperText="Statutory payment deadline"
                  />
                </Grid>

                {/* Deduction Month */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="lwf-deduction-month-label">Deduction Month</InputLabel>
                    <Select
                      labelId="lwf-deduction-month-label"
                      value={data.lwf_deduction_month ?? 'December'}
                      label="Deduction Month"
                      onChange={(e) => onChange('lwf_deduction_month', e.target.value)}
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Deduction Frequency */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="lwf-frequency-label">Contribution Frequency</InputLabel>
                    <Select
                      labelId="lwf-frequency-label"
                      value={data.lwf_deduction_frequency ?? 'Annual (Once per Year)'}
                      label="Contribution Frequency"
                      onChange={(e) => onChange('lwf_deduction_frequency', e.target.value)}
                    >
                      <MenuItem value="Annual (Once per Year)">Annual (Once per Year)</MenuItem>
                      <MenuItem value="Monthly">Monthly</MenuItem>
                      <MenuItem value="Half-Yearly">Half-Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Salary Eligibility Ceiling */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Gross Salary Ceiling (₹)"
                    value={data.lwf_salary_ceiling ?? '25000'}
                    onChange={(e) => onChange('lwf_salary_ceiling', e.target.value)}
                    helperText="Exempt if gross exceeds this amount. Set 0 for no limit."
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: 500 },
                    }}
                  />
                </Grid>

                {/* Employee Contribution */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Employee Contribution (₹)"
                    value={data.lwf_employee_contribution ?? '20'}
                    onChange={(e) => onChange('lwf_employee_contribution', e.target.value)}
                    helperText="Deducted from salary (default ₹20)"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: 1 },
                    }}
                  />
                </Grid>

                {/* Employer Contribution */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Employer Contribution (₹)"
                    value={data.lwf_employer_contribution ?? '40'}
                    onChange={(e) => onChange('lwf_employer_contribution', e.target.value)}
                    helperText="Company contribution to CTC (default ₹40)"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: 1 },
                    }}
                  />
                </Grid>

                {/* Government Contribution */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Govt Contribution (₹)"
                    value={data.lwf_govt_contribution ?? '20'}
                    onChange={(e) => onChange('lwf_govt_contribution', e.target.value)}
                    helperText="For compliance audit reporting (default ₹20)"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: 1 },
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* 1. LWF Wage Basis Components */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ width: '100%', p: 2.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), borderRadius: 2, border: (theme) => `1px dashed ${theme.palette.divider}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        LWF Wage Basis Components
                      </Typography>
                      <Stack direction="row" spacing={0.6} alignItems="center">
                        <Button
                          size="small"
                          variant={getSelectedLwfComponents().length === 1 && getSelectedLwfComponents()[0] === 'Gross Pay' ? 'contained' : 'outlined'}
                          disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                          onClick={() => onChange('lwf_wage_basis', JSON.stringify(['Gross Pay']))}
                          sx={{
                            fontSize: '0.72rem',
                            py: 0.1,
                            px: 0.8,
                            textTransform: 'none',
                            fontWeight: 600,
                            height: 22,
                            borderRadius: '4px',
                            ...(getSelectedLwfComponents().length === 1 && getSelectedLwfComponents()[0] === 'Gross Pay'
                              ? { bgcolor: '#00875a', color: '#fff', '&:hover': { bgcolor: '#00704a' } }
                              : { color: 'text.secondary', borderColor: 'divider' }),
                          }}
                        >
                          Gross Pay
                        </Button>
                        <Button
                          size="small"
                          variant={getSelectedLwfComponents().length === 1 && getSelectedLwfComponents()[0] === 'Net Pay' ? 'contained' : 'outlined'}
                          disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                          onClick={() => onChange('lwf_wage_basis', JSON.stringify(['Net Pay']))}
                          sx={{
                            fontSize: '0.72rem',
                            py: 0.1,
                            px: 0.8,
                            textTransform: 'none',
                            fontWeight: 600,
                            height: 22,
                            borderRadius: '4px',
                            ...(getSelectedLwfComponents().length === 1 && getSelectedLwfComponents()[0] === 'Net Pay'
                              ? { bgcolor: '#0284c7', color: '#fff', '&:hover': { bgcolor: '#0369a1' } }
                              : { color: 'text.secondary', borderColor: 'divider' }),
                          }}
                        >
                          Net Pay
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                          onClick={() => onChange('lwf_wage_basis', JSON.stringify(allComponentOptions))}
                          sx={{ fontSize: '0.75rem', py: 0.2, px: 0.6, textTransform: 'none', color: '#059669', fontWeight: 600 }}
                        >
                          Select All
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                          onClick={() => onChange('lwf_wage_basis', JSON.stringify([]))}
                          sx={{ fontSize: '0.75rem', py: 0.2, px: 0.6, textTransform: 'none', color: 'text.secondary' }}
                        >
                          Clear
                        </Button>
                      </Stack>
                    </Stack>

                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                      options={['Gross Pay', 'Net Pay', 'All Components', ...allComponentOptions]}
                      value={getSelectedLwfComponents()}
                      onChange={(_event, newValue) => {
                        // If user clicked 'Gross Pay'
                        const justAddedGross = newValue.includes('Gross Pay') && !getSelectedLwfComponents().includes('Gross Pay');
                        if (justAddedGross) {
                          onChange('lwf_wage_basis', JSON.stringify(['Gross Pay']));
                          return;
                        }
                        // If user clicked 'Net Pay'
                        const justAddedNet = newValue.includes('Net Pay') && !getSelectedLwfComponents().includes('Net Pay');
                        if (justAddedNet) {
                          onChange('lwf_wage_basis', JSON.stringify(['Net Pay']));
                          return;
                        }
                        // If user clicked 'All Components'
                        if (newValue.includes('All Components')) {
                          const currentSelected = getSelectedLwfComponents().filter((c) => c !== 'Gross Pay' && c !== 'Net Pay');
                          const wasAll = currentSelected.length >= allComponentOptions.length;
                          if (wasAll) {
                            onChange('lwf_wage_basis', JSON.stringify([]));
                          } else {
                            onChange('lwf_wage_basis', JSON.stringify(allComponentOptions));
                          }
                          return;
                        }
                        // Filter out meta tags from component selections
                        onChange('lwf_wage_basis', JSON.stringify(newValue.filter((v) => v !== 'All Components' && v !== 'Gross Pay' && v !== 'Net Pay')));
                      }}
                      renderOption={(props, option) => {
                        const selectedComps = getSelectedLwfComponents();
                        const isGrossOption = option === 'Gross Pay';
                        const isNetOption = option === 'Net Pay';
                        const isAllOption = option === 'All Components';
                        const isAllSelected = selectedComps.length > 0 && selectedComps.length >= allComponentOptions.length && !selectedComps.includes('Gross Pay') && !selectedComps.includes('Net Pay');

                        let isChecked = false;
                        let isIndeterminate = false;

                        if (isGrossOption) {
                          isChecked = selectedComps.includes('Gross Pay');
                        } else if (isNetOption) {
                          isChecked = selectedComps.includes('Net Pay');
                        } else if (isAllOption) {
                          isChecked = isAllSelected;
                          isIndeterminate = selectedComps.length > 0 && selectedComps.length < allComponentOptions.length && !selectedComps.includes('Gross Pay') && !selectedComps.includes('Net Pay');
                        } else {
                          isChecked = selectedComps.includes(option);
                        }

                        return (
                          <li {...props} key={option}>
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              indeterminate={isIndeterminate}
                              sx={{ mr: 1, p: 0.5 }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: (isGrossOption || isNetOption || isAllOption) ? 700 : 400,
                                color: isGrossOption ? '#00875a' : isNetOption ? '#0284c7' : isAllOption ? 'primary.main' : 'inherit',
                              }}
                            >
                              {option}
                            </Typography>
                          </li>
                        );
                      }}
                      renderTags={(tagValue, getTagProps) =>
                        tagValue.filter((option) => option !== 'All Components').map((option, index) => {
                          const isGross = option === 'Gross Pay';
                          const isNet = option === 'Net Pay';
                          return (
                            <Chip
                              label={option}
                              size="small"
                              {...getTagProps({ index })}
                              key={option}
                              sx={{
                                borderRadius: '6px',
                                bgcolor: isGross ? '#00875a' : isNet ? '#0284c7' : (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: (isGross || isNet) ? '#ffffff' : 'primary.dark',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                height: 24,
                                '& .MuiChip-deleteIcon': (isGross || isNet) ? {
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  '&:hover': { color: '#ffffff' },
                                } : undefined,
                              }}
                            />
                          );
                        })
                      }
                      renderInput={(params) => {
                        const selected = getSelectedLwfComponents();
                        const isGross = selected.length === 1 && selected[0] === 'Gross Pay';
                        const isNet = selected.length === 1 && selected[0] === 'Net Pay';
                        const count = selected.length;
                        const isAll = count > 0 && count >= allComponentOptions.length && !isGross && !isNet;

                        let helperMsg = "When empty, full Gross Salary is used as wage basis.";
                        if (isGross) {
                          helperMsg = "Wage basis uses total Gross Pay for LWF ceiling check (<= ₹25,000).";
                        } else if (isNet) {
                          helperMsg = "Wage basis uses total Net Pay for LWF ceiling check (<= ₹25,000).";
                        } else if (isAll) {
                          helperMsg = `All ${count} salary components included in LWF wage basis calculation.`;
                        } else if (count > 0) {
                          helperMsg = `Wage basis includes sum of ${count} selected component(s).`;
                        }

                        return (
                          <TextField
                            {...params}
                            placeholder={count === 0 ? "Select Gross Pay, Net Pay, or components" : ""}
                            helperText={helperMsg}
                          />
                        );
                      }}
                    />
                  </Box>
                </Grid>

                {/* 2. Covered Employee Types from Masters */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ width: '100%', p: 2.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), borderRadius: 2, border: (theme) => `1px dashed ${theme.palette.divider}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        Covered Employee Types
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Button
                          size="small"
                          variant="text"
                          disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                          onClick={() => onChange('lwf_applicable_categories', JSON.stringify(allEmployeeTypeOptions))}
                          sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: '#059669', fontWeight: 600 }}
                        >
                          Select All
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                          onClick={() => onChange('lwf_applicable_categories', JSON.stringify([]))}
                          sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                        >
                          Clear
                        </Button>
                      </Stack>
                    </Stack>

                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      disabled={!isCheckEnabled(data.enable_lwf ?? 1)}
                      options={['All Employee Types', ...allEmployeeTypeOptions]}
                      value={getSelectedLwfCategories()}
                      onChange={(_event, newValue) => {
                        if (newValue.includes('All Employee Types')) {
                          const currentSelected = getSelectedLwfCategories();
                          const wasAll = currentSelected.length >= allEmployeeTypeOptions.length;
                          if (wasAll) {
                            onChange('lwf_applicable_categories', JSON.stringify([]));
                          } else {
                            onChange('lwf_applicable_categories', JSON.stringify(allEmployeeTypeOptions));
                          }
                        } else {
                          onChange('lwf_applicable_categories', JSON.stringify(newValue.filter((v) => v !== 'All Employee Types')));
                        }
                      }}
                      renderOption={(props, option) => {
                        const selectedCats = getSelectedLwfCategories();
                        const isAllOption = option === 'All Employee Types';
                        const isAllSelected = selectedCats.length > 0 && selectedCats.length >= allEmployeeTypeOptions.length;
                        const isChecked = isAllOption ? isAllSelected : selectedCats.includes(option);
                        const isIndeterminate = isAllOption && selectedCats.length > 0 && selectedCats.length < allEmployeeTypeOptions.length;

                        return (
                          <li {...props} key={option}>
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              indeterminate={isIndeterminate}
                              sx={{ mr: 1, p: 0.5 }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: isAllOption ? 700 : 400, color: isAllOption ? 'primary.main' : 'inherit' }}>
                              {option}
                            </Typography>
                          </li>
                        );
                      }}
                      renderTags={(tagValue, getTagProps) =>
                        tagValue.filter((option) => option !== 'All Employee Types').map((option, index) => (
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
                      renderInput={(params) => {
                        const selected = getSelectedLwfCategories();
                        const count = selected.length;
                        const isAll = count > 0 && count >= allEmployeeTypeOptions.length;
                        return (
                          <TextField
                            {...params}
                            placeholder={count === 0 ? "Select employee types eligible for LWF" : ""}
                            helperText={
                              isAll
                                ? `LWF applies to all ${count} employee types in Masters.`
                                : `LWF applies to ${count} selected employee type(s). Unchecked types are exempt.`
                            }
                          />
                        );
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Stack>
        )}
      </Box>

      {/* Tab Panel 7: TDS (Income Tax) Rules */}
      <Box sx={{ display: currentTab === 'tds_rules' ? 'block' : 'none' }}>
        {visitedTabs.tds_rules && (
          <Stack spacing={3}>
            {/* Master Header Card */}
            <Card sx={{ p: 3.5, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                    }}
                  >
                    <LuCalculator size={26} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Salary TDS (Tax Deducted at Source) Policies
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Configurable annual income tax computation & monthly payroll TDS deduction under Section 192
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: isCheckEnabled(data.enable_tds ?? 1) ? '#059669' : 'text.secondary',
                    }}
                  >
                    {isCheckEnabled(data.enable_tds ?? 1) ? 'TDS Deductions Active' : 'TDS Disabled'}
                  </Typography>
                  <CustomSwitch
                    checked={isCheckEnabled(data.enable_tds ?? 1)}
                    onChange={(e) => onChange('enable_tds', e.target.checked ? 1 : 0)}
                  />
                </Stack>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              {/* Company Tax Identifiers & General Settings */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                1. Company Statutory Tax Profile & Global Defaults
              </Typography>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Company TAN Number"
                    value={data.tds_tan || ''}
                    onChange={(e) => onChange('tds_tan', e.target.value.toUpperCase())}
                    placeholder="e.g. CHNB12345E"
                    helperText="10-digit Tax Deduction Account Number"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Company PAN"
                    value={data.tds_pan || ''}
                    onChange={(e) => onChange('tds_pan', e.target.value.toUpperCase())}
                    placeholder="e.g. AABCB1234E"
                    helperText="Corporate Permanent Account Number"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth disabled={!isCheckEnabled(data.enable_tds ?? 1)}>
                    <InputLabel id="tds_active_fy_label">Active Financial Year</InputLabel>
                    <Select
                      labelId="tds_active_fy_label"
                      value={data.tds_active_financial_year || '2026-2027'}
                      label="Active Financial Year"
                      onChange={(e) => onChange('tds_active_financial_year', e.target.value)}
                    >
                      <MenuItem value="2026-2027">FY 2026–2027 (Current)</MenuItem>
                      <MenuItem value="2025-2026">FY 2025–2026</MenuItem>
                      <MenuItem value="2024-2025">FY 2024–2025</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth disabled={!isCheckEnabled(data.enable_tds ?? 1)}>
                    <InputLabel id="tds_default_regime_label">Default Tax Regime</InputLabel>
                    <Select
                      labelId="tds_default_regime_label"
                      value={data.tds_default_regime || 'New Tax Regime u/s 115BAC'}
                      label="Default Tax Regime"
                      onChange={(e) => onChange('tds_default_regime', e.target.value)}
                    >
                      <MenuItem value="New Tax Regime u/s 115BAC">New Tax Regime u/s 115BAC (Default)</MenuItem>
                      <MenuItem value="Old Tax Regime">Old Tax Regime</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2.5} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Health & Education Cess (%)"
                    value={data.tds_cess_rate ?? '4.0'}
                    onChange={(e) => onChange('tds_cess_rate', e.target.value)}
                    helperText="Standard statutory cess on tax liability (default 4%)"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                      htmlInput: { min: 0, max: 20, step: 0.1 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Autocomplete
                    freeSolo
                    options={deductionOptions}
                    value={data.tds_deduction_component || 'TDS'}
                    onChange={(_event, newValue) => {
                      onChange('tds_deduction_component', newValue || 'TDS');
                    }}
                    onInputChange={(_event, newInputValue) => {
                      if (newInputValue !== undefined) {
                        onChange('tds_deduction_component', newInputValue);
                      }
                    }}
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="TDS Salary Component"
                        helperText="Salary Structure deduction item for payroll deduction"
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Investment Proof Cutoff Date"
                      value={data.tds_lock_declarations_date ? dayjs(data.tds_lock_declarations_date) : null}
                      onChange={(newVal) => {
                        onChange('tds_lock_declarations_date', newVal && newVal.isValid() ? newVal.format('YYYY-MM-DD') : '');
                      }}
                      format="DD-MM-YYYY"
                      disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: 'Cutoff for employee investment submissions',
                          InputLabelProps: { shrink: true },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Standard Deductions & Section 87A Rebate */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                2. Standard Deductions & Section 87A Rebates
              </Typography>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Std Deduction - New Regime (₹)"
                    value={data.tds_standard_deduction_new ?? '75000'}
                    onChange={(e) => onChange('tds_standard_deduction_new', e.target.value)}
                    helperText="Statutory deduction for New Regime (default ₹75,000)"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                      htmlInput: { min: 0, step: 1000 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Std Deduction - Old Regime (₹)"
                    value={data.tds_standard_deduction_old ?? '50000'}
                    onChange={(e) => onChange('tds_standard_deduction_old', e.target.value)}
                    helperText="Statutory deduction for Old Regime (default ₹50,000)"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                      htmlInput: { min: 0, step: 1000 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="87A Rebate Threshold - New Regime (₹)"
                    value={data.tds_rebate_limit_87a_new ?? '700000'}
                    onChange={(e) => onChange('tds_rebate_limit_87a_new', e.target.value)}
                    helperText="Full tax rebate if net taxable <= threshold (default ₹7,00,000)"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                      htmlInput: { min: 0, step: 10000 },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="87A Rebate Threshold - Old Regime (₹)"
                    value={data.tds_rebate_limit_87a_old ?? '500000'}
                    onChange={(e) => onChange('tds_rebate_limit_87a_old', e.target.value)}
                    helperText="Full tax rebate if net taxable <= threshold (default ₹5,00,000)"
                    disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                      htmlInput: { min: 0, step: 10000 },
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* 3. Configurable Tax Slabs */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                3. Statutory Income Tax Slabs (Configurable by Financial Year)
              </Typography>
              <Grid container spacing={3}>
                {/* New Tax Regime Slabs */}
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Box sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.03), borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label="Default" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            New Tax Regime u/s 115BAC Slabs
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Standard default statutory slabs for FY 2026–27
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                          onClick={handleAddTdsNewSlab}
                          startIcon={<LuCirclePlus size={14} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2 }}
                        >
                          Add Tier
                        </Button>
                        <Button
                          size="small"
                          color="inherit"
                          disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                          onClick={handleResetTdsNewSlabs}
                          startIcon={<LuRotateCcw size={14} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2 }}
                        >
                          Reset
                        </Button>
                      </Stack>
                    </Stack>

                    <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, bgcolor: 'background.paper' }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.05) }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>From (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>To (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rate (%)</TableCell>
                            <TableCell align="center" sx={{ width: 48, fontWeight: 700, fontSize: '0.75rem' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getParsedTdsNewSlabs().map((slab, sIdx) => (
                            <TableRow key={sIdx} hover>
                              <TableCell sx={{ py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={slab.from_amount}
                                  onChange={(e) => handleUpdateTdsNewSlab(sIdx, 'from_amount', e.target.value)}
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '4px 8px' } } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  placeholder="Above"
                                  value={slab.to_amount === null ? '' : slab.to_amount}
                                  onChange={(e) => handleUpdateTdsNewSlab(sIdx, 'to_amount', e.target.value)}
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '4px 8px' } } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={slab.rate_percent}
                                  onChange={(e) => handleUpdateTdsNewSlab(sIdx, 'rate_percent', e.target.value)}
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                                  slotProps={{
                                    input: {
                                      endAdornment: <InputAdornment position="end" sx={{ '& p': { fontSize: '0.75rem' } }}>%</InputAdornment>,
                                    },
                                    htmlInput: { min: 0, max: 50, step: 1, style: { fontSize: '0.8rem', padding: '4px 8px' } }
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1) || getParsedTdsNewSlabs().length <= 1}
                                  onClick={() => handleRemoveTdsNewSlab(sIdx)}
                                >
                                  <LuTrash2 size={15} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Grid>

                {/* Old Tax Regime Slabs */}
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Box sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.03), borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Old Tax Regime Slabs
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Applicable for employees who opt out of New Regime
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                          onClick={handleAddTdsOldSlab}
                          startIcon={<LuCirclePlus size={14} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2 }}
                        >
                          Add Tier
                        </Button>
                        <Button
                          size="small"
                          color="inherit"
                          disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                          onClick={handleResetTdsOldSlabs}
                          startIcon={<LuRotateCcw size={14} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2 }}
                        >
                          Reset
                        </Button>
                      </Stack>
                    </Stack>

                    <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, bgcolor: 'background.paper' }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.05) }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>From (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>To (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rate (%)</TableCell>
                            <TableCell align="center" sx={{ width: 48, fontWeight: 700, fontSize: '0.75rem' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getParsedTdsOldSlabs().map((slab, sIdx) => (
                            <TableRow key={sIdx} hover>
                              <TableCell sx={{ py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={slab.from_amount}
                                  onChange={(e) => handleUpdateTdsOldSlab(sIdx, 'from_amount', e.target.value)}
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '4px 8px' } } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  placeholder="Above"
                                  value={slab.to_amount === null ? '' : slab.to_amount}
                                  onChange={(e) => handleUpdateTdsOldSlab(sIdx, 'to_amount', e.target.value)}
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                                  slotProps={{ htmlInput: { style: { fontSize: '0.8rem', padding: '4px 8px' } } }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={slab.rate_percent}
                                  onChange={(e) => handleUpdateTdsOldSlab(sIdx, 'rate_percent', e.target.value)}
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                                  slotProps={{
                                    input: {
                                      endAdornment: <InputAdornment position="end" sx={{ '& p': { fontSize: '0.75rem' } }}>%</InputAdornment>,
                                    },
                                    htmlInput: { min: 0, max: 50, step: 1, style: { fontSize: '0.8rem', padding: '4px 8px' } }
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={!isCheckEnabled(data.enable_tds ?? 1) || getParsedTdsOldSlabs().length <= 1}
                                  onClick={() => handleRemoveTdsOldSlab(sIdx)}
                                >
                                  <LuTrash2 size={15} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* 4. Covered Employee Types */}
              <Box sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), borderRadius: 2, border: (theme) => `1px dashed ${theme.palette.divider}` }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    TDS Covered Employee Types
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      variant="text"
                      disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                      onClick={() => onChange('tds_applicable_categories', JSON.stringify(allEmployeeTypeOptions))}
                      sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: '#059669', fontWeight: 600 }}
                    >
                      Select All
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="inherit"
                      disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                      onClick={() => onChange('tds_applicable_categories', JSON.stringify([]))}
                      sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, textTransform: 'none', color: 'text.secondary' }}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>

                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  disabled={!isCheckEnabled(data.enable_tds ?? 1)}
                  options={['All Employee Types', ...allEmployeeTypeOptions]}
                  value={getSelectedTdsCategories()}
                  onChange={(_event, newValue) => {
                    if (newValue.includes('All Employee Types')) {
                      const currentSelected = getSelectedTdsCategories();
                      const wasAll = currentSelected.length >= allEmployeeTypeOptions.length;
                      if (wasAll) {
                        onChange('tds_applicable_categories', JSON.stringify([]));
                      } else {
                        onChange('tds_applicable_categories', JSON.stringify(allEmployeeTypeOptions));
                      }
                    } else {
                      onChange('tds_applicable_categories', JSON.stringify(newValue.filter((v) => v !== 'All Employee Types')));
                    }
                  }}
                  renderOption={(props, option) => {
                    const selectedCats = getSelectedTdsCategories();
                    const isAllOption = option === 'All Employee Types';
                    const isAllSelected = selectedCats.length > 0 && selectedCats.length >= allEmployeeTypeOptions.length;
                    const isChecked = isAllOption ? isAllSelected : selectedCats.includes(option);
                    const isIndeterminate = isAllOption && selectedCats.length > 0 && selectedCats.length < allEmployeeTypeOptions.length;

                    return (
                      <li {...props} key={option}>
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          indeterminate={isIndeterminate}
                          sx={{ mr: 1, p: 0.5 }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: isAllOption ? 700 : 400, color: isAllOption ? 'primary.main' : 'inherit' }}>
                          {option}
                        </Typography>
                      </li>
                    );
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.filter((option) => option !== 'All Employee Types').map((option, index) => (
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
                  renderInput={(params) => {
                    const selected = getSelectedTdsCategories();
                    const count = selected.length;
                    const isAll = count > 0 && count >= allEmployeeTypeOptions.length;
                    return (
                      <TextField
                        {...params}
                        placeholder={count === 0 ? "Select employee types subject to salary TDS" : ""}
                        helperText={
                          isAll
                            ? `Salary TDS applies to all ${count} employee types in Masters.`
                            : `TDS applies to ${count} selected employee type(s). Unchecked types are exempt from automatic TDS deductions.`
                        }
                      />
                    );
                  }}
                />
              </Box>
            </Card>
          </Stack>
        )}
      </Box>

      {/* Employee Selector Dialog for Custom Component Assignees */}
      {activeAssigneeRuleIndex !== null && (
        <EmployeeSelectorDialog
          open={activeAssigneeRuleIndex !== null}
          onClose={() => setActiveAssigneeRuleIndex(null)}
          selectedIds={getParsedCustomRules()[activeAssigneeRuleIndex]?.target_employee_ids || []}
          onConfirm={(ids) => {
            handleModifyCustomRule(activeAssigneeRuleIndex, { target_employee_ids: ids });
            setActiveAssigneeRuleIndex(null);
          }}
          title={`Select Target Assignees for ${getParsedCustomRules()[activeAssigneeRuleIndex]?.name || 'Component'}`}
          contextLabel="for this custom salary component"
        />
      )}
    </Stack>
  );
}
