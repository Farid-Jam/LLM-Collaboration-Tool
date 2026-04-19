import { useRoom } from '../context/RoomContext'
import { Avatar } from './Avatar'

export function UserList() {
  const { state } = useRoom()

  return (
    <aside style={{
      width: 168, borderLeft: '1px solid var(--border)',
      background: 'var(--bg2)', padding: '14px 12px', flexShrink: 0,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12,
      }}>
        Online — {state.users.length}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={u.display_name} size={28} />
              <div style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--green)', border: '1.5px solid var(--bg2)',
              }} />
            </div>
            <div>
              <p style={{
                fontSize: 13, color: 'var(--text)',
                fontWeight: u.id === state.userId ? 500 : 400, lineHeight: 1.2,
              }}>
                {u.display_name}
              </p>
              {u.id === state.userId && (
                <p style={{ fontSize: 10, color: 'var(--text3)' }}>you</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
