import React, { useState, useEffect } from 'react';
import { tagsApi, TagStats } from '../../services/tagsApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Tag } from 'lucide-react';

const TagStatsComponent: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [totalWithNotes, setTotalWithNotes] = useState<number>(0);

  useEffect(() => {
    const fetchTagStats = async () => {
      setLoading(true);
      try {
        const response = await tagsApi.getTagStats();
        setTagStats(response.tags);
        setTotalWithNotes(response.totalWithNotes);
      } catch (error) {
        console.error('Error fetching tag statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTagStats();
  }, []);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Tag className="h-5 w-5 mr-2" />
          Tag Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : tagStats.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tags found</p>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-500 mb-2">
              Based on {totalWithNotes} conversations with notes
            </div>
            {tagStats.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  ></span>
                  <span className="font-medium">{tag.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-700 mr-3">{tag.count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${tag.percentage}%`,
                        backgroundColor: tag.color || '#3b82f6',
                      }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-gray-500">{tag.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TagStatsComponent;
