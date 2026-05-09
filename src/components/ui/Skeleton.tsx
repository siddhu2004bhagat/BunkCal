interface Props {
  className?: string
  lines?: number
}

export function Skeleton({ className = '' }: Props) {
  return (
    <div className={`animate-pulse bg-[#e6e8ea] rounded ${className}`} />
  )
}

export function SubjectCardSkeleton() {
  return (
    <div className="bg-white border border-[#c5c6cd] rounded-xl p-6 ambient-shadow">
      <div className="flex justify-between items-start mb-6">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-12 h-8 rounded" />
      </div>
      <Skeleton className="w-3/4 h-5 mb-2 rounded" />
      <Skeleton className="w-1/2 h-4 mb-6 rounded" />
      <Skeleton className="w-full h-1 rounded-full" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="w-full h-40 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SubjectCardSkeleton />
        <SubjectCardSkeleton />
        <SubjectCardSkeleton />
      </div>
    </div>
  )
}
