var slice = [].slice,
    running = {};

function noop() {}

function Queue(parallelism) {
  if (!(parallelism >= 1)) throw new Error;
  this._tasks = [];
  this._parallelism = parallelism;
  this._started = 0; // number of tasks that have been started (and perhaps finished)
  this._active = 0; // number of tasks currently being executed (started but not finished)
  this._remaining = 0; // number of tasks not yet finished
  this._popping = false; // inside a synchronous task callback?
  this._error = null;
  this._callback = noop;
  this._callbackAll = false;
}

function notify(q) {
  if (q._error != null) q._callback(q._error);
  else if (q._callbackAll) q._callback(q._error, q._tasks);
  else q._callback.apply(null, [q._error].concat(q._tasks));
}

function finished(q, i) {
  return function(e, r) {
    if (q._tasks[i] !== running) throw new Error;
    q._tasks[i] = null;
    --q._active;
    if (q._error != null) return;
    if (e != null) {
      q._error = e; // ignore new tasks and squelch active callbacks
      q._started = q._remaining = NaN; // stop queued tasks from starting
      notify(q);
    } else {
      q._tasks[i] = r;
      if (--q._remaining) q._popping || pop(q);
      else notify(q);
    }
  };
}

function pop(q) {
  while (q._popping = q._started < q._tasks.length && q._active < q._parallelism) {
    var i = q._started++,
        t = q._tasks[i],
        j = t.length - 1,
        c = t[j];
    q._tasks[i] = running;
    ++q._active;
    t[j] = finished(q, i);
    c.apply(null, t);
  }
}

Queue.prototype = {
  defer: function(task) {
    if (this._callback !== noop) throw new Error;
    if (!this._error) {
      var t = slice.call(arguments, 1);
      t.push(task);
      this._tasks.push(t);
      ++this._remaining;
      pop(this);
    }
    return this;
  },
  await: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = callback, this._callbackAll = false;
    if (!this._remaining) notify(this);
    return this;
  },
  awaitAll: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = callback, this._callbackAll = true;
    if (!this._remaining) notify(this);
    return this;
  }
};

export default function queue(parallelism) {
  return new Queue(arguments.length ? +parallelism : Infinity);
}

queue.prototype = Queue.prototype;
