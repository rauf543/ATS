'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { BriefcaseIcon, LogOutIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, BuildingIcon, MapPinIcon, UsersIcon } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AddJobModal } from '@/components/AddJobModal'
import { EditJobModal } from '@/components/EditJobModal'
import { DeleteJobModal } from '@/components/DeleteJobModal'

interface Job {
    _id: string;
    title: string;
    department: string;
    location: string;
    applicationsCount: number;
    isOpen: boolean;
}

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <DashboardClient />
        </ProtectedRoute>
    )
}

function DashboardClient() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const { logout } = useAuth()
    const router = useRouter()

    const fetchJobs = async (page = 1, search = '') => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No token found')
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs?page=${page}&limit=9&search=${search}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.status === 401) {
                throw new Error('Unauthorized')
            }
            const data = await response.json()
            setJobs(data.jobs || [])
            setTotalPages(data.totalPages || 1)
            setCurrentPage(data.currentPage || 1)
        } catch (error) {
            console.error('Error fetching jobs:', error)
            setJobs([])
            if (error.message === 'Unauthorized' || error.message === 'No token found') {
                logout()
                router.push('/signin')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchJobs(1, searchTerm)
    }, [searchTerm])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
        fetchJobs(newPage, searchTerm)
    }

    const handleLogout = () => {
        logout()
        router.push('/signin')
    }

    const handleJobAdded = () => {
        fetchJobs(1, searchTerm)
    }

    const handleJobUpdated = () => {
        fetchJobs(currentPage, searchTerm)
    }

    const handleJobDeleted = () => {
        fetchJobs(currentPage, searchTerm)
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <BriefcaseIcon className="mr-2 h-8 w-8" />
                        ATS Dashboard
                    </h1>
                    <Button variant="ghost" className="flex items-center" onClick={handleLogout}>
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </header>
            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">Open Positions</h2>
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search positions..."
                                        className="pl-10 pr-4 py-2 w-64"
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                </div>
                                <AddJobModal onJobAdded={handleJobAdded} />
                            </div>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loading ? (
                                Array(9).fill(0).map((_, index) => (
                                    <Card key={index}>
                                        <CardContent className="p-6">
                                            <Skeleton className="h-6 w-3/4 mb-2" />
                                            <Skeleton className="h-4 w-1/2 mb-2" />
                                            <Skeleton className="h-4 w-1/3" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : jobs && jobs.length > 0 ? (
                                jobs.map(job => (
                                    <Card key={job._id} className="hover:shadow-lg transition-shadow duration-200">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <Link href={`/job/${job._id}`} className="flex-grow">
                                                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                                </Link>
                                                <div className="flex space-x-2 ml-2">
                                                    <EditJobModal job={job} onJobUpdated={handleJobUpdated} />
                                                    <DeleteJobModal jobId={job._id} jobTitle={job.title} onJobDeleted={handleJobDeleted} />
                                                </div>
                                            </div>
                                            <Link href={`/job/${job._id}`} className="block">
                                                <p className="text-sm text-gray-500 flex items-center mb-1">
                                                    <BuildingIcon className="mr-1 h-4 w-4" />
                                                    {job.department}
                                                </p>
                                                <p className="text-sm text-gray-500 flex items-center mb-2">
                                                    <MapPinIcon className="mr-1 h-4 w-4" />
                                                    {job.location}
                                                </p>
                                                <p className="text-sm text-gray-500 flex items-center">
                                                    <UsersIcon className="mr-1 h-4 w-4" />
                                                    Applications: {job.applicationsCount}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    Status: {job.isOpen ? 'Open' : 'Closed'}
                                                </p>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <p className="col-span-3 text-center text-gray-500 mt-6">
                                    No matching positions found.
                                </p>
                            )}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center mt-8">
                                <Button
                                    variant="outline"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="mr-2"
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="ml-2"
                                >
                                    <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}