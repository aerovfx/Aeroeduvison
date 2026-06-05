/** Soạn văn bản online (Word-like) — TipTap đầy đủ: định dạng, bảng, ảnh, màu. */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UL, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Highlighter, Image as ImgIcon,
  Table as TableIcon, Link2, Undo2, Redo2, FileDown, Printer, Loader2,
} from 'lucide-react'
import { api } from '@/services/api'
import { uploadFileToGcs } from '@/lib/uploadFile'
import { getOfficeDoc, useOfficeAutosave } from '@/services/office.service'
import type { DocData } from '@/types/office'
import EditorBar from './EditorBar'

function Btn({ on, active, title, children, disabled }: { on: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onMouseDown={(e) => { e.preventDefault(); if (!disabled) on() }} title={title} disabled={disabled}
      className={`w-8 h-8 grid place-items-center rounded-md text-sm transition disabled:opacity-40 ${active ? 'bg-indigo-600 text-white' : 'hover:bg-accent dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
      {children}
    </button>
  )
}
const Sep = () => <div className="w-px h-6 bg-border mx-0.5" />

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [upl, setUpl] = useState(false)
  const addImage = async (f: File) => {
    setUpl(true)
    try { const url = await uploadFileToGcs(f, { folder: 'office' }); editor.chain().focus().setImage({ src: url }).run() } catch { /* noop */ }
    setUpl(false)
  }
  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border bg-slate-50 dark:bg-slate-900 sticky top-[45px] z-10">
      <Btn on={() => editor.chain().focus().undo().run()} title="Hoàn tác"><Undo2 className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().redo().run()} title="Làm lại"><Redo2 className="w-4 h-4" /></Btn>
      <Sep />
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Tiêu đề 1"><Heading1 className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Tiêu đề 2"><Heading2 className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Tiêu đề 3"><Heading3 className="w-4 h-4" /></Btn>
      <Sep />
      <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Đậm"><Bold className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Nghiêng"><Italic className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Gạch chân"><UL className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Gạch ngang"><Strikethrough className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Tô sáng"><Highlighter className="w-4 h-4" /></Btn>
      <label className="w-8 h-8 grid place-items-center rounded-md hover:bg-accent dark:hover:bg-slate-700 cursor-pointer" title="Màu chữ">
        <input type="color" className="w-4 h-4 cursor-pointer border-0 bg-transparent p-0" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
      </label>
      <Sep />
      <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Danh sách"><List className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Danh sách số"><ListOrdered className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Trái"><AlignLeft className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Giữa"><AlignCenter className="w-4 h-4" /></Btn>
      <Btn on={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Phải"><AlignRight className="w-4 h-4" /></Btn>
      <Sep />
      <Btn on={() => { const url = window.prompt('Dán liên kết:'); if (url) editor.chain().focus().setLink({ href: url }).run() }} active={editor.isActive('link')} title="Liên kết"><Link2 className="w-4 h-4" /></Btn>
      <Btn on={() => fileRef.current?.click()} title="Chèn ảnh" disabled={upl}>{upl ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImgIcon className="w-4 h-4" />}</Btn>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} />
      <Btn on={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Chèn bảng"><TableIcon className="w-4 h-4" /></Btn>
    </div>
  )
}

export default function DocEditor() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('Văn bản')
  const [html, setHtml] = useState('')
  const [ready, setReady] = useState(false)
  const [exp, setExp] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, Link.configure({ openOnClick: false }), Image,
      TextStyle, Color, Highlight, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: 'Bắt đầu soạn thảo…' }),
    ],
    content: '',
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  })

  useEffect(() => {
    if (!id || !editor) return
    getOfficeDoc(id).then((d) => {
      setTitle(d.title)
      const h = (d.data as DocData)?.html || '<p></p>'
      editor.commands.setContent(h); setHtml(h); setReady(true)
    }).catch(() => setReady(true))
  }, [id, editor])

  const status = useOfficeAutosave(id, ready, () => ({ title, data: { html } }), [title, html])

  const printDoc = () => {
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>${title}</title><meta charset="utf-8"><style>
      body{font-family:'Times New Roman',serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.6;color:#111}
      img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}
      h1,h2,h3{line-height:1.25}</style></head><body>${html}<script>onload=()=>{print()}</script></body></html>`)
    w.document.close()
  }
  const exportWord = async () => {
    setExp(true)
    try {
      const resp = await api.post('/office/to-docx', { html, filename: title }, { responseType: 'blob', timeout: 60000 })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
      const a = document.createElement('a'); a.href = url; a.download = `${title}.docx`; a.click(); URL.revokeObjectURL(url)
    } catch { /* noop */ }
    setExp(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground">
      <EditorBar title={title} onTitle={setTitle} status={status}>
        <button onClick={printDoc} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-border inline-flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> In/PDF</button>
        <button onClick={exportWord} disabled={exp} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white inline-flex items-center gap-1 disabled:opacity-50">{exp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Word</button>
      </EditorBar>
      {editor && <Toolbar editor={editor} />}
      <div className="max-w-3xl mx-auto my-6 px-2">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-border min-h-[60vh] p-8 sm:p-12 office-doc">
          <EditorContent editor={editor} />
        </div>
      </div>
      <style>{`
        .office-doc .ProseMirror{outline:none;min-height:50vh;line-height:1.6}
        .office-doc .ProseMirror h1{font-size:1.8em;font-weight:800;margin:.6em 0 .3em}
        .office-doc .ProseMirror h2{font-size:1.4em;font-weight:700;margin:.6em 0 .3em}
        .office-doc .ProseMirror h3{font-size:1.15em;font-weight:700;margin:.5em 0 .25em}
        .office-doc .ProseMirror p{margin:.4em 0}
        .office-doc .ProseMirror ul{list-style:disc;padding-left:1.4em}
        .office-doc .ProseMirror ol{list-style:decimal;padding-left:1.4em}
        .office-doc .ProseMirror img{max-width:100%;border-radius:6px}
        .office-doc .ProseMirror table{border-collapse:collapse;width:100%;margin:.5em 0}
        .office-doc .ProseMirror td,.office-doc .ProseMirror th{border:1px solid #cbd5e1;padding:6px 8px;min-width:40px}
        .office-doc .ProseMirror th{background:rgba(99,102,241,.1);font-weight:700}
        .office-doc .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#94a3b8;float:left;height:0;pointer-events:none}
      `}</style>
    </div>
  )
}
