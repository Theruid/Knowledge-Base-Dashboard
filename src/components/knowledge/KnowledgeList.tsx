import React, { useState, useEffect } from 'react';
import { Edit, Trash2, PlusCircle, ChevronLeft, ChevronRight, Database, Search } from 'lucide-react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { KnowledgeEntry } from '../../types';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import KnowledgeForm from './KnowledgeForm';
import Modal from '../ui/Modal';

const KnowledgeList: React.FC = () => {
  const {
    entries,
    loading,
    error,
    totalEntries,
    currentPage,
    totalPages,
    fetchEntries,
    deleteEntry,
    searchTerm,
    setSearchTerm,
    domainFilter,
    setDomainFilter,
    availableDomains,
    fetchAvailableDomains
  } = useKnowledge();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<KnowledgeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchEntries(page, searchTerm, domainFilter);
    }
  };

  // Handle domain filter change
  const handleDomainChange = (domain: string) => {
    setDomainFilter(domain);
  };
  
  // Fetch available domains on component mount
  useEffect(() => {
    fetchAvailableDomains();
  }, []);

  // Open edit modal
  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditingEntry(null);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (entry: KnowledgeEntry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const success = await deleteEntry(entryToDelete.UniqueID);
      
      if (success) {
        setIsDeleteModalOpen(false);
        setEntryToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Truncate text for display
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Knowledge Base Entries</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${totalEntries} entries found`}
          </p>
        </div>
        
        <Button
          variant="primary"
          icon={<PlusCircle size={16} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Entry
        </Button>
      </div>
      
      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search knowledge entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Domain filter */}
        <div>
          <label htmlFor="domain-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Domain
          </label>
          <div className="flex space-x-2">
            <select
              id="domain-filter"
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={domainFilter}
              onChange={(e) => handleDomainChange(e.target.value)}
            >
              <option value="">All Domains</option>
              {availableDomains.map((domain, index) => (
                <option key={index} value={domain}>{domain}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchAvailableDomains()}
              title="Refresh domains list"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Database className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No entries found</h3>
            <p className="text-gray-500 mb-4">
              There are no knowledge base entries to display. Start by adding a new entry.
            </p>
            <Button
              variant="primary"
              icon={<PlusCircle size={16} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add New Entry
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Knowledge entries as a table/list */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Problem
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solution
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <tr key={entry.UniqueID} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entry.UniqueID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.knowledge_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.domain || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                    <div className="whitespace-pre-wrap" dir="rtl">
                      {truncateText(entry.problem, 150)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                    <div className="whitespace-pre-wrap" dir="rtl">
                      {truncateText(entry.detailed_solution, 150)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit size={14} />}
                        onClick={() => handleEdit(entry)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleDeleteClick(entry)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            icon={<ChevronLeft size={16} />}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              // Show first page, last page, current page, and pages around current page
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[32px] px-2`}
                  >
                    {page}
                  </Button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return <span key={page}>...</span>;
              }
              return null;
            })}
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            icon={<ChevronRight size={16} />}
            iconPosition="right"
          >
            Next
          </Button>
        </div>
      )}
      
      {/* Add modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Knowledge Entry"
        size="lg"
      >
        <KnowledgeForm onClose={() => setIsAddModalOpen(false)} />
      </Modal>
      
      {/* Edit modal */}
      {editingEntry && (
        <Modal 
          isOpen={!!editingEntry} 
          onClose={handleCloseEditModal}
          title="Edit Knowledge Entry"
          size="lg"
        >
          <KnowledgeForm entry={editingEntry} onClose={handleCloseEditModal} />
        </Modal>
      )}
      
      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this knowledge entry? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KnowledgeList;