// Local protocol fixture only; never imported by application code or pointed at live services.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Profile, RoleLevel } from '../../features/portal/schema';

const userId = '00000000-0000-4000-8000-000000000001';
let level: RoleLevel = 'inti';
let failReads = false;
let rows: Record<string, Record<string, unknown>[]> = {};
const profile = (): Profile => ({
  id: userId,
  email: 'pengurus@example.org',
  nama_lengkap: 'Pengurus Uji',
  jabatan: level === 'inti' ? 'Bendahara' : 'Staf',
  bidang_divisi: 'Bidang Branding',
  kelompok: 'Bidang Branding',
  level,
  avatar: null,
  telepon_wa: null,
  created_at: '2026-11-01T00:00:00Z',
});
const user = () => ({
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: profile().email,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-11-01T00:00:00Z',
});
function session() {
  const payload = {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'fixture-signature',
  ].join('.');
  return {
    access_token: token,
    refresh_token: 'fixture-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: payload.exp,
    user: user(),
  };
}
function reset() {
  rows = Object.fromEntries(
    [
      'surat',
      'surat_approval',
      'reimburse',
      'reimburse_approval',
      'kas_mutasi',
      'pagu_anggaran',
      'pengumuman',
      'pengumuman_kehadiran',
      'tiket_info',
    ].map((table) => [table, []]),
  );
  rows.pengumuman.push({
    id: '00000000-0000-4000-8000-000000000010',
    judul: 'Rapat Uji',
    kategori: 'Urgent',
    target: 'Semua',
    isi: 'Agenda pengurus',
    penulis_id: userId,
    penulis_nama: 'Pengurus Uji',
    total_target: 1,
    created_at: '2026-11-01T00:00:00Z',
  });
}
reset();
async function body(request: IncomingMessage): Promise<unknown> {
  let text = '';
  for await (const chunk of request) text += String(chunk);
  return text ? JSON.parse(text) : null;
}
function send(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'apikey,authorization,content-type,x-client-info',
  });
  response.end(JSON.stringify(data));
}
createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1:54328');
    if (url.pathname === '/health') return send(response, 200, { ok: true });
    if (url.pathname === '/__test/reset') {
      level = z
        .enum(['inti', 'kabid', 'kadiv', 'staff'])
        .parse(url.searchParams.get('level') || 'inti');
      failReads = url.searchParams.get('fail') === 'true';
      reset();
      return send(response, 200, {});
    }
    if (request.method === 'OPTIONS') return send(response, 200, {});
    if (url.pathname === '/auth/v1/token') {
      const values = z.object({ password: z.string() }).safeParse(await body(request));
      if (
        url.searchParams.get('grant_type') !== 'refresh_token' &&
        (!values.success || values.data.password !== 'valid-password')
      )
        return send(response, 400, {
          code: 'invalid_credentials',
          msg: 'Invalid login credentials',
        });
      return send(response, 200, session());
    }
    if (url.pathname === '/auth/v1/user') {
      if (!request.headers.authorization?.startsWith('Bearer eyJ'))
        return send(response, 401, { message: 'Missing session' });
      return send(response, 200, user());
    }
    if (url.pathname === '/auth/v1/logout') return send(response, 200, {});
    if (!request.headers.authorization?.startsWith('Bearer eyJ'))
      return send(response, 401, { message: 'Unauthorized' });
    if (url.pathname.startsWith('/rest/v1/rpc/')) return send(response, 404, { code: 'PGRST202' });
    const table = url.pathname.replace('/rest/v1/', '');
    if (table !== 'profiles' && !rows[table]) return send(response, 404, {});
    if (failReads && request.method === 'GET' && table !== 'profiles')
      return send(response, 500, { code: 'fixture_error' });
    if (request.method === 'GET' || request.method === 'HEAD') {
      let results = table === 'profiles' ? [profile()] : rows[table];
      for (const [key, value] of url.searchParams.entries())
        if (value.startsWith('eq.'))
          results = results.filter((row) => Reflect.get(row, key) === value.slice(3));
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || results.length);
      response.setHeader(
        'Content-Range',
        `${offset}-${Math.max(offset, offset + limit - 1)}/${results.length}`,
      );
      const result = results.slice(offset, offset + limit);
      return send(
        response,
        200,
        request.headers.accept?.includes('vnd.pgrst.object') ? result[0] : result,
      );
    }
    const values = z.record(z.string(), z.unknown()).parse(await body(request));
    if (request.method === 'POST') {
      const created = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        status:
          table === 'surat'
            ? 'Menunggu Review Kabid'
            : table === 'reimburse'
              ? 'Menunggu Approval Bendahara'
              : table === 'tiket_info'
                ? 'Open'
                : undefined,
        tanggal: '06 November 2026',
        tgl: new Date().toISOString().slice(0, 10),
        foto_struk_url: null,
        bukti_transfer_url: null,
        file_pdf_url: null,
        keterangan: null,
        respons: null,
        total_target: 0,
        confirmed_at: new Date().toISOString(),
        ...values,
      };
      if (
        !request.headers.prefer?.includes('resolution=ignore-duplicates') ||
        !rows[table].some(
          (row) => row.pengumuman_id === values.pengumuman_id && row.user_id === values.user_id,
        )
      )
        rows[table].push(created);
      return send(
        response,
        201,
        request.headers.accept?.includes('vnd.pgrst.object') ? created : [created],
      );
    }
    if (request.method === 'PATCH') {
      const id = url.searchParams.get('id')?.replace('eq.', '');
      const row = rows[table].find((candidate) => candidate.id === id);
      if (!row) return send(response, 404, {});
      Object.assign(row, values);
      return send(
        response,
        200,
        request.headers.accept?.includes('vnd.pgrst.object') ? row : [row],
      );
    }
    return send(response, 405, {});
  } catch {
    return send(response, 500, { message: 'Fixture request failed' });
  }
}).listen(54328, '127.0.0.1');
