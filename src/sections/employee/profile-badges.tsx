import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fetchEmployeeBadges } from 'src/api/badges';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
// ----------------------------------------------------------------------

type Props = {
  employeeId: string;
};

export function ProfileBadges({ employeeId }: Props) {
  const theme = useTheme();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEmployeeBadges(employeeId);
      setBadges(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      loadBadges();
    }
  }, [employeeId, loadBadges]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  const checkScrollable = useCallback(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      setCanScroll(scrollWidth > clientWidth);
    }
  }, []);

  useEffect(() => {
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [checkScrollable, badges]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return <Typography variant="body2">Loading badges...</Typography>;
  }

  if (!badges.length) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'background.neutral', borderRadius: 2 }}>
        <Iconify icon="solar:medal-star-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No badges awarded yet. Keep up the good work!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: 1, px: 2 }}>
      {canScroll && (
        <IconButton
          onClick={() => handleScroll('left')}
          sx={{
            position: 'absolute',
            left: -4,
            top: '40%',
            transform: 'translateY(-50%)',
            zIndex: 9,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.customShadows.z8,
            '&:hover': { bgcolor: 'background.neutral' },
          }}
        >
          <Iconify icon={"eva:arrow-ios-back-fill" as any} width={24} />
        </IconButton>
      )}

      <Scrollbar
        ref={scrollRef}
        fillContent={false}
        slotProps={{
          contentWrapperSx: { overflowX: 'auto', overflowY: 'hidden' },
          contentSx: {
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            px: 1,
            pb: 2,
            minWidth: 'max-content',
            width: 'max-content',
          },
        }}
        sx={{
          py: 1,
          mb: 1.5,
          '& .simplebar-track.simplebar-horizontal': {
            display: 'none !important',
          },
        }}
      >
        {badges.map((assignment) => (
          <BadgeItem key={assignment.name} assignment={assignment} />
        ))}
      </Scrollbar>

      {canScroll && (
        <IconButton
          onClick={() => handleScroll('right')}
          sx={{
            position: 'absolute',
            right: -4,
            top: '40%',
            transform: 'translateY(-50%)',
            zIndex: 9,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.customShadows.z8,
            '&:hover': { bgcolor: 'background.neutral' },
          }}
        >
          <Iconify icon={"eva:arrow-ios-forward-fill" as any} width={24} />
        </IconButton>
      )}
    </Box>
  );
}

function BadgeItem({ assignment }: { assignment: any }) {
  const theme = useTheme();

  return (
    <Tooltip
      title={
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2">{assignment.badge}</Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>{assignment.reason || 'Achievement'}</Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Awarded on: {assignment.awarded_on}
          </Typography>
        </Box>
      }
      arrow
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          p: 2,
          minWidth: 100,
          borderRadius: 2,
          position: 'relative',
          transition: theme.transitions.create(['transform', 'box-shadow']),
          '&:hover': {
            transform: 'translateY(-4px)',
            bgcolor: 'background.paper',
            boxShadow: theme.customShadows?.z16,
          },
        }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2.5,
            bgcolor: 'background.neutral',
            color: 'primary.main',
            mb: 1.5,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            transition: theme.transitions.create(['transform', 'box-shadow']),
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: theme.customShadows.z8,
            }
          }}
        >
          {assignment['badge.icon'] || assignment.badge_icon || assignment.icon ? (
            <Box
              component="img"
              src={assignment['badge.icon'] || assignment.badge_icon || assignment.icon}
              draggable={false}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                p: 1,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <Iconify icon="solar:medal-star-bold" width={32} />
          )}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          {assignment.badge}
        </Typography>
      </Box>
    </Tooltip>
  );
}
