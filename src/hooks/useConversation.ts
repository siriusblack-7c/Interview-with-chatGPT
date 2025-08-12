import { useState, useCallback } from 'react';

export interface ConversationItem {
    id: string;
    type: 'question' | 'response' | 'transcript';
    content: string;
    timestamp: Date;
    isFinalTranscript?: boolean;
}

export interface SessionStats {
    questionsAnswered: number;
    avgResponseTime: number;
    sessionDuration: number;
}

export const useConversation = () => {
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [sessionStats, setSessionStats] = useState<SessionStats>({
        questionsAnswered: 0,
        avgResponseTime: 0,
        sessionDuration: 0
    });

    // No-op: Questions are not stored in history; we also do not update question stats.
    const addQuestion = useCallback((_: string) => {
        // intentionally empty
    }, []);

    // No-op: OpenAI responses are not stored in history.
    const addResponse = useCallback((_: string) => {
        // intentionally empty
    }, []);

    const addOrUpdateTranscript = useCallback((text: string, isFinal: boolean) => {
        setConversations(prev => {
            // Update the latest transcript item if it exists and isn't final yet
            for (let i = prev.length - 1; i >= 0; i--) {
                const item = prev[i];
                if (item.type === 'transcript' && !item.isFinalTranscript) {
                    const updated = [...prev];
                    updated[i] = { ...item, content: text, isFinalTranscript: isFinal, timestamp: new Date() };
                    return updated;
                }
            }
            // Otherwise append a new transcript item
            return [
                ...prev,
                {
                    id: `t-${Date.now()}`,
                    type: 'transcript',
                    content: text,
                    timestamp: new Date(),
                    isFinalTranscript: isFinal,
                } as ConversationItem,
            ];
        });
    }, []);

    const clearHistory = useCallback(() => {
        setConversations([]);
        setSessionStats({
            questionsAnswered: 0,
            avgResponseTime: 0,
            sessionDuration: 0
        });
    }, []);

    return {
        conversations,
        sessionStats,
        addQuestion,
        addResponse,
        addOrUpdateTranscript,
        clearHistory
    };
};
