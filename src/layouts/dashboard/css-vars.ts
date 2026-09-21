import type { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function dashboardLayoutVars(theme: Theme, isNavCollapsed = false) {
  return {
    '--layout-transition-easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '--layout-transition-duration': '220ms',
    '--layout-top-accent-height': '16px',
    '--layout-nav-vertical-width': isNavCollapsed ? '84px' : '280px',
    '--layout-dashboard-content-pt': theme.spacing(1),
    '--layout-dashboard-content-pb': theme.spacing(8),
    '--layout-dashboard-content-px': theme.spacing(4),
  };
}
