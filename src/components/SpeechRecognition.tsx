import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';

interface SpeechRecognitionProps {
    onQuestionDetected: (question: string) => void;
    isListening: boolean;
    onToggleListening: () => void;
    onMuteResponse?: () => void;
    onStopResponse?: () => void;
    isResponsePlaying?: boolean;
    isMuted?: boolean;
}

export default function SpeechRecognition({
    onQuestionDetected,
    isListening,
    onToggleListening,
    onMuteResponse,
    onStopResponse,
    isResponsePlaying = false,
    isMuted = false
}: SpeechRecognitionProps) {
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setIsSupported(true);
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();

            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(finalTranscript);
                    // Detect if it's a question (ends with ?)
                    if (finalTranscript.trim().endsWith('?') ||
                        finalTranscript.toLowerCase().includes('what') ||
                        finalTranscript.toLowerCase().includes('how') ||
                        finalTranscript.toLowerCase().includes('why') ||
                        finalTranscript.toLowerCase().includes('when') ||
                        finalTranscript.toLowerCase().includes('can') ||
                        finalTranscript.toLowerCase().includes('could') ||
                        finalTranscript.toLowerCase().includes('would') ||
                        finalTranscript.toLowerCase().includes('should') ||
                        finalTranscript.toLowerCase().includes('might') ||
                        finalTranscript.toLowerCase().includes('may') ||
                        finalTranscript.toLowerCase().includes('must') ||
                        finalTranscript.toLowerCase().includes('need') ||
                        finalTranscript.toLowerCase().includes('have') ||
                        finalTranscript.toLowerCase().includes('do') ||
                        finalTranscript.toLowerCase().includes('does') ||
                        finalTranscript.toLowerCase().includes('did') ||
                        finalTranscript.toLowerCase().includes('will') ||
                        finalTranscript.toLowerCase().includes('would') ||
                        finalTranscript.toLowerCase().includes('should') ||
                        finalTranscript.toLowerCase().includes('please') ||
                        finalTranscript.toLowerCase().includes('where')) {
                        onQuestionDetected(finalTranscript);
                    }
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onQuestionDetected]);

    useEffect(() => {
        if (recognitionRef.current) {
            if (isListening) {
                recognitionRef.current.start();
            } else {
                recognitionRef.current.stop();
            }
        }
    }, [isListening]);

    if (!isSupported) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <Volume2 className="h-12 w-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-700 font-medium">Speech Recognition Not Supported</p>
                <p className="text-red-600 text-sm mt-1">
                    Please use a modern browser like Chrome or Edge
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-blue-600" />
                    Voice Input
                </h3>
                <div className="flex items-center gap-2">
                    {/* Response Control Buttons */}
                    {(isResponsePlaying || isMuted) && (
                        <>
                            {onMuteResponse && (
                                <button
                                    onClick={onMuteResponse}
                                    className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${isMuted
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                                        : 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg shadow-gray-500/25'
                                        }`}
                                    title={isMuted ? 'Unmute Response' : 'Mute Response'}
                                >
                                    {isMuted ? (
                                        <VolumeX className="h-4 w-4" />
                                    ) : (
                                        <Volume2 className="h-4 w-4" />
                                    )}
                                </button>
                            )}
                            {onStopResponse && isResponsePlaying && (
                                <button
                                    onClick={onStopResponse}
                                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/25"
                                    title="Stop Response"
                                >
                                    <Square className="h-4 w-4" />
                                </button>
                            )}
                        </>
                    )}

                    {/* Microphone Button */}
                    <button
                        onClick={onToggleListening}
                        className={`p-3 rounded-full transition-all duration-200 transform hover:scale-105 ${isListening
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            }`}
                        title={isListening ? 'Stop Listening' : 'Start Listening'}
                    >
                        {isListening ? (
                            <MicOff className="h-6 w-6" />
                        ) : (
                            <Mic className="h-6 w-6" />
                        )}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-sm ${isListening ? 'text-green-600' : 'text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {isListening ? 'Listening for questions...' : 'Click microphone to start'}
                    </div>

                    {/* Response Status */}
                    {(isResponsePlaying || isMuted) && (
                        <div className={`flex items-center gap-2 text-xs ${isMuted ? 'text-orange-600' : isResponsePlaying ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isMuted ? 'bg-orange-500' : isResponsePlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                }`} />
                            {isMuted ? '🔇 Response muted' : isResponsePlaying ? '🔊 Speaking answer...' : 'Response ready'}
                        </div>
                    )}
                </div>

                {transcript && (
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                        <p className="text-sm text-gray-600 mb-1">Last heard:</p>
                        <p className="text-gray-800">{transcript}</p>
                    </div>
                )}
            </div>
        </div>
    );
}