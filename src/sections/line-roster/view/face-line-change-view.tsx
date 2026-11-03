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
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
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
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import {
  faceapi,
  matchFaceDescriptor,
  loadFaceRecognitionModels,
  ensureWorkerFaceDescriptor,
  extractFaceDescriptorFromMedia,
} from 'src/utils/face-recognition';

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

import { EmployeeFaceEnrollmentDialog } from 'src/sections/employee/employee-face-enrollment-dialog';

import { type LineChangeMode, FaceLineChangeModeDialog } from '../face-line-change-mode-dialog';

// ----------------------------------------------------------------------

// Helper: Canvas Rounded Rectangle (with browser fallback)
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

// Helper: Real-time dynamic biometric face markings on canvas
function drawFaceBiometrics(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  isLocked: boolean,
  isUnrecognized: boolean,
  isScanning: boolean,
  nextScanSecs: number,
  lockProgress: number,
  worker: FaceCatalogItem | null,
  confidenceVal: number,
  time: number,
  effectiveTargetLine: string
) {
  const { x, y, width: w, height: h } = box;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const primaryColor =
    isLocked && worker
      ? '#10b981'
      : isUnrecognized
      ? '#ef4444'
      : isScanning
      ? '#38bdf8'
      : '#06b6d4';

  ctx.save();

  // 1. Subtle perimeter boundary
  ctx.strokeStyle =
    isLocked && worker
      ? 'rgba(16, 185, 129, 0.35)'
      : isUnrecognized
      ? 'rgba(239, 68, 68, 0.4)'
      : 'rgba(6, 182, 212, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. High-Tech Corner Brackets
  const cornerLen = Math.max(18, Math.min(32, w * 0.22));
  const r = 8;
  ctx.strokeStyle = primaryColor;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = isLocked ? 14 : isUnrecognized ? 10 : 8;
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';

  // Top-left bracket
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Top-right bracket
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  // Bottom-right bracket
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - cornerLen);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + w - cornerLen, y + h);
  ctx.stroke();

  // Bottom-left bracket
  ctx.beginPath();
  ctx.moveTo(x + cornerLen, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + h - cornerLen);
  ctx.stroke();

  // Reset shadow for crisp inner elements
  ctx.shadowBlur = 0;

  // 3. Facial Landmark Guides
  // Center crosshair
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx + 7, cy);
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();

  // Eye Reticles
  const eyeY = y + h * 0.38;
  const eyeLeftX = x + w * 0.32;
  const eyeRightX = x + w * 0.68;
  const eyeRadius = Math.max(3, w * 0.024);

  ctx.strokeStyle = isLocked && worker ? '#10b981' : isUnrecognized ? '#f59e0b' : '#38bdf8';
  ctx.fillStyle =
    isLocked && worker
      ? 'rgba(16, 185, 129, 0.4)'
      : isUnrecognized
      ? 'rgba(245, 158, 11, 0.35)'
      : 'rgba(56, 189, 248, 0.3)';

  // Left Eye
  ctx.beginPath();
  ctx.arc(eyeLeftX, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right Eye
  ctx.beginPath();
  ctx.arc(eyeRightX, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Nose tracker dot
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.55, 2, 0, Math.PI * 2);
  ctx.fill();

  // Mouth tracker tick
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, y + h * 0.74);
  ctx.lineTo(cx + 10, y + h * 0.74);
  ctx.stroke();

  // 4. Internal Sweeping Laser Line
  const laserNorm = (Math.sin(time * 0.0035) + 1) / 2;
  const laserY = y + 10 + laserNorm * (h - 20);
  const laserGrad = ctx.createLinearGradient(x, laserY, x + w, laserY);
  const rgb = isLocked && worker ? '16, 185, 129' : isUnrecognized ? '245, 158, 11' : '6, 182, 212';
  laserGrad.addColorStop(0, `rgba(${rgb}, 0)`);
  laserGrad.addColorStop(0.3, `rgba(${rgb}, 0.85)`);
  laserGrad.addColorStop(0.5, '#ffffff');
  laserGrad.addColorStop(0.7, `rgba(${rgb}, 0.85)`);
  laserGrad.addColorStop(1, `rgba(${rgb}, 0)`);

  ctx.strokeStyle = laserGrad;
  ctx.lineWidth = 2;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x + 6, laserY);
  ctx.lineTo(x + w - 6, laserY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 5. Floating Status Badge Above Face
  const badgeText =
    isLocked && worker
      ? `✓ VERIFIED: ${worker.employee_name} (${confidenceVal}%)`
      : isUnrecognized
      ? nextScanSecs > 0
        ? `❌ EMPLOYEE NOT FOUND (Rescan in ${nextScanSecs.toFixed(0)}s)`
        : '❌ EMPLOYEE NOT FOUND • UNAUTHORIZED'
      : isScanning
      ? '⚲ SCANNING FACE BIOMETRICS...'
      : nextScanSecs > 0
      ? `⚲ NEXT SCAN IN ${nextScanSecs.toFixed(1)}s`
      : `⚲ TRACKING FACE • ${Math.round(lockProgress * 100)}%`;

  ctx.font = 'bold 12px "DM Sans", -apple-system, sans-serif';
  const textW = ctx.measureText(badgeText).width;
  const badgeW = Math.max(140, textW + 24);
  const badgeH = 26;
  const badgeX = cx - badgeW / 2;
  const badgeY = Math.max(12, y - 34);

  // Badge background
  ctx.fillStyle =
    isLocked && worker
      ? 'rgba(16, 185, 129, 0.94)'
      : isUnrecognized
      ? 'rgba(220, 38, 38, 0.95)'
      : 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 13);
  ctx.fill();
  ctx.stroke();

  // Badge text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, cx, badgeY + badgeH / 2);

  // Locking progress bar under text if acquiring lock
  if (!isLocked && !isUnrecognized && lockProgress > 0) {
    const barW = (badgeW - 16) * lockProgress;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX + 8, badgeY + badgeH - 3, barW, 2, 1);
    ctx.fill();
  }

  // 6. Sub-tag below face (when matched or unrecognized)
  if (isLocked && worker && effectiveTargetLine) {
    const subText = `${worker.current_line || worker.default_line || 'No Line'} → ${effectiveTargetLine}`;
    ctx.font = 'bold 11px "DM Sans", -apple-system, sans-serif';
    const subW = ctx.measureText(subText).width + 20;
    const subH = 22;
    const subX = cx - subW / 2;
    const subY = y + h + 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    drawRoundedRect(ctx, subX, subY, subW, subH, 11);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subText, cx, subY + subH / 2);
  } else if (isUnrecognized) {
    const subText = '❌ Unassigned / Employee Not Found in Line Dataset';
    ctx.font = 'bold 11px "DM Sans", -apple-system, sans-serif';
    const subW = ctx.measureText(subText).width + 20;
    const subH = 22;
    const subX = cx - subW / 2;
    const subY = y + h + 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    drawRoundedRect(ctx, subX, subY, subW, subH, 11);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subText, cx, subY + subH / 2);
  }

  ctx.restore();
}

