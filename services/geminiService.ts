

import { GoogleGenAI, Type } from "@google/genai";
import type { Idea, MindMapState, Task } from '../types';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getApiKey = (): string | null => {
    // First, try to get the key from localStorage for the exported app
    try {
        const apiKeyFromStorage = localStorage.getItem('gemini_api_key');
        if (apiKeyFromStorage) {
            return apiKeyFromStorage;
        }
    } catch (e) {
        console.error("Could not access localStorage", e);
    }
    // Fallback to environment variable (for the development environment)
    const apiKeyFromEnv = process.env.API_KEY;
    if (apiKeyFromEnv) {
        return apiKeyFromEnv;
    }
    console.warn("API key not found in environment variables or localStorage.");
    return null;
};

const getMockIdeas = (topic: string): Promise<Idea[]> => {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: generateId(), text: `Mock idea about ${topic} 1` },
      { id: generateId(), text: `Mock idea about ${topic} 2` },
      { id: generateId(), text: `Mock idea about ${topic} 3` },
      { id: generateId(), text: `Mock idea about ${topic} 4` },
    ]), 1000));
}

export const brainstormWithAI = async (topic: string): Promise<Idea[]> => {
  if (!topic.trim()) return [];
  
  const apiKey = getApiKey();
  if (!apiKey) return getMockIdeas(topic);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Brainstorm a list of 5 to 7 concise, creative ideas or concepts related to "${topic}". Present them as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A single brainstormed idea."
          }
        },
      },
    });

    const ideaTexts: string[] = JSON.parse(response.text.trim());
    return Array.isArray(ideaTexts) ? ideaTexts.map(text => ({ id: generateId(), text })) : [];

  } catch (error) {
    console.error("Error brainstorming with AI:", error);
    return [];
  }
};

export const extractIdeasFromImage = async (imageData: string, mimeType: string): Promise<Idea[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return getMockIdeas('uploaded image');

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { text: "Extract the key ideas and concepts from this image of handwritten notes. Present them as a JSON array of strings." },
                    { inlineData: { data: imageData, mimeType } }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "A single extracted idea." }
                },
            },
        });
        const ideaTexts: string[] = JSON.parse(response.text.trim());
        return Array.isArray(ideaTexts) ? ideaTexts.map(text => ({ id: generateId(), text })) : [];
    } catch (error) {
        console.error("Error extracting ideas from image:", error);
        return [];
    }
};

export const generateTasksFromMindMap = async (mindMap: MindMapState): Promise<Task[]> => {
    if (mindMap.nodes.length === 0) return [];
    const apiKey = getApiKey();
    if (!apiKey) {
        return new Promise(resolve => setTimeout(() => resolve([
            { id: generateId(), text: 'Review mock task 1', completed: false, subtasks: [] },
            { id: generateId(), text: 'Finalize mock plan', completed: false, subtasks: [] },
        ]), 1000));
    }
    
    const mindMapDescription = `
      Here is a mind map structure. The nodes represent ideas or concepts, and the connectors represent relationships between them.
      
      Nodes:
      ${mindMap.nodes.map(n => `- Node "${n.id}": ${n.text}`).join('\n')}
      
      Connections:
      ${mindMap.connectors.map(c => `- Node "${c.fromNodeId}" is connected to Node "${c.toNodeId}"`).join('\n')}
    `;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the following mind map structure, generate a concise list of actionable tasks to bring these ideas to life. Present the tasks as a JSON array of objects, where each object has "text" (the task description) and "completed" (defaulting to false). \n\n${mindMapDescription}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING, description: "The actionable task description." },
                            completed: { type: Type.BOOLEAN, description: "Whether the task is completed." }
                        },
                        required: ["text", "completed"]
                    }
                },
            },
        });
        
        const tasks: Omit<Task, 'id' | 'subtasks'>[] = JSON.parse(response.text.trim());
        return Array.isArray(tasks) ? tasks.map(task => ({ ...task, id: generateId(), subtasks: [] })) : [];
    } catch (error) {
        console.error("Error generating tasks from mind map:", error);
        return [];
    }
};

export const breakdownTaskWithAI = async (taskText: string): Promise<Task[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        return new Promise(resolve => setTimeout(() => resolve([
            { id: generateId(), text: 'Sub-task 1', completed: false, subtasks: [] },
            { id: generateId(), text: 'Sub-task 2', completed: false, subtasks: [] },
        ]), 1000));
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Break down the following complex task into 3-5 smaller, actionable sub-tasks. Task: "${taskText}". Present the sub-tasks as a JSON array of objects, where each object has "text" (the sub-task description) and "completed" (defaulting to false).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            completed: { type: Type.BOOLEAN }
                        },
                        required: ["text", "completed"]
                    }
                },
            },
        });
        const subTaskData: Omit<Task, 'id' | 'subtasks'>[] = JSON.parse(response.text.trim());
        return Array.isArray(subTaskData) ? subTaskData.map(st => ({ ...st, id: generateId(), subtasks: [] })) : [];
    } catch (error) {
        console.error("Error breaking down task with AI:", error);
        return [];
    }
};
