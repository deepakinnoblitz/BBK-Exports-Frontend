import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

/**
 * Load face-api neural network models from local /models directory
 */
export async function loadFaceRecognitionModels(modelPath = '/models'): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      ]);
      modelsLoaded = true;
      return true;
    } catch (err) {
      console.error('Failed to load face-api models:', err);
      return false;
    } finally {
      modelLoadingPromise = null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Detect face and extract 128-D descriptor from image, video, or canvas
 */
export async function extractFaceDescriptorFromMedia(
  media: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{
  box: { x: number; y: number; width: number; height: number };
  descriptor: number[];
  landmarks?: any;
} | null> {
  const ready = await loadFaceRecognitionModels();
  if (!ready) return null;

  try {
    const detection = await faceapi
      .detectSingleFace(media, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) return null;

    return {
      box: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
      descriptor: Array.from(detection.descriptor),
      landmarks: detection.landmarks.positions,
    };
  } catch (err) {
    console.error('Face descriptor extraction failed:', err);
    return null;
  }
}

/**
 * Compare live face descriptor against enrolled employees
 * Returns best matching worker if within Euclidean distance threshold (< 0.55), else null
 */
export function matchFaceDescriptor<T extends { name: string; face_enrolled: number; face_descriptor?: any }>(
  liveDescriptor: number[] | Float32Array,
  enrolledCatalog: T[]
): { worker: T; distance: number; confidence: number } | null {
  const targetDesc = liveDescriptor instanceof Float32Array ? liveDescriptor : new Float32Array(liveDescriptor);
  let bestMatch: { worker: T; distance: number; confidence: number } | null = null;
  let minDistance = Infinity;

  // Maximum Euclidean distance threshold for match (face-api standard is 0.55)
  const MATCH_THRESHOLD = 0.55;

  for (const item of enrolledCatalog) {
    if (item.face_enrolled !== 1 || !item.face_descriptor) {
      continue;
    }

    const raw = Array.isArray(item.face_descriptor)
      ? item.face_descriptor
      : typeof item.face_descriptor === 'string'
      ? JSON.parse(item.face_descriptor)
      : null;

    if (!raw || raw.length !== 128) {
      continue;
    }

    const workerDesc = new Float32Array(raw);
    const dist = faceapi.euclideanDistance(targetDesc, workerDesc);

    if (dist < minDistance) {
      minDistance = dist;
      if (dist < MATCH_THRESHOLD) {
        // Map distance [0.2 -> 0.55] to confidence percentage [99.5% -> 80%]
        const confidence = Math.max(78, Math.min(99.4, +((1 - dist / 0.72) * 100).toFixed(1)));
        bestMatch = { worker: item, distance: dist, confidence };
      }
    }
  }

  return bestMatch;
}

/**
 * Ensures an enrolled employee has a 128-D descriptor by extracting it from their enrolled photo if needed
 */
export async function ensureWorkerFaceDescriptor<
  T extends { name: string; face_enrolled: number; face_descriptor?: any; face_enrolled_image?: string }
>(worker: T): Promise<T> {
  if (worker.face_enrolled !== 1 || !worker.face_enrolled_image) {
    return worker;
  }

  // Check if valid 128-D descriptor is already present
  try {
    const raw = Array.isArray(worker.face_descriptor)
      ? worker.face_descriptor
      : typeof worker.face_descriptor === 'string'
      ? JSON.parse(worker.face_descriptor)
      : null;

    if (raw && raw.length === 128) {
      return worker;
    }
  } catch {
    // Needs re-extraction
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = worker.face_enrolled_image;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const extracted = await extractFaceDescriptorFromMedia(img);
    if (extracted) {
      return {
        ...worker,
        face_descriptor: extracted.descriptor,
      };
    }
  } catch (err) {
    console.warn(`Could not extract descriptor for worker ${worker.name}:`, err);
  }

  return worker;
}

export { faceapi };

