import type { IconButtonProps } from '@mui/material/IconButton';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Portal from '@mui/material/Portal';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import Backdrop from '@mui/material/Backdrop';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { useRouter, usePathname } from 'src/routes/hooks';

import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { logout } from 'src/api/auth';

import { useAuth } from 'src/auth/auth-context';


// ----------------------------------------------------------------------

export type AccountPopoverProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountPopover({ data = [], sx, ...other }: AccountPopoverProps) {
  // ✅ Hooks MUST be here
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuth();

  const displayName = user?.full_name || 'User';
  const email = user?.email || '';
  const photoURL = user?.user_image || '';

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleOpenPopover = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpenPopover(event.currentTarget);
    },
    []
  );

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleClickItem = useCallback(
    (path: string) => {
      handleClosePopover();
      router.push(path);
    },
    [handleClosePopover, router]
  );

  const handleLogout = useCallback(async () => {
    handleClosePopover();
    setIsLoggingOut(true);

    try {
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              await subscription.unsubscribe();
            }
          }
        }
      } catch (swError) {
        console.error('Failed to unsubscribe from PushManager:', swError);
      }

      const fcmResponse = await logout();

      // Wait 3 seconds so the user can read the debug message before the page reloads
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }, [handleClosePopover, setUser]);

  const isPng = photoURL.toLowerCase().endsWith('.png');

  return (
    <>
      <IconButton
        onClick={handleOpenPopover}
        sx={{
          p: '2px',
          width: 44,
          height: 44,
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.darker} 0%, #00f2ff 50%, ${theme.palette.primary.darker} 100%)`,
          backgroundSize: '200% 200%',
          animation: 'shimmer 2.5s ease infinite',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
          transition: (theme) => theme.transitions.create('all'),
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: (theme) => `0 0 15px ${theme.palette.primary.main}40`,
          },
          ...sx,
        }}
        {...other}
      >
        <Avatar
          src={photoURL}
          alt={displayName}
          sx={{
            width: 1,
            height: 1,
            bgcolor: !photoURL ? stringToColor(displayName) : (isPng ? '#FFFFFF' : 'transparent'),
            color: stringToDarkColor(displayName),
            fontWeight: 700,
            fontSize: '16px',
            border: (theme) => `2px solid ${theme.palette.background.paper}`,
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 200 } } }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {email}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuList
          disablePadding
          sx={{
            p: 1,
            gap: 0.5,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              [`&.${menuItemClasses.selected}`]: {
                color: 'text.primary',
                bgcolor: 'action.selected',
                fontWeight: 'fontWeightSemiBold',
              },
            },
          }}
        >
          {data.map((option) => (
            <MenuItem
              key={option.label}
              selected={option.href === pathname}
              onClick={() => handleClickItem(option.href)}
            >
              {option.icon}
              {option.label}
            </MenuItem>
          ))}
        </MenuList>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            color="error"
            size="medium"
            variant="text"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Popover>

      <Portal>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1000 }}
          open={isLoggingOut}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Portal>
    </>
  );
}