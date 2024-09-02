'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/signin')
        } else {
            setIsLoading(false)
        }
    }, [router])

    if (isLoading) {
        return <div>Loading...</div> // You can replace this with a proper loading component
    }

    return isAuthenticated ? <>{children}</> : null
}