import { FaLaptop, FaFolder, FaBarcode, FaRupeeSign, FaRegCalendarAlt } from 'react-icons/fa';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { fCurrency } from 'src/utils/format-number';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
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

type Props = {
    open: boolean;
    onClose: () => void;
    asset: any;
};

export function AssetDetailsDialog({ open, onClose, asset }: Props) {
    const renderStatus = (status: string) => (
        <Label
            variant="soft"
            color={
                (status === 'Available' && 'success') ||
                (status === 'Assigned' && 'info') ||
                (status === 'Maintenance' && 'warning') ||
                (status === 'Disposed' && 'error') ||
                'default'
            }
        >
            {status || 'Unknown'}
        </Label>
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Asset Details</Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
                {asset ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {/* Header Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                                    color: COMMON_COLORS.emerald.main,
                                }}
                            >
                                <Iconify icon={"solar:laptop-bold" as any} width={40} />
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>{asset.asset_name}</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    {asset.asset_tag}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                {renderStatus(asset.current_status)}
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                                    ID: {asset.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Asset Information */}
                        <Box>
                            <SectionHeader title="Asset Information" />
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 3,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
                                }}
                            >
                                <DetailItem label="Asset Name" value={asset.asset_name} icon={<FaLaptop size={18} />} />
                                <DetailItem label="Asset Tag" value={asset.asset_tag} icon={<FaBarcode size={18} />} />
                                <DetailItem label="Category" value={asset.category} icon={<FaFolder size={18} />} />
                            </Box>
                        </Box>

                        {/* Purchase Details */}
                        <Box>
                            <SectionHeader title="Purchase Details" />
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 3,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
                                }}
                            >
                                <DetailItem
                                    label="Purchase Date"
                                    value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'}
                                    icon={<FaRegCalendarAlt size={18} />}
                                />
                                <DetailItem
                                    label="Purchase Cost"
                                    value={asset.purchase_cost ? renderCurrency(asset.purchase_cost) : '-'}
                                    icon={<FaRupeeSign size={18} />}
                                />
                            </Box>
                        </Box>

                        {/* Description */}
                        {asset.description && (
                            <Box>
                                <SectionHeader title="Description" />
                                <Box sx={{ p: 3, bgcolor: 'background.neutral', borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {asset.description}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Attachment */}
                        {asset.asset_attachment && (
                            <Box>
                                <SectionHeader title="Attachment" />
                                <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Iconify icon={"solar:file-bold" as any} width={24} sx={{ color: 'text.secondary' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
                                        {asset.asset_attachment.split('/').pop() || 'Attached File'}
                                    </Typography>
                                    <Button size="small" variant="outlined" component="a" href={asset.asset_attachment} target="_blank" rel="noopener noreferrer">
                                        View File
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Asset Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function SectionHeader({ title, noMargin = false }: { title: string, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '14px' }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon }: { label: string; value?: React.ReactNode; icon: React.ReactNode }) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 50,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5, fontSize: 11 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}