// File: src/app.js

import { initDB, getAllSessions, getGlobalContext, saveGlobalContext, upsertSession } from './db.js';
import { getApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
import { callGemini } from './api.js';
import { initSettings, openSettings } from './settings.js';
import { initSidebar, updateSidebar } from './sidebar.js';

// --- Global State ---
let activeSession = null;
let allSessions = [];

// --- DOM Elements ---
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sessionTitle = document.getElementById('session-title');
const newChatButton = document.getElementById('new-chat-button');
const rememberButton = document.getElementById('remember-button');
const settingsIcon = document.getElementById('settings-icon');
const sidebar = document.getElementById('sidebar');
const menuToggleButton = document.getElementById('menu-toggle-button');
const overlay = document.getElementById('overlay');


// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', main);

async function main() {
    await initDB();
    initSettings();
    
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered successfully.');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    allSessions = await getAllSessions();
    
    let sessionToLoad = getLatestSession(allSessions);
    if (!sessionToLoad) {
        sessionToLoad = await createNewSession();
    }
    
    initSidebar(allSessions, sessionToLoad.id, {
        onSessionSelect: (sessionId) => {
            loadSessionById(sessionId);
            closeSidebar();
        },
        onSessionDelete: handleSessionDeleted,
        onSessionUpdate: (session) => {
            if (session.id === activeSession.id) {
                sessionTitle.textContent = session.name;
            }
        }
    });

    loadSession(sessionToLoad);

    if (!getApiKey()) {
        openSettings();
    }
    
    // --- Event Listeners ---
    settingsIcon.addEventListener('click', openSettings);
    chatForm.addEventListener('submit', handleChatSubmit);
    newChatButton.addEventListener('click', handleNewChat);
    rememberButton.addEventListener('click', handleRemember);
    menuToggleButton.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
    
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });
}

// --- Responsive Sidebar Logic ---
function toggleSidebar() {
    sidebar.classList.toggle('sidebar-visible');
    overlay.classList.toggle('visible');
}

function closeSidebar() {
    sidebar.classList.remove('sidebar-visible');
    overlay.classList.remove('visible');
}

// --- Session Management ---

function getLatestSession(sessions) {
    if (!sessions || sessions.length === 0) return null;
    return sessions.reduce((latest, current) => new Date(latest.date_time) > new Date(current.date_time) ? latest : current);
}

async function createNewSession() {
    const newSession = {
        name: `Chat on ${new Date().toLocaleString()}`,
        date_time: new Date().toISOString(),
        is_pinned: false,
        previous_interactions: []
    };
    newSession.id = await upsertSession(newSession);
    allSessions.push(newSession);
    return newSession;
}

async function handleNewChat() {
    const newSession = await createNewSession();
    loadSession(newSession);
    updateSidebar(allSessions, newSession.id);
    closeSidebar();
}

function loadSession(session) {
    activeSession = session;
    chatWindow.innerHTML = '';
    sessionTitle.textContent = session.name;
    if (session.previous_interactions) {
        session.previous_interactions.forEach(interaction => {
            addMessageToUI(interaction.input, 'user');
            addMessageToUI(interaction.response, 'ai');
        });
    }
    chatInput.focus();
}

async function loadSessionById(sessionId) {
    const session = allSessions.find(s => s.id === sessionId);
    if (session) {
        loadSession(session);
    }
}

async function handleSessionDeleted(deletedId) {
    allSessions = allSessions.filter(s => s.id !== deletedId);
    if (activeSession.id === deletedId) {
        let sessionToLoad = getLatestSession(allSessions);
        if (!sessionToLoad) {
            sessionToLoad = await createNewSession();
        }
        loadSession(sessionToLoad);
    }
    updateSidebar(allSessions, activeSession.id);
}

// --- Chat & Memory Logic ---

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
    const sessionData = { ...activeSession, current_input: userInput };
    const prompt = buildPrompt(globalContext, sessionData);
    const aiResponse = await callGemini(prompt, apiKey, globalContext.safety_settings);

    // Update loading indicator with the real response
    const renderedHtml = DOMPurify.sanitize(marked.parse(aiResponse || ''));
    loadingIndicator.innerHTML = renderedHtml;

    activeSession.previous_interactions.push({
        input: userInput,
        response: aiResponse
    });
    
    if (activeSession.previous_interactions.length === 1) {
        const renamePrompt = `Based on this initial user prompt, create a very short title for this conversation (maximum 4-5 words). User Prompt: "${userInput}"`;
        activeSession.name = await callGemini(renamePrompt, apiKey, "BLOCK_NONE");
        sessionTitle.textContent = activeSession.name;
    }
    
    await upsertSession(activeSession);
    updateSidebar(allSessions, activeSession.id);
}

async function handleRemember() {
    const interactions = activeSession.previous_interactions;
    if (!interactions || interactions.length === 0) {
        alert("There's nothing to remember yet.");
        return;
    }

    rememberButton.textContent = 'Reflecting...';
    rememberButton.disabled = true;

    try {
        const apiKey = getApiKey();
        const globalContext = await getGlobalContext();
        
        // Take the last 10 interactions (or fewer if not available)
        const recentInteractions = interactions.slice(-10);
        const conversationExcerpt = recentInteractions
            .map(i => `User: ${i.input}\nAI: ${i.response}`)
            .join('\n\n');
        
        // The new, more reflective prompt
        const reflectionPrompt = `You are an AI assistant named ${globalContext.ai_name}. Your user is ${globalContext.user_name}.
Based *only* on the recent conversation excerpt below, formulate a single, insightful observation about the user or their current activity from your perspective as their AI companion.
Start your response with "I've noticed that..." or "I understand now that..." or a similar reflective phrase. Be concise.

---
RECENT CONVERSATION:
${conversationExcerpt}
---

Your reflection on the user:`;

        const reflection = await callGemini(reflectionPrompt, apiKey, globalContext.safety_settings);
        
        // Save the new reflection to the correct memory store
        globalContext.ai_long_term_memory.memory.push({
            memory_saved_at: new Date().toISOString(),
            memory_content: reflection
        });

        await saveGlobalContext(globalContext);
        alert(`New reflection saved:\n"${reflection}"`);

    } catch (error) {
        console.error("Failed to reflect on conversation:", error);
        alert("Sorry, there was an error trying to reflect on this conversation.");
    } finally {
        rememberButton.textContent = 'Remember';
        rememberButton.disabled = false;
    }
}

function addMessageToUI(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);

    const renderedHtml = DOMPurify.sanitize(marked.parse(text || ''));
    messageElement.innerHTML = renderedHtml;

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
}