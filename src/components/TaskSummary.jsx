import React from 'react';

const TaskSummary = ({ data }) => {
  if (!data || !data.funnelGroups) return null;
  
  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Task Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.funnelGroups.map((group, index) => {
          // Count tasks by status
          const statusCounts = {};
          group.tasks.forEach(task => {
            if (!statusCounts[task.status]) {
              statusCounts[task.status] = 0;
            }
            statusCounts[task.status]++;
          });
          
          // Get color for the funnel
          const funnelColor = group.funnelName === 'SOURCING' ? '#4bc0c0' : 
                             group.funnelName === 'CREDIT' ? '#ff6384' : '#9966ff';
          
          return (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: funnelColor }}
                ></div>
                <h3 className="font-semibold text-lg">{group.funnelName}</h3>
              </div>
              
              <p className="text-gray-600 mb-3">Total Tasks: {group.tasks.length}</p>
              
              <div className="space-y-1">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-sm">{status}:</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${(statusCounts['COMPLETED'] || 0) / group.tasks.length * 100}%`,
                      backgroundColor: funnelColor
                    }}
                  ></div>
                </div>
                <p className="text-xs text-right mt-1">
                  {Math.round((statusCounts['COMPLETED'] || 0) / group.tasks.length * 100)}% completed
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskSummary;