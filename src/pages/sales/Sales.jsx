import { useState, useEffect, useCallback } from 'react';
import { salesService, productService, customerService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast, formatDate,
} from '../../components/ui';
import ProductPicker from '../../components/ProductPicker';

const STATUS_MAP = {
  completed: { label: 'Selesai', color: 'green' },
  cancelled: { label: 'Batal', color: 'red' },
};

const PAYMENT_MAP = {
  cash:    { label: 'Cash', color: 'gray' },
  transfer:{ label: 'Transfer', color: 'blue' },
  qris:    { label: 'QRIS', color: 'purple' },
  e_wallet:{ label: 'E-Wallet', color: 'indigo' },
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function Sales() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    discount: 0,
    tax: 0,
    payment_method: 'cash',
    payment_amount: 0,
    notes: '',
    details: [{ product_id: '', quantity: 1, unit_price: 0 }],
  });

  const load = useCallback(async () => {
    const res = await salesService.getAll(page, { search });
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productService.getAll(1, '').then((r) => setProducts(r.data.data.data));
    customerService.getAll(1, '').then((r) => setCustomers(r.data.data.data));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addDetailRow = () => {
    setForm((f) => ({ ...f, details: [...f.details, { product_id: '', quantity: 1, unit_price: 0 }] }));
  };

  const removeDetailRow = (idx) => {
    setForm((f) => ({ ...f, details: f.details.filter((_, i) => i !== idx) }));
  };

  const updateDetail = (idx, field, val) => {
    const product = products.find((p) => String(p.id) === String(val));
    const next = { ...form };
    next.details[idx][field] = val;
    if (field === 'product_id' && product) {
      next.details[idx].unit_price = product.harga_jual;
    }
    setForm(next);
  };

  const calculateTotals = () => {
    const subtotal = form.details.reduce((sum, d) => sum + (d.quantity * d.unit_price), 0);
    const discount = parseFloat(form.discount) || 0;
    const dpp = Math.max(0, subtotal - discount);
    const tax = Math.round(dpp * 0.12); // PPN 12% otomatis
    const total = dpp + tax;
    const payment = parseFloat(form.payment_amount) || 0;
    const change = Math.max(0, payment - total);
    return { subtotal, discount, tax, total, payment, change };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const { subtotal, discount, tax, total, payment, change } = calculateTotals();
      const payload = {
        ...form,
        subtotal,
        discount,
        tax,
        total,
        payment_amount: payment,
        change_amount: change,
      };
      await salesService.create(payload);
      showToast('Penjualan berhasil dicatat');
      setModal(false);
      setForm({
        customer_id: '',
        sale_date: new Date().toISOString().split('T')[0],
        discount: 0,
        tax: 0,
        payment_method: 'cash',
        payment_amount: 0,
        notes: '',
        details: [{ product_id: '', quantity: 1, unit_price: 0 }],
      });
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
    setViewModal(row);
    try {
      const res = await salesService.get(row.id);
      if (res.data?.data) setViewModal(res.data.data);
    } catch {
      // fallback
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Nomor' },
    { key: 'customer', label: 'Customer', render: (r) => r.customer?.nama ?? '-' },
    { key: 'sale_date', label: 'Tanggal' },
    { key: 'total', label: 'Total', render: (r) => IDR(r.total) },
    { key: 'payment_method', label: 'Metode', render: (r) => <Badge value={r.payment_method} map={PAYMENT_MAP} /> },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
    {
      key: 'actions', label: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => handleView(r)} className="text-blue-600 hover:underline">Detail</button>
          {r.status === 'completed' && (
            <button onClick={() => action(salesService.cancel, r.id, 'Penjualan dibatalkan')} className="text-red-600 hover:underline">Batal</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Penjualan" onAdd={() => setModal(true)} addLabel="+ Buat Penjualan" />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nomor invoice..." />
      </div>

      <Table columns={columns} data={data} />
      <Pagination meta={meta} onPageChange={setPage} />

      {/* Modal Buat Penjualan */}
      {modal && (
        <Modal title="Buat Penjualan Baru" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Customer" error={errors.customer_id?.[0]}>
                <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">Pilih Customer (opsional)</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </Select>
              </FormField>
              <FormField label="Tanggal Penjualan" error={errors.sale_date?.[0]}>
                <Input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} required />
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Diskon (Rp)" error={errors.discount?.[0]}>
                <Input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
              </FormField>
              <FormField label="PPN (12% Otomatis)">
                <input
                  type="text"
                  readOnly
                  value={IDR(calculateTotals().tax)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium"
                />
              </FormField>
              <FormField label="Metode Pembayaran" error={errors.payment_method?.[0]}>
                <Select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="e_wallet">E-Wallet</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Jumlah Bayar" error={errors.payment_amount?.[0]}>
              <Input type="number" min="0" value={form.payment_amount} onChange={(e) => setForm({ ...form, payment_amount: parseFloat(e.target.value) || 0 })} required />
            </FormField>

            <FormField label="Catatan">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsional..." />
            </FormField>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Item Produk</label>
                <button type="button" onClick={addDetailRow} className="text-xs text-[#800020] hover:underline">+ Tambah Baris</button>
              </div>
              <div className="space-y-3">
                {form.details.map((d, idx) => (
                  <div key={idx} className="border rounded p-2 space-y-1">
                    <ProductPicker
                      products={products}
                      value={d.product_id}
                      onChange={(id, p) => {
                        const next = { ...form };
                        next.details[idx].product_id = id;
                        next.details[idx].unit_price = p?.harga_jual ?? 0;
                        setForm(next);
                      }}
                    />
                    <div className="flex gap-2 items-center mt-1">
                      <input type="number" min="0.01" step="0.01" value={d.quantity}
                        onChange={(e) => updateDetail(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty" className="w-20 px-2 py-1 text-sm border rounded" required />
                      <input type="number" min="0" value={d.unit_price}
                        onChange={(e) => updateDetail(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="Harga" className="w-28 px-2 py-1 text-sm border rounded" required />
                      <span className="text-xs text-gray-500 flex-1 text-right">
                        {IDR(d.quantity * d.unit_price)}
                      </span>
                      {form.details.length > 1 && (
                        <button type="button" onClick={() => removeDetailRow(idx)} className="text-red-500">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <div className="flex justify-between py-0.5"><span>Subtotal:</span><span>{IDR(calculateTotals().subtotal)}</span></div>
              <div className="flex justify-between py-0.5 text-red-600"><span>Diskon:</span><span>-{IDR(calculateTotals().discount)}</span></div>
              <div className="flex justify-between py-0.5 text-[#4d0013] font-medium"><span>PPN (12%):</span><span>+{IDR(calculateTotals().tax)}</span></div>
              <div className="flex justify-between py-1 font-bold text-base border-t text-gray-900"><span>Total Tagihan:</span><span>{IDR(calculateTotals().total)}</span></div>
              <div className="flex justify-between py-0.5"><span>Bayar:</span><span>{IDR(calculateTotals().payment)}</span></div>
              <div className="flex justify-between py-0.5 font-semibold text-green-700"><span>Kembalian:</span><span>{IDR(calculateTotals().change)}</span></div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-[#800020] text-white rounded disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Buat Penjualan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detail Penjualan */}
      {viewModal && (
        <Modal title={`Detail Penjualan: ${viewModal.invoice_number}`} onClose={() => setViewModal(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg text-xs">
              <p><strong>Customer:</strong> {viewModal.customer?.nama ?? 'Umum / Walk-in'}</p>
              <p><strong>Tanggal:</strong> {formatDate(viewModal.sale_date)}</p>
              <p><strong>Kasir:</strong> {viewModal.creator?.name ?? '-'}</p>
              <p><strong>Metode:</strong> <Badge value={viewModal.payment_method} map={PAYMENT_MAP} /></p>
              <p><strong>Status:</strong> <Badge value={viewModal.status} map={STATUS_MAP} /></p>
              <p><strong>Catatan:</strong> {viewModal.notes || '-'}</p>
            </div>

            <div>
              <p className="font-semibold text-gray-700 text-xs mb-2">Item Produk:</p>
              <table className="min-w-full border text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Produk</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Harga Satuan</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Diskon</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {viewModal.details && viewModal.details.length > 0 ? (
                    viewModal.details.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{d.product?.nama_produk ?? '-'}</td>
                        <td className="px-3 py-2 text-right">{Number(d.quantity)} {d.product?.unit?.symbol || d.product?.unit?.name || ''}</td>
                        <td className="px-3 py-2 text-right">{IDR(d.unit_price)}</td>
                        <td className="px-3 py-2 text-right text-red-500">{Number(d.discount) > 0 ? `-${IDR(d.discount)}` : '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">{IDR(d.subtotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-gray-400">
                        Tidak ada detail produk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">{IDR(viewModal.subtotal)}</span>
              </div>
              {Number(viewModal.discount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon Tambahan:</span>
                  <span className="font-medium">-{IDR(viewModal.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>PPN (12%):</span>
                <span className="font-medium">+{IDR(viewModal.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#4d0013] border-t pt-1.5">
                <span>Total:</span>
                <span>{IDR(viewModal.total)}</span>
              </div>
              <div className="flex justify-between text-gray-700 pt-1">
                <span>Jumlah Bayar:</span>
                <span className="font-medium">{IDR(viewModal.payment_amount)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Kembalian:</span>
                <span>{IDR(viewModal.change_amount)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

