import { useState, useCallback } from 'react';

export interface ConversationItem {
    id: string;
    type: 'question' | 'response';
    content: string;
    timestamp: Date;
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

    const addQuestion = useCallback((question: string) => {
        const questionItem: ConversationItem = {
            id: `q-${Date.now()}`,
            type: 'question',
            content: question,
            timestamp: new Date()
        };

        setConversations(prev => [...prev, questionItem]);
        setSessionStats(prev => ({
            ...prev,
            questionsAnswered: prev.questionsAnswered + 1
        }));
    }, []);

    const addResponse = useCallback((response: string) => {
        const responseItem: ConversationItem = {
            id: `r-${Date.now()}`,
            type: 'response',
            content: response,
            timestamp: new Date()
        };

        setConversations(prev => [...prev, responseItem]);
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
        clearHistory
    };
};
