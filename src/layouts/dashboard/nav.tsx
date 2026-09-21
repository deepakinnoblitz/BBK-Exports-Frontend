import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useLocation } from 'react-router';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import type { NavItem } from '../nav-config-dashboard';

// ----------------------------------------------------------------------

const isRouteActive = (itemPath: string, currentFullPath: string): boolean => {
  if (!itemPath) return false;

  const [itemPathname, itemSearch] = itemPath.split('?');
  const [currentPathname, currentSearch] = currentFullPath.split('?');

  if (itemPathname === '/') {
    return currentPathname === '/';
  }

  const isPathnameActive =
    currentPathname === itemPathname || currentPathname.startsWith(`${itemPathname}/`);

  if (!isPathnameActive) return false;

  if (itemSearch) {
    const itemParams = new URLSearchParams(itemSearch);
    const currentParams = new URLSearchParams(currentSearch);
    for (const [key, value] of itemParams.entries()) {
      if (currentParams.get(key) !== value) {
        return false;
      }
    }
  }

  return true;
};

const hasActiveChild = (item: any, currentFullPath: string): boolean => {
  if (isRouteActive(item.path, currentFullPath)) return true;
  if (item.children) {
    return item.children.some((child: any) => hasActiveChild(child, currentFullPath));
  }
  return false;
};

export type NavContentProps = {
  data: NavItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  sx?: SxProps<Theme>;
};

export function NavDesktop({
  sx,
  data,
  slots,
  layoutQuery,
  isCollapsed = false,
  onToggleCollapse,
}: Omit<NavContentProps, 'workspaces'> & {
  layoutQuery: Breakpoint;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        top: 'var(--layout-top-accent-height, 36px)',
        left: 0,
        height: 'calc(100vh - var(--layout-top-accent-height, 36px))',
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        bgcolor: '#f5f7fb',
        borderRight: 'none',
        transition: theme.transitions.create(['width'], {
          easing: 'var(--layout-transition-easing)',
          duration: 'var(--layout-transition-duration)',
        }),
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent
        data={data}
        slots={slots}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  open,
  slots,
  onClose,
}: Omit<NavContentProps, 'workspaces'> & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          top: 'var(--layout-top-accent-height, 36px)',
          height: 'calc(100vh - var(--layout-top-accent-height, 36px))',
          overflow: 'unset',
          width: 'var(--layout-nav-mobile-width)',
          bgcolor: '#f5f7fb',
          color: 'text.primary',
          ...sx,
        },
      }}
    >
      <NavContent data={data} slots={slots} isCollapsed={false} onCloseMobile={onClose} />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function NavContent({
  data,
  slots,
  sx,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
}: Omit<NavContentProps, 'workspaces'> & { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { search } = useLocation();

  const fullPath = pathname + search;

  return (
    <Box
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          height: 1,
          color: 'text.primary',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Top Header: Original Color Logo + Collapse Button */}
      <Box
        sx={{
          height: isCollapsed ? 108 : 116,
          px: isCollapsed ? 1 : 2,
          pt: 1,
          pb: 1,
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          mb: 2,
        }}
      >
        {!isCollapsed ? (
          <Box
            component={RouterLink}
            href="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              width: '100%',
              my: 0.5,
            }}
          >
            <Box
              component="img"
              src={`${CONFIG.assetsDir}/logo/Innoblitz%20Logo%20Full.png`}
              alt="Logo"
              sx={{
                height: 88,
                width: 'auto',
                maxWidth: 210,
                objectFit: 'contain',
                transition: 'all 0.2s ease',
                '&:hover': { opacity: 0.85, transform: 'scale(1.02)' },
              }}
            />
          </Box>
        ) : (
          <Box
            component={RouterLink}
            href="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              mb: 1,
            }}
          >
            <Box
              component="img"
              src={`${CONFIG.assetsDir}/logo/Innoblitz_logo.png`}
              alt="Logo"
              sx={{
                height: 50,
                width: 50,
                objectFit: 'contain',
              }}
            />
          </Box>
        )}

        {onToggleCollapse && !isCollapsed && (
          <Tooltip title="Collapse sidebar" placement="right" arrow>
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              sx={{
                position: 'absolute',
                right: 10,
                top: 12,
                width: 28,
                height: 28,
                borderRadius: 1,
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.08)',
                  color: 'text.primary',
                  borderColor: 'rgba(0, 0, 0, 0.16)',
                },
              }}
            >
              <Iconify
                icon="eva:arrow-ios-forward-fill"
                width={16}
                sx={{
                  transform: 'rotate(180deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </IconButton>
          </Tooltip>
        )}

        {onToggleCollapse && isCollapsed && (
          <Tooltip title="Expand sidebar" placement="right" arrow>
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.08)',
                  color: 'text.primary',
                  borderColor: 'rgba(0, 0, 0, 0.16)',
                },
              }}
            >
              <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
            </IconButton>
          </Tooltip>
        )}

        {onCloseMobile && (
          <IconButton
            onClick={onCloseMobile}
            size="small"
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              color: 'text.secondary',
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </IconButton>
        )}
      </Box>

      {slots?.topArea}

      <Scrollbar
        fillContent
        sx={{
          '& .simplebar-scrollbar:before': {
            bgcolor: 'rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <Box
          component="nav"
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            pb: 3,
            px: isCollapsed ? 1 : 1.75,
          }}
        >
          <List disablePadding sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
            {data.map((item) => (
              <NavListItem
                key={item.title}
                item={item}
                fullPath={fullPath}
                isCollapsed={isCollapsed}
              />
            ))}
          </List>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}
    </Box>
  );
}

