import { useState, useEffect, useCallback } from 'react';
import { productService, categoryService, unitService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';

const STATUS_MAP = {
  aktif: { label: 'Aktif', color: 'green' },
  nonaktif: { label: 'Nonaktif', color: 'red' },
};

const EMPTY = {
  kode_produk: '', nama_produk: '', category_id: '', unit_id: '',
  harga_jual: '', harga_modal: '', stok: '', tanggal_kedaluwarsa: '', status: 'aktif',
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'Admin';

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  const load = useCallback(async () => {
    const res = await productService.getAll(page, search);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoryService.getAll('produk').then((r) => setCategories(r.data.data));
    unitService.getAll().then((r) => setUnits(r.data.data));
  }, []);

  const openAdd = () => { setForm(EMPTY); setErrors({}); setModal('add'); };
  const openEdit = (row) => {
    setForm({
      ...row,
      category_id: row.category_id ?? row.category?.id ?? '',
      unit_id: row.unit_id ?? row.unit?.id ?? '',
      tanggal_kedaluwarsa: row.tanggal_kedaluwarsa ?? '',
    });
    setErrors({});
    setModal(row);
  };
  const closeModal = () => setModal(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modal === 'add') {
        await productService.create(form);
        showToast('Produk berhasil ditambahkan');
      } else {
        await productService.update(modal.id, form);
        showToast('Produk berhasil diperbarui');
      }
      closeModal();
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus produk "${row.nama_produk}"?`)) return;
    try {
      const res = await productService.delete(row.id);
      if (res.data.deactivated) {
        showToast(res.data.message, 'warning');
      } else {
        showToast('Produk berhasil dihapus');
      }
      load();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal menghapus', 'error');
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'kode_produk', label: 'Kode' },
    { key: 'nama_produk', label: 'Nama Produk' },
    { key: 'category', label: 'Kategori', render: (r) => r.category?.name ?? '-' },
    { key: 'unit', label: 'Satuan', render: (r) => r.unit?.name ?? '-' },
    { key: 'stok', label: 'Stok', render: (r) => `${r.stok} ${r.unit?.name ?? ''}` },
    {
      key: 'tanggal_kedaluwarsa',
      label: 'Tgl Kedaluwarsa',
      render: (r) => {
        if (!r.tanggal_kedaluwarsa) return <span className="text-gray-400 italic">-</span>;
        const targetDate = new Date(r.tanggal_kedaluwarsa.split('T')[0]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const days = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
        const cls = days < 0 ? 'text-red-600 font-semibold' : days <= 7 ? 'text-orange-600 font-medium' : 'text-gray-700';
        return <span className={cls}>{r.tanggal_kedaluwarsa.split('T')[0]} ({days < 0 ? 'Expired' : `${days}d`})</span>;
      },
    },
    { key: 'harga_jual', label: 'Harga Jual', render: (r) => IDR(r.harga_jual) },
    { key: 'harga_modal', label: 'Harga Modal', render: (r) => IDR(r.harga_modal) },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Produk" onAdd={isAdmin ? openAdd : undefined} />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari produk..." />
      </div>

      <Table columns={columns} data={data} onEdit={isAdmin ? openEdit : undefined} onDelete={isAdmin ? handleDelete : undefined} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Produk' : 'Edit Produk'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Kode Produk">
                <input
                  readOnly
                  value={modal === 'add' ? '(otomatis)' : form.kode_produk}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 italic"
                />
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onChange={set('status')}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Nama Produk" error={errors.nama_produk?.[0]}>
              <Input value={form.nama_produk} onChange={set('nama_produk')} required />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Kategori" error={errors.category_id?.[0]}>
                <Select value={form.category_id} onChange={set('category_id')} required>
                  <option value="">Pilih Kategori</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Satuan" error={errors.unit_id?.[0]}>
                <Select value={form.unit_id} onChange={set('unit_id')} required>
                  <option value="">Pilih Satuan</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name} {u.symbol ? `(${u.symbol})` : ''}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Harga Jual" error={errors.harga_jual?.[0]}>
                <Input type="number" min="0" value={form.harga_jual} onChange={set('harga_jual')} required />
              </FormField>
              <FormField label="Harga Modal (HPP)" error={errors.harga_modal?.[0]}>
                <Input type="number" min="0" value={form.harga_modal} onChange={set('harga_modal')} required />
                <span className="text-[10px] text-gray-400 block mt-0.5">*Otomatis disinkronkan dari Resep</span>
              </FormField>
              <FormField label="Stok" error={errors.stok?.[0]}>
                <Input type="number" min="0" value={form.stok} onChange={set('stok')} required />
              </FormField>
            </div>
            <FormField label="Tanggal Kedaluwarsa" error={errors.tanggal_kedaluwarsa?.[0]}>
              <Input type="date" value={form.tanggal_kedaluwarsa} onChange={set('tanggal_kedaluwarsa')} />
            </FormField>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
