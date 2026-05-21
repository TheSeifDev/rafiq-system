import RafiqSidebar from '@/src/features/rafiq/shared/components/RafiqSidebar';

export default function RafiqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <RafiqSidebar />

      <main
        id="rafiq-content"
        className="min-h-screen pt-20 pl-6"
      >
        {children}
      </main>
    </div>
  );
}
