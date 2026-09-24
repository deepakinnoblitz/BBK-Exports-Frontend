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
    shift: string;
    status?: string;
    fromDate?: dayjs.Dayjs | null;
    toDate?: dayjs.Dayjs | null;
  };
  onFilters: (update: any) => void;
  canReset: boolean;
  onResetFilters: VoidFunction;
  employeeOptions: any[];
  shiftOptions: any[];
  departmentOptions?: any[];
  hideDateFilters?: boolean;
  hideStatusFilter?: boolean;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export function ShiftRosterTableFiltersDrawer({
  open,
  onOpen,
  onClose,
  filters,
  onFilters,
  canReset,
  onResetFilters,
  employeeOptions,
  shiftOptions,
  departmentOptions,
  hideDateFilters = false,
  hideStatusFilter = false,
}: Props) {
  const currentEmployees = useMemo(() => {
    if (filters.employees) return filters.employees;
    if (filters.employee) return Array.isArray(filters.employee) ? filters.employee : [filters.employee];
    return [];
  }, [filters.employees, filters.employee]);

  const handleFilterEmployees = (event: any, value: any[]) => {
    onFilters({ employees: value || [] });
  };

  const handleFilterShift = (event: SelectChangeEvent<string>) => {
    onFilters({ shift: event.target.value });
  };

  const handleFilterStatus = (event: SelectChangeEvent<string>) => {
    onFilters({ status: event.target.value });
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
      <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
        Filters
      </Typography>

      <IconButton
        onClick={onResetFilters}
        disabled={!canReset}
        sx={{
          mr: 0.5,
          color: canReset ? 'primary.main' : 'text.disabled',
          '&:hover': {
            bgcolor: canReset ? 'primary.lighter' : 'transparent',
          },
        }}
      >
        <Badge color="error" variant="dot" invisible={!canReset}>
          <Iconify icon="solar:restart-bold" width={20} />
        </Badge>
      </IconButton>

      <IconButton
        onClick={onClose}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Iconify icon="mingcute:close-line" width={20} />
      </IconButton>
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              boxShadow: (theme: any) => theme.customShadows?.z24,
            },
          },
        }}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 100,
        }}
      >
        {renderHead}

        <Scrollbar>
          <Stack spacing={3} sx={{ p: 3 }}>
            {/* Department Filter (if available) */}
            {departmentOptions && departmentOptions.length > 0 && (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Department
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={filters.department || 'all'}
                    onChange={(e) => onFilters({ department: e.target.value })}
                    sx={{
                      borderRadius: 1.5,
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    {departmentOptions.map((d) => (
                      <MenuItem key={d.name} value={d.name}>
                        {d.department_name || d.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {/* Employee Filter */}
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Employee
              </Typography>
              <Autocomplete
                multiple
                disableCloseOnSelect
                fullWidth
                size="small"
                options={employeeOptions}
                getOptionLabel={(opt) => (opt ? `${opt.employee_name || opt.name} (${opt.name})` : '')}
                filterOptions={(opts, state) => {
                  const input = state.inputValue.toLowerCase().trim();
                  if (!input) {
                    const selectedIds = new Set(currentEmployees.map((ce: any) => (typeof ce === 'string' ? ce : ce?.name)));
                    const selectedOpts = opts.filter((opt) => selectedIds.has(opt.name));
                    const unselectedFirst50 = opts.filter((opt) => !selectedIds.has(opt.name)).slice(0, 50);
                    return [...selectedOpts, ...unselectedFirst50];
                  }
                  const filtered = opts.filter((opt) => {
                    const nameMatch = opt.employee_name && opt.employee_name.toLowerCase().includes(input);
                    const idMatch = opt.name && opt.name.toLowerCase().includes(input);
                    return Boolean(nameMatch || idMatch);
                  });
                  return filtered.slice(0, 50);
                }}
                isOptionEqualToValue={(option, value) => option?.name === value?.name}
                value={employeeOptions.filter((opt) => currentEmployees.some((ce: any) => (typeof ce === 'string' ? ce === opt.name : ce?.name === opt.name)))}
                onChange={handleFilterEmployees}
                renderOption={(props, option, { selected: isSelected }) => (
                  <li {...props} key={option.name}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {option.employee_name || option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                        ID: {option.name}
                      </Typography>
                    </Box>
                    {isSelected && (
                      <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                    )}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={currentEmployees.length === 0 ? "Search employee(s)..." : ""}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                      },
                    }}
                  />
                )}
              />
            </Stack>

            {/* Shift Filter */}
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Shift
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.shift}
                  onChange={handleFilterShift}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: 'background.neutral',
                  }}
                >
                  <MenuItem value="all">All Shifts</MenuItem>
                  {shiftOptions.map((s) => (
                    <MenuItem key={s.name} value={s.name}>
                      {s.shift_name || s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Status Filter */}
            {!hideStatusFilter && (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Status
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={filters.status || 'all'}
                    onChange={handleFilterStatus}
                    sx={{
                      borderRadius: 1.5,
                      bgcolor: 'background.neutral',
                    }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {/* Date Range Filters */}
            {!hideDateFilters && (
              <>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Effective From
                  </Typography>
                  <DatePicker
                    value={filters.fromDate || null}
                    onChange={(v) => onFilters({ fromDate: v })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            bgcolor: 'background.neutral',
                          },
                        },
                      },
                    }}
                  />
                </Stack>

                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Effective To
                  </Typography>
                  <DatePicker
                    value={filters.toDate || null}
                    onChange={(v) => onFilters({ toDate: v })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            bgcolor: 'background.neutral',
                          },
                        },
                      },
                    }}
                  />
                </Stack>
              </>
            )}
          </Stack>
        </Scrollbar>
      </Drawer>
    </LocalizationProvider>
  );
}
