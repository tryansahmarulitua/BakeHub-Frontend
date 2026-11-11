import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ALL = ['Owner', 'Admin', 'Staff Gudang', 'Staff Produksi', 'Kasir'];

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['Owner', 'Admin'] },
  {
    label: 'Master Data',
    icon: '📁',
    roles: ['Admin'],
    children: [
      { path: '/master/categories', label: 'Kategori' },
      { path: '/master/units', label: 'Satuan' },
      { path: '/master/raw-materials', label: 'Bahan Baku' },
      { path: '/master/products', label: 'Produk' },
      { path: '/master/suppliers', label: 'Supplier' },
      { path: '/master/customers', label: 'Customer' },
    ],
  },
  {
    label: 'Procurement',
    icon: '🛒',
    roles: ['Admin', 'Staff Gudang'],
    children: [
      { path: '/procurement/purchase-orders', label: 'Purchase Order' },
      { path: '/procurement/goods-receipts', label: 'Penerimaan Barang' },
    ],
  },
  {
    label: 'Inventory',
    icon: '📦',
    roles: ['Admin', 'Staff Gudang'],
    children: [
      { path: '/inventory', label: 'Inventory & Stok' },
    ],
  },
  {
    label: 'Produksi',
    icon: '🏭',
    roles: ['Admin', 'Staff Produksi'],
    children: [
      { path: '/production/recipes', label: 'Resep / BOM' },
      { path: '/production/productions', label: 'Order Produksi' },
    ],
  },
  {
    label: 'Penjualan',
    icon: '💰',
    roles: ['Admin', 'Kasir'],
    children: [
      { path: '/master/products', label: 'Produk' },
      { path: '/master/customers', label: 'Customer' },
      { path: '/sales', label: 'Transaksi Penjualan' },
      { path: '/sales/order-produksi', label: 'Order Produksi' },
    ],
  },
  {
    label: 'Return & Waste',
    icon: '🗑️',
    roles: ['Admin', 'Staff Gudang', 'Staff Produksi', 'Kasir'],
    children: [
      { path: '/returns', label: 'Return' },
      { path: '/waste', label: 'Waste' },
    ],
  },
  { path: '/reports', label: 'Laporan', icon: '📈', roles: ['Owner', 'Admin'] },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState('Master Data');

  const roleName = user?.role?.name;
  const visibleMenu = menuItems.filter((item) =>
    !item.roles || item.roles.includes(roleName)
  );

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #f6e7eb 0%, #e8c8d2 50%, #d4a0b0 100%)' }}>
      {/* Sidebar */}
      <aside className="glass-dark w-64 text-white flex flex-col shrink-0">
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.15)' }}>
          <h1 className="text-xl font-bold text-white">🍞 BakeHub</h1>
          <p className="text-xs mt-1" style={{ color: 'rgb(255 200 210 / 0.8)' }}>ERP Toko Roti</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {visibleMenu.map((item) =>
            item.children ? (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                  className="w-full flex items-center justify-between px-6 py-2 text-sm transition"
                  style={{ color: 'rgb(255 220 228)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgb(255 255 255 / 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon} {item.label}</span>
                  <span>{openGroup === item.label ? '▾' : '▸'}</span>
                </button>
                {openGroup === item.label && (
                  <div className="pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block px-6 py-2 text-sm transition rounded-lg mx-2 my-0.5 ${
                          location.pathname === child.path
                            ? 'text-white font-semibold'
                            : 'text-pink-200 hover:text-white'
                        }`}
                        style={
                          location.pathname === child.path
                            ? { background: 'rgb(255 255 255 / 0.22)', boxShadow: '0 2px 8px rgb(128 0 32 / 0.25)' }
                            : {}
                        }
                        onMouseEnter={e => { if (location.pathname !== child.path) e.currentTarget.style.background = 'rgb(255 255 255 / 0.1)'; }}
                        onMouseLeave={e => { if (location.pathname !== child.path) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-2 text-sm transition rounded-lg mx-2 my-0.5 ${
                  location.pathname === item.path
                    ? 'text-white font-semibold'
                    : 'text-pink-200 hover:text-white'
                }`}
                style={
                  location.pathname === item.path
                    ? { background: 'rgb(255 255 255 / 0.22)', boxShadow: '0 2px 8px rgb(128 0 32 / 0.25)' }
                    : {}
                }
                onMouseEnter={e => { if (location.pathname !== item.path) e.currentTarget.style.background = 'rgb(255 255 255 / 0.1)'; }}
                onMouseLeave={e => { if (location.pathname !== item.path) e.currentTarget.style.background = 'transparent'; }}
              >
                {item.icon} <span className="ml-2">{item.label}</span>
              </Link>
            )
          )}
        </nav>

        <div className="px-6 py-4" style={{ borderTop: '1px solid rgb(255 255 255 / 0.15)' }}>
          <p className="text-xs text-pink-200">{user?.name}</p>
          <p className="text-xs" style={{ color: 'rgb(255 200 210 / 0.6)' }}>{user?.role?.name}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-pink-300 hover:text-pink-100 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
