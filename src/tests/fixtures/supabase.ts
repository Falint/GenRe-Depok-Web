// Local protocol fixture only; never imported by application code or pointed at live services.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { publicContentInput } from '../../features/publik/schema';
import { MEDIA_LIBRARY } from '../../features/media/content';
import type { Profile, RoleLevel } from '../../features/portal/schema';

let userId = '00000000-0000-4000-8000-000000000001';
let level: RoleLevel = 'inti';
let failReads = false;
let loseCreationResponse = false;
let failFeatures = false;
let field = 'branding';
let placements: Record<string, Partial<Profile>> = {};
let division: string | null = 'design';
const fixtureId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let rows: Record<string, Record<string, unknown>[]> = {};
const profile = (): Profile => ({
  id: userId,
  email: 'pengurus@example.org',
  nama_lengkap: 'Pengurus Uji',
  jabatan: level === 'inti' ? 'Bendahara' : 'Staf',
  bidang_divisi: 'Bidang Branding',
  kelompok: 'Bidang Branding',
  level,
  bidang_id: field,
  divisi_id: level === 'inti' || level === 'kabid' ? null : division,
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
function directory(): Profile[] {
  const members: Profile[] = [
    {
      ...profile(),
      id: fixtureId(1),
      level: 'kadiv',
      bidang_id: 'eksternal',
      divisi_id: 'reguler',
    },
    { ...profile(), id: fixtureId(2), level: 'kadiv', bidang_id: 'branding', divisi_id: 'design' },
    {
      ...profile(),
      id: fixtureId(3),
      nama_lengkap: 'Anggota Desain A',
      level: 'staff',
      bidang_id: 'branding',
      divisi_id: 'design',
    },
    {
      ...profile(),
      id: fixtureId(4),
      nama_lengkap: 'Anggota Desain B',
      level: 'staff',
      bidang_id: 'branding',
      divisi_id: 'design',
    },
    {
      ...profile(),
      id: fixtureId(5),
      nama_lengkap: 'Anggota Duta',
      level: 'staff',
      bidang_id: 'internal',
      divisi_id: 'duta',
    },
  ];
  return members
    .map((p) =>
      p.id === userId
        ? { ...profile(), nama_lengkap: p.id === fixtureId(3) ? p.nama_lengkap : 'Pengurus Uji' }
        : p,
    )
    .map((p) => ({ ...p, ...placements[p.id] }));
}
function mayReadRequest(r: Record<string, unknown>, member = false) {
  return (
    ['inti', 'kabid'].includes(level) ||
    r.pemohon_id === userId ||
    (level === 'kadiv' && r.divisi_tujuan_id === division) ||
    (member && rows.panitia_assignments.some((a) => a.request_id === r.id && a.user_id === userId))
  );
}
function reset() {
  placements = {};
  loseCreationResponse = false;
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
      'divisi',
      'panitia_requests',
      'panitia_assignments',
      'panitia_history',
      'media_resources',
      'content_history',
      'public_content',
    ].map((table) => [table, []]),
  );
  rows.pagu_anggaran = [
    {
      id: fixtureId(90),
      bidang: 'Operasional',
      tahun_anggaran: Number(
        new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(
          new Date(),
        ),
      ),
      pagu: 10000,
      terpakai: 7000,
      updated_at: null,
    },
  ];
  rows.divisi = [
    { id: 'reguler', nama: 'Program Reguler', bidang_id: 'eksternal' },
    { id: 'design', nama: 'Design', bidang_id: 'branding' },
    { id: 'duta', nama: 'Duta GenRe', bidang_id: 'internal' },
  ];
  const media = [
    ...MEDIA_LIBRARY.modulPengetahuan.map((x) => ({ ...x, jenis: 'modul', url: null })),
    ...MEDIA_LIBRARY.brandKit.logos.map((x) => ({
      ...x,
      jenis: 'logo',
      judul: x.nama,
      deskripsi: x.nama,
    })),
    ...MEDIA_LIBRARY.brandKit.videoAssets.map((x) => ({
      ...x,
      jenis: 'video',
      judul: x.nama,
      deskripsi: x.nama,
      url: null,
    })),
  ];
  rows.media_resources = media.map((x, i) => ({
    kategori: '',
    jenjang: '',
    halaman: null,
    tahun: null,
    durasi: '',
    ...x,
    id: fixtureId(100 + i),
    legacy_key: `legacy-${i}`,
    created_by: null,
    created_at: null,
    updated_at: null,
    archived_at: null,
    version: 0,
  }));
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
    mulai_at: null,
    selesai_at: null,
    deadline_konfirmasi: null,
    cancelled_at: null,
    cancellation_reason: null,
    updated_at: null,
    version: 0,
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
      userId = fixtureId(1);
      field = url.searchParams.get('field') || 'branding';
      division = url.searchParams.get('division') || 'design';
      failFeatures = url.searchParams.get('features') === 'fail';
      level = z
        .enum(['inti', 'kabid', 'kadiv', 'staff'])
        .parse(url.searchParams.get('level') || 'inti');
      failReads = url.searchParams.get('fail') === 'true';
      reset();
      return send(response, 200, {});
    }
    if (url.pathname === '/__test/public-content') {
      rows.public_content = Array.from({ length: 14 }, (_, index) => ({
        id: fixtureId(300 + index),
        jenis: 'berita',
        judul: `Berita uji ${index + 1}`,
        ringkasan: 'Ringkasan publik',
        isi: '<script>alert(1)</script> Isi berita sebagai teks.',
        status: 'published',
        mulai_at: null,
        selesai_at: null,
        lokasi: '',
        published_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        updated_at: '2026-01-01T00:00:00Z',
        version: 0,
      }));
      rows.public_content.push({
        ...rows.public_content[0],
        id: fixtureId(350),
        judul: 'Draft rahasia',
        status: 'draft',
        published_at: null,
      });
      rows.public_content.push({
        ...rows.public_content[0],
        id: fixtureId(360),
        jenis: 'agenda',
        judul: 'Agenda mendatang',
        mulai_at: '2099-01-01T02:00:00Z',
        selesai_at: null,
        lokasi: 'Depok',
      });
      rows.public_content.push({
        ...rows.public_content[0],
        id: fixtureId(361),
        jenis: 'agenda',
        judul: 'Agenda lampau',
        mulai_at: '2020-01-01T02:00:00Z',
        selesai_at: null,
        lokasi: 'Depok',
      });
      return send(response, 200, {});
    }
    if (url.pathname === '/__test/place-member') {
      placements[fixtureId(Number(url.searchParams.get('id')))] = {
        divisi_id: url.searchParams.get('division'),
        bidang_id: 'branding',
        level: 'staff',
      };
      return send(response, 200, {});
    }
    if (url.pathname === '/__test/lose-creation-response') {
      loseCreationResponse = true;
      return send(response, 200, {});
    }
    if (url.pathname === '/__test/finance-counts')
      return send(response, 200, { claims: rows.reimburse.length, cash: rows.kas_mutasi.length });
    if (url.pathname === '/__test/actor') {
      userId = fixtureId(Number(url.searchParams.get('id') || '1'));
      level = z
        .enum(['inti', 'kabid', 'kadiv', 'staff'])
        .parse(url.searchParams.get('level') || 'kadiv');
      field = url.searchParams.get('field') || 'branding';
      division = url.searchParams.get('division') || 'design';
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
    const authenticated = !!request.headers.authorization?.startsWith('Bearer eyJ');
    if (!authenticated && !(url.pathname === '/rest/v1/public_content' && request.method === 'GET'))
      return send(response, 401, { message: 'Unauthorized' });
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').at(-1);
      const v = z.record(z.string(), z.unknown()).parse(await body(request));
      const input = z.record(z.string(), z.unknown()).parse(v.input || {});
      const now = new Date().toISOString();
      const contentManager = level === 'inti' || field === 'branding';
      if (name === 'save_portal_public_content') {
        if (!contentManager) return send(response, 403, { code: '42501' });
        const parsed = publicContentInput.safeParse(input);
        if (!parsed.success) return send(response, 400, { code: '23514' });
        const previous = rows.public_content.find((row) => row.id === v.target_id);
        if (
          (v.expected_version === -1 && previous) ||
          (v.expected_version !== -1 && (!previous || previous.version !== v.expected_version))
        )
          return send(response, 409, { code: '40001' });
        const saved = {
          ...parsed.data,
          id: v.target_id,
          version: previous ? Number(previous.version) + 1 : 0,
          published_at: input.status === 'published' ? previous?.published_at || now : null,
          updated_at: now,
        };
        if (previous) Object.assign(previous, saved);
        else rows.public_content.push(saved);
        return send(response, 200, null);
      }
      if (name === 'list_portal_budgets')
        return send(
          response,
          200,
          rows.pagu_anggaran.map(({ id, bidang, tahun_anggaran }) => ({
            id,
            bidang,
            tahun_anggaran,
          })),
        );
      if (name === 'create_portal_reimburse' || name === 'create_portal_mutasi') {
        const claim = name === 'create_portal_reimburse';
        if (!claim && level !== 'inti') return send(response, 403, { code: '42501' });
        const table = claim ? 'reimburse' : 'kas_mutasi';
        const old = rows[table].find((row) => row.id === v.request_id);
        if (old) {
          if (old.request_payload !== JSON.stringify(input) || old.request_owner !== userId)
            return send(response, 400, { code: '22023' });
          return send(response, 200, null);
        }
        rows[table].push({
          ...input,
          id: v.request_id,
          request_payload: JSON.stringify(input),
          request_owner: userId,
          created_at: now,
          updated_at: now,
          tanggal: now.slice(0, 10),
          tgl: now.slice(0, 10),
          pemohon_id: userId,
          pemohon_nama: profile().nama_lengkap,
          divisi: profile().kelompok,
          status: 'Menunggu Approval Bendahara',
          foto_struk_url: input.foto_struk_url || null,
          bukti_transfer_url: null,
          sumber_dana: input.sumberDana,
          dicatat_oleh: userId,
          dicatat_oleh_nama: profile().nama_lengkap,
        });
        if (loseCreationResponse) {
          loseCreationResponse = false;
          return send(response, 500, { code: 'fixture_response_lost' });
        }
        return send(response, 200, null);
      }
      if (name === 'decide_portal_reimburse' || name === 'disburse_portal_reimburse') {
        const claim = rows.reimburse.find((row) => row.id === v.target_id);
        if (!claim) return send(response, 404, {});
        if (v.decision === 'cancel' ? claim.pemohon_id !== userId : level !== 'inti')
          return send(response, 403, { code: '42501' });
        if (claim.status !== 'Menunggu Approval Bendahara')
          return send(response, 400, { code: '40001' });
        const paid = name === 'disburse_portal_reimburse';
        claim.status = paid
          ? 'Selesai / Dicairkan'
          : v.decision === 'cancel'
            ? 'Dibatalkan'
            : 'Ditolak';
        rows.reimburse_approval.push({
          id: randomUUID(),
          reimburse_id: claim.id,
          step_order: 99,
          role_label: profile().jabatan,
          actor_name: profile().nama_lengkap,
          status: claim.status,
          reason: v.reason || null,
          acted_at: now,
          created_at: now,
        });
        if (paid)
          rows.kas_mutasi.push({
            id: randomUUID(),
            reimburse_id: claim.id,
            pagu_anggaran_id: claim.pagu_anggaran_id,
            nominal: claim.nominal,
            jenis: 'Keluar',
            deskripsi: `Pencairan Reimburse: ${claim.proker}`,
            kategori: claim.divisi,
            sumber_dana: 'Kas Utama',
            dicatat_oleh: userId,
            dicatat_oleh_nama: profile().nama_lengkap,
            tgl: now.slice(0, 10),
            created_at: now,
          });
        return send(response, 200, null);
      }
      if (name === 'create_panitia_request') {
        if (level !== 'kadiv' || !division) return send(response, 403, { code: '42501' });
        if (!rows.panitia_requests.some((r) => r.id === v.request_id)) {
          rows.panitia_requests.push({
            ...input,
            id: v.request_id,
            pemohon_id: userId,
            pemohon_nama: profile().nama_lengkap,
            divisi_asal_id: division,
            status: 'pending',
            decision_at: null,
            created_at: now,
            updated_at: now,
            version: 0,
          });
          rows.panitia_history.push({
            id: randomUUID(),
            request_id: v.request_id,
            actor_id: userId,
            actor_name: profile().nama_lengkap,
            action: 'created',
            old_status: null,
            new_status: 'pending',
            reason: '',
            added: [],
            removed: [],
            created_at: now,
          });
        }
        return send(response, 200, null);
      }
      if (name === 'decide_panitia_request' || name === 'set_panitia_assignments') {
        const r = rows.panitia_requests.find((r) => r.id === v.target_id);
        if (!r || level !== 'kadiv' || r.divisi_tujuan_id !== division)
          return send(response, 403, { code: '42501' });
        if (r.version !== v.expected_version) return send(response, 409, { code: '40001' });
        const oldStatus = r.status;
        if (name === 'decide_panitia_request') {
          r.status = v.approve ? 'approved' : 'rejected';
          r.decision_at = now;
        } else {
          const ids = z.array(z.string()).parse(v.member_ids);
          rows.panitia_assignments = rows.panitia_assignments.filter((a) => a.request_id !== r.id);
          for (const id of ids)
            rows.panitia_assignments.push({
              id: randomUUID(),
              request_id: r.id,
              user_id: id,
              nama: directory().find((m) => m.id === id)?.nama_lengkap || 'Anggota',
              assigned_at: now,
            });
          r.status =
            ids.length === Number(r.jumlah)
              ? 'assigned'
              : ids.length
                ? 'partially_assigned'
                : 'approved';
        }
        r.updated_at = now;
        r.version = Number(r.version) + 1;
        rows.panitia_history.push({
          id: randomUUID(),
          request_id: r.id,
          actor_id: userId,
          actor_name: profile().nama_lengkap,
          action: name,
          old_status: oldStatus,
          new_status: r.status,
          reason: v.reason,
          added: [],
          removed: [],
          created_at: now,
        });
        return send(response, 200, null);
      }
      const contentTable = name?.includes('pengumuman') ? 'pengumuman' : 'media_resources';
      if (
        [
          'save_portal_pengumuman',
          'cancel_portal_pengumuman',
          'save_portal_media',
          'archive_portal_media',
        ].includes(name || '')
      ) {
        if (!contentManager) return send(response, 403, { code: '42501' });
        let r = rows[contentTable].find((r) => r.id === v.target_id);
        const before = r ? { ...r } : null;
        if (v.expected_version === -1) {
          r =
            contentTable === 'pengumuman'
              ? {
                  penulis_id: userId,
                  penulis_nama: profile().nama_lengkap,
                  total_target: 5,
                  mulai_at: null,
                  selesai_at: null,
                  deadline_konfirmasi: null,
                  cancelled_at: null,
                  cancellation_reason: null,
                }
              : {
                  legacy_key: null,
                  kategori: '',
                  jenjang: '',
                  halaman: null,
                  tahun: null,
                  format: '',
                  size: '',
                  durasi: '',
                  created_by: userId,
                  archived_at: null,
                };
          Object.assign(r, input, {
            id: v.target_id,
            created_at: now,
            updated_at: null,
            version: 0,
          });
          rows[contentTable].push(r);
        } else {
          if (!r || r.version !== v.expected_version) return send(response, 409, { code: '40001' });
          if (name === 'cancel_portal_pengumuman')
            Object.assign(r, { cancelled_at: now, cancellation_reason: v.reason });
          else if (name === 'archive_portal_media') r.archived_at = v.archive ? now : null;
          else Object.assign(r, input);
          r.version = Number(r.version) + 1;
          r.updated_at = now;
        }
        rows.content_history.push({
          id: randomUUID(),
          entity_type: contentTable,
          entity_id: r.id,
          actor_id: userId,
          actor_name: profile().nama_lengkap,
          action: before ? 'update' : 'insert',
          before_data: before,
          after_data: { ...r },
          created_at: now,
        });
        return send(response, 200, null);
      }
      if (name === 'set_tiket_deadline') {
        const r = rows.tiket_info.find((r) => r.id === v.target_id);
        if (!r) return send(response, 404, {});
        Object.assign(r, { deadline_at: v.deadline_value, updated_at: now });
        return send(response, 200, null);
      }
      return send(response, 404, { code: 'PGRST202' });
    }
    const table = url.pathname.replace('/rest/v1/', '');
    if (table !== 'profiles' && !rows[table]) return send(response, 404, {});
    if (
      failFeatures &&
      [
        'divisi',
        'panitia_requests',
        'panitia_assignments',
        'panitia_history',
        'media_resources',
        'content_history',
      ].includes(table)
    )
      return send(response, 500, { code: 'fixture_feature_error' });
    if (failReads && request.method === 'GET' && table !== 'profiles')
      return send(response, 500, { code: 'fixture_error' });
    if (request.method === 'GET' || request.method === 'HEAD') {
      let results: Record<string, unknown>[] = table === 'profiles' ? directory() : rows[table];
      if (table === 'public_content') {
        results = results.filter(
          (row) =>
            row.status === 'published' ||
            (authenticated && (level === 'inti' || field === 'branding')),
        );
        for (const key of ['mulai_at']) {
          const filter = url.searchParams.get(key);
          if (filter?.startsWith('gte.'))
            results = results.filter((row) => String(row[key]) >= filter.slice(4));
          if (filter?.startsWith('lt.'))
            results = results.filter((row) => String(row[key]) < filter.slice(3));
        }
        const orders = (url.searchParams.get('order') || '').split(',');
        results = [...results].sort((a, b) => {
          for (const order of orders) {
            const [key, direction] = order.split('.');
            const comparison = String(a[key]).localeCompare(String(b[key]));
            if (comparison) return direction === 'desc' ? -comparison : comparison;
          }
          return 0;
        });
      }
      if (table === 'reimburse' && level !== 'inti')
        results = results.filter((r) => r.pemohon_id === userId);
      if (table === 'reimburse_approval' && level !== 'inti')
        results = results.filter((h) =>
          rows.reimburse.some((r) => r.id === h.reimburse_id && r.pemohon_id === userId),
        );
      if (['kas_mutasi', 'pagu_anggaran'].includes(table) && level !== 'inti') results = [];
      if (table === 'panitia_requests') results = results.filter((r) => mayReadRequest(r, true));
      if (table === 'panitia_assignments')
        results = results.filter(
          (a) =>
            a.user_id === userId ||
            rows.panitia_requests.some((r) => r.id === a.request_id && mayReadRequest(r)),
        );
      if (table === 'panitia_history')
        results = results.filter((h) =>
          rows.panitia_requests.some((r) => r.id === h.request_id && mayReadRequest(r)),
        );
      if (table === 'media_resources')
        results = results.filter((r) => !r.archived_at || level === 'inti' || field === 'branding');
      if (table === 'content_history' && level !== 'inti' && field !== 'branding') results = [];
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
