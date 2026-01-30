import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChartData } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export async function analyzeImage(file: File): Promise<ChartData> {
  // Convert file to base64
  const base64 = await fileToBase64(file);
  // Remove the data URL prefix for Gemini
  const base64Data = base64.split(',')[1];

  const prompt = `Analyze this image and extract any data that could be turned into a chart.

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
  "suggestedType": "bar" | "line" | "area" | "pie" | "radar" | "scatter" | "table",
  "xAxisLabel": "Label for the x-axis (if visible)",
  "yAxisLabel": "Label for the y-axis (if visible)"
}

Rules:
- labels array must match the length of each data array
- All data values must be numbers (convert scores like "-27" to -27)
- If there are multiple numeric columns, create multiple series
- Choose suggestedType based on the data (rankings = table, trends = line, comparisons = bar, etc.)
- If you can't find chartable data, return: {"error": "No chartable data found"}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    },
  ]);

  const response = await result.response;
  const content = response.text();

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
    xAxisLabel: parsed.xAxisLabel,
    yAxisLabel: parsed.yAxisLabel,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
