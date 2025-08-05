import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw } from 'lucide-react';

interface TextToSpeechProps {
    text: string;
    autoPlay?: boolean;
}

export default function TextToSpeech({ text, autoPlay = false }: TextToSpeechProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<number>(0);
    const [rate, setRate] = useState(1);
    const [pitch, setPitch] = useState(1);

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
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utterance.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
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
    };

    if (!isSupported) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <VolumeX className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-700 text-sm">Text-to-Speech not supported in this browser</p>
            </div>
        );
    }

    if (!text) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <Volume2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No text to speak</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Volume2 className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-800">Text-to-Speech</h3>
            </div>

            <div className="space-y-4">
                {/* Voice Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={isPlaying && !isPaused ? pause : isPaused ? resume : speak}
                        disabled={!text}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 ${!text
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : isPlaying && !isPaused
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                            }`}
                    >
                        {isPlaying && !isPaused ? (
                            <>
                                <Pause className="h-4 w-4" />
                                Pause
                            </>
                        ) : isPaused ? (
                            <>
                                <Play className="h-4 w-4" />
                                Resume
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4" />
                                Speak
                            </>
                        )}
                    </button>

                    {isPlaying && (
                        <button
                            onClick={stop}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-105 shadow-lg shadow-red-500/25"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Stop
                        </button>
                    )}
                </div>

                {/* Voice Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {voices.map((voice, index) => (
                                <option key={index} value={index}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Speed: {rate.toFixed(1)}x
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pitch: {pitch.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={pitch}
                            onChange={(e) => setPitch(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Status Indicator */}
                <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${isPlaying
                    ? isPaused
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-600'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isPlaying
                        ? isPaused
                            ? 'bg-yellow-500'
                            : 'bg-green-500 animate-pulse'
                        : 'bg-gray-400'
                        }`} />
                    {isPlaying ? (isPaused ? 'Paused' : 'Speaking...') : 'Ready to speak'}
                </div>
            </div>
        </div>
    );
}