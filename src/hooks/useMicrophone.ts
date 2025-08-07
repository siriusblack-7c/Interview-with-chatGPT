import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMicrophoneOptions {
    onQuestionDetected: (question: string) => void;
}

export const useMicrophone = ({ onQuestionDetected }: UseMicrophoneOptions) => {
    const [isMicActive, setIsMicActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize microphone stream on component mount
    useEffect(() => {
        const initializeMicrophone = async () => {
            try {
                // Check if speech recognition is supported
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    setIsSupported(true);

                    // Get microphone stream and keep it active
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });

                    streamRef.current = stream;
                    setIsMicActive(true);

                    // Create silent audio to keep stream active
                    const silentAudio = new Audio();
                    silentAudio.srcObject = stream;
                    silentAudio.muted = true;
                    silentAudio.loop = true;
                    silentAudioRef.current = silentAudio;

                    // Initialize speech recognition
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
                            // Only process if listening is enabled
                            if (isListening) {
                                // Import and use the question detection
                                import('../utils/questionDetection').then(({ isQuestion }) => {
                                    if (isQuestion(finalTranscript)) {
                                        onQuestionDetected(finalTranscript);
                                    }
                                });
                            }
                        }
                    };

                    recognitionRef.current.onerror = (event: any) => {
                        console.log('Speech recognition error:', event.error);
                        setError(`Speech recognition error: ${event.error}`);
                    };

                    // Start silent audio to keep stream active
                    silentAudio.play().catch(console.error);

                } else {
                    setError('Speech recognition not supported in this browser');
                }
            } catch (error: any) {
                console.log('Failed to initialize microphone:', error);
                setError(`Microphone access denied: ${error.message}`);
            }
        };

        initializeMicrophone();

        // Cleanup function
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
                silentAudioRef.current.srcObject = null;
            }
        };
    }, [onQuestionDetected]);

    // Control speech recognition listening
    useEffect(() => {
        try {
            if (recognitionRef.current) {
                if (isListening) {
                    recognitionRef.current.start();
                } else {
                    recognitionRef.current.stop();
                }
            }
        } catch (error) {
            console.log('Error starting/stopping speech recognition:', error);
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        setIsListening(prev => !prev);
    }, []);

    const startListening = useCallback(() => {
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        setIsListening(false);
    }, []);

    return {
        isMicActive,
        isListening,
        isSupported,
        transcript,
        error,
        toggleListening,
        startListening,
        stopListening
    };
};
