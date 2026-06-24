import RafiqSidebar from '@/src/features/rafiq/shared/components/RafiqSidebar';

export default function RafiqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#000109]">
      <RafiqSidebar />

      <main
        id="rafiq-content"
        className="flex-1 min-h-screen pt-20 pl-4 pr-4 md:pl-24 transition-all duration-300 overflow-x-hidden"
      >
        {children}
      </main>
    </div>
  );
}