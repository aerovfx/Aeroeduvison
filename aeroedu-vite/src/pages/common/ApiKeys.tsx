/**
 * ApiKeys — Trang quản lý API Key cho Teacher / Parent / Admin
 *
 * Cho phép người dùng tạo, xem, thu hồi API key để kết nối
 * Claude Desktop / Cursor với AeroEdu qua MCP server.
 *
 * API:
 *   GET    /api/user/api-keys           → { keys: [{id, key_prefix, name, created_at, last_used_at, revoked}] }
 *   POST   /api/user/api-keys           body {name} → { ok, id, key, prefix, name }
 *   DELETE /api/user/api-keys/:id       → { ok }
 */

import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Terminal,
  Zap,
  Monitor,
  Shield,
  RefreshCw,
  X,
} from 'lucide-react'

/* ─────────────────────────── Types ─────────────────────────── */

interface ApiKey {
  id: string
  key_prefix: string
  name: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
}

interface NewKeyResult {
  id: string
  key: string
  prefix: string
  name: string
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function maskPrefix(prefix: string): string {
  // e.g. "AERO-a1b2c3" → "AERO-a1b2••••"
  const parts = prefix.split('-')
  if (parts.length >= 2) {
    const visible = parts[1].slice(0, 4)
    return `${parts[0]}-${visible}••••`
  }
  return prefix.slice(0, 8) + '••••'
}

// Dùng api instance từ @/services/api — tự inject Bearer token đúng cách
// api instance đã có baseURL='/api' — path phải bỏ prefix /api
async function apiFetch(path: string, opts: { method?: string; body?: unknown } = {}) {
  // /api/user/api-keys → /user/api-keys
  const p = path.replace(/^\/api\//, '/')
  const method = (opts.method ?? 'GET').toLowerCase() as 'get' | 'post' | 'delete'
  if (method === 'get')    return api.get(p).then(r => r.data)
  if (method === 'delete') return api.delete(p).then(r => r.data)
  return api.post(p, opts.body).then(r => r.data)
}

/* ─────────────────────────── Copy button ─────────────────────────── */

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Sao chép"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
        ${copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
        } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Đã chép' : 'Sao chép'}
    </button>
  )
}

/* ─────────────────────────── One-time reveal modal ─────────────────────────── */

