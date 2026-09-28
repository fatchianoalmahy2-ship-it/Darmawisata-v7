import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql, initializeNeonSchema, getRows } from '@/lib/neonClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, connectionString, payload } = body;

    const connStr = connectionString || process.env.NEON_DATABASE_URL;

    if (!connStr) {
      return NextResponse.json({ success: false, error: 'Connection string Neon tidak ditemukan' }, { status: 400 });
    }

    const sql = getNeonSql(connStr);

    switch (action) {
      // 1. STUDENTS
      case 'getStudents': {
        const res = await sql.query('SELECT data FROM students');
        const students = getRows(res).map((r: any) => r.data || r);
        return NextResponse.json({ success: true, data: students });
      }

      case 'saveStudents': {
        const { students } = payload;
        if (Array.isArray(students)) {
          for (const s of students) {
            if (!s.id) continue;
            await sql.query(
              `INSERT INTO students (id, name, "className", data) VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "className" = EXCLUDED."className", data = EXCLUDED.data`,
              [s.id, s.name || '', s.className || '', JSON.stringify(s)]
            );
          }
        }
        return NextResponse.json({ success: true });
      }

      case 'saveSingleStudent': {
        const { student } = payload;
        if (student && student.id) {
          await sql.query(
            `INSERT INTO students (id, name, "className", data) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "className" = EXCLUDED."className", data = EXCLUDED.data`,
            [student.id, student.name || '', student.className || '', JSON.stringify(student)]
          );
        }
        return NextResponse.json({ success: true });
      }

      case 'deleteSingleStudent': {
        const { id } = payload;
        if (id) {
          await sql.query('DELETE FROM students WHERE id = $1', [id]);
        }
        return NextResponse.json({ success: true });
      }

      case 'deleteMultipleStudents': {
        const { ids } = payload;
        if (Array.isArray(ids) && ids.length > 0) {
          for (const id of ids) {
            await sql.query('DELETE FROM students WHERE id = $1', [id]);
          }
        }
        return NextResponse.json({ success: true });
      }

      case 'clearAllStudents': {
        await sql.query('DELETE FROM students');
        return NextResponse.json({ success: true });
      }

      // 2. CLASSES
      case 'getClasses': {
        const res = await sql.query('SELECT data FROM classes');
        const classes = getRows(res).map((r: any) => r.data || r);
        return NextResponse.json({ success: true, data: classes });
      }

      case 'saveClasses': {
        const { classes } = payload;
        if (Array.isArray(classes)) {
          for (const c of classes) {
            if (!c.id) continue;
            await sql.query(
              `INSERT INTO classes (id, name, data) VALUES ($1, $2, $3)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, data = EXCLUDED.data`,
              [c.id, c.name || '', JSON.stringify(c)]
            );
          }
        }
        return NextResponse.json({ success: true });
      }

      case 'deleteSingleClass': {
        const { id } = payload;
        if (id) {
          await sql.query('DELETE FROM classes WHERE id = $1', [id]);
        }
        return NextResponse.json({ success: true });
      }

      // 3. SETTINGS
      case 'getSettings': {
        const res = await sql.query("SELECT data FROM settings WHERE id = 'global'");
        const data = getRows(res)?.[0]?.data ?? null;
        return NextResponse.json({ success: true, data });
      }

      case 'saveSettings': {
        const { settings } = payload;
        await sql.query(
          `INSERT INTO settings (id, data) VALUES ('global', $1)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [JSON.stringify(settings)]
        );
        return NextResponse.json({ success: true });
      }

      // 4. RUNDOWNS
      case 'getRundowns': {
        const res = await sql.query('SELECT data FROM rundowns');
        const rundowns = getRows(res).map((r: any) => r.data || r);
        return NextResponse.json({ success: true, data: rundowns });
      }

      case 'saveRundownItem': {
        const { item } = payload;
        if (item && item.id) {
          await sql.query(
            `INSERT INTO rundowns (id, title, data) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, data = EXCLUDED.data`,
            [item.id, item.title || '', JSON.stringify(item)]
          );
        }
        return NextResponse.json({ success: true });
      }

      case 'deleteRundownItem': {
        const { id } = payload;
        if (id) {
          await sql.query('DELETE FROM rundowns WHERE id = $1', [id]);
        }
        return NextResponse.json({ success: true });
      }

      // 5. ACTIVITY LOGS
      case 'getActivityLogs': {
        const res = await sql.query('SELECT data FROM activity_logs ORDER BY timestamp DESC LIMIT 100');
        const logs = getRows(res).map((r: any) => r.data || r);
        return NextResponse.json({ success: true, data: logs });
      }

      case 'logActivity': {
        const { log } = payload;
        if (log && log.id) {
          await sql.query(
            `INSERT INTO activity_logs (id, action, timestamp, data) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [log.id, log.action || '', log.timestamp || new Date().toISOString(), JSON.stringify(log)]
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[API Neon Query] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan pada query Neon Postgres' },
      { status: 200 }
    );
  }
}
