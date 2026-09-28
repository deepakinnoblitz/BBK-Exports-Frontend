import type { TaskManager } from 'src/api/task-manager';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import TaskKanbanCard from './task-kanban-card';

// ----------------------------------------------------------------------

interface Props {
    status: string;
    tasks: TaskManager[];
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onViewDetails: (task: TaskManager) => void;
    onEditTask: (task: TaskManager) => void;
    onDeleteTask: (task: TaskManager) => void;
    permissions: { read: boolean; write: boolean; create: boolean; delete: boolean };
}

export default function TaskKanbanColumn({
    status,
    tasks,
    onUpdateStatus,
    onViewDetails,
    onEditTask,
    onDeleteTask,
    permissions
}: Props) {
    const theme = useTheme();

    const getStatusColor = () => {
        switch (status) {
            case 'Open':
                return '#0EA5E9'; // Sky Blue

            case 'In Progress':
                return '#F59E0B'; // Amber

            case 'On Hold':
                return '#F97316'; // Orange

            case 'Completed':
                return '#22C55E'; // Emerald Green

            case 'Reopened':
                return '#EF4444'; // Soft Red

            default:
                return theme.palette.text.primary;
        }
    };

    return (
        <Paper
            sx={{
                width: 320,
                height: 1,
                display: 'flex',
                boxShadow: 'none',
                flexDirection: 'column',
                backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
                borderRadius: 2,
                flexShrink: 0,
                border: `1px solid ${alpha(getStatusColor(), 0.24)}`,
            }}
        >
            <Box
                sx={{
                    p: 2,
                    pb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: getStatusColor(),
                    borderTopLeftRadius: 'inherit',
                    borderTopRightRadius: 'inherit',
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize', color: '#fff' }}>
                    {status}
                </Typography>

                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'background.paper', color: getStatusColor(), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                    {tasks.length}
                </Box>
            </Box>

            <Stack
                spacing={2}
                sx={{
                    p: 2,
                    flexGrow: 1,
                    overflowY: 'auto',
                    minHeight: 100,
                    '&::-webkit-scrollbar': {
                        width: 6,
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
                        borderRadius: 3,
                    },
                }}
            >
                {tasks.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                            flexGrow: 1,
                            height: 1,
                            py: 8,
                            borderRadius: 1.5,
                            border: (th) => `1px dashed ${varAlpha(th.vars.palette.grey['500Channel'], 0.16)}`,
                            bgcolor: (th) => varAlpha(th.vars.palette.grey['500Channel'], 0.02),
                        }}
                    >
                        <Stack spacing={1} alignItems="center">
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                No {status}
                            </Typography>
                        </Stack>
                    </Stack>
                ) : (
                    tasks.map((task) => (
                        <TaskKanbanCard
                            key={task.name}
                            task={task}
                            onUpdateStatus={onUpdateStatus}
                            onViewDetails={onViewDetails}
                            onEditTask={onEditTask}
                            onDeleteTask={onDeleteTask}
                            permissions={permissions}
                        />
                    ))
                )}
            </Stack>
        </Paper>
    );
}
