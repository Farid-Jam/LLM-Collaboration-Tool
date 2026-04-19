import type { Branch } from '../types'

interface Props {
  branch: Branch
  onApprove: (branchId: string) => void
  onReject: (branchId: string) => void
}

export function MergeReview({ branch, onApprove, onReject }: Props) {
  return (
    <div className="mx-4 my-2 p-3 rounded-lg border border-purple-300 bg-purple-50 text-sm">
      <p className="text-purple-800 font-medium mb-1">Merge proposal</p>
      <p className="text-gray-700 mb-3">
        Merge branch <span className="font-mono font-semibold">{branch.name}</span> into main?
      </p>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded bg-purple-500 text-white text-xs hover:bg-purple-600"
          onClick={() => onApprove(branch.id)}
        >
          Approve
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-400 text-white text-xs hover:bg-gray-500"
          onClick={() => onReject(branch.id)}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
