import { useCallback, useRef, useState } from 'react'
import type { TranscriptSegment, SpeakerId } from '../components/LiveTranscript'

type WordUnit = { text: string; startMs: number; endMs: number }

interface UpsertArgs {
    speaker: SpeakerId
    text: string
    isFinal: boolean
    words?: WordUnit[]
}

export default function useTranscriptBuffer() {
    const [segments, setSegments] = useState<TranscriptSegment[]>([])

    // Per-speaker rolling state
    const confirmedBySpeaker = useRef<Partial<Record<SpeakerId, WordUnit[]>>>({})
    const commitIdxBySpeaker = useRef<Partial<Record<SpeakerId, number>>>({})
    const interimTextBySpeaker = useRef<Partial<Record<SpeakerId, string>>>({})

    // Finals container; we keep finalized sentence rows here to avoid rebuilding the whole array frequently
    const finalRows = useRef<TranscriptSegment[]>([])
    const scheduled = useRef(false)

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
    const joinWords = (ws: WordUnit[]) => ws.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim()

    const flush = () => {
        scheduled.current = false
        // Build display list: all finals + one interim per speaker (if any)
        const rows: TranscriptSegment[] = [...finalRows.current]
        const pushOrUpdateInterim = (speaker: SpeakerId, text: string) => {
            if (!text) return
            const id = `${speaker}-interim`
            const idx = rows.findIndex(r => r.id === id)
            const seg = { id, speaker, text, isFinal: false as const }
            if (idx >= 0) rows[idx] = seg
            else rows.push(seg)
        }

            ; (Object.keys(interimTextBySpeaker.current) as SpeakerId[]).forEach(sp => {
                const txt = interimTextBySpeaker.current[sp]
                if (typeof txt === 'string') pushOrUpdateInterim(sp, txt)
            })

        // Keep a reasonable cap
        const MAX_ROWS = 300
        if (rows.length > MAX_ROWS) rows.splice(0, rows.length - MAX_ROWS)

        setSegments(rows)
    }

    const scheduleFlush = () => {
        if (scheduled.current) return
        scheduled.current = true
        requestAnimationFrame(flush)
    }

    const upsertTranscript = useCallback(({ speaker, text, isFinal, words }: UpsertArgs) => {
        const incomingText = normalize(text)
        if (!incomingText) return
        const incomingWords = Array.isArray(words) && words.length > 0 ? words : null

        // Initialize speaker state
        const confirmed = (confirmedBySpeaker.current[speaker] ||= [])
        let commitIdx = (commitIdxBySpeaker.current[speaker] ||= 0)

        if (incomingWords) {
            const lastEnd = confirmed.length ? confirmed[confirmed.length - 1].endMs : -1
            for (const w of incomingWords) {
                if (w.endMs > lastEnd) confirmed.push(w)
            }

            // Commit full sentences since last commit
            for (let i = commitIdx; i < confirmed.length; i++) {
                if (/[.!?]$/.test(confirmed[i].text)) {
                    const sentence = confirmed.slice(commitIdx, i + 1)
                    const textVal = joinWords(sentence)
                    if (textVal) finalRows.current.push({ id: `${speaker}-final-${Date.now()}-${i}`, speaker, text: textVal, isFinal: true })
                    commitIdx = i + 1
                }
            }
            commitIdxBySpeaker.current[speaker] = commitIdx

            // Interim tail after last commit
            let tail = confirmed.slice(commitIdx)
            if (isFinal && tail.length) {
                // Commit tail immediately on final packet
                const textVal = joinWords(tail)
                if (textVal) finalRows.current.push({ id: `${speaker}-final-${Date.now()}-tail`, speaker, text: textVal, isFinal: true })
                commitIdxBySpeaker.current[speaker] = confirmed.length
                tail = []
            }
            interimTextBySpeaker.current[speaker] = joinWords(tail)
            scheduleFlush()
            return
        }

        // Fallback without word timings
        if (isFinal) {
            finalRows.current.push({ id: `${speaker}-final-${Date.now()}`, speaker, text: incomingText, isFinal: true })
            interimTextBySpeaker.current[speaker] = ''
        } else {
            // Show full interim text alongside finalized content
            interimTextBySpeaker.current[speaker] = incomingText
        }
        scheduleFlush()
    }, [])

    const clear = useCallback(() => {
        confirmedBySpeaker.current = {}
        commitIdxBySpeaker.current = {}
        interimTextBySpeaker.current = {}
        finalRows.current = []
        setSegments([])
    }, [])

    return { segments, upsertTranscript, clear }
}