var queue = require("../queue"),
    fs = require("fs"),
    vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("queue");

suite.addBatch({

  "version": {
    "is semantic": function() {
      assert.isTrue(/^([0-9]+)\.([0-9]+)\.([0-9]+)/.test(queue.version));
    }
  },

  "example queue of fs.stat": {
    topic: function() {
      queue()
          .defer(fs.stat, __dirname + "/../Makefile")
          .defer(fs.stat, __dirname + "/../README.md")
          .defer(fs.stat, __dirname + "/../package.json")
          .await(this.callback);
    },
    "does not fail": function(error, one, two, three) {
      assert.isNull(error);
    },
    "successfully executes the three tasks": function(error, one, two, three) {
      assert.greater(one.size, 0);
      assert.greater(two.size, 0);
      assert.greater(three.size, 0);
    }
  },

  "queue of single synchronous task that errors": {
    topic: function() {
      queue()
          .defer(function(callback) { callback(-1); })
          .await(this.callback);
    },
    "fails": function(error, result) {
      assert.equal(error, -1);
      assert.isUndefined(result);
    }
  },

  "queue of single asynchronous task that errors": {
    topic: function() {
      queue()
          .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
          .await(this.callback);
    },
    "fails": function(error, result) {
      assert.equal(error, -1);
      assert.isUndefined(result);
    }
  },

  "queue with multiple tasks that error": {
    topic: function() {
      queue()
          .defer(function(callback) { setTimeout(function() { callback(-2); }, 100); })
          .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
          .defer(function(callback) { setTimeout(function() { callback(-3); }, 200); })
          .await(this.callback);
    },
    "the first error is returned": function(error, one, two, three) {
      assert.equal(error, -1);
      assert.isUndefined(one);
      assert.isUndefined(two);
      assert.isUndefined(three);
    }
  },

  "queue with multiple tasks where one errors": {
    topic: function() {
      queue()
          .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
          .defer(function(callback) { process.nextTick(function() { callback(null, 'ok'); }); })
          .await(this.callback);
    },
    "the first error is returned": function(error, one, two) {
      assert.equal(error, -1);
      assert.isUndefined(one);
      assert.isUndefined(two);
    }
  },

  "queue with multiple synchronous tasks that error": {
    topic: function() {
      queue()
          .defer(function(callback) { callback(-1); })
          .defer(function(callback) { callback(-2); })
          .defer(function(callback) { throw new Error(); })
          .await(this.callback);
    },
    "the first error prevents the other tasks from running": function(error, one, two, three) {
      assert.equal(error, -1);
      assert.isUndefined(one);
      assert.isUndefined(two);
      assert.isUndefined(three);
    }
  },

  "queue of asynchronous closures, processed serially": {
    topic: function() {
      var tasks = [], task = asynchronousTask(), n = 10, q = queue(1);
      while (--n >= 0) tasks.push(task);
      tasks.forEach(function(t) { q.defer(t); });
      q.awaitAll(this.callback)
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  },

  "fully-parallel queue of ten asynchronous tasks": {
    topic: function() {
      var t = asynchronousTask();
      queue()
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in parallel": function(error, results) {
      assert.deepEqual(results, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    }
  },

  "partly-parallel queue of ten asynchronous tasks": {
    topic: function() {
      var t = asynchronousTask();
      queue(3)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes at most three tasks in parallel": function(error, results) {
      assert.deepEqual(results, [3, 3, 3, 3, 3, 3, 3, 3, 2, 1]);
    }
  },

  "serialized queue of ten asynchronous tasks": {
    topic: function() {
      var t = asynchronousTask();
      queue(1)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  },

  "fully-parallel queue of ten synchronous tasks": {
    topic: function() {
      var t = synchronousTask();
      queue()
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  },

  "partly-parallel queue of ten synchronous tasks": {
    topic: function() {
      var t = synchronousTask();
      queue(3)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  },

  "serialized queue of ten synchronous tasks": {
    topic: function() {
      var t = synchronousTask();
      queue(1)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .defer(t)
          .awaitAll(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  },

  "multiple awaitAll calls": {
    topic: function() {
      var call1Rtn = false,
          call2Rtn = false,
          callback;
      queue(1)
          .defer(function(_callback) {
            callback = _callback;
          })
          .awaitAll(function(error, results) {
            assert.isFalse(call1Rtn);
            call1Rtn = true;
          })
          .awaitAll(function() {
            assert.isFalse(call2Rtn);
            call2Rtn = true;
          })
          .awaitAll(this.callback);
      callback(null, 1);
      assert.isTrue(call1Rtn);
      assert.isTrue(call2Rtn);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in series": function(error, results) {
      assert.deepEqual(results, [1]);
    }
  }

});

suite.export(module);

function asynchronousTask() {
  var active = 0;
  return function(callback) {
    ++active;
    process.nextTick(function() {
      try {
        callback(null, active);
      } finally {
        --active;
      }
    });
  };
}

function synchronousTask() {
  var active = 0;
  return function(callback) {
    try {
      callback(null, ++active);
    } finally {
      --active;
    }
  };
}
