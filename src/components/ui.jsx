/**
 * Generic reusable components for Master Data pages
 */
import { useState } from 'react';

export function PageHeader({ title, onAdd, addLabel = '+ Tambah' }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold" style={{ color: '#4d0013' }}>{title}</h1>
      {onAdd && (
        <button
          onClick={onAdd}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:shadow-lg"
          style={{ background: '#800020' }}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="glass w-full md:w-80 px-4 py-2 border border-white/60 rounded-lg text-sm focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none"
    />
  );
}

export function formatDate(val) {
  if (!val) return '-';
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}-${m}-${y}`;
  }
  return str;
}

export function Table({ columns, data, onEdit, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <>
    <div className="glass rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y" style={{ borderColor: 'rgb(128 0 32 / 0.15)' }}>
        <thead style={{ background: 'rgb(128 0 32 / 0.08)' }}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: '#800020' }}
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#800020' }}>
                Aksi
              </th>
            )}
          </tr>
        </thead>
        <tbody style={{ background: 'transparent' }}>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-6 py-8 text-center text-sm"
                style={{ color: '#a0003f' }}
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.id ?? idx} style={{ borderBottom: '1px solid rgb(128 0 32 / 0.1)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgb(128 0 32 / 0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map((col) => {
                  let content = col.render ? col.render(row) : row[col.key];
                  if (!col.render && typeof content === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(content)) {
                    content = formatDate(content);
                  }
                  return (
                    <td key={col.key} className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: '#3b101b' }}>
                      {content}
                    </td>
                  );
                })}
                {(onEdit || onDelete) && (
                  <td className="px-6 py-4 text-sm whitespace-nowrap space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="font-medium transition"
                        style={{ color: '#800020' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#4d0013'}
                        onMouseLeave={e => e.currentTarget.style.color = '#800020'}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => setPendingDelete(row)}
                        className="font-medium text-red-600 hover:text-red-900 transition"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <ConfirmDialog
      isOpen={!!pendingDelete}
      title="Konfirmasi Hapus"
      message={`Anda yakin ingin menghapus item ini?`}
      onConfirm={() => {
        if (pendingDelete && onDelete) {
          onDelete(pendingDelete);
          setPendingDelete(null);
        }
      }}
      onCancel={() => setPendingDelete(null)}
    />
    </>
  );
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm" style={{ color: '#a0003f' }}>
        Menampilkan {meta.from}–{meta.to} dari {meta.total} data
      </p>
      <div className="flex gap-2">
        <button
          disabled={meta.current_page === 1}
          onClick={() => onPageChange(meta.current_page - 1)}
          className="px-3 py-1 text-sm border rounded transition disabled:opacity-40"
          style={{ borderColor: '#a0003f', color: '#800020' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgb(128 0 32 / 0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          ‹ Prev
        </button>
        <button
          disabled={meta.current_page === meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
          className="px-3 py-1 text-sm border rounded transition disabled:opacity-40"
          style={{ borderColor: '#a0003f', color: '#800020' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgb(128 0 32 / 0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(77,0,19,0.18)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="glass rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.4)' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#4d0013' }}>{title}</h2>
          <button onClick={onClose} className="text-xl leading-none transition" style={{ color: 'rgb(77 0 19 / 0.6)' }} onMouseEnter={e => e.currentTarget.style.color = 'rgb(77 0 19 / 0.9)'} onMouseLeave={e => e.currentTarget.style.color = 'rgb(77 0 19 / 0.6)'}>×</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1" style={{ color: '#4d0013' }}>{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`glass w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none ${
        error ? 'border-red-400' : 'border-white/60'
      }`}
    />
  );
}

export function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`glass w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#800020] focus:border-transparent outline-none ${
        error ? 'border-red-400' : 'border-white/60'
      }`}
    >
      {children}
    </select>
  );
}

export function Badge({ value, map }) {
  const { label, color } = map[value] ?? { label: value, color: 'gray' };
  const colors = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}

export function Toast({ message, type = 'success', onClose }) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm transition ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">×</button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onCancel, isOpen = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(77,0,19,0.18)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="glass rounded-lg w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
          <h3 className="text-lg font-semibold" style={{ color: '#4d0013' }}>{title}</h3>
        </div>
        <div className="px-6 py-4">
          <p style={{ color: '#3b101b' }}>{message}</p>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#800020', border: '1px solid rgba(128,0,32,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg text-white transition"
            style={{ background: '#800020' }}
            onMouseEnter={e => e.currentTarget.style.background = '#4d0013'}
            onMouseLeave={e => e.currentTarget.style.background = '#800020'}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
