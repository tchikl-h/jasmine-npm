module.exports = exports = ConsoleReporter;
require('dotenv').config({path: __dirname + '/.env'})
const io = require("socket.io-client");
const socket = io.connect(process.env.HOST);

socket.on('connect', function() {
  // Connected, let's sign-up for to receive messages for this room
  socket.emit('room', `${process.env.COMPANY_ID}-${process.env.CHATBOT_ID}-${process.env.USER_ID}`);
});

function ConsoleReporter() {
  var print = function() {},
    showColors = false,
    jasmineCorePath = null,
    specCount,
    executableSpecCount,
    failureCount,
    failedSpecs = [],
    pendingSpecs = [],
    ansi = {
      green: '\x1B[32m',
      red: '\x1B[31m',
      yellow: '\x1B[33m',
      none: '\x1B[0m'
    },
    failedSuites = [],
    stackFilter = defaultStackFilter;

  this.setOptions = function(options) {
    if (options.print) {
      print = options.print;
    }
    showColors = options.showColors || false;
    if (options.jasmineCorePath) {
      jasmineCorePath = options.jasmineCorePath;
    }
    if (options.stackFilter) {
      stackFilter = options.stackFilter;
    }
  };

  this.jasmineStarted = function(options) {
    specCount = 0;
    executableSpecCount = 0;
    failureCount = 0;
    if (options && options.order && options.order.random) {
      print('Randomized with seed ' + options.order.seed);
      printNewline();
    }
    print('Started');
    printNewline();
  };

  this.jasmineDone = function(result) {
    printNewline();
    printNewline();
    if(failedSpecs.length > 0) {
      print('Failures:');
    }
    for (var i = 0; i < failedSpecs.length; i++) {
      specFailureDetails(failedSpecs[i], i + 1);
    }

    for(i = 0; i < failedSuites.length; i++) {
      suiteFailureDetails(failedSuites[i]);
    }

    if (result && result.failedExpectations && result.failedExpectations.length > 0) {
      suiteFailureDetails(result);
    }

    if (pendingSpecs.length > 0) {
      print("Pending:");
    }
    for(i = 0; i < pendingSpecs.length; i++) {
      pendingSpecDetails(pendingSpecs[i], i + 1);
    }

    if(specCount > 0) {
      printNewline();

      if(executableSpecCount !== specCount) {
        print('Ran ' + executableSpecCount + ' of ' + specCount + plural(' spec', specCount));
        printNewline();
      }
      var specCounts = executableSpecCount + ' ' + plural('spec', executableSpecCount) + ', ' +
        failureCount + ' ' + plural('failure', failureCount);

      if (pendingSpecs.length) {
        specCounts += ', ' + pendingSpecs.length + ' pending ' + plural('spec', pendingSpecs.length);
      }

      print(specCounts);
    } else {
      print('No specs found');
    }

    printNewline();
    var seconds = result ? result.totalTime / 1000 : 0;
    print('Finished in ' + seconds + ' ' + plural('second', seconds));
    printNewline();

    if (result && result.overallStatus === 'incomplete') {
      print('Incomplete: ' + result.incompleteReason);
      printNewline();
    }

    if (result && result.order && result.order.random) {
      print('Randomized with seed ' + result.order.seed);
      print(' (jasmine --random=true --seed=' + result.order.seed + ')');
      printNewline();
    }
  };

  this.specDone = function(result) {
    specCount++;

    if (result.status == 'pending') {
      pendingSpecs.push(result);
      executableSpecCount++;
      print(colored('yellow', '*'));
      return;
    }

    if (result.status == 'passed') {
      executableSpecCount++;
      print(colored('green', '.'));
      socket.emit('logs', {
        completed: true,
        result: 0,
        logs: "",
      });
      return;
    }

    if (result.status == 'failed') {
      failureCount++;
      failedSpecs.push(result);
      executableSpecCount++;
      print(colored('red', 'F'));
      socket.emit('logs', {
        completed: true,
        result: 1,
        logs: result,
      });
    }
  };

  this.suiteDone = function(result) {
    if (result.failedExpectations && result.failedExpectations.length > 0) {
      failureCount++;
      failedSuites.push(result);
    }
  };

  return this;

  function printNewline() {
    print('\n');
  }

  function colored(color, str) {
    return showColors ? (ansi[color] + str + ansi.none) : str;
  }

  function plural(str, count) {
    return count == 1 ? str : str + 's';
  }

  function repeat(thing, times) {
    var arr = [];
    for (var i = 0; i < times; i++) {
      arr.push(thing);
    }
    return arr;
  }

  function indent(str, spaces) {
    var lines = (str || '').split('\n');
    var newArr = [];
    for (var i = 0; i < lines.length; i++) {
      newArr.push(repeat(' ', spaces).join('') + lines[i]);
    }
    return newArr.join('\n');
  }

  function defaultStackFilter(stack) {
    if (!stack) {
      return '';
    }

    var filteredStack = stack.split('\n').filter(function(stackLine) {
      return stackLine.indexOf(jasmineCorePath) === -1;
    }).join('\n');
    return filteredStack;
  }

  function specFailureDetails(result, failedSpecNumber) {
    printNewline();
    print(failedSpecNumber + ') ');
    print(result.fullName);
    printFailedExpectations(result);
  }

  function suiteFailureDetails(result) {
    printNewline();
    print('Suite error: ' + result.fullName);
    printFailedExpectations(result);
  }

  function printFailedExpectations(result) {
    for (var i = 0; i < result.failedExpectations.length; i++) {
      var failedExpectation = result.failedExpectations[i];
      printNewline();
      print(indent('Message:', 2));
      printNewline();
      print(colored('red', indent(failedExpectation.message, 4)));
      printNewline();
      print(indent('Stack:', 2));
      printNewline();
      print(indent(stackFilter(failedExpectation.stack), 4));
    }

    printNewline();
  }

  function pendingSpecDetails(result, pendingSpecNumber) {
    printNewline();
    printNewline();
    print(pendingSpecNumber + ') ');
    print(result.fullName);
    printNewline();
    var pendingReason = "No reason given";
    if (result.pendingReason && result.pendingReason !== '') {
      pendingReason = result.pendingReason;
    }
    print(indent(colored('yellow', pendingReason), 2));
    printNewline();
  }
}
