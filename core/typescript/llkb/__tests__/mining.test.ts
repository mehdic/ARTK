/**
 * Tests for LLKB Mining Module
 *
 * Tests the zero-config element discovery functions:
 * - mineEntities: Extract entities from types, models, API calls
 * - mineRoutes: Extract routes from React Router, Next.js, etc.
 * - mineForms: Extract forms from Zod, Yup, React Hook Form
 * - mineTables: Extract tables from AG Grid, TanStack Table, etc.
 * - mineModals: Extract modals from MUI, Radix, etc.
 * - mineElements: Combined mining of all element types
 */

import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  mineElements,
  mineEntities,
  mineForms,
  mineModals,
  mineRoutes,
  mineTables,
  runMiningPipeline,
} from '../mining.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_DIR = path.join(__dirname, '.test-mining-fixtures');

function createTestProject(structure: Record<string, string>): void {
  // Clean up first
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }

  // Create directories and files
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(TEST_DIR, filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}

function cleanupTestProject(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

// =============================================================================
// Entity Mining Tests
// =============================================================================

describe('mineEntities', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should extract entities from TypeScript interfaces', async () => {
    createTestProject({
      'src/types/user.ts': `
        interface User {
          id: string;
          name: string;
          email: string;
        }

        interface Product {
          id: string;
          name: string;
          price: number;
        }
      `,
    });

    const entities = await mineEntities(TEST_DIR);

    expect(entities.length).toBeGreaterThanOrEqual(2);
    expect(entities.some(e => e.name === 'user')).toBe(true);
    expect(entities.some(e => e.name === 'product')).toBe(true);
  });

  it('should extract entities from Prisma schema', async () => {
    createTestProject({
      'prisma/schema.prisma': `
        model User {
          id        String   @id @default(cuid())
          email     String   @unique
          name      String?
          posts     Post[]
        }

        model Post {
          id        String   @id @default(cuid())
          title     String
          content   String?
          author    User     @relation(fields: [authorId], references: [id])
          authorId  String
        }

        model Category {
          id    String @id @default(cuid())
          name  String
        }
      `,
    });

    const entities = await mineEntities(TEST_DIR);

    expect(entities.some(e => e.name === 'user')).toBe(true);
    expect(entities.some(e => e.name === 'post')).toBe(true);
    expect(entities.some(e => e.name === 'category')).toBe(true);

    // Check pluralization
    const category = entities.find(e => e.name === 'category');
    expect(category?.plural).toBe('categories');
  });

  it('should extract entities from API fetch calls', async () => {
    createTestProject({
      'src/api/client.ts': `
        async function getUsers() {
          return fetch('/api/users');
        }

        async function getProducts() {
          return axios.get('/api/products');
        }

        async function getOrders() {
          return fetch(\`/api/orders/\${id}\`);
        }
      `,
    });

    const entities = await mineEntities(TEST_DIR);

    expect(entities.some(e => e.name === 'user')).toBe(true);
    expect(entities.some(e => e.name === 'product')).toBe(true);
    expect(entities.some(e => e.name === 'order')).toBe(true);
  });

  it('should handle correct pluralization for irregular words', async () => {
    createTestProject({
      'src/types/models.ts': `
        interface Person {
          id: string;
          name: string;
        }

        interface Child {
          id: string;
          parentId: string;
        }

        interface Address {
          street: string;
          city: string;
        }
      `,
    });

    const entities = await mineEntities(TEST_DIR);

    const person = entities.find(e => e.name === 'person');
    expect(person?.plural).toBe('people');

    const child = entities.find(e => e.name === 'child');
    expect(child?.plural).toBe('children');

    const address = entities.find(e => e.name === 'address');
    expect(address?.plural).toBe('addresses');
  });

  it('should exclude utility types and common words', async () => {
    createTestProject({
      'src/types/common.ts': `
        interface UserProps {
          user: User;
        }

        interface ButtonState {
          clicked: boolean;
        }

        interface Config {
          apiUrl: string;
        }

        type Callback = () => void;
      `,
    });

    const entities = await mineEntities(TEST_DIR);

    // These should be excluded
    expect(entities.some(e => e.name === 'props')).toBe(false);
    expect(entities.some(e => e.name === 'state')).toBe(false);
    expect(entities.some(e => e.name === 'config')).toBe(false);
    expect(entities.some(e => e.name === 'callback')).toBe(false);
  });

  it('should handle empty project gracefully', async () => {
    createTestProject({});

    const entities = await mineEntities(TEST_DIR);

    expect(entities).toEqual([]);
  });
});

