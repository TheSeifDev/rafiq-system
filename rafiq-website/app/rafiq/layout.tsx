import RafiqSidebar from '@/src/features/rafiq/shared/components/RafiqSidebar';

export default function RafiqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#000109]">
      <RafiqSidebar />

      <main
        id="rafiq-content"
        className="min-h-screen pt-20 pl-6 md:pl-20 transition-all duration-300"
      >
        {children}
      </main>
    </div>
  );
}

