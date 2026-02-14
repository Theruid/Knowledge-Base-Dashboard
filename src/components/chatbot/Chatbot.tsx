import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { chatbotApi, ChatMessage } from '../../services/chatbotApi';
import { chatbotFeedbackApi } from '../../services/chatbotFeedbackApi';
import { chatbotConversationApi } from '../../services/chatbotConversationApi';
import Layout from '../layout/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '../ui/Modal';

// Generate UUID for session IDs
const generateSessionId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const Chatbot: React.FC = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Session ID for grouping messages
    const [sessionId, setSessionId] = useState<string>(() => generateSessionId());

    // Feedback state
    const [feedbackModal, setFeedbackModal] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('');
    const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
    const [currentFeedback, setCurrentFeedback] = useState<{ message: string; response: string } | null>(null);
    const [feedbackGiven, setFeedbackGiven] = useState<Map<number, 'positive' | 'negative'>>(new Map());

    // Streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Cleanup streaming interval on unmount
    useEffect(() => {
        return () => {
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }
        };
    }, []);

    const streamResponse = (text: string) => {
        setIsStreaming(true);
        const words = text.split(' ');
        let currentIndex = 0;
        let accumulatedText = '';

        // Add empty bot message when streaming starts
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        const messageIndex = messages.length + 1; // +1 for user message already added

        streamingIntervalRef.current = setInterval(() => {
            if (currentIndex < words.length) {
                accumulatedText += (currentIndex > 0 ? ' ' : '') + words[currentIndex];

                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[messageIndex]) {
                        updated[messageIndex].content = accumulatedText;
                    }
                    return updated;
                });
                currentIndex++;
            } else {
                if (streamingIntervalRef.current) {
                    clearInterval(streamingIntervalRef.current);
                    streamingIntervalRef.current = null;
                }
                setIsStreaming(false);
            }
        }, 50); // 50ms per word for smooth streaming effect
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || isStreaming) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        const userInput = input; // Store before clearing
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Save user message to database
            await chatbotConversationApi.saveMessage({
                session_id: sessionId,
                role: 'user',
                message: userInput
            });

            const historyToSend = messages;
            const response = await chatbotApi.sendMessage(userMessage.content, historyToSend);

            // Extract bot content
            let botContent = '';
            if (typeof response === 'string') {
                botContent = response;
            } else if (response && response.answer) {
                botContent = response.answer;
            } else {
                botContent = response ? JSON.stringify(response) : 'No response content';
            }

            // Save assistant message to database
            await chatbotConversationApi.saveMessage({
                session_id: sessionId,
                role: 'assistant',
                message: botContent
            });

            // Stream the response (will add message when streaming starts)
            streamResponse(botContent);
        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        // Stop streaming if active
        if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
        }
        setIsStreaming(false);
        setMessages([]);
        setError(null);
        setFeedbackGiven(new Map());
        // Generate new session ID for new conversation
        setSessionId(generateSessionId());
    };

    const handleFeedback = async (messageIndex: number, feedbackType: 'positive' | 'negative') => {
        if (feedbackGiven.has(messageIndex)) return;

        const userMessage = messages[messageIndex - 1]; // user message is right before bot response
        const botMessage = messages[messageIndex];

        if (feedbackType === 'negative') {
            setCurrentFeedback({
                message: userMessage.content,
                response: botMessage.content
            });
            setFeedbackModal(true);
        } else {
            // Positive feedback - submit immediately
            try {
                await chatbotFeedbackApi.submitFeedback({
                    message: userMessage.content,
                    response: botMessage.content,
                    feedbackType: 'positive',
                    sessionId
                });
                setFeedbackGiven(prev => new Map(prev).set(messageIndex, 'positive'));
            } catch (error) {
                console.error('Error submitting feedback:', error);
            }
        }
    };

    const submitNegativeFeedback = async () => {
        if (!currentFeedback) return;

        try {
            await chatbotFeedbackApi.submitFeedback({
                message: currentFeedback.message,
                response: currentFeedback.response,
                feedbackType: 'negative',
                reason: feedbackReason,
                sessionId,
                tag: feedbackTags.join(', ')
            });

            // Find which message this was for and mark as rated
            const messageIndex = messages.findIndex(m =>
                m.role === 'assistant' && m.content === currentFeedback.response
            );
            if (messageIndex >= 0) {
                setFeedbackGiven(prev => new Map(prev).set(messageIndex, 'negative'));
            }

            setFeedbackModal(false);
            setFeedbackReason('');
            setFeedbackTags([]);
            setCurrentFeedback(null);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    };

    return (
        <Layout title="RAG Chatbot">
            <div className="flex flex-col h-full max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Bot className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-800">RAG Chatbot Assistant</h2>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Clear conversation"
                    >
                        <RefreshCw size={18} />
                        Clear
                    </button>
                </div>

                {/* Messages Area - Flex grow to fill available space */}
                <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-sm mb-4 min-h-0">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                            <Bot size={64} className="mb-4 opacity-50" />
                            <p className="text-lg">Start a conversation to get help from the Knowledge Base.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                            }`}
                                    >
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div
                                        className={`max-w-[75%] p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                            }`}
                                        dir="auto"
                                    >
                                        {msg.role === 'assistant' ? (
                                            <>
                                                <div
                                                    className="prose prose-sm max-w-none prose-headings:font-bold prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
                                                    dir="auto"
                                                    style={{
                                                        textAlign: /[\u0600-\u06FF]/.test(msg.content) ? 'right' : 'left'
                                                    }}
                                                >
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content.replace(/^<h3[^>]*>.*?<\/h3>\s*/, '')}
                                                    </ReactMarkdown>
                                                </div>
                                                {/* Feedback buttons */}
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                                    <button
                                                        onClick={() => handleFeedback(index, 'positive')}
                                                        disabled={feedbackGiven.has(index)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${feedbackGiven.get(index) === 'positive'
                                                            ? 'text-green-600 bg-green-50 cursor-not-allowed'
                                                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                                            }`}
                                                        title="Helpful"
                                                    >
                                                        <ThumbsUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(index, 'negative')}
                                                        disabled={feedbackGiven.has(index)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${feedbackGiven.get(index) === 'negative'
                                                            ? 'text-red-600 bg-red-50 cursor-not-allowed'
                                                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                            }`}
                                                        title="Not helpful"
                                                    >
                                                        <ThumbsDown size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-tl-none shadow-sm">
                                        <Loader2 size={20} className="animate-spin text-gray-400" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <span className="font-semibold">Error:</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Input form - Fixed at bottom */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </form>
            </div>

            {/* Feedback Modal */}
            <Modal
                isOpen={feedbackModal}
                onClose={() => {
                    setFeedbackModal(false);
                    setFeedbackReason('');
                    setFeedbackTags([]);
                    setCurrentFeedback(null);
                }}
                title="Why wasn't this helpful?"
            >
                <div className="p-4">
                    <p className="mb-4 text-sm text-gray-600">
                        لطفاً با انتخاب دلیل به ما کمک کنید:
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4" dir="rtl">
                        {['پاسخ اشتباه است', 'پاسخ ناقص است', 'در پایگاه دانش وجود ندارد', 'زیاده گویی'].map((tag) => {
                            const isSelected = feedbackTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        if (isSelected) {
                                            setFeedbackTags(feedbackTags.filter(t => t !== tag));
                                        } else {
                                            setFeedbackTags([...feedbackTags, tag]);
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${isSelected
                                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>

                    <p className="mb-2 text-sm text-gray-600" dir="rtl">
                        توضیحات بیشتر (اجباری):
                    </p>
                    <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                        value={feedbackReason}
                        onChange={(e) => setFeedbackReason(e.target.value)}
                        placeholder="لطفاً مشکل را توضیح دهید..."
                        dir="rtl"
                    />

                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => {
                                setFeedbackModal(false);
                                setFeedbackReason('');
                                setFeedbackTags([]);
                                setCurrentFeedback(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitNegativeFeedback}
                            disabled={feedbackTags.length === 0 || !feedbackReason.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Submit Feedback
                        </button>
                    </div>
                </div>
            </Modal>
        </Layout>
    );
};

export default Chatbot;
