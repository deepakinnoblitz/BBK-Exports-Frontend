import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useCrmWhatsAppTemplateCategories } from 'src/hooks/use-masters';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchWhatsAppTemplates } from 'src/api/whatsapp-template';
import { deleteCrmWhatsAppTemplateCategory, CrmWhatsAppTemplateCategory } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../../lead/table-no-data';
import { LeadTableHead } from '../../../lead/lead-table-head';
import { TableEmptyRows } from '../../../lead/table-empty-rows';
import { LeadTableToolbar } from '../../../lead/lead-table-toolbar';
import { WhatsAppTemplateCategoryDialog } from '../whatsapp-template-category-dialog';
import { WhatsAppTemplateCategoryTableRow } from '../whatsapp-template-category-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'category', label: 'Category' },
  { id: 'actions', label: 'Actions', align: 'right' },
];

const SORT_OPTIONS = [
  { value: 'modified_desc', label: 'Newest First' },
  { value: 'modified_asc', label: 'Oldest First' },
];

// ----------------------------------------------------------------------

export function WhatsAppTemplateCategoryView() {
  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_template_category;
  const canCreate = hasCustomPerms && user?.permissions?.actions?.whatsapp_template_category ? !!user?.permissions?.actions?.whatsapp_template_category?.create : true;
  const canEdit = hasCustomPerms && user?.permissions?.actions?.whatsapp_template_category ? !!user?.permissions?.actions?.whatsapp_template_category?.edit : true;
  const canDelete = hasCustomPerms && user?.permissions?.actions?.whatsapp_template_category ? !!user?.permissions?.actions?.whatsapp_template_category?.delete : true;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('modified');
  
  const [openForm, setOpenForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CrmWhatsAppTemplateCategory | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const [deleting, setDeleting] = useState(false);

  const [templateMap, setTemplateMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetchWhatsAppTemplates({
          page: 1,
          page_size: 1000,
        });
        const map: Record<string, string> = {};
        res.data.forEach((tpl: any) => {
          if (tpl.name && tpl.template_name) {
            map[tpl.name] = tpl.template_name;
          }
        });
        setTemplateMap(map);
      } catch (err) {
        console.error('Failed to load WhatsApp templates for mapping:', err);
      }
    };
    loadTemplates();
  }, []);

  const [snackbar, snackbarSet] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => snackbarSet({ ...snackbar, open: false });

  const { data, total, loading, refetch } = useCrmWhatsAppTemplateCategories(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order
  );

  const notFound = !loading && !data.length && !!filterName;
  const empty = !loading && !data.length && !filterName;

  const handleSort = (id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(id);
  };

  const handleSortChange = (value: string) => {
    if (value === 'modified_desc') {
      setOrderBy('modified');
      setOrder('desc');
    } else if (value === 'modified_asc') {
      setOrderBy('modified');
      setOrder('asc');
    }
  };

  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setOpenForm(true);
  };

  const handleEditRow = (row: CrmWhatsAppTemplateCategory) => {
    setSelectedCategory(row);
    setOpenForm(true);
  };

  const handleDeleteRow = (name: string) => {
    setConfirmDelete({ open: true, id: name });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete.id) {
      setDeleting(true);
      try {
        await deleteCrmWhatsAppTemplateCategory(confirmDelete.id);
        snackbarSet({ open: true, message: 'WhatsApp Template Category deleted successfully', severity: 'success' });
        refetch();
        setConfirmDelete({ open: false, id: null });
      } catch (error: any) {
        const errorMsg = error?.message || '';
        const isLinkError = errorMsg && (
          errorMsg.includes('LinkExistsError') ||
          errorMsg.includes('Cannot delete or cancel because') ||
          errorMsg.includes('is linked with')
        );
        let msg = 'Failed to delete';
        if (isLinkError) {
          msg = 'This category is currently in use and cannot be deleted. Please remove it from any linked WhatsApp Templates first.';
          const index = errorMsg.toLowerCase().indexOf('is linked with');
          if (index !== -1) {
            const linkedPart = errorMsg.substring(index + 'is linked with'.length).trim();
            const cleanLinked = linkedPart.replace(/CRM WhatsApp Template\s*/gi, '').trim();
            if (cleanLinked) {
              const names = cleanLinked.split(',').map((n: string) => n.trim()).filter(Boolean);
              
              const resolvedNames = names.map((name: string) => templateMap[name] || name);

              if (resolvedNames.length === 1) {
                msg = `This category is currently in use by the WhatsApp Template '${resolvedNames[0]}' and cannot be deleted. Please remove or reassign it first.`;
              } else if (resolvedNames.length > 1) {
                const formattedNames = resolvedNames.map((n: string) => `'${n}'`).join(', ');
                msg = `This category is currently in use by WhatsApp Templates: ${formattedNames}. Please remove or reassign them first.`;
              }
            }
          }
        } else if (error.message) {
          msg = error.message;
        }
        snackbarSet({ open: true, message: msg, severity: 'error' });
      } finally {
        setDeleting(false);
      }
    }
  };

  const onChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          WhatsApp Template Category
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
          >
            New WhatsApp Template Category
          </Button>
        )}
      </Box>

      <Card>
        <LeadTableToolbar
          numSelected={0}
          filterName={filterName}
          onFilterName={(event) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
          searchPlaceholder="Search WhatsApp Template Category..."
          sortOptions={SORT_OPTIONS}
          sortBy={`${orderBy}_${order}`}
          onSortChange={handleSortChange}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size="medium" sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
              <LeadTableHead
                order={order}
                orderBy={orderBy}
                headLabel={TABLE_HEAD}
                rowCount={total}
                numSelected={0}
                onSort={handleSort}
                onSelectAllRows={() => {}}
                showIndex
                hideCheckbox
              />

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: '#059669' }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {!loading && data.map((row, index) => (
                      <WhatsAppTemplateCategoryTableRow
                        key={row.name}
                        index={page * rowsPerPage + index}
                        row={row}
                        onEditRow={() => handleEditRow(row)}
                        onDeleteRow={() => handleDeleteRow(row.name)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}

                    {notFound && <TableNoData searchQuery={filterName} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <EmptyContent
                            title="No WhatsApp Template Category Found"
                            description="Created records will appear here."
                            icon="solar:bill-check-bold-duotone"
                          />
                        </TableCell>
                      </TableRow>
                    )}

                    {!empty && !notFound && (
                      <TableEmptyRows
                        height={68}
                        emptyRows={data.length < 5 ? 5 - data.length : 0}
                      />
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePagination
          component="div"
          page={page}
          count={total}
          rowsPerPage={rowsPerPage}
          onPageChange={onChangePage}
          onRowsPerPageChange={onChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      <WhatsAppTemplateCategoryDialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedCategory(null);
        }}
        currentCategory={selectedCategory}
        onSuccess={async () => {
          setOpenForm(false);
          setSelectedCategory(null);
          snackbarSet({
            open: true,
            message: `WhatsApp Template Category ${selectedCategory ? 'updated' : 'created'} successfully`,
            severity: 'success',
          });
          await refetch({
            page: page + 1,
            pageSize: rowsPerPage,
            search: filterName,
            orderBy,
            order
          });
        }}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        title="Confirm Delete"
        content="Are you sure you want to delete this whatsapp template category?"
        isLoading={deleting}
        action={
          <LoadingButton variant="contained" color="error" loading={deleting} onClick={handleConfirmDelete}>
            {deleting ? 'Deleting...' : 'Delete'}
          </LoadingButton>
        }
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
