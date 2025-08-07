import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface TextToSpeechProps {
    text: string;
    autoPlay?: boolean;
    onStateChange?: (isPlaying: boolean, isMuted: boolean) => void;
}

export interface TextToSpeechRef {
    stop: () => void;
    speak: () => void;
    toggleMute: () => void;
    setMuted: (muted: boolean) => void;
}

const TextToSpeech = forwardRef<TextToSpeechRef, TextToSpeechProps>(({ text, autoPlay = false, onStateChange }, ref) => {
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<number>(0);
    const [rate] = useState(1);
    const [pitch] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if ('speechSynthesis' in window) {
            setIsSupported(true);

            const loadVoices = () => {
                const availableVoices = speechSynthesis.getVoices();
                setVoices(availableVoices);

                // Try to find a good English voice
                const englishVoice = availableVoices.findIndex(voice =>
                    voice.lang.startsWith('en') && voice.name.includes('Female')
                );
                if (englishVoice !== -1) {
                    setSelectedVoice(englishVoice);
                }
            };

            loadVoices();
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    useEffect(() => {
        if (autoPlay && text && isSupported && !isMuted) {
            speak();
        }
    }, [text, autoPlay, isSupported, isMuted]);

    const speak = () => {
        if (!text || !isSupported || isMuted) return;

        // Stop any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        if (voices[selectedVoice]) {
            utterance.voice = voices[selectedVoice];
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 0.8;

        utterance.onstart = () => {
            onStateChange?.(true, isMuted);
        };

        utterance.onend = () => {
            onStateChange?.(false, isMuted);
        };

        utterance.onerror = () => {
            onStateChange?.(false, isMuted);
        };

        speechSynthesis.speak(utterance);
    };

    const stop = () => {
        speechSynthesis.cancel();
        onStateChange?.(false, isMuted);
    };

    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);

        if (newMutedState) {
            // Mute by stopping speech
            speechSynthesis.cancel();
        }

        onStateChange?.(false, newMutedState);
    };

    const setMuted = (muted: boolean) => {
        setIsMuted(muted);

        if (muted) {
            // Mute by stopping speech
            speechSynthesis.cancel();
        }

        onStateChange?.(false, muted);
    };

    // Expose functions to parent component
    useImperativeHandle(ref, () => ({
        stop,
        speak,
        toggleMute,
        setMuted
    }));

    return null;
});

TextToSpeech.displayName = 'TextToSpeech';

export default TextToSpeech;