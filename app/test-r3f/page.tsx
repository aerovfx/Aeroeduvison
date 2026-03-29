"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

// Lazy-load the 3D scene to prevent Three.js from being loaded during build
const R3FScene = dynamic(() => import("./R3FScene"), { ssr: false })

export default function TestR3FPage() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Suspense fallback={<div>Loading 3D...</div>}>
        <R3FScene />
      </Suspense>
    </div>
  )
}