// Helper: Idle viewfinder guide when waiting for face
function drawIdleScanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  const cx = width / 2;
  const cy = height / 2;
  const targetW = 210;
  const targetH = 260;
  const x = cx - targetW / 2;
  const y = cy - targetH / 2;
  const pulse = (Math.sin(time * 0.002) + 1) / 2;

  ctx.save();

  // Subtle perimeter dashed guide
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.2 + pulse * 0.25})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, targetW, targetH, 24);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner guide ticks
  const tickLen = 20;
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.55 + pulse * 0.4})`;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + tickLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + tickLen, y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + targetW - tickLen, y);
  ctx.lineTo(x + targetW, y);
  ctx.lineTo(x + targetW, y + tickLen);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + targetW, y + targetH - tickLen);
  ctx.lineTo(x + targetW, y + targetH);
  ctx.lineTo(x + targetW - tickLen, y + targetH);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x + tickLen, y + targetH);
  ctx.lineTo(x, y + targetH);
  ctx.lineTo(x, y + targetH - tickLen);
  ctx.stroke();

  // Center subtle guide text
  ctx.font = '600 12px "DM Sans", -apple-system, sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.35})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Stand in front of camera to scan', cx, cy);

  ctx.restore();
}

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
  const [isFaceTracked, setIsFaceTracked] = useState(false);
  const [unrecognizedFace, setUnrecognizedFace] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [enrollWorker, setEnrollWorker] = useState<FaceCatalogItem | null>(null);

  const isMatchingRef = useRef(false);
  const matchAttemptsRef = useRef(0);
  const candidateMatchRef = useRef<{ worker: FaceCatalogItem; confidence: number } | null>(null);

  // Toggles
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number>(0);

  // Camera States & Tracking Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  // Real-time Face Tracker Internal State
  const detectorRef = useRef<any>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const trackerRef = useRef<{
    rawTargetBox: { x: number; y: number; width: number; height: number } | null;
    smoothBox: { x: number; y: number; width: number; height: number } | null;
    lockFrames: number;
    noFaceFrames: number;
    lastMatchedEmployee: string | null;
    cooldownUntil: number;
  }>({
    rawTargetBox: null,
    smoothBox: null,
    lockFrames: 0,
    noFaceFrames: 0,
    lastMatchedEmployee: null,
    cooldownUntil: 0,
  });

  // Synchronized refs for 60 FPS animation loop
  const activeWorkerRef = useRef<FaceCatalogItem | null>(null);
  activeWorkerRef.current = activeWorker;

  const unrecognizedFaceRef = useRef<boolean>(false);
  unrecognizedFaceRef.current = unrecognizedFace;

  const confidenceRef = useRef<number>(confidence);
  confidenceRef.current = confidence;

  const submittingRef = useRef<boolean>(submitting);
  submittingRef.current = submitting;

  const targetLineRef = useRef<string>(targetLine);
  targetLineRef.current = targetLine;

  const postTargetLineRef = useRef<string>(postTargetLine);
  postTargetLineRef.current = postTargetLine;

  const catalogRef = useRef<FaceCatalogItem[]>([]);
  catalogRef.current = catalog;

  const sourceLineRef = useRef<string>(sourceLine);
  sourceLineRef.current = sourceLine;

  const modeRef = useRef<LineChangeMode>(mode);
  modeRef.current = mode;

  // Initialize Face Models (face-api.js), Native FaceDetector & Offscreen Canvas
  useEffect(() => {
    loadFaceRecognitionModels('/models').catch(() => {});

    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        detectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch {
        detectorRef.current = null;
      }
    }
    if (typeof document !== 'undefined') {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 120;
      offCanvas.height = 90;
      offscreenCanvasRef.current = offCanvas;
    }
  }, []);

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
      setSourceLine((prev) => (prev ? prev : lineList[0]?.name || ''));
      setTargetLine((prev) => (prev ? prev : (lineList[1]?.name || lineList[0]?.name || '')));

      // Auto-extract and cache real 128-D descriptors for enrolled workers with photos in background
      const enrolledWithPhotos = catList.filter((c) => c.face_enrolled === 1 && c.face_enrolled_image);
      if (enrolledWithPhotos.length > 0) {
        Promise.all(enrolledWithPhotos.map(ensureWorkerFaceDescriptor)).then((updated) => {
          setCatalog((prev) =>
            prev.map((c) => {
              const matched = updated.find((u) => u.name === c.name);
              return matched ? matched : c;
            })
          );
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize line data');
    }
  }, [effectiveDate]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Camera Initialization ──────────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    setErrorMsg('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraActive(false);
        setErrorMsg('Camera access is not supported by this browser. Ensure you are using HTTPS or localhost.');
        return;
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
        try {
          await videoRef.current.play();
          setCameraActive(true);
        } catch {
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
              setCameraActive(true);
            } catch {
              setCameraActive(false);
            }
          };
        }
      }

      // Enumerate camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoDevs);
      if (!deviceId && videoDevs.length > 0) {
        setSelectedCameraId(videoDevs[0].deviceId);
      }
    } catch (err: any) {
      setCameraActive(false);
      setErrorMsg(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser address bar.'
          : err.message || 'Camera access failed. Check browser permissions or use manual search.'
      );
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

  // ── Real Deep-Learning Face Recognition Match Trigger (3-Sec Cycle) ────
  const triggerAutoMatch = useCallback(async () => {
    // Concurrency lock: only 1 scan in flight at any time
    if (isMatchingRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const cat = catalogRef.current;
    if (!cat || cat.length === 0) return;

    // In Pre-Fixed mode, filter strictly for workers currently assigned to the source line!
    const currentSource = sourceLineRef.current;
    const enrolledWorkers = cat.filter((c) => {
      if (c.face_enrolled !== 1) return false;
      if (modeRef.current === 'pre-fixed' && currentSource) {
        return c.current_line === currentSource || c.default_line === currentSource;
      }
      return true;
    });

    isMatchingRef.current = true;
    setIsScanning(true);

    try {
      if (enrolledWorkers.length === 0) {
        // Zero workers on this line have enrolled face biometrics yet!
        setUnrecognizedFace(true);
        setActiveWorker(null);
        candidateMatchRef.current = null;
        if (soundEnabled) playChime('alert');
        // Wait 3.0 seconds before next scan
        trackerRef.current.cooldownUntil = Date.now() + 3000;
        return;
      }

      // 1. Run real neural-net feature extraction from live camera
      const extracted = await extractFaceDescriptorFromMedia(video);

      if (!extracted || !extracted.descriptor) {
        matchAttemptsRef.current += 1;
        // If face has been tracked for 2+ attempts without finding descriptor
        // (e.g. overhead lighting flare, backlighting, or harsh angle), mark as unrecognized and wait 3s
        if (matchAttemptsRef.current >= 2) {
          setUnrecognizedFace(true);
          setActiveWorker(null);
          candidateMatchRef.current = null;
          if (soundEnabled) playChime('alert');
          trackerRef.current.cooldownUntil = Date.now() + 3000;
        } else {
          // Retry in 1.2s
          trackerRef.current.cooldownUntil = Date.now() + 1200;
        }
        return;
      }

      // Reset attempts once descriptor is found
      matchAttemptsRef.current = 0;

      // 2. Perform Ultra-Strict Dual-Gate Biometric Comparison (Euclidean dist <= 0.35 AND Cosine >= 0.93)
      const matchResult = matchFaceDescriptor(extracted.descriptor, enrolledWorkers);

      if (matchResult) {
        // Multi-Frame Temporal Double-Confirmation:
        // Ensure the same candidate matches across 2 consecutive checks ~180ms apart
        if (candidateMatchRef.current?.worker.name === matchResult.worker.name) {
          // Double-confirmed! Real employee identity verified!
          candidateMatchRef.current = null;
          trackerRef.current.lastMatchedEmployee = matchResult.worker.name;
          trackerRef.current.cooldownUntil = Date.now() + 4000;
          setUnrecognizedFace(false);
          handleSelectWorker(matchResult.worker, matchResult.confidence);
        } else {
          // First candidate frame matched! Queue instant confirmation pass in 180ms
          candidateMatchRef.current = { worker: matchResult.worker, confidence: matchResult.confidence };
          trackerRef.current.cooldownUntil = Date.now() + 180;
        }
      } else {
        // Did not meet ultra-strict exact match threshold (distance > 0.35 or cosine < 0.93)
        // STRICT REJECTION: Colleague / Unauthorized Person
        candidateMatchRef.current = null;
        setUnrecognizedFace(true);
        setActiveWorker(null);
        if (soundEnabled) playChime('alert');
        // Wait 3.0 seconds before next scan
        trackerRef.current.cooldownUntil = Date.now() + 3000;
      }
    } catch (err) {
      console.warn('Real-time face recognition matching error:', err);
      candidateMatchRef.current = null;
      setUnrecognizedFace(true);
      setActiveWorker(null);
      trackerRef.current.cooldownUntil = Date.now() + 3000;
    } finally {
      isMatchingRef.current = false;
      setIsScanning(false);
    }
  }, [handleSelectWorker, soundEnabled]);

  // ── Real-time Face Tracking Loop (Sampling every 65ms) ──────────────────
  useEffect(() => {
    if (!cameraActive) {
      trackerRef.current.rawTargetBox = null;
      trackerRef.current.smoothBox = null;
      setIsFaceTracked(false);
      setUnrecognizedFace(false);
      return undefined;
    }

    const detectFace = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      if (!videoW || !videoH) return;

      let detectedBox: { x: number; y: number; width: number; height: number } | null = null;

      // 1. Try real neural network TinyFaceDetector
      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
        );
        if (detection && detection.box) {
          detectedBox = {
            x: detection.box.x,
            y: detection.box.y,
            width: detection.box.width,
            height: detection.box.height,
          };
        }
      } catch {
        // Fallback below
      }

      // 2. Native Shape Detection API if supported by browser/hardware
      if (!detectedBox && detectorRef.current) {
        try {
          const faces = await detectorRef.current.detect(video);
          if (faces && faces.length > 0) {
            const fb = faces[0].boundingBox;
            detectedBox = {
              x: fb.x,
              y: fb.y,
              width: fb.width,
              height: fb.height,
            };
          }
        } catch {
          // Fallback to optical tracker below
        }
      }

      // 3. High-speed Optical / Skin Chromaticity & Contour Centroid Tracker Fallback
      if (!detectedBox && offscreenCanvasRef.current) {
        const offCanvas = offscreenCanvasRef.current;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
          offCtx.drawImage(video, 0, 0, 120, 90);
          const imgData = offCtx.getImageData(0, 0, 120, 90);
          const data = imgData.data;

          let totalSkin = 0;
          let sumX = 0;
          let sumY = 0;
          const skinPointsX: number[] = [];
          const skinPointsY: number[] = [];

          for (let py = 6; py < 82; py += 2) {
            for (let px = 8; px < 112; px += 2) {
              const idx = (py * 120 + px) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              const sum = r + g + b + 0.0001;
              const rn = r / sum;
              const gn = g / sum;

              const isSkin =
                r > 50 &&
                g > 32 &&
                b > 18 &&
                r > g &&
                r > b &&
                rn > 0.35 &&
                rn < 0.58 &&
                gn > 0.25 &&
                gn < 0.39 &&
                r - g > 8;

              if (isSkin) {
                totalSkin += 1;
                sumX += px;
                sumY += py;
                skinPointsX.push(px);
                skinPointsY.push(py);
              }
            }
          }

          if (totalSkin >= 32) {
            const meanX = sumX / totalSkin;
            const meanY = sumY / totalSkin;

            let varX = 0;
            let varY = 0;
            for (let i = 0; i < totalSkin; i += 1) {
              varX += (skinPointsX[i] - meanX) ** 2;
              varY += (skinPointsY[i] - meanY) ** 2;
            }
            const stdX = Math.sqrt(varX / totalSkin);
            const stdY = Math.sqrt(varY / totalSkin);

            if (stdX >= 5 && stdY >= 6 && stdX <= 38 && stdY <= 40) {
              const aspect = stdY / (stdX || 1);
              if (aspect >= 0.65 && aspect <= 1.9) {
                const boxW = Math.min(videoW * 0.88, stdX * 3.4 * (videoW / 120));
                const boxH = Math.min(videoH * 0.88, stdY * 3.8 * (videoH / 90));
                const boxX = Math.max(0, (meanX / 120) * videoW - boxW / 2);
                const boxY = Math.max(0, (meanY / 90) * videoH - boxH * 0.52);

                detectedBox = {
                  x: boxX,
                  y: boxY,
                  width: boxW,
                  height: boxH,
                };
              }
            }
          }
        }
      }

      // Map detected box (in native video coords) to mirrored canvas screen coords
      const rect = canvas.getBoundingClientRect();
      const canvasW = rect.width;
      const canvasH = rect.height;

      if (detectedBox && canvasW > 0 && canvasH > 0 && videoW > 0 && videoH > 0) {
        const scale = Math.max(canvasW / videoW, canvasH / videoH);
        const renderW = videoW * scale;
        const renderH = videoH * scale;
        const offsetX = (canvasW - renderW) / 2;
        const offsetY = (canvasH - renderH) / 2;

        const unmirroredX = offsetX + detectedBox.x * scale;
        const unmirroredY = offsetY + detectedBox.y * scale;
        const targetW = detectedBox.width * scale;
        const targetH = detectedBox.height * scale;

        // Mirrored X because video has transform: scaleX(-1)
        const targetX = canvasW - (unmirroredX + targetW);

        trackerRef.current.rawTargetBox = {
          x: targetX,
          y: unmirroredY,
          width: targetW,
          height: targetH,
        };
        trackerRef.current.noFaceFrames = 0;
        setIsFaceTracked(true);
      } else {
        trackerRef.current.rawTargetBox = null;
        trackerRef.current.noFaceFrames += 1;
        if (trackerRef.current.noFaceFrames > 8) {
          setIsFaceTracked(false);
          setUnrecognizedFace(false);
          matchAttemptsRef.current = 0;
          candidateMatchRef.current = null;
          trackerRef.current.cooldownUntil = 0;
        }
      }
    };

    detectionIntervalRef.current = setInterval(detectFace, 65);
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [cameraActive]);

  // ── Real-time Canvas Rendering Loop (60 FPS with Smooth Motion) ─────────
  useEffect(() => {
    let animId: number;

    const renderLoop = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayW = Math.round(rect.width);
      const displayH = Math.round(rect.height);

      if (displayW === 0 || displayH === 0) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);

      const tracker = trackerRef.current;

      if (tracker.rawTargetBox) {
        if (!tracker.smoothBox) {
          tracker.smoothBox = { ...tracker.rawTargetBox };
        } else {
          tracker.smoothBox.x += (tracker.rawTargetBox.x - tracker.smoothBox.x) * 0.28;
          tracker.smoothBox.y += (tracker.rawTargetBox.y - tracker.smoothBox.y) * 0.28;
          tracker.smoothBox.width += (tracker.rawTargetBox.width - tracker.smoothBox.width) * 0.28;
          tracker.smoothBox.height += (tracker.rawTargetBox.height - tracker.smoothBox.height) * 0.28;
        }

        tracker.lockFrames += 1;
        const lockProgress = Math.min(1, tracker.lockFrames / 12);

        const now = Date.now();
        const nextScanSecs = Math.max(0, (tracker.cooldownUntil - now) / 1000);

        // Auto-match trigger: fires every 3 seconds while face is stably tracked!
        if (
          tracker.lockFrames >= 12 &&
          !activeWorkerRef.current &&
          !submittingRef.current &&
          !isMatchingRef.current &&
          now > tracker.cooldownUntil
        ) {
          triggerAutoMatch();
        }

        const effectiveTargetLine =
          modeRef.current === 'pre-fixed' ? targetLineRef.current : postTargetLineRef.current;

        drawFaceBiometrics(
          ctx,
          tracker.smoothBox,
          Boolean(activeWorkerRef.current),
          unrecognizedFaceRef.current,
          isMatchingRef.current,
          nextScanSecs,
          lockProgress,
          activeWorkerRef.current,
          confidenceRef.current,
          time,
          effectiveTargetLine
        );
      } else {
        if (tracker.smoothBox) {
          tracker.smoothBox = null;
        }
        tracker.lockFrames = 0;
        drawIdleScanner(ctx, displayW, displayH, time);
      }

      ctx.restore();
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [triggerAutoMatch]);

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
      candidateMatchRef.current = null;
      setCountdown(0);
      setUnrecognizedFace(false);
      trackerRef.current.smoothBox = null;
      trackerRef.current.lockFrames = 0;
      trackerRef.current.cooldownUntil = Date.now() + 2500;
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
    candidateMatchRef.current = null;
    setCountdown(0);
    setErrorMsg('');
    setSuccessMsg('');
    setUnrecognizedFace(false);
    trackerRef.current.smoothBox = null;
    trackerRef.current.lockFrames = 0;
    trackerRef.current.cooldownUntil = Date.now() + 1500;
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
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />

              {/* Inactive Camera Overlay Prompt */}
              {!cameraActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(15, 23, 42, 0.92)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                    textAlign: 'center',
                    zIndex: 6,
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: (t) => alpha(t.palette.error.main, 0.15),
                      color: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                    }}
                  >
                    <Iconify icon={"solar:videocamera-record-bold" as any} width={28} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 800, mb: 0.5 }}>
                    Camera is Inactive
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, maxWidth: 360, mb: 2 }}>
                    Please click below to activate your webcam or ensure browser camera permissions are granted.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => startCamera()}
                    startIcon={<Iconify icon={"solar:camera-bold" as any} />}
                    sx={{
                      bgcolor: COMMON_COLORS.emerald.main,
                      color: '#ffffff',
                      fontWeight: 700,
                      borderRadius: '20px',
                      px: 3,
                      '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
                    }}
                  >
                    Activate Camera
                  </Button>
                </Box>
              )}

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
                  zIndex: 4,
                }}
              >
                <Label
                  variant="filled"
                  color={
                    activeWorker
                      ? 'success'
                      : unrecognizedFace
                      ? 'error'
                      : isScanning
                      ? 'secondary'
                      : isFaceTracked
                      ? 'info'
                      : 'default'
                  }
                  sx={{ backdropFilter: 'blur(8px)', px: 1.5, py: 0.6, fontWeight: 700, fontSize: 12 }}
                >
                  {activeWorker
                    ? `✓ Verified: ${activeWorker.employee_name} (${confidence}%)`
                    : unrecognizedFace
                    ? '❌ Employee Not Found • Unassigned'
                    : isScanning
                    ? '⚲ Scanning Face Biometrics...'
                    : isFaceTracked
                    ? '⚲ Face Tracked • Ready'
                    : 'Scanning for face...'}
                </Label>

                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '16px',
                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: isFaceTracked ? COMMON_COLORS.emerald.main : '#38bdf8',
                      boxShadow: `0 0 8px ${isFaceTracked ? COMMON_COLORS.emerald.main : '#38bdf8'}`,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, fontSize: 11 }}>
                    {isFaceTracked ? 'Live Face Tracking' : 'Waiting for Face'}
                  </Typography>
                </Stack>
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
                  if (val) {
                    setUnrecognizedFace(false);
                    handleSelectWorker(val, val.face_enrolled === 1 ? 100 : 0);
                  }
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
                slotProps={{ textField: { size: 'medium', fullWidth: true } }}
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
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Auto-Advance (1.5s)
                    </Typography>
                    <Switch
                      size="small"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      color="success"
                    />
                  </Stack>
                </Stack>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>From Line (Source)</InputLabel>
                      <Select
                        label="From Line (Source)"
                        value={sourceLine}
                        size='medium'
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
                        size='medium'
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
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.75 }}>
                      <Label variant="soft" color="info">
                        Dept: {activeWorker.department || 'Production'}
                      </Label>
                      <Label variant="soft" color="secondary">
                        Current: {activeWorker.current_line_name || activeWorker.current_line || activeWorker.default_line || 'Unassigned'}
                      </Label>
                      <Label variant="soft" color={activeWorker.face_enrolled === 1 ? 'success' : 'warning'}>
                        {activeWorker.face_enrolled === 1 ? 'Biometrics Enrolled' : 'Biometrics Pending'}
                      </Label>
                      {activeWorker.face_enrolled !== 1 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<Iconify icon={"solar:camera-bold" as any} width={14} />}
                          onClick={() => setEnrollWorker(activeWorker)}
                          sx={{ fontSize: 11, py: 0.2, px: 1, borderRadius: '12px' }}
                        >
                          Enroll Face
                        </Button>
                      )}
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
            ) : unrecognizedFace ? (
              /* Unauthorized Person / Employee Not Found Alert Card */
              <Card
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: '20px',
                  border: (t) => `1.5px solid ${alpha(theme.palette.error.main, 0.45)}`,
                  bgcolor: (t) => alpha(theme.palette.error.main, 0.04),
                  boxShadow: (t) => `0 8px 24px ${alpha(theme.palette.error.main, 0.08)}`,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.error.main, 0.14),
                    color: 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Iconify icon={"solar:shield-cross-bold" as any} width={36} />
                </Box>

                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
                  <Label variant="soft" color="error" sx={{ fontWeight: 800 }}>
                    UNAUTHORIZED / UNASSIGNED
                  </Label>
                </Stack>

                <Typography variant="h5" sx={{ fontWeight: 800, color: 'error.darker', mb: 1 }}>
                  Employee Not Found
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto', mb: 3, fontSize: 13.5 }}>
                  This face does not match any authorized employee in the selected line dataset.
                  Only exact enrolled biometric profiles are permitted to proceed.
                </Typography>

                <Stack spacing={1.5} alignItems="center">
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    If this is a valid employee, select them in Manual Search below to assign or enroll:
                  </Typography>
                  <Stack direction="row" spacing={1.5} justifyContent="center">
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => {
                        if (manualSearchVal) {
                          setEnrollWorker(manualSearchVal);
                        } else {
                          const unenrolled =
                            catalog.find(
                              (c) =>
                                (c.current_line === sourceLine || c.default_line === sourceLine) &&
                                c.face_enrolled !== 1
                            ) || catalog.find((c) => c.face_enrolled !== 1);
                          if (unenrolled) {
                            setEnrollWorker(unenrolled);
                          }
                        }
                      }}
                      sx={{
                        borderRadius: '12px',
                        fontWeight: 700,
                        bgcolor: 'error.main',
                        color: '#ffffff',
                        '&:hover': {
                          bgcolor: 'error.dark',
                        },
                      }}
                    >
                      {manualSearchVal
                        ? `Enroll ${manualSearchVal.employee_name.split(' ')[0]}`
                        : 'Enroll Face Biometrics'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        setUnrecognizedFace(false);
                        trackerRef.current.lockFrames = 0;
                        trackerRef.current.cooldownUntil = Date.now() + 3000;
                      }}
                      sx={{ borderRadius: '12px' }}
                    >
                      Dismiss (Rescan in 3s)
                    </Button>
                  </Stack>
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

        {/* ── Direct Kiosk Employee Face Enrollment Dialog ── */}
        {enrollWorker && (
          <EmployeeFaceEnrollmentDialog
            open={Boolean(enrollWorker)}
            onClose={() => setEnrollWorker(null)}
            employeeId={enrollWorker.name}
            employeeName={enrollWorker.employee_name}
            department={enrollWorker.department}
            designation={enrollWorker.designation}
            currentPhoto={enrollWorker.face_enrolled_image || enrollWorker.profile_picture}
            onSuccess={() => {
              fetchFaceCatalog().then((updated) => {
                setCatalog(updated);
                const ref = updated.find((c) => c.name === enrollWorker.name);
                if (ref) setActiveWorker(ref);
              });
              setSuccessMsg(`Face biometrics enrolled successfully for ${enrollWorker.employee_name}!`);
            }}
          />
        )}
      </Container>
    </Box>
  );
}

