// File: src/sidebar.js

import { upsertSession, deleteSession } from './db.js';

const sessionList = document.getElementById('session-list');
let sessions = [];
let activeSessionId = null;
let callbacks = {};

/**
 * Initializes the sidebar module.
 * @param {Array} initialSessions - The initial list of sessions from the DB.
 * @param {Number} initialActiveId - The ID of the initially active session.
 * @param {Object} eventCallbacks - Callbacks for events like session selection.
 */
export function initSidebar(initialSessions, initialActiveId, eventCallbacks) {
    sessions = initialSessions;
    activeSessionId = initialActiveId;
    callbacks = eventCallbacks;

    sessionList.addEventListener('click', handleSidebarClick);
    render();
}

/**
 * Updates the sidebar with a new list of sessions and active ID.
 */
export function updateSidebar(newSessions, newActiveId) {
    sessions = newSessions;
    if (newActiveId !== undefined) {
        activeSessionId = newActiveId;
    }
    render();
}

/**
 * Renders the session list in the sidebar.
 */
function render() {
    sessionList.innerHTML = '';
    
    // Sort sessions: pinned first, then by date descending
    sessions.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.date_time) - new Date(a.date_time);
    });

    if (sessions.length === 0) {
        sessionList.innerHTML = `<li style="padding: 1rem; color: var(--secondary-text);">No sessions yet.</li>`;
        return;
    }

    sessions.forEach(session => {
        const li = document.createElement('li');
        li.dataset.sessionId = session.id;
        li.className = session.id === activeSessionId ? 'active' : '';
        li.title = session.name;

        li.innerHTML = `
            <span class="session-name">${session.is_pinned ? '📌' : ''} ${session.name}</span>
            <div class="session-actions">
                <button class="pin-btn" title="Pin Session">📌</button>
                <button class="rename-btn" title="Rename Session">✏️</button>
                <button class="delete-btn" title="Delete Session">🗑️</button>
            </div>
        `;
        sessionList.appendChild(li);
    });
}

/**
 * Handles all click events within the sidebar list using event delegation.
 */
async function handleSidebarClick(e) {
    const li = e.target.closest('li[data-session-id]');
    if (!li) return;

    const sessionId = parseInt(li.dataset.sessionId, 10);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (e.target.classList.contains('delete-btn')) {
        if (confirm(`Are you sure you want to delete session "${session.name}"?`)) {
            await deleteSession(sessionId);
            callbacks.onSessionDelete(sessionId);
        }
    } else if (e.target.classList.contains('rename-btn')) {
        const newName = prompt("Enter new session name:", session.name);
        if (newName && newName.trim() !== "") {
            session.name = newName.trim();
            await upsertSession(session);
            render();
            if (session.id === activeSessionId) {
                callbacks.onSessionUpdate(session);
            }
        }
    } else if (e.target.classList.contains('pin-btn')) {
        session.is_pinned = !session.is_pinned;
        await upsertSession(session);
        render();
    } else {
        // Clicked on the session item itself to select it
        if (activeSessionId !== sessionId) {
            activeSessionId = sessionId;
            render();
            callbacks.onSessionSelect(sessionId);
        }
    }
}