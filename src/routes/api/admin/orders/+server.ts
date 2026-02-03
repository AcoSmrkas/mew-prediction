// Admin Orders API - List all orders with filters
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hq',
  user: process.env.DB_USER || 'hq',
  password: process.env.DB_PASSWORD || '100%bastardo',
  ssl: process.env.DB_SSL_HOST ? {
    rejectUnauthorized: false,
    servername: process.env.DB_SSL_HOST
  } : false
});

export const GET: RequestHandler = async ({ url }) => {
  const orderType = url.searchParams.get('type') || 'all'; // all, crypto_to_native, native_to_crypto
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const searchQuery = url.searchParams.get('search');

  try {
    let orders = [];

    // Crypto to Native Orders
    if (orderType === 'all' || orderType === 'crypto_to_native') {
      let query = `
        SELECT
          'crypto_to_native' as order_type,
          order_id, from_currency, from_amount, to_token,
          user_ergo_address, status, provider,
          trocador_trade_id as trade_id,
          exolix_id,
          received_erg_amount, dex_swap_tx_id, token_amount_out,
          error_message, created_at, updated_at, completed_at
        FROM crypto_to_native_orders
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      if (searchQuery) {
        query += ` AND (
          order_id ILIKE $${paramCount} OR
          trocador_trade_id ILIKE $${paramCount} OR
          exolix_id ILIKE $${paramCount} OR
          user_ergo_address ILIKE $${paramCount}
        )`;
        params.push(`%${searchQuery}%`);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      orders = orders.concat(result.rows);
    }

    // Native to Crypto Orders
    if (orderType === 'all' || orderType === 'native_to_crypto') {
      let query = `
        SELECT
          'native_to_crypto' as order_type,
          order_id, from_token, from_amount, to_currency,
          user_address, status,
          trocador_trade_id as trade_id,
          received_erg_amount, dex_swap_tx_id,
          error_message, created_at, updated_at, completed_at
        FROM native_token_orders
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      if (searchQuery) {
        query += ` AND (
          order_id ILIKE $${paramCount} OR
          trocador_trade_id ILIKE $${paramCount} OR
          user_address ILIKE $${paramCount}
        )`;
        params.push(`%${searchQuery}%`);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      orders = orders.concat(result.rows);
    }

    // Sort all orders by created_at
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return json({
      success: true,
      data: {
        orders: orders.slice(0, limit),
        total: orders.length
      }
    });

  } catch (error: any) {
    console.error('[Admin] Get orders error:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};
