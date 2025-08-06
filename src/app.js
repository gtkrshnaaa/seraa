import { initDB, getGlobalContext, saveGlobalContext, upsertSession, getAllSessions, deleteSession as dbDeleteSession } from './db.js';
import { getApiKey, saveApiKey } from './key_manager.js';
import { buildPrompt } from './context_builder.js';
import { callGemini } from './api.js';

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
            deferredPrompt: null,
        });

        const chatWindow = ref(null);
        const chatInputRef = ref(null);

        const renderMarkdown = (text) => {
            if (!text) return '';
            
            // Regex untuk menemukan tag <CODE>...</CODE>
            const codeBlockRegex = /<CODE language="(\w+)">([\s\S]*?)<\/CODE>/g;
            
            // Mengganti blok kode dengan struktur HTML yang diinginkan
            let processedText = text.replace(codeBlockRegex, (match, language, code) => {
                const validLanguage = language || 'plaintext';
                const escapedCodeForAttribute = encodeURIComponent(code);
                const escapedCodeForDisplay = escapeHtml(code);

                return `
                    <div class="code-block-wrapper">
                        <div class="code-block-header">
                            <span>${validLanguage}</span>
                            <button class="code-block-copy-btn" data-code="${escapedCodeForAttribute}">
                                <i class="uil uil-copy"></i>
                                <span>Copy</span>
                            </button>
                        </div>
                        <pre><code class="language-${validLanguage}">${escapedCodeForDisplay}</code></pre>
                    </div>
                `;
            });

            // Mengganti newline dengan <br> untuk teks di luar blok kode
            const parts = processedText.split(/(<div class="code-block-wrapper">[\s\S]*?<\/div>)/g);
            const finalParts = parts.map(part => {
                if (part.startsWith('<div class="code-block-wrapper">')) {
                    return part; // Biarkan blok kode apa adanya
                }
                // Untuk teks biasa, ganti newline dan proses dengan marked
                let plainText = part.replace(/\n/g, '<br>');
                return DOMPurify.sanitize(marked.parse(plainText));
            });
            
            return finalParts.join('');
        };

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

                const originalText = button.querySelector('span').textContent;
                button.querySelector('span').textContent = 'Copied!';
                setTimeout(() => {
                    button.querySelector('span').textContent = originalText;
                }, 2000);
            }
        };

        // ... (Semua fungsi dari onMounted hingga addSavedInfo tetap sama persis)
        onMounted(() => {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                state.deferredPrompt = e;
            });
            window.addEventListener('appinstalled', () => {
                state.deferredPrompt = null;
            });
            mainInit();
        });
        
        const mainInit = async () => {
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
        };

        const sortedSessions = computed(() => {
            return [...state.sessions].sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                return new Date(b.date_time) - new Date(a.date_time);
            });
        });

        const scrollToBottom = () => {
            nextTick(() => {
                if (chatWindow.value) {
                    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
                }
            });
        };

        const toggleSidebar = () => {
            state.isSidebarVisible = !state.isSidebarVisible;
        };

        const autoResizeChatInput = () => {
            const el = chatInputRef.value;
            if (el) {
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
            }
        };

        const promptInstall = async () => {
            if (!state.deferredPrompt) return;
            state.deferredPrompt.prompt();
            await state.deferredPrompt.userChoice;
            state.deferredPrompt = null;
        };

        const loadInitialData = async () => {
            state.globalContext = await getGlobalContext();
            state.sessions = await getAllSessions();
            let sessionToLoad = state.sessions.length > 0 ? sortedSessions.value[0] : null;
            
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
            if (select) {
                selectSession(newSession.id);
                state.isSidebarVisible = false;
            }
            return newSession;
        };
        
        const selectSession = (sessionId) => {
            const foundSession = state.sessions.find(s => s.id === sessionId);
            if (foundSession) {
                state.activeSession = foundSession;
                // Panggil highlight.js untuk sesi yang ada saat dimuat
                nextTick(() => {
                    const codeBlocks = chatWindow.value.querySelectorAll('pre code');
                    codeBlocks.forEach((block) => {
                        hljs.highlightElement(block);
                    });
                    scrollToBottom();
                });
            }
            state.isSidebarVisible = false;
        };

        const renameSession = async (session) => {
            const newName = prompt("Enter new session name:", session.name);
            if (newName && newName.trim() !== "") {
                session.name = newName.trim();
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


        const handleChatSubmit = async (event, sourceType = 'submit') => {
            if (sourceType === 'enter' && window.innerWidth < 768) {
                return;
            }
            
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
            nextTick(autoResizeChatInput);
            state.isTyping = true;
            scrollToBottom();
            
            const sessionData = { ...toRawObject(state.activeSession), current_input: userInput };
            const prompt = buildPrompt(state.globalContext, sessionData);
            const aiResponse = await callGemini(prompt, apiKey, state.globalContext.safety_settings);

            state.isTyping = false;
            state.activeSession.previous_interactions[state.activeSession.previous_interactions.length - 1].response = aiResponse;
            
            // === INI BAGIAN OPTIMASINYA ===
            // Setelah respons diterima dan DOM diperbarui oleh Vue...
            nextTick(() => {
                // ...cari blok kode terakhir yang baru ditambahkan...
                const lastCodeBlock = chatWindow.value.querySelector('.code-block-wrapper:last-of-type pre code');
                if (lastCodeBlock) {
                    // ...dan panggil highlight.js untuk memberinya warna!
                    hljs.highlightElement(lastCodeBlock);
                }
                scrollToBottom();
            });

            if (state.activeSession.previous_interactions.length === 1) {
                const renamePrompt = `Based on this initial user prompt, create a very short title for this conversation (maximum 4-5 words). User Prompt: "${userInput}"`;
                const newTitle = await callGemini(renamePrompt, apiKey, state.globalContext.safety_settings);
                state.activeSession.name = newTitle.replace(/"/g, '');
            }

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
            chatInputRef,
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
            autoResizeChatInput,
            promptInstall,
            handleCopyClick,
        };
    }
});

window.addEventListener('load', () => {
    app.mount('#app');
});
