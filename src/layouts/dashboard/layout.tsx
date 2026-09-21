import type { Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { useSocket } from 'src/hooks/use-socket';
import { useSettingsContext } from 'src/hooks/settings-context';
import { useDashboardView } from 'src/hooks/dashboard-view-context';
import { useUnreadCountsContext } from 'src/hooks/unread-counts-context';

import { CONFIG } from 'src/config-global';

import { Label } from 'src/components/label';

import { CallProvider } from 'src/sections/chat/call-context';
import ChatNotifications from 'src/sections/chat/chat-notifications';
import { UserStatusBar } from 'src/sections/overview/user-status-bar';
import { DashboardSwitcher } from 'src/sections/overview/dashboard-switcher';

import { useAuth } from 'src/auth/auth-context';

import { NavMobile, NavDesktop } from './nav';
import { layoutClasses } from '../core/classes';
import { _account } from '../nav-config-account';
import { dashboardLayoutVars } from './css-vars';
import { MainSection } from '../core/main-section';
import { getNavData } from '../nav-config-dashboard';
import { MenuButton } from '../components/menu-button';
import { HeaderSection } from '../core/header-section';
import { LayoutSection } from '../core/layout-section';
import { AccountPopover } from '../components/account-popover';
import { DashboardBreadcrumbBar } from './dashboard-breadcrumb-bar';

import type { MainSectionProps } from '../core/main-section';
import type { HeaderSectionProps } from '../core/header-section';
import type { LayoutSectionProps } from '../core/layout-section';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();
  const { settings } = useSettingsContext();
  const { user } = useAuth();

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const { socket } = useSocket(user?.email);

  const { unreadCounts } = useUnreadCountsContext();

  const { view } = useDashboardView();

  const [isNavCollapsed, setIsNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dashboard_nav_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = useCallback(() => {
    setIsNavCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dashboard_nav_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const { navData } = useMemo(() => {
    const result = getNavData(user, view, settings);
    const userRole: "hr" | "admin" | "" = user?.roles?.some(r => ['hr'].includes(r.toLowerCase()))
      ? 'hr'
      : (user?.roles?.some(r => ['admin', 'system manager', 'administrator'].includes(r.toLowerCase())) ? 'admin' : '');
    const isHR = userRole === "hr" || userRole === "admin";

    // Inject unread counts into navData
    result.navData.forEach((item: any) => {
      item.info = undefined;
      // Check main items
      if (
        (item.title === 'Leave Application') &&
        unreadCounts.counts['Leave Application'] > 0
      ) {
        item.info = (
          <Label
            color="error"
            variant="filled"
            sx={{
              height: 20,
              minWidth: 20,
              fontSize: '0.75rem',
              px: 0.5,
              borderRadius: 0.75,
              fontWeight: 'bold',
            }}
          >
            {unreadCounts.counts['Leave Application']}
          </Label>
        );
      }
      if ((item.title === 'Request List') && unreadCounts.counts.Request > 0) {
        item.info = (
          <Label
            color="error"
            variant="filled"
            sx={{
              height: 20,
              minWidth: 20,
              fontSize: '0.75rem',
              px: 0.5,
              borderRadius: 0.75,
              fontWeight: 'bold',
            }}
          >
            {unreadCounts.counts.Request}
          </Label>
        );
      }
      if (
        (item.title === 'WFH Attendance') &&
        unreadCounts.counts['WFH Attendance'] > 0
      ) {
        item.info = (
          <Label
            color="error"
            variant="filled"
            sx={{
              height: 20,
              minWidth: 20,
              fontSize: '0.75rem',
              px: 0.5,
              borderRadius: 0.75,
              fontWeight: 'bold',
            }}
          >
            {unreadCounts.counts['WFH Attendance']}
          </Label>
        );
      }
      if (isHR && (item.title === 'Asset Requests' || item.title === 'My Asset Requests') && unreadCounts.counts['Asset Request'] > 0) {
        item.info = (
          <Label
            color="error"
            variant="filled"
            sx={{
              height: 20,
              minWidth: 20,
              fontSize: '0.75rem',
              px: 0.5,
              borderRadius: 0.75,
              fontWeight: 'bold',
            }}
          >
            {unreadCounts.counts['Asset Request']}
          </Label>
        );
      }

      // Aggregation for Parent Items
      if (item.children) {
        let groupCount = 0;
        item.children.forEach((child: any) => {
          child.info = undefined;
          if (child.title === 'Leave Application' && unreadCounts.counts['Leave Application'] > 0) {
            child.info = (
              <Label
                color="error"
                variant="filled"
                sx={{
                  height: 18,
                  minWidth: 18,
                  fontSize: '0.7rem',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 'bold',
                }}
              >
                {unreadCounts.counts['Leave Application']}
              </Label>
            );
            groupCount += unreadCounts.counts['Leave Application'];
          }
          if (child.title === 'WFH Attendance' && unreadCounts.counts['WFH Attendance'] > 0) {
            child.info = (
              <Label
                color="error"
                variant="filled"
                sx={{
                  height: 18,
                  minWidth: 18,
                  fontSize: '0.7rem',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 'bold',
                }}
              >
                {unreadCounts.counts['WFH Attendance']}
              </Label>
            );
            groupCount += unreadCounts.counts['WFH Attendance'];
          }
          if (child.title === 'Request List' && unreadCounts.counts.Request > 0) {
            child.info = (
              <Label
                color="error"
                variant="filled"
                sx={{
                  height: 18,
                  minWidth: 18,
                  fontSize: '0.7rem',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 'bold',
                }}
              >
                {unreadCounts.counts.Request}
              </Label>
            );
            groupCount += unreadCounts.counts.Request;
          }
          if (child.title === 'Reimbursement Claim List' && unreadCounts.counts['Reimbursement Claim'] > 0) {
            child.info = (
              <Label
                color="error"
                variant="filled"
                sx={{
                  height: 18,
                  minWidth: 18,
                  fontSize: '0.7rem',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 'bold',
                }}
              >
                {unreadCounts.counts['Reimbursement Claim']}
              </Label>
            );
            groupCount += unreadCounts.counts['Reimbursement Claim'];
          }
          if (isHR && (child.title === 'Asset Requests' || child.title === 'My Asset Requests') && unreadCounts.counts['Asset Request'] > 0) {
            child.info = (
              <Label
                color="error"
                variant="filled"
                sx={{
                  height: 18,
                  minWidth: 18,
                  fontSize: '0.7rem',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 'bold',
                }}
              >
                {unreadCounts.counts['Asset Request']}
              </Label>
            );
            groupCount += unreadCounts.counts['Asset Request'];
          }
        });


        // If any children had unread counts, show the total on the parent item
        if (groupCount > 0) {
          item.info = (
            <Label
              color="error"
              variant="filled"
              sx={{
                height: 20,
                minWidth: 20,
                fontSize: '0.75rem',
                px: 0.5,
                borderRadius: 0.75,
                fontWeight: 'bold',
              }}
            >
              {groupCount}
            </Label>
          );
        }
      }
    });

    return result;
  }, [user?.roles, view, unreadCounts, settings]);


  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flexGrow: 1 }}>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 0.5, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile key={view} data={navData} open={open} onClose={onClose} />

          {/* Top Bar Breadcrumbs */}
          <DashboardBreadcrumbBar navData={navData} />

          <Box sx={{ ml: 1, display: { xs: 'none', md: 'inline-flex' } }}>
            <DashboardSwitcher />
          </Box>
        </Box>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 2 } }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            <UserStatusBar />
          </Box>

          <ChatNotifications>
            <Box
              component={RouterLink as any}
              href="/chat"
              sx={{
                lineHeight: 0,
                display: 'inline-flex',
                mr: { xs: 1, sm: 3 },
                transition: theme.transitions.create(['all'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  transform: 'translateY(-1px)',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)',
                },
              }}
            >
              <Box
                component="img"
                src={`${CONFIG.assetsDir}/icons/Innochat_button.png`}
                sx={{
                  width: { xs: 110, sm: 140 },
                  height: 'auto',
                  display: 'block',
                }}
              />
            </Box>
          </ChatNotifications>


          {/** @slot Account drawer */}
          <AccountPopover
            data={(_account || []).filter((item) => {
              if (item.label === 'Settings') {
                return (user?.roles || []).some((role: string) =>
                  ['HR', 'Administrator', 'System Manager'].includes(role)
                );
              }
              return true;
            })}
          />
        </Box>
      ),
    };

    return (
      <HeaderSection
        disableElevation
        disableOffset
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderTopLeftRadius: { xs: 0, [layoutQuery]: 24 },
          borderTop: { xs: 'none', [layoutQuery]: '1px solid rgba(0, 0, 0, 0.08)' },
          borderLeft: { xs: 'none', [layoutQuery]: '1px solid rgba(0, 0, 0, 0.08)' },
          top: 'var(--layout-top-accent-height, 36px)',
          ...slotProps?.header?.sx,
        }}
      />
    );
  };

  const renderFooter = () => null;

  const renderMain = () => (
    <Box
      sx={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#ffffff',
        borderLeft: { xs: 'none', [layoutQuery]: '1px solid rgba(0, 0, 0, 0.08)' },
        minHeight: '100%',
      }}
    >
      <MainSection {...slotProps?.main}>{children}</MainSection>
    </Box>
  );

  return (
    <CallProvider>
      <Fade in timeout={700} key={view}>
        <Box
          sx={{
            height: 1,
            animation: 'fadeIn 0.6s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 },
            },
          }}
        >
          {/* Top 1-inch Accent Bar */}
          <Box
            sx={{
              height: 'var(--layout-top-accent-height, 36px)',
              bgcolor: '#f5f7fb',
              width: 1,
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: (t) => t.zIndex.appBar + 20,
            }}
          />

          {/* Corner Mask: Keeps the nook outside the curve #f5f7fb with zero extra border */}
          <Box
            component="svg"
            viewBox="0 0 24 24"
            sx={{
              display: { xs: 'none', [layoutQuery]: 'block' },
              position: 'fixed',
              top: 'var(--layout-top-accent-height, 36px)',
              left: 'var(--layout-nav-vertical-width)',
              width: 24,
              height: 24,
              zIndex: (t) => t.zIndex.appBar + 5,
              pointerEvents: 'none',
              transition: (t) =>
                t.transitions.create(['left'], {
                  easing: 'var(--layout-transition-easing)',
                  duration: 'var(--layout-transition-duration)',
                }),
            }}
          >
            <path d="M0 0 H24 A24 24 0 0 0 0 24 Z" fill="#f5f7fb" />
          </Box>

          <LayoutSection
            headerSection={renderHeader()}
            sidebarSection={
              <NavDesktop
                key={view}
                data={navData}
                layoutQuery={layoutQuery}
                isCollapsed={isNavCollapsed}
                onToggleCollapse={handleToggleCollapse}
              />
            }
            footerSection={renderFooter()}
            cssVars={{ ...dashboardLayoutVars(theme, isNavCollapsed), ...cssVars }}
            sx={[
              {
                bgcolor: '#f5f7fb',
                minHeight: '100vh',
                pt: 'var(--layout-top-accent-height, 36px)',
                [`& .${layoutClasses.sidebarContainer}`]: {
                  [theme.breakpoints.up(layoutQuery)]: {
                    pl: 'var(--layout-nav-vertical-width)',
                    transition: theme.transitions.create(['padding-left'], {
                      easing: 'var(--layout-transition-easing)',
                      duration: 'var(--layout-transition-duration)',
                    }),
                  },
                },
              },
              ...(Array.isArray(sx) ? sx : [sx]),
            ]}
          >
            {renderMain()}
          </LayoutSection>
        </Box>
      </Fade>
    </CallProvider>
  );
}
