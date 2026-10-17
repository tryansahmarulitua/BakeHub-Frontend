import { useState, useEffect, useCallback } from 'react';
import { recipeService, productService, rawMaterialService, unitService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';
import ProductPicker from '../../components/ProductPicker';

const STATUS_MAP = {
  aktif:    { label: 'Aktif', color: 'green' },
  nonaktif: { label: 'Nonaktif', color: 'red' },
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);

const EMPTY_FORM = {
  product_id: '',
  name: '',
  output_quantity: '',
  biaya_kemasan: 0,
  overhead_percent: 10,
  status: 'aktif',
};

export default function Recipes() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);     // null | 'add' | recipe (edit)
  const [viewModal, setViewModal] = useState(null);
  const [calcModal, setCalcModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [details, setDetails] = useState([{ raw_material_id: '', unit_id: '', quantity: '' }]);

  // Calc state
  const [calcQty, setCalcQty] = useState('');
  const [calcResult, setCalcResult] = useState([]);
  const [calcLoading, setCalcLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await recipeService.getAll(page, search);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productService.getAll(1, '').then((r) => setProducts(r.data.data.data));
    rawMaterialService.getAll(1, '').then((r) => setMaterials(r.data.data.data));
    unitService.getAll().then((r) => setUnits(r.data.data));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setDetails([{ raw_material_id: '', unit_id: '', quantity: '' }]);
    setErrors({});
    setModal('add');
  };

  const openEdit = (row) => {
    setForm({
      product_id: row.product_id,
      name: row.name,
      output_quantity: row.output_quantity,
      biaya_kemasan: row.biaya_kemasan ?? 0,
      overhead_percent: row.overhead_percent ?? 10,
      status: row.status,
    });
    setDetails(row.details?.map((d) => ({
      raw_material_id: d.raw_material_id,
      unit_id: d.unit_id,
      quantity: d.quantity,
    })) ?? []);
    setErrors({});
    setModal(row);
  };

  const addDetailRow = () => setDetails([...details, { raw_material_id: '', unit_id: '', quantity: '' }]);
  const removeDetailRow = (i) => setDetails(details.filter((_, idx) => idx !== i));
  const updateDetail = (i, k, v) => {
    const next = [...details];
    next[i][k] = v;
    if (k === 'raw_material_id') {
      const mat = materials.find((m) => String(m.id) === String(v));
      if (mat) next[i].unit_id = mat.unit_id;
    }
    setDetails(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, details };
      if (modal === 'add') {
        await recipeService.create(payload);
        showToast('Resep berhasil dibuat');
      } else {
        await recipeService.update(modal.id, payload);
        showToast('Resep berhasil diperbarui');
      }
      setModal(null);
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus resep "${row.name}"?`)) return;
    await recipeService.delete(row.id);
    showToast('Resep dihapus', 'error');
    load();
  };

  const handleCalc = async (e) => {
    e.preventDefault();
    setCalcLoading(true);
    try {
      const res = await recipeService.calculate(calcModal.id, parseFloat(calcQty));
      setCalcResult(res.data.data);
    } catch (err) {
      showToast('Gagal menghitung', 'error');
    } finally {
      setCalcLoading(false);
    }
  };

  // Kalkulasi estimasi live biaya modal
  const estimateBahan = details.reduce((sum, d) => {
    if (!d.raw_material_id || !d.quantity) return sum;
    const mat = materials.find((m) => String(m.id) === String(d.raw_material_id));
    if (!mat) return sum;
    const recipeUnit = units.find((u) => String(u.id) === String(d.unit_id));
    const stockUnit = units.find((u) => String(u.id) === String(mat.unit_id));
    let multiplier = 1;
    if (recipeUnit && stockUnit) {
      if (recipeUnit.category === 'weight' && stockUnit.category === 'weight') {
        const rSym = (recipeUnit.symbol || recipeUnit.name).toLowerCase();
        const sSym = (stockUnit.symbol || stockUnit.name).toLowerCase();
        if (rSym === 'g' && sSym === 'kg') multiplier = 0.001;
        else if (rSym === 'mg' && sSym === 'kg') multiplier = 0.000001;
        else if (rSym === 'mg' && sSym === 'g') multiplier = 0.001;
        else if (rSym === 'kg' && sSym === 'g') multiplier = 1000;
      }
    }
    return sum + (Number(d.quantity) * multiplier * Number(mat.harga_beli || 0));
  }, 0);

  const estimateKemasan = Number(form.biaya_kemasan || 0);
  const estimateOverhead = estimateBahan * (Number(form.overhead_percent || 0) / 100);
  const estimateTotalProduksi = estimateBahan + estimateKemasan + estimateOverhead;
  const estimateHargaModalPerUnit = Number(form.output_quantity) > 0
    ? estimateTotalProduksi / Number(form.output_quantity)
    : 0;

  const columns = [
    { key: 'name', label: 'Nama Resep' },
    { key: 'product', label: 'Produk', render: (r) => r.product?.nama_produk ?? '-' },
    { key: 'output_quantity', label: 'Output', render: (r) => `${r.output_quantity} ${r.product?.unit?.name ?? 'pcs'}` },
    { key: 'biaya_bahan', label: 'Bahan Baku', render: (r) => IDR(r.biaya_bahan) },
    { key: 'biaya_kemasan', label: 'Kemasan', render: (r) => IDR(r.biaya_kemasan) },
    { key: 'biaya_overhead', label: 'Overhead', render: (r) => `${IDR(r.biaya_overhead)} (${Number(r.overhead_percent || 0)}%)` },
    { key: 'total_biaya_produksi', label: 'Total Biaya', render: (r) => <span className="font-semibold">{IDR(r.total_biaya_produksi)}</span> },
    {
      key: 'harga_modal_per_unit',
      label: 'Harga Modal / Kue',
      render: (r) => (
        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {IDR(r.harga_modal_per_unit)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
    {
      key: 'actions', label: 'Aksi',
      render: (r) => (
        <div className="flex items-center gap-2 whitespace-nowrap min-w-[200px]">
          <button onClick={() => setViewModal(r)} className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition">Detail</button>
          <button onClick={() => { setCalcModal(r); setCalcQty(''); setCalcResult([]); }} className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs font-medium transition">Simulasi</button>
          <button onClick={() => openEdit(r)} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium transition">Edit</button>
          <button onClick={() => handleDelete(r)} className="px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition">Hapus</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Resep / BOM" onAdd={openAdd} addLabel="+ Buat Resep" />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari resep..." />
      </div>

      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {/* Add / Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Buat Resep Baru' : `Edit Resep: ${modal.name}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Produk" error={errors.product_id?.[0]}>
                <ProductPicker
                  products={products}
                  value={form.product_id}
                  onChange={(id) => setForm({ ...form, product_id: id })}
                  error={errors.product_id?.[0]}
                />
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Nama Resep" error={errors.name?.[0]}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Output Kue (Hasil)" error={errors.output_quantity?.[0]}>
                <Input type="number" min="0.01" step="0.01" value={form.output_quantity} onChange={(e) => setForm({ ...form, output_quantity: e.target.value })} required />
              </FormField>
              <FormField label="Biaya Kemasan (Rp)" error={errors.biaya_kemasan?.[0]}>
                <Input type="number" min="0" value={form.biaya_kemasan} onChange={(e) => setForm({ ...form, biaya_kemasan: e.target.value })} placeholder="Toples, stiker, plastik" />
              </FormField>
              <FormField label="Overhead (%)" error={errors.overhead_percent?.[0]}>
                <Input type="number" min="0" max="100" step="0.5" value={form.overhead_percent} onChange={(e) => setForm({ ...form, overhead_percent: e.target.value })} placeholder="10 - 20%" />
              </FormField>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Komposisi Bahan Baku (Modal Variabel)</label>
                <button type="button" onClick={addDetailRow} className="text-xs text-indigo-600 hover:underline">+ Tambah Bahan</button>
              </div>
              <div className="space-y-2">
                {details.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={d.raw_material_id} onChange={(e) => updateDetail(i, 'raw_material_id', e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded" required>
                      <option value="">Pilih Bahan</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama_bahan} ({IDR(m.harga_beli)}/{m.unit?.name ?? 'satuan'})
                        </option>
                      ))}
                    </select>
                    <input type="number" min="0.001" step="0.001" value={d.quantity}
                      onChange={(e) => updateDetail(i, 'quantity', e.target.value)}
                      placeholder="Qty" className="w-20 px-2 py-1 text-sm border rounded" required />
                    <select value={d.unit_id} onChange={(e) => updateDetail(i, 'unit_id', e.target.value)}
                      className="w-24 px-2 py-1 text-sm border rounded" required>
                      <option value="">Satuan</option>
                      {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    {details.length > 1 && (
                      <button type="button" onClick={() => removeDetailRow(i)} className="text-red-500">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Card Estimasi Biaya Modal */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 text-sm border-b pb-1">
                Kalkulasi Otomatis Biaya Produksi (HPP)
              </div>
              <div className="flex justify-between text-slate-600">
                <span>• Biaya Bahan Baku:</span>
                <span className="font-medium">{IDR(estimateBahan)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>• Biaya Kemasan (Toples/Stiker/Plastik):</span>
                <span className="font-medium">{IDR(estimateKemasan)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>• Biaya Overhead ({form.overhead_percent || 0}% Gas/Listrik/Air/Transport):</span>
                <span className="font-medium">{IDR(estimateOverhead)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-semibold border-t pt-1">
                <span>Total Biaya Produksi 1 Batch:</span>
                <span>{IDR(estimateTotalProduksi)}</span>
              </div>
              <div className="flex justify-between items-center text-indigo-700 font-bold bg-indigo-50 p-2 rounded border border-indigo-200 text-sm">
                <span>Harga Modal per Kue ({form.output_quantity || 1} pcs):</span>
                <span>{IDR(estimateHargaModalPerUnit)}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Detail Modal */}
      {viewModal && (
        <Modal title={`Detail Resep: ${viewModal.name}`} onClose={() => setViewModal(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded">
              <p><strong>Produk:</strong> {viewModal.product?.nama_produk}</p>
              <p><strong>Output (Hasil):</strong> {viewModal.output_quantity} {viewModal.product?.unit?.name ?? 'pcs'}</p>
              <p><strong>Status:</strong> <Badge value={viewModal.status} map={STATUS_MAP} /></p>
              <p><strong>Overhead Rate:</strong> {Number(viewModal.overhead_percent || 0)}%</p>
            </div>

            {/* Rincian Komponen Biaya */}
            <div className="border rounded-lg p-3 bg-indigo-50/50 space-y-1.5 text-xs">
              <p className="font-semibold text-gray-800 text-sm mb-1">Rincian Modal Variabel:</p>
              <div className="flex justify-between">
                <span className="text-gray-600">• Biaya Bahan Baku:</span>
                <span className="font-medium">{IDR(viewModal.biaya_bahan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">• Biaya Kemasan:</span>
                <span className="font-medium">{IDR(viewModal.biaya_kemasan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">• Biaya Overhead/Operasional ({Number(viewModal.overhead_percent || 0)}%):</span>
                <span className="font-medium">{IDR(viewModal.biaya_overhead)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t pt-1">
                <span>Total Biaya Produksi:</span>
                <span>{IDR(viewModal.total_biaya_produksi)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-indigo-700 bg-indigo-100/70 p-2 rounded text-sm mt-1">
                <span>Harga Modal per Kue (Unit):</span>
                <span>{IDR(viewModal.harga_modal_per_unit)}</span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-2">Komposisi Bahan:</p>
              <table className="min-w-full border text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Bahan</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-left">Satuan</th>
                    <th className="px-3 py-2 text-right">Harga Beli Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModal.details?.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{d.raw_material?.nama_bahan}</td>
                      <td className="px-3 py-2 text-right">{d.quantity}</td>
                      <td className="px-3 py-2">{d.unit?.name}</td>
                      <td className="px-3 py-2 text-right">{IDR(d.raw_material?.harga_beli)}/{d.raw_material?.unit?.name ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Calc Modal */}
      {calcModal && (
        <Modal title={`Hitung Kebutuhan: ${calcModal.name}`} onClose={() => setCalcModal(null)}>
          <form onSubmit={handleCalc} className="space-y-4">
            <FormField label="Jumlah Produksi (pcs)">
              <div className="flex gap-2">
                <Input type="number" min="0.01" step="0.01" value={calcQty} onChange={(e) => setCalcQty(e.target.value)} required />
                <button type="submit" disabled={calcLoading} className="px-4 py-2 text-sm bg-purple-600 text-white rounded disabled:opacity-50">
                  {calcLoading ? '...' : 'Hitung'}
                </button>
              </div>
            </FormField>

            {calcResult.length > 0 && (
              <table className="min-w-full border text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Bahan</th>
                    <th className="px-3 py-2 text-right">Dibutuhkan</th>
                    <th className="px-3 py-2 text-right">Tersedia</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calcResult.map((r, i) => (
                    <tr key={i} className={`border-t ${!r.cukup ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-2 font-medium">{r.nama_bahan}</td>
                      <td className="px-3 py-2 text-right">
                        <span>{r.quantity_needed} {r.unit}</span>
                        {r.stok_unit && r.stok_unit !== r.unit && (
                          <div className="text-[10px] text-gray-500">
                            ≈ {r.quantity_needed_in_stock} {r.stok_unit}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{r.stok_tersedia} {r.stok_unit ?? r.unit}</td>
                      <td className="px-3 py-2 text-center">
                        {r.cukup
                          ? <span className="text-green-600 font-medium">✓ Cukup</span>
                          : <span className="text-red-600 font-medium">✗ Kurang</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
