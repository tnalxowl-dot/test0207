
import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client using the API key from environment variables.
// Following @google/genai coding guidelines: use named parameter and direct access to process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRecipeRecommendation = async (ingredients: string): Promise<string> => {
  // Use ai.models.generateContent directly with model name and prompt.
  // Using gemini-3-flash-preview for general text tasks as per guidelines.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `다음 재료들을 활용한 맛있는 요리 레시피를 추천해줘: ${ingredients}. 
    요리 이름, 필요한 재료(정확한 분량 포함), 조리 순서(번호 매기기), 그리고 꿀팁을 포함해서 마크다운 형식으로 작성해줘.`,
    config: {
      temperature: 0.7,
    },
  });

  // Accessing text property directly (not a method).
  return response.text || "레시피를 생성할 수 없습니다.";
};

export const generateDishImage = async (dishName: string): Promise<string | null> => {
  try {
    // Generate image using gemini-2.5-flash-image model as default for general image generation.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A high-quality, appetizing food photography of a dish called "${dishName}". Professional lighting, top-down or 45-degree angle, rustic table setting.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    // Iterate through all parts to find the image part as per guidelines. Do not assume the first part is an image.
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};
