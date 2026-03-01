const ShimmerBox = ({
  loading = false,
  children,
  className = '',
  minHeight = 'h-64',
  shimmerClassName = '',
}) => {
  if (loading) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
        aria-busy="true"
      >
        <div className={`flex flex-col gap-4 ${minHeight}`}>
          <div className={`h-4 w-1/3 animate-shimmer rounded ${shimmerClassName}`} />
          <div className={`h-4 w-full animate-shimmer rounded ${shimmerClassName}`} />
          <div className={`h-4 w-5/6 animate-shimmer rounded ${shimmerClassName}`} />
          <div className={`flex-1 animate-shimmer rounded ${shimmerClassName}`} />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ShimmerBox
