export function buildPrompt(globalContext, sessionData) {
    const { ai_name, user_name, user_location, saved_info, ai_long_term_memory } = globalContext;
    const { previous_interactions, current_input } = sessionData;
    
    const now = new Date();
    const currentTimeString = now.toLocaleString('en-US', { 
        timeZone: 'Asia/Jakarta', 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    });

    let prompt = `Current Time: ${currentTimeString} (WIB)\n\n`;
    
    prompt += `AI Name: ${ai_name}\n`;
    prompt += `User Name: ${user_name}\n`;
    prompt += `Location: ${user_location}\n\n`;

    if (saved_info && saved_info.info.length > 0) {
        prompt += `Saved Info:\n`;
        prompt += saved_info.info.map(item => `- ${item}`).join('\n');
        prompt += `\n\n`;
    }

    // === INSTRUCTIONS FOR CODE FORMAT ===
    // prompt += `Important: Whenever you provide code examples, always wrap them in markdown code blocks with the appropriate language specifiers (e.g., \`\`\`python ... \`\`\`).\n\n`;

    if (ai_long_term_memory && ai_long_term_memory.memory.length > 0) {
        prompt += `My Long-Term Memory (My previous observations about the user):\n`;
        prompt += ai_long_term_memory.memory.map(item => `- On ${new Date(item.memory_saved_at).toLocaleDateString()}, I noted: "${item.memory_content}"`).join('\n');
        prompt += `\n\n`;
    }

    if (previous_interactions && previous_interactions.length > 0) {
        prompt += `History:\n`;
        prompt += previous_interactions.map(interaction => `User: ${interaction.input}\nAI: ${interaction.response}`).join('\n');
        prompt += `\n`;
    }

    prompt += `User: ${current_input}`;

    return prompt.trim();
}
