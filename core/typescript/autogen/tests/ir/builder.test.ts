/**
 * Tests for IR Builder
 */
import { describe, it, expect } from 'vitest';
import {
  IR,
  LocatorBuilder,
  ValueBuilder,
  StepBuilder,
  JourneyBuilder,
} from '../../src/ir/builder.js';

describe('LocatorBuilder', () => {
  describe('role locator', () => {
    it('creates a role locator with name', () => {
      const locator = LocatorBuilder.role('button', 'Submit').build();

      expect(locator.strategy).toBe('role');
      expect(locator.value).toBe('button');
      expect(locator.options?.name).toBe('Submit');
    });

    it('creates a role locator without name', () => {
      const locator = LocatorBuilder.role('heading').build();

      expect(locator.strategy).toBe('role');
      expect(locator.value).toBe('heading');
      expect(locator.options?.name).toBeUndefined();
    });

    it('adds level option for headings', () => {
      const locator = LocatorBuilder.role('heading', 'Welcome').level(1).build();

      expect(locator.options?.level).toBe(1);
    });

    it('adds exact option', () => {
      const locator = LocatorBuilder.role('button', 'Submit').exact().build();

      expect(locator.options?.exact).toBe(true);
    });
  });

  describe('label locator', () => {
    it('creates a label locator', () => {
      const locator = LocatorBuilder.label('Email').build();

      expect(locator.strategy).toBe('label');
      expect(locator.value).toBe('Email');
    });

    it('adds exact match option', () => {
      const locator = LocatorBuilder.label('Email').exact().build();

      expect(locator.options?.exact).toBe(true);
    });
  });

  describe('placeholder locator', () => {
    it('creates a placeholder locator', () => {
      const locator = LocatorBuilder.placeholder('Enter email').build();

      expect(locator.strategy).toBe('placeholder');
      expect(locator.value).toBe('Enter email');
    });
  });

  describe('text locator', () => {
    it('creates a text locator', () => {
      const locator = LocatorBuilder.text('Welcome back').build();

      expect(locator.strategy).toBe('text');
      expect(locator.value).toBe('Welcome back');
    });
  });

  describe('testId locator', () => {
    it('creates a testId locator', () => {
      const locator = LocatorBuilder.testId('login-button').build();

      expect(locator.strategy).toBe('testid');
      expect(locator.value).toBe('login-button');
    });
  });

  describe('css locator', () => {
    it('creates a css locator', () => {
      const locator = LocatorBuilder.css('#main-content').build();

      expect(locator.strategy).toBe('css');
      expect(locator.value).toBe('#main-content');
    });
  });

  describe('fromSpec', () => {
    it('creates locator from strategy and value', () => {
      const locator = LocatorBuilder.fromSpec('label', 'Username').build();

      expect(locator.strategy).toBe('label');
      expect(locator.value).toBe('Username');
    });
  });

  describe('validation', () => {
    it('throws when building without strategy', () => {
      const builder = new LocatorBuilder();
      expect(() => builder.build()).toThrow('LocatorSpec requires strategy and value');
    });
  });
});

describe('ValueBuilder', () => {
  it('creates a literal value', () => {
    const value = ValueBuilder.literal('test@example.com');

    expect(value.type).toBe('literal');
    expect(value.value).toBe('test@example.com');
  });

  it('creates an actor value', () => {
    const value = ValueBuilder.actor('email');

    expect(value.type).toBe('actor');
    expect(value.value).toBe('email');
  });

  it('creates a runId value', () => {
    const value = ValueBuilder.runId();

    expect(value.type).toBe('runId');
    expect(value.value).toBe('runId');
  });

  it('creates a generated value', () => {
    const value = ValueBuilder.generated('user_${runId}');

    expect(value.type).toBe('generated');
    expect(value.value).toBe('user_${runId}');
  });

  it('creates a testData value', () => {
    const value = ValueBuilder.testData('users.admin.email');

    expect(value.type).toBe('testData');
    expect(value.value).toBe('users.admin.email');
  });
});

