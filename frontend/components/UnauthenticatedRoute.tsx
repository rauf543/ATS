'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function UnauthenticatedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard')
        } else {
            setIsLoading(false)
        }
    }, [isAuthenticated, router])

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    return !isAuthenticated ? <>{children}</> : null
}