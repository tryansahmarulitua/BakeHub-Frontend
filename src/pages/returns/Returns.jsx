import { useState, useEffect, useCallback } from 'react';
import { returnService, salesService, purchaseOrderService, productService, rawMaterialService } from '../../services/api';
import {
  PageHeader, Table, Pagination, Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const STATUS_MAP = {
  pending:   { label: 'Pending', color: 'yellow' },
  approved:  { label: 'Approved', color: 'blue' },
  completed: { label: 'Selesai', color: 'green' },
  rejected:  { label: 'Ditolak', color: 'red' },
};

const TYPE_MAP = {
  purchase_return: { label: 'Return Pembelian', color: 'blue' },
  sales_return:    { label: 'Return Penjualan', color: 'yellow' },
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const EMPTY_FORM = {
  return_type: 'sales_return',
  reference_id: '',
  return_date: new Date().toISOString().split('T')[0],
  reason: '',
  notes: '',
  details: [{ item_type: 'product', item_id: '', quantity: '', condition: 'good' }],
};

export default function Returns() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);

  // Reference lists
  const [sales, setSales] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  const load = useCallback(async () => {
    const res = await returnService.getAll(page);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    salesService.getAll(1, { per_page: 999 }).then((r) => setSales(r.data.data.data ?? []));
    purchaseOrderService.getAll(1, { per_page: 999 }).then((r) => setPurchaseOrders(r.data.data.data ?? []));
    productService.getAll(1, '').then((r) => setProducts(r.data.data.data ?? []));
    rawMaterialService.getAll(1, '').then((r) => setRawMaterials(r.data.data.data ?? []));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addRow = () => setForm((f) => ({
    ...f, details: [...f.details, { item_type: 'product', item_id: '', quantity: '', condition: 'good' }],
  }));
  const removeRow = (i) => setForm((f) => ({ ...f, details: f.details.filter((_, idx) => idx !== i) }));
  const updateRow = (i, k, v) => {
    const d = [...form.details];
    d[i][k] = v;
    setForm((f) => ({ ...f, details: d }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await returnService.create(form);
      showToast('Return berhasil dibuat');
      setModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
    } finally {
      setLoading(false);
    }
  };

  const action = async (fn, id, msg) => {
    try { await fn(id); showToast(msg); load(); }
    catch (err) { showToast(err.response?.data?.message ?? 'Gagal', 'error'); }
  };

  const columns = [
    { key: 'return_number', label: 'Nomor' },
    { key: 'return_type', label: 'Tipe', render: (r) => <Badge value={r.return_type} map={TYPE_MAP} /> },
    { key: 'reference_id', label: 'Ref ID' },
    { key: 'return_date', label: 'Tanggal' },
    { key: 'reason', label: 'Alasan', render: (r) => <span className="max-w-xs truncate block">{r.reason}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
    {
      key: 'actions', label: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => setViewModal(r)} className="text-blue-600 hover:underline">Detail</button>
          {r.status === 'pending' && (
            <button onClick={() => action(returnService.approve, r.id, 'Return diapprove')} className="text-yellow-600 hover:underline">Approve</button>
          )}
          {r.status === 'approved' && (
            <button onClick={() => action(returnService.complete, r.id, 'Return selesai, stok diperbarui')} className="text-green-600 hover:underline font-semibold">Selesaikan</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Return" onAdd={() => setModal(true)} addLabel="+ Buat Return" />
      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal title="Buat Return" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipe Return" error={errors.return_type?.[0]}>
                <Select value={form.return_type} onChange={(e) => setForm({ ...form, return_type: e.target.value, reference_id: '' })}>
                  <option value="sales_return">Return Penjualan</option>
                  <option value="purchase_return">Return Pembelian</option>
                </Select>
              </FormField>
              <FormField label={form.return_type === 'sales_return' ? 'Nomor Penjualan' : 'Nomor PO'} error={errors.reference_id?.[0]}>
                <Select value={form.reference_id} onChange={(e) => setForm({ ...form, reference_id: e.target.value })} required>
                  <option value="">— Pilih —</option>
                  {(form.return_type === 'sales_return' ? sales : purchaseOrders).map((ref) => (
                    <option key={ref.id} value={ref.id}>
                      {form.return_type === 'sales_return'
                        ? `${ref.invoice_number} — ${ref.customer?.nama ?? 'Umum'} (${ref.sale_date})`
                        : `${ref.nomor_po} — ${ref.supplier?.nama_supplier ?? '-'} (${ref.tanggal_po})`}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Tanggal Return" error={errors.return_date?.[0]}>
              <Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} required />
            </FormField>
            <FormField label="Alasan" error={errors.reason?.[0]}>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
            </FormField>
            <FormField label="Catatan">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Item</label>
                <button type="button" onClick={addRow} className="text-xs text-indigo-600 hover:underline">+ Tambah</button>
              </div>
              {form.details.map((d, i) => {
                const itemList = d.item_type === 'product' ? products : rawMaterials;
                const kodeKey = d.item_type === 'product' ? 'kode_produk' : 'kode_bahan';
                const namaKey = d.item_type === 'product' ? 'nama_produk' : 'nama_bahan';
                const selectedItem = itemList.find((x) => String(x.id) === String(d.item_id));
                return (
                  <div key={i} className="border rounded p-2 space-y-2 mb-2">
                    <div className="flex gap-2">
                      <Select value={d.item_type} onChange={(e) => updateRow(i, 'item_type', e.target.value)}>
                        <option value="product">Produk</option>
                        <option value="raw_material">Bahan Baku</option>
                      </Select>
                      <Select value={d.condition} onChange={(e) => updateRow(i, 'condition', e.target.value)}>
                        <option value="good">Baik</option>
                        <option value="damaged">Rusak</option>
                      </Select>
                      {form.details.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} className="text-red-500 px-2">×</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Kode — dropdown pilih */}
                      <div className="w-32">
                        <label className="text-xs text-gray-500">Kode</label>
                        <select
                          value={d.item_id}
                          onChange={(e) => updateRow(i, 'item_id', e.target.value)}
                          required
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          <option value="">— Kode —</option>
                          {itemList.map((x) => (
                            <option key={x.id} value={x.id}>{x[kodeKey]}</option>
                          ))}
                        </select>
                      </div>
                      {/* Nama auto-isi */}
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Nama</label>
                        <input
                          readOnly
                          value={selectedItem?.[namaKey] ?? ''}
                          placeholder="Pilih kode →"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-700"
                        />
                      </div>
                      {/* Qty */}
                      <div className="w-24">
                        <label className="text-xs text-gray-500">Qty</label>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={d.quantity}
                          onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                          placeholder="Qty"
                          required
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Buat Return'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewModal && (
        <Modal title={`Detail ${viewModal.return_number}`} onClose={() => setViewModal(null)}>
          <div className="space-y-2 text-sm">
            <p><strong>Tipe:</strong> <Badge value={viewModal.return_type} map={TYPE_MAP} /></p>
            <p><strong>Tanggal:</strong> {viewModal.return_date}</p>
            <p><strong>Alasan:</strong> {viewModal.reason}</p>
            <p><strong>Status:</strong> <Badge value={viewModal.status} map={STATUS_MAP} /></p>
            <p><strong>Item:</strong> {viewModal.details?.length ?? 0} item</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
