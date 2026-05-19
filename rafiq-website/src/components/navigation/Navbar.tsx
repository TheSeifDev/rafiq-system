'use client';
import StaggeredMenu from "@/components/StaggeredMenu";
import { menuItems } from "@/src/types/menuItems";

const socialItems = [
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' }
];

const Navbar = () => {
  return (
    <>
<nav
  style={{
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 9999,
    pointerEvents: 'none',
  }}
>
        <StaggeredMenu
          position="right"
          items={menuItems}
          isFixed={false}
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
          onMenuClose={() => console.log('Menu closed')}
        />
      </nav>
    </>
  )
}

export default Navbar