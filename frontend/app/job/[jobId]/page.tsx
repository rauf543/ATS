'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Download, Eye, Plus, Upload, Search, Trash2, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { CVViewer } from '@/components/CVViewer'

const recruitmentStages = [
    "Applied",
    "Shortlisted",
    "Interview",
    "Rejected",
    "Offer"
]

interface Application {
    _id: string
    name: string
    email: string
    phone: string
    cvUrl: string
    stage: string
}

export default function JobApplicationsPage() {
    const { jobId } = useParams<{ jobId: string }>()
    const [applications, setApplications] = useState<Application[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [stageFilter, setStageFilter] = useState('All')
    const [newApplicant, setNewApplicant] = useState({ name: '', email: '', phone: '', cv: null as File | null, stage: 'Applied' })
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [formError, setFormError] = useState('')
    const [isCVViewerOpen, setIsCVViewerOpen] = useState(false)
    const [currentCVIndex, setCurrentCVIndex] = useState(0)
    const { logout } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const filteredApplications = useMemo(() => {
        return applications.filter(app =>
            (app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.phone.includes(searchTerm)) &&
            (stageFilter === 'All' || app.stage === stageFilter)
        )
    }, [applications, searchTerm, stageFilter])

    const fetchApplications = useCallback(async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No token found')
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/applications`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.status === 401) {
                throw new Error('Unauthorized')
            }
            const data = await response.json()
            setApplications(data)
        } catch (error) {
            console.error('Error fetching applications:', error)
            setApplications([])
            if (error.message === 'Unauthorized' || error.message === 'No token found') {
                logout()
                router.push('/signin')
            }
        } finally {
            setLoading(false)
        }
    }, [jobId, logout, router])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setNewApplicant(prev => ({ ...prev, [name]: value }))
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewApplicant(prev => ({ ...prev, cv: e.target.files![0] }))
        }
    }, [])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError('')

        if (!newApplicant.cv) {
            setFormError('Please upload a CV file')
            return
        }

        const formData = new FormData()
        formData.append('name', newApplicant.name)
        formData.append('email', newApplicant.email)
        formData.append('phone', newApplicant.phone)
        formData.append('stage', newApplicant.stage)
        formData.append('cv', newApplicant.cv)

        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No token found')
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/applications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            if (!response.ok) {
                throw new Error('Failed to add new applicant')
            }
            await fetchApplications()
            setNewApplicant({ name: '', email: '', phone: '', cv: null, stage: 'Applied' })
            setIsDialogOpen(false)
            toast({
                title: "Success",
                description: "New applicant added successfully.",
            })
        } catch (error) {
            console.error('Error adding new applicant:', error)
            toast({
                title: "Error",
                description: "Failed to add new applicant. Please try again.",
                variant: "destructive",
            })
        }
    }, [newApplicant, jobId, fetchApplications, toast])

    const handleStageChange = useCallback(async (id: string, newStage: string) => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No token found')
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/applications/${id}/stage`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stage: newStage })
            })
            if (!response.ok) {
                throw new Error('Failed to update application stage')
            }
            await fetchApplications()
            toast({
                title: "Success",
                description: "Application stage updated successfully.",
            })
        } catch (error) {
            console.error('Error updating application stage:', error)
            toast({
                title: "Error",
                description: "Failed to update application stage. Please try again.",
                variant: "destructive",
            })
        }
    }, [jobId, fetchApplications, toast])

    const handleDeleteApplication = useCallback(async (id: string) => {
        if (window.confirm('Are you sure you want to delete this application?')) {
            try {
                const token = localStorage.getItem('token')
                if (!token) {
                    throw new Error('No token found')
                }
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/applications/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (!response.ok) {
                    throw new Error('Failed to delete application')
                }
                await fetchApplications()
                toast({
                    title: "Success",
                    description: "Application deleted successfully.",
                })
            } catch (error) {
                console.error('Error deleting application:', error)
                toast({
                    title: "Error",
                    description: "Failed to delete application. Please try again.",
                    variant: "destructive",
                })
            }
        }
    }, [jobId, fetchApplications, toast])

    const openCVViewer = useCallback((index: number) => {
        setCurrentCVIndex(index)
        setIsCVViewerOpen(true)
    }, [])

    const handleCVNavigation = useCallback((index: number) => {
        if (index >= 0 && index < filteredApplications.length) {
            setCurrentCVIndex(index)
        }
    }, [filteredApplications])

    const handleDownloadCV = useCallback(async (cvUrl: string, applicantName: string) => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('No token found')
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${cvUrl}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!response.ok) {
                throw new Error('Failed to download CV')
            }
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${applicantName}_CV.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading CV:', error)
            toast({
                title: "Error",
                description: "Failed to download CV. Please try again.",
                variant: "destructive",
            })
        }
    }, [toast])

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <Link href="/dashboard" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Link>
            </div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Job Applications</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-green-600 hover:bg-green-700">
                            <Plus className="mr-2 h-5 w-5" />
                            Add New Applicant
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Applicant</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" name="name" value={newApplicant.name} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" value={newApplicant.email} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" type="tel" value={newApplicant.phone} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="cv">CV</Label>
                                <div className="flex items-center space-x-2">
                                    <Input id="cv" name="cv" type="file" onChange={handleFileChange} className="hidden" />
                                    <Button type="button" variant="outline" onClick={() => document.getElementById('cv')?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload CV
                                    </Button>
                                    {newApplicant.cv && <span className="text-sm text-muted-foreground">{newApplicant.cv.name}</span>}
                                </div>
                                {formError && <p className="text-sm text-red-500 mt-1">{formError}</p>}
                            </div>
                            <div>
                                <Label htmlFor="stage">Initial Stage</Label>
                                <Select name="stage" value={newApplicant.stage} onValueChange={(value) => setNewApplicant(prev => ({ ...prev, stage: value }))}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {recruitmentStages.map((stage) => (
                                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full">Add Applicant</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Applications</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search applicants..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2"
                            />
                        </div>
                        <Select value={stageFilter} onValueChange={setStageFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Stages</SelectItem>
                                {recruitmentStages.map((stage) => (
                                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-300px)]">
                        {loading ? (
                            <p className="text-center text-gray-500">Loading applications...</p>
                        ) : filteredApplications.length > 0 ? (
                            filteredApplications.map((app, index) => (
                                <div key={app._id} className="mb-4 p-4 border rounded">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold">{app.name}</h3>
                                            <p>{app.email}</p>
                                            <p>{app.phone}</p>
                                        </div>
                                        <Select value={app.stage} onValueChange={(value) => handleStageChange(app._id, value)}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Stage" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {recruitmentStages.map((stage) => (
                                                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="mt-4 flex justify-between">
                                        <div>
                                            <Button variant="outline" size="sm" className="mr-2" onClick={() => openCVViewer(index)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View CV
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownloadCV(app.cvUrl, app.name)}
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download CV
                                            </Button>
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteApplication(app._id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No applicants found.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {filteredApplications.length > 0 && (
                <CVViewer
                    applications={filteredApplications}
                    currentIndex={currentCVIndex}
                    isOpen={isCVViewerOpen}
                    onClose={() => setIsCVViewerOpen(false)}
                    onNavigate={handleCVNavigation}
                    onStageChange={handleStageChange}
                />
            )}
        </div>
    )
}