import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Analyze facial expression and generate a heartwarming quote
export const generatePhotoCaption = async (base64Image: string): Promise<string> => {
  if (!API_KEY) {
    console.warn("No API Key found for Gemini.");
    return "Memories captured...";
  }

  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Analyze the facial expression and mood in this photo. Based on that, write a very short, heartwarming, or funny handwritten-style caption (max 6 words) for a polaroid. If they are smiling, be happy. If silly, be funny. Do not use quotes."
          }
        ]
      }
    });

    return response.text?.trim() || "A beautiful moment";
  } catch (error) {
    console.error("Error generating caption:", error);
    return "Snap!";
  }
};

// Edit the photo style (e.g. "make it a sketch")
export const editPhotoStyle = async (base64Image: string, prompt: string): Promise<string | null> => {
  if (!API_KEY) return null;

  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Edit this image to match this style description: ${prompt}. Keep the main subject composition but change the artistic style. Output only the image.`
          }
        ]
      }
    });

    // Find the image part in response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error editing photo:", error);
    return null;
  }
};