import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
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
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import {
  faceapi,
  compareTargetFace,
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
  effectiveTargetLine: string,
  isTargeted1to1 = false
) {
  const { x, y, width: w, height: h } = box;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const isTargetWorkerUnenrolled =
    isTargeted1to1 && (Number(worker?.face_enrolled) !== 1 || !worker?.face_descriptor);
  const isLowConfidence = Boolean(
    isLocked && worker && (confidenceVal < 50 || isTargetWorkerUnenrolled)
  );

  const primaryColor =
    isLocked && worker
      ? isLowConfidence
        ? '#f59e0b'
        : '#10b981'
      : isUnrecognized
      ? '#ef4444'
      : isScanning
      ? '#38bdf8'
      : '#06b6d4';

  ctx.save();

  // 1. Subtle perimeter boundary
  ctx.strokeStyle =
    isLocked && worker
      ? isLowConfidence
        ? 'rgba(245, 158, 11, 0.45)'
        : 'rgba(16, 185, 129, 0.35)'
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

  ctx.strokeStyle =
    isLocked && worker
      ? isLowConfidence
        ? '#f59e0b'
        : '#10b981'
      : isUnrecognized
      ? '#f59e0b'
      : '#38bdf8';
  ctx.fillStyle =
    isLocked && worker
      ? isLowConfidence
        ? 'rgba(245, 158, 11, 0.4)'
        : 'rgba(16, 185, 129, 0.4)'
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

  // 4. Internal Sweeping Laser Line (Active only while scanning/tracking, disabled once verified)
  if (!isLocked || !worker) {
    const laserNorm = (Math.sin(time * 0.0035) + 1) / 2;
    const laserY = y + 10 + laserNorm * (h - 20);
    const laserGrad = ctx.createLinearGradient(x, laserY, x + w, laserY);
    const rgb = isUnrecognized ? '245, 158, 11' : '6, 182, 212';
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
  }

  // 5. Floating Status Badge Above Face
  let badgeText = '';
  if (isLocked && worker) {
    if (isTargeted1to1) {
      if (isTargetWorkerUnenrolled) {
        badgeText = `✎ MANUAL: ${worker.employee_name} (Biometrics Pending)`;
      } else if (confidenceVal >= 50) {
        badgeText = `✓ VERIFIED: ${worker.employee_name} (${confidenceVal}%)`;
      } else {
        badgeText = `⚠ MISMATCH: ${worker.employee_name} (${confidenceVal}% match)`;
      }
    } else if (confidenceVal < 50) {
      badgeText = `⚠ LOW MATCH: ${worker.employee_name} (${confidenceVal}%)`;
    } else {
      badgeText = `✓ VERIFIED: ${worker.employee_name} (${confidenceVal}%)`;
    }
  } else if (isUnrecognized) {
    badgeText =
      nextScanSecs > 0
        ? `❌ EMPLOYEE NOT FOUND (Rescan in ${nextScanSecs.toFixed(0)}s)`
        : '❌ EMPLOYEE NOT FOUND • UNAUTHORIZED';
  } else if (isScanning) {
    badgeText =
      isTargeted1to1 && worker
        ? `⚲ VERIFYING ${worker.employee_name}...`
        : '⚲ SCANNING FACE BIOMETRICS...';
  } else if (nextScanSecs > 0) {
    badgeText = `⚲ NEXT SCAN IN ${nextScanSecs.toFixed(1)}s`;
  } else {
    badgeText = `⚲ TRACKING FACE • ${Math.round(lockProgress * 100)}%`;
  }

  ctx.font = 'bold 12px "DM Sans", -apple-system, sans-serif';
  const textW = ctx.measureText(badgeText).width;
  const badgeW = Math.max(140, textW + 24);
  const badgeH = 26;
  const badgeX = cx - badgeW / 2;
  const badgeY = Math.max(12, y - 34);

  // Badge background
  ctx.fillStyle =
    isLocked && worker
      ? isLowConfidence
        ? 'rgba(217, 119, 6, 0.95)'
        : 'rgba(16, 185, 129, 0.94)'
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
  if (isLocked && worker) {
    let subText = '';
    if (isTargeted1to1 && !isTargetWorkerUnenrolled && confidenceVal < 50) {
      subText = `⚠ Live face does not match ${worker.employee_name} (${confidenceVal}%)`;
    } else if (isTargetWorkerUnenrolled) {
      subText = `⚠ Face biometrics not enrolled for ${worker.employee_name}`;
    } else if (effectiveTargetLine) {
      subText = `${worker.current_line || worker.default_line || 'No Line'} → ${effectiveTargetLine}`;
    }

    if (subText) {
      ctx.font = 'bold 11px "DM Sans", -apple-system, sans-serif';
      const subW = ctx.measureText(subText).width + 20;
      const subH = 22;
      const subX = cx - subW / 2;
      const subY = y + h + 10;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isLowConfidence ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      drawRoundedRect(ctx, subX, subY, subW, subH, 11);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isLowConfidence ? '#fbbf24' : '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(subText, cx, subY + subH / 2);
    }
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
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryMode = searchParams.get('mode') as LineChangeMode | null;
  const queryTargetLine = searchParams.get('targetLine') || '';
  const queryFrom = searchParams.get('from');
  const queryTo = searchParams.get('to');

  const [mode, setMode] = useState<LineChangeMode>(
    queryMode === 'post-fixed' ? 'post-fixed' : 'pre-fixed'
  );
  const [openModeDialog, setOpenModeDialog] = useState(false);

  // Lines & Catalog
  const [lines, setLines] = useState<LiveLineOccupancy[]>([]);
  const [catalog, setCatalog] = useState<FaceCatalogItem[]>([]);

  // Pre-Fixed Form
  const [sourceLine, setSourceLine] = useState('');
  const [targetLine, setTargetLine] = useState(queryTargetLine);
  const [effectiveFrom, setEffectiveFrom] = useState<dayjs.Dayjs | null>(
    queryFrom && dayjs(queryFrom).isValid() ? dayjs(queryFrom) : dayjs()
  );
  const [effectiveTo, setEffectiveTo] = useState<dayjs.Dayjs | null>(
    queryTo && dayjs(queryTo).isValid() ? dayjs(queryTo) : dayjs()
  );

  // Sync mode & parameters if query param changes
  useEffect(() => {
    if (queryMode && (queryMode === 'pre-fixed' || queryMode === 'post-fixed')) {
      setMode(queryMode);
    }
    const qTarget = searchParams.get('targetLine');
    if (qTarget) setTargetLine(qTarget);
    const qFrom = searchParams.get('from');
    if (qFrom && dayjs(qFrom).isValid()) setEffectiveFrom(dayjs(qFrom));
    const qTo = searchParams.get('to');
    if (qTo && dayjs(qTo).isValid()) setEffectiveTo(dayjs(qTo));
  }, [queryMode, searchParams]);

  // If accessed directly without mode query param, open the selection dialog
  useEffect(() => {
    if (!searchParams.get('mode')) {
      setOpenModeDialog(true);
    }
  }, [searchParams]);

  // Post-Fixed Form
  const [postTargetLine, setPostTargetLine] = useState('');

  // Recognition States
  const [activeWorker, setActiveWorker] = useState<FaceCatalogItem | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isFaceTracked, setIsFaceTracked] = useState(false);
  const [unrecognizedFace, setUnrecognizedFace] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enrollWorker, setEnrollWorker] = useState<FaceCatalogItem | null>(null);
  const [targetedWorker, setTargetedWorker] = useState<FaceCatalogItem | null>(null);

  const isMatchingRef = useRef(false);
  const matchAttemptsRef = useRef(0);
  const candidateMatchRef = useRef<{ worker: FaceCatalogItem; confidence: number } | null>(null);

  // Toggles
  const [autoAdvance] = useState(false);
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

  const targetedWorkerRef = useRef<FaceCatalogItem | null>(null);
  targetedWorkerRef.current = targetedWorker;

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
        fetchLiveLineOccupancy(effectiveFrom?.format('YYYY-MM-DD')),
        fetchFaceCatalog(),
      ]);
      setLines(lineList);
      setCatalog(catList);

      // Auto-set default source and target line if available
      setSourceLine((prev) => (prev ? prev : ''));
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
      enqueueSnackbar(err.message || 'Failed to initialize line data', { variant: 'error' });
    }
  }, [effectiveFrom, enqueueSnackbar]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Camera Initialization ──────────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraActive(false);
        enqueueSnackbar('Camera access is not supported by this browser. Ensure you are using HTTPS or localhost.', {
          variant: 'error',
        });
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
      enqueueSnackbar(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser address bar.'
          : err.message || 'Camera access failed. Check browser permissions or use manual search.',
        { variant: 'error' }
      );
    }
  }, [enqueueSnackbar]);

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
      if (soundEnabled && matchConfidence >= 50) playChime('success');

      // In Post-Fixed mode, default postTargetLine to a line different from their current line
      if (mode === 'post-fixed') {
        const otherLine = lines.find((l) => l.name !== (worker.current_line || worker.default_line));
        if (otherLine) setPostTargetLine(otherLine.name);
      }

      // If in Pre-Fixed mode, handle auto-advance or target conflict
      if (mode === 'pre-fixed') {
        const workerLine = worker.current_line || worker.default_line || '';
        if (targetLine && targetLine === workerLine) {
          enqueueSnackbar(`${worker.employee_name} is already assigned to ${targetLine}.`, { variant: 'warning' });
          setCountdown(0);
        } else if (sourceLine && workerLine && workerLine !== sourceLine) {
          enqueueSnackbar(`Identified ${worker.employee_name} (Current: ${workerLine}). Reassigning to ${targetLine}.`, { variant: 'info' });
          if (autoAdvance && targetLine && matchConfidence >= 50) {
            setCountdown(1.5);
          }
        } else if (autoAdvance && targetLine && matchConfidence >= 50) {
          setCountdown(1.5);
        }
      }
    },
    [autoAdvance, enqueueSnackbar, lines, mode, soundEnabled, sourceLine, targetLine]
  );

  // ── Real Deep-Learning Face Recognition Match Trigger (3-Sec Cycle or Manual) ────
  const triggerAutoMatch = useCallback(
    async (isManual = false) => {
      // Concurrency lock: only 1 scan in flight at any time
      if (isMatchingRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (isManual) {
          enqueueSnackbar('Camera is not ready yet. Please wait a moment.', { variant: 'warning' });
        }
        return;
      }

      const cat = catalogRef.current;
      if (!cat || cat.length === 0) return;

      // Search ALL enrolled workers across the company biometric dataset
      const enrolledWorkers = cat.filter((c) => c.face_enrolled === 1 && c.face_descriptor);

      isMatchingRef.current = true;
      setIsScanning(true);

      try {
        if (enrolledWorkers.length === 0) {
          setUnrecognizedFace(true);
          setActiveWorker(null);
          candidateMatchRef.current = null;
          if (soundEnabled) playChime('alert');
          trackerRef.current.cooldownUntil = Date.now() + 3000;
          if (isManual) {
            enqueueSnackbar('No enrolled face biometrics found in catalog.', { variant: 'warning' });
          }
          return;
        }

        // 1. Run real neural-net feature extraction from live camera
        const extracted = await extractFaceDescriptorFromMedia(video);

        if (!extracted || !extracted.descriptor) {
          matchAttemptsRef.current += 1;
          if (isManual) {
            enqueueSnackbar('No face clearly detected. Please face the camera directly.', { variant: 'info' });
          }
          if (matchAttemptsRef.current >= 2) {
            setUnrecognizedFace(true);
            setActiveWorker(null);
            candidateMatchRef.current = null;
            if (soundEnabled) playChime('alert');
            trackerRef.current.cooldownUntil = Date.now() + 3000;
          } else {
            trackerRef.current.cooldownUntil = Date.now() + 1200;
          }
          return;
        }

        // Reset attempts once descriptor is found
        matchAttemptsRef.current = 0;

        // 2. Perform Biometric Comparison against enrolled dataset
        const matchResult = matchFaceDescriptor(extracted.descriptor, enrolledWorkers);

        if (matchResult) {
          if (isManual || candidateMatchRef.current?.worker.name === matchResult.worker.name) {
            // Double-confirmed or manual trigger! Real employee identity verified!
            candidateMatchRef.current = null;
            trackerRef.current.lastMatchedEmployee = matchResult.worker.name;
            trackerRef.current.cooldownUntil = Date.now() + 4000;
            setUnrecognizedFace(false);
            setTargetedWorker(null);
            setManualSearchVal(null);
            handleSelectWorker(matchResult.worker, matchResult.confidence);
          } else {
            // First candidate frame matched! Queue instant confirmation pass in 180ms
            candidateMatchRef.current = { worker: matchResult.worker, confidence: matchResult.confidence };
            trackerRef.current.cooldownUntil = Date.now() + 180;
          }
        } else {
          // Did not meet exact match threshold: Colleague / Unauthorized Person
          candidateMatchRef.current = null;
          setUnrecognizedFace(true);
          setActiveWorker(null);
          if (soundEnabled) playChime('alert');
          trackerRef.current.cooldownUntil = Date.now() + 3000;
          if (isManual) {
            enqueueSnackbar('Face not recognized in enrolled dataset.', { variant: 'warning' });
          }
        }
      } catch (err) {
        console.warn('Real-time face recognition matching error:', err);
        candidateMatchRef.current = null;
        setUnrecognizedFace(true);
        setActiveWorker(null);
        trackerRef.current.cooldownUntil = Date.now() + 3000;
        if (isManual) {
          enqueueSnackbar('Face recognition scan error. Please try again.', { variant: 'error' });
        }
      } finally {
        isMatchingRef.current = false;
        setIsScanning(false);
      }
    },
    [handleSelectWorker, soundEnabled, enqueueSnackbar]
  );

  // ── 1:1 Targeted Face Biometric Verification Trigger (Manual Search Fallback) ──
  const trigger1to1TargetMatch = useCallback(
    async (targetWorker: FaceCatalogItem, isManual = false) => {
      if (isMatchingRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (isManual) {
          enqueueSnackbar('Camera is not ready yet. Please wait a moment.', { variant: 'warning' });
        }
        return;
      }

      // Ensure worker has a valid 128-D descriptor if enrolled with image
      let readyWorker = targetWorker;
      if (
        readyWorker.face_enrolled === 1 &&
        readyWorker.face_enrolled_image &&
        (!readyWorker.face_descriptor ||
          (Array.isArray(readyWorker.face_descriptor) && readyWorker.face_descriptor.length !== 128))
      ) {
        try {
          readyWorker = await ensureWorkerFaceDescriptor(readyWorker);
          setCatalog((prev) => prev.map((c) => (c.name === readyWorker.name ? readyWorker : c)));
        } catch {
          // Fall through
        }
      }

      if (readyWorker.face_enrolled !== 1 || !readyWorker.face_descriptor) {
        setConfidence(0);
        if (isManual) {
          enqueueSnackbar(`Biometrics pending for ${readyWorker.employee_name}. Manual fallback active.`, {
            variant: 'info',
          });
        }
        return;
      }

      isMatchingRef.current = true;
      setIsScanning(true);

      try {
        const extracted = await extractFaceDescriptorFromMedia(video);

        if (!extracted || !extracted.descriptor) {
          if (isManual) {
            enqueueSnackbar('No face clearly detected in camera. Please face the camera directly.', {
              variant: 'info',
            });
          }
          trackerRef.current.cooldownUntil = Date.now() + 1200;
          return;
        }

        // Run 1:1 biometric comparison strictly against target employee
        const matchResult = compareTargetFace(extracted.descriptor, readyWorker);

        if (matchResult) {
          setConfidence(matchResult.matchPercent);

          if (matchResult.matchPercent >= 50) {
            if (soundEnabled) playChime('success');
            trackerRef.current.cooldownUntil = Date.now() + 4000;
          } else {
            // Live face does not match the target employee (Colleague / Impersonation Mismatch)
            trackerRef.current.cooldownUntil = Date.now() + 1500;
          }
        }
      } catch (err) {
        console.warn('1:1 Face verification scan error:', err);
        trackerRef.current.cooldownUntil = Date.now() + 2000;
        if (isManual) {
          enqueueSnackbar('Face verification scan error. Please try again.', { variant: 'error' });
        }
      } finally {
        isMatchingRef.current = false;
        setIsScanning(false);
      }
    },
    [enqueueSnackbar, soundEnabled]
  );

  // ── Manual Scan Trigger ────────────────────────────────────────────────
  const handleManualScanNow = useCallback(async () => {
    if (isMatchingRef.current) return;
    if (targetedWorkerRef.current) {
      setConfidence(0);
      trackerRef.current.cooldownUntil = 0;
      trackerRef.current.lockFrames = 0;
      await trigger1to1TargetMatch(targetedWorkerRef.current, true);
    } else {
      // Clear previous verified worker state so UI immediately resets/refreshes
      setActiveWorker(null);
      setManualSearchVal(null);
      setTargetedWorker(null);
      setCountdown(0);
      setUnrecognizedFace(false);
      candidateMatchRef.current = null;
      matchAttemptsRef.current = 0;
      trackerRef.current.cooldownUntil = 0;
      trackerRef.current.lockFrames = 0;
      trackerRef.current.lastMatchedEmployee = null;
      await triggerAutoMatch(true);
    }
  }, [trigger1to1TargetMatch, triggerAutoMatch]);

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
          !submittingRef.current &&
          !isMatchingRef.current &&
          now > tracker.cooldownUntil
        ) {
          if (targetedWorkerRef.current) {
            // Continuous 1:1 verification when worker is targeted in manual search
            if (confidenceRef.current < 50) {
              trigger1to1TargetMatch(targetedWorkerRef.current, false);
            }
          } else if (!activeWorkerRef.current) {
            triggerAutoMatch();
          }
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
          effectiveTargetLine,
          Boolean(targetedWorkerRef.current)
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
  }, [triggerAutoMatch, trigger1to1TargetMatch]);

  // ── Execute Line Change ────────────────────────────────────────────────
  const handleConfirmTransfer = useCallback(async () => {
    if (!activeWorker) return;

    const chosenTargetLine = mode === 'pre-fixed' ? targetLine : postTargetLine;
    const workerCurrentLine = activeWorker.current_line || activeWorker.default_line || '';

    if (!chosenTargetLine) {
      enqueueSnackbar('Please select a target line.', { variant: 'warning' });
      if (soundEnabled) playChime('alert');
      return;
    }

    if (chosenTargetLine === workerCurrentLine) {
      enqueueSnackbar(`${activeWorker.employee_name} is already assigned to ${chosenTargetLine}.`, { variant: 'warning' });
      if (soundEnabled) playChime('alert');
      return;
    }

    setSubmitting(true);

    try {
      const res = await executeFaceRecognitionLineChange({
        employee: activeWorker.name,
        target_line: chosenTargetLine,
        effective_from: effectiveFrom?.format('YYYY-MM-DD'),
        effective_to: effectiveTo?.format('YYYY-MM-DD'),
        source_line: workerCurrentLine,
        mode: mode === 'pre-fixed' ? 'Pre-Fixed' : 'Post-Fixed',
      });

      if (soundEnabled) playChime('success');
      enqueueSnackbar(res?.message || `Transferred to ${chosenTargetLine}`, { variant: 'success' });

      // Append to session logs
      const logItem: SessionLogItem = {
        roster_id: res?.roster_name || '',
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
      fetchLiveLineOccupancy(effectiveFrom?.format('YYYY-MM-DD')).then(setLines).catch(() => {});

      // Clear active worker to scan next
      setActiveWorker(null);
      setManualSearchVal(null);
      setTargetedWorker(null);
      candidateMatchRef.current = null;
      setCountdown(0);
      setUnrecognizedFace(false);
      trackerRef.current.smoothBox = null;
      trackerRef.current.lockFrames = 0;
      trackerRef.current.cooldownUntil = Date.now() + 2500;
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || err?.error || 'Failed to execute line change';
      enqueueSnackbar(msg, { variant: 'error' });
      if (soundEnabled) playChime('alert');
    } finally {
      setSubmitting(false);
    }
  }, [activeWorker, mode, targetLine, postTargetLine, soundEnabled, effectiveFrom, effectiveTo, enqueueSnackbar]);

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
        effective_from: effectiveFrom?.format('YYYY-MM-DD'),
      });

      // Remove from session logs
      setSessionLogs((prev) => prev.filter((item) => item.roster_id !== log.roster_id));
      enqueueSnackbar(`Undone! ${log.employee_name} restored to ${log.previous_line || 'default'}.`, { variant: 'success' });
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
      fetchLiveLineOccupancy(effectiveFrom?.format('YYYY-MM-DD')).then(setLines).catch(() => {});
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || err?.error || 'Failed to undo assignment';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setUndoingId(null);
    }
  };

  const handleSkipWorker = () => {
    setActiveWorker(null);
    setManualSearchVal(null);
    setTargetedWorker(null);
    candidateMatchRef.current = null;
    setCountdown(0);
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
          </Stack>
          
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Face Recognition Line Change
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {mode === 'pre-fixed'
                  ? 'Pre-Fixed Mode: Continuous batch worker reassignment with auto-advance'
                  : 'Post-Fixed Mode: Dynamic reassignment with live line occupancy monitoring'}
              </Typography>
            </Box>

          {/* Active Mode Badge & Change Mode Action */}
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
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
        </Stack>
      </Box>

      {/* ── Main Container ── */}
      <Container maxWidth="xl">

      <Grid container spacing={3}>
        {/* ── LEFT PANEL: Live Camera & Recognition Viewfinder ── */}
        <Grid size={{ xs: 12, md: 8 }}>
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
                height: { xs: 400, sm: 460, md: 500 },
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
                      ? targetedWorker
                        ? Number(targetedWorker.face_enrolled) !== 1 || !targetedWorker.face_descriptor
                          ? 'warning'
                          : confidence < 50
                          ? 'warning'
                          : 'success'
                        : confidence < 50
                        ? 'warning'
                        : 'success'
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
                    ? targetedWorker
                      ? Number(targetedWorker.face_enrolled) !== 1 || !targetedWorker.face_descriptor
                        ? `✎ Biometrics Pending: ${activeWorker.employee_name}`
                        : confidence >= 50
                        ? `✓ 1:1 Verified: ${activeWorker.employee_name} (${confidence}%)`
                        : `⚠ Face Mismatch: ${activeWorker.employee_name} (${confidence}% match)`
                      : `✓ Verified: ${activeWorker.employee_name} (${confidence}%)`
                    : unrecognizedFace
                    ? 'Employee Not Found • Unassigned'
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
                    {targetedWorker
                      ? Number(targetedWorker.face_enrolled) !== 1 || !targetedWorker.face_descriptor
                        ? 'Manual Search Mode'
                        : confidence >= 50
                        ? '1:1 Verified'
                        : '1:1 Live Verification'
                      : isFaceTracked
                      ? 'Live Face Tracking'
                      : 'Waiting for Face'}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* Scan Now Manual Trigger Button */}
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!cameraActive || isScanning}
                onClick={handleManualScanNow}
                startIcon={
                  isScanning ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Iconify icon={"solar:face-scan-circle-bold" as any} width={22} />
                  )
                }
                sx={{
                  bgcolor: COMMON_COLORS.emerald.main,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 15,
                  py: 1.25,
                  borderRadius: '12px',
                  boxShadow: `0 4px 14px ${alpha(COMMON_COLORS.emerald.main, 0.35)}`,
                  '&:hover': {
                    bgcolor: COMMON_COLORS.emerald.dark,
                  },
                }}
              >
                {isScanning ? 'Scanning Face...' : 'Scan Now'}
              </Button>

              {activeWorker && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleSkipWorker}
                  startIcon={<Iconify icon={"solar:restart-bold" as any} width={18} />}
                  sx={{
                    px: 2.5,
                    borderRadius: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Rescan
                </Button>
              )}
            </Stack>

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
                onChange={async (_, val) => {
                  setManualSearchVal(val);
                  if (val) {
                    setUnrecognizedFace(false);
                    setTargetedWorker(val);
                    handleSelectWorker(val, 0);
                    await trigger1to1TargetMatch(val, true);
                  } else {
                    setTargetedWorker(null);
                    setActiveWorker(null);
                    setConfidence(0);
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
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.5}>
            {/* Active Mode & Target Line Preset Banner */}
            <Card
              sx={{
                p: 1.75,
                borderRadius: '16px',
                border: (t) =>
                  `1.5px solid ${
                    mode === 'pre-fixed'
                      ? alpha(COMMON_COLORS.emerald.main, 0.28)
                      : alpha('#8b5cf6', 0.28)
                  }`,
                bgcolor: (t) =>
                  mode === 'pre-fixed'
                    ? alpha(COMMON_COLORS.emerald.main, 0.04)
                    : alpha('#8b5cf6', 0.04),
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                  <Label
                    variant="soft"
                    color={mode === 'pre-fixed' ? 'success' : 'secondary'}
                    sx={{ fontWeight: 800, fontSize: 12 }}
                  >
                    {mode === 'pre-fixed' ? 'Pre-Fixed Mode' : 'Post-Fixed Mode'}
                  </Label>

                  {mode === 'pre-fixed' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Target:
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.main }}
                      >
                        {lines.find((l) => l.name === targetLine)?.line_name || targetLine || 'Not selected'}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Iconify icon={"solar:calendar-date-bold" as any} width={15} sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {effectiveFrom?.format('DD-MM-YYYY') === effectiveTo?.format('DD-MM-YYYY')
                        ? effectiveFrom?.format('DD-MM-YYYY')
                        : `${effectiveFrom?.format('DD-MM-YYYY')} - ${effectiveTo?.format('DD-MM-YYYY')}`}
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setOpenModeDialog(true)}
                  startIcon={<Iconify icon={"solar:pen-bold" as any} width={14} />}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    py: 0.4,
                    px: 1.25,
                    flexShrink: 0,
                    borderColor: mode === 'pre-fixed' ? COMMON_COLORS.emerald.main : '#8b5cf6',
                    color: mode === 'pre-fixed' ? COMMON_COLORS.emerald.main : '#8b5cf6',
                    '&:hover': {
                      borderColor: mode === 'pre-fixed' ? COMMON_COLORS.emerald.dark : '#7c3aed',
                      bgcolor: alpha(mode === 'pre-fixed' ? COMMON_COLORS.emerald.main : '#8b5cf6', 0.08),
                    },
                  }}
                >
                  Change
                </Button>
              </Stack>
            </Card>

            {/* ── RECOGNIZED WORKER CARD ── */}
            {activeWorker ? (
              <Card
                sx={{
                  p: 3,
                  borderRadius: '20px',
                  border: (t) =>
                    targetedWorker && confidence < 50
                      ? '1.5px solid #f59e0b'
                      : `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                  bgcolor: 'background.paper',
                  boxShadow: '0 8px 30px 0 rgba(0, 0, 0, 0.08)',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={activeWorker.profile_picture || activeWorker.face_enrolled_image}
                    alt={activeWorker.employee_name}
                    sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: 'primary.light', flexShrink: 0 }}
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mt: 1 }}>
                      <Label variant="soft" color="info">
                        Dept: {activeWorker.department || 'Production'}
                      </Label>
                      <Label variant="soft" color="secondary">
                        Current: {activeWorker.current_line_name || activeWorker.current_line || activeWorker.default_line || 'Unassigned'}
                      </Label>
                      <Label variant="soft" color={activeWorker.face_enrolled === 1 ? 'success' : 'warning'}>
                        {activeWorker.face_enrolled === 1 ? 'Biometrics Enrolled' : 'Biometrics Pending'}
                      </Label>
                      {targetedWorker && activeWorker.face_enrolled === 1 && (
                        <Label
                          variant="filled"
                          color={confidence >= 50 ? 'success' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        >
                          {confidence >= 50
                            ? `✓ Match: ${confidence}%`
                            : `⚠ Mismatch: ${confidence}% match`}
                        </Label>
                      )}
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
                    </Box>
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

                {/* ── POST-FIXED MODE: Target Line Selection Autocomplete ── */}
                {mode === 'post-fixed' && (
                  <Box sx={{ mt: 2.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}
                    >
                      Choose Destination Line for this worker:
                    </Typography>
                    <Autocomplete
                      fullWidth
                      options={lines}
                      value={lines.find((l) => l.name === postTargetLine) || null}
                      onChange={(_, val) => setPostTargetLine(val ? val.name : '')}
                      getOptionLabel={(option) => `${option.line_name} (${option.assigned_count} workers)`}
                      isOptionEqualToValue={(option, val) => option.name === val.name}
                      getOptionDisabled={(option) =>
                        option.name === (activeWorker.current_line || activeWorker.default_line)
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search or select destination line..."
                          helperText={
                            postTargetLine
                              ? undefined
                              : "Select the worker's destination line to confirm transfer"
                          }
                        />
                      )}
                    />
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
          lines={lines}
          initialTargetLine={targetLine}
          initialEffectiveFrom={effectiveFrom}
          initialEffectiveTo={effectiveTo}
          onClose={() => setOpenModeDialog(false)}
          onSelectMode={(newMode, config) => {
            setOpenModeDialog(false);
            setMode(newMode);
            if (config?.targetLine) {
              setTargetLine(config.targetLine);
            }
            if (config?.effectiveFrom) {
              setEffectiveFrom(dayjs(config.effectiveFrom));
            }
            if (config?.effectiveTo) {
              setEffectiveTo(dayjs(config.effectiveTo));
            }
            const newParams: Record<string, string> = { mode: newMode };
            if (config?.targetLine) newParams.targetLine = config.targetLine;
            if (config?.effectiveFrom) newParams.from = config.effectiveFrom;
            if (config?.effectiveTo) newParams.to = config.effectiveTo;
            setSearchParams(newParams);
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
              enqueueSnackbar(`Face biometrics enrolled successfully for ${enrollWorker.employee_name}!`, {
                variant: 'success',
              });
            }}
          />
        )}
      </Container>
    </Box>
  );
}

