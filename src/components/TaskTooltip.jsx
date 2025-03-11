import React from 'react';
import { format } from 'date-fns';
import { statusColors } from './utils';

const TaskTooltip = ({ hoveredTask, tooltipPosition }) => {
  if (!hoveredTask) return null;
  
  const segment = hoveredTask.currentSegment;
  if (!segment) return null;
  
  // Format the statuses for a cleaner timeline display
  const formattedStatuses = hoveredTask.statuses.map((status) => ({
    ...status,
    formattedTime: format(status.time, 'HH:mm:ss')
  }));
  
  return (
    <div 
      className="fixed z-50 bg-white p-4 rounded-lg shadow-xl border border-gray-200 text-sm"
      style={{ 
        left: `${tooltipPosition.x + 10}px`, 
        top: `${tooltipPosition.y + 10}px`,
        maxWidth: '500px',
        minWidth: '450px'
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
      
      {/* Status Timeline */}
      <div className="mt-4">
        <p className="font-semibold mb-2">Status Timeline:</p>
        
        <div className="relative mt-2 mb-2 h-24">
          <div className="absolute left-0 right-0 h-0.5 bg-gray-300" style={{ top: '20px' }}></div>
          
          {formattedStatuses.map((status, idx) => {
            const position = ((status.time - formattedStatuses[0].time) / 
              (formattedStatuses[formattedStatuses.length - 1].time - formattedStatuses[0].time)) * 100;
            const nextStatus = formattedStatuses[idx + 1];
            
            return (
              <React.Fragment key={idx}>
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
                
                <div 
                  className="absolute text-xs font-medium text-center"
                  style={{ 
                    left: `${position}%`,
                    top: '0px',
                    transform: 'translateX(-50%)',
                    width: '80px'
                  }}
                >
                  {status.status}
                </div>
                
                <div 
                  className="absolute text-xs text-gray-500 text-center"
                  style={{ 
                    left: `${position}%`,
                    top: '35px',
                    transform: 'translateX(-50%)',
                    width: '80px'
                  }}
                >
                  {status.formattedTime}
                </div>
                
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

export default TaskTooltip;