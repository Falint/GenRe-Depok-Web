'use client';
import { usePortal } from '@/features/portal/PortalProvider';

export default function BudgetSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { budgetOptions, dataError, refreshData } = usePortal();
  const year = Number(
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date()),
  );
  const options = budgetOptions.filter((item) => item.tahun_anggaran === year);
  return (
    <div>
      <label htmlFor="budget-pos" className="block font-bold text-slate-700 mb-1">
        Pos anggaran tahun berjalan *
      </label>
      <select
        id="budget-pos"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full p-2 rounded-xl border border-slate-200"
      >
        <option value="">Pilih pos anggaran</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.bidang} ({item.tahun_anggaran})
          </option>
        ))}
      </select>
      {dataError ? (
        <p role="alert">
          Pilihan anggaran gagal dimuat.{' '}
          <button type="button" onClick={() => void refreshData()} className="underline">
            Muat ulang pilihan
          </button>
        </p>
      ) : (
        !options.length && (
          <p className="mt-2 text-amber-800">
            Pos tahun berjalan belum tersedia. Hubungi administrator.
          </p>
        )
      )}
    </div>
  );
}
