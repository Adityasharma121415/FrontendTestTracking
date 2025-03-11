import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const GanttChart = ({ data }) => {
  const [tasks, setTasks] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const [hoveredTask, setHoveredTask] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Define funnel colors with the specific scheme requested
  const funnelColors = {
    SOURCING: '#3498db',    // Blue
    CREDIT: '#8e44ad',      // Purple
    CONVERSION: '#8B4513',  // Brown
    FULFILLMENT: '#20b2aa', // Teal
    DISBURSAL: '#556B2F',   // Olive green
    RISK: '#2c3e50',        // Dark almost black
    RTO: '#FF69B4',         // Pink
    OTHERS: '#95a5a6',      // Grey
  };
  
  // Define status colors with the specific scheme requested
  const statusColors = {
    NEW: '#FFCC00',         // Yellow
    'TO DO': '#ef4444',     // Red
    IN_PROGRESS: '#f97316', // Orange
    COMPLETED: '#16a34a',   // Green
    PENDING: '#f59e0b',     // Amber
    FAILED: '#ef4444',      // Red
    INITIATED: '#3B82F6',   // Blue
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
    let minTime = null;
    let maxTime = null;
    
    // Create a global taskMap to ensure unique task IDs across all funnels
    const taskMap = {};
    
    funnelGroups.forEach((group) => {
      const funnelName = group.funnelName;
      
      if (!uniqueFunnels.includes(funnelName)) {
        uniqueFunnels.push(funnelName);
      }
      
      group.tasks.forEach(task => {
        const taskTime = new Date(task.createdAt || task.updatedAt);
        
        if (minTime === null || maxTime === null) {
          minTime = taskTime;
          maxTime = taskTime;
        } else {
          if (taskTime < minTime) minTime = taskTime;
          if (taskTime > maxTime) maxTime = taskTime;
        }
        
        // Use a composite key that includes both taskId and funnel
        // This ensures tasks with the same ID but different funnels are treated separately
        const taskKey = `${task.funnel}:${task.taskId}`;
        
        if (!taskMap[taskKey]) {
          // Initialize the task with segments array
          taskMap[taskKey] = {
            id: task.taskId,
            funnel: task.funnel,
            segments: [{
              startTime: taskTime,
              endTime: taskTime,
              status: task.status
            }],
            statuses: [{ 
              status: task.status, 
              time: taskTime,
              color: statusColors[task.status] || '#6B7280'
            }],
            actorId: task.actorId,
            funnelColor: funnelColors[task.funnel] || '#95a5a6' // Default to grey
          };
        } else {
          // Add status change
          taskMap[taskKey].statuses.push({ 
            status: task.status, 
            time: taskTime,
            color: statusColors[task.status] || '#6B7280'
          });
          
          // Check if this is a new segment or continuation of existing segment
          const lastSegment = taskMap[taskKey].segments[taskMap[taskKey].segments.length - 1];
          const timeDiff = taskTime - lastSegment.endTime;
          
          // If the time difference is significant, create a new segment
          if (timeDiff > 5 * 60 * 1000) { // 5 minutes threshold
            taskMap[taskKey].segments.push({
              startTime: taskTime,
              endTime: taskTime,
              status: task.status
            });
          } else {
            // Update the end time of the last segment
            lastSegment.endTime = taskTime;
            lastSegment.status = task.status;
          }
        }
      });
    });
    
    // Sort statuses and set final status for each task
    Object.values(taskMap).forEach(task => {
      task.statuses.sort((a, b) => a.time - b.time);
      task.finalStatus = task.statuses[task.statuses.length - 1];
      
      // Sort segments by start time to ensure proper ordering
      task.segments.sort((a, b) => a.startTime - b.startTime);
    });
    
    allTasks = Object.values(taskMap);
    
    // Add buffer to time range
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
  
  const getSegmentPosition = (segment, timeRange) => {
    if (!timeRange.start || !timeRange.end) return { left: 0, width: 0 };
    
    const totalDuration = timeRange.end - timeRange.start;
    const segmentStart = segment.startTime - timeRange.start;
    const segmentDuration = segment.endTime - segment.startTime;
    
    const left = (segmentStart / totalDuration) * 100;
    const width = (segmentDuration / totalDuration) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };
  
  const getConnectionPosition = (startSegment, endSegment, timeRange) => {
    if (!timeRange.start || !timeRange.end) return { left: 0, width: 0 };
    
    const totalDuration = timeRange.end - timeRange.start;
    
    const startPos = (endSegment.startTime - timeRange.start) / totalDuration * 100;
    const endPos = (startSegment.endTime - timeRange.start) / totalDuration * 100;
    
    return { 
      left: `${endPos}%`, 
      width: `${startPos - endPos}%` 
    };
  };
  
  const handleTaskMouseEnter = (e, task, segment) => {
    setHoveredTask({...task, currentSegment: segment});
    setTooltipPosition({ 
      x: e.clientX, 
      y: e.clientY 
    });
  };
  
  const renderTaskTooltip = () => {
    if (!hoveredTask) return null;
    
    const segment = hoveredTask.currentSegment;
    if (!segment) return null;
    
    // Format the statuses for a cleaner timeline display
    const formattedStatuses = hoveredTask.statuses.map((status, index) => ({
      ...status,
      formattedTime: format(status.time, 'HH:mm:ss')
    }));
    
    return (
      <div 
        className="fixed z-50 bg-white p-4 rounded-lg shadow-xl border border-gray-200 text-sm"
        style={{ 
          left: `${tooltipPosition.x + 10}px`, 
          top: `${tooltipPosition.y + 10}px`,
          maxWidth: '500px', // Increased width
          minWidth: '450px'  // Increased minimum width
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
                  style={{ backgroundColor: statusColors[segment.status] || '#6B7280' }}
                ></span>
                {segment.status}
              </span>
            </p>
            <p><span className="font-semibold">Actor ID:</span> {hoveredTask.actorId || 'None'}</p>
          </div>
          <div>
            <p><span className="font-semibold">Start:</span> {format(segment.startTime, 'HH:mm:ss')}</p>
            <p><span className="font-semibold">End:</span> {format(segment.endTime, 'HH:mm:ss')}</p>
            <p><span className="font-semibold">Duration:</span> {((segment.endTime - segment.startTime) / 1000).toFixed(2)}s</p>
          </div>
        </div>
        
        {/* Improved Status Timeline */}
        <div className="mt-4">
          <p className="font-semibold mb-2">Status Timeline:</p>
          
          {/* Timeline container with improved layout */}
          <div className="relative mt-2 mb-2 h-24"> {/* Increased height */}
            {/* Timeline line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gray-300" style={{ top: '20px' }}></div>
            
            {/* Status nodes and connections */}
            {formattedStatuses.map((status, idx) => {
              const position = ((status.time - formattedStatuses[0].time) / 
                (formattedStatuses[formattedStatuses.length - 1].time - formattedStatuses[0].time)) * 100;
              const nextStatus = formattedStatuses[idx + 1];
              
              return (
                <React.Fragment key={idx}>
                  {/* Status node */}
                  <div 
                    className="absolute"
                    style={{ 
                      left: `${position}%`,
                      top: '20px',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: status.color }}
                      title={`${status.status} at ${status.formattedTime}`}
                    ></div>
                  </div>
                  
                  {/* Status label - positioned ABOVE the timeline */}
                  <div 
                    className="absolute text-xs font-medium text-center"
                    style={{ 
                      left: `${position}%`,
                      top: '0px',
                      transform: 'translateX(-50%)',
                      width: '80px' // Fixed width to prevent overlap
                    }}
                  >
                    {status.status}
                  </div>
                  
                  {/* Time label - positioned BELOW the timeline */}
                  <div 
                    className="absolute text-xs text-gray-500 text-center"
                    style={{ 
                      left: `${position}%`,
                      top: '35px', // Below the timeline
                      transform: 'translateX(-50%)',
                      width: '80px' // Fixed width to prevent overlap
                    }}
                  >
                    {status.formattedTime}
                  </div>
                  
                  {/* Connection line to next status */}
                  {nextStatus && (
                    <div 
                      className="absolute h-0.5 bg-gray-400"
                      style={{ 
                        left: `${position}%`, 
                        top: '20px',
                        width: `${((nextStatus.time - status.time) / 
                          (formattedStatuses[formattedStatuses.length - 1].time - formattedStatuses[0].time)) * 100}%`
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
                style={{ backgroundColor: funnelColors[funnel] || '#95a5a6' }}
              ></div>
              <span className="font-medium">{funnel}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main chart container with grid structure */}
      <div className="flex" style={{ borderTop: '1px solid #e5e7eb' }}>
        {/* Left sidebar for task names */}
        <div className="w-48 flex-shrink-0 border-r border-gray-200">
          {funnels.map((funnel, funnelIdx) => {
            const funnelTasks = tasksByFunnel[funnel] || [];
            return (
              <div key={funnelIdx}>
                {/* Funnel header - darker gray text */}
                <div className="py-2 px-3 font-medium bg-gray-50 border-b border-gray-200 flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: funnelColors[funnel] || '#95a5a6' }}
                  ></div>
                  <span className="text-gray-700">{funnel}</span> {/* Darker gray text */}
                </div>
                
                {/* Task names */}
                {funnelTasks.map((task, idx) => (
                  <div key={idx} className="border-b border-gray-100">
                    <div className="h-10 flex items-center px-3">
                      <span className="text-sm truncate">{task.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        
        {/* Main timeline graph */}
        <div className="flex-1 overflow-x-auto relative">
          {/* Vertical grid lines that span the entire chart */}
          {timeRange.start && timeRange.end && Array.from({ length: 11 }).map((_, i) => {
            const position = `${(i / 10) * 100}%`;
            
            return (
              <div 
                key={`grid-line-${i}`}
                className="absolute top-0 bottom-0 border-l border-gray-300"
                style={{ 
                  left: position,
                  height: '100%',
                  zIndex: 1 // Lower z-index so task elements appear above
                }}
              ></div>
            );
          })}
          
          {/* Time axis header */}
          <div className="border-b border-gray-200 py-2 relative h-10 bg-gray-50">
            {timeRange.start && timeRange.end && Array.from({ length: 11 }).map((_, i) => {
              const position = `${(i / 10) * 100}%`;
              const tickTime = new Date(timeRange.start.getTime() + ((timeRange.end - timeRange.start) * (i / 10)));
              
              return (
                <div 
                  key={i} 
                  className="absolute top-0 h-full flex items-center justify-center"
                  style={{ left: position, width: '10%' }}
                >
                  <div className="text-xs text-gray-500">
                    {format(tickTime, 'HH:mm:ss')}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Funnel timelines */}
          <div className="relative">
            {funnels.map((funnel, funnelIdx) => {
              const funnelTasks = tasksByFunnel[funnel] || [];
              const funnelColor = funnelColors[funnel] || '#95a5a6';
              
              return (
                <div key={funnelIdx} className="relative">
                  {/* Empty funnel header to match sidebar */}
                  <div className="h-10 border-b border-gray-200"></div>
                  
                  {/* Task rows with JavaScript-based positioning */}
                  {funnelTasks.map((task, idx) => (
                    <div 
                      key={idx} 
                      className="relative border-b border-gray-100"
                      id={`task-row-${funnel}-${idx}`}
                    >
                      <div className="h-10 relative">
                        {/* Task segments - Using JavaScript for perfect alignment */}
                        {task.segments.map((segment, segmentIdx) => {
                          const position = getSegmentPosition(segment, timeRange);
                          const statusColor = statusColors[segment.status] || '#6B7280';
                          
                          return (
                            <div 
                              key={segmentIdx}
                              className="absolute cursor-pointer task-segment"
                              style={{ 
                                left: position.left, 
                                width: position.width,
                                zIndex: 10,
                                top: '-20px', // Moved even higher
                              }}
                              data-task-id={`${funnel}-${task.id}-${segmentIdx}`}
                              onMouseEnter={(e) => handleTaskMouseEnter(e, task, segment)}
                              onMouseLeave={() => setHoveredTask(null)}
                            >
                              {/* Line */}
                              <div 
                                className="h-2 rounded"
                                style={{ backgroundColor: funnelColor }}
                              ></div>
                              
                              {/* Status dot */}
                              <div 
                                className="absolute right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm transform translate-x-1.5 top-1/2 -translate-y-1/2"
                                style={{ backgroundColor: statusColor }}
                              ></div>
                            </div>
                          );
                        })}
                        
                        {/* Dotted connecting lines - ALSO MOVED UP */}
                        {task.segments.length > 1 && task.segments.map((segment, segmentIdx) => {
                          if (segmentIdx === task.segments.length - 1) return null;
                          
                          const nextSegment = task.segments[segmentIdx + 1];
                          const position = getConnectionPosition(segment, nextSegment, timeRange);
                          
                          return (
                            <div 
                              key={`connection-${segmentIdx}`}
                              className="absolute z-5 task-connection"
                              style={{ 
                                left: position.left, 
                                width: position.width,
                                top: '-20px', // Moved even higher
                                borderTop: `2px dotted ${funnelColor}`,
                                height: 0
                              }}
                              data-task-id={`${funnel}-${task.id}-connection-${segmentIdx}`}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            
            {/* Tooltip */}
            {renderTaskTooltip()}
          </div>
        </div>
      </div>
      
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
                  <span className="text-gray-700">{funnel}</span> {/* Darker gray text */}
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
      
      {/* JavaScript for task line alignment */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // This script runs after component mount to ensure perfect alignment
          document.addEventListener('DOMContentLoaded', function() {
            // Align task segments with their corresponding task names
            // This ensures perfect vertical alignment
            const taskSegments = document.querySelectorAll('.task-segment');
            const taskConnections = document.querySelectorAll('.task-connection');
            
            // Function to position task elements at the center of their task name
            function positionTaskElements() {
              // For each funnel
              const funnels = ${JSON.stringify(funnels)};
              funnels.forEach((funnel) => {
                // For each task in the funnel
                const taskRows = document.querySelectorAll('[id^="task-row-' + funnel + '"]');
                
                taskRows.forEach((taskRow, taskIdx) => {
                  // Get the task row's position
                  const taskRect = taskRow.getBoundingClientRect();
                  const taskCenter = taskRect.top + (taskRect.height / 2);
                  
                  // Find all segments for this task and position them
                  const segments = document.querySelectorAll('[data-task-id^="' + funnel + '-"][data-task-id$="-' + taskIdx + '"]');
                  segments.forEach(segment => {
                    // Position at the center of the task name
                    segment.style.top = (taskCenter - 5) + 'px'; // 5px offset for the line height
                    segment.style.transform = 'translateY(-50%)';
                  });
                  
                  // Find all connections for this task and position them
                  const connections = document.querySelectorAll('[data-task-id^="' + funnel + '-"][data-task-id*="-connection-"]');
                  connections.forEach(connection => {
                    // Position at the center of the task name
                    connection.style.top = (taskCenter - 5) + 'px'; // 5px offset for the line height
                    connection.style.transform = 'translateY(-50%)';
                  });
                });
              });
            }
            
            // Run the positioning function
            setTimeout(positionTaskElements, 100); // Small delay to ensure DOM is ready
            
            // Also run on window resize
            window.addEventListener('resize', positionTaskElements);
          });
        `
      }} />
    </div>
  );
};

export default GanttChart;