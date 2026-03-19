/**
 * Local MLX Whisper Client
 * Interfaces with local Python MLX Whisper model for offline transcription
 */

export interface MLXConfig {
  enabled: boolean;
  modelPath: string;
  pythonPath: string;
  venvPath: string;
  autoDownload: boolean;
}

export interface MLXStatus {
  ready: boolean;
  modelLoaded: boolean;
  pythonAvailable: boolean;
  venvExists: boolean;
  downloading?: boolean;
  progress?: number;
  error?: string;
}

class MLXWhisperClient {
  private config: MLXConfig = {
    enabled: false,
    modelPath: '',
    pythonPath: '',
    venvPath: '',
    autoDownload: true,
  };

  private status: MLXStatus = {
    ready: false,
    modelLoaded: false,
    pythonAvailable: false,
    venvExists: false,
  };

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  // Callbacks
  onStatusChange?: (status: MLXStatus) => void;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;

  /**
   * Initialize MLX client
   */
  init(config: Partial<MLXConfig>) {
    this.config = { ...this.config, ...config };
    this.checkStatus();
  }

  /**
   * Check MLX setup status
   */
  async checkStatus(): Promise<MLXStatus> {
    try {
      // Check if Python is available
      const pythonCheck = await this.checkPython();
      this.status.pythonAvailable = pythonCheck.available;

      // Check if venv exists
      const venvCheck = await this.checkVenv();
      this.status.venvExists = venvCheck.exists;

      // Check if models are downloaded
      const modelCheck = await this.checkModels();
      this.status.modelLoaded = modelCheck.ready;

      // Overall ready status
      this.status.ready = this.status.pythonAvailable && 
                          this.status.venvExists && 
                          this.status.modelLoaded;

      this.onStatusChange?.(this.status);
      return this.status;
    } catch (error: any) {
      this.status.error = error.message;
      this.status.ready = false;
      this.onStatusChange?.(this.status);
      throw error;
    }
  }

  /**
   * Check Python availability
   */
  private async checkPython(): Promise<{ available: boolean; version?: string }> {
    try {
      const response = await fetch('/api/transcript/local/check-python');
      const data = await response.json();
      return {
        available: data.available,
        version: data.version,
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Check venv existence
   */
  private async checkVenv(): Promise<{ exists: boolean }> {
    try {
      const response = await fetch('/api/transcript/local/check-venv');
      const data = await response.json();
      return { exists: data.exists };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Check model download status
   */
  private async checkModels(): Promise<{ ready: boolean }> {
    try {
      const response = await fetch('/api/transcript/local/check-models');
      const data = await response.json();
      return { ready: data.ready };
    } catch {
      return { ready: false };
    }
  }

  /**
   * Setup MLX environment (install packages, download models)
   */
  async setup(onProgress?: (progress: number, message: string) => void): Promise<void> {
    try {
      const response = await fetch('/api/transcript/local/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoDownload: this.config.autoDownload,
        }),
      });

      if (!response.ok) {
        throw new Error('Setup failed');
      }

      // Read streaming progress
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress' && onProgress) {
              onProgress(data.progress || 0, data.message);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      this.status.ready = true;
      this.onStatusChange?.(this.status);
    } catch (error: any) {
      this.status.error = error.message;
      this.status.ready = false;
      this.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Start local transcription session
   */
  async start(): Promise<void> {
    if (!this.status.ready) {
      throw new Error('MLX not ready. Please run setup first.');
    }

    try {
      // Connect to local WebSocket server (Python MLX server)
      this.ws = new WebSocket('ws://localhost:8765');

      this.ws.onopen = () => {
        console.log('[MLX] Connected to local Whisper server');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            this.onTranscript?.(data.text);
          } else if (data.type === 'error') {
            this.onError?.(data.error);
          }
        } catch (error) {
          console.error('[MLX] Failed to parse message:', error);
        }
      };

      this.ws.onerror = () => {
        this.onError?.('Failed to connect to MLX server');
      };

      this.ws.onclose = () => {
        console.log('[MLX] Disconnected');
        this.attemptReconnect();
      };
    } catch (error: any) {
      this.onError?.(`Failed to start MLX: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send audio chunk for transcription
   */
  sendAudio(pcmData: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcmData);
    }
  }

  /**
   * Stop transcription
   */
  stop(): void {
    if (this.ws) {
      this.ws.close(1000, 'User stopped');
      this.ws = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError?.('MLX server unavailable after multiple attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    console.log(`[MLX] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.start().catch(console.error);
    }, delay);
  }

  /**
   * Get current status
   */
  getStatus(): MLXStatus {
    return { ...this.status };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<MLXConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton
export const mlxWhisperClient = new MLXWhisperClient();
