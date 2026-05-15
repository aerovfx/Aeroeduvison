/**
 * RichTextEditor — WYSIWYG editor cho giáo án (Google Docs-like)
 *
 * Stack: TipTap 3.x với extensions:
 *  - StarterKit (paragraph, heading, bold, italic, strike, code, lists,
 *    blockquote, code-block, horizontal-rule, hard-break)
 *  - Underline
 *  - TextAlign (left/center/right/justify)
 *  - TextStyle + Color (text color)
 *  - Highlight (background highlight)
 *  - Link
 *  - Table + TableRow + TableCell + TableHeader
 *  - Placeholder
 *
 * Toolbar full Google Docs-like:
 *  Heading1-3 / Paragraph | Bold/Italic/Underline/Strike | Color/Highlight |
 *  Align L/C/R/J | List bullet/ordered | Quote/Code | Table | Link/Image | Undo/Redo
 */
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code,
  Heading1, Heading2, Heading3, Pilcrow,
  Link as LinkIcon, Table as TableIcon, Minus,
  Undo2, Redo2, Highlighter, Palette, Sigma,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { MathInline, MathBlock } from './MathExtension'

interface RichTextEditorProps {
  /** Initial HTML content */
  value: string
  /** Called every time content changes */
  onChange: (html: string, json: any) => void
  /** Placeholder when empty */
  placeholder?: string
  /** Read-only mode */
  editable?: boolean
}

const TEXT_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#0891b2', '#2563eb', '#7c3aed', '#db2777',
]

const HIGHLIGHT_COLORS = [
  '#fef9c3', '#fed7aa', '#fecaca', '#bbf7d0',
  '#bae6fd', '#c7d2fe', '#e9d5ff', '#fbcfe8',
]