// =============================================================================
// Route Mining Tests
// =============================================================================

describe('mineRoutes', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should extract routes from React Router', async () => {
    createTestProject({
      'src/routes/index.tsx': `
        import { Route, Routes } from 'react-router-dom';

        export function AppRoutes() {
          return (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/users" element={<Users />} />
              <Route path="/users/:id" element={<UserDetail />} />
              <Route path="/products" element={<Products />} />
            </Routes>
          );
        }
      `,
    });

    const routes = await mineRoutes(TEST_DIR);

    expect(routes.some(r => r.path === '/')).toBe(true);
    expect(routes.some(r => r.path === '/users')).toBe(true);
    expect(routes.some(r => r.path === '/users/:id')).toBe(true);
    expect(routes.some(r => r.path === '/products')).toBe(true);

    // Check params extraction
    const userDetail = routes.find(r => r.path === '/users/:id');
    expect(userDetail?.params).toContain('id');
  });

  it('should extract routes from Next.js pages directory', async () => {
    createTestProject({
      'pages/index.tsx': 'export default function Home() {}',
      'pages/about.tsx': 'export default function About() {}',
      'pages/users/index.tsx': 'export default function Users() {}',
      'pages/users/[id].tsx': 'export default function UserDetail() {}',
      'pages/products/[...slug].tsx': 'export default function ProductPage() {}',
    });

    const routes = await mineRoutes(TEST_DIR);

    expect(routes.some(r => r.path === '/')).toBe(true);
    expect(routes.some(r => r.path === '/about')).toBe(true);
    expect(routes.some(r => r.path === '/users')).toBe(true);
    expect(routes.some(r => r.path === '/users/:id')).toBe(true);
  });

  it('should extract routes from Next.js app directory', async () => {
    createTestProject({
      'app/page.tsx': 'export default function Home() {}',
      'app/about/page.tsx': 'export default function About() {}',
      'app/users/page.tsx': 'export default function Users() {}',
      'app/users/[id]/page.tsx': 'export default function UserDetail() {}',
      'app/(auth)/login/page.tsx': 'export default function Login() {}',
    });

    const routes = await mineRoutes(TEST_DIR);

    expect(routes.some(r => r.path === '/')).toBe(true);
    expect(routes.some(r => r.path === '/about')).toBe(true);
    expect(routes.some(r => r.path === '/users')).toBe(true);
    expect(routes.some(r => r.path === '/users/:id')).toBe(true);
    expect(routes.some(r => r.path === '/login')).toBe(true);
  });

  it('should extract routes from useRoutes config', async () => {
    createTestProject({
      'src/routes/config.ts': `
        export const routes = [
          { path: '/', element: <Home /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/settings', element: <Settings /> },
        ];
      `,
    });

    const routes = await mineRoutes(TEST_DIR);

    expect(routes.some(r => r.path === '/')).toBe(true);
    expect(routes.some(r => r.path === '/dashboard')).toBe(true);
    expect(routes.some(r => r.path === '/settings')).toBe(true);
  });

  it('should generate human-readable names from paths', async () => {
    createTestProject({
      'pages/user-settings.tsx': 'export default function UserSettings() {}',
      'pages/order-history.tsx': 'export default function OrderHistory() {}',
    });

    const routes = await mineRoutes(TEST_DIR);

    const userSettings = routes.find(r => r.path === '/user-settings');
    expect(userSettings?.name).toBe('User Settings');

    const orderHistory = routes.find(r => r.path === '/order-history');
    expect(orderHistory?.name).toBe('Order History');
  });
});

// =============================================================================
// Form Mining Tests
// =============================================================================

