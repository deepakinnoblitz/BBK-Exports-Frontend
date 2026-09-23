import type { LineRotation } from 'src/api/line-rotation';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { getLineRotationDoc } from 'src/api/line-rotation';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  rotationName: string | null;
  onEdit?: () => void;
  onGenerate?: (rotationName: string) => void;
  canEdit?: boolean;
};

export function LineRotationDetailsDialog({
  open,
  onClose,
  rotationName,
  onEdit,
  onGenerate,
  canEdit = true,
}: Props) {
  const [rotation, setRotation] = useState<LineRotation | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && rotationName) {
      setLoading(true);
      Promise.all([
        getLineRotationDoc(rotationName),
        getDoctypeList('Line Order', ['name', 'line_name', 'description']),
      ])
        .then(([doc, lineList]) => {
          setRotation(doc);
          setLines(lineList || []);
        })
        .catch((err) => console.error('Failed to load Line Rotation:', err))
        .finally(() => setLoading(false));
    }
  }, [open, rotationName]);

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return dayjs(d).format('DD-MMM-YYYY');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionProps={{ onExited: () => setRotation(null) }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar: any) => themeVar.customShadows?.z24,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Line Rotation Details
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{
            color: 'text.disabled',
            '&:hover': {
              color: 'text.primary',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
            },
          }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ m: 1.5, mt: 3 }}>
        {loading || !rotation ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#059669' }} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Header Banner Card */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.05),
                border: `1px solid ${alpha(COMMON_COLORS.emerald.main, 0.22)}`,
                boxShadow: `0 2px 10px ${alpha(COMMON_COLORS.emerald.main, 0.06)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                    color: COMMON_COLORS.emerald.darker,
                    boxShadow: `0 2px 8px ${alpha(COMMON_COLORS.emerald.main, 0.15)}`,
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={"solar:repeat-bold" as any} width={24} />
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', fontSize: '1.125rem', letterSpacing: -0.2 }}>
                    {rotation.rotation_name}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.75 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        px: 1,
                        py: 0.35,
                        borderRadius: 0.85,
                        bgcolor: alpha(COMMON_COLORS.emerald.main, 0.1),
                        color: COMMON_COLORS.emerald.darker,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      <Iconify icon={"solar:calendar-linear" as any} width={13} />
                      {rotation.frequency || 'Weekly'} Frequency
                    </Box>

                    {rotation.sequences && rotation.sequences.length > 0 && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1,
                          py: 0.35,
                          borderRadius: 0.85,
                          bgcolor: 'background.paper',
                          border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <Iconify icon={"solar:sort-from-top-to-bottom-bold" as any} width={13} />
                        {rotation.sequences.length} Steps
                      </Box>
                    )}

                    {rotation.department && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1,
                          py: 0.35,
                          borderRadius: 0.85,
                          bgcolor: 'background.paper',
                          border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <Iconify icon={"solar:buildings-linear" as any} width={13} />
                        {rotation.department}
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Stack>

              <Label
                variant="soft"
                color={(rotation.status === 'Active' && 'success') || 'default'}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                {(rotation.status || 'Active').toUpperCase()}
              </Label>
            </Box>

            {/* General Information Grid */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', mb: 2, mx: 1.5, fontSize: '13px' }}
              >
                Configuration Overview
              </Typography>

              <Box sx={{ display: 'grid', gap: 2.5, mx: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <DetailItem
                  label="Department"
                  value={rotation.department || 'All Departments'}
                  icon="solar:buildings-bold-duotone"
                />
                <DetailItem
                  label="Active Period"
                  value={`${formatDate(rotation.start_date)} → ${formatDate(rotation.end_date)}`}
                  icon="solar:calendar-bold-duotone"
                />
                <DetailItem
                  label="Exclude Weekly Offs"
                  value={rotation.exclude_weekly_offs ? 'Yes (Skip rotation on weekly offs)' : 'No'}
                  icon="solar:shield-check-bold"
                />
                <DetailItem
                  label="Exclude Holidays"
                  value={rotation.exclude_holidays ? 'Yes (Skip rotation on holidays)' : 'No'}
                  icon="solar:shield-check-bold"
                />
                {rotation.description && (
                  <Box sx={{ gridColumn: { xs: '1', sm: '1 / span 2' } }}>
                    <DetailItem
                      label="Description"
                      value={rotation.description}
                      icon="solar:document-text-bold-duotone"
                    />
                  </Box>
                )}
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Line Sequence Section */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.05),
                border: `1px solid ${alpha(COMMON_COLORS.emerald.main, 0.22)}`,
                boxShadow: `0 2px 10px ${alpha(COMMON_COLORS.emerald.main, 0.06)}`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                    color: COMMON_COLORS.emerald.darker,
                  }}
                >
                  <Iconify icon={"solar:repeat-bold" as any} width={18} />
                </Box>
                <div>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.925rem', color: 'text.primary' }}>
                    Line Sequence Pattern
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
                    {rotation.sequences?.length || 0} sequential step{(rotation.sequences?.length || 0) === 1 ? '' : 's'} in continuous rotation cycle
                  </Typography>
                </div>
              </Stack>

              {rotation.sequences && rotation.sequences.length > 0 ? (
                <>
                  <Stack spacing={0}>
                    {rotation.sequences.map((seq, idx) => {
                      const matchedLine = lines.find((l) => l.name === seq.line_order);
                      const desc = matchedLine?.description ? ` — ${matchedLine.description}` : '';

                      return (
                        <Box key={idx}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              p: 2,
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                            }}
                          >
                            <Box
                              sx={{
                                minWidth: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                                color: COMMON_COLORS.emerald.darker,
                                border: `1.5px solid ${alpha(COMMON_COLORS.emerald.main, 0.4)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {seq.step_number || idx + 1}
                            </Box>

                            <Box sx={{ width: 60, flexShrink: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  color: 'text.secondary',
                                  letterSpacing: 0.5,
                                }}
                              >
                                Step {seq.step_number || idx + 1}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'text.secondary',
                                  lineHeight: 1.3,
                                }}
                              >
                                Assigned Line
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.875rem', lineHeight: 1.4 }}>
                                {seq.line_name || seq.line_order}
                                {desc && (
                                  <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>
                                    {desc}
                                  </Box>
                                )}
                              </Typography>
                            </Box>
                          </Box>

                          {idx < (rotation.sequences?.length || 0) - 1 && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 1,
                                color: COMMON_COLORS.emerald.main,
                              }}
                            >
                              <Iconify icon={"solar:arrow-down-linear" as any} width={20} />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>

                  {(rotation.sequences?.length || 0) > 1 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mt: 1.75,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1.5,
                          py: 0.7,
                          borderRadius: 1,
                          bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                          border: `1px dashed ${alpha(COMMON_COLORS.emerald.main, 0.4)}`,
                          color: COMMON_COLORS.emerald.darker,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <Iconify icon={"solar:restart-bold" as any} width={14} />
                        Cycle Repeats back to Step 1
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  No line sequence steps configured.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: string;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 700,
          textTransform: 'uppercase',
          mb: 0.5,
          display: 'block',
          fontSize: '11px',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon={icon as any} width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );
}
