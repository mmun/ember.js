const DEFAULT_IMPLEMENTATION = {
  assert() {},
  warn() {},
  debug() {},
  deprecate() {},
  deprecateFunc(_, fn) { return fn; },
  runInDebug() {}
};

let currentImplementation;

resetImplementation();

export function overrideImplementation(implementation) {
  currentImplementation = implementation;
}

export function resetImplementation() {
  currentImplementation = DEFAULT_IMPLEMENTATION;
}

export function assert() {
  currentImplementation.assert.apply(undefined, arguments);
}

export function warn() {
  currentImplementation.warn.apply(undefined, arguments);
}

export function debug() {
  currentImplementation.debug.apply(undefined, arguments);
}

export function deprecate() {
  currentImplementation.deprecate.apply(undefined, arguments);
}

export function deprecateFunc() {
  return currentImplementation.deprecateFunc.apply(undefined, arguments);
}

export function runInDebug() {
  currentImplementation.runInDebug.apply(undefined, arguments);
}