describe('mineForms', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should extract forms from Zod schemas', async () => {
    createTestProject({
      'src/schemas/loginForm.ts': `
        import { z } from 'zod';

        export const loginSchema = z.object({
          email: z.email(),
          password: z.string().min(8),
          rememberMe: z.boolean().optional(),
        });
      `,
    });

    const forms = await mineForms(TEST_DIR);

    expect(forms.length).toBeGreaterThanOrEqual(1);
    const loginForm = forms.find(f => f.id === 'login');
    expect(loginForm).toBeDefined();
    expect(loginForm?.fields.some(f => f.name === 'email')).toBe(true);
    expect(loginForm?.fields.some(f => f.name === 'password')).toBe(true);
  });

  it('should extract forms from Yup schemas', async () => {
    createTestProject({
      'src/schemas/registerForm.ts': `
        import * as yup from 'yup';

        export const registerSchema = yup.object({
          username: yup.string().required(),
          email: yup.email().required(),
          password: yup.string().min(8),
          confirmPassword: yup.string(),
        });
      `,
    });

    const forms = await mineForms(TEST_DIR);

    const registerForm = forms.find(f => f.id === 'register');
    expect(registerForm).toBeDefined();
    expect(registerForm?.fields.length).toBeGreaterThanOrEqual(2);
  });

  it('should extract forms from React Hook Form usage', async () => {
    createTestProject({
      'src/components/ContactForm.tsx': `
        import { useForm } from 'react-hook-form';

        export function ContactForm() {
          const { register, handleSubmit } = useForm();

          return (
            <form onSubmit={handleSubmit(onSubmit)}>
              <input {...register('name')} />
              <input {...register('email')} />
              <textarea {...register('message')} />
              <button type="submit">Send</button>
            </form>
          );
        }
      `,
    });

    const forms = await mineForms(TEST_DIR);

    const contactForm = forms.find(f => f.id === 'contact');
    expect(contactForm).toBeDefined();
    expect(contactForm?.fields.some(f => f.name === 'name')).toBe(true);
    expect(contactForm?.fields.some(f => f.name === 'email')).toBe(true);
    expect(contactForm?.fields.some(f => f.name === 'message')).toBe(true);
  });

  it('should map Zod types to HTML input types', async () => {
    createTestProject({
      'src/schemas/profileForm.ts': `
        import { z } from 'zod';

        export const profileSchema = z.object({
          email: z.email(),
          age: z.number(),
          bio: z.string(),
          newsletter: z.boolean(),
        });
      `,
    });

    const forms = await mineForms(TEST_DIR);
    const profileForm = forms.find(f => f.id === 'profile');

    expect(profileForm?.fields.find(f => f.name === 'email')?.type).toBe('email');
    expect(profileForm?.fields.find(f => f.name === 'age')?.type).toBe('number');
    expect(profileForm?.fields.find(f => f.name === 'newsletter')?.type).toBe('checkbox');
  });
});

// =============================================================================
// Table Mining Tests
// =============================================================================

