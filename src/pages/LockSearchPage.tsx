import React, { useState } from 'react';
import { conversationApi, ConversationMessage } from '../services/conversationApi';
import { Search, AlertCircle, ChevronDown, ChevronUp, User, Bot, MessageCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';

const LockSearchPage: React.FC = () => {
  const [lockNumber, setLockNumber] = useState<string>('');
  const [conversations, setConversations] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedConversation, setExpandedConversation] = useState<number | null>(null);
  const [conversationMessages, setConversationMessages] = useState<{[key: number]: ConversationMessage[]}>({});
  const [loadingMessages, setLoadingMessages] = useState<{[key: number]: boolean}>({});
  const [firstMessages, setFirstMessages] = useState<{[key: number]: string}>({});

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  const handleToggleConversation = async (conversationId: number) => {
    if (expandedConversation === conversationId) {
      setExpandedConversation(null);
      return;
    }
    
    setExpandedConversation(conversationId);
    
    // Only fetch messages if we haven't already
    if (!conversationMessages[conversationId]) {
      setLoadingMessages(prev => ({ ...prev, [conversationId]: true }));
      
      try {
        const response = await conversationApi.getConversation(conversationId);
        
        if (response.success && response.data) {
            setConversationMessages(prev => {
              const newState = { ...prev };
              newState[conversationId] = response.data || [];
              return newState;
            });
        } else {
          console.error('Failed to fetch conversation messages');
        }
      } catch (err) {
        console.error('Error fetching conversation messages:', err);
      } finally {
        setLoadingMessages(prev => ({ ...prev, [conversationId]: false }));
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!lockNumber.trim()) {
      setError('Please enter a LOCK number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await conversationApi.getConversationsByLock(parseInt(lockNumber));
      
      if (response.success) {
        const conversationIds = response.data || [];
        setConversations(conversationIds);
        setSearched(true);
        
        // Fetch first message for each conversation
        conversationIds.forEach(async (id) => {
          try {
            setLoadingMessages(prev => ({ ...prev, [id]: true }));
            const msgResponse = await conversationApi.getConversation(id);
            
            if (msgResponse.success && msgResponse.data) {
              // Find first user message
              const firstUserMsg = msgResponse.data.find(msg => !msg.IS_BOT);
              if (firstUserMsg) {
                setFirstMessages(prev => ({ ...prev, [id]: firstUserMsg.message }));
              }
              
              // Store all messages for later use
              setConversationMessages(prev => {
                const newState = { ...prev };
                newState[id] = msgResponse.data || [];
                return newState;
              });
            }
          } catch (err) {
            console.error(`Error fetching first message for conversation ${id}:`, err);
          } finally {
            setLoadingMessages(prev => ({ ...prev, [id]: false }));
          }
        });
      } else {
        setError('Failed to fetch conversations');
      }
    } catch (err) {
      setError('An error occurred while fetching conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="LOCK Number Search">
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Search Conversations by LOCK Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={lockNumber}
                  onChange={(e) => setLockNumber(e.target.value)}
                  placeholder="Enter LOCK Number..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                />
              </div>
              <Button
                variant="primary"
                icon={<Search size={16} />}
                onClick={handleSearch}
                isLoading={loading}
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

        {searched && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length > 0 ? (
                <div>
                  <p className="mb-4 text-gray-600">Found {conversations.length} conversation(s) with LOCK Number {lockNumber}:</p>
                  <div className="flex flex-col space-y-4">
                    {conversations.map((id) => (
                      <div key={id} className="border border-gray-200 rounded-md overflow-hidden">
                        <div 
                          className={`p-4 bg-white cursor-pointer ${expandedConversation === id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} transition-colors duration-200`}
                          onClick={() => handleToggleConversation(id)}
                        >
                          <div className="flex justify-between items-center" dir="rtl">
                            <div className="flex items-center">
                              {firstMessages[id] ? (
                                <span className="text-sm text-gray-500 truncate max-w-[300px] ml-2 text-right">
                                  {firstMessages[id]}
                                </span>
                              ) : loadingMessages[id] ? (
                                <span className="text-sm text-gray-400 ml-2">Loading...</span>
                              ) : null}
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium" dir="ltr">Conversation #{id}</span>
                              <div className="flex items-center ml-2">
                                {loadingMessages[id] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                                ) : null}
                                {expandedConversation === id ? (
                                  <ChevronUp size={18} className="text-blue-600" />
                                ) : (
                                  <ChevronDown size={18} className="text-blue-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Accordion content */}
                        {expandedConversation === id && (
                          <div className="border-t border-gray-200 p-4 bg-gray-50">
                            {loadingMessages[id] ? (
                              <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                              </div>
                            ) : conversationMessages[id]?.length > 0 ? (
                              <div className="space-y-3 max-h-96 overflow-y-auto p-2" dir="rtl">
                                {conversationMessages[id].map((message, index) => (
                                  <div 
                                    key={index}
                                    className={`flex ${message.IS_BOT ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div 
                                      className={`max-w-full rounded-lg px-3 py-2 ${
                                        message.IS_BOT 
                                          ? 'bg-green-100 text-gray-800 border border-green-200' 
                                          : 'bg-blue-500 text-white'
                                      }`}
                                      dir="rtl"
                                    >
                                      <div className="flex items-center mb-1" dir="ltr">
                                        <span className="text-xs opacity-75 flex items-center">
                                          {message.IS_BOT ? (
                                            <><Bot size={12} className="mr-1" /> Bot</>
                                          ) : (
                                            <><User size={12} className="mr-1" /> User</>
                                          )}
                                          <span className="mx-1">•</span>
                                          {formatTimestamp(message.Time)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-right">{message.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500">No messages found in this conversation</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No conversations found with LOCK Number {lockNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </Layout>
  );
};

export default LockSearchPage;
