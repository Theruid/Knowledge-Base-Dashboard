import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { conversationApi, ConversationMessage, ConversationStats, ConversationSummary } from '../services/conversationApi';
import { notesApi, Note, CreateNoteRequest, UpdateNoteRequest } from '../services/notesApi';

export interface ConversationWithNotes extends ConversationSummary {
  notes?: Note[];
}

interface ConversationContextType {
  conversations: ConversationWithNotes[];
  selectedConversationId: number | null;
  conversationMessages: ConversationMessage[];
  conversationStats: ConversationStats | null;
  conversationNotes: Note[];
  loading: boolean;
  notesLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalConversations: number;
  searchTerm: string;
  sortField: 'Conversation_ID' | 'message_count';
  sortDirection: 'asc' | 'desc';
  onlyAnalyzed: boolean;
  setSearchTerm: (term: string) => void;
  setSortField: (field: 'Conversation_ID' | 'message_count') => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  setOnlyAnalyzed: (onlyAnalyzed: boolean) => void;
  setSelectedConversationId: (id: number | null) => void;
  fetchConversations: (page?: number, search?: string, sortField?: 'Conversation_ID' | 'message_count', sortDirection?: 'asc' | 'desc', onlyAnalyzed?: boolean) => Promise<void>;
  fetchConversation: (id: number) => Promise<void>;
  fetchConversationStats: (id: number) => Promise<void>;
  fetchConversationNotes: (id: number) => Promise<void>;
  addNote: (data: CreateNoteRequest) => Promise<void>;
  updateNote: (id: number, data: UpdateNoteRequest) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  handlePageChange: (page: number) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [conversations, setConversations] = useState<ConversationWithNotes[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [conversationStats, setConversationStats] = useState<ConversationStats | null>(null);
  const [conversationNotes, setConversationNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalConversations, setTotalConversations] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'Conversation_ID' | 'message_count'>('Conversation_ID');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [onlyAnalyzed, setOnlyAnalyzed] = useState<boolean>(false);

  const fetchConversations = async (
    page = currentPage, 
    search = searchTerm,
    field = sortField,
    direction = sortDirection,
    analyzed = onlyAnalyzed
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await conversationApi.getConversationList(page, 10, search, field, direction, analyzed);
      
      if (response.success && response.data) {
        setConversations(response.data);
        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
        setTotalConversations(response.total);
      } else {
        throw new Error('Failed to fetch conversations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      console.error('Error fetching conversations:', err);
      setConversations([]);
      setTotalConversations(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchConversations(page, searchTerm, sortField, sortDirection, onlyAnalyzed);
    }
  };

  const fetchConversation = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await conversationApi.getConversation(id);
      
      if (response.success && response.data) {
        setConversationMessages(response.data);
      } else {
        throw new Error('Failed to fetch conversation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversation';
      setError(errorMessage);
      console.error('Error fetching conversation:', err);
      setConversationMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationStats = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await conversationApi.getConversationStats(id);
      
      if (response.success && response.data) {
        setConversationStats(response.data);
      } else {
        throw new Error('Failed to fetch conversation statistics');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversation statistics';
      setError(errorMessage);
      console.error('Error fetching conversation statistics:', err);
      setConversationStats(null);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchConversationNotes = async (id: number) => {
    try {
      setNotesLoading(true);
      const notes = await notesApi.getConversationNotes(id);
      setConversationNotes(notes);
      
      // Also update the notes in the conversations list
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.Conversation_ID === id) {
            return { ...conv, notes };
          }
          return conv;
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversation notes';
      console.error('Error fetching conversation notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };
  
  const addNote = async (data: CreateNoteRequest) => {
    try {
      setNotesLoading(true);
      await notesApi.addNote(data);
      
      // Refresh notes for the conversation
      if (data.conversationId) {
        await fetchConversationNotes(data.conversationId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
      setError(errorMessage);
      console.error('Error adding note:', err);
    } finally {
      setNotesLoading(false);
    }
  };
  
  const updateNote = async (id: number, data: UpdateNoteRequest) => {
    try {
      setNotesLoading(true);
      await notesApi.updateNote(id, data);
      
      // Refresh notes for the current conversation
      if (selectedConversationId) {
        await fetchConversationNotes(selectedConversationId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      setError(errorMessage);
      console.error('Error updating note:', err);
    } finally {
      setNotesLoading(false);
    }
  };
  
  const deleteNote = async (id: number) => {
    try {
      setNotesLoading(true);
      await notesApi.deleteNote(id);
      
      // Refresh notes for the current conversation
      if (selectedConversationId) {
        await fetchConversationNotes(selectedConversationId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      console.error('Error deleting note:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchConversations(1, '');
  }, []);
  
  // Handle search term changes with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchConversations(1, searchTerm, sortField, sortDirection, onlyAnalyzed);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);
  
  // Handle sort changes
  useEffect(() => {
    fetchConversations(currentPage, searchTerm, sortField, sortDirection, onlyAnalyzed);
  }, [sortField, sortDirection]);

  // Handle onlyAnalyzed filter changes
  useEffect(() => {
    fetchConversations(1, searchTerm, sortField, sortDirection, onlyAnalyzed);
  }, [onlyAnalyzed]);

  // Load conversation when ID is selected
  useEffect(() => {
    if (selectedConversationId !== null) {
      fetchConversation(selectedConversationId);
      fetchConversationStats(selectedConversationId);
      fetchConversationNotes(selectedConversationId);
    } else {
      setConversationMessages([]);
      setConversationStats(null);
      setConversationNotes([]);
    }
  }, [selectedConversationId]);

  const value = {
    conversations,
    selectedConversationId,
    conversationMessages,
    conversationStats,
    conversationNotes,
    loading,
    notesLoading,
    error,
    currentPage,
    totalPages,
    totalConversations,
    searchTerm,
    sortField,
    sortDirection,
    onlyAnalyzed,
    setSearchTerm,
    setSortField,
    setSortDirection,
    setOnlyAnalyzed,
    setSelectedConversationId,
    fetchConversations,
    fetchConversation,
    fetchConversationStats,
    fetchConversationNotes,
    addNote,
    updateNote,
    deleteNote,
    handlePageChange
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};
