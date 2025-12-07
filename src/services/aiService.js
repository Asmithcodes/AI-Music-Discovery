import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateRecommendations = async (formData, customKey = null) => {
  const key = customKey || API_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });


  // robustly handle "Other" selections
  const genre = formData.genre === 'Other' ? formData.custom_genre : formData.genre;
  const artist = formData.artist === 'Other' ? formData.custom_artist : formData.artist;
  const mood = formData.mood === 'Other' ? formData.custom_mood : formData.mood;
  const activity = formData.activity === 'Other' ? formData.custom_activity : formData.activity;
  const region = formData.region === 'Other' ? formData.custom_region : formData.region;

  const prompt = `
    You are an expert music curator. Suggest 5 song recommendations based strictly on the following user preferences.
    
    **CRITICAL RULES (READ CAREFULLY):**
    1. **NO HALLUCINATIONS:** It is STRICTLY FORBIDDEN to invent song titles. Only recommend songs that actually exist and can be found on Spotify.
    2. **VERIFY DISCOGRAPHY:** If the user requests a specific Artist (e.g., Hanumankind) but they don't have enough songs fitting the specific criteria (e.g. "Chill"), DO NOT make up fake songs like "Chill by Hanumankind". Instead, recommend their REAL songs that are closest, OR choose a **similar artist from the same region**.
    3. **REGION PRIORITY:** If Region is specified (e.g., India), prioritize local artists. "English Rap from India" = Indian artists rapping in English (e.g., Hanumankind, Brodha V, Divine), NOT generic US rap.
    4. **ACCURACY:** The song Title and Artist must be 100% correct.

    **User Context:**
    - **Language:** ${formData.language || 'Any'}
    - **Region/Country:** ${region || 'Any'}
    - **Genre:** ${genre}
    - **Artist preference:** ${artist || 'None'}
    - **Mood:** ${mood || 'Any'}
    - **Activity:** ${activity || 'Any'}
    - **Era:** ${formData.era || 'Any'}
    - **Tempo:** ${formData.tempo || 'Any'}

    **Instructions:**
    1. Select songs that best match the combination of Genre + Region + Language.
    2. If the user asks for a specific Region (e.g., India), DO NOT give generic US/UK hits even if the genre is Western (like Pop or Rap). Find local artists from that region fitting the genre.
    3. If the specific Artist requested doesn't have 5 valid songs, fill the rest with similar artists from the same region/genre.

    Please provide the response in strict JSON format with the following structure:
    [
      {
        "title": "Exact Song Title",
        "artist": "Exact Artist Name",
        "album": "Album Name",
        "reason": "Explain why this song fits (if you swtiched artist, explain why)."
      }
    ]
    Do not include any markdown formatting like \`\`\`json or \`\`\`. Just the raw JSON array.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean up potential markdown code blocks if the model ignores the instruction
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
