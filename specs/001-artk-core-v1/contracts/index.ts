/**
 * ARTK Core v1 API Contracts
 *
 * This directory contains TypeScript interface definitions that specify
 * the public API for each ARTK Core module. These contracts serve as:
 *
 * 1. Design documentation - What the API looks like before implementation
 * 2. Type checking - Can be used to verify implementation matches contract
 * 3. Reference - Quick lookup for available functions and their signatures
 *
 * Modules:
 * - config: Configuration loading, validation, and access
 * - auth: Authentication providers and storage state management
 * - fixtures: Playwright test fixtures (authenticatedPage, testData, etc.)
 * - locators: Accessibility-first locator utilities
 * - assertions: Domain-specific assertion helpers
 * - data: Test data namespacing, cleanup, and builders
 * - harness: Playwright configuration factory
 * - reporters: ARTK reporter and artifact management
 */

// Re-export all contracts for convenient access
export * from './config.contract';
export * from './auth.contract';
export * from './fixtures.contract';
export * from './locators.contract';
export * from './assertions.contract';
export * from './data.contract';
export * from './harness.contract';
export * from './reporters.contract';
