import type { TaskManager } from 'src/api/task-manager';

import { useRef } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import TaskKanbanColumn from './task-kanban-column';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['Open', 'In Progress', 'On Hold', 'Completed', 'Reopened'];

interface Props {
    tasks: TaskManager[];
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onViewDetails: (task: TaskManager) => void;
    onEditTask: (task: TaskManager) => void;
    onDeleteTask: (task: TaskManager) => void;
    loading: boolean;
    permissions: { read: boolean; write: boolean; create: boolean; delete: boolean };
}

export default function TaskKanbanBoard({ 
    tasks, 
    onUpdateStatus, 
    onViewDetails,
    onEditTask,
    onDeleteTask,
    loading,
    permissions
}: Props) {
    const theme = useTheme();
    const boardRef = useRef<HTMLDivElement>(null);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDown.current = true;
        startX.current = e.pageX - (boardRef.current?.offsetLeft || 0);
        scrollLeft.current = boardRef.current?.scrollLeft || 0;
    };

    const handleMouseLeave = () => {
        isDown.current = false;
    };

    const handleMouseUp = () => {
        isDown.current = false;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown.current) return;
        e.preventDefault();
        const x = e.pageX - (boardRef.current?.offsetLeft || 0);
        const walk = (x - startX.current) * 2; // scroll-fast
        if (boardRef.current) {
            boardRef.current.scrollLeft = scrollLeft.current - walk;
        }
    };

    if (loading) {
        return (
            <Stack direction="row" spacing={3} sx={{ height: 1, overflow: 'hidden' }}>
                {[...Array(4)].map((_, index) => (
                    <Box
                        key={index}
                        sx={{
                            width: 320,
                            height: 1,
                            borderRadius: 2,
                            backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                            flexShrink: 0,
                        }}
                    />
                ))}
            </Stack>
        );
    }

    return (
        <Box
            ref={boardRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            sx={{
                flexGrow: 1,
                display: 'flex',
                gap: 3,
                pb: 3,
                overflowX: 'auto',
                overflowY: 'hidden',
                minHeight: '600px',
                cursor: 'grab',
                userSelect: 'none',
                '&:active': { cursor: 'grabbing' },
                '&::-webkit-scrollbar': {
                    height: 8,
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
                    borderRadius: 4,
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                },
            }}
        >
            {STATUS_OPTIONS.map((status) => (
                <TaskKanbanColumn
                    key={status}
                    status={status}
                    tasks={tasks.filter((task) => task.status === status)}
                    onUpdateStatus={onUpdateStatus}
                    onViewDetails={onViewDetails}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    permissions={permissions}
                />
            ))}
        </Box>
    );
}
