import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChartData, ChartConfig, ChartType, ColorScheme, StyleVariant } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  changes?: {
    dataModified: boolean;
    configModified: boolean;
    summary: string;
  };
}

export interface ChatResponse {
  message: string;
  updatedData?: ChartData;
  updatedConfig?: Partial<ChartConfig>;
  changes: {
    dataModified: boolean;
    configModified: boolean;
    summary: string;
  };
}

interface AIResponse {
  message: string;
  intent: 'question' | 'modification' | 'both';
  dataChanges?: {
    labels?: string[];
    series?: { name: string; data: number[] }[];
    newColumns?: { name: string; formula: string }[];
  };
  configChanges?: {
    type?: ChartType;
    colorScheme?: ColorScheme;
    styleVariant?: StyleVariant;
    showGrid?: boolean;
    showLegend?: boolean;
    showValues?: boolean;
    animate?: boolean;
    title?: string;
  };
  reasoning?: string;
}

export async function sendChatMessage(
  userMessage: string,
  currentData: ChartData,
  currentConfig: ChartConfig,
  chatHistory: ChatMessage[]
): Promise<ChatResponse> {
  const recentHistory = chatHistory.slice(-6).map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  // Calculate some basic stats for the AI to reference
  const stats = currentData.series.map(s => {
    const sum = s.data.reduce((a, b) => a + b, 0);
    const avg = sum / s.data.length;
    const min = Math.min(...s.data);
    const max = Math.max(...s.data);
    const minIdx = s.data.indexOf(min);
    const maxIdx = s.data.indexOf(max);
    return {
      name: s.name,
      sum: Math.round(sum * 100) / 100,
      average: Math.round(avg * 100) / 100,
      min,
      max,
      minLabel: currentData.labels[minIdx],
      maxLabel: currentData.labels[maxIdx],
      count: s.data.length,
    };
  });

  const historyText = recentHistory.length > 0
    ? `\nRECENT CONVERSATION:\n${recentHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
    : '';

  const prompt = `You are an AI data analyst and visualization assistant. You can:

1. **Answer questions about the data** - Analyze trends, find insights, compare values, identify patterns
2. **Modify the underlying data** - Add columns, compute values, rename series, filter data, add summary rows
3. **Modify chart settings** - Change chart type, colors, style, toggles, title

CURRENT DATA:
- Labels: ${JSON.stringify(currentData.labels)}
- Series: ${JSON.stringify(currentData.series.map(s => ({ name: s.name, data: s.data })))}

PRE-COMPUTED STATS:
${JSON.stringify(stats, null, 2)}

CURRENT CONFIG:
- Type: ${currentConfig.type}
- Color Scheme: ${currentConfig.colorScheme}
- Style: ${currentConfig.styleVariant}
- Title: ${currentConfig.title || '(none)'}
- Show Grid: ${currentConfig.showGrid}, Legend: ${currentConfig.showLegend}, Values: ${currentConfig.showValues}

Available chart types: bar, line, area, pie, radar, scatter, table
Available color schemes: default, cool, warm, editorial, monochrome, muted
Available styles: professional, playful, editorial, minimalist, bold
${historyText}
USER MESSAGE: ${userMessage}

Respond with JSON only (no markdown):
{
  "message": "Your response - answer questions conversationally, explain changes you made, or provide insights",
  "intent": "question" | "modification" | "both",
  "dataChanges": {
    "labels": ["new", "labels"] | null,
    "series": [{"name": "Series Name", "data": [1,2,3]}] | null,
    "newColumns": [{"name": "Total", "formula": "sum"}] | null
  },
  "configChanges": {
    "type": "bar" | null,
    "colorScheme": "warm" | null,
    "styleVariant": "bold" | null,
    "title": "New Title" | null,
    "showGrid": true | null,
    "showLegend": true | null,
    "showValues": true | null
  },
  "reasoning": "Brief explanation (only for modifications)"
}

Guidelines:
- Set intent to "question" if the user is asking about their data (no changes needed)
- Set intent to "modification" if the user wants to change something
- Set intent to "both" if answering a question AND making changes
- For questions: provide insightful, specific answers using the actual data values
- For modifications: only include fields you're changing (use null or omit unchanged fields)
- For newColumns with formula "sum", calculate the sum across all numeric series for each row
- For newColumns with formula "average", calculate the average across all numeric series
- Be conversational, specific, and reference actual values from the data
- If the request is unclear, ask for clarification`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  if (!content) {
    throw new Error('No response from AI');
  }

  let parsed: AIResponse;
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    parsed = JSON.parse(cleanContent);
  } catch {
    // If parsing fails, return a simple message response
    return {
      message: content,
      changes: {
        dataModified: false,
        configModified: false,
        summary: 'Response received',
      },
    };
  }

  // Process data changes
  let updatedData: ChartData | undefined;
  let dataModified = false;

  if (parsed.dataChanges) {
    updatedData = { ...currentData };

    if (parsed.dataChanges.labels) {
      updatedData.labels = parsed.dataChanges.labels;
      dataModified = true;
    }

    if (parsed.dataChanges.series) {
      updatedData.series = parsed.dataChanges.series;
      dataModified = true;
    }

    // Handle computed columns
    if (parsed.dataChanges.newColumns && parsed.dataChanges.newColumns.length > 0) {
      for (const col of parsed.dataChanges.newColumns) {
        const newData: number[] = [];

        for (let i = 0; i < currentData.labels.length; i++) {
          const values = currentData.series.map(s => s.data[i] || 0);

          if (col.formula === 'sum') {
            newData.push(values.reduce((a, b) => a + b, 0));
          } else if (col.formula === 'average' || col.formula === 'avg') {
            newData.push(values.reduce((a, b) => a + b, 0) / values.length);
          } else if (col.formula === 'min') {
            newData.push(Math.min(...values));
          } else if (col.formula === 'max') {
            newData.push(Math.max(...values));
          } else {
            // Try to evaluate as a simple expression or default to sum
            newData.push(values.reduce((a, b) => a + b, 0));
          }
        }

        updatedData.series = [...(updatedData.series || currentData.series), { name: col.name, data: newData }];
        dataModified = true;
      }
    }
  }

  // Process config changes
  let updatedConfig: Partial<ChartConfig> | undefined;
  let configModified = false;

  if (parsed.configChanges) {
    updatedConfig = {};

    if (parsed.configChanges.type) {
      updatedConfig.type = parsed.configChanges.type;
      configModified = true;
    }
    if (parsed.configChanges.colorScheme) {
      updatedConfig.colorScheme = parsed.configChanges.colorScheme;
      configModified = true;
    }
    if (parsed.configChanges.styleVariant) {
      updatedConfig.styleVariant = parsed.configChanges.styleVariant;
      configModified = true;
    }
    if (parsed.configChanges.title !== undefined && parsed.configChanges.title !== null) {
      updatedConfig.title = parsed.configChanges.title;
      configModified = true;
    }
    if (parsed.configChanges.showGrid !== undefined && parsed.configChanges.showGrid !== null) {
      updatedConfig.showGrid = parsed.configChanges.showGrid;
      configModified = true;
    }
    if (parsed.configChanges.showLegend !== undefined && parsed.configChanges.showLegend !== null) {
      updatedConfig.showLegend = parsed.configChanges.showLegend;
      configModified = true;
    }
    if (parsed.configChanges.showValues !== undefined && parsed.configChanges.showValues !== null) {
      updatedConfig.showValues = parsed.configChanges.showValues;
      configModified = true;
    }
    if (parsed.configChanges.animate !== undefined && parsed.configChanges.animate !== null) {
      updatedConfig.animate = parsed.configChanges.animate;
      configModified = true;
    }
  }

  const changeSummary = [];
  if (dataModified) changeSummary.push('data updated');
  if (configModified) changeSummary.push('chart settings changed');

  return {
    message: parsed.message,
    updatedData: dataModified ? updatedData : undefined,
    updatedConfig: configModified ? updatedConfig : undefined,
    changes: {
      dataModified,
      configModified,
      summary: changeSummary.length > 0 ? changeSummary.join(', ') : 'no changes made',
    },
  };
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
