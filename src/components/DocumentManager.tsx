import { useState, useCallback } from 'react';
import { Briefcase, CheckCircle } from 'lucide-react';
import { FileUpload } from './ui/FileUpload';
import { TextArea } from './ui/TextArea';

interface DocumentManagerProps {
    onResumeUpdate: (resumeText: string) => void;
    onJobDescriptionUpdate: (jobDescription: string) => void;
    onAdditionalContextUpdate?: (additionalContext: string) => void;
    resumeText?: string;
    jobDescription?: string;
    additionalContext?: string;
}

export default function DocumentManager({
    onResumeUpdate,
    onJobDescriptionUpdate,
    onAdditionalContextUpdate,
    resumeText = '',
    jobDescription = '',
    additionalContext = ''
}: DocumentManagerProps) {
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
    const [showJobDescriptionPaste, setShowJobDescriptionPaste] = useState(false);
    const [showAdditionalContextPaste, setShowAdditionalContextPaste] = useState(false);
    const [jobDescriptionText, setJobDescriptionText] = useState(jobDescription);
    const [additionalContextText, setAdditionalContextText] = useState(additionalContext);

    const handleResumeUpload = useCallback((text: string, file?: File) => {
        if (file) {
            setResumeFile(file);
        }
        onResumeUpdate(text);
    }, [onResumeUpdate]);

    const handleJobDescriptionUpload = useCallback((text: string, file?: File) => {
        if (file) {
            setJobDescriptionFile(file);
        }
        setJobDescriptionText(text);
        onJobDescriptionUpdate(text);
    }, [onJobDescriptionUpdate]);

    const handleJobDescriptionChange = useCallback((text: string) => {
        setJobDescriptionText(text);
        onJobDescriptionUpdate(text);
    }, [onJobDescriptionUpdate]);

    const handleAdditionalContextChange = useCallback((text: string) => {
        setAdditionalContextText(text);
        onAdditionalContextUpdate?.(text);
    }, [onAdditionalContextUpdate]);

    const clearResume = useCallback(() => {
        setResumeFile(null);
        onResumeUpdate('');
    }, [onResumeUpdate]);

    const clearJobDescription = useCallback(() => {
        setJobDescriptionText('');
        setJobDescriptionFile(null);
        onJobDescriptionUpdate('');
    }, [onJobDescriptionUpdate]);

    const clearAdditionalContext = useCallback(() => {
        setAdditionalContextText('');
        setShowAdditionalContextPaste(false);
        onAdditionalContextUpdate?.('');
    }, [onAdditionalContextUpdate]);

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
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            Resume
                        </h4>
                    </div>

                    <FileUpload
                        title="Resume"
                        description="Drop your resume here or click to upload"
                        acceptedFileTypes={['.txt', '.doc', '.docx']}
                        onFileUpload={handleResumeUpload}
                        onClear={clearResume}
                        currentFile={resumeFile}
                        currentText={resumeText}
                        colorScheme="blue"
                    />
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
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => setShowJobDescriptionPaste(!showJobDescriptionPaste)}
                                className="text-purple-600 hover:text-purple-700 text-xs flex items-center gap-1"
                            >
                                {showJobDescriptionPaste ? 'Hide' : 'Type'}
                            </button>
                        </div>
                    </div>

                    {!jobDescription && !showJobDescriptionPaste ? (
                        <div className="space-y-4">
                            <FileUpload
                                title="Job Description"
                                description="Drop job description file here or click to upload"
                                acceptedFileTypes={['.txt', '.doc', '.docx']}
                                onFileUpload={handleJobDescriptionUpload}
                                onClear={clearJobDescription}
                                currentFile={jobDescriptionFile}
                                currentText={jobDescription}
                                colorScheme="purple"
                            />

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
                                    Add Job Description
                                </button>
                            </div>
                        </div>
                    ) : (
                        <TextArea
                            title="Job Description"
                            placeholder="Paste the job description here..."
                            value={jobDescriptionText}
                            onChange={handleJobDescriptionChange}
                            onClear={clearJobDescription}
                            showEdit={showJobDescriptionPaste}
                            onToggleEdit={() => setShowJobDescriptionPaste(!showJobDescriptionPaste)}
                            colorScheme="purple"
                            rows={6}
                        />
                    )}
                </div>

                {/* Additional Context Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-orange-600" />
                            Additional Context
                        </h4>
                        <div className="flex items-center gap-2">
                            {additionalContext && (
                                <button
                                    onClick={clearAdditionalContext}
                                    className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => setShowAdditionalContextPaste(!showAdditionalContextPaste)}
                                className="text-orange-600 hover:text-orange-700 text-xs flex items-center gap-1"
                            >
                                {showAdditionalContextPaste ? 'Hide' : 'Add'}
                            </button>
                        </div>
                    </div>

                    <TextArea
                        title="Additional Context"
                        placeholder="Add any additional context, preferences, or specific information that should be considered in responses..."
                        value={additionalContextText}
                        onChange={handleAdditionalContextChange}
                        onClear={clearAdditionalContext}
                        showEdit={showAdditionalContextPaste}
                        onToggleEdit={() => setShowAdditionalContextPaste(!showAdditionalContextPaste)}
                        colorScheme="orange"
                        rows={4}
                    />
                </div>

                {/* Context Summary */}
                {(resumeText || jobDescription || additionalContext) && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-800 mb-2">🎯 Interview Context Active</h5>
                        <div className="text-xs text-gray-600 space-y-1">
                            {resumeText && <p>✓ Resume loaded - responses will reference your background</p>}
                            {jobDescription && <p>✓ Job description set - responses will be tailored to the role</p>}
                            {additionalContext && <p>✓ Additional context provided - responses will be more personalized</p>}
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