import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: 'fuck you' });

function blobToBase64(blob: Blob): Promise<string> {
     return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
     });
}

export async function transcribeWithGemini(blob: Blob, mimeType: string): Promise<string> {
     const data = await blobToBase64(blob);

     const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite", // swap for a newer Flash model if you have access
          contents: [
               { inlineData: { mimeType: mimeType.split(";")[0], data } },
               {
                    text:
                         "Transcribe this audio exactly as spoken. The speaker is describing an invoice " +
                         "(client name, email, items, quantity, price in rupees, due date). " +
                         "Keep names, numbers, and amounts accurate. Return only the transcript, no extra text.",
               },
          ],
     });

     console.log(response)
     return (response.text ?? "").trim();
}