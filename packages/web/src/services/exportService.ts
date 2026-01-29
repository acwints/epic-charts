import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import type { ChartData } from '../types';

export async function exportToCSV(data: ChartData, filename: string = 'chart-data'): Promise<void> {
  // Build rows with labels as first column, series as subsequent columns
  const headers = ['Label', ...data.series.map(s => s.name)];
  const rows = data.labels.map((label, idx) => {
    const row: (string | number)[] = [label];
    data.series.forEach(series => {
      row.push(series.data[idx]);
    });
    return row;
  });

  const csvContent = Papa.unparse({
    fields: headers,
    data: rows,
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPNG(
  element: HTMLElement,
  filename: string = 'chart'
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#09090b',
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyToClipboard(data: ChartData): Promise<void> {
  // Build tab-separated values for Excel/Sheets paste
  const headers = ['', ...data.labels].join('\t');
  const rows = data.series.map(series => {
    return [series.name, ...series.data.map(v => v.toString())].join('\t');
  });

  const tsvContent = [headers, ...rows].join('\n');
  await navigator.clipboard.writeText(tsvContent);
}
