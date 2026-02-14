import React, { useState } from 'react';
import { useConversation } from '../../contexts/ConversationContext';
import { MessageCircle, BarChart, X, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { chatbotFeedbackApi } from '../../services/chatbotFeedbackApi';
import Modal from '../ui/Modal';

const ConversationDetail: React.FC = () => {
  const {
    selectedConversationId,
    conversationMessages,
    conversationStats,
    loading,
    error,
    setSelectedConversationId
  } = useConversation();

  // Feedback state
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<{ message: string; response: string; messageIndex: number } | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Map<number, 'positive' | 'negative'>>(new Map());

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  const handleFeedback = async (messageIndex: number, feedbackType: 'positive' | 'negative') => {
    if (feedbackGiven.has(messageIndex) || !selectedConversationId) return;

    // Find user message (previous message) and bot response
    const botMessage = conversationMessages[messageIndex];
    const userMessage = conversationMessages[messageIndex - 1];

    if (!botMessage || !userMessage) return;

    if (feedbackType === 'negative') {
      setCurrentFeedback({
        message: userMessage.message,
        response: botMessage.message,
        messageIndex
      });
      setFeedbackModal(true);
    } else {
      // Positive feedback - submit immediately
      try {
        await chatbotFeedbackApi.submitFeedback({
          message: userMessage.message,
          response: botMessage.message,
          feedbackType: 'positive',
          source: 'conversation',
          conversationId: selectedConversationId.toString(),
          messageIndex
        });
        setFeedbackGiven(prev => new Map(prev).set(messageIndex, 'positive'));
      } catch (error) {
        console.error('Error submitting feedback:', error);
      }
    }
  };

  const submitNegativeFeedback = async () => {
    if (!currentFeedback || !selectedConversationId) return;

    try {
      await chatbotFeedbackApi.submitFeedback({
        message: currentFeedback.message,
        response: currentFeedback.response,
        feedbackType: 'negative',
        reason: feedbackReason,
        source: 'conversation',
        conversationId: selectedConversationId.toString(),
        messageIndex: currentFeedback.messageIndex,
        tag: feedbackTags.join(', ')
      });

      setFeedbackGiven(prev => new Map(prev).set(currentFeedback.messageIndex, 'negative'));
      setFeedbackModal(false);
      setFeedbackReason('');
      setFeedbackTags([]);
      setCurrentFeedback(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (!selectedConversationId) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <MessageCircle className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No conversation selected</h3>
          <p className="text-gray-500 mb-4">
            Please select a conversation from the list to view its details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Conversation #{selectedConversationId}
          </h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${conversationMessages.length} messages`}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => setSelectedConversationId(null)}
        >
          Back to List
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
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

      {/* Stats cards */}
      {!loading && conversationStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Messages</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationStats.totalMessages}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-amber-100 p-3 rounded-full mr-4">
                <BarChart className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lock Number</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationMessages[0]?.LockNumber || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">اتمام چت بات</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationMessages.some(msg => msg.Metric1 === 'اتمام چت بات') ? 'بله' : 'خیر'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-red-100 p-3 rounded-full mr-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">عدم اتمام چت</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationMessages.some(msg => msg.Metric2 === 'عدم اتمام چت') ? 'بله' : 'خیر'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversation messages with feedback buttons */}
      {!loading && conversationMessages.length > 0 && (
        <div className="space-y-4" dir="rtl">
          {conversationMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.IS_BOT ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-2 ${message.IS_BOT
                  ? 'bg-green-100 text-gray-800 border border-green-200'
                  : 'bg-blue-500 text-white'
                  }`}
                dir="rtl"
              >
                <div className="flex items-center mb-1" dir="ltr">
                  <span className="text-xs opacity-75">
                    {message.IS_BOT ? 'Bot' : 'User'} • {formatTimestamp(message.Time)}
                  </span>
                </div>
                <p className="text-right">{message.message}</p>

                {/* Feedback buttons for bot messages only */}
                {message.IS_BOT && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-green-200" dir="ltr">
                    <button
                      onClick={() => handleFeedback(index, 'positive')}
                      disabled={feedbackGiven.has(index)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${feedbackGiven.get(index) === 'positive'
                        ? 'text-green-700 bg-green-200 cursor-not-allowed'
                        : 'text-gray-600 hover:text-green-700 hover:bg-green-200'
                        }`}
                      title="Helpful"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      onClick={() => handleFeedback(index, 'negative')}
                      disabled={feedbackGiven.has(index)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${feedbackGiven.get(index) === 'negative'
                        ? 'text-red-700 bg-red-100 cursor-not-allowed'
                        : 'text-gray-600 hover:text-red-700 hover:bg-red-100'
                        }`}
                      title="Not helpful"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && conversationMessages.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No messages found</h3>
            <p className="text-gray-500 mb-4">
              This conversation doesn't have any messages.
            </p>
          </CardContent>
        </Card>
      )}

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
    </div >
  );
};

export default ConversationDetail;