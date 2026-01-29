import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChartData, ColorScheme } from '../types';
import { COLOR_PALETTES } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

function getTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export async function generateInfographic(
  data: ChartData,
  title: string,
  colorScheme: ColorScheme
): Promise<string> {
  const colors = COLOR_PALETTES[colorScheme];
  const theme = getTheme();

  const dataDescription = `
Title: ${title || 'Data Visualization'}
Labels: ${data.labels.join(', ')}
Series:
${data.series.map(s => `  - ${s.name}: ${s.data.join(', ')}`).join('\n')}
  `.trim();

  const themeColors = theme === 'light'
    ? {
        background: '#ffffff or transparent',
        primaryText: '#0f172a',
        secondaryText: '#64748b',
      }
    : {
        background: '#0a0a0f or transparent',
        primaryText: '#f0f0f5',
        secondaryText: '#8888a0',
      };

  const prompt = `You are an expert data visualization designer. Create a beautiful, unique SVG infographic.

Your SVG should be:
- Creative and visually striking (not a standard bar/line/pie chart)
- Use interesting layouts: circular, radial, isometric, organic shapes, creative arrangements
- Include the actual data values displayed elegantly
- Use smooth gradients, rounded shapes, subtle shadows
- Be self-contained with no external dependencies
- Fixed viewBox of "0 0 800 600"

Color palette to use (in order of preference):
${colors.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

Theme: ${theme.toUpperCase()} MODE
Background: ${themeColors.background}
Primary text color: ${themeColors.primaryText}
Secondary text color: ${themeColors.secondaryText}
Use the font-family: 'Manrope', sans-serif for text.

Create a unique, creative SVG infographic for this data:

${dataDescription}

Return ONLY the SVG code, no markdown code blocks, no explanation. The SVG should be complete and render standalone. Start with <svg and end with </svg>.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  if (!content) {
    throw new Error('No response from AI');
  }

  // Clean up the response - remove any markdown code blocks
  let svg = content.replace(/```svg\n?|\n?```|```xml\n?|```html\n?|```/g, '').trim();

  // Ensure it starts with <svg
  if (!svg.startsWith('<svg')) {
    const svgStart = svg.indexOf('<svg');
    if (svgStart !== -1) {
      svg = svg.slice(svgStart);
    } else {
      throw new Error('Invalid SVG response');
    }
  }

  // Ensure it ends with </svg>
  const svgEnd = svg.lastIndexOf('</svg>');
  if (svgEnd !== -1) {
    svg = svg.slice(0, svgEnd + 6);
  }

  return svg;
}
