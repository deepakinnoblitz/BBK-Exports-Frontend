import { useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';

import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { Iconify } from 'src/components/iconify';

import ChatStatusBadge from './chat-status-badge';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    mode?: 'direct' | 'group';
    onClose: () => void;
    contacts: any[];
    presences: Record<string, any>;
    onSelectContact: (contact: any) => void;
    onCreateGroup?: (data: { name: string; members: any[] }) => void;
    onModeChange?: (mode: 'direct' | 'group') => void;
};

export default function ChatContactDialog({ open, mode = 'direct', onClose, contacts, presences, onSelectContact, onCreateGroup, onModeChange }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
    const [groupName, setGroupName] = useState('');
    const [step, setStep] = useState(0); // 0: member selection, 1: group details

    const filteredContacts = contacts.filter((contact) =>
        contact.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">{mode === 'group' ? (step === 0 ? 'Select Group Members' : 'Group Details') : 'New Conversation'}</Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <Box sx={{ p: 3, pt: 0 }}>
                {step === 0 ? (
                    <>
                        <TextField
                            fullWidth
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search contacts..."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                mb: 3,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5,
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                    '& fieldset': { border: 'none' }, // Cleaner look
                                    '&.Mui-focused': {
                                        bgcolor: 'transparent',
                                        '& fieldset': { border: (theme) => `solid 1px ${theme.palette.primary.main}` }
                                    }
                                }
                            }}
                        />

                        <Box sx={{ height: 400, overflowY: 'auto' }}>
                            <List disablePadding>
                                {mode === 'direct' && !searchQuery && (
                                    <ListItemButton
                                        id="btn-create-group-dialog"
                                        onClick={() => onModeChange?.('group')}
                                        sx={{ py: 1.5, px: 2, borderRadius: 1.5, mb: 1 }}
                                    >
                                        <Avatar sx={{ bgcolor: '#0BD05F', mr: 2, width: 44, height: 44 }}>
                                            <Iconify icon="solar:users-group-rounded-bold" width={24} sx={{ color: 'white' }} />
                                        </Avatar>
                                        <ListItemText primary="New group" primaryTypographyProps={{ variant: 'subtitle1' }} />
                                    </ListItemButton>
                                )}

                                {filteredContacts.length > 0 ? (
                                    filteredContacts.map((contact) => {
                                        const isSelected = selectedMembers.some(m => m.user_id === contact.user_id);
                                        return (
                                            <ListItemButton
                                                key={contact.profile_id}
                                                onClick={() => {
                                                    if (mode === 'group') {
                                                        setSelectedMembers(prev =>
                                                            isSelected
                                                                ? prev.filter(m => m.user_id !== contact.user_id)
                                                                : [...prev, contact]
                                                        );
                                                    } else {
                                                        onSelectContact(contact);
                                                    }
                                                }}
                                                sx={{
                                                    py: 1.5,
                                                    px: 2,
                                                    mb: 1,
                                                    borderRadius: 1.5,
                                                    '&:hover': {
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                    }
                                                }}
                                            >
                                                {mode === 'group' && (
                                                    <Checkbox
                                                        checked={isSelected}
                                                        sx={{ p: 0.5, mr: 1 }}
                                                    />
                                                )}
                                                <Box sx={{ mr: 2, position: 'relative' }}>
                                                    <ChatStatusBadge status={presences?.[contact.user_id]?.status}>
                                                        <Avatar
                                                            alt={contact.full_name}
                                                            src={contact.avatar}
                                                            sx={{
                                                                width: 44,
                                                                height: 44,
                                                                fontWeight: 'fontWeightBold',
                                                                color: contact.avatar ? 'text.secondary' : stringToDarkColor(contact.full_name || ''),
                                                                bgcolor: contact.avatar ? 'transparent' : stringToColor(contact.full_name || ''),
                                                            }}
                                                        >
                                                            {contact.full_name?.charAt(0).toUpperCase()}
                                                        </Avatar>
                                                    </ChatStatusBadge>
                                                </Box>

                                                <ListItemText
                                                    primary={contact.full_name}
                                                    secondary={contact.user_id}
                                                    primaryTypographyProps={{ variant: 'subtitle2', sx: { mb: 0.5 } }}
                                                    secondaryTypographyProps={{ variant: 'caption', noWrap: true, display: 'block' }}
                                                />

                                                {mode === 'direct' && (
                                                    <Iconify
                                                        icon={"solar:chat-round-line-duotone" as any}
                                                        sx={{
                                                            color: 'primary.main',
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s',
                                                            '.MuiListItemButton-root:hover &': { opacity: 1 }
                                                        }}
                                                    />
                                                )}
                                            </ListItemButton>
                                        );
                                    })
                                ) : (
                                    searchQuery && (
                                        <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                                            <Iconify icon="solar:user-block-rounded-line-duotone" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                No contacts found
                                            </Typography>
                                        </Stack>
                                    )
                                )}
                            </List>
                        </Box>

                        {mode === 'group' && (
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    disabled={selectedMembers.length === 0}
                                    onClick={() => setStep(1)}
                                    sx={{ borderRadius: 1.5 }}
                                >
                                    Next ({selectedMembers.length})
                                </Button>
                            </Box>
                        )}
                    </>
                ) : (
                    <Stack spacing={3}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Avatar
                                sx={{
                                    width: 100,
                                    height: 100,
                                    fontSize: 40,
                                    bgcolor: stringToColor(groupName || 'Group'),
                                    color: stringToDarkColor(groupName || 'Group'),
                                }}
                            >
                                {groupName?.charAt(0).toUpperCase() || <Iconify icon="solar:users-group-rounded-bold-duotone" width={48} />}
                            </Avatar>
                        </Box>

                        <TextField
                            fullWidth
                            label="Group Name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name..."
                        />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                Selected Members ({selectedMembers.length})
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 150, overflowY: 'auto', p: 1, bgcolor: 'background.neutral', borderRadius: 1 }}>
                                {selectedMembers.map((member) => (
                                    <Stack key={member.user_id} direction="row" alignItems="center" spacing={1} sx={{ p: 0.5, px: 1, bgcolor: 'background.paper', borderRadius: 1, border: (t) => `solid 1px ${t.palette.divider}` }}>
                                        <Avatar src={member.avatar} sx={{ width: 20, height: 20 }}>{member.full_name?.charAt(0)}</Avatar>
                                        <Typography variant="caption">{member.full_name}</Typography>
                                        <IconButton size="small" onClick={() => setSelectedMembers(prev => prev.filter(m => m.user_id !== member.user_id))}>
                                            <Iconify icon="mingcute:close-line" width={12} />
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                            <Button fullWidth variant="outlined" onClick={() => setStep(0)} sx={{ borderRadius: 1.5 }}>
                                Back
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                disabled={!groupName.trim() || selectedMembers.length === 0}
                                onClick={() => {
                                    if (onCreateGroup) {
                                        onCreateGroup({ name: groupName, members: selectedMembers });
                                        onClose();
                                        setStep(0);
                                        setSelectedMembers([]);
                                        setGroupName('');
                                    }
                                }}
                                sx={{ borderRadius: 1.5 }}
                            >
                                Create Group
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Box>
        </Dialog>
    );
}
