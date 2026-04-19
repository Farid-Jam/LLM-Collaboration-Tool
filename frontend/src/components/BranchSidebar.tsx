import { useRoom } from '../context/RoomContext'
import { DocumentPanel } from './DocumentPanel'

interface Props {
  roomId: string
  onMerge: (branchId: string) => void
}

export function BranchSidebar({ roomId, onMerge }: Props) {
  const { state, dispatch } = useRoom()

  return (
    <aside style={{
      width: 188, borderRight: '1px solid var(--border)',
      background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 10px' }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'var(--text3)',
          padding: '0 4px', marginBottom: 8,
        }}>Branches</p>

        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_BRANCH', branchId: null })}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '6px 8px', borderRadius: 8, border: 'none',
            background: state.activeBranchId === null ? 'var(--accent-bg)' : 'transparent',
            color: state.activeBranchId === null ? 'var(--accent)' : 'var(--text2)',
            fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
            fontWeight: state.activeBranchId === null ? 600 : 400,
            transition: 'all .15s', marginBottom: 2,
          }}
        >◆ main</button>

        {state.branches.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8 }}>
            <button
              onClick={() => dispatch({ type: 'SET_ACTIVE_BRANCH', branchId: b.id })}
              title={b.name}
              style={{
                flex: 1, textAlign: 'left', padding: '6px 8px', borderRadius: 8, border: 'none',
                background: state.activeBranchId === b.id ? 'var(--accent-bg)' : 'transparent',
                color: state.activeBranchId === b.id ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                fontWeight: state.activeBranchId === b.id ? 500 : 400,
                transition: 'all .15s',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >⎇ {b.name}</button>
            <button
              onClick={() => onMerge(b.id)}
              className="merge-btn"
              title="Merge into main"
              style={{
                padding: '4px 6px', borderRadius: 6, border: 'none',
                background: 'transparent', color: 'var(--text3)',
                cursor: 'pointer', fontSize: 13, transition: 'color .15s', flexShrink: 0,
              }}
            >↩</button>
          </div>
        ))}

        <DocumentPanel roomId={roomId} />
      </div>
    </aside>
  )
}
