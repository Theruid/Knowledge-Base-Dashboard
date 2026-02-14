import React, { useState, useRef, useEffect } from 'react';
import Layout from '../layout/Layout';
import UserManagement from './UserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Upload, Database, AlertCircle, Server } from 'lucide-react';
import { exportApi } from '../../services/exportApi';
import { settingsApi } from '../../services/settingsApi';

const AdminPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<{
    knowledge: boolean;
    conversations: boolean;
    import: boolean;
    notes: boolean;
    environment: boolean;
  }>({
    knowledge: false,
    conversations: false,
    import: false,
    notes: false,
    environment: false
  });



  // Separate state for export and import operations
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Chatbot environment state
  const [chatbotEnvironment, setChatbotEnvironment] = useState<'dev' | 'prod'>('dev');
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [environmentSuccess, setEnvironmentSuccess] = useState<string | null>(null);

  // Load current environment on mount
  useEffect(() => {
    const loadEnvironment = async () => {
      try {
        const response = await settingsApi.getChatbotEnvironment();
        if (response.success && response.environment) {
          setChatbotEnvironment(response.environment);
        }
      } catch (error) {
        console.error('Error loading chatbot environment:', error);
      }
    };
    loadEnvironment();
  }, []);

  const handleExportKnowledge = async () => {
    try {
      setLoading({ ...loading, knowledge: true });
      setExportError(null);
      setExportSuccess(null);
      setImportError(null);
      setImportSuccess(null);

      const blob = await exportApi.exportKnowledge();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'knowledge_export.csv';
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess('Knowledge base exported successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export knowledge base';
      setExportError(errorMessage);
      console.error('Error exporting knowledge:', err);
    } finally {
      setLoading({ ...loading, knowledge: false });
    }
  };



  const handleExportNotes = async () => {
    try {
      setLoading({ ...loading, notes: true });
      setExportError(null);
      setExportSuccess(null);
      setImportError(null);
      setImportSuccess(null);

      const blob = await exportApi.exportNotes();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notes_export.csv';
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess('Conversations notes exported successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export conversation notes';
      setExportError(errorMessage);
      console.error('Error exporting notes:', err);
    } finally {
      setLoading({ ...loading, notes: false });
    }
  };


  const handleImportConversations = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      setLoading({ ...loading, import: true });
      setExportError(null);
      setExportSuccess(null);
      setImportError(null);
      setImportSuccess(null);

      const response = await exportApi.importConversations(file);

      if (response.success) {
        setImportSuccess(response.message);
      } else {
        setImportError(response.message || 'Failed to import conversations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import conversations';
      setImportError(errorMessage);
      console.error('Error importing conversations:', err);
    } finally {
      setLoading({ ...loading, import: false });
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Layout title="Admin Panel">
      <div className="space-y-6">
        <UserManagement />

        {/* Export Error message */}
        {exportError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{exportError}</span>
            </div>
          </div>
        )}

        {/* Export Success message */}
        {exportSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span>{exportSuccess}</span>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Export Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Button
                  variant="primary"
                  icon={<Database size={16} />}
                  onClick={handleExportKnowledge}
                  isLoading={loading.knowledge}
                >
                  Export Knowledge Entries
                </Button>
                <p className="mt-2 text-sm text-gray-500">
                  Export all knowledge entries as a CSV file.
                </p>
              </div>


            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Import Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-4">
                  <Button
                    variant="secondary"
                    icon={<Upload size={16} />}
                    onClick={triggerFileInput}
                    isLoading={loading.import}
                  >
                    Import Conversations
                  </Button>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Import conversations from a CSV file. The file should have the following columns: Conversation_ID, IS_BOT, message, Time, LockNumber, Metric1, Metric2.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".csv"
                  onChange={handleImportConversations}
                />
              </div>

              {importError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{importSuccess}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chatbot Environment Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Chatbot Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Switch between Development and Production chatbot API endpoints.
              </p>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="environment"
                    value="dev"
                    checked={chatbotEnvironment === 'dev'}
                    onChange={async () => {
                      try {
                        setLoading({ ...loading, environment: true });
                        setEnvironmentError(null);
                        setEnvironmentSuccess(null);

                        const response = await settingsApi.updateChatbotEnvironment('dev');

                        if (response.success) {
                          setChatbotEnvironment('dev');
                          setEnvironmentSuccess('Chatbot environment switched to Development');
                        } else {
                          setEnvironmentError(response.message || 'Failed to update environment');
                        }
                      } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : 'Failed to update environment';
                        setEnvironmentError(errorMessage);
                      } finally {
                        setLoading({ ...loading, environment: false });
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                    disabled={loading.environment}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Dev</div>
                    <div className="text-sm text-gray-500">
                      https://sg-nlp-dev.ml.abramad.com/masoud-ragaas/rag_chatbot
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="environment"
                    value="prod"
                    checked={chatbotEnvironment === 'prod'}
                    onChange={async () => {
                      try {
                        setLoading({ ...loading, environment: true });
                        setEnvironmentError(null);
                        setEnvironmentSuccess(null);

                        const response = await settingsApi.updateChatbotEnvironment('prod');

                        if (response.success) {
                          setChatbotEnvironment('prod');
                          setEnvironmentSuccess('Chatbot environment switched to Production');
                        } else {
                          setEnvironmentError(response.message || 'Failed to update environment');
                        }
                      } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : 'Failed to update environment';
                        setEnvironmentError(errorMessage);
                      } finally {
                        setLoading({ ...loading, environment: false });
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                    disabled={loading.environment}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Prod</div>
                    <div className="text-sm text-gray-500">
                      https://sg-nlp.ml.abramad.com/rag_chatbot
                    </div>
                  </div>
                </label>
              </div>

              {environmentError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{environmentError}</span>
                  </div>
                </div>
              )}

              {environmentSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4" role="alert">
                  <div className="flex items-center">
                    <Server className="h-5 w-5 mr-2" />
                    <span>{environmentSuccess}</span>
                  </div>
                </div>
              )}

              {loading.environment && (
                <div className="text-sm text-gray-500 mt-2">
                  Updating environment...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </Layout>
  );
};

export default AdminPanel;
