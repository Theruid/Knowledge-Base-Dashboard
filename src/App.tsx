import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { KnowledgeProvider } from './contexts/KnowledgeContext';
import { ConversationProvider } from './contexts/ConversationContext';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './components/dashboard/Dashboard';
import KnowledgeBase from './components/knowledge/KnowledgeBase';
import ConversationAnalysis from './components/conversation/ConversationAnalysis';
import Settings from './components/settings/Settings';
import RagRetrieve from './components/api/RagRetrieve';
import LockSearchPage from './pages/LockSearchPage';
import AdminPanel from './components/admin/AdminPanel';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Add CSS for animations
import './styles/animations.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <KnowledgeProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ConversationProvider>
                  <Dashboard />
                </ConversationProvider>
              } />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/rag-retrieve" element={<RagRetrieve />} />
              <Route path="/lock-search" element={<LockSearchPage />} />
              <Route path="/settings" element={<Settings />} />
              
              {/* Admin routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>
              
              {/* Wrap conversation routes with ConversationProvider */}
              <Route path="/conversation" element={
                <ConversationProvider>
                  <ConversationAnalysis />
                </ConversationProvider>
              } />
            </Route>
          </Routes>
        </KnowledgeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;