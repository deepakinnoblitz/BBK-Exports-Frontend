import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';

// ----------------------------------------------------------------------

const visuallyHidden = {
    border: 0,
    margin: -1,
    padding: 0,
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    clip: 'rect(0 0 0 0)',
} as const;

// ----------------------------------------------------------------------

type Props = {
    headLabel: any[];
};

export function UserPermissionTableHead({
    headLabel,
}: Props) {
    return (
        <TableHead>
            <TableRow>
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
