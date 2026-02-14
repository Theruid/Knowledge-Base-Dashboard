import React, { useState, useEffect } from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { conversationApi } from '../../services/conversationApi';
import { chatbotStatsApi, FeedbackStats, UserStats } from '../../services/chatbotStatsApi';
import { chatbotConversationApi } from '../../services/chatbotConversationApi';
import Layout from '../layout/Layout';
import { Database, MessageCircle, ThumbsUp, ThumbsDown, Users, Bot } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

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
  const [supportConversations, setSupportConversations] = useState<number>(0);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({ totalPositive: 0, totalNegative: 0, total: 0 });
  const [userStats, setUserStats] = useState<UserStats[]>([]);





  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Start fetching data
      try {
        // Fetch total customer conversations
        const conversationsResponse = await conversationApi.getConversationList(1, 1);
        if (conversationsResponse.success && conversationsResponse.total) {
          setTotalConversations(conversationsResponse.total);
        }

        // Fetch total support conversations
        const supportResponse: any = await chatbotConversationApi.getAllSessions(1, 1);
        if (supportResponse.success && supportResponse.pagination) {
          setSupportConversations(supportResponse.pagination.totalSessions);
        }


        // Fetch chatbot feedback stats
        const feedbackResponse = await chatbotStatsApi.getFeedbackStats();
        if (feedbackResponse.success) {
          setFeedbackStats(feedbackResponse.stats);
        }

        // Fetch user message stats
        const userResponse = await chatbotStatsApi.getUserStats();
        if (userResponse.success) {
          setUserStats(userResponse.stats);
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
          title="Customer Conversations"
          value={totalConversations}
          icon={<MessageCircle className="h-6 w-6 text-purple-600" />}
          color="bg-purple-100"
          description="Conversations from Excel/CSV imports"
        />
        <StatCard
          title="Support Conversations"
          value={supportConversations}
          icon={<Bot className="h-6 w-6 text-emerald-600" />}
          color="bg-emerald-100"
          description="Chatbot support sessions"
        />
      </div>

      {/* Chatbot Statistics section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Chatbot Feedback</h2>

        {/* Feedback Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Positive Feedback"
            value={feedbackStats.totalPositive}
            icon={<ThumbsUp className="h-6 w-6 text-green-600" />}
            color="bg-green-100"
            description="Helpful responses"
          />
          <StatCard
            title="Negative Feedback"
            value={feedbackStats.totalNegative}
            icon={<ThumbsDown className="h-6 w-6 text-red-600" />}
            color="bg-red-100"
            description="Responses needing improvement"
          />
          <StatCard
            title="Total Feedback"
            value={feedbackStats.total}
            icon={<MessageCircle className="h-6 w-6 text-blue-600" />}
            color="bg-blue-100"
            description="All chatbot feedback"
          />
        </div>

        {/* Feedback Reasons (Tags) */}
        {feedbackStats.tagStats && Object.keys(feedbackStats.tagStats).length > 0 && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <ThumbsDown className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Feedback Reasons</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(feedbackStats.tagStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tag, count]) => {
                      // Calculate percentage based on total negative feedback
                      const percentage = feedbackStats.totalNegative > 0
                        ? (count / feedbackStats.totalNegative) * 100
                        : 0;

                      return (
                        <div key={tag} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">{tag}</span>
                            <span className="text-gray-500">{count} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Activity */}
        {userStats.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Users className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">User Activity</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Messages Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userStats.map((stat, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{stat.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{stat.messageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </Layout>
  );
};

export default Dashboard;
