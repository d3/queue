import {slice} from "./array";
import {push, pop, remove} from "./list";
import noop from "./noop";

var noabort = {},
    success = [null];

function Task(id, callback, parameters) {
  this.id = id;
  this.next =
  this.previous = null;
  this.object = parameters;
  parameters.push(callback);
}

function Queue(concurrency) {
  if (!(concurrency >= 1)) throw new Error;
  this._free = concurrency;
  this._index = -1;
  this._starting = null;
  this._waiting = {head: null, tail: null};
  this._active = {head: null, tail: null};
  this._values = [];
  this._callback = noop;
}

function poke(q) {
  if (q._starting) return; // let the current task complete
  try { start(q); } catch (e) {
    if (q._starting && q._starting.object) { // task errored before finishing
      q._starting = null;
      abort(q, e);
    }
  }
}

function start(q) {
  var t;
  while (q._starting = q._free && (t = pop(q._waiting))) {
    var o = t.object,
        i = o.length - 1,
        c = o[i];
    push(q._active, t);
    --q._free;
    o[i] = end(q, t);
    c = c.apply(null, o); // start the task
    if (!t.object) continue; // task finished synchronously
    t.object = c || noabort;
  }
}

function end(q, t) {
  return function(error, value) {
    if (!t.object) return; // ignore multiple callbacks
    t.object = null;
    if (q._error != null) return; // ignore secondary errors
    if (error != null) {
      abort(q, error);
    } else {
      ++q._free;
      remove(q._active, t);
      if (q._values) q._values[t.id] = value;
      if (q._waiting.head) poke(q);
      else if (!q._active.head) notify(q);
    }
  };
}

function abort(q, error) {
  var h = q._active.head, t, o;

  // Store the error, and prevent any new tasks from starting.
  q._error = error;
  q._waiting.head =
  q._waiting.tail = null;

  // Now abort all tasks, ignoring any secondary errors.
  for (t = h; t; t = t.next) {
    if ((o = t.object) && o.abort) {
      try { o.abort(); }
      catch (_) { /* ignore */ }
    }
  }

  // Allow notification.
  q._active.head =
  q._active.tail = null;
  notify(q);
}

function notify(q) {
  var callback = q._callback;
  if (q._error != null) callback(q._error);
  else callback(null, q._values);
}

Queue.prototype = {
  defer: function(callback) {
    if (this._callback !== noop) throw new Error;
    if (this._error != null) return this; // Ignore new tasks if errored.
    push(this._waiting, new Task(++this._index, callback, slice.call(arguments, 1)));
    poke(this);
    return this;
  },
  abort: function() {
    if (this._error == null) abort(this, new Error("abort"));
    return this;
  },
  await: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = function(error, values) {
      if (error != null) callback(error);
      else callback.apply(null, success.concat(values));
    };
    if (!this._active.tail) notify(this);
    return this;
  },
  awaitAll: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = callback;
    if (!this._active.tail) notify(this);
    return this;
  }
};

function queue(concurrency) {
  return new Queue(arguments.length ? +concurrency : Infinity);
}

queue.prototype = Queue.prototype;

export default queue;
