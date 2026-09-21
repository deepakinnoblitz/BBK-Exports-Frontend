// ----------------------------------------------------------------------
// Common Brand & UI Colors (BBK Exports Theme)
// ----------------------------------------------------------------------

export const COMMON_COLORS = {
  emerald: {
    lighter: '#D1FAE5',
    light: '#A7F3D0',
    main: '#059669',
    dark: '#047857',
    darker: '#064E3B',
    contrastText: '#FFFFFF',
  },
  activeNav: {
    bg: '#D1FAE5',
    text: '#059669',
    icon: '#059669',
    bar: '#059669',
  },
  primaryButton: {
    bg: '#059669',
    hoverBg: '#047857',
    color: '#ffffff',
  },
  actionButton: {
    bg: '#059669',
    hoverBg: '#047857',
    color: '#ffffff',
  },
  filterButton: {
    bg: '#D1FAE5',
    hoverBg: '#bbf7d0',
    color: '#059669',
    border: 'rgba(5, 150, 105, 0.2)',
  },
  sortButton: {
    bg: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.12)',
    labelColor: '#64748B',
    valueColor: '#1E293B',
  },
  snoBadge: {
    bg: 'rgba(5, 150, 105, 0.08)',
    color: '#059669',
    border: '1px solid rgba(5, 150, 105, 0.2)',
    hoverBg: '#059669',
    hoverColor: '#FFFFFF',
  },
} as const;

export const COMMON_BUTTON_STYLES = {
  primary: {
    bgcolor: '#059669',
    color: 'common.white',
    '&:hover': {
      bgcolor: '#047857',
    },
  },
} as const;
