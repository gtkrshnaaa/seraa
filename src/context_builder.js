export function buildPrompt(globalContext, sessionData) {
    const { ai_name, user_name, user_location, saved_info, long_term_memory } = globalContext;
    const { previous_interactions, current_input } = sessionData;

    // Get the current time in a readable format for the AI
    const now = new Date();
    const currentTimeString = now.toLocaleString('en-US', { 
        timeZone: 'Asia/Jakarta', 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    });


    // Start the prompt with the current time
    let prompt = `Current Time: ${currentTimeString} (WIB)\n`;
    prompt = `AI Name: ${ai_name}\n`;
    prompt += `User Name: ${user_name}\n`;
    prompt += `Location: ${user_location}\n\n`;

    if (saved_info && saved_info.info.length > 0) {
        prompt += `Saved Info:\n`;
        prompt += saved_info.info.map(item => `- ${item}`).join('\n');
        prompt += `\n\n`;
    }

    if (long_term_memory && long_term_memory.memory.length > 0) {
        prompt += `Long-Term Memory:\n`;
        prompt += long_term_memory.memory.map(item => `- ${item.memory_saved_at.split('T')[0]}: ${item.memory_content}`).join('\n');
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