// ----------------------------------------------------------------------

function NavListSubItem({ child, fullPath }: { child: any; fullPath: string }) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const isChildActived = hasActiveChild(child, fullPath);

  if (child.children) {
    return (
      <ListItem disableGutters disablePadding sx={{ display: 'block' }}>
        <ListItemButton
          onClick={handleToggle}
          sx={{
            pl: 1.5,
            pr: 1,
            py: 0.65,
            borderRadius: 1,
            typography: 'body2',
            fontSize: '0.85rem',
            color: isChildActived ? '#08a3cd' : 'text.secondary',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              color: 'text.primary',
            },
            ...(isChildActived && {
              fontWeight: 600,
            }),
          }}
        >
          {child.icon ? (
            <Box
              component="span"
              sx={{
                width: 18,
                height: 18,
                mr: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'inherit',
              }}
            >
              {child.icon}
            </Box>
          ) : (
            <Box
              component="span"
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: 'currentColor',
                mr: 1.5,
                opacity: isChildActived ? 1 : 0.4,
              }}
            />
          )}
          <Box component="span" sx={{ flexGrow: 1 }}>
            {child.title}
          </Box>
          <Iconify
            width={14}
            icon={open ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'}
            sx={{ ml: 1, flexShrink: 0, color: 'text.disabled' }}
          />
        </ListItemButton>

        <Collapse in={open} timeout="auto" unmountOnExit>
          <List
            disablePadding
            sx={{
              pl: 2.5,
              mt: 0.5,
              gap: 0.5,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {child.children.map((subChild: any) => {
              const isSubChildActived = isRouteActive(subChild.path, fullPath);
              return (
                <ListItemButton
                  key={subChild.title}
                  component={RouterLink}
                  href={subChild.path}
                  sx={{
                    pl: 1.5,
                    py: 0.55,
                    borderRadius: 1,
                    typography: 'body2',
                    fontSize: '0.825rem',
                    position: 'relative',
                    color: isSubChildActived ? '#08a3cd' : 'text.secondary',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      color: 'text.primary',
                    },
                    ...(isSubChildActived && {
                      fontWeight: 600,
                      bgcolor: 'rgba(8, 163, 205, 0.08)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '18%',
                        bottom: '18%',
                        width: 3,
                        borderRadius: '0 3px 3px 0',
                        bgcolor: '#08a3cd',
                      },
                    }),
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: 'currentColor',
                      mr: 1.5,
                      opacity: isSubChildActived ? 1 : 0.4,
                    }}
                  />
                  {subChild.title}
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>
      </ListItem>
    );
  }

  return (
    <ListItemButton
      component={RouterLink}
      href={child.path}
      sx={{
        pl: 1.5,
        pr: 1,
        py: 0.65,
        borderRadius: 1,
        typography: 'body2',
        fontSize: '0.875rem',
        position: 'relative',
        color: isChildActived ? '#08a3cd' : 'text.secondary',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: 'rgba(0, 0, 0, 0.04)',
          color: 'text.primary',
        },
        ...(isChildActived && {
          fontWeight: 600,
          bgcolor: 'rgba(8, 163, 205, 0.08)',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '18%',
            bottom: '18%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            bgcolor: '#08a3cd',
          },
        }),
      }}
    >
      {child.icon ? (
        <Box
          component="span"
          sx={{
            width: 18,
            height: 18,
            mr: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'inherit',
          }}
        >
          {child.icon}
        </Box>
      ) : (
        <Box
          component="span"
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: 'currentColor',
            mr: 1.5,
            opacity: isChildActived ? 1 : 0.4,
          }}
        />
      )}
      <Box component="span" sx={{ flexGrow: 1 }}>
        {child.title}
      </Box>
      {child.info && (
        <Box component="span" sx={{ ml: 1.5 }}>
          {child.info}
        </Box>
      )}
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function NavListItem({
  item,
  fullPath,
  isCollapsed,
}: {
  item: NavItem;
  fullPath: string;
  isCollapsed: boolean;
}) {
  const isActived = hasActiveChild(item, fullPath);
  const [open, setOpen] = useState(isActived);

  // Keep open in sync if route changes to active child
  useEffect(() => {
    if (isActived) {
      setOpen(true);
    }
  }, [isActived]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // In collapsed mode: render icon-only with tooltip
  if (isCollapsed) {
    const targetHref = item.children?.[0]?.path || item.path;
    return (
      <ListItem disableGutters disablePadding sx={{ display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={item.title} placement="right" arrow>
          <ListItemButton
            component={RouterLink}
            href={targetHref}
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 0,
              color: isActived ? '#08a3cd' : 'text.secondary',
              bgcolor: isActived ? '#ffffff' : 'transparent',
              boxShadow: isActived ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isActived ? '#ffffff' : 'rgba(0, 0, 0, 0.04)',
                color: isActived ? '#08a3cd' : 'text.primary',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </Box>
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  }

  const isExpandedGroup = Boolean(item.children) && open;

  const renderContent = (
    <ListItemButton
      disableGutters
      {...(item.children
        ? { onClick: handleToggle }
        : { component: RouterLink, href: item.path })}
      sx={{
        px: 1.5,
        py: 0.9,
        borderRadius: 1,
        typography: 'body2',
        fontSize: '0.925rem',
        fontWeight: isExpandedGroup || isActived ? 600 : 500,
        color: isExpandedGroup || isActived ? '#08a3cd' : '#4b5563',
        bgcolor: isExpandedGroup || isActived ? '#ffffff' : 'transparent',
        boxShadow: isExpandedGroup || isActived ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: isExpandedGroup || isActived ? '#ffffff' : 'rgba(0, 0, 0, 0.04)',
          color: isExpandedGroup || isActived ? '#08a3cd' : '#111827',
        },
        ...(!item.children &&
          isActived && {
          color: '#08a3cd',
          bgcolor: 'rgba(8, 163, 205, 0.08)',
          boxShadow: 'none',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            bgcolor: '#08a3cd',
          },
        }),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
        {item.icon && (
          <Box
            component="span"
            sx={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isExpandedGroup || isActived ? '#08a3cd' : '#6b7280',
              flexShrink: 0,
            }}
          >
            {item.icon}
          </Box>
        )}

        <Typography
          variant="body2"
          noWrap
          sx={{
            fontSize: '0.925rem',
            fontWeight: 'inherit',
            color: 'inherit',
          }}
        >
          {item.title}
        </Typography>
      </Stack>

      {item.info && (
        <Box component="span" sx={{ ml: 1, display: 'inline-flex' }}>
          {item.info}
        </Box>
      )}

      {item.children && (
        <Iconify
          width={16}
          icon={open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
          sx={{
            ml: 1,
            flexShrink: 0,
            color: isExpandedGroup ? '#08a3cd' : '#9ca3af',
            transition: 'color 0.15s ease',
          }}
        />
      )}
    </ListItemButton>
  );

  return (
    <ListItem disableGutters disablePadding sx={{ display: 'block' }}>
      {renderContent}

      {item.children && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List
            disablePadding
            sx={{
              pl: 1.5,
              mt: 0.5,
              mb: 0.5,
              gap: 0.25,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {item.children.map((child: any) => (
              <NavListSubItem key={child.title} child={child} fullPath={fullPath} />
            ))}
          </List>
        </Collapse>
      )}
    </ListItem>
  );
}
