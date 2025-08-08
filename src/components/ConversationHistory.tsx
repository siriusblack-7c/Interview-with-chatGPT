import { MessageCircle, User, Bot, Clock } from 'lucide-react';

interface ConversationItem {
    id: string;
    type: 'question' | 'response';
    content: string;
    timestamp: Date;
}

interface ConversationHistoryProps {
    conversations: ConversationItem[];
    onClearHistory: () => void;
}

export default function ConversationHistory({ conversations, onClearHistory }: ConversationHistoryProps) {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="bg-[#2c2c2c] rounded-md shadow-lg border border-gray-500 p-6 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    Conversation History
                </h3>
                {conversations.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                        Clear History
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto flex-col-reverse space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-center">No conversation yet</p>
                        <p className="text-sm text-center">Start by asking a question!</p>
                    </div>
                ) : (
                    conversations.reverse().map((item) => (
                        <div
                            key={item.id}
                            className={`flex gap-3 p-3 rounded-lg transition-all hover:shadow-sm ${item.type === 'question'
                                ? 'bg-[#404040] border-l-4 border-blue-500'
                                : 'bg-[#404040] border-l-4 border-green-500'
                                }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'question'
                                ? 'bg-blue-500 text-white'
                                : 'bg-green-500 text-white'
                                }`}>
                                {item.type === 'question' ? (
                                    <User className="h-4 w-4" />
                                ) : (
                                    <Bot className="h-4 w-4" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-medium ${item.type === 'question' ? 'text-blue-600' : 'text-green-600'
                                        }`}>
                                        {item.type === 'question' ? 'Interviewer' : 'AI Assistant'}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTime(item.timestamp)}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-200 leading-relaxed break-words">
                                    {item.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {conversations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{conversations.length} items in history</span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            Live session
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}