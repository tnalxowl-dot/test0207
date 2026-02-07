
import { GoogleGenAI } from "@google/genai";

/**
 * Accessing process.env.API_KEY safely.
 * In some browser environments, 'process' is not defined globally, 
 * which leads to a ReferenceError that stops the app from rendering (White Screen).
 */
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const getRecipeRecommendation = async (ingredients: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `다음 재료들을 활용한 맛있는 요리 레시피를 추천해줘: ${ingredients}. 
    요리 이름, 필요한 재료(정확한 분량 포함), 조리 순서(번호 매기기), 그리고 꿀팁을 포함해서 마크다운 형식으로 작성해줘.`,
    config: {
      temperature: 0.7,
    },
  });

  return response.text || "레시피를 생성할 수 없습니다.";
};

export const generateDishImage = async (dishName: string): Promise<string | null> => {
  try {
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
