// lib/pdf/invoice.ts

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Billing, User } from '@/lib/db/schema';

export async function generateInvoicePdf(params: {
  invoice: Billing;
  user?: User | null;
}): Promise<Uint8Array> {
  const { invoice, user } = params;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  const margin = 50;
  let y = height - margin;

  const drawText = (text: string, options?: { size?: number; colorGray?: number }) => {
    const size = options?.size ?? 10;
    const gray = options?.colorGray ?? 0;
    page.drawText(text, {
      x: margin,
      y,
      size,
      font,
      color: rgb(gray, gray, gray),
    });
    y -= size + 4;
  };

  /* ===========================
   * HEADER
   * =========================== */

  drawText('IonProxy', { size: 20 });
  drawText('https://ionproxy.com', { size: 10, colorGray: 0.4 });
  y -= 10;

  drawText(`Invoice ${invoice.invoiceNumber}`, { size: 16 });

  drawText(`Status: ${invoice.status.toUpperCase()}`, { size: 10, colorGray: 0.3 });

  if (invoice.createdAt) {
    drawText(`Created: ${formatDate(invoice.createdAt as unknown as Date)}`, {
      size: 10,
      colorGray: 0.3,
    });
  }

  if (invoice.paidAt) {
    drawText(`Paid: ${formatDate(invoice.paidAt as unknown as Date)}`, {
      size: 10,
      colorGray: 0.3,
    });
  }

  if (invoice.dueDate) {
    drawText(`Due date: ${formatDate(invoice.dueDate as unknown as Date)}`, {
      size: 10,
      colorGray: 0.3,
    });
  }

  y -= 20;

  /* ===========================
   * INFO CLIENT
   * =========================== */

  drawText('Billed to:', { size: 12 });

  if (user) {
    const name =
      user.name ??
      (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
      user.email);

    drawText(name, { size: 10 });
    drawText(user.email, { size: 10, colorGray: 0.4 });

    if (user.countryOfResidence) {
      drawText(`Country: ${user.countryOfResidence}`, {
        size: 10,
        colorGray: 0.4,
      });
    }
  } else {
    drawText('User information not available', {
      size: 10,
      colorGray: 0.5,
    });
  }

  y -= 20;

  /* ===========================
   * LIGNE DE FACTURATION
   * =========================== */

  const lineYStart = y;

  // En-têtes colonnes
  page.drawText('Description', {
    x: margin,
    y,
    size: 11,
    font,
  });
  page.drawText('Amount', {
    x: width / 2,
    y,
    size: 11,
    font,
  });
  page.drawText('Payment method', {
    x: width - margin - 140,
    y,
    size: 11,
    font,
  });

  y -= 14;

  // ligne séparatrice
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  y -= 16;

  // Ligne principale
  const amountNum = Number(invoice.amount);
  const amountStr = formatCurrency(amountNum, invoice.currency ?? 'USD');

  page.drawText('Subscription invoice', {
    x: margin,
    y,
    size: 10,
    font,
  });

  page.drawText(amountStr, {
    x: width / 2,
    y,
    size: 10,
    font,
  });

  page.drawText(
    invoice.paymentMethod ? invoice.paymentMethod.toUpperCase() : 'N/A',
    {
      x: width - margin - 140,
      y,
      size: 10,
      font,
    }
  );

  y -= 30;

  /* ===========================
   * TOTAL
   * =========================== */

  page.drawText('Total:', {
    x: width / 2,
    y,
    size: 11,
    font,
  });

  page.drawText(amountStr, {
    x: width - margin - 140,
    y,
    size: 11,
    font,
  });

  y -= 40;

  /* ===========================
   * FOOTER
   * =========================== */

  const footerText =
    'Thank you for your purchase. For any question about this invoice, please contact support@ionproxy.com.';

  page.drawText(footerText, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
    maxWidth: width - margin * 2,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes; // Uint8Array, compatible avec NextResponse
}

/* ===========================
 * HELPERS
 * =========================== */

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}
