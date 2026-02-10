import React, { useState } from 'react';
import { ConversationProvider } from '../../contexts/ConversationContext';
import ConversationList from './ConversationList';
import ConversationDetail from './ConversationDetail';
import SupportConversationList from './SupportConversationList';
import SupportConversationDetail from './SupportConversationDetail';
import Layout from '../layout/Layout';

const ConversationAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'support'>('customer');
  const [selectedSupportSessionId, setSelectedSupportSessionId] = useState<string | null>(null);

  return (
    <Layout title="Conversations">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('customer')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'customer'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          Customer Conversations
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'support'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          Support Conversations
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'customer' ? (
        <ConversationProvider>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ConversationList />
            </div>
            <div className="lg:col-span-2">
              <ConversationDetail />
            </div>
          </div>
        </ConversationProvider>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SupportConversationList
              selectedSessionId={selectedSupportSessionId}
              onSelectSession={setSelectedSupportSessionId}
            />
          </div>
          <div className="lg:col-span-2">
            <SupportConversationDetail sessionId={selectedSupportSessionId} />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ConversationAnalysis;

