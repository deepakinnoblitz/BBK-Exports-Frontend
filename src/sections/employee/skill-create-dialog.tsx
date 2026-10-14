import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { createSkill } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onCreate: (newSkill: string) => void;
    currentSkillName?: string;
};

export function SkillCreateDialog({ open, onClose, onCreate, currentSkillName = '' }: Props) {
    const [skillName, setSkillName] = useState(currentSkillName);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setSkillName(currentSkillName);
            setDescription('');
            setError('');
        }
    }, [open, currentSkillName]);

    const handleSubmit = async () => {
        if (!skillName.trim()) {
            setError('Skill Name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const res = await createSkill({
                skill_name: skillName.trim(),
                description: description.trim() || undefined,
                is_active: 1,
            });
            const createdName = res?.name || skillName.trim();
            onCreate(createdName);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create skill');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">New Skill</Typography>
                </Box>
                <Iconify
                    icon="mingcute:close-line"
                    onClick={onClose}
                    sx={{ cursor: 'pointer', color: 'text.disabled' }}
                />
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        required
                        fullWidth
                        label="Skill Name"
                        placeholder="e.g. Skilled, Semi Skilled, Unskilled"
                        value={skillName}
                        onChange={(e) => {
                            setSkillName(e.target.value);
                            if (error) setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description"
                        placeholder="Optional description of skill or qualifications..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', '&:hover': { bgcolor: COMMON_COLORS.emerald.dark } }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
