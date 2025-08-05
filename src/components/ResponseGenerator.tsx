import { useState, useEffect } from 'react';
import { Brain, Lightbulb, Clock, CheckCircle, Zap, AlertTriangle } from 'lucide-react';
import openaiService from '../services/openai';

interface ResponseGeneratorProps {
    question: string;
    onResponseGenerated: (response: string) => void;
    openaiConfigured?: boolean;
}

export default function ResponseGenerator({ question, onResponseGenerated, openaiConfigured = false }: ResponseGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentResponse, setCurrentResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [responseSource, setResponseSource] = useState<'openai' | 'fallback'>('fallback');

    // Fallback responses for when OpenAI is not configured
    const generateFallbackResponse = (question: string): string => {
        const lowerQuestion = question.toLowerCase();

        if (lowerQuestion.includes('tell me about yourself') || lowerQuestion.includes('introduce yourself')) {
            return "I'm a passionate software developer with experience in full-stack development, particularly with React, Node.js, and modern web technologies. I enjoy solving complex problems and building user-friendly applications that make a real impact.";
        } else if (lowerQuestion.includes('strength') || lowerQuestion.includes('strengths')) {
            return "One of my key strengths is my ability to learn quickly and adapt to new technologies. I'm also very detail-oriented and enjoy collaborating with teams to deliver high-quality solutions.";
        } else if (lowerQuestion.includes('weakness') || lowerQuestion.includes('weaknesses')) {
            return "I sometimes tend to be a perfectionist, which can slow me down initially. However, I've learned to balance quality with efficiency by setting clear priorities and deadlines.";
        } else if (lowerQuestion.includes('experience') || lowerQuestion.includes('background')) {
            return "I have several years of experience developing web applications using modern frameworks like React and Vue.js. I've worked on both frontend and backend systems, with expertise in JavaScript, TypeScript, and various databases.";
        } else if (lowerQuestion.includes('why') && (lowerQuestion.includes('company') || lowerQuestion.includes('join'))) {
            return "I'm excited about this opportunity because your company is known for innovation and technical excellence. I believe my skills and passion for development would be a great fit for your team's goals.";
        } else if (lowerQuestion.includes('challenge') || lowerQuestion.includes('difficult')) {
            return "I once faced a complex performance issue in a React application. I systematically analyzed the problem, implemented code splitting and memoization, and reduced load times by 60%. It taught me the importance of performance optimization.";
        } else if (lowerQuestion.includes('goal') || lowerQuestion.includes('future')) {
            return "My goal is to continue growing as a developer while contributing to meaningful projects. I want to deepen my expertise in cloud technologies and potentially move into technical leadership roles.";
        } else {
            return "That's a great question. Based on my experience and understanding of best practices in software development, I would approach this by first analyzing the requirements thoroughly, then designing a scalable solution that prioritizes both functionality and maintainability.";
        }
    };

    const generateResponse = async (question: string): Promise<string> => {
        setIsGenerating(true);
        setError(null);

        try {
            let response = '';

            if (openaiConfigured && openaiService.isConfigured()) {
                // Try OpenAI first
                try {
                    response = await openaiService.generateInterviewResponse(question);
                    setResponseSource('openai');
                } catch (openaiError: any) {
                    console.warn('OpenAI failed, falling back to static responses:', openaiError.message);
                    setError(`OpenAI Error: ${openaiError.message}`);
                    response = generateFallbackResponse(question);
                    setResponseSource('fallback');
                }
            } else {
                // Use fallback responses
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking time
                response = generateFallbackResponse(question);
                setResponseSource('fallback');
            }

            setCurrentResponse(response);
            onResponseGenerated(response);
            return response;

        } catch (error: any) {
            setError(error.message);
            const fallback = generateFallbackResponse(question);
            setCurrentResponse(fallback);
            onResponseGenerated(fallback);
            setResponseSource('fallback');
            return fallback;
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (question) {
            generateResponse(question);
        }
    }, [question]);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-800">AI Response Generator</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {responseSource === 'openai' ? (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <Zap className="h-3 w-3" />
                            OpenAI
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            <Brain className="h-3 w-3" />
                            Demo
                        </div>
                    )}
                </div>
            </div>

            {question && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm text-blue-600 font-medium mb-1">Question Detected:</p>
                    <p className="text-gray-800">{question}</p>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Warning</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">{error}</p>
                    <p className="text-xs text-yellow-600 mt-1">Using fallback response instead.</p>
                </div>
            )}

            {isGenerating ? (
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-purple-700 font-medium">
                        {openaiConfigured && openaiService.isConfigured()
                            ? 'OpenAI is thinking...'
                            : 'Generating intelligent response...'
                        }
                    </span>
                </div>
            ) : currentResponse ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Response Ready</span>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-gray-800 leading-relaxed">{currentResponse}</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-gray-500 p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Waiting for interview question...</span>
                </div>
            )}

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Pro Tip</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                    Practice your delivery and add personal examples to make responses more impactful!
                </p>
            </div>
        </div>
    );
}