import React from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import KnowledgeList from './KnowledgeList';
import Layout from '../layout/Layout';
import { Database, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';

const KnowledgeBase: React.FC = () => {
  const { totalEntries, uniqueKnowledgeCount, loading, fetchEntries, fetchUniqueKnowledgeCount } = useKnowledge();
  
  const stats = [
    {
      title: 'Total Entries',
      value: totalEntries,
      icon: <Database className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100'
    },
    {
      title: 'Unique Knowledges',
      value: uniqueKnowledgeCount,
      icon: <Search className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100'
    }
  ];
  
  const handleRefresh = () => {
    fetchEntries();
    fetchUniqueKnowledgeCount();
  };
  
  return (
    <Layout title="Knowledge Base">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className={`${stat.color} p-3 rounded-full mr-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Actions bar */}
      <div className="mb-6 flex justify-end">
        <Button
          variant="secondary"
          icon={<RefreshCw size={16} />}
          onClick={handleRefresh}
          isLoading={loading}
        >
          Refresh Data
        </Button>
      </div>
      
      {/* Knowledge list */}
      <KnowledgeList />
    </Layout>
  );
};

export default KnowledgeBase;
