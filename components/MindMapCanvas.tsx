import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Node, Connector, Idea, Tool, MindMapState, Task } from '../types';
import NodeContextMenu from './NodeContextMenu';
import ActionableTasksPanel from './ActionableTasksModal';
import { EXPORT_ICON, CLEAR_ICON, TASKS_ICON } from '../constants';
import { generateTasksFromMindMap } from '../services/geminiService';

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;

interface MindMapCanvasProps {
  nodes: Node[];
  connectors: Connector[];
  setMindMapState: (updater: (prevState: MindMapState) => MindMapState) => void;
  setNodes: (updater: (prevNodes: Node[]) => Node[]) => void;
  clearCanvas: () => void;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  onNodeDropped?: () => void;
}

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  connectors,
  setMindMapState,
  clearCanvas,
  activeTool,
  setActiveTool,
  setNodes,
  onNodeDropped,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connectingNode, setConnectingNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);


  const screenToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewTransform.x) / viewTransform.scale,
      y: (screenY - rect.top - viewTransform.y) / viewTransform.scale,
    };
  }, [viewTransform]);
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const ideaData = e.dataTransfer.getData('application/json');
    if (!ideaData) return;

    const idea: Idea = JSON.parse(ideaData);
    if (nodes.some(n => n.id === idea.id)) return;

    const { x: dropX, y: dropY } = screenToCanvasCoords(e.clientX, e.clientY);

    const tempEl = document.createElement('div');
    tempEl.innerText = idea.text;
    tempEl.style.cssText = 'position:absolute; visibility:hidden; white-space:pre-wrap; font-size:14px; font-weight:500; max-width:250px; padding:16px; line-height:1.2; box-sizing:border-box;';
    document.body.appendChild(tempEl);
    
    const width = tempEl.offsetWidth;
    const height = tempEl.offsetHeight;
    document.body.removeChild(tempEl);

    const newNode: Node = {
      ...idea,
      x: dropX - width / 2,
      y: dropY - height / 2,
      width, height,
      shape: 'rectangle', color: '#FFFFFF',
    };

    setMindMapState(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    onNodeDropped?.();
  };

  const updateNode = useCallback((id: string, data: Partial<Node>) => {
    setMindMapState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => (n.id === id ? { ...n, ...data } : n)),
    }));
  }, [setMindMapState]);

  const deleteNode = useCallback((id: string) => {
    setMindMapState(prev => ({
      nodes: prev.nodes.filter(n => n.id !== id),
      connectors: prev.connectors.filter(c => c.fromNodeId !== id && c.toNodeId !== id),
    }));
    setSelectedNodeId(null);
  }, [setMindMapState]);
  
  const handleNodeMouseDown = (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    if (activeTool !== 'select' || editingNodeId) return;
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const { x: cursorX, y: cursorY } = screenToCanvasCoords(e.clientX, e.clientY);
      setDraggingNode({ id: nodeId, offsetX: cursorX - node.x, offsetY: cursorY - node.y });
    }
    e.stopPropagation();
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      setSelectedNodeId(null);
      if (activeTool === 'connect') setConnectingNode(null);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setViewTransform(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
    if (draggingNode) {
      const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);
      const newX = x - draggingNode.offsetX;
      const newY = y - draggingNode.offsetY;
      setNodes(prevNodes => prevNodes.map(n => (n.id === draggingNode.id ? { ...n, x: newX, y: newY } : n)));
    }
  }, [isPanning, draggingNode, screenToCanvasCoords, setNodes]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      const finalNode = nodes.find(n => n.id === draggingNode.id);
      if (finalNode) {
        setMindMapState(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === draggingNode.id ? finalNode : n)}));
      }
    }
    setIsPanning(false);
    setDraggingNode(null);
  }, [draggingNode, nodes, setMindMapState]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);
    const scaleFactor = 1.1;
    const newScale = e.deltaY > 0 ? viewTransform.scale / scaleFactor : viewTransform.scale * scaleFactor;
    
    if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
      setViewTransform(prev => ({
        scale: newScale,
        x: prev.x + (x * prev.scale - x * newScale),
        y: prev.y + (y * prev.scale - y * newScale),
      }));
    }
  }, [screenToCanvasCoords, viewTransform.scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseMove, handleMouseUp, handleWheel]);

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedNodeId(nodeId);
    } else if (activeTool === 'connect') {
      if (!connectingNode) {
        setConnectingNode(nodeId);
      } else {
        if (connectingNode !== nodeId && !connectors.some(c => (c.fromNodeId === connectingNode && c.toNodeId === nodeId))) {
          const newConnector = { id: `${connectingNode}-${nodeId}-${Date.now()}`, fromNodeId: connectingNode, toNodeId: nodeId };
          setMindMapState(prev => ({...prev, connectors: [...prev.connectors, newConnector]}));
        }
        setConnectingNode(null);
        setActiveTool('select');
      }
    }
  };

  const handleNodeDoubleClick = (nodeId: string) => {
      setEditingNodeId(nodeId);
  }
  
  const handleFinishEditing = (nodeId: string, newText: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node || !newText.trim()) {
          setEditingNodeId(null);
          return;
      }
  
      const tempEl = document.createElement('div');
      tempEl.innerText = newText;
      tempEl.style.cssText = 'position:absolute; visibility:hidden; white-space:pre-wrap; font-size:14px; font-weight:500; max-width:250px; padding:16px; line-height:1.2; box-sizing:border-box;';
      document.body.appendChild(tempEl);
      
      const width = tempEl.offsetWidth;
      const height = tempEl.offsetHeight;
      document.body.removeChild(tempEl);
      
      updateNode(nodeId, { text: newText, width, height });
      setEditingNodeId(null);
  };
  
  const getNodeCenter = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  };

  const exportToSVG = () => {
    if (nodes.length === 0) {
      alert("Canvas is empty. Add some nodes to export.");
      return;
    }

    const PADDING = 50;
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const maxY = Math.max(...nodes.map(n => n.y + n.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const svgWidth = contentWidth + PADDING * 2;
    const svgHeight = contentHeight + PADDING * 2;
    const offsetX = -minX + PADDING;
    const offsetY = -minY + PADDING;

    const escapeHtml = (unsafe: string) => {
      return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
    }

    const nodesSVG = nodes.map(node => {
      let shapeSVG, textSVG;
      const nodeCenterX = node.x + offsetX + node.width / 2;
      const nodeCenterY = node.y + offsetY + node.height / 2;

      const textContainerStyle = `
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        font-family: sans-serif; font-size: 14px; font-weight: 500; color: #374151;
        text-align: center; line-height: 1.2; word-wrap: break-word; white-space: normal;
        padding: 16px; box-sizing: border-box;
      `;

      const diamondTextStyle = `
        transform: rotate(-45deg); 
        width: 141%; 
        height: 141%;
      `;
      
      const textContent = `
        <div xmlns="http://www.w3.org/1999/xhtml" style="${textContainerStyle} ${node.shape === 'diamond' ? diamondTextStyle : ''}">
          ${escapeHtml(node.text)}
        </div>
      `;

      if (node.shape === 'diamond') {
        shapeSVG = `<rect x="${node.x + offsetX}" y="${node.y + offsetY}" width="${node.width}" height="${node.height}" rx="0" fill="${node.color}" stroke="#6b7280" stroke-width="2" transform="rotate(45, ${nodeCenterX}, ${nodeCenterY})" />`;
      } else if (node.shape === 'ellipse') {
        shapeSVG = `<ellipse cx="${nodeCenterX}" cy="${nodeCenterY}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${node.color}" stroke="#6b7280" stroke-width="2" />`;
      } else { // rectangle
        shapeSVG = `<rect x="${node.x + offsetX}" y="${node.y + offsetY}" width="${node.width}" height="${node.height}" rx="12" fill="${node.color}" stroke="#6b7280" stroke-width="2" />`;
      }
      textSVG = `<foreignObject x="${node.x + offsetX}" y="${node.y + offsetY}" width="${node.width}" height="${node.height}">${textContent}</foreignObject>`;
      return shapeSVG + textSVG;
    }).join('');

    const connectorsSVG = connectors.map(conn => {
      const from = getNodeCenter(conn.fromNodeId);
      const to = getNodeCenter(conn.toNodeId);
      if (!from || !to) return '';
      return `<line x1="${from.x + offsetX}" y1="${from.y + offsetY}" x2="${to.x + offsetX}" y2="${to.y + offsetY}" stroke="#6b7280" stroke-width="2" marker-end="url(#arrowhead-export)" />`;
    }).join('');
    
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <defs>
          <marker id="arrowhead-export" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
        </defs>
        <g>${connectorsSVG}</g>
        <g>${nodesSVG}</g>
      </svg>
    `;

    const blob = new Blob([svgContent.trim()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mind-map.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleToggleTasksPanel = async () => {
    if (!isTasksPanelOpen && tasks.length === 0 && nodes.length > 0) {
      setIsTasksLoading(true);
      setIsTasksPanelOpen(true);
      const generatedTasks = await generateTasksFromMindMap({ nodes, connectors });
      setTasks(generatedTasks);
      setIsTasksLoading(false);
    } else {
      setIsTasksPanelOpen(prev => !prev);
    }
  };

  return (
    <div
      ref={canvasRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onMouseDown={handleCanvasMouseDown}
      className="flex-grow h-full w-full bg-gray-200/70 relative overflow-hidden select-none"
      style={{
        cursor: isPanning ? 'grabbing' : 'grab',
        backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <div className="absolute top-0 left-0" style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`, transformOrigin: '0 0' }}>
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: 99999, height: 99999, overflow: 'visible' }}>
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
              </marker>
            </defs>
            {connectors.map(connector => {
              const from = getNodeCenter(connector.fromNodeId);
              const to = getNodeCenter(connector.toNodeId);
              return <line key={connector.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />;
            })}
          </svg>
          {nodes.map(node => {
            const isEditing = editingNodeId === node.id;
            return (
                <div
                    key={node.id}
                    className={`absolute p-4 shadow-xl border-2 flex items-center justify-center transition-all duration-150 rounded-xl
                        ${activeTool === 'select' && !isEditing ? 'cursor-move' : ''}
                        ${activeTool === 'connect' ? 'cursor-pointer hover:border-blue-500 hover:scale-105' : ''}
                        ${connectingNode === node.id ? 'border-green-500 ring-2 ring-green-500 scale-105' : ''}
                        ${selectedNodeId === node.id ? 'border-blue-600 ring-2 ring-blue-500' : 'border-gray-300'}`
                    }
                    style={{
                        left: node.x, top: node.y, width: node.width, height: node.height,
                        backgroundColor: node.color,
                        transform: node.shape === 'diamond' ? 'rotate(45deg)' : 'none', zIndex: 10,
                    }}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => handleNodeClick(e, node.id)}
                    onDoubleClick={() => handleNodeDoubleClick(node.id)}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedNodeId(node.id); }}
                >
                    {isEditing ? (
                        <textarea
                            defaultValue={node.text}
                            onBlur={(e) => handleFinishEditing(node.id, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
                                if (e.key === 'Escape') { setEditingNodeId(null); }
                            }}
                            className={`node-editor ${node.shape === 'diamond' ? 'node-shape-diamond' : ''}`}
                            autoFocus
                        />
                    ) : (
                        <span className={`text-gray-800 text-sm font-medium ${node.shape === 'diamond' ? 'node-shape-diamond' : ''}`}>{node.text}</span>
                    )}
                </div>
            )}
          )}
      </div>

      {selectedNodeId && !editingNodeId && (
        <NodeContextMenu
            node={nodes.find(n => n.id === selectedNodeId)!}
            updateNode={updateNode}
            deleteNode={deleteNode}
        />
      )}

      <ActionableTasksPanel
        isOpen={isTasksPanelOpen}
        onClose={() => setIsTasksPanelOpen(false)}
        tasks={tasks}
        setTasks={setTasks}
        isLoading={isTasksLoading}
      />

      <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-10">
        <button
          onClick={clearCanvas}
          className="bg-white p-3 rounded-full shadow-lg text-red-500 hover:bg-red-600 hover:text-white transition-all duration-200 transform hover:scale-110"
          title="Clear Canvas"
        >
          {CLEAR_ICON}
        </button>
        <button
          onClick={exportToSVG}
          className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-110"
          title="Export as SVG"
        >
          {EXPORT_ICON}
        </button>
        <button
          onClick={handleToggleTasksPanel}
          className="bg-white p-3 rounded-full shadow-lg text-green-600 hover:bg-green-600 hover:text-white transition-all duration-200 transform hover:scale-110"
          title="Actionable Tasks"
        >
          {TASKS_ICON}
        </button>
      </div>
    </div>
  );
};

export default MindMapCanvas;