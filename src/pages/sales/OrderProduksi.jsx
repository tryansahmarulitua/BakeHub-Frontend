import { useState, useEffect, useCallback } from 'react';
import { productionService, productService, recipeService } from '../../services/api';
import {
  PageHeader, Table, Pagination, Modal, FormField, Input, Badge, Toast,
} from '../../components/ui';
import ProductPicker from '../../components/ProductPicker';

const STATUS_MAP = {
  draft:      { label: 'Draft', color: 'gray' },
  planned:    { label: 'Planned', color: 'blue' },
  processing: { label: 'Proses', color: 'yellow' },
  completed:  { label: 'Selesai', color: 'green' },
  cancelled:  { label: 'Batal', color: 'red' },
};

const LOW_STOCK = 10;

export default function OrderProduksi() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    production_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const load = useCallback(async () => {
    // Filter: hanya tampilkan order yang notesnya diawali [Order Kasir]
    const res = await productionService.getAll(page);
    const all = res.data.data.data;
    setData(all.filter((d) => d.notes?.startsWith('[Order Kasir]') || d.notes?.startsWith('[Auto Kasir]')));
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

  const openModal = () => {
    setForm({ product_id: '', quantity: '', production_date: new Date().toISOString().split('T')[0], notes: '' });
    setModal(true);
  };

  const activeRecipe = (product_id) =>
    recipes.find((r) => String(r.product_id) === String(product_id) && r.status === 'aktif');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const recipe = activeRecipe(form.product_id);
    if (!recipe) {
      showToast('Tidak ada resep aktif untuk produk ini', 'error');
      return;
    }
    setLoading(true);
    try {
      await productionService.create({
        product_id: form.product_id,
        recipe_id: recipe.id,
        quantity: parseFloat(form.quantity),
        production_date: form.production_date,
        notes: form.notes ? `[Order Kasir] ${form.notes}` : '[Order Kasir]',
      });
      showToast('Order produksi berhasil dikirim ke Staff Produksi');
      setModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal membuat order', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Produk stok menipis untuk info kasir
  const lowStockProducts = products.filter((p) => parseFloat(p.stok) < LOW_STOCK);

  const columns = [
    { key: 'nomor_produksi', label: 'Nomor Order' },
    { key: 'product', label: 'Produk', render: (r) => r.product?.nama_produk ?? '-' },
    { key: 'quantity', label: 'Qty', render: (r) => `${r.quantity} pcs` },
    { key: 'production_date', label: 'Tanggal' },
    { key: 'notes', label: 'Catatan', render: (r) => r.notes?.replace(/^\[Order Kasir\]\s*/, '') || '-' },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Order Produksi" onAdd={openModal} addLabel="+ Buat Order" />

      {/* Panel stok menipis */}
      {lowStockProducts.length > 0 && (
        <div className="mb-4 border border-orange-300 bg-orange-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-orange-700 mb-2">⚠️ Stok Produk Menipis — pertimbangkan buat order produksi</p>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setForm({
                    product_id: String(p.id),
                    quantity: String(LOW_STOCK * 2),
                    production_date: new Date().toISOString().split('T')[0],
                    notes: 'Stok menipis',
                  });
                  setModal(true);
                }}
                className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                {p.kode_produk} – {p.nama_produk} (sisa {p.stok})
              </button>
            ))}
          </div>
        </div>
      )}

      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal title="Buat Order Produksi" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-gray-500">
              Order masuk ke Staff Produksi dengan status <em>Draft</em>.
            </p>

            <FormField label="Produk">
              <ProductPicker
                products={products}
                value={form.product_id}
                onChange={(id) => setForm((f) => ({ ...f, product_id: id }))}
              />
              {form.product_id && !activeRecipe(form.product_id) && (
                <p className="text-xs text-red-500 mt-1">⚠ Tidak ada resep aktif — order tidak bisa dibuat.</p>
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Jumlah (pcs)">
                <Input
                  type="number" min="0.01" step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Tanggal">
                <Input
                  type="date"
                  value={form.production_date}
                  onChange={(e) => setForm((f) => ({ ...f, production_date: e.target.value }))}
                  required
                />
              </FormField>
            </div>

            <FormField label="Catatan">
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opsional..."
              />
            </FormField>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !form.product_id || !form.quantity || !activeRecipe(form.product_id)}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded disabled:opacity-50 hover:bg-orange-700"
              >
                {loading ? 'Menyimpan...' : 'Buat Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
