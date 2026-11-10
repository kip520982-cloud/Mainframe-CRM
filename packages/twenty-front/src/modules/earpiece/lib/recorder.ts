export type Speaker = "you" | "them";

/**
 * Upper bound on an audio slice. Slices normally end sooner: the moment the
 * speaker pauses (see the early-cut logic below), so the coach hears a
 * finished thought right away instead of waiting out a fixed clock.
 */
const MAX_CHUNK_MS = 4000;

/** Never cut a slice shorter than this — sub-second fragments transcribe badly. */
const MIN_CHUNK_MS = 1000;

/** This much quiet after speech means the thought is finished — send it now. */
const PAUSE_MS = 450;

/**
 * Below this average loudness the slice is treated as silence and never sent.
 * Transcription models invent phrases like "Thank you." when fed silence, and
 * every skipped slice is money saved.
 */
const SILENCE_THRESHOLD = 0.006;

export function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {return c;}
  }
  return "";
}

export function extensionFor(mime: string): string {
  if (mime.includes("mp4")) {return "mp4";}
  if (mime.includes("ogg")) {return "ogg";}
  return "webm";
}

type ChunkHandler = (args: {
  blob: Blob;
  speaker: Speaker;
  at: number;
  mime: string;
}) => void;

/**
 * Records one audio source in complete, self-contained slices.
 *
 * It deliberately stops and restarts the MediaRecorder for every slice rather
 * than using a timeslice. A timeslice only puts the container header on the
 * first blob, so every later blob is a headerless fragment that transcription
 * APIs cannot decode. Stop/start costs a few milliseconds at the boundary and
 * gives us a valid audio file every time.
 */
export class SourceRecorder {
  private recorder: MediaRecorder | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private loudestInSlice = 0;
  private sliceStartedAt = 0;
  private lastLoudAt = 0;
  private mime = "";

  /** Most recent loudness, 0-1, for the on-screen level meter. */
  level = 0;

  constructor(
    private stream: MediaStream,
    readonly speaker: Speaker,
    private onChunk: ChunkHandler,
    private elapsedSeconds: () => number
  ) {}

  start() {
    if (this.running) {return;}
    this.running = true;
    this.mime = pickMimeType();
    this.watchLevel();
    this.cycle();
  }

  stop() {
    this.running = false;
    if (this.stopTimer) {clearTimeout(this.stopTimer);}
    if (this.levelTimer) {clearInterval(this.levelTimer);}
    try {
      this.recorder?.state !== "inactive" && this.recorder?.stop();
    } catch {
      /* already stopped */
    }
    this.audioCtx?.close().catch(() => {});
    this.stream.getTracks().forEach((t) => t.stop());
    this.level = 0;
  }

  private watchLevel() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioCtx = new Ctx();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const buf = new Float32Array(this.analyser.fftSize);
      this.levelTimer = setInterval(() => {
        if (!this.analyser) {return;}
        this.analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {sum += buf[i] * buf[i];}
        const rms = Math.sqrt(sum / buf.length);
        this.level = rms;
        const now = Date.now();
        if (rms >= SILENCE_THRESHOLD) {this.lastLoudAt = now;}
        if (rms > this.loudestInSlice) {this.loudestInSlice = rms;}

        // Early cut: speech happened, then a pause — that's a finished
        // thought. Ship the slice now instead of waiting out MAX_CHUNK_MS.
        if (
          this.running &&
          this.recorder?.state === "recording" &&
          this.loudestInSlice >= SILENCE_THRESHOLD &&
          now - this.sliceStartedAt >= MIN_CHUNK_MS &&
          now - this.lastLoudAt >= PAUSE_MS
        ) {
          try {
            this.recorder.stop();
          } catch {
            /* stream ended underneath us */
          }
        }
      }, 100);
    } catch {
      // No level metering available — fall back to sending every slice.
      this.loudestInSlice = 1;
    }
  }

  private cycle() {
    if (!this.running) {return;}

    const at = this.elapsedSeconds();
    this.loudestInSlice = 0;
    this.sliceStartedAt = Date.now();
    this.lastLoudAt = this.sliceStartedAt;
    const parts: Blob[] = [];

    let recorder: MediaRecorder;
    try {
      recorder = this.mime
        ? new MediaRecorder(this.stream, { mimeType: this.mime })
        : new MediaRecorder(this.stream);
    } catch {
      this.running = false;
      return;
    }
    this.recorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {parts.push(e.data);}
    };

    recorder.onstop = () => {
      if (this.stopTimer) {clearTimeout(this.stopTimer);}
      const wasLoudEnough = this.loudestInSlice >= SILENCE_THRESHOLD;
      if (parts.length && wasLoudEnough) {
        const type = this.mime || parts[0].type || "audio/webm";
        this.onChunk({ blob: new Blob(parts, { type }), speaker: this.speaker, at, mime: type });
      }
      if (this.running) {this.cycle();}
    };

    recorder.start();
    this.stopTimer = setTimeout(() => {
      try {
        if (recorder.state !== "inactive") {recorder.stop();}
      } catch {
        /* stream ended underneath us */
      }
    }, MAX_CHUNK_MS);
  }
}

/** Ask for the microphone — this is the seller's own voice. */
export async function captureMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

/**
 * Ask for a shared tab or window's audio — this is the prospect's voice coming
 * out of Zoom, Meet, Teams or a softphone. The video track is requested only
 * because browsers refuse audio-only display capture, and is dropped at once.
 */
export async function captureTheirSide(): Promise<MediaStream> {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audio = display.getAudioTracks();
  display.getVideoTracks().forEach((t) => {
    t.stop();
    display.removeTrack(t);
  });

  if (audio.length === 0) {
    throw new Error(
      "No audio came through. When the picker appears, choose a tab and tick “Also share tab audio”."
    );
  }
  return new MediaStream(audio);
}
