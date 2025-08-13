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
    const [isSpeaking, setIsSpeaking] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const vadTimerRef = useRef<number | null>(null);
    // Mirrors the latest isListening value to avoid stale closure inside onresult/onend
    const isListeningRef = useRef<boolean>(false);

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
                    // Start silent audio to keep stream active
                    silentAudio.play().catch(() => { });

                    // Lightweight VAD via RMS energy to distinguish real speech vs loopback
                    try {
                        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
                        audioCtxRef.current = new Ctx();
                        if (!audioCtxRef.current) throw new Error('AudioContext not initialized');
                        const source = audioCtxRef.current.createMediaStreamSource(stream);
                        const analyser = audioCtxRef.current.createAnalyser();
                        analyser.fftSize = 2048;
                        analyserRef.current = analyser;
                        source.connect(analyser);
                        const data = new Uint8Array(analyser.fftSize);
                        const tick = () => {
                            const ctx = audioCtxRef.current;
                            const analyserNode = analyserRef.current;
                            if (!analyserNode || !ctx || ctx.state === 'suspended') return;
                            analyserNode.getByteTimeDomainData(data);
                            let sum = 0;
                            for (let i = 0; i < data.length; i++) {
                                const v = (data[i] - 128) / 128;
                                sum += v * v;
                            }
                            const rms = Math.sqrt(sum / data.length);
                            setIsSpeaking(rms > 0.04);
                            try { (window as any).__micVAD = { rms, ts: Date.now() } } catch { }
                        };
                        vadTimerRef.current = window.setInterval(tick, 100) as unknown as number;
                    } catch { }

                    // Initialize speech recognition
                    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                    recognitionRef.current = new SpeechRecognition();

                    recognitionRef.current.continuous = true;
                    recognitionRef.current.interimResults = true;
                    recognitionRef.current.lang = 'en-US';

                    recognitionRef.current.onresult = (event: any) => {
                        let interimTranscript = '';
                        let finalTranscript = '';

                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const t = event.results[i][0].transcript as string;
                            if (event.results[i].isFinal) finalTranscript += t;
                            else interimTranscript += t;
                        }

                        // Emit interim text to live transcript immediately
                        if (interimTranscript) {
                            try { (window as any).__micLive = { text: interimTranscript, isFinal: false } } catch { }
                        }

                        if (finalTranscript) {
                            setTranscript(finalTranscript);
                            try { (window as any).__micLive = { text: finalTranscript, isFinal: true } } catch { }

                            // Only process question detection if listening is enabled
                            if (isListeningRef.current && isQuestion(finalTranscript)) {
                                onQuestionDetected(finalTranscript);
                            }
                        }
                    };

                    // If recognition ends unexpectedly (e.g., silence/no-speech), auto-restart while listening
                    recognitionRef.current.onend = () => {
                        if (isListeningRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch (_) {
                                // ignore rapid start errors
                            }
                        }
                    };

                    recognitionRef.current.onerror = (event: any) => {
                        console.log('Speech recognition error:', event.error);
                        setError(`Speech recognition error: ${event.error}`);
                    };

                    // silentAudio already started

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
            if (vadTimerRef.current !== null) {
                try { window.clearInterval(vadTimerRef.current) } catch { }
                vadTimerRef.current = null;
            }
            try {
                if (audioCtxRef.current) audioCtxRef.current.close();
            } catch { }
            analyserRef.current = null;
            audioCtxRef.current = null;
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
        isSpeaking,
        stopListening,
        stream: streamRef.current,
    };
};