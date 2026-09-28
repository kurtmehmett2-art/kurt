/**
 * AudioPlayer handles queueing and playing 24kHz Int16 PCM audio chunks from Gemini Live API
 * with gapless scheduling, barge-in (interrupted) support, and clean resource management.
 */

export interface AudioPlayerOptions {
  outputSampleRate?: number; // Gemini Live default: 24000 Hz
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onError?: (error: { message: string; code?: string }) => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private outputSampleRate: number;
  private nextStartTime = 0;
  private scheduledSources: Set<AudioBufferSourceNode> = new Set();
  private isPlayingState = false;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private onError?: (error: { message: string; code?: string }) => void;

  constructor(options?: AudioPlayerOptions) {
    this.outputSampleRate = options?.outputSampleRate || 24000;
    this.onPlaybackStateChange = options?.onPlaybackStateChange;
    this.onError = options?.onError;
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public async ensureAudioContext(): Promise<AudioContext | null> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        this.onError?.({ message: 'Web Audio API desteklenmiyor.', code: 'UNSUPPORTED_WEB_AUDIO' });
        return null;
      }
      this.audioContext = new AudioCtxClass();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e: any) {
        console.warn('[AudioPlayer] AudioContext resume failed:', e);
      }
    }

    return this.audioContext;
  }

  public async playChunk(base64Pcm: string): Promise<boolean> {
    if (!base64Pcm || typeof base64Pcm !== 'string') {
      return false;
    }

    const ctx = await this.ensureAudioContext();
    if (!ctx) return false;

    let int16Array: Int16Array;
    try {
      int16Array = this.base64ToInt16Array(base64Pcm);
    } catch (err: any) {
      console.warn('[AudioPlayer] Malformed Base64 PCM data rejected:', err);
      this.onError?.({ message: 'Geçersiz ses verisi alındı.', code: 'MALFORMED_BASE64' });
      return false;
    }

    if (int16Array.length === 0) return false;

    try {
      // Convert Int16 array (-32768..32767) to Float32 array (-1.0..1.0)
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create AudioBuffer at Gemini Live output rate (24,000 Hz)
      const audioBuffer = ctx.createBuffer(1, float32Array.length, this.outputSampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Gapless scheduling
      const now = ctx.currentTime;
      const startTime = Math.max(now, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.scheduledSources.add(source);
      this.updatePlaybackState(true);

      source.onended = () => {
        this.scheduledSources.delete(source);
        if (this.scheduledSources.size === 0 && ctx.currentTime >= this.nextStartTime) {
          this.updatePlaybackState(false);
        }
      };

      return true;
    } catch (err: any) {
      console.error('[AudioPlayer] Error scheduling PCM chunk:', err);
      this.onError?.({ message: 'Ses parçası oynatılamadı.', code: 'PLAYBACK_ERROR' });
      return false;
    }
  }

  /**
   * BARGE-IN / INTERRUPT: Instantly stops all playing and queued audio sources
   * and resets the queue timer.
   */
  public interrupt(): void {
    for (const source of this.scheduledSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    this.scheduledSources.clear();
    this.nextStartTime = 0;
    this.updatePlaybackState(false);
  }

  public clear(): void {
    this.interrupt();
  }

  private base64ToInt16Array(base64: string): Int16Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Int16Array shares buffer
    return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  }

  private updatePlaybackState(isPlaying: boolean) {
    if (this.isPlayingState !== isPlaying) {
      this.isPlayingState = isPlaying;
      this.onPlaybackStateChange?.(isPlaying);
    }
  }

  public stop(): void {
    this.interrupt();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
  }

  public destroy(): void {
    this.stop();
  }
}
