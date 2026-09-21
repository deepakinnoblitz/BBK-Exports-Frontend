import dayjs, { Dayjs } from 'dayjs';
import { IoFilter } from "react-icons/io5";
import React, { useState, useEffect } from 'react';
import { IoMdArrowDropdown } from "react-icons/io";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { useTheme, alpha } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    fetchDashboardStats,
    type DashboardStats,
    fetchTodayActivities,
    type TodayActivities,
    fetchSalesDashboardData,
    type SalesDashboardData
} from 'src/api/dashboard';

import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { TodayActivitiesWidget } from '../today-activities-widget';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsCurrentVisits } from '../analytics-current-visits';

// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '16px') => {
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

export function CombinedDashboardView() {
    const theme = useTheme();
    const { user } = useAuth();
    const [salesData, setSalesData] = useState<SalesDashboardData>({
        total_sales: 0,
        total_qty_sold: 0,
        total_orders: 0,
        aov: 0,
        gross_sales: 0,
        net_sales: 0,
        total_discounts: 0,
        mtd_sales: 0,
        ytd_sales: 0,
        pipeline_value: 0,
        top_customers_by_revenue: [],
        most_repeated_customers: [],
        overdue_orders: [],
        pending_orders_count: 0,
        sales_trend: { categories: [], series: [] },
        discount_trend: { categories: [], series: [] },
        conversion_rate: 0,
    });
    const [crmStats, setCrmStats] = useState<DashboardStats>({
        leads: 0,
        contacts: 0,
        accounts: 0,
        deals: 0,
        proposals: 0,
        estimations: 0,
        invoices: 0,
        leads_by_status: [],
        deals_by_stage: [],
        charts: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            leads: [0, 0, 0, 0, 0, 0, 0],
            contacts: [0, 0, 0, 0, 0, 0, 0],
            accounts: [0, 0, 0, 0, 0, 0, 0],
            deals: [0, 0, 0, 0, 0, 0, 0],
            proposals: [0, 0, 0, 0, 0, 0, 0],
            estimations: [0, 0, 0, 0, 0, 0, 0],
            invoices: [0, 0, 0, 0, 0, 0, 0],
        },
    });
    const [activities, setActivities] = useState<TodayActivities>({
        calls: [],
        meetings: [],
    });

    const [dateFilter, setDateFilter] = useState<string>('Filter');
    const [customStartDate, setCustomStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day'));
    const [customEndDate, setCustomEndDate] = useState<Dayjs | null>(dayjs());

    // Pagination state for tables
    const [topClientsPage, setTopClientsPage] = useState(0);
    const [topClientsRowsPerPage, setTopClientsRowsPerPage] = useState(5);

    const [overduePage, setOverduePage] = useState(0);
    const [overdueRowsPerPage, setOverdueRowsPerPage] = useState(5);

    const handleTopClientsChangePage = (event: unknown, newPage: number) => {
        setTopClientsPage(newPage);
    };

    const handleTopClientsChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTopClientsRowsPerPage(parseInt(event.target.value, 10));
        setTopClientsPage(0);
    };

    const handleOverdueChangePage = (event: unknown, newPage: number) => {
        setOverduePage(newPage);
    };

    const handleOverdueChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setOverdueRowsPerPage(parseInt(event.target.value, 10));
        setOverduePage(0);
    };

    useEffect(() => {
        const loadData = async () => {
            let start_date: string | undefined;
            let end_date: string | undefined;

            if (dateFilter === 'Last 7 Days') {
                start_date = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
                end_date = dayjs().format('YYYY-MM-DD');
            } else if (dateFilter === 'Last Month') {
                start_date = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
                end_date = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
            } else if (dateFilter === 'Custom') {
                if (customStartDate && customEndDate) {
                    start_date = customStartDate.format('YYYY-MM-DD');
                    end_date = customEndDate.format('YYYY-MM-DD');
                }
            }
            // If 'All Time', we leave start_date and end_date as undefined

            const [sales, stats, acts] = await Promise.all([
                fetchSalesDashboardData(start_date, end_date),
                fetchDashboardStats(start_date, end_date),
                fetchTodayActivities(),
            ]);
            setSalesData(sales);
            setCrmStats(stats);
            setActivities(acts);
        };

        loadData();
    }, [dateFilter, customStartDate, customEndDate]);

    // Calculate daily percentage change (today vs yesterday)
    const getPercentChange = (series: number[] = []) => {
        if (series.length < 2) return 0;
        const today = series[series.length - 1];
        const yesterday = series[series.length - 2];
        if (yesterday === 0) return today > 0 ? 100 : 0;
        return Math.round(((today - yesterday) / yesterday) * 100);
    };

    // Prepare paginated data for tables
    const topClients = salesData.top_customers_by_revenue || [];
    const topClientsDisplayed = topClients.slice(topClientsPage * topClientsRowsPerPage, topClientsPage * topClientsRowsPerPage + topClientsRowsPerPage);

    const overdue = salesData.overdue_orders || [];
    const overdueDisplayed = overdue.slice(overduePage * overdueRowsPerPage, overduePage * overdueRowsPerPage + overdueRowsPerPage);

    return (
        <DashboardContent maxWidth="xl">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 3, md: 5 }, mt: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4">
                    Hi, {user?.full_name || 'User'}, Welcome back!
                </Typography>

                <Stack direction="row" spacing={2} alignItems="center">
                    {dateFilter === 'Custom' && (
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="Start Date"
                                value={customStartDate}
                                onChange={(newValue) => setCustomStartDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
                                format="DD-MM-YYYY"
                            />
                            <DatePicker
                                label="End Date"
                                value={customEndDate}
                                onChange={(newValue) => setCustomEndDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
                                format="DD-MM-YYYY"
                            />
                        </LocalizationProvider>
                    )}

                    <FormControl size="small">
                        <Select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            IconComponent={() => null} // Hide default dropdown arrow to match the mockup
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 1 }}>
                                    <Box sx={{ position: 'relative', display: 'flex' }}>
                                        <IoFilter size={20} color="#7C4DFF" />
                                        {selected !== 'Filter' && (
                                            <Box sx={{
                                                position: 'absolute',
                                                top: -2,
                                                right: -2,
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: 'error.main',
                                                border: '1.5px solid white'
                                            }} />
                                        )}
                                    </Box>
                                    <Typography sx={{ color: '#2A2A35', fontWeight: 600, fontSize: 15, letterSpacing: '-0.2px', ml: 0.5 }}>
                                        {selected}
                                    </Typography>
                                </Box>
                            )}
                            sx={{
                                minWidth: 110,
                                height: 40,
                                borderRadius: '20px',
                                bgcolor: 'common.white',
                                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04), inset 0px 2px 4px rgba(255, 255, 255, 0.8)',
                                transition: 'all 0.2s ease-in-out',
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 1,
                                    px: 2, // override default select right padding since we removed the arrow
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#F1F3F5',
                                    borderWidth: '2px',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#E9ECEF',
                                    borderWidth: '2px',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#E9ECEF',
                                    borderWidth: '2px',
                                },
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0px 10px 28px rgba(0, 0, 0, 0.06), inset 0px 2px 4px rgba(255, 255, 255, 0.9)',
                                }
                            }}
                        >
                            <MenuItem value="Filter">Filter</MenuItem>
                            <MenuItem value="All Time">All Time</MenuItem>
                            <MenuItem value="Last 7 Days">Last 7 Days</MenuItem>
                            <MenuItem value="Last Month">Last Month</MenuItem>
                            <MenuItem value="Custom">Custom</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Row 1: CRM Summary Widgets */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <AnalyticsWidgetSummary
                        title="Total Leads"
                        percent={getPercentChange(crmStats.charts?.leads)}
                        total={crmStats.leads || 0}
                        icon={<img alt="Leads" src={`${import.meta.env.BASE_URL}assets/icons/glass/leads.png`} height={45} width={50} />}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.leads || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <AnalyticsWidgetSummary
                        title="Total Clients"
                        percent={getPercentChange(crmStats.charts?.contacts)}
                        total={crmStats.contacts || 0}
                        color="secondary"
                        icon={<img alt="Contacts" src={`${import.meta.env.BASE_URL}assets/icons/glass/clients.png`} height={45} width={70} />}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.contacts || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <AnalyticsWidgetSummary
                        title="Total Company"
                        percent={getPercentChange(crmStats.charts?.accounts)}
                        total={crmStats.accounts || 0}
                        color="info"
                        icon={<img alt="Accounts" src={`${import.meta.env.BASE_URL}assets/icons/glass/company.png`} height={45} width={50} />}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.accounts || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>

                {/* Row 2: Financial Totals */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Total Prospects"
                        percent={getPercentChange(crmStats.charts?.deals)}
                        total={crmStats.deals || 0}
                        color="warning"
                        icon={<img alt="Deals" src={`${import.meta.env.BASE_URL}assets/icons/glass/deals.png`} height={45} width={70} />}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.deals || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Total Proposals"
                        percent={getPercentChange(crmStats.charts?.proposals)}
                        total={crmStats.proposals || 0}
                        color="warning"
                        icon={<img alt="Proposals" src={`${import.meta.env.BASE_URL}assets/icons/glass/proposals.png`} height={45} width={70} />}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.proposals || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>


                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Total Estimations"
                        percent={getPercentChange(crmStats.charts?.estimations)}
                        total={crmStats.estimations || 0}
                        color="secondary"
                        icon={<img alt="Estimations" src={`${import.meta.env.BASE_URL}assets/icons/glass/estimations.png`} height={45} width={70}/>}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.estimations || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Total Invoices"
                        percent={getPercentChange(crmStats.charts?.invoices)}
                        total={crmStats.invoices || 0}
                        icon={<img alt="Invoices" src={`${import.meta.env.BASE_URL}assets/icons/glass/invoices.png`} height={45} width={70}/>}
                        chart={{
                            categories: crmStats.charts?.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            series: crmStats.charts?.invoices || [0, 0, 0, 0, 0, 0, 0],
                        }}
                    />
                </Grid>

                {/* <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Total Expenses"
                        percent={getPercentChange(financialTotals.expenses.chart)}
                        total={financialTotals.expenses.count}
                        color="info"
                        icon={<img alt="Expenses" src={`${import.meta.env.BASE_URL}assets/icons/glass/ic-glass-users.svg`} />}
                        chart={{
                            categories: financialTotals.categories,
                            series: financialTotals.expenses.chart,
                        }}
                    />
                </Grid> */}

                {/* Today's Activities */}
                <Grid size={{ xs: 12 }}>
                    <TodayActivitiesWidget
                        calls={activities.calls || []}
                        meetings={activities.meetings || []}
                    />
                </Grid>

                {/* Total Revenue Chart */}
                <Grid size={{ xs: 12, md: 12 }}>
                    <AnalyticsWebsiteVisits
                        title="Total Revenue"
                        subheader="Revenue over last 12 months"
                        chartType="line"
                        emptyTitle="No revenue recorded"
                        emptyDescription="There are no invoices or billing records for this period."
                        emptyIcon="solar:bill-list-bold-duotone"
                        chart={{
                            colors: [theme.palette.warning.main],
                            categories: salesData.sales_trend.categories,
                            series: [
                                {
                                    name: 'Total Revenue',
                                    data: salesData.sales_trend.series,
                                },
                            ],
                            options: {
                                tooltip: {
                                    y: {
                                        formatter: (value: number) => fCurrency(value),
                                    },
                                },
                            },
                        }}
                        sx={{ height: 1 }}
                    />
                </Grid>

                {/* Leads by Status */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <AnalyticsCurrentVisits
                        title="Leads by Status"
                        emptyTitle="No leads found"
                        emptyDescription="Get started by creating a new lead or importing contacts."
                        emptyIcon="solar:users-group-rounded-bold-duotone"
                        chart={{
                            series: (crmStats.leads_by_status || []).map((item) => ({
                                label: item.status,
                                value: item.count,
                            })),
                        }}
                        sx={{ height: 1 }}
                    />
                </Grid>

                {/* Deals by Status */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <AnalyticsCurrentVisits
                        title="Deals by Status"
                        emptyTitle="No deals found"
                        emptyDescription="Track your sales pipeline by adding your first deal."
                        emptyIcon="solar:case-bold-duotone"
                        chart={{
                            series: (crmStats.deals_by_stage || []).map((item) => ({
                                label: item.stage,
                                value: item.count,
                            })),
                        }}
                        sx={{ height: 1 }}
                    />
                </Grid>

                {/* Top Clients */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardHeader title="Top Clients by Revenue" sx={{ pb: 2 }} />
                        <Scrollbar>
                            <TableContainer sx={{ minWidth: 400 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Clients</TableCell>
                                            <TableCell>Revenue</TableCell>
                                            <TableCell align="center">Orders</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {topClients.length > 0 ? (
                                            topClientsDisplayed.map((row) => (
                                                <TableRow key={row.client_name}>
                                                    <TableCell sx={{ maxWidth: 200 }}>
                                                        <Typography variant="subtitle2" noWrap sx={{ color: 'text.primary', fontWeight: 800 }}>
                                                            {row.account_name || row.billing_name}
                                                        </Typography>
                                                        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                                                            {row.contact_name || row.client_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 800, fontSize: 15 }}>{renderCurrency(row.revenue)}</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 800 }}>{row.order_count}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3}>
                                                    <Box
                                                        sx={{
                                                            py: 8,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={`${import.meta.env.BASE_URL}assets/icons/glass/ic-glass-users.svg`}
                                                            sx={{ width: 48, height: 48, opacity: 0.3 }}
                                                        />
                                                        <Typography variant="body2" color="text.secondary">
                                                            No customer data available
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Scrollbar>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={topClients.length}
                            rowsPerPage={topClientsRowsPerPage}
                            page={topClientsPage}
                            onPageChange={handleTopClientsChangePage}
                            onRowsPerPageChange={handleTopClientsChangeRowsPerPage}
                            sx={{ borderTop: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}` }}
                        />
                    </Card>
                </Grid>

                {/* Overdue Orders */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardHeader title="Overdue Orders" sx={{ pb: 2 }} />
                        <Scrollbar>
                            <TableContainer sx={{ minWidth: 400 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Order ID</TableCell>
                                            <TableCell>Clients</TableCell>
                                            <TableCell>Due Date</TableCell>
                                            <TableCell align="right">Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {overdue.length > 0 ? (
                                            overdueDisplayed.map((row) => (
                                                <TableRow key={row.name}>
                                                    <TableCell sx={{ color: 'text.primary', fontWeight: 800 }}>{row.name}</TableCell>
                                                    <TableCell sx={{ maxWidth: 200 }}>
                                                        <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontWeight: 700 }}>
                                                            {row.account_name || row.billing_name}
                                                        </Typography>
                                                        {row.account_name && row.account_name !== row.billing_name && (
                                                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                                                                {row.billing_name}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 800 }}>{row.due_date || '-'}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800 }}>{renderCurrency(row.balance_amount)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <Box
                                                        sx={{
                                                            py: 8,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={`${import.meta.env.BASE_URL}assets/icons/glass/ic-glass-buy.svg`}
                                                            sx={{ width: 48, height: 48, opacity: 0.3 }}
                                                        />
                                                        <Typography variant="body2" color="text.secondary">
                                                            No overdue orders
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Scrollbar>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={overdue.length}
                            rowsPerPage={overdueRowsPerPage}
                            page={overduePage}
                            onPageChange={handleOverdueChangePage}
                            onRowsPerPageChange={handleOverdueChangeRowsPerPage}
                            sx={{ borderTop: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}` }}
                        />
                    </Card>
                </Grid>
            </Grid>
        </DashboardContent>
    );
}
