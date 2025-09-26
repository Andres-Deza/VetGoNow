// src/App.jsx
import Header from './components/header';
import Sidebar from './components/sidebar';
import Routes from './routes';

const App = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 pt-[72px] overflow-hidden">
        {/* Sidebar (left) */}
        <Sidebar />

        {/* Main Content (right) */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <Routes />
        </div>
      </div>
    </div>
  );
};

export default App;
