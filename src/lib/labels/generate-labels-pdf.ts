import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

export type LabelProduct = {
  nome: string;
  ean: string | null;
  sku: string | null;
  preco_venda: number | null;
};

type LabelLayout = {
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  marginX: number;
  marginY: number;
  gapX: number;
  gapY: number;
};

const LAYOUTS: Record<string, LabelLayout> = {
  '3x10': { cols: 3, rows: 10, labelW: 63.5, labelH: 25.4, marginX: 7.2, marginY: 12.7, gapX: 2.5, gapY: 0 },
  '2x7':  { cols: 2, rows: 7,  labelW: 90,   labelH: 38,   marginX: 15,  marginY: 8,    gapX: 0,   gapY: 2 },
};

function generateBarcodeDataURL(value: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'EAN13',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 10,
      margin: 2,
      flat: true,
    });
    return canvas.toDataURL('image/png');
  } catch {
    // If EAN13 fails, try CODE128
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, {
        format: 'CODE128',
        width: 1.5,
        height: 50,
        displayValue: true,
        fontSize: 10,
        margin: 2,
        flat: true,
      });
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }
}

export function generateLabelsPDF(
  products: LabelProduct[],
  layoutKey: string = '3x10',
  qty: number = 1
) {
  const layout = LAYOUTS[layoutKey] || LAYOUTS['3x10'];
  const pdf = new jsPDF('p', 'mm', 'a4');

  const allLabels: LabelProduct[] = [];
  for (const p of products) {
    for (let i = 0; i < qty; i++) allLabels.push(p);
  }

  const perPage = layout.cols * layout.rows;

  allLabels.forEach((product, idx) => {
    if (idx > 0 && idx % perPage === 0) pdf.addPage();

    const posOnPage = idx % perPage;
    const col = posOnPage % layout.cols;
    const row = Math.floor(posOnPage / layout.cols);

    const x = layout.marginX + col * (layout.labelW + layout.gapX);
    const y = layout.marginY + row * (layout.labelH + layout.gapY);

    // Label border (light)
    pdf.setDrawColor(220);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, layout.labelW, layout.labelH);

    // Product name (truncated)
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    const name = product.nome.length > 35 ? product.nome.slice(0, 35) + '…' : product.nome;
    pdf.text(name, x + 2, y + 4);

    // Price
    if (product.preco_venda != null) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const price = product.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      pdf.text(price, x + layout.labelW - 2, y + 4, { align: 'right' });
    }

    // Barcode
    const code = product.ean || product.sku;
    if (code) {
      const barcodeImg = generateBarcodeDataURL(code);
      if (barcodeImg) {
        const barcodeW = layout.labelW - 8;
        const barcodeH = layout.labelH - 8;
        pdf.addImage(barcodeImg, 'PNG', x + 4, y + 6, barcodeW, barcodeH);
      } else {
        // Fallback: just text
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(code, x + layout.labelW / 2, y + layout.labelH / 2 + 2, { align: 'center' });
      }
    } else {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150);
      pdf.text('Sem código', x + layout.labelW / 2, y + layout.labelH / 2 + 2, { align: 'center' });
      pdf.setTextColor(0);
    }
  });

  pdf.save('etiquetas-produtos.pdf');
}
