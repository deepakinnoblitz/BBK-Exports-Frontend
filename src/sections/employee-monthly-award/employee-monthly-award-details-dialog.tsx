import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

type Props = {
    open: boolean;
    onClose: () => void;
    award: any;
    onSave?: (data: any) => Promise<void>;
    mode: 'view' | 'edit';
};

export function EmployeeMonthlyAwardDetailsDialog({ open, onClose, award, onSave, mode }: Props) {
    const [formData, setFormData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (award) {
            setFormData({ ...award });
        }
    }, [award]);

    if (!award || !formData) return null;

    const handleSave = async () => {
        if (onSave) {
            setSaving(true);
            try {
                await onSave(formData);
                onClose();
            } catch (error) {
                console.error(error);
                // Reset form data to original award on error
                setFormData({ ...award });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? (checked ? 1 : 0) : value;

        setFormData((prev: any) => {
            const updated = { ...prev, [name]: newValue };

            if (name === 'is_auto_generated' && checked) {
                updated.manually_selected = 0;
            } else if (name === 'manually_selected' && checked) {
                updated.is_auto_generated = 0;
            }

            return updated;
        });
    };

    const isEdit = mode === 'edit';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (themeVar) => themeVar.customShadows.z24,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                    {isEdit ? 'Edit' : 'View'} Award Details
                </Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto', mt: 3 }}>
                <Stack spacing={3}>
                    {/* Hero Section */}
                    <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f4f6f8', border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#00A5D114', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Iconify icon={"solar:cup-star-bold" as any} width={24} sx={{ color: '#00A5D1' }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block' }}>Month</Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{fDate(award.month, 'MMMM YYYY').toUpperCase()}</Typography>
                                </Box>
                            </Stack>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                    Rank
                                </Typography>
                                <Label color={award.rank === 1 ? 'success' : 'warning'} variant="soft" sx={{ height: 28, fontWeight: 800 }}>
                                    Rank {award.rank}
                                </Label>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Info Grid */}
                    <Grid container spacing={3} sx={{ pl: 1 }}>
                        <Grid size={{ xs: 6 }}>
                            <InfoRow variant="premium" icon="solar:user-id-bold" iconColor="#6366f1" label="Employee" value={`${award.employee_name} (${award.employee})`} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <InfoRow variant="premium" icon="solar:medal-star-bold" iconColor="#f59e0b" label="Total Score" value={Number(award.total_score).toFixed(2)} />
                        </Grid>
                    </Grid>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Score Breakdown Grid */}
                    <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800 }}>Score Breakdown</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1.5, pl: 1 }}>
                        <InfoRow icon="solar:calendar-date-bold" iconColor="#10b981" label="Attendance" value={Number(award.attendance_score).toFixed(2)} />
                        <InfoRow icon="solar:user-speak-bold" iconColor="#8b5cf6" label="Personality" value={Number(award.personality_score).toFixed(2)} />
                        <InfoRow icon="solar:clock-circle-bold" iconColor="#3b82f6" label="Login Time" value={Number(award.login_score).toFixed(2)} />
                        <InfoRow icon="solar:history-bold" iconColor="#f97316" label="Overtime" value={Number(award.overtime_score).toFixed(2)} />
                        <InfoRow icon="solar:danger-bold" iconColor="#ef4444" label="Leave Penalty" value={Number(award.leave_penalty).toFixed(2)} />
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Controls */}
                    <Stack spacing={3} direction="row" sx={{ mt: 2, pl: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={!!formData.published}
                                    onChange={handleChange}
                                    name="published"
                                    disabled={!isEdit}
                                />
                            }
                            label="Published"
                            sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1.25, typography: 'subtitle2', fontWeight: 700 } }}
                        />
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={!!formData.is_auto_generated}
                                    onChange={handleChange}
                                    name="is_auto_generated"
                                    disabled={!isEdit}
                                />
                            }
                            label="Auto Generated"
                            sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1.25, typography: 'subtitle2', fontWeight: 700 } }}
                        />
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={!!formData.manually_selected}
                                    onChange={handleChange}
                                    name="manually_selected"
                                    disabled={!isEdit}
                                />
                            }
                            label="Manually Selected"
                            sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1.25, typography: 'subtitle2', fontWeight: 700 } }}
                        />
                    </Stack>
                </Stack>
            </DialogContent>

            {isEdit && (
                <DialogActions sx={{ p: 1.5 }}>
                    <LoadingButton
                        variant="contained"
                        loading={saving}
                        onClick={handleSave}
                        sx={{ px: 4 }}
                    >
                        Update
                    </LoadingButton>
                </DialogActions>
            )}
        </Dialog>
    );
}

function InfoRow({ icon, iconColor, label, value, variant = 'neutral' }: { icon: string; iconColor: string; label: string; value: string; variant?: 'neutral' | 'premium' }) {
    const isPremium = variant === 'premium';

    return (
        <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isPremium ? 'background.paper' : 'background.neutral',
                border: (theme) => `1px solid ${isPremium ? alpha(theme.palette.divider, 0.6) : theme.palette.divider}`,
                boxShadow: (theme) => isPremium ? theme.customShadows.z1 : 'none',
                transition: (theme) => theme.transitions.create(['background-color', 'box-shadow']),
                '&:hover': {
                    bgcolor: (theme) => isPremium ? alpha(theme.palette.background.paper, 0.8) : alpha(theme.palette.background.paper, 0.8),
                    boxShadow: (theme) => theme.customShadows.z8,
                }
            }}
        >
            <Box
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(iconColor, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: iconColor,
                }}
            >
                <Iconify icon={icon as any} width={18} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: isPremium ? 'text.disabled' : 'text.primary', fontWeight: 800, fontSize: 9, display: 'block', textTransform: 'uppercase', mb: 0.25 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Stack>
    )
}

