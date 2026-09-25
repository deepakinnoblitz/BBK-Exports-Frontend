import { FaUserTie } from "react-icons/fa6";
import { useState, useEffect } from 'react';
import { HiOutlineUser, HiOutlineHome, HiOutlinePhone, HiOutlineMapPin, HiOutlineEnvelope, HiOutlineGlobeAlt, HiOutlineBriefcase, HiOutlineShoppingBag, HiOutlineCircleStack, HiOutlineDocumentText, HiOutlineBuildingOffice, HiOutlineClipboardDocumentCheck } from "react-icons/hi2";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { useRouter } from 'src/routes/hooks';

import { getDoc } from 'src/api/leads';
import { CONFIG } from 'src/config-global';
import { getContact } from 'src/api/contacts';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import TodoDialog from 'src/sections/todo/todo-dialog';
import CallDialog from 'src/sections/calls/call-dialog';
import MeetingDialog from 'src/sections/meetings/meeting-dialog';

import { useAuth } from 'src/auth/auth-context';

import { ContactRelatedList } from './contact-related-list';
import { WhatsappChatDialog } from '../../lead/view/whatsapp_chat_dialog';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    contactId: string | null;
    onEdit?: (contactId: string) => void;
    initialTab?: string;
    extraState?: Record<string, any>;
};

