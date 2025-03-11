import React, { useState } from 'react';
import { format } from 'date-fns';
import { funnelColors, statusColors } from './utils';
import TaskTooltip from './TaskTooltip';

const TaskTimeline = ({ funnels, tasksByFunnel, timeRange }) => {
  const [hoveredTask, setHoveredTask] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
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
  
  return (
    <div className="flex" style={{ borderTop: '1px solid #e5e7eb' }}>
      {/* Left sidebar for task names */}
      <div className="w-48 flex-shrink-0 border-r border-gray-200">
        {funnels.map((funnel, funnelIdx) => {
          const funnelTasks = tasksByFunnel[funnel] || [];
          return (
            <div key={funnelIdx}>
              <div className="py-2 px-3 font-medium bg-gray-50 border-b border-gray-200 flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: funnelColors[funnel] || '#95a5a6' }}
                ></div>
                <span className="text-gray-700">{funnel}</span>
              </div>
              
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
        {/* Vertical grid lines */}
        {timeRange.start && timeRange.end && Array.from({ length: 11 }).map((_, i) => {
          const position = `${(i / 10) * 100}%`;
          
          return (
            <div 
              key={`grid-line-${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-300"
              style={{ 
                left: position,
                height: '100%',
                zIndex: 1
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
                <div className="h-10 border-b border-gray-200"></div>
                
                {funnelTasks.map((task, idx) => (
                  <div 
                    key={idx} 
                    className="relative border-b border-gray-100"
                    id={`task-row-${funnel}-${idx}`}
                  >
                    <div className="h-10 relative">
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
                              top: '-20px',
                            }}
                            data-task-id={`${funnel}-${task.id}-${segmentIdx}`}
                            onMouseEnter={(e) => handleTaskMouseEnter(e, task, segment)}
                            onMouseLeave={() => setHoveredTask(null)}
                          >
                            <div 
                              className="h-2 rounded"
                              style={{ backgroundColor: funnelColor }}
                            ></div>
                            
                            <div 
                              className="absolute right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm transform translate-x-1.5 top-1/2 -translate-y-1/2"
                              style={{ backgroundColor: statusColor }}
                            ></div>
                          </div>
                        );
                      })}
                      
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
                              top: '-20px',
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
          
          {/* Use the TaskTooltip component */}
          <TaskTooltip 
            hoveredTask={hoveredTask} 
            tooltipPosition={tooltipPosition} 
          />
        </div>
      </div>
      
      {/* JavaScript for task line alignment */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            function positionTaskElements() {
              const funnels = ${JSON.stringify(funnels)};
              funnels.forEach((funnel) => {
                const taskRows = document.querySelectorAll('[id^="task-row-' + funnel + '"]');
                
                taskRows.forEach((taskRow, taskIdx) => {
                  const taskRect = taskRow.getBoundingClientRect();
                  const taskCenter = taskRect.top + (taskRect.height / 2);
                  
                  const segments = document.querySelectorAll('[data-task-id^="' + funnel + '-"][data-task-id$="-' + taskIdx + '"]');
                  segments.forEach(segment => {
                    segment.style.top = (taskCenter - 5) + 'px';
                    segment.style.transform = 'translateY(-50%)';
                  });
                  
                  const connections = document.querySelectorAll('[data-task-id^="' + funnel + '-"][data-task-id*="-connection-"]');
                  connections.forEach(connection => {
                    connection.style.top = (taskCenter - 5) + 'px';
                    connection.style.transform = 'translateY(-50%)';
                  });
                });
              });
            }
            
            setTimeout(positionTaskElements, 100);
            window.addEventListener('resize', positionTaskElements);
          });
        `
      }} />
    </div>
  );
};

export default TaskTimeline;