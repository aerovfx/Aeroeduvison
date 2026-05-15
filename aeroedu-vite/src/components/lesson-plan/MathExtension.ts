/**
 * MathExtension — TipTap custom nodes cho công thức LaTeX
 *
 * 2 nodes:
 *   - mathInline ($...$)    → render KaTeX inline (atom, không edit in-place)
 *   - mathBlock  ($$...$$)  → render KaTeX display (block căn giữa)
 *
 * Input rules (auto-convert khi gõ):
 *   $E=mc^2$<space>      → math inline
 *   $$\int_0^1 x dx$$    → math block (trên dòng riêng)
 *
 * Click vào math node → prompt sửa LaTeX. Atom nên KHÔNG nhập trực tiếp,
 * phải sửa qua prompt hoặc xoá rồi gõ lại.
 *
 * Commands:
 *   editor.commands.insertMathInline('x^2 + y^2')
 *   editor.commands.insertMathBlock('\\int_0^\\infty e^{-x} dx')
 */
import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import katex from 'katex'
import 'katex/dist/katex.min.css'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: (latex: string) => ReturnType
    }
    mathBlock: {
      insertMathBlock: (latex: string) => ReturnType
    }
  }
}

/** Helper: render LaTeX vào DOM element bằng KaTeX, fallback nếu lỗi */
function renderKatexInto(el: HTMLElement, latex: string, displayMode: boolean) {
  try {
    katex.render(latex, el, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: 'html',
    })
  } catch (e: any) {
    el.textContent = (displayMode ? '$$' : '$') + latex + (displayMode ? '$$' : '$')
    el.style.color = '#dc2626'
    el.title = `LaTeX error: ${e?.message || 'unknown'}`
  }
}

/** NodeView cho cả inline + block math.
 * Click → prompt sửa LaTeX. Display `editing` cờ visual khi user click.
 */
function createMathNodeView(displayMode: boolean) {
  return ({ node, editor, getPos }: any) => {
    const wrapper = document.createElement(displayMode ? 'div' : 'span')
    wrapper.setAttribute(displayMode ? 'data-math-block' : 'data-math-inline', '')
    wrapper.setAttribute('data-latex', node.attrs.latex || '')
    wrapper.className = displayMode ? 'tiptap-math-block' : 'tiptap-math-inline'
    wrapper.contentEditable = 'false'

    if (displayMode) {
      wrapper.style.display = 'block'
      wrapper.style.margin = '0.5em auto'
      wrapper.style.textAlign = 'center'
      wrapper.style.cursor = 'pointer'
    } else {
      wrapper.style.display = 'inline-block'
      wrapper.style.cursor = 'pointer'
      wrapper.style.padding = '0 2px'
      wrapper.style.borderRadius = '2px'
      wrapper.style.transition = 'background 0.15s'
    }

    renderKatexInto(wrapper, node.attrs.latex || '', displayMode)

    // Click → prompt sửa LaTeX
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation()
      const oldLatex = node.attrs.latex || ''
      const newLatex = window.prompt(
        displayMode
          ? 'Sửa công thức LaTeX (block):'
          : 'Sửa công thức LaTeX (inline):',
        oldLatex
      )
      if (newLatex === null) return  // user cancel
      const trimmed = newLatex.trim()
      if (!trimmed) {
        // Empty → delete node
        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos != null) {
          editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
        }
        return
      }
      // Update attrs
      const pos = typeof getPos === 'function' ? getPos() : null
      if (pos != null) {
        editor.chain().focus().setNodeSelection(pos).updateAttributes(
          displayMode ? 'mathBlock' : 'mathInline',
          { latex: trimmed }
        ).run()
      }
    })

    // Hover bg để báo "click để sửa"
    wrapper.addEventListener('mouseenter', () => {
      wrapper.style.background = displayMode ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.12)'
    })
    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.background = ''
    })

    return {
      dom: wrapper,
      // Re-render KaTeX khi node attrs thay đổi
      update: (newNode: any) => {
        if (newNode.type !== node.type) return false
        if (newNode.attrs.latex !== node.attrs.latex) {
          wrapper.setAttribute('data-latex', newNode.attrs.latex || '')
          wrapper.innerHTML = ''
          renderKatexInto(wrapper, newNode.attrs.latex || '', displayMode)
        }
        return true
      },
    }
  }
}

// ─── Inline math: $...$ ─────────────────────────────────────
export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: { default: '' },
    }
  },

  parseHTML() {
    return [{
      tag: 'span[data-math-inline]',
      getAttrs: (dom: any) => ({ latex: dom.getAttribute('data-latex') || '' }),
    }]
  },

  renderHTML({ HTMLAttributes }) {
    // Server-side / clipboard fallback: render thành KaTeX HTML pre-rendered
    const latex = HTMLAttributes.latex || ''
    let html = `<span class="katex-fallback">$${latex}$</span>`
    try {
      html = katex.renderToString(latex, { throwOnError: false, output: 'html' })
    } catch {}
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-math-inline': '',
      'data-latex': latex,
      class: 'tiptap-math-inline',
      contenteditable: 'false',
      // innerHTML sẽ được render thực tế bởi NodeView trong editor
      // (renderHTML chỉ dùng cho serialize → HTML xuất)
    }), html] as any
  },

  addNodeView() {
    return createMathNodeView(false)
  },

  addCommands() {
    return {
      insertMathInline: (latex: string) => ({ chain }) => {
        if (!latex.trim()) return false
        return chain().insertContent({
          type: this.name,
          attrs: { latex },
        }).insertContent(' ').run()
      },
    }
  },

  // Input rule: $...$ + space → tự convert thành math inline
  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|[\s,.;:!?])\$([^$\n]+)\$(?:\s)$/,
        handler: ({ state, range, match }) => {
          const latex = match[1].trim()
          if (!latex) return
          // Tính lại range: bỏ leading whitespace + trailing space
          const fullMatch = match[0]
          const dollarStart = fullMatch.indexOf('$')
          const startInDoc = range.from + dollarStart
          // Replace từ '$' đầu tiên tới ' ' cuối (giữ lại trailing space)
          state.tr.replaceWith(startInDoc, range.to - 1, this.type.create({ latex }))
        },
      }),
    ]
  },
})

// ─── Block math: $$...$$ ────────────────────────────────────
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      latex: { default: '' },
    }
  },

  parseHTML() {
    return [{
      tag: 'div[data-math-block]',
      getAttrs: (dom: any) => ({ latex: dom.getAttribute('data-latex') || '' }),
    }]
  },

  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes.latex || ''
    let html = `<div class="katex-fallback">$$${latex}$$</div>`
    try {
      html = katex.renderToString(latex, { displayMode: true, throwOnError: false, output: 'html' })
    } catch {}
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-math-block': '',
      'data-latex': latex,
      class: 'tiptap-math-block',
      contenteditable: 'false',
    }), html] as any
  },

  addNodeView() {
    return createMathNodeView(true)
  },

  addCommands() {
    return {
      insertMathBlock: (latex: string) => ({ chain }) => {
        if (!latex.trim()) return false
        return chain().insertContent({
          type: this.name,
          attrs: { latex },
        }).run()
      },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$\$([^$\n]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1].trim()
          if (!latex) return
          state.tr.replaceWith(range.from, range.to, this.type.create({ latex }))
        },
      }),
    ]
  },
})

export default [MathInline, MathBlock]
