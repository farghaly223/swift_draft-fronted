# SWIFT DRAFT Frontend — Production Development Blueprint
### Next.js 14 + React 18 + TypeScript + Tailwind CSS

---

## 1. Project Folder Structure

```
swift-pos-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              (Root layout)
│   │   ├── page.tsx                (Login page)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (protected)/
│   │   │   ├── layout.tsx          (Protected wrapper)
│   │   │   ├── pos/
│   │   │   │   └── page.tsx        (Main POS screen)
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── items/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── stock-entry/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── serials/
│   │   │   │       └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── route.ts            (API proxy if needed)
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── services/
│   │   │   │   └── authService.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── pos/
│   │   │   ├── components/
│   │   │   │   ├── PosLayout.tsx
│   │   │   │   ├── ProductGrid.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── CategoryTabs.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── Cart.tsx
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── PaymentModal.tsx
│   │   │   │   ├── PaymentMethodSelector.tsx
│   │   │   │   ├── CashPayment.tsx
│   │   │   │   ├── SplitPayment.tsx
│   │   │   │   ├── ReceiptPreview.tsx
│   │   │   │   ├── ReceiptPrinter.tsx
│   │   │   │   ├── BarcodeInput.tsx
│   │   │   │   ├── SessionTimer.tsx
│   │   │   │   ├── OpeningCashModal.tsx
│   │   │   │   ├── EndShiftModal.tsx
│   │   │   │   └── ReturnModal.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCartManagement.ts
│   │   │   │   ├── usePayment.ts
│   │   │   │   ├── useBarcodeScanner.ts
│   │   │   │   ├── useProductSearch.ts
│   │   │   │   └── useSessionHeartbeat.ts
│   │   │   ├── services/
│   │   │   │   ├── posService.ts
│   │   │   │   └── invoiceService.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── inventory/
│   │   │   ├── components/
│   │   │   │   ├── InventoryLayout.tsx
│   │   │   │   ├── ItemsTable.tsx
│   │   │   │   ├── ItemForm.tsx
│   │   │   │   ├── StockEntryForm.tsx
│   │   │   │   ├── SerialNumberForm.tsx
│   │   │   │   ├── BarcodeValidationField.tsx
│   │   │   │   └── ItemSearch.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useInventoryForm.ts
│   │   │   ├── services/
│   │   │   │   └── inventoryService.ts
│   │   │   └── types.ts
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   └── SettingsPanel.tsx
│   │       ├── services/
│   │       │   └── settingsService.ts
│   │       └── types.ts
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── Table.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   └── icons/
│   │       └── Icons.ts
│   │
│   ├── lib/
│   │   ├── api.ts              (Frappe API client)
│   │   ├── axios.ts            (Axios instance)
│   │   ├── utils.ts            (Utility functions)
│   │   ├── keyboard.ts         (Keyboard shortcuts)
│   │   ├── formatting.ts       (Currency, date, etc.)
│   │   ├── validation.ts       (Form validation)
│   │   └── sound.ts            (Barcode beep)
│   │
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── posSessionStore.ts
│   │   ├── cartStore.ts
│   │   ├── paymentStore.ts
│   │   ├── inventoryStore.ts
│   │   └── uiStore.ts
│   │
│   ├── hooks/
│   │   ├── useQuery.ts         (TanStack Query wrappers)
│   │   ├── useMutation.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useKeyboardShortcut.ts
│   │   └── useIsDesktop.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── pos.ts
│   │   ├── inventory.ts
│   │   ├── auth.ts
│   │   └── common.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tokens.css          (Tailwind theme tokens)
│   │   └── animations.css
│   │
│   └── config/
│       ├── constants.ts
│       └── env.ts
│
├── public/
│   ├── sounds/
│   │   └── barcode-beep.mp3
│   └── icons/
│
├── .env.local
├── .env.example
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── README.md
```

---

## 2. Route Structure

```
/                                  → Redirect to /login or /pos
/login                             → Login form
/pos                               → Main POS screen (protected)
/inventory/items                   → Items list (protected, Storekeeper)
/inventory/items/new               → Create item
/inventory/items/[id]/edit         → Edit item
/inventory/stock-entry             → Stock entry form
/inventory/stock-entry/new         → New stock entry
/inventory/serials                 → Serial numbers
/settings                          → Settings panel
```

---

## 3. Component Tree (Hierarchical)

### 3.1 Authentication Flow
```
app/
├── layout.tsx (Root)
└── (auth)/
    ├── layout.tsx (Auth layout)
    └── login/
        └── page.tsx
            └── LoginForm
                ├── EmailInput
                ├── PasswordInput
                └── SubmitButton
```

### 3.2 Protected Area Layout
```
(protected)/
├── layout.tsx
│   ├── Header (Cashier Name, Session Timer, End Shift)
│   ├── ProtectedRoute (Auth guard)
│   └── PageContent (children)
└── pages...
```

### 3.3 POS Screen (Most Important)
```
pos/page.tsx
└── PosLayout
    ├── LeftPanel (65%)
    │   ├── SearchBar
    │   ├── CategoryTabs
    │   └── ProductGrid
    │       └── ProductCard[] (virtualized if >100 items)
    │
    └── RightPanel (35%)
        ├── CartHeader (sticky top)
        ├── CartList
        │   └── CartItem[]
        │       ├── ProductName
        │       ├── QtyControl (++/--)
        │       ├── Price
        │       └── RemoveButton
        ├── Totals (sticky)
        │   ├── Subtotal
        │   ├── Tax
        │   ├── Discount
        │   └── GrandTotal
        ├── PaymentButton (sticky bottom, large)
        ├── BarcodeInput (hidden, always focused)
        │
        └── Modals
            ├── PaymentModal (open when Pay clicked)
            │   ├── PaymentMethodSelector
            │   │   ├── CashPayment
            │   │   │   ├── QuickAmountButtons
            │   │   │   └── CustomAmountInput
            │   │   ├── CardPayment
            │   │   └── SplitPayment
            │   └── ConfirmButton
            │
            ├── ReceiptModal (open after success)
            │   ├── ReceiptPreview (80mm width)
            │   ├── PrintButton
            │   └── NewSaleButton
            │
            ├── ReturnModal (from receipt)
            │   └── ReturnItemSelector
            │
            └── OpeningCashModal (on first login)
                └── CashAmountInput
```

