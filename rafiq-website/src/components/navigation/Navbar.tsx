"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import StaggeredMenu from "@/components/StaggeredMenu";
import { menuItems } from "@/src/types/menuItems";

const socialItems = [
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' }
];

const Navbar = () => {
  const pathname = usePathname();
  const closeMenuRef = useRef<(() => void) | null>(null);

  // لما يتغير الـ route، اقفل المنيو
  useEffect(() => {
    if (closeMenuRef.current) {
      closeMenuRef.current();
    }
  }, [pathname]);

  return (
    <nav
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <StaggeredMenu
        position="right"
        items={menuItems}
        isFixed={true}
        socialItems={socialItems}
        displaySocials
        displayItemNumbering={true}
        menuButtonColor="#ffffff"
        openMenuButtonColor="#FF3B3B"
        colors={['#1E3A8A', '#FF3B3B']}
        changeMenuColorOnOpen={true}
        logoUrl="/logo.png"
        accentColor="#FF3B3B"
        onMenuOpen={() => console.log('Menu opened')}
        onMenuClose={() => {
          console.log('Menu closed');
        }}
      />
    </nav>
  );
};

export default Navbar;