import { useEffect, useRef, useState } from 'react'
import deepgramService, { type DeepgramTranscript } from '../services/deepgram'

export interface UseDeepgramLiveOptions {
    stream: MediaStream | null
    enabled: boolean
    onTranscript: (t: DeepgramTranscript) => void
}

export interface UseDeepgramLiveReturn {
    connected: boolean
    error: string | null
}

/**
 * Manages a Deepgram live session for a given MediaStream. Starts/stops with `enabled`.
 */
export const useDeepgramLive = ({ stream, enabled, onTranscript }: UseDeepgramLiveOptions): UseDeepgramLiveReturn => {
    const cleanupRef = useRef<(() => void) | null>(null)
    const connectingRef = useRef(false)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!enabled || !stream) {
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }
            connectingRef.current = false
            setConnected(false)
            return
        }

        if (!deepgramService.isConfigured()) {
            setError('Deepgram is not configured')
            return
        }

        try {
            if (connectingRef.current || cleanupRef.current) return
            connectingRef.current = true
            setError(null)
            const cleanup = deepgramService.startLiveFromStream(stream, {
                timesliceMs: 150,
                onTranscript: (t) => {
                    onTranscript(t)
                },
                onError: (err) => setError(typeof err?.message === 'string' ? err.message : 'Deepgram error')
            })
            cleanupRef.current = cleanup
            setConnected(true)
            connectingRef.current = false
        } catch (e: any) {
            setError(e?.message || 'Failed to start Deepgram')
            setConnected(false)
            connectingRef.current = false
        }

        return () => {
            if (cleanupRef.current) {
                cleanupRef.current()
                cleanupRef.current = null
            }
            connectingRef.current = false
            setConnected(false)
        }
    }, [enabled, stream, onTranscript])

    return { connected, error }
}

export default useDeepgramLive



