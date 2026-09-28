import { NextRequest, NextResponse } from 'next/server';
import { testNeonConnection, initializeNeonSchema, upsertNeonBatch, getNeonSql, getRows } from '@/lib/neonClient';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, connectionString, tableName, data } = body;

    if (!connectionString) {
      return NextResponse.json({ success: false, error: 'Connection string Neon diperlukan' }, { status: 400 });
    }

    if (action === 'test-connection') {
      const res = await testNeonConnection(connectionString);
      return NextResponse.json(res);
    }

    if (action === 'init-schema') {
      await initializeNeonSchema(connectionString, true);
      return NextResponse.json({ success: true, message: 'Skema tabel Neon berhasil dibuat.' });
    }

    if (action === 'migrate-table') {
      if (!tableName) {
        return NextResponse.json({ success: false, error: 'Nama tabel diperlukan' }, { status: 400 });
      }

      let itemsToInsert = data || [];

      // If no data provided in body, attempt to fetch directly from Supabase
      if (!itemsToInsert || itemsToInsert.length === 0) {
        const { data: supaData, error: supaErr } = await supabase.from(tableName).select('*');
        if (supaErr) {
          return NextResponse.json(
            { success: false, error: `Gagal membaca tabel ${tableName} dari Supabase: ${supaErr.message}` },
            { status: 500 }
          );
        }
        itemsToInsert = supaData || [];
      }

      // First ensure schema exists
      await initializeNeonSchema(connectionString);

      // Perform upsert batch
      const insertedCount = await upsertNeonBatch(connectionString, tableName, itemsToInsert);

      // Get count from Neon
      const sql = getNeonSql(connectionString);
      const countRes = await sql.query(`SELECT COUNT(*)::int as count FROM ${tableName}`);
      const rows = getRows(countRes);
      const neonTotal = rows?.[0]?.count ?? insertedCount;

      return NextResponse.json({
        success: true,
        tableName,
        supabaseCount: itemsToInsert.length,
        neonCount: neonTotal,
        migratedCount: insertedCount,
      });
    }

    if (action === 'get-counts') {
      const sql = getNeonSql(connectionString);
      const tables = ['students', 'classes', 'settings', 'rundowns', 'activity_logs'];
      const counts: Record<string, number> = {};

      for (const t of tables) {
        try {
          const res = await sql.query(`SELECT COUNT(*)::int as count FROM ${t}`);
          const rows = getRows(res);
          counts[t] = rows?.[0]?.count ?? 0;
        } catch {
          counts[t] = 0;
        }
      }

      return NextResponse.json({ success: true, counts });
    }

    return NextResponse.json({ success: false, error: 'Action tidak dikenal' }, { status: 400 });
  } catch (err: any) {
    console.error('[API Migration Neon] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Terjadi kesalahan pada server saat menghubungkan ke Neon Postgres.',
      },
      { status: 200 }
    );
  }
}
