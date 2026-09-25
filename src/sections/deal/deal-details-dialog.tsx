import { useState, useEffect, useCallback } from 'react';
import { HiOutlineDocumentText, HiOutlineClipboardDocumentCheck } from "react-icons/hi2";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { useRouter } from 'src/routes/hooks';

import { getDeal } from 'src/api/deals';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { DealRelatedList } from './deal-related-list';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    dealId: string | null;
    onEdit?: (id: string) => void;
};

export function DealDetailsDialog({ open, onClose, dealId, onEdit }: Props) {
    const theme = useTheme();
    const router = useRouter();

    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState('estimations');

    useEffect(() => {
        if (open && dealId) {
            setLoading(true);
            getDeal(dealId)
                .then((dealData) => {
                    setDeal(dealData);
                })
                .catch((err) => console.error('Failed to fetch deal details:', err))
                .finally(() => setLoading(false));
        } else {
            setCurrentTab('estimations');
        }
    }, [open, dealId]);

    const handleCreateEstimation = useCallback(() => {
        if (deal) {
            router.push(`/estimations/new?deal_id=${deal.name}&client_id=${deal.contact}`);
            onClose();
        }
    }, [deal, router, onClose]);

    const handleCreateInvoice = useCallback(() => {
        if (deal) {
            router.push(`/invoices/new?deal_id=${deal.name}`);
            onClose();
        }
    }, [deal, router, onClose]);


    const TABS = [
        { value: 'estimations', label: 'Estimations', icon: <HiOutlineClipboardDocumentCheck size={18} /> },
        { value: 'invoices', label: 'Invoices', icon: <HiOutlineDocumentText size={18} /> },
    ];

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Deal Details</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <IconButton onClick={onClose} sx={{ color: (themeVar) => themeVar.palette.grey[500], bgcolor: 'background.paper', boxShadow: (themeVar) => themeVar.customShadows?.z1 }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={48} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : deal ? (
                    <Box sx={{ display: 'flex', height: '80vh' }}>
                        {/* Sidebar: Deal Details */}
                        <Box
                            sx={{
                                width: 350,
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
                                }}>
                                <Stack spacing={5}>
                                    {/* Deal Identity */}
                                    <Box>
                                        <Stack direction="row" spacing={2.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: '50%',
                                                    bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.1),
                                                    color: 'primary.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.2)}`,
                                                }}
                                            >
                                                <Iconify icon={"solar:bag-bold" as any} width={36} />
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: -0.5 }}>
                                                    {deal.deal_title}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, display: 'block' }}>
                                                    ID: {deal.name}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    <Divider sx={{ borderStyle: 'dashed' }} />

                                    {/* Deal Stats */}
                                    <Box>
                                        <SectionHeader title="Overview" />
                                        <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                                            <DetailItem label="Expected Close" value={deal.expected_close_date} icon="solar:calendar-bold" />
                                        </Stack>
                                    </Box>

                                    {/* Relationships */}
                                    <Box>
                                        <SectionHeader title="Connectivity" />
                                        <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                                            <DetailItem label="Contact" value={deal.contact_name || deal.contact} icon="solar:user-bold" />
                                            <DetailItem label="Deal Owner" value={deal.deal_owner || deal.owner} icon="solar:user-rounded-bold" />
                                        </Stack>
                                    </Box>

                                    {/* Notes */}
                                    <Box>
                                        <SectionHeader title="Notes" />
                                        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', fontWeight: 600, fontStyle: deal.notes ? 'normal' : 'italic' }}>
                                            {deal.notes || 'No notes added'}
                                        </Typography>
                                    </Box>

                                    {/* Synchronization Info */}
                                    <Box
                                        sx={{
                                            p: 2.5,
                                            borderRadius: 2,
                                            bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.04),
                                            border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.1)}`,
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                                                Last Synchronized:
                                            </Typography>
                                        </Stack>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {deal.modified ? new Date(deal.modified).toLocaleString() : '—'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Scrollbar>
                        </Box>

                        {/* Main Content: Tabs & Related Data */}
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
                            </Box>

                            <Box sx={{ flexGrow: 1, p: 4, bgcolor: 'background.paper', overflow: 'auto' }}>
                                <DealRelatedList dealId={dealId || ''} type={currentTab as any} />
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ py: 20, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={80} sx={{ color: 'text.disabled', mb: 3 }} />
                        <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800 }}>Deal Not Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary' }}>
                {title}
            </Typography>
        </Stack>
    );
}

function DetailItem({ label, value, icon, color = 'text.primary', onClick, sx }: { label: string; value?: string | null | number; icon: string; color?: string; onClick?: () => void; sx?: any }) {
    return (
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
                ...sx
            }}
        >
            <Iconify icon={icon as any} width={20} sx={{ color: 'text.disabled', opacity: 0.64 }} />
            <Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', mb: 0.25, display: 'block', fontSize: 10 }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color, wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {value || '—'}
                </Typography>
            </Box>
        </Stack>
    );
}
