import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import LeadKanbanCard from './lead-kanban-card';

type Props = {
  column: {
    id: string;
    name: string;
    color: string;
    leadIds: string[];
    total?: number;
  };
  leads: any[];
  onOpenLead: (leadId: string) => void;
  onEditLead: (leadId: string) => void;
  onDeleteLead: (leadId: string) => void;
  onAddLead: (workflowState: string) => void;
  permissions?: {
    write: boolean;
    delete: boolean;
  };
  hasMoreServer?: boolean;
  onLoadMoreServer?: VoidFunction;
  loadingMoreServer?: boolean;
};

const SkeletonCard = () => (
  <Card
    sx={{
      minHeight: 200,
      p: 2,
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Skeleton variant="rectangular" width={60} height={18} sx={{ borderRadius: 0.5 }} />
        <Skeleton variant="circular" width={18} height={18} />
      </Box>
      <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="50%" height={20} />
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
      <Skeleton variant="circular" width={25} height={25} />
      <Skeleton variant="text" width={80} height={16} />
    </Box>
  </Card>
);

export default function LeadKanbanColumn({
  column,
  leads,
  onOpenLead,
  onEditLead,
  onDeleteLead,
  onAddLead,
  permissions,
  hasMoreServer,
  onLoadMoreServer,
  loadingMoreServer,
}: Props) {
  const columnLeads = column.leadIds
    .map((id) => leads.find((l) => l.name === id))
    .filter(Boolean);

  const [visibleCount, setVisibleCount] = useState(5);
  const [loadingNextBatch, setLoadingNextBatch] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMore = visibleCount < columnLeads.length || hasMoreServer;

  const leadIdsStr = column.leadIds.join(',');
  useEffect(() => {
    setVisibleCount(5);
  }, [leadIdsStr]);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const currentLoader = loaderRef.current;

    if (hasMore) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loadingNextBatch && !loadingMoreServer) {
            if (visibleCount < columnLeads.length) {
              setLoadingNextBatch(true);
              setTimeout(() => {
                setVisibleCount((prev) => Math.min(prev + 5, columnLeads.length));
                setLoadingNextBatch(false);
              }, 500);
            } else if (hasMoreServer && onLoadMoreServer) {
              onLoadMoreServer();
            }
          }
        },
        {
          root: containerRef.current,
          threshold: 0.1,
        }
      );

      if (currentLoader) {
        observer.observe(currentLoader);
      }
    }

    return () => {
      if (observer && currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, columnLeads.length, loadingNextBatch, hasMoreServer, onLoadMoreServer, loadingMoreServer, visibleCount]);

  return (
    <Box
      sx={{
        width: 300,
        minWidth: 300,
        height: 'calc(120vh - 240px)',
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
          py: 0.5,
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
            {column.total ?? columnLeads.length}
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

        {permissions?.write && (
          <IconButton
            size="small"
            onClick={() => onAddLead(column.id)}
            sx={{
              color: '#fff',
            }}
          >
            <Iconify icon="mingcute:add-line" width={20} />
          </IconButton>
        )}
      </Box>

      {/* Scroll Area */}
      <Stack
        ref={containerRef}
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
        {columnLeads.length === 0 ? (
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
              No Leads
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                opacity: 0.6,
                mt: 0.5,
              }}
            >
              No Leads in this stage
            </Typography>
          </Box>
        ) : (
          <>
            {columnLeads.slice(0, visibleCount).map((lead) => (
              <LeadKanbanCard
                key={lead.name}
                lead={lead}
                onClick={() => onOpenLead(lead.name)}
                onEdit={() => onEditLead(lead.name)}
                onDelete={() => onDeleteLead(lead.name)}
                permissions={permissions}
              />
            ))}

            {(loadingNextBatch || loadingMoreServer) && (
              <SkeletonCard />
            )}

            {hasMore && (
              <Box ref={loaderRef} sx={{ height: 10, visibility: 'hidden' }} />
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}