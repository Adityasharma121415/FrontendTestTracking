import React from 'react';
import { funnelColors, statusColors } from './utils';

const FunnelSummary = ({ funnels, tasks }) => {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Funnel Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {funnels.map((funnel, index) => {
          const funnelTasks = tasks.filter(t => t.funnel === funnel);
          const statuses = [...new Set(funnelTasks.flatMap(t => t.statuses.map(s => s.status)))];
          const funnelColor = funnelColors[funnel] || '#95a5a6';
          
          // Calculate completion percentage
          const completedTasks = funnelTasks.filter(t => 
            t.finalStatus.status === 'COMPLETED'
          ).length;
          const completionPercentage = funnelTasks.length > 0 
            ? Math.round((completedTasks / funnelTasks.length) * 100) 
            : 0;
          
          return (
            <div key={index} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: funnelColor }}
                ></div>
                <span className="text-gray-700">{funnel}</span>
              </h3>
              <p className="text-gray-600">Total Tasks: {funnelTasks.length}</p>
              
              {/* Progress bar */}
              <div className="mt-3 mb-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${completionPercentage}%`,
                      backgroundColor: statusColors['COMPLETED'] || '#16a34a'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-right">
                  {completionPercentage}% completed
                </p>
              </div>
              
              <div className="mt-2 space-y-1">
                {statuses.map(status => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <span 
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: statusColors[status] || '#6B7280' }}
                      ></span>
                      {status}
                    </span>
                    <span className="text-sm font-medium">
                      {funnelTasks.filter(t => 
                        t.statuses.some(s => s.status === status)
                      ).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelSummary;