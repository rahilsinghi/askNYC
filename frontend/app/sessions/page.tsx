'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SessionsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/archive')
  }, [router])

  return null
}