export function ContactDetailsDialog({ open, onClose, contactId, onEdit, initialTab, extraState }: Props) {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned;

    const canViewProspects = hasCustomPerms && user?.permissions?.actions?.prospects ? !!user?.permissions?.actions?.prospects?.view : true;
    const canViewEstimations = hasCustomPerms && user?.permissions?.actions?.estimation ? !!user?.permissions?.actions?.estimation?.view : true;
    const canViewInvoices = hasCustomPerms && user?.permissions?.actions?.invoice ? !!user?.permissions?.actions?.invoice?.view : true;
    const canViewPurchases = hasCustomPerms && user?.permissions?.actions?.purchase ? !!user?.permissions?.actions?.purchase?.view : true;
    const canCreateCalendar = hasCustomPerms && user?.permissions?.actions?.calendar ? !!user?.permissions?.actions?.calendar?.create : true;

    const [contact, setContact] = useState<any>(null);
    const [ownerDetails, setOwnerDetails] = useState<{ full_name: string; email: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [openWhatsapp, setOpenWhatsapp] = useState(false);

    // Event scheduling states
    const [openTypeDialog, setOpenTypeDialog] = useState(false);
    const [openCallDialog, setOpenCallDialog] = useState(false);
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [openTodoDialog, setOpenTodoDialog] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    useEffect(() => {
        if (open && contactId) {
            setLoading(true);
            getContact(contactId)
                .then(async (data) => {
                    setContact(data);
                    if (data?.owner) {
                        try {
                            const userDoc = await getDoc("User", data.owner);
                            setOwnerDetails({
                                full_name: userDoc.full_name || userDoc.first_name || data.owner,
                                email: userDoc.email || data.owner,
                            });
                        } catch (e) {
                            console.error("Failed to fetch contact owner user doc:", e);
                            setOwnerDetails(null);
                        }
                    } else {
                        setOwnerDetails(null);
                    }
                })
                .catch((err) => console.error('Failed to fetch contact details:', err))
                .finally(() => setLoading(false));
        }
    }, [open, contactId]);

    const TABS = [
        ...(canViewProspects ? [{ value: 'deals', label: 'Prospects', icon: <HiOutlineCircleStack size={18} /> }] : []),
        ...(canViewEstimations ? [{ value: 'estimations', label: 'Estimations', icon: <HiOutlineClipboardDocumentCheck size={18} /> }] : []),
        ...(canViewInvoices ? [{ value: 'invoices', label: 'Invoices', icon: <HiOutlineDocumentText size={18} /> }] : []),
        ...(canViewPurchases ? [{ value: 'purchases', label: 'Purchases', icon: <HiOutlineShoppingBag size={18} /> }] : []),
    ];

    const [currentTab, setCurrentTab] = useState(initialTab || TABS[0]?.value || 'deals');

    useEffect(() => {
        if (open && initialTab) {
            setCurrentTab(initialTab);
        }
    }, [open, initialTab]);

    useEffect(() => {
        if (TABS.length > 0 && !TABS.some(t => t.value === currentTab)) {
            setCurrentTab(TABS[0].value);
        }
    }, [canViewProspects, canViewEstimations, canViewInvoices, canViewPurchases]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth={false} PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, width: '1350px', maxWidth: '1350px' } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Client Details</Typography>
                <IconButton onClick={onClose} sx={{ color: theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={48} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : contact ? (
                    <Box sx={{ display: 'flex', height: '85vh' }}>
                        {/* Sidebar: Profile Details */}
                        <Box
                            sx={{
                                width: 330,
                                borderRight: `1px solid ${theme.palette.divider}`,
                                bgcolor: alpha(theme.palette.grey[500], 0.02),
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Scrollbar
                                sx={{
                                    p: 4,
                                    flexGrow: 1,
                                    height: 1,
                                    '& .simplebar-scrollbar:before': {
                                        opacity: 0.25,
                                        width: '4px',
                                        borderRadius: 1,
                                    },
                                    '& .simplebar-track.simplebar-vertical': {
                                        width: '10px',
                                    },
                                }}
                            >
                                <Stack spacing={5}>
                                    {/* Identity Hero */}
                                    <Box>
                                        <Stack direction="row" spacing={2.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    flexShrink: 0,
                                                    borderRadius: '50%',
                                                    bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.1),
                                                    color: 'primary.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.2)}`,
                                                }}
                                            >
                                                <FaUserTie size={36} />
                                            </Box>
                                            <Box>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: -0.5 }}>
                                                    {contact.first_name} {contact.last_name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, display: 'block', pt: 1 }}>
                                                    ID: {contact.name}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    {/* Connectivity Grid */}
                                    <Box>
                                        <Stack spacing={2.5} sx={{ mb: 4 }}>
                                            <DetailItem
                                                label="Company"
                                                value={(() => {
                                                    const list = contact.company_name_list || [];
                                                    if (list.length === 0) return '—';
                                                    return (
                                                        <Stack spacing={1} sx={{ mt: 0.5 }}>
                                                            {list.map((name: string, index: number) => (
                                                                <Box
                                                                    key={index}
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: list.length > 1 ? 1.25 : 0,
                                                                        px: 1.5,
                                                                        py: 0.75,
                                                                        borderRadius: '8px',
                                                                        bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.04),
                                                                        border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.08)}`,
                                                                        transition: (themeVar) => themeVar.transitions.create(['background-color', 'border-color', 'transform']),
                                                                        '&:hover': {
                                                                            bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.08),
                                                                            borderColor: (themeVar) => alpha(themeVar.palette.primary.main, 0.2),
                                                                            transform: 'translateX(4px)',
                                                                        },
                                                                    }}
                                                                >
                                                                    {list.length > 1 && (
                                                                        <Box
                                                                            sx={{
                                                                                width: 18,
                                                                                height: 18,
                                                                                borderRadius: '50%',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                bgcolor: 'primary.main',
                                                                                color: 'primary.contrastText',
                                                                                fontSize: '10px',
                                                                                fontWeight: 800,
                                                                                flexShrink: 0,
                                                                            }}
                                                                        >
                                                                            {index + 1}
                                                                        </Box>
                                                                    )}
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            color: 'text.primary',
                                                                            fontSize: 13,
                                                                            wordBreak: 'break-word',
                                                                            lineHeight: 1.3,
                                                                        }}
                                                                    >
                                                                        {name}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    );
                                                })()}
                                                icon={(contact.company_name_list || []).length > 1 ? null : <HiOutlineBuildingOffice size={18} />}
                                            />
                                            {contact.source_lead && (
                                                <DetailItem
                                                    label="Source Lead"
                                                    value={contact.source_lead}
                                                    icon={<HiOutlineUser size={18} />}
                                                    color="text-primary"
                                                    onClick={() => {
                                                        router.push(`/leads?view=${encodeURIComponent(contact.source_lead)}`);
                                                        onClose();
                                                    }}
                                                />
                                            )}
                                            {contact.customer_type && (
                                                <DetailItem
                                                    label="Client Type"
                                                    value={contact.customer_type}
                                                    icon={<HiOutlineUser size={18} />}
                                                    color="text-primary"
                                                />
                                            )}
                                        </Stack>

                                        <SectionHeader title="Contact Details" />
                                        <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                                            <DetailItem label="Email Address" value={contact.email} icon={<HiOutlineEnvelope size={18} />} />
                                            <DetailItem label="Phone Number" value={contact.phone} icon={<HiOutlinePhone size={18} />} />
                                            <DetailItem
                                                label="Client Owner"
                                                value={ownerDetails?.full_name || contact.owner}
                                                subValue={ownerDetails?.email || (contact.owner && contact.owner.includes('@') ? contact.owner : null)}
                                                icon={<HiOutlineBriefcase size={18} />}
                                            />
                                        </Stack>
                                    </Box>

                                    {/* Location Details */}
                                    <Box>
                                        <SectionHeader title="Location" />
                                        <Stack spacing={2.5} sx={{ mt: 3 }}>
                                            <DetailItem label="Full Address" value={contact.address} icon={<HiOutlineHome size={18} />} />
                                            <DetailItem label="City & State" value={`${contact.city || '—'}, ${contact.state || '—'}`} icon={<HiOutlineMapPin size={18} />} />
                                            <DetailItem label="Country" value={contact.country} icon={<HiOutlineGlobeAlt size={18} />} />
                                        </Stack>
                                    </Box>

                                    {/* Synchronization Info */}
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 1.5,
                                            bgcolor: 'background.neutral',
                                            border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                                                Last Update:
                                            </Typography>
                                        </Stack>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {new Date(contact.modified).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Scrollbar>
                        </Box>

                        {/* Main Content: Tabs & Related Data */}
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 3 }}>
                                <Tabs
                                    value={currentTab}
                                    onChange={(e, newValue) => setCurrentTab(newValue)}
                                    sx={{
                                        px: 3,
                                        '& .MuiTab-root': {
                                            minHeight: 64,
                                            fontWeight: 800,
                                            fontSize: 15,
                                            '&.Mui-selected': { color: 'primary.main' },
                                        },
                                        '& .MuiTabs-indicator': {
                                            height: 3,
                                            borderRadius: '3px 3px 0 0',
                                        }
                                    }}
                                >
                                    {TABS.map((tab) => (
                                        <Tab
                                            key={tab.value}
                                            value={tab.value}
                                            label={tab.label}
                                            icon={tab.icon}
                                            iconPosition="start"
                                        />
                                    ))}
                                </Tabs>

                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    {canCreateCalendar && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<Iconify icon="solar:calendar-add-bold" />}
                                            onClick={() => setOpenTypeDialog(true)}
                                            sx={{
                                                borderRadius: 1.5,
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                px: 2.5,
                                                height: 36,
                                                bgcolor: '#0e9f6e',
                                                '&:hover': {
                                                    bgcolor: '#0c875d',
                                                },
                                            }}
                                        >
                                            Create Interaction
                                        </Button>
                                    )}

                                    {contact?.phone && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={() => setOpenWhatsapp(true)}
                                            startIcon={<Iconify icon={"ic:baseline-whatsapp" as any} />}
                                            sx={{
                                                bgcolor: '#25D366',
                                                color: '#fff',
                                                borderRadius: 2.5,
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                px: 2.5,
                                                height: 36,
                                                '&:hover': {
                                                    bgcolor: '#22c55e',
                                                },
                                            }}
                                        >
                                            WhatsApp
                                        </Button>
                                    )}
                                </Stack>
                            </Box>

                            <Box sx={{ flexGrow: 1, p: 4, bgcolor: 'background.paper', overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                {TABS.length > 0 ? (
                                    <ContactRelatedList contactId={contactId || ''} type={currentTab as any} extraState={extraState} />
                                ) : (
                                    <Box sx={{ flexGrow: 1, py: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <Iconify icon={"solar:shield-keyhole-bold-duotone" as any} width={84} sx={{ color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                                            Permission Denied
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', maxWidth: 400 }}>
                                            You do not have permission to view any related tabs for this client.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ py: 20, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={80} sx={{ color: 'text.disabled', mb: 3 }} />
                        <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800 }}>Identity Not Found</Typography>
                    </Box>
                )}
            </DialogContent>
            {contact?.phone && (
                <WhatsappChatDialog
                    open={openWhatsapp}
                    onClose={() => setOpenWhatsapp(false)}
                    lead={{
                        lead_name: `${contact.first_name} ${contact.last_name || ''}`,
                        phone_number: contact.phone
                    }}
                />
            )}

            {/* Event Type Selection Dialog */}
            <Dialog open={openTypeDialog} onClose={() => setOpenTypeDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: (t: any) => t.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Choose Event Type
                    <IconButton onClick={() => setOpenTypeDialog(false)} sx={{ color: 'text.secondary' }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ py: 2 }}>
                        {[
                            {
                                label: 'Calls',
                                icon: `${CONFIG.assetsDir}/images/calls-3d-white.png`,
                                color: 'primary',
                                sub: 'Schedule a call',
                                handler: () => {
                                    setOpenTypeDialog(false);
                                    setOpenCallDialog(true);
                                },
                            },
                            {
                                label: 'Meeting',
                                icon: `${CONFIG.assetsDir}/images/meeting-3d-white.png`,
                                color: 'success',
                                sub: 'Schedule a meeting',
                                handler: () => {
                                    setOpenTypeDialog(false);
                                    setOpenMeetingDialog(true);
                                },
                            },
                            {
                                label: 'To-do',
                                icon: `${CONFIG.assetsDir}/images/todo-3d-white.png`,
                                color: 'warning',
                                sub: 'Create a task',
                                handler: () => {
                                    setOpenTypeDialog(false);
                                    setOpenTodoDialog(true);
                                },
                            },
                        ].map((item) => (
                            <Grid key={item.label} size={{ xs: 12, md: 4 }}>
                                <Box
                                    onClick={item.handler}
                                    sx={{
                                        p: 3,
                                        borderRadius: 2.5,
                                        cursor: 'pointer',
                                        transition: theme.transitions.create(['all'], {
                                            duration: theme.transitions.duration.shorter,
                                        }),
                                        textAlign: 'center',
                                        bgcolor: alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.04),
                                        border: `1px solid ${alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.1)}`,
                                        backdropFilter: 'blur(12px) saturate(160%)',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.08),
                                            borderColor: theme.palette[item.color as 'primary' | 'success' | 'warning'].main,
                                            transform: 'translateY(-6px)',
                                            boxShadow: `0 12px 24px -4px ${alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.16)}`,
                                            '& img': {
                                                transform: 'scale(1.1) rotate(5deg)',
                                            }
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mb: 1,
                                            display: 'inline-flex',
                                            transition: theme.transitions.create(['transform']),
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={item.icon}
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                objectFit: 'contain',
                                                mixBlendMode: 'multiply',
                                                filter: 'contrast(1.2) brightness(1.1)',
                                                transition: theme.transitions.create(['transform']),
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{item.label}</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.813rem' }}>
                                        {item.sub}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
            </Dialog>

            {/* Event Form Dialogs prefilled with client details */}
            {openCallDialog && contact && (
                <CallDialog
                    open={openCallDialog}
                    onClose={() => setOpenCallDialog(false)}
                    initialData={{
                        call_for: 'Contact',
                        contact_name: contact.name,
                        title: `Follow up call with ${contact.first_name} ${contact.last_name || ''}`
                    }}
                    onSuccess={() => {
                        setOpenCallDialog(false);
                        setSnackbar({ open: true, message: 'Call scheduled successfully', severity: 'success' });
                    }}
                />
            )}

            {openMeetingDialog && contact && (
                <MeetingDialog
                    open={openMeetingDialog}
                    onClose={() => setOpenMeetingDialog(false)}
                    initialData={{
                        meet_for: 'Contact',
                        contact_name: contact.name,
                        title: `Follow up meeting with ${contact.first_name} ${contact.last_name || ''}`
                    }}
                    onSuccess={() => {
                        setOpenMeetingDialog(false);
                        setSnackbar({ open: true, message: 'Meeting scheduled successfully', severity: 'success' });
                    }}
                />
            )}

            {openTodoDialog && contact && (
                <TodoDialog
                    open={openTodoDialog}
                    onClose={() => setOpenTodoDialog(false)}
                    initialData={{
                        description: `Follow up task for client: ${contact.first_name} ${contact.last_name || ''}`
                    }}
                    onSuccess={() => {
                        setOpenTodoDialog(false);
                        setSnackbar({ open: true, message: 'To-do task created successfully', severity: 'success' });
                    }}
                />
            )}

        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            style={{ zIndex: 99999 }}
            sx={{ zIndex: 99999 }}
            slotProps={{
                root: {
                    style: { zIndex: 99999 }
                }
            }}
        >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                {snackbar.message}
            </Alert>
        </Snackbar>
        </Dialog>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '12px' }}>
                {title}
            </Typography>
        </Stack>
    );
}

function DetailItem({ label, value, subValue, icon, color = 'text.primary', onClick, sx }: { label: string; value?: React.ReactNode; subValue?: string | null; icon: React.ReactNode; color?: string; onClick?: () => void; sx?: any }) {
    return (
        <Box sx={{ pb: 2, borderBottom: (themeVar) => `1px dashed ${alpha(themeVar.palette.grey[500], 0.2)}`, ...sx }}>
            <Typography variant="caption" sx={{ color: '#2081C3', fontWeight: 800, textTransform: 'uppercase', mb: 0.75, display: 'block', fontSize: 11, letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                onClick={onClick}
                sx={{
                    ...(onClick && {
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.72 },
                    }),
                }}
            >
                {icon && (
                    <Box sx={{ color: 'text.secondary', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                        {icon}
                    </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                    {typeof value === 'string' || value === null || value === undefined ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, color, wordBreak: 'break-word', lineHeight: 1.4, fontSize: 14 }}>
                            {value || '—'}
                        </Typography>
                    ) : (
                        value
                    )}
                    {subValue && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, fontSize: 12, fontWeight: 600 }}>
                            {subValue}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}
