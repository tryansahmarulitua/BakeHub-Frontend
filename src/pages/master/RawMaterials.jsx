import { useState, useEffect, useCallback } from 'react';
import { rawMaterialService, categoryService, unitService, supplierService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const STATUS_MAP = {
  aktif: { label: 'Aktif', color: 'green' },
  nonaktif: { label: 'Nonaktif', color: 'red' },
};

const EMPTY = {
  kode_bahan: '', nama_bahan: '', category_id: '', unit_id: '',
  harga_beli: '', stok: '', stok_minimum: '',
  tanggal_kedaluwarsa: '', supplier_id: '', status: 'aktif',
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function RawMaterials() {
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
  const [suppliers, setSuppliers] = useState([]);

  const load = useCallback(async () => {
    const res = await rawMaterialService.getAll(page, search);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoryService.getAll('bahan').then((r) => setCategories(r.data.data));
    unitService.getAll().then((r) => setUnits(r.data.data));
    supplierService.getAll(1, '').then((r) => setSuppliers(r.data.data.data));
  }, []);

  const openAdd = () => { setForm(EMPTY); setErrors({}); setModal('add'); };
  const openEdit = (row) => {
    setForm({
      ...row,
      category_id: row.category_id ?? row.category?.id ?? '',
      unit_id: row.unit_id ?? row.unit?.id ?? '',
      supplier_id: row.supplier_id ?? row.supplier?.id ?? '',
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
        await rawMaterialService.create(form);
        showToast('Bahan baku berhasil ditambahkan');
      } else {
        await rawMaterialService.update(modal.id, form);
        showToast('Bahan baku berhasil diperbarui');
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
    if (!window.confirm(`Hapus bahan "${row.nama_bahan}"?`)) return;
    try {
      const res = await rawMaterialService.delete(row.id);
      if (res.data.deactivated) {
        showToast(res.data.message, 'warning');
      } else {
        showToast('Bahan baku berhasil dihapus');
      }
      load();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal menghapus', 'error');
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'kode_bahan', label: 'Kode' },
    { key: 'nama_bahan', label: 'Nama Bahan' },
    { key: 'category', label: 'Kategori', render: (r) => r.category?.name ?? '-' },
    { key: 'unit', label: 'Satuan', render: (r) => r.unit?.name ?? '-' },
    { key: 'stok', label: 'Stok', render: (r) => `${r.stok} ${r.unit?.name ?? ''}` },
    { key: 'harga_beli', label: 'Harga Beli', render: (r) => IDR(r.harga_beli) },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Bahan Baku" onAdd={openAdd} />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari bahan baku..." />
      </div>

      <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Kode Bahan">
                <input
                  readOnly
                  value={modal === 'add' ? '(otomatis)' : form.kode_bahan}
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
            <FormField label="Nama Bahan" error={errors.nama_bahan?.[0]}>
              <Input value={form.nama_bahan} onChange={set('nama_bahan')} required />
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
            <FormField label="Supplier" error={errors.supplier_id?.[0]}>
              <Select value={form.supplier_id} onChange={set('supplier_id')} required>
                <option value="">Pilih Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama_supplier}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Harga Beli" error={errors.harga_beli?.[0]}>
                <Input type="number" min="0" value={form.harga_beli} onChange={set('harga_beli')} required />
              </FormField>
              <FormField label="Stok" error={errors.stok?.[0]}>
                <Input type="number" min="0" value={form.stok} onChange={set('stok')} required />
              </FormField>
              <FormField label="Stok Minimum" error={errors.stok_minimum?.[0]}>
                <Input type="number" min="0" value={form.stok_minimum} onChange={set('stok_minimum')} required />
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