describe('mineTables', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should extract tables from AG Grid column definitions', async () => {
    createTestProject({
      'src/components/UsersTable.tsx': `
        import { AgGridReact } from 'ag-grid-react';

        const columnDefs = [
          { field: 'name', headerName: 'Name' },
          { field: 'email', headerName: 'Email' },
          { field: 'role', headerName: 'Role' },
          { field: 'status', headerName: 'Status' },
        ];

        export function UsersTable() {
          return <AgGridReact columnDefs={columnDefs} />;
        }
      `,
    });

    const tables = await mineTables(TEST_DIR);

    const usersTable = tables.find(t => t.id === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable?.columns).toContain('name');
    expect(usersTable?.columns).toContain('email');
    expect(usersTable?.columns).toContain('role');
  });

  it('should extract tables from TanStack Table', async () => {
    createTestProject({
      'src/components/ProductsTable.tsx': `
        import { useReactTable } from '@tanstack/react-table';

        const columns = [
          { accessorKey: 'name', header: 'Product Name' },
          { accessorKey: 'price', header: 'Price' },
          { accessorKey: 'quantity', header: 'Quantity' },
        ];

        export function ProductsTable() {
          const table = useReactTable({ columns, data });
          return <Table {...table} />;
        }
      `,
    });

    const tables = await mineTables(TEST_DIR);

    const productsTable = tables.find(t => t.id === 'products');
    expect(productsTable).toBeDefined();
    expect(productsTable?.columns).toContain('name');
    expect(productsTable?.columns).toContain('price');
    expect(productsTable?.columns).toContain('quantity');
  });

  it('should extract tables from MUI DataGrid', async () => {
    createTestProject({
      'src/components/OrdersDataGrid.tsx': `
        import { DataGrid } from '@mui/x-data-grid';

        const columns = [
          { field: 'orderId', headerName: 'Order ID' },
          { field: 'customer', headerName: 'Customer' },
          { field: 'total', headerName: 'Total' },
          { field: 'status', headerName: 'Status' },
        ];

        export function OrdersDataGrid() {
          return <DataGrid columns={columns} rows={rows} />;
        }
      `,
    });

    const tables = await mineTables(TEST_DIR);

    const ordersTable = tables.find(t => t.id === 'orders');
    expect(ordersTable).toBeDefined();
    expect(ordersTable?.columns).toContain('orderId');
    expect(ordersTable?.columns).toContain('customer');
  });

  it('should extract tables from HTML table headers', async () => {
    createTestProject({
      'src/components/SimpleTable.tsx': `
        export function SimpleTable() {
          return (
            <table id="inventory">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {/* rows */}
              </tbody>
            </table>
          );
        }
      `,
    });

    const tables = await mineTables(TEST_DIR);

    const simpleTable = tables.find(t => t.id === 'simple');
    expect(simpleTable).toBeDefined();
    expect(simpleTable?.columns).toContain('Item');
    expect(simpleTable?.columns).toContain('SKU');
    expect(simpleTable?.columns).toContain('Stock');
  });
});

// =============================================================================
// Modal Mining Tests
// =============================================================================

describe('mineModals', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should extract modals from MUI Dialog', async () => {
    createTestProject({
      'src/components/ConfirmDialog.tsx': `
        import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

        export function ConfirmDialog({ open, onClose }) {
          return (
            <Dialog open={open} onClose={onClose}>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogContent>
                Are you sure you want to proceed?
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleConfirm}>Confirm</Button>
              </DialogActions>
            </Dialog>
          );
        }
      `,
    });

    const modals = await mineModals(TEST_DIR);

    const confirmModal = modals.find(m => m.id === 'confirm');
    expect(confirmModal).toBeDefined();
    expect(confirmModal?.name).toBe('Confirm Action');
  });

  it('should extract modals from Chakra UI', async () => {
    createTestProject({
      'src/components/DeleteModal.tsx': `
        import { Modal, ModalOverlay, ModalContent, ModalHeader } from '@chakra-ui/react';

        export function DeleteModal({ isOpen, onClose }) {
          return (
            <Modal isOpen={isOpen} onClose={onClose}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Delete Item</ModalHeader>
                {/* content */}
              </ModalContent>
            </Modal>
          );
        }
      `,
    });

    const modals = await mineModals(TEST_DIR);

    const deleteModal = modals.find(m => m.id === 'delete');
    expect(deleteModal).toBeDefined();
    expect(deleteModal?.name).toBe('Delete Item');
  });

  it('should extract modals from Ant Design', async () => {
    createTestProject({
      'src/components/EditModal.tsx': `
        import { Modal } from 'antd';

        export function EditModal({ open, onCancel }) {
          return (
            <Modal
              open={open}
              onCancel={onCancel}
              title="Edit Record"
            >
              {/* form */}
            </Modal>
          );
        }
      `,
    });

    const modals = await mineModals(TEST_DIR);

    const editModal = modals.find(m => m.id === 'edit');
    expect(editModal).toBeDefined();
    expect(editModal?.name).toBe('Edit Record');
  });

  it('should handle modals without explicit titles', async () => {
    createTestProject({
      'src/components/SettingsModal.tsx': `
        import { Dialog } from '@radix-ui/react-dialog';

        export function SettingsModal({ open, onOpenChange }) {
          return (
            <Dialog.Root open={open} onOpenChange={onOpenChange}>
              <Dialog.Portal>
                <Dialog.Content>
                  {/* settings form */}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          );
        }
      `,
    });

    const modals = await mineModals(TEST_DIR);

    const settingsModal = modals.find(m => m.id === 'settings');
    expect(settingsModal).toBeDefined();
    expect(settingsModal?.name).toBe('Settings');
  });
});

