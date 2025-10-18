import React, { useState, useEffect } from 'react';
import { useConversation } from '../../contexts/ConversationContext';
import { MessageCircle, User, Bot, BarChart, Plus, Tag, Edit, Trash, X, Save, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../../services/notesApi';
import { tagsApi, Tag as TagType } from '../../services/tagsApi';

const ConversationDetail: React.FC = () => {
  const {
    selectedConversationId,
    conversationMessages,
    conversationStats,
    conversationNotes,
    loading,
    notesLoading,
    error,
    setSelectedConversationId,
    addNote,
    updateNote,
    deleteNote
  } = useConversation();
  
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const tags = await tagsApi.getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setTagsLoading(false);
      }
    };
    
    fetchTags();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  const handleAddNote = async () => {
    if (!selectedConversationId || !noteText.trim()) return;
    
    try {
      const noteData: CreateNoteRequest = {
        conversationId: selectedConversationId,
        note: noteText,
        tags: noteTags.length > 0 ? noteTags : undefined
      };
      
      await addNote(noteData);
      
      // Reset form
      setNoteText('');
      setNoteTags([]);
      setShowAddNoteForm(false);
      setTagDropdownOpen(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };
  
  const handleUpdateNote = async () => {
    if (!editingNoteId || !noteText.trim()) return;
    
    try {
      const noteData: UpdateNoteRequest = {
        note: noteText,
        tags: noteTags.length > 0 ? noteTags : undefined
      };
      
      await updateNote(editingNoteId, noteData);
      
      // Reset form
      setNoteText('');
      setNoteTags([]);
      setEditingNoteId(null);
      setTagDropdownOpen(false);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };
  
  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };
  
  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteText(note.note);
    setNoteTags(note.tags ? note.tags.split(',') : []);
    setShowAddNoteForm(false); // Close add form if open
  };
  
  const toggleTag = (tagName: string) => {
    if (noteTags.includes(tagName)) {
      setNoteTags(noteTags.filter(tag => tag !== tagName));
    } else {
      setNoteTags([...noteTags, tagName]);
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  const enhanceWithGemini = async () => {
    if (!noteText.trim()) return;
    
    setIsEnhancing(true);
    
    try {
      // Updated prompt to request Persian output
      const prompt = `Please improve the following text by fixing grammar, enhancing clarity, and formatting it with markdown. The output should be in Persian language only. Return only the improved text without any additional commentary or explanations.\n\nText to improve:\n${noteText}`;
      
      // Using the backend proxy endpoint instead of directly calling Gemini API
      const response = await fetch('/api/proxy/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', errorData);
        throw new Error(`Failed to enhance text with Gemini: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Gemini API response:', data); // Log the full response for debugging
      const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (enhancedText) {
        setNoteText(enhancedText);
      } else {
        throw new Error('No text returned from Gemini API');
      }
    } catch (error) {
      console.error('Error enhancing text with Gemini:', error);
      alert('Failed to enhance text. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const resetForm = () => {
    setNoteText('');
    setNoteTags([]);
    setEditingNoteId(null);
    setShowAddNoteForm(false);
    setTagDropdownOpen(false);
  };
  
  if (!selectedConversationId) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <MessageCircle className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No conversation selected</h3>
          <p className="text-gray-500 mb-4">
            Please select a conversation from the list to view its details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Conversation #{selectedConversationId}
          </h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${conversationMessages.length} messages`}
          </p>
        </div>
        
        <Button
          variant="secondary"
          onClick={() => setSelectedConversationId(null)}
        >
          Back to List
        </Button>
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
      
      {/* Notes section */}
      {!loading && selectedConversationId && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl">Notes</CardTitle>
            {!showAddNoteForm && !editingNoteId && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setShowAddNoteForm(true)}
              >
                Add Note
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {/* Note form */}
            {(showAddNoteForm || editingNoteId) && (
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{editingNoteId ? 'Edit Note' : 'Add Note'}</h3>
                  <button 
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex items-center">
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Enter your note here..."
                        data-component-name="ConversationDetail"
                      />
                      <button
                        onClick={enhanceWithGemini}
                        disabled={isEnhancing || !noteText.trim()}
                        className={`ml-2 p-2 rounded-md ${isEnhancing || !noteText.trim() ? 'text-gray-400' : 'text-yellow-600 hover:bg-yellow-100'}`}
                        title="Enhance text with AI"
                        type="button"
                      >
                        <Sparkles size={18} />
                      </button>
                    </div>
                    {isEnhancing && (
                      <div className="absolute right-12 top-2 text-xs text-gray-500">
                        Enhancing...
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <div className="relative">
                      <button
                        onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                        className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white"
                        type="button"
                      >
                        <span>{noteTags.length ? `${noteTags.length} tags selected` : 'Select tags...'}</span>
                        <Tag size={16} />
                      </button>
                      
                      {tagDropdownOpen && (
                        <div className="fixed z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden" style={{ maxWidth: "calc(100% - 4rem)", maxHeight: "300px" }}>
                          {tagsLoading ? (
                            <div className="p-2 text-center text-gray-500">Loading tags...</div>
                          ) : availableTags.length > 0 ? (
                            <div className="p-1">
                              {availableTags.map(tag => (
                                <div 
                                  key={tag.id}
                                  className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => toggleTag(tag.name)}
                                >
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: tag.color }}
                                  ></div>
                                  <span className="flex-1">{tag.name}</span>
                                  {noteTags.includes(tag.name) && (
                                    <Check size={16} className="text-green-500" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2 text-center text-gray-500">
                              No tags available. Create tags in Settings.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {noteTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {noteTags.map((tag, index) => {
                          // Find the tag color if it exists in availableTags
                          const tagObj = availableTags.find(t => t.name === tag);
                          const tagColor = tagObj ? tagObj.color : '#3b82f6';
                          
                          return (
                            <div key={index} className="flex items-center bg-blue-100 px-2 py-1 rounded-full">
                              <div 
                                className="w-2 h-2 rounded-full mr-1" 
                                style={{ backgroundColor: tagColor }}
                              ></div>
                              <span className="text-blue-800 text-sm">{tag}</span>
                              <button
                                onClick={() => removeTag(tag)}
                                className="ml-1 text-blue-800 hover:text-blue-900"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Save size={16} />}
                      onClick={editingNoteId ? handleUpdateNote : handleAddNote}
                      isLoading={notesLoading}
                    >
                      {editingNoteId ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Notes list */}
            {conversationNotes.length > 0 ? (
              <div className="space-y-3">
                {conversationNotes.map((note) => (
                  <div key={note.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <p className="text-sm">{note.note}</p>
                      <div className="flex space-x-1 ml-2">
                        <button 
                          onClick={() => handleEditNote(note)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center">
                      <User size={14} className="text-gray-500 mr-1" />
                      <span className="text-xs text-gray-600 font-medium">Author: {note.username || 'Unknown'}</span>
                    </div>
                    {note.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.split(',').map((tag, i) => {
                          // Find the tag color if it exists in availableTags
                          const tagObj = availableTags.find(t => t.name === tag);
                          const tagColor = tagObj ? tagObj.color : '#3b82f6';
                          
                          return (
                            <span 
                              key={i} 
                              className="px-2 py-1 text-white text-xs rounded-full flex items-center"
                              style={{ backgroundColor: tagColor }}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                      {formatTimestamp(note.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No notes added yet. Click "Add Note" to create one.
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Stats cards */}
      {!loading && conversationStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Messages</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationStats.totalMessages}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-amber-100 p-3 rounded-full mr-4">
                <BarChart className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lock Number</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationMessages[0]?.LockNumber || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">اتمام چت بات</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationMessages.some(msg => msg.Metric1 === 'اتمام چت بات') ? 'بله' : 'خیر'}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="flex items-center p-6">
              <div className="bg-red-100 p-3 rounded-full mr-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">عدم اتمام چت</p>
                <p className="text-2xl font-semibold text-gray-900">{conversationMessages.some(msg => msg.Metric2 === 'عدم اتمام چت') ? 'بله' : 'خیر'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Conversation messages */}
      {!loading && conversationMessages.length > 0 && (
        <div className="space-y-4" dir="rtl">
          {conversationMessages.map((message, index) => (
            <div 
              key={index}
              className={`flex ${message.IS_BOT ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`max-w-3xl rounded-lg px-4 py-2 ${
                  message.IS_BOT 
                    ? 'bg-green-100 text-gray-800 border border-green-200' 
                    : 'bg-blue-500 text-white'
                }`}
                dir="rtl"
              >
                <div className="flex items-center mb-1" dir="ltr">
                  <span className="text-xs opacity-75">
                    {message.IS_BOT ? 'Bot' : 'User'} • {formatTimestamp(message.Time)}
                  </span>
                </div>
                <p className="text-right">{message.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && conversationMessages.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No messages found</h3>
            <p className="text-gray-500 mb-4">
              This conversation doesn't have any messages.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationDetail;