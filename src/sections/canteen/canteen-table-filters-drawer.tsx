import type dayjs from 'dayjs';
import type { SelectChangeEvent } from '@mui/material/Select';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onOpen: VoidFunction;
  onClose: VoidFunction;
  filters: {
    department?: string;
    employees?: any[];
    employee?: any | null;
    meal_type?: string;
    status?: string;
    fromDate?: dayjs.Dayjs | null;
    toDate?: dayjs.Dayjs | null;
  };
  onFilters: (update: any) => void;
  canReset: boolean;
  onResetFilters: VoidFunction;
  employeeOptions: any[];
  departmentOptions?: any[];
  hideDateFilters?: boolean;
  hideStatusFilter?: boolean;
  isHR?: boolean;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Availed', label: 'Availed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const MEAL_TYPE_OPTIONS = [
  { value: 'all', label: 'All Meal Types' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Dinner', label: 'Dinner' },
  { value: 'Snacks', label: 'Snacks' },
  { value: 'Tea', label: 'Tea' },
];

export function CanteenTableFiltersDrawer({
  open,
  onOpen,
  onClose,
  filters,
  onFilters,
  canReset,
  onResetFilters,
  employeeOptions,
  departmentOptions,
  hideDateFilters = false,
  hideStatusFilter = false,
  isHR = true,
}: Props) {
  const currentEmployees = useMemo(() => {
    if (filters.employees) return filters.employees;
    if (filters.employee) return Array.isArray(filters.employee) ? filters.employee : [filters.employee];
    return [];
  }, [filters.employees, filters.employee]);

  const handleFilterEmployees = (event: any, value: any[]) => {
    onFilters({ employees: value || [] });
  };

  const handleFilterDepartment = (event: SelectChangeEvent<string>) => {
    onFilters({ department: event.target.value });
  };

  const handleFilterMealType = (event: SelectChangeEvent<string>) => {
    onFilters({ meal_type: event.target.value });
  };

  const handleFilterStatus = (event: SelectChangeEvent<string>) => {
    onFilters({ status: event.target.value });
  };

  const handleFilterFromDate = (date: dayjs.Dayjs | null) => {
    onFilters({ fromDate: date });
  };

  const handleFilterToDate = (date: dayjs.Dayjs | null) => {
    onFilters({ toDate: date });
  };

  const renderHead = (
    <Box
      sx={{
        py: 2.5,
        pl: 3,
        pr: 2,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
        Filters
      </Typography>

      <IconButton
        onClick={onResetFilters}
        disabled={!canReset}
        sx={{
          mr: 1,
          color: canReset ? 'primary.main' : 'text.disabled',
        }}
      >
        <Badge color="error" variant="dot" invisible={!canReset}>
          <Iconify icon="solar:restart-bold" />
        </Badge>
      </IconButton>

      <IconButton onClick={onClose}>
        <Iconify icon="solar:close-circle-bold" />
      </IconButton>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { invisible: true },
      }}
      PaperProps={{
        sx: { width: 340 },
      }}
    >
      {renderHead}

      <Scrollbar>
        <Stack spacing={3} sx={{ p: 3 }}>
          {/* Date Range Filter */}
          {!hideDateFilters && (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Date Range
                </Typography>
                <DatePicker
                  label="From Date"
                  value={filters.fromDate || null}
                  onChange={handleFilterFromDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <DatePicker
                  label="To Date"
                  value={filters.toDate || null}
                  onChange={handleFilterToDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>
            </LocalizationProvider>
          )}

          {/* Department Filter */}
          {departmentOptions && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Department
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.department || 'all'}
                  onChange={handleFilterDepartment}
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departmentOptions.map((dept) => (
                    <MenuItem key={dept.name} value={dept.name}>
                      {dept.department_name || dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}

          {/* Employee Filter */}
          {isHR && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Employees
              </Typography>
              <Autocomplete
                multiple
                size="small"
                options={employeeOptions}
                getOptionLabel={(option) => `${option.employee_name || option.name} (${option.name})`}
                value={currentEmployees}
                isOptionEqualToValue={(option, val) => option.name === val.name}
                onChange={handleFilterEmployees}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search employees..." />
                )}
              />
            </Stack>
          )}

          {/* Meal Type Filter */}
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Meal Type
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={filters.meal_type || 'all'}
                onChange={handleFilterMealType}
              >
                {MEAL_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Status Filter */}
          {!hideStatusFilter && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Status
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.status || 'all'}
                  onChange={handleFilterStatus}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}