export default function RichTextEditor({ value, onChange, placeholder, editable = true }: RichTextEditorProps) {
  const [linkPickerOpen, setLinkPickerOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // StarterKit 3.x đã include Underline + Link → disable để tránh
        // "duplicate extension" warning khi register thêm.
        underline: false,
        link: false,
      } as any),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link', target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      MathInline,
      MathBlock,
      Placeholder.configure({ placeholder: placeholder || 'Bắt đầu soạn giáo án... (gõ $E=mc^2$ → tự render công thức)' }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getJSON())
    },
  })

  // Sync external value change → editor (for loading existing doc)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor === null])

  if (!editor) return <div style={{ padding: 20, color: '#94a3b8' }}>Đang tải editor...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 8 }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb', borderRadius: '8px 8px 0 0', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Heading + paragraph */}
        <ToolbarBtn
          icon={<Pilcrow size={15} />}
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Đoạn văn"
        />
        <ToolbarBtn
          icon={<Heading1 size={15} />}
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Tiêu đề lớn (H1)"
        />
        <ToolbarBtn
          icon={<Heading2 size={15} />}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Tiêu đề vừa (H2)"
        />
        <ToolbarBtn
          icon={<Heading3 size={15} />}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Tiêu đề nhỏ (H3)"
        />

        <Divider />

        {/* Bold/Italic/Underline/Strike */}
        <ToolbarBtn
          icon={<Bold size={15} />}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="In đậm (Ctrl+B)"
        />
        <ToolbarBtn
          icon={<Italic size={15} />}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="In nghiêng (Ctrl+I)"
        />
        <ToolbarBtn
          icon={<UnderlineIcon size={15} />}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Gạch chân (Ctrl+U)"
        />
        <ToolbarBtn
          icon={<Strikethrough size={15} />}
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Gạch ngang"
        />

        <Divider />

        {/* Text color */}
        <div style={{ position: 'relative' }}>
          <ToolbarBtn
            icon={<Palette size={15} style={{ color: editor.getAttributes('textStyle').color || '#000' }} />}
            active={colorPickerOpen}
            onClick={() => { setColorPickerOpen(o => !o); setHighlightPickerOpen(false) }}
            title="Màu chữ"
          />
          {colorPickerOpen && (
            <div style={{
              position: 'absolute', top: 32, left: 0, zIndex: 20,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
            }}>
              {TEXT_COLORS.map(c => (
                <button key={c} onClick={() => {
                  editor.chain().focus().setColor(c).run()
                  setColorPickerOpen(false)
                }} style={{
                  width: 24, height: 24, borderRadius: 4, background: c,
                  border: '1px solid #d1d5db', cursor: 'pointer',
                }} title={c} />
              ))}
              <button onClick={() => {
                editor.chain().focus().unsetColor().run()
                setColorPickerOpen(false)
              }} style={{
                gridColumn: 'span 4', padding: '4px 8px', fontSize: 11,
                background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4,
                cursor: 'pointer', color: '#374151',
              }}>Bỏ màu</button>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div style={{ position: 'relative' }}>
          <ToolbarBtn
            icon={<Highlighter size={15} />}
            active={editor.isActive('highlight')}
            onClick={() => { setHighlightPickerOpen(o => !o); setColorPickerOpen(false) }}
            title="Tô nền"
          />
          {highlightPickerOpen && (
            <div style={{
              position: 'absolute', top: 32, left: 0, zIndex: 20,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
            }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c} onClick={() => {
                  editor.chain().focus().toggleHighlight({ color: c }).run()
                  setHighlightPickerOpen(false)
                }} style={{
                  width: 24, height: 24, borderRadius: 4, background: c,
                  border: '1px solid #d1d5db', cursor: 'pointer',
                }} title={c} />
              ))}
              <button onClick={() => {
                editor.chain().focus().unsetHighlight().run()
                setHighlightPickerOpen(false)
              }} style={{
                gridColumn: 'span 4', padding: '4px 8px', fontSize: 11,
                background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4,
                cursor: 'pointer', color: '#374151',
              }}>Bỏ nền</button>
            </div>
          )}
        </div>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn
          icon={<AlignLeft size={15} />}
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Căn trái"
        />
        <ToolbarBtn
          icon={<AlignCenter size={15} />}
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Căn giữa"
        />
        <ToolbarBtn
          icon={<AlignRight size={15} />}
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Căn phải"
        />
        <ToolbarBtn
          icon={<AlignJustify size={15} />}
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Căn đều 2 bên"
        />

        <Divider />

        {/* Lists */}
        <ToolbarBtn
          icon={<List size={15} />}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Liệt kê đầu dòng"
        />
        <ToolbarBtn
          icon={<ListOrdered size={15} />}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Liệt kê đánh số"
        />

        <Divider />

        {/* Quote / Code */}
        <ToolbarBtn
          icon={<Quote size={15} />}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Trích dẫn"
        />
        <ToolbarBtn
          icon={<Code size={15} />}
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Khối mã"
        />

        <Divider />

        {/* Table */}
        <ToolbarBtn
          icon={<TableIcon size={15} />}
          active={false}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Chèn bảng 3x3"
        />

        {/* Math (LaTeX inline + block) */}
        <ToolbarBtn
          icon={<Sigma size={15} />}
          active={editor.isActive('mathInline') || editor.isActive('mathBlock')}
          onClick={() => {
            const latex = window.prompt(
              'Nhập công thức LaTeX (vd: x^2 + y^2 = z^2):\n\nMẹo: dùng $...$ inline trong text, hoặc bấm OK để chèn dạng inline ngay đây.',
              ''
            )
            if (latex && latex.trim()) {
              editor.chain().focus().insertMathInline(latex.trim()).run()
            }
          }}
          title="Chèn công thức LaTeX (KaTeX) — hoặc gõ $...$ trong text để auto-render"
        />

        {/* Link */}
        <div style={{ position: 'relative' }}>
          <ToolbarBtn
            icon={<LinkIcon size={15} />}
            active={editor.isActive('link')}
            onClick={() => {
              setLinkUrl(editor.getAttributes('link').href || '')
              setLinkPickerOpen(o => !o)
            }}
            title="Chèn liên kết"
          />
          {linkPickerOpen && (
            <div style={{
              position: 'absolute', top: 32, left: 0, zIndex: 20,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minWidth: 280, display: 'flex', gap: 6,
            }}>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  flex: 1, padding: '6px 10px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: 13, outline: 'none', color: '#111',
                }} />
              <button onClick={() => {
                if (linkUrl.trim()) {
                  editor.chain().focus().extendMarkRange('link')
                    .setLink({ href: linkUrl.trim() }).run()
                } else {
                  editor.chain().focus().unsetLink().run()
                }
                setLinkPickerOpen(false)
              }} style={{
                padding: '6px 12px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}>Chèn</button>
            </div>
          )}
        </div>

        {/* Horizontal rule */}
        <ToolbarBtn
          icon={<Minus size={15} />}
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Đường ngang"
        />

        <Divider />

        {/* Undo / Redo */}
        <ToolbarBtn
          icon={<Undo2 size={15} />}
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          title="Hoàn tác (Ctrl+Z)"
          disabled={!editor.can().undo()}
        />
        <ToolbarBtn
          icon={<Redo2 size={15} />}
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          title="Làm lại (Ctrl+Y)"
          disabled={!editor.can().redo()}
        />
      </div>

      {/* ── Editor body ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px 36px',
        background: '#fff', color: '#111827', fontSize: 15, lineHeight: 1.7,
      }}
        onClick={(e) => {
          // Close popovers when clicking outside
          if ((e.target as HTMLElement).tagName !== 'BUTTON') {
            setColorPickerOpen(false)
            setHighlightPickerOpen(false)
            setLinkPickerOpen(false)
          }
        }}
      >
        <style>{`
          .ProseMirror { outline: none; min-height: 400px; }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
          .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
          .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
          .ProseMirror p { margin: 0.5rem 0; }
          .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin: 0.5rem 0; }
          .ProseMirror blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 1rem;
            margin: 0.75rem 0;
            color: #4b5563;
            font-style: italic;
          }
          .ProseMirror pre {
            background: #f3f4f6;
            color: #111;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            font-family: ui-monospace, monospace;
            font-size: 0.85em;
            overflow-x: auto;
          }
          .ProseMirror code {
            background: #f3f4f6;
            padding: 1px 5px;
            border-radius: 3px;
            font-family: ui-monospace, monospace;
            font-size: 0.9em;
          }
          .ProseMirror table {
            border-collapse: collapse;
            margin: 0.75rem 0;
            overflow: hidden;
            table-layout: fixed;
            width: 100%;
          }
          .ProseMirror table td, .ProseMirror table th {
            border: 1.5px solid #d1d5db;
            box-sizing: border-box;
            min-width: 1em;
            padding: 6px 10px;
            position: relative;
            vertical-align: top;
          }
          .ProseMirror table th {
            background: #f3f4f6;
            font-weight: 700;
            text-align: left;
          }
          .ProseMirror table .selectedCell:after {
            background: rgba(124, 58, 237, 0.1);
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
          }
          .ProseMirror hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 1.5rem 0;
          }
          .ProseMirror a.tiptap-link {
            color: #2563eb;
            text-decoration: underline;
            cursor: pointer;
          }
          .ProseMirror :focus {
            outline: none;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarBtn({ icon, active, onClick, title, disabled }: {
  icon: React.ReactNode; active: boolean; onClick: () => void;
  title: string; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        padding: '5px 7px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#e0e7ff' : 'transparent',
        border: 'none', color: disabled ? '#d1d5db' : (active ? '#4338ca' : '#374151'),
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = '#f3f4f6' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
    </button>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
}

/** Helper: extract editor instance for parent to call commands */
export type { Editor }
