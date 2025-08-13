export type SpeakerId = 'me' | 'them'

export interface AttributionDecision {
    speaker: SpeakerId
    accept: boolean
}

export interface CreateAudioAttributionOptions {
    // Called to determine if system/tab sharing is currently active
    isSystemActive: () => boolean
    // Optional: time window (ms) that biases toward 'them' right after a system utterance
    systemBiasMs?: number
    // Optional: VAD threshold for mic classification while system is active
    vadThreshold?: number
}

export const createAudioAttribution = ({ isSystemActive, systemBiasMs = 300, vadThreshold = 0.06 }: CreateAudioAttributionOptions) => {
    let lastSystemTs = 0

    const now = () => Date.now()

    const recordSystemEvent = () => {
        lastSystemTs = now()
    }

    const classifySystem = (): AttributionDecision => {
        recordSystemEvent()
        return { speaker: 'them', accept: true }
    }

    const classifyMic = ({ isFinal, rms }: { isFinal: boolean; rms?: number | null }): AttributionDecision => {
        const systemActive = isSystemActive()
        if (!systemActive) {
            // No system audio: always accept mic as 'me'
            return { speaker: 'me', accept: true }
        }

        // System audio is active. Reduce echo by using VAD and a short bias window after a system event.
        const hasRms = typeof rms === 'number' && Number.isFinite(rms)
        const energy = hasRms ? (rms as number) : undefined
        const elapsed = now() - lastSystemTs

        // Finals: if user energy is present, allow even inside bias window
        if (isFinal) {
            if (hasRms) {
                return { speaker: 'me', accept: energy! >= vadThreshold }
            }
            // Without VAD info, be slightly conservative if within bias window
            if (elapsed <= systemBiasMs) return { speaker: 'me', accept: false }
            return { speaker: 'me', accept: true }
        }

        // Interims: require VAD and being outside the bias window
        if (!hasRms) return { speaker: 'me', accept: false }
        if (elapsed <= systemBiasMs) return { speaker: 'me', accept: false }
        return { speaker: 'me', accept: energy! >= vadThreshold }
    }

    return {
        classifySystem,
        classifyMic,
        recordSystemEvent,
    }
}

export default createAudioAttribution



