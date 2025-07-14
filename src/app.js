import { initDB, getGlobalContext, saveSession } from './db.js';
import { getApiKey, saveApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
import { callGemini } from './api.js';

document.addEventListener('DOMContentLoaded', main);

async function main() {
    // 1. Initialize Database
    await initDB();

    // 2. Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./service-worker.js');
            console.log('Service Worker registered successfully.');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    // 3. Check for API Key
    const apiKeyModal = document.getElementById('api-key-modal');
    if (!getApiKey()) {
        apiKeyModal.style.display = 'flex';
    }

    document.getElementById('save-api-key-button').addEventListener('click', () => {
        const key = document.getElementById('api-key-input').value;
        if (key) {
            saveApiKey(key);
            apiKeyModal.style.display = 'none';
        }
    });

    // UI Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');

    // State management
    let currentSession = {
        date_time: new Date().toISOString(),
        previous_interactions: []
    };

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            alert('Please set your Gemini API key in the settings.');
            apiKeyModal.style.display = 'flex';
            return;
        }

        // Display user message
        addMessageToUI(userInput, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Add loading indicator
        const loadingIndicator = addMessageToUI('...', 'ai');

        // Prepare data for prompt
        const globalContext = await getGlobalContext();
        currentSession.current_input = userInput;

        // Build the prompt and call API
        const prompt = buildPrompt(globalContext, currentSession);
        const aiResponse = await callGemini(prompt, apiKey);

        // Update UI with AI response
        loadingIndicator.textContent = aiResponse;

        // Update session history
        currentSession.previous_interactions.push({
            input: userInput,
            response: aiResponse
        });

        // Save the session (optional for now, can be expanded)
        // await saveSession(currentSession);
    });
    
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });
}

function addMessageToUI(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    messageElement.textContent = text;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
    return messageElement;
}