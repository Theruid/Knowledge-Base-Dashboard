import React, { useState, useEffect } from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { conversationApi } from '../../services/conversationApi';
import Layout from '../layout/Layout';
import { Database, MessageCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import TagStatsComponent from './TagStats';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, description }) => (
  <Card className="h-full shadow-sm hover:shadow-md transition-shadow duration-300">
    <CardContent className="p-6">
      <div className="flex items-center mb-4">
        <div className={`${color} p-3 rounded-full mr-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value.toLocaleString()}</p>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { totalEntries } = useKnowledge();
  const [totalConversations, setTotalConversations] = useState<number>(0);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);


  

  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Start fetching data
      try {
        // Fetch total conversations
        const conversationsResponse = await conversationApi.getConversationList(1, 1);
        if (conversationsResponse.success && conversationsResponse.total) {
          setTotalConversations(conversationsResponse.total);
        }
        
        // Fetch analyzed conversations count
        const analyzedResponse = await conversationApi.getAnalyzedCount();
        if (analyzedResponse.success && analyzedResponse.data !== undefined) {
          setAnalyzedCount(analyzedResponse.data);
        }
        

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <Layout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Knowledge Analytics Dashboard</h1>
        <p className="text-gray-600">Overview of your knowledge base and conversations</p>
      </div>
      
      {/* Main stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Knowledge Entries"
          value={totalEntries}
          icon={<Database className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
          description="Total entries in your knowledge base"
        />
        <StatCard
          title="Total Conversations"
          value={totalConversations}
          icon={<MessageCircle className="h-6 w-6 text-purple-600" />}
          color="bg-purple-100"
          description="Overall number of conversations tracked"
        />
        <StatCard
          title="Analyzed Conversations"
          value={analyzedCount}
          icon={<FileText className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
          description="Conversations with analysis notes"
        />
      </div>
      
      {/* Tag statistics section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tag Distribution</h2>
        <TagStatsComponent />
      </div>

    </Layout>
  );
};

export default Dashboard;
