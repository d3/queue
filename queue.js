(function() {
  if (typeof module === "undefined") self.queue = queue;
  else module.exports = queue;
  queue.version = "1.0.3";

  var slice = [].slice;

  function queue(parallelism) {
    var queue = {},
        tasks = [],
        started = 0, // number of tasks that have been started (and perhaps finished)
        active = 0, // number of tasks currently being executed (started but not finished)
        remaining = 0, // number of tasks not yet finished
        popping, // inside a synchronous task callback?
        error = null,
        await = noop,
        all;

    if (!parallelism) parallelism = Infinity;

    queue.defer = function() {
      if (!error) {
        tasks.push(arguments);
        ++remaining;
        pop();
      }
      return queue;
    };

    queue.map = function (f, items) {
      var args = slice.call(arguments, 2);
        for (var i = 0; i < items.length; i++) {
          queue.defer.apply(queue, [f, items[i]].concat(args));
        }
      return queue;
    };

    queue.await = function(f) {
      await = f;
      all = false;
      if (!remaining) notify();
      return queue;
    };

    queue.awaitAll = function(f) {
      await = f;
      all = true;
      if (!remaining) notify();
      return queue;
    };

    function pop() {
      while (popping = started < tasks.length && active < parallelism) {
        var i = started++,
            t = tasks[i],
            a = slice.call(t, 1);
        a.push(callback(i));
        ++active;
        t[0].apply(null, a);
      }
    }

    function callback(i) {
      return function(e, r) {
        --active;
        if (error != null) return;
        if (e != null) {
          error = e; // ignore new tasks and squelch active callbacks
          started = remaining = NaN; // stop queued tasks from starting
          notify();
        } else {
          tasks[i] = r;
          if (--remaining) popping || pop();
          else notify();
        }
      };
    }

    function notify() {
      if (error != null) await(error);
      else if (all) await(error, tasks);
      else await.apply(null, [error].concat(tasks));
    }

    return queue;
  }

  function noop() {}
})();
