// File: src/app.js

import { initDB, getGlobalContext, saveGlobalContext, upsertSession, getAllSessions, deleteSession as dbDeleteSession } from './db.js';
import { getApiKey, saveApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
import { callGemini } from './api.js';

const { createApp, ref, reactive, toRefs, onMounted, computed, nextTick } = Vue;

const toRawObject = (proxy) => {
    return JSON.parse(JSON.stringify(proxy));
};

const app = createApp({
    setup() {
        const state = reactive({
            sessions: [],
            activeSession: null,
            globalContext: {},
            isSidebarVisible: false,
            isSettingsOpen: false,
            isTyping: false,
            isRemembering: false,
            chatInput: '',
            editableContext: null,
            editableApiKey: '',
            newInfoText: '',
        });

        const chatWindow = ref(null);

        const sortedSessions = computed(() => {
            return [...state.sessions].sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                return new Date(b.date_time) - new Date(a.date_time);
            });
        });
        
        onMounted(async () => {
            await initDB();
            if ('serviceWorker' in navigator) {
                try {
                    await navigator.serviceWorker.register('service-worker.js');
                    console.log('Service Worker registered successfully.');
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                }
            }
            await loadInitialData();
            if (!getApiKey()) {
                openSettings();
            }
        });

        const scrollToBottom = () => {
            nextTick(() => {
                if (chatWindow.value) {
                    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
                }
            });
        };

        const renderMarkdown = (text) => {
            return DOMPurify.sanitize(marked.parse(text || ''));
        };
        
        const toggleSidebar = () => {
            state.isSidebarVisible = !state.isSidebarVisible;
        };

        const loadInitialData = async () => {
            state.globalContext = await getGlobalContext();
            state.sessions = await getAllSessions();
            let sessionToLoad = state.sessions.length > 0
                ? sortedSessions.value[0]
                : null;
            
            if (!sessionToLoad) {
                sessionToLoad = await createNewSession(false);
            }
            selectSession(sessionToLoad.id);
        };

        const createNewSession = async (select = true) => {
            const newSession = {
                name: `Chat on ${new Date().toLocaleString()}`,
                date_time: new Date().toISOString(),
                is_pinned: false,
                previous_interactions: []
            };
            newSession.id = await upsertSession(newSession);
            state.sessions.push(newSession);
            if(select) {
               selectSession(newSession.id);
               state.isSidebarVisible = false;
            }
            return newSession;
        };
        
        const selectSession = (sessionId) => {
            const foundSession = state.sessions.find(s => s.id === sessionId);
            if(foundSession) {
                state.activeSession = foundSession;
                scrollToBottom();
            }
            state.isSidebarVisible = false;
        };

        const renameSession = async (session) => {
            const newName = prompt("Enter new session name:", session.name);
            if (newName && newName.trim() !== "") {
                session.name = newName.trim();
                // Convert proxy to raw object before saving
                await upsertSession(toRawObject(session));
            }
        };

        const deleteSession = async (session) => {
            if (confirm(`Are you sure you want to delete session "${session.name}"?`)) {
                await dbDeleteSession(session.id);
                state.sessions = state.sessions.filter(s => s.id !== session.id);
                if (state.activeSession && state.activeSession.id === session.id) {
                    if (state.sessions.length > 0) {
                        selectSession(sortedSessions.value[0].id);
                    } else {
                        await createNewSession();
                    }
                }
            }
        };

        const togglePinSession = async (session) => {
            session.is_pinned = !session.is_pinned;
            // FIX: Convert proxy to raw object before saving
            await upsertSession(toRawObject(session));
        };

        const openSettings = () => {
            state.editableContext = toRawObject(state.globalContext);
            state.editableApiKey = getApiKey() || '';
            state.isSettingsOpen = true;
        };

        const closeSettings = () => {
            state.isSettingsOpen = false;
            state.editableContext = null;
        };
        
        const saveSettings = async () => {
            state.globalContext = { ...state.editableContext };
            saveApiKey(state.editableApiKey);
            // FIX: Ensure the object saved is raw
            await saveGlobalContext(toRawObject(state.globalContext));
            alert('Settings saved!');
            closeSettings();
        };

        const addSavedInfo = () => {
            if (state.newInfoText.trim()) {
                state.editableContext.saved_info.info.push(state.newInfoText.trim());
                state.newInfoText = '';
            }
        };

        const handleChatSubmit = async () => {
            const userInput = state.chatInput.trim();
            if (!userInput || state.isTyping) return;

            const apiKey = getApiKey();
            if (!apiKey) {
                openSettings();
                alert('Please set your Gemini API key in the settings.');
                return;
            }
            
            state.activeSession.previous_interactions.push({ input: userInput, response: '' });
            state.chatInput = '';
            state.isTyping = true;
            scrollToBottom();
            
            const sessionData = { ...toRawObject(state.activeSession), current_input: userInput };
            const prompt = buildPrompt(state.globalContext, sessionData);
            const aiResponse = await callGemini(prompt, apiKey, state.globalContext.safety_settings);

            state.isTyping = false;
            state.activeSession.previous_interactions[state.activeSession.previous_interactions.length - 1].response = aiResponse;
            
            scrollToBottom();

            if (state.activeSession.previous_interactions.length === 1) {
                const renamePrompt = `Based on this initial user prompt, create a very short title for this conversation (maximum 4-5 words). User Prompt: "${userInput}"`;
                const newTitle = await callGemini(renamePrompt, apiKey, state.globalContext.safety_settings);
                state.activeSession.name = newTitle.replace(/"/g, ''); // Hapus tanda kutip jika ada
            }

            // Convert proxy to raw object before saving
            await upsertSession(toRawObject(state.activeSession));
        };
        
        const handleRemember = async () => {
            if (!state.activeSession || !state.activeSession.previous_interactions.length) {
                alert("There's nothing to remember yet.");
                return;
            }

            state.isRemembering = true;
            try {
                const apiKey = getApiKey();
                const recentInteractions = state.activeSession.previous_interactions.slice(-10);
                const conversationExcerpt = recentInteractions
                    .map(i => `User: ${i.input}\nAI: ${i.response}`)
                    .join('\n\n');
                
                const reflectionPrompt = `Your name is ${state.globalContext.ai_name}. Your interlocutor is ${state.globalContext.user_name}.
Based 4 until 10 conversation excerpt below, formulate a single, insightful observation about the user or their current activity from your perspective.
Start your response with "I've noticed that..." or "I understand now that..." or a similar reflective phrase. Be concise. 
Remember specific things about your conversation partner, such as what he did, the feelings he experienced, etc., mention the name of the activity or experience explicitly.

---
RECENT CONVERSATION:
${conversationExcerpt}
---

Your reflection on the user:`;

                const reflection = await callGemini(reflectionPrompt, apiKey, state.globalContext.safety_settings);
                
                state.globalContext.ai_long_term_memory.memory.push({
                    memory_saved_at: new Date().toISOString(),
                    memory_content: reflection
                });

                // FIX: Convert proxy to raw object before saving
                await saveGlobalContext(toRawObject(state.globalContext));
                alert(`New reflection saved:\n"${reflection}"`);

            } catch (error) {
                console.error("Failed to reflect on conversation:", error);
                alert("Sorry, there was an error trying to reflect on this conversation.");
            } finally {
                state.isRemembering = false;
            }
        };

        return {
            ...toRefs(state),
            chatWindow,
            sortedSessions,
            renderMarkdown,
            toggleSidebar,
            createNewSession,
            selectSession,
            renameSession,
            deleteSession,
            togglePinSession,
            openSettings,
            closeSettings,
            saveSettings,
            addSavedInfo,
            handleChatSubmit,
            handleRemember,
        };
    }
});

window.addEventListener('load', () => {
    app.mount('#app');
});