"use client"
import dynamic from 'next/dynamic'

const Lab = dynamic(() => import('./_PistonAssemblyLab'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[hsl(225,15%,6%)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[hsl(245,85%,65%)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/40 text-sm">Loading lab...</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <Lab />
}
