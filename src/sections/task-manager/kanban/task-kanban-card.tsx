import type { TaskManager } from 'src/api/task-manager';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AvatarGroup from '@mui/material/AvatarGroup';

import { fDate } from 'src/utils/format-time';
import { getInitials } from 'src/utils/string';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

interface Props {
    task: TaskManager;
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onViewDetails: (task: TaskManager) => void;
    onEditTask: (task: TaskManager) => void;
    onDeleteTask: (task: TaskManager) => void;
    permissions: { read: boolean; write: boolean; create: boolean; delete: boolean };
}

export default function TaskKanbanCard({
    task,
    onUpdateStatus,
    onViewDetails,
    onEditTask,
    onDeleteTask,
    permissions
}: Props) {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditTask(task);
        handleCloseMenu();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteTask(task);
        handleCloseMenu();
    };

    const priorityColor =
        task.priority === 'High' ? 'error' :
            task.priority === 'Medium' ? 'warning' : 'info';

    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.task_manager || user?.permissions?.actions?.tasks;
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const displayEdit = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const displayDelete = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    return (
        <Card
            onClick={() => onViewDetails(task)}
            sx={{
                p: 2,
                cursor: 'pointer',
                boxShadow: 'none',
                border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
                transition: theme.transitions.create(['box-shadow', 'transform'], {
                    duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                    boxShadow: theme.customShadows?.z12,
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box
                        sx={{
                            py: 0.25,
                            pl: 0.75,
                            pr: 1,
                            gap: 0.75,
                            borderRadius: 0.75,
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: `${priorityColor}.main`,
                            bgcolor: varAlpha(theme.vars.palette[priorityColor].mainChannel, 0.08),
                            border: `1px solid ${varAlpha(theme.vars.palette[priorityColor].mainChannel, 0.16)}`,
                        }}
                    >
                        <Box
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: 'currentColor',
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                fontSize: 10,
                                letterSpacing: 0.5,
                                lineHeight: 1,
                            }}
                        >
                            {task.priority}
                        </Typography>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMenu(e);
                        }}
                        sx={{ color: 'text.disabled' }}
                    >
                        <Iconify icon="eva:more-vertical-fill" width={18} />
                    </IconButton>
                </Stack>

                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                    {task.title}
                </Typography>

                <Stack spacing={1}>
                    {task.project && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                fontSize: 11,
                                display: 'inline-flex',
                                alignItems: 'center',
                            }}
                        >
                            <Box component="span" sx={{ color: 'primary.main', fontWeight: 700, mr: 0.5 }}>Project:</Box>
                            {task.project}
                        </Typography>
                    )}

                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ pt: 0.5 }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.disabled',
                                fontWeight: 600
                            }}
                        >
                            {task.due_date ? fDate(task.due_date) : 'No due date'}
                        </Typography>

                        {task.status === 'Completed' ? (
                            <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'success.main' }} />
                        ) : (
                            <Box sx={{ flexGrow: 1 }} />
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 10 } }}>
                                {(task.assignees || []).map((a) => (
                                    <Avatar
                                        key={a.employee}
                                        alt={a.employee_name}
                                        src={a.profile_pic}
                                        sx={{
                                            bgcolor: stringToColor(a.employee_name || a.user || a.employee),
                                            color: stringToDarkColor(a.employee_name || a.user || a.employee),
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {getInitials(a.employee_name || a.user || a.employee)}
                                    </Avatar>
                                ))}
                            </AvatarGroup>
                        </Box>
                    </Stack>
                </Stack>
            </Stack>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                onClick={(e) => e.stopPropagation()}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { width: 160 }
                    }
                }}
            >
                {!displayEdit && !displayDelete &&(
                    <MenuItem
                        sx={{
                            gap: 1.5,
                            typography: 'body2',
                            fontWeight: 600,
                            color: 'text.disabled',
                            p:2,
                            justifyContent: 'center'
                        }}
                    >
                        No Permission
                    </MenuItem>
                )}
                {displayEdit && (
                    <MenuItem
                        onClick={handleEdit}
                        sx={{
                            gap: 1.5,
                            typography: 'body2',
                            fontWeight: 600,
                            color: 'primary.main',
                            '& svg': { color: 'inherit' }
                        }}
                    >
                        <Iconify icon="solar:pen-bold" width={18} />
                        Edit
                    </MenuItem>
                )}

                {displayDelete && (
                    <MenuItem
                        onClick={handleDelete}
                        sx={{
                            gap: 1.5,
                            typography: 'body2',
                            fontWeight: 600,
                            color: 'error.main',
                            '& svg': { color: 'inherit' }
                        }}
                    >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        Delete
                    </MenuItem>
                )}

                {!permissions.write && !permissions.delete && (
                    <MenuItem disabled sx={{ typography: 'caption', color: 'text.disabled', textAlign: 'center', py: 2 }}>
                        No Permissions
                    </MenuItem>
                )}
            </Menu>
        </Card>
    );
}
