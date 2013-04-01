(function() {
  if (typeof module === "undefined") self.queue = queue;
  else module.exports = queue;
  queue.version = "1.0.2";

  var slice = [].slice;

  function queue(parallelism) {
    var queue = {},
        active = 0, // number of in-flight deferrals
        remaining = 0, // number of deferrals remaining
        tasks = [], // list of tasks to invoke (FIFO)
        error = null,
        results = [],
        await = noop,
        awaitAll, currentTask;

    if (!parallelism) parallelism = Infinity;

    queue.defer = function(fn) {
      if (!error) {
        var args = slice.call(arguments, 1);
        var i = results.length;
        results.push(undefined);

        args.push(function(err, res) {
          --active;
          if (error != null) return;
          if (err != null) {
            // setting error ignores subsequent calls to defer
            // clearing tasks stops queued tasks from being executed
            // clearing remaining cancels subsequent callbacks
            error = err;
            tasks = [];
            remaining = null;
            notify();
          } else {
            results[i] = res;
            if (--remaining) currentTask || pop();
            else notify();
          }
        });

        tasks.push(function() {
          ++active;
          fn.apply(null, args);
        });

        ++remaining;
        pop();
      }
      return queue;
    };

    queue.await = function(f) {
      await = f;
      awaitAll = false;
      if (!remaining) notify();
      return queue;
    };

    queue.awaitAll = function(f) {
      await = f;
      awaitAll = true;
      if (!remaining) notify();
      return queue;
    };

    function pop() {
      while (currentTask = active < parallelism && tasks.shift())
        currentTask();
    }

    function notify() {
      if (error != null) await(error);
      else if (awaitAll) await(null, results);
      else await.apply(null, [null].concat(results));
    }

    return queue;
  }

  function noop() {}
})();
