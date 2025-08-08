import { useState, useEffect } from 'react';
import { Brain, Clock, CheckCircle, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import openaiService from '../services/openai';

interface ResponseGeneratorProps {
    question: string;
    onResponseGenerated: (response: string) => void;
    openaiConfigured?: boolean;
    resumeText?: string;
    jobDescription?: string;
    additionalContext?: string;
    onMuteToggle?: (muted: boolean) => void;
    isMuted?: boolean;
}

export default function ResponseGenerator({
    question,
    onResponseGenerated,
    openaiConfigured = false,
    resumeText = '',
    jobDescription = '',
    additionalContext = '',
    onMuteToggle,
    isMuted = false
}: ResponseGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentResponse, setCurrentResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Removed responseSource to simplify logic

    const generateResponse = async (question: string): Promise<string> => {
        console.log('🔧 generateResponse called with:', question);
        console.log('🔧 OpenAI configured:', openaiConfigured, openaiService.isConfigured());

        setIsGenerating(true);
        setError(null);

        try {
            if (!openaiConfigured || !openaiService.isConfigured()) {
                throw new Error('OpenAI is not configured. Please configure your API key first.');
            }

            const context = {
                resume: resumeText || undefined,
                jobDescription: jobDescription || undefined,
                additionalContext: additionalContext || undefined
            };

            const response = await openaiService.generateInterviewResponse(question, context);
            setCurrentResponse(response);
            onResponseGenerated(response);
            return response;

        } catch (error: any) {
            setError(error.message);
            setCurrentResponse('');
            onResponseGenerated('');
            return '';
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        console.log('🧠 ResponseGenerator received question:', question);
        if (question) {
            console.log('🚀 Starting response generation for:', question);
            generateResponse(question);
        }
    }, [question, resumeText, jobDescription, additionalContext]);

    return (
        <div className="bg-[#2c2c2c] rounded-md shadow-lg border border-gray-500 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-200">AI Response Generator</h3>
                </div>
                <div className="flex items-center text-xs rounded-full">
                    {onMuteToggle && (
                        <button
                            onClick={() => onMuteToggle(!isMuted)}
                            className={`p-1 rounded transition-colors flex items-center justify-center h-12 w-12 rounded-full text-white hover:scale-105 ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                            title={isMuted ? 'Unmute Speech' : 'Mute Speech'}
                        >
                            {isMuted ? (
                                <VolumeX className="h-6 w-6" />
                            ) : (
                                <Volume2 className="h-6 w-6" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {question && (
                <div className="mb-4 p-4 bg-[#404040] rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm text-blue-600 font-medium mb-1">Question Detected:</p>
                    <p className="text-gray-200">{question}</p>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Error</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <p className="text-xs text-red-600 mt-1">Please check your OpenAI configuration and try again.</p>
                </div>
            )}

            {isGenerating ? (
                <div className="flex items-center gap-3 p-4 bg-[#404040] rounded-lg">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-purple-600 font-medium">
                        OpenAI is thinking...
                    </span>
                </div>
            ) : currentResponse ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Response Ready</span>
                    </div>
                    <div className="p-4 bg-[#404040] rounded-lg border border-green-200">
                        <p className="text-gray-300 leading-relaxed">{currentResponse}</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-gray-400 p-4 bg-[#404040] rounded-lg">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                        {openaiConfigured && openaiService.isConfigured()
                            ? 'Waiting for interview question...'
                            : 'Please configure OpenAI API key to generate responses'
                        }
                    </span>
                </div>
            )}

        </div>
    );
}