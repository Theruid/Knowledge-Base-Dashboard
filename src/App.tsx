import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { KnowledgeProvider } from './contexts/KnowledgeContext';
import { ConversationProvider } from './contexts/ConversationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/dashboard/Dashboard';
import KnowledgeBase from './components/knowledge/KnowledgeBase';
import ConversationAnalysis from './components/conversation/ConversationAnalysis';
import Settings from './components/settings/Settings';
import RagRetrieve from './components/api/RagRetrieve';
import Chatbot from './components/chatbot/Chatbot';
import LockSearchPage from './pages/LockSearchPage';
import AdminPanel from './components/admin/AdminPanel';
import FeedbackManagement from './components/feedback/FeedbackManagement';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Add CSS for animations
import './styles/animations.css';

// Route guard for chatbot users
const ChatbotGuard = () => {
  const { user } = useAuth();
  const location = useLocation();

  // If user is chatbot role and trying to access non-allowed pages, redirect to chatbot
  if (user?.role === 'chatbot') {
    const allowedPaths = ['/chatbot', '/settings', '/rag-retrieve', '/login', '/signup'];
    const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path));

    if (!isAllowed) {
      return <Navigate to="/chatbot" replace />;
    }
  }

  return <Outlet />;
};

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
              <Route element={<ChatbotGuard />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <ConversationProvider>
                    <Dashboard />
                  </ConversationProvider>
                } />
                <Route path="/knowledge" element={<KnowledgeBase />} />
                <Route path="/rag-retrieve" element={<RagRetrieve />} />
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/lock-search" element={<LockSearchPage />} />
                <Route path="/feedback" element={<FeedbackManagement />} />
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
            </Route>
          </Routes>
        </KnowledgeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;