import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getUser } from 'src/api/users';
import { fetchUserPermissions } from 'src/api/user-permissions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    userId: string | null;
    onEdit?: () => void;
};

export function UserDetailsDialog({ open, onClose, userId, onEdit }: Props) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    useEffect(() => {
        if (open && userId) {
            setLoading(true);
            getUser(userId)
                .then((userData) => {
                    setUser(userData);
                    if (userData?.email) {
                        setLoadingPermissions(true);
                        fetchUserPermissions({
                            page: 1,
                            page_size: 100,
                            filters: { user: userData.email }
                        })
                        .then((res) => setUserPermissions(res.data || []))
                        .catch((err) => console.error('Failed to fetch user permissions', err))
                        .finally(() => setLoadingPermissions(false));
                    }
                })
                .catch((err) => console.error('Failed to fetch user details:', err))
                .finally(() => setLoading(false));
        }
    }, [open, userId]);

    const renderStatus = (enabled: boolean) => (
        <Label
            variant="filled"
            color={enabled ? 'success' : 'error'}
            sx={{
                textTransform: 'capitalize',
                fontWeight: 800,
                px: 1.5,
                height: 28,
                borderRadius: 1,
                boxShadow: (theme) => `0 2px 8px ${enabled ? theme.palette.success.main : theme.palette.error.main}40`,
            }}
        >
            {enabled ? 'Enabled' : 'Disabled'}
        </Label>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            TransitionProps={{
                onExited: () => {
                    setUser(null);
                }
            }}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}
        >
            <DialogTitle sx={{ m: 0, px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>User Profile</Typography>
                <IconButton
                    onClick={onClose}
                    sx={{
                        color: 'text.disabled',
                        transition: (theme) => theme.transitions.create('all', {
                            duration: theme.transitions.duration.shortest,
                        }),
                        '&:hover': {
                            color: 'text.primary',
                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
                            transform: 'scale(1.1)',
                        },
                    }}
                >
                    <Iconify icon="mingcute:close-line" width={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, m: 1, mt: 4 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : user ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Header Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 2 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    border: (theme) => {
                                        if (user.user_image) return `1px solid ${alpha(theme.palette.common.black, 0.12)}`;
                                        const name = user.full_name || '';
                                        let hash = 0;
                                        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                        const textColors = ['#4F7942', '#2D5A27', '#3F51B5', '#BF360C', '#C62828', '#AD1457'];
                                        return `3px solid ${alpha(textColors[Math.abs(hash) % textColors.length], 0.2)}`;
                                    },
                                    boxShadow: (theme) => `0 8px 24px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.4)'}`,
                                    flexShrink: 0,
                                    position: 'relative',
                                    bgcolor: (theme) => {
                                        if (user.user_image) return 'transparent';
                                        const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                        let hash = 0;
                                        const name = user.full_name || '';
                                        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                        return colors[Math.abs(hash) % colors.length];
                                    }
                                }}
                            >
                                {user.user_image ? (
                                    <Box component="img" src={user.user_image} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
                                ) : (
                                    <Typography variant="h4" sx={{
                                        fontWeight: 800,
                                        color: (theme) => {
                                            const name = user.full_name || '';
                                            let hash = 0;
                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                            const textColors = ['#4F7942', '#2D5A27', '#3F51B5', '#BF360C', '#C62828', '#AD1457'];
                                            return textColors[Math.abs(hash) % textColors.length];
                                        }
                                    }}>
                                        {(user.full_name || '?').charAt(0).toUpperCase()}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{user.full_name}</Typography>
                                    {/* {onEdit && (
                                        <IconButton size="small" onClick={onEdit} sx={{ color: 'primary.main' }}>
                                            <Iconify icon="solar:pen-bold" width={18} />
                                        </IconButton>
                                    )} */}
                                </Box>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '13px' }}>{user.email}</Typography>
                            </Box>

                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                {renderStatus(user.enabled === 1)}
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Account Information */}
                        <Box sx={{ px: 2 }}>
                            <SectionHeader title="Account Information"  />
                            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                <DetailItem
                                    label="Username"
                                    value={user.username || user.email?.split('@')[0]}
                                    icon="solar:user-id-bold"
                                />
                                <DetailItem
                                    label="Last Login"
                                    value={user.last_login ? dayjs(user.last_login).format('DD-MM-YYYY hh:mm A') : 'Never'}
                                    icon="solar:clock-circle-bold"
                                />
                                <DetailItem
                                    label="Created"
                                    value={user.creation ? dayjs(user.creation).format('DD-MM-YYYY hh:mm A') : '-'}
                                    icon="solar:calendar-bold"
                                />
                                <DetailItem
                                    label="Modified"
                                    value={user.modified ? dayjs(user.modified).format('DD-MM-YYYY hh:mm A') : '-'}
                                    icon="solar:calendar-mark-bold"
                                />
                            </Box>
                        </Box>

                        {/* Roles Section */}
                        {/* Roles & Custom Role Permissions Section */}
                        {((user.roles && user.roles.length > 0) || (user.custom_permissions && user.custom_permissions.length > 0)) && (
                            <>
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <Box sx={{ px: 2 }}>
                                    {user.roles && user.roles.length > 0 && (
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 2, fontSize: '15px' }}>
                                                ROLES:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                {user.roles.map((roleItem: any) => {
                                                    const roleName = typeof roleItem === 'string' ? roleItem : roleItem.role;
                                                    return (
                                                        <Label
                                                            key={roleName}
                                                            variant="filled"
                                                            color="primary"
                                                            sx={{
                                                                height: 30,
                                                                px: 2,
                                                                borderRadius: 10,
                                                                fontSize: '14px',
                                                                fontWeight: 600,
                                                                boxShadow: (theme) => `0 4px 12px ${theme.palette.primary.main}40`,
                                                            }}
                                                        >
                                                            {roleName}
                                                        </Label>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    )}

                                    {user.custom_permissions && user.custom_permissions.length > 0 && (
                                        <Box sx={{ mt: 3 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 2, fontSize: '15px' }}>
                                                ROLE PERMISSIONS:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                {user.custom_permissions.map((permItem: any) => (
                                                    <Label
                                                        key={permItem.name || permItem.permission_manager}
                                                        variant="filled"
                                                        color="info"
                                                        sx={{
                                                            height: 30,
                                                            px: 2,
                                                            borderRadius: 10,
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            boxShadow: (theme) => `0 4px 12px ${theme.palette.info.main}40`,
                                                        }}
                                                    >
                                                        {permItem.permission_name}
                                                    </Label>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </>
                        )}

                        {/* Assigned User Permissions Section */}
                        {((user.roles && user.roles.length > 0) || userPermissions.length > 0) && (
                            <>
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <Box sx={{ px: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1.5, fontSize: '13px', textTransform: 'uppercase' }}>
                                            ASSIGNED PERMISSIONS:
                                        </Typography>
                                        {loadingPermissions ? (
                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Loading permissions...</Typography>
                                        ) : userPermissions.length > 0 ? (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {userPermissions.map((perm: any) => (
                                                    <Label key={perm.name} variant="soft" color="info" sx={{ fontWeight: 600, fontSize: '13px', py: 2 }}>
                                                        {perm.allow}: {perm.for_value}
                                                    </Label>
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                                No permissions assigned
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </>
                        )}

                        {/* Allowed Modules */}
                        {/* {user.block_modules && user.block_modules.length > 0 && (
                            <>
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <Box sx={{ px: 2 }}>
                                    <SectionHeader title="Blocked Modules" icon="solar:widget-5-bold" />
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {user.block_modules.map((moduleItem: any) => {
                                            const moduleName = typeof moduleItem === 'string' ? moduleItem : moduleItem.module;
                                            return (
                                                <Label key={moduleName} variant="soft" color="error" sx={{ fontWeight: 700 }}>
                                                    {moduleName}
                                                </Label>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </>
                        )} */}

                        {/* Bio Section */}
                        {user.bio && (
                            <>
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <Box sx={{ px: 2 }}>
                                    <SectionHeader title="Bio" />
                                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                        {user.bio}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No User Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function SectionHeader({ title, noMargin = false }: { title: string; noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '13px' }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon, color = 'text.primary', labelColor = 'text.secondary' }: { label: string; value?: string | null; icon: string; color?: string; labelColor?: string }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: labelColor, fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block', fontSize: '11px' }}>
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
