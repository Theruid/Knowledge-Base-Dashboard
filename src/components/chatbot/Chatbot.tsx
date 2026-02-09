import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { chatbotApi, ChatMessage } from '../../services/chatbotApi';
import { chatbotFeedbackApi } from '../../services/chatbotFeedbackApi';
import Layout from '../layout/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '../ui/Modal';

const Chatbot: React.FC = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Feedback state
    const [feedbackModal, setFeedbackModal] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('');
    const [currentFeedback, setCurrentFeedback] = useState<{ message: string; response: string } | null>(null);
    const [feedbackGiven, setFeedbackGiven] = useState<Set<number>>(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Prepare history for the API (excluding the current new message as it's passed separately if needed, 
            // but based on typical RAG flows we usually send history + current query. 
            // The API implementation in proxy expects 'text' and 'history'.
            // Let's send the *previous* messages as history.
            const historyToEvent = messages;

            const response = await chatbotApi.sendMessage(userMessage.content, historyToEvent);

            // The API typically returns the answer. We'll append it.
            // If the API returns the FULL updated history, we might overwrite, 
            // but usually we just want to append the assistant's response.
            // Let's assume response.answer contains the text.

            // Check if response has 'answer' or if it's the raw text
            let botContent = '';
            if (typeof response === 'string') {
                botContent = response;
            } else if (response && response.answer) {
                botContent = response.answer;
            } else {
                // Fallback if structure is different
                botContent = response ? JSON.stringify(response) : 'No response content';
            }
            // If response looks like { response: "..." } or similar, adjust here.
            // Based on main.py dumping json, it likely returns a JSON object.

            const botMessage: ChatMessage = { role: 'assistant', content: botContent };
            setMessages(prev => [...prev, botMessage]);
        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        setError(null);
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
                    feedbackType: 'positive'
                });
                setFeedbackGiven(prev => new Set(prev).add(messageIndex));
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
                reason: feedbackReason
            });

            // Find which message this was for and mark as rated
            const messageIndex = messages.findIndex(m =>
                m.role === 'assistant' && m.content === currentFeedback.response
            );
            if (messageIndex >= 0) {
                setFeedbackGiven(prev => new Set(prev).add(messageIndex));
            }

            setFeedbackModal(false);
            setFeedbackReason('');
            setCurrentFeedback(null);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    };

    return (
        <Layout title="RAG Chatbot">
            <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto p-4">
                <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2">
                        <Bot className="text-blue-600" size={24} />
                        <h1 className="text-xl font-bold text-gray-800">RAG Chatbot Assistant</h1>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
                        title="Clear conversation"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4 shadow-inner">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Bot size={48} className="mb-2 opacity-50" />
                            <p>Start a conversation to get help from the Knowledge Base.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
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
                                        style={{
                                            textAlign: /[\u0600-\u06FF]/.test(msg.content.charAt(0)) ? 'right' : 'left'
                                        }}
                                    >
                                        {msg.role === 'assistant' ? (
                                            <>
                                                <div className="prose prose-sm max-w-none prose-headings:font-bold prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content.replace(/^<h3[^>]*>.*?<\/h3>\s*/, '')}
                                                    </ReactMarkdown>
                                                </div>
                                                {/* Feedback buttons */}
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                                    <button
                                                        onClick={() => handleFeedback(index, 'positive')}
                                                        disabled={feedbackGiven.has(index)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${feedbackGiven.has(index)
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
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${feedbackGiven.has(index)
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
                            {error && (
                                <div className="flex justify-center my-2">
                                    <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-full border border-red-200">
                                        {error}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
                    setCurrentFeedback(null);
                }}
                title="Why wasn't this helpful?"
            >
                <div className="p-4">
                    <p className="mb-4 text-sm text-gray-600">
                        Please help us improve by telling us what went wrong:
                    </p>

                    <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={4}
                        value={feedbackReason}
                        onChange={(e) => setFeedbackReason(e.target.value)}
                        placeholder="Tell us what went wrong..."
                    />

                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => {
                                setFeedbackModal(false);
                                setFeedbackReason('');
                                setCurrentFeedback(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitNegativeFeedback}
                            disabled={!feedbackReason.trim()}
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
