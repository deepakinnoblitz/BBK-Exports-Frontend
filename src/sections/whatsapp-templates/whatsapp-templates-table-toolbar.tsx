import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type WhatsAppTemplateTableToolbarProps = {
    numSelected: number;
    filterName: string;
    onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sortBy?: string;
    onSortChange?: (value: string) => void;
    onOpenFilter?: () => void;
    canReset?: boolean;
    onCreateNew?: () => void;
};

const SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'template_name_asc', label: 'Name: A to Z' },
    { value: 'template_name_desc', label: 'Name: Z to A' },
    { value: 'creation_desc', label: 'Date (Newest)' },
    { value: 'creation_asc', label: 'Date (Oldest)' },
];

export function WhatsAppTemplateTableToolbar({
    numSelected,
    filterName,
    onFilterName,
    sortBy,
    onSortChange,
    onOpenFilter,
    canReset,
    onCreateNew,
}: WhatsAppTemplateTableToolbarProps) {
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

    const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Sort';

    return (
        <Toolbar
            sx={{
                height: 96,
                display: 'flex',
                justifyContent: 'space-between',
                p: (theme) => theme.spacing(0, 1, 0, 3),
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
                <OutlinedInput
                    value={filterName}
                    onChange={onFilterName}
                    placeholder="Search templates..."
                    startAdornment={
                        <InputAdornment position="start">
                            <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                    }
                    sx={{ maxWidth: 480, width: 1 }}
                />
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {numSelected > 0 ? (
                    <IconButton>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                ) : (
                    <>
                        {onOpenFilter && (
                            <Button
                                disableRipple
                                color="inherit"
                                onClick={onOpenFilter}
                                startIcon={
                                    <Badge color="error" variant="dot" invisible={!canReset}>
                                        <Iconify icon="ic:round-filter-list" />
                                    </Badge>
                                }
                                sx={{
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

                        {onSortChange && (
                            <>
                                <Button
                                    variant="text"
                                    color="inherit"
                                    startIcon={<Iconify icon={"solar:sort-bold" as any} />}
                                    onClick={handleSortClick}
                                    sx={{
                                        minWidth: 160,
                                        height: 40,
                                        px: 2,
                                        color: 'text.primary',
                                        bgcolor: 'background.neutral',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        fontWeight: 500,
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        }
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
                                            }
                                        }
                                    }}
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <MenuItem
                                            key={option.value}
                                            selected={option.value === sortBy}
                                            onClick={() => handleSortSelect(option.value)}
                                            sx={{
                                                typography: 'body2',
                                                ...(option.value === sortBy && {
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                    fontWeight: 'fontWeightSemiBold',
                                                })
                                            }}
                                        >
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </>
                        )}

                        {onCreateNew && (
                            <Button
                                variant="contained"
                                onClick={onCreateNew}
                                sx={{
                                    height: 40,
                                    px: 2,
                                    borderRadius: 1.5,
                                    bgcolor: '#059669',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#047857' },
                                }}
                                startIcon={<Iconify icon="mingcute:add-line" />}
                            >
                                New Template
                            </Button>
                        )}
                    </>
                )}
            </Box>
        </Toolbar>
    );
}
