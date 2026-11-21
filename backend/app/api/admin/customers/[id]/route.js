import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';
import { uuidParamSchema } from '@/lib/validations';

export async function GET(request) {
  try {
    // Verify admin authentication
    const { user, error: userError } = await getUserFromRequest(request);

    if (userError || !user) {
      return jsonError('Authentication failed', 401);
    }

    // Check if user has admin role
    const adminSupa = createAdminClient();
    const { data: profileData, error: profileError } = await adminSupa
      .from('profiles')
      .select('role_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData) {
      return jsonError('User profile not found', 404);
    }

    const { data: roleData, error: roleError } = await adminSupa
      .from('roles')
      .select('code')
      .eq('id', profileData.role_id)
      .single();

    if (roleError || roleData.code !== 'admin') {
      return jsonError('Admin privileges required', 403);
    }

    // Extract id from the URL path
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonError('Customer ID is required', 400);
    }

    // Fetch customer details with related data
    const { data: customer, error: customerError } = await adminSupa
      .from('customers')
      .select(`
        id,
        customer_code,
        profile_id,
        company_name,
        contact_name,
        email,
        phone,
        customer_type,
        status,
        tax_id,
        notes,
        created_at,
        updated_at,
        profiles (full_name, email, phone, avatar_url),
        orders (id, order_code, status, total_amount, created_at),
        quotations (id, quotation_code, status, total_amount, created_at)
      `)
      .eq('id', id)
      .single();

    if (customerError) {
      return jsonError('Customer not found', 404);
    }

    // Count associated projects
    const { count: projectCount, error: projectError } = await adminSupa
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id);

    if (projectError) {
      return jsonError('Failed to fetch project count', 500);
    }

    // Get customer addresses
    const { data: addresses, error: addrError } = await adminSupa
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', id);

    if (addrError) {
      return jsonError('Failed to fetch customer addresses', 500);
    }

    return jsonResponse({
      customer,
      projectCount: projectCount || 0,
      addresses: addresses || [],
    }, { message: 'Customer details fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/customers/[id]
export async function OPTIONS() {
  return handleOptions();
}