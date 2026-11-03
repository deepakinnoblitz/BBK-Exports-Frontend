import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme, keyframes } from '@mui/material/styles';

import {
  faceapi,
  normalizeEmbedding,
  loadFaceRecognitionModels,
  extractFaceDescriptorFromMedia,
} from 'src/utils/face-recognition';

import { COMMON_COLORS } from 'src/theme';
import { saveEmployeeFaceEmbedding } from 'src/api/line-roster';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

type Props = {
  open: boolean;
  onClose: VoidFunction;
  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;
  currentPhoto?: string;
  saveImmediately?: boolean;
  onSuccess: (data: {
    face_enrolled?: number;
    face_enrolled_image?: string;
    face_enrolled_at?: string;
    face_descriptor?: number[];
    face_3d_landmarks?: any;
  }) => void;
};

export function EmployeeFaceEnrollmentDialog({
  open,
  onClose,
  employeeId,
  employeeName,
  department,
  designation,
  currentPhoto,
  saveImmediately = false,
  onSuccess,
}: Props) {
  const theme = useTheme();

  // Mode: 'camera' | 'upload'
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'upload'>('camera');

  // Camera stream & devices
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Snapshot, Cropper & review states
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isAutoCentering, setIsAutoCentering] = useState(false);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const startDragRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    setCameraError('');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported by your browser.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);

      // Enumerate camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoDevs);
      if (!deviceId && videoDevs.length > 0) {
        setSelectedCameraId(videoDevs[0].deviceId);
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(err.message || 'Unable to access camera. Check device permissions.');
    }
  }, [stopCamera]);

  // Start camera on open & preload face models
  useEffect(() => {
    if (open) {
      loadFaceRecognitionModels('/models').catch(() => {});
    }
    if (open && captureMethod === 'camera' && !capturedImage && !isCropping && !rawImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, captureMethod, capturedImage, isCropping, rawImage, startCamera, stopCamera]);

  // Cleanup on close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setRawImage(null);
    setIsCropping(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setCountdown(0);
    setStatusMsg(null);
    onClose();
  };

  // Smart Auto-Center Face using face-api
  const autoCenterFaceOnImage = useCallback(async (imgSrc: string) => {
    try {
      setIsAutoCentering(true);
      const img = new Image();
      img.src = imgSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const detection = await faceapi.detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.25 })
      );

      if (detection && detection.box) {
        const box = detection.box;
        const targetSize = 400;
        const baseScale = Math.max(targetSize / img.width, targetSize / img.height);

        // Center of detected face relative to image center
        const faceCenterX = box.x + box.width / 2 - img.width / 2;
        const faceCenterY = box.y + box.height / 2 - img.height / 2;

        // Target face height inside 400x400 canvas: ~52% (approx 210px)
        const targetZoom = Math.max(1, Math.min(2.8, (targetSize * 0.52) / (box.height * baseScale)));
        setZoom(targetZoom);
        setPan({
          x: Math.round(-faceCenterX * baseScale * targetZoom),
          y: Math.round(-faceCenterY * baseScale * targetZoom + 16),
        });
        setRotation(0);
      }
    } catch (err) {
      console.warn('Auto face centering error:', err);
    } finally {
      setIsAutoCentering(false);
    }
  }, []);

  // Capture frame from video to canvas
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame (horizontal mirror if selfie mode)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setRawImage(dataUrl);
    setCapturedImage(null);
    setIsCropping(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    stopCamera();

    setTimeout(() => {
      autoCenterFaceOnImage(dataUrl);
    }, 120);
  };

  // Start countdown shutter
  const handleTriggerCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCaptureSnapshot();
          return 0;
        }
        return prev - 1;
      });
    }, 900);
  };

  // Handle file upload (Live crop tool works on uploaded files too!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ severity: 'error', text: 'Please select a valid image file (JPG or PNG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        setRawImage(dataUrl);
        setCapturedImage(null);
        setIsCropping(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        stopCamera();

        setTimeout(() => {
          autoCenterFaceOnImage(dataUrl);
        }, 120);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Retake photo / start over
  const handleRetake = () => {
    setCapturedImage(null);
    setRawImage(null);
    setIsCropping(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setStatusMsg(null);
    if (captureMethod === 'camera') {
      startCamera(selectedCameraId);
    }
  };

  // Open cropper again to adjust framing
  const handleReCrop = () => {
    setIsCropping(true);
  };

  // Apply Crop: draws current pan/zoom/rotation to 400x400 square JPEG
  const handleApplyCrop = () => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(croppedDataUrl);
    setIsCropping(false);
  };

  // Drag & Pan handlers on Canvas (Pointer events support mouse & touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startDragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - startDragRef.current.x,
      y: e.clientY - startDragRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Render crop preview canvas whenever rawImage, zoom, pan, or rotation changes
  useEffect(() => {
    if (!isCropping || !rawImage) return;

    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;

      ctx.clearRect(0, 0, 400, 400);
      ctx.save();
      ctx.translate(200, 200);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const scale = Math.max(400 / img.width, 400 / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
  }, [isCropping, rawImage, zoom, pan, rotation]);

  // Submit enrollment (supports immediate DB save OR deferred form staging)
  const handleSaveEnrollment = async () => {
    if (!capturedImage) return;

    setSubmitting(true);
    setStatusMsg(null);

    try {
      // Extract real 128-D neural network biometric embedding
      let realDescriptor: number[] | null = null;
      let landmarksData: any = null;

      const img = new Image();
      img.src = capturedImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const extracted = await extractFaceDescriptorFromMedia(img);
      if (!extracted || !extracted.descriptor) {
        setStatusMsg({
          severity: 'error',
          text: 'No clear face detected in the cropped photo. Please click "Adjust Crop" to center eyes and mouth inside the guide.',
        });
        setSubmitting(false);
        return;
      }

      realDescriptor = Array.from(normalizeEmbedding(extracted.descriptor));
      landmarksData = extracted.landmarks;

      const enrolledTimestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');

      if (saveImmediately) {
        // Direct DB save (e.g. from Employee Profile tab or kiosk)
        const res = await saveEmployeeFaceEmbedding({
          employee: employeeId,
          face_descriptor: realDescriptor,
          face_3d_landmarks: landmarksData,
          face_image: capturedImage,
        });

        setStatusMsg({ severity: 'success', text: res.message || 'Face biometrics enrolled successfully!' });

        setTimeout(() => {
          onSuccess({
            face_enrolled: 1,
            face_enrolled_image: res.face_enrolled_image || capturedImage,
            face_enrolled_at: res.face_enrolled_at || enrolledTimestamp,
            face_descriptor: realDescriptor,
            face_3d_landmarks: landmarksData,
          });
          handleClose();
        }, 800);
      } else {
        // Deferred save: Staged in parent form. DB is saved ONLY when user clicks 'Update Employee' button!
        setStatusMsg({ severity: 'success', text: 'Face biometrics captured! Click "Update Employee" to save.' });

        setTimeout(() => {
          onSuccess({
            face_enrolled: 1,
            face_enrolled_image: capturedImage,
            face_enrolled_at: enrolledTimestamp,
            face_descriptor: realDescriptor,
            face_3d_landmarks: landmarksData,
          });
          handleClose();
        }, 600);
      }
    } catch (err: any) {
      setStatusMsg({ severity: 'error', text: err.message || 'Failed to process face enrollment.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 42,
              height: 42,
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
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Enroll Face Biometrics
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Capture and register biometric face profile for <strong>{employeeName}</strong> ({employeeId})
            </Typography>
          </Box>
        </Stack>

        <IconButton onClick={handleClose} sx={{ color: theme.palette.grey[500] }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        <Stack spacing={2.5}>
          {/* Employee Summary Card */}
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
              border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  src={currentPhoto}
                  alt={employeeName}
                  sx={{ width: 48, height: 48, border: `2px solid ${COMMON_COLORS.emerald.main}` }}
                >
                  {employeeName.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {employeeName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    ID: {employeeId} • {designation || 'Staff'} • {department || 'Department'}
                  </Typography>
                </Box>
              </Stack>

              <Label color="warning" variant="soft" startIcon={<Iconify icon={"solar:shield-warning-bold" as any} />}>
                Enrollment Pending
              </Label>
            </Stack>
          </Card>

          {/* Status Message Alert */}
          {statusMsg && (
            <Alert severity={statusMsg.severity} onClose={() => setStatusMsg(null)}>
              {statusMsg.text}
            </Alert>
          )}

          {/* Capture Method Switcher (Camera vs Upload) */}
          {!capturedImage && !isCropping && (
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button
                variant={captureMethod === 'camera' ? 'contained' : 'outlined'}
                size="small"
                startIcon={<Iconify icon={"solar:camera-bold" as any} />}
                onClick={() => {
                  setCaptureMethod('camera');
                  startCamera();
                }}
                sx={{
                  borderRadius: '20px',
                  fontWeight: 700,
                  bgcolor: captureMethod === 'camera' ? COMMON_COLORS.emerald.main : 'transparent',
                  '&:hover': {
                    bgcolor: captureMethod === 'camera' ? COMMON_COLORS.emerald.dark : alpha(COMMON_COLORS.emerald.main, 0.08),
                  },
                }}
              >
                Live Webcam Capture
              </Button>

              <Button
                variant={captureMethod === 'upload' ? 'contained' : 'outlined'}
                size="small"
                startIcon={<Iconify icon={"solar:upload-track-2-bold" as any} />}
                onClick={() => {
                  setCaptureMethod('upload');
                  stopCamera();
                }}
                sx={{
                  borderRadius: '20px',
                  fontWeight: 700,
                  bgcolor: captureMethod === 'upload' ? COMMON_COLORS.emerald.main : 'transparent',
                  '&:hover': {
                    bgcolor: captureMethod === 'upload' ? COMMON_COLORS.emerald.dark : alpha(COMMON_COLORS.emerald.main, 0.08),
                  },
                }}
              >
                Upload Photo File
              </Button>
            </Stack>
          )}

          {/* ── Viewport: Camera Stream, Interactive Cropper, or Review ── */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: isCropping ? 430 : 380,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: (t) => `2px solid ${alpha(t.palette.grey[500], 0.2)}`,
            }}
          >
            {isCropping && rawImage ? (
              // 1. Interactive Face Cropping Viewport
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                }}
              >
                {/* Crop Framing Box */}
                <Box
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  sx={{
                    position: 'relative',
                    width: { xs: 260, sm: 300 },
                    height: { xs: 260, sm: 300 },
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    cursor: 'grab',
                    touchAction: 'none',
                    bgcolor: '#000000',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    border: `2px solid ${COMMON_COLORS.emerald.main}`,
                    '&:active': { cursor: 'grabbing' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <canvas
                    ref={cropCanvasRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Face Oval Framing Guide Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: '70%',
                      height: '84%',
                      borderRadius: '50%',
                      border: `2px dashed ${alpha(COMMON_COLORS.emerald.main, 0.85)}`,
                      boxShadow: `0 0 20px ${alpha(COMMON_COLORS.emerald.main, 0.35)}`,
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Horizontal Eye Guideline */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '40%',
                        left: '15%',
                        right: '15%',
                        height: 1,
                        borderTop: '1px dashed rgba(255,255,255,0.4)',
                      }}
                    />
                  </Box>

                  {/* Top-left Hint */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 10,
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)',
                      pointerEvents: 'none',
                    }}
                  >
                    Drag to Pan
                  </Box>
                </Box>

                {/* Toolbar Controls under canvas */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: '100%',
                    maxWidth: 420,
                    mt: 1.5,
                    px: 1.5,
                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                    borderRadius: 2,
                    py: 0.75,
                  }}
                >
                  <Iconify icon={"solar:magnifer-zoom-out-bold" as any} width={18} sx={{ color: 'text.secondary' }} />
                  <Slider
                    size="small"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(_, val) => setZoom(val as number)}
                    sx={{
                      color: COMMON_COLORS.emerald.main,
                      flex: 1,
                      '& .MuiSlider-thumb': { width: 14, height: 14 },
                    }}
                  />
                  <Iconify icon={"solar:magnifer-zoom-in-bold" as any} width={18} sx={{ color: 'text.secondary' }} />

                  <Tooltip title="Auto-Detect & Center Face">
                    <span>
                      <Button
                        size="small"
                        disabled={isAutoCentering}
                        onClick={() => rawImage && autoCenterFaceOnImage(rawImage)}
                        startIcon={
                          isAutoCentering ? (
                            <CircularProgress size={12} color="inherit" />
                          ) : (
                            <Iconify icon={"solar:magic-stick-3-bold" as any} width={14} />
                          )
                        }
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          py: 0.4,
                          px: 1.2,
                          bgcolor: alpha(COMMON_COLORS.emerald.main, 0.2),
                          color: COMMON_COLORS.emerald.light,
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          '&:hover': { bgcolor: alpha(COMMON_COLORS.emerald.main, 0.35) },
                        }}
                      >
                        Auto-Center
                      </Button>
                    </span>
                  </Tooltip>

                  <Tooltip title="Rotate 90°">
                    <IconButton
                      size="small"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      sx={{ color: '#ffffff' }}
                    >
                      <Iconify icon={"solar:restart-bold" as any} width={16} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Reset Framing">
                    <Button
                      size="small"
                      onClick={() => {
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                        setRotation(0);
                      }}
                      sx={{ fontSize: 11, color: 'text.secondary', minWidth: 'auto', px: 0.8 }}
                    >
                      Reset
                    </Button>
                  </Tooltip>
                </Stack>
              </Box>
            ) : capturedImage ? (
              // 2. Snapshot Review Viewport (after crop applied)
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 3,
                }}
              >
                <Box
                  component="img"
                  src={capturedImage}
                  alt="Captured Face"
                  sx={{
                    width: { xs: 260, sm: 300 },
                    height: { xs: 260, sm: 300 },
                    borderRadius: 2.5,
                    objectFit: 'cover',
                    border: `2px solid ${COMMON_COLORS.emerald.main}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '16px',
                    bgcolor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <Iconify
                    icon={"solar:check-circle-bold" as any}
                    width={16}
                    sx={{ color: COMMON_COLORS.emerald.main }}
                  />
                  Snapshot Cropped & Ready for Enrollment
                </Box>
              </Box>
            ) : captureMethod === 'camera' ? (
              // 3. Live Video Stream Viewport
              <>
                <Box
                  component="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror user webcam
                  }}
                />

                {/* Face Alignment Oval Framing Guide */}
                <Box
                  sx={{
                    position: 'absolute',
                    width: { xs: 190, sm: 220 },
                    height: { xs: 260, sm: 290 },
                    borderRadius: '50%',
                    border: `3px dashed ${cameraActive ? COMMON_COLORS.emerald.main : 'rgba(255,255,255,0.4)'}`,
                    boxShadow: cameraActive ? `0 0 24px ${alpha(COMMON_COLORS.emerald.main, 0.35)}` : 'none',
                    pointerEvents: 'none',
                    animation: cameraActive ? `${pulseGlow} 2s infinite` : 'none',
                  }}
                />

                {/* Camera Control Bar Top */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    right: 12,
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '16px',
                      bgcolor: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(6px)',
                      color: cameraActive ? COMMON_COLORS.emerald.main : 'error.main',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: cameraActive ? COMMON_COLORS.emerald.main : 'error.main',
                      }}
                    />
                    {cameraActive ? 'Camera Live' : 'Camera Inactive'}
                  </Box>

                  {cameraDevices.length > 1 && (
                    <Select
                      size="small"
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        startCamera(e.target.value);
                      }}
                      sx={{
                        height: 28,
                        fontSize: 11,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: '#ffffff',
                        borderRadius: '12px',
                        '& .MuiSelect-icon': { color: '#ffffff' },
                      }}
                    >
                      {cameraDevices.map((d, i) => (
                        <MenuItem key={d.deviceId || i} value={d.deviceId} sx={{ fontSize: 12 }}>
                          {d.label || `Camera ${i + 1}`}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </Stack>

                {/* Countdown Overlay */}
                {countdown > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      bgcolor: 'rgba(0,0,0,0.75)',
                      color: COMMON_COLORS.emerald.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 48,
                      fontWeight: 900,
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    }}
                  >
                    {countdown}
                  </Box>
                )}

                {/* Error Banner if camera failed */}
                {cameraError && (
                  <Box
                    sx={{
                      position: 'absolute',
                      p: 2,
                      maxWidth: 400,
                      bgcolor: 'rgba(239, 68, 68, 0.9)',
                      color: '#ffffff',
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {cameraError}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setCaptureMethod('upload')}
                      sx={{ mt: 1.5, bgcolor: '#ffffff', color: 'error.main', '&:hover': { bgcolor: '#f1f5f9' } }}
                    >
                      Use Image Upload Instead
                    </Button>
                  </Box>
                )}

                {/* Shutter Button Bottom */}
                {cameraActive && countdown === 0 && (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={handleTriggerCountdown}
                      startIcon={<Iconify icon={"solar:stopwatch-bold" as any} />}
                      sx={{
                        borderRadius: '24px',
                        px: 2.5,
                        fontWeight: 700,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: '#ffffff',
                        backdropFilter: 'blur(6px)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
                      }}
                    >
                      3s Timer
                    </Button>

                    <Button
                      variant="contained"
                      onClick={handleCaptureSnapshot}
                      startIcon={<Iconify icon={"solar:camera-bold" as any} />}
                      sx={{
                        borderRadius: '24px',
                        px: 3,
                        fontWeight: 800,
                        bgcolor: COMMON_COLORS.emerald.main,
                        color: '#ffffff',
                        boxShadow: `0 4px 16px ${alpha(COMMON_COLORS.emerald.main, 0.5)}`,
                        '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
                      }}
                    >
                      Capture Photo
                    </Button>
                  </Stack>
                )}
              </>
            ) : (
              // 4. File Upload Drop Area
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  p: 3,
                  textAlign: 'center',
                  bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                  '&:hover': { bgcolor: (t) => alpha(t.palette.grey[500], 0.08) },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                    color: COMMON_COLORS.emerald.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                  }}
                >
                  <Iconify icon={"solar:gallery-add-bold" as any} width={32} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.5 }}>
                  Click to Upload Headshot Photo
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  PNG, JPG, or JPEG up to 10MB. Crop tool will allow you to align and frame the face.
                </Typography>
              </Box>
            )}
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
            ℹ️ Biometric face descriptors are stored securely in Frappe and used exclusively for factory line changes and attendance verification.
          </Typography>
        </Stack>
      </DialogContent>

      {/* ── Dialog Actions (No Cancel Button per request) ── */}
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {isCropping && rawImage ? (
          // In Cropping Mode
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleRetake}
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              sx={{ borderRadius: 1.5, fontWeight: 700 }}
            >
              Retake
            </Button>
            <Button
              variant="contained"
              onClick={handleApplyCrop}
              startIcon={<Iconify icon={"solar:check-circle-bold" as any} />}
              sx={{
                borderRadius: 1.5,
                px: 3,
                fontWeight: 700,
                bgcolor: COMMON_COLORS.emerald.main,
                color: '#ffffff',
                '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
              }}
            >
              Apply Crop & Continue
            </Button>
          </Stack>
        ) : capturedImage ? (
          // In Review Mode (after crop applied)
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleRetake}
                disabled={submitting}
                startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
                sx={{ borderRadius: 1.5, fontWeight: 700 }}
              >
                Retake
              </Button>
              <Button
                variant="outlined"
                onClick={handleReCrop}
                disabled={submitting}
                startIcon={<Iconify icon={"solar:crop-minimalistic-bold" as any} />}
                sx={{ borderRadius: 1.5, fontWeight: 700 }}
              >
                Adjust Crop
              </Button>
            </Stack>

            <Button
              variant="contained"
              onClick={handleSaveEnrollment}
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon={"solar:check-circle-bold" as any} />
                )
              }
              sx={{
                borderRadius: 1.5,
                px: 3,
                fontWeight: 700,
                bgcolor: COMMON_COLORS.emerald.main,
                color: '#ffffff',
                '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
              }}
            >
              {submitting ? 'Enrolling...' : 'Save & Enroll Biometrics'}
            </Button>
          </Stack>
        ) : (
          // In Camera Stream / Upload Initial Mode
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="text"
              onClick={() => setCaptureMethod(captureMethod === 'camera' ? 'upload' : 'camera')}
              sx={{ fontWeight: 700, color: COMMON_COLORS.emerald.main }}
            >
              {captureMethod === 'camera' ? 'Switch to Upload' : 'Switch to Camera'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