describe('StepBuilder', () => {
  it('creates a step with id and description', () => {
    const step = new StepBuilder('AC-1', 'User logs in').build();

    expect(step.id).toBe('AC-1');
    expect(step.description).toBe('User logs in');
    expect(step.actions).toEqual([]);
    expect(step.assertions).toEqual([]);
  });

  it('adds navigation action', () => {
    const step = new StepBuilder('AC-1', 'Navigate to login')
      .goto('/login')
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toEqual({
      type: 'goto',
      url: '/login',
      waitForLoad: true,
    });
  });

  it('adds click action with locator builder', () => {
    const step = new StepBuilder('AC-1', 'Click submit')
      .click(LocatorBuilder.role('button', 'Submit'))
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({
      type: 'click',
      locator: { strategy: 'role', value: 'button', options: { name: 'Submit' } },
    });
  });

  it('adds fill action with string value', () => {
    const step = new StepBuilder('AC-1', 'Enter email')
      .fill(LocatorBuilder.label('Email'), 'test@example.com')
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({
      type: 'fill',
      value: { type: 'literal', value: 'test@example.com' },
    });
  });

  it('adds fill action with ValueSpec', () => {
    const step = new StepBuilder('AC-1', 'Enter email')
      .fill(LocatorBuilder.label('Email'), ValueBuilder.actor('email'))
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({
      type: 'fill',
      value: { type: 'actor', value: 'email' },
    });
  });

  it('adds select action', () => {
    const step = new StepBuilder('AC-1', 'Select country')
      .select(LocatorBuilder.label('Country'), 'United States')
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({
      type: 'select',
      option: 'United States',
    });
  });

  it('adds check action', () => {
    const step = new StepBuilder('AC-1', 'Check terms')
      .check(LocatorBuilder.label('I agree'))
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({ type: 'check' });
  });

  it('adds press action', () => {
    const step = new StepBuilder('AC-1', 'Press Enter')
      .press('Enter')
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({ type: 'press', key: 'Enter' });
  });

  it('adds expectVisible assertion', () => {
    const step = new StepBuilder('AC-1', 'See welcome message')
      .expectVisible(LocatorBuilder.text('Welcome'))
      .build();

    expect(step.assertions).toHaveLength(1);
    expect(step.assertions[0]).toMatchObject({ type: 'expectVisible' });
  });

  it('adds expectNotVisible assertion', () => {
    const step = new StepBuilder('AC-1', 'Loading hidden')
      .expectNotVisible(LocatorBuilder.text('Loading...'))
      .build();

    expect(step.assertions).toHaveLength(1);
    expect(step.assertions[0]).toMatchObject({ type: 'expectNotVisible' });
  });

  it('adds expectText assertion', () => {
    const step = new StepBuilder('AC-1', 'Check text')
      .expectText(LocatorBuilder.css('h1'), 'Dashboard')
      .build();

    expect(step.assertions).toHaveLength(1);
    expect(step.assertions[0]).toMatchObject({ type: 'expectText', text: 'Dashboard' });
  });

  it('adds expectURL assertion', () => {
    const step = new StepBuilder('AC-1', 'Check URL')
      .expectURL('/dashboard')
      .build();

    expect(step.assertions).toHaveLength(1);
    expect(step.assertions[0]).toMatchObject({ type: 'expectURL', pattern: '/dashboard' });
  });

  it('adds expectTitle assertion', () => {
    const step = new StepBuilder('AC-1', 'Check title')
      .expectTitle('Dashboard | App')
      .build();

    expect(step.assertions).toHaveLength(1);
    expect(step.assertions[0]).toMatchObject({ type: 'expectTitle', title: 'Dashboard | App' });
  });

  it('adds expectToast assertion', () => {
    const step = new StepBuilder('AC-1', 'Success toast')
      .expectToast('success', 'Changes saved')
      .build();

    expect(step.assertions).toHaveLength(1);
    expect(step.assertions[0]).toMatchObject({
      type: 'expectToast',
      toastType: 'success',
      message: 'Changes saved',
    });
  });

  it('adds module call', () => {
    const step = new StepBuilder('AC-1', 'Login as admin')
      .callModule('auth', 'loginAsAdmin', [{ role: 'admin' }])
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({
      type: 'callModule',
      module: 'auth',
      method: 'loginAsAdmin',
      args: [{ role: 'admin' }],
    });
  });

  it('adds blocked step', () => {
    const step = new StepBuilder('AC-1', 'Complex action')
      .blocked('Cannot automate file upload dialog', 'Upload document')
      .build();

    expect(step.actions).toHaveLength(1);
    expect(step.actions[0]).toMatchObject({
      type: 'blocked',
      reason: 'Cannot automate file upload dialog',
      sourceText: 'Upload document',
    });
  });

  it('adds source text', () => {
    const step = new StepBuilder('AC-1', 'Test step')
      .sourceText('- User clicks the submit button')
      .build();

    expect(step.sourceText).toBe('- User clicks the submit button');
  });

  it('adds notes', () => {
    const step = new StepBuilder('AC-1', 'Test step')
      .note('Consider adding retry logic')
      .note('Check for race conditions')
      .build();

    expect(step.notes).toEqual(['Consider adding retry logic', 'Check for race conditions']);
  });

  it('chains multiple actions', () => {
    const step = new StepBuilder('AC-1', 'Login flow')
      .goto('/login')
      .fill(LocatorBuilder.label('Email'), 'test@example.com')
      .fill(LocatorBuilder.label('Password'), 'secret')
      .click(LocatorBuilder.role('button', 'Sign In'))
      .expectURL('/dashboard')
      .build();

    expect(step.actions).toHaveLength(4);
    expect(step.assertions).toHaveLength(1);
  });

  describe('validation', () => {
    it('throws when building without id', () => {
      expect(() => new StepBuilder('', 'Test').build()).toThrow();
    });

    it('throws when building without description', () => {
      expect(() => new StepBuilder('AC-1', '').build()).toThrow();
    });
  });
});

