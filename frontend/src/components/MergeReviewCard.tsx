import type { MergeReview } from '../types'

interface Props {
  review: MergeReview
  roomId: string
  onApprove: (roomId: string, branchId: string) => void
  onReject: (roomId: string, branchId: string) => void
}

export function MergeReviewCard({ review, roomId, onApprove, onReject }: Props) {
  return (
    <div className="mx-4 mb-2 border border-purple-300 rounded-lg bg-purple-50 p-3 text-sm">
      <p className="font-semibold text-purple-800 mb-1">
        Merge proposal: <span className="font-mono">{review.branch_name}</span>
      </p>
      <p className="text-xs text-gray-500 mb-2">LLM-generated summary of the branch:</p>
      <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3 bg-white rounded p-2 border border-purple-200">
        {review.summary}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(roomId, review.branch_id)}
          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Merge
        </button>
        <button
          onClick={() => onReject(roomId, review.branch_id)}
          className="px-3 py-1 text-xs bg-white text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
