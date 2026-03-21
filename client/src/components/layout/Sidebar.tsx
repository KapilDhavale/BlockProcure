import { Building2, HardHat, Search, ScrollText, LayoutDashboard } from 'lucide-react'
import type { RoleKey } from '@/App'

export type TabId = 'dashboard' | 'gov' | 'contractor' | 'inspector' | 'audit'

interface NavItem {
  id: TabId
  label: string
  icon: React.ElementType
  desc: string
  forRoles: RoleKey[]   // which roles can see this tab
}

const NAV: NavItem[] = [
  { id: 'dashboard',  label: 'My Projects', icon: LayoutDashboard, desc: 'Overview & statuses',      forRoles: ['gov', 'contractor', 'inspector', 'none'] },
  { id: 'gov',        label: 'Government',  icon: Building2,        desc: 'Create & fund projects',  forRoles: ['gov', 'none'] },
  { id: 'contractor', label: 'Contractor',  icon: HardHat,          desc: 'Submit claims',           forRoles: ['contractor', 'none'] },
  { id: 'inspector',  label: 'Inspector',   icon: Search,           desc: 'Approve milestones',      forRoles: ['inspector', 'none'] },
  { id: 'audit',      label: 'Audit Log',   icon: ScrollText,       desc: 'On-chain event history',  forRoles: ['gov', 'contractor', 'inspector', 'none'] },
]

const ROLE_META: Record<RoleKey, { label: string; color: string; bg: string; border: string } | null> = {
  gov:        { label: 'Government',  color: 'var(--gold)',  bg: 'rgba(201,162,77,0.12)',  border: 'rgba(201,162,77,0.25)'  },
  contractor: { label: 'Contractor',  color: 'var(--blue)',  bg: 'rgba(74,158,255,0.12)', border: 'rgba(74,158,255,0.25)' },
  inspector:  { label: 'Inspector',   color: 'var(--green)', bg: 'rgba(77,187,138,0.12)', border: 'rgba(77,187,138,0.25)' },
  none:       null,
}

interface SidebarProps {
  active:   TabId
  onChange: (id: TabId) => void
  account:  string | null
  role:     RoleKey
}

export function Sidebar({ active, onChange, account, role }: SidebarProps) {
  const roleMeta = ROLE_META[role]

  // Show all tabs if role is 'none' (not yet detected or no role)
  // Otherwise filter to only relevant tabs
  const visibleNav = role === 'none'
    ? NAV
    : NAV.filter(item => item.forRoles.includes(role))

  return (
    <aside style={{
      width: 224, minWidth: 224,
      minHeight: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '24px 12px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Vertical gold accent */}
      <div style={{ position: 'absolute', top: 60, bottom: 60, right: 0, width: 1, background: 'linear-gradient(180deg, transparent, rgba(201,162,77,0.15) 30%, rgba(201,162,77,0.15) 70%, transparent)', pointerEvents: 'none' }} />

      {/* Role badge at top of sidebar */}
      {roleMeta && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: roleMeta.bg, border: `1px solid ${roleMeta.border}`,
          borderRadius: 8, padding: '8px 12px', marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleMeta.color, boxShadow: `0 0 5px ${roleMeta.color}`, flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: roleMeta.color, fontWeight: 500, letterSpacing: '0.4px' }}>
              {roleMeta.label}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 1, letterSpacing: '0.2px' }}>
              Active role
            </p>
          </div>
        </div>
      )}

      {/* Section label */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '0 10px', marginBottom: 10 }}>
        Navigation
      </p>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleNav.map(({ id, label, icon: Icon, desc }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                borderRadius: 9, padding: '10px 12px',
                border: `1px solid ${isActive ? 'rgba(201,162,77,0.2)' : 'transparent'}`,
                background: isActive ? 'linear-gradient(135deg, rgba(201,162,77,0.08), rgba(201,162,77,0.04))' : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--surface2)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  const nameEl = e.currentTarget.querySelector<HTMLElement>('.nav-name')
                  if (nameEl) nameEl.style.color = 'var(--text)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                  const nameEl = e.currentTarget.querySelector<HTMLElement>('.nav-name')
                  if (nameEl) nameEl.style.color = 'var(--text-sub)'
                }
              }}
            >
              {/* Gold left accent */}
              <div style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 2, height: isActive ? '60%' : 0,
                borderRadius: '0 1px 1px 0', background: 'var(--gold)',
                transition: 'height 0.25s cubic-bezier(0.22,1,0.36,1)',
              }} />

              {/* Icon box */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: isActive ? 'var(--gold-soft)' : 'var(--surface3)',
                border: `1px solid ${isActive ? 'rgba(201,162,77,0.3)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Icon size={14} color={isActive ? 'var(--gold)' : 'var(--text-dim)'} style={{ flexShrink: 0 }} />
              </div>

              {/* Text */}
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <p className="nav-name" style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--gold)' : 'var(--text-sub)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s' }}>
                  {label}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.2px' }}>
                  {desc}
                </p>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Connected wallet */}
      {account && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14, padding: '14px 12px 0' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
            Connected Wallet
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, boxShadow: '0 0 5px rgba(77,187,138,0.5)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-sub)', letterSpacing: '0.3px' }}>
              {account.slice(0, 6)}…{account.slice(-6)}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}