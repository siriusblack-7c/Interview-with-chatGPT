import { useCallback, useEffect, useRef, useState } from 'react';
import openaiService from '../services/openai';

interface UseSystemAudioOptions {
    onQuestionDetected: (question: string) => void;
}

export const useSystemAudio = ({ onQuestionDetected }: UseSystemAudioOptions) => {
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const isListeningRef = useRef<boolean>(false);

    const startShare = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                throw new Error('Your browser does not support system/tab audio capture (getDisplayMedia). Use Chrome/Edge and share a tab with audio.');
            }

            // Some browsers require video=true to allow audio sharing
            let stream: MediaStream | null = null;
            const attempts: MediaStreamConstraints[] = [
                { video: true as any, audio: true as any },
                { video: { cursor: 'never' } as any, audio: { echoCancellation: true, noiseSuppression: true } as any },
            ];

            let lastErr: any = null;
            for (const constraints of attempts) {
                try {
                    stream = await navigator.mediaDevices.getDisplayMedia(constraints as any);
                    if (stream) break;
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!stream) {
                throw lastErr || new Error('Could not start system audio capture');
            }

            // Some share targets may not include audio unless user checks "Share audio"
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                // Clean up the video track
                stream.getVideoTracks().forEach(t => t.stop());
                throw new Error('No audio track in the shared stream. Share a tab/window and enable "Share audio".');
            }

            // We do not need video; stop it if present
            stream.getVideoTracks().forEach(t => t.stop());

            streamRef.current = stream;
            setIsSharing(true);

            // Pick a recorder mime type supported by the browser
            const mimeCandidates = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
            ];
            const supported = mimeCandidates.find(t => MediaRecorder.isTypeSupported(t));
            const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
            recorderRef.current = recorder;

            recorder.ondataavailable = async (e: BlobEvent) => {
                if (!isListeningRef.current) return; // Gate by listen state
                if (e.data && e.data.size > 0) {
                    const blob = new Blob([e.data], { type: e.data.type });
                    try {
                        const text = await openaiService.transcribeAudio(blob);
                        if (!text) return;
                        // Single-call: detect and answer
                        const result = await openaiService.detectQuestionAndAnswer(text);
                        if (result.isQuestion && result.question) {
                            onQuestionDetected(result.question);
                            // Optionally we could emit the answer directly here via a callback
                            // but current app flows through InterviewDashboard -> ResponseGenerator
                        }
                    } catch (err: any) {
                        console.warn('Transcription/detect chunk failed:', err.message);
                    }
                }
            };

            recorder.onstop = () => {
                chunksRef.current = [];
            };

            recorder.start(2000); // small chunks every 2s
        } catch (err: any) {
            console.error('System audio share failed:', err);
            setError(err.message || 'Failed to share system audio');
            setIsSharing(false);
        }
    }, [onQuestionDetected]);

    const stopShare = useCallback(() => {
        recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
        recorderRef.current = null;
        streamRef.current = null;
        setIsSharing(false);
    }, []);

    const setListening = useCallback((listening: boolean) => {
        isListeningRef.current = listening;
        const rec = recorderRef.current;
        if (!rec) return;
        try {
            if (!listening && rec.state === 'recording') {
                rec.pause();
            } else if (listening && rec.state === 'paused') {
                rec.resume();
            }
        } catch (_) {
            // ignore
        }
    }, []);

    useEffect(() => {
        return () => {
            recorderRef.current?.stop();
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return {
        isSharing,
        error,
        startShare,
        stopShare,
        setListening
    };
};
