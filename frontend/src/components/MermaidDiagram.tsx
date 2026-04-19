import { useEffect, useRef } from 'react'

let _idCounter = 0
let _mermaidReady: Promise<typeof import('mermaid')['default']> | null = null

function loadMermaid() {
  if (!_mermaidReady) {
    _mermaidReady = import('mermaid').then(m => {
      m.default.initialize({ startOnLoad: false, theme: 'dark', darkMode: true })
      return m.default
    })
  }
  return _mermaidReady
}

interface Props {
  code: string
  streaming?: boolean
}

export function MermaidDiagram({ code, streaming }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (streaming || !containerRef.current) return
    const el = containerRef.current
    const id = `mermaid-${_idCounter++}`

    const normalized = code.replace(/(-->\|[^|]*\|)>/g, '$1')
    loadMermaid()
      .then(async mermaid => {
        await mermaid.parse(normalized)
        return mermaid.render(id, normalized)
      })
      .then(({ svg }) => {
        if (el.isConnected) el.innerHTML = svg
      })
      .catch((err: unknown) => {
        console.error('[Mermaid] render failed:', err)
        if (el.isConnected) {
          el.innerHTML = `<pre style="font:12px/1.5 var(--mono);color:var(--text2);white-space:pre-wrap;margin:0">${code}</pre>`
        }
      })
  }, [code, streaming])

  return (
    <div
      ref={containerRef}
      style={{ margin: '10px 0', overflowX: 'auto', minHeight: streaming ? 0 : 20 }}
    />
  )
}
