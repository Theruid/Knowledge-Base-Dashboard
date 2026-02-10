import React from 'react';
import { useConversation } from '../../contexts/ConversationContext';
import { MessageCircle, RefreshCw, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

const ConversationList: React.FC = () => {
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    loading,
    error,
    fetchConversations,
    currentPage,
    totalPages,
    totalConversations,
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    onlyAnalyzed,
    setOnlyAnalyzed,
    handlePageChange
  } = useConversation();

  const handleRefresh = () => {
    fetchConversations(currentPage, searchTerm);
  };

  // No need for frontend filtering anymore - it's handled by the backend
  const filteredConversations = conversations;

  const handleSort = (field: 'Conversation_ID' | 'message_count') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Conversations</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${totalConversations} conversations found`}
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
          placeholder="Search by conversation ID or message content..."
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
      {!loading && filteredConversations.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations found</h3>
            <p className="text-gray-500 mb-4">
              There are no conversations to analyze.
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

      {/* Conversation list */}
      {!loading && filteredConversations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('Conversation_ID')}
                >
                  <div className="flex items-center">
                    <span>Conversation ID</span>
                    {sortField === 'Conversation_ID' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('message_count')}
                >
                  <div className="flex items-center">
                    <span>Messages</span>
                    {sortField === 'message_count' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConversations.map((conversation, index) => (
                <tr
                  key={conversation.Conversation_ID}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedConversationId === conversation.Conversation_ID ? 'bg-blue-50' : ''} hover:bg-blue-50 cursor-pointer`}
                  onClick={() => handleSelectConversation(conversation.Conversation_ID)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    {conversation.analyzed === 1 ? (
                      <span className="mr-2 text-green-500" title="This conversation has been analyzed with notes/tags">
                        <CheckCircle size={16} />
                      </span>
                    ) : null}
                    {conversation.Conversation_ID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {conversation.message_count}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectConversation(conversation.Conversation_ID);
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
              // Show first page, last page, current page, and pages around current page
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

export default ConversationList;