// =============================================================================
// Combined Mining Tests
// =============================================================================

describe('mineElements', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should mine all element types in parallel', async () => {
    createTestProject({
      'src/types/models.ts': `
        interface User { id: string; name: string; }
        interface Product { id: string; price: number; }
      `,
      'pages/index.tsx': 'export default function Home() {}',
      'pages/users.tsx': 'export default function Users() {}',
      'src/schemas/loginForm.ts': `
        import { z } from 'zod';
        export const loginSchema = z.object({
          email: z.email(),
          password: z.string(),
        });
      `,
      'src/components/DataTable.tsx': `
        import { AgGridReact } from 'ag-grid-react';
        const columnDefs = [{ field: 'name' }, { field: 'value' }];
        export function DataTable() { return <AgGridReact columnDefs={columnDefs} />; }
      `,
      'src/components/ConfirmModal.tsx': `
        import { Dialog, DialogTitle } from '@mui/material';
        export function ConfirmModal({ open }) {
          return <Dialog open={open}><DialogTitle>Confirm</DialogTitle></Dialog>;
        }
      `,
    });

    const result = await mineElements(TEST_DIR);

    expect(result.stats.entitiesFound).toBeGreaterThan(0);
    expect(result.stats.routesFound).toBeGreaterThan(0);
    expect(result.stats.formsFound).toBeGreaterThan(0);
    expect(result.stats.tablesFound).toBeGreaterThan(0);
    expect(result.stats.modalsFound).toBeGreaterThan(0);
    expect(result.stats.totalElements).toBe(
      result.stats.entitiesFound +
      result.stats.routesFound +
      result.stats.formsFound +
      result.stats.tablesFound +
      result.stats.modalsFound
    );
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should handle empty projects gracefully', async () => {
    createTestProject({});

    const result = await mineElements(TEST_DIR);

    expect(result.stats.totalElements).toBe(0);
    expect(result.elements.entities).toEqual([]);
    expect(result.elements.routes).toEqual([]);
    expect(result.elements.forms).toEqual([]);
    expect(result.elements.tables).toEqual([]);
    expect(result.elements.modals).toEqual([]);
  });
});

// =============================================================================
// Pipeline Tests
// =============================================================================

describe('runMiningPipeline', () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it('should mine elements and generate patterns', async () => {
    createTestProject({
      'src/types/models.ts': `
        interface User { id: string; name: string; email: string; }
        interface Product { id: string; name: string; price: number; }
        interface Order { id: string; userId: string; total: number; }
      `,
      'pages/index.tsx': 'export default function Home() {}',
      'pages/users.tsx': 'export default function Users() {}',
      'pages/products.tsx': 'export default function Products() {}',
      'src/schemas/userForm.ts': `
        import { z } from 'zod';
        export const userSchema = z.object({
          name: z.string(),
          email: z.email(),
        });
      `,
    });

    const result = await runMiningPipeline(TEST_DIR);

    // Check mining results
    expect(result.mining.stats.entitiesFound).toBeGreaterThan(0);
    expect(result.mining.stats.routesFound).toBeGreaterThan(0);

    // Check pattern generation
    expect(result.patterns.stats.totalPatterns).toBeGreaterThan(0);
    expect(result.patterns.patterns.length).toBeGreaterThan(0);

    // Verify patterns are generated from mined entities
    const entityPatterns = result.patterns.patterns.filter(
      p => p.templateSource === 'crud'
    );
    expect(entityPatterns.length).toBeGreaterThan(0);
  });

  it('should respect custom confidence option', async () => {
    createTestProject({
      'src/types/models.ts': `
        interface User { id: string; name: string; }
      `,
    });

    const result = await runMiningPipeline(TEST_DIR, { confidence: 0.85 });

    // All patterns should have the custom confidence
    result.patterns.patterns.forEach(pattern => {
      expect(pattern.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });
});
