import React, { useState } from 'react';
import { Database, MessageCircle, Settings, Menu, X, Server, ChevronDown, ChevronRight, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [apiExpanded, setApiExpanded] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const toggleApiSection = () => {
    setApiExpanded(!apiExpanded);
  };
  
  const navItems = [
    { 
      icon: <LayoutDashboard size={20} />, 
      label: 'Dashboard', 
      path: '/dashboard',
      active: currentPath === '/dashboard'
    },
    { 
      icon: <Database size={20} />, 
      label: 'Knowledge Base', 
      path: '/knowledge',
      active: currentPath === '/knowledge'
    },
    { 
      icon: <MessageCircle size={20} />, 
      label: 'Analyze Conversation', 
      path: '/conversation',
      active: currentPath === '/conversation'
    },
    { 
      icon: <Server size={20} />, 
      label: 'API', 
      path: '#',
      active: currentPath.startsWith('/api'),
      expandable: true,
      expanded: apiExpanded,
      toggle: toggleApiSection,
      subItems: [
        {
          label: 'Retrieve From RAG',
          path: '/rag-retrieve',
          active: currentPath === '/rag-retrieve'
        },
        {
          label: 'LOCK Number Search',
          path: '/lock-search',
          active: currentPath === '/lock-search'
        }
      ]
    },
    // Admin panel link - only visible for admin users
    ...(isAdmin ? [
      { 
        icon: <Shield size={20} />, 
        label: 'Admin Panel', 
        path: '/admin',
        active: currentPath === '/admin'
      }
    ] : []),
    { 
      icon: <Settings size={20} />, 
      label: 'Settings', 
      path: '/settings',
      active: currentPath === '/settings' 
    },
  ];

  // Animation classes based on sidebar state
  const sidebarClass = isOpen
    ? 'translate-x-0'
    : '-translate-x-full md:translate-x-0';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed left-0 top-0 z-30 h-full w-64 bg-gray-900 text-white 
          transform transition-transform duration-300 ease-in-out
          ${sidebarClass}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <Database className="text-blue-400" />
            <h1 className="text-xl font-bold">Knowledge DB</h1>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-full hover:bg-gray-800 md:hidden"
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="mt-6">
          <ul>
            {navItems.map((item, index) => (
              <li key={index}>
                {item.expandable ? (
                  <div>
                    <div 
                      className={`
                        flex items-center justify-between px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white
                        transition-colors duration-200 cursor-pointer
                        ${item.active ? 'bg-gray-800 border-l-4 border-blue-500 text-white' : ''}
                      `}
                      onClick={item.toggle}
                    >
                      <div className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.label}</span>
                      </div>
                      {item.expanded ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                    {item.expanded && item.subItems && (
                      <ul className="ml-6 border-l border-gray-700">
                        {item.subItems.map((subItem, subIndex) => (
                          <li key={`${index}-${subIndex}`}>
                            <Link
                              to={subItem.path}
                              className={`
                                flex items-center px-6 py-2 text-gray-300 hover:bg-gray-800 hover:text-white
                                transition-colors duration-200
                                ${subItem.active ? 'bg-gray-800 text-white' : ''}
                              `}
                              onClick={window.innerWidth < 768 ? toggleSidebar : undefined}
                            >
                              <span className="ml-3">{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link 
                    to={item.path}
                    className={`
                      flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white
                      transition-colors duration-200
                      ${item.active ? 'bg-gray-800 border-l-4 border-blue-500 text-white' : ''}
                    `}
                    onClick={window.innerWidth < 768 ? toggleSidebar : undefined}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="font-semibold">KB</span>
            </div>
            <div>
              <p className="text-sm font-medium">Knowledge Base</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-4 right-4 md:hidden z-30 p-3 bg-blue-600 text-white rounded-full shadow-lg"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <Menu size={24} />
      </button>
    </>
  );
};

export default Sidebar;