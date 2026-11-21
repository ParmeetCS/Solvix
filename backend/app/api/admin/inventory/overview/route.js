import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';

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

    // Fetch product categories
    const { data: categories, error: catError } = await adminSupa
      .from('product_categories')
      .select('id, name, code')
      .order('name', { ascending: true });

    if (catError) {
      return jsonError('Failed to fetch categories', 500);
    }

    // Fetch inventory overview
    const { data: inventory, error: invError } = await adminSupa
      .from('inventory')
      .select(`
        product_id,
        products (name, sku, unit, base_price),
        warehouses (name, code),
        quantity_on_hand,
        quantity_reserved
      `);

    if (invError) {
      return jsonError('Failed to fetch inventory data', 500);
    }

    // Calculate summary stats
    let totalProducts = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    const categoryBreakdown = {};

    if (inventory) {
      totalProducts = inventory.length;

      inventory.forEach(item => {
        const productName = item.products?.name || 'Unknown';
        const warehouseName = item.warehouses?.name || 'Unknown';
        const quantity = item.quantity_on_hand || 0;
        const reserved = item.quantity_reserved || 0;
        const available = quantity - reserved;

        // Track by category (we'll use product name as fallback)
        categoryBreakdown[productName] = (categoryBreakdown[productName] || 0) + available;

        // Check stock status
        if (available <= 0) {
          outOfStockProducts++;
        } else if (available <= (item.products?.min_stock_level || 0)) {
          lowStockProducts++;
        }
      });
    }

    // Fetch warehouse overview
    const { data: warehouses, error: whError } = await adminSupa
      .from('warehouses')
      .select('id, name, code, is_active');

    if (whError) {
      return jsonError('Failed to fetch warehouse data', 500);
    }

    return jsonResponse({
      totalProducts,
      totalStockQuantity: inventory ? inventory.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0) : 0,
      lowStockProducts,
      outOfStockProducts,
      categories,
      warehouseCount: warehouses ? warehouses.length : 0,
      warehouseOverview: warehouses || [],
    }, { message: 'Inventory overview fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/inventory/overview
export async function OPTIONS() {
  return handleOptions();
}