### 3.4 Inventory Screen
```
inventory/items/page.tsx
└── InventoryLayout
    ├── Sidebar
    │   ├── NavLink: Items
    │   ├── NavLink: Stock Entry
    │   ├── NavLink: Serial Numbers
    │   ├── NavLink: Warehouses (read-only)
    │   ├── NavLink: Item Groups (read-only)
    │   └── NavLink: Suppliers (read-only)
    │
    ├── MainArea
    │   ├── Header
    │   │   ├── Title
    │   │   ├── SearchInput
    │   │   └── AddButton
    │   │
    │   └── ItemsTable
    │       ├── TableHeader
    │       ├── TableRow[] (virtualized)
    │       │   ├── ItemName
    │       │   ├── ItemGroup
    │       │   ├── Barcode
    │       │   ├── Actions (Edit, Delete)
    │       │   └── Checkbox
    │       └── Pagination
    │
    └── Modals
        └── ItemForm (create/edit)
            ├── ItemNameInput
            ├── ItemGroupSelect
            ├── UOMSelect
            ├── BarcodeScanner + Input
            │   └── ValidateBarcode (real-time)
            ├── OpeningStockInput
            ├── WarehouseSelect
            ├── SerialTrackingCheckbox
            └── SaveButton
```

---

## 4. Zustand Store Design

### 4.1 Auth Store
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  role: 'Swift Cashier' | 'Swift Storekeeper' | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

// Usage: const { user, role } = useAuthStore();
```

### 4.2 POS Session Store
```typescript
// stores/posSessionStore.ts
interface PosSessionState {
  openingEntry: OpeningEntry | null;
  sessionId: string | null;
  isSessionOpen: boolean;
  openingAmount: number | null;
  startTime: Date | null;
  lastHeartbeat: Date | null;
}

interface PosSessionActions {
  checkCurrentSession: () => Promise<void>;
  openSession: (amount: number) => Promise<void>;
  closeSession: (closingAmount: number) => Promise<void>;
  updateHeartbeat: (state: 'cart_active' | 'payment_open' | 'idle') => void;
}
```

### 4.3 Cart Store
```typescript
// stores/cartStore.ts
interface CartItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  discount?: number;
  line_total: number;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  grand_total: number;
}

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (itemCode: string) => void;
  updateQty: (itemCode: string, qty: number) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  calculateTotals: () => void;
}

// Usage: const { items, grand_total, addItem } = useCartStore();
```

### 4.4 Payment Store
```typescript
// stores/paymentStore.ts
interface Payment {
  mode_of_payment: string;
  amount: number;
}

interface PaymentState {
  payments: Payment[];
  selectedMethod: string | null;
  isProcessing: boolean;
  change: number;
}

interface PaymentActions {
  addPayment: (payment: Payment) => void;
  removePayment: (index: number) => void;
  setSelectedMethod: (method: string) => void;
  calculateChange: (total: number) => void;
  clear: () => void;
}
```

### 4.5 Inventory Store
```typescript
// stores/inventoryStore.ts
interface InventoryState {
  items: Item[];
  selectedItem: Item | null;
  isLoading: boolean;
  searchQuery: string;
  filters: InventoryFilters;
}

interface InventoryActions {
  loadItems: (search?: string) => Promise<void>;
  selectItem: (item: Item) => void;
  updateSearchQuery: (query: string) => void;
  setFilters: (filters: InventoryFilters) => void;
}
```

### 4.6 UI Store
```typescript
// stores/uiStore.ts
interface UIState {
  showPaymentModal: boolean;
  showReceiptModal: boolean;
  showReturnModal: boolean;
  showOpeningCashModal: boolean;
  showEndShiftModal: boolean;
  toastMessage: string | null;
}