function NewKeyModal({ result, onClose }: { result: NewKeyResult; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20">
              <Key className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">API Key đã tạo!</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{result.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            <strong className="font-semibold">Lưu key này ngay — sẽ không hiển thị lại.</strong>{' '}
            Nếu bạn mất key, hãy thu hồi và tạo key mới.
          </p>
        </div>

        {/* Key display */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            API Key của bạn
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <code className={`block w-full px-3 py-2.5 rounded-lg bg-muted/40 border border-border text-sm font-mono text-foreground break-all select-all ${!visible ? 'tracking-widest' : ''}`}>
                {visible ? result.key : '•'.repeat(Math.min(result.key.length, 40))}
              </code>
            </div>
            <button
              onClick={() => setVisible(v => !v)}
              className="p-2 rounded-lg bg-muted/40 border border-border text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title={visible ? 'Ẩn' : 'Hiện'}
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={result.key} className="flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Nhấn để sao chép toàn bộ key</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Đã lưu, đóng lại
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────── Setup guide ─────────────────────────── */

const CLAUDE_CONFIG_JSON = `{
  "mcpServers": {
    "aeroedu": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "AEROEDU_API_KEY": "AERO-your-key-here"
      }
    }
  }
}`

// ── Multi-client MCP config snippets ──
// Claude Desktop: Anthropic native, chỉ Claude model
// Cursor: VS Code fork, support cả Claude + DeepSeek + GPT model
// Cherry Studio: desktop GUI VN-friendly, multi-provider
// Cline: VS Code extension, dev tool

type McpClient = 'claude-desktop' | 'cursor' | 'cherry-studio' | 'cline'

const MCP_CLIENT_INFO: Record<McpClient, {
  name: string; emoji: string;
  models: string[];
  download: string;
  configPath: { mac: string; win: string; linux?: string };
  configFormat: 'json' | 'cursor-mcp' | 'cherry-mcp';
}> = {
  'claude-desktop': {
    name: 'Claude Desktop',
    emoji: '🤖',
    models: ['Claude Sonnet 4.5', 'Claude Opus 4.5'],
    download: 'https://claude.ai/download',
    configPath: {
      mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
      win: '%APPDATA%\\Claude\\claude_desktop_config.json',
      linux: '~/.config/Claude/claude_desktop_config.json',
    },
    configFormat: 'json',
  },
  'cursor': {
    name: 'Cursor (Claude + DeepSeek)',
    emoji: '✨',
    models: ['Claude Sonnet 4.5', 'DeepSeek V3', 'GPT-4o', 'Gemini 2'],
    download: 'https://cursor.com',
    configPath: {
      mac: '~/.cursor/mcp.json',
      win: '%USERPROFILE%\\.cursor\\mcp.json',
      linux: '~/.cursor/mcp.json',
    },
    configFormat: 'cursor-mcp',
  },
  'cherry-studio': {
    name: 'Cherry Studio (đa provider)',
    emoji: '🍒',
    models: ['DeepSeek V3', 'Claude', 'GPT', 'Gemini', 'Local Ollama'],
    download: 'https://github.com/CherryHQ/cherry-studio/releases',
    configPath: {
      mac: 'App → Settings → MCP Servers → Add',
      win: 'App → Settings → MCP Servers → Add',
    },
    configFormat: 'cherry-mcp',
  },
  'cline': {
    name: 'Cline (VS Code)',
    emoji: '💻',
    models: ['Claude', 'DeepSeek', 'GPT', 'Gemini', 'OpenRouter'],
    download: 'VS Code Marketplace → "Cline"',
    configPath: {
      mac: 'Cline panel → MCP Servers tab → "Configure MCP Servers"',
      win: 'Cline panel → MCP Servers tab → "Configure MCP Servers"',
    },
    configFormat: 'json',
  },
}

function buildConfigSnippet(client: McpClient): string {
  if (client === 'cursor') {
    // Cursor mcp.json format giống Claude Desktop nhưng không có wrapper "mcpServers"
    return `{
  "mcpServers": {
    "aeroedu": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "AEROEDU_API_KEY": "AERO-your-key-here"
      }
    }
  }
}`
  }
  if (client === 'cherry-studio') {
    // Cherry Studio dùng GUI — không phải JSON manual
    return `Form trong Settings → MCP Servers:

  Name:        aeroedu
  Type:        STDIO
  Command:     node
  Arguments:   /path/to/mcp-server/dist/index.js
  Env Vars:
    AEROEDU_API_KEY = AERO-your-key-here

  → Bấm Save → Enable toggle ✓`
  }
  // Claude Desktop + Cline đều dùng JSON format giống nhau
  return CLAUDE_CONFIG_JSON
}

interface Step {
  icon: React.ReactNode
  title: string
  body: React.ReactNode
}

function SetupGuide() {
  const [open, setOpen] = useState(false)
  const [client, setClient] = useState<McpClient>('claude-desktop')
  const info = MCP_CLIENT_INFO[client]
  const configSnippet = buildConfigSnippet(client)

  const steps: Step[] = [
    {
      icon: <Key className="w-4 h-4 text-purple-400" />,
      title: 'Bước 1 — Tạo & sao chép API Key',
      body: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Bấm nút <strong className="text-purple-300">"+ Tạo API Key mới"</strong> ở bảng trên →
            đặt tên gợi nhớ (vd: <em>Claude MacBook</em>) → bấm Tạo.
            Bảng popup sẽ hiện chuỗi <code className="font-mono bg-muted/60 px-1 rounded text-xs">AERO-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>.
          </p>
          <p className="text-rose-400 text-xs">
            ⚠ Key chỉ hiện 1 LẦN DUY NHẤT — copy ngay trước khi đóng popup.
            Nếu lỡ mất, xoá key cũ và tạo key mới.
          </p>
        </div>
      ),
    },
    {
      icon: <Terminal className="w-4 h-4 text-blue-400" />,
      title: 'Bước 2 — Tải & build MCP server (1 lần duy nhất)',
      body: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Clone monorepo + build folder mcp-server (Node.js ≥ 18):</p>
          <div className="relative">
            <pre className="bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto">
{`git clone https://github.com/aerovfx/aeroeduvision.git
cd aeroeduvision/mcp-server
npm install
npm run build`}
            </pre>
            <CopyButton
              text={`git clone https://github.com/aerovfx/aeroeduvision.git\ncd aeroeduvision/mcp-server\nnpm install\nnpm run build`}
              className="absolute top-2 right-2"
            />
          </div>
          <p className="text-xs">
            Sau build xong, ghi nhớ đường dẫn TUYỆT ĐỐI tới{' '}
            <code className="font-mono bg-muted/60 px-1 rounded">dist/index.js</code>.
            Trên macOS: <code className="font-mono bg-muted/60 px-1 rounded">pwd</code> rồi ghép <code>/dist/index.js</code>.
          </p>
        </div>
      ),
    },
    {
      icon: <Monitor className="w-4 h-4 text-green-400" />,
      title: `Bước 3 — Cấu hình ${info.name}`,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          {/* Client selector tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border">
            {(Object.keys(MCP_CLIENT_INFO) as McpClient[]).map(c => {
              const cInfo = MCP_CLIENT_INFO[c]
              return (
                <button
                  key={c}
                  onClick={() => setClient(c)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                    client === c
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={cInfo.name}
                >
                  {cInfo.emoji} {cInfo.name.split(' ')[0]}
                </button>
              )
            })}
          </div>

          {/* Info box per client */}
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-2.5 text-xs space-y-1">
            <p className="font-bold text-purple-300">{info.emoji} {info.name}</p>
            <p>
              <strong>Models hỗ trợ:</strong> {info.models.join(' · ')}
            </p>
            <p>
              <strong>Tải xuống:</strong>{' '}
              {info.download.startsWith('http')
                ? <a href={info.download} target="_blank" rel="noreferrer" className="text-purple-300 underline">{info.download}</a>
                : <code className="font-mono bg-muted/60 px-1 rounded">{info.download}</code>}
            </p>
          </div>

          {/* Config path */}
          <div>
            <p className="font-medium text-foreground mb-1.5 text-xs uppercase tracking-wider">Vị trí file/setting:</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li><strong>macOS:</strong> <code className="font-mono bg-muted/60 px-1 rounded text-[11px]">{info.configPath.mac}</code></li>
              <li><strong>Windows:</strong> <code className="font-mono bg-muted/60 px-1 rounded text-[11px]">{info.configPath.win}</code></li>
              {info.configPath.linux && (
                <li><strong>Linux:</strong> <code className="font-mono bg-muted/60 px-1 rounded text-[11px]">{info.configPath.linux}</code></li>
              )}
            </ul>
          </div>

          <p className="text-xs">
            {info.configFormat === 'cherry-mcp'
              ? 'Cherry Studio dùng GUI — không phải JSON. Mở Settings → MCP Servers → Add new:'
              : 'Thêm đoạn JSON sau (nếu file đã có mcpServers, chỉ cần thêm key aeroedu bên trong):'}
          </p>

          {/* Config snippet — copy-paste */}
          <div className="relative">
            <pre className="bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words">
              {configSnippet}
            </pre>
            <CopyButton text={configSnippet} className="absolute top-2 right-2" />
          </div>

          <p className="text-xs">
            Thay <code className="font-mono bg-muted/60 px-1 rounded">/path/to/mcp-server/dist/index.js</code> bằng đường dẫn THỰC từ Bước 2,
            và <code className="font-mono bg-muted/60 px-1 rounded">AERO-your-key-here</code> bằng key từ Bước 1.
          </p>

          {/* DeepSeek-specific note */}
          {(client === 'cursor' || client === 'cherry-studio' || client === 'cline') && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-2.5 text-xs space-y-1">
              <p className="font-bold text-cyan-300">🧠 Chọn model DeepSeek trong {info.name}:</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                {client === 'cursor' && (
                  <>
                    <li>Vào <strong>Cursor Settings → Models</strong></li>
                    <li>Bật <strong>"Use Custom OpenAI Endpoint"</strong></li>
                    <li>Base URL: <code className="font-mono bg-muted/60 px-1 rounded">https://api.deepseek.com/v1</code></li>
                    <li>API Key: lấy từ <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-cyan-300 underline">platform.deepseek.com/api_keys</a></li>
                    <li>Model: <code className="font-mono bg-muted/60 px-1 rounded">deepseek-chat</code> (v3) hoặc <code className="font-mono bg-muted/60 px-1 rounded">deepseek-reasoner</code> (R1)</li>
                  </>
                )}
                {client === 'cherry-studio' && (
                  <>
                    <li>Vào <strong>Settings → Model Providers</strong></li>
                    <li>Chọn <strong>"DeepSeek"</strong> trong list</li>
                    <li>Paste API Key từ <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-cyan-300 underline">platform.deepseek.com</a></li>
                    <li>Bật toggle Enable</li>
                    <li>Trong chat, chọn DeepSeek-Chat hoặc DeepSeek-Reasoner</li>
                  </>
                )}
                {client === 'cline' && (
                  <>
                    <li>Trong Cline panel → ⚙ Settings</li>
                    <li>API Provider: chọn <strong>"DeepSeek"</strong></li>
                    <li>Paste API Key</li>
                    <li>Model: chọn <code className="font-mono bg-muted/60 px-1 rounded">deepseek-chat</code></li>
                  </>
                )}
              </ol>
              <p className="pt-1 text-cyan-200/70">
                💰 DeepSeek pricing: $0.14/M input + $0.28/M output — RẺ hơn Claude ~50×.
                Top-up ~$5 USD đủ dùng vài tháng cho cá nhân.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      title: `Bước 4 — Khởi động lại ${info.name} & test`,
      body: (
        <div className="text-sm text-muted-foreground space-y-2">
          {client === 'claude-desktop' && (
            <p>
              <strong>Quit hoàn toàn</strong> Claude Desktop (Cmd+Q trên macOS) rồi mở lại.
              Trong cửa sổ chat mới, bấm biểu tượng 🔌 ở góc dưới — sẽ thấy <strong>"aeroedu" 24 tools</strong>.
            </p>
          )}
          {client === 'cursor' && (
            <p>
              Restart Cursor (Cmd+Shift+P → "Reload Window"). Mở chat AI (Cmd+L) → chọn model DeepSeek/Claude →
              dấu 🛠 sẽ hiện <strong>"aeroedu" 24 tools</strong>.
            </p>
          )}
          {client === 'cherry-studio' && (
            <p>
              Sau khi Save MCP server → bật toggle Enable. Mở chat mới → chọn model DeepSeek hoặc Claude →
              dưới ô nhập prompt, bấm icon 🔌 → tick chọn <strong>"aeroedu"</strong> → 24 tools sẵn sàng.
            </p>
          )}
          {client === 'cline' && (
            <p>
              Cline tự reload khi config thay đổi. Tab "MCP Servers" sẽ hiện <strong>"aeroedu"</strong> với
              indicator xanh + 24 tools listed.
            </p>
          )}
          <p>Test bằng prompt:</p>
          <div className="relative">
            <pre className="bg-muted/40 border border-border rounded-lg px-4 py-3 text-xs font-mono text-foreground whitespace-pre-wrap">
              {`Liệt kê 5 khoá học gần nhất của tôi trên inphysic.com (dùng tool aeroedu_course_list)`}
            </pre>
            <CopyButton
              text="Liệt kê 5 khoá học gần nhất của tôi trên inphysic.com (dùng tool aeroedu_course_list)"
              className="absolute top-2 right-2"
            />
          </div>
          <p className="text-xs">
            Model (DeepSeek/Claude) sẽ gọi tool, MCP exchange API key → JWT (cache 90 ngày), trả về data thật từ inphysic.com.
          </p>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
            <p className="font-medium text-amber-300 mb-1">Troubleshooting nhanh:</p>
            <ul className="space-y-0.5 ml-3 list-disc text-amber-200/80">
              <li>Không thấy "aeroedu" → kiểm tra JSON syntax (dấu phẩy thừa?) qua jsonlint.com</li>
              <li>Tool báo "401 unauthorized" → key revoke/sai → tạo key mới ở /teacher/api-keys</li>
              <li>"Cannot find module" → đường dẫn dist/index.js sai → check lại <code className="font-mono bg-muted/60 px-1 rounded">pwd</code></li>
              <li>"DeepSeek 503 Insufficient Balance" → vào platform.deepseek.com top-up</li>
              <li>"DeepSeek/Claude không gọi tools" → model chưa hỗ trợ function calling → đổi model</li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Terminal className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground text-sm">Hướng dẫn cài đặt MCP (DeepSeek · Claude · GPT)</p>
            <p className="text-xs text-muted-foreground">Kết nối Claude Desktop · Cursor · Cherry Studio · Cline (4 bước)</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {steps.map((step, idx) => (
            <StepRow key={idx} step={step} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div className="px-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3.5 gap-3 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/40 border border-border flex-shrink-0">
            {step.icon}
          </div>
          <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
            {step.title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && <div className="pb-4">{step.body}</div>}
    </div>
  )
}

/* ─────────────────────────── Main page ─────────────────────────── */

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<NewKeyResult | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/user/api-keys')
      setKeys(data.keys ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách key')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const handleCreate = async () => {
    const name = newKeyName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    try {
      const data = await apiFetch('/api/user/api-keys', {
        method: 'POST',
        body: { name },
      })
      setRevealedKey({ id: data.id, key: data.key, prefix: data.prefix, name: data.name })
      setNewKeyName('')
      await loadKeys()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Tạo key thất bại')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Thu hồi key này? Hành động không thể hoàn tác.')) return
    setRevoking(id)
    try {
      await apiFetch(`/api/user/api-keys/${id}`, { method: 'DELETE' })
      await loadKeys()
    } catch {
      /* ignore */
    } finally {
      setRevoking(null)
    }
  }

  const activeKeys = keys.filter(k => !k.revoked)

  /* ── Stats ── */
  const stats = [
    {
      icon: <Zap className="w-5 h-5 text-blue-400" />,
      bg: 'bg-blue-500/10 border-blue-500/20',
      label: 'MCP Tools',
      value: '24',
    },
    {
      icon: <Monitor className="w-5 h-5 text-purple-400" />,
      bg: 'bg-purple-500/10 border-purple-500/20',
      label: 'Thiết bị',
      value: 'Không giới hạn',
    },
    {
      icon: <Key className="w-5 h-5 text-green-400" />,
      bg: 'bg-green-500/10 border-green-500/20',
      label: 'Hoạt động',
      value: loading ? '…' : `${activeKeys.length} key`,
    },
    {
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      bg: 'bg-amber-500/10 border-amber-500/20',
      label: 'Hết hạn',
      value: 'Không',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        </div>
        <p className="text-sm text-muted-foreground pl-[52px]">
          Kết nối Claude Desktop / Cursor với AeroEdu qua MCP server
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className="flex flex-col gap-2 px-4 py-3.5 rounded-xl bg-card border border-border"
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create key */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Tạo API Key mới</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Tên key, vd: Laptop cá nhân, Cursor IDE…"
            maxLength={80}
            disabled={creating}
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {creating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {creating ? 'Đang tạo…' : 'Tạo API Key'}
          </button>
        </div>
        {createError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {createError}
          </p>
        )}
      </div>

      {/* Key list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            Danh sách API Key
          </h2>
          <button
            onClick={loadKeys}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Tải lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-5 py-4 text-sm text-red-400 bg-red-500/5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="divide-y divide-border">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-28 h-5 bg-muted/50 rounded" />
                <div className="flex-1 h-4 bg-muted/40 rounded" />
                <div className="w-24 h-4 bg-muted/30 rounded" />
                <div className="w-16 h-4 bg-muted/30 rounded" />
                <div className="w-8 h-8 bg-muted/30 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/40 border border-border">
              <Key className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Chưa có API Key nào. Tạo key đầu tiên của bạn!</p>
          </div>
        )}

        {/* Key rows */}
        {!loading && !error && keys.length > 0 && (
          <>
            {/* Table header — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-[180px_1fr_160px_160px_44px] gap-3 px-5 py-2 border-b border-border bg-muted/20">
              {['Key', 'Tên', 'Tạo lúc', 'Dùng gần nhất', ''].map((h, i) => (
                <span key={i} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {h}
                </span>
              ))}
            </div>

            <div className="divide-y divide-border">
              {keys.map(k => (
                <KeyRow
                  key={k.id}
                  apiKey={k}
                  onRevoke={handleRevoke}
                  revoking={revoking === k.id}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Setup guide */}
      <SetupGuide />

      {/* One-time reveal modal */}
      {revealedKey && (
        <NewKeyModal result={revealedKey} onClose={() => setRevealedKey(null)} />
      )}
    </div>
  )
}

/* ─────────────────────────── Key row ─────────────────────────── */

function KeyRow({
  apiKey,
  onRevoke,
  revoking,
}: {
  apiKey: ApiKey
  onRevoke: (id: string) => void
  revoking: boolean
}) {
  return (
    <div
      className={`px-5 py-3.5 transition-colors ${
        apiKey.revoked ? 'opacity-40' : 'hover:bg-muted/20'
      }`}
    >
      {/* Desktop grid */}
      <div className="hidden sm:grid grid-cols-[180px_1fr_160px_160px_44px] gap-3 items-center">
        {/* Prefix */}
        <code className="font-mono text-xs text-foreground bg-muted/40 border border-border px-2 py-1 rounded-lg truncate">
          {maskPrefix(apiKey.key_prefix)}
        </code>

        {/* Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-foreground truncate">{apiKey.name}</span>
          {apiKey.revoked && (
            <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
              Thu hồi
            </span>
          )}
        </div>

        {/* Created */}
        <span className="text-xs text-muted-foreground">{fmtDate(apiKey.created_at)}</span>

        {/* Last used */}
        <span className="text-xs text-muted-foreground">{fmtDate(apiKey.last_used_at)}</span>

        {/* Revoke */}
        {!apiKey.revoked && (
          <button
            onClick={() => onRevoke(apiKey.id)}
            disabled={revoking}
            title="Thu hồi key này"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-40 transition-all"
          >
            {revoking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Mobile card */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between gap-2">
          <code className="font-mono text-xs text-foreground bg-muted/40 border border-border px-2 py-1 rounded-lg">
            {maskPrefix(apiKey.key_prefix)}
          </code>
          {apiKey.revoked ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
              Thu hồi
            </span>
          ) : (
            <button
              onClick={() => onRevoke(apiKey.id)}
              disabled={revoking}
              title="Thu hồi key này"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-40 transition-all"
            >
              {revoking ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Thu hồi
            </button>
          )}
        </div>
        <p className="text-sm text-foreground font-medium">{apiKey.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Tạo: {fmtDate(apiKey.created_at)}</span>
          {apiKey.last_used_at && (
            <span>Dùng: {fmtDate(apiKey.last_used_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
