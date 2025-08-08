import { useState, useCallback, useRef } from 'react';
import { BarChart3, Zap, Sparkles } from 'lucide-react';
import SpeechRecognition from './SpeechRecognition';
import ResponseGenerator from './ResponseGenerator';
import ConversationHistory from './ConversationHistory';
import TextToSpeech from './TextToSpeech';
import OpenAIConfig from './OpenAIConfig';
import DocumentManager from './DocumentManager';
import { useConversation } from '../hooks/useConversation';
import { useMicrophone } from '../hooks/useMicrophone';
import type { TextToSpeechRef } from '../types/speech';

export default function InterviewDashboard() {
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentResponse, setCurrentResponse] = useState('');
    const [openaiConfigured, setOpenaiConfigured] = useState(false);
    const [isResponsePlaying, setIsResponsePlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [additionalContext, setAdditionalContext] = useState('');

    const textToSpeechRef = useRef<TextToSpeechRef>(null);

    // Custom hooks
    const { conversations, sessionStats, addQuestion, addResponse, clearHistory } = useConversation();
    const { isListening, toggleListening, transcript, isMicActive } = useMicrophone({
        onQuestionDetected: (question: string) => {
            console.log('🎤 Question detected in useMicrophone:', question);
            setCurrentQuestion(question);
            addQuestion(question);
        }
    });

    const handleResponseGenerated = useCallback((response: string) => {
        setCurrentResponse(response);
        addResponse(response);
    }, [addResponse]);

    const handleClearHistory = useCallback(() => {
        clearHistory();
        setCurrentQuestion('');
        setCurrentResponse('');
    }, [clearHistory]);

    const handleSpeechStateChange = useCallback((playing: boolean, muted: boolean) => {
        setIsResponsePlaying(playing);
        setIsMuted(muted);
    }, []);

    const handleMuteToggle = useCallback((muted: boolean) => {
        setIsMuted(muted);
        // Update the TextToSpeech component's mute state
        if (textToSpeechRef.current) {
            textToSpeechRef.current.setMuted(muted);
        }
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

    const handleAdditionalContextUpdate = useCallback((text: string) => {
        setAdditionalContext(text);
    }, []);

    return (
        <div className="min-h-screen bg-[#1a1a1a] from-blue-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-[#1a1a1a] shadow-sm border-b border-gray-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">AI Interview Copilot</h1>
                                <p className="text-sm text-gray-300">Real-time interview question analysis & response generation</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Session Stats */}
                            <div className="hidden md:flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-blue-400" />
                                    <span className="text-gray-400">Questions:</span>
                                    <span className="font-semibold text-gray-200">{sessionStats.questionsAnswered}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-green-600" />
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${!isMicActive ? 'bg-red-100 text-red-700' :
                                        isListening ? 'bg-green-100 text-green-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {!isMicActive ? 'No Mic' : isListening ? 'Live' : 'Ready'}
                                    </span>
                                </div>
                            </div>

                            {/* <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <Settings className="h-5 w-5" />
                            </button> */}
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
                            isListening={isListening}
                            onToggleListening={toggleListening}
                            onStopResponse={handleStopResponse}
                            isResponsePlaying={isResponsePlaying}
                            transcript={transcript}
                            isMicActive={isMicActive}
                        />
                        {/* Response Generator */}
                        <ResponseGenerator
                            question={currentQuestion}
                            onResponseGenerated={handleResponseGenerated}
                            openaiConfigured={openaiConfigured}
                            resumeText={resumeText}
                            jobDescription={jobDescription}
                            additionalContext={additionalContext}
                            onMuteToggle={handleMuteToggle}
                            isMuted={isMuted}
                        />

                        {/* Hidden Text-to-Speech for automatic playback */}
                        <TextToSpeech
                            ref={textToSpeechRef}
                            text={currentResponse}
                            autoPlay={true}
                            onStateChange={handleSpeechStateChange}
                        />

                        {/* Document Manager */}
                        <DocumentManager
                            onResumeUpdate={handleResumeUpdate}
                            onJobDescriptionUpdate={handleJobDescriptionUpdate}
                            onAdditionalContextUpdate={handleAdditionalContextUpdate}
                            resumeText={resumeText}
                            jobDescription={jobDescription}
                            additionalContext={additionalContext}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Conversation History */}
                        <ConversationHistory
                            conversations={conversations}
                            onClearHistory={handleClearHistory}
                        />
                        {/* OpenAI Configuration */}
                        <OpenAIConfig onConfigChange={setOpenaiConfigured} />
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="bg-[#1a1a1a] border-t border-gray-600 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                        <p>AI Interview Copilot</p>
                        <p>Built with React + TypeScript + Tailwind CSS</p>
                    </div>
                </div>
            </div>
        </div>
    );
}