import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { KnowledgeEntry, PaginatedResponse } from '../types';
import { knowledgeApi } from '../services/api';

interface KnowledgeContextType {
  entries: KnowledgeEntry[];
  loading: boolean;
  error: string | null;
  totalEntries: number;
  uniqueKnowledgeCount: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  domainFilter: string;
  availableDomains: string[];
  fetchEntries: (page?: number, search?: string, domain?: string) => Promise<void>;
  createEntry: (entry: Omit<KnowledgeEntry, 'UniqueID'>) => Promise<KnowledgeEntry | null>;
  updateEntry: (id: number, entry: Omit<KnowledgeEntry, 'UniqueID'>) => Promise<KnowledgeEntry | null>;
  deleteEntry: (id: number) => Promise<boolean>;
  setSearchTerm: (term: string) => void;
  setDomainFilter: (domain: string) => void;
  fetchUniqueKnowledgeCount: () => Promise<void>;
  fetchAvailableDomains: () => Promise<void>;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
};

interface KnowledgeProviderProps {
  children: ReactNode;
}

export const KnowledgeProvider: React.FC<KnowledgeProviderProps> = ({ children }) => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [uniqueKnowledgeCount, setUniqueKnowledgeCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);

  const fetchEntries = async (page = 1, search = searchTerm, domain = domainFilter) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await knowledgeApi.getAll(page, 10, search, domain);
      
      if (!response) {
        throw new Error('Failed to fetch knowledge entries. Please try again later.');
      }
      
      setEntries(response.data || []);
      setTotalEntries(response.total);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch knowledge entries';
      setError(errorMessage);
      console.error('Error fetching entries:', err);
      
      // Set default values in case of error
      setEntries([]);
      setTotalEntries(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (entry: Omit<KnowledgeEntry, 'UniqueID'>): Promise<KnowledgeEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await knowledgeApi.create(entry);
      
      if (response.success && response.data) {
        // Refresh the list after creating
        await fetchEntries(1, searchTerm);
        return response.data;
      }
      
      throw new Error('Failed to create knowledge entry');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge entry';
      setError(errorMessage);
      console.error('Error creating entry:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (id: number, entry: Omit<KnowledgeEntry, 'UniqueID'>): Promise<KnowledgeEntry | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await knowledgeApi.update(id, entry);
      
      if (response.success && response.data) {
        // Update the entry in the current list
        setEntries(entries.map(e => e.UniqueID === id ? { ...response.data!, UniqueID: id } : e));
        return response.data;
      }
      
      throw new Error('Failed to update knowledge entry');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update knowledge entry';
      setError(errorMessage);
      console.error('Error updating entry:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await knowledgeApi.delete(id);
      
      if (response.success) {
        // Remove the entry from the list
        setEntries(entries.filter(e => e.UniqueID !== id));
        
        // If we deleted the last entry on the current page, go to the previous page
        if (entries.length === 1 && currentPage > 1) {
          await fetchEntries(currentPage - 1, searchTerm);
        } else {
          // Just refresh the current page
          await fetchEntries(currentPage, searchTerm);
        }
        
        return true;
      }
      
      throw new Error('Failed to delete knowledge entry');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete knowledge entry';
      setError(errorMessage);
      console.error('Error deleting entry:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchUniqueKnowledgeCount = async () => {
    try {
      const response = await knowledgeApi.getUniqueKnowledgeCount();
      if (response.success && response.data) {
        setUniqueKnowledgeCount(response.data.uniqueCount);
      }
    } catch (err) {
      console.error('Error fetching unique knowledge count:', err);
    }
  };

  const fetchAvailableDomains = async () => {
    try {
      const response = await knowledgeApi.getAvailableDomains();
      if (response.success && response.data) {
        setAvailableDomains(response.data);
      }
    } catch (err) {
      console.error('Error fetching available domains:', err);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchEntries(1, searchTerm, domainFilter);
    fetchUniqueKnowledgeCount();
    fetchAvailableDomains();
  }, []);

  // Handle search term and domain filter changes with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchEntries(1, searchTerm, domainFilter);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, domainFilter]);

  const value = {
    entries,
    loading,
    error,
    totalEntries,
    uniqueKnowledgeCount,
    currentPage,
    totalPages,
    searchTerm,
    domainFilter,
    availableDomains,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    setSearchTerm,
    setDomainFilter,
    fetchUniqueKnowledgeCount,
    fetchAvailableDomains
  };

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  );
};