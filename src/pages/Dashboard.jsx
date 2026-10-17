import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services/api';
import { Toast } from '../components/ui';

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
const NUM = (v) => new Intl.NumberFormat('id-ID').format(v);

function KPICard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-500', green: 'bg-green-500',
    red: 'bg-red-500', yellow: 'bg-yellow-500',
    blue: 'bg-blue-500', purple: 'bg-purple-500',
  };
  return (
    <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
      <div className={`w-3 rounded-full h-16 ${colors[color]}`} />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await reportService.dashboard(month);
      setData(res.data.data);
    } catch {
      setToast({ message: 'Gagal memuat dashboard', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  if (!data) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">BakeHub ERP</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Periode:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Total Penjualan" value={IDR(data.totalSales)} sub="Bulan ini" color="green" />
        <KPICard label="Total Produksi" value={`${NUM(data.totalProductions)} pcs`} sub="Bulan ini" color="blue" />
        <KPICard label="Total Waste" value={IDR(data.totalWasteValue)} sub="Estimasi kerugian" color="red" />
        <KPICard label="Nilai Inventory" value={IDR(data.inventoryValue)} sub="Bahan baku" color="indigo" />
        <KPICard label="Stok Minimum" value={data.lowStockCount} sub="Di bawah batas" color="yellow" />
        <KPICard label="Akan Expired" value={data.expiringCount} sub="14 hari ke depan" color="purple" />
      </div>

      {(data.lowStockCount > 0 || data.expiringCount > 0) && (
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-700">Peringatan</h2>
          {data.lowStockCount > 0 && (
            <div className="flex justify-between px-4 py-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
              <span className="text-sm font-medium">Bahan baku di bawah stok minimum</span>
              <span className="font-bold">{data.lowStockCount}</span>
            </div>
          )}
          {data.expiringCount > 0 && (
            <div className="flex justify-between px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-800">
              <span className="text-sm font-medium">Bahan baku mendekati expired</span>
              <span className="font-bold">{data.expiringCount}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Penjualan Harian</h2>
          {data.salesChart?.length > 0 ? (
            <div className="space-y-2">
              {data.salesChart.map((d) => {
                const max = Math.max(...data.salesChart.map((x) => Number(x.total)));
                const pct = max > 0 ? (Number(d.total) / max) * 100 : 0;
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 shrink-0">{d.date.slice(5)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                      <div className="bg-indigo-500 h-4 rounded-full" style={{ width: pct + '%' }} />
                    </div>
                    <span className="text-xs text-gray-700 w-28 text-right shrink-0">{IDR(d.total)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Belum ada penjualan bulan ini</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Produk Terlaris</h2>
          {data.topProducts?.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-2">#</th><th className="text-left pb-2">Produk</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Revenue</th></tr></thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.product_id} className="border-b last:border-0">
                    <td className="py-2 text-gray-400">{i+1}</td>
                    <td className="py-2 font-medium">{p.product?.nama_produk}</td>
                    <td className="py-2 text-right">{NUM(p.total_qty)}</td>
                    <td className="py-2 text-right text-green-600">{IDR(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Belum ada data penjualan</p>
          )}
        </div>
      </div>
    </div>
  );
}
