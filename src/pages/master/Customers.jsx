import { useState, useEffect, useCallback } from 'react';
import { customerService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const TIPE_MAP = {
  umum: { label: 'Umum', color: 'gray' },
  member: { label: 'Member', color: 'blue' },
  reseller: { label: 'Reseller', color: 'yellow' },
  grosir: { label: 'Grosir', color: 'green' },
};

const EMPTY = {
  kode_customer: '', nama: '', nomor_telepon: '',
  email: '', alamat: '', tipe_customer: 'umum',
};

export default function Customers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await customerService.getAll(page, search);
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
        await customerService.create(form);
        showToast('Customer berhasil ditambahkan');
      } else {
        await customerService.update(modal.id, form);
        showToast('Customer berhasil diperbarui');
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
    if (!window.confirm(`Hapus customer "${row.nama}"?`)) return;
    await customerService.delete(row.id);
    showToast('Customer dihapus', 'error');
    load();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'kode_customer', label: 'Kode' },
    { key: 'nama', label: 'Nama' },
    { key: 'nomor_telepon', label: 'Telepon' },
    { key: 'email', label: 'Email' },
    { key: 'tipe_customer', label: 'Tipe', render: (r) => <Badge value={r.tipe_customer} map={TIPE_MAP} /> },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Customer" onAdd={openAdd} />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari customer..." />
      </div>

      <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />
      <Pagination meta={meta} onPageChange={setPage} />

      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Customer' : 'Edit Customer'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Kode Customer">
              <input
                readOnly
                value={modal === 'add' ? '(otomatis)' : form.kode_customer}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 italic"
              />
            </FormField>
            <FormField label="Nama" error={errors.nama?.[0]}>
              <Input value={form.nama} onChange={set('nama')} error={errors.nama} required />
            </FormField>
            <FormField label="Nomor Telepon" error={errors.nomor_telepon?.[0]}>
              <Input value={form.nomor_telepon} onChange={set('nomor_telepon')} required />
            </FormField>
            <FormField label="Email" error={errors.email?.[0]}>
              <Input type="email" value={form.email} onChange={set('email')} required />
            </FormField>
            <FormField label="Alamat" error={errors.alamat?.[0]}>
              <textarea value={form.alamat} onChange={set('alamat')} rows={3} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </FormField>
            <FormField label="Tipe Customer">
              <Select value={form.tipe_customer} onChange={set('tipe_customer')}>
                <option value="umum">Umum</option>
                <option value="member">Member</option>
                <option value="reseller">Reseller</option>
                <option value="grosir">Grosir</option>
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
