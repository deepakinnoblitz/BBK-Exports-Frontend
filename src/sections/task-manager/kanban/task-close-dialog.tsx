import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { uploadFile } from 'src/api/data-import';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirmed: (hours: string, remarks: string, attachment?: string) => void;
    loading?: boolean;
    attachmentRequired?: boolean;
};

export function TaskCloseDialog({ open, onClose, onConfirmed, loading: externalLoading, attachmentRequired }: Props) {
    const [hours, setHours] = useState('');
    const [remarks, setRemarks] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [internalLoading, setInternalLoading] = useState(false);

    const loading = externalLoading || internalLoading;

    useEffect(() => {
        if (!open) {
            setHours('');
            setRemarks('');
            setFile(null);
            setError(null);
        }
    }, [open]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) {
            setFile(event.target.files[0]);
            setError(null);
        }
    };

    const handleConfirm = async () => {
        if (!hours) {
            setError('Please enter Hours Spent');
            return;
        }
        if (!remarks) {
            setError('Please enter Remarks');
            return;
        }

        // Regex for HH:MM format (HH: 1-5 digits, MM: 00-59)
        const hoursRegex = /^([0-9]{1,5}):([0-5][0-9])$/;
        if (!hoursRegex.test(hours)) {
            setError('Please use HH:MM format (e.g., 02:30). Minutes must be between 00 and 59.');
            return;
        }

        if (hours === '00:00' || hours === '0:00') {
            setError('Hours Spent cannot be 00:00');
            return;
        }
    
        if (attachmentRequired && !file) {
            setError('Attachment is mandatory to close this task');
            return;
        }

        setError(null);
        setInternalLoading(true);

        try {
            let file_url = '';
            if (file) {
                const uploaded = await uploadFile(file);
                file_url = uploaded.file_url;
            }
            onConfirmed(hours, remarks, file_url);
        } catch (err: any) {
            setError(err.message || 'Failed to upload attachment');
        } finally {
            setInternalLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle
                sx={{
                    m: 0,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'background.neutral'
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Close Task
                </Typography>
                <IconButton
                    onClick={onClose}
                    sx={{
                        color: 'text.disabled',
                        bgcolor: 'background.paper',
                        boxShadow: (theme: any) => theme.customShadows?.z1
                    }}
                >
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Please provide the details of the work performed to complete this task.
                </Typography>

                <Stack spacing={2.5}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                            Hours Spent <Typography component="span" color="error" sx={{ ml: 0.5 }}>*</Typography>
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="HH:MM (e.g., 01:45)"
                            value={hours}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9:]/g, ''); // Restrict to numbers and :
                                setHours(val);
                                setError(null);
                            }}
                            error={Boolean(error && error.includes('Hours'))}
                            helperText={error && error.includes('Hours') ? error : 'Format: HH:MM (MM: 00-59)'}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                            Closing Remarks <Typography component="span" color="error" sx={{ ml: 0.5 }}>*</Typography>
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="What was accomplished?"
                            value={remarks}
                            onChange={(e) => {
                                setRemarks(e.target.value);
                                setError(null);
                            }}
                            error={Boolean(error && error.includes('Remarks'))}
                            helperText={error && error.includes('Remarks') ? error : ''}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                            Attachment {attachmentRequired && <Typography component="span" color="error" sx={{ ml: 0.5, fontWeight: 'bold' }}>*</Typography>}
                        </Typography>

                        <Button
                            component="label"
                            variant="outlined"
                            fullWidth
                            sx={{
                                borderStyle: 'dashed',
                                borderWidth: 2,
                                py: file ? 1.5 : 3,
                                px: 2,
                                borderRadius: 2,
                                borderColor: (theme) =>
                                    (error && error.includes('Attachment')) ? theme.palette.error.main : alpha(theme.palette.grey[500], 0.32),
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                    borderColor: (theme) => theme.palette.text.primary,
                                },
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                color: 'text.secondary'
                            }}
                        >
                            {!file ? (
                                <>
                                    <Iconify
                                        icon={"solar:cloud-upload-bold-duotone" as any}
                                        width={40}
                                        sx={{ color: 'primary.main', mb: 0.5 }}
                                    />
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>Click to upload attachment</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>Max size: 5MB</Typography>
                                    </Box>
                                </>
                            ) : (
                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 1,
                                            bgcolor: 'primary.lighter',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <Iconify icon={"solar:file-bold-duotone" as any} width={24} sx={{ color: 'primary.main' }} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1, textAlign: 'left', minWidth: 0 }}>
                                        <Typography variant="subtitle2" noWrap sx={{ color: 'text.primary' }}>{file.name}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        sx={{ color: 'error.main', bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) }}
                                    >
                                        <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                </Stack>
                            )}
                            <input type="file" hidden onChange={handleFileChange} />
                        </Button>

                        {error && error.includes('Attachment') && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'medium' }}>
                                <Iconify icon="solar:danger-bold" width={14} /> {error}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={loading}
                    startIcon={<Iconify icon="solar:check-circle-bold" />}
                    sx={{
                        fontWeight: 800,
                        bgcolor: 'success.main',
                        '&:hover': { bgcolor: 'success.dark' },
                    }}
                >
                    {loading ? 'Uploading & Closing...' : 'Confirm & Close'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
