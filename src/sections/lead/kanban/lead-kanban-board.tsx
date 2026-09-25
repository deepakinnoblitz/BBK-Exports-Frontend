import { useRef, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import LeadKanbanColumn from './lead-kanban-column';

type Props = {
  columnsData?: Record<string, {
    leads: any[];
    hasMore: boolean;
    loading: boolean;
    loadMore: VoidFunction;
    total?: number;
  }>;
  leads: any[];
  workflowStates: string[];
  onOpenLead: (leadId: string) => void;
  onEditLead: (leadId: string) => void;
  onDeleteLead: (leadId: string) => void;
  onAddLead: (workflowState: string) => void;
  permissions?: {
    write: boolean;
    delete: boolean;
  };
  hasMore?: boolean;
  onLoadMore?: VoidFunction;
  loadingMore?: boolean;
};

const COLUMN_COLORS = [
  '#4F46E5', // Indigo
  '#F59E0B', // Orange
  '#10B981', // Green
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#3B82F6', // Blue
];

export default function LeadKanbanBoard({
  columnsData,
  leads,
  workflowStates,
  onOpenLead,
  onEditLead,
  onDeleteLead,
  onAddLead,
  permissions,
  hasMore,
  onLoadMore,
  loadingMore,
}: Props) {
  const columns = useMemo(() => {
    const states =
      workflowStates?.length > 0
        ? workflowStates
        : ['New Lead', 'Contacted', 'Qualified'];

    return states.map((state, index) => {
      const stateLeads = leads.filter((lead) => {
        if (state === states[0] && !lead.workflow_state) {
          return true;
        }

        return lead.workflow_state === state;
      });

      return {
        id: state,
        name: state,
        color: COLUMN_COLORS[index % COLUMN_COLORS.length],
        leadIds: stateLeads.map((lead) => lead.name),
        total: columnsData?.[state]?.total,
      };
    });
  }, [leads, workflowStates, columnsData]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;

    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;

    e.preventDefault();

    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;

    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(118vh - 170px)', // Adjust based on your page header
        mb: -5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        sx={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          cursor: isDown ? 'grabbing' : 'grab',
          userSelect: 'none',


          '&::-webkit-scrollbar': {
            height: 8,
          },

          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(145,158,171,0.30)',
            borderRadius: 999,
          },

          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(145,158,171,0.50)',
          },
        }}
      >
        <Stack
          direction="row"
          spacing={3}
          alignItems="flex-start"
          sx={{
            width: 'max-content',
            minWidth: '100%',
            height: '100%',
            p: 1,
          }}
        >
          {columns.map((column) => {
            const colData = columnsData?.[column.id];
            const hasMoreServer = colData ? colData.hasMore : hasMore;
            const onLoadMoreServer = colData ? colData.loadMore : onLoadMore;
            const loadingMoreServer = colData ? colData.loading : loadingMore;

            return (
              <LeadKanbanColumn
                key={column.id}
                column={column}
                leads={leads}
                onOpenLead={onOpenLead}
                onEditLead={onEditLead}
                onDeleteLead={onDeleteLead}
                onAddLead={onAddLead}
                permissions={permissions}
                hasMoreServer={hasMoreServer}
                onLoadMoreServer={onLoadMoreServer}
                loadingMoreServer={loadingMoreServer}
              />
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}