interface UIActions {
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openReceiptModal: () => void;
  // ... etc
  showToast: (message: string, duration?: number) => void;
}
```

---

## 5. API Service Layer

### 5.1 Axios Configuration
```typescript
// lib/axios.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FRAPPE_URL || 'http://localhost:8000',
  withCredentials: true, // For Frappe session cookies
  headers: {
    'X-Device-Id': getOrCreateDeviceId(),
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logout
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 5.2 Frappe API Client
```typescript
// lib/api.ts
import apiClient from './axios';

export const frappeApi = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.login', { email, password }),

  logout: () =>
    apiClient.post('/api/method/swift_pos.api.v1.api.logout'),

  me: () =>
    apiClient.get('/api/method/swift_pos.api.v1.api.me'),

  // POS Session
  sessionCurrent: () =>
    apiClient.get('/api/method/swift_pos.api.v1.api.session_current'),

  sessionOpen: (opening_amount: number) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.session_open', { opening_amount }),

  sessionClose: (closing_amount: number) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.session_close', { closing_amount }),

  sessionHeartbeat: (opening_entry: string, state: string) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.session_heartbeat', {
      opening_entry,
      state,
    }),

  // Items
  itemByBarcode: (barcode: string) =>
    apiClient.get(`/api/method/swift_pos.api.v1.api.item_by_barcode?barcode=${barcode}`),

  itemSearch: (q: string) =>
    apiClient.get(`/api/method/swift_pos.api.v1.api.item_search?q=${q}`),

  createInvoice: (payload: InvoicePayload) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.create_invoice', payload),

  getInvoice: (name: string) =>
    apiClient.get(`/api/method/swift_pos.api.v1.api.get_invoice?invoice_name=${name}`),

  createReturn: (invoice_name: string, items?: CartItem[]) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.create_return', {
      invoice_name,
      items,
    }),

  // Inventory (Storekeeper)
  createItem: (payload: CreateItemPayload) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.create_item', payload),

  validateBarcode: (barcode: string) =>
    apiClient.get(`/api/method/swift_pos.api.v1.api.validate_barcode?barcode=${barcode}`),

  addItemBarcode: (item_code: string, barcode: string) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.add_item_barcode', {
      item_code,
      barcode,
    }),

  createStockEntry: (payload: StockEntryPayload) =>
    apiClient.post('/api/method/swift_pos.api.v1.api.create_stock_entry', payload),

  // Read-only
  listWarehouses: () =>
    apiClient.get('/api/method/swift_pos.api.v1.api.list_warehouses'),

  listItemGroups: () =>
    apiClient.get('/api/method/swift_pos.api.v1.api.list_item_groups'),

  posConfig: () =>
    apiClient.get('/api/method/swift_pos.api.v1.api.pos_config'),
};
```

### 5.3 Service Layer (Business Logic)
```typescript
// features/pos/services/posService.ts
import { frappeApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';

export const posService = {
  async searchItems(query: string) {
    const response = await frappeApi.itemSearch(query);
    return response.data;
  },

  async scanBarcode(barcode: string) {
    const response = await frappeApi.itemByBarcode(barcode);
    const item = response.data;

    // Optimistically add to cart
    useCartStore.getState().addItem(item);

    // Play beep sound
    playBarcodeSound();

    return item;
  },

  async checkout(items: CartItem[], payments: Payment[]) {
    const response = await frappeApi.createInvoice({
      items,
      payments,
      customer: 'Walk-in Customer',
    });

    // Clear cart on success
    useCartStore.getState().clearCart();

    return response.data;
  },
};
```

---

## 6. Page-by-Page UI Breakdown

### 6.1 Login Page (`/login`)

**Layout:**
- Centered card
- White background
- Light gray card shadow

**Elements:**
```
┌─ Header ─────────────────────┐
│ SWIFT DRAFT                  │
│ POS System                   │
├──────────────────────────────┤
│                              │
│  Email Input                 │
│  [_______________________]   │
│                              │
│  Password Input              │
│  [_______________________]   │
│                              │
│  [     LOGIN BUTTON     ]    │
│                              │
│  Error message (if any)      │
└──────────────────────────────┘
```

**Validation:**
- Email format
- Password not empty
- Show error toast if login fails
- Disable button during loading

---

### 6.2 Opening Cash Modal

**Trigger:** On first login if no session exists

**Layout:**
- Modal overlay
- Centered form

**Elements:**
```
┌─ Modal ──────────────────────┐
│ Start Your Shift            X│
├──────────────────────────────┤
│                              │
│ Enter cash in register:      │
│ [_______________________]    │
│                              │
│  [    START SHIFT     ]      │
│                              │
└──────────────────────────────┘
```

**Behavior:**
- Amount must be >= 0
- On confirm: create session, show POS screen

---

### 6.3 Main POS Screen (`/pos`)

**Overall Layout (after session opens):**

```
HEADER (Fixed top, 60px)
├─ Left: "Cashier: John Doe"
├─ Center: (empty)
└─ Right: "09:32" | "End Shift"

MAIN CONTENT (Split layout)
├─ LEFT PANEL (65%, scrollable)
│  ├─ SearchBar (sticky top)
│  ├─ CategoryTabs (sticky below search)
│  └─ ProductGrid (virtualized, auto-load)
│
└─ RIGHT PANEL (35%, fixed/sticky)
   ├─ CartHeader "Current Sale"
   ├─ CartItems (scrollable list)
   ├─ Totals (sticky)
   │  ├─ Subtotal: $500.00
   │  ├─ Tax: $50.00
   │  ├─ Discount: -$10.00
   │  └─ TOTAL: $540.00
   ├─ PayButton (large, teal, sticky bottom)
   └─ BarcodeInput (invisible, always focused)

MODALS (overlay, hidden by default)
├─ PaymentModal
├─ ReceiptModal
├─ ReturnModal
└─ EndShiftModal
```

#### 6.3.1 Left Panel - Product Grid

**SearchBar:**
```
┌─ SEARCH ──────────────────────┐
│ 🔍 Search products or barcode │
└───────────────────────────────┘
```
- Debounced input (300ms)
- On Enter: execute search
- Clear button (×) when has text

**CategoryTabs:**
```
┌─ All | Scooters | Parts | Accessories | Tires | ... ┐
```
- Horizontal scroll if many categories
- Active tab highlighted (teal underline)
- Click to filter products

**ProductGrid:**
```
┌─ Product Card ──────────┐
│                         │
│   [      IMAGE   ]      │
│  (200x150 aspect)       │
│                         │
│ SCOOTER BATTERY 48V     │
│                         │
│      $350.00            │
│                         │
│   [  TAP TO ADD  ]       │
│                         │
└─────────────────────────┘

(Repeat × 12-20 visible cards, virtualized)
```

- Card dimensions: 180px wide × 240px tall
- Grid: 3 columns on desktop, 2 on tablet
- On card click: add to cart with qty=1
- Product image lazy-loaded
- Barcode scanner also triggers add

#### 6.3.2 Right Panel - Cart

**Cart Header:**
```
┌─ Current Sale ─────────┐
│ (× items in cart)      │
└────────────────────────┘
```

**CartItem:**
```
┌─ Item ──────────────────────────────┐
│                                     │
│ Scooter Battery 48V                 │
│ $350.00 × 2                         │
│                                     │
│ [−] 2 [+]          $700.00 [×Remove]│
│                                     │
└─────────────────────────────────────┘
```

- Qty controls: decrement / number input / increment
- Remove button (×) on right
- Shows line total
- If item already in cart + scan same barcode = increment qty

**Totals Section:**
```
┌──────────────────────────┐
│ Subtotal      $700.00    │
│ Tax (10%)      $70.00    │
│ Discount       -$0.00    │
├──────────────────────────┤
│ TOTAL        $770.00     │
└──────────────────────────┘
```

**Payment Button (Sticky Bottom Right):**
```
┌──────────────────────┐
│   PAY $770.00        │
│   (TAP TO CONTINUE)  │
└──────────────────────┘
```
- Always visible
- Teal/blue background (#0891b2 or similar)
- White text
- Large touch target (60px height)
- Disabled if cart empty

**BarcodeInput (Hidden):**
```html
<input 
  type="text"
  placeholder="Barcode scanner input"
  autoFocus
  onKeyDown={handleBarcodeScan}
  style={{ position: 'absolute', left: '-9999px' }}
/>
```

- Always focused (via useEffect)
- On Enter key: scan barcode
- Auto-clear after scan
- Play beep sound on success
- Toast error if not found

---

### 6.4 Payment Modal

**Trigger:** Click PAY button

**Layout:**
```
┌─ PAYMENT ───────────────────────────X│
│                                      │
│ Amount due: $770.00                 │
├──────────────────────────────────────┤
│                                      │
│ Payment Method:                      │
│ ┌──────────┬──────────┬────────┐    │
│ │  CASH    │  CARD    │ SPLIT  │    │
│ └──────────┴──────────┴────────┘    │
│                                      │
├─ Cash Payment ──────────────────────┤
│                                      │
│ Quick amounts:                       │
│ [100] [200] [500] [1000]            │
│                                      │
│ Custom amount:                       │
│ [_________________________]         │
│                                      │
│ Change: $0.00                       │
│                                      │
│ [    CONFIRM PAYMENT    ]           │
│ [         CANCEL        ]           │
│                                      │
└──────────────────────────────────────┘
```

**Logic:**
- Show "Quick amount" buttons for common values (100, 200, 500, 1000, etc.)
- Custom input below
- Auto-calculate change (amount - total)
- Highlight change in green if change > 0
- Confirm button enables only if amount >= total

---

### 6.5 Receipt Modal

**Trigger:** After successful payment

**Layout (80mm thermal printer width):**
```
┌─ RECEIPT ────────────────X│
│                           │
│ ╔═══════════════════════╗ │
│ ║    SWIFT DRAFT        ║ │
│ ║   Scooter Shop        ║ │
│ ║                       ║ │
│ ║ Receipt #: INV-00012  ║ │
│ ║ Date: 2024-01-15      ║ │
│ ║ Time: 14:32:15        ║ │
│ ║───────────────────────║ │
│ ║ Item     Qty   $Price ║ │
│ ║───────────────────────║ │
│ ║ Battery  2    $350.00 ║ │
│ ║ Tires    4    $100.00 ║ │
│ ║───────────────────────║ │
│ ║ Subtotal      $450.00 ║ │
│ ║ Tax 10%        $45.00 ║ │
│ ║───────────────────────║ │
│ ║ TOTAL        $495.00  ║ │
│ ║───────────────────────║ │
│ ║ Payment: CASH $500.00  ║ │
│ ║ Change:        $5.00   ║ │
│ ║───────────────────────║ │
│ ║                       ║ │
│ ║  Thank you! Come back ║ │
│ ║                       ║ │
│ ╚═══════════════════════╝ │
│                           │
│ [  PRINT  ] [ NEW SALE ]  │
│                           │
└───────────────────────────┘
```

**Buttons:**
- **PRINT:** Trigger browser print dialog (Ctrl+P)
- **NEW SALE:** Clear cart, close modal, return to POS main

**Print Format:**
- 80mm width by default
- Monospace font for alignment
- CSS @media print rules

---

### 6.6 End Shift Modal

**Trigger:** Click "End Shift" button (top right)

**Layout:**
```
┌─ END YOUR SHIFT ──────────────────X│
│                                   │
│ Shift Summary:                    │
│ ┌────────────────────────────────┤
│ │ Opened: 08:30 AM               │
│ │ Now: 14:45 PM                  │
│ │ Duration: 6h 15m               │
│ └────────────────────────────────┤
│                                   │
│ Sales:                            │
│ ├─ Total Invoices: 34             │
│ ├─ Total Sales: $12,450.00        │
│ ├─ Cash Sales: $7,200.00          │
│ ├─ Card Sales: $5,250.00          │
│ └─ Returns: -$0.00                │
│                                   │
│ Cash Reconciliation:              │
│ ├─ Opening Cash: $500.00          │
│ ├─ Expected Closing: $7,700.00    │
│ │                                 │
│ │ Actual cash in register:        │
│ │ [_________________________]     │
│ │                                 │
│ └─ Difference: ±$0.00             │
│                                   │
│ [  CLOSE SHIFT  ] [ CANCEL ]     │
│                                   │
└───────────────────────────────────┘
```

**Behavior:**
- Show real-time summary
- Input for actual cash count
- Calculate + display discrepancy
- On Close: call sessionClose API
- On success: redirect to login

---

### 6.7 Inventory Screen (`/inventory/items`)

**Layout:**
```
HEADER (Fixed)
└─ INVENTORY MANAGEMENT

SIDEBAR (Left, 200px, fixed)
├─ □ Items
├─ □ Stock Entry
├─ □ Serial Numbers
├─ □ Warehouses (read-only icon)
├─ □ Item Groups (read-only icon)
└─ □ Suppliers (read-only icon)

MAIN AREA (Right, scrollable)
├─ Toolbar
│  ├─ [  Search items...  ]
│  ├─ [  + ADD ITEM  ]
│  └─ Filter dropdown
│
└─ ItemsTable (virtualized)
   ├─ Headers
   │  ├─ □ (checkbox)
   │  ├─ Item Code
   │  ├─ Item Name
   │  ├─ Group
   │  ├─ Barcode
   │  ├─ Stock
   │  ├─ UOM
   │  └─ Actions
   │
   └─ Rows (100-1000 items, virtualized)
      ├─ □ | SC-001 | Battery | Parts | 8901... | 45 | Nos | [Edit] [Del]
      ├─ □ | SC-002 | Tires   | Parts | 8902... | 12 | Nos | [Edit] [Del]
      └─ ...
```

---

### 6.8 Item Form (Create/Edit)

**Trigger:** Click "+ ADD ITEM" or edit action

**Layout (Modal or Page):**
```
┌─ CREATE ITEM ─────────────────────X│
│                                    │
│ Item Name *                        │
│ [_____________________________]   │
│                                    │
│ Item Group *                       │
│ [▼ Select Group  ________________]│
│                                    │
│ UOM *                              │
│ [▼ Nos ___________________]       │
│                                    │
│ BARCODE                            │
│ [  🔍 SCAN  ] [________________]  │
│ (Validates in real-time)          │
│                                    │
│ Opening Stock                      │
│ [________________]  Nos            │
│                                    │
│ Warehouse                          │
│ [▼ Stores __________________]    │
│                                    │
│ Track Serial Numbers?              │
│ ☐ Enable serial tracking           │
│                                    │
│ [    SAVE ITEM    ] [ CANCEL ]    │
│                                    │
└────────────────────────────────────┘
```

**Validation:**
- Item Name: required, min 3 chars
- Item Group: required (dropdown)
- UOM: required (dropdown)
- Barcode: optional, must be unique (validate_barcode on blur/change)
- Opening Stock: optional, numeric
- Show validation errors inline (red text below field)

**Barcode Validation:**
- On input change: call `validateBarcode` API
- If available: show green ✓
- If taken: show red ✗ "Barcode already assigned to [Item Name]"

---

## 7. Exact Cashier Workflow

### Step-by-Step Interactions:

1. **Cashier logs in** → email + password → /login page
2. **Authenticate** → Call login API
3. **Detect role** → Role = "Swift Cashier"
4. **Check session** → Call session_current API
5. **If no session:**
   - Show "Opening Cash Modal"
   - Cashier enters opening amount ($500)
   - Click "START SHIFT"
   - Call session_open API
6. **POS screen opens** → Barcode input auto-focused
7. **Cashier scans barcode** → 
   - Barcode scanner types: `8901234567890` + Enter
   - BarcodeInput.onKeyDown catches Enter
   - Call item_by_barcode API
   - Item loads → show toast "Battery added"
   - Play beep sound
   - Barcode input clears and re-focuses
   - Item appears in cart with qty=1
   - If same barcode scanned again → qty increases to 2
8. **Repeat scanning** → Multiple items added
9. **Manual search** (if needed):
   - Click SearchBar
   - Type "battery"
   - Debounce 300ms → call item_search API
   - Results appear in ProductGrid
   - Click product → add to cart
10. **Adjust quantities** → Click ++ or −− on cart item
11. **Apply discount** (if needed):
   - In cart: edit discount field
   - Or in payment modal: subtract before payment
12. **Click PAY** → Payment Modal opens
13. **Select payment method:**
   - **CASH:** 
     - Click [1000] or enter custom: $550
     - See change calculated: $5.00 (if total = $545)
     - Click "CONFIRM PAYMENT"
   - **CARD:**
     - Click [CARD]
     - Enter amount (or auto-filled)
     - Click "CONFIRM PAYMENT"
   - **SPLIT:**
     - Click [SPLIT]
     - Add row: Cash $300 + Card $245
     - Click "CONFIRM PAYMENT"
14. **API call** → Call create_invoice API with items + payments
15. **Success** → Receipt Modal opens
16. **Print receipt:**
   - Click [PRINT]
   - Browser print dialog (Ctrl+P)
   - Select printer (POS thermal printer or PDF)
17. **New sale** → Click [NEW SALE]
    - Cart clears
    - Return to POS main screen
    - Barcode input re-focuses
    - Repeat from step 7

### End-of-Day:
18. **Click "End Shift"** (top-right) → End Shift Modal opens
19. **Enter physical cash count** → $7,700.00
20. **Review discrepancy** → Shows expected vs. actual
21. **Click "CLOSE SHIFT"** → Call session_close API
22. **On success** → Redirect to login page

---

## 8. Exact Storekeeper Workflow

1. **Storekeeper logs in** → email + password
2. **Role = "Swift Storekeeper"** → Redirect to /inventory/items
3. **Inventory page loads** → Items table visible
4. **Search/filter items**:
   - Type in search: "batt"
   - Debounce 500ms
   - Table filters by name
5. **Create item**:
   - Click [+ ADD ITEM]
   - Fill form (name, group, UOM)
   - Click "Scan barcode" button
   - Barcode scanner activated (modal with input or field focus)
   - Scan: `8901234567890`
   - Real-time validation: "✓ Available"
   - Enter opening stock: 50
   - Select warehouse
   - Click [SAVE ITEM]
   - API: create_item
   - On success: return to table, item appears at top
6. **Edit item**:
   - Click [Edit] action on row
   - Form pre-fills with item data
   - Edit fields (name, group, stock, etc.)
   - Can add/remove barcode
   - Click [SAVE ITEM]
   - API: update_item
7. **Create stock entry**:
   - Click "Stock Entry" in sidebar
   - Form: Select type (Material Receipt / Transfer / Issue)
   - Add items with qty
   - Select from/to warehouse
   - Click [SAVE]
   - API: create_stock_entry
8. **Manage serial numbers**:
   - Click "Serial Numbers" in sidebar
   - Form: Select item (must have serial tracking enabled)
   - Enter serials: SER-001, SER-002, ...
   - Click [ADD SERIALS]
   - API: add_serial_number

---

## 9. Payment Modal Structure

### Data Flow:

```
Payment Modal State:
├─ selectedMethod: 'cash' | 'card' | 'split'
├─ payments: [ { mode: 'Cash', amount: 550 } ]
├─ grandTotal: 545.00
└─ changeAmount: 5.00

Actions:
├─ addPayment(mode, amount)
├─ removePayment(index)
├─ calculateChange(amount)
└─ confirm()
```

### Components:

**PaymentMethodSelector**
```
┌─ Method Tabs ──────────────────┐
│ [CASH]  [CARD]  [SPLIT]       │
└────────────────────────────────┘
```

**CashPayment**
```
├─ Quick Buttons: [100] [200] [500] [1000]
├─ Custom Input: [_____________]
├─ Change Display: "Change: $5.00" (green text)
└─ Confirm Button: [CONFIRM PAYMENT]
```

**CardPayment**
```
├─ Amount Input: [_____________] (auto-filled with total)
├─ Note: "Amount will be charged to card"
└─ Confirm Button: [CONFIRM PAYMENT]
```

**SplitPayment**
```
├─ Add Payment Row: [+ ADD PAYMENT]
├─ Row: [Mode] [Amount] [×]
│  └─ Examples:
│     ├─ Cash $300 [×]
│     └─ Card $245 [×]
├─ Remaining: $0.00 (must be 0 to confirm)
└─ Confirm Button: [CONFIRM PAYMENT] (enabled only if sum == total)
```

---

## 10. Receipt Structure

### Receipt Template (Tailwind + Print CSS):

```typescript
// components/ReceiptPreview.tsx
export function ReceiptPreview({ invoice }: Props) {
  return (
    <div className="receipt-container bg-white p-8 font-mono text-sm max-w-sm">
      {/* Header */}
      <div className="text-center font-bold mb-4">
        SWIFT DRAFT
        <br />
        Scooter Shop
      </div>

      {/* Receipt Info */}
      <div className="border-b pb-2 mb-2 text-xs">
        Receipt #: {invoice.name}
        <br />
        Date: {formatDate(invoice.posting_date)}
        <br />
        Time: {formatTime(invoice.posting_time)}
      </div>

      {/* Items Table */}
      <table className="w-full text-xs mb-2">
        <thead className="border-b">
          <tr>
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody className="border-b">
          {invoice.items.map((item) => (
            <tr key={item.item_code}>
              <td className="text-left">{item.item_name}</td>
              <td className="text-right">{item.qty}</td>
              <td className="text-right">${item.rate.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="text-xs mb-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${invoice.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>${invoice.tax.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 font-bold flex justify-between">
          <span>TOTAL</span>
          <span>${invoice.grand_total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payments */}
      <div className="text-xs border-t pt-2">
        {invoice.payments.map((p) => (
          <div key={p.mode_of_payment} className="flex justify-between">
            <span>{p.mode_of_payment}</span>
            <span>${p.amount.toFixed(2)}</span>
          </div>
        ))}
        {invoice.change > 0 && (
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Change</span>
            <span>${invoice.change.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs mt-4">
        Thank you! Come again.
      </div>
    </div>
  );
}

// CSS for printing
@media print {
  .receipt-container {
    width: 80mm;
    margin: 0;
    padding: 0;
    font-size: 10pt;
  }
}
```

---

## 11. End Shift Structure

### Modal Data:

```typescript
interface ShiftSummary {
  openingEntry: string;
  openedAt: Date;
  closedAt: Date;
  invoiceCount: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  returnsAmount: number;
  openingCash: number;
  expectedClosing: number;
  actualClosing: number;
  difference: number;
}
```

### Component Flow:

```typescript
// features/pos/components/EndShiftModal.tsx

const [closingAmount, setClosingAmount] = useState<number | null>(null);

const handleSubmit = async () => {
  const response = await posService.closeSession(closingAmount);
  if (response.success) {
    // Show success toast
    // Redirect to login
    router.push('/login');
  }
};
```

---

## 12. Keyboard Shortcuts

| Key       | Action                           |
|-----------|----------------------------------|
| `Ctrl+P`  | Print receipt                    |
| `Esc`     | Close modal                      |
| `Enter`   | Barcode scan complete            |
| `Tab`     | Next field (form navigation)     |
| `Shift+S` | End shift (open modal)           |
| `Shift+N` | New sale (clear cart)            |
| `Shift+R` | Open returns                     |
| `1-9`     | Quick item selection (if product grid focused) |
| `+`       | Increment qty                    |
| `-`       | Decrement qty                    |

**Implementation:**
```typescript
// hooks/useKeyboardShortcut.ts
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const matches =
        e.key === key &&
        (!options.ctrl || e.ctrlKey) &&
        (!options.shift || e.shiftKey) &&
        (!options.alt || e.altKey);

      if (matches) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, options]);
}

// Usage in component:
useKeyboardShortcut('s', () => openEndShiftModal(), { shift: true });
```

---

## 13. Performance Optimizations

### 13.1 Product Grid Virtualization

```typescript
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={3}
  columnSize={200}
  height={600}
  rowCount={Math.ceil(products.length / 3)}
  rowSize={240}
  width={900}
>
  {({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 3 + columnIndex;
    const product = products[index];
    return (
      <div style={style}>
        <ProductCard product={product} />
      </div>
    );
  }}
</FixedSizeGrid>
```

### 13.2 Debounced Search

```typescript
const [query, setQuery] = useState('');
const debouncedSearch = useDebounce(query, 300);

const { data: results } = useQuery({
  queryKey: ['itemSearch', debouncedSearch],
  queryFn: () => frappeApi.itemSearch(debouncedSearch),
  enabled: debouncedSearch.length > 2,
});
```

### 13.3 Optimistic Cart Updates

```typescript
const { addItem } = useCartStore();

const handleScan = async (barcode: string) => {
  // 1. Optimistically update cart before API call
  const tempItem = { item_code: barcode, qty: 1, ... };
  addItem(tempItem);

  // 2. Fetch real data
  try {
    const item = await frappeApi.itemByBarcode(barcode);
    // 3. Update with real data if needed
    updateItem(barcode, item);
  } catch {
    // 4. Revert on error
    removeItem(barcode);
    showErrorToast('Item not found');
  }
};
```

### 13.4 React.memo for ProductCard

```typescript
const ProductCard = React.memo(({ product, onSelect }: Props) => (
  <div
    onClick={() => onSelect(product)}
    className="cursor-pointer hover:shadow-md transition-shadow"
  >
    <img src={product.image} alt={product.item_name} />
    <h3>{product.item_name}</h3>
    <p className="font-bold">${product.rate.toFixed(2)}</p>
  </div>
));

export default ProductCard;
```

### 13.5 TanStack Query Configuration

```typescript
// app/layout.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      gcTime: 1000 * 60 * 10,   // 10 mins (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 13.6 Barcode Input Always Focused

```typescript
useEffect(() => {
  const input = barcodeInputRef.current;
  if (input && !isPaymentOpen && !isReceiptOpen) {
    input.focus();
  }
}, [isPaymentOpen, isReceiptOpen]);

return (
  <input
    ref={barcodeInputRef}
    type="text"
    onKeyDown={handleBarcodeScan}
    className="absolute left-[-9999px]"
    autoFocus
  />
);
```

---

## 14. Styling Tokens & Tailwind Theme

### 14.1 Color Palette

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary: Soft teal/cyan
        primary: {
          50: '#f0f9fb',
          100: '#e0f3f7',
          200: '#b3e5ef',
          300: '#80d4e7',
          400: '#4dbfd0',  // Main
          500: '#2ba8ba',
          600: '#0891b2',  // Action buttons
          700: '#067a8f',
          800: '#055f73',
          900: '#044555',
        },

        // Gray: Neutral
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',   // Card backgrounds
          150: '#f0f0f0',   // Subtle panel
          200: '#e5e5e5',   // Borders
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },

        // Semantic
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },

      spacing: {
        // POS-specific spacing
        'cart-height': '600px',
        'payment-modal': '500px',
      },

      borderRadius: {
        'xs': '2px',
        'sm': '4px',   // Default for inputs
        'md': '6px',   // Cards
        'lg': '8px',   // Modals
        'xl': '12px',
      },

      fontSize: {
        'xs': '0.75rem',  // 12px
        'sm': '0.875rem', // 14px
        'base': '1rem',   // 16px (default)
        'lg': '1.125rem', // 18px
        'xl': '1.25rem',  // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
      },

      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.05)',
        'sm': '0 1px 3px rgba(0,0,0,0.1)',
        'md': '0 2px 6px rgba(0,0,0,0.08)',
        'lg': '0 4px 12px rgba(0,0,0,0.1)',
        'xl': '0 8px 20px rgba(0,0,0,0.12)',
      },

      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
};
```

### 14.2 CSS Variables (Global)

```css
/* styles/globals.css */

:root {
  /* Colors */
  --color-primary: #0891b2;
  --color-primary-light: #4dbfd0;
  --color-primary-dark: #067a8f;
  
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-bg-tertiary: #f0f0f0;
  
  --color-border: #e5e5e5;
  --color-text: #171717;
  --color-text-secondary: #737373;
  --color-text-tertiary: #a3a3a3;
  
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 2px 6px rgba(0,0,0,0.08);
  
  /* Typography */
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Courier New', monospace;
  
  /* Z-index */
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-bg: 40;
  --z-modal: 50;
  --z-toast: 60;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-primary);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
}

input, textarea, select {
  font-family: inherit;
}
```

### 14.3 Component-Specific Classes

```css
/* styles/components.css */

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 150ms;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-lg {
  padding: 16px 24px;
  font-size: 18px;
  min-height: 60px;
}

/* Cards */
.card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

/* Inputs */
.input {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 16px;
  transition: border-color 150ms;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.modal-content {
  background-color: var(--color-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

/* Print styles for receipt */
@media print {
  body {
    margin: 0;
    padding: 0;
  }
  
  .no-print {
    display: none !important;
  }
  
  .receipt {
    width: 80mm;
    margin: 0;
    padding: 0;
  }
}
```

---

## 15. Type Definitions

### 15.1 Core Types

```typescript
// types/api.ts

export interface User {
  user: string;
  role: 'Swift Cashier' | 'Swift Storekeeper';
  full_name: string;
  sid: string;
}

export interface Item {
  item_code: string;
  item_name: string;
  rate: number;
  uom: string;
  stock_qty: number;
  image?: string;
}

export interface CartItem extends Item {
  qty: number;
  discount?: number;
  line_total: number;
}

export interface Payment {
  mode_of_payment: string;
  amount: number;
}

export interface Invoice {
  name: string;
  customer: string;
  items: CartItem[];
  payments: Payment[];
  subtotal: number;
  tax: number;
  discount: number;
  grand_total: number;
  posting_date: string;
  posting_time: string;
}

export interface OpeningEntry {
  name: string;
  user: string;
  period_start_time: string;
  company: string;
  pos_profile: string;
  balance_details: Array<{
    mode_of_payment: string;
    opening_amount: number;
  }>;
}

export interface ClosingEntry {
  name: string;
  pos_opening_entry: string;
  period_end_time: string;
  posting_date: string;
  user: string;
  payment_reconciliation: Array<{
    mode_of_payment: string;
    opening_amount: number;
    expected_amount: number;
    closing_amount: number;
  }>;
}
```

### 15.2 Store Types

```typescript
// types/stores.ts

export interface CartStore {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  grand_total: number;
  
  addItem: (item: CartItem) => void;
  removeItem: (itemCode: string) => void;
  updateQty: (itemCode: string, qty: number) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
}

export interface PosSessionStore {
  openingEntry: OpeningEntry | null;
  isSessionOpen: boolean;
  openingAmount: number | null;
  
  checkSession: () => Promise<void>;
  openSession: (amount: number) => Promise<void>;
  closeSession: (closingAmount: number) => Promise<void>;
}

export interface PaymentStore {
  payments: Payment[];
  selectedMethod: string | null;
  
  addPayment: (payment: Payment) => void;
  removePayment: (index: number) => void;
}
```

---

## 16. Environment Configuration

### 16.1 .env.example

```bash
# Frappe API
NEXT_PUBLIC_FRAPPE_URL=http://localhost:8000
NEXT_PUBLIC_FRAPPE_SITE=swiftdraft.test

# Features
NEXT_PUBLIC_ENABLE_OFFLINE_MODE=false
NEXT_PUBLIC_RECEIPT_WIDTH=80mm

# Analytics (optional)
NEXT_PUBLIC_GA_ID=
```

### 16.2 config/constants.ts

```typescript
export const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

export const POS_CONFIG = {
  PRODUCT_GRID_COLUMNS: 3,
  PRODUCT_CARD_HEIGHT: 240,
  PRODUCT_CARD_WIDTH: 200,
  CART_WIDTH: '35%',
  CONTENT_WIDTH: '65%',
};

export const PAYMENT_METHODS = ['Cash', 'Card', 'Wallet'];

export const KEYBOARD_KEYS = {
  PRINT_RECEIPT: 'ctrl+p',
  END_SHIFT: 'shift+s',
  NEW_SALE: 'shift+n',
  CLOSE_MODAL: 'escape',
};

export const API_ENDPOINTS = {
  LOGIN: '/api/method/swift_pos.api.v1.api.login',
  LOGOUT: '/api/method/swift_pos.api.v1.api.logout',
  SESSION_CURRENT: '/api/method/swift_pos.api.v1.api.session_current',
  // ... etc
};
```

---

## 17. Next.js Configuration

### 17.1 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  optimizeFonts: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: '*.local',
      },
    ],
  },

  // Disable static optimization for real-time updates
  unstable_allowRawServerData: false,

  experimental: {
    optimizePackageImports: ['lucide-react', '@hookform/resolvers'],
  },

  // Headers for security + API CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 18. Package.json Dependencies

