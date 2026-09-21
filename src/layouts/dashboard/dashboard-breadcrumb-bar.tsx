import { useLocation } from 'react-router';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';

import { RouterLink } from 'src/routes/components';
import { useRouter , usePathname } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

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

type ActiveHierarchy = {
  parentItem: NavItem | null;
  childItem: any | null;
  siblingPages: any[];
  allParentGroups: NavItem[];
};

export function DashboardBreadcrumbBar({
  navData,
  rightArea,
  sx,
}: {
  navData: NavItem[];
  rightArea?: React.ReactNode;
  sx?: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { search } = useLocation();
  const fullPath = pathname + search;

  const [groupAnchorEl, setGroupAnchorEl] = useState<null | HTMLElement>(null);
  const [pageAnchorEl, setPageAnchorEl] = useState<null | HTMLElement>(null);

  const hierarchy = useMemo<ActiveHierarchy>(() => {
    let parentItem: NavItem | null = null;
    let childItem: any | null = null;
    let siblingPages: any[] = [];

    for (const parent of navData) {
      if (parent.children && parent.children.length > 0) {
        for (const child of parent.children) {
          if (child.children && child.children.length > 0) {
            for (const subChild of child.children) {
              if (isRouteActive(subChild.path, fullPath)) {
                parentItem = parent;
                childItem = subChild;
                siblingPages = child.children;
                break;
              }
            }
          } else if (isRouteActive(child.path, fullPath)) {
            parentItem = parent;
            childItem = child;
            siblingPages = parent.children;
            break;
          }
          if (childItem) break;
        }
      } else if (isRouteActive(parent.path, fullPath)) {
        parentItem = parent;
        childItem = null;
        break;
      }
      if (parentItem) break;
    }

    return {
      parentItem,
      childItem,
      siblingPages,
      allParentGroups: navData.filter((p) => p.children && p.children.length > 0),
    };
  }, [navData, fullPath]);

  const handleOpenGroupMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setGroupAnchorEl(event.currentTarget);
  }, []);

  const handleCloseGroupMenu = useCallback(() => {
    setGroupAnchorEl(null);
  }, []);

  const handleOpenPageMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPageAnchorEl(event.currentTarget);
  }, []);

  const handleClosePageMenu = useCallback(() => {
    setPageAnchorEl(null);
  }, []);

  const handleSelectPage = useCallback(
    (path: string) => {
      handleClosePageMenu();
      if (path) router.push(path);
    },
    [router, handleClosePageMenu]
  );

  const handleSelectGroupFirstPage = useCallback(
    (group: NavItem) => {
      handleCloseGroupMenu();
      const firstChild = group.children?.[0];
      const targetPath = firstChild?.children?.[0]?.path || firstChild?.path || group.path;
      if (targetPath) router.push(targetPath);
    },
    [router, handleCloseGroupMenu]
  );

  return (
    <Box
      sx={[
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Breadcrumb Path */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          minWidth: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Root: Dashboard */}
        <Link
          component={RouterLink}
          href="/"
          underline="hover"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            typography: 'body2',
            fontWeight: 500,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          Dashboard
        </Link>

        {/* Separator / */}
        {(hierarchy.parentItem || hierarchy.childItem) && (
          <Typography variant="body2" sx={{ color: 'text.disabled', userSelect: 'none', px: 0.25 }}>
            /
          </Typography>
        )}

        {/* Parent Group (e.g. Social Media, HR Operations) */}
        {hierarchy.parentItem && (
          <>
            <Box
              component="button"
              type="button"
              onClick={handleOpenGroupMenu}
              sx={{
                p: 0,
                m: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                typography: 'body2',
                fontWeight: hierarchy.childItem ? 500 : 600,
                color: hierarchy.childItem ? 'text.secondary' : 'text.primary',
                borderRadius: 0.75,
                px: 0.75,
                py: 0.25,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              <span>{hierarchy.parentItem.title}</span>
              <Iconify
                icon="eva:arrow-ios-downward-fill"
                width={14}
                sx={{
                  color: 'text.disabled',
                  transition: 'transform 0.2s',
                  ...(groupAnchorEl && { transform: 'rotate(180deg)' }),
                }}
              />
            </Box>

            {/* Group Switcher Menu */}
            <Menu
              anchorEl={groupAnchorEl}
              open={Boolean(groupAnchorEl)}
              onClose={handleCloseGroupMenu}
              slotProps={{
                paper: {
                  sx: {
                    minWidth: 200,
                    mt: 1,
                    boxShadow: (t) => t.customShadows?.dropdown || 4,
                  },
                },
              }}
            >
              {hierarchy.allParentGroups.map((group) => {
                const isSelected = group.title === hierarchy.parentItem?.title;
                return (
                  <MenuItem
                    key={group.title}
                    selected={isSelected}
                    onClick={() => handleSelectGroupFirstPage(group)}
                    sx={{ typography: 'body2', gap: 1.5 }}
                  >
                    {group.icon && (
                      <ListItemIcon sx={{ minWidth: 24, color: 'inherit' }}>
                        {group.icon}
                      </ListItemIcon>
                    )}
                    <ListItemText primary={group.title} />
                  </MenuItem>
                );
              })}
            </Menu>
          </>
        )}

        {/* Separator / */}
        {hierarchy.childItem && (
          <Typography variant="body2" sx={{ color: 'text.disabled', userSelect: 'none', px: 0.25 }}>
            /
          </Typography>
        )}

        {/* Current Leaf Page (e.g. ⓕ Facebook, Shift Roster) */}
        {hierarchy.childItem && (
          <>
            <Box
              component="button"
              type="button"
              onClick={hierarchy.siblingPages.length > 1 ? handleOpenPageMenu : undefined}
              sx={{
                p: 0,
                m: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: hierarchy.siblingPages.length > 1 ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                typography: 'body2',
                fontWeight: 600,
                color: 'text.primary',
                borderRadius: 0.75,
                px: 0.75,
                py: 0.25,
                transition: 'all 0.15s ease',
                ...(hierarchy.siblingPages.length > 1 && {
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }),
              }}
            >
              {hierarchy.childItem.icon && (
                <Box
                  component="span"
                  sx={{
                    width: 18,
                    height: 18,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                  }}
                >
                  {hierarchy.childItem.icon}
                </Box>
              )}
              <span>{hierarchy.childItem.title}</span>
              {hierarchy.siblingPages.length > 1 && (
                <Iconify
                  icon="eva:arrow-ios-downward-fill"
                  width={14}
                  sx={{
                    color: 'text.disabled',
                    transition: 'transform 0.2s',
                    ...(pageAnchorEl && { transform: 'rotate(180deg)' }),
                  }}
                />
              )}
            </Box>

            {/* Sibling Page Switcher Menu */}
            {hierarchy.siblingPages.length > 1 && (
              <Menu
                anchorEl={pageAnchorEl}
                open={Boolean(pageAnchorEl)}
                onClose={handleClosePageMenu}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 220,
                      mt: 1,
                      boxShadow: (t) => t.customShadows?.dropdown || 4,
                    },
                  },
                }}
              >
                {hierarchy.siblingPages.map((sibling) => {
                  const isSelected = sibling.title === hierarchy.childItem?.title;
                  return (
                    <MenuItem
                      key={sibling.title}
                      selected={isSelected}
                      onClick={() => handleSelectPage(sibling.path)}
                      sx={{ typography: 'body2', gap: 1.5 }}
                    >
                      {sibling.icon && (
                        <ListItemIcon sx={{ minWidth: 24, color: 'inherit' }}>
                          {sibling.icon}
                        </ListItemIcon>
                      )}
                      <ListItemText primary={sibling.title} />
                    </MenuItem>
                  );
                })}
              </Menu>
            )}
          </>
        )}
      </Stack>

      {/* Right Area (if provided) */}
      {rightArea && <Box sx={{ flexShrink: 0, ml: 2 }}>{rightArea}</Box>}
    </Box>
  );
}
