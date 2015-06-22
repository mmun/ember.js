import Ember from 'ember-metal/core';
import { assert as emberAssert, deprecate as emberDeprecate } from 'ember-metal/assert';
import deprecationManager, { deprecationLevels } from 'ember-debug/deprecation-manager';

let originalEnvValue;
let originalDeprecationDefault;
let originalDeprecationLevels;

QUnit.module('ember-debug', {
  setup() {
    originalDeprecationDefault = deprecationManager.defaultLevel;
    originalDeprecationLevels = deprecationManager.individualLevels;
    originalEnvValue = Ember.ENV.RAISE_ON_DEPRECATION;

    Ember.ENV.RAISE_ON_DEPRECATION = false;
    deprecationManager.setDefaultLevel(deprecationLevels.RAISE);
  },

  teardown() {
    deprecationManager.defaultLevel = originalDeprecationDefault;
    deprecationManager.individualLevels = originalDeprecationLevels;
    Ember.ENV.RAISE_ON_DEPRECATION = originalEnvValue;
  }
});

QUnit.test('Ember.deprecate does not throw if default level is silence', function(assert) {
  assert.expect(1);
  deprecationManager.setDefaultLevel(deprecationLevels.SILENCE);

  try {
    emberDeprecate('Should not throw', false);
    assert.ok(true, 'Ember.deprecate did not throw');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }
});

QUnit.test('Ember.deprecate re-sets deprecation level to RAISE if ENV.RAISE_ON_DEPRECATION is set', function(assert) {
  assert.expect(2);

  deprecationManager.setDefaultLevel(deprecationLevels.SILENCE);

  Ember.ENV.RAISE_ON_DEPRECATION = true;

  assert.throws(function() {
    emberDeprecate('Should throw', false);
  }, /Should throw/);

  assert.equal(deprecationManager.defaultLevel, deprecationLevels.RAISE,
               'default level re-set to RAISE');
});

QUnit.test('When ENV.RAISE_ON_DEPRECATION is true, it is still possible to silence a deprecation by id', function(assert) {
  assert.expect(3);

  Ember.ENV.RAISE_ON_DEPRECATION = true;
  deprecationManager.setLevel('my-deprecation', deprecationLevels.SILENCE);

  try {
    emberDeprecate('should be silenced with matching id', false, { id: 'my-deprecation' });
    assert.ok(true, 'Did not throw when level is set by id');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }

  assert.throws(function() {
    emberDeprecate('Should throw with no id', false);
  }, /Should throw with no id/);

  assert.throws(function() {
    emberDeprecate('Should throw with non-matching id', false, { id: 'other-id' });
  }, /Should throw with non-matching id/);
});

QUnit.test('Ember.deprecate throws deprecation if second argument is falsy', function() {
  expect(3);

  throws(function() {
    emberDeprecate('Deprecation is thrown', false);
  });

  throws(function() {
    emberDeprecate('Deprecation is thrown', '');
  });

  throws(function() {
    emberDeprecate('Deprecation is thrown', 0);
  });
});

QUnit.test('Ember.deprecate does not throw deprecation if second argument is a function and it returns true', function() {
  expect(1);

  emberDeprecate('Deprecation is thrown', function() {
    return true;
  });

  ok(true, 'deprecation was not thrown');
});

QUnit.test('Ember.deprecate throws if second argument is a function and it returns false', function() {
  expect(1);
  throws(function() {
    emberDeprecate('Deprecation is thrown', function() {
      return false;
    });
  });
});

QUnit.test('Ember.deprecate does not throw deprecations if second argument is truthy', function() {
  expect(1);

  emberDeprecate('Deprecation is thrown', true);
  emberDeprecate('Deprecation is thrown', '1');
  emberDeprecate('Deprecation is thrown', 1);

  ok(true, 'deprecations were not thrown');
});

QUnit.test('Ember.assert throws if second argument is falsy', function() {
  expect(3);

  throws(function() {
    emberAssert('Assertion is thrown', false);
  });

  throws(function() {
    emberAssert('Assertion is thrown', '');
  });

  throws(function() {
    emberAssert('Assertion is thrown', 0);
  });
});

QUnit.test('Ember.assert does not throw if second argument is a function and it returns true', function() {
  expect(1);

  emberAssert('Assertion is thrown', function() {
    return true;
  });

  ok(true, 'assertion was not thrown');
});

QUnit.test('Ember.assert throws if second argument is a function and it returns false', function() {
  expect(1);
  throws(function() {
    emberAssert('Assertion is thrown', function() {
      return false;
    });
  });
});

QUnit.test('Ember.assert does not throw if second argument is truthy', function() {
  expect(1);

  emberAssert('Assertion is thrown', true);
  emberAssert('Assertion is thrown', '1');
  emberAssert('Assertion is thrown', 1);

  ok(true, 'assertions were not thrown');
});

QUnit.test('Ember.assert does not throw if second argument is an object', function() {
  expect(1);
  var Igor = Ember.Object.extend();

  emberAssert('is truthy', Igor);
  emberAssert('is truthy', Igor.create());

  ok(true, 'assertions were not thrown');
});

QUnit.test('Ember.deprecate does not throw a deprecation at log and silence levels', function() {
  expect(4);
  var id = 'ABC';

  deprecationManager.setLevel(id, deprecationLevels.LOG);
  try {
    emberDeprecate('Deprecation for testing purposes', false, { id });
    ok(true, 'Deprecation did not throw');
  } catch(e) {
    ok(false, 'Deprecation was thrown despite being added to blacklist');
  }

  deprecationManager.setLevel(id, deprecationLevels.SILENCE);
  try {
    emberDeprecate('Deprecation for testing purposes', false, { id });
    ok(true, 'Deprecation did not throw');
  } catch(e) {
    ok(false, 'Deprecation was thrown despite being added to blacklist');
  }

  deprecationManager.setLevel(id, deprecationLevels.RAISE);

  throws(function() {
    emberDeprecate('Deprecation is thrown', false, { id });
  });

  deprecationManager.setLevel(id, null);

  throws(function() {
    emberDeprecate('Deprecation is thrown', false, { id });
  });
});
