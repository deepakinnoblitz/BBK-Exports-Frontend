import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { alpha, useTheme, keyframes } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { COMMON_COLORS } from 'src/theme';
import { CONFIG } from 'src/config-global';
import {
  fetchFaceCatalog,
  type FaceCatalogItem,
  fetchLiveLineOccupancy,
  type LiveLineOccupancy,
  executeUndoFaceLineChange,
  executeFaceRecognitionLineChange,
} from 'src/api/line-roster';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { type LineChangeMode, FaceLineChangeModeDialog } from '../face-line-change-mode-dialog';

// ----------------------------------------------------------------------

const scanAnimation = keyframes`
  0% { top: 10%; opacity: 0.8; }
  50% { top: 85%; opacity: 1; }
  100% { top: 10%; opacity: 0.8; }
`;

const pulseRing = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(0.95); opacity: 1; }
`;

// Synthesized Web Audio Sound Chimes
function playChime(type: 'success' | 'alert') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext not allowed without gesture or unsupported
  }
}

interface SessionLogItem {
  roster_id: string;
  employee_id: string;
  employee_name: string;
  previous_line: string;
  target_line: string;
  timestamp: string;
  mode: string;
}

export function FaceLineChangeView() {
  const theme = useTheme();
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryMode = searchParams.get('mode') as LineChangeMode | null;
  const [mode, setMode] = useState<LineChangeMode>(
    queryMode === 'post-fixed' ? 'post-fixed' : 'pre-fixed'
  );
  const [openModeDialog, setOpenModeDialog] = useState(false);

  // Sync mode if query param changes
  useEffect(() => {
    if (queryMode && (queryMode === 'pre-fixed' || queryMode === 'post-fixed')) {
      setMode(queryMode);
    }
  }, [queryMode]);

  // If accessed directly without mode query param, open the selection dialog
  useEffect(() => {
    if (!searchParams.get('mode')) {
      setOpenModeDialog(true);
    }
  }, [searchParams]);

  // Lines & Catalog
  const [lines, setLines] = useState<LiveLineOccupancy[]>([]);
  const [catalog, setCatalog] = useState<FaceCatalogItem[]>([]);

  // Pre-Fixed Form
  const [sourceLine, setSourceLine] = useState('');
  const [targetLine, setTargetLine] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<dayjs.Dayjs | null>(dayjs());

  // Post-Fixed Form
  const [postTargetLine, setPostTargetLine] = useState('');

  // Recognition States
  const [activeWorker, setActiveWorker] = useState<FaceCatalogItem | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Toggles
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number>(0);

  // Camera States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  // Session Transition History
  const [sessionLogs, setSessionLogs] = useState<SessionLogItem[]>([]);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  // Manual Search Autocomplete
  const [manualSearchVal, setManualSearchVal] = useState<FaceCatalogItem | null>(null);

  // ── Load initial data: lines + catalog ─────────────────────────────────
  const loadInitialData = useCallback(async () => {
    try {
      const [lineList, catList] = await Promise.all([
        fetchLiveLineOccupancy(effectiveDate?.format('YYYY-MM-DD')),
        fetchFaceCatalog(),
      ]);
      setLines(lineList);
      setCatalog(catList);

      // Auto-set default source and target line if available
      if (lineList.length >= 2) {
        if (!sourceLine) setSourceLine(lineList[0].name);
        if (!targetLine) setTargetLine(lineList[1].name);
      } else if (lineList.length === 1) {
        if (!sourceLine) setSourceLine(lineList[0].name);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize line data');
    }
  }, [effectiveDate, sourceLine, targetLine]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Camera Initialization ──────────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }

      // Enumerate camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoDevs);
      if (!deviceId && videoDevs.length > 0) {
        setSelectedCameraId(videoDevs[0].deviceId);
      }
    } catch {
      setCameraActive(false);
      setErrorMsg('Camera access failed. Check browser permissions or use manual search.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // ── Select Worker ──────────────────────────────────────────────────────
  const handleSelectWorker = useCallback(
    (worker: FaceCatalogItem, matchConfidence = 98.4) => {
      setActiveWorker(worker);
      setConfidence(matchConfidence);
      setErrorMsg('');
      setSuccessMsg('');
      if (soundEnabled) playChime('success');

      // In Post-Fixed mode, default postTargetLine to a line different from their current line
      if (mode === 'post-fixed') {
        const otherLine = lines.find((l) => l.name !== (worker.current_line || worker.default_line));
        if (otherLine) setPostTargetLine(otherLine.name);
      }

      // If Auto-advance is on in Pre-Fixed mode, trigger countdown
      if (mode === 'pre-fixed' && autoAdvance) {
        setCountdown(1.5);
      }
    },
    [autoAdvance, lines, mode, soundEnabled]
  );

  // Quick Simulation: Pick next worker from source line for testing / demo
  const simulateFaceDetection = () => {
    if (catalog.length === 0) return;
    setIsRecognizing(true);
    setTimeout(() => {
      setIsRecognizing(false);
      // Prefer worker from source line if in pre-fixed mode
      const candidates =
        mode === 'pre-fixed' && sourceLine
          ? catalog.filter((c) => (c.current_line || c.default_line) === sourceLine)
          : catalog;

      const pick =
        candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : catalog[Math.floor(Math.random() * catalog.length)];

      if (pick) {
        handleSelectWorker(pick, +(95 + Math.random() * 4).toFixed(1));
      }
    }, 700);
  };

  // ── Execute Line Change ────────────────────────────────────────────────
  const handleConfirmTransfer = useCallback(async () => {
    if (!activeWorker) return;

    const chosenTargetLine = mode === 'pre-fixed' ? targetLine : postTargetLine;
    const workerCurrentLine = activeWorker.current_line || activeWorker.default_line || '';

    if (!chosenTargetLine) {
      setErrorMsg('Please select a target line.');
      if (soundEnabled) playChime('alert');
      return;
    }

    if (chosenTargetLine === workerCurrentLine) {
      setErrorMsg(`${activeWorker.employee_name} is already assigned to ${chosenTargetLine}.`);
      if (soundEnabled) playChime('alert');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await executeFaceRecognitionLineChange({
        employee: activeWorker.name,
        target_line: chosenTargetLine,
        effective_from: effectiveDate?.format('YYYY-MM-DD'),
        source_line: workerCurrentLine,
        mode: mode === 'pre-fixed' ? 'Pre-Fixed' : 'Post-Fixed',
      });

      if (soundEnabled) playChime('success');
      setSuccessMsg(res.message || `Transferred to ${chosenTargetLine}`);

      // Append to session logs
      const logItem: SessionLogItem = {
        roster_id: res.roster_name,
        employee_id: activeWorker.employee_id || activeWorker.name,
        employee_name: activeWorker.employee_name,
        previous_line: workerCurrentLine,
        target_line: chosenTargetLine,
        timestamp: dayjs().format('HH:mm:ss'),
        mode: mode === 'pre-fixed' ? 'Pre-Fixed' : 'Post-Fixed',
      };
      setSessionLogs((prev) => [logItem, ...prev]);

      // Update worker in local catalog
      setCatalog((prev) =>
        prev.map((c) => (c.name === activeWorker.name ? { ...c, current_line: chosenTargetLine } : c))
      );

      // Refresh live lines occupancy
      fetchLiveLineOccupancy(effectiveDate?.format('YYYY-MM-DD')).then(setLines).catch(() => {});

      // Clear active worker to scan next
      setActiveWorker(null);
      setManualSearchVal(null);
      setCountdown(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute line change');
      if (soundEnabled) playChime('alert');
    } finally {
      setSubmitting(false);
    }
  }, [activeWorker, mode, targetLine, postTargetLine, soundEnabled, effectiveDate]);

  // Auto-advance Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && activeWorker && mode === 'pre-fixed' && autoAdvance) {
      timer = setTimeout(() => {
        setCountdown((prev) => +(prev - 0.5).toFixed(1));
      }, 500);
    } else if (countdown === 0 && activeWorker && mode === 'pre-fixed' && autoAdvance && !submitting) {
      handleConfirmTransfer();
    }
    return () => clearTimeout(timer);
  }, [countdown, activeWorker, mode, autoAdvance, submitting, handleConfirmTransfer]);

  // Spacebar keyboard shortcut to confirm & next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeWorker && !submitting) {
        e.preventDefault();
        handleConfirmTransfer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorker, submitting, handleConfirmTransfer]);

  // ── Undo Line Change ───────────────────────────────────────────────────
  const handleUndo = async (log: SessionLogItem) => {
    setUndoingId(log.roster_id);
    try {
      await executeUndoFaceLineChange({
        roster_id: log.roster_id,
        employee: log.employee_id,
        previous_line: log.previous_line,
        effective_from: effectiveDate?.format('YYYY-MM-DD'),
      });

      // Remove from session logs
      setSessionLogs((prev) => prev.filter((item) => item.roster_id !== log.roster_id));
      setSuccessMsg(`Undone! ${log.employee_name} restored to ${log.previous_line || 'default'}.`);
      if (soundEnabled) playChime('success');

      // Update local catalog
      setCatalog((prev) =>
        prev.map((c) =>
          c.name === log.employee_id || c.employee_id === log.employee_id
            ? { ...c, current_line: log.previous_line }
            : c
        )
      );

      // Refresh live lines occupancy
      fetchLiveLineOccupancy(effectiveDate?.format('YYYY-MM-DD')).then(setLines).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to undo assignment');
    } finally {
      setUndoingId(null);
    }
  };

  const handleSkipWorker = () => {
    setActiveWorker(null);
    setManualSearchVal(null);
    setCountdown(0);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.950' : '#f8fafc'),
        pb: 6,
      }}
    >
      {/* ── Standalone Kiosk Header Bar with Logo ── */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: (t) => `1px solid ${alpha(t.palette.grey[500], 0.14)}`,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          px: { xs: 2, sm: 4 },
          py: 1.5,
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          {/* Brand Logo & Back to Line Assignment */}
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => router.push('/line-roster')}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 0.85 },
              }}
            >
              <Box
                component="img"
                src={`${CONFIG.assetsDir}/logo/Innoblitz%20Logo%20Full.png`}
                alt="BBK Logo"
                sx={{
                  height: 48,
                  width: 'auto',
                  maxWidth: 130,
                  objectFit: 'contain',
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: '#1e293b',
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                  }}
                >
                  BBK EXPORTS
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    letterSpacing: '0.04em',
                  }}
                >
                  Face Biometric Kiosk
                </Typography>
              </Box>
            </Box>

            <Box sx={{ height: 32, width: '1px', bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />

            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon={"eva:arrow-back-fill" as any} />}
              onClick={() => router.push('/line-roster')}
              sx={{ borderRadius: '20px', fontWeight: 700 }}
            >
              Back to Line Assignment
            </Button>
          </Stack>

          {/* Active Mode Badge & Change Mode Action */}
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
            <Label
              variant="filled"
              color={mode === 'pre-fixed' ? 'primary' : 'secondary'}
              startIcon={
                <Iconify
                  icon={(mode === 'pre-fixed' ? 'solar:bolt-bold' : 'solar:target-bold') as any}
                  width={16}
                />
              }
              sx={{
                px: 1.5,
                py: 2,
                fontSize: 13,
                fontWeight: 700,
                borderRadius: '12px',
                textTransform: 'none',
              }}
            >
              {mode === 'pre-fixed' ? 'Pre-Fixed Line Mode' : 'Post-Fixed Line Mode'}
            </Label>

            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon={"solar:tuning-bold" as any} width={14} />}
              onClick={() => setOpenModeDialog(true)}
              sx={{ borderRadius: '16px', fontSize: 12, fontWeight: 700 }}
            >
              Change Mode
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Main Container ── */}
      <Container maxWidth="xl">
        {/* Page Title & Status Alerts */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                color: COMMON_COLORS.emerald.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon={"solar:face-scan-circle-bold" as any} width={26} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Face Recognition Line Change
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {mode === 'pre-fixed'
                  ? 'Pre-Fixed Mode: Continuous batch worker reassignment with auto-advance'
                  : 'Post-Fixed Mode: Dynamic reassignment with live line occupancy monitoring'}
              </Typography>
            </Box>
          </Stack>

          {/* Alerts */}
          {errorMsg && (
            <Alert severity="error" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}
          {successMsg && (
            <Alert severity="success" onClose={() => setSuccessMsg('')}>
              {successMsg}
            </Alert>
          )}
        </Stack>

      <Grid container spacing={3}>
        {/* ── LEFT PANEL: Live Camera & Recognition Viewfinder ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: '20px',
              border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
              position: 'relative',
            }}
          >
            {/* Camera Header Bar */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: cameraActive ? COMMON_COLORS.emerald.main : 'error.main',
                    boxShadow: cameraActive ? `0 0 8px ${COMMON_COLORS.emerald.main}` : '0 0 8px red',
                  }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {cameraActive ? 'Camera Live' : 'Camera Inactive'}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title={soundEnabled ? 'Sound On' : 'Sound Muted'}>
                  <IconButton size="small" onClick={() => setSoundEnabled((prev) => !prev)}>
                    <Iconify
                      icon={(soundEnabled ? 'solar:volume-loud-bold' : 'solar:volume-cross-bold') as any}
                      width={18}
                    />
                  </IconButton>
                </Tooltip>

                {cameraDevices.length > 1 && (
                  <Select
                    size="small"
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    sx={{ height: 32, fontSize: 12, borderRadius: '12px' }}
                  >
                    {cameraDevices.map((d, i) => (
                      <MenuItem key={d.deviceId || i} value={d.deviceId} sx={{ fontSize: 12 }}>
                        {d.label || `Camera ${i + 1}`}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </Stack>
            </Stack>

            {/* Video Stream & Face Targeting Reticle */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 380,
                borderRadius: '16px',
                overflow: 'hidden',
                bgcolor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirror mode
                }}
              />
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

              {/* Animated Biometric Targeting Reticle */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 210,
                  height: 260,
                  borderRadius: '28px',
                  border: `2.5px dashed ${activeWorker ? COMMON_COLORS.emerald.main : alpha('#38bdf8', 0.8)}`,
                  animation: `${pulseRing} 2.5s infinite ease-in-out`,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: '100%',
                    height: '2px',
                    bgcolor: activeWorker ? COMMON_COLORS.emerald.main : '#38bdf8',
                    boxShadow: `0 0 10px ${activeWorker ? COMMON_COLORS.emerald.main : '#38bdf8'}`,
                    animation: `${scanAnimation} 2s infinite ease-in-out`,
                  },
                }}
              />

              {/* Status Overlay Badge */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 14,
                  left: 14,
                  right: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Label
                  variant="filled"
                  color={activeWorker ? 'success' : isRecognizing ? 'warning' : 'default'}
                  sx={{ backdropFilter: 'blur(8px)', px: 1.5, py: 0.6, fontWeight: 700, fontSize: 12 }}
                >
                  {activeWorker
                    ? `Face Locked: ${confidence}% Match`
                    : isRecognizing
                    ? 'Analyzing 3D Mesh...'
                    : 'Scanning for face...'}
                </Label>

                {/* Quick Scan Test Button */}
                <Button
                  size="small"
                  variant="contained"
                  onClick={simulateFaceDetection}
                  disabled={isRecognizing}
                  sx={{
                    fontSize: 12,
                    py: 0.4,
                    px: 1.5,
                    borderRadius: '16px',
                    bgcolor: alpha('#ffffff', 0.25),
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    fontWeight: 700,
                    '&:hover': { bgcolor: alpha('#ffffff', 0.4) },
                  }}
                >
                  {isRecognizing ? <CircularProgress size={14} color="inherit" /> : '⚡ Test Face Match'}
                </Button>
              </Box>
            </Box>

            {/* Manual Search Fallback */}
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.75, display: 'block' }}>
                Manual Search Fallback (if face is covered / masked):
              </Typography>
              <Autocomplete
                size="small"
                options={catalog}
                getOptionLabel={(option) => `${option.employee_name} (${option.employee_id || option.name})`}
                value={manualSearchVal}
                onChange={(_, val) => {
                  setManualSearchVal(val);
                  if (val) handleSelectWorker(val, 100);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Type employee name or ID..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <Iconify
                          icon={"solar:magnifer-linear" as any}
                          width={18}
                          sx={{ mr: 0.75, color: 'text.secondary' }}
                        />
                      ),
                    }}
                  />
                )}
              />
            </Box>
          </Card>
        </Grid>

        {/* ── RIGHT PANEL: Mode Setup & Line Assignment Action ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2.5}>
            {/* Effective Date Selector */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Effective Date"
                value={effectiveDate}
                onChange={(val) => setEffectiveDate(val)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>

            {/* ── PRE-FIXED MODE CONFIGURATION ── */}
            {mode === 'pre-fixed' && (
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  border: (t) => `1.5px solid ${alpha(COMMON_COLORS.emerald.main, 0.28)}`,
                  bgcolor: (t) => alpha(COMMON_COLORS.emerald.main, 0.04),
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.main }}>
                    Pre-Fixed Batch Transfer Line Settings
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={autoAdvance}
                        onChange={(e) => setAutoAdvance(e.target.checked)}
                        color="success"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Auto-Advance (1.5s)
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Stack>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>From Line (Source)</InputLabel>
                      <Select
                        label="From Line (Source)"
                        value={sourceLine}
                        onChange={(e) => setSourceLine(e.target.value)}
                      >
                        {lines.map((l) => (
                          <MenuItem key={l.name} value={l.name}>
                            {l.line_name} ({l.assigned_count} workers)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>To Line (Target)</InputLabel>
                      <Select
                        label="To Line (Target)"
                        value={targetLine}
                        onChange={(e) => setTargetLine(e.target.value)}
                      >
                        {lines.map((l) => (
                          <MenuItem key={l.name} value={l.name}>
                            {l.line_name} ({l.assigned_count} workers)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Card>
            )}

            {/* ── RECOGNIZED WORKER CARD ── */}
            {activeWorker ? (
              <Card
                sx={{
                  p: 3,
                  borderRadius: '20px',
                  border: (t) => `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                  bgcolor: 'background.paper',
                  boxShadow: '0 8px 30px 0 rgba(0, 0, 0, 0.08)',
                }}
              >
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar
                    src={activeWorker.profile_picture || activeWorker.face_enrolled_image}
                    alt={activeWorker.employee_name}
                    sx={{ width: 72, height: 72, borderRadius: '18px', bgcolor: 'primary.light' }}
                  >
                    {activeWorker.employee_name?.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap sx={{ fontWeight: 800 }}>
                      {activeWorker.employee_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      ID: {activeWorker.employee_id || activeWorker.name} • {activeWorker.designation || 'Worker'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                      <Label variant="soft" color="info">
                        Dept: {activeWorker.department || 'Production'}
                      </Label>
                      <Label variant="soft" color="secondary">
                        Current: {activeWorker.current_line_name || activeWorker.current_line || activeWorker.default_line || 'Unassigned'}
                      </Label>
                    </Stack>
                  </Box>
                </Stack>

                {/* Transfer Visual Route */}
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: '14px',
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Current Line
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {activeWorker.current_line_name || activeWorker.current_line || activeWorker.default_line || 'None'}
                    </Typography>
                  </Box>

                  <Iconify
                    icon={"solar:arrow-right-bold" as any}
                    width={24}
                    sx={{ color: COMMON_COLORS.emerald.main, mx: 1.5 }}
                  />

                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Target Line
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.main }}>
                      {mode === 'pre-fixed' ? targetLine || 'Not selected' : postTargetLine || 'Select below'}
                    </Typography>
                  </Box>
                </Box>

                {/* ── POST-FIXED MODE: Target Line Selection Grid ── */}
                {mode === 'post-fixed' && (
                  <Box sx={{ mt: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                      Choose Destination Line for this worker:
                    </Typography>
                    <Grid container spacing={1.5}>
                      {lines.map((line) => {
                        const isSelected = postTargetLine === line.name;
                        const isCurrent = line.name === (activeWorker.current_line || activeWorker.default_line);
                        return (
                          <Grid size={{ xs: 6, sm: 4 }} key={line.name}>
                            <Card
                              onClick={() => !isCurrent && setPostTargetLine(line.name)}
                              sx={{
                                p: 1.5,
                                borderRadius: '14px',
                                cursor: isCurrent ? 'not-allowed' : 'pointer',
                                opacity: isCurrent ? 0.6 : 1,
                                border: `1.5px solid ${
                                  isSelected ? COMMON_COLORS.emerald.main : alpha(theme.palette.grey[500], 0.2)
                                }`,
                                bgcolor: isSelected ? alpha(COMMON_COLORS.emerald.main, 0.1) : 'background.paper',
                                transition: 'all 0.15s ease-in-out',
                                '&:hover': {
                                  borderColor: !isCurrent ? COMMON_COLORS.emerald.main : undefined,
                                },
                              }}
                            >
                              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: 13 }}>
                                {line.line_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {line.assigned_count} workers
                              </Typography>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}

                {/* Countdown Progress Bar (if Auto-advance active) */}
                {autoAdvance && countdown > 0 && mode === 'pre-fixed' && (
                  <Box sx={{ mt: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: COMMON_COLORS.emerald.main }}>
                        Auto-assigning in {countdown}s...
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={((1.5 - countdown) / 1.5) * 100}
                      color="success"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )}

                {/* Action Buttons */}
                <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={submitting || (mode === 'post-fixed' && !postTargetLine)}
                    onClick={handleConfirmTransfer}
                    startIcon={
                      submitting ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Iconify icon={"solar:check-circle-bold" as any} />
                      )
                    }
                    sx={{
                      bgcolor: COMMON_COLORS.emerald.main,
                      color: '#ffffff',
                      fontWeight: 800,
                      py: 1.3,
                      borderRadius: '12px',
                      boxShadow: `0 8px 16px ${alpha(COMMON_COLORS.emerald.main, 0.35)}`,
                      '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
                    }}
                  >
                    {submitting
                      ? 'Assigning Line...'
                      : mode === 'pre-fixed'
                      ? '✓ Confirm & Next (Space)'
                      : '✓ Assign Line & Next'}
                  </Button>

                  <Button variant="outlined" color="inherit" onClick={handleSkipWorker} sx={{ borderRadius: '12px', px: 2.5 }}>
                    Skip
                  </Button>
                </Stack>
              </Card>
            ) : (
              /* Waiting state */
              <Card
                sx={{
                  p: 5,
                  textAlign: 'center',
                  borderRadius: '20px',
                  border: (t) => `1.5px dashed ${alpha(t.palette.grey[500], 0.24)}`,
                  bgcolor: (t) => alpha(t.palette.grey[500], 0.02),
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                    color: COMMON_COLORS.emerald.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Iconify icon={"solar:user-speak-bold-duotone" as any} width={36} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Waiting for Worker Scan
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto', mt: 0.5 }}>
                  Worker should stand in front of the camera or use the manual search fallback below.
                </Typography>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* ── BOTTOM PANEL: Live Session History & Instant Undo ── */}
      <Box sx={{ mt: 4, mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Session Reassignment History
            </Typography>
            <Label color="primary" variant="filled">
              {sessionLogs.length} moved
            </Label>
          </Stack>
        </Stack>

        {sessionLogs.length > 0 ? (
          <TableContainer
            sx={{
              borderRadius: '16px',
              border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
              maxHeight: 220,
              bgcolor: 'background.paper',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.06) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Previous Line</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>New Line</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessionLogs.map((log) => (
                  <TableRow key={log.roster_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {log.employee_name} ({log.employee_id})
                    </TableCell>
                    <TableCell>{log.previous_line || '-'}</TableCell>
                    <TableCell>
                      <Label variant="soft" color="success">
                        {log.target_line}
                      </Label>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{log.timestamp}</TableCell>
                    <TableCell>
                      <Label variant="soft" color="info">
                        {log.mode}
                      </Label>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1.5 }}>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={undoingId === log.roster_id}
                        onClick={() => handleUndo(log)}
                        startIcon={
                          undoingId === log.roster_id ? (
                            <CircularProgress size={12} color="inherit" />
                          ) : (
                            <Iconify icon={"solar:restart-bold" as any} width={14} />
                          )
                        }
                        sx={{ fontSize: 11, py: 0.25, px: 1, borderRadius: '8px' }}
                      >
                        Undo
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: 13 }}>
            No transfers recorded in this session yet. As workers scan their faces, they will appear here.
          </Typography>
        )}
      </Box>
        {/* Mode Selection Dialog */}
        <FaceLineChangeModeDialog
          open={openModeDialog}
          currentMode={mode}
          onClose={() => setOpenModeDialog(false)}
          onSelectMode={(newMode) => {
            setOpenModeDialog(false);
            setMode(newMode);
            setSearchParams({ mode: newMode });
            setActiveWorker(null);
            setCountdown(0);
          }}
        />
      </Container>
    </Box>
  );
}

