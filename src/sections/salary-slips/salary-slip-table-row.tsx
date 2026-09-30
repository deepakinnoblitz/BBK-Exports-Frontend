import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
    const formatted = fCurrency(amount);
    if (!formatted) return '—';
    const index = formatted.indexOf('₹');
    if (index !== -1) {
        return (
            <>
                {formatted.substring(0, index)}
                <span style={{ fontFamily: 'Arial', fontSize: symbolFontSize, display: 'inline-block', verticalAlign: 'baseline', lineHeight: 'normal' }}>₹</span>{' '}
                {formatted.substring(index + 1)}
            </>
        );
    }
    return formatted;
};

type Props = {
    row: {
        id: string;
        employee_name: string;
        employee_id?: string;
        employee_type?: string;
        pay_period_start: string;
        pay_period_end: string;
        gross_pay: number;
        net_pay: number;
        status: string;
        docstatus: number;
    };
    selected: boolean;
    onSelectRow: () => void;
    onView: () => void;
    onEdit: () => void;
    onSubmit: () => void;
    onDelete: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
    hideCheckbox?: boolean;
    index?: number;
    isHR?: boolean;
};

export function SalarySlipTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onSubmit,
    onDelete,
    canEdit = true,
    canDelete = true,
    hideCheckbox = false,
    index,
    isHR = false,
}: Props) {

    const formatDate = (date: string) => {
        if (!date) return '-';
        const d = dayjs(date);
        return d.isValid() ? d.format('D MMM YYYY') : '-';
    };

    const periodLabel = `${formatDate(row.pay_period_start)} - ${formatDate(row.pay_period_end)}`;

    return (
        <TableRow
            hover
            tabIndex={-1}
            role="checkbox"
            selected={selected}
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            {!hideCheckbox && (
                <TableCell padding="checkbox">
                    <Checkbox checked={selected} onChange={onSelectRow} />
                </TableCell>
            )}

            {typeof index === 'number' && (
                <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            display: 'flex',
                            borderRadius: '50%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            color: 'primary.main',
                            typography: 'subtitle2',
                            fontWeight: 800,
                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                            mx: 'auto',
                            transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                            '&:hover': {
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                transform: 'scale(1.1)',
                            },
                        }}
                    >
                        {index + 1}
                    </Box>
                </TableCell>
            )}

            <TableCell>
                <Box>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {row.employee_name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: 'text.secondary', typography: 'caption' }}>
                        {row.employee_id && <span>{row.employee_id}</span>}
                        {row.employee_id && row.employee_type && <span>•</span>}
                        {row.employee_type && <span>{row.employee_type}</span>}
                    </Stack>
                </Box>
            </TableCell>

            <TableCell>{periodLabel}</TableCell>

            <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                {renderCurrency(row.gross_pay)}
            </TableCell>
            <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="subtitle2" component="span" sx={{ color: 'success.main', fontWeight: 700 }}>
                    {renderCurrency(row.net_pay)}
                </Typography>
            </TableCell>

            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Label
                    variant="soft"
                    color={
                        (row.docstatus === 1 && 'success') ||
                        (row.docstatus === 0 && 'warning') ||
                        (row.docstatus === 2 && 'error') ||
                        'default'
                    }
                >
                    {(row.docstatus === 1 && 'Submitted') ||
                        (row.docstatus === 0 && 'Draft') ||
                        (row.docstatus === 2 && 'Cancelled') ||
                        row.status || 'Unknown'}
                </Label>
            </TableCell>

            <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton onClick={onView} sx={{ color: 'info.main' }}>
                        <Iconify icon={"solar:eye-bold" as any} />
                    </IconButton>
                    {isHR && (
                        <>
                            {row.docstatus === 0 && canEdit && (
                                <IconButton onClick={onSubmit} sx={{ color: 'success.main' }} title="Submit Slip">
                                    <Iconify icon={"solar:check-circle-bold" as any} />
                                </IconButton>
                            )}
                            {row.docstatus === 0 && canEdit && (
                                <IconButton onClick={onEdit} sx={{ color: 'primary.main' }}>
                                    <Iconify icon={"solar:pen-bold" as any} />
                                </IconButton>
                            )}
                            {row.docstatus === 0 && canDelete && (

                                <IconButton onClick={onDelete} sx={{ color: 'error.main' }}>
                                    <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                                </IconButton>
                            )}
                        </>
                    )}
                </Stack>
            </TableCell>

        </TableRow>
    );
}

