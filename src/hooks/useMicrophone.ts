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
    // Make restart behavior resilient to 'aborted' errors and rapid restarts
    const restartTimerRef = useRef<number | null>(null);
    const manuallyStoppedRef = useRef<boolean>(false);

    const scheduleRestart = (delayMs = 400) => {
        try { if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current); } catch { }
        if (manuallyStoppedRef.current) return;
        restartTimerRef.current = window.setTimeout(() => {
            if (manuallyStoppedRef.current) return;
            try { recognitionRef.current?.start(); } catch { }
        }, delayMs) as unknown as number;
    };

    // Initialize microphone stream on component mount (always request mic stream; SpeechRecognition is optional)
    useEffect(() => {
        const initializeMicrophone = async () => {
            try {
                // Always acquire microphone stream for Deepgram, independent of Web Speech API
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
                silentAudio.play().catch(() => { });

                // Optional: set up Web Speech recognition if supported (for local question detection)
                const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                if (SR) {
                    setIsSupported(true);
                    recognitionRef.current = new SR();
                    recognitionRef.current.continuous = true;
                    recognitionRef.current.interimResults = true;
                    recognitionRef.current.lang = 'en-US';
                    try { recognitionRef.current.maxAlternatives = 1; } catch { }

                    recognitionRef.current.onresult = (event: any) => {
                        let interim = '';
                        let finalText = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const t = event.results[i][0].transcript as string;
                            if (event.results[i].isFinal) finalText += t;
                            else interim += t;
                        }
                        if (interim) {
                            try { (window as any).__micLive = { text: interim, isFinal: false } } catch { }
                        }
                        if (finalText) {
                            setTranscript(finalText);
                            try { (window as any).__micLive = { text: finalText, isFinal: true } } catch { }
                            if (isListeningRef.current && isQuestion(finalText)) {
                                onQuestionDetected(finalText);
                            }
                        }
                    };
                    recognitionRef.current.onend = () => {
                        // Restart only when actively listening
                        if (isListeningRef.current) scheduleRestart(400);
                    };
                    recognitionRef.current.onerror = (event: any) => {
                        const err = event?.error || 'unknown';
                        // Reduce noisy logs while still surfacing non-benign errors
                        if (err !== 'aborted' && err !== 'no-speech' && err !== 'network') {
                            console.log('Speech recognition error:', err);
                            setError(`Speech recognition error: ${err}`);
                        }
                        // For transient errors, attempt a gentle restart only if listening
                        if (isListeningRef.current && (err === 'aborted' || err === 'no-speech' || err === 'network')) {
                            scheduleRestart(500);
                        }
                    };
                    // Do not auto-start here; start when user enables listening
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
            manuallyStoppedRef.current = true;
            try { if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current); } catch { }
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

    // Do not stop SR based on isListening; only gate onQuestionDetected via isListeningRef

    // Keep ref in sync with state
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // Start/stop recognition based on listening state
    useEffect(() => {
        const rec = recognitionRef.current;
        if (!rec) return;
        if (isListening) {
            manuallyStoppedRef.current = false;
            // Start immediately (or ensure restart soon)
            try { rec.start(); } catch { scheduleRestart(200); }
        } else {
            manuallyStoppedRef.current = true;
            try { rec.stop(); } catch { }
            try { if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current); } catch { }
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
        stopListening,
        stream: streamRef.current,
    };
};