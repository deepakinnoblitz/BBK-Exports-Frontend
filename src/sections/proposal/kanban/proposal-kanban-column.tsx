import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import ProposalKanbanCard from './proposal-kanban-card';

type Props = {
  column: {
    id: string;
    name: string;
    color: string;
    proposalIds: string[];
  };
  proposals: any[];
  onOpenProposal: (proposalId: string) => void;
  onEditProposal: (proposalId: string) => void;
  onDeleteProposal: (proposalId: string) => void;
  permissions?: {
    write: boolean;
    delete: boolean;
  };
};

export default function ProposalKanbanColumn({
  column,
  proposals,
  onOpenProposal,
  onEditProposal,
  onDeleteProposal,
  permissions,
}: Props) {
  const columnProposals = column.proposalIds
    .map((id) => proposals.find((p) => p.name === id))
    .filter(Boolean);

  return (
    <Box
      sx={{
        width: 300,
        minWidth: 300,
        height: 'calc(125vh - 270px)',
        flexShrink: 0,
        bgcolor: '#F8FAFC',
        borderRadius: 3,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'rgba(145,158,171,0.12)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: column.color,
          px: 2,
          py: 1,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 25,
              height: 25,
              borderRadius: '50%',
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: column.color,
              fontSize: 13,
            }}
          >
            {columnProposals.length}
          </Box>

          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {column.name}
          </Typography>
        </Box>
      </Box>

      {/* Scroll Area */}
      <Stack
        spacing={2}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pr: 0.5,

          '&::-webkit-scrollbar': {
            width: 0.5,
          },

          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(145,158,171,0.3)',
            borderRadius: 999,
          },

          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(145,158,171,0.5)',
          },
        }}
      >
        {columnProposals.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 180,
              borderRadius: 2,
              border: '1.5px dashed',
              borderColor: 'rgba(145, 158, 171, 0.18)',
              bgcolor: 'rgba(145, 158, 171, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Iconify
              icon="solar:document-text-bold-duotone"
              width={40}
              sx={{
                color: 'text.disabled',
                opacity: 0.4,
                mb: 1,
              }}
            />

            <Typography
              variant="subtitle2"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                opacity: 0.7,
              }}
            >
              No Proposals
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                opacity: 0.6,
                mt: 0.5,
              }}
            >
              No proposals in this stage
            </Typography>
          </Box>
        ) : (
          columnProposals.map((p) => (
            <ProposalKanbanCard
              key={p.name}
              proposal={p}
              onClick={() => onOpenProposal(p.name)}
              onEdit={() => onEditProposal(p.name)}
              onDelete={() => onDeleteProposal(p.name)}
              permissions={permissions}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}
