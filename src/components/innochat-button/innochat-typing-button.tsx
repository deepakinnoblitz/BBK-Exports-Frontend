import type { Theme, SxProps } from '@mui/material/styles';

import { TbBrandHipchat } from 'react-icons/tb';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme, keyframes } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { useChatUnreadCount } from 'src/sections/chat/chat-notifications';

// ----------------------------------------------------------------------

// Soft diffused shadow aura ripple animation
const waveShadowAnimation = keyframes`
  0% {
    transform: scale(0.98);
    opacity: 1;
    background-color: rgb(16 185 129 / 12%);
    box-shadow: 0 0 0 0 rgb(16 185 129 / 12%);
  }
  50% {
    opacity: 0.85;
    background-color: rgb(16 185 129 / 10%);
    box-shadow: 0 0 16px 8px rgb(16 185 129 / 10%);
  }
  100% {
    transform: scale(1.14, 1.35);
    opacity: 0;
    background-color: rgb(16 185 129 / 0%);
    box-shadow: 0 0 24px 12px rgb(16 185 129 / 0%);
  }
`;

// Friendly nod & hop animation for the chat icon in normal state (faster, lively pace)
const chatIconIdleAnimation = keyframes`
  0%, 60%, 100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  68% {
    transform: translateY(-2.5px) rotate(-10deg) scale(1.1);
  }
  76% {
    transform: translateY(-3px) rotate(8deg) scale(1.1);
  }
  84% {
    transform: translateY(-1px) rotate(-4deg) scale(1.05);
  }
  92% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
`;

// ----------------------------------------------------------------------

export type InnochatTypingButtonProps = {
  /** Optional override for unread count (e.g. for testing) */
  unreadCountOverride?: number;
  /** Whether typing dots are always visible or only when unreadCount > 0 (defaults to false) */
  showDotsAlways?: boolean;
  /** Custom label (defaults to "InnoChat") */
  label?: string;
  /** Additional SX styles applied to the outer wrapper */
  sx?: SxProps<Theme>;
};

export function InnochatTypingButton({
  unreadCountOverride,
  label = 'InnoChat',
  sx,
}: InnochatTypingButtonProps) {
  const theme = useTheme();
  const liveUnreadCount = useChatUnreadCount();
  const unreadCount = unreadCountOverride !== undefined ? unreadCountOverride : liveUnreadCount;

  const hasUnread = unreadCount > 0;
  const displayBadgeText = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        mr: { xs: 1, sm: 2.5 },
        ...sx,
      }}
    >
      {/* 1. Expansion Wave Aura (Soft shadow glow, no sharp edges) */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Primary Soft Shadow Ripple */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            border: 'none',
            backgroundColor: 'rgb(16 185 129 / 12%)',
            boxShadow: '0 0 14px 6px rgb(16 185 129 / 12%)',
            animation: `${waveShadowAnimation} ${hasUnread ? '2s' : '2.6s'} cubic-bezier(0.25, 0, 0.35, 1) infinite`,
          }}
        />
        {/* Secondary Staggered Soft Shadow Ripple */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            border: 'none',
            backgroundColor: 'rgb(16 185 129 / 10%)',
            boxShadow: '0 0 14px 6px rgb(16 185 129 / 10%)',
            animation: `${waveShadowAnimation} ${hasUnread ? '2s' : '2.6s'} cubic-bezier(0.25, 0, 0.35, 1) infinite`,
            animationDelay: hasUnread ? '1s' : '1.3s',
          }}
        />
      </Box>

      {/* 2. Main Pill Button */}
      <Box
        component={RouterLink as any}
        href="/chat"
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.9,
          textDecoration: 'none',
          cursor: 'pointer',
          borderRadius: '999px',
          height: { xs: 28, sm: 34 },
          px: { xs: '15px', sm: '19px' },
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
          transition: theme.transitions.create(['background', 'transform', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': {
            background: 'linear-gradient(135deg, #047857 0%, #065F46 100%)',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.45)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.97)',
          },
        }}
      >
        {/* React Chat Icon */}
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#FFFFFF',
            lineHeight: 1,
            mr: 0.15,
            transformOrigin: 'bottom center',
            animation: `${chatIconIdleAnimation} 2.2s ease-in-out infinite`,
          }}
        >
          <TbBrandHipchat size={19} />
        </Box>

        {/* Label */}
        <Typography
          component="span"
          sx={{
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* 4. Floating Badge (Option 15: .cnt.fl) - Only visible when unread messages exist */}
      {hasUnread && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: -5,
            right: -4,
            display: 'inline-grid',
            placeItems: 'center',
            minWidth: 20,
            height: 20,
            px: '5px',
            borderRadius: '10px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            border: `2px solid ${theme.palette.background.paper}`,
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: 1,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {displayBadgeText}
        </Box>
      )}
    </Box>
  );
}

export default InnochatTypingButton;
