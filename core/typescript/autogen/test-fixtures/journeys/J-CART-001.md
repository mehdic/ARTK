---
id: JRN-0003
title: Add Item to Shopping Cart
status: clarified
tier: release
actor: shopper
scope: shopping
modules:
  foundation:
    - navigation
  features:
    - cart
    - products
tests: []
completion:
  - type: element
    value: "[data-testid='cart-item']"
    options:
      state: visible
---

## Acceptance Criteria

- User can view product details
- User can add product to cart
- Cart badge updates with item count
- Cart contains the added item

## Steps

### Step 1: Navigate to products page
- **Action**: Go to `/products`
- **Wait for**: `[data-testid="product-grid"]` to be visible

### Step 2: Select first product
- **Action**: Click `[data-testid="product-card"]:first-child`
- **Wait for**: `[data-testid="product-details"]` to be visible

### Step 3: Add to cart
- **Action**: Click `[data-testid="add-to-cart-button"]`
- **Wait for**: `[data-testid="cart-badge"]` to be visible

### Step 4: Verify cart updated
- **Assert**: `[data-testid="cart-badge"]` contains text "1"

### Step 5: Open cart
- **Action**: Click `[data-testid="cart-icon"]`
- **Wait for**: `[data-testid="cart-drawer"]` to be visible

### Step 6: Verify item in cart
- **Assert**: `[data-testid="cart-item"]` count is 1
- **Assert**: `[data-testid="cart-item"]` is visible
