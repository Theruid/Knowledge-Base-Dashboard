import React, { useState, useRef } from 'react';
import Layout from '../layout/Layout';
import UserManagement from './UserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Upload, Database, MessageCircle, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { exportApi } from '../../services/exportApi';
import { dataApi } from '../../services/dataApi';
import Modal from '../ui/Modal';

const AdminPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<{
    knowledge: boolean;
    conversations: boolean;
    import: boolean;
    notes: boolean;
    clearConversations: boolean;
  }>({
    knowledge: false,
    conversations: false,
    import: false,
    notes: false,
    clearConversations: false
  });

  // State for clear conversations modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  // Separate state for export and import operations
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

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

  const handleExportConversations = async () => {
    try {
      setLoading({ ...loading, conversations: true });
      setExportError(null);
      setExportSuccess(null);
      setImportError(null);
      setImportSuccess(null);

      const blob = await exportApi.exportConversations();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversations_export.csv';
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess('Conversations exported successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export conversations';
      setExportError(errorMessage);
      console.error('Error exporting conversations:', err);
    } finally {
      setLoading({ ...loading, conversations: false });
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

  const handleClearConversations = async () => {
    try {
      setLoading({ ...loading, clearConversations: true });
      setImportError(null);
      setImportSuccess(null);

      if (confirmationText !== 'Delete') {
        setImportError('You must type "Delete" to confirm clearing the conversation table');
        return;
      }

      const response = await dataApi.clearConversations(confirmationText);

      if (response.success) {
        setImportSuccess(`Successfully cleared ${response.deletedCount || 0} conversations from the database`);
        setShowClearModal(false);
        setConfirmationText('');
      } else {
        setImportError(response.message || 'Failed to clear conversations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear conversations';
      setImportError(errorMessage);
      console.error('Error clearing conversations:', err);
    } finally {
      setLoading({ ...loading, clearConversations: false });
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

              <div>
                <Button
                  variant="primary"
                  icon={<MessageCircle size={16} />}
                  onClick={handleExportConversations}
                  isLoading={loading.conversations}
                >
                  Export Conversations
                </Button>
                <p className="mt-2 text-sm text-gray-500">
                  Export all conversations as a CSV file.
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
                <div className="flex space-x-4 mb-4">
                  <Button
                    variant="secondary"
                    icon={<Upload size={16} />}
                    onClick={triggerFileInput}
                    isLoading={loading.import}
                  >
                    Import Conversations
                  </Button>

                  <Button
                    variant="danger"
                    icon={<Trash2 size={16} />}
                    onClick={() => setShowClearModal(true)}
                    isLoading={loading.clearConversations}
                  >
                    Clear Conversation Table
                  </Button>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Import conversations from a CSV file. The file should have the following columns: Conversation_ID, IS_BOT, message, Time, LockNumber, Metric1, Metric2.
                  <br />
                  <strong>Note:</strong> Importing data will now append to existing data rather than replacing it. Use the Clear button if you want to remove all existing data.
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
      </div>

      {/* Clear Conversations Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => {
          setShowClearModal(false);
          setConfirmationText('');
        }}
        title="Clear Conversation Table"
      >
        <div className="p-4">
          <div className="mb-4 text-red-600 font-semibold">
            Warning: This action will permanently delete all conversations from the database.
          </div>

          <p className="mb-4">
            To confirm, please type "Delete" in the field below:
          </p>

          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded mb-4"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Type 'Delete' to confirm"
          />

          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowClearModal(false);
                setConfirmationText('');
              }}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={handleClearConversations}
              isLoading={loading.clearConversations}
              disabled={confirmationText !== 'Delete'}
            >
              Clear All Conversations
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminPanel;
