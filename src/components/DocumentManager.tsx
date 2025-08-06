import { useState, useCallback } from 'react';
import { Upload, FileText, Briefcase, X, CheckCircle, AlertCircle, Copy, Edit3 } from 'lucide-react';
import mammoth from 'mammoth';

interface DocumentManagerProps {
    onResumeUpdate: (resumeText: string) => void;
    onJobDescriptionUpdate: (jobDescription: string) => void;
    resumeText?: string;
    jobDescription?: string;
}

export default function DocumentManager({
    onResumeUpdate,
    onJobDescriptionUpdate,
    resumeText = '',
    jobDescription = ''
}: DocumentManagerProps) {
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeUploading, setResumeUploading] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);

    const [jobDescriptionText, setJobDescriptionText] = useState(jobDescription);
    const [showJobDescriptionPaste, setShowJobDescriptionPaste] = useState(false);
    const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
    const [jobDescriptionUploading, setJobDescriptionUploading] = useState(false);
    const [jobDescriptionError, setJobDescriptionError] = useState<string | null>(null);

    // Resume file upload handler
    const handleResumeUpload = useCallback(async (file: File) => {
        setResumeUploading(true);
        setResumeError(null);

        try {
            const text = await extractTextFromFile(file);
            setResumeFile(file);
            onResumeUpdate(text);
        } catch (error: any) {
            setResumeError(error.message);
        } finally {
            setResumeUploading(false);
        }
    }, [onResumeUpdate]);

    // Extract text from uploaded file
    const extractTextFromFile = async (file: File): Promise<string> => {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            return await file.text();
        }
        else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            try {
                // Convert file to ArrayBuffer for mammoth
                const arrayBuffer = await file.arrayBuffer();

                // Parse Word document using mammoth
                const result = await mammoth.extractRawText({ arrayBuffer });

                if (result.messages.length > 0) {
                    console.warn('Mammoth warnings:', result.messages);
                }

                return result.value || 'No text content found in the document.';
            } catch (error: any) {
                console.error('Error parsing Word document:', error);
                throw new Error(`Failed to parse Word document: ${error.message}. Please try copying and pasting the text instead.`);
            }
        }
        else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            // For PDF files, we'll provide instructions for manual extraction
            throw new Error('PDF parsing requires additional setup. Please copy and paste your resume text for now.');
        }
        else {
            throw new Error('Unsupported file type. Please use .txt, .doc, or .docx files or copy and paste your resume text.');
        }
    };

    // File drop handler
    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleResumeUpload(files[0]);
        }
    }, [handleResumeUpload]);

    // File input change handler
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleResumeUpload(files[0]);
        }
    }, [handleResumeUpload]);

    // Job description file upload handler
    const handleJobDescriptionUpload = useCallback(async (file: File) => {
        setJobDescriptionUploading(true);
        setJobDescriptionError(null);

        try {
            const text = await extractTextFromFile(file);
            setJobDescriptionFile(file);
            setJobDescriptionText(text);
            onJobDescriptionUpdate(text);
        } catch (error: any) {
            setJobDescriptionError(error.message);
        } finally {
            setJobDescriptionUploading(false);
        }
    }, [onJobDescriptionUpdate]);

    // Job description text handlers
    const handleJobDescriptionChange = useCallback((text: string) => {
        setJobDescriptionText(text);
        onJobDescriptionUpdate(text);
    }, [onJobDescriptionUpdate]);

    // Job description file input change handler
    const handleJobDescriptionFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleJobDescriptionUpload(files[0]);
        }
    }, [handleJobDescriptionUpload]);

    // Job description file drop handler
    const handleJobDescriptionFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleJobDescriptionUpload(files[0]);
        }
    }, [handleJobDescriptionUpload]);

    const clearResume = () => {
        setResumeFile(null);
        setResumeError(null);
        onResumeUpdate('');
    };

    const clearJobDescription = () => {
        setJobDescriptionText('');
        setJobDescriptionFile(null);
        setJobDescriptionError(null);
        onJobDescriptionUpdate('');
    };

    // Copy to clipboard functionality
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // Could add a toast notification here
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-800">Interview Context</h3>
                <div className="ml-auto flex items-center gap-2 text-xs">
                    {resumeText && (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Resume loaded
                        </div>
                    )}
                    {jobDescription && (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Job description set
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {/* Resume Upload Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Resume
                        </h4>
                        {resumeFile && (
                            <button
                                onClick={clearResume}
                                className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
                            >
                                <X className="h-3 w-3" />
                                Clear
                            </button>
                        )}
                    </div>

                    {!resumeFile ? (
                        <div
                            onDrop={handleFileDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors rounded-lg p-6 text-center cursor-pointer"
                        >
                            <input
                                type="file"
                                accept=".txt,.doc,.pdf,.docx"
                                onChange={handleFileInputChange}
                                className="hidden"
                                id="resume-upload"
                                disabled={resumeUploading}
                            />
                            <label htmlFor="resume-upload" className="cursor-pointer">
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-1">
                                    {resumeUploading ? 'Processing...' : 'Drop your resume here or click to upload'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Supports: .txt, .doc, .docx files
                                </p>
                            </label>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                        {resumeFile.name}
                                    </span>
                                    <span className="text-xs text-green-600">
                                        ({(resumeFile.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => copyToClipboard(resumeText)}
                                        className="text-green-600 hover:text-green-700 p-1"
                                        title="Copy resume text"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={clearResume}
                                        className="text-red-600 hover:text-red-700 p-1"
                                        title="Remove resume"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                            {resumeText && (
                                <div className="mt-2 text-xs text-green-700">
                                    ✓ Resume content extracted ({resumeText.length} characters)
                                </div>
                            )}
                        </div>
                    )}

                    {resumeError && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">Upload Error</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">{resumeError}</p>
                        </div>
                    )}
                </div>

                {/* Job Description Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-purple-600" />
                            Job Description
                        </h4>
                        <div className="flex items-center gap-2">
                            {jobDescription && (
                                <button
                                    onClick={clearJobDescription}
                                    className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
                                >
                                    <X className="h-3 w-3" />
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => setShowJobDescriptionPaste(!showJobDescriptionPaste)}
                                className="text-purple-600 hover:text-purple-700 text-xs flex items-center gap-1"
                            >
                                <Edit3 className="h-3 w-3" />
                                {showJobDescriptionPaste ? 'Hide' : 'Type'}
                            </button>
                        </div>
                    </div>

                    {!jobDescription && !showJobDescriptionPaste ? (
                        <div className="space-y-4">
                            {/* File Upload Option */}
                            <div
                                onDrop={handleJobDescriptionFileDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors rounded-lg p-6 text-center cursor-pointer"
                            >
                                <input
                                    type="file"
                                    accept=".txt,.doc,.pdf,.docx"
                                    onChange={handleJobDescriptionFileChange}
                                    className="hidden"
                                    id="job-description-upload"
                                    disabled={jobDescriptionUploading}
                                />
                                <label htmlFor="job-description-upload" className="cursor-pointer">
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 mb-1">
                                        {jobDescriptionUploading ? 'Processing...' : 'Drop job description file here or click to upload'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Supports: .txt, .doc, .docx files
                                    </p>
                                </label>
                            </div>

                            {/* OR Divider */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 border-t border-gray-300"></div>
                                <span className="text-sm text-gray-500 bg-white px-2">OR</span>
                                <div className="flex-1 border-t border-gray-300"></div>
                            </div>

                            {/* Text Input Option */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-3">Type or paste job description</p>
                                <button
                                    onClick={() => setShowJobDescriptionPaste(true)}
                                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Add Job Description
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {showJobDescriptionPaste && (
                                <div>
                                    <textarea
                                        value={jobDescriptionText}
                                        onChange={(e) => handleJobDescriptionChange(e.target.value)}
                                        placeholder="Paste the job description here..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                        rows={6}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-gray-500">
                                            {jobDescriptionText.length} characters
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowJobDescriptionPaste(false)}
                                                className="text-gray-600 hover:text-gray-700 px-3 py-1 text-xs"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleJobDescriptionChange(jobDescriptionText);
                                                    setShowJobDescriptionPaste(false);
                                                }}
                                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs"
                                                disabled={!jobDescriptionText.trim()}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {jobDescription && !showJobDescriptionPaste && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-purple-600" />
                                            <span className="text-sm font-medium text-purple-800">
                                                {jobDescriptionFile ? `File: ${jobDescriptionFile.name}` : 'Job Description Loaded'}
                                            </span>
                                            {jobDescriptionFile && (
                                                <span className="text-xs text-purple-600">
                                                    ({(jobDescriptionFile.size / 1024).toFixed(1)} KB)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => copyToClipboard(jobDescription)}
                                                className="text-purple-600 hover:text-purple-700 p-1"
                                                title="Copy job description"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => setShowJobDescriptionPaste(true)}
                                                className="text-purple-600 hover:text-purple-700 p-1"
                                                title="Edit job description"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-purple-700">
                                        ✓ {jobDescription.length} characters •
                                        {jobDescriptionFile ? ' Uploaded from file' : ' Entered manually'} •
                                        Click edit to modify
                                    </div>
                                    <div className="mt-2 text-xs text-purple-600 bg-purple-100 rounded p-2 max-h-20 overflow-y-auto">
                                        {jobDescription.substring(0, 200)}
                                        {jobDescription.length > 200 && '...'}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Job Description Upload Error */}
                    {jobDescriptionError && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">Upload Error</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">{jobDescriptionError}</p>
                        </div>
                    )}
                </div>

                {/* Context Summary */}
                {(resumeText || jobDescription) && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-800 mb-2">🎯 Interview Context Active</h5>
                        <div className="text-xs text-gray-600 space-y-1">
                            {resumeText && <p>✓ Resume loaded - responses will reference your background</p>}
                            {jobDescription && <p>✓ Job description set - responses will be tailored to the role</p>}
                            <p className="text-blue-600 font-medium">
                                OpenAI will now generate personalized interview responses!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}