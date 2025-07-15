// File: src/sidebar.js

import { upsertSession, deleteSession } from './db.js';

const sessionList = document.getElementById('session-list');
let sessions = [];
let activeSessionId = null;
let callbacks = {};

export function initSidebar(initialSessions, initialActiveId, eventCallbacks) {
    sessions = initialSessions;
    activeSessionId = initialActiveId;
    callbacks = eventCallbacks;

    sessionList.addEventListener('click', handleSidebarClick);
    render();
}

export function updateSidebar(newSessions, newActiveId) {
    sessions = newSessions;
    if (newActiveId !== undefined) {
        activeSessionId = newActiveId;
    }
    render();
}

function render() {
    sessionList.innerHTML = '';
    
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

        const pinIcon = session.is_pinned ? '<i class="uil uil-thumbtack"></i>' : '';
        li.innerHTML = `
            <span class="session-name">${pinIcon} ${session.name}</span>
            <div class="session-actions">
                <button class="pin-btn" title="Pin Session"><i class="uil uil-map-pin"></i></button>
                <button class="rename-btn" title="Rename Session"><i class="uil uil-edit-alt"></i></button>
                <button class="delete-btn" title="Delete Session"><i class="uil uil-trash-alt"></i></button>
            </div>
        `;
        sessionList.appendChild(li);
    });
}

async function handleSidebarClick(e) {
    const button = e.target.closest('button');
    const li = e.target.closest('li[data-session-id]');
    
    if (!li) return;

    const sessionId = parseInt(li.dataset.sessionId, 10);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (button && button.classList.contains('delete-btn')) {
        if (confirm(`Are you sure you want to delete session "${session.name}"?`)) {
            await deleteSession(sessionId);
            callbacks.onSessionDelete(sessionId);
        }
    } else if (button && button.classList.contains('rename-btn')) {
        const newName = prompt("Enter new session name:", session.name);
        if (newName && newName.trim() !== "") {
            session.name = newName.trim();
            await upsertSession(session);
            render();
            if (session.id === activeSessionId) {
                callbacks.onSessionUpdate(session);
            }
        }
    } else if (button && button.classList.contains('pin-btn')) {
        session.is_pinned = !session.is_pinned;
        await upsertSession(session);
        render();
    } else {
        if (activeSessionId !== sessionId) {
            activeSessionId = sessionId;
            render();
            callbacks.onSessionSelect(sessionId);
        }
    }
}