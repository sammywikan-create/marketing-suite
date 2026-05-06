import { NextRequest, NextResponse } from 'next/server';
import { generateReportPdf, formatReportCaption, ReportData } from '@/lib/reports/generateReport';
import { sendTelegramDocument, TelegramConfig } from '@/lib/alerts/telegram';

// POST /api/reports — generate and send PDF report to Telegram
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, period, summary, target, channels, harian, evaluasi_per_brand, highlights, aiSummary, telegram } = body;

    if (!summary || !period || !type) {
      return NextResponse.json({ error: 'Missing required fields: summary, period, type' }, { status: 400 });
    }

    // Generate PDF
    const reportData: ReportData = {
      period,
      type,
      summary,
      target: target || 0,
      channels,
      harian,
      evaluasi_per_brand,
      highlights,
      aiSummary,
    };

    console.log('[Reports] Generating PDF report:', type, period);
    const pdfBuffer = generateReportPdf(reportData);
    console.log('[Reports] PDF generated, size:', pdfBuffer.length, 'bytes');

    // Send to Telegram if configured
    let telegramResult = { sent: false, error: '' };
    if (telegram?.enabled) {
      const filename = `FreshVision_${type}_${period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const caption = formatReportCaption(reportData);

      console.log('[Reports] Sending to Telegram...');
      const result = await sendTelegramDocument(
        telegram as TelegramConfig,
        pdfBuffer,
        filename,
        caption,
      );
      telegramResult = { sent: result.success, error: result.error || '' };

      if (result.success) {
        console.log('[Reports] Telegram sent successfully');
      } else {
        console.error('[Reports] Telegram failed:', result.error);
      }
    }

    return NextResponse.json({
      success: true,
      pdfSize: pdfBuffer.length,
      telegram: telegramResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[Reports] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
