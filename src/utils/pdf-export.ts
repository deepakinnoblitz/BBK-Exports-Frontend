import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import autoTable from 'jspdf-autotable';

import { fCurrency } from './format-number';

export interface PdfExportOptions {
  title: string;
  filename: string;
  headers: string[];
  body: any[][];
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: any; isCurrency?: boolean }[];
}

const getWeight = (header: string): number => {
  const h = header.toLowerCase();
  if (
    h.includes('price') ||
    h.includes('tax') ||
    h.includes('subtotal') ||
    h.includes('grand total') ||
    h.includes('collected') ||
    h.includes('pending') ||
    h.includes('paid') ||
    h.includes('amount') ||
    h.includes('total')
  ) {
    return 25;
  }
  if (h.includes('qty') || h.includes('quantity') || h.includes('count')) {
    return 12;
  }
  if (h.includes('date') || h.includes('time')) {
    return 20;
  }
  if (h.includes('ref no') || h.includes('invoice') || h.includes('purchase') || h.includes('bill no')) {
    return 22;
  }
  if (h.includes('email') || h.includes('phone') || h.includes('website') || h.includes('gstin')) {
    return 30;
  }
  if (h.includes('location') || h.includes('source') || h.includes('venue')) {
    return 30;
  }
  return 40; // Default for text columns
};

export function exportToPdf({
  title,
  filename,
  headers,
  body,
  orientation = 'landscape',
  summary,
}: PdfExportOptions) {
  const doc = new jsPDF(orientation);

  // Page size calculations (A4 sizes in mm)
  // Portrait: 210 x 297, Landscape: 297 x 210
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const usableWidth = pageWidth - 28; // 14mm margins on left and right

  // Calculate dynamic column widths
  const totalWeight = headers.reduce((sum, h) => sum + getWeight(h), 0);
  const columnStyles: { [key: number]: { cellWidth: number } } = {};
  headers.forEach((header, index) => {
    columnStyles[index] = {
      cellWidth: (getWeight(header) / totalWeight) * usableWidth
    };
  });

  // Calculate dynamic font size based on column count
  const columnCount = headers.length;
  let fontSize = 7.5;
  if (columnCount > 8) {
    fontSize = 7;
  }
  if (columnCount > 10) {
    fontSize = 6.5;
  }

  // Add common page header (pink & blue theme inspired by Employee Overall Report)
  const addPageHeader = () => {
    // Report Title (Sky Blue primary color)
    doc.setFontSize(20);
    doc.setTextColor(14, 165, 233);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);

    // Metadata (Generated date/time)
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

    // Accent line (Sky Blue)
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.line(14, 32, pageWidth - 14, 32);
  };

  addPageHeader();

  // Design standard table style
  const tableStyles: any = {
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: [14, 165, 233], // Sky Blue primary
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: fontSize + 0.5
    },
    styles: {
      fontSize,
      cellPadding: 3,
      overflow: 'linebreak',
      lineWidth: 0.15,
      lineColor: [60, 60, 60],
      textColor: [33, 43, 54],
      valign: 'middle'
    },
    columnStyles
  };

  // Sanitize body currency cells to prevent Unicode symbol split/spacing rendering issues
  const cleanBody = body.map((row) =>
    row.map((cell) => {
      if (cell !== null && cell !== undefined) {
        const cellStr = String(cell);
        if (cellStr.includes('₹') || cellStr.includes('â‚¹')) {
          // Replace Rupee symbol with Rs. and strip spaces to prevent split characters / spacing bugs
          return cellStr
            .replace(/₹/g, 'Rs.')
            .replace(/â‚¹/g, 'Rs.')
            .replace(/[\s\u00A0\u202F\u2007\u2009]/g, '');
        }
      }
      return cell;
    })
  );

  // Add the primary table
  autoTable(doc, {
    startY: 38,
    head: [headers],
    body: cleanBody,
    ...tableStyles,
    didParseCell: (data) => {
      if (data.section === 'head' || data.section === 'body') {
        const headerCell = data.table.head[0]?.cells[data.column.index];
        if (headerCell) {
          const headerText = (headerCell.text[0] || '').toLowerCase();
          if (
            headerText.includes('price') ||
            headerText.includes('rate') ||
            headerText.includes('amount') ||
            headerText.includes('tax') ||
            headerText.includes('subtotal') ||
            headerText.includes('total') ||
            headerText.includes('collected') ||
            headerText.includes('pending') ||
            headerText.includes('paid')
          ) {
            data.cell.styles.halign = 'right';
            data.cell.styles.overflow = 'visible'; // Keep text in single line without wrapping/clipping
          } else if (
            headerText.includes('qty') ||
            headerText.includes('quantity') ||
            headerText.includes('count')
          ) {
            data.cell.styles.halign = 'center';
          } else {
            data.cell.styles.halign = 'left';
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Add footer on every page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');

      // Page number text right-aligned
      const pageText = `Page ${data.pageNumber} of ${pageCount}`;
      doc.text(pageText, pageWidth - 14 - doc.getTextWidth(pageText), pageHeight - 10);

      // Confidentiality/System text left-aligned
      doc.text('CRM System Report - Confidential', 14, pageHeight - 10);
    }
  });

  // Add summary if available
  if (summary && summary.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 40;

    // Check if we need to add a page break for the summary
    const spaceNeeded = 30 + (summary.length * 8);
    let summaryStartY = finalY + 15;

    if (summaryStartY + spaceNeeded > pageHeight - 15) {
      doc.addPage();
      addPageHeader();
      summaryStartY = 40;
    }

    doc.setFontSize(11);
    doc.setTextColor(33, 43, 54);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT SUMMARY', 14, summaryStartY);

    const summaryBody = summary.map(item => {
      let valStr = '';
      if (item.isCurrency) {
        valStr = fCurrency(item.value) || 'Rs.0.00';
        valStr = valStr
          .replace(/₹/g, 'Rs.')
          .replace(/â‚¹/g, 'Rs.')
          .replace(/[\s\u00A0\u202F\u2007\u2009]/g, '');
      } else {
        valStr = typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value);
      }
      return [item.label, valStr];
    });

    autoTable(doc, {
      startY: summaryStartY + 4,
      body: summaryBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineWidth: 0.15,
        lineColor: [60, 60, 60],
        valign: 'middle'
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [244, 246, 248], textColor: [99, 115, 129], cellWidth: 60 },
        1: { halign: 'left', textColor: [33, 43, 54] }
      }
    });
  }

  doc.save(`${filename}_${dayjs().format('YYYY-MM-DD_HHmmss')}.pdf`);
}
