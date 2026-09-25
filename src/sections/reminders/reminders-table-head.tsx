import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';

// ----------------------------------------------------------------------

type Props = {
  headLabel: any[];
};

export function RemindersTableHead({ headLabel }: Props) {
  return (
    <TableHead>
      <TableRow sx={{ bgcolor: 'background.neutral' }}>
        {headLabel.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align || 'left'}
            sx={{ width: headCell.width, minWidth: headCell.minWidth, fontWeight: 'bold' }}
          >
            {headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
