import { useState, useEffect, useRef, useCallback } from 'react';
import { isQuestion } from '../utils/questionDetection';

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
    // Mirrors the latest isListening value to avoid stale closure inside onresult/onend
    const isListeningRef = useRef<boolean>(false);

    // Initialize microphone stream on component mount (independent of Web Speech API)
    useEffect(() => {
        const initializeMicrophone = async () => {
            try {
                // Always get microphone stream first so Deepgram can use it even if Web Speech API is unavailable
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });

                streamRef.current = stream;
                setIsMicActive(true);

                // Create silent audio to keep stream active
                const silentAudio = new Audio();
                silentAudio.srcObject = stream;
                silentAudio.muted = true;
                silentAudio.loop = true;
                silentAudioRef.current = silentAudio;
                silentAudio.play().catch(() => { });

                // Optional: Web Speech API for local question detection convenience
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
                            const t = event.results[i][0].transcript;
                            if (event.results[i].isFinal) finalTranscript += t;
                        }
                        if (finalTranscript) {
                            setTranscript(finalTranscript);
                            if (isListeningRef.current && isQuestion(finalTranscript)) onQuestionDetected(finalTranscript);
                        }
                    };

                    recognitionRef.current.onend = () => {
                        if (isListeningRef.current) {
                            try { recognitionRef.current.start(); } catch { }
                        }
                    };

                    recognitionRef.current.onerror = (event: any) => {
                        console.log('Speech recognition error:', event.error);
                        setError(`Speech recognition error: ${event.error}`);
                    };
                } else {
                    setIsSupported(false);
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

    // Keep ref in sync with state
    useEffect(() => {
        isListeningRef.current = isListening;
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
        stopListening,
        stream: streamRef.current,
    };
};
