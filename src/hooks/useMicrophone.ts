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
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const vadTimerRef = useRef<number | null>(null);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);
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

                    // Always keep recognition running for live transcript; gate only question detection by isListening
                    recognitionRef.current.onend = () => {
                        try {
                            recognitionRef.current.start();
                        } catch (_) {
                            // ignore rapid start errors
                        }
                    };

                    recognitionRef.current.onerror = (event: any) => {
                        console.log('Speech recognition error:', event.error);
                        setError(`Speech recognition error: ${event.error}`);
                    };

                    // Start silent audio to keep stream active
                    silentAudio.play().catch(console.error);

                    // Initialize lightweight VAD to provide RMS energy
                    try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const src = ctx.createMediaStreamSource(stream);
                        const analyser = ctx.createAnalyser();
                        analyser.fftSize = 2048;
                        src.connect(analyser);
                        audioCtxRef.current = ctx;
                        analyserRef.current = analyser;
                        sourceRef.current = src;

                        const buf = new Uint8Array(analyser.frequencyBinCount);
                        const tick = () => {
                            if (!analyserRef.current) return;
                            analyserRef.current.getByteTimeDomainData(buf);
                            let sumSquares = 0;
                            for (let i = 0; i < buf.length; i++) {
                                const val = (buf[i] - 128) / 128;
                                sumSquares += val * val;
                            }
                            const rms = Math.sqrt(sumSquares / buf.length);
                            try { (window as any).__micVAD = { rms, ts: Date.now() } } catch { }
                        };
                        // ~30fps
                        vadTimerRef.current = window.setInterval(tick, 33);
                    } catch (e) {
                        // ignore VAD init errors
                    }

                    // Start recognition immediately to always capture 'me' transcript
                    try { recognitionRef.current.start(); } catch { }
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
                try { recognitionRef.current.stop(); } catch { }
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
                silentAudioRef.current.srcObject = null;
            }
            if (vadTimerRef.current) {
                window.clearInterval(vadTimerRef.current);
                vadTimerRef.current = null;
            }
            try {
                sourceRef.current?.disconnect();
                analyserRef.current?.disconnect();
                audioCtxRef.current?.close();
            } catch { }
            sourceRef.current = null;
            analyserRef.current = null;
            audioCtxRef.current = null;
        };
    }, [onQuestionDetected]);

    // Keep recognition always running for transcript; this effect only exists to attempt a start when toggled on
    useEffect(() => {
        if (isListening && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch { }
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
        stopListening
    };
};