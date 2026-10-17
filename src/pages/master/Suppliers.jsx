import { useState, useEffect, useCallback } from 'react';
import { supplierService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const STATUS_MAP = {
  aktif: { label: 'Aktif', color: 'green' },
  nonaktif: { label: 'Nonaktif', color: 'red' },
};

const EMPTY = {
  kode_supplier: '', nama_supplier: '', nama_pic: '',
  nomor_telepon: '', email: '', alamat: '', status: 'aktif',
};

export default function Suppliers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | row
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await supplierService.getAll(page, search);
    setData(res.data.data.data);
    setMeta(res.data.data);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setErrors({}); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row }); setErrors({}); setModal(row); };
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
        await supplierService.create(form);
        showToast('Supplier berhasil ditambahkan');
      } else {
        await supplierService.update(modal.id, form);
        showToast('Supplier berhasil diperbarui');
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
    if (!window.confirm(`Hapus supplier "${row.nama_supplier}"?`)) return;
    await supplierService.delete(row.id);
    showToast('Supplier dihapus', 'error');
    load();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'kode_supplier', label: 'Kode' },
    { key: 'nama_supplier', label: 'Nama Supplier' },
    { key: 'nama_pic', label: 'PIC' },
    { key: 'nomor_telepon', label: 'Telepon' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Supplier" onAdd={openAdd} />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari supplier..." />
      </div>

      <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal
          title={modal === 'add' ? 'Tambah Supplier' : 'Edit Supplier'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Kode Supplier">
              <input
                readOnly
                value={modal === 'add' ? '(otomatis)' : form.kode_supplier}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 italic"
              />
            </FormField>
            <FormField label="Nama Supplier" error={errors.nama_supplier?.[0]}>
              <Input value={form.nama_supplier} onChange={set('nama_supplier')} error={errors.nama_supplier} required />
            </FormField>
            <FormField label="Nama PIC" error={errors.nama_pic?.[0]}>
              <Input value={form.nama_pic} onChange={set('nama_pic')} error={errors.nama_pic} required />
            </FormField>
            <FormField label="Nomor Telepon" error={errors.nomor_telepon?.[0]}>
              <Input value={form.nomor_telepon} onChange={set('nomor_telepon')} error={errors.nomor_telepon} required />
            </FormField>
            <FormField label="Email" error={errors.email?.[0]}>
              <Input type="email" value={form.email} onChange={set('email')} error={errors.email} required />
            </FormField>
            <FormField label="Alamat" error={errors.alamat?.[0]}>
              <textarea
                value={form.alamat}
                onChange={set('alamat')}
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
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
