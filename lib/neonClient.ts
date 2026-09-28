import { neon } from '@neondatabase/serverless';

export interface NeonTableCount {
  table: string;
  supabaseCount: number;
  neonCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  errorMessage?: string;
}

// Helper to sanitize and encode connection strings from user input
export function cleanConnectionString(connStr: string): string {
  if (!connStr) return '';
  let cleaned = connStr.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned) return '';

  let scheme = 'postgresql://';
  if (cleaned.startsWith('postgres://')) {
    cleaned = cleaned.slice('postgres://'.length);
  } else if (cleaned.startsWith('postgresql://')) {
    cleaned = cleaned.slice('postgresql://'.length);
  }

  // Find user info vs host part
  const slashIdx = cleaned.indexOf('/');
  const queryIdx = cleaned.indexOf('?');
  let endOfAuthority = cleaned.length;
  if (slashIdx !== -1 && (queryIdx === -1 || slashIdx < queryIdx)) {
    endOfAuthority = slashIdx;
  } else if (queryIdx !== -1) {
    endOfAuthority = queryIdx;
  }

  const authority = cleaned.substring(0, endOfAuthority);
  const restPath = cleaned.substring(endOfAuthority);

  const lastAtIdx = authority.lastIndexOf('@');
  if (lastAtIdx !== -1) {
    const userInfo = authority.substring(0, lastAtIdx);
    const hostPort = authority.substring(lastAtIdx + 1);

    const colonIdx = userInfo.indexOf(':');
    let user = userInfo;
    let password = '';
    if (colonIdx !== -1) {
      user = userInfo.substring(0, colonIdx);
      password = userInfo.substring(colonIdx + 1);
      // Decode first if already encoded, then encode password cleanly
      try {
        password = decodeURIComponent(password);
      } catch {
        // use raw password if decode fails
      }
      password = encodeURIComponent(password);
    }

    cleaned = `${user}:${password}@${hostPort}${restPath}`;
  } else {
    cleaned = authority + restPath;
  }

  let finalUrl = scheme + cleaned;
  if (!finalUrl.includes('sslmode=')) {
    finalUrl += finalUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }
  return finalUrl;
}

// Helper to get Neon SQL instance
export function getNeonSql(connectionString: string) {
  const cleaned = cleanConnectionString(connectionString);
  if (!cleaned) {
    throw new Error('Neon connection string tidak boleh kosong');
  }
  return neon(cleaned);
}

// Helper to safely extract rows array from sql.query or sql`` result
export function getRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

