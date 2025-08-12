import { useCallback, useEffect, useRef, useState } from 'react';
// Whisper fallback removed; Deepgram is the primary path
// import deepgramService from '../services/deepgram';

interface UseSystemAudioOptions {
    onQuestionDetected: (question: string) => void;
}

export const useSystemAudio = ({ onQuestionDetected }: UseSystemAudioOptions) => {
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    // removed fallback chunking
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

            // Deepgram is used for live streaming; local fallback is removed
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
        setListening,
        // expose stream for Deepgram
        stream: streamRef.current
    };
};
