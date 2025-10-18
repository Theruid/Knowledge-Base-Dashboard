import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Layout from '../layout/Layout';
import { ragApi } from '../../services/ragApi';

interface RagResponse {
  context: string;
  top_10_context: Array<{
    kn: string;
    problem: string;
  }>;
  domain: string;
  query_is_abstract: boolean;
  obvious_answer: string;
}

const RagRetrieve: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RagResponse | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await ragApi.retrieveFromRag(query);
      setResult(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve data from RAG';
      setError(errorMessage);
      console.error('Error retrieving from RAG:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format context for better readability
  const formatContext = (context: string) => {
    // Split by context sections
    const sections = context.split(/###\s+\d+\.\s+context_\d+:\s+/);
    // Remove empty sections
    return sections.filter(section => section.trim().length > 0);
  };

  return (
    <Layout title="Retrieve From RAG">
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">RAG Query</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter your query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Domain and Query Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Query Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Domain</p>
                  <p className="text-lg font-semibold">{result.domain || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Query Type</p>
                  <p className="text-lg font-semibold">{result.query_is_abstract ? 'Abstract' : 'Specific'}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Obvious Answer</p>
                  <p className="text-lg font-semibold">{result.obvious_answer !== '----' ? result.obvious_answer : 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top 10 Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Top Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Knowledge #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Problem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.top_10_context.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.kn}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500" dir="auto">
                          {item.problem}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Detailed Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formatContext(result.context).map((section, index) => {
                  // Extract problem, domain, and solution from each section
                  const problemMatch = section.match(/problem:(.*?)(?=domain:|$)/s);
                  const domainMatch = section.match(/domain:(.*?)(?=detailed_solution:|$)/s);
                  const solutionMatch = section.match(/detailed_solution:(.*?)(?=$)/s);

                  return (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      {problemMatch && (
                        <div className="mb-2">
                          <span className="font-bold">Problem:</span>
                          <p dir="auto" className="text-gray-700">{problemMatch[1].trim()}</p>
                        </div>
                      )}
                      {domainMatch && (
                        <div className="mb-2">
                          <span className="font-bold">Domain:</span>
                          <p dir="auto" className="text-gray-700">{domainMatch[1].trim()}</p>
                        </div>
                      )}
                      {solutionMatch && (
                        <div>
                          <span className="font-bold">Solution:</span>
                          <p dir="auto" className="text-gray-700 whitespace-pre-line">{solutionMatch[1].trim()}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default RagRetrieve;
