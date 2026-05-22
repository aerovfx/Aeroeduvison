/**
 * NodeBrainPanel — Collaborative knowledge panel cho mỗi KG node.
 *
 * 2 tabs:
 *   📝 Ghi chú (Note) — personal, có thể share public
 *   💬 Thảo luận (Comments) — public, threaded, upvotable
 *
 * Tích hợp vào node detail drawer của KnowledgeGraph page.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  StickyNote, MessageCircle, Globe2, Lock, Save, Loader2,
  ArrowUp, Trash2, Send, GraduationCap, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  knowledgeGraphBrain as kgb,
  type KgComment, type KgSharedNote,
} from '@/services/knowledge-graph.service'

interface Props {
  nodeId: string
  nodeLabel: string
}

type Tab = 'note' | 'discuss'

export default function NodeBrainPanel({ nodeId, nodeLabel }: Props) {
  const [tab, setTab] = useState<Tab>('note')

  return (
    <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/50">
        <button
          onClick={() => setTab('note')}
          className={`flex-1 px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
            tab === 'note'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/5'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" /> Ghi chú
        </button>
        <button
          onClick={() => setTab('discuss')}
          className={`flex-1 px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
            tab === 'discuss'
              ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/5'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" /> Thảo luận
        </button>
      </div>

      <div className="p-3">
        {tab === 'note' ? (
          <NoteTab nodeId={nodeId} nodeLabel={nodeLabel} />
        ) : (
          <DiscussTab nodeId={nodeId} nodeLabel={nodeLabel} />
        )}
      </div>
    </div>
  )
}

/* ─────────────────── Note tab ─────────────────── */

function NoteTab({ nodeId }: { nodeId: string; nodeLabel: string }) {
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasNote, setHasNote] = useState(false)

  useEffect(() => {
    setLoading(true)
    kgb.getNote(nodeId)
      .then(r => {
        if (r.note) {
          setContent(r.note.content)
          setIsPublic(r.note.is_public)
          setHasNote(true)
        } else {
          setContent('')
          setIsPublic(false)
          setHasNote(false)
        }
      })
      .catch(() => toast.error('Không tải được ghi chú'))
      .finally(() => setLoading(false))
  }, [nodeId])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const r = await kgb.saveNote(nodeId, content, isPublic)
      if (r.deleted) {
        toast.success('Đã xoá ghi chú')
        setHasNote(false)
      } else {
        toast.success(isPublic ? 'Đã lưu + chia sẻ với cộng đồng' : 'Đã lưu (chỉ mình bạn xem)')
        setHasNote(true)
      }
    } catch (e: any) {
      toast.error(`Lỗi lưu: ${e?.message || 'thử lại'}`)
    } finally {
      setSaving(false)
    }
  }, [nodeId, content, isPublic])

  if (loading) {
    return (
      <div className="text-center py-6">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-500 leading-snug">
        Ghi chú cá nhân để học sau. Bật "Chia sẻ" để giúp bạn bè cùng học topic này.
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Vd: Mẹo nhớ: F=ma → 'For Money Always'. Hoặc câu hỏi mình chưa hiểu..."
        rows={6}
        maxLength={4000}
        className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700
                   text-xs text-zinc-100 placeholder:text-zinc-600 leading-relaxed
                   focus:outline-none focus:border-amber-400/50 resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-zinc-600"
          />
          {isPublic ? (
            <><Globe2 className="w-3 h-3 text-emerald-400" /> Chia sẻ public</>
          ) : (
            <><Lock className="w-3 h-3 text-zinc-500" /> Chỉ mình tôi</>
          )}
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md
                     bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40
                     text-amber-200 text-[11px] font-bold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {saving ? 'Đang lưu' : hasNote ? 'Cập nhật' : 'Lưu'}
        </button>
      </div>
      <p className="text-[10px] text-zinc-600">
        {content.length}/4000 ký tự · Để trống và lưu sẽ xoá ghi chú
      </p>
    </div>
  )
}

/* ─────────────────── Discuss tab ─────────────────── */

