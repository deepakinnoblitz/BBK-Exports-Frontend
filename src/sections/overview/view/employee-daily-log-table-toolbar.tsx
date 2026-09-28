import React, { useState } from 'react';
import { IoMdSettings } from "react-icons/io";

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type EmployeeDailyLogTableToolbarProps = {
  filterName: string;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  onOpenFilter?: (event: React.MouseEvent<HTMLElement>) => void;
  canReset?: boolean;
  searchPlaceholder?: string;
  sortOptions?: { value: string; label: string }[];
  isHR?: boolean;
  onOpenSettings?: () => void;
};

export function EmployeeDailyLogTableToolbar({
  filterName,
  onFilterName,
  sortBy = 'login_date_desc',
  onSortChange,
  onOpenFilter,
  canReset,
  searchPlaceholder = 'Search...',
  sortOptions = [],
  isHR = false,
  onOpenSettings,
}: EmployeeDailyLogTableToolbarProps) {
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

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

  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.daily_log;
  const displaySettings = hasCustomPerms ? !!user?.permissions?.actions?.daily_log?.create : true;

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
      }}
    >
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
          value={filterName}
          onChange={onFilterName}
          placeholder={searchPlaceholder}
          startAdornment={
            <InputAdornment position="start">
              <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: { xs: '100%', md: 480 } }}
        />
      </Box>

      <Box sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        justifyContent: { xs: 'flex-start', md: 'flex-end' },
        width: { xs: '100%', md: 'auto' }
      }}>
        {onOpenFilter && (
          <Button
            disableRipple
            color="inherit"
            startIcon={
              <Badge color="error" variant="dot" invisible={!canReset}>
                <Iconify icon="ic:round-filter-list" />
              </Badge>
            }
            onClick={onOpenFilter}
            sx={{
              flexGrow: { xs: 1, md: 0 },
              height: 40,
              px: 2,
              bgcolor: 'background.neutral',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              fontWeight: 500,
            }}
          >
            Filters
          </Button>
        )}

        {onSortChange && sortOptions.length > 0 && (
          <>
            <Button
              variant="text"
              color="inherit"
              startIcon={<Iconify icon={"solar:sort-bold" as any} />}
              onClick={handleSortClick}
              sx={{
                flexGrow: { xs: 1, md: 0 },
                minWidth: { xs: '0', md: 180 },
                height: 40,
                px: 2,
                color: 'text.primary',
                bgcolor: 'background.neutral',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {currentSortLabel}
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

        {isHR && onOpenSettings && displaySettings &&(
          <Button
            disableRipple
            color="inherit"
            startIcon={<IoMdSettings size={19}/>}
            onClick={onOpenSettings}
            sx={{
              height: 40,
              px: 3,
              bgcolor: 'background.neutral',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.25,
              fontWeight: 500,
              transition: (theme) =>
                theme.transitions.create(['background-color', 'border-color'], {
                  duration: theme.transitions.duration.shorter,
                })
            }}
          >
            Settings
          </Button>
        )}
      </Box>
    </Toolbar>
  );
}
