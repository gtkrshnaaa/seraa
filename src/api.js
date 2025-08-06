// File: src/api.js
// Description: This file is responsible for handling all communications with the Gemini API.
// It uses a non-streaming approach for greater stability.

const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash";

// A list of user-adjustable safety categories.
const ADJUSTABLE_SAFETY_CATEGORIES = [
    "HARM_CATEGORY_HARASSMENT",
    "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    "HARM_CATEGORY_DANGEROUS_CONTENT"
];

/**
 * Calls the Gemini API in a non-streaming fashion.
 * @param {string} prompt - The prompt text to send.
 * @param {string} apiKey - The user's API key.
 * @param {string} safetyThreshold - The selected safety level (e.g., 'BLOCK_NONE').
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

        // Handle non-successful HTTP responses
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Handle cases where the response is blocked or empty
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            const blockReason = data.promptFeedback?.blockReason;
            if (blockReason) {
                return `Response blocked by safety settings. Reason: ${blockReason}. Adjust the level in Settings if needed.`;
            }
            return "Response was blocked or is empty. Please adjust the safety level in Settings if needed.";
        }
        
        // Return the AI's text response
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Re-throw the error so it can be caught by the calling function (e.g., in app.js)
        throw error;
    }
}
