import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
        {/* Header */}
        <Header title={title} />
        
        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white py-4 px-6">
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Knowledge Base Dashboard. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;