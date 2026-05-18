/**
 * RichTextEditor — Tiptap-based rich text for course content fields
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  Redo2,
  Code,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  minHeight?: number
}

export function RichTextEditor({ value, onChange, placeholder = 'Nhập nội dung...', minHeight = 160 }: Props) {
  const editor = useEditor({
    extensions: [
      // StarterKit 3.x include Underline → disable để khỏi trùng với
      // @tiptap/extension-underline thêm bên dưới (Tiptap warn deduplicate).
      StarterKit.configure({ underline: false } as any),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[inherit] text-sm text-gray-200 prose prose-invert prose-sm max-w-none',
      },
    },
  })

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false as any)
    }
  }, [value])

  if (!editor) return null

  const ToolBtn = ({
    onClick,
    active,
    disabled,
    title,
    children,
  }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-7 h-7 rounded flex items-center justify-center transition-colors text-sm',
        active
          ? 'bg-purple-600 text-white'
          : 'text-gray-400 hover:bg-white/10 hover:text-white',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-lg border border-white/10 focus-within:border-purple-500 transition-colors overflow-hidden bg-white/5">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/10 flex-wrap">
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
        >
          <Code className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-4 bg-white/10 mx-1 ml-auto" />
        <ToolBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>

      {/* Editor area */}
      <div style={{ minHeight }} className="px-4 py-3 cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
