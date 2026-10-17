import { useState, useEffect, useCallback } from 'react';
import { goodsReceiptService, purchaseOrderService } from '../../services/api';
import {
  PageHeader, Table, Pagination, Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const STATUS_MAP = {
  draft:     { label: 'Draft', color: 'gray' },
  completed: { label: 'Selesai', color: 'green' },
};

export default function GoodsReceipts() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [poList, setPoList] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [tanggalTerima, setTanggalTerima] = useState(new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState('');
  const [details, setDetails] = useState([]);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    const res = await goodsReceiptService.getAll(page);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // Load PO yang statusnya approved/ordered/partially_received
    purchaseOrderService.getAll(1, {}).then((r) => {
      const eligible = r.data.data.data.filter((po) =>
        ['approved', 'ordered', 'partially_received'].includes(po.status)
      );
      setPoList(eligible);
    });
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePoSelect = async (poId) => {
    if (!poId) {
      setSelectedPo(null);
      setDetails([]);
      return;
    }
    const res = await purchaseOrderService.get(poId);
    const po = res.data.data;
    setSelectedPo(po);
    // Isi detail dari PO
    setDetails(
      po.details.map((d) => ({
        raw_material_id: d.raw_material_id,
        quantity_ordered: d.quantity,
        quantity_received: d.quantity,
        quantity_rejected: 0,
        expired_date: '',
        _raw_material: d.raw_material,
      }))
    );
  };

  const updateDetail = (idx, field, val) => {
    const next = [...details];
    next[idx][field] = val;
    setDetails(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await goodsReceiptService.create({
        purchase_order_id: selectedPo.id,
        tanggal_terima: tanggalTerima,
        catatan,
        details: details.map((d) => ({
          raw_material_id: d.raw_material_id,
          quantity_ordered: d.quantity_ordered,
          quantity_received: d.quantity_received,
          quantity_rejected: d.quantity_rejected,
          expired_date: d.expired_date || null,
        })),
      });
      showToast('Goods Receipt berhasil dibuat');
      setModal(false);
      setSelectedPo(null);
      setDetails([]);
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id) => {
    if (!window.confirm('Konfirmasi penerimaan barang? Stok akan diperbarui.')) return;
    try {
      await goodsReceiptService.complete(id);
      showToast('GR dikonfirmasi, stok diperbarui');
      load();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal', 'error');
    }
  };

  const columns = [
    { key: 'nomor_gr', label: 'Nomor GR' },
    { key: 'po', label: 'Nomor PO', render: (r) => r.purchase_order?.nomor_po ?? '-' },
    { key: 'supplier', label: 'Supplier', render: (r) => r.purchase_order?.supplier?.nama_supplier ?? '-' },
    { key: 'tanggal_terima', label: 'Tanggal' },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
    {
      key: 'actions',
      label: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => setViewModal(r)} className="text-blue-600 hover:underline">Detail</button>
          {r.status === 'draft' && (
            <button onClick={() => handleComplete(r.id)} className="text-green-600 hover:underline">Konfirmasi</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Goods Receipt" onAdd={() => setModal(true)} addLabel="+ Terima Barang" />
      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {/* Modal Buat GR */}
      {modal && (
        <Modal title="Terima Barang (Goods Receipt)" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Purchase Order" error={errors.purchase_order_id?.[0]}>
              <Select value={selectedPo?.id ?? ''} onChange={(e) => handlePoSelect(e.target.value)} required>
                <option value="">Pilih PO</option>
                {poList.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.nomor_po} - {po.supplier?.nama_supplier} ({po.status})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tanggal Terima">
              <Input type="date" value={tanggalTerima} onChange={(e) => setTanggalTerima(e.target.value)} required />
            </FormField>

            <FormField label="Catatan">
              <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Opsional..." />
            </FormField>

            {selectedPo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item yang Diterima</label>
                <div className="space-y-2">
                  {details.map((d, idx) => (
                    <div key={idx} className="border p-3 rounded bg-gray-50 space-y-2">
                      <p className="text-sm font-medium">{d._raw_material?.nama_bahan}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-600">Dipesan</label>
                          <input
                            type="number"
                            value={d.quantity_ordered}
                            disabled
                            className="w-full px-2 py-1 text-sm border rounded bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Diterima</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={d.quantity_received}
                            onChange={(e) => updateDetail(idx, 'quantity_received', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Ditolak</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={d.quantity_rejected}
                            onChange={(e) => updateDetail(idx, 'quantity_rejected', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Tanggal Kedaluwarsa (opsional)</label>
                        <input
                          type="date"
                          value={d.expired_date}
                          onChange={(e) => updateDetail(idx, 'expired_date', e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading || !selectedPo} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Buat GR'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detail GR */}
      {viewModal && (
        <Modal title={`Detail ${viewModal.nomor_gr}`} onClose={() => setViewModal(null)}>
          <div className="space-y-3 text-sm">
            <p><strong>PO:</strong> {viewModal.purchase_order?.nomor_po}</p>
            <p><strong>Supplier:</strong> {viewModal.purchase_order?.supplier?.nama_supplier}</p>
            <p><strong>Tanggal Terima:</strong> {viewModal.tanggal_terima}</p>
            <p><strong>Status:</strong> <Badge value={viewModal.status} map={STATUS_MAP} /></p>
            <p><strong>Catatan:</strong> {viewModal.catatan || '-'}</p>

            <table className="min-w-full divide-y divide-gray-200 mt-3 border text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Bahan</th>
                  <th className="px-2 py-1 text-right">Dipesan</th>
                  <th className="px-2 py-1 text-right">Diterima</th>
                  <th className="px-2 py-1 text-right">Ditolak</th>
                </tr>
              </thead>
              <tbody>
                {viewModal.details?.map((d) => (
                  <tr key={d.id}>
                    <td className="px-2 py-1">{d.raw_material?.nama_bahan}</td>
                    <td className="px-2 py-1 text-right">{d.quantity_ordered}</td>
                    <td className="px-2 py-1 text-right">{d.quantity_received}</td>
                    <td className="px-2 py-1 text-right">{d.quantity_rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
