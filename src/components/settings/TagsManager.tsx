import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save, X } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { tagsApi, Tag, CreateTagRequest, UpdateTagRequest } from '../../services/tagsApi';

const TagsManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6');
  
  // Fetch all tags
  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTags = await tagsApi.getAllTags();
      setTags(fetchedTags);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load tags on component mount
  useEffect(() => {
    fetchTags();
  }, []);
  
  // Handle adding a new tag
  const handleAddTag = async () => {
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const tagData: CreateTagRequest = {
        name: tagName.trim(),
        color: tagColor
      };
      
      await tagsApi.addTag(tagData);
      
      // Reset form
      setTagName('');
      setTagColor('#3b82f6');
      setIsAddingTag(false);
      
      // Refresh tags
      await fetchTags();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tag';
      setError(errorMessage);
      console.error('Error adding tag:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle updating a tag
  const handleUpdateTag = async () => {
    if (!editingTagId || !tagName.trim()) {
      setError('Tag name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const tagData: UpdateTagRequest = {
        name: tagName.trim(),
        color: tagColor
      };
      
      await tagsApi.updateTag(editingTagId, tagData);
      
      // Reset form
      setTagName('');
      setTagColor('#3b82f6');
      setEditingTagId(null);
      
      // Refresh tags
      await fetchTags();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      setError(errorMessage);
      console.error('Error updating tag:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting a tag
  const handleDeleteTag = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await tagsApi.deleteTag(id);
      
      // Refresh tags
      await fetchTags();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      setError(errorMessage);
      console.error('Error deleting tag:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle editing a tag
  const handleEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagColor(tag.color);
    setIsAddingTag(false);
  };
  
  // Reset form
  const resetForm = () => {
    setTagName('');
    setTagColor('#3b82f6');
    setIsAddingTag(false);
    setEditingTagId(null);
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Manage Tags</CardTitle>
        {!isAddingTag && !editingTagId && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setIsAddingTag(true)}
          >
            Add Tag
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Tag form */}
        {(isAddingTag || editingTagId) && (
          <div className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{editingTagId ? 'Edit Tag' : 'Add Tag'}</h3>
              <button 
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Enter tag name..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    className="p-1 border border-gray-300 rounded-md h-10 w-10"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                  />
                  <span className="text-sm">{tagColor}</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Save size={16} />}
                  onClick={editingTagId ? handleUpdateTag : handleAddTag}
                  isLoading={loading}
                >
                  {editingTagId ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Tags list */}
        {loading && !isAddingTag && !editingTagId ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : tags.length > 0 ? (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div 
                key={tag.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: tag.color }}
                  ></div>
                  <span>{tag.name}</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditTag(tag)}
                    className="text-blue-500 hover:text-blue-700"
                    disabled={loading}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No tags have been created yet. Click "Add Tag" to create one.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TagsManager;
