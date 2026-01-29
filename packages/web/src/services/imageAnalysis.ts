import OpenAI from 'openai';
import type { ChartData } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // For demo purposes - in production use a backend
});

export async function analyzeImage(file: File): Promise<ChartData> {
  // Convert file to base64
  const base64 = await fileToBase64(file);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this image and extract any data that could be turned into a chart.

Look for:
- Tables, leaderboards, rankings
- Charts or graphs (extract the underlying data)
- Statistics, scores, numbers with labels
- Any structured numerical data

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "labels": ["label1", "label2", ...],
  "series": [
    {"name": "Series Name", "data": [num1, num2, ...]}
  ],
  "suggestedTitle": "A title for the chart",
  "suggestedType": "bar" | "line" | "area" | "pie" | "radar" | "scatter"
}

Rules:
- labels array must match the length of each data array
- All data values must be numbers (convert scores like "-27" to -27)
- If there are multiple numeric columns, create multiple series
- Choose suggestedType based on the data (rankings = bar, trends = line, etc.)
- If you can't find chartable data, return: {"error": "No chartable data found"}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: base64,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from vision API');
  }

  // Parse the JSON response
  let parsed;
  try {
    // Remove any markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    parsed = JSON.parse(cleanContent);
  } catch {
    throw new Error('Failed to parse response: ' + content);
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  // Validate the response structure
  if (!parsed.labels || !parsed.series || !Array.isArray(parsed.labels) || !Array.isArray(parsed.series)) {
    throw new Error('Invalid data structure returned');
  }

  return {
    labels: parsed.labels,
    series: parsed.series,
    sourceType: 'image',
    suggestedTitle: parsed.suggestedTitle,
    suggestedType: parsed.suggestedType,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // Already includes data:image/...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
