const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";

// A list of user-adjustable safety categories.
const ADJUSTABLE_SAFETY_CATEGORIES = [
    "HARM_CATEGORY_HARASSMENT",
    "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    "HARM_CATEGORY_DANGEROUS_CONTENT"
];

/**
 * Calls the Gemini API in a non-streaming fashion (for short tasks like generating titles).
 * @param {string} prompt - The prompt text to send.
 * @param {string} apiKey - The user's API key.
 * @param {string} safetyThreshold - The selected safety level ('BLOCK_NONE', etc.).
 * @returns {Promise<string>} The AI's text response.
 */
export async function callGemini(prompt, apiKey, safetyThreshold = 'BLOCK_NONE') {
    // Dynamically and cleanly create the payload body.
    const safetySettings = ADJUSTABLE_SAFETY_CATEGORIES.map(category => ({
        category,
        threshold: safetyThreshold
    }));

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: safetySettings
    };

    try {
        const response = await fetch(`${API_URL_BASE}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            // Check for promptFeedback, which often contains the block reason.
            const blockReason = data.promptFeedback?.blockReason;
            if (blockReason) {
                return `Response blocked by safety settings. Reason: ${blockReason}. Adjust the level in Settings if needed.`;
            }
            return "Response blocked. Adjust the safety level in Settings if needed.";
        }
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return `Sorry, I encountered an error: ${error.message}`;
    }
}


/**
 * Calls the Gemini API in a streaming fashion.
 * @param {string} prompt - The prompt text to send.
 * @param {string} apiKey - The user's API key.
 * @param {string} safetyThreshold - The selected safety level.
 * @param {object} callbacks - An object containing callback functions: onChunk, onComplete, onError.
 */
export async function callGeminiStream(prompt, apiKey, safetyThreshold, callbacks) {
    const { onChunk, onComplete, onError } = callbacks;

    // Dynamically and cleanly create the payload body.
    const safetySettings = ADJUSTABLE_SAFETY_CATEGORIES.map(category => ({
        category,
        threshold: safetyThreshold
    }));
    
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: safetySettings
    };

    try {
        const response = await fetch(`${API_URL_BASE}:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function processStream() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    if (onComplete) onComplete();
                    return;
                }

                const chunk = decoder.decode(value);
                // This parses multiple JSON objects that might arrive in a single chunk
                const jsonChunks = chunk
                    .replace(/^data: /gm, '') // Remove all 'data: ' prefixes
                    .split('\n')
                    .filter(line => line.trim() !== ''); // Remove empty lines

                for (const jsonStr of jsonChunks) {
                    try {
                        const parsed = JSON.parse(jsonStr);

                        // NEW CHECK: Check for block reason early
                        const blockReason = parsed.promptFeedback?.blockReason;
                        if (blockReason) {
                            onError(`Response blocked by safety settings. Reason: ${blockReason}. Adjust in Settings.`);
                            return; // Stop processing the stream
                        }
                        
                        const finishReason = parsed.candidates?.[0]?.finishReason;
                        if (finishReason === "SAFETY") {
                            onError("The response was stopped midway due to safety settings.");
                            return; // Stop processing the stream
                        }

                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            onChunk(text);
                        }
                    } catch (e) {
                        console.warn("Skipping malformed JSON chunk:", jsonStr);
                    }
                }
                
                processStream(); // Continue reading the stream
            }).catch(error => {
                console.error("Stream reading error:", error);
                if (onError) onError(error.message);
            });
        }
        
        processStream();

    } catch (error) {
        console.error("Error calling Gemini stream API:", error);
        if (onError) {
            onError(`Sorry, I encountered an error: ${error.message}`);
        }
    }
}