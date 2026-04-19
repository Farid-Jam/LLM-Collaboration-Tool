import { useState, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../types'
import { useRoom } from '../context/RoomContext'
import { Avatar } from './Avatar'
import { MermaidDiagram } from './MermaidDiagram'

interface Props {
  message: Message
  prevSameUser?: boolean
  onFork?: (messageId: string, branchName: string) => void
}

export function MessageBubble({ message, prevSameUser = false, onFork }: Props) {
  const { state } = useRoom()
  const isOwn = message.user_id === state.userId
  const isAsst = message.role === 'assistant'
  const isMain = message.branch_id === null

  const [forking, setForking] = useState(false)
  const [branchName, setBranchName] = useState('')

  const senderName = isAsst ? 'Assistant' : (message.display_name ?? 'Unknown')

  function submitFork() {
    const name = branchName.trim()
    if (!name || !onFork) return
    onFork(message.id, name)
    setForking(false)
    setBranchName('')
  }

  const bubbleStyle: React.CSSProperties = {
    maxWidth: '68%', borderRadius: 14,
    padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
    ...(isAsst ? {
      background: 'var(--asst-bg)',
      borderLeft: '2px solid var(--asst-border)',
      color: 'var(--text)',
      borderRadius: '4px 14px 14px 14px',
    } : isOwn ? {
      background: 'var(--own)',
      color: 'var(--own-text)',
    } : {
      background: 'var(--bg3)',
      color: 'var(--text)',
    }),
  }

  const showHeader = !prevSameUser || isAsst

  return (
    <div
      className="msg-group"
      style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        alignItems: isOwn && !isAsst ? 'flex-end' : 'flex-start',
      }}
    >
      {showHeader && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2,
          flexDirection: isOwn && !isAsst ? 'row-reverse' : 'row',
        }}>
          {isAsst ? (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--asst-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>✦</div>
          ) : (
            <Avatar name={senderName} size={22} />
          )}
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
            {senderName}
          </span>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%',
        flexDirection: isOwn && !isAsst ? 'row-reverse' : 'row',
      }}>
        <div style={bubbleStyle}>
          {message.content ? (
            isAsst ? (
              <div className="asst-prose">
                <ThrottledMarkdown content={message.content} streaming={!!message.streaming} />
              </div>
            ) : (
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
                {message.streaming && <StreamingCursor />}
              </span>
            )
          ) : (
            <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
              {[0, 150, 300].map(d => (
                <span key={d} style={{
                  width: 5, height: 5, borderRadius: '50%', background: 'currentColor',
                  display: 'inline-block',
                  animation: `bounce 1s ${d}ms infinite`,
                }} />
              ))}
            </span>
          )}
        </div>
      </div>

      {isMain && onFork && !message.streaming && message.content && (
        <div style={{ marginTop: 1 }}>
          {forking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                autoFocus
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitFork()
                  if (e.key === 'Escape') { setForking(false); setBranchName('') }
                }}
                placeholder="branch name…"
                style={{
                  fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 8px',
                  borderRadius: 6, border: '1px solid var(--accent)',
                  background: 'var(--bg3)', color: 'var(--text)', outline: 'none', width: 140,
                }}
              />
              <button
                onClick={submitFork}
                style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  background: 'var(--accent)', color: 'white', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >Fork</button>
              <button
                onClick={() => { setForking(false); setBranchName('') }}
                style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
              >✕</button>
            </div>
          ) : (
            <button
              className="fork-btn"
              onClick={() => setForking(true)}
              style={{
                fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--mono)', padding: '2px 4px',
                borderRadius: 4, opacity: 0, transition: 'opacity .15s',
              }}
            >⎇ fork</button>
          )}
        </div>
      )}
    </div>
  )
}

const imgComponent = {
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img
      src={src} alt={alt}
      style={{ display: 'block', maxWidth: '100%', borderRadius: 10, margin: '10px 0' }}
    />
  ),
}

function makeMdComponents(streaming: boolean) {
  return {
    ...imgComponent,
    pre({ children }: { children?: React.ReactNode }) {
      const child = children as React.ReactElement<{ className?: string }>
      if (child?.props?.className === 'language-mermaid') return <>{children}</>
      return <pre>{children}</pre>
    },
    code({ className, children, ...rest }: React.ComponentPropsWithoutRef<'code'>) {
      if (className === 'language-mermaid') {
        return <MermaidDiagram code={String(children).trim()} streaming={streaming} />
      }
      return <code className={className} {...rest}>{children}</code>
    },
  }
}

const GENERATE_TAG_RE = /\[GENERATE_IMAGE:[\s\S]*?\]|\[GENERATE_IMAGE:[\s\S]*/g

function ThrottledMarkdown({ content, streaming }: { content: string; streaming: boolean }) {
  const renderRef = useRef(content)
  const counterRef = useRef(0)

  const displayContent = content.replace(GENERATE_TAG_RE, '').trimEnd()

  if (!streaming) {
    renderRef.current = displayContent
  } else {
    counterRef.current += 1
    if (counterRef.current % 8 === 0) {
      renderRef.current = displayContent
    }
  }

  const components = useMemo(() => makeMdComponents(streaming), [streaming])

  return (
    <>
      <ReactMarkdown components={components}>{renderRef.current}</ReactMarkdown>
      {streaming && <StreamingCursor />}
    </>
  )
}

function StreamingCursor() {
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 14, background: 'currentColor',
      marginLeft: 2, verticalAlign: 'text-bottom', animation: 'bounce 1s infinite',
    }} />
  )
}
