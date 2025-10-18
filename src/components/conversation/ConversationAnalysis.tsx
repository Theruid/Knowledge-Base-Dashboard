import React from 'react';
import { ConversationProvider } from '../../contexts/ConversationContext';
import ConversationList from './ConversationList';
import ConversationDetail from './ConversationDetail';
import Layout from '../layout/Layout';

const ConversationAnalysis: React.FC = () => {
  return (
    <ConversationProvider>
      <Layout title="Conversation Analysis">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ConversationList />
          </div>
          <div className="lg:col-span-2">
            <ConversationDetail />
          </div>
        </div>
      </Layout>
    </ConversationProvider>
  );
};

export default ConversationAnalysis;
