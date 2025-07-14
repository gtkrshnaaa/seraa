// File: src/app.js

import { initDB, getGlobalContext, saveSession } from './db.js';
import { getApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
import { callGemini } from './api.js';
import { initSettings, openSettings } from './settings.js';

document.addEventListener('DOMContentLoaded', main);

async function main() {
    // 1. Initialize Database
    await initDB();

    // 2. Initialize Settings Panel (but don't show it yet)
    initSettings();

    // 3. Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('../service-worker.js');
            console.log('Service Worker registered successfully.');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    // 4. Check for API Key on first load
    if (!getApiKey()) {
        openSettings(); // Open the full settings panel if no API key
    }

    // UI Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const settingsIcon = document.getElementById('settings-icon');

    // Open settings modal when icon is clicked
    settingsIcon.addEventListener('click', openSettings);

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            // Re-open settings if API key is suddenly missing
            openSettings();
            alert('Please set your Gemini API key in the settings.');
            return;
        }

        addMessageToUI(userInput, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const loadingIndicator = addMessageToUI('...', 'ai');

        const globalContext = await getGlobalContext();
        
        let currentSession = {
            previous_interactions: [] // In a real app, you'd load this from db
        };
        currentSession.current_input = userInput;

        const prompt = buildPrompt(globalContext, currentSession);
        const aiResponse = await callGemini(prompt, apiKey);

        loadingIndicator.textContent = aiResponse;
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
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
}