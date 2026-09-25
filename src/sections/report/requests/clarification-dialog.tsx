import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: (message: string) => void;
    title?: string;
    label?: string;
    loading?: boolean;
};

export function ClarificationDialog({
    open,
    onClose,
    onConfirm,
    title = 'Ask Clarification',
    label = 'Message',
    loading = false
}: Props) {
    const [message, setMessage] = useState('');

    const handleConfirm = () => {
        if (!message.trim()) return;
        onConfirm(message);
        setMessage('');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (theme) => theme.customShadows?.z24 || theme.shadows[24],
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Iconify icon={"solar:chat-line-bold" as any} width={24} sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">{title}</Typography>
                </Stack>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 1.5 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label={label}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                borderRadius: 1.5,
                            }
                        }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5 }}>
                {/* <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 1 }}>
                    Cancel
                </Button> */}
                <LoadingButton
                    variant="contained"
                    color="primary"
                    onClick={handleConfirm}
                    loading={loading}
                    disabled={!message.trim()}
                    sx={{ borderRadius: 1, minWidth: 100 }}
                >
                    Send
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}

