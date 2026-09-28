import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------

type Props = {
  row: any;
  index: number;
};

export function EmployeeEvaluationScoreLogTableRow({
  row,
  index,
}: Props) {
  const { employee, employee_name, previous_score, change, new_score, reason, date } = row;

  return (
    <TableRow
      hover
      sx={{
        '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
        '&:last-child td, &:last-child th': { borderBottom: 0 },
      }}
    >
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
      <TableCell>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {employee_name || 'Unknown'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {employee}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>{previous_score}</TableCell>
      <TableCell sx={{ color: change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.primary' }}>
        {change > 0 ? `+${change}` : change}
      </TableCell>
      <TableCell sx={{ fontWeight: 'bold' }}>{new_score}</TableCell>
      <TableCell sx={{ maxWidth: 400 }}>{reason}</TableCell>
      <TableCell>{fDate(date, 'DD-MM-YYYY')}</TableCell>
    </TableRow>
  );
}