function DiscussTab({ nodeId }: { nodeId: string; nodeLabel: string }) {
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<KgComment[]>([])
  const [sharedNotes, setSharedNotes] = useState<KgSharedNote[]>([])
  const [input, setInput] = useState('')
  const [posting, setPosting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await kgb.listComments(nodeId)
      setComments(r.comments)
      setSharedNotes(r.sharedNotes)
    } catch {} finally { setLoading(false) }
  }, [nodeId])

  useEffect(() => { reload() }, [reload])

  const post = useCallback(async () => {
    const t = input.trim()
    if (!t) return
    setPosting(true)
    try {
      await kgb.addComment(nodeId, t)
      setInput('')
      toast.success('Đã đăng')
      reload()
    } catch (e: any) {
      toast.error(`Lỗi đăng: ${e?.message || 'thử lại'}`)
    } finally {
      setPosting(false)
    }
  }, [nodeId, input, reload])

  const handleUpvote = useCallback(async (id: string) => {
    // Optimistic update
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, myUpvoted: !c.myUpvoted, upvotes: c.upvotes + (c.myUpvoted ? -1 : 1) } : c
    ))
    try {
      await kgb.upvoteComment(id)
    } catch (e: any) {
      toast.error(`Lỗi vote: ${e?.message || 'thử lại'}`)
      reload() // revert via re-fetch
    }
  }, [reload])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Xoá bình luận này?')) return
    try {
      await kgb.deleteComment(id)
      setComments(prev => prev.filter(c => c.id !== id))
      toast.success('Đã xoá')
    } catch (e: any) {
      toast.error(`Lỗi xoá: ${e?.message || 'thử lại'}`)
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Compose */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post()
          }}
          placeholder="Đặt câu hỏi hoặc chia sẻ insight..."
          rows={2}
          maxLength={2000}
          className="flex-1 px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700
                     text-xs text-zinc-100 placeholder:text-zinc-600
                     focus:outline-none focus:border-cyan-400/50 resize-none"
        />
        <button
          onClick={post}
          disabled={posting || !input.trim()}
          className="px-2.5 self-stretch rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30
                     border border-cyan-500/40 text-cyan-200 disabled:opacity-50"
          title="Đăng (Cmd/Ctrl+Enter)"
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>

      {loading && (
        <div className="text-center py-3">
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-zinc-600" />
        </div>
      )}

      {/* Shared notes section (from public note shares) */}
      {sharedNotes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-amber-300/70 uppercase mb-1">
            📝 Ghi chú chia sẻ ({sharedNotes.length})
          </p>
          <div className="space-y-1.5">
            {sharedNotes.map(n => (
              <SharedNoteCard key={n.id} note={n} />
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {comments.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold text-cyan-300/70 uppercase mb-1">
            💬 Bình luận ({comments.length})
          </p>
          <div className="space-y-1.5">
            {comments.map(c => (
              <CommentCard
                key={c.id}
                comment={c}
                onUpvote={() => handleUpvote(c.id)}
                onDelete={c.isOwn ? () => handleDelete(c.id) : undefined}
              />
            ))}
          </div>
        </div>
      ) : !loading && sharedNotes.length === 0 ? (
        <p className="text-center text-[11px] text-zinc-500 italic py-2">
          Chưa có ai bình luận. Hãy là người đầu tiên!
        </p>
      ) : null}
    </div>
  )
}

/* ─────────────────── Helper components ─────────────────── */

function SharedNoteCard({ note }: { note: KgSharedNote }) {
  const isTeacher = note.authorRole === 'TEACHER'
  return (
    <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-center gap-1.5 mb-1">
        {isTeacher ? (
          <GraduationCap className="w-3 h-3 text-amber-400" />
        ) : (
          <User className="w-3 h-3 text-zinc-400" />
        )}
        <span className={`text-[10px] font-bold ${isTeacher ? 'text-amber-300' : 'text-zinc-300'}`}>
          {note.authorName} {isTeacher && '(GV)'}
        </span>
        <span className="text-[9px] text-zinc-500 ml-auto">
          {new Date(note.createdAt).toLocaleDateString('vi-VN')}
        </span>
      </div>
      <p className="text-[11px] text-zinc-200 leading-snug whitespace-pre-wrap">{note.content}</p>
    </div>
  )
}

function CommentCard({
  comment, onUpvote, onDelete,
}: { comment: KgComment; onUpvote: () => void; onDelete?: () => void }) {
  const isTeacher = comment.authorRole === 'TEACHER'
  return (
    <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
      <div className="flex items-center gap-1.5 mb-1">
        {isTeacher ? (
          <GraduationCap className="w-3 h-3 text-amber-400" />
        ) : (
          <User className="w-3 h-3 text-zinc-400" />
        )}
        <span className={`text-[10px] font-bold ${isTeacher ? 'text-amber-300' : comment.isOwn ? 'text-cyan-300' : 'text-zinc-300'}`}>
          {comment.authorName} {isTeacher && '(GV)'} {comment.isOwn && '(bạn)'}
        </span>
        <span className="text-[9px] text-zinc-500 ml-auto">
          {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
        </span>
      </div>
      <p className="text-[11px] text-zinc-200 leading-snug whitespace-pre-wrap mb-1.5">{comment.content}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onUpvote}
          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
            comment.myUpvoted
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-zinc-400 hover:text-cyan-300'
          }`}
        >
          <ArrowUp className="w-2.5 h-2.5" /> {comment.upvotes}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-[10px] text-zinc-500 hover:text-rose-400 ml-auto"
            title="Xoá bình luận của bạn"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  )
}
