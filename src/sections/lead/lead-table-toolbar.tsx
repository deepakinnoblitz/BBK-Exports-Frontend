import type { SelectChangeEvent } from '@mui/material/Select';

import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Badge from '@mui/material/Badge';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { COMMON_COLORS } from 'src/theme';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type LeadTableToolbarProps = {
  numSelected: number;
  filterName: string;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete?: VoidFunction;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  // Filter Drawer Props
  onOpenFilter?: (event: React.MouseEvent<HTMLElement>) => void;
  canReset?: boolean;
  filterCount?: number;
  // Legacy Props for backward compatibility
  filterStatus?: string;
  onFilterStatus?: (event: SelectChangeEvent<string>) => void;
  options?: { value: string; label: string }[];
  searchPlaceholder?: string;
  filterLabel?: string;
  sortOptions?: { value: string; label: string }[];
};


const DEFAULT_SORT_OPTIONS = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
  { value: 'lead_name_asc', label: 'Name: A to Z' },
  { value: 'lead_name_desc', label: 'Name: Z to A' },
  { value: 'company_name_asc', label: 'Company: A to Z' },
  { value: 'company_name_desc', label: 'Company: Z to A' },
];

export function LeadTableToolbar({
  numSelected,
  filterName,
  onFilterName,
  onDelete,
  sortBy = 'modified_desc',
  onSortChange,
  onOpenFilter,
  canReset,
  filterStatus,
  onFilterStatus,
  options,
  searchPlaceholder = 'Search...',
  filterLabel = 'Status',
  sortOptions = DEFAULT_SORT_OPTIONS,
  filterCount,
}: LeadTableToolbarProps) {
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeFilterCount = filterCount !== undefined ? filterCount : (canReset ? 1 : 0);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearSearch = () => {
    onFilterName({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    searchInputRef.current?.focus();
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (value: string) => {
    if (onSortChange) {
      onSortChange(value);
    }
    handleSortClose();
  };

  const currentSortLabel = sortOptions.find((opt: { value: string; label: string }) => opt.value === sortBy)?.label || 'Sort';

  return (
    <Toolbar
      sx={{
        height: { xs: 'auto', md: 96 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 2, md: 0 },
        py: { xs: 2, md: 0 },
        p: (theme) => ({
          xs: theme.spacing(2, 2),
          md: theme.spacing(0, 1, 0, 3)
        }),
        justifyContent: 'space-between',
        ...(numSelected > 0 && {
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography component="div" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexGrow: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          width: '100%'
        }}>
          <OutlinedInput
            fullWidth
            inputRef={searchInputRef}
            value={filterName}
            onChange={onFilterName}
            placeholder={searchPlaceholder}
            startAdornment={
              <InputAdornment position="start">
                <Iconify width={18} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
            endAdornment={
              <InputAdornment position="end">
                {filterName ? (
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    edge="end"
                    aria-label="clear search"
                    sx={{
                      p: 0.5,
                      color: 'text.disabled',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    <Iconify icon="solar:close-circle-bold" width={18} />
                  </IconButton>
                ) : (
                  <Box
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '6px',
                      bgcolor: '#F1F5F9',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: 0.5,
                    }}
                  >
                    ⌘ K
                  </Box>
                )}
              </InputAdornment>
            }
            sx={{
              maxWidth: { xs: '100%', md: 480 },
              height: 50,
              borderRadius: 1.25,
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-input': {
                py: 0,
                fontSize: '0.875rem',
              },
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'text.secondary',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--btn-primary-bg, #059669)',
              },
            }}
          />

          {options && onFilterStatus && (
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="status-filter-label">{filterLabel}</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={filterStatus || 'all'}
                label={filterLabel}
                onChange={onFilterStatus}
                size="medium"
                sx={{ height: 46 }}
              >
                <MenuItem value="all">
                  All {filterLabel}
                </MenuItem>
                {options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      <Box sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        justifyContent: { xs: 'flex-start', md: 'flex-end' },
        width: { xs: '100%', md: 'auto' }
      }}>
        {numSelected > 0 ? (
          <Tooltip title="Delete">
            <IconButton onClick={onDelete}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            {onOpenFilter && (
              <Button
                disableRipple
                onClick={onOpenFilter}
                sx={{
                  flexGrow: { xs: 1, md: 0 },
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                  height: 50,
                  px: 1.75,
                  bgcolor: COMMON_COLORS.filterButton.bg,
                  color: COMMON_COLORS.filterButton.color,
                  borderRadius: 1.25,
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: 'none',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: COMMON_COLORS.filterButton.hoverBg,
                    boxShadow: 'none',
                  },
                }}
              >
                <Badge
                  color="error"
                  variant="dot"
                  invisible={activeFilterCount === 0 && !canReset}
                  sx={{
                    '& .MuiBadge-badge': {
                      top: 2,
                      right: 2,
                    },
                  }}
                >
                  <Iconify icon={"solar:filter-linear" as any} width={18} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
                </Badge>
                <Box component="span" sx={{ whiteSpace: 'nowrap', display: 'inline', fontWeight: 700 }}>
                  {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                </Box>
                <Iconify icon={"eva:chevron-down-fill" as any} width={16} sx={{ color: COMMON_COLORS.filterButton.color, flexShrink: 0 }} />
              </Button>
            )}

            {onSortChange && (
              <>
                <Button
                  onClick={handleSortClick}
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    minWidth: { xs: '0', md: 175 },
                    height: 50,
                    px: 1.5,
                    py: 0.5,
                    bgcolor: COMMON_COLORS.sortButton.bg,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.25,
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.25,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'text.secondary',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify icon={"solar:sort-vertical-linear" as any} width={18} sx={{ color: COMMON_COLORS.sortButton.labelColor, flexShrink: 0 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                      <Typography component="span" sx={{ fontSize: '0.675rem', fontWeight: 500, color: COMMON_COLORS.sortButton.labelColor, lineHeight: 1.1 }}>
                        Sort by
                      </Typography>
                      <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: COMMON_COLORS.sortButton.valueColor, lineHeight: 1.2 }}>
                        {currentSortLabel}
                      </Typography>
                    </Box>
                  </Box>
                  <Iconify icon={"eva:chevron-down-fill" as any} width={16} sx={{ color: COMMON_COLORS.sortButton.labelColor, flexShrink: 0, ml: 1 }} />
                </Button>

                <Menu
                  anchorEl={sortAnchorEl}
                  open={Boolean(sortAnchorEl)}
                  onClose={handleSortClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1,
                        minWidth: 200,
                        boxShadow: (theme) => theme.customShadows.z20,
                      },
                    },
                  }}
                >
                  {sortOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      selected={option.value === sortBy}
                      onClick={() => handleSortSelect(option.value)}
                      sx={{
                        typography: 'body2',
                        ...(option.value === sortBy && {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                          fontWeight: 'fontWeightSemiBold',
                        }),
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </>
        )}
      </Box>
    </Toolbar>
  );
}
