import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const GanttChart = ({ data }) => {
  const [tasks, setTasks] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const [hoveredTask, setHoveredTask] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Define funnel colors - these will be used as the main color for task bars
  const funnelColors = {
    SOURCING: '#4bc0c0', // Teal
    CREDIT: '#ff6384',   // Pink
    // Add more colors for other funnels if needed
  };
  
  // Define status colors - these will be used for status indicators
  const statusColors = {
    COMPLETED: '#10B981', // Green
    PENDING: '#F59E0B',   // Amber
    FAILED: '#EF4444',    // Red
    INITIATED: '#3B82F6', // Blue
    IN_PROGRESS: '#8B5CF6', // Purple
    // Add more status colors as needed
  };
  
  useEffect(() => {
    if (!data || !data.funnelGroups) return;
    
    // Process data for the chart
    const { processedTasks, uniqueFunnels, timeRange } = processDataForChart(data.funnelGroups);
    setTasks(processedTasks);
    setFunnels(uniqueFunnels);
    setTimeRange(timeRange);
  }, [data]);
  
  const processDataForChart = (funnelGroups) => {
    let allTasks = [];
    const uniqueFunnels = [];
    let minTime = null; // Start with null
    let maxTime = null; // Start with null
    
    funnelGroups.forEach((group) => {
      const funnelName = group.funnelName;
      
      if (!uniqueFunnels.includes(funnelName)) {
        uniqueFunnels.push(funnelName);
      }
      
      // Group tasks by taskId to find start and end times
      const taskMap = {};
      
      group.tasks.forEach(task => {
        // Use createdAt for the first status if available, otherwise use updatedAt
        const taskTime = new Date(task.createdAt || task.updatedAt);
        
        // Initialize min/max time with the first task time we encounter
        if (minTime === null || maxTime === null) {
          minTime = taskTime;
          maxTime = taskTime;
        } else {
          // Update min and max time for the time range
          if (taskTime < minTime) minTime = taskTime;
          if (taskTime > maxTime) maxTime = taskTime;
        }
        
        if (!taskMap[task.taskId]) {
          taskMap[task.taskId] = {
            id: task.taskId,
            funnel: task.funnel,
            startTime: taskTime, // Use the earliest time as start time
            endTime: taskTime,
            statuses: [{ 
              status: task.status, 
              time: taskTime,
              color: statusColors[task.status] || '#6B7280' // Default gray
            }],
            actorId: task.actorId,
            funnelColor: funnelColors[task.funnel] || '#' + Math.floor(Math.random()*16777215).toString(16)
          };
        } else {
          // Add status change
          taskMap[task.taskId].statuses.push({ 
            status: task.status, 
            time: taskTime,
            color: statusColors[task.status] || '#6B7280' // Default gray
          });
          
          // Update start time if this is an earlier status
          if (taskTime < taskMap[task.taskId].startTime) {
            taskMap[task.taskId].startTime = taskTime;
          }
          
          // Update end time if this is a later status
          if (taskTime > taskMap[task.taskId].endTime) {
            taskMap[task.taskId].endTime = taskTime;
          }
        }
      });
      
      // Sort statuses by time and set final status for each task
      Object.values(taskMap).forEach(task => {
        task.statuses.sort((a, b) => a.time - b.time);
        // Get the final status
        task.finalStatus = task.statuses[task.statuses.length - 1];
      });
      
      // Convert to array and add to all tasks
      allTasks = [...allTasks, ...Object.values(taskMap)];
    });
    
    // Only add a very small buffer (1%) to ensure tasks at the edges are visible
    if (minTime && maxTime) {
      const timeRange = maxTime - minTime;
      const smallBuffer = timeRange * 0.01;
      maxTime = new Date(maxTime.getTime() + smallBuffer);
    }
    
    return { 
      processedTasks: allTasks, 
      uniqueFunnels, 
      timeRange: { start: minTime, end: maxTime } 
    };
  };
  
  const getTaskPosition = (task) => {
    if (!timeRange.start || !timeRange.end) return { left: 0, width: 0 };
    
    const totalDuration = timeRange.end - timeRange.start;
    const taskStart = task.startTime - timeRange.start;
    const taskDuration = task.endTime - task.startTime;
    
    const left = (taskStart / totalDuration) * 100;
    const width = (taskDuration / totalDuration) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };
  
  const getStatusPosition = (status, task) => {
    if (!timeRange.start || !timeRange.end) return { left: 0 };
    
    const totalDuration = timeRange.end - timeRange.start;
    const statusTime = status.time - timeRange.start;
    
    const left = (statusTime / totalDuration) * 100;
    
    return { left: `${left}%` };
  };
  
  const handleTaskMouseEnter = (e, task) => {
    setHoveredTask(task);
    setTooltipPosition({ 
      x: e.clientX, 
      y: e.clientY 
    });
  };
  
  const renderTimeAxis = () => {
    if (!timeRange.start || !timeRange.end) return null;
    
    const totalDuration = timeRange.end - timeRange.start;
    // Determine appropriate number of ticks based on duration
    const numTicks = 10;
    const ticks = [];
    
    for (let i = 0; i <= numTicks; i++) {
      const tickTime = new Date(timeRange.start.getTime() + (totalDuration * (i / numTicks)));
      ticks.push(
        <div 
          key={i} 
          className="absolute top-0 h-full border-l border-gray-300"
          style={{ left: `${(i / numTicks) * 100}%` }}
        >
          <div className="text-xs text-gray-500 mt-1 -ml-8 w-16 text-center">
            {format(tickTime, 'HH:mm:ss')}
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative h-8 mb-4 border-b border-gray-300">
        {ticks}
      </div>
    );
  };
  
  const renderTaskTooltip = () => {
    if (!hoveredTask) return null;
    
    // Calculate positions for the status timeline
    const totalDuration = hoveredTask.endTime - hoveredTask.startTime;
    
    return (
      <div 
        className="fixed z-50 bg-white p-4 rounded-lg shadow-xl border border-gray-200 text-sm"
        style={{ 
          left: `${tooltipPosition.x + 10}px`, 
          top: `${tooltipPosition.y + 10}px`,
          maxWidth: '400px',
          minWidth: '320px'
        }}
      >
        <h4 className="font-bold text-lg mb-2">{hoveredTask.id}</h4>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <p>
              <span className="font-semibold">Funnel:</span> 
              <span className="ml-1 inline-flex items-center">
                <span 
                  className="inline-block w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: hoveredTask.funnelColor }}
                ></span>
                {hoveredTask.funnel}
              </span>
            </p>
            <p>
              <span className="font-semibold">Current Status:</span> 
              <span className="ml-1 inline-flex items-center">
                <span 
                  className="inline-block w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: hoveredTask.finalStatus.color }}
                ></span>
                {hoveredTask.finalStatus.status}
              </span>
            </p>
            <p><span className="font-semibold">Actor ID:</span> {hoveredTask.actorId || 'None'}</p>
          </div>
          <div>
            <p><span className="font-semibold">Start:</span> {format(hoveredTask.startTime, 'HH:mm:ss')}</p>
            <p><span className="font-semibold">End:</span> {format(hoveredTask.endTime, 'HH:mm:ss')}</p>
            <p><span className="font-semibold">Duration:</span> {((hoveredTask.endTime - hoveredTask.startTime) / 1000).toFixed(2)}s</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="font-semibold mb-2">Status Timeline:</p>
          
          {/* Visual status timeline */}
          <div className="relative h-20 mb-2">
            {/* Timeline line */}
            <div className="absolute top-10 left-0 right-0 h-0.5 bg-gray-300"></div>
            
            {/* Status nodes and connections */}
            {hoveredTask.statuses.map((status, idx) => {
              const position = ((status.time - hoveredTask.startTime) / totalDuration) * 100;
              const nextStatus = hoveredTask.statuses[idx + 1];
              
              return (
                <React.Fragment key={idx}>
                  {/* Status node */}
                  <div 
                    className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-2 -translate-y-2 cursor-pointer"
                    style={{ 
                      left: `${position}%`, 
                      top: '10px',
                      backgroundColor: status.color
                    }}
                    title={`${status.status} at ${format(status.time, 'HH:mm:ss')}`}
                  ></div>
                  
                  {/* Status label */}
                  <div 
                    className="absolute text-xs font-medium transform -translate-x-1/2"
                    style={{ 
                      left: `${position}%`, 
                      top: idx % 2 === 0 ? '20px' : '0px'
                    }}
                  >
                    {status.status}
                  </div>
                  
                  {/* Time label */}
                  <div 
                    className="absolute text-xs text-gray-500 transform -translate-x-1/2"
                    style={{ 
                      left: `${position}%`, 
                      top: idx % 2 === 0 ? '32px' : '-12px'
                    }}
                  >
                    {format(status.time, 'HH:mm:ss')}
                  </div>
                  
                  {/* Connection line to next status */}
                  {nextStatus && (
                    <div 
                      className="absolute h-0.5 bg-gray-400"
                      style={{ 
                        left: `${position}%`, 
                        top: '10px',
                        width: `${((nextStatus.time - status.time) / totalDuration) * 100}%`
                      }}
                    ></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
 };
  
  // Group tasks by funnel
  const tasksByFunnel = {};
  tasks.forEach(task => {
    if (!tasksByFunnel[task.funnel]) {
      tasksByFunnel[task.funnel] = [];
    }
    tasksByFunnel[task.funnel].push(task);
  });
  
  // Get all unique statuses for the legend
  const allStatuses = [...new Set(tasks.flatMap(task => 
    task.statuses.map(status => status.status)
  ))];
  
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
                style={{ backgroundColor: funnelColors[funnel] || '#ccc' }}
              ></div>
              <span className="font-medium">{funnel}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="relative overflow-x-auto border rounded-lg p-4 bg-gray-50">
        {renderTimeAxis()}
        
        {funnels.map((funnel, funnelIdx) => (
          <div key={funnelIdx} className="mb-8">
            <h3 className="text-md font-semibold mb-3 flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: funnelColors[funnel] || '#ccc' }}
              ></div>
              {funnel}
            </h3>
            
            <div className="relative">
              {(tasksByFunnel[funnel] || []).map((task, idx) => {
                const { left, width } = getTaskPosition(task);
                
                return (
                  <div 
                    key={idx} 
                    className="relative h-10 mb-3 flex items-center group"
                  >
                    <div className="w-40 pr-4 font-medium truncate text-gray-700">{task.id}</div>
                    <div className="flex-1 relative h-full">
                      {/* Task bar with funnel color */}
                      <div 
                        className="absolute h-6 rounded-md cursor-pointer transition-all duration-200 group-hover:h-8 group-hover:-translate-y-1"
                        style={{ 
                          left, 
                          width, 
                          backgroundColor: task.funnelColor,
                        }}
                        onMouseEnter={(e) => handleTaskMouseEnter(e, task)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        {/* Status indicator dot at the end of the bar */}
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-3 rounded-r-md"
                          style={{ backgroundColor: task.finalStatus.color }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {renderTaskTooltip()}
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Funnel Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((funnel, index) => {
            const funnelTasks = tasks.filter(t => t.funnel === funnel);
            const statuses = [...new Set(funnelTasks.flatMap(t => t.statuses.map(s => s.status)))];
            
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
                    style={{ backgroundColor: funnelColors[funnel] || '#ccc' }}
                  ></div>
                  {funnel}
                </h3>
                <p className="text-gray-600">Total Tasks: {funnelTasks.length}</p>
                
                {/* Progress bar */}
                <div className="mt-3 mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${completionPercentage}%`,
                        backgroundColor: statusColors['COMPLETED'] || '#10B981'
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
    </div>
  );
};

export default GanttChart;