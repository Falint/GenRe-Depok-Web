import { createClient } from '@supabase/supabase-js';

let client;

function getClient() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Konfigurasi Supabase belum tersedia.');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}

function fail(error) {
  if (error) throw new Error(error.message || 'Data portal tidak dapat dimuat.');
}

const date = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
const emptyFinance = { saldoUtama: 0, pemasukanBulanIni: 0, pengeluaranBulanIni: 0, paguAnggaran: [], transaksiTerbaru: [] };

export async function setPortalSession(session) {
  const supabase = getClient();
  const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  fail(error);
}

export async function clearPortalSession() {
  if (client) await client.auth.signOut({ scope: 'local' });
}

function mapSurat(row, approvals) {
  return {
    ...row, nomor: row.nomor_surat, pemohon: row.pemohon_nama, divisi: row.divisi,
    tanggal: row.tanggal || date(row.created_at),
    approvalHistory: approvals.filter((item) => item.surat_id === row.id).sort((a, b) => a.step_order - b.step_order).map((item) => ({ step: item.step_label, actor: item.actor_name, status: item.status, time: date(item.acted_at || item.created_at) })),
  };
}

function mapReimburse(row, approvals) {
  return {
    ...row, pemohon: row.pemohon_nama, divisi: row.divisi, tanggal: row.tanggal || date(row.created_at), buktiStruk: row.foto_struk_url,
    approvalChain: approvals.filter((item) => item.reimburse_id === row.id).sort((a, b) => a.step_order - b.step_order).map((item) => ({ role: item.role_label, name: item.actor_name, status: item.status, date: date(item.acted_at || item.created_at) })),
  };
}

function mapPengumuman(row, attendance, profiles) {
  return {
    ...row, tanggal: date(row.created_at), penulis: row.penulis_nama, totalTarget: row.total_target,
    roster: profiles.map((profile) => ({ id: profile.id, name: profile.nama_lengkap, role: profile.jabatan, group: profile.kelompok || '-', avatar: profile.avatar || '👤' })),
    readList: attendance.filter((item) => item.pengumuman_id === row.id).map((item) => {
      const profile = profiles.find((candidate) => candidate.id === item.user_id);
      return { userId: item.user_id, name: profile?.nama_lengkap || 'Pengurus', role: profile?.jabatan || '-', confirmedAt: date(item.confirmed_at) };
    }),
  };
}

function mapTiket(row) {
  return { ...row, dari: row.pemohon_nama, divisiAsal: row.divisi_asal, tujuan: row.target_bidang };
}

function mapFinance(mutations, budgets) {
  const currentMonth = new Date().getMonth();
  const thisMonth = mutations.filter((item) => new Date(item.tgl).getMonth() === currentMonth);
  const sum = (items) => items.reduce((total, item) => total + Number(item.nominal), 0);
  const incoming = sum(mutations.filter((item) => item.jenis === 'Masuk'));
  const outgoing = sum(mutations.filter((item) => item.jenis === 'Keluar'));
  return {
    saldoUtama: incoming - outgoing,
    pemasukanBulanIni: sum(thisMonth.filter((item) => item.jenis === 'Masuk')),
    pengeluaranBulanIni: sum(thisMonth.filter((item) => item.jenis === 'Keluar')),
    paguAnggaran: budgets.map((item) => ({ ...item, persentase: item.pagu ? Math.round((Number(item.terpakai) / Number(item.pagu)) * 1000) / 10 : 0 })),
    transaksiTerbaru: mutations.map((item) => ({ ...item, tgl: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.tgl)), sumberDana: item.sumber_dana })),
  };
}

export async function loadPortalData(profile) {
  const supabase = getClient();
  const requests = [
    supabase.from('surat').select('*').order('created_at', { ascending: false }),
    supabase.from('surat_approval').select('*').order('step_order'),
    supabase.from('reimburse').select('*').order('created_at', { ascending: false }),
    supabase.from('reimburse_approval').select('*').order('step_order'),
    supabase.from('pengumuman').select('*').order('created_at', { ascending: false }),
    supabase.from('pengumuman_kehadiran').select('*'),
    supabase.from('profiles').select('id,nama_lengkap,jabatan,kelompok,avatar'),
    supabase.from('tiket_info').select('*').order('created_at', { ascending: false }),
  ];
  if (profile.level === 'inti') requests.push(supabase.from('kas_mutasi').select('*').order('tgl', { ascending: false }), supabase.from('pagu_anggaran').select('*').order('bidang'));
  const results = await Promise.all(requests);
  results.forEach(({ error }) => fail(error));
  const [surat, suratApproval, reimburse, reimburseApproval, pengumuman, attendance, profiles, tiket, mutations = { data: [] }, budgets = { data: [] }] = results;
  return {
    suratList: surat.data.map((row) => mapSurat(row, suratApproval.data)),
    reimburseList: reimburse.data.map((row) => mapReimburse(row, reimburseApproval.data)),
    pengumumanList: pengumuman.data.map((row) => mapPengumuman(row, attendance.data, profiles.data)),
    tiketList: tiket.data.map(mapTiket),
    keuangan: profile.level === 'inti' ? mapFinance(mutations.data, budgets.data) : emptyFinance,
  };
}

export async function createPortalRow(table, payload) {
  const { data, error } = await getClient().from(table).insert(payload).select().single();
  fail(error); return data;
}

export async function updatePortalRow(table, id, payload) {
  const { data, error } = await getClient().from(table).update(payload).eq('id', id).select().single();
  fail(error); return data;
}

export async function subscribePortalData(onChange) {
  const channel = getClient().channel('portal-data-refresh').on('postgres_changes', { event: '*', schema: 'public', table: 'surat' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'surat_approval' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'reimburse' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'reimburse_approval' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'kas_mutasi' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'pagu_anggaran' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman_kehadiran' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'tiket_info' }, onChange).subscribe();
  return () => getClient().removeChannel(channel);
}
