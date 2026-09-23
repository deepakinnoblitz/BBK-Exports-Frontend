import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { getHRDocumentCategoryMaster, HRDocumentCategoryMaster } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    id?: string | null;
};

export function HRDocumentCategoryDetailsDialog({ open, onClose, id }: Props) {
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<HRDocumentCategoryMaster | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (open && id) {
                try {
                    setLoading(true);
                    const data = await getHRDocumentCategoryMaster(id);
                    setCategory(data);
                } catch (err) {
                    console.error('Failed to fetch HR document category details:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setCategory(null);
            }
        };

        fetchData();
    }, [open, id]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (themeVar: any) => themeVar.customShadows.z24,
                },
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">HR Document Category Details</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                    </Box>
                ) : category ? (
                    <Stack spacing={2.5} sx={{ py: 1 }}>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                Category Name
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {category.category_name || category.name || '-'}
                            </Typography>
                        </Stack>

                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                Status
                            </Typography>
                            <Box sx={{ display: 'flex' }}>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        textTransform: 'uppercase',
                                        borderRadius: '6px',
                                        padding: '4px 12px',
                                        ...(category.is_active
                                            ? {
                                                  bgcolor: 'rgba(34, 197, 94, 0.25)',
                                                  border: '1px solid rgba(34, 197, 94, 0.45)',
                                                  color: '#15803d',
                                              }
                                            : {
                                                  bgcolor: 'rgba(156, 163, 175, 0.25)',
                                                  border: '1px solid rgba(156, 163, 175, 0.45)',
                                                  color: '#374151',
                                              }),
                                    }}
                                >
                                    {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </Box>
                            </Box>
                        </Stack>

                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                Description
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {category.description || 'No description provided.'}
                            </Typography>
                        </Stack>
                    </Stack>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        No category details found.
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button variant="outlined" color="inherit" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
