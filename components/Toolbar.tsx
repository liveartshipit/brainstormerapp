import React from 'react';
import type { Tool } from '../types';
import { SELECT_ICON, CONNECT_ICON, UNDO_ICON, REDO_ICON } from '../constants';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ToolButton: React.FC<{
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, isActive = false, isDisabled = false, onClick, children }) => {
  const baseClasses = "p-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed";
  const activeClasses = "bg-blue-600 text-white shadow-lg scale-110";
  const inactiveClasses = "bg-white text-gray-600 hover:bg-blue-100 hover:text-blue-700";

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
};

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, undo, redo, canUndo, canRedo }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl p-2 flex items-center space-x-1 z-20">
      <div className="flex items-center space-x-1 border-r pr-1 mr-1">
        <ToolButton
          label="Undo"
          onClick={undo}
          isDisabled={!canUndo}
        >
          {UNDO_ICON}
        </ToolButton>
        <ToolButton
          label="Redo"
          onClick={redo}
          isDisabled={!canRedo}
        >
          {REDO_ICON}
        </ToolButton>
      </div>
       <div className="flex items-center space-x-1">
        <ToolButton
          label="Select & Move"
          isActive={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
        >
          {SELECT_ICON}
        </ToolButton>
        <ToolButton
          label="Connect Nodes"
          isActive={activeTool === 'connect'}
          onClick={() => setActiveTool('connect')}
        >
          {CONNECT_ICON}
        </ToolButton>
       </div>
    </div>
  );
};

export default Toolbar;