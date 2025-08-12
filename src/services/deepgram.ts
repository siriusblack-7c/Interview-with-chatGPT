import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk'

export type DeepgramTranscript = {
    text: string
    isFinal: boolean
}

class DeepgramService {
    private apiKey: string
    private previousScript: string
    constructor() {
        const envKey = (import.meta as any).env?.VITE_DEEPGRAM_API_KEY || ''
        const stored = typeof window !== 'undefined' ? localStorage.getItem('deepgram_api_key') || '' : ''
        this.previousScript = ''
        this.apiKey = stored || envKey || ''
    }

    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey !== 'your_deepgram_api_key_here'
    }

    updateApiKey(key: string) {
        this.apiKey = key
        if (typeof window !== 'undefined') localStorage.setItem('deepgram_api_key', key)
    }

    /**
     * Start a Deepgram live transcription session and stream a MediaStream to it via MediaRecorder.
     * Returns a cleanup function that closes the session and stops the recorder.
     */
    startLiveFromStream(
        stream: MediaStream,
        {
            model = 'nova-3',
            interim_results = true,
            smart_format = true,
            punctuate = true,
            language = 'en-US',
            timesliceMs = 150,
            onTranscript,
            onError,
        }: {
            model?: string
            interim_results?: boolean
            smart_format?: boolean
            punctuate?: boolean
            language?: string
            timesliceMs?: number
            onTranscript: (t: DeepgramTranscript) => void
            onError?: (err: any) => void
        }
    ): () => void {
        if (!this.isConfigured()) throw new Error('Deepgram API key not configured')

        const dg = createClient(this.apiKey)
        const live: LiveClient = dg.listen.live({ model, interim_results, smart_format, punctuate, language })

        let recorder: MediaRecorder | null = null
        let isOpen = false

        const closeAll = () => {
            try {
                if (recorder && recorder.state !== 'inactive') recorder.stop()
            } catch { }
            try { if (isOpen) (live as any).finish?.() } catch { }
        }

        live.on(LiveTranscriptionEvents.Open, () => {
            isOpen = true
            // simple: no keep-alive, minimal config
            const mimeCandidates = [
                'audio/webm;codecs=opus',
                'audio/webm',
            ]
            const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m))
            recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 200) {
                    try {
                        console.log(e.data, "sending")
                        live.send(e.data)
                    } catch { }
                }
            }
            recorder.start(timesliceMs)
        })

        live.on(LiveTranscriptionEvents.Transcript, (evt: any) => {
            try {
                const alt = evt?.channel?.alternatives?.[0]
                console.log(evt, "received")
                const text = alt?.transcript || ''
                if (!text || text === this.previousScript) return
                this.previousScript = text
                const isFinal = !!evt?.is_final
                onTranscript({ text, isFinal })
            } catch (err) {
                // ignore parsing errors
            }
        })

        live.on(LiveTranscriptionEvents.Error, (err: any) => {
            onError?.(err)
        })

        live.on(LiveTranscriptionEvents.Close, () => {
            isOpen = false
            try {
                if (recorder && recorder.state !== 'inactive') recorder.stop()
            } catch { }
            // nothing else
        })

        return closeAll
    }
}

export const deepgramService = new DeepgramService()
export default deepgramService