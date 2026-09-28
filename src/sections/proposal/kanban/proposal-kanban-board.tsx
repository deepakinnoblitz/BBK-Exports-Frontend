import { useRef, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import ProposalKanbanColumn from './proposal-kanban-column';

type Props = {
  proposals: any[];
  status: { value: string; label: string }[];
  onOpenProposal: (proposalId: string) => void;
  onEditProposal: (proposalId: string) => void;
  onDeleteProposal: (proposalId: string) => void;
  permissions?: {
    write: boolean;
    delete: boolean;
  };
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

export default function ProposalKanbanBoard({
  proposals,
  status,
  onOpenProposal,
  onEditProposal,
  onDeleteProposal,
  permissions,
}: Props) {
  const columns = useMemo(
    () =>
      status.map((stageObj, index) => {
        const stageName = stageObj.value;

        const stageProposals = proposals.filter((proposal) => {
          if (stageName === status[0].value && !proposal.status) {
            return true;
          }

          return proposal.status === stageName;
        });

        return {
          id: stageName,
          name: stageObj.label,
          color: COLUMN_COLORS[index % COLUMN_COLORS.length],
          proposalIds: stageProposals.map((proposal) => proposal.name),
        };
      }),
    [proposals, status]
  );

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
        height: 'calc(120vh - 200px)',
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
          {columns.map((column) => (
            <ProposalKanbanColumn
              key={column.id}
              column={column}
              proposals={proposals}
              onOpenProposal={onOpenProposal}
              onEditProposal={onEditProposal}
              onDeleteProposal={onDeleteProposal}
              permissions={permissions}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
