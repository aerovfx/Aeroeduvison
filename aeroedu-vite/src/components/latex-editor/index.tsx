import { useRef, useEffect, Suspense, lazy } from 'react'

// Lazy-load Monaco (heavy bundle)
const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then(m => ({ default: m.Editor }))
)

interface LatexEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string
  readOnly?: boolean
  /** Callback nhận Monaco editor instance — parent có thể gọi
   * editor.executeEdits() để insert snippet tại cursor.
   * Pattern: const editorRef = useRef(); <LatexEditor onMount={(e) => editorRef.current = e} />
   */
  onMount?: (editor: any) => void
}

export function LatexEditor({ value, onChange, height = '100%', readOnly, onMount }: LatexEditorProps) {
  const prevValueRef = useRef(value)

  useEffect(() => {
    prevValueRef.current = value
  }, [value])

  const handleEditorChange = (newValue: string | undefined) => {
    const v = newValue ?? ''
    prevValueRef.current = v
    onChange(v)
  }

  return (
    <div style={{ height, minHeight: 300, width: '100%', overflow: 'hidden' }}>
      <Suspense fallback={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#94a3b8', fontSize: 14,
          background: '#0d0e17',
        }}>Đang tải editor...</div>
      }>
        <MonacoEditor
          language="latex"
          theme="vs-dark"
          value={value}
          onChange={handleEditorChange}
          onMount={(editor) => { if (onMount) onMount(editor) }}
          height={height}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            readOnly: !!readOnly,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
          }}
          loading={null}
        />
      </Suspense>
    </div>
  )
}

/** Helper: insert text tại cursor của Monaco editor.
 * Thay thế selection nếu có, hoặc insert tại cursor nếu không.
 */
export function insertAtMonacoCursor(editor: any, text: string) {
  if (!editor) return
  const selection = editor.getSelection()
  if (!selection) return
  editor.executeEdits('snippet-insert', [{
    range: selection,
    text,
    forceMoveMarkers: true,
  }])
  // Move cursor to end of inserted text + focus back vào editor
  editor.focus()
}
