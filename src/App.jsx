import React, { useState } from 'react';
import GanttChart from './components/GanttChart';
import { fetchTasksByApplicationId } from './services/api';

function App() {
  const [applicationId, setApplicationId] = useState('');
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!applicationId.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchTasksByApplicationId(applicationId);
      setTaskData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch task data');
      setTaskData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Task Workflow Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700 mb-1">
                Application ID
              </label>
              <input
                type="text"
                id="applicationId"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter application ID"
              />
            </div>
            <div className="self-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
            <p>{error}</p>
          </div>
        )}
        
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {taskData && !loading && (
          <GanttChart data={taskData} />
        )}
        
        {!taskData && !loading && !error && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
            Search for an application to view its task workflow
          </div>
        )}
      </div>
    </div>
  );
}

export default App;