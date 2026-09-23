import type { SelectChangeEvent } from '@mui/material/Select';

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

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onOpen: VoidFunction;
  onClose: VoidFunction;
  filters: {
    frequency: string;
    department: string;
    status: string;
  };
  onFilters: (update: any) => void;
  canReset: boolean;
  onResetFilters: VoidFunction;
  departmentOptions: any[];
};

const FREQUENCY_OPTIONS = [
  { value: 'all', label: 'All Frequencies' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-weekly', label: 'Bi-weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function LineRotationTableFiltersDrawer({
  open,
  onOpen,
  onClose,
  filters,
  onFilters,
  canReset,
  onResetFilters,
  departmentOptions,
}: Props) {
  const handleFilterFrequency = (event: SelectChangeEvent<string>) => {
    onFilters({ frequency: event.target.value });
  };

  const handleFilterDepartment = (event: any, value: string | null) => {
    onFilters({ department: value || 'all' });
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
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            boxShadow: (theme: any) => theme.customShadows.z24,
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
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Frequency
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={filters.frequency}
                onChange={handleFilterFrequency}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: 'background.neutral',
                }}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Department
            </Typography>
            <Autocomplete
              fullWidth
              options={['All Departments', ...departmentOptions.map((dept: any) => dept.name || dept)]}
              value={filters.department === 'all' ? 'All Departments' : filters.department}
              onChange={(event, newValue) => {
                handleFilterDepartment(event, newValue === 'All Departments' ? 'all' : newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select department..."
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      bgcolor: 'background.neutral',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    },
                  }}
                />
              )}
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Status
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={filters.status}
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
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}
