
import { 
  Bot,
  Plug,
  Cpu,
  Circle,
  GitBranch,
  Database,
  FileText,
  Activity,
  LayoutGrid,
  Users,
  Shield,
  Home as HomeIcon,
  Wifi,
  RefreshCw,
  Watch,
} from "lucide-react";


export const menuItems = [
  { label: 'Home',       ariaLabel: 'Go to home page',    link: '/'           },
  { label: 'About',      ariaLabel: 'Learn about us',      link: '/about'      },
  { label: 'Experience', ariaLabel: 'View our experience', link: '/experience' },
  { label: 'Contact',    ariaLabel: 'Get in touch',        link: '/contact'    },
];


// ─── Rafiq sub-links with icons ───────────────────────────────────────────────
export const rafiqLinks = [
  { label: "AI",           link: "/rafiq/ai",           icon: Bot        },
  { label: "APIs",         link: "/rafiq/apis",          icon: Plug       },
  { label: "Architecture", link: "/rafiq/architecture",  icon: Cpu        },
  { label: "Core",         link: "/rafiq/core",          icon: Circle     },
  { label: "Data Flow",    link: "/rafiq/data-flow",     icon: GitBranch  },
  { label: "Database",     link: "/rafiq/database",      icon: Database   },
  { label: "Docs",         link: "/rafiq/docs",          icon: FileText   },
  { label: "Emulator",     link: "/rafiq/emulator",      icon: Activity   },
  { label: "Failures",     link: "/rafiq/failures",      icon: RefreshCw  },
  { label: "GUI",          link: "/rafiq/gui",           icon: LayoutGrid },
  { label: "Raqeeb",       link: "/rafiq/raqeeb",        icon: Users      },
  { label: "Security",     link: "/rafiq/security",      icon: Shield     },
  { label: "Smart Home",   link: "/rafiq/smart-home",    icon: HomeIcon   },
  { label: "Sync Engine",  link: "/rafiq/sync-engine",   icon: Wifi       },
  { label: "Wearable",     link: "/rafiq/wearable",      icon: Watch      },
];

// ─── More dropdown (desktop) ──────────────────────────────────────────────────
export const moreLinks = [
  { label: "Blog",     link: "/blog",     ariaLabel: "Read our blog"    },
  { label: "FAQ",      link: "/faq",      ariaLabel: "Frequently asked" },
  { label: "Services", link: "/services", ariaLabel: "View our services" },
];