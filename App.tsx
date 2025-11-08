

import React, { useState, useCallback, useEffect } from 'react';
import BrainstormPanel from './components/BrainstormPanel';
import MindMapCanvas from './components/MindMapCanvas';
import Toolbar from './components/Toolbar';
import ApiKeyModal from './components/ApiKeyModal';
import type { Idea, Node, Connector, Tool, MindMapState, HistoryState } from './types';
import { MENU_ICON } from './constants';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const initialMindMapState: MindMapState = { nodes: [], connectors: [] };

const App: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 768);
  
  const [apiKey, setApiKey] = useState<string | null>(() => {
    try {
        return localStorage.getItem('gemini_api_key') || process.env.API_KEY || null;
    } catch (e) {
        return process.env.API_KEY || null;
    }
  });

  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialMindMapState,
    future: [],
  });

  const { nodes, connectors } = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  
  const handleResize = useCallback(() => {
    if (window.innerWidth >= 768) { // md breakpoint
      setIsPanelOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('mindMapState');
      if (savedState) {
        const parsedState: MindMapState = JSON.parse(savedState);
        setHistory({ past: [], present: parsedState, future: [] });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify(history.present);
      localStorage.setItem('mindMapState', stateToSave);
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [history.present]);

  const setMindMapState = useCallback((updater: (prevState: MindMapState) => MindMapState) => {
    setHistory(currentHistory => {
      const newPresent = updater(currentHistory.present);
      if (JSON.stringify(newPresent) === JSON.stringify(currentHistory.present)) {
        return currentHistory;
      }
      const newPast = [...currentHistory.past, currentHistory.present];
      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    });
  }, []);
  
  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistory(currentHistory => {
      const previous = currentHistory.past[currentHistory.past.length - 1];
      const newPast = currentHistory.past.slice(0, currentHistory.past.length - 1);
      const newFuture = [currentHistory.present, ...currentHistory.future];
      return {
        past: newPast,
        present: previous,
        future: newFuture,
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setHistory(currentHistory => {
      const next = currentHistory.future[0];
      const newFuture = currentHistory.future.slice(1);
      const newPast = [...currentHistory.past, currentHistory.present];
      return {
        past: newPast,
        present: next,
        future: newFuture,
      };
    });
  }, [canRedo]);
  
  const clearCanvas = useCallback(() => {
      if (window.confirm("Are you sure you want to clear the entire canvas? This action cannot be undone.")) {
        setMindMapState(() => initialMindMapState);
         // A second call to clear the history of the "clear" action itself
         setTimeout(() => {
            setHistory({ past: [], present: initialMindMapState, future: [] });
         }, 0)
      }
  }, [setMindMapState]);

  const addIdea = (text: string) => {
    if (ideas.some(idea => idea.text.toLowerCase() === text.toLowerCase())) return;
    const newIdea: Idea = { id: generateId(), text };
    setIdeas(prev => [...prev, newIdea]);
  };

  const handleSaveApiKey = (key: string) => {
      try {
          localStorage.setItem('gemini_api_key', key);
          setApiKey(key);
      } catch(e) {
          alert("Could not save API Key. Your browser might be in private mode or has storage disabled.");
      }
  };

  if (!apiKey) {
      return <ApiKeyModal onSave={handleSaveApiKey} />;
  }

  return (
    <div className="flex h-screen w-screen font-sans text-gray-900 bg-gray-100 overflow-hidden">
      <BrainstormPanel ideas={ideas} addIdea={addIdea} isPanelOpen={isPanelOpen} setIsPanelOpen={setIsPanelOpen} />
      <main className="flex-grow flex flex-col relative h-full">
        <button 
          onClick={() => setIsPanelOpen(true)}
          className="md:hidden absolute top-4 left-4 z-20 bg-white/70 backdrop-blur-sm p-2 rounded-lg shadow-lg text-gray-700 hover:bg-gray-200 transition-colors"
          aria-label="Open brainstorm panel"
        >
          {MENU_ICON}
        </button>

        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <MindMapCanvas
          nodes={nodes}
          // FIX: Pass a function that updates nodes without creating a history entry.
          setNodes={(updater) => setHistory(h => ({...h, present: {...h.present, nodes: updater(h.present.nodes)}}))}
          connectors={connectors}
          setMindMapState={setMindMapState}
          clearCanvas={clearCanvas}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onNodeDropped={() => {
            if (window.innerWidth < 768) {
              setIsPanelOpen(false);
            }
          }}
        />
      </main>
    </div>
  );
};

export default App;
