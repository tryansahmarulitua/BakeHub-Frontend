import { useState, useEffect, useCallback } from 'react';
import { purchaseOrderService, supplierService, rawMaterialService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const STATUS_MAP = {
  draft:              { label: 'Draft', color: 'gray' },
  submitted:          { label: 'Submitted', color: 'blue' },
  approved:           { label: 'Approved', color: 'yellow' },
  ordered:            { label: 'Ordered', color: 'yellow' },
  partially_received: { label: 'Parsial', color: 'yellow' },
  received:           { label: 'Diterima', color: 'green' },
  cancelled:          { label: 'Batal', color: 'red' },
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function PurchaseOrders() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [tanggalPo, setTanggalPo] = useState(new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState('');
  const [details, setDetails] = useState([{ raw_material_id: '', quantity: 1, unit_price: 0 }]);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    const res = await purchaseOrderService.getAll(page, { search });
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supplierService.getAll(1, '').then((r) => setSuppliers(r.data.data.data));
    rawMaterialService.getAll(1, '').then((r) => setMaterials(r.data.data.data));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addDetailRow = () => {
    setDetails([...details, { raw_material_id: '', quantity: 1, unit_price: 0 }]);
  };

  const removeDetailRow = (idx) => {
    setDetails(details.filter((_, i) => i !== idx));
  };

  const updateDetail = (idx, field, val) => {
    const next = [...details];
    next[idx][field] = val;
    if (field === 'raw_material_id') {
      const mat = materials.find((m) => String(m.id) === String(val));
      if (mat) next[idx].unit_price = mat.harga_beli;
    }
    setDetails(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await purchaseOrderService.create({
        supplier_id: supplierId,
        tanggal_po: tanggalPo,
        catatan,
        details,
      });
      showToast('Purchase Order berhasil dibuat');
      setModal(false);
      setDetails([{ raw_material_id: '', quantity: 1, unit_price: 0 }]);
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
    } finally {
      setLoading(false);
    }
  };

  const action = async (fn, id, msg) => {
    try {
      await fn(id);
      showToast(msg);
      load();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal memproses', 'error');
    }
  };

  const columns = [
    { key: 'nomor_po', label: 'Nomor PO' },
    { key: 'supplier', label: 'Supplier', render: (r) => r.supplier?.nama_supplier ?? '-' },
    { key: 'tanggal_po', label: 'Tanggal' },
    { key: 'total', label: 'Total', render: (r) => IDR(r.total) },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
    {
      key: 'actions',
      label: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => setViewModal(r)} className="text-blue-600 hover:underline">Detail</button>
          {r.status === 'draft' && (
            <button onClick={() => action(purchaseOrderService.submit, r.id, 'PO disubmit')} className="text-yellow-600 hover:underline">Submit</button>
          )}
          {r.status === 'submitted' && (
            <button onClick={() => action(purchaseOrderService.approve, r.id, 'PO diapprove')} className="text-green-600 hover:underline">Approve</button>
          )}
          {!['received', 'cancelled'].includes(r.status) && (
            <button onClick={() => action(purchaseOrderService.cancel, r.id, 'PO dibatalkan')} className="text-red-600 hover:underline">Batal</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Purchase Order" onAdd={() => setModal(true)} addLabel="+ Buat PO" />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nomor PO..." />
      </div>

      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {/* Modal Buat PO */}
      {modal && (
        <Modal title="Buat Purchase Order Baru" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Supplier" error={errors.supplier_id?.[0]}>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Pilih Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama_supplier}</option>)}
              </Select>
            </FormField>

            <FormField label="Tanggal PO" error={errors.tanggal_po?.[0]}>
              <Input type="date" value={tanggalPo} onChange={(e) => setTanggalPo(e.target.value)} required />
            </FormField>

            <FormField label="Catatan">
              <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Opsional..." />
            </FormField>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Item Bahan Baku</label>
                <button type="button" onClick={addDetailRow} className="text-xs text-indigo-600 hover:underline">+ Tambah Baris</button>
              </div>
              <div className="space-y-2">
                {details.map((d, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={d.raw_material_id}
                      onChange={(e) => updateDetail(idx, 'raw_material_id', e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      required
                    >
                      <option value="">Pilih Bahan</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.nama_bahan} ({m.unit?.name ?? ''})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={d.quantity}
                      onChange={(e) => updateDetail(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-20 px-2 py-1 text-sm border rounded"
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      value={d.unit_price}
                      onChange={(e) => updateDetail(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="Harga"
                      className="w-28 px-2 py-1 text-sm border rounded"
                      required
                    />
                    <span className="text-xs text-gray-500 w-24 text-right">
                      {IDR(d.quantity * d.unit_price)}
                    </span>
                    {details.length > 1 && (
                      <button type="button" onClick={() => removeDetailRow(idx)} className="text-red-500 text-sm">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Buat PO'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detail PO */}
      {viewModal && (
        <Modal title={`Detail ${viewModal.nomor_po}`} onClose={() => setViewModal(null)}>
          <div className="space-y-3 text-sm">
            <p><strong>Supplier:</strong> {viewModal.supplier?.nama_supplier}</p>
            <p><strong>Tanggal:</strong> {viewModal.tanggal_po}</p>
            <p><strong>Status:</strong> <Badge value={viewModal.status} map={STATUS_MAP} /></p>
            <p><strong>Catatan:</strong> {viewModal.catatan || '-'}</p>

            <table className="min-w-full divide-y divide-gray-200 mt-3 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Bahan</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {viewModal.details?.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2">{d.raw_material?.nama_bahan}</td>
                    <td className="px-3 py-2 text-right">{d.quantity}</td>
                    <td className="px-3 py-2 text-right">{IDR(d.unit_price)}</td>
                    <td className="px-3 py-2 text-right">{IDR(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right font-bold pt-2">
              Total: {IDR(viewModal.total)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
