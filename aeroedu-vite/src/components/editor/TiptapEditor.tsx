/**
 * TiptapEditor — Rich text editor cho course forms
 * Dùng trong: CreateCourse, EditCourse (overview, requirements, what_you_will_learn, ...)
 * Output: HTML string (lưu DB, hiển thị bằng dangerouslySetInnerHTML)
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: number
  readOnly?: boolean
  className?: string
}

interface ToolbarBtnProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarBtn({ onClick, active, disabled, title, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded transition-colors text-sm',
        active
          ? 'bg-purple-500/30 text-purple-300'
          : 'text-gray-400 hover:text-white hover:bg-white/10',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

export default function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = 140,
  readOnly = false,
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: 'tiptap-ul' } },
        orderedList: { HTMLAttributes: { class: 'tiptap-ol' } },
        listItem: { HTMLAttributes: { class: 'tiptap-li' } },
        heading: { levels: [2, 3] },
        // StarterKit 3.x đã include Underline → disable để không trùng
        // với @tiptap/extension-underline thêm bên dưới.
        underline: false,
      } as any),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. when EditCourse loads course data)
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    if (value !== currentHtml && value !== undefined) {
      // Avoid cursor jump when user is typing
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-white/10 focus-within:border-purple-500 bg-white/5 overflow-hidden transition-colors',
        className
      )}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/10 bg-white/[0.03]">
          <ToolbarBtn
            title="In đậm (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            title="In nghiêng (Ctrl+I)"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Gạch chân (Ctrl+U)"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <ToolbarBtn
            title="Tiêu đề H2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Tiêu đề H3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <ToolbarBtn
            title="Danh sách gạch đầu dòng"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Danh sách đánh số"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Đường kẻ ngang"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <ToolbarBtn
            title="Hoàn tác (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Làm lại (Ctrl+Y)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="tiptap-content"
        style={{ minHeight }}
      />
    </div>
  )
}
