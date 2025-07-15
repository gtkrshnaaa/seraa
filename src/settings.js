// File: src/settings.js

import { getGlobalContext, saveGlobalContext } from './db.js';
import { getApiKey, saveApiKey } from './key_manager.js';

let currentContext;

// DOM Elements
const settingsModal = document.getElementById('settings-modal');
const closeButton = settingsModal.querySelector('.close-button');
const saveButton = document.getElementById('save-settings-button');
const userNameInput = document.getElementById('user-name-input');
const aiNameInput = document.getElementById('ai-name-input');
const userLocationInput = document.getElementById('user-location-input');
const apiKeyInput = document.getElementById('api-key-input');
const safetySettingsSelect = document.getElementById('safety-settings-select');
const savedInfoList = document.getElementById('saved-info-list');
const addInfoForm = document.getElementById('add-info-form');
const addInfoInput = document.getElementById('add-info-input');
const longTermMemoryList = document.getElementById('ai-long-term-memory-list');

async function loadSettings() {
    currentContext = await getGlobalContext();
    const apiKey = getApiKey();

    userNameInput.value = currentContext.user_name || '';
    aiNameInput.value = currentContext.ai_name || '';
    userLocationInput.value = currentContext.user_location || '';
    apiKeyInput.value = apiKey || '';
    safetySettingsSelect.value = currentContext.safety_settings || 'BLOCK_MEDIUM_AND_ABOVE';

    renderSavedInfo();
    renderAILongTermMemory();
}

function renderSavedInfo() {
    savedInfoList.innerHTML = '';
    if (currentContext?.saved_info?.info) {
        currentContext.saved_info.info.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `
                <span class="item-content">${item}</span>
                <button class="delete-button" data-index="${index}">&times;</button>
            `;
            savedInfoList.appendChild(div);
        });
    }
}

function renderAILongTermMemory() {
    longTermMemoryList.innerHTML = '';
    if (currentContext?.ai_long_term_memory?.memory) {
        currentContext.ai_long_term_memory.memory.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `
                <span class="item-content"><b>${new Date(item.memory_saved_at).toLocaleDateString()}:</b> ${item.memory_content}</span>
                <button class="delete-button" data-index="${index}">&times;</button>
            `;
            longTermMemoryList.appendChild(div);
        });
    }
}

async function saveSettings() {
    currentContext.user_name = userNameInput.value;
    currentContext.ai_name = aiNameInput.value;
    currentContext.user_location = userLocationInput.value;
    currentContext.safety_settings = safetySettingsSelect.value;
    
    saveApiKey(apiKeyInput.value);
    await saveGlobalContext(currentContext);
    
    alert('Settings saved!');
    settingsModal.style.display = 'none';
}

export function initSettings() {
    closeButton.onclick = () => settingsModal.style.display = 'none';
    saveButton.onclick = saveSettings;

    addInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newInfo = addInfoInput.value.trim();
        if (newInfo) {
            currentContext.saved_info.info.push(newInfo);
            addInfoInput.value = '';
            renderSavedInfo();
        }
    });

    savedInfoList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            currentContext.saved_info.info.splice(index, 1);
            renderSavedInfo();
        }
    });

    longTermMemoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            currentContext.ai_long_term_memory.memory.splice(index, 1);
            renderAILongTermMemory();
        }
    });
}

export function openSettings() {
    settingsModal.style.display = 'flex';
    loadSettings();
}