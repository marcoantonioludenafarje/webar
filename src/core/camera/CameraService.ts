/**
 * CameraService — thin wrapper around getUserMedia for Demo 01 (§10).
 *
 * Scope is deliberately narrow: request/start/stop a rear-preferring video
 * stream, surface resolution/facingMode/start-latency, and translate raw
 * getUserMedia DOMExceptions into error codes a UI can display. Tracking
 * (MindAR) and rendering (A-Frame) are separate concerns for later demos.
 */

export type CameraFacing = "environment" | "user";

export type CameraErrorCode =
  | "unsupported"
  | "permission-denied"
  | "no-camera"
  | "camera-busy"
  | "overconstrained"
  | "unknown";

export class CameraError extends Error {
  constructor(
    public readonly code: CameraErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CameraError";
  }
}

export interface CameraStartResult {
  stream: MediaStream;
  width: number;
  height: number;
  facingMode: string;
  startLatencyMs: number;
}

export class CameraService {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  /**
   * Requests camera permission and starts streaming into `videoEl`.
   * Throws a CameraError with a UI-friendly code on any failure.
   */
  async start(
    videoEl: HTMLVideoElement,
    facing: CameraFacing = "environment",
  ): Promise<CameraStartResult> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError(
        "unsupported",
        "This browser does not support camera access (getUserMedia).",
      );
    }

    const startedAt = performance.now();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err) {
      throw toCameraError(err);
    }

    this.stream = stream;
    this.videoEl = videoEl;
    videoEl.srcObject = stream;

    // Some mobile browsers (notably iOS Safari) need an explicit play()
    // even with autoplay/playsinline attributes set.
    try {
      await videoEl.play();
    } catch {
      // Autoplay rejection here is non-fatal; the stream is still attached.
    }

    if (videoEl.readyState < 1) {
      await new Promise<void>((resolve) => {
        videoEl.addEventListener("loadedmetadata", () => resolve(), {
          once: true,
        });
      });
    }

    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings() ?? {};

    return {
      stream,
      width: settings.width ?? videoEl.videoWidth,
      height: settings.height ?? videoEl.videoHeight,
      facingMode: settings.facingMode ?? "unknown",
      startLatencyMs: Math.round(performance.now() - startedAt),
    };
  }

  /** Stops all tracks and detaches the video element. Safe to call repeatedly. */
  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  isActive(): boolean {
    return this.stream !== null;
  }
}

function toCameraError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return new CameraError(
          "permission-denied",
          "Camera permission was denied. Enable camera access for this site and try again.",
        );
      case "NotFoundError":
        return new CameraError("no-camera", "No camera device was found on this device.");
      case "NotReadableError":
        return new CameraError(
          "camera-busy",
          "The camera is already in use by another application or tab.",
        );
      case "OverconstrainedError":
        return new CameraError(
          "overconstrained",
          "No camera on this device satisfies the requested constraints.",
        );
      default:
        return new CameraError("unknown", err.message || "Unknown camera error.");
    }
  }
  return new CameraError("unknown", err instanceof Error ? err.message : String(err));
}
