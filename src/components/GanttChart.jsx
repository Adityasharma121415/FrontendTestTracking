import React, { useState, useEffect } from 'react';
import TaskTimeline from './TaskTimeline.jsx';
import FunnelSummary from './FunnelSummary';
import { processDataForChart, funnelColors, statusColors } from './utils';

const GanttChart = ({ data }) => {
  const [tasks, setTasks] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  
  useEffect(() => {
    if (!data || !data.funnelGroups) return;
    
    // Process data for the chart
    const { processedTasks, uniqueFunnels, timeRange } = processDataForChart(data.funnelGroups);
    setTasks(processedTasks);
    setFunnels(uniqueFunnels);
    setTimeRange(timeRange);
  }, [data]);
  
  // Get all unique statuses for the legend
  const allStatuses = [...new Set(tasks.flatMap(task => 
    task.statuses.map(status => status.status)
  ))];
  
  // Group tasks by funnel
  const tasksByFunnel = {};
  tasks.forEach(task => {
    if (!tasksByFunnel[task.funnel]) {
      tasksByFunnel[task.funnel] = [];
    }
    tasksByFunnel[task.funnel].push(task);
  });
  
  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Task Workflow Timeline</h2>
      
      {/* Status legend */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          {allStatuses.map((status, idx) => (
            <div key={idx} className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: statusColors[status] || '#6B7280' }}
              ></div>
              <span className="font-medium">{status}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Funnel legend */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Funnels</h3>
        <div className="flex flex-wrap gap-4">
          {funnels.map((funnel, idx) => (
            <div key={idx} className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: funnelColors[funnel] || '#95a5a6' }}
              ></div>
              <span className="font-medium">{funnel}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Task Timeline Component */}
      <TaskTimeline 
        funnels={funnels}
        tasksByFunnel={tasksByFunnel}
        timeRange={timeRange}
      />
      
      {/* Funnel Summary Component */}
      <FunnelSummary 
        funnels={funnels}
        tasks={tasks}
      />
    </div>
  );
};

export default GanttChart;