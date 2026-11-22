/**
 * Browser-local demo state for auth, organizations, members and inventory.
 * Used only while the frontend is disconnected from the backend. Nothing here
 * is sent anywhere; clearing this key restores the original demo fixture.
 */

import type { InventoryItem } from '../api/inventory'
import type {
  AuthMember,
  AuthOrganization,
  AuthState,
  AuthUser,
  PendingRequest,
  Role,
} from '../context/auth'

export const DEMO_STORAGE_KEY = 'medicast.demo'
const DEMO_VERSION = 3

export type DemoState = {
  version: number
  signedOut: boolean
  user: AuthUser
  organization: AuthOrganization | null
  role: Role | null
  members: AuthMember[]
  pendingJoinCode: string | null
  pendingRequests: PendingRequest[]
  inventory: InventoryItem[]
}

const DEMO_ADMIN: AuthUser = {
  id: 'demo-admin',
  name: 'Demo Admin',
  email: 'admin@demo.medicast.local',
  profile: {
    employeeId: 'MC-1042',
    designation: 'Pharmacist-in-Charge',
    department: 'Pharmacy & Logistics',
    phone: '+91 471 250 0142',
    joinedAt: '2019-06-03',
    location: 'Thiruvananthapuram, Kerala',
  },
}

/**
 * Always-present demo profile named "test". The Profile page falls back to it
 * when nobody is signed in, so the page still shows dummy values in dev.
 */
export const DEMO_TEST_USER: AuthUser = {
  id: 'demo-test',
  name: 'test',
  email: 'test@demo.medicast.local',
  profile: {
    employeeId: 'MC-TEST',
    designation: 'Test Pharmacist',
    department: 'Pharmacy & Logistics',
    phone: '+91 471 250 0000',
    joinedAt: '2024-01-01',
    location: 'Thiruvananthapuram, Kerala',
  },
}

export const DEMO_TEST_ORGANIZATION: AuthOrganization = {
  id: 'demo-org',
  name: 'Demo City Hospital',
  code: 'DEMO-2026',
  state: 'Kerala',
  district: 'Thiruvananthapuram',
  pincode: '695001',
  hospital_type: 'government',
}

export const DEMO_TEST_ROLE: Role = 'admin'

/** Members shown when signed out; includes the always-present "test" entry. */
export const DEMO_TEST_MEMBERS: AuthMember[] = [
  { id: 'demo-test', name: 'test', email: 'test@demo.medicast.local', role: 'admin' },
  {
    id: 'demo-test-meera',
    name: 'Meera Sharma',
    email: 'meera.sharma@demo.medicast.local',
    role: 'member',
  },
  {
    id: 'demo-test-arjun',
    name: 'Arjun Patel',
    email: 'arjun.patel@demo.medicast.local',
    role: 'member',
  },
]

/** Join request shown when signed out, so the admin table is never empty. */
export const DEMO_TEST_REQUESTS: PendingRequest[] = [
  {
    id: 'demo-test-request',
    name: 'test request',
    email: 'test.request@demo.medicast.local',
    requestedAt: '2026-11-22',
  },
]

/** Stock shown when signed out, so inventory and the dashboard stay populated. */
export const DEMO_TEST_INVENTORY: InventoryItem[] = [
  { medicine: 'TB medicines', quantity: 90 },
  { medicine: 'Dengue medicines', quantity: 30 },
  { medicine: 'Malaria medicines', quantity: 75 },
]

const DEMO_MEMBERS: AuthMember[] = [
  {
    id: 'demo-member',
    name: 'Demo Member',
    email: 'member@demo.medicast.local',
    role: 'member',
  },
  {
    id: 'demo-meera',
    name: 'Meera Sharma',
    email: 'meera.sharma@demo.medicast.local',
    role: 'member',
  },
  {
    id: 'demo-arjun',
    name: 'Arjun Patel',
    email: 'arjun.patel@demo.medicast.local',
    role: 'member',
  },
  {
    id: 'demo-sneha',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@demo.medicast.local',
    role: 'member',
  },
]

/** The seed shown on a fresh browser. Quantities mirror backend/src/app/store.py. */
const SEED: DemoState = {
  version: DEMO_VERSION,
  signedOut: false,
  user: DEMO_ADMIN,
  organization: {
    id: 'demo-org',
    name: 'Demo City Hospital',
    code: 'DEMO-2026',
    state: 'Kerala',
    district: 'Thiruvananthapuram',
    pincode: '695001',
    hospital_type: 'government',
  },
  role: 'admin',
  members: [
    { ...DEMO_ADMIN, role: 'admin' },
    ...DEMO_TEST_MEMBERS,
    ...DEMO_MEMBERS,
  ],
  pendingJoinCode: null,
  pendingRequests: [
    ...DEMO_TEST_REQUESTS,
    {
      id: 'demo-request-1',
      name: 'Asha Nair',
      email: 'asha.nair@demo.medicast.local',
      requestedAt: '2026-11-20',
    },
    {
      id: 'demo-request-2',
      name: 'Rahul Menon',
      email: 'rahul.menon@demo.medicast.local',
      requestedAt: '2026-11-19',
    },
    {
      id: 'demo-request-3',
      name: 'Priya Desai',
      email: 'priya.desai@demo.medicast.local',
      requestedAt: '2026-11-18',
    },
    {
      id: 'demo-request-4',
      name: 'Vikram Rao',
      email: 'vikram.rao@demo.medicast.local',
      requestedAt: '2026-11-17',
    },
  ],
  inventory: [
    { medicine: 'TB medicines', quantity: 90 },
    { medicine: 'Dengue medicines', quantity: 30 },
    { medicine: 'Malaria medicines', quantity: 75 },
  ],
}

export function readDemoState(): DemoState {
  if (typeof window === 'undefined') return SEED

  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return SEED

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return SEED
    }

    // Upgrade stale fixtures so enriched demo data appears on the next load.
    if ((parsed as Partial<DemoState>).version !== DEMO_VERSION) {
      return SEED
    }

    return { ...SEED, ...(parsed as Partial<DemoState>) }
  } catch {
    return SEED
  }
}

function writeDemoState(next: DemoState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next))
}

export function updateDemoState(
  update: (current: DemoState) => DemoState,
): DemoState {
  const next = update(readDemoState())
  writeDemoState(next)
  return next
}

export function resetDemoState(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DEMO_STORAGE_KEY)
}

/** Projects the demo fixture into the same shape returned by GET /api/auth/me. */
export function toAuthState(state: DemoState): AuthState {
  if (state.signedOut) {
    return {
      user: null,
      organization: null,
      role: null,
      members: [],
      pendingJoinCode: null,
    }
  }

  return {
    user: state.user,
    organization: state.organization,
    role: state.role,
    members: state.members,
    pendingJoinCode: state.pendingJoinCode,
  }
}
