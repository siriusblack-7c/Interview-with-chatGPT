import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

interface TextToSpeechProps {
    text: string;
    autoPlay?: boolean;
    onStateChange?: (isPlaying: boolean, isMuted: boolean) => void;
}

export interface TextToSpeechRef {
    toggleMute: () => void;
    stop: () => void;
    speak: () => void;
}

const TextToSpeech = forwardRef<TextToSpeechRef, TextToSpeechProps>(({ text, autoPlay = false, onStateChange }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<number>(0);
    const [rate] = useState(1);
    const [pitch] = useState(1);

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
        if (autoPlay && text && isSupported) {
            speak();
        }
    }, [text, autoPlay, isSupported]);

    const speak = () => {
        if (!text || !isSupported) return;

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
            setIsPlaying(true);
            setIsPaused(false);
            onStateChange?.(true, isMuted);
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
            onStateChange?.(false, isMuted);
        };

        utterance.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
            onStateChange?.(false, isMuted);
        };

        speechSynthesis.speak(utterance);
    };

    const pause = () => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
            setIsPaused(true);
        }
    };

    const resume = () => {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            setIsPaused(false);
        }
    };

    const stop = () => {
        speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        onStateChange?.(false, isMuted);
    };

    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);

        if (newMutedState && isPlaying) {
            // Mute by pausing
            pause();
        } else if (!newMutedState && isPaused) {
            // Unmute by resuming
            resume();
        }

        onStateChange?.(isPlaying, newMutedState);
    };

    // Expose functions to parent component
    useImperativeHandle(ref, () => ({
        toggleMute,
        stop,
        speak
    }));

    // Component is now hidden - only used for automatic speech functionality
    if (!isSupported || !text) {
        return null;
    }

    // Component is hidden - only provides automatic speech functionality
    return null;
});

TextToSpeech.displayName = 'TextToSpeech';

export default TextToSpeech;