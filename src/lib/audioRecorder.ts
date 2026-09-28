/**
 * AudioRecorder handles microphone recording, resampling to 16kHz Int16 PCM,
 * Base64 encoding, and forwarding audio chunks.
 */

export interface AudioRecorderOptions {
  onAudioChunk: (base64Pcm: string) => void;
  onError?: (error: { message: string; code?: string }) => void;
  targetSampleRate?: number; // Default 16000
  chunkSizeSamples?: number;  // Default 2048
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: AudioNode | null = null;
  private workletUrl: string | null = null;
  private isRecordingState = false;
  private onAudioChunk: (base64Pcm: string) => void;
  private onError: (error: { message: string; code?: string }) => void;
  private targetSampleRate: number;
  private resampleBuffer: number[] = [];

  constructor(options: AudioRecorderOptions) {
    this.onAudioChunk = options.onAudioChunk;
    this.onError = options.onError || ((err) => console.error('[AudioRecorder Error]', err));
    this.targetSampleRate = options.targetSampleRate || 16000;
  }

  public isRecording(): boolean {
    return this.isRecordingState;
  }

  public async start(): Promise<boolean> {
    if (this.isRecordingState) return true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onError({
        message: 'Tarayıcınız mikrofon erişimini desteklemiyor.',
        code: 'UNSUPPORTED_BROWSER'
      });
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.onError({
          message: 'Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini kontrol edin.',
          code: 'PERMISSION_DENIED'
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.onError({
          message: 'Kullanılabilir bir mikrofon aygıtı bulunamadı.',
          code: 'NO_DEVICE'
        });
      } else {
        this.onError({
          message: `Mikrofon başlatılamadı: ${err.message || 'Bilinmeyen hata'}`,
          code: 'MIC_INIT_ERROR'
        });
      }
      return false;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        this.onError({ message: 'Web Audio API bu tarayıcıda desteklenmiyor.', code: 'UNSUPPORTED_WEB_AUDIO' });
        this.stop();
        return false;
      }

      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const inputSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Try AudioWorklet first, fall back to ScriptProcessorNode
      let workletLoaded = false;
      if (this.audioContext.audioWorklet) {
        try {
          const workletCode = `
            class PCMProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input.length > 0) {
                  const channelData = input[0];
                  if (channelData && channelData.length > 0) {
                    this.port.postMessage(channelData);
                  }
                }
                return true;
              }
            }
            registerProcessor('pcm-recorder-processor', PCMProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          this.workletUrl = URL.createObjectURL(blob);
          await this.audioContext.audioWorklet.addModule(this.workletUrl);

          const workletNode = new AudioWorkletNode(this.audioContext, 'pcm-recorder-processor');
          workletNode.port.onmessage = (event) => {
            if (this.isRecordingState) {
              this.handleAudioData(event.data, inputSampleRate);
            }
          };
          this.sourceNode.connect(workletNode);
          workletNode.connect(this.audioContext.destination);
          this.processorNode = workletNode;
          workletLoaded = true;
        } catch (e) {
          console.warn('[AudioRecorder] AudioWorklet fallback to ScriptProcessor:', e);
        }
      }

      if (!workletLoaded) {
        // Fallback to ScriptProcessorNode
        const scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
        scriptNode.onaudioprocess = (e) => {
          if (this.isRecordingState) {
            const inputData = e.inputBuffer.getChannelData(0);
            this.handleAudioData(inputData, inputSampleRate);
          }
        };
        this.sourceNode.connect(scriptNode);
        scriptNode.connect(this.audioContext.destination);
        this.processorNode = scriptNode;
      }

      this.isRecordingState = true;
      return true;
    } catch (err: any) {
      this.onError({
        message: `Ses işleme hattı oluşturulamadı: ${err.message || 'Bilinmeyen hata'}`,
        code: 'AUDIO_PIPELINE_ERROR'
      });
      this.stop();
      return false;
    }
  }

  private handleAudioData(inputFloat32: Float32Array, inputSampleRate: number) {
    if (!inputFloat32 || inputFloat32.length === 0) return;

    // Resample down to targetSampleRate (e.g. 16000)
    const ratio = inputSampleRate / this.targetSampleRate;
    const outputLength = Math.floor(inputFloat32.length / ratio);

    for (let i = 0; i < outputLength; i++) {
      const originIndex = Math.floor(i * ratio);
      const sample = inputFloat32[originIndex] || 0;
      this.resampleBuffer.push(sample);
    }

    // Flush buffer in chunks (e.g., 2048 samples = ~4100 bytes PCM = ~5.4KB base64)
    const chunkSize = 2048;
    while (this.resampleBuffer.length >= chunkSize) {
      const chunkFloat32 = this.resampleBuffer.splice(0, chunkSize);
      const int16Array = new Int16Array(chunkFloat32.length);

      for (let j = 0; j < chunkFloat32.length; j++) {
        // Clamp float sample to [-1.0, 1.0]
        const s = Math.max(-1, Math.min(1, chunkFloat32[j]));
        int16Array[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert Int16Array (Little-Endian) to Base64 safely
      const base64 = this.int16ToBase64(int16Array);
      
      // Safety check for backend max message limit (500KB)
      if (base64.length < 400 * 1024) {
        this.onAudioChunk(base64);
      } else {
        console.warn('[AudioRecorder] Omit oversized chunk:', base64.length);
      }
    }
  }

  private int16ToBase64(int16Array: Int16Array): string {
    const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 1024;
    for (let i = 0; i < len; i += chunkSize) {
      const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    return btoa(binary);
  }

  public stop(): void {
    this.isRecordingState = false;
    this.resampleBuffer = [];

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (e) {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (e) {}
      this.audioContext = null;
    }

    if (this.workletUrl) {
      try {
        URL.revokeObjectURL(this.workletUrl);
      } catch (e) {}
      this.workletUrl = null;
    }
  }

  public destroy(): void {
    this.stop();
  }
}
