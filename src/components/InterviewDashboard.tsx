import { useState, useCallback, useRef } from 'react';
import { Briefcase, Settings, BarChart3, Zap } from 'lucide-react';
import SpeechRecognition from './SpeechRecognition';
import ResponseGenerator from './ResponseGenerator';
import ConversationHistory from './ConversationHistory';
import TextToSpeech, { type TextToSpeechRef } from './TextToSpeech';
import OpenAIConfig from './OpenAIConfig';
import DocumentManager from './DocumentManager';

interface ConversationItem {
    id: string;
    type: 'question' | 'response';
    content: string;
    timestamp: Date;
}

export default function InterviewDashboard() {
    const [isListening, setIsListening] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentResponse, setCurrentResponse] = useState('');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [openaiConfigured, setOpenaiConfigured] = useState(false);
    const [isResponsePlaying, setIsResponsePlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [sessionStats, setSessionStats] = useState({
        questionsAnswered: 0,
        avgResponseTime: 0,
        sessionDuration: 0
    });

    const textToSpeechRef = useRef<TextToSpeechRef>(null);

    const handleQuestionDetected = useCallback((question: string) => {
        setCurrentQuestion(question);

        // Add question to conversation history
        const questionItem: ConversationItem = {
            id: `q-${Date.now()}`,
            type: 'question',
            content: question,
            timestamp: new Date()
        };

        setConversations(prev => [...prev, questionItem]);
        setSessionStats(prev => ({
            ...prev,
            questionsAnswered: prev.questionsAnswered + 1
        }));
    }, []);

    const handleResponseGenerated = useCallback((response: string) => {
        setCurrentResponse(response);

        // Add response to conversation history
        const responseItem: ConversationItem = {
            id: `r-${Date.now()}`,
            type: 'response',
            content: response,
            timestamp: new Date()
        };

        setConversations(prev => [...prev, responseItem]);
    }, []);

    const handleToggleListening = useCallback(() => {
        setIsListening(prev => !prev);
    }, []);

    const handleClearHistory = useCallback(() => {
        setConversations([]);
        setCurrentQuestion('');
        setCurrentResponse('');
        setSessionStats({
            questionsAnswered: 0,
            avgResponseTime: 0,
            sessionDuration: 0
        });
    }, []);

    const handleSpeechStateChange = useCallback((playing: boolean, muted: boolean) => {
        setIsResponsePlaying(playing);
        setIsMuted(muted);
    }, []);

    const handleMuteResponse = useCallback(() => {
        textToSpeechRef.current?.toggleMute();
    }, []);

    const handleStopResponse = useCallback(() => {
        textToSpeechRef.current?.stop();
    }, []);

    const handleResumeUpdate = useCallback((text: string) => {
        setResumeText(text);
    }, []);

    const handleJobDescriptionUpdate = useCallback((text: string) => {
        setJobDescription(text);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                                <Briefcase className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Interview Assistant AI</h1>
                                <p className="text-sm text-gray-600">Real-time interview question analysis & response generation</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Session Stats */}
                            <div className="hidden md:flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-blue-600" />
                                    <span className="text-gray-600">Questions:</span>
                                    <span className="font-semibold text-gray-900">{sessionStats.questionsAnswered}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-green-600" />
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isListening ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {isListening ? 'Live' : 'Standby'}
                                    </span>
                                </div>
                            </div>

                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Speech Recognition */}
                        <SpeechRecognition
                            onQuestionDetected={handleQuestionDetected}
                            isListening={isListening}
                            onToggleListening={handleToggleListening}
                            onMuteResponse={handleMuteResponse}
                            onStopResponse={handleStopResponse}
                            isResponsePlaying={isResponsePlaying}
                            isMuted={isMuted}
                        />

                        {/* Document Manager */}
                        <DocumentManager
                            onResumeUpdate={handleResumeUpdate}
                            onJobDescriptionUpdate={handleJobDescriptionUpdate}
                            resumeText={resumeText}
                            jobDescription={jobDescription}
                        />

                        {/* OpenAI Configuration */}
                        <OpenAIConfig onConfigChange={setOpenaiConfigured} />

                        {/* Response Generator */}
                        <ResponseGenerator
                            question={currentQuestion}
                            onResponseGenerated={handleResponseGenerated}
                            openaiConfigured={openaiConfigured}
                            resumeText={resumeText}
                            jobDescription={jobDescription}
                        />

                        {/* Text-to-Speech */}
                        <TextToSpeech
                            ref={textToSpeechRef}
                            text={currentResponse}
                            autoPlay={false}
                            onStateChange={handleSpeechStateChange}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Conversation History */}
                        <ConversationHistory
                            conversations={conversations}
                            onClearHistory={handleClearHistory}
                        />

                        {/* Quick Tips */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                            <h3 className="font-semibold text-lg mb-3">💡 Pro Tips for Success</h3>
                            <div className="space-y-2 text-sm opacity-90">
                                <p>• Upload your resume for personalized responses</p>
                                <p>• Add job description (file or text) for role-specific answers</p>
                                <p>• Use the microphone to practice with real voice input</p>
                                <p>• Listen to generated responses with text-to-speech</p>
                                <p>• Review conversation history to track your progress</p>
                            </div>
                        </div>

                        {/* Feature Highlights */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4">🚀 Features</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-lg font-bold text-blue-600 mb-1">Real-time</div>
                                    <div className="text-xs text-blue-700">Voice Recognition</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-lg font-bold text-green-600 mb-1">AI-Powered</div>
                                    <div className="text-xs text-green-700">Response Generation</div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-lg font-bold text-purple-600 mb-1">Smart</div>
                                    <div className="text-xs text-purple-700">Text-to-Speech</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-lg font-bold text-orange-600 mb-1">Live</div>
                                    <div className="text-xs text-orange-700">Session Tracking</div>
                                </div>
                                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                                    <div className="text-lg font-bold text-indigo-600 mb-1">Resume</div>
                                    <div className="text-xs text-indigo-700">Upload & Analysis</div>
                                </div>
                                <div className="text-center p-3 bg-teal-50 rounded-lg">
                                    <div className="text-lg font-bold text-teal-600 mb-1">Tailored</div>
                                    <div className="text-xs text-teal-700">Job Matching</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <p>Interview Assistant AI - Practice makes perfect! 🎯</p>
                        <p>Built with React + TypeScript + Tailwind CSS</p>
                    </div>
                </div>
            </div>
        </div>
    );
}