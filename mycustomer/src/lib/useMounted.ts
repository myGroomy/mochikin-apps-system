'use client'

import { useEffect, useState } from 'react'

// Guarantees entrance animations run client-side AFTER hydration, never during SSR.
// Prevents framer-motion from snapping to its final state on first load (React 19 + Next hydration).
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}