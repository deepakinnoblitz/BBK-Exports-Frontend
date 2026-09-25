import { useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';

import { usePurchase } from 'src/hooks/usePurchase';

import { deletePurchase } from 'src/api/purchase';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { TableEmptyRows } from '../table-empty-rows';
import { applyFilter, getComparator } from '../utils';
import { PurchaseTableRow } from '../purchase-table-row';
import { PurchaseTableHead } from '../purchase-table-head';
import { PurchaseTableToolbar } from '../purchase-table-toolbar';

// ----------------------------------------------------------------------

export function PurchaseView() {
    const router = useRouter();

    const [page, setPage] = useState(0);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [selected, setSelected] = useState<string[]>([]);
    const [orderBy, setOrderBy] = useState('name');
    const [filterName, setFilterName] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const { data: purchases, total, refetch } = usePurchase(page, rowsPerPage, filterName);

    const handleSort = (id: string) => {
        const isAsc = orderBy === id && order === 'asc';
        if (id !== '') {
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(id);
        }
    };

    const handleSelectAllClick = (checked: boolean) => {
        if (checked) {
            const newSelecteds = purchases.map((n) => n.name);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected: string[] = [];
        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(0);
        setRowsPerPage(parseInt(event.target.value, 10));
    };

    const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(0);
        setFilterName(event.target.value);
    };

    const handleDelete = async () => {
        try {
            await Promise.all(selected.map((id) => deletePurchase(id)));
            setSelected([]);
            refetch();
        } catch (error) {
            console.error(error);
        }
    };



    const dataFiltered = applyFilter({
        inputData: purchases,
        comparator: getComparator(order, orderBy),
        filterName,
    });

    const notFound = !dataFiltered.length && !!filterName;

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Typography variant="h4">Purchases</Typography>
                <Button
                    variant="contained"
                    color="inherit"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() => router.push('/purchase/new')}
                >
                    New Purchase
                </Button>
            </Stack>

            <Card>
                <PurchaseTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterName}
                    onDelete={handleDelete}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <PurchaseTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={purchases.length}
                                numSelected={selected.length}
                                onSort={handleSort}
                                onSelectAllRows={handleSelectAllClick}
                                headLabel={[
                                    { id: 'name', label: 'Purchase ID' },
                                    { id: 'bill_no', label: 'Bill No' },
                                    { id: 'vendor_name', label: 'Vendor' },
                                    { id: 'bill_date', label: 'Bill Date' },
                                    { id: 'grand_total', label: 'Grand Total' },
                                    { id: 'payment_type', label: 'Payment Type' },
                                    { id: '' },
                                ]}
                            />
                            <TableBody>
                                {purchases
                                    .map((row) => (
                                        <PurchaseTableRow
                                            key={row.name}
                                            row={{
                                                id: row.name,
                                                name: row.name,
                                                bill_no: row.bill_no,
                                                vendor: row.vendor || row.vendor_id || '',
                                                vendor_name: row.vendor_name || '',
                                                bill_date: row.bill_date,
                                                grand_total: row.grand_total || 0,
                                                payment_type: row.payment_type || '',
                                                paid_amount: row.paid_amount || 0,
                                            }}
                                            selected={selected.indexOf(row.name) !== -1}
                                            onSelectRow={() => handleClick(null as any, row.name)}
                                            onView={() => router.push(`/purchase/${row.name}`)}
                                            onEdit={() => router.push(`/purchase/edit/${row.name}`)}
                                            onDelete={() => {
                                                deletePurchase(row.name).then(refetch);
                                            }}
                                        />
                                    ))}

                                    <TableEmptyRows
                                        height={68}
                                        emptyRows={purchases.length < 5 ? 5 - purchases.length : 0}
                                    />

                                {notFound && <TableNoData query={filterName} />}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Card>
        </DashboardContent>
    );
}