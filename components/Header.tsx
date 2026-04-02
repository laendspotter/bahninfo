'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/',             label: 'Abfahrtstafel', icon: '📋' },
  { href: '/zugauskunft', label: 'Zugauskunft',    icon: '🚆' },
  { href: '/stoerungen',  label: 'Störungen',      icon: '⚠️'  },
];

export default function Header() {
  const path = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="header-logo">
        <div className="db-badge">DB</div>
        <div className="header-title">
          <span className="title-main">Bahninfo Suite</span>
          <span className="title-sub">Echtzeit · transport.rest</span>
        </div>
      </Link>
      <nav className="site-nav">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} className={`nav-link ${path === l.href ? 'active' : ''}`}>
            <span>{l.icon}</span>
            <span className="nav-label">{l.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
