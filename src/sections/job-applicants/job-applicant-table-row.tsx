import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fTimeDist } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        applicant_name: string;
        email_id: string;
        phone_number: string;
        job_title: string;
        status: string;
        modified: string;
    };
    selected: boolean;
    onSelectRow: VoidFunction;
    onView: VoidFunction;
    onEdit: VoidFunction;
    onDelete: VoidFunction;
    canEdit?: boolean;
    canDelete?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};

export function JobApplicantTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
    hideCheckbox = false,
    index,
}: Props) {
    const renderStatus = (status: string) => {
        let color: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' = 'default';

        switch (status) {
            case 'Accepted':
                color = 'success';
                break;
            case 'Rejected':
                color = 'error';
                break;
            case 'Hold':
                color = 'warning';
                break;
            case 'Open':
            case 'Received':
                color = 'info';
                break;
            case 'Replied':
                color = 'primary';
                break;
            default:
                color = 'default';
        }

        return (
            <Label variant="soft" color={color}>
                {status}
            </Label>
        );
    };

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
                    <Checkbox checked={selected} onClick={onSelectRow} />
                </TableCell>
            )}

            {typeof index === 'number' && (
                <TableCell align="center">
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
                <Stack direction="row" alignItems="center" spacing={2}>
                    {/* <Avatar alt={row.applicant_name} sx={{ bgcolor: 'primary.main', color: 'common.white' }}>
                        {row.applicant_name.charAt(0).toUpperCase()}
                    </Avatar> */}
                    <Box>
                        <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{ cursor: 'pointer', fontWeight: 600 }}
                            onClick={onView}
                        >
                            {row.applicant_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                            {row.email_id}
                        </Typography>
                    </Box>
                </Stack>
            </TableCell>

            <TableCell>{row.job_title || '-'}</TableCell>

            <TableCell>{row.phone_number || '-'}</TableCell>


            <TableCell>{renderStatus(row.status)}</TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 700,
                            fontSize: 12,
                            minWidth: 24,
                            textAlign: 'right',
                        }}
                    >
                        {fTimeDist(row.modified)}
                    </Typography>

                    <IconButton size="small" color="primary" onClick={onView}>
                        <Iconify icon="solar:eye-bold" />
                    </IconButton>

                    {canEdit && (
                        <IconButton size="small" color="info" onClick={onEdit}>
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}

                    {canDelete && (
                        <IconButton size="small" color="error" onClick={onDelete}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
