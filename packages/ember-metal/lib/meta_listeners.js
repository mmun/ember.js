import { warn, runInDebug } from 'ember-metal/debug';
import { toString } from 'ember-metal/utils';

/*
 When we render a rich template hierarchy, the set of events that
 *might* happen tends to be much larger than the set of events that
 actually happen. This implies that we should make listener creation &
 destruction cheap, even at the cost of making event dispatch more
 expensive.

 Thus we store a new listener with a single push and no new
 allocations, without even bothering to do deduplication -- we can
 save that for dispatch time, if an event actually happens.
 */

/* listener flags */
export var ONCE = 1;
export var SUSPENDED = 2;

export var protoMethods = {

  addToListeners(eventName, target, method, flags) {
    if (!this._listeners) {
      this._listeners = [];
    }

    runInDebug(() => {
      // Assert that an observer is only used once.
      let listeners = this._listeners;
      let matchFound = false;

      for (let i = listeners.length - 4; i >= 0; i -= 4) {
        if (listeners[i + 1] === target &&
            listeners[i + 2] === method &&
            listeners[i] === eventName) {
          matchFound = true;
          break;
        }
      }

      warn(
        `Tried to add a duplicate listener for '${eventName}' on ${toString(this.source)}`,
        !matchFound,
        { id: 'ember-metal.tried-to-add-a-duplicate-listener' }
      );
    });

    this._listeners.push(eventName, target, method, flags);
  },

  _finalizeListeners() {
    if (this._listenersFinalized) { return; }
    if (!this._listeners) { this._listeners = []; }
    let pointer = this.parent;
    while (pointer) {
      let listeners = pointer._listeners;
      if (listeners) {
        this._listeners = this._listeners.concat(listeners);
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }
    this._listenersFinalized = true;
  },

  removeFromListeners(eventName, target, method, didRemove) {
    let matchFound = false;
    let pointer = this;
    while (pointer) {
      let listeners = pointer._listeners;
      if (listeners) {
        for (let index = listeners.length - 4; index >= 0; index -= 4) {
          if (listeners[index] === eventName && (!method || (listeners[index + 1] === target && listeners[index + 2] === method))) {
            if (pointer === this) {
              // we are modifying our own list, so we edit directly
              if (typeof didRemove === 'function') {
                didRemove(eventName, target, listeners[index + 2]);
              }
              listeners.splice(index, 4);
              matchFound = true;
            } else {
              // we are trying to remove an inherited listener, so we do
              // just-in-time copying to detach our own listeners from
              // our inheritance chain.
              this._finalizeListeners();
              this.removeFromListeners(eventName, target, method);
              return;
            }
          }
        }
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }

    warn(
      `Tried to remove a listener that was never registered for '${eventName}' on ${toString(this.source)}`,
      matchFound,
      { id: 'ember-metal.failed-to-remove-listener' }
    );
  },

  matchingListeners(eventName) {
    let pointer = this;
    let result = [];
    while (pointer) {
      let listeners = pointer._listeners;
      if (listeners) {
        for (let index = 0; index < listeners.length - 3; index += 4) {
          if (listeners[index] === eventName) {
            pushUniqueListener(result, listeners, index);
          }
        }
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }
    let sus = this._suspendedListeners;
    if (sus) {
      for (let susIndex = 0; susIndex < sus.length - 2; susIndex += 3) {
        if (eventName === sus[susIndex]) {
          for (let resultIndex = 0; resultIndex < result.length - 2; resultIndex += 3) {
            if (result[resultIndex] === sus[susIndex + 1] && result[resultIndex + 1] === sus[susIndex + 2]) {
              result[resultIndex + 2] |= SUSPENDED;
            }
          }
        }
      }
    }
    return result;
  },

  suspendListeners(eventNames, target, method, callback) {
    let sus = this._suspendedListeners;
    if (!sus) {
      sus = this._suspendedListeners = [];
    }
    for (let i = 0; i < eventNames.length; i++) {
      sus.push(eventNames[i], target, method);
    }
    try {
      return callback.call(target);
    } finally {
      if (sus.length === eventNames.length) {
        this._suspendedListeners = undefined;
      } else {
        for (let i = sus.length - 3; i >= 0; i -= 3) {
          if (sus[i + 1] === target && sus[i + 2] === method && eventNames.indexOf(sus[i]) !== -1) {
            sus.splice(i, 3);
          }
        }
      }
    }
  },

  watchedEvents() {
    let pointer = this;
    let names = {};
    while (pointer) {
      let listeners = pointer._listeners;
      if (listeners) {
        for (let index = 0; index < listeners.length - 3; index += 4) {
          names[listeners[index]] = true;
        }
      }
      if (pointer._listenersFinalized) { break; }
      pointer = pointer.parent;
    }
    return Object.keys(names);
  },

  _initializeListeners() {
    this._listeners = undefined;
    this._listenersFinalized = undefined;
    this._suspendedListeners = undefined;
  }
};

function pushUniqueListener(destination, source, index) {
  let target = source[index + 1];
  let method = source[index + 2];
  for (let destinationIndex = 0; destinationIndex < destination.length - 2; destinationIndex += 3) {
    if (destination[destinationIndex] === target  && destination[destinationIndex + 1] === method) {
      return;
    }
  }
  destination.push(target, method, source[index + 3]);
}
