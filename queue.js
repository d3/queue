(function() {
  if (typeof module === "undefined") self.queue = queue;
  else module.exports = queue;

  queue.version = "1.0.0";

  function queue(parallelism) {
    var queue = {},
        active = 0, // number of in-flight deferrals
        remaining = 0, // number of deferrals remaining
        head, tail, // singly-linked list of deferrals
        error = null,
        results = [],
        await = [],
        awaitAll = [],
        executed;

    if (arguments.length < 1) parallelism = Infinity;

    queue.defer = function() {
      executed = true;
      if (!error) {
        var node = arguments;
        node.index = results.push(undefined) - 1;
        if (tail) tail.next = node, tail = tail.next;
        else head = tail = node;
        ++remaining;
        pop();
      }
      return queue;
    };

    queue.await = function(f) {
      if (!executed || remaining) await.push(f);
      else notifyAwait(f);
      return queue;
    };

    queue.awaitAll = function(f) {
      if (!executed || remaining) awaitAll.push(f);
      else notifyAwaitAll(f);
      return queue;
    };

    function pop() {
      if (head && active < parallelism) {
        var node = head,
            f = node[0],
            a = Array.prototype.slice.call(node, 1),
            i = node.index;
        if (head === tail) head = tail = null;
        else head = head.next;
        ++active;
        a.push(function(e, r) {
          --active;
          if (error != null) return;
          if (e != null) {
            // clearing remaining cancels subsequent callbacks
            // clearing head stops queued tasks from being executed
            // setting error ignores subsequent calls to defer
            error = e;
            remaining = results = head = tail = null;
            notify();
          } else {
            results[i] = r;
            if (--remaining) pop();
            else notify();
          }
        });
        f.apply(null, a);
      }
    }

    function notify() {
      notifyType(await, notifyAwait);
      notifyType(awaitAll, notifyAwaitAll);
    }

    function notifyType(arr, func) {
      var length = arr.length;
      for (var i=0; i<length; i++) {
        func(arr[i]);
      }
    }

    function notifyAwait(callback) {
      callback.apply(null, error ? [error] : [null].concat(results));
    }

    function notifyAwaitAll(callback) {
      callback(error, error ? undefined : results);
    }

    return queue;
  }
})();
