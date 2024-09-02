import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, AlertCircle, Download } from 'lucide-react'

interface Application {
    _id: string
    name: string
    cvUrl: string
    stage: string
}

interface CVViewerProps {
    applications: Application[]
    currentIndex: number
    isOpen: boolean
    onClose: () => void
    onNavigate: (index: number) => void
    onStageChange: (id: string, newStage: string) => void
}

const recruitmentStages = [
    "Applied",
    "Shortlisted",
    "Interview",
    "Rejected",
    "Offer"
]

export function CVViewer({ applications, currentIndex, isOpen, onClose, onNavigate, onStageChange }: CVViewerProps) {
    const [iframeError, setIframeError] = useState(false)
    const currentApp = applications[currentIndex]

    if (!currentApp) {
        return null
    }

    const handleIframeError = () => {
        setIframeError(true)
    }

    const fileUrl = `${process.env.NEXT_PUBLIC_API_URL}/${currentApp.cvUrl.replace(/^\//, '')}`
    const fileExtension = currentApp.cvUrl.split('.').pop()?.toLowerCase()

    useEffect(() => {
        console.log('File URL:', fileUrl)
        console.log('File Extension:', fileExtension)
    }, [fileUrl, fileExtension])

    const renderFileViewer = () => {
        if (fileExtension === 'pdf') {
            return (
                <iframe
                    src={fileUrl}
                    className="w-full h-full border-none"
                    title={`${currentApp.name}'s CV`}
                    onError={handleIframeError}
                />
            )
        } else {
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">This file type cannot be previewed.</p>
                        <Button className="mt-4" onClick={() => window.open(fileUrl, '_blank')}>
                            <Download className="mr-2 h-4 w-4" />
                            Download CV
                        </Button>
                    </div>
                </div>
            )
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{currentApp.name}'s CV</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                    {iframeError ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">Unable to load the CV. The file might be missing or inaccessible.</p>
                                <Button className="mt-4" onClick={() => setIframeError(false)}>Try Again</Button>
                            </div>
                        </div>
                    ) : renderFileViewer()}
                </div>
                <div className="flex justify-between items-center mt-4">
                    <Button
                        onClick={() => onNavigate(currentIndex - 1)}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous CV
                    </Button>
                    <Select
                        value={currentApp.stage}
                        onValueChange={(value) => onStageChange(currentApp._id, value)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Stage" />
                        </SelectTrigger>
                        <SelectContent>
                            {recruitmentStages.map((stage) => (
                                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={() => onNavigate(currentIndex + 1)}
                        disabled={currentIndex === applications.length - 1}
                    >
                        Next CV
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}