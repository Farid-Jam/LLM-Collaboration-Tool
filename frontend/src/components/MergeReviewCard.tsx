import type { MergeReview } from '../types'

interface Props {
  review: MergeReview
  roomId: string
  onApprove: (roomId: string, branchId: string) => void
  onReject: (roomId: string, branchId: string) => void
}

export function MergeReviewCard({ review, roomId, onApprove, onReject }: Props) {
  return (
    <div style={{
      margin: '0 16px 12px', padding: '14px 16px',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--accent-bg)',
      background: 'var(--accent-bg)',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>
          Merge proposal:{' '}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{review.branch_name}</span>
        </span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>LLM-generated summary:</p>
      <p style={{
        background: 'var(--bg)', borderRadius: 8, padding: '10px 12px',
        color: 'var(--text)', lineHeight: 1.55, marginBottom: 12,
        border: '1px solid var(--border)', whiteSpace: 'pre-wrap',
      }}>
        {review.summary}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn color="var(--accent)" onClick={() => onApprove(roomId, review.branch_id)}>Merge</Btn>
        <Btn ghost onClick={() => onReject(roomId, review.branch_id)}>Reject</Btn>
      </div>
    </div>
  )
}

function Btn({ color, ghost, children, onClick }: {
  color?: string; ghost?: boolean; children: React.ReactNode; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 7,
        border: ghost ? '1px solid var(--border2)' : 'none',
        background: ghost ? 'transparent' : (color ?? 'var(--accent)'),
        color: ghost ? 'var(--text2)' : 'white',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'var(--font)', transition: 'opacity .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '.8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}
