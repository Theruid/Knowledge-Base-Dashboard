import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { chatbotConversationApi, ConversationSession } from '../../services/chatbotConversationApi';

interface SupportConversationListProps {
    selectedSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
}

const SupportConversationList: React.FC<SupportConversationListProps> = ({
    selectedSessionId,
    onSelectSession
}) => {
    const [sessions, setSessions] = useState<ConversationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSessions, setTotalSessions] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const limit = 10;

    const fetchSessions = async (page: number = 1, search: string = '') => {
        try {
            setLoading(true);
            setError(null);

            const response: any = await chatbotConversationApi.getAllSessions(page, limit, search);

            if (response.success) {
                setSessions(response.sessions);
                setTotalPages(response.pagination.totalPages);
                setTotalSessions(response.pagination.totalSessions);
                setCurrentPage(response.pagination.currentPage);
            } else {
                setError('Failed to load sessions');
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError('An error occurred while fetching sessions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions(currentPage, searchTerm);
    }, [currentPage, searchTerm]);

    const handleRefresh = () => {
        fetchSessions(currentPage, searchTerm);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="space-y-6">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Support Conversations</h2>
                    <p className="text-sm text-gray-500">
                        {loading ? 'Loading...' : `${totalSessions} chat sessions found`}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        icon={<RefreshCw size={16} />}
                        onClick={handleRefresh}
                        isLoading={loading}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by session ID, username, or message content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
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

            {/* Empty state */}
            {!loading && sessions.length === 0 && (
                <Card>
                    <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <MessageCircle className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No chatbot sessions found</h3>
                        <p className="text-gray-500 mb-4">
                            There are no chatbot conversations yet.
                        </p>
                        <Button
                            variant="primary"
                            icon={<RefreshCw size={16} />}
                            onClick={handleRefresh}
                        >
                            Refresh Data
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Session list */}
            {!loading && sessions.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Messages
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sessions.map((session, index) => (
                                <tr
                                    key={session.session_id}
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedSessionId === session.session_id ? 'bg-blue-50' : ''} hover:bg-blue-50 cursor-pointer`}
                                    onClick={() => onSelectSession(session.session_id)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <User size={16} className="mr-2 text-gray-400" />
                                            {session.username}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {session.message_count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectSession(session.session_id);
                                            }}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        icon={<ChevronLeft size={16} />}
                    >
                        Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                                return (
                                    <Button
                                        key={page}
                                        variant={page === currentPage ? 'primary' : 'secondary'}
                                        size="sm"
                                        onClick={() => handlePageChange(page)}
                                        className={`min-w-[32px] px-2`}
                                    >
                                        {page}
                                    </Button>
                                );
                            } else if (
                                page === currentPage - 2 ||
                                page === currentPage + 2
                            ) {
                                return <span key={page}>...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        icon={<ChevronRight size={16} />}
                        iconPosition="right"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SupportConversationList;
