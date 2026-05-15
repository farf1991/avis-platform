'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RecevoirRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/membre') }, [router])
  return null
}
