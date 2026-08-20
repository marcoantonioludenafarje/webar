/**
 * LuminanceProbe — mean brightness of the live camera frame.
 *
 * Exists to automate the "low light / bright light" rows of lab-02's
 * physical test matrix. Those rows previously depended on the operator
 * describing the room, which is neither comparable across sessions nor
 * verifiable later.
 *
 * Draws the video into a deliberately tiny offscreen canvas (a 32px-wide
 * thumbnail is plenty for a mean) so sampling at 2 Hz costs nothing next
 * to the AR pipeline. No pixel data ever leaves the page.
 */
export class LuminanceProbe {
  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D | null;
  private video: HTMLVideoElement | null = null;

  constructor(private readonly sampleWidth = 32) {
    this.canvas.width = sampleWidth;
    this.canvas.height = sampleWidth;
    // willReadFrequently keeps getImageData on the CPU path; without it
    // some browsers round-trip the GPU on every read and stutter.
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  /**
   * Point the probe at a video element. Safe to call again when the lab
   * swaps elements (MindAR creates its own <video> on start).
   */
  attach(video: HTMLVideoElement | null): void {
    this.video = video;
  }

  /** Mean luma 0–255, or null if there is no decodable frame yet. */
  read(): number | null {
    const video = this.video;
    if (!video || !this.ctx) return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;

    const height = Math.max(
      1,
      Math.round((video.videoHeight / video.videoWidth) * this.sampleWidth),
    );
    if (this.canvas.height !== height) this.canvas.height = height;

    try {
      this.ctx.drawImage(video, 0, 0, this.sampleWidth, height);
      const { data } = this.ctx.getImageData(0, 0, this.sampleWidth, height);

      let total = 0;
      // Rec. 601 luma — matches how "brightness" is perceived far better
      // than a flat RGB average, which over-weights blue.
      for (let i = 0; i < data.length; i += 4) {
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return Math.round(total / (data.length / 4));
    } catch {
      // Tainted canvas (cross-origin frame) or a video torn down between
      // the readyState check and the draw. Neither is worth failing over.
      return null;
    }
  }
}
