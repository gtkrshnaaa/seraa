// File: src/api.js

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=";

export async function callGemini(prompt, apiKey, safetyThreshold = 'BLOCK_NONE') {
    try {
        const response = await fetch(`${API_URL}${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                safetySettings: [
                    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": safetyThreshold },
                    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": safetyThreshold },
                    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": safetyThreshold },
                    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": safetyThreshold }
                ]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            return "Response blocked due to safety settings. Adjust the level in Settings if needed.";
        }
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return `Sorry, I encountered an error: ${error.message}`;
    }
}