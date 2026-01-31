import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChartData, ChartType } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export interface ChartRecommendation {
  type: ChartType;
  reasoning: string;
  summary: string;
}

export async function recommendChartType(
  data: ChartData,
  options: { preferredType?: ChartType } = {}
): Promise<ChartRecommendation> {
  const dataDescription = {
    labels: data.labels,
    series: data.series.map(s => ({
      name: s.name,
      sampleData: s.data.slice(0, 10),
      min: Math.min(...s.data),
      max: Math.max(...s.data),
      count: s.data.length,
    })),
    labelCount: data.labels.length,
    seriesCount: data.series.length,
  };

  const preferredTypeLine = options.preferredType
    ? `Preferred chart type: ${options.preferredType} (use this type and justify it)`
    : 'No preferred chart type provided';

  const userPromptLine = data.userPrompt
    ? `\nUser instructions: ${data.userPrompt}\nConsider these instructions when analyzing the data and making your recommendation.`
    : '';

  const prompt = `You are a data visualization expert and analyst. Analyze the provided data and recommend the best chart type. Consider:
- Data relationships and patterns
- Number of data points and series
- Whether labels are categorical, temporal, or ordinal
- What story the data is trying to tell
- Readability and clarity for the end user

Available chart types: bar, line, area, pie, radar, scatter, table
${preferredTypeLine}${userPromptLine}

Respond with JSON only (no markdown):
{
  "type": "chartType",
  "reasoning": "A clear 1-2 sentence explanation of why this chart type is best for this data",
  "summary": "3-5 sentences that: (1) highlight the most interesting pattern, (2) explain why it matters, (3) note any bias or potential chart crime, and (4) state what the data does not answer"
}

Analyze this data and recommend the best chart type:

${JSON.stringify(dataDescription, null, 2)}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  if (!content) {
    throw new Error('No response from AI');
  }

  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    const resolvedType = options.preferredType ?? parsed.type;

    // Validate the chart type
    const validTypes: ChartType[] = ['bar', 'line', 'area', 'pie', 'radar', 'scatter', 'table'];
    if (!validTypes.includes(resolvedType)) {
      return {
        type: 'table',
        reasoning: 'Default recommendation for flexible data viewing.',
        summary: 'Summary unavailable for this dataset.',
      };
    }

    return {
      type: resolvedType,
      reasoning: parsed.reasoning || 'AI recommendation based on data analysis.',
      summary: parsed.summary || 'Summary unavailable for this dataset.',
    };
  } catch {
    return {
      type: 'table',
      reasoning: 'Default recommendation for flexible data viewing.',
      summary: 'Summary unavailable for this dataset.',
    };
  }
}
