/**
 * MLX Local Transcription Integration
 * Full client implementation for local Whisper + translation via Python MLX pipeline
 */

import { TranscriptSegment } from './soniox-client';

export interface MLXConfig {
  enabled: boolean;
  pythonPath: string;
  envDir: string;
  modelPath: string;
  sourceLanguage: string;
  targetLanguage: string;
  chunkSeconds?: number;
  strideSeconds?: number;
}

export interface MLXStatus {
  ready: boolean;
  pythonAvailable: boolean;
  pythonVersion?: string;
  venvExists: boolean;
  modelsReady: boolean;
  whisperReady: boolean;
  gemmaReady: boolean;
  setupInProgress: boolean;
  setupComplete: boolean;
  error?: string;
}

export class MLXLocalClient {
  private config: MLXConfig = {
    enabled: false,
    pythonPath: '',
    envDir: '',
    modelPath: '',
    sourceLanguage: 'auto',
    targetLanguage: 'vi',
    chunkSeconds: 7,
    strideSeconds: 5,
  };

  private status: MLXStatus = {
    ready: false,
    pythonAvailable: false,
    venvExists: false,
    modelsReady: false,
    whisperReady: false,
    gemmaReady: false,
    setupInProgress: false,
    setupComplete: false,
  };

  private pipelineProcess: any = null;
  private audioBuffer: Uint8Array = new Uint8Array();
  private isProcessing = false;
  private contextHistory: Array<{ original: string; translated: string }> = [];
  private maxContext = 5;

  // Callbacks
  onSegment?: (segment: TranscriptSegment) => void;
  onProvisional?: (text: string) => void;
  onStatusChange?: (status: MLXStatus) => void;
  onError?: (error: string) => void;

