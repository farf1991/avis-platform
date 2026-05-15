import AdminNav from '@/components/admin/AdminNav'
import AdminGuard from '@/components/admin/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen flex">
        <AdminNav />
        <main className="flex-1 ml-56 p-8 min-h-screen">
          {children}
        </main>
      </div>
    </AdminGuard>
  )
}
