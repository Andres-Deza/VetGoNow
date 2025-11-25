// src/App.jsx
import { useState } from 'react';
import Header from './components/header';
import Sidebar from './components/sidebar';
import Routes from './routes';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Header onMenuClick={toggleSidebar} />
      </div>

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 pt-[72px] overflow-hidden">
        {/* Sidebar (left) - Hidden on mobile, visible on desktop */}
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Main Content (right) - Add left margin on desktop for sidebar */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-100 w-full md:ml-64">
          <Routes />
        </div>
      </div>
    </div>
  );
};

export default App;