  constructor() {
    this.checkSystemSetup();
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION & SETUP
  // ═══════════════════════════════════════════════════════════

  async init(config: Partial<MLXConfig>) {
    this.config = { ...this.config, ...config };
    const setupOk = await this.checkSystemSetup();
    return setupOk;
  }

  /**
   * Check if MLX is properly setup
   */
  async checkSystemSetup(): Promise<boolean> {
    try {
      // Check Python
      const pythonRes = await fetch('/api/transcript/local/check-python');
      const pythonData = await pythonRes.json();
      this.status.pythonAvailable = pythonData.available;
      this.status.pythonVersion = pythonData.version;

      if (!pythonData.available) {
        this.status.ready = false;
        return false;
      }

      // Check venv
      const venvRes = await fetch('/api/transcript/local/check-venv');
      const venvData = await venvRes.json();
      this.status.venvExists = venvData.exists;

      // Check models
      const modelsRes = await fetch('/api/transcript/local/check-models');
      const modelsData = await modelsRes.json();
      this.status.modelsReady = modelsData.ready;
      this.status.whisperReady = modelsData.models?.whisper || false;
      this.status.gemmaReady = modelsData.models?.gemma || false;

      // Overall status
      this.status.ready = this.status.pythonAvailable && 
                         this.status.venvExists && 
                         this.status.modelsReady;

      this.status.setupComplete = this.status.ready;
      this.onStatusChange?.(this.status);

      return this.status.ready;
    } catch (err) {
      const error = err as Error;
      this.status.error = error.message;
      this.status.ready = false;
      this.onStatusChange?.(this.status);
      return false;
    }
  }

  /**
   * Setup MLX environment (runs Python setup script)
   */
  async setupEnvironment(): Promise<boolean> {
    try {
      this.status.setupInProgress = true;
      this.onStatusChange?.(this.status);

      const response = await fetch('/api/transcript/local/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDownload: true }),
      });

      if (!response.ok) {
        throw new Error(`Setup failed with status ${response.status}`);
      }

      // Stream setup progress
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        console.log('[MLX Setup]', text);
      }

      // Re-check status after setup
      const success = await this.checkSystemSetup();
      
      if (success) {
        this.status.setupInProgress = false;
        this.status.setupComplete = true;
      }

      this.onStatusChange?.(this.status);
      return success;
    } catch (err) {
      const error = err as Error;
      this.status.error = error.message;
      this.status.setupInProgress = false;
      this.onStatusChange?.(this.status);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LOCAL TRANSCRIPTION
  // ═══════════════════════════════════════════════════════════

  /**
   * Send audio to local Python pipeline
   */
  async transcribeAudioLocal(audioBlob: Blob): Promise<TranscriptSegment[]> {
    if (!this.status.ready) {
      this.onError?.('MLX not ready. Run setup first.');
      return [];
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const pcmData = this.convertWebMToPCM(arrayBuffer);

      if (!pcmData) {
        this.onError?.('Failed to convert audio format');
        return [];
      }

      // Send to backend for pipeline transcription
      const formData = new FormData();
      formData.append('audio', new Blob([pcmData], { type: 'audio/raw' }));
      formData.append('sourceLanguage', this.config.sourceLanguage);
      formData.append('targetLanguage', this.config.targetLanguage);

      const response = await fetch('/api/transcript/local/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const segments: TranscriptSegment[] = (data.segments || []).map((seg: any) => ({
        startTime: seg.startTime || Date.now(),
        endTime: seg.endTime || Date.now(),
        speaker: null,
        originalText: seg.original || '',
        translatedText: seg.translated || seg.original || '',
        isFinal: true,
      }));

      // Emit segments
      segments.forEach(seg => this.onSegment?.(seg));

      return segments;
    } catch (err) {
      const error = err as Error;
      this.onError?.(error.message);
      return [];
    }
  }

  /**
   * Send audio chunk for streaming transcription
   */
  async sendAudioChunk(audioChunk: ArrayBuffer) {
    if (!this.status.ready) {
      this.onError?.('MLX not ready');
      return;
    }

    try {
      const pcmData = this.convertWebMToPCM(audioChunk);
      if (!pcmData) return;

      // Convert to base64 for transmission
      const base64 = this.arrayBufferToBase64(pcmData);

      const response = await fetch('/api/transcript/local/transcribe-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          sourceLanguage: this.config.sourceLanguage,
          targetLanguage: this.config.targetLanguage,
          context: this.contextHistory.slice(-this.maxContext),
        }),
      });

      if (!response.ok) {
        throw new Error(`Streaming transcription failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.provisional) {
        this.onProvisional?.(data.provisional);
      }

      if (data.segment) {
        const segment: TranscriptSegment = {
          startTime: data.segment.startTime || Date.now(),
          endTime: data.segment.endTime || Date.now(),
          speaker: null,
          originalText: data.segment.original || '',
          translatedText: (data.segment.translated || data.segment.original || '') as string,
          isFinal: data.segment.isFinal || false,
        };

        if (segment.isFinal) {
          this.contextHistory.push({
            original: segment.originalText,
            translated: segment.translatedText || '',
          });
        }

        this.onSegment?.(segment);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Audio chunk error:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIO CONVERSION
  // ═══════════════════════════════════════════════════════════

  /**
   * Convert WebM/audio blob to PCM s16le
   */
  private convertWebMToPCM(arrayBuffer: ArrayBuffer): ArrayBuffer | null {
    try {
      // AudioContext can decode various formats to raw PCM
      // For now, return as-is; proper conversion needs ffmpeg or Audio API
      return arrayBuffer;
    } catch (err) {
      console.error('Audio conversion failed:', err);
      return null;
    }
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  getStatus(): MLXStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status.ready;
  }

  getConfig(): MLXConfig {
    return this.config;
  }

  clearContext() {
    this.contextHistory = [];
  }

  async disconnect() {
    // Cleanup if needed
    this.contextHistory = [];
  }
}

// Export singleton instance
export const mlxLocalClient = new MLXLocalClient();
