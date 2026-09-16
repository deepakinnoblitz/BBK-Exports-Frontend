import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LuUserCheck } from 'react-icons/lu';
import { IoMdArrowBack } from 'react-icons/io';
import { TbMoneybagPlus } from "react-icons/tb";
import { GrDocumentLocked } from "react-icons/gr";

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { getHRDoc, getHRSettings } from 'src/api/hr-management';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function EmployeeDetailsView() {
    const router = useRouter();
    const { id: employeeId } = useParams();
    const [currentTab, setCurrentTab] = useState(0);
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [bankDetails, setBankDetails] = useState<any>(null);

    const [hrSettings, setHRSettings] = useState<{ default_currency: string; currency_symbol: string; default_locale: string }>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN'
    });


    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);
    }, []);

    useEffect(() => {
        if (employeeId) {
            setLoading(true);
            getHRDoc('Employee', employeeId)
                .then((empData) => {
                    setEmployee(empData);

                    if (empData.bank_account) {
                        getHRDoc('Bank Account', empData.bank_account)
                            .then(setBankDetails)
                            .catch(console.error);
                    } else {
                        setBankDetails(null);
                    }
                })
                .catch((err) => console.error('Failed to fetch details:', err))
                .finally(() => setLoading(false));
        }
    }, [employeeId]);

    const renderStatus = (status: string) => (
        <Label variant="soft" color={status === 'Active' ? 'success' : 'error'}>
            {status}
        </Label>
    );

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 2, md: 3 } }}>
                <Typography variant="h4">Employee Profile</Typography>
                <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<IoMdArrowBack size={20} />}
                    onClick={() => router.push('/employee')}
                    sx={{
                        borderRadius: 1.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 2.5,
                        '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                            borderColor: 'text.primary',
                        }
                    }}
                >
                    Go Back
                </Button>
            </Stack>
            <Card sx={{ p: 4, overflowX: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : employee ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Header Info - Persistent */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    border: (theme) => `3px solid ${theme.palette.background.paper}`,
                                    boxShadow: (theme) => `0 8px 24px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.4)'}`,
                                    flexShrink: 0,
                                    position: 'relative',
                                    bgcolor: (theme) => {
                                        if (employee.profile_picture) return 'transparent';
                                        // Generate pastel color based on name
                                        const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                        let hash = 0;
                                        const name = employee.employee_name || '';
                                        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                        return colors[Math.abs(hash) % colors.length];

                                    }
                                }}
                            >
                                {employee.profile_picture ? (
                                    <Box component="img" src={employee.profile_picture} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
                                ) : (
                                    <Typography variant="h3" sx={{
                                        fontWeight: 800,
                                        fontFamily: 'inherit',
                                        color: (theme) => {
                                            // Darker version of pastel for text
                                            const name = employee.employee_name || '';
                                            let hash = 0;
                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                            const textColors = ['#4F7942', '#2D5A27', '#3F51B5', '#BF360C', '#C62828', '#AD1457'];
                                            return textColors[Math.abs(hash) % textColors.length];

                                        }
                                    }}>
                                        {(employee.employee_name || '?').charAt(0).toUpperCase()}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{employee.employee_name}</Typography>
                                    {renderStatus(employee.status)}
                                </Box>
                                {(() => {
                                    const des = (employee.designation || '').trim();
                                    const dep = (employee.department || '').trim();
                                    const validDes = des && des !== '-';
                                    const validDep = dep && dep !== '-';
                                    
                                    if (!validDes && !validDep) return null;
                                    
                                    const text = validDes && validDep ? `${des} at ${dep}` : (validDes ? des : dep);
                                    return <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{text}</Typography>;
                                })()}
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.disabled', fontWeight: 700 }}>
                                    ID: {employee.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Tabs
                            value={currentTab}
                            onChange={(e, newValue) => setCurrentTab(newValue)}
                            sx={{
                                px: 2,
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                                '& .MuiTab-root': {
                                    py: 2,
                                    minHeight: 48,
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                    '&.Mui-selected': { color: 'primary.main' },
                                    '& .MuiTab-iconWrapper': { mr: '10px !important' }
                                }
                            }}
                        >
                            <Tab label="Employee Info" icon={<LuUserCheck size={20} />} iconPosition="start" />
                            {/* <Tab label="Performance" icon={<Iconify icon={"solar:chart-bold" as any} width={20} />} iconPosition="start" /> */}
                            <Tab label="Salary Info" icon={<TbMoneybagPlus size={20} />} iconPosition="start" />
                            <Tab label="Documents" icon={<GrDocumentLocked size={20} />} iconPosition="start" />
                        </Tabs>

                        <Box sx={{ px: 2, pb: 2 }}>
                            {currentTab === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {/* Contact Information */}
                                    <Box>
                                        <SectionHeader title="Contact Information" icon="solar:phone-calling-bold" />
                                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                                            <DetailItem label="Official Email" value={employee.email} icon="solar:letter-bold" />
                                            <DetailItem label="Personal Email" value={employee.personal_email} icon="solar:letter-bold" />
                                            <DetailItem label="Personal Phone" value={employee.phone} icon="solar:phone-bold" />
                                            <DetailItem label="Office Phone" value={employee.office_phone_number} icon="solar:phone-bold" />
                                            <DetailItem label="User Login" value={employee.user} icon="solar:user-bold" />
                                            <DetailItem label="Employee ID" value={employee.employee_id || employee.employeeId} icon="solar:user-id-bold" />
                                        </Box>
                                    </Box>

                                    <Divider sx={{ borderStyle: 'dashed' }} />

                                    {/* Employment Details */}
                                    <Box>
                                        <SectionHeader title="Employment Details" icon="solar:case-bold" />
                                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                                            <DetailItem label="Department" value={employee.department} icon="solar:buildings-bold" />
                                            <DetailItem label="Designation" value={employee.designation} icon="solar:medal-star-bold" />
                                            <DetailItem label="Employee Type" value={employee.employee_type} icon="solar:user-id-bold" />
                                            <DetailItem label="Joining Date" value={employee.date_of_joining ? fDate(employee.date_of_joining, 'DD-MM-YYYY') : '-'} icon="solar:calendar-bold" />
                                            <DetailItem label="Date of Birth" value={employee.dob ? fDate(employee.dob, 'DD-MM-YYYY') : '-'} icon="solar:calendar-bold" />
                                            <DetailItem label="Blood Group" value={employee.blood_group} icon="solar:drop-bold" />
                                            <DetailItem label="Sex" value={employee.sex} icon="solar:user-bold" />
                                            <DetailItem label="Marital Status" value={employee.marital_status} icon="solar:heart-bold" />
                                            <DetailItem label="Qualification" value={employee.qualification} icon="solar:diploma-bold" />
                                            <DetailItem label="Aadhar Number" value={employee.aadhar_number} icon="solar:card-bold" />
                                        </Box>
                                    </Box>

                                    <Divider sx={{ borderStyle: 'dashed' }} />

                                    {/* Location Details */}
                                    <Box>
                                        <SectionHeader title="Location Details" icon="solar:earth-bold" />
                                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                                            <DetailItem label="Country" value={employee.country} icon="solar:earth-bold" />
                                            <DetailItem label="State" value={employee.state} icon="solar:map-point-bold" />
                                            <DetailItem label="City" value={employee.city} icon="solar:map-point-bold" />
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {currentTab === 1 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {/* Bank & Identification */}
                                    <Box>
                                        <SectionHeader title="Bank & Identification" icon="solar:card-bold" />
                                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                                            <DetailItem
                                                label="Bank Account"
                                                value={bankDetails ? `A/C Number: ${bankDetails.account_number}\nBank: ${bankDetails.bank_name}` : employee.bank_account}
                                                icon="solar:card-bold"
                                            />


                                            <DetailItem label="PF Number" value={employee.pf_number} icon="solar:document-bold" />
                                            <DetailItem label="UAN Number" value={employee.uan_number} icon="solar:card-2-bold" />
                                            <DetailItem label="ESI No" value={employee.esi_no} icon="solar:health-bold" />
                                        </Box>
                                    </Box>


                                    <Divider sx={{ borderStyle: 'dashed' }} />

                                    {/* Financial Summary */}
                                    <Box>
                                        <SectionHeader title="Financial Summary" icon="solar:wallet-money-bold" />
                                        {/* CTC Card */}
                                        <Box sx={{
                                            mb: 3, p: 3, borderRadius: 2,
                                            bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'grey.900',
                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                            boxShadow: (theme) => theme.customShadows?.z4
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Iconify icon="solar:dollar-minimalistic-bold" width={20} sx={{ color: 'primary.main' }} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                                                    Cost to Company (Monthly)
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                                                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 1, fontSize: '0.8em', color: 'primary.main' }}>{hrSettings.currency_symbol}</Box>
                                                {employee.ctc ? fNumber(parseFloat(employee.ctc), { locale: hrSettings.default_locale }) : '-'}
                                            </Typography>
                                        </Box>

                                        {/* Earnings & Deductions Grid */}
                                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} sx={{ mb: 3 }}>
                                            {/* Earnings Card */}
                                            <Box sx={{
                                                p: 3, borderRadius: 2,
                                                bgcolor: (theme) => theme.palette.mode === 'light' ? 'success.lighter' : 'grey.900',
                                                border: (theme) => `1px solid ${theme.palette.success.light}`,
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 1.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: 'success.main',
                                                        color: 'white'
                                                    }}>
                                                        <Iconify icon="solar:chart-2-bold" width={18} />
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.darker' }}>Earnings</Typography>
                                                </Box>
                                                <Box display="flex" flexDirection="column" gap={1.5}>
                                                    {(employee.earnings || []).map((item: any, idx: number) => (
                                                        <SalaryItem key={idx} label={item.component_name} value={item.amount} hrSettings={hrSettings} />
                                                    ))}
                                                    {(!employee.earnings || employee.earnings.length === 0) && (
                                                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No earnings defined</Typography>
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* Deductions Card */}
                                            <Box sx={{
                                                p: 3, borderRadius: 2,
                                                bgcolor: (theme) => theme.palette.mode === 'light' ? 'warning.lighter' : 'grey.900',
                                                border: (theme) => `1px solid ${theme.palette.warning.light}`,
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 1.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: 'warning.main',
                                                        color: 'white'
                                                    }}>
                                                        <Iconify icon="solar:chart-square-bold" width={18} />
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.darker' }}>Deductions</Typography>
                                                </Box>
                                                <Box display="flex" flexDirection="column" gap={1.5}>
                                                    {(employee.deductions || []).map((item: any, idx: number) => (
                                                        <SalaryItem key={idx} label={item.component_name} value={item.amount} hrSettings={hrSettings} />
                                                    ))}
                                                    {(!employee.deductions || employee.deductions.length === 0) && (
                                                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No deductions defined</Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* Net Salary Summary */}
                                        <Box sx={{
                                            p: 3, borderRadius: 2,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                            border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`
                                        }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Net Salary (Monthly)</Typography>
                                                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                                                        <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 1, fontSize: '0.8em', color: 'primary.main' }}>{hrSettings.currency_symbol}</Box>
                                                        {fNumber(employee.net_salary || 0, { locale: hrSettings.default_locale })}
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={4}>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Earnings</Typography>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main', display: 'flex', alignItems: 'center' }}>
                                                            + <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mx: 0.5, color: 'success.main' }}>{hrSettings.currency_symbol}</Box>
                                                            {fNumber(employee.total_earnings || 0, { locale: hrSettings.default_locale })}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Deductions</Typography>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center' }}>
                                                            - <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mx: 0.5, color: 'error.main' }}>{hrSettings.currency_symbol}</Box>
                                                            {fNumber(employee.total_deductions || 0, { locale: hrSettings.default_locale })}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {currentTab === 2 && (
                                <Box>
                                    <SectionHeader title="Documents" icon="solar:document-bold" />
                                    <Box display="grid" gap={2}>
                                        {(employee.documents || []).length > 0 ? (
                                            employee.documents.map((doc: any, idx: number) => (
                                                <Box
                                                    key={idx}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 1.5,
                                                        border: (theme) => `1px solid ${theme.palette.divider}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        '&:hover': { bgcolor: 'background.neutral' }
                                                    }}
                                                >
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Iconify icon="solar:file-text-bold" width={24} sx={{ color: 'primary.main' }} />
                                                        <Box>
                                                            <Typography variant="subtitle2">{doc.title}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{doc.description || 'No description'}</Typography>
                                                        </Box>
                                                    </Stack>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => doc.attachment && window.open(doc.attachment)}
                                                        disabled={!doc.attachment}
                                                    >
                                                        <Iconify icon="solar:download-bold" />
                                                    </IconButton>
                                                </Box>
                                            ))
                                        ) : (
                                            <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled' }}>
                                                <Iconify icon="solar:document-bold" width={48} sx={{ mb: 1, opacity: 0.5 }} />
                                                <Typography variant="body2">No documents available</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>

                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Profile Found</Typography>
                    </Box>
                )}
            </Card>
        </DashboardContent>
    );
}

function SectionHeader({ title, icon, noMargin = false }: { title: string; icon: string, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Iconify icon={icon as any} width={20} sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '14px' }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon, color = 'text.primary', labelColor = 'text.disabled' }: { label: string; value?: string | null; icon: string; color?: string; labelColor?: string }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: labelColor, fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Iconify icon={icon as any} width={16} sx={{ color: 'text.disabled', mt: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color, whiteSpace: 'pre-line' }}>
                    {value || '-'}
                </Typography>
            </Box>

        </Box>
    );
}

function SalaryItem({ label, value, hrSettings }: { label: string; value?: string | number | null, hrSettings: any }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.5, fontSize: '0.9em', color: 'text.primary' }}>{hrSettings.currency_symbol}</Box>
                {value ? fNumber(parseFloat(value.toString()), { locale: hrSettings.default_locale }) : '-'}
            </Typography>
        </Box>
    );
}

