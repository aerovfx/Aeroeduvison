/**
 * Recording & Live Transcription Event Handlers
 * Handles microphone + system audio recording with real-time transcription
 */

import { sonioxClient, TranscriptSegment } from './soniox-client';
import { mlxLocalClient } from './mlx-local-client';

export type AudioSource = 'microphone' | 'system' | 'both';
export type TranslationMode = 'soniox' | 'local';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  audioSource: AudioSource;
  translationMode: TranslationMode;
  recordingTime: number;
  audioLevel: number;
  status: 'idle' | 'recording' | 'paused' | 'processing' | 'error';
  segments: TranscriptSegment[];
  provisionalText: string;
  errorMessage?: string;
}

export interface RecordingConfig {
  apiKey?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  audioSource?: AudioSource;
  translationMode?: TranslationMode;
  mlxEnabled?: boolean;
}

export class RecordingHandlers {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private systemAudioStream: MediaStream | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private timeInterval: NodeJS.Timeout | null = null;
  private levelInterval: NodeJS.Timeout | null = null;
  private config: RecordingConfig = {};

  // Callbacks
  onStateChange?: (state: RecordingState) => void;
  onSegment?: (segment: TranscriptSegment) => void;
  onProvisional?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;

  constructor() {
    this.setupSonioxCallbacks();
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION & SETUP
  // ═══════════════════════════════════════════════════════════

  async init(config: RecordingConfig) {
    this.config = config;
    
    // Validate configuration
    if (config.translationMode === 'soniox' && !config.apiKey) {
      this.emitError('API key is required for Soniox transcription');
      return false;
    }

    // Initialize Soniox if using cloud
    if (config.translationMode === 'soniox' && config.apiKey) {
      sonioxClient.connect({
        apiKey: config.apiKey,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
      });
    }

    // Initialize MLX if using local
    if (config.translationMode === 'local' && config.mlxEnabled) {
      try {
        const ready = await mlxLocalClient.init({
          enabled: true,
          pythonPath: '',
          envDir: '',
          modelPath: '',
          sourceLanguage: config.sourceLanguage || 'auto',
          targetLanguage: config.targetLanguage || 'vi',
        });

        if (!ready) {
          this.emitError('MLX not ready. Please run setup first.');
          return false;
        }

        // Setup MLX callbacks
        mlxLocalClient.onSegment = (segment) => this.onSegment?.(segment);
        mlxLocalClient.onProvisional = (text) => this.onProvisional?.(text);
        mlxLocalClient.onError = (error) => this.emitError(error);
        mlxLocalClient.onStatusChange = (status) => {
          if (!status.ready) {
            this.emitError('MLX became unavailable');
          }
        };
      } catch (err) {
        this.emitError(`Failed to setup MLX: ${(err as Error).message}`);
        return false;
      }
    }

    return true;
  }

  private setupSonioxCallbacks() {
    sonioxClient.onSegment = (segment) => {
      this.onSegment?.(segment);
      this.emitStateChange();
    };

    sonioxClient.onProvisional = (text) => {
      this.onProvisional?.(text);
    };

    sonioxClient.onError = (error) => {
      this.emitError(error);
    };

    sonioxClient.onStatusChange = (status) => {
      // Update status as needed
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MICROPHONE RECORDING
  // ═══════════════════════════════════════════════════════════

  async startMicrophoneRecording(): Promise<boolean> {
    try {
      // Request microphone permission
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      return await this.setupMediaRecorder(this.microphoneStream);
    } catch (err) {
      this.emitError(`Failed to access microphone: ${(err as Error).message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SYSTEM AUDIO RECORDING
  // ═══════════════════════════════════════════════════════════

  async startSystemAudioRecording(): Promise<boolean> {
    try {
      // Request screen capture with audio
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        audio: {
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
        },
        video: false,
      });

      this.systemAudioStream = displayStream;
      return await this.setupMediaRecorder(displayStream);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        this.emitError('Screen capture permission denied');
      } else {
        this.emitError(`Failed to capture system audio: ${error.message}`);
      }
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DUAL RECORDING (Microphone + System Audio)
  // ═══════════════════════════════════════════════════════════

  async startDualRecording(): Promise<boolean> {
    try {
      // Get microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Get system audio stream
      const sysStream = await (navigator.mediaDevices as any).getDisplayMedia({
        audio: {
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
        },
        video: false,
      });

      this.microphoneStream = micStream;
      this.systemAudioStream = sysStream;

      // Merge both streams
      const mergedStream = await this.mergeAudioStreams(micStream, sysStream);
      
      return await this.setupMediaRecorder(mergedStream);
    } catch (err) {
      this.emitError(`Failed to start dual recording: ${(err as Error).message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIO STREAM MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  private async mergeAudioStreams(
    micStream: MediaStream,
    sysStream: MediaStream
  ): Promise<MediaStream> {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    this.audioContext = audioContext;

    // Create merger
    const merger = audioContext.createChannelMerger(2);
    this.merger = merger;

    // Connect microphone to left channel
    const micSource = audioContext.createMediaStreamSource(micStream);
    micSource.connect(merger, 0, 0);

    // Connect system audio to right channel
    const sysSource = audioContext.createMediaStreamSource(sysStream);
    sysSource.connect(merger, 0, 1);

    // Create output stream
    const destination = audioContext.createMediaStreamDestination();
    merger.connect(destination);

    return destination.stream;
  }

  // ═══════════════════════════════════════════════════════════
  // MEDIA RECORDER SETUP
  // ═══════════════════════════════════════════════════════════

  private async setupMediaRecorder(stream: MediaStream): Promise<boolean> {
    try {
      // Determine MIME type
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          // Send audio to transcription service
          if (this.config.translationMode === 'soniox') {
            this.sendAudioToSoniox(event.data);
          } else if (this.config.translationMode === 'local') {
            this.sendAudioToMLX(event.data);
          }
        }
      };

      // Handle stop
      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        this.emitError(`Recording error: ${event.error}`);
      };

      // Setup audio analysis
      this.setupAudioAnalysis(stream);

      return true;
    } catch (err) {
      this.emitError(`Failed to setup media recorder: ${(err as Error).message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIO ANALYSIS & LEVEL MONITORING
  // ═══════════════════════════════════════════════════════════

  private setupAudioAnalysis(stream: MediaStream) {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
      }

      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      // Connect stream to analyser
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      // Start monitoring levels
      this.monitorAudioLevel();
    } catch (err) {
      console.warn('Failed to setup audio analysis:', err);
    }
  }

  private monitorAudioLevel() {
    if (!this.analyser || !this.mediaRecorder) {
      return;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const level = Math.min(100, (average / 255) * 100);

    this.onAudioLevel?.(level);

    if (this.mediaRecorder && (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused')) {
      requestAnimationFrame(() => this.monitorAudioLevel());
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RECORDING CONTROL
  // ═══════════════════════════════════════════════════════════

  startRecording(): boolean {
    if (!this.mediaRecorder) {
      this.emitError('Media recorder not initialized');
      return false;
    }

    try {
      this.mediaRecorder.start(100); // Capture data every 100ms
      this.recordingStartTime = Date.now();
      this.startTimeCounter();
      this.emitStateChange();
      return true;
    } catch (err) {
      this.emitError(`Failed to start recording: ${(err as Error).message}`);
      return false;
    }
  }

  pauseRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.emitError('No active recording');
      return false;
    }

    try {
      this.mediaRecorder.pause();
      this.stopTimeCounter();
      this.emitStateChange();
      return true;
    } catch (err) {
      this.emitError(`Failed to pause recording: ${(err as Error).message}`);
      return false;
    }
  }

  resumeRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.emitError('No paused recording');
      return false;
    }

    try {
      this.mediaRecorder.resume();
      this.startTimeCounter();
      this.emitStateChange();
      return true;
    } catch (err) {
      this.emitError(`Failed to resume recording: ${(err as Error).message}`);
      return false;
    }
  }

  stopRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.emitError('No active recording');
      return false;
    }

    try {
      this.mediaRecorder.stop();
      this.stopTimeCounter();
      this.cleanupStreams();
      this.emitStateChange();
      return true;
    } catch (err) {
      this.emitError(`Failed to stop recording: ${(err as Error).message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TIME MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  private startTimeCounter() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }

    this.timeInterval = setInterval(() => {
      this.emitStateChange();
    }, 1000);
  }

  private stopTimeCounter() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  getRecordingTime(): number {
    if (this.recordingStartTime === 0) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIO TRANSMISSION
  // ═══════════════════════════════════════════════════════════

  private async sendAudioToSoniox(blob: Blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const pcmData = this.convertWebMToPCM(arrayBuffer);
      
      if (pcmData) {
        sonioxClient.sendAudio(pcmData);
      }
    } catch (err) {
      console.error('Failed to send audio to Soniox:', err);
    }
  }

  private async sendAudioToMLX(blob: Blob) {
    try {
      if (this.config.translationMode === 'local') {
        await mlxLocalClient.sendAudioChunk(await blob.arrayBuffer());
      }
    } catch (err) {
      console.error('Failed to send audio to MLX:', err);
    }
  }

  private convertWebMToPCM(arrayBuffer: ArrayBuffer): ArrayBuffer | null {
    try {
      // Simple conversion - extract raw audio data
      // In production, use a proper WebM parser like ts-ebml
      // This is a placeholder for the actual conversion logic
      return arrayBuffer;
    } catch (err) {
      console.error('Failed to convert WebM to PCM:', err);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════

  private cleanupStreams() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  destroy() {
    this.stopTimeCounter();
    this.cleanupStreams();
    sonioxClient.disconnect();
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES & STATE EMISSION
  // ═══════════════════════════════════════════════════════════

  private handleRecordingStop() {
    if (this.audioChunks.length > 0) {
      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      // Handle final blob if needed
    }
  }

  private emitError(message: string) {
    console.error('Recording Error:', message);
    this.onError?.(message);
    this.emitStateChange();
  }

  private emitStateChange() {
    // State emission handled by callbacks
    // Components should subscribe to onStateChange, onSegment, onProvisional, etc.
  }

  getRecordedBlob(): Blob | null {
    if (this.audioChunks.length === 0) return null;
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }

  exportAudio(): void {
    const blob = this.getRecordedBlob();
    if (!blob) {
      this.emitError('No audio recorded');
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused';
  }
}

// Export singleton instance
export const recordingHandlers = new RecordingHandlers();
