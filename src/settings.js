// File: src/settings.js

import { getGlobalContext, saveGlobalContext } from './db.js';
import { getApiKey, saveApiKey } from './key_manager.js';

let currentContext;

// DOM Elements
const settingsModal = document.getElementById('settings-modal');
const closeButton = settingsModal.querySelector('.close-button');
const saveButton = document.getElementById('save-settings-button');

// Form inputs
const userNameInput = document.getElementById('user-name-input');
const aiNameInput = document.getElementById('ai-name-input');
const userLocationInput = document.getElementById('user-location-input');
const apiKeyInput = document.getElementById('api-key-input');

// Saved Info elements
const savedInfoList = document.getElementById('saved-info-list');
const addInfoForm = document.getElementById('add-info-form');
const addInfoInput = document.getElementById('add-info-input');

// Long-Term Memory elements
const longTermMemoryList = document.getElementById('long-term-memory-list');

/**
 * Loads data from IndexedDB and populates the settings form.
 */
async function loadSettings() {
    currentContext = await getGlobalContext();
    const apiKey = getApiKey();

    // Populate general settings
    userNameInput.value = currentContext.user_name || '';
    aiNameInput.value = currentContext.ai_name || '';
    userLocationInput.value = currentContext.user_location || '';
    apiKeyInput.value = apiKey || '';

    // Populate saved info
    renderSavedInfo();
    // Populate long-term memory
    renderLongTermMemory();
}

/**
 * Renders the list of saved info items.
 */
function renderSavedInfo() {
    savedInfoList.innerHTML = '';
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

/**
 * Renders the list of long-term memory items.
 */
function renderLongTermMemory() {
    longTermMemoryList.innerHTML = '';
    currentContext.long_term_memory.memory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <span class="item-content"><b>${new Date(item.memory_saved_at).toLocaleDateString()}:</b> ${item.memory_content}</span>
            <button class="delete-button" data-index="${index}">&times;</button>
        `;
        longTermMemoryList.appendChild(div);
    });
}

/**
 * Saves all settings from the form back to IndexedDB.
 */
async function saveSettings() {
    // Update context object from inputs
    currentContext.user_name = userNameInput.value;
    currentContext.ai_name = aiNameInput.value;
    currentContext.user_location = userLocationInput.value;
    
    // Save API key separately in localStorage
    saveApiKey(apiKeyInput.value);

    // Save the entire context to IndexedDB
    await saveGlobalContext(currentContext);
    
    alert('Settings saved!');
    settingsModal.style.display = 'none';
}

/**
 * Initializes the settings panel, loading data and setting up event listeners.
 */
export function initSettings() {
    closeButton.onclick = () => settingsModal.style.display = 'none';
    saveButton.onclick = saveSettings;

    // Event listener for adding new "saved info"
    addInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newInfo = addInfoInput.value.trim();
        if (newInfo) {
            currentContext.saved_info.info.push(newInfo);
            addInfoInput.value = '';
            renderSavedInfo(); // Re-render the list
        }
    });

    // Event listener for deleting "saved info"
    savedInfoList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            currentContext.saved_info.info.splice(index, 1);
            renderSavedInfo(); // Re-render the list
        }
    });

    // Event listener for deleting "long-term memory"
    longTermMemoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            currentContext.long_term_memory.memory.splice(index, 1);
            renderLongTermMemory(); // Re-render the list
        }
    });
}

/**
 * Opens the settings modal and loads the latest data.
 */
export function openSettings() {
    settingsModal.style.display = 'flex';
    loadSettings();
}