```json
{
  "name": "swift-pos-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "next": "^14.2.0",
    "typescript": "^5.4.5",
    "zustand": "^4.5.5",
    "@tanstack/react-query": "^5.52.0",
    "@tanstack/react-query-devtools": "^5.52.0",
    "axios": "^1.7.2",
    "react-hook-form": "^7.52.1",
    "zod": "^3.24.1",
    "@hookform/resolvers": "^3.4.1",
    "tailwindcss": "^3.4.3",
    "lucide-react": "^0.428.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "react-window": "^1.8.10",
    "@react-window/fixed-size-list": "^1.8.10",
    "react-hot-toast": "^2.4.1",
    "dayjs": "^1.11.10",
    "currency.js": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/react-window": "^1.8.8",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",
    "prettier": "^3.3.2",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^15.0.7",
    "@testing-library/jest-dom": "^6.4.2"
  }
}
```

---

## 19. Sample Component Skeleton

### 19.1 ProductCard Component

```typescript
// features/pos/components/ProductCard.tsx

import React, { memo } from 'react';
import Image from 'next/image';
import { Item } from '@/types/api';

interface ProductCardProps {
  product: Item;
  onSelect: (product: Item) => void;
}

const ProductCard = memo(function ProductCard({
  product,
  onSelect,
}: ProductCardProps) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="
        flex flex-col items-center justify-between
        w-full h-full p-3
        bg-white border border-gray-100 rounded-md
        hover:shadow-md hover:border-primary-300
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
      "
    >
      {/* Product Image */}
      <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.item_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100px, 200px"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-300">
            No Image
          </div>
        )}
      </div>

      {/* Product Name */}
      <p className="text-sm font-medium text-gray-900 text-center line-clamp-2 mb-1">
        {product.item_name}
      </p>

      {/* Price */}
      <p className="text-lg font-bold text-primary-600">
        ${product.rate.toFixed(2)}
      </p>

      {/* Stock Indicator */}
      <p className="text-xs text-gray-500">Stock: {product.stock_qty}</p>
    </button>
  );
});

export default ProductCard;
```

