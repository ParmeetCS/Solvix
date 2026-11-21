import { jsonError, handleOptions } from '@/lib/utils';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { getQuotationBundle } from '@/lib/quotation/data';
import { generateQuotationPdf, quotationPdfFilename } from '@/lib/pdf/quotationPdf';
import { logActivity } from '@/lib/supabase/salesAuth';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/sales/quotations/[id]/pdf */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    const bundle = await getQuotationBundle(auth.adminClient, id);
    const pdf = generateQuotationPdf(bundle);
    const filename = quotationPdfFilename(quotation);

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_PDF_DOWNLOADED',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code },
    });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to generate quotation PDF.', error.status || 500);
  }
}
