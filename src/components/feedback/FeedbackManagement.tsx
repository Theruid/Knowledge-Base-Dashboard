import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Trash2, Filter, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';
import Layout from '../layout/Layout';
import { chatbotFeedbackApi } from '../../services/chatbotFeedbackApi';

interface Feedback {
    id: number;
    user_id: number;
    username: string;
    message: string;
    response: string;
    feedback_type: 'positive' | 'negative';
    reason?: string;
    source: 'chatbot' | 'conversation';
    conversation_id?: string;
    session_id?: string;
    message_index?: number;
    created_at: string;
    tag?: string;
}

const FeedbackManagement: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');

    // Expandable state
    const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

    // Delete modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [feedbackToDelete, setFeedbackToDelete] = useState<number | null>(null);

    // Fetch feedbacks
    const fetchFeedbacks = async () => {
        try {
            setLoading(true);
            setError(null);

            const filters: { feedbackType?: string; source?: string } = {};

            if (feedbackTypeFilter !== 'all') {
                filters.feedbackType = feedbackTypeFilter;
            }

            if (sourceFilter !== 'all') {
                filters.source = sourceFilter;
            }

            const response: any = await chatbotFeedbackApi.getAllFeedback(filters);

            if (response.success) {
                setFeedbacks(response.feedbacks);
            } else {
                setError('Failed to load feedbacks');
            }
        } catch (err) {
            console.error('Error fetching feedbacks:', err);
            setError('An error occurred while fetching feedbacks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, [feedbackTypeFilter, sourceFilter]);

    const handleDelete = async () => {
        if (!feedbackToDelete) return;

        try {
            await chatbotFeedbackApi.deleteFeedback(feedbackToDelete);
            setFeedbacks(feedbacks.filter(f => f.id !== feedbackToDelete));
            setDeleteModalOpen(false);
            setFeedbackToDelete(null);
        } catch (err) {
            console.error('Error deleting feedback:', err);
            setError('Failed to delete feedback');
        }
    };

    const openDeleteModal = (id: number) => {
        setFeedbackToDelete(id);
        setDeleteModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedFeedback(expandedFeedback === id ? null : id);
    };

    const truncateText = (text: string, isExpanded: boolean, maxLength: number = 100) => {
        if (isExpanded || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const getIdLabel = (feedback: Feedback) => {
        if (feedback.source === 'conversation' && feedback.conversation_id) {
            return feedback.conversation_id;
        } else if (feedback.source === 'chatbot' && feedback.session_id) {
            return feedback.session_id;
        }
        return null;
    };

    return (
        <Layout title="Feedback Management">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Feedback Management</h1>
                        <p className="text-sm text-gray-500 mt-1">View and manage all user feedbacks</p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Filter size={16} className="inline mr-1" />
                                    Feedback Type
                                </label>
                                <select
                                    value={feedbackTypeFilter}
                                    onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All</option>
                                    <option value="positive">Positive</option>
                                    <option value="negative">Negative</option>
                                </select>
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Filter size={16} className="inline mr-1" />
                                    Source
                                </label>
                                <select
                                    value={sourceFilter}
                                    onChange={(e) => setSourceFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All</option>
                                    <option value="chatbot">Chatbot</option>
                                    <option value="conversation">Conversation</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="flex justify-center items-center min-h-[200px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {/* Feedbacks list */}
                {!loading && feedbacks.length > 0 && (
                    <div className="space-y-4">
                        {feedbacks.map((feedback) => {
                            const isExpanded = expandedFeedback === feedback.id;
                            const idLabel = getIdLabel(feedback);
                            return (
                                <Card
                                    key={feedback.id}
                                    className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div
                                                className="flex-1"
                                                onClick={() => toggleExpand(feedback.id)}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    {/* Feedback type icon */}
                                                    {feedback.feedback_type === 'positive' ? (
                                                        <ThumbsUp size={20} className="text-green-600" />
                                                    ) : (
                                                        <ThumbsDown size={20} className="text-red-600" />
                                                    )}

                                                    {/* ID Badge (if available) */}
                                                    {idLabel && (
                                                        <span className="text-xs px-2 py-1 rounded bg-gray-300 text-gray-800 font-mono">
                                                            {idLabel}
                                                        </span>
                                                    )}

                                                    {/* Username and source */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-800">{feedback.username}</span>
                                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                                                            {feedback.source}
                                                        </span>
                                                    </div>

                                                    {/* Timestamp */}
                                                    <span className="text-xs text-gray-500">{formatDate(feedback.created_at)}</span>

                                                    {/* Expand/Collapse indicator */}
                                                    <div className="ml-auto">
                                                        {isExpanded ? (
                                                            <ChevronDown size={20} className="text-gray-500" />
                                                        ) : (
                                                            <ChevronRight size={20} className="text-gray-500" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Message and Response */}
                                                <div className="space-y-2">
                                                    <div className="bg-blue-50 p-3 rounded-lg" dir="rtl">
                                                        <p className="text-xs text-gray-500 mb-1">User Message:</p>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                            {truncateText(feedback.message, isExpanded)}
                                                        </p>
                                                    </div>

                                                    <div className="bg-green-50 p-3 rounded-lg" dir="rtl">
                                                        <p className="text-xs text-gray-500 mb-1">Bot Response:</p>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                            {truncateText(feedback.response, isExpanded)}
                                                        </p>
                                                    </div>

                                                    {/* Tags for negative feedback */}
                                                    {feedback.feedback_type === 'negative' && feedback.tag && (
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <span className="text-xs text-gray-500">Tags:</span>
                                                            {feedback.tag.split(', ').map((tag, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-3 py-1 text-sm rounded-full border border-red-300 bg-red-50 text-red-700">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Reason for negative feedback */}
                                                    {feedback.feedback_type === 'negative' && feedback.reason && (
                                                        <div className="bg-red-50 p-3 rounded-lg mt-2" dir="rtl">
                                                            <p className="text-xs text-gray-500 mb-1">Additional Details:</p>
                                                            <p className="text-sm text-gray-800">{feedback.reason}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDeleteModal(feedback.id);
                                                }}
                                                className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete feedback"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Empty state */}
                {!loading && feedbacks.length === 0 && (
                    <Card>
                        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <MessageSquare className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No feedbacks found</h3>
                            <p className="text-gray-500 mb-4">
                                There are no feedbacks matching your filters.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Delete confirmation modal */}
                <Modal
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setFeedbackToDelete(null);
                    }}
                    title="Delete Feedback"
                >
                    <div className="p-4">
                        <p className="mb-4 text-gray-700">
                            Are you sure you want to delete this feedback? This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setFeedbackToDelete(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
};

export default FeedbackManagement;
