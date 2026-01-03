---
id: JRN-0002
title: Add Product to Cart
status: clarified
tier: smoke
actor: guest_user
scope: shopping
modules:
  foundation: []
  features:
    - shop/product-page
    - shop/cart
completion:
  - type: element
    value: "[data-testid=\"cart-badge\"]"
    options:
      state: visible
---

# Add Product to Cart Journey

## Context
A user browsing the store wants to add a product to their shopping cart.

## Preconditions
- Product catalog has available items
- Cart is initially empty

## Acceptance Criteria
- [ ] User can view product details
- [ ] Add to cart button is visible
- [ ] Clicking add updates cart count
- [ ] Cart badge shows item count

## Steps

### Step 1: Navigate to Product Page
Navigate to a product detail page.

**Machine Hints:**
- action: goto
- url: /products/sample-product
- selector: [data-testid="product-details"]

### Step 2: Verify Product Info
Verify the product information is displayed.

**Machine Hints:**
- action: expect
- selector: [data-testid="product-title"]
- assertion: toBeVisible

### Step 3: Click Add to Cart
Click the Add to Cart button.

**Machine Hints:**
- action: click
- selector: [data-testid="add-to-cart-button"]

### Step 4: Verify Cart Updated
Verify the cart badge shows the updated count.

**Machine Hints:**
- action: expect
- selector: [data-testid="cart-badge"]
- assertion: toHaveText
- value: "1"
