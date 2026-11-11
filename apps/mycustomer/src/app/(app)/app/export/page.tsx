'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ExportRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/app/settings')
  }, [router])

  return (
    <div className="flex min-h-[70dvh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
    </div>
  )
}
