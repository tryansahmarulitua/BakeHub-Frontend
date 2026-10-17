import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/api';
import { PageHeader, Toast } from '../../components/ui';

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
const NUM = (v) => new Intl.NumberFormat('id-ID').format(v);

const TABS = [
  { key: 'sales', label: 'Penjualan' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'production', label: 'Produksi' },
  { key: 'waste', label: 'Waste' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const now = new Date().toISOString().split('T')[0];
  const firstOfMonth = now.slice(0, 7) + '-01';

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(now);
  const [exporting, setExporting] = useState(false);

  const showToast = (msg, type = 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const downloadBlob = (blobData, filename) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = activeTab !== 'inventory' ? { from_date: fromDate, to_date: toDate } : {};
      const res = format === 'pdf'
        ? await reportService.exportPdf(activeTab, params)
        : await reportService.exportExcel(activeTab, params);

      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `laporan-${activeTab}-${now}.${ext}`;
      downloadBlob(res.data, filename);
      showToast(`Laporan ${format.toUpperCase()} berhasil diunduh`, 'success');
    } catch {
      showToast(`Gagal mengunduh laporan ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      let res;
      if (activeTab === 'inventory') {
        res = await reportService.inventory();
      } else {
        res = await reportService[activeTab]({ from_date: fromDate, to_date: toDate });
      }
      setData(res.data.data);
    } catch {
      showToast('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [activeTab, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const renderContent = () => {
    if (loading) return <p className="text-center text-gray-400 py-12">Memuat laporan...</p>;
    if (!data) return null;

    switch (activeTab) {
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Transaksi</p>
                <p className="text-2xl font-bold">{NUM(data.summary?.total_transactions)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{IDR(data.summary?.total_revenue)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Item Terjual</p>
                <p className="text-2xl font-bold">{NUM(data.summary?.total_items)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold mb-3">Per Metode Pembayaran</h3>
                <table className="min-w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-1">Metode</th><th className="text-right pb-1">Trx</th><th className="text-right pb-1">Revenue</th></tr></thead>
                  <tbody>
                    {Object.entries(data.byPayment ?? {}).map(([method, v]) => (
                      <tr key={method} className="border-b last:border-0">
                        <td className="py-1.5 capitalize">{method.replace('_', ' ')}</td>
                        <td className="py-1.5 text-right">{v.count}</td>
                        <td className="py-1.5 text-right text-green-600">{IDR(v.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold mb-3">Top 10 Produk Terlaris</h3>
                <table className="min-w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-1">Produk</th><th className="text-right pb-1">Qty</th><th className="text-right pb-1">Revenue</th></tr></thead>
                  <tbody>
                    {(data.topProducts ?? []).map((p) => (
                      <tr key={p.product_id} className="border-b last:border-0">
                        <td className="py-1.5">{p.product?.nama_produk}</td>
                        <td className="py-1.5 text-right">{NUM(p.total_qty)}</td>
                        <td className="py-1.5 text-right text-green-600">{IDR(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Nilai Inventory</p>
                <p className="text-2xl font-bold text-indigo-600">{IDR(data.totalValue)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Stok Minimum</p>
                <p className="text-2xl font-bold text-yellow-600">{data.lowStock?.length ?? 0} item</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Mendekati Expired</p>
                <p className="text-2xl font-bold text-red-600">{data.expiring?.length ?? 0} item</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Kode', 'Nama', 'Kategori', 'Stok', 'Satuan', 'Harga Beli', 'Nilai Stok', 'Expired'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.rawMaterials ?? []).map((r) => (
                    <tr key={r.id} className={`border-t ${r.stok <= r.stok_minimum ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-2">{r.kode_bahan}</td>
                      <td className="px-4 py-2 font-medium">{r.nama_bahan}</td>
                      <td className="px-4 py-2">{r.category?.name}</td>
                      <td className="px-4 py-2">{r.stok}</td>
                      <td className="px-4 py-2">{r.unit?.name}</td>
                      <td className="px-4 py-2">{IDR(r.harga_beli)}</td>
                      <td className="px-4 py-2 text-indigo-600">{IDR(r.nilai_stok)}</td>
                      <td className="px-4 py-2 text-red-500">{r.tanggal_kedaluwarsa ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'production':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Order</p>
                <p className="text-2xl font-bold">{data.summary?.total_orders}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Qty Diproduksi</p>
                <p className="text-2xl font-bold text-blue-600">{NUM(data.summary?.total_qty)} pcs</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold mb-3">Per Produk</h3>
              <table className="min-w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-1">Produk</th><th className="text-right pb-1">Total Qty</th></tr></thead>
                <tbody>
                  {(data.summary?.by_product ?? []).map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5">{p.product}</td>
                      <td className="py-1.5 text-right">{NUM(p.total_qty)} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'waste':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Waste</p>
                <p className="text-2xl font-bold">{data.summary?.total_records} catatan</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Kerugian</p>
                <p className="text-2xl font-bold text-red-600">{IDR(data.summary?.total_estimated_loss)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold mb-3">Per Alasan</h3>
                <table className="min-w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-1">Alasan</th><th className="text-right pb-1">Catatan</th><th className="text-right pb-1">Kerugian</th></tr></thead>
                  <tbody>
                    {Object.entries(data.summary?.by_reason ?? {}).map(([reason, v]) => (
                      <tr key={reason} className="border-b last:border-0">
                        <td className="py-1.5 capitalize">{reason.replace('_', ' ')}</td>
                        <td className="py-1.5 text-right">{v.count}</td>
                        <td className="py-1.5 text-right text-red-600">{IDR(v.loss)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold mb-3">Per Tipe Item</h3>
                {Object.entries(data.summary?.by_item_type ?? {}).map(([type, v]) => (
                  <div key={type} className="flex justify-between py-1 text-sm border-b last:border-0">
                    <span className="capitalize">{type === 'raw_material' ? 'Bahan Baku' : 'Produk'}</span>
                    <span className="text-red-600">{IDR(v.loss)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Laporan" />

      {/* Tab nav */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Action / Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {activeTab !== 'inventory' ? (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Dari:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
            />
            <label className="text-sm text-gray-600">Sampai:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
            />
            <button
              onClick={load}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
            >
              Tampilkan
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">
            * Laporan posisi stok dan valuasi inventory realtime
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
            title="Download PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Cetak PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
            title="Download Excel (.xlsx)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
