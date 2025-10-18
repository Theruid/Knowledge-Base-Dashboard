import React, { useState } from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { KnowledgeEntry } from '../../types';
import Button from '../ui/Button';

interface KnowledgeFormProps {
  entry?: KnowledgeEntry;
  onClose: () => void;
}

const KnowledgeForm: React.FC<KnowledgeFormProps> = ({ entry, onClose }) => {
  const { createEntry, updateEntry } = useKnowledge();
  
  const [formData, setFormData] = useState({
    knowledge_number: entry?.knowledge_number || 0,
    problem: entry?.problem || '',
    detailed_solution: entry?.detailed_solution || '',
    domain: entry?.domain || ''
  });
  
  const [errors, setErrors] = useState({
    problem: '',
    detailed_solution: '',
    domain: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'knowledge_number' ? parseInt(value) || 0 : value
    }));
    
    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {
      problem: '',
      detailed_solution: '',
      domain: ''
    };
    
    if (!formData.problem.trim()) {
      newErrors.problem = 'Problem is required';
    }
    
    if (!formData.detailed_solution.trim()) {
      newErrors.detailed_solution = 'Solution is required';
    }
    
    if (!formData.domain.trim()) {
      newErrors.domain = 'Domain is required';
    }
    
    setErrors(newErrors);
    
    return !newErrors.problem && !newErrors.detailed_solution && !newErrors.domain;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (entry) {
        // Update
        await updateEntry(entry.UniqueID, formData);
      } else {
        // Create
        await createEntry(formData);
      }
      
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="knowledge_number" className="block text-sm font-medium text-gray-700 mb-1">
            Knowledge Number
          </label>
          <input
            type="number"
            id="knowledge_number"
            name="knowledge_number"
            value={formData.knowledge_number}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
            Domain
          </label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain}
            onChange={handleChange}
            placeholder="Enter domain (e.g., accounting, inventory)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.domain && (
            <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-1">
          Problem <span className="text-red-500">*</span>
        </label>
        <textarea
          id="problem"
          name="problem"
          value={formData.problem}
          onChange={handleChange}
          rows={4}
          dir="rtl"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
        {errors.problem && (
          <p className="mt-1 text-sm text-red-600">{errors.problem}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="detailed_solution" className="block text-sm font-medium text-gray-700 mb-1">
          Detailed Solution <span className="text-red-500">*</span>
        </label>
        <textarea
          id="detailed_solution"
          name="detailed_solution"
          value={formData.detailed_solution}
          onChange={handleChange}
          rows={6}
          dir="rtl"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
        {errors.detailed_solution && (
          <p className="mt-1 text-sm text-red-600">{errors.detailed_solution}</p>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          {entry ? 'Update Entry' : 'Add Entry'}
        </Button>
      </div>
    </form>
  );
};

export default KnowledgeForm;