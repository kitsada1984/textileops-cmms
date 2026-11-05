import {
  LayoutDashboard, Cpu, Disc, ClipboardList, Calendar,
  Package, ShoppingCart, BarChart3, Settings,
  ScrollText, ArrowLeftRight, Users, Layers,
  FileText, Database,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    labelKey: 'nav_sec_overview',
    items: [
      { to: '/',           icon: LayoutDashboard, key: 'nav_dashboard',  permKey: 'dashboard' },
    ]
  },
  {
    labelKey: 'nav_sec_operations',
    items: [
      { to: '/machines',   icon: Cpu,             key: 'nav_machines',   permKey: 'machines' },
      { to: '/cylinders',  icon: Disc,            key: 'nav_cylinders',  permKey: 'cylinders' },
      { to: '/workorders',    icon: ClipboardList,   key: 'nav_workorders',    permKey: 'workorders' },
      { to: '/pm',            icon: Calendar,        key: 'nav_pm',            permKey: 'pm' },
      { to: '/design-bom',    icon: FileText,        key: 'nav_design_bom',    permKey: 'designbom' },
      { to: '/needle-stock',  icon: Layers,          key: 'nav_needle_stock',  permKey: 'needlestock' },
    ]
  },
  {
    labelKey: 'nav_sec_inventory',
    items: [
      { to: '/spareparts', icon: Package,         key: 'nav_spareparts', permKey: 'spareparts' },
      { to: '/purchasing', icon: ShoppingCart,    key: 'nav_purchasing', permKey: 'purchasing' },
      { to: '/stock',      icon: ArrowLeftRight,  key: 'nav_stock',      permKey: 'stock' },
    ]
  },
  {
    labelKey: 'nav_sec_analytics',
    items: [
      { to: '/reports',    icon: BarChart3,       key: 'nav_reports',    permKey: 'reports' },
      { to: '/logs',       icon: ScrollText,      key: 'nav_logs',       permKey: 'logs' },
    ]
  },
  {
    labelKey: 'nav_sec_system',
    items: [
      { to: '/users',      icon: Users,           key: 'nav_users',      permKey: 'users' },
      { to: '/settings',   icon: Settings,        key: 'nav_settings',   permKey: 'settings' },
      { to: '/d1-test',    icon: Database,        key: 'nav_d1_test',    permKey: 'settings' },
    ]
  },
]

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items)

export { NAV_SECTIONS, ALL_NAV_ITEMS }