### 19.2 SearchBar Component

```typescript
// features/pos/components/SearchBar.tsx

import { useCallback, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search products or barcode...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useCallback(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative w-full mb-4">
      <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary-400">
        <Search className="w-5 h-5 text-gray-400 mr-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 outline-none text-gray-900 placeholder-gray-500"
        />
        {query && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

### 19.3 Cart Component

```typescript
// features/pos/components/Cart.tsx

import { useCartStore } from '@/stores/cartStore';
import { CartItem } from './CartItem';
import { Button } from '@/components/common/Button';

interface CartProps {
  onPaymentClick: () => void;
}

export function Cart({ onPaymentClick }: CartProps) {
  const { items, subtotal, tax, discount, grand_total, clearCart } = useCartStore();

  const isEmpty = items.length === 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          Current Sale ({items.length})
        </h2>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Cart is empty
          </div>
        ) : (
          items.map((item) => (
            <CartItem key={item.item_code} item={item} />
          ))
        )}
      </div>

      {/* Totals */}
      {!isEmpty && (
        <div className="border-t border-gray-200 p-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
            <span>TOTAL</span>
            <span className="text-primary-600 text-lg">
              ${grand_total.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-200 p-3 space-y-2">
        <Button
          onClick={onPaymentClick}
          disabled={isEmpty}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Pay ${grand_total.toFixed(2)}
        </Button>
        {!isEmpty && (
          <Button
            onClick={clearCart}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            Clear Cart
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 20. Development Workflow Recommendations

### Phase 1: Foundation (Week 1-2)
- [ ] Setup Next.js 14 project
- [ ] Configure Tailwind + custom theme
- [ ] Setup Zustand stores
- [ ] Setup TanStack Query
- [ ] Create base components (Button, Input, Modal, Card)
- [ ] Setup API client + Axios

### Phase 2: Authentication (Week 2-3)
- [ ] Login page
- [ ] Auth flow + route guards
- [ ] Session persistence
- [ ] Error handling

### Phase 3: POS Core (Week 3-5)
- [ ] POS layout (split view)
- [ ] ProductGrid + virtualization
- [ ] SearchBar + CategoryTabs
- [ ] Cart component
- [ ] CartItem management
- [ ] BarcodeInput + scanning flow

### Phase 4: Payment & Receipt (Week 5-6)
- [ ] PaymentModal + methods
- [ ] ReceiptPreview
- [ ] Receipt printing
- [ ] Returns flow

### Phase 5: Session Management (Week 6-7)
- [ ] OpeningCashModal
- [ ] SessionTimer
- [ ] EndShiftModal
- [ ] Session heartbeat

### Phase 6: Inventory (Week 7-8)
- [ ] InventoryLayout
- [ ] ItemsTable + virtualization
- [ ] ItemForm (create/edit)
- [ ] BarcodeValidation
- [ ] StockEntryForm
- [ ] SerialNumberForm

### Phase 7: Polish & Testing (Week 8-9)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Keyboard shortcuts
- [ ] Error handling + edge cases
- [ ] Unit tests
- [ ] E2E tests

### Phase 8: Deployment (Week 9-10)
- [ ] Build optimization
- [ ] Security review (CORS, CSP, etc.)
- [ ] Testing on real Frappe instance
- [ ] Documentation
- [ ] Go-live

---

## Summary

This blueprint provides a **production-ready frontend architecture** for Swift Draft POS that:

✅ **Matches Loyverse UX** — Layout, flow, speed, button placement
✅ **Professional design** — White + gray + soft teal, minimal shadows, calm aesthetic
✅ **Fast & responsive** — Virtualized grids, debounced search, optimistic updates, always-focused barcode input
✅ **Complete workflows** — Login → Opening → POS → Payment → Receipt → Closing
✅ **Accessible** — Keyboard navigation, high contrast, semantic HTML
✅ **Maintainable** — Feature-based structure, typed stores, service layer abstraction
✅ **Scalable** — Component-driven, modular, easy to extend

A developer can now start implementing with clear direction on every component, route, state, and integration point.

**Happy building! 🚀**
