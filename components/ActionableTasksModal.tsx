import React, { useState } from 'react';
import type { Task } from '../types';
import { DELETE_ICON, SPARKLES_ICON, CSV_EXPORT_ICON } from '../constants';
import { breakdownTaskWithAI } from '../services/geminiService';

interface ActionableTasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  isLoading: boolean;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// --- Recursive Task State Updaters ---

const updateTaskInTree = (tasks: Task[], id: string, props: Partial<Omit<Task, 'id' | 'subtasks'>>): Task[] => {
    return tasks.map(task => {
        if (task.id === id) return { ...task, ...props };
        if (task.subtasks) return { ...task, subtasks: updateTaskInTree(task.subtasks, id, props) };
        return task;
    });
};

const addSubtasksInTree = (tasks: Task[], id: string, newSubtasks: Task[]): Task[] => {
    return tasks.map(task => {
        if (task.id === id) return { ...task, subtasks: [...task.subtasks, ...newSubtasks] };
        if (task.subtasks) return { ...task, subtasks: addSubtasksInTree(task.subtasks, id, newSubtasks) };
        return task;
    });
};

const deleteTaskInTree = (tasks: Task[], id: string): Task[] => {
    return tasks.filter(task => task.id !== id).map(task => {
        if (task.subtasks) return { ...task, subtasks: deleteTaskInTree(task.subtasks, id) };
        return task;
    });
};


const TaskItem: React.FC<{ 
  task: Task;
  level: number;
  handleUpdate: (id: string, props: Partial<Omit<Task, 'id' | 'subtasks'>>) => void;
  handleDelete: (id: string) => void;
  handleAddSubtasks: (id: string, subtasks: Task[]) => void;
}> = ({ task, level, handleUpdate, handleDelete, handleAddSubtasks }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const onUpdateText = () => {
    if (editText.trim()) {
      handleUpdate(task.id, { text: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleBreakdown = async () => {
      setIsBreakingDown(true);
      const newSubtasks = await breakdownTaskWithAI(task.text);
      if (newSubtasks.length > 0) {
          handleAddSubtasks(task.id, newSubtasks);
      }
      setIsBreakingDown(false);
  };

  return (
    <div style={{ marginLeft: `${level * 20}px` }}>
      <div className="flex items-center space-x-2 p-2 group hover:bg-gray-100 rounded-md">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => handleUpdate(task.id, { completed: !task.completed })}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
        />
        <div className="flex-grow">
          {isEditing ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={onUpdateText}
              onKeyDown={(e) => e.key === 'Enter' && onUpdateText()}
              className="w-full px-1 py-0.5 border-b-2 border-blue-500 focus:outline-none bg-transparent"
              autoFocus
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditing(true)}
              className={`text-gray-800 text-sm cursor-pointer ${task.completed ? 'line-through text-gray-500' : ''}`}
            >
              {task.text}
            </span>
          )}
        </div>
        <input 
          type="text"
          placeholder="Assignee"
          defaultValue={task.assignee}
          onBlur={(e) => handleUpdate(task.id, { assignee: e.target.value })}
          className="text-xs border-b bg-transparent w-24 px-1 focus:border-blue-500 outline-none hidden group-hover:block"
        />
        <input 
          type="date"
          defaultValue={task.dueDate}
          onBlur={(e) => handleUpdate(task.id, { dueDate: e.target.value })}
          className="text-xs border-b bg-transparent w-28 px-1 focus:border-blue-500 outline-none hidden group-hover:block"
        />
        <button onClick={handleBreakdown} disabled={isBreakingDown} className="text-gray-400 hover:text-blue-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Break down into sub-tasks">
            {isBreakingDown ? (
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            ) : SPARKLES_ICON }
        </button>
        <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          {DELETE_ICON}
        </button>
      </div>
      {task.subtasks?.map(subtask => (
        <TaskItem key={subtask.id} task={subtask} level={level + 1} handleUpdate={handleUpdate} handleDelete={handleDelete} handleAddSubtasks={handleAddSubtasks} />
      ))}
    </div>
  );
};


const ActionableTasksPanel: React.FC<ActionableTasksPanelProps> = ({ isOpen, onClose, tasks, setTasks, isLoading }) => {
  const [newTaskText, setNewTaskText] = useState('');
  
  const addTask = (text: string) => {
    if (!text.trim()) return;
    const newTask: Task = { id: generateId(), text: text.trim(), completed: false, subtasks: [] };
    setTasks(prev => [...prev, newTask]);
  };
  
  const handleUpdate = (id: string, props: Partial<Omit<Task, 'id' | 'subtasks'>>) => {
      setTasks(currentTasks => updateTaskInTree(currentTasks, id, props));
  };
  
  const handleDelete = (id: string) => {
      setTasks(currentTasks => deleteTaskInTree(currentTasks, id));
  };
  
  const handleAddSubtasks = (id: string, newSubtasks: Task[]) => {
      setTasks(currentTasks => addSubtasksInTree(currentTasks, id, newSubtasks));
  };

  const handleExportToCSV = () => {
    const headers = ['Task ID', 'Parent Task ID', 'Task Description', 'Assignee', 'Due Date', 'Status'];
    const rows: string[][] = [];

    const processTask = (task: Task, parentId: string | null = null) => {
      rows.push([
        task.id,
        parentId || '',
        `"${task.text.replace(/"/g, '""')}"`,
        task.assignee || '',
        task.dueDate || '',
        task.completed ? 'Completed' : 'Pending'
      ]);
      task.subtasks.forEach(subtask => processTask(subtask, task.id));
    };
    tasks.forEach(task => processTask(task));

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'actionable-tasks.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
        className="fixed bottom-0 left-0 right-0 lg:left-96 bg-white/80 backdrop-blur-md shadow-[0_-5px_15px_-3px_rgba(0,0,0,0.1)] z-30 flex flex-col transition-transform duration-300 ease-in-out"
        style={{ 
            height: '45vh',
            transform: isOpen ? 'translateY(0%)' : 'translateY(100%)',
        }}
    >
      <header className="p-3 border-b flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold text-gray-800">Actionable Tasks</h2>
        <div className="flex items-center space-x-2">
            <button onClick={handleExportToCSV} title="Export to CSV" className="p-2 text-gray-600 hover:bg-gray-200 hover:text-blue-600 rounded-full">
                {CSV_EXPORT_ICON}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        </div>
      </header>
      <div className="p-4 flex-grow overflow-y-auto">
        {isLoading ? (
           <div className="flex justify-center items-center h-full">
              <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
           </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-1">
            {tasks.map(task => (
              <TaskItem key={task.id} task={task} level={0} handleUpdate={handleUpdate} handleDelete={handleDelete} handleAddSubtasks={handleAddSubtasks} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-4">No tasks generated yet. Your AI-generated task list will appear here.</p>
        )}
      </div>
      <footer className="p-3 border-t shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { addTask(newTaskText); setNewTaskText(''); } }}
            placeholder="Add a new task..."
            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            onClick={() => { addTask(newTaskText); setNewTaskText(''); }}
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            Add Task
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ActionableTasksPanel;