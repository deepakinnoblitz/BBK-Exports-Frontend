import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';


// ----------------------------------------------------------------------

type UserTableHeadProps = {
  rowCount: number;
  numSelected: number;
  headLabel: any[];
  onSelectAllRows: (checked: boolean) => void;
  hideCheckbox?: boolean;
};

export function UserTableHead({
  rowCount,
  headLabel,
  numSelected,
  onSelectAllRows,
  hideCheckbox = false,
}: UserTableHeadProps) {
  return (
    <TableHead>
      <TableRow>
        {!hideCheckbox && (
          <TableCell padding="checkbox">
            <Checkbox
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onSelectAllRows(event.target.checked)
              }
            />
          </TableCell>
        )}

        {headLabel.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align || 'left'}
            sx={{ width: headCell.width, minWidth: headCell.minWidth }}
          >
            {headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
