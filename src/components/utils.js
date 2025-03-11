import { format } from 'date-fns';

// Define funnel colors with the specific scheme requested
export const funnelColors = {
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
export const statusColors = {
  NEW: '#FFCC00',         // Yellow
  'TO DO': '#ef4444',     // Red
  IN_PROGRESS: '#f97316', // Orange
  COMPLETED: '#16a34a',   // Green
  PENDING: '#f59e0b',     // Amber
  FAILED: '#ef4444',      // Red
  INITIATED: '#3B82F6',   // Blue
};

export const processDataForChart = (funnelGroups) => {
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