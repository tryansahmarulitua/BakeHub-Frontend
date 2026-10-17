import { useState, useEffect, useCallback } from 'react';
import { productionService, productService, recipeService } from '../../services/api';
import {
  PageHeader, Table, Pagination, Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';
import ProductPicker from '../../components/ProductPicker';

const STATUS_MAP = {
  draft:      { label: 'Draft', color: 'gray' },
  planned:    { label: 'Planned', color: 'blue' },
  processing: { label: 'Proses', color: 'yellow' },
  completed:  { label: 'Selesai', color: 'green' },
  cancelled:  { label: 'Batal', color: 'red' },
};

export default function Productions() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);

  const [form, setForm] = useState({
    product_id: '',
    recipe_id: '',
    quantity: '',
    production_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const load = useCallback(async () => {
    const res = await productionService.getAll(page);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productService.getAll(1, '').then((r) => setProducts(r.data.data.data));
    recipeService.getAll(1, '').then((r) => setRecipes(r.data.data.data));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setField = (k) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: val };
      if (k === 'product_id') {
        const filtered = recipes.filter((r) => String(r.product_id) === String(val) && r.status === 'aktif');
        setFilteredRecipes(filtered);
        next.recipe_id = '';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await productionService.create(form);
      showToast('Produksi berhasil dibuat');
      setModal(false);
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
      showToast(err.response?.data?.message ?? 'Gagal', 'error');
    }
  };

  const handleView = async (row) => {
    const res = await productionService.get(row.id);
    setViewModal(res.data.data);
  };

  const columns = [
    { key: 'nomor_produksi', label: 'Nomor' },
    { key: 'product', label: 'Produk', render: (r) => r.product?.nama_produk ?? '-' },
    { key: 'recipe', label: 'Resep', render: (r) => r.recipe?.name ?? '-' },
    { key: 'quantity', label: 'Qty', render: (r) => `${r.quantity} pcs` },
    { key: 'production_date', label: 'Tanggal' },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
    {
      key: 'actions', label: 'Aksi',
      render: (r) => (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleView(r)} className="text-blue-600 hover:underline">Detail</button>
          {r.status === 'draft' && (
            <button onClick={() => action(productionService.start, r.id, 'Produksi dimulai')} className="text-yellow-600 hover:underline">Mulai</button>
          )}
          {r.status === 'processing' && (
            <button onClick={() => action(productionService.complete, r.id, 'Produksi selesai!')} className="text-green-600 hover:underline font-semibold">Selesaikan</button>
          )}
          {!['completed', 'cancelled'].includes(r.status) && (
            <button onClick={() => action(productionService.cancel, r.id, 'Produksi dibatalkan')} className="text-red-600 hover:underline">Batal</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Produksi" onAdd={() => setModal(true)} addLabel="+ Buat Produksi" />
      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {/* Buat Produksi */}
      {modal && (
        <Modal title="Buat Order Produksi" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Produk" error={errors.product_id?.[0]}>
              <ProductPicker
                products={products}
                value={form.product_id}
                onChange={(id, p) => {
                  const filtered = recipes.filter((r) => String(r.product_id) === String(id) && r.status === 'aktif');
                  setFilteredRecipes(filtered);
                  setForm((f) => ({ ...f, product_id: id, recipe_id: '' }));
                }}
                error={errors.product_id?.[0]}
              />
            </FormField>

            <FormField label="Resep / BOM" error={errors.recipe_id?.[0]}>
              <Select value={form.recipe_id} onChange={setField('recipe_id')} required disabled={!form.product_id}>
                <option value="">Pilih Resep</option>
                {filteredRecipes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (output: {r.output_quantity})</option>
                ))}
              </Select>
              {form.product_id && filteredRecipes.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Tidak ada resep aktif untuk produk ini.</p>
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Jumlah Produksi (pcs)" error={errors.quantity?.[0]}>
                <Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={setField('quantity')} required />
              </FormField>
              <FormField label="Tanggal Produksi" error={errors.production_date?.[0]}>
                <Input type="date" value={form.production_date} onChange={setField('production_date')} required />
              </FormField>
            </div>

            <FormField label="Catatan">
              <Input value={form.notes} onChange={setField('notes')} placeholder="Opsional..." />
            </FormField>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Buat Produksi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Produksi */}
      {viewModal && (
        <Modal title={`Detail: ${viewModal.nomor_produksi}`} onClose={() => setViewModal(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p><strong>Produk:</strong> {viewModal.product?.nama_produk}</p>
              <p><strong>Resep:</strong> {viewModal.recipe?.name}</p>
              <p><strong>Qty:</strong> {viewModal.quantity} pcs</p>
              <p><strong>Tanggal:</strong> {viewModal.production_date}</p>
              <p><strong>Status:</strong> <Badge value={viewModal.status} map={STATUS_MAP} /></p>
            </div>

            {viewModal.notes && <p><strong>Catatan:</strong> {viewModal.notes}</p>}

            <div className="mt-3">
              <p className="font-medium text-gray-700 mb-2">Kebutuhan Bahan:</p>
              <table className="min-w-full border text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Bahan</th>
                    <th className="px-3 py-2 text-right">Dibutuhkan</th>
                    <th className="px-3 py-2 text-right">Digunakan</th>
                    <th className="px-3 py-2 text-left">Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModal.details?.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2">{d.raw_material?.nama_bahan}</td>
                      <td className="px-3 py-2 text-right">{d.quantity_needed}</td>
                      <td className="px-3 py-2 text-right">{d.quantity_used}</td>
                      <td className="px-3 py-2">{d.unit?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
