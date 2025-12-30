# Test Data Cleanup

This document describes how ARTK's cleanup system works, including execution order and parallel mode behavior.

## Overview

ARTK provides a cleanup manager that handles teardown of test data created during test execution. The cleanup system ensures that resources are properly cleaned up after tests complete, even if tests fail.

## Cleanup Order

### Default Behavior (Sequential Mode)

By default, cleanup callbacks run in **reverse registration order** (last registered = first to run). This ensures proper teardown of dependent resources.

**Example:**

```typescript
import { CleanupManager } from '@artk/core';

const cleanup = new CleanupManager();

// Register cleanups in order of dependency
cleanup.register(async () => {
  await deleteOrganization(orgId); // Registered first
}, { label: 'Delete organization' });

cleanup.register(async () => {
  await deleteUser(userId); // Registered second
}, { label: 'Delete user' });

// Cleanup runs in REVERSE order:
// 1. Delete user (registered second, runs first)
// 2. Delete organization (registered first, runs last)
await cleanup.runAll();
```

This reverse order is important because:
- **Users belong to organizations** → Delete users first, then organizations
- **Child resources depend on parent resources** → Delete children first
- **Ensures referential integrity** → Avoids foreign key violations

### Priority-Based Ordering

You can also use explicit priorities to control cleanup order:

```typescript
cleanup.register(async () => {
  await deleteUser(userId);
}, { priority: 10, label: 'Delete user' });

cleanup.register(async () => {
  await deleteOrganization(orgId);
}, { priority: 20, label: 'Delete organization' });

// Runs in priority order (lower values first):
// 1. Delete user (priority 10)
// 2. Delete organization (priority 20)
```

## Parallel Cleanup

### Configuration

Enable parallel cleanup in your ARTK configuration:

```yaml
# artk.config.yml
data:
  cleanup:
    enabled: true
    onFailure: true
    parallel: true  # Enable parallel cleanup
```

### Behavior

When `data.cleanup.parallel: true` is set:

- **Cleanup callbacks run concurrently** for faster execution
- **Order is NOT guaranteed** in parallel mode
- **Use only when cleanups are independent**

**Important:** Parallel mode ignores both registration order and priority. All cleanups run simultaneously.

### When to Use Parallel Mode

✅ **Use parallel cleanup when:**
- Cleanups are independent (no dependencies between resources)
- Resources can be deleted in any order
- Speed is more important than order
- Example: Deleting multiple independent test users

❌ **Do NOT use parallel cleanup when:**
- Resources have dependencies (user → organization)
- Order matters for referential integrity
- Cleanup callbacks modify shared state
- Database foreign key constraints require specific order

### Example: Independent Cleanups

```typescript
// These cleanups are independent - can run in parallel
cleanup.register(async () => {
  await deleteTestUser('user1@test.com');
}, { label: 'Delete user 1' });

cleanup.register(async () => {
  await deleteTestUser('user2@test.com');
}, { label: 'Delete user 2' });

cleanup.register(async () => {
  await deleteTestUser('user3@test.com');
}, { label: 'Delete user 3' });

// With parallel: true, all three delete simultaneously
```

### Example: Dependent Cleanups

```typescript
// These cleanups are dependent - must run sequentially
cleanup.register(async () => {
  await deleteOrganization(orgId);
}, { priority: 20, label: 'Delete organization' });

cleanup.register(async () => {
  await deleteUser(userId); // User belongs to organization
}, { priority: 10, label: 'Delete user' });

// With parallel: false, runs in priority order (user first, then org)
// With parallel: true, BOTH run simultaneously → may cause errors!
```

## Best Practices

### 1. Independent Cleanups → Use `parallel: true`

When all your cleanup operations are independent and can run in any order, enable parallel mode for faster test execution:

```yaml
data:
  cleanup:
    parallel: true
```

### 2. Dependent Cleanups → Use `parallel: false` (default)

When cleanups have dependencies, keep sequential mode and use priorities or registration order:

```yaml
data:
  cleanup:
    parallel: false  # This is the default
```

```typescript
// Register in reverse dependency order (children before parents)
cleanup.register(deleteChild);
cleanup.register(deleteParent);
```

### 3. Mixed Scenarios

If you have both independent and dependent cleanups:

1. **Option A:** Keep `parallel: false` and use priorities
   ```typescript
   // Independent cleanups - same priority (run in any order)
   cleanup.register(deleteUser1, { priority: 10 });
   cleanup.register(deleteUser2, { priority: 10 });

   // Dependent cleanups - different priorities (run in order)
   cleanup.register(deleteChild, { priority: 20 });
   cleanup.register(deleteParent, { priority: 30 });
   ```

2. **Option B:** Use separate cleanup managers
   ```typescript
   const independentCleanup = new CleanupManager();
   const dependentCleanup = new CleanupManager();

   // Run independent cleanups in parallel
   independentCleanup.register(deleteUser1);
   independentCleanup.register(deleteUser2);

   // Run dependent cleanups sequentially
   dependentCleanup.register(deleteChild);
   dependentCleanup.register(deleteParent);
   ```

### 4. Always Label Your Cleanups

Use labels for better debugging and logging:

```typescript
cleanup.register(async () => {
  await deleteUser(userId);
}, {
  label: `Delete user ${userId}`,
  priority: 10
});
```

## Error Handling

The cleanup manager continues execution even if individual cleanups fail:

- All registered cleanups will attempt to run
- Failures are logged but don't stop other cleanups
- After all cleanups run, an `AggregateError` is thrown if any failed

This ensures maximum cleanup even in failure scenarios.

## Configuration Reference

```yaml
data:
  cleanup:
    enabled: true          # Enable/disable cleanup (default: true)
    onFailure: true        # Run cleanup even if test fails (default: true)
    parallel: false        # Run cleanups concurrently (default: false)
```

### `enabled`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to run cleanup at all

### `onFailure`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to run cleanup when test fails (recommended: `true`)

### `parallel`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Whether to run cleanups concurrently
- **Warning:** Only use when cleanups are independent

## Summary

| Scenario | Configuration | Order Guarantee | Use Case |
|----------|--------------|-----------------|----------|
| Sequential (default) | `parallel: false` | ✅ Guaranteed (reverse registration or priority) | Dependent resources |
| Parallel | `parallel: true` | ❌ No guarantee | Independent resources |

**Key Takeaway:** Use parallel cleanup for speed when resources are independent. Use sequential cleanup (default) when order matters.
