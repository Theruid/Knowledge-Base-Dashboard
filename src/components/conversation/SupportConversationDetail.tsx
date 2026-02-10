import React, { useState, useEffect } from 'react';
import { Bot, User, MessageCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { chatbotConversationApi, ConversationMessage } from '../../services/chatbotConversationApi';

interface SupportConversationDetailProps {
    sessionId: string | null;
}

const SupportConversationDetail: React.FC<SupportConversationDetailProps> = ({ sessionId }) => {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sessionId) {
            fetchMessages(sessionId);
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    const fetchMessages = async (sid: string) => {
        try {
            setLoading(true);
            setError(null);

            const response: any = await chatbotConversationApi.getSession(sid);

            if (response.success) {
                setMessages(response.messages);
            } else {
                setError('Failed to load messages');
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('An error occurred while fetching messages');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    if (!sessionId) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <MessageCircle className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No session selected</h3>
                    <p className="text-gray-500">
                        Select a chat session from the list to view its messages
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                        Chat Session: {sessionId.substring(0, 8)}...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {error}</span>
                        </div>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <div className="flex justify-center items-center min-h-[200px]">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && messages.length === 0 && !error && (
                        <div className="py-8 flex flex-col items-center justify-center text-center">
                            <MessageCircle className="h-10 w-10 text-gray-400 mb-4" />
                            <p className="text-gray-500">No messages found in this session</p>
                        </div>
                    )}

                    {/* Messages */}
                    {!loading && messages.length > 0 && (
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${message.role === 'user'
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                            }`}
                                    >
                                        {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>

                                    {/* Message content */}
                                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        <div
                                            className={`inline-block max-w-[80%] p-4 rounded-2xl shadow-sm ${message.role === 'user'
                                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                                }`}
                                            dir="auto"
                                        >
                                            <p
                                                className="text-sm leading-relaxed whitespace-pre-wrap"
                                                style={{
                                                    textAlign: /[\u0600-\u06FF]/.test(message.message) ? 'right' : 'left'
                                                }}
                                            >
                                                {message.message}
                                            </p>
                                        </div>

                                        {/* Timestamp */}
                                        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <Clock size={12} />
                                            <span>{formatDate(message.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SupportConversationDetail;
