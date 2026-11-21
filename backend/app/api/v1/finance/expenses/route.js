import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generateExpenseCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EXP-${yr}-${rand}`;
}

/**
 * GET /api/v1/finance/expenses
 */
export async function GET(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('expenses')
      .select(`
        id,
        expense_code,
        category,
        description,
        amount,
        incurred_date,
        project_id,
        created_at,
        created_by,
        profiles:created_by(id, full_name, email)
      `, { count: 'exact' });

    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`expense_code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
      .order('incurred_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: expenses, count, error } = await query;
    if (error) {
      return jsonError('Database error fetching expenses: ' + error.message, 500);
    }

    // Parse status from description tag (e.g. [STATUS:APPROVED] or default approved)
    const enriched = (expenses || []).map((e) => {
      let approvalStatus = 'approved';
      if (e.description?.includes('[STATUS:PENDING]')) approvalStatus = 'pending';
      if (e.description?.includes('[STATUS:REJECTED]')) approvalStatus = 'rejected';

      const cleanDesc = (e.description || '')
        .replace(/\[STATUS:[^\]]+\]/g, '')
        .trim();

      return {
        ...e,
        approval_status: approvalStatus,
        clean_description: cleanDesc
      };
    });

    const filtered = status
      ? enriched.filter((e) => e.approval_status === status)
      : enriched;

    return jsonResponse({
      expenses: filtered,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/finance/expenses
 * Records a new business/project expense.
 */
export async function POST(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    let {
      category = 'other', // 'equipment_purchase' | 'labour' | 'logistics' | 'utilities' | 'marketing' | 'other'
      amount,
      description,
      incurred_date = new Date().toISOString().split('T')[0],
      project_id = null,
      vendor = '',
      approval_status = 'approved' // 'approved' | 'pending'
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return jsonError('A valid positive amount is required.', 400);
    }

    if (!description || !description.trim()) {
      return jsonError('Description is required.', 400);
    }

    const validCategories = ['equipment_purchase', 'labour', 'logistics', 'utilities', 'marketing', 'other'];
    let safeCategory = category.toLowerCase();
    if (!validCategories.includes(safeCategory)) safeCategory = 'other';

    const expenseCode = generateExpenseCode();

    let fullDescription = `[STATUS:${approval_status.toUpperCase()}] ${description.trim()}`;
    if (vendor) fullDescription += ` | Vendor: ${vendor.trim()}`;

    const { data: newExpense, error: insertErr } = await adminClient
      .from('expenses')
      .insert({
        expense_code: expenseCode,
        category: safeCategory,
        description: fullDescription,
        amount: numAmount,
        incurred_date,
        project_id: project_id || null,
        created_by: profile.id
      })
      .select('*')
      .single();

    if (insertErr) {
      return jsonError('Failed to record expense: ' + insertErr.message, 500);
    }

    // Log activity
    await logFinanceActivity({
      actorId: profile.id,
      action: 'EXPENSE_RECORDED',
      entityType: 'expense',
      entityId: newExpense.id,
      metadata: { expense_code: expenseCode, category: safeCategory, amount: numAmount }
    });

    return jsonResponse({
      ...newExpense,
      approval_status,
      clean_description: description.trim()
    }, { message: `Expense ${expenseCode} recorded successfully.`, status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
