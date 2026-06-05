import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Loader2, Zap, ZapOff, SwitchCamera, AlertTriangle, FileUp } from 'lucide-react';

// ===================== LIVE CAMERA CAPTURE =====================
// Mở camera trực tiếp trong trình duyệt (getUserMedia) để CHỤP MỘT PHIẾU rồi
// chấm ngay trên máy. Không upload ảnh lên server — frame được vẽ ra canvas và
// trả về dưới dạng File cho pipeline OMR sẵn có (straighten → detect → grade).
//
// Hoạt động trên web HTTPS (inphysic.com) và trong WebView Capacitor iOS/Android
// (đã khai báo quyền camera). Có fallback chụp bằng camera hệ điều hành nếu
// getUserMedia bị chặn hoặc thiết bị không hỗ trợ.

interface CameraCaptureProps {
  /** Gọi khi người dùng chụp xong — nhận File ảnh JPEG để đưa vào pipeline chấm */
  onCapture: (file: File) => void;
  /** Đóng camera mà không chụp */
  onClose: () => void;
  /** Tiêu đề hiển thị trên thanh trên cùng */
  title?: string;
  /** Mô tả ngắn dưới khung canh phiếu */
  hint?: string;
}

type CamState = 'idle' | 'starting' | 'ready' | 'error';

export default function CameraCapture({
  onCapture,
  onClose,
  title = 'Chụp phiếu — Chấm ngay',
  hint = 'Đặt phiếu nằm gọn trong khung, đủ 4 ô vuông ở 4 góc, đủ sáng',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<CamState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // ── Dừng & giải phóng camera ─────────────────────────────────
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── Khởi động camera với facingMode mong muốn ────────────────
  const startStream = useCallback(async (mode: 'environment' | 'user') => {
    setState('starting');
    setErrorMsg('');
    setTorchOn(false);
    setTorchSupported(false);
    stopStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setErrorMsg('Trình duyệt không hỗ trợ camera trực tiếp. Hãy dùng nút "Chụp bằng máy ảnh".');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS Safari cần playsInline + muted để autoplay
        await videoRef.current.play().catch(() => {});
      }

      // Kiểm tra hỗ trợ đèn flash (torch)
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(!!caps.torch);

      setState('ready');
    } catch (err: any) {
      console.error('[CameraCapture] getUserMedia error:', err);
      setState('error');
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setErrorMsg('Bạn đã từ chối quyền camera. Vào cài đặt trình duyệt để cấp lại, hoặc dùng "Chụp bằng máy ảnh".');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setErrorMsg('Không tìm thấy camera phù hợp. Hãy thử đổi camera hoặc dùng "Chụp bằng máy ảnh".');
      } else {
        setErrorMsg('Không mở được camera. Hãy thử lại hoặc dùng "Chụp bằng máy ảnh".');
      }
    }
  }, [stopStream]);

  // Khởi động khi mở, dọn dẹp khi đóng
  useEffect(() => {
    startStream(facingMode);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Bật/tắt đèn flash ────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (e) {
      console.warn('[CameraCapture] torch not applicable:', e);
      setTorchSupported(false);
    }
  }, [torchOn]);

  // ── Đổi camera trước/sau ─────────────────────────────────────
  const switchCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startStream(next);
  }, [facingMode, startStream]);

  // ── Chụp khung hình hiện tại → File JPEG ─────────────────────
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || state !== 'ready' || capturing) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCapturing(false);
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCapturing(false);
            return;
          }
          const file = new File(
            [blob],
            `camera-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          stopStream();
          onCapture(file);
        },
        'image/jpeg',
        0.92
      );
    } catch (e) {
      console.error('[CameraCapture] capture error:', e);
      setCapturing(false);
    }
  }, [state, capturing, onCapture, stopStream]);

  // ── Fallback: chụp bằng camera hệ điều hành (input file) ─────
  const handleFallbackFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (file) {
      stopStream();
      onCapture(file);
    }
  }, [onCapture, stopStream]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Thanh trên cùng */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/80 text-white"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="w-5 h-5 text-purple-400 shrink-0" />
          <span className="font-semibold text-sm truncate">{title}</span>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Đóng camera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Vùng xem camera */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />

        {/* Khung canh phiếu (A4 dọc) */}
        {state === 'ready' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div
              className="relative w-full max-w-md"
              style={{ aspectRatio: '1 / 1.414' }}
            >
              {/* 4 góc khung */}
              <span className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
              <span className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
              <span className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
              <span className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Đang khởi động */}
        {state === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm">Đang mở camera...</p>
          </div>
        )}

        {/* Lỗi */}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 px-8 text-center">
            <AlertTriangle className="w-10 h-10 text-yellow-400" />
            <p className="text-sm max-w-sm">{errorMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => startStream(facingMode)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <FileUp className="w-4 h-4" /> Chụp bằng máy ảnh
              </button>
            </div>
          </div>
        )}

        {/* Hướng dẫn */}
        {state === 'ready' && (
          <div className="absolute top-3 left-0 right-0 flex justify-center px-4 pointer-events-none">
            <p className="text-white text-xs bg-black/60 rounded-full px-3 py-1.5 text-center max-w-sm">
              {hint}
            </p>
          </div>
        )}
      </div>

      {/* Thanh điều khiển dưới cùng */}
      <div
        className="bg-black/80 px-6 py-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Đèn flash */}
          <button
            onClick={toggleTorch}
            disabled={!torchSupported || state !== 'ready'}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Bật/tắt đèn"
          >
            {torchOn ? <Zap className="w-5 h-5 text-yellow-300" /> : <ZapOff className="w-5 h-5" />}
          </button>

          {/* Nút chụp */}
          <button
            onClick={capture}
            disabled={state !== 'ready' || capturing}
            className="rounded-full bg-white flex items-center justify-center shadow-lg disabled:opacity-50 transition-transform active:scale-95"
            style={{ width: 72, height: 72 }}
            aria-label="Chụp & chấm"
          >
            {capturing ? (
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            ) : (
              <span className="w-16 h-16 rounded-full border-4 border-purple-600 flex items-center justify-center">
                <Camera className="w-7 h-7 text-purple-600" />
              </span>
            )}
          </button>

          {/* Đổi camera */}
          <button
            onClick={switchCamera}
            disabled={state === 'starting'}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            aria-label="Đổi camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-white/60 text-[11px] mt-3">
          Xử lý hoàn toàn trên máy — ảnh không gửi lên máy chủ
        </p>
      </div>

      {/* Input fallback ẩn (camera hệ điều hành) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        onChange={handleFallbackFile}
        className="hidden"
      />
    </div>
  );
}
