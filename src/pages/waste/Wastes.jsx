import { useState, useEffect, useCallback } from 'react';
import { wasteService, productService, rawMaterialService } from '../../services/api';
import {
  PageHeader, Table, Pagination, Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const REASON_MAP = {
  expired:           { label: 'Expired', color: 'red' },
  damaged:           { label: 'Rusak', color: 'red' },
  burned:            { label: 'Gosong', color: 'red' },
  failed_production: { label: 'Gagal Produksi', color: 'yellow' },
  unsold:            { label: 'Tidak Terjual', color: 'gray' },
  spill:             { label: 'Tumpah', color: 'yellow' },
  other:             { label: 'Lainnya', color: 'gray' },
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const EMPTY = {
  item_type: 'product', item_id: '', waste_date: new Date().toISOString().split('T')[0],
  quantity: '', reason: 'expired', estimated_loss: 0, notes: '',
};

export default function Wastes() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY);

  // Reference lists
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  const load = useCallback(async () => {
    const res = await wasteService.getAll(page);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    productService.getAll(1, '').then((r) => setProducts(r.data.data.data ?? []));
    rawMaterialService.getAll(1, '').then((r) => setRawMaterials(r.data.data.data ?? []));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const calcLoss = (item_id, item_type, quantity, pList, rmList) => {
    const list = item_type === 'product' ? pList : rmList;
    const item = list.find((x) => String(x.id) === String(item_id));
    const harga = item_type === 'product' ? parseFloat(item?.harga_modal ?? 0) : parseFloat(item?.harga_beli ?? 0);
    return Math.round(harga * (parseFloat(quantity) || 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await wasteService.create(form);
      showToast('Waste berhasil dicatat, stok dikurangi');
      setModal(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
      showToast(err.response?.data?.message ?? 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'waste_number', label: 'Nomor' },
    { key: 'waste_date', label: 'Tanggal' },
    { key: 'item_type', label: 'Tipe', render: (r) => r.item_type === 'product' ? 'Produk' : 'Bahan Baku' },
    { key: 'item', label: 'Item', render: (r) => r.item_type === 'product'
      ? (r.product?.nama_produk ?? '-')
      : (r.raw_material?.nama_bahan ?? '-') },
    { key: 'quantity', label: 'Qty' },
    { key: 'reason', label: 'Alasan', render: (r) => <Badge value={r.reason} map={REASON_MAP} /> },
    { key: 'estimated_loss', label: 'Kerugian', render: (r) => IDR(r.estimated_loss) },
    { key: 'creator', label: 'Dicatat Oleh', render: (r) => r.creator?.name ?? '-' },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Waste" onAdd={() => setModal(true)} addLabel="+ Catat Waste" />
      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal title="Catat Waste" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <FormField label="Tipe Item" error={errors.item_type?.[0]}>
                <Select value={form.item_type} onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value, item_id: '', estimated_loss: 0 }))}>
                  <option value="product">Produk</option>
                  <option value="raw_material">Bahan Baku</option>
                </Select>
              </FormField>
              <FormField label={form.item_type === 'product' ? 'Produk' : 'Bahan Baku'} error={errors.item_id?.[0]}>
                {(() => {
                  const list = form.item_type === 'product' ? products : rawMaterials;
                  const kodeKey = form.item_type === 'product' ? 'kode_produk' : 'kode_bahan';
                  const namaKey = form.item_type === 'product' ? 'nama_produk' : 'nama_bahan';
                  const selected = list.find((x) => String(x.id) === String(form.item_id));
                  return (
                    <div className="flex gap-2">
                      <div className="w-36">
                        <label className="block text-xs text-gray-500 mb-1">Kode</label>
                        <select
                          value={form.item_id}
                          onChange={(e) => setForm((f) => ({
                            ...f,
                            item_id: e.target.value,
                            estimated_loss: calcLoss(e.target.value, f.item_type, f.quantity, products, rawMaterials),
                          }))}
                          required
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          <option value="">— Kode —</option>
                          {list.map((x) => (
                            <option key={x.id} value={x.id}>{x[kodeKey]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Nama</label>
                        <input
                          readOnly
                          value={selected?.[namaKey] ?? ''}
                          placeholder="Pilih kode →"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-700"
                        />
                      </div>
                    </div>
                  );
                })()}
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tanggal" error={errors.waste_date?.[0]}>
                <Input type="date" value={form.waste_date} onChange={set('waste_date')} required />
              </FormField>
              <FormField label="Jumlah" error={errors.quantity?.[0]}>
                <Input type="number" min="0.01" step="0.01" value={form.quantity}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    quantity: e.target.value,
                    estimated_loss: calcLoss(f.item_id, f.item_type, e.target.value, products, rawMaterials),
                  }))}
                  required />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Alasan" error={errors.reason?.[0]}>
                <Select value={form.reason} onChange={set('reason')}>
                  <option value="expired">Expired</option>
                  <option value="damaged">Rusak</option>
                  <option value="burned">Gosong</option>
                  <option value="failed_production">Gagal Produksi</option>
                  <option value="unsold">Tidak Terjual</option>
                  <option value="spill">Tumpah</option>
                  <option value="other">Lainnya</option>
                </Select>
              </FormField>
              <FormField label="Estimasi Kerugian (Rp)" error={errors.estimated_loss?.[0]}>
                <input
                  readOnly
                  value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(form.estimated_loss)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-700 font-medium"
                />
              </FormField>
            </div>
            <FormField label="Catatan">
              <Input value={form.notes} onChange={set('notes')} placeholder="Opsional..." />
            </FormField>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-red-600 text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Catat Waste'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
