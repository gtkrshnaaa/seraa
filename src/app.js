// File: src/app.js
// Description: The main logic for the Seraa PWA, powered by Vue.js.
// This file handles UI state, user interactions, and orchestrates calls to the database and API.

import { initDB, getGlobalContext, saveGlobalContext, upsertSession, getAllSessions, deleteSession as dbDeleteSession } from './db.js';
import { getApiKey, saveApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
// We only need the non-streaming callGemini function now.
import { callGemini } from './api.js'; 

// Utility function to escape HTML characters for security.
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const { createApp, ref, reactive, toRefs, onMounted, computed, nextTick } = Vue;

// Helper to convert a Vue proxy object to a raw JavaScript object for database operations.
const toRawObject = (proxy) => {
    return JSON.parse(JSON.stringify(proxy));
};

const app = createApp({
    setup() {
        // Centralized state management for the application.
        const state = reactive({
            sessions: [],
            activeSession: null,
            globalContext: {},
            isSidebarVisible: false,
            isSettingsOpen: false,
            isTyping: false, // Used to show the typing indicator and disable inputs.
            isRemembering: false,
            chatInput: '',
            editableContext: null, // A temporary copy of globalContext for the settings modal.
            editableApiKey: '',
            newInfoText: '',
            deferredPrompt: null, // For PWA installation prompt.
        });

        // State for the message editing feature.
        const editingInteraction = ref(null);
        const editedText = ref('');

        // Template refs for direct DOM access.
        const chatWindow = ref(null);
        const chatInputRef = ref(null);
        const editInputRef = ref(null);

        // Renders markdown content and custom <CODE> tags into safe HTML.
        const renderMarkdown = (text) => {
            if (!text) return '';
            const codeBlocks = [];
            const codeBlockRegex = /<CODE language="(\w+)">([\s\S]*?)<\/CODE>/g;
            // First, replace custom code blocks with placeholders.
            let processedText = text.replace(codeBlockRegex, (match, language, code) => {
                const validLanguage = language || 'plaintext';
                const escapedCodeForAttribute = encodeURIComponent(code);
                const escapedCodeForDisplay = escapeHtml(code);
                const codeBlockHtml = `<div class="code-block-wrapper"><div class="code-block-header"><span>${validLanguage}</span><button class="code-block-copy-btn" data-code="${escapedCodeForAttribute}"><i class="uil uil-copy"></i></button></div><pre><code class="language-${validLanguage}">${escapedCodeForDisplay}</code></pre></div>`;
                codeBlocks.push(codeBlockHtml);
                return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
            });
            // Then, parse the remaining markdown.
            let markdownHtml = marked.parse(processedText);
            // Finally, re-insert the HTML code blocks and sanitize the final output.
            markdownHtml = markdownHtml.replace(/<p>%%CODE_BLOCK_(\d+)%%<\/p>|%%CODE_BLOCK_(\d+)%%/g, (match, index1, index2) => {
                const index = index1 || index2;
                return codeBlocks[parseInt(index)];
            });
            return DOMPurify.sanitize(markdownHtml, { ADD_TAGS: ["div", "span", "pre", "code", "i", "button"], ADD_ATTR: ['data-code', 'class', 'title'] });
        };

        // Handles clicks on the "copy" button within code blocks.
        const handleCopyClick = (event) => {
            const button = event.target.closest('.code-block-copy-btn');
            if (button) {
                const codeToCopy = decodeURIComponent(button.dataset.code);
                const textarea = document.createElement('textarea');
                textarea.value = codeToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                // Provide visual feedback on the button.
                const icon = button.querySelector('i');
                const originalIconClass = icon.className;
                icon.className = 'uil uil-check';
                setTimeout(() => { icon.className = originalIconClass; }, 2000);
            }
        };

        // Lifecycle hook that runs when the component is mounted.
        onMounted(() => {
            window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.deferredPrompt = e; });
            window.addEventListener('appinstalled', () => { state.deferredPrompt = null; });
            mainInit();
        });
        
        // Main initialization sequence.
        const mainInit = async () => {
            await initDB();
            if ('serviceWorker' in navigator) {
                try { await navigator.serviceWorker.register('service-worker.js'); console.log('Service Worker registered successfully.'); } catch (error) { console.error('Service Worker registration failed:', error); }
            }
            await loadInitialData();
            // Prompt user for API key if it's not set.
            if (!getApiKey()) { openSettings(); }
        };

        // Computed property to sort sessions, keeping pinned ones at the top.
        const sortedSessions = computed(() => {
            return [...state.sessions].sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                return new Date(b.date_time) - new Date(a.date_time);
            });
        });

        // Applies syntax highlighting to all code blocks in the chat window.
        const highlightAllCode = () => {
             nextTick(() => {
                if (!chatWindow.value) return;
                const codeBlocks = chatWindow.value.querySelectorAll('pre code');
                codeBlocks.forEach((block) => {
                    // Only highlight if it hasn't been highlighted before.
                    if (!block.classList.contains('hljs')) {
                        hljs.highlightElement(block);
                    }
                });
            });
        };

        // Scrolls the chat window to the bottom.
        const scrollToBottom = () => {
            nextTick(() => { if (chatWindow.value) { chatWindow.value.scrollTop = chatWindow.value.scrollHeight; } });
        };

        // UI utility functions.
        const toggleSidebar = () => { state.isSidebarVisible = !state.isSidebarVisible; };
        const autoResizeChatInput = () => { const el = chatInputRef.value; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } };
        const autoResizeEditInput = (event) => { const el = event.target; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } };
        const promptInstall = async () => { if (!state.deferredPrompt) return; state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; state.deferredPrompt = null; };

        // Loads global context and all sessions from the database.
        const loadInitialData = async () => {
            state.globalContext = await getGlobalContext();
            state.sessions = await getAllSessions();
            let sessionToLoad = state.sessions.length > 0 ? sortedSessions.value[0] : null;
            if (!sessionToLoad) { sessionToLoad = await createNewSession(false); }
            // Ensure each interaction has a unique ID for Vue's key binding.
            state.sessions.forEach(session => {
                session.previous_interactions.forEach((interaction, index) => { if (!interaction.id) { interaction.id = `interaction-${Date.now()}-${index}`; } });
            });
            selectSession(sessionToLoad.id);
        };

        // Creates a new chat session and saves it to the database.
        const createNewSession = async (select = true) => {
            const newSession = { name: `Chat on ${new Date().toLocaleString()}`, date_time: new Date().toISOString(), is_pinned: false, previous_interactions: [] };
            newSession.id = await upsertSession(newSession);
            state.sessions.push(newSession);
            if (select) { selectSession(newSession.id); state.isSidebarVisible = false; }
            return newSession;
        };
        
        // Sets the active session and updates the UI.
        const selectSession = (sessionId) => {
            const foundSession = state.sessions.find(s => s.id === sessionId);
            if (foundSession) {
                state.activeSession = foundSession;
                highlightAllCode();
                scrollToBottom();
            }
            state.isSidebarVisible = false;
        };

        // Session management functions.
        const renameSession = async (session) => {
            const newName = prompt("Enter new session name:", session.name);
            if (newName && newName.trim() !== "") { session.name = newName.trim(); await upsertSession(toRawObject(session)); }
        };

        const deleteSession = async (session) => {
            if (confirm(`Are you sure you want to delete session "${session.name}"?`)) {
                await dbDeleteSession(session.id);
                state.sessions = state.sessions.filter(s => s.id !== session.id);
                // If the active session was deleted, select another one or create a new one.
                if (state.activeSession && state.activeSession.id === session.id) {
                    if (state.sessions.length > 0) { selectSession(sortedSessions.value[0].id); } else { await createNewSession(); }
                }
            }
        };

        const togglePinSession = async (session) => { session.is_pinned = !session.is_pinned; await upsertSession(toRawObject(session)); };

        // Settings modal functions.
        const openSettings = () => { state.editableContext = toRawObject(state.globalContext); state.editableApiKey = getApiKey() || ''; state.isSettingsOpen = true; };
        const closeSettings = () => { state.isSettingsOpen = false; state.editableContext = null; };
        const saveSettings = async () => { state.globalContext = { ...state.editableContext }; saveApiKey(state.editableApiKey); await saveGlobalContext(toRawObject(state.globalContext)); alert('Settings saved!'); closeSettings(); };
        const addSavedInfo = () => { if (state.newInfoText.trim()) { state.editableContext.saved_info.info.push(state.newInfoText.trim()); state.newInfoText = ''; } };

        // --- THIS FUNCTION WAS REWRITTEN TO BE NON-STREAMING ---
        const handleChatSubmit = async (event, sourceType = 'submit') => {
            // Prevent submitting with Enter on mobile for a better UX.
            if (sourceType === 'enter' && window.innerWidth < 768) return;
            const userInput = state.chatInput.trim();
            if (!userInput || state.isTyping) return;

            const apiKey = getApiKey();
            if (!apiKey) {
                openSettings();
                alert('Please set your Gemini API key in the settings.');
                return;
            }
            
            // 1. Add user message to the UI immediately.
            const newInteraction = { id: `interaction-${Date.now()}`, input: userInput, response: '' };
            state.activeSession.previous_interactions.push(newInteraction);
            state.chatInput = '';
            nextTick(autoResizeChatInput);
            state.isTyping = true;
            scrollToBottom();
            
            // 2. Build the prompt and call the API.
            const sessionData = { ...toRawObject(state.activeSession), current_input: userInput };
            const prompt = buildPrompt(state.globalContext, sessionData);

            try {
                // Call the non-streaming API function.
                const aiResponse = await callGemini(prompt, apiKey, state.globalContext.safety_settings);
                newInteraction.response = aiResponse;

                // Auto-generate a title if this is the first message in the chat.
                if (state.activeSession.previous_interactions.length === 1) {
                    const renamePrompt = `Based on this initial user prompt, create a very short title for this conversation (maximum 4-5 words). User Prompt: "${userInput}"`;
                    const newTitle = await callGemini(renamePrompt, apiKey, state.globalContext.safety_settings);
                    state.activeSession.name = newTitle.replace(/"/g, '');
                }

            } catch (error) {
                console.error("Error during chat submission:", error);
                newInteraction.response = `**Error:** ${error.message}`;
            } finally {
                // 3. Finalize the UI update and save to DB.
                state.isTyping = false;
                scrollToBottom();
                highlightAllCode();
                await upsertSession(toRawObject(state.activeSession));
            }
        };
        
        // Handles the "Remember" button click to generate and save a long-term memory.
        const handleRemember = async () => {
            if (!state.activeSession || !state.activeSession.previous_interactions.length) { alert("There's nothing to remember yet."); return; }
            state.isRemembering = true;
            try {
                const apiKey = getApiKey();
                const recentInteractions = state.activeSession.previous_interactions.slice(-10);
                const conversationExcerpt = recentInteractions.map(i => `User: ${i.input}\nAI: ${i.response}`).join('\n\n');
                const reflectionPrompt = `Your name is ${state.globalContext.ai_name}. Your interlocutor is ${state.globalContext.user_name}.\nBased 4 until 10 conversation excerpt below, formulate a single, insightful observation about the user or their current activity from your perspective.\nStart your response with "I've noticed that..." or "I understand now that..." or a similar reflective phrase. Be concise. \nRemember specific things about your conversation partner, such as what he did, the feelings he experienced, etc., mention the name of the activity or experience explicitly.\n\n---\nRECENT CONVERSATION:\n${conversationExcerpt}\n---\n\nYour reflection on the user:`;
                const reflection = await callGemini(reflectionPrompt, apiKey, state.globalContext.safety_settings);
                state.globalContext.ai_long_term_memory.memory.push({ memory_saved_at: new Date().toISOString(), memory_content: reflection });
                await saveGlobalContext(toRawObject(state.globalContext));
                alert(`New reflection saved:\n"${reflection}"`);
            } catch (error) { console.error("Failed to reflect on conversation:", error); alert("Sorry, there was an error trying to reflect on this conversation."); } finally { state.isRemembering = false; }
        };

        // --- Message Editing Functions (also non-streaming) ---
        const startEditing = (interaction) => {
            editingInteraction.value = toRawObject(interaction);
            editedText.value = interaction.input;
            nextTick(() => { if (editInputRef.value) { editInputRef.value.focus(); autoResizeEditInput({ target: editInputRef.value }); } });
        };

        const cancelEditing = () => { editingInteraction.value = null; editedText.value = ''; };

        const submitEditedMessage = async () => {
            if (!editingInteraction.value || !editedText.value.trim()) { cancelEditing(); return; }
            if (state.isTyping) return;

            const newText = editedText.value.trim();
            const originalInteractionId = editingInteraction.value.id;
            const interactionIndex = state.activeSession.previous_interactions.findIndex(i => i.id === originalInteractionId);

            if (interactionIndex === -1) { console.error("Interaction to edit not found!"); cancelEditing(); return; }

            // "Time travel" logic: regenerate the conversation from the edited point.
            state.isTyping = true;
            // 1. Cut off history after the edited message.
            state.activeSession.previous_interactions.splice(interactionIndex + 1);
            // 2. Update the target interaction and clear its old response.
            const targetInteraction = state.activeSession.previous_interactions[interactionIndex];
            targetInteraction.input = newText;
            targetInteraction.response = '';
            
            cancelEditing(); // Exit the editing UI.
            scrollToBottom();

            // 3. Build a prompt with the now-truncated history.
            const sessionDataForPrompt = { ...toRawObject(state.activeSession), previous_interactions: state.activeSession.previous_interactions.slice(0, interactionIndex), current_input: newText };
            const prompt = buildPrompt(state.globalContext, sessionDataForPrompt);
            const apiKey = getApiKey();

            try {
                // 4. Call the API to get a new response for the edited message.
                const aiResponse = await callGemini(prompt, apiKey, state.globalContext.safety_settings);
                targetInteraction.response = aiResponse;
            } catch (error) {
                console.error("Error during message edit submission:", error);
                targetInteraction.response = `**Error:** ${error.message}`;
            } finally {
                // 5. Finalize UI update and save the new state.
                state.isTyping = false;
                scrollToBottom();
                highlightAllCode();
                await upsertSession(toRawObject(state.activeSession));
            }
        };

        // Expose state and methods to the template.
        return {
            ...toRefs(state),
            editingInteraction, editedText, editInputRef,
            startEditing, cancelEditing, submitEditedMessage, autoResizeEditInput,
            chatWindow, chatInputRef, sortedSessions, renderMarkdown, toggleSidebar,
            createNewSession, selectSession, renameSession, deleteSession, togglePinSession,
            openSettings, closeSettings, saveSettings, addSavedInfo, handleChatSubmit,
            handleRemember, autoResizeChatInput, promptInstall, handleCopyClick,
        };
    }
});

// Mount the Vue application to the DOM after the page has loaded.
window.addEventListener('load', () => { app.mount('#app'); });