describe('JourneyBuilder', () => {
  it('creates a journey with required fields', () => {
    const journey = new JourneyBuilder('JRN-0001', 'User Login')
      .tier('smoke')
      .scope('auth')
      .actor('standard-user')
      .build();

    expect(journey.id).toBe('JRN-0001');
    expect(journey.title).toBe('User Login');
    expect(journey.tier).toBe('smoke');
    expect(journey.scope).toBe('auth');
    expect(journey.actor).toBe('standard-user');
  });

  it('adds standard tags automatically', () => {
    const journey = new JourneyBuilder('JRN-0001', 'User Login')
      .tier('smoke')
      .scope('auth')
      .actor('standard-user')
      .build();

    expect(journey.tags).toContain('@artk');
    expect(journey.tags).toContain('@journey');
    expect(journey.tags).toContain('@JRN-0001');
    expect(journey.tags).toContain('@tier-smoke');
    expect(journey.tags).toContain('@scope-auth');
  });

  it('adds custom tags', () => {
    const journey = new JourneyBuilder('JRN-0001', 'User Login')
      .tier('smoke')
      .scope('auth')
      .actor('standard-user')
      .tag('@critical')
      .tags(['@regression', '@login'])
      .build();

    expect(journey.tags).toContain('@critical');
    expect(journey.tags).toContain('@regression');
    expect(journey.tags).toContain('@login');
  });

  it('deduplicates tags', () => {
    const journey = new JourneyBuilder('JRN-0001', 'User Login')
      .tier('smoke')
      .scope('auth')
      .actor('standard-user')
      .tag('@artk')
      .tag('@artk')
      .build();

    const artkCount = journey.tags.filter((t) => t === '@artk').length;
    expect(artkCount).toBe(1);
  });

  it('adds foundation modules', () => {
    const journey = new JourneyBuilder('JRN-0001', 'User Login')
      .tier('smoke')
      .scope('auth')
      .actor('standard-user')
      .foundationModule('auth')
      .foundationModule('navigation')
      .build();

    expect(journey.moduleDependencies.foundation).toContain('auth');
    expect(journey.moduleDependencies.foundation).toContain('navigation');
  });

  it('adds feature modules', () => {
    const journey = new JourneyBuilder('JRN-0001', 'Create Order')
      .tier('release')
      .scope('orders')
      .actor('standard-user')
      .featureModule('orders')
      .featureModule('cart')
      .build();

    expect(journey.moduleDependencies.feature).toContain('orders');
    expect(journey.moduleDependencies.feature).toContain('cart');
  });

  it('sets data config', () => {
    const journey = new JourneyBuilder('JRN-0001', 'Create Order')
      .tier('release')
      .scope('orders')
      .actor('standard-user')
      .data({ strategy: 'create', cleanup: 'required' })
      .build();

    expect(journey.data).toEqual({ strategy: 'create', cleanup: 'required' });
  });

  it('sets completion signals', () => {
    const journey = new JourneyBuilder('JRN-0001', 'Create Order')
      .tier('release')
      .scope('orders')
      .actor('standard-user')
      .completion([
        { type: 'url', value: '/orders/confirmation' },
        { type: 'toast', value: 'Order placed successfully' },
      ])
      .build();

    expect(journey.completion).toHaveLength(2);
    expect(journey.completion![0]).toEqual({ type: 'url', value: '/orders/confirmation' });
  });

  it('adds steps', () => {
    const journey = new JourneyBuilder('JRN-0001', 'User Login')
      .tier('smoke')
      .scope('auth')
      .actor('standard-user')
      .step(
        new StepBuilder('AC-1', 'Navigate to login')
          .goto('/login')
          .build()
      )
      .step(
        new StepBuilder('AC-2', 'Enter credentials')
          .fill(LocatorBuilder.label('Email'), 'test@example.com')
          .build()
      )
      .build();

    expect(journey.steps).toHaveLength(2);
    expect(journey.steps[0].id).toBe('AC-1');
    expect(journey.steps[1].id).toBe('AC-2');
  });

  it('accepts StepBuilder instances', () => {
    const stepBuilder = new StepBuilder('AC-1', 'Test step').goto('/test');

    const journey = new JourneyBuilder('JRN-0001', 'Test Journey')
      .tier('smoke')
      .scope('test')
      .actor('user')
      .step(stepBuilder)
      .build();

    expect(journey.steps).toHaveLength(1);
    expect(journey.steps[0].actions).toHaveLength(1);
  });

  it('sets setup and cleanup', () => {
    const journey = new JourneyBuilder('JRN-0001', 'Test Journey')
      .tier('smoke')
      .scope('test')
      .actor('user')
      .setup([
        { type: 'callModule', module: 'auth', method: 'login' },
      ])
      .cleanup([
        { type: 'callModule', module: 'auth', method: 'logout' },
      ])
      .build();

    expect(journey.setup).toHaveLength(1);
    expect(journey.cleanup).toHaveLength(1);
  });

  it('sets revision and source path', () => {
    const journey = new JourneyBuilder('JRN-0001', 'Test Journey')
      .tier('smoke')
      .scope('test')
      .actor('user')
      .revision(3)
      .sourcePath('/journeys/login.journey.md')
      .build();

    expect(journey.revision).toBe(3);
    expect(journey.sourcePath).toBe('/journeys/login.journey.md');
  });

  describe('validation', () => {
    it('throws when building without tier', () => {
      expect(() =>
        new JourneyBuilder('JRN-0001', 'Test')
          .scope('test')
          .actor('user')
          .build()
      ).toThrow('IRJourney requires id, title, tier, scope, and actor');
    });

    it('throws when building without scope', () => {
      expect(() =>
        new JourneyBuilder('JRN-0001', 'Test')
          .tier('smoke')
          .actor('user')
          .build()
      ).toThrow();
    });

    it('throws when building without actor', () => {
      expect(() =>
        new JourneyBuilder('JRN-0001', 'Test')
          .tier('smoke')
          .scope('test')
          .build()
      ).toThrow();
    });
  });
});

describe('IR convenience factory', () => {
  it('provides journey factory', () => {
    const builder = IR.journey('JRN-0001', 'Test');
    expect(builder).toBeInstanceOf(JourneyBuilder);
  });

  it('provides step factory', () => {
    const builder = IR.step('AC-1', 'Test step');
    expect(builder).toBeInstanceOf(StepBuilder);
  });

  it('provides locator factories', () => {
    expect(IR.locator.role('button')).toBeInstanceOf(LocatorBuilder);
    expect(IR.locator.label('Email')).toBeInstanceOf(LocatorBuilder);
    expect(IR.locator.placeholder('Enter email')).toBeInstanceOf(LocatorBuilder);
    expect(IR.locator.text('Hello')).toBeInstanceOf(LocatorBuilder);
    expect(IR.locator.testId('submit-btn')).toBeInstanceOf(LocatorBuilder);
    expect(IR.locator.css('.button')).toBeInstanceOf(LocatorBuilder);
  });

  it('provides value builder', () => {
    expect(IR.value.literal('test')).toMatchObject({ type: 'literal' });
    expect(IR.value.actor('email')).toMatchObject({ type: 'actor' });
  });
});
