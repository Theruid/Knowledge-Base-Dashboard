import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm py-4 px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        
        <div className="flex items-center space-x-4">
          {/* Notification bell */}
          <button className="p-2 rounded-full text-gray-600 hover:bg-gray-100 relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          </button>

          {/* User profile */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            {isAuthenticated ? (
              <>
                <span className="hidden md:inline text-sm font-medium text-gray-700">
                  {user?.username || 'User'}
                </span>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
