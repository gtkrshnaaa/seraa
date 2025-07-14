// File: src/app.js

import { initDB, getGlobalContext, saveGlobalContext, upsertSession, getLatestSession } from './db.js';
import { getApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
import { callGemini } from './api.js';
import { initSettings, openSettings } from './settings.js';

let currentSession = null;

const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const settingsIcon = document.getElementById('settings-icon');
const newChatButton = document.getElementById('new-chat-button');
const rememberButton = document.getElementById('remember-button');

document.addEventListener('DOMContentLoaded', main);

async function main() {
    await initDB();
    initSettings();
    
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('../service-worker.js');
            console.log('Service Worker registered successfully.');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    await loadOrCreateSession();

    if (!getApiKey()) {
        openSettings();
    }

    settingsIcon.addEventListener('click', openSettings);
    chatForm.addEventListener('submit', handleChatSubmit);
    newChatButton.addEventListener('click', startNewSession);
    rememberButton.addEventListener('click', handleRemember);

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });
}

async function loadOrCreateSession() {
    currentSession = await getLatestSession();
    if (!currentSession) {
        currentSession = createNewSessionObject();
    }
    renderSessionHistory();
}

function renderSessionHistory() {
    chatWindow.innerHTML = '';
    if (currentSession && currentSession.previous_interactions) {
        currentSession.previous_interactions.forEach(interaction => {
            addMessageToUI(interaction.input, 'user');
            addMessageToUI(interaction.response, 'ai');
        });
    }
}

function createNewSessionObject() {
    return {
        date_time: new Date().toISOString(),
        previous_interactions: []
    };
}

function startNewSession() {
    currentSession = createNewSessionObject();
    renderSessionHistory();
    chatInput.focus();
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    const apiKey = getApiKey();
    if (!apiKey) {
        openSettings();
        alert('Please set your Gemini API key in the settings.');
        return;
    }

    addMessageToUI(userInput, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';

    const loadingIndicator = addMessageToUI('...', 'ai');

    const globalContext = await getGlobalContext();
    const sessionData = {
        ...currentSession,
        current_input: userInput
    };

    const prompt = buildPrompt(globalContext, sessionData);
    const aiResponse = await callGemini(prompt, apiKey, globalContext.safety_settings);

    loadingIndicator.textContent = aiResponse;

    currentSession.previous_interactions.push({
        input: userInput,
        response: aiResponse
    });

    currentSession.id = await upsertSession(currentSession);
}

async function handleRemember() {
    if (!currentSession || currentSession.previous_interactions.length === 0) {
        alert("There's nothing to remember yet.");
        return;
    }

    rememberButton.textContent = 'Remembering...';
    rememberButton.disabled = true;

    try {
        const apiKey = getApiKey();
        const globalContext = await getGlobalContext();
        const conversationText = currentSession.previous_interactions
            .map(i => `User: ${i.input}\nAI: ${i.response}`)
            .join('\n\n');
        
        const summarizationPrompt = `Based on the following conversation, please provide a concise, one-sentence summary of the key insight or takeaway. Frame it from the user's perspective (e.g., "I learned that..." or "I realized...").\n\nConversation:\n---\n${conversationText}`;

        const summary = await callGemini(summarizationPrompt, apiKey, globalContext.safety_settings);

        globalContext.long_term_memory.memory.push({
            memory_saved_at: new Date().toISOString(),
            memory_content: summary
        });

        await saveGlobalContext(globalContext);
        alert(`Memory saved:\n"${summary}"`);

    } catch (error) {
        console.error("Failed to remember conversation:", error);
        alert("Sorry, there was an error trying to remember this conversation.");
    } finally {
        rememberButton.textContent = 'Remember';
        rememberButton.disabled = false;
    }
}

function addMessageToUI(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    messageElement.textContent = text;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
}