import React, { useState, useRef } from 'react';
import type { Idea } from '../types';
import { brainstormWithAI, extractIdeasFromImage } from '../services/geminiService';
import { SPARKLES_ICON, UPLOAD_ICON } from '../constants';

interface BrainstormPanelProps {
  ideas: Idea[];
  addIdea: (text: string) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (isOpen: boolean) => void;
}

const DraggableIdeaItem: React.FC<{ idea: Idea }> = ({ idea }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify(idea));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white p-3 mb-2 rounded-md shadow-sm cursor-grab active:cursor-grabbing border border-gray-200 hover:shadow-md hover:border-blue-400 transition-all"
    >
      <p className="text-gray-800 text-sm">{idea.text}</p>
    </div>
  );
};

const BrainstormPanel: React.FC<BrainstormPanelProps> = ({ ideas, addIdea, isPanelOpen, setIsPanelOpen }) => {
  const [newIdeaText, setNewIdeaText] = useState('');
  const [brainstormTopic, setBrainstormTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<Idea[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIdeaText.trim()) {
      addIdea(newIdeaText.trim());
      setNewIdeaText('');
    }
  };

  const handleBrainstorm = async () => {
    if (!brainstormTopic.trim()) return;
    setIsLoading(true);
    setGeneratedIdeas([]);
    const aiIdeas = await brainstormWithAI(brainstormTopic);
    setGeneratedIdeas(aiIdeas);
    setIsLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      if (base64String) {
        setIsLoading(true);
        setGeneratedIdeas([]);
        const aiIdeas = await extractIdeasFromImage(base64String, file.type);
        setGeneratedIdeas(aiIdeas);
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const addAllGeneratedIdeas = () => {
    generatedIdeas.forEach(idea => addIdea(idea.text));
    setGeneratedIdeas([]);
  };

  return (
    <aside className={`w-4/5 md:w-80 lg:w-96 bg-gray-50 p-4 border-r border-gray-200 flex flex-col h-full overflow-y-auto shrink-0 fixed md:relative inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${isPanelOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">Brainstorm Ideas</h2>
        <button onClick={() => setIsPanelOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">AI Assistant</h3>
        <div className="flex flex-col space-y-2">
           <input
            type="text"
            value={brainstormTopic}
            onChange={(e) => setBrainstormTopic(e.target.value)}
            placeholder="e.g., 'marketing for a new app'"
            className="p-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            disabled={isLoading}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleBrainstorm}
              disabled={isLoading || !brainstormTopic.trim()}
              className="flex items-center justify-center flex-grow bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
               <span className="mr-2">{SPARKLES_ICON}</span>
              )}
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Upload handwritten notes"
              className="flex items-center justify-center bg-gray-600 text-white font-semibold p-2 rounded-md hover:bg-gray-700 transition disabled:bg-gray-400"
            >
              <span className="mr-2">{UPLOAD_ICON}</span>
              Upload
            </button>
          </div>
        </div>
        {generatedIdeas.length > 0 && (
          <div className="mt-4">
             <div className="max-h-40 overflow-y-auto pr-2">
                {generatedIdeas.map(idea => (
                    <DraggableIdeaItem key={idea.id} idea={idea} />
                ))}
             </div>
             <button
                onClick={addAllGeneratedIdeas}
                className="w-full mt-2 bg-green-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-600 transition"
             >
                Add All to List
             </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-2">Add Manually</h3>
        <form onSubmit={handleAddIdea} className="flex space-x-2">
          <input
            type="text"
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            placeholder="Enter a new idea"
            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button type="submit" className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-800 transition text-xl">+</button>
        </form>
      </div>

      <h3 className="font-semibold text-gray-700 mb-2">Your Idea Box</h3>
      <div className="flex-grow bg-gray-200/50 p-2 rounded-lg overflow-y-auto border">
        {ideas.length === 0 ? (
          <p className="text-center text-gray-500 mt-4 p-4">Add or generate ideas to see them here. Then drag them to the canvas!</p>
        ) : (
          ideas.map(idea => <DraggableIdeaItem key={idea.id} idea={idea} />)
        )}
      </div>
    </aside>
  );
};

export default BrainstormPanel;