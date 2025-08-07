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
    const [wasMutedWhenEnded, setWasMutedWhenEnded] = useState(false);
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
            setWasMutedWhenEnded(false);
            onStateChange?.(true, isMuted);
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setWasMutedWhenEnded(isMuted);
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
        console.log('Pause called:', {
            speaking: speechSynthesis.speaking,
            paused: speechSynthesis.paused
        });
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
            setIsPaused(true);
            onStateChange?.(true, isMuted);
            console.log('Speech paused successfully');
        } else {
            console.log('Cannot pause: not speaking or already paused');
        }
    };

    const resume = () => {
        console.log('Resume called:', {
            speaking: speechSynthesis.speaking,
            paused: speechSynthesis.paused
        });
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            setIsPaused(false);
            onStateChange?.(true, isMuted);
            console.log('Speech resumed successfully');
        } else {
            console.log('Cannot resume: not paused');
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
        console.log('Toggle mute:', {
            currentMuted: isMuted,
            newMuted: newMutedState,
            isPlaying,
            isPaused,
            speechSynthesisSpeaking: speechSynthesis.speaking,
            speechSynthesisPaused: speechSynthesis.paused
        });

        setIsMuted(newMutedState);

        if (newMutedState && isPlaying && !isPaused) {
            // Mute by pausing
            console.log('Muting: pausing speech');
            pause();
        } else if (!newMutedState && isPaused) {
            // Unmute by resuming
            console.log('Unmuting: resuming speech');
            resume();
        } else if (!newMutedState && !isPlaying && !isPaused) {
            // If unmuting but speech has ended, restart the speech
            console.log('Unmuting: restarting speech');
            speak();
        } else if (!newMutedState && isPlaying && isPaused) {
            // If unmuting and speech is paused, resume it
            console.log('Unmuting: resuming paused speech');
            resume();
        } else if (!newMutedState && !isPlaying && wasMutedWhenEnded) {
            // If unmuting and speech ended while muted, restart it
            console.log('Unmuting: restarting speech that ended while muted');
            setWasMutedWhenEnded(false);
            speak();
        }

        // Update state change with current playing state
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