import { useSnackbar } from 'notistack';
import { useState, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { fetchSalaryComponents } from 'src/api/hr-management';

import { Iconify } from 'src/components/iconify';

import { generateEmployeeExcelTemplate } from './utils/template-generator';

interface SalaryComponentItem {
    name: string;
    component_name: string;
    type: 'Earning' | 'Deduction';
}

type Props = {
    open: boolean;
    onClose: VoidFunction;
};

export function EmployeeTemplateDialog({ open, onClose }: Props) {
    const { enqueueSnackbar } = useSnackbar();

    const [loadingComponents, setLoadingComponents] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [components, setComponents] = useState<SalaryComponentItem[]>([]);
    const [selectedEarnings, setSelectedEarnings] = useState<string[]>([]);
    const [selectedDeductions, setSelectedDeductions] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            loadComponents();
        }
    }, [open]);

    const loadComponents = async () => {
        try {
            setLoadingComponents(true);
            const data = await fetchSalaryComponents();
            const formatted: SalaryComponentItem[] = (data || []).map((c: any) => ({
                name: c.component_name || c.name,
                component_name: c.component_name || c.name,
                type: (c.type === 'Deduction' ? 'Deduction' : 'Earning') as 'Earning' | 'Deduction',
            }));

            // Deduplicate by component_name
            const uniqueMap = new Map<string, SalaryComponentItem>();
            formatted.forEach((item) => {
                if (item.component_name && !uniqueMap.has(item.component_name)) {
                    uniqueMap.set(item.component_name, item);
                }
            });

            const uniqueList = Array.from(uniqueMap.values());
            setComponents(uniqueList);

            // By default, select all available salary components
            const earnNames = uniqueList.filter((c) => c.type === 'Earning').map((c) => c.component_name);
            const dedNames = uniqueList.filter((c) => c.type === 'Deduction').map((c) => c.component_name);
            setSelectedEarnings(earnNames);
            setSelectedDeductions(dedNames);
        } catch (err: any) {
            console.error('Failed to load salary components:', err);
            enqueueSnackbar(err.message || 'Failed to fetch salary components', { variant: 'error' });
        } finally {
            setLoadingComponents(false);
        }
    };

    const earningsList = useMemo(
        () => components.filter((c) => c.type === 'Earning'),
        [components]
    );

    const deductionsList = useMemo(
        () => components.filter((c) => c.type === 'Deduction'),
        [components]
    );

    const selectedEarningsCount = selectedEarnings.length;
    const selectedDeductionsCount = selectedDeductions.length;
    const totalSelectedCount = selectedEarningsCount + selectedDeductionsCount;

    const handleToggleEarning = (name: string) => {
        setSelectedEarnings((prev) =>
            prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
        );
    };

    const handleToggleDeduction = (name: string) => {
        setSelectedDeductions((prev) =>
            prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
        );
    };

    const handleToggleAllEarnings = () => {
        const earningNames = earningsList.map((c) => c.component_name);
        const allEarningsSelected = earningNames.length > 0 && selectedEarnings.length === earningNames.length;

        if (allEarningsSelected) {
            setSelectedEarnings([]);
        } else {
            setSelectedEarnings(earningNames);
        }
    };

    const handleToggleAllDeductions = () => {
        const deductionNames = deductionsList.map((c) => c.component_name);
        const allDeductionsSelected = deductionNames.length > 0 && selectedDeductions.length === deductionNames.length;

        if (allDeductionsSelected) {
            setSelectedDeductions([]);
        } else {
            setSelectedDeductions(deductionNames);
        }
    };

    const handleDownload = async () => {
        if (totalSelectedCount === 0) {
            enqueueSnackbar('Please select at least one salary component', { variant: 'warning' });
            return;
        }

        try {
            setDownloading(true);

            // Pass earnings and deductions in the exact sequence they were selected
            await generateEmployeeExcelTemplate({
                profileName: 'Standard',
                earnings: selectedEarnings,
                deductions: selectedDeductions,
                includeSampleRow: false,
            });

            enqueueSnackbar('Employee import template downloaded successfully', { variant: 'success' });
            onClose();
        } catch (err: any) {
            console.error('Error generating template:', err);
            enqueueSnackbar(err.message || 'Failed to download template', { variant: 'error' });
        } finally {
            setDownloading(false);
        }
    };

    const renderComponentCard = (comp: SalaryComponentItem, isEarning: boolean) => {
        const selectedList = isEarning ? selectedEarnings : selectedDeductions;
        const isChecked = selectedList.includes(comp.component_name);
        const orderIndex = selectedList.indexOf(comp.component_name);
        const orderNumber = orderIndex !== -1 ? orderIndex + 1 : null;

        const activeColor = isEarning ? '#059669' : '#DC2626';

        return (
            <Box
                key={comp.component_name}
                onClick={() => (isEarning ? handleToggleEarning(comp.component_name) : handleToggleDeduction(comp.component_name))}
                role="checkbox"
                aria-checked={isChecked}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        if (isEarning) {
                            handleToggleEarning(comp.component_name);
                        } else {
                            handleToggleDeduction(comp.component_name);
                        }
                    }
                }}
                sx={{
                    p: 1.15,
                    px: 1.5,
                    borderRadius: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: '1.5px solid',
                    borderColor: isChecked
                        ? isEarning
                            ? 'rgba(5, 150, 105, 0.5)'
                            : 'rgba(220, 38, 38, 0.5)'
                        : 'rgba(203, 213, 225, 0.6)',
                    bgcolor: isChecked
                        ? isEarning
                            ? 'rgba(5, 150, 105, 0.04)'
                            : 'rgba(220, 38, 38, 0.04)'
                        : 'background.paper',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                        borderColor: isChecked
                            ? activeColor
                            : '#94A3B8',
                        bgcolor: isChecked
                            ? isEarning
                                ? 'rgba(5, 150, 105, 0.08)'
                                : 'rgba(220, 38, 38, 0.08)'
                            : 'grey.50',
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flexGrow: 1 }}>
                    {/* Checkbox with subtle grey border when unselected, colored when selected */}
                    <Box
                        sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '5px',
                            border: '1.5px solid',
                            borderColor: isChecked ? activeColor : '#94A3B8',
                            bgcolor: isChecked ? activeColor : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                            boxShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        {isChecked && (
                            <Iconify icon="eva:checkmark-fill" width={14} sx={{ strokeWidth: 1.5 }} />
                        )}
                    </Box>

                    {/* Sequential selection order number badge */}
                    {isChecked && orderNumber !== null && (
                        <Box
                            sx={{
                                minWidth: 22,
                                height: 20,
                                px: 0.6,
                                borderRadius: '5px',
                                bgcolor: isEarning ? '#DCFCE7' : '#FFE4E6',
                                color: isEarning ? '#15803D' : '#BE123C',
                                border: '1px solid',
                                borderColor: isEarning ? 'rgba(21, 128, 61, 0.25)' : 'rgba(190, 18, 60, 0.25)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                lineHeight: 1,
                            }}
                        >
                            #{orderNumber}
                        </Box>
                    )}

                    <Typography
                        variant="body2"
                        noWrap
                        sx={{
                            fontWeight: isChecked ? 600 : 400,
                            color: isChecked ? 'text.primary' : 'text.secondary',
                        }}
                    >
                        {comp.component_name}
                    </Typography>
                </Box>

                <Chip
                    label={comp.type}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: isEarning ? '#DCFCE7' : '#FFE4E6',
                        color: isEarning ? '#15803D' : '#BE123C',
                        flexShrink: 0,
                        ml: 1,
                    }}
                />
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 1,
                            bgcolor: 'rgba(5, 150, 105, 0.1)',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Iconify icon={"solar:document-bold-duotone" as any} width={24} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Download Employee Import Template
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Select salary components to include in the template
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" disabled={downloading}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ pt: 2, pb: 3, maxHeight: 520 }}>
                {loadingComponents ? (
                    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                    </Box>
                ) : (
                    <Stack spacing={3}>
                        {/* 1. Earnings Section */}
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'success.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                        }}
                                    >
                                        <Iconify icon={"solar:wallet-money-bold" as any} width={18} />
                                        Earnings Components
                                    </Typography>
                                    <Chip
                                        label={`${selectedEarningsCount} of ${earningsList.length} Selected`}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            height: 22,
                                            fontSize: '0.75rem',
                                            bgcolor: '#DCFCE7',
                                            color: '#15803D',
                                        }}
                                    />
                                </Box>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={handleToggleAllEarnings}
                                    sx={{
                                        color: 'success.main',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        py: 0,
                                        '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.08)' },
                                    }}
                                >
                                    {selectedEarningsCount === earningsList.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </Box>

                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                    gap: 1,
                                }}
                            >
                                {earningsList.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
                                        No Earning Components found
                                    </Typography>
                                ) : (
                                    earningsList.map((comp) => renderComponentCard(comp, true))
                                )}
                            </Box>
                        </Box>

                        {/* 2. Deductions Section */}
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'error.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                        }}
                                    >
                                        <Iconify icon={"solar:card-2-bold" as any} width={18} />
                                        Deductions Components
                                    </Typography>
                                    <Chip
                                        label={`${selectedDeductionsCount} of ${deductionsList.length} Selected`}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            height: 22,
                                            fontSize: '0.75rem',
                                            bgcolor: '#FFE4E6',
                                            color: '#BE123C',
                                        }}
                                    />
                                </Box>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={handleToggleAllDeductions}
                                    sx={{
                                        color: 'error.main',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        py: 0,
                                        '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.08)' },
                                    }}
                                >
                                    {selectedDeductionsCount === deductionsList.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </Box>

                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                    gap: 1,
                                }}
                            >
                                {deductionsList.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
                                        No Deduction Components found
                                    </Typography>
                                ) : (
                                    deductionsList.map((comp) => renderComponentCard(comp, false))
                                )}
                            </Box>
                        </Box>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    onClick={handleDownload}
                    disabled={downloading || totalSelectedCount === 0}
                    startIcon={
                        downloading ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            <Iconify icon={"solar:download-bold" as any} />
                        )
                    }
                    sx={{
                        bgcolor: COMMON_COLORS.emerald.main,
                        color: 'common.white',
                        '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
                    }}
                >
                    {downloading ? 'Generating Template...' : 'Download Excel Template'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