// Dual-engine query executor (SDK + HTTP REST fallback)
export async function executeNeonHttpQuery(
  connectionString: string,
  queryText: string,
  params: any[] = []
): Promise<any[]> {
  const cleaned = cleanConnectionString(connectionString);
  if (!cleaned) {
    throw new Error('Connection string tidak valid');
  }

  // 1. Try standard serverless SDK
  try {
    const sql = getNeonSql(cleaned);
    const result = await sql.query(queryText, params);
    return getRows(result);
  } catch (sdkErr: any) {
    console.warn('[Neon SDK Error, mencoba HTTP REST Fallback]:', sdkErr.message);

    // 2. HTTP REST Fallback via https://<host>/sql
    const match = cleaned.match(/^postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
    if (!match) {
      throw sdkErr;
    }

    const [, user, pass, host] = match;
    const rawPass = decodeURIComponent(pass);
    const authHeader = 'Basic ' + Buffer.from(`${user}:${rawPass}`).toString('base64');

    const response = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Neon-Connection-String': cleaned,
      },
      body: JSON.stringify({ query: queryText, params }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = response.statusText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errJson.error || errText;
      } catch {
        errMsg = errText || response.statusText;
      }
      throw new Error(`Neon HTTP Error (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    return getRows(data);
  }
}

// Test connectivity to Neon DB
export async function testNeonConnection(connectionString: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleaned = cleanConnectionString(connectionString);
    if (!cleaned || (!cleaned.startsWith('postgresql://') && !cleaned.startsWith('postgres://'))) {
      return {
        success: false,
        message: 'Format URL koneksi tidak valid. Harus diawali postgresql:// atau postgres://',
      };
    }

    const rows = await executeNeonHttpQuery(cleaned, 'SELECT 1 as connected');
    if (rows && rows.length > 0 && (rows[0].connected === 1 || rows[0].connected === '1')) {
      return { success: true, message: 'Koneksi ke Neon Postgres berhasil!' };
    }
    return { success: false, message: 'Respon dari Neon tidak sesuai (tidak ada baris dikembalikan)' };
  } catch (err: any) {
    console.error('[Neon Connection Test Error]:', err);
    return {
      success: false,
      message: err.message || 'Gagal terhubung ke Neon Postgres. Periksa kembali host, user, dan password.',
    };
  }
}

// Schema Initializer for Neon Postgres
export async function initializeNeonSchema(connectionString: string, dropFirst: boolean = false): Promise<void> {
  const sql = getNeonSql(connectionString);

  if (dropFirst) {
    try {
      await sql.query(`DROP TABLE IF EXISTS students;`);
      await sql.query(`DROP TABLE IF EXISTS classes;`);
      await sql.query(`DROP TABLE IF EXISTS settings;`);
      await sql.query(`DROP TABLE IF EXISTS rundowns;`);
      await sql.query(`DROP TABLE IF EXISTS activity_logs;`);
    } catch (dropErr: any) {
      console.warn('[initializeNeonSchema] Warning dropping tables:', dropErr.message);
    }
  }

  // 1. Table: students
  await sql.query(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      nis TEXT,
      name TEXT,
      gender TEXT,
      "className" TEXT,
      "tShirtSize" TEXT,
      "tShirtDesign" TEXT,
      "parentName" TEXT,
      "parentAddress" TEXT,
      "parentPhone" TEXT,
      "studentPhone" TEXT,
      "medicalHistory" TEXT,
      "busNumber" INT,
      "seatNumber" INT,
      "roomNumber" INT,
      wave TEXT,
      destination TEXT,
      "isRegistered" BOOLEAN DEFAULT false,
      "registeredAt" TEXT,
      "registrationOperator" TEXT,
      "hotelName" TEXT,
      "updatedAt" TEXT,
      data JSONB
    );
  `);

  // Ensure wave column is TEXT if created previously as INT
  try {
    await sql.query(`ALTER TABLE students ALTER COLUMN wave TYPE TEXT USING wave::text;`);
  } catch (e) {
    // Column already TEXT or table just created
  }

  // 2. Table: classes
  await sql.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT,
      "totalStudents" INT,
      "departmentCode" TEXT,
      "gradeLevel" INT,
      data JSONB
    );
  `);

  // 3. Table: settings
  await sql.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data JSONB
    );
  `);

  // 4. Table: rundowns
  await sql.query(`
    CREATE TABLE IF NOT EXISTS rundowns (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      location TEXT,
      time TEXT,
      day INT,
      "iconName" TEXT,
      category TEXT,
      destination TEXT,
      data JSONB
    );
  `);

  // 5. Table: activity_logs
  await sql.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action TEXT,
      nis TEXT,
      name TEXT,
      "className" TEXT,
      operator TEXT,
      details TEXT,
      timestamp TEXT,
      data JSONB
    );
  `);
}

// Helper to batch insert/upsert records into Neon
export async function upsertNeonBatch(
  connectionString: string,
  tableName: string,
  records: any[]
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const sql = getNeonSql(connectionString);
  let count = 0;

  for (const item of records) {
    if (!item || !item.id) continue;
    const jsonStr = JSON.stringify(item);

    switch (tableName) {
      case 'students':
        await sql.query(
          `INSERT INTO students (
            id, nis, name, gender, "className", "tShirtSize", "tShirtDesign",
            "parentName", "parentAddress", "parentPhone", "studentPhone",
            "medicalHistory", "busNumber", "seatNumber", "roomNumber", wave,
            destination, "isRegistered", "registeredAt", "registrationOperator",
            "hotelName", "updatedAt", data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (id) DO UPDATE SET
            nis = EXCLUDED.nis,
            name = EXCLUDED.name,
            gender = EXCLUDED.gender,
            "className" = EXCLUDED."className",
            "tShirtSize" = EXCLUDED."tShirtSize",
            "tShirtDesign" = EXCLUDED."tShirtDesign",
            "parentName" = EXCLUDED."parentName",
            "parentAddress" = EXCLUDED."parentAddress",
            "parentPhone" = EXCLUDED."parentPhone",
            "studentPhone" = EXCLUDED."studentPhone",
            "medicalHistory" = EXCLUDED."medicalHistory",
            "busNumber" = EXCLUDED."busNumber",
            "seatNumber" = EXCLUDED."seatNumber",
            "roomNumber" = EXCLUDED."roomNumber",
            wave = EXCLUDED.wave,
            destination = EXCLUDED.destination,
            "isRegistered" = EXCLUDED."isRegistered",
            "registeredAt" = EXCLUDED."registeredAt",
            "registrationOperator" = EXCLUDED."registrationOperator",
            "hotelName" = EXCLUDED."hotelName",
            "updatedAt" = EXCLUDED."updatedAt",
            data = EXCLUDED.data`,
          [
            item.id || '',
            item.nis || null,
            item.name || null,
            item.gender || null,
            item.className || null,
            item.tShirtSize || null,
            item.tShirtDesign || null,
            item.parentName || null,
            item.parentAddress || null,
            item.parentPhone || null,
            item.studentPhone || null,
            item.medicalHistory || null,
            item.busNumber !== null && item.busNumber !== undefined && !isNaN(Number(item.busNumber)) ? Number(item.busNumber) : null,
            item.seatNumber !== null && item.seatNumber !== undefined && !isNaN(Number(item.seatNumber)) ? Number(item.seatNumber) : null,
            item.roomNumber !== null && item.roomNumber !== undefined && !isNaN(Number(item.roomNumber)) ? Number(item.roomNumber) : null,
            item.wave !== null && item.wave !== undefined ? String(item.wave) : null,
            item.destination || null,
            item.isRegistered ?? false,
            item.registeredAt || null,
            item.registrationOperator || null,
            item.hotelName || null,
            item.updatedAt || new Date().toISOString(),
            jsonStr,
          ]
        );
        break;

      case 'classes':
        await sql.query(
          `INSERT INTO classes (id, name, "totalStudents", "departmentCode", "gradeLevel", data)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             "totalStudents" = EXCLUDED."totalStudents",
             "departmentCode" = EXCLUDED."departmentCode",
             "gradeLevel" = EXCLUDED."gradeLevel",
             data = EXCLUDED.data`,
          [
            item.id || '',
            item.name || null,
            item.totalStudents ?? null,
            item.departmentCode || null,
            item.gradeLevel ?? null,
            jsonStr,
          ]
        );
        break;

      case 'settings':
        await sql.query(
          `INSERT INTO settings (id, data) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [item.id || 'global', jsonStr]
        );
        break;

      case 'rundowns':
        await sql.query(
          `INSERT INTO rundowns (id, title, description, location, time, day, "iconName", category, destination, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             location = EXCLUDED.location,
             time = EXCLUDED.time,
             day = EXCLUDED.day,
             "iconName" = EXCLUDED."iconName",
             category = EXCLUDED.category,
             destination = EXCLUDED.destination,
             data = EXCLUDED.data`,
          [
            item.id || '',
            item.title || null,
            item.description || null,
            item.location || null,
            item.time || null,
            item.day ?? 1,
            item.iconName || null,
            item.category || null,
            item.destination || null,
            jsonStr,
          ]
        );
        break;

      case 'activity_logs':
        await sql.query(
          `INSERT INTO activity_logs (id, action, nis, name, "className", operator, details, timestamp, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             action = EXCLUDED.action,
             nis = EXCLUDED.nis,
             name = EXCLUDED.name,
             "className" = EXCLUDED."className",
             operator = EXCLUDED.operator,
             details = EXCLUDED.details,
             timestamp = EXCLUDED.timestamp,
             data = EXCLUDED.data`,
          [
            item.id || '',
            item.action || null,
            item.nis || null,
            item.name || null,
            item.className || null,
            item.operator || null,
            item.details || null,
            item.timestamp || new Date().toISOString(),
            jsonStr,
          ]
        );
        break;

      default:
        await sql.query(
          `INSERT INTO ${tableName} (id, data) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [item.id || '', jsonStr]
        );
        break;
    }
    count++;
  }

  return count;
}
