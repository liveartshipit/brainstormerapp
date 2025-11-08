
import React, { useState } from 'react';
import { SPARKLES_ICON } from '../constants';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full transform transition-all scale-100">
        <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-blue-100 rounded-full mb-4">
               {React.cloneElement(SPARKLES_ICON, {className: "h-8 w-8 text-blue-600"})}
            </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AI Mind Mapper</h2>
          <p className="text-gray-600 mb-6">
            To unlock the AI features, please enter your Google Gemini API key. The key will be saved securely in your browser's local storage.
          </p>
          <div className="w-full">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API Key"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
             <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-3 inline-block"
            >
              Get your API Key from Google AI Studio &rarr;
            </a>
          </div>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full mt-6 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save & Start Brainstorming
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
