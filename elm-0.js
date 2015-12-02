var Elm = Elm || { Native: {} };
Elm.Native.Basics = {};
Elm.Native.Basics.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Basics = localRuntime.Native.Basics || {};
	if (localRuntime.Native.Basics.values)
	{
		return localRuntime.Native.Basics.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	function div(a, b)
	{
		return (a / b) | 0;
	}
	function rem(a, b)
	{
		return a % b;
	}
	function mod(a, b)
	{
		if (b === 0)
		{
			throw new Error('Cannot perform mod 0. Division by zero error.');
		}
		var r = a % b;
		var m = a === 0 ? 0 : (b > 0 ? (a >= 0 ? r : r + b) : -mod(-a, -b));

		return m === b ? 0 : m;
	}
	function logBase(base, n)
	{
		return Math.log(n) / Math.log(base);
	}
	function negate(n)
	{
		return -n;
	}
	function abs(n)
	{
		return n < 0 ? -n : n;
	}

	function min(a, b)
	{
		return Utils.cmp(a, b) < 0 ? a : b;
	}
	function max(a, b)
	{
		return Utils.cmp(a, b) > 0 ? a : b;
	}
	function clamp(lo, hi, n)
	{
		return Utils.cmp(n, lo) < 0 ? lo : Utils.cmp(n, hi) > 0 ? hi : n;
	}

	function xor(a, b)
	{
		return a !== b;
	}
	function not(b)
	{
		return !b;
	}
	function isInfinite(n)
	{
		return n === Infinity || n === -Infinity;
	}

	function truncate(n)
	{
		return n | 0;
	}

	function degrees(d)
	{
		return d * Math.PI / 180;
	}
	function turns(t)
	{
		return 2 * Math.PI * t;
	}
	function fromPolar(point)
	{
		var r = point._0;
		var t = point._1;
		return Utils.Tuple2(r * Math.cos(t), r * Math.sin(t));
	}
	function toPolar(point)
	{
		var x = point._0;
		var y = point._1;
		return Utils.Tuple2(Math.sqrt(x * x + y * y), Math.atan2(y, x));
	}

	return localRuntime.Native.Basics.values = {
		div: F2(div),
		rem: F2(rem),
		mod: F2(mod),

		pi: Math.PI,
		e: Math.E,
		cos: Math.cos,
		sin: Math.sin,
		tan: Math.tan,
		acos: Math.acos,
		asin: Math.asin,
		atan: Math.atan,
		atan2: F2(Math.atan2),

		degrees: degrees,
		turns: turns,
		fromPolar: fromPolar,
		toPolar: toPolar,

		sqrt: Math.sqrt,
		logBase: F2(logBase),
		negate: negate,
		abs: abs,
		min: F2(min),
		max: F2(max),
		clamp: F3(clamp),
		compare: Utils.compare,

		xor: F2(xor),
		not: not,

		truncate: truncate,
		ceiling: Math.ceil,
		floor: Math.floor,
		round: Math.round,
		toFloat: function(x) { return x; },
		isNaN: isNaN,
		isInfinite: isInfinite
	};
};

Elm.Native.Port = {};

Elm.Native.Port.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Port = localRuntime.Native.Port || {};
	if (localRuntime.Native.Port.values)
	{
		return localRuntime.Native.Port.values;
	}

	var NS;

	// INBOUND

	function inbound(name, type, converter)
	{
		if (!localRuntime.argsTracker[name])
		{
			throw new Error(
				'Port Error:\n' +
				'No argument was given for the port named \'' + name + '\' with type:\n\n' +
				'    ' + type.split('\n').join('\n        ') + '\n\n' +
				'You need to provide an initial value!\n\n' +
				'Find out more about ports here <http://elm-lang.org/learn/Ports.elm>'
			);
		}
		var arg = localRuntime.argsTracker[name];
		arg.used = true;

		return jsToElm(name, type, converter, arg.value);
	}


	function inboundSignal(name, type, converter)
	{
		var initialValue = inbound(name, type, converter);

		if (!NS)
		{
			NS = Elm.Native.Signal.make(localRuntime);
		}
		var signal = NS.input('inbound-port-' + name, initialValue);

		function send(jsValue)
		{
			var elmValue = jsToElm(name, type, converter, jsValue);
			setTimeout(function() {
				localRuntime.notify(signal.id, elmValue);
			}, 0);
		}

		localRuntime.ports[name] = { send: send };

		return signal;
	}


	function jsToElm(name, type, converter, value)
	{
		try
		{
			return converter(value);
		}
		catch(e)
		{
			throw new Error(
				'Port Error:\n' +
				'Regarding the port named \'' + name + '\' with type:\n\n' +
				'    ' + type.split('\n').join('\n        ') + '\n\n' +
				'You just sent the value:\n\n' +
				'    ' + JSON.stringify(value) + '\n\n' +
				'but it cannot be converted to the necessary type.\n' +
				e.message
			);
		}
	}


	// OUTBOUND

	function outbound(name, converter, elmValue)
	{
		localRuntime.ports[name] = converter(elmValue);
	}


	function outboundSignal(name, converter, signal)
	{
		var subscribers = [];

		function subscribe(handler)
		{
			subscribers.push(handler);
		}
		function unsubscribe(handler)
		{
			subscribers.pop(subscribers.indexOf(handler));
		}

		function notify(elmValue)
		{
			var jsValue = converter(elmValue);
			var len = subscribers.length;
			for (var i = 0; i < len; ++i)
			{
				subscribers[i](jsValue);
			}
		}

		if (!NS)
		{
			NS = Elm.Native.Signal.make(localRuntime);
		}
		NS.output('outbound-port-' + name, notify, signal);

		localRuntime.ports[name] = {
			subscribe: subscribe,
			unsubscribe: unsubscribe
		};

		return signal;
	}


	return localRuntime.Native.Port.values = {
		inbound: inbound,
		outbound: outbound,
		inboundSignal: inboundSignal,
		outboundSignal: outboundSignal
	};
};

if (!Elm.fullscreen) {
	(function() {
		'use strict';

		var Display = {
			FULLSCREEN: 0,
			COMPONENT: 1,
			NONE: 2
		};

		Elm.fullscreen = function(module, args)
		{
			var container = document.createElement('div');
			document.body.appendChild(container);
			return init(Display.FULLSCREEN, container, module, args || {});
		};

		Elm.embed = function(module, container, args)
		{
			var tag = container.tagName;
			if (tag !== 'DIV')
			{
				throw new Error('Elm.node must be given a DIV, not a ' + tag + '.');
			}
			return init(Display.COMPONENT, container, module, args || {});
		};

		Elm.worker = function(module, args)
		{
			return init(Display.NONE, {}, module, args || {});
		};

		function init(display, container, module, args, moduleToReplace)
		{
			// defining state needed for an instance of the Elm RTS
			var inputs = [];

			/* OFFSET
			 * Elm's time traveling debugger lets you pause time. This means
			 * "now" may be shifted a bit into the past. By wrapping Date.now()
			 * we can manage this.
			 */
			var timer = {
				programStart: Date.now(),
				now: function()
				{
					return Date.now();
				}
			};

			var updateInProgress = false;
			function notify(id, v)
			{
				if (updateInProgress)
				{
					throw new Error(
						'The notify function has been called synchronously!\n' +
						'This can lead to frames being dropped.\n' +
						'Definitely report this to <https://github.com/elm-lang/Elm/issues>\n');
				}
				updateInProgress = true;
				var timestep = timer.now();
				for (var i = inputs.length; i--; )
				{
					inputs[i].notify(timestep, id, v);
				}
				updateInProgress = false;
			}
			function setTimeout(func, delay)
			{
				return window.setTimeout(func, delay);
			}

			var listeners = [];
			function addListener(relevantInputs, domNode, eventName, func)
			{
				domNode.addEventListener(eventName, func);
				var listener = {
					relevantInputs: relevantInputs,
					domNode: domNode,
					eventName: eventName,
					func: func
				};
				listeners.push(listener);
			}

			var argsTracker = {};
			for (var name in args)
			{
				argsTracker[name] = {
					value: args[name],
					used: false
				};
			}

			// create the actual RTS. Any impure modules will attach themselves to this
			// object. This permits many Elm programs to be embedded per document.
			var elm = {
				notify: notify,
				setTimeout: setTimeout,
				node: container,
				addListener: addListener,
				inputs: inputs,
				timer: timer,
				argsTracker: argsTracker,
				ports: {},

				isFullscreen: function() { return display === Display.FULLSCREEN; },
				isEmbed: function() { return display === Display.COMPONENT; },
				isWorker: function() { return display === Display.NONE; }
			};

			function swap(newModule)
			{
				removeListeners(listeners);
				var div = document.createElement('div');
				var newElm = init(display, div, newModule, args, elm);
				inputs = [];

				return newElm;
			}

			function dispose()
			{
				removeListeners(listeners);
				inputs = [];
			}

			var Module = {};
			try
			{
				Module = module.make(elm);
				checkInputs(elm);
			}
			catch (error)
			{
				if (typeof container.appendChild === "function")
				{
					container.appendChild(errorNode(error.message));
				}
				else
				{
					console.error(error.message);
				}
				throw error;
			}

			if (display !== Display.NONE)
			{
				var graphicsNode = initGraphics(elm, Module);
			}

			var rootNode = { kids: inputs };
			trimDeadNodes(rootNode);
			inputs = rootNode.kids;
			filterListeners(inputs, listeners);

			addReceivers(elm.ports);

			if (typeof moduleToReplace !== 'undefined')
			{
				hotSwap(moduleToReplace, elm);

				// rerender scene if graphics are enabled.
				if (typeof graphicsNode !== 'undefined')
				{
					graphicsNode.notify(0, true, 0);
				}
			}

			return {
				swap: swap,
				ports: elm.ports,
				dispose: dispose
			};
		}

		function checkInputs(elm)
		{
			var argsTracker = elm.argsTracker;
			for (var name in argsTracker)
			{
				if (!argsTracker[name].used)
				{
					throw new Error(
						"Port Error:\nYou provided an argument named '" + name +
						"' but there is no corresponding port!\n\n" +
						"Maybe add a port '" + name + "' to your Elm module?\n" +
						"Maybe remove the '" + name + "' argument from your initialization code in JS?"
					);
				}
			}
		}

		function errorNode(message)
		{
			var code = document.createElement('code');

			var lines = message.split('\n');
			code.appendChild(document.createTextNode(lines[0]));
			code.appendChild(document.createElement('br'));
			code.appendChild(document.createElement('br'));
			for (var i = 1; i < lines.length; ++i)
			{
				code.appendChild(document.createTextNode('\u00A0 \u00A0 ' + lines[i].replace(/  /g, '\u00A0 ')));
				code.appendChild(document.createElement('br'));
			}
			code.appendChild(document.createElement('br'));
			code.appendChild(document.createTextNode('Open the developer console for more details.'));
			return code;
		}


		//// FILTER SIGNALS ////

		// TODO: move this code into the signal module and create a function
		// Signal.initializeGraph that actually instantiates everything.

		function filterListeners(inputs, listeners)
		{
			loop:
			for (var i = listeners.length; i--; )
			{
				var listener = listeners[i];
				for (var j = inputs.length; j--; )
				{
					if (listener.relevantInputs.indexOf(inputs[j].id) >= 0)
					{
						continue loop;
					}
				}
				listener.domNode.removeEventListener(listener.eventName, listener.func);
			}
		}

		function removeListeners(listeners)
		{
			for (var i = listeners.length; i--; )
			{
				var listener = listeners[i];
				listener.domNode.removeEventListener(listener.eventName, listener.func);
			}
		}

		// add receivers for built-in ports if they are defined
		function addReceivers(ports)
		{
			if ('title' in ports)
			{
				if (typeof ports.title === 'string')
				{
					document.title = ports.title;
				}
				else
				{
					ports.title.subscribe(function(v) { document.title = v; });
				}
			}
			if ('redirect' in ports)
			{
				ports.redirect.subscribe(function(v) {
					if (v.length > 0)
					{
						window.location = v;
					}
				});
			}
		}


		// returns a boolean representing whether the node is alive or not.
		function trimDeadNodes(node)
		{
			if (node.isOutput)
			{
				return true;
			}

			var liveKids = [];
			for (var i = node.kids.length; i--; )
			{
				var kid = node.kids[i];
				if (trimDeadNodes(kid))
				{
					liveKids.push(kid);
				}
			}
			node.kids = liveKids;

			return liveKids.length > 0;
		}


		////  RENDERING  ////

		function initGraphics(elm, Module)
		{
			if (!('main' in Module))
			{
				throw new Error("'main' is missing! What do I display?!");
			}

			var signalGraph = Module.main;

			// make sure the signal graph is actually a signal & extract the visual model
			if (!('notify' in signalGraph))
			{
				signalGraph = Elm.Signal.make(elm).constant(signalGraph);
			}
			var initialScene = signalGraph.value;

			// Figure out what the render functions should be
			var render;
			var update;
			if (initialScene.ctor === 'Element_elm_builtin')
			{
				var Element = Elm.Native.Graphics.Element.make(elm);
				render = Element.render;
				update = Element.updateAndReplace;
			}
			else
			{
				var VirtualDom = Elm.Native.VirtualDom.make(elm);
				render = VirtualDom.render;
				update = VirtualDom.updateAndReplace;
			}

			// Add the initialScene to the DOM
			var container = elm.node;
			var node = render(initialScene);
			while (container.firstChild)
			{
				container.removeChild(container.firstChild);
			}
			container.appendChild(node);

			var _requestAnimationFrame =
				typeof requestAnimationFrame !== 'undefined'
					? requestAnimationFrame
					: function(cb) { setTimeout(cb, 1000 / 60); }
					;

			// domUpdate is called whenever the main Signal changes.
			//
			// domUpdate and drawCallback implement a small state machine in order
			// to schedule only 1 draw per animation frame. This enforces that
			// once draw has been called, it will not be called again until the
			// next frame.
			//
			// drawCallback is scheduled whenever
			// 1. The state transitions from PENDING_REQUEST to EXTRA_REQUEST, or
			// 2. The state transitions from NO_REQUEST to PENDING_REQUEST
			//
			// Invariants:
			// 1. In the NO_REQUEST state, there is never a scheduled drawCallback.
			// 2. In the PENDING_REQUEST and EXTRA_REQUEST states, there is always exactly 1
			//    scheduled drawCallback.
			var NO_REQUEST = 0;
			var PENDING_REQUEST = 1;
			var EXTRA_REQUEST = 2;
			var state = NO_REQUEST;
			var savedScene = initialScene;
			var scheduledScene = initialScene;

			function domUpdate(newScene)
			{
				scheduledScene = newScene;

				switch (state)
				{
					case NO_REQUEST:
						_requestAnimationFrame(drawCallback);
						state = PENDING_REQUEST;
						return;
					case PENDING_REQUEST:
						state = PENDING_REQUEST;
						return;
					case EXTRA_REQUEST:
						state = PENDING_REQUEST;
						return;
				}
			}

			function drawCallback()
			{
				switch (state)
				{
					case NO_REQUEST:
						// This state should not be possible. How can there be no
						// request, yet somehow we are actively fulfilling a
						// request?
						throw new Error(
							'Unexpected draw callback.\n' +
							'Please report this to <https://github.com/elm-lang/core/issues>.'
						);

					case PENDING_REQUEST:
						// At this point, we do not *know* that another frame is
						// needed, but we make an extra request to rAF just in
						// case. It's possible to drop a frame if rAF is called
						// too late, so we just do it preemptively.
						_requestAnimationFrame(drawCallback);
						state = EXTRA_REQUEST;

						// There's also stuff we definitely need to draw.
						draw();
						return;

					case EXTRA_REQUEST:
						// Turns out the extra request was not needed, so we will
						// stop calling rAF. No reason to call it all the time if
						// no one needs it.
						state = NO_REQUEST;
						return;
				}
			}

			function draw()
			{
				update(elm.node.firstChild, savedScene, scheduledScene);
				if (elm.Native.Window)
				{
					elm.Native.Window.values.resizeIfNeeded();
				}
				savedScene = scheduledScene;
			}

			var renderer = Elm.Native.Signal.make(elm).output('main', domUpdate, signalGraph);

			// must check for resize after 'renderer' is created so
			// that changes show up.
			if (elm.Native.Window)
			{
				elm.Native.Window.values.resizeIfNeeded();
			}

			return renderer;
		}

		//// HOT SWAPPING ////

		// Returns boolean indicating if the swap was successful.
		// Requires that the two signal graphs have exactly the same
		// structure.
		function hotSwap(from, to)
		{
			function similar(nodeOld, nodeNew)
			{
				if (nodeOld.id !== nodeNew.id)
				{
					return false;
				}
				if (nodeOld.isOutput)
				{
					return nodeNew.isOutput;
				}
				return nodeOld.kids.length === nodeNew.kids.length;
			}
			function swap(nodeOld, nodeNew)
			{
				nodeNew.value = nodeOld.value;
				return true;
			}
			var canSwap = depthFirstTraversals(similar, from.inputs, to.inputs);
			if (canSwap)
			{
				depthFirstTraversals(swap, from.inputs, to.inputs);
			}
			from.node.parentNode.replaceChild(to.node, from.node);

			return canSwap;
		}

		// Returns false if the node operation f ever fails.
		function depthFirstTraversals(f, queueOld, queueNew)
		{
			if (queueOld.length !== queueNew.length)
			{
				return false;
			}
			queueOld = queueOld.slice(0);
			queueNew = queueNew.slice(0);

			var seen = [];
			while (queueOld.length > 0 && queueNew.length > 0)
			{
				var nodeOld = queueOld.pop();
				var nodeNew = queueNew.pop();
				if (seen.indexOf(nodeOld.id) < 0)
				{
					if (!f(nodeOld, nodeNew))
					{
						return false;
					}
					queueOld = queueOld.concat(nodeOld.kids || []);
					queueNew = queueNew.concat(nodeNew.kids || []);
					seen.push(nodeOld.id);
				}
			}
			return true;
		}
	}());

	function F2(fun)
	{
		function wrapper(a) { return function(b) { return fun(a,b); }; }
		wrapper.arity = 2;
		wrapper.func = fun;
		return wrapper;
	}

	function F3(fun)
	{
		function wrapper(a) {
			return function(b) { return function(c) { return fun(a, b, c); }; };
		}
		wrapper.arity = 3;
		wrapper.func = fun;
		return wrapper;
	}

	function F4(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return fun(a, b, c, d); }; }; };
		}
		wrapper.arity = 4;
		wrapper.func = fun;
		return wrapper;
	}

	function F5(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return fun(a, b, c, d, e); }; }; }; };
		}
		wrapper.arity = 5;
		wrapper.func = fun;
		return wrapper;
	}

	function F6(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return fun(a, b, c, d, e, f); }; }; }; }; };
		}
		wrapper.arity = 6;
		wrapper.func = fun;
		return wrapper;
	}

	function F7(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return fun(a, b, c, d, e, f, g); }; }; }; }; }; };
		}
		wrapper.arity = 7;
		wrapper.func = fun;
		return wrapper;
	}

	function F8(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return function(h) {
			return fun(a, b, c, d, e, f, g, h); }; }; }; }; }; }; };
		}
		wrapper.arity = 8;
		wrapper.func = fun;
		return wrapper;
	}

	function F9(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return function(h) { return function(i) {
			return fun(a, b, c, d, e, f, g, h, i); }; }; }; }; }; }; }; };
		}
		wrapper.arity = 9;
		wrapper.func = fun;
		return wrapper;
	}

	function A2(fun, a, b)
	{
		return fun.arity === 2
			? fun.func(a, b)
			: fun(a)(b);
	}
	function A3(fun, a, b, c)
	{
		return fun.arity === 3
			? fun.func(a, b, c)
			: fun(a)(b)(c);
	}
	function A4(fun, a, b, c, d)
	{
		return fun.arity === 4
			? fun.func(a, b, c, d)
			: fun(a)(b)(c)(d);
	}
	function A5(fun, a, b, c, d, e)
	{
		return fun.arity === 5
			? fun.func(a, b, c, d, e)
			: fun(a)(b)(c)(d)(e);
	}
	function A6(fun, a, b, c, d, e, f)
	{
		return fun.arity === 6
			? fun.func(a, b, c, d, e, f)
			: fun(a)(b)(c)(d)(e)(f);
	}
	function A7(fun, a, b, c, d, e, f, g)
	{
		return fun.arity === 7
			? fun.func(a, b, c, d, e, f, g)
			: fun(a)(b)(c)(d)(e)(f)(g);
	}
	function A8(fun, a, b, c, d, e, f, g, h)
	{
		return fun.arity === 8
			? fun.func(a, b, c, d, e, f, g, h)
			: fun(a)(b)(c)(d)(e)(f)(g)(h);
	}
	function A9(fun, a, b, c, d, e, f, g, h, i)
	{
		return fun.arity === 9
			? fun.func(a, b, c, d, e, f, g, h, i)
			: fun(a)(b)(c)(d)(e)(f)(g)(h)(i);
	}
}

Elm.Native = Elm.Native || {};
Elm.Native.Utils = {};
Elm.Native.Utils.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Utils = localRuntime.Native.Utils || {};
	if (localRuntime.Native.Utils.values)
	{
		return localRuntime.Native.Utils.values;
	}


	// COMPARISONS

	function eq(l, r)
	{
		var stack = [{'x': l, 'y': r}];
		while (stack.length > 0)
		{
			var front = stack.pop();
			var x = front.x;
			var y = front.y;
			if (x === y)
			{
				continue;
			}
			if (typeof x === 'object')
			{
				var c = 0;
				for (var i in x)
				{
					++c;
					if (i in y)
					{
						if (i !== 'ctor')
						{
							stack.push({ 'x': x[i], 'y': y[i] });
						}
					}
					else
					{
						return false;
					}
				}
				if ('ctor' in x)
				{
					stack.push({'x': x.ctor, 'y': y.ctor});
				}
				if (c !== Object.keys(y).length)
				{
					return false;
				}
			}
			else if (typeof x === 'function')
			{
				throw new Error('Equality error: general function equality is ' +
								'undecidable, and therefore, unsupported');
			}
			else
			{
				return false;
			}
		}
		return true;
	}

	// code in Generate/JavaScript.hs depends on the particular
	// integer values assigned to LT, EQ, and GT
	var LT = -1, EQ = 0, GT = 1, ord = ['LT', 'EQ', 'GT'];

	function compare(x, y)
	{
		return {
			ctor: ord[cmp(x, y) + 1]
		};
	}

	function cmp(x, y) {
		var ord;
		if (typeof x !== 'object')
		{
			return x === y ? EQ : x < y ? LT : GT;
		}
		else if (x.isChar)
		{
			var a = x.toString();
			var b = y.toString();
			return a === b
				? EQ
				: a < b
					? LT
					: GT;
		}
		else if (x.ctor === '::' || x.ctor === '[]')
		{
			while (true)
			{
				if (x.ctor === '[]' && y.ctor === '[]')
				{
					return EQ;
				}
				if (x.ctor !== y.ctor)
				{
					return x.ctor === '[]' ? LT : GT;
				}
				ord = cmp(x._0, y._0);
				if (ord !== EQ)
				{
					return ord;
				}
				x = x._1;
				y = y._1;
			}
		}
		else if (x.ctor.slice(0, 6) === '_Tuple')
		{
			var n = x.ctor.slice(6) - 0;
			var err = 'cannot compare tuples with more than 6 elements.';
			if (n === 0) return EQ;
			if (n >= 1) { ord = cmp(x._0, y._0); if (ord !== EQ) return ord;
			if (n >= 2) { ord = cmp(x._1, y._1); if (ord !== EQ) return ord;
			if (n >= 3) { ord = cmp(x._2, y._2); if (ord !== EQ) return ord;
			if (n >= 4) { ord = cmp(x._3, y._3); if (ord !== EQ) return ord;
			if (n >= 5) { ord = cmp(x._4, y._4); if (ord !== EQ) return ord;
			if (n >= 6) { ord = cmp(x._5, y._5); if (ord !== EQ) return ord;
			if (n >= 7) throw new Error('Comparison error: ' + err); } } } } } }
			return EQ;
		}
		else
		{
			throw new Error('Comparison error: comparison is only defined on ints, ' +
							'floats, times, chars, strings, lists of comparable values, ' +
							'and tuples of comparable values.');
		}
	}


	// TUPLES

	var Tuple0 = {
		ctor: '_Tuple0'
	};

	function Tuple2(x, y)
	{
		return {
			ctor: '_Tuple2',
			_0: x,
			_1: y
		};
	}


	// LITERALS

	function chr(c)
	{
		var x = new String(c);
		x.isChar = true;
		return x;
	}

	function txt(str)
	{
		var t = new String(str);
		t.text = true;
		return t;
	}


	// GUID

	var count = 0;
	function guid(_)
	{
		return count++;
	}


	// RECORDS

	function update(oldRecord, updatedFields)
	{
		var newRecord = {};
		for (var key in oldRecord)
		{
			var value = (key in updatedFields) ? updatedFields[key] : oldRecord[key];
			newRecord[key] = value;
		}
		return newRecord;
	}


	// MOUSE COORDINATES

	function getXY(e)
	{
		var posx = 0;
		var posy = 0;
		if (e.pageX || e.pageY)
		{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY)
		{
			posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		if (localRuntime.isEmbed())
		{
			var rect = localRuntime.node.getBoundingClientRect();
			var relx = rect.left + document.body.scrollLeft + document.documentElement.scrollLeft;
			var rely = rect.top + document.body.scrollTop + document.documentElement.scrollTop;
			// TODO: figure out if there is a way to avoid rounding here
			posx = posx - Math.round(relx) - localRuntime.node.clientLeft;
			posy = posy - Math.round(rely) - localRuntime.node.clientTop;
		}
		return Tuple2(posx, posy);
	}


	//// LIST STUFF ////

	var Nil = { ctor: '[]' };

	function Cons(hd, tl)
	{
		return {
			ctor: '::',
			_0: hd,
			_1: tl
		};
	}

	function list(arr)
	{
		var out = Nil;
		for (var i = arr.length; i--; )
		{
			out = Cons(arr[i], out);
		}
		return out;
	}

	function range(lo, hi)
	{
		var list = Nil;
		if (lo <= hi)
		{
			do
			{
				list = Cons(hi, list);
			}
			while (hi-- > lo);
		}
		return list;
	}

	function append(xs, ys)
	{
		// append Strings
		if (typeof xs === 'string')
		{
			return xs + ys;
		}

		// append Text
		if (xs.ctor.slice(0, 5) === 'Text:')
		{
			return {
				ctor: 'Text:Append',
				_0: xs,
				_1: ys
			};
		}


		// append Lists
		if (xs.ctor === '[]')
		{
			return ys;
		}
		var root = Cons(xs._0, Nil);
		var curr = root;
		xs = xs._1;
		while (xs.ctor !== '[]')
		{
			curr._1 = Cons(xs._0, Nil);
			xs = xs._1;
			curr = curr._1;
		}
		curr._1 = ys;
		return root;
	}


	// CRASHES

	function crash(moduleName, region)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '` ' + regionToString(region) + '\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function crashCase(moduleName, region, value)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '`\n\n'
				+ 'This was caused by the `case` expression ' + regionToString(region) + '.\n'
				+ 'One of the branches ended with a crash and the following value got through:\n\n    ' + toString(value) + '\n\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function regionToString(region)
	{
		if (region.start.line == region.end.line)
		{
			return 'on line ' + region.start.line;
		}
		return 'between lines ' + region.start.line + ' and ' + region.end.line;
	}


	// BAD PORTS

	function badPort(expected, received)
	{
		throw new Error(
			'Runtime error when sending values through a port.\n\n'
			+ 'Expecting ' + expected + ' but was given ' + formatValue(received)
		);
	}

	function formatValue(value)
	{
		// Explicity format undefined values as "undefined"
		// because JSON.stringify(undefined) unhelpfully returns ""
		return (value === undefined) ? "undefined" : JSON.stringify(value);
	}


	// TO STRING

	var _Array;
	var Dict;
	var List;

	var toString = function(v)
	{
		var type = typeof v;
		if (type === 'function')
		{
			var name = v.func ? v.func.name : v.name;
			return '<function' + (name === '' ? '' : ': ') + name + '>';
		}
		else if (type === 'boolean')
		{
			return v ? 'True' : 'False';
		}
		else if (type === 'number')
		{
			return v + '';
		}
		else if ((v instanceof String) && v.isChar)
		{
			return '\'' + addSlashes(v, true) + '\'';
		}
		else if (type === 'string')
		{
			return '"' + addSlashes(v, false) + '"';
		}
		else if (type === 'object' && 'ctor' in v)
		{
			if (v.ctor.substring(0, 6) === '_Tuple')
			{
				var output = [];
				for (var k in v)
				{
					if (k === 'ctor') continue;
					output.push(toString(v[k]));
				}
				return '(' + output.join(',') + ')';
			}
			else if (v.ctor === '_Array')
			{
				if (!_Array)
				{
					_Array = Elm.Array.make(localRuntime);
				}
				var list = _Array.toList(v);
				return 'Array.fromList ' + toString(list);
			}
			else if (v.ctor === '::')
			{
				var output = '[' + toString(v._0);
				v = v._1;
				while (v.ctor === '::')
				{
					output += ',' + toString(v._0);
					v = v._1;
				}
				return output + ']';
			}
			else if (v.ctor === '[]')
			{
				return '[]';
			}
			else if (v.ctor === 'RBNode_elm_builtin' || v.ctor === 'RBEmpty_elm_builtin' || v.ctor === 'Set_elm_builtin')
			{
				if (!Dict)
				{
					Dict = Elm.Dict.make(localRuntime);
				}
				var list;
				var name;
				if (v.ctor === 'Set_elm_builtin')
				{
					if (!List)
					{
						List = Elm.List.make(localRuntime);
					}
					name = 'Set';
					list = A2(List.map, function(x) {return x._0; }, Dict.toList(v._0));
				}
				else
				{
					name = 'Dict';
					list = Dict.toList(v);
				}
				return name + '.fromList ' + toString(list);
			}
			else if (v.ctor.slice(0, 5) === 'Text:')
			{
				return '<text>';
			}
			else if (v.ctor === 'Element_elm_builtin')
			{
				return '<element>'
			}
			else if (v.ctor === 'Form_elm_builtin')
			{
				return '<form>'
			}
			else
			{
				var output = '';
				for (var i in v)
				{
					if (i === 'ctor') continue;
					var str = toString(v[i]);
					var parenless = str[0] === '{' || str[0] === '<' || str.indexOf(' ') < 0;
					output += ' ' + (parenless ? str : '(' + str + ')');
				}
				return v.ctor + output;
			}
		}
		else if (type === 'object' && 'notify' in v && 'id' in v)
		{
			return '<signal>';
		}
		else if (type === 'object')
		{
			var output = [];
			for (var k in v)
			{
				output.push(k + ' = ' + toString(v[k]));
			}
			if (output.length === 0)
			{
				return '{}';
			}
			return '{ ' + output.join(', ') + ' }';
		}
		return '<internal structure>';
	};

	function addSlashes(str, isChar)
	{
		var s = str.replace(/\\/g, '\\\\')
				  .replace(/\n/g, '\\n')
				  .replace(/\t/g, '\\t')
				  .replace(/\r/g, '\\r')
				  .replace(/\v/g, '\\v')
				  .replace(/\0/g, '\\0');
		if (isChar)
		{
			return s.replace(/\'/g, '\\\'');
		}
		else
		{
			return s.replace(/\"/g, '\\"');
		}
	}


	return localRuntime.Native.Utils.values = {
		eq: eq,
		cmp: cmp,
		compare: F2(compare),
		Tuple0: Tuple0,
		Tuple2: Tuple2,
		chr: chr,
		txt: txt,
		update: update,
		guid: guid,
		getXY: getXY,

		Nil: Nil,
		Cons: Cons,
		list: list,
		range: range,
		append: F2(append),

		crash: crash,
		crashCase: crashCase,
		badPort: badPort,

		toString: toString
	};
};

Elm.Basics = Elm.Basics || {};
Elm.Basics.make = function (_elm) {
   "use strict";
   _elm.Basics = _elm.Basics || {};
   if (_elm.Basics.values) return _elm.Basics.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Native$Basics = Elm.Native.Basics.make(_elm),
   $Native$Utils = Elm.Native.Utils.make(_elm);
   var _op = {};
   var uncurry = F2(function (f,_p0) {
      var _p1 = _p0;
      return A2(f,_p1._0,_p1._1);
   });
   var curry = F3(function (f,a,b) {
      return f({ctor: "_Tuple2",_0: a,_1: b});
   });
   var flip = F3(function (f,b,a) {    return A2(f,a,b);});
   var snd = function (_p2) {    var _p3 = _p2;return _p3._1;};
   var fst = function (_p4) {    var _p5 = _p4;return _p5._0;};
   var always = F2(function (a,_p6) {    return a;});
   var identity = function (x) {    return x;};
   _op["<|"] = F2(function (f,x) {    return f(x);});
   _op["|>"] = F2(function (x,f) {    return f(x);});
   _op[">>"] = F3(function (f,g,x) {    return g(f(x));});
   _op["<<"] = F3(function (g,f,x) {    return g(f(x));});
   _op["++"] = $Native$Utils.append;
   var toString = $Native$Utils.toString;
   var isInfinite = $Native$Basics.isInfinite;
   var isNaN = $Native$Basics.isNaN;
   var toFloat = $Native$Basics.toFloat;
   var ceiling = $Native$Basics.ceiling;
   var floor = $Native$Basics.floor;
   var truncate = $Native$Basics.truncate;
   var round = $Native$Basics.round;
   var not = $Native$Basics.not;
   var xor = $Native$Basics.xor;
   _op["||"] = $Native$Basics.or;
   _op["&&"] = $Native$Basics.and;
   var max = $Native$Basics.max;
   var min = $Native$Basics.min;
   var GT = {ctor: "GT"};
   var EQ = {ctor: "EQ"};
   var LT = {ctor: "LT"};
   var compare = $Native$Basics.compare;
   _op[">="] = $Native$Basics.ge;
   _op["<="] = $Native$Basics.le;
   _op[">"] = $Native$Basics.gt;
   _op["<"] = $Native$Basics.lt;
   _op["/="] = $Native$Basics.neq;
   _op["=="] = $Native$Basics.eq;
   var e = $Native$Basics.e;
   var pi = $Native$Basics.pi;
   var clamp = $Native$Basics.clamp;
   var logBase = $Native$Basics.logBase;
   var abs = $Native$Basics.abs;
   var negate = $Native$Basics.negate;
   var sqrt = $Native$Basics.sqrt;
   var atan2 = $Native$Basics.atan2;
   var atan = $Native$Basics.atan;
   var asin = $Native$Basics.asin;
   var acos = $Native$Basics.acos;
   var tan = $Native$Basics.tan;
   var sin = $Native$Basics.sin;
   var cos = $Native$Basics.cos;
   _op["^"] = $Native$Basics.exp;
   _op["%"] = $Native$Basics.mod;
   var rem = $Native$Basics.rem;
   _op["//"] = $Native$Basics.div;
   _op["/"] = $Native$Basics.floatDiv;
   _op["*"] = $Native$Basics.mul;
   _op["-"] = $Native$Basics.sub;
   _op["+"] = $Native$Basics.add;
   var toPolar = $Native$Basics.toPolar;
   var fromPolar = $Native$Basics.fromPolar;
   var turns = $Native$Basics.turns;
   var degrees = $Native$Basics.degrees;
   var radians = function (t) {    return t;};
   return _elm.Basics.values = {_op: _op
                               ,max: max
                               ,min: min
                               ,compare: compare
                               ,not: not
                               ,xor: xor
                               ,rem: rem
                               ,negate: negate
                               ,abs: abs
                               ,sqrt: sqrt
                               ,clamp: clamp
                               ,logBase: logBase
                               ,e: e
                               ,pi: pi
                               ,cos: cos
                               ,sin: sin
                               ,tan: tan
                               ,acos: acos
                               ,asin: asin
                               ,atan: atan
                               ,atan2: atan2
                               ,round: round
                               ,floor: floor
                               ,ceiling: ceiling
                               ,truncate: truncate
                               ,toFloat: toFloat
                               ,degrees: degrees
                               ,radians: radians
                               ,turns: turns
                               ,toPolar: toPolar
                               ,fromPolar: fromPolar
                               ,isNaN: isNaN
                               ,isInfinite: isInfinite
                               ,toString: toString
                               ,fst: fst
                               ,snd: snd
                               ,identity: identity
                               ,always: always
                               ,flip: flip
                               ,curry: curry
                               ,uncurry: uncurry
                               ,LT: LT
                               ,EQ: EQ
                               ,GT: GT};
};
Elm.Maybe = Elm.Maybe || {};
Elm.Maybe.make = function (_elm) {
   "use strict";
   _elm.Maybe = _elm.Maybe || {};
   if (_elm.Maybe.values) return _elm.Maybe.values;
   var _U = Elm.Native.Utils.make(_elm);
   var _op = {};
   var withDefault = F2(function ($default,maybe) {
      var _p0 = maybe;
      if (_p0.ctor === "Just") {
            return _p0._0;
         } else {
            return $default;
         }
   });
   var Nothing = {ctor: "Nothing"};
   var oneOf = function (maybes) {
      oneOf: while (true) {
         var _p1 = maybes;
         if (_p1.ctor === "[]") {
               return Nothing;
            } else {
               var _p3 = _p1._0;
               var _p2 = _p3;
               if (_p2.ctor === "Nothing") {
                     var _v3 = _p1._1;
                     maybes = _v3;
                     continue oneOf;
                  } else {
                     return _p3;
                  }
            }
      }
   };
   var andThen = F2(function (maybeValue,callback) {
      var _p4 = maybeValue;
      if (_p4.ctor === "Just") {
            return callback(_p4._0);
         } else {
            return Nothing;
         }
   });
   var Just = function (a) {    return {ctor: "Just",_0: a};};
   var map = F2(function (f,maybe) {
      var _p5 = maybe;
      if (_p5.ctor === "Just") {
            return Just(f(_p5._0));
         } else {
            return Nothing;
         }
   });
   var map2 = F3(function (func,ma,mb) {
      var _p6 = {ctor: "_Tuple2",_0: ma,_1: mb};
      if (_p6.ctor === "_Tuple2" && _p6._0.ctor === "Just" && _p6._1.ctor === "Just")
      {
            return Just(A2(func,_p6._0._0,_p6._1._0));
         } else {
            return Nothing;
         }
   });
   var map3 = F4(function (func,ma,mb,mc) {
      var _p7 = {ctor: "_Tuple3",_0: ma,_1: mb,_2: mc};
      if (_p7.ctor === "_Tuple3" && _p7._0.ctor === "Just" && _p7._1.ctor === "Just" && _p7._2.ctor === "Just")
      {
            return Just(A3(func,_p7._0._0,_p7._1._0,_p7._2._0));
         } else {
            return Nothing;
         }
   });
   var map4 = F5(function (func,ma,mb,mc,md) {
      var _p8 = {ctor: "_Tuple4",_0: ma,_1: mb,_2: mc,_3: md};
      if (_p8.ctor === "_Tuple4" && _p8._0.ctor === "Just" && _p8._1.ctor === "Just" && _p8._2.ctor === "Just" && _p8._3.ctor === "Just")
      {
            return Just(A4(func,
            _p8._0._0,
            _p8._1._0,
            _p8._2._0,
            _p8._3._0));
         } else {
            return Nothing;
         }
   });
   var map5 = F6(function (func,ma,mb,mc,md,me) {
      var _p9 = {ctor: "_Tuple5"
                ,_0: ma
                ,_1: mb
                ,_2: mc
                ,_3: md
                ,_4: me};
      if (_p9.ctor === "_Tuple5" && _p9._0.ctor === "Just" && _p9._1.ctor === "Just" && _p9._2.ctor === "Just" && _p9._3.ctor === "Just" && _p9._4.ctor === "Just")
      {
            return Just(A5(func,
            _p9._0._0,
            _p9._1._0,
            _p9._2._0,
            _p9._3._0,
            _p9._4._0));
         } else {
            return Nothing;
         }
   });
   return _elm.Maybe.values = {_op: _op
                              ,andThen: andThen
                              ,map: map
                              ,map2: map2
                              ,map3: map3
                              ,map4: map4
                              ,map5: map5
                              ,withDefault: withDefault
                              ,oneOf: oneOf
                              ,Just: Just
                              ,Nothing: Nothing};
};
Elm.Native.List = {};
Elm.Native.List.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.List = localRuntime.Native.List || {};
	if (localRuntime.Native.List.values)
	{
		return localRuntime.Native.List.values;
	}
	if ('values' in Elm.Native.List)
	{
		return localRuntime.Native.List.values = Elm.Native.List.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	var Nil = Utils.Nil;
	var Cons = Utils.Cons;

	var fromArray = Utils.list;

	function toArray(xs)
	{
		var out = [];
		while (xs.ctor !== '[]')
		{
			out.push(xs._0);
			xs = xs._1;
		}
		return out;
	}

	// f defined similarly for both foldl and foldr (NB: different from Haskell)
	// ie, foldl : (a -> b -> b) -> b -> [a] -> b
	function foldl(f, b, xs)
	{
		var acc = b;
		while (xs.ctor !== '[]')
		{
			acc = A2(f, xs._0, acc);
			xs = xs._1;
		}
		return acc;
	}

	function foldr(f, b, xs)
	{
		var arr = toArray(xs);
		var acc = b;
		for (var i = arr.length; i--; )
		{
			acc = A2(f, arr[i], acc);
		}
		return acc;
	}

	function map2(f, xs, ys)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]')
		{
			arr.push(A2(f, xs._0, ys._0));
			xs = xs._1;
			ys = ys._1;
		}
		return fromArray(arr);
	}

	function map3(f, xs, ys, zs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]' && zs.ctor !== '[]')
		{
			arr.push(A3(f, xs._0, ys._0, zs._0));
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map4(f, ws, xs, ys, zs)
	{
		var arr = [];
		while (   ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A4(f, ws._0, xs._0, ys._0, zs._0));
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map5(f, vs, ws, xs, ys, zs)
	{
		var arr = [];
		while (   vs.ctor !== '[]'
			   && ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A5(f, vs._0, ws._0, xs._0, ys._0, zs._0));
			vs = vs._1;
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function sortBy(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			return Utils.cmp(f(a), f(b));
		}));
	}

	function sortWith(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			var ord = f(a)(b).ctor;
			return ord === 'EQ' ? 0 : ord === 'LT' ? -1 : 1;
		}));
	}

	function take(n, xs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && n > 0)
		{
			arr.push(xs._0);
			xs = xs._1;
			--n;
		}
		return fromArray(arr);
	}


	Elm.Native.List.values = {
		Nil: Nil,
		Cons: Cons,
		cons: F2(Cons),
		toArray: toArray,
		fromArray: fromArray,

		foldl: F3(foldl),
		foldr: F3(foldr),

		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		sortBy: F2(sortBy),
		sortWith: F2(sortWith),
		take: F2(take)
	};
	return localRuntime.Native.List.values = Elm.Native.List.values;
};

Elm.List = Elm.List || {};
Elm.List.make = function (_elm) {
   "use strict";
   _elm.List = _elm.List || {};
   if (_elm.List.values) return _elm.List.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$List = Elm.Native.List.make(_elm);
   var _op = {};
   var sortWith = $Native$List.sortWith;
   var sortBy = $Native$List.sortBy;
   var sort = function (xs) {
      return A2(sortBy,$Basics.identity,xs);
   };
   var drop = F2(function (n,list) {
      drop: while (true) if (_U.cmp(n,0) < 1) return list; else {
            var _p0 = list;
            if (_p0.ctor === "[]") {
                  return list;
               } else {
                  var _v1 = n - 1,_v2 = _p0._1;
                  n = _v1;
                  list = _v2;
                  continue drop;
               }
         }
   });
   var take = $Native$List.take;
   var map5 = $Native$List.map5;
   var map4 = $Native$List.map4;
   var map3 = $Native$List.map3;
   var map2 = $Native$List.map2;
   var any = F2(function (isOkay,list) {
      any: while (true) {
         var _p1 = list;
         if (_p1.ctor === "[]") {
               return false;
            } else {
               if (isOkay(_p1._0)) return true; else {
                     var _v4 = isOkay,_v5 = _p1._1;
                     isOkay = _v4;
                     list = _v5;
                     continue any;
                  }
            }
      }
   });
   var all = F2(function (isOkay,list) {
      return $Basics.not(A2(any,
      function (_p2) {
         return $Basics.not(isOkay(_p2));
      },
      list));
   });
   var foldr = $Native$List.foldr;
   var foldl = $Native$List.foldl;
   var length = function (xs) {
      return A3(foldl,
      F2(function (_p3,i) {    return i + 1;}),
      0,
      xs);
   };
   var sum = function (numbers) {
      return A3(foldl,
      F2(function (x,y) {    return x + y;}),
      0,
      numbers);
   };
   var product = function (numbers) {
      return A3(foldl,
      F2(function (x,y) {    return x * y;}),
      1,
      numbers);
   };
   var maximum = function (list) {
      var _p4 = list;
      if (_p4.ctor === "::") {
            return $Maybe.Just(A3(foldl,$Basics.max,_p4._0,_p4._1));
         } else {
            return $Maybe.Nothing;
         }
   };
   var minimum = function (list) {
      var _p5 = list;
      if (_p5.ctor === "::") {
            return $Maybe.Just(A3(foldl,$Basics.min,_p5._0,_p5._1));
         } else {
            return $Maybe.Nothing;
         }
   };
   var indexedMap = F2(function (f,xs) {
      return A3(map2,f,_U.range(0,length(xs) - 1),xs);
   });
   var member = F2(function (x,xs) {
      return A2(any,function (a) {    return _U.eq(a,x);},xs);
   });
   var isEmpty = function (xs) {
      var _p6 = xs;
      if (_p6.ctor === "[]") {
            return true;
         } else {
            return false;
         }
   };
   var tail = function (list) {
      var _p7 = list;
      if (_p7.ctor === "::") {
            return $Maybe.Just(_p7._1);
         } else {
            return $Maybe.Nothing;
         }
   };
   var head = function (list) {
      var _p8 = list;
      if (_p8.ctor === "::") {
            return $Maybe.Just(_p8._0);
         } else {
            return $Maybe.Nothing;
         }
   };
   _op["::"] = $Native$List.cons;
   var map = F2(function (f,xs) {
      return A3(foldr,
      F2(function (x,acc) {    return A2(_op["::"],f(x),acc);}),
      _U.list([]),
      xs);
   });
   var filter = F2(function (pred,xs) {
      var conditionalCons = F2(function (x,xs$) {
         return pred(x) ? A2(_op["::"],x,xs$) : xs$;
      });
      return A3(foldr,conditionalCons,_U.list([]),xs);
   });
   var maybeCons = F3(function (f,mx,xs) {
      var _p9 = f(mx);
      if (_p9.ctor === "Just") {
            return A2(_op["::"],_p9._0,xs);
         } else {
            return xs;
         }
   });
   var filterMap = F2(function (f,xs) {
      return A3(foldr,maybeCons(f),_U.list([]),xs);
   });
   var reverse = function (list) {
      return A3(foldl,
      F2(function (x,y) {    return A2(_op["::"],x,y);}),
      _U.list([]),
      list);
   };
   var scanl = F3(function (f,b,xs) {
      var scan1 = F2(function (x,accAcc) {
         var _p10 = accAcc;
         if (_p10.ctor === "::") {
               return A2(_op["::"],A2(f,x,_p10._0),accAcc);
            } else {
               return _U.list([]);
            }
      });
      return reverse(A3(foldl,scan1,_U.list([b]),xs));
   });
   var append = F2(function (xs,ys) {
      var _p11 = ys;
      if (_p11.ctor === "[]") {
            return xs;
         } else {
            return A3(foldr,
            F2(function (x,y) {    return A2(_op["::"],x,y);}),
            ys,
            xs);
         }
   });
   var concat = function (lists) {
      return A3(foldr,append,_U.list([]),lists);
   };
   var concatMap = F2(function (f,list) {
      return concat(A2(map,f,list));
   });
   var partition = F2(function (pred,list) {
      var step = F2(function (x,_p12) {
         var _p13 = _p12;
         var _p15 = _p13._0;
         var _p14 = _p13._1;
         return pred(x) ? {ctor: "_Tuple2"
                          ,_0: A2(_op["::"],x,_p15)
                          ,_1: _p14} : {ctor: "_Tuple2"
                                       ,_0: _p15
                                       ,_1: A2(_op["::"],x,_p14)};
      });
      return A3(foldr,
      step,
      {ctor: "_Tuple2",_0: _U.list([]),_1: _U.list([])},
      list);
   });
   var unzip = function (pairs) {
      var step = F2(function (_p17,_p16) {
         var _p18 = _p17;
         var _p19 = _p16;
         return {ctor: "_Tuple2"
                ,_0: A2(_op["::"],_p18._0,_p19._0)
                ,_1: A2(_op["::"],_p18._1,_p19._1)};
      });
      return A3(foldr,
      step,
      {ctor: "_Tuple2",_0: _U.list([]),_1: _U.list([])},
      pairs);
   };
   var intersperse = F2(function (sep,xs) {
      var _p20 = xs;
      if (_p20.ctor === "[]") {
            return _U.list([]);
         } else {
            var step = F2(function (x,rest) {
               return A2(_op["::"],sep,A2(_op["::"],x,rest));
            });
            var spersed = A3(foldr,step,_U.list([]),_p20._1);
            return A2(_op["::"],_p20._0,spersed);
         }
   });
   var repeatHelp = F3(function (result,n,value) {
      repeatHelp: while (true) if (_U.cmp(n,0) < 1) return result;
      else {
            var _v18 = A2(_op["::"],value,result),
            _v19 = n - 1,
            _v20 = value;
            result = _v18;
            n = _v19;
            value = _v20;
            continue repeatHelp;
         }
   });
   var repeat = F2(function (n,value) {
      return A3(repeatHelp,_U.list([]),n,value);
   });
   return _elm.List.values = {_op: _op
                             ,isEmpty: isEmpty
                             ,length: length
                             ,reverse: reverse
                             ,member: member
                             ,head: head
                             ,tail: tail
                             ,filter: filter
                             ,take: take
                             ,drop: drop
                             ,repeat: repeat
                             ,append: append
                             ,concat: concat
                             ,intersperse: intersperse
                             ,partition: partition
                             ,unzip: unzip
                             ,map: map
                             ,map2: map2
                             ,map3: map3
                             ,map4: map4
                             ,map5: map5
                             ,filterMap: filterMap
                             ,concatMap: concatMap
                             ,indexedMap: indexedMap
                             ,foldr: foldr
                             ,foldl: foldl
                             ,sum: sum
                             ,product: product
                             ,maximum: maximum
                             ,minimum: minimum
                             ,all: all
                             ,any: any
                             ,scanl: scanl
                             ,sort: sort
                             ,sortBy: sortBy
                             ,sortWith: sortWith};
};
Elm.Native.Transform2D = {};
Elm.Native.Transform2D.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Transform2D = localRuntime.Native.Transform2D || {};
	if (localRuntime.Native.Transform2D.values)
	{
		return localRuntime.Native.Transform2D.values;
	}

	var A;
	if (typeof Float32Array === 'undefined')
	{
		A = function(arr)
		{
			this.length = arr.length;
			this[0] = arr[0];
			this[1] = arr[1];
			this[2] = arr[2];
			this[3] = arr[3];
			this[4] = arr[4];
			this[5] = arr[5];
		};
	}
	else
	{
		A = Float32Array;
	}

	// layout of matrix in an array is
	//
	//   | m11 m12 dx |
	//   | m21 m22 dy |
	//   |  0   0   1 |
	//
	//  new A([ m11, m12, dx, m21, m22, dy ])

	var identity = new A([1, 0, 0, 0, 1, 0]);
	function matrix(m11, m12, m21, m22, dx, dy)
	{
		return new A([m11, m12, dx, m21, m22, dy]);
	}

	function rotation(t)
	{
		var c = Math.cos(t);
		var s = Math.sin(t);
		return new A([c, -s, 0, s, c, 0]);
	}

	function rotate(t, m)
	{
		var c = Math.cos(t);
		var s = Math.sin(t);
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4];
		return new A([m11 * c + m12 * s, -m11 * s + m12 * c, m[2],
					  m21 * c + m22 * s, -m21 * s + m22 * c, m[5]]);
	}
	/*
	function move(xy,m) {
		var x = xy._0;
		var y = xy._1;
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4];
		return new A([m11, m12, m11*x + m12*y + m[2],
					  m21, m22, m21*x + m22*y + m[5]]);
	}
	function scale(s,m) { return new A([m[0]*s, m[1]*s, m[2], m[3]*s, m[4]*s, m[5]]); }
	function scaleX(x,m) { return new A([m[0]*x, m[1], m[2], m[3]*x, m[4], m[5]]); }
	function scaleY(y,m) { return new A([m[0], m[1]*y, m[2], m[3], m[4]*y, m[5]]); }
	function reflectX(m) { return new A([-m[0], m[1], m[2], -m[3], m[4], m[5]]); }
	function reflectY(m) { return new A([m[0], -m[1], m[2], m[3], -m[4], m[5]]); }

	function transform(m11, m21, m12, m22, mdx, mdy, n) {
		var n11 = n[0], n12 = n[1], n21 = n[3], n22 = n[4], ndx = n[2], ndy = n[5];
		return new A([m11*n11 + m12*n21,
					  m11*n12 + m12*n22,
					  m11*ndx + m12*ndy + mdx,
					  m21*n11 + m22*n21,
					  m21*n12 + m22*n22,
					  m21*ndx + m22*ndy + mdy]);
	}
	*/
	function multiply(m, n)
	{
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4], mdx = m[2], mdy = m[5];
		var n11 = n[0], n12 = n[1], n21 = n[3], n22 = n[4], ndx = n[2], ndy = n[5];
		return new A([m11 * n11 + m12 * n21,
					  m11 * n12 + m12 * n22,
					  m11 * ndx + m12 * ndy + mdx,
					  m21 * n11 + m22 * n21,
					  m21 * n12 + m22 * n22,
					  m21 * ndx + m22 * ndy + mdy]);
	}

	return localRuntime.Native.Transform2D.values = {
		identity: identity,
		matrix: F6(matrix),
		rotation: rotation,
		multiply: F2(multiply)
		/*
		transform: F7(transform),
		rotate: F2(rotate),
		move: F2(move),
		scale: F2(scale),
		scaleX: F2(scaleX),
		scaleY: F2(scaleY),
		reflectX: reflectX,
		reflectY: reflectY
		*/
	};
};

Elm.Transform2D = Elm.Transform2D || {};
Elm.Transform2D.make = function (_elm) {
   "use strict";
   _elm.Transform2D = _elm.Transform2D || {};
   if (_elm.Transform2D.values) return _elm.Transform2D.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Native$Transform2D = Elm.Native.Transform2D.make(_elm);
   var _op = {};
   var multiply = $Native$Transform2D.multiply;
   var rotation = $Native$Transform2D.rotation;
   var matrix = $Native$Transform2D.matrix;
   var translation = F2(function (x,y) {
      return A6(matrix,1,0,0,1,x,y);
   });
   var scale = function (s) {    return A6(matrix,s,0,0,s,0,0);};
   var scaleX = function (x) {    return A6(matrix,x,0,0,1,0,0);};
   var scaleY = function (y) {    return A6(matrix,1,0,0,y,0,0);};
   var identity = $Native$Transform2D.identity;
   var Transform2D = {ctor: "Transform2D"};
   return _elm.Transform2D.values = {_op: _op
                                    ,identity: identity
                                    ,matrix: matrix
                                    ,multiply: multiply
                                    ,rotation: rotation
                                    ,translation: translation
                                    ,scale: scale
                                    ,scaleX: scaleX
                                    ,scaleY: scaleY};
};

// setup
Elm.Native = Elm.Native || {};
Elm.Native.Graphics = Elm.Native.Graphics || {};
Elm.Native.Graphics.Collage = Elm.Native.Graphics.Collage || {};

// definition
Elm.Native.Graphics.Collage.make = function(localRuntime) {
	'use strict';

	// attempt to short-circuit
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Graphics = localRuntime.Native.Graphics || {};
	localRuntime.Native.Graphics.Collage = localRuntime.Native.Graphics.Collage || {};
	if ('values' in localRuntime.Native.Graphics.Collage)
	{
		return localRuntime.Native.Graphics.Collage.values;
	}

	// okay, we cannot short-ciruit, so now we define everything
	var Color = Elm.Native.Color.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var NativeElement = Elm.Native.Graphics.Element.make(localRuntime);
	var Transform = Elm.Transform2D.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);

	function setStrokeStyle(ctx, style)
	{
		ctx.lineWidth = style.width;

		var cap = style.cap.ctor;
		ctx.lineCap = cap === 'Flat'
			? 'butt'
			: cap === 'Round'
				? 'round'
				: 'square';

		var join = style.join.ctor;
		ctx.lineJoin = join === 'Smooth'
			? 'round'
			: join === 'Sharp'
				? 'miter'
				: 'bevel';

		ctx.miterLimit = style.join._0 || 10;
		ctx.strokeStyle = Color.toCss(style.color);
	}

	function setFillStyle(redo, ctx, style)
	{
		var sty = style.ctor;
		ctx.fillStyle = sty === 'Solid'
			? Color.toCss(style._0)
			: sty === 'Texture'
				? texture(redo, ctx, style._0)
				: gradient(ctx, style._0);
	}

	function trace(ctx, path)
	{
		var points = List.toArray(path);
		var i = points.length - 1;
		if (i <= 0)
		{
			return;
		}
		ctx.moveTo(points[i]._0, points[i]._1);
		while (i--)
		{
			ctx.lineTo(points[i]._0, points[i]._1);
		}
		if (path.closed)
		{
			i = points.length - 1;
			ctx.lineTo(points[i]._0, points[i]._1);
		}
	}

	function line(ctx, style, path)
	{
		if (style.dashing.ctor === '[]')
		{
			trace(ctx, path);
		}
		else
		{
			customLineHelp(ctx, style, path);
		}
		ctx.scale(1, -1);
		ctx.stroke();
	}

	function customLineHelp(ctx, style, path)
	{
		var points = List.toArray(path);
		if (path.closed)
		{
			points.push(points[0]);
		}
		var pattern = List.toArray(style.dashing);
		var i = points.length - 1;
		if (i <= 0)
		{
			return;
		}
		var x0 = points[i]._0, y0 = points[i]._1;
		var x1 = 0, y1 = 0, dx = 0, dy = 0, remaining = 0;
		var pindex = 0, plen = pattern.length;
		var draw = true, segmentLength = pattern[0];
		ctx.moveTo(x0, y0);
		while (i--)
		{
			x1 = points[i]._0;
			y1 = points[i]._1;
			dx = x1 - x0;
			dy = y1 - y0;
			remaining = Math.sqrt(dx * dx + dy * dy);
			while (segmentLength <= remaining)
			{
				x0 += dx * segmentLength / remaining;
				y0 += dy * segmentLength / remaining;
				ctx[draw ? 'lineTo' : 'moveTo'](x0, y0);
				// update starting position
				dx = x1 - x0;
				dy = y1 - y0;
				remaining = Math.sqrt(dx * dx + dy * dy);
				// update pattern
				draw = !draw;
				pindex = (pindex + 1) % plen;
				segmentLength = pattern[pindex];
			}
			if (remaining > 0)
			{
				ctx[draw ? 'lineTo' : 'moveTo'](x1, y1);
				segmentLength -= remaining;
			}
			x0 = x1;
			y0 = y1;
		}
	}

	function drawLine(ctx, style, path)
	{
		setStrokeStyle(ctx, style);
		return line(ctx, style, path);
	}

	function texture(redo, ctx, src)
	{
		var img = new Image();
		img.src = src;
		img.onload = redo;
		return ctx.createPattern(img, 'repeat');
	}

	function gradient(ctx, grad)
	{
		var g;
		var stops = [];
		if (grad.ctor === 'Linear')
		{
			var p0 = grad._0, p1 = grad._1;
			g = ctx.createLinearGradient(p0._0, -p0._1, p1._0, -p1._1);
			stops = List.toArray(grad._2);
		}
		else
		{
			var p0 = grad._0, p2 = grad._2;
			g = ctx.createRadialGradient(p0._0, -p0._1, grad._1, p2._0, -p2._1, grad._3);
			stops = List.toArray(grad._4);
		}
		var len = stops.length;
		for (var i = 0; i < len; ++i)
		{
			var stop = stops[i];
			g.addColorStop(stop._0, Color.toCss(stop._1));
		}
		return g;
	}

	function drawShape(redo, ctx, style, path)
	{
		trace(ctx, path);
		setFillStyle(redo, ctx, style);
		ctx.scale(1, -1);
		ctx.fill();
	}


	// TEXT RENDERING

	function fillText(redo, ctx, text)
	{
		drawText(ctx, text, ctx.fillText);
	}

	function strokeText(redo, ctx, style, text)
	{
		setStrokeStyle(ctx, style);
		// Use native canvas API for dashes only for text for now
		// Degrades to non-dashed on IE 9 + 10
		if (style.dashing.ctor !== '[]' && ctx.setLineDash)
		{
			var pattern = List.toArray(style.dashing);
			ctx.setLineDash(pattern);
		}
		drawText(ctx, text, ctx.strokeText);
	}

	function drawText(ctx, text, canvasDrawFn)
	{
		var textChunks = chunkText(defaultContext, text);

		var totalWidth = 0;
		var maxHeight = 0;
		var numChunks = textChunks.length;

		ctx.scale(1,-1);

		for (var i = numChunks; i--; )
		{
			var chunk = textChunks[i];
			ctx.font = chunk.font;
			var metrics = ctx.measureText(chunk.text);
			chunk.width = metrics.width;
			totalWidth += chunk.width;
			if (chunk.height > maxHeight)
			{
				maxHeight = chunk.height;
			}
		}

		var x = -totalWidth / 2.0;
		for (var i = 0; i < numChunks; ++i)
		{
			var chunk = textChunks[i];
			ctx.font = chunk.font;
			ctx.fillStyle = chunk.color;
			canvasDrawFn.call(ctx, chunk.text, x, maxHeight / 2);
			x += chunk.width;
		}
	}

	function toFont(props)
	{
		return [
			props['font-style'],
			props['font-variant'],
			props['font-weight'],
			props['font-size'],
			props['font-family']
		].join(' ');
	}


	// Convert the object returned by the text module
	// into something we can use for styling canvas text
	function chunkText(context, text)
	{
		var tag = text.ctor;
		if (tag === 'Text:Append')
		{
			var leftChunks = chunkText(context, text._0);
			var rightChunks = chunkText(context, text._1);
			return leftChunks.concat(rightChunks);
		}
		if (tag === 'Text:Text')
		{
			return [{
				text: text._0,
				color: context.color,
				height: context['font-size'].slice(0, -2) | 0,
				font: toFont(context)
			}];
		}
		if (tag === 'Text:Meta')
		{
			var newContext = freshContext(text._0, context);
			return chunkText(newContext, text._1);
		}
	}

	function freshContext(props, ctx)
	{
		return {
			'font-style': props['font-style'] || ctx['font-style'],
			'font-variant': props['font-variant'] || ctx['font-variant'],
			'font-weight': props['font-weight'] || ctx['font-weight'],
			'font-size': props['font-size'] || ctx['font-size'],
			'font-family': props['font-family'] || ctx['font-family'],
			'color': props['color'] || ctx['color']
		};
	}

	var defaultContext = {
		'font-style': 'normal',
		'font-variant': 'normal',
		'font-weight': 'normal',
		'font-size': '12px',
		'font-family': 'sans-serif',
		'color': 'black'
	};


	// IMAGES

	function drawImage(redo, ctx, form)
	{
		var img = new Image();
		img.onload = redo;
		img.src = form._3;
		var w = form._0,
			h = form._1,
			pos = form._2,
			srcX = pos._0,
			srcY = pos._1,
			srcW = w,
			srcH = h,
			destX = -w / 2,
			destY = -h / 2,
			destW = w,
			destH = h;

		ctx.scale(1, -1);
		ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
	}

	function renderForm(redo, ctx, form)
	{
		ctx.save();

		var x = form.x,
			y = form.y,
			theta = form.theta,
			scale = form.scale;

		if (x !== 0 || y !== 0)
		{
			ctx.translate(x, y);
		}
		if (theta !== 0)
		{
			ctx.rotate(theta % (Math.PI * 2));
		}
		if (scale !== 1)
		{
			ctx.scale(scale, scale);
		}
		if (form.alpha !== 1)
		{
			ctx.globalAlpha = ctx.globalAlpha * form.alpha;
		}

		ctx.beginPath();
		var f = form.form;
		switch (f.ctor)
		{
			case 'FPath':
				drawLine(ctx, f._0, f._1);
				break;

			case 'FImage':
				drawImage(redo, ctx, f);
				break;

			case 'FShape':
				if (f._0.ctor === 'Line')
				{
					f._1.closed = true;
					drawLine(ctx, f._0._0, f._1);
				}
				else
				{
					drawShape(redo, ctx, f._0._0, f._1);
				}
				break;

			case 'FText':
				fillText(redo, ctx, f._0);
				break;

			case 'FOutlinedText':
				strokeText(redo, ctx, f._0, f._1);
				break;
		}
		ctx.restore();
	}

	function formToMatrix(form)
	{
	   var scale = form.scale;
	   var matrix = A6( Transform.matrix, scale, 0, 0, scale, form.x, form.y );

	   var theta = form.theta;
	   if (theta !== 0)
	   {
		   matrix = A2( Transform.multiply, matrix, Transform.rotation(theta) );
	   }

	   return matrix;
	}

	function str(n)
	{
		if (n < 0.00001 && n > -0.00001)
		{
			return 0;
		}
		return n;
	}

	function makeTransform(w, h, form, matrices)
	{
		var props = form.form._0._0.props;
		var m = A6( Transform.matrix, 1, 0, 0, -1,
					(w - props.width ) / 2,
					(h - props.height) / 2 );
		var len = matrices.length;
		for (var i = 0; i < len; ++i)
		{
			m = A2( Transform.multiply, m, matrices[i] );
		}
		m = A2( Transform.multiply, m, formToMatrix(form) );

		return 'matrix(' +
			str( m[0]) + ', ' + str( m[3]) + ', ' +
			str(-m[1]) + ', ' + str(-m[4]) + ', ' +
			str( m[2]) + ', ' + str( m[5]) + ')';
	}

	function stepperHelp(list)
	{
		var arr = List.toArray(list);
		var i = 0;
		function peekNext()
		{
			return i < arr.length ? arr[i]._0.form.ctor : '';
		}
		// assumes that there is a next element
		function next()
		{
			var out = arr[i]._0;
			++i;
			return out;
		}
		return {
			peekNext: peekNext,
			next: next
		};
	}

	function formStepper(forms)
	{
		var ps = [stepperHelp(forms)];
		var matrices = [];
		var alphas = [];
		function peekNext()
		{
			var len = ps.length;
			var formType = '';
			for (var i = 0; i < len; ++i )
			{
				if (formType = ps[i].peekNext()) return formType;
			}
			return '';
		}
		// assumes that there is a next element
		function next(ctx)
		{
			while (!ps[0].peekNext())
			{
				ps.shift();
				matrices.pop();
				alphas.shift();
				if (ctx)
				{
					ctx.restore();
				}
			}
			var out = ps[0].next();
			var f = out.form;
			if (f.ctor === 'FGroup')
			{
				ps.unshift(stepperHelp(f._1));
				var m = A2(Transform.multiply, f._0, formToMatrix(out));
				ctx.save();
				ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
				matrices.push(m);

				var alpha = (alphas[0] || 1) * out.alpha;
				alphas.unshift(alpha);
				ctx.globalAlpha = alpha;
			}
			return out;
		}
		function transforms()
		{
			return matrices;
		}
		function alpha()
		{
			return alphas[0] || 1;
		}
		return {
			peekNext: peekNext,
			next: next,
			transforms: transforms,
			alpha: alpha
		};
	}

	function makeCanvas(w, h)
	{
		var canvas = NativeElement.createNode('canvas');
		canvas.style.width  = w + 'px';
		canvas.style.height = h + 'px';
		canvas.style.display = 'block';
		canvas.style.position = 'absolute';
		var ratio = window.devicePixelRatio || 1;
		canvas.width  = w * ratio;
		canvas.height = h * ratio;
		return canvas;
	}

	function render(model)
	{
		var div = NativeElement.createNode('div');
		div.style.overflow = 'hidden';
		div.style.position = 'relative';
		update(div, model, model);
		return div;
	}

	function nodeStepper(w, h, div)
	{
		var kids = div.childNodes;
		var i = 0;
		var ratio = window.devicePixelRatio || 1;

		function transform(transforms, ctx)
		{
			ctx.translate( w / 2 * ratio, h / 2 * ratio );
			ctx.scale( ratio, -ratio );
			var len = transforms.length;
			for (var i = 0; i < len; ++i)
			{
				var m = transforms[i];
				ctx.save();
				ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
			}
			return ctx;
		}
		function nextContext(transforms)
		{
			while (i < kids.length)
			{
				var node = kids[i];
				if (node.getContext)
				{
					node.width = w * ratio;
					node.height = h * ratio;
					node.style.width = w + 'px';
					node.style.height = h + 'px';
					++i;
					return transform(transforms, node.getContext('2d'));
				}
				div.removeChild(node);
			}
			var canvas = makeCanvas(w, h);
			div.appendChild(canvas);
			// we have added a new node, so we must step our position
			++i;
			return transform(transforms, canvas.getContext('2d'));
		}
		function addElement(matrices, alpha, form)
		{
			var kid = kids[i];
			var elem = form.form._0;

			var node = (!kid || kid.getContext)
				? NativeElement.render(elem)
				: NativeElement.update(kid, kid.oldElement, elem);

			node.style.position = 'absolute';
			node.style.opacity = alpha * form.alpha * elem._0.props.opacity;
			NativeElement.addTransform(node.style, makeTransform(w, h, form, matrices));
			node.oldElement = elem;
			++i;
			if (!kid)
			{
				div.appendChild(node);
			}
			else
			{
				div.insertBefore(node, kid);
			}
		}
		function clearRest()
		{
			while (i < kids.length)
			{
				div.removeChild(kids[i]);
			}
		}
		return {
			nextContext: nextContext,
			addElement: addElement,
			clearRest: clearRest
		};
	}


	function update(div, _, model)
	{
		var w = model.w;
		var h = model.h;

		var forms = formStepper(model.forms);
		var nodes = nodeStepper(w, h, div);
		var ctx = null;
		var formType = '';

		while (formType = forms.peekNext())
		{
			// make sure we have context if we need it
			if (ctx === null && formType !== 'FElement')
			{
				ctx = nodes.nextContext(forms.transforms());
				ctx.globalAlpha = forms.alpha();
			}

			var form = forms.next(ctx);
			// if it is FGroup, all updates are made within formStepper when next is called.
			if (formType === 'FElement')
			{
				// update or insert an element, get a new context
				nodes.addElement(forms.transforms(), forms.alpha(), form);
				ctx = null;
			}
			else if (formType !== 'FGroup')
			{
				renderForm(function() { update(div, model, model); }, ctx, form);
			}
		}
		nodes.clearRest();
		return div;
	}


	function collage(w, h, forms)
	{
		return A3(NativeElement.newElement, w, h, {
			ctor: 'Custom',
			type: 'Collage',
			render: render,
			update: update,
			model: {w: w, h: h, forms: forms}
		});
	}

	return localRuntime.Native.Graphics.Collage.values = {
		collage: F3(collage)
	};
};

Elm.Native.Color = {};
Elm.Native.Color.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Color = localRuntime.Native.Color || {};
	if (localRuntime.Native.Color.values)
	{
		return localRuntime.Native.Color.values;
	}

	function toCss(c)
	{
		var format = '';
		var colors = '';
		if (c.ctor === 'RGBA')
		{
			format = 'rgb';
			colors = c._0 + ', ' + c._1 + ', ' + c._2;
		}
		else
		{
			format = 'hsl';
			colors = (c._0 * 180 / Math.PI) + ', ' +
					 (c._1 * 100) + '%, ' +
					 (c._2 * 100) + '%';
		}
		if (c._3 === 1)
		{
			return format + '(' + colors + ')';
		}
		else
		{
			return format + 'a(' + colors + ', ' + c._3 + ')';
		}
	}

	return localRuntime.Native.Color.values = {
		toCss: toCss
	};
};

Elm.Color = Elm.Color || {};
Elm.Color.make = function (_elm) {
   "use strict";
   _elm.Color = _elm.Color || {};
   if (_elm.Color.values) return _elm.Color.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm);
   var _op = {};
   var Radial = F5(function (a,b,c,d,e) {
      return {ctor: "Radial",_0: a,_1: b,_2: c,_3: d,_4: e};
   });
   var radial = Radial;
   var Linear = F3(function (a,b,c) {
      return {ctor: "Linear",_0: a,_1: b,_2: c};
   });
   var linear = Linear;
   var fmod = F2(function (f,n) {
      var integer = $Basics.floor(f);
      return $Basics.toFloat(A2($Basics._op["%"],
      integer,
      n)) + f - $Basics.toFloat(integer);
   });
   var rgbToHsl = F3(function (red,green,blue) {
      var b = $Basics.toFloat(blue) / 255;
      var g = $Basics.toFloat(green) / 255;
      var r = $Basics.toFloat(red) / 255;
      var cMax = A2($Basics.max,A2($Basics.max,r,g),b);
      var cMin = A2($Basics.min,A2($Basics.min,r,g),b);
      var c = cMax - cMin;
      var lightness = (cMax + cMin) / 2;
      var saturation = _U.eq(lightness,
      0) ? 0 : c / (1 - $Basics.abs(2 * lightness - 1));
      var hue = $Basics.degrees(60) * (_U.eq(cMax,r) ? A2(fmod,
      (g - b) / c,
      6) : _U.eq(cMax,g) ? (b - r) / c + 2 : (r - g) / c + 4);
      return {ctor: "_Tuple3",_0: hue,_1: saturation,_2: lightness};
   });
   var hslToRgb = F3(function (hue,saturation,lightness) {
      var hue$ = hue / $Basics.degrees(60);
      var chroma = (1 - $Basics.abs(2 * lightness - 1)) * saturation;
      var x = chroma * (1 - $Basics.abs(A2(fmod,hue$,2) - 1));
      var _p0 = _U.cmp(hue$,0) < 0 ? {ctor: "_Tuple3"
                                     ,_0: 0
                                     ,_1: 0
                                     ,_2: 0} : _U.cmp(hue$,1) < 0 ? {ctor: "_Tuple3"
                                                                    ,_0: chroma
                                                                    ,_1: x
                                                                    ,_2: 0} : _U.cmp(hue$,2) < 0 ? {ctor: "_Tuple3"
                                                                                                   ,_0: x
                                                                                                   ,_1: chroma
                                                                                                   ,_2: 0} : _U.cmp(hue$,3) < 0 ? {ctor: "_Tuple3"
                                                                                                                                  ,_0: 0
                                                                                                                                  ,_1: chroma
                                                                                                                                  ,_2: x} : _U.cmp(hue$,
      4) < 0 ? {ctor: "_Tuple3",_0: 0,_1: x,_2: chroma} : _U.cmp(hue$,
      5) < 0 ? {ctor: "_Tuple3",_0: x,_1: 0,_2: chroma} : _U.cmp(hue$,
      6) < 0 ? {ctor: "_Tuple3"
               ,_0: chroma
               ,_1: 0
               ,_2: x} : {ctor: "_Tuple3",_0: 0,_1: 0,_2: 0};
      var r = _p0._0;
      var g = _p0._1;
      var b = _p0._2;
      var m = lightness - chroma / 2;
      return {ctor: "_Tuple3",_0: r + m,_1: g + m,_2: b + m};
   });
   var toRgb = function (color) {
      var _p1 = color;
      if (_p1.ctor === "RGBA") {
            return {red: _p1._0
                   ,green: _p1._1
                   ,blue: _p1._2
                   ,alpha: _p1._3};
         } else {
            var _p2 = A3(hslToRgb,_p1._0,_p1._1,_p1._2);
            var r = _p2._0;
            var g = _p2._1;
            var b = _p2._2;
            return {red: $Basics.round(255 * r)
                   ,green: $Basics.round(255 * g)
                   ,blue: $Basics.round(255 * b)
                   ,alpha: _p1._3};
         }
   };
   var toHsl = function (color) {
      var _p3 = color;
      if (_p3.ctor === "HSLA") {
            return {hue: _p3._0
                   ,saturation: _p3._1
                   ,lightness: _p3._2
                   ,alpha: _p3._3};
         } else {
            var _p4 = A3(rgbToHsl,_p3._0,_p3._1,_p3._2);
            var h = _p4._0;
            var s = _p4._1;
            var l = _p4._2;
            return {hue: h,saturation: s,lightness: l,alpha: _p3._3};
         }
   };
   var HSLA = F4(function (a,b,c,d) {
      return {ctor: "HSLA",_0: a,_1: b,_2: c,_3: d};
   });
   var hsla = F4(function (hue,saturation,lightness,alpha) {
      return A4(HSLA,
      hue - $Basics.turns($Basics.toFloat($Basics.floor(hue / (2 * $Basics.pi)))),
      saturation,
      lightness,
      alpha);
   });
   var hsl = F3(function (hue,saturation,lightness) {
      return A4(hsla,hue,saturation,lightness,1);
   });
   var complement = function (color) {
      var _p5 = color;
      if (_p5.ctor === "HSLA") {
            return A4(hsla,
            _p5._0 + $Basics.degrees(180),
            _p5._1,
            _p5._2,
            _p5._3);
         } else {
            var _p6 = A3(rgbToHsl,_p5._0,_p5._1,_p5._2);
            var h = _p6._0;
            var s = _p6._1;
            var l = _p6._2;
            return A4(hsla,h + $Basics.degrees(180),s,l,_p5._3);
         }
   };
   var grayscale = function (p) {    return A4(HSLA,0,0,1 - p,1);};
   var greyscale = function (p) {    return A4(HSLA,0,0,1 - p,1);};
   var RGBA = F4(function (a,b,c,d) {
      return {ctor: "RGBA",_0: a,_1: b,_2: c,_3: d};
   });
   var rgba = RGBA;
   var rgb = F3(function (r,g,b) {    return A4(RGBA,r,g,b,1);});
   var lightRed = A4(RGBA,239,41,41,1);
   var red = A4(RGBA,204,0,0,1);
   var darkRed = A4(RGBA,164,0,0,1);
   var lightOrange = A4(RGBA,252,175,62,1);
   var orange = A4(RGBA,245,121,0,1);
   var darkOrange = A4(RGBA,206,92,0,1);
   var lightYellow = A4(RGBA,255,233,79,1);
   var yellow = A4(RGBA,237,212,0,1);
   var darkYellow = A4(RGBA,196,160,0,1);
   var lightGreen = A4(RGBA,138,226,52,1);
   var green = A4(RGBA,115,210,22,1);
   var darkGreen = A4(RGBA,78,154,6,1);
   var lightBlue = A4(RGBA,114,159,207,1);
   var blue = A4(RGBA,52,101,164,1);
   var darkBlue = A4(RGBA,32,74,135,1);
   var lightPurple = A4(RGBA,173,127,168,1);
   var purple = A4(RGBA,117,80,123,1);
   var darkPurple = A4(RGBA,92,53,102,1);
   var lightBrown = A4(RGBA,233,185,110,1);
   var brown = A4(RGBA,193,125,17,1);
   var darkBrown = A4(RGBA,143,89,2,1);
   var black = A4(RGBA,0,0,0,1);
   var white = A4(RGBA,255,255,255,1);
   var lightGrey = A4(RGBA,238,238,236,1);
   var grey = A4(RGBA,211,215,207,1);
   var darkGrey = A4(RGBA,186,189,182,1);
   var lightGray = A4(RGBA,238,238,236,1);
   var gray = A4(RGBA,211,215,207,1);
   var darkGray = A4(RGBA,186,189,182,1);
   var lightCharcoal = A4(RGBA,136,138,133,1);
   var charcoal = A4(RGBA,85,87,83,1);
   var darkCharcoal = A4(RGBA,46,52,54,1);
   return _elm.Color.values = {_op: _op
                              ,rgb: rgb
                              ,rgba: rgba
                              ,hsl: hsl
                              ,hsla: hsla
                              ,greyscale: greyscale
                              ,grayscale: grayscale
                              ,complement: complement
                              ,linear: linear
                              ,radial: radial
                              ,toRgb: toRgb
                              ,toHsl: toHsl
                              ,red: red
                              ,orange: orange
                              ,yellow: yellow
                              ,green: green
                              ,blue: blue
                              ,purple: purple
                              ,brown: brown
                              ,lightRed: lightRed
                              ,lightOrange: lightOrange
                              ,lightYellow: lightYellow
                              ,lightGreen: lightGreen
                              ,lightBlue: lightBlue
                              ,lightPurple: lightPurple
                              ,lightBrown: lightBrown
                              ,darkRed: darkRed
                              ,darkOrange: darkOrange
                              ,darkYellow: darkYellow
                              ,darkGreen: darkGreen
                              ,darkBlue: darkBlue
                              ,darkPurple: darkPurple
                              ,darkBrown: darkBrown
                              ,white: white
                              ,lightGrey: lightGrey
                              ,grey: grey
                              ,darkGrey: darkGrey
                              ,lightCharcoal: lightCharcoal
                              ,charcoal: charcoal
                              ,darkCharcoal: darkCharcoal
                              ,black: black
                              ,lightGray: lightGray
                              ,gray: gray
                              ,darkGray: darkGray};
};

// setup
Elm.Native = Elm.Native || {};
Elm.Native.Graphics = Elm.Native.Graphics || {};
Elm.Native.Graphics.Element = Elm.Native.Graphics.Element || {};

// definition
Elm.Native.Graphics.Element.make = function(localRuntime) {
	'use strict';

	// attempt to short-circuit
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Graphics = localRuntime.Native.Graphics || {};
	localRuntime.Native.Graphics.Element = localRuntime.Native.Graphics.Element || {};
	if ('values' in localRuntime.Native.Graphics.Element)
	{
		return localRuntime.Native.Graphics.Element.values;
	}

	var Color = Elm.Native.Color.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Text = Elm.Native.Text.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	// CREATION

	var createNode =
		typeof document === 'undefined'
			?
				function(_)
				{
					return {
						style: {},
						appendChild: function() {}
					};
				}
			:
				function(elementType)
				{
					var node = document.createElement(elementType);
					node.style.padding = '0';
					node.style.margin = '0';
					return node;
				}
			;


	function newElement(width, height, elementPrim)
	{
		return {
			ctor: 'Element_elm_builtin',
			_0: {
				element: elementPrim,
				props: {
					id: Utils.guid(),
					width: width,
					height: height,
					opacity: 1,
					color: Maybe.Nothing,
					href: '',
					tag: '',
					hover: Utils.Tuple0,
					click: Utils.Tuple0
				}
			}
		};
	}


	// PROPERTIES

	function setProps(elem, node)
	{
		var props = elem.props;

		var element = elem.element;
		var width = props.width - (element.adjustWidth || 0);
		var height = props.height - (element.adjustHeight || 0);
		node.style.width  = (width | 0) + 'px';
		node.style.height = (height | 0) + 'px';

		if (props.opacity !== 1)
		{
			node.style.opacity = props.opacity;
		}

		if (props.color.ctor === 'Just')
		{
			node.style.backgroundColor = Color.toCss(props.color._0);
		}

		if (props.tag !== '')
		{
			node.id = props.tag;
		}

		if (props.hover.ctor !== '_Tuple0')
		{
			addHover(node, props.hover);
		}

		if (props.click.ctor !== '_Tuple0')
		{
			addClick(node, props.click);
		}

		if (props.href !== '')
		{
			var anchor = createNode('a');
			anchor.href = props.href;
			anchor.style.display = 'block';
			anchor.style.pointerEvents = 'auto';
			anchor.appendChild(node);
			node = anchor;
		}

		return node;
	}

	function addClick(e, handler)
	{
		e.style.pointerEvents = 'auto';
		e.elm_click_handler = handler;
		function trigger(ev)
		{
			e.elm_click_handler(Utils.Tuple0);
			ev.stopPropagation();
		}
		e.elm_click_trigger = trigger;
		e.addEventListener('click', trigger);
	}

	function removeClick(e, handler)
	{
		if (e.elm_click_trigger)
		{
			e.removeEventListener('click', e.elm_click_trigger);
			e.elm_click_trigger = null;
			e.elm_click_handler = null;
		}
	}

	function addHover(e, handler)
	{
		e.style.pointerEvents = 'auto';
		e.elm_hover_handler = handler;
		e.elm_hover_count = 0;

		function over(evt)
		{
			if (e.elm_hover_count++ > 0) return;
			e.elm_hover_handler(true);
			evt.stopPropagation();
		}
		function out(evt)
		{
			if (e.contains(evt.toElement || evt.relatedTarget)) return;
			e.elm_hover_count = 0;
			e.elm_hover_handler(false);
			evt.stopPropagation();
		}
		e.elm_hover_over = over;
		e.elm_hover_out = out;
		e.addEventListener('mouseover', over);
		e.addEventListener('mouseout', out);
	}

	function removeHover(e)
	{
		e.elm_hover_handler = null;
		if (e.elm_hover_over)
		{
			e.removeEventListener('mouseover', e.elm_hover_over);
			e.elm_hover_over = null;
		}
		if (e.elm_hover_out)
		{
			e.removeEventListener('mouseout', e.elm_hover_out);
			e.elm_hover_out = null;
		}
	}


	// IMAGES

	function image(props, img)
	{
		switch (img._0.ctor)
		{
			case 'Plain':
				return plainImage(img._3);

			case 'Fitted':
				return fittedImage(props.width, props.height, img._3);

			case 'Cropped':
				return croppedImage(img, props.width, props.height, img._3);

			case 'Tiled':
				return tiledImage(img._3);
		}
	}

	function plainImage(src)
	{
		var img = createNode('img');
		img.src = src;
		img.name = src;
		img.style.display = 'block';
		return img;
	}

	function tiledImage(src)
	{
		var div = createNode('div');
		div.style.backgroundImage = 'url(' + src + ')';
		return div;
	}

	function fittedImage(w, h, src)
	{
		var div = createNode('div');
		div.style.background = 'url(' + src + ') no-repeat center';
		div.style.webkitBackgroundSize = 'cover';
		div.style.MozBackgroundSize = 'cover';
		div.style.OBackgroundSize = 'cover';
		div.style.backgroundSize = 'cover';
		return div;
	}

	function croppedImage(elem, w, h, src)
	{
		var pos = elem._0._0;
		var e = createNode('div');
		e.style.overflow = 'hidden';

		var img = createNode('img');
		img.onload = function() {
			var sw = w / elem._1, sh = h / elem._2;
			img.style.width = ((this.width * sw) | 0) + 'px';
			img.style.height = ((this.height * sh) | 0) + 'px';
			img.style.marginLeft = ((- pos._0 * sw) | 0) + 'px';
			img.style.marginTop = ((- pos._1 * sh) | 0) + 'px';
		};
		img.src = src;
		img.name = src;
		e.appendChild(img);
		return e;
	}


	// FLOW

	function goOut(node)
	{
		node.style.position = 'absolute';
		return node;
	}
	function goDown(node)
	{
		return node;
	}
	function goRight(node)
	{
		node.style.styleFloat = 'left';
		node.style.cssFloat = 'left';
		return node;
	}

	var directionTable = {
		DUp: goDown,
		DDown: goDown,
		DLeft: goRight,
		DRight: goRight,
		DIn: goOut,
		DOut: goOut
	};
	function needsReversal(dir)
	{
		return dir === 'DUp' || dir === 'DLeft' || dir === 'DIn';
	}

	function flow(dir, elist)
	{
		var array = List.toArray(elist);
		var container = createNode('div');
		var goDir = directionTable[dir];
		if (goDir === goOut)
		{
			container.style.pointerEvents = 'none';
		}
		if (needsReversal(dir))
		{
			array.reverse();
		}
		var len = array.length;
		for (var i = 0; i < len; ++i)
		{
			container.appendChild(goDir(render(array[i])));
		}
		return container;
	}


	// CONTAINER

	function toPos(pos)
	{
		return pos.ctor === 'Absolute'
			? pos._0 + 'px'
			: (pos._0 * 100) + '%';
	}

	// must clear right, left, top, bottom, and transform
	// before calling this function
	function setPos(pos, wrappedElement, e)
	{
		var elem = wrappedElement._0;
		var element = elem.element;
		var props = elem.props;
		var w = props.width + (element.adjustWidth ? element.adjustWidth : 0);
		var h = props.height + (element.adjustHeight ? element.adjustHeight : 0);

		e.style.position = 'absolute';
		e.style.margin = 'auto';
		var transform = '';

		switch (pos.horizontal.ctor)
		{
			case 'P':
				e.style.right = toPos(pos.x);
				e.style.removeProperty('left');
				break;

			case 'Z':
				transform = 'translateX(' + ((-w / 2) | 0) + 'px) ';

			case 'N':
				e.style.left = toPos(pos.x);
				e.style.removeProperty('right');
				break;
		}
		switch (pos.vertical.ctor)
		{
			case 'N':
				e.style.bottom = toPos(pos.y);
				e.style.removeProperty('top');
				break;

			case 'Z':
				transform += 'translateY(' + ((-h / 2) | 0) + 'px)';

			case 'P':
				e.style.top = toPos(pos.y);
				e.style.removeProperty('bottom');
				break;
		}
		if (transform !== '')
		{
			addTransform(e.style, transform);
		}
		return e;
	}

	function addTransform(style, transform)
	{
		style.transform       = transform;
		style.msTransform     = transform;
		style.MozTransform    = transform;
		style.webkitTransform = transform;
		style.OTransform      = transform;
	}

	function container(pos, elem)
	{
		var e = render(elem);
		setPos(pos, elem, e);
		var div = createNode('div');
		div.style.position = 'relative';
		div.style.overflow = 'hidden';
		div.appendChild(e);
		return div;
	}


	function rawHtml(elem)
	{
		var html = elem.html;
		var align = elem.align;

		var div = createNode('div');
		div.innerHTML = html;
		div.style.visibility = 'hidden';
		if (align)
		{
			div.style.textAlign = align;
		}
		div.style.visibility = 'visible';
		div.style.pointerEvents = 'auto';
		return div;
	}


	// RENDER

	function render(wrappedElement)
	{
		var elem = wrappedElement._0;
		return setProps(elem, makeElement(elem));
	}

	function makeElement(e)
	{
		var elem = e.element;
		switch (elem.ctor)
		{
			case 'Image':
				return image(e.props, elem);

			case 'Flow':
				return flow(elem._0.ctor, elem._1);

			case 'Container':
				return container(elem._0, elem._1);

			case 'Spacer':
				return createNode('div');

			case 'RawHtml':
				return rawHtml(elem);

			case 'Custom':
				return elem.render(elem.model);
		}
	}

	function updateAndReplace(node, curr, next)
	{
		var newNode = update(node, curr, next);
		if (newNode !== node)
		{
			node.parentNode.replaceChild(newNode, node);
		}
		return newNode;
	}


	// UPDATE

	function update(node, wrappedCurrent, wrappedNext)
	{
		var curr = wrappedCurrent._0;
		var next = wrappedNext._0;
		var rootNode = node;
		if (node.tagName === 'A')
		{
			node = node.firstChild;
		}
		if (curr.props.id === next.props.id)
		{
			updateProps(node, curr, next);
			return rootNode;
		}
		if (curr.element.ctor !== next.element.ctor)
		{
			return render(wrappedNext);
		}
		var nextE = next.element;
		var currE = curr.element;
		switch (nextE.ctor)
		{
			case 'Spacer':
				updateProps(node, curr, next);
				return rootNode;

			case 'RawHtml':
				if(currE.html.valueOf() !== nextE.html.valueOf())
				{
					node.innerHTML = nextE.html;
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Image':
				if (nextE._0.ctor === 'Plain')
				{
					if (nextE._3 !== currE._3)
					{
						node.src = nextE._3;
					}
				}
				else if (!Utils.eq(nextE, currE)
					|| next.props.width !== curr.props.width
					|| next.props.height !== curr.props.height)
				{
					return render(wrappedNext);
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Flow':
				var arr = List.toArray(nextE._1);
				for (var i = arr.length; i--; )
				{
					arr[i] = arr[i]._0.element.ctor;
				}
				if (nextE._0.ctor !== currE._0.ctor)
				{
					return render(wrappedNext);
				}
				var nexts = List.toArray(nextE._1);
				var kids = node.childNodes;
				if (nexts.length !== kids.length)
				{
					return render(wrappedNext);
				}
				var currs = List.toArray(currE._1);
				var dir = nextE._0.ctor;
				var goDir = directionTable[dir];
				var toReverse = needsReversal(dir);
				var len = kids.length;
				for (var i = len; i--; )
				{
					var subNode = kids[toReverse ? len - i - 1 : i];
					goDir(updateAndReplace(subNode, currs[i], nexts[i]));
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Container':
				var subNode = node.firstChild;
				var newSubNode = updateAndReplace(subNode, currE._1, nextE._1);
				setPos(nextE._0, nextE._1, newSubNode);
				updateProps(node, curr, next);
				return rootNode;

			case 'Custom':
				if (currE.type === nextE.type)
				{
					var updatedNode = nextE.update(node, currE.model, nextE.model);
					updateProps(updatedNode, curr, next);
					return updatedNode;
				}
				return render(wrappedNext);
		}
	}

	function updateProps(node, curr, next)
	{
		var nextProps = next.props;
		var currProps = curr.props;

		var element = next.element;
		var width = nextProps.width - (element.adjustWidth || 0);
		var height = nextProps.height - (element.adjustHeight || 0);
		if (width !== currProps.width)
		{
			node.style.width = (width | 0) + 'px';
		}
		if (height !== currProps.height)
		{
			node.style.height = (height | 0) + 'px';
		}

		if (nextProps.opacity !== currProps.opacity)
		{
			node.style.opacity = nextProps.opacity;
		}

		var nextColor = nextProps.color.ctor === 'Just'
			? Color.toCss(nextProps.color._0)
			: '';
		if (node.style.backgroundColor !== nextColor)
		{
			node.style.backgroundColor = nextColor;
		}

		if (nextProps.tag !== currProps.tag)
		{
			node.id = nextProps.tag;
		}

		if (nextProps.href !== currProps.href)
		{
			if (currProps.href === '')
			{
				// add a surrounding href
				var anchor = createNode('a');
				anchor.href = nextProps.href;
				anchor.style.display = 'block';
				anchor.style.pointerEvents = 'auto';

				node.parentNode.replaceChild(anchor, node);
				anchor.appendChild(node);
			}
			else if (nextProps.href === '')
			{
				// remove the surrounding href
				var anchor = node.parentNode;
				anchor.parentNode.replaceChild(node, anchor);
			}
			else
			{
				// just update the link
				node.parentNode.href = nextProps.href;
			}
		}

		// update click and hover handlers
		var removed = false;

		// update hover handlers
		if (currProps.hover.ctor === '_Tuple0')
		{
			if (nextProps.hover.ctor !== '_Tuple0')
			{
				addHover(node, nextProps.hover);
			}
		}
		else
		{
			if (nextProps.hover.ctor === '_Tuple0')
			{
				removed = true;
				removeHover(node);
			}
			else
			{
				node.elm_hover_handler = nextProps.hover;
			}
		}

		// update click handlers
		if (currProps.click.ctor === '_Tuple0')
		{
			if (nextProps.click.ctor !== '_Tuple0')
			{
				addClick(node, nextProps.click);
			}
		}
		else
		{
			if (nextProps.click.ctor === '_Tuple0')
			{
				removed = true;
				removeClick(node);
			}
			else
			{
				node.elm_click_handler = nextProps.click;
			}
		}

		// stop capturing clicks if
		if (removed
			&& nextProps.hover.ctor === '_Tuple0'
			&& nextProps.click.ctor === '_Tuple0')
		{
			node.style.pointerEvents = 'none';
		}
	}


	// TEXT

	function block(align)
	{
		return function(text)
		{
			var raw = {
				ctor: 'RawHtml',
				html: Text.renderHtml(text),
				align: align
			};
			var pos = htmlHeight(0, raw);
			return newElement(pos._0, pos._1, raw);
		};
	}

	function markdown(text)
	{
		var raw = {
			ctor: 'RawHtml',
			html: text,
			align: null
		};
		var pos = htmlHeight(0, raw);
		return newElement(pos._0, pos._1, raw);
	}

	var htmlHeight =
		typeof document !== 'undefined'
			? realHtmlHeight
			: function(a, b) { return Utils.Tuple2(0, 0); };

	function realHtmlHeight(width, rawHtml)
	{
		// create dummy node
		var temp = document.createElement('div');
		temp.innerHTML = rawHtml.html;
		if (width > 0)
		{
			temp.style.width = width + 'px';
		}
		temp.style.visibility = 'hidden';
		temp.style.styleFloat = 'left';
		temp.style.cssFloat = 'left';

		document.body.appendChild(temp);

		// get dimensions
		var style = window.getComputedStyle(temp, null);
		var w = Math.ceil(style.getPropertyValue('width').slice(0, -2) - 0);
		var h = Math.ceil(style.getPropertyValue('height').slice(0, -2) - 0);
		document.body.removeChild(temp);
		return Utils.Tuple2(w, h);
	}


	return localRuntime.Native.Graphics.Element.values = {
		render: render,
		update: update,
		updateAndReplace: updateAndReplace,

		createNode: createNode,
		newElement: F3(newElement),
		addTransform: addTransform,
		htmlHeight: F2(htmlHeight),
		guid: Utils.guid,

		block: block,
		markdown: markdown
	};
};

Elm.Native.Text = {};
Elm.Native.Text.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Text = localRuntime.Native.Text || {};
	if (localRuntime.Native.Text.values)
	{
		return localRuntime.Native.Text.values;
	}

	var toCss = Elm.Native.Color.make(localRuntime).toCss;
	var List = Elm.Native.List.make(localRuntime);


	// CONSTRUCTORS

	function fromString(str)
	{
		return {
			ctor: 'Text:Text',
			_0: str
		};
	}

	function append(a, b)
	{
		return {
			ctor: 'Text:Append',
			_0: a,
			_1: b
		};
	}

	function addMeta(field, value, text)
	{
		var newProps = {};
		var newText = {
			ctor: 'Text:Meta',
			_0: newProps,
			_1: text
		};

		if (text.ctor === 'Text:Meta')
		{
			newText._1 = text._1;
			var props = text._0;
			for (var i = metaKeys.length; i--; )
			{
				var key = metaKeys[i];
				var val = props[key];
				if (val)
				{
					newProps[key] = val;
				}
			}
		}
		newProps[field] = value;
		return newText;
	}

	var metaKeys = [
		'font-size',
		'font-family',
		'font-style',
		'font-weight',
		'href',
		'text-decoration',
		'color'
	];


	// conversions from Elm values to CSS

	function toTypefaces(list)
	{
		var typefaces = List.toArray(list);
		for (var i = typefaces.length; i--; )
		{
			var typeface = typefaces[i];
			if (typeface.indexOf(' ') > -1)
			{
				typefaces[i] = "'" + typeface + "'";
			}
		}
		return typefaces.join(',');
	}

	function toLine(line)
	{
		var ctor = line.ctor;
		return ctor === 'Under'
			? 'underline'
			: ctor === 'Over'
				? 'overline'
				: 'line-through';
	}

	// setting styles of Text

	function style(style, text)
	{
		var newText = addMeta('color', toCss(style.color), text);
		var props = newText._0;

		if (style.typeface.ctor !== '[]')
		{
			props['font-family'] = toTypefaces(style.typeface);
		}
		if (style.height.ctor !== 'Nothing')
		{
			props['font-size'] = style.height._0 + 'px';
		}
		if (style.bold)
		{
			props['font-weight'] = 'bold';
		}
		if (style.italic)
		{
			props['font-style'] = 'italic';
		}
		if (style.line.ctor !== 'Nothing')
		{
			props['text-decoration'] = toLine(style.line._0);
		}
		return newText;
	}

	function height(px, text)
	{
		return addMeta('font-size', px + 'px', text);
	}

	function typeface(names, text)
	{
		return addMeta('font-family', toTypefaces(names), text);
	}

	function monospace(text)
	{
		return addMeta('font-family', 'monospace', text);
	}

	function italic(text)
	{
		return addMeta('font-style', 'italic', text);
	}

	function bold(text)
	{
		return addMeta('font-weight', 'bold', text);
	}

	function link(href, text)
	{
		return addMeta('href', href, text);
	}

	function line(line, text)
	{
		return addMeta('text-decoration', toLine(line), text);
	}

	function color(color, text)
	{
		return addMeta('color', toCss(color), text);
	}


	// RENDER

	function renderHtml(text)
	{
		var tag = text.ctor;
		if (tag === 'Text:Append')
		{
			return renderHtml(text._0) + renderHtml(text._1);
		}
		if (tag === 'Text:Text')
		{
			return properEscape(text._0);
		}
		if (tag === 'Text:Meta')
		{
			return renderMeta(text._0, renderHtml(text._1));
		}
	}

	function renderMeta(metas, string)
	{
		var href = metas.href;
		if (href)
		{
			string = '<a href="' + href + '">' + string + '</a>';
		}
		var styles = '';
		for (var key in metas)
		{
			if (key === 'href')
			{
				continue;
			}
			styles += key + ':' + metas[key] + ';';
		}
		if (styles)
		{
			string = '<span style="' + styles + '">' + string + '</span>';
		}
		return string;
	}

	function properEscape(str)
	{
		if (str.length === 0)
		{
			return str;
		}
		str = str //.replace(/&/g,  '&#38;')
			.replace(/"/g,  '&#34;')
			.replace(/'/g,  '&#39;')
			.replace(/</g,  '&#60;')
			.replace(/>/g,  '&#62;');
		var arr = str.split('\n');
		for (var i = arr.length; i--; )
		{
			arr[i] = makeSpaces(arr[i]);
		}
		return arr.join('<br/>');
	}

	function makeSpaces(s)
	{
		if (s.length === 0)
		{
			return s;
		}
		var arr = s.split('');
		if (arr[0] === ' ')
		{
			arr[0] = '&nbsp;';
		}
		for (var i = arr.length; --i; )
		{
			if (arr[i][0] === ' ' && arr[i - 1] === ' ')
			{
				arr[i - 1] = arr[i - 1] + arr[i];
				arr[i] = '';
			}
		}
		for (var i = arr.length; i--; )
		{
			if (arr[i].length > 1 && arr[i][0] === ' ')
			{
				var spaces = arr[i].split('');
				for (var j = spaces.length - 2; j >= 0; j -= 2)
				{
					spaces[j] = '&nbsp;';
				}
				arr[i] = spaces.join('');
			}
		}
		arr = arr.join('');
		if (arr[arr.length - 1] === ' ')
		{
			return arr.slice(0, -1) + '&nbsp;';
		}
		return arr;
	}


	return localRuntime.Native.Text.values = {
		fromString: fromString,
		append: F2(append),

		height: F2(height),
		italic: italic,
		bold: bold,
		line: F2(line),
		monospace: monospace,
		typeface: F2(typeface),
		color: F2(color),
		link: F2(link),
		style: F2(style),

		toTypefaces: toTypefaces,
		toLine: toLine,
		renderHtml: renderHtml
	};
};

Elm.Text = Elm.Text || {};
Elm.Text.make = function (_elm) {
   "use strict";
   _elm.Text = _elm.Text || {};
   if (_elm.Text.values) return _elm.Text.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Color = Elm.Color.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Text = Elm.Native.Text.make(_elm);
   var _op = {};
   var line = $Native$Text.line;
   var italic = $Native$Text.italic;
   var bold = $Native$Text.bold;
   var color = $Native$Text.color;
   var height = $Native$Text.height;
   var link = $Native$Text.link;
   var monospace = $Native$Text.monospace;
   var typeface = $Native$Text.typeface;
   var style = $Native$Text.style;
   var append = $Native$Text.append;
   var fromString = $Native$Text.fromString;
   var empty = fromString("");
   var concat = function (texts) {
      return A3($List.foldr,append,empty,texts);
   };
   var join = F2(function (seperator,texts) {
      return concat(A2($List.intersperse,seperator,texts));
   });
   var defaultStyle = {typeface: _U.list([])
                      ,height: $Maybe.Nothing
                      ,color: $Color.black
                      ,bold: false
                      ,italic: false
                      ,line: $Maybe.Nothing};
   var Style = F6(function (a,b,c,d,e,f) {
      return {typeface: a
             ,height: b
             ,color: c
             ,bold: d
             ,italic: e
             ,line: f};
   });
   var Through = {ctor: "Through"};
   var Over = {ctor: "Over"};
   var Under = {ctor: "Under"};
   var Text = {ctor: "Text"};
   return _elm.Text.values = {_op: _op
                             ,fromString: fromString
                             ,empty: empty
                             ,append: append
                             ,concat: concat
                             ,join: join
                             ,link: link
                             ,style: style
                             ,defaultStyle: defaultStyle
                             ,typeface: typeface
                             ,monospace: monospace
                             ,height: height
                             ,color: color
                             ,bold: bold
                             ,italic: italic
                             ,line: line
                             ,Style: Style
                             ,Under: Under
                             ,Over: Over
                             ,Through: Through};
};
Elm.Graphics = Elm.Graphics || {};
Elm.Graphics.Element = Elm.Graphics.Element || {};
Elm.Graphics.Element.make = function (_elm) {
   "use strict";
   _elm.Graphics = _elm.Graphics || {};
   _elm.Graphics.Element = _elm.Graphics.Element || {};
   if (_elm.Graphics.Element.values)
   return _elm.Graphics.Element.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Color = Elm.Color.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Graphics$Element = Elm.Native.Graphics.Element.make(_elm),
   $Text = Elm.Text.make(_elm);
   var _op = {};
   var DOut = {ctor: "DOut"};
   var outward = DOut;
   var DIn = {ctor: "DIn"};
   var inward = DIn;
   var DRight = {ctor: "DRight"};
   var right = DRight;
   var DLeft = {ctor: "DLeft"};
   var left = DLeft;
   var DDown = {ctor: "DDown"};
   var down = DDown;
   var DUp = {ctor: "DUp"};
   var up = DUp;
   var RawPosition = F4(function (a,b,c,d) {
      return {horizontal: a,vertical: b,x: c,y: d};
   });
   var Position = function (a) {
      return {ctor: "Position",_0: a};
   };
   var Relative = function (a) {
      return {ctor: "Relative",_0: a};
   };
   var relative = Relative;
   var Absolute = function (a) {
      return {ctor: "Absolute",_0: a};
   };
   var absolute = Absolute;
   var N = {ctor: "N"};
   var bottomLeft = Position({horizontal: N
                             ,vertical: N
                             ,x: Absolute(0)
                             ,y: Absolute(0)});
   var bottomLeftAt = F2(function (x,y) {
      return Position({horizontal: N,vertical: N,x: x,y: y});
   });
   var Z = {ctor: "Z"};
   var middle = Position({horizontal: Z
                         ,vertical: Z
                         ,x: Relative(0.5)
                         ,y: Relative(0.5)});
   var midLeft = Position({horizontal: N
                          ,vertical: Z
                          ,x: Absolute(0)
                          ,y: Relative(0.5)});
   var midBottom = Position({horizontal: Z
                            ,vertical: N
                            ,x: Relative(0.5)
                            ,y: Absolute(0)});
   var middleAt = F2(function (x,y) {
      return Position({horizontal: Z,vertical: Z,x: x,y: y});
   });
   var midLeftAt = F2(function (x,y) {
      return Position({horizontal: N,vertical: Z,x: x,y: y});
   });
   var midBottomAt = F2(function (x,y) {
      return Position({horizontal: Z,vertical: N,x: x,y: y});
   });
   var P = {ctor: "P"};
   var topLeft = Position({horizontal: N
                          ,vertical: P
                          ,x: Absolute(0)
                          ,y: Absolute(0)});
   var topRight = Position({horizontal: P
                           ,vertical: P
                           ,x: Absolute(0)
                           ,y: Absolute(0)});
   var bottomRight = Position({horizontal: P
                              ,vertical: N
                              ,x: Absolute(0)
                              ,y: Absolute(0)});
   var midRight = Position({horizontal: P
                           ,vertical: Z
                           ,x: Absolute(0)
                           ,y: Relative(0.5)});
   var midTop = Position({horizontal: Z
                         ,vertical: P
                         ,x: Relative(0.5)
                         ,y: Absolute(0)});
   var topLeftAt = F2(function (x,y) {
      return Position({horizontal: N,vertical: P,x: x,y: y});
   });
   var topRightAt = F2(function (x,y) {
      return Position({horizontal: P,vertical: P,x: x,y: y});
   });
   var bottomRightAt = F2(function (x,y) {
      return Position({horizontal: P,vertical: N,x: x,y: y});
   });
   var midRightAt = F2(function (x,y) {
      return Position({horizontal: P,vertical: Z,x: x,y: y});
   });
   var midTopAt = F2(function (x,y) {
      return Position({horizontal: Z,vertical: P,x: x,y: y});
   });
   var justified = $Native$Graphics$Element.block("justify");
   var centered = $Native$Graphics$Element.block("center");
   var rightAligned = $Native$Graphics$Element.block("right");
   var leftAligned = $Native$Graphics$Element.block("left");
   var show = function (value) {
      return leftAligned($Text.monospace($Text.fromString($Basics.toString(value))));
   };
   var Tiled = {ctor: "Tiled"};
   var Cropped = function (a) {
      return {ctor: "Cropped",_0: a};
   };
   var Fitted = {ctor: "Fitted"};
   var Plain = {ctor: "Plain"};
   var Custom = {ctor: "Custom"};
   var RawHtml = {ctor: "RawHtml"};
   var Spacer = {ctor: "Spacer"};
   var Flow = F2(function (a,b) {
      return {ctor: "Flow",_0: a,_1: b};
   });
   var Container = F2(function (a,b) {
      return {ctor: "Container",_0: a,_1: b};
   });
   var Image = F4(function (a,b,c,d) {
      return {ctor: "Image",_0: a,_1: b,_2: c,_3: d};
   });
   var newElement = $Native$Graphics$Element.newElement;
   var image = F3(function (w,h,src) {
      return A3(newElement,w,h,A4(Image,Plain,w,h,src));
   });
   var fittedImage = F3(function (w,h,src) {
      return A3(newElement,w,h,A4(Image,Fitted,w,h,src));
   });
   var croppedImage = F4(function (pos,w,h,src) {
      return A3(newElement,w,h,A4(Image,Cropped(pos),w,h,src));
   });
   var tiledImage = F3(function (w,h,src) {
      return A3(newElement,w,h,A4(Image,Tiled,w,h,src));
   });
   var container = F4(function (w,h,_p0,e) {
      var _p1 = _p0;
      return A3(newElement,w,h,A2(Container,_p1._0,e));
   });
   var spacer = F2(function (w,h) {
      return A3(newElement,w,h,Spacer);
   });
   var sizeOf = function (_p2) {
      var _p3 = _p2;
      var _p4 = _p3._0;
      return {ctor: "_Tuple2"
             ,_0: _p4.props.width
             ,_1: _p4.props.height};
   };
   var heightOf = function (_p5) {
      var _p6 = _p5;
      return _p6._0.props.height;
   };
   var widthOf = function (_p7) {
      var _p8 = _p7;
      return _p8._0.props.width;
   };
   var above = F2(function (hi,lo) {
      return A3(newElement,
      A2($Basics.max,widthOf(hi),widthOf(lo)),
      heightOf(hi) + heightOf(lo),
      A2(Flow,DDown,_U.list([hi,lo])));
   });
   var below = F2(function (lo,hi) {
      return A3(newElement,
      A2($Basics.max,widthOf(hi),widthOf(lo)),
      heightOf(hi) + heightOf(lo),
      A2(Flow,DDown,_U.list([hi,lo])));
   });
   var beside = F2(function (lft,rht) {
      return A3(newElement,
      widthOf(lft) + widthOf(rht),
      A2($Basics.max,heightOf(lft),heightOf(rht)),
      A2(Flow,right,_U.list([lft,rht])));
   });
   var layers = function (es) {
      var hs = A2($List.map,heightOf,es);
      var ws = A2($List.map,widthOf,es);
      return A3(newElement,
      A2($Maybe.withDefault,0,$List.maximum(ws)),
      A2($Maybe.withDefault,0,$List.maximum(hs)),
      A2(Flow,DOut,es));
   };
   var empty = A2(spacer,0,0);
   var flow = F2(function (dir,es) {
      var newFlow = F2(function (w,h) {
         return A3(newElement,w,h,A2(Flow,dir,es));
      });
      var maxOrZero = function (list) {
         return A2($Maybe.withDefault,0,$List.maximum(list));
      };
      var hs = A2($List.map,heightOf,es);
      var ws = A2($List.map,widthOf,es);
      if (_U.eq(es,_U.list([]))) return empty; else {
            var _p9 = dir;
            switch (_p9.ctor)
            {case "DUp": return A2(newFlow,maxOrZero(ws),$List.sum(hs));
               case "DDown": return A2(newFlow,maxOrZero(ws),$List.sum(hs));
               case "DLeft": return A2(newFlow,$List.sum(ws),maxOrZero(hs));
               case "DRight": return A2(newFlow,$List.sum(ws),maxOrZero(hs));
               case "DIn": return A2(newFlow,maxOrZero(ws),maxOrZero(hs));
               default: return A2(newFlow,maxOrZero(ws),maxOrZero(hs));}
         }
   });
   var Properties = F9(function (a,b,c,d,e,f,g,h,i) {
      return {id: a
             ,width: b
             ,height: c
             ,opacity: d
             ,color: e
             ,href: f
             ,tag: g
             ,hover: h
             ,click: i};
   });
   var Element_elm_builtin = function (a) {
      return {ctor: "Element_elm_builtin",_0: a};
   };
   var width = F2(function (newWidth,_p10) {
      var _p11 = _p10;
      var _p14 = _p11._0.props;
      var _p13 = _p11._0.element;
      var newHeight = function () {
         var _p12 = _p13;
         switch (_p12.ctor)
         {case "Image":
            return $Basics.round($Basics.toFloat(_p12._2) / $Basics.toFloat(_p12._1) * $Basics.toFloat(newWidth));
            case "RawHtml":
            return $Basics.snd(A2($Native$Graphics$Element.htmlHeight,
              newWidth,
              _p13));
            default: return _p14.height;}
      }();
      return Element_elm_builtin({element: _p13
                                 ,props: _U.update(_p14,{width: newWidth,height: newHeight})});
   });
   var height = F2(function (newHeight,_p15) {
      var _p16 = _p15;
      return Element_elm_builtin({element: _p16._0.element
                                 ,props: _U.update(_p16._0.props,{height: newHeight})});
   });
   var size = F3(function (w,h,e) {
      return A2(height,h,A2(width,w,e));
   });
   var opacity = F2(function (givenOpacity,_p17) {
      var _p18 = _p17;
      return Element_elm_builtin({element: _p18._0.element
                                 ,props: _U.update(_p18._0.props,{opacity: givenOpacity})});
   });
   var color = F2(function (clr,_p19) {
      var _p20 = _p19;
      return Element_elm_builtin({element: _p20._0.element
                                 ,props: _U.update(_p20._0.props,{color: $Maybe.Just(clr)})});
   });
   var tag = F2(function (name,_p21) {
      var _p22 = _p21;
      return Element_elm_builtin({element: _p22._0.element
                                 ,props: _U.update(_p22._0.props,{tag: name})});
   });
   var link = F2(function (href,_p23) {
      var _p24 = _p23;
      return Element_elm_builtin({element: _p24._0.element
                                 ,props: _U.update(_p24._0.props,{href: href})});
   });
   return _elm.Graphics.Element.values = {_op: _op
                                         ,image: image
                                         ,fittedImage: fittedImage
                                         ,croppedImage: croppedImage
                                         ,tiledImage: tiledImage
                                         ,leftAligned: leftAligned
                                         ,rightAligned: rightAligned
                                         ,centered: centered
                                         ,justified: justified
                                         ,show: show
                                         ,width: width
                                         ,height: height
                                         ,size: size
                                         ,color: color
                                         ,opacity: opacity
                                         ,link: link
                                         ,tag: tag
                                         ,widthOf: widthOf
                                         ,heightOf: heightOf
                                         ,sizeOf: sizeOf
                                         ,flow: flow
                                         ,up: up
                                         ,down: down
                                         ,left: left
                                         ,right: right
                                         ,inward: inward
                                         ,outward: outward
                                         ,layers: layers
                                         ,above: above
                                         ,below: below
                                         ,beside: beside
                                         ,empty: empty
                                         ,spacer: spacer
                                         ,container: container
                                         ,middle: middle
                                         ,midTop: midTop
                                         ,midBottom: midBottom
                                         ,midLeft: midLeft
                                         ,midRight: midRight
                                         ,topLeft: topLeft
                                         ,topRight: topRight
                                         ,bottomLeft: bottomLeft
                                         ,bottomRight: bottomRight
                                         ,absolute: absolute
                                         ,relative: relative
                                         ,middleAt: middleAt
                                         ,midTopAt: midTopAt
                                         ,midBottomAt: midBottomAt
                                         ,midLeftAt: midLeftAt
                                         ,midRightAt: midRightAt
                                         ,topLeftAt: topLeftAt
                                         ,topRightAt: topRightAt
                                         ,bottomLeftAt: bottomLeftAt
                                         ,bottomRightAt: bottomRightAt};
};
Elm.Graphics = Elm.Graphics || {};
Elm.Graphics.Collage = Elm.Graphics.Collage || {};
Elm.Graphics.Collage.make = function (_elm) {
   "use strict";
   _elm.Graphics = _elm.Graphics || {};
   _elm.Graphics.Collage = _elm.Graphics.Collage || {};
   if (_elm.Graphics.Collage.values)
   return _elm.Graphics.Collage.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Color = Elm.Color.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $List = Elm.List.make(_elm),
   $Native$Graphics$Collage = Elm.Native.Graphics.Collage.make(_elm),
   $Text = Elm.Text.make(_elm),
   $Transform2D = Elm.Transform2D.make(_elm);
   var _op = {};
   var Shape = function (a) {    return {ctor: "Shape",_0: a};};
   var polygon = function (points) {    return Shape(points);};
   var rect = F2(function (w,h) {
      var hh = h / 2;
      var hw = w / 2;
      return Shape(_U.list([{ctor: "_Tuple2",_0: 0 - hw,_1: 0 - hh}
                           ,{ctor: "_Tuple2",_0: 0 - hw,_1: hh}
                           ,{ctor: "_Tuple2",_0: hw,_1: hh}
                           ,{ctor: "_Tuple2",_0: hw,_1: 0 - hh}]));
   });
   var square = function (n) {    return A2(rect,n,n);};
   var oval = F2(function (w,h) {
      var hh = h / 2;
      var hw = w / 2;
      var n = 50;
      var t = 2 * $Basics.pi / n;
      var f = function (i) {
         return {ctor: "_Tuple2"
                ,_0: hw * $Basics.cos(t * i)
                ,_1: hh * $Basics.sin(t * i)};
      };
      return Shape(A2($List.map,f,_U.range(0,n - 1)));
   });
   var circle = function (r) {    return A2(oval,2 * r,2 * r);};
   var ngon = F2(function (n,r) {
      var m = $Basics.toFloat(n);
      var t = 2 * $Basics.pi / m;
      var f = function (i) {
         return {ctor: "_Tuple2"
                ,_0: r * $Basics.cos(t * i)
                ,_1: r * $Basics.sin(t * i)};
      };
      return Shape(A2($List.map,f,_U.range(0,m - 1)));
   });
   var Path = function (a) {    return {ctor: "Path",_0: a};};
   var path = function (ps) {    return Path(ps);};
   var segment = F2(function (p1,p2) {
      return Path(_U.list([p1,p2]));
   });
   var collage = $Native$Graphics$Collage.collage;
   var Fill = function (a) {    return {ctor: "Fill",_0: a};};
   var Line = function (a) {    return {ctor: "Line",_0: a};};
   var FGroup = F2(function (a,b) {
      return {ctor: "FGroup",_0: a,_1: b};
   });
   var FElement = function (a) {
      return {ctor: "FElement",_0: a};
   };
   var FImage = F4(function (a,b,c,d) {
      return {ctor: "FImage",_0: a,_1: b,_2: c,_3: d};
   });
   var FText = function (a) {    return {ctor: "FText",_0: a};};
   var FOutlinedText = F2(function (a,b) {
      return {ctor: "FOutlinedText",_0: a,_1: b};
   });
   var FShape = F2(function (a,b) {
      return {ctor: "FShape",_0: a,_1: b};
   });
   var FPath = F2(function (a,b) {
      return {ctor: "FPath",_0: a,_1: b};
   });
   var LineStyle = F6(function (a,b,c,d,e,f) {
      return {color: a
             ,width: b
             ,cap: c
             ,join: d
             ,dashing: e
             ,dashOffset: f};
   });
   var Clipped = {ctor: "Clipped"};
   var Sharp = function (a) {    return {ctor: "Sharp",_0: a};};
   var Smooth = {ctor: "Smooth"};
   var Padded = {ctor: "Padded"};
   var Round = {ctor: "Round"};
   var Flat = {ctor: "Flat"};
   var defaultLine = {color: $Color.black
                     ,width: 1
                     ,cap: Flat
                     ,join: Sharp(10)
                     ,dashing: _U.list([])
                     ,dashOffset: 0};
   var solid = function (clr) {
      return _U.update(defaultLine,{color: clr});
   };
   var dashed = function (clr) {
      return _U.update(defaultLine,
      {color: clr,dashing: _U.list([8,4])});
   };
   var dotted = function (clr) {
      return _U.update(defaultLine,
      {color: clr,dashing: _U.list([3,3])});
   };
   var Grad = function (a) {    return {ctor: "Grad",_0: a};};
   var Texture = function (a) {
      return {ctor: "Texture",_0: a};
   };
   var Solid = function (a) {    return {ctor: "Solid",_0: a};};
   var Form_elm_builtin = function (a) {
      return {ctor: "Form_elm_builtin",_0: a};
   };
   var form = function (f) {
      return Form_elm_builtin({theta: 0
                              ,scale: 1
                              ,x: 0
                              ,y: 0
                              ,alpha: 1
                              ,form: f});
   };
   var fill = F2(function (style,_p0) {
      var _p1 = _p0;
      return form(A2(FShape,Fill(style),_p1._0));
   });
   var filled = F2(function (color,shape) {
      return A2(fill,Solid(color),shape);
   });
   var textured = F2(function (src,shape) {
      return A2(fill,Texture(src),shape);
   });
   var gradient = F2(function (grad,shape) {
      return A2(fill,Grad(grad),shape);
   });
   var outlined = F2(function (style,_p2) {
      var _p3 = _p2;
      return form(A2(FShape,Line(style),_p3._0));
   });
   var traced = F2(function (style,_p4) {
      var _p5 = _p4;
      return form(A2(FPath,style,_p5._0));
   });
   var sprite = F4(function (w,h,pos,src) {
      return form(A4(FImage,w,h,pos,src));
   });
   var toForm = function (e) {    return form(FElement(e));};
   var group = function (fs) {
      return form(A2(FGroup,$Transform2D.identity,fs));
   };
   var groupTransform = F2(function (matrix,fs) {
      return form(A2(FGroup,matrix,fs));
   });
   var text = function (t) {    return form(FText(t));};
   var outlinedText = F2(function (ls,t) {
      return form(A2(FOutlinedText,ls,t));
   });
   var move = F2(function (_p7,_p6) {
      var _p8 = _p7;
      var _p9 = _p6;
      var _p10 = _p9._0;
      return Form_elm_builtin(_U.update(_p10,
      {x: _p10.x + _p8._0,y: _p10.y + _p8._1}));
   });
   var moveX = F2(function (x,_p11) {
      var _p12 = _p11;
      var _p13 = _p12._0;
      return Form_elm_builtin(_U.update(_p13,{x: _p13.x + x}));
   });
   var moveY = F2(function (y,_p14) {
      var _p15 = _p14;
      var _p16 = _p15._0;
      return Form_elm_builtin(_U.update(_p16,{y: _p16.y + y}));
   });
   var scale = F2(function (s,_p17) {
      var _p18 = _p17;
      var _p19 = _p18._0;
      return Form_elm_builtin(_U.update(_p19,
      {scale: _p19.scale * s}));
   });
   var rotate = F2(function (t,_p20) {
      var _p21 = _p20;
      var _p22 = _p21._0;
      return Form_elm_builtin(_U.update(_p22,
      {theta: _p22.theta + t}));
   });
   var alpha = F2(function (a,_p23) {
      var _p24 = _p23;
      return Form_elm_builtin(_U.update(_p24._0,{alpha: a}));
   });
   return _elm.Graphics.Collage.values = {_op: _op
                                         ,collage: collage
                                         ,toForm: toForm
                                         ,filled: filled
                                         ,textured: textured
                                         ,gradient: gradient
                                         ,outlined: outlined
                                         ,traced: traced
                                         ,text: text
                                         ,outlinedText: outlinedText
                                         ,move: move
                                         ,moveX: moveX
                                         ,moveY: moveY
                                         ,scale: scale
                                         ,rotate: rotate
                                         ,alpha: alpha
                                         ,group: group
                                         ,groupTransform: groupTransform
                                         ,rect: rect
                                         ,oval: oval
                                         ,square: square
                                         ,circle: circle
                                         ,ngon: ngon
                                         ,polygon: polygon
                                         ,segment: segment
                                         ,path: path
                                         ,solid: solid
                                         ,dashed: dashed
                                         ,dotted: dotted
                                         ,defaultLine: defaultLine
                                         ,LineStyle: LineStyle
                                         ,Flat: Flat
                                         ,Round: Round
                                         ,Padded: Padded
                                         ,Smooth: Smooth
                                         ,Sharp: Sharp
                                         ,Clipped: Clipped};
};
Elm.Native.Debug = {};
Elm.Native.Debug.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Debug = localRuntime.Native.Debug || {};
	if (localRuntime.Native.Debug.values)
	{
		return localRuntime.Native.Debug.values;
	}

	var toString = Elm.Native.Utils.make(localRuntime).toString;

	function log(tag, value)
	{
		var msg = tag + ': ' + toString(value);
		var process = process || {};
		if (process.stdout)
		{
			process.stdout.write(msg);
		}
		else
		{
			console.log(msg);
		}
		return value;
	}

	function crash(message)
	{
		throw new Error(message);
	}

	function tracePath(tag, form)
	{
		if (localRuntime.debug)
		{
			return localRuntime.debug.trace(tag, form);
		}
		return form;
	}

	function watch(tag, value)
	{
		if (localRuntime.debug)
		{
			localRuntime.debug.watch(tag, value);
		}
		return value;
	}

	function watchSummary(tag, summarize, value)
	{
		if (localRuntime.debug)
		{
			localRuntime.debug.watch(tag, summarize(value));
		}
		return value;
	}

	return localRuntime.Native.Debug.values = {
		crash: crash,
		tracePath: F2(tracePath),
		log: F2(log),
		watch: F2(watch),
		watchSummary: F3(watchSummary)
	};
};

Elm.Debug = Elm.Debug || {};
Elm.Debug.make = function (_elm) {
   "use strict";
   _elm.Debug = _elm.Debug || {};
   if (_elm.Debug.values) return _elm.Debug.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Graphics$Collage = Elm.Graphics.Collage.make(_elm),
   $Native$Debug = Elm.Native.Debug.make(_elm);
   var _op = {};
   var trace = $Native$Debug.tracePath;
   var watchSummary = $Native$Debug.watchSummary;
   var watch = $Native$Debug.watch;
   var crash = $Native$Debug.crash;
   var log = $Native$Debug.log;
   return _elm.Debug.values = {_op: _op
                              ,log: log
                              ,crash: crash
                              ,watch: watch
                              ,watchSummary: watchSummary
                              ,trace: trace};
};
Elm.Result = Elm.Result || {};
Elm.Result.make = function (_elm) {
   "use strict";
   _elm.Result = _elm.Result || {};
   if (_elm.Result.values) return _elm.Result.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Maybe = Elm.Maybe.make(_elm);
   var _op = {};
   var toMaybe = function (result) {
      var _p0 = result;
      if (_p0.ctor === "Ok") {
            return $Maybe.Just(_p0._0);
         } else {
            return $Maybe.Nothing;
         }
   };
   var withDefault = F2(function (def,result) {
      var _p1 = result;
      if (_p1.ctor === "Ok") {
            return _p1._0;
         } else {
            return def;
         }
   });
   var Err = function (a) {    return {ctor: "Err",_0: a};};
   var andThen = F2(function (result,callback) {
      var _p2 = result;
      if (_p2.ctor === "Ok") {
            return callback(_p2._0);
         } else {
            return Err(_p2._0);
         }
   });
   var Ok = function (a) {    return {ctor: "Ok",_0: a};};
   var map = F2(function (func,ra) {
      var _p3 = ra;
      if (_p3.ctor === "Ok") {
            return Ok(func(_p3._0));
         } else {
            return Err(_p3._0);
         }
   });
   var map2 = F3(function (func,ra,rb) {
      var _p4 = {ctor: "_Tuple2",_0: ra,_1: rb};
      if (_p4._0.ctor === "Ok") {
            if (_p4._1.ctor === "Ok") {
                  return Ok(A2(func,_p4._0._0,_p4._1._0));
               } else {
                  return Err(_p4._1._0);
               }
         } else {
            return Err(_p4._0._0);
         }
   });
   var map3 = F4(function (func,ra,rb,rc) {
      var _p5 = {ctor: "_Tuple3",_0: ra,_1: rb,_2: rc};
      if (_p5._0.ctor === "Ok") {
            if (_p5._1.ctor === "Ok") {
                  if (_p5._2.ctor === "Ok") {
                        return Ok(A3(func,_p5._0._0,_p5._1._0,_p5._2._0));
                     } else {
                        return Err(_p5._2._0);
                     }
               } else {
                  return Err(_p5._1._0);
               }
         } else {
            return Err(_p5._0._0);
         }
   });
   var map4 = F5(function (func,ra,rb,rc,rd) {
      var _p6 = {ctor: "_Tuple4",_0: ra,_1: rb,_2: rc,_3: rd};
      if (_p6._0.ctor === "Ok") {
            if (_p6._1.ctor === "Ok") {
                  if (_p6._2.ctor === "Ok") {
                        if (_p6._3.ctor === "Ok") {
                              return Ok(A4(func,_p6._0._0,_p6._1._0,_p6._2._0,_p6._3._0));
                           } else {
                              return Err(_p6._3._0);
                           }
                     } else {
                        return Err(_p6._2._0);
                     }
               } else {
                  return Err(_p6._1._0);
               }
         } else {
            return Err(_p6._0._0);
         }
   });
   var map5 = F6(function (func,ra,rb,rc,rd,re) {
      var _p7 = {ctor: "_Tuple5"
                ,_0: ra
                ,_1: rb
                ,_2: rc
                ,_3: rd
                ,_4: re};
      if (_p7._0.ctor === "Ok") {
            if (_p7._1.ctor === "Ok") {
                  if (_p7._2.ctor === "Ok") {
                        if (_p7._3.ctor === "Ok") {
                              if (_p7._4.ctor === "Ok") {
                                    return Ok(A5(func,
                                    _p7._0._0,
                                    _p7._1._0,
                                    _p7._2._0,
                                    _p7._3._0,
                                    _p7._4._0));
                                 } else {
                                    return Err(_p7._4._0);
                                 }
                           } else {
                              return Err(_p7._3._0);
                           }
                     } else {
                        return Err(_p7._2._0);
                     }
               } else {
                  return Err(_p7._1._0);
               }
         } else {
            return Err(_p7._0._0);
         }
   });
   var formatError = F2(function (f,result) {
      var _p8 = result;
      if (_p8.ctor === "Ok") {
            return Ok(_p8._0);
         } else {
            return Err(f(_p8._0));
         }
   });
   var fromMaybe = F2(function (err,maybe) {
      var _p9 = maybe;
      if (_p9.ctor === "Just") {
            return Ok(_p9._0);
         } else {
            return Err(err);
         }
   });
   return _elm.Result.values = {_op: _op
                               ,withDefault: withDefault
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,andThen: andThen
                               ,toMaybe: toMaybe
                               ,fromMaybe: fromMaybe
                               ,formatError: formatError
                               ,Ok: Ok
                               ,Err: Err};
};
Elm.Native.Signal = {};

Elm.Native.Signal.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Signal = localRuntime.Native.Signal || {};
	if (localRuntime.Native.Signal.values)
	{
		return localRuntime.Native.Signal.values;
	}


	var Task = Elm.Native.Task.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	function broadcastToKids(node, timestamp, update)
	{
		var kids = node.kids;
		for (var i = kids.length; i--; )
		{
			kids[i].notify(timestamp, update, node.id);
		}
	}


	// INPUT

	function input(name, base)
	{
		var node = {
			id: Utils.guid(),
			name: 'input-' + name,
			value: base,
			parents: [],
			kids: []
		};

		node.notify = function(timestamp, targetId, value) {
			var update = targetId === node.id;
			if (update)
			{
				node.value = value;
			}
			broadcastToKids(node, timestamp, update);
			return update;
		};

		localRuntime.inputs.push(node);

		return node;
	}

	function constant(value)
	{
		return input('constant', value);
	}


	// MAILBOX

	function mailbox(base)
	{
		var signal = input('mailbox', base);

		function send(value) {
			return Task.asyncFunction(function(callback) {
				localRuntime.setTimeout(function() {
					localRuntime.notify(signal.id, value);
				}, 0);
				callback(Task.succeed(Utils.Tuple0));
			});
		}

		return {
			signal: signal,
			address: {
				ctor: 'Address',
				_0: send
			}
		};
	}

	function sendMessage(message)
	{
		Task.perform(message._0);
	}


	// OUTPUT

	function output(name, handler, parent)
	{
		var node = {
			id: Utils.guid(),
			name: 'output-' + name,
			parents: [parent],
			isOutput: true
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				handler(parent.value);
			}
		};

		parent.kids.push(node);

		return node;
	}


	// MAP

	function mapMany(refreshValue, args)
	{
		var node = {
			id: Utils.guid(),
			name: 'map' + args.length,
			value: refreshValue(),
			parents: args,
			kids: []
		};

		var numberOfParents = args.length;
		var count = 0;
		var update = false;

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			++count;

			update = update || parentUpdate;

			if (count === numberOfParents)
			{
				if (update)
				{
					node.value = refreshValue();
				}
				broadcastToKids(node, timestamp, update);
				update = false;
				count = 0;
			}
		};

		for (var i = numberOfParents; i--; )
		{
			args[i].kids.push(node);
		}

		return node;
	}


	function map(func, a)
	{
		function refreshValue()
		{
			return func(a.value);
		}
		return mapMany(refreshValue, [a]);
	}


	function map2(func, a, b)
	{
		function refreshValue()
		{
			return A2( func, a.value, b.value );
		}
		return mapMany(refreshValue, [a, b]);
	}


	function map3(func, a, b, c)
	{
		function refreshValue()
		{
			return A3( func, a.value, b.value, c.value );
		}
		return mapMany(refreshValue, [a, b, c]);
	}


	function map4(func, a, b, c, d)
	{
		function refreshValue()
		{
			return A4( func, a.value, b.value, c.value, d.value );
		}
		return mapMany(refreshValue, [a, b, c, d]);
	}


	function map5(func, a, b, c, d, e)
	{
		function refreshValue()
		{
			return A5( func, a.value, b.value, c.value, d.value, e.value );
		}
		return mapMany(refreshValue, [a, b, c, d, e]);
	}


	// FOLD

	function foldp(update, state, signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'foldp',
			parents: [signal],
			kids: [],
			value: state
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				node.value = A2( update, signal.value, node.value );
			}
			broadcastToKids(node, timestamp, parentUpdate);
		};

		signal.kids.push(node);

		return node;
	}


	// TIME

	function timestamp(signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'timestamp',
			value: Utils.Tuple2(localRuntime.timer.programStart, signal.value),
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				node.value = Utils.Tuple2(timestamp, signal.value);
			}
			broadcastToKids(node, timestamp, parentUpdate);
		};

		signal.kids.push(node);

		return node;
	}


	function delay(time, signal)
	{
		var delayed = input('delay-input-' + time, signal.value);

		function handler(value)
		{
			setTimeout(function() {
				localRuntime.notify(delayed.id, value);
			}, time);
		}

		output('delay-output-' + time, handler, signal);

		return delayed;
	}


	// MERGING

	function genericMerge(tieBreaker, leftStream, rightStream)
	{
		var node = {
			id: Utils.guid(),
			name: 'merge',
			value: A2(tieBreaker, leftStream.value, rightStream.value),
			parents: [leftStream, rightStream],
			kids: []
		};

		var left = { touched: false, update: false, value: null };
		var right = { touched: false, update: false, value: null };

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentID === leftStream.id)
			{
				left.touched = true;
				left.update = parentUpdate;
				left.value = leftStream.value;
			}
			if (parentID === rightStream.id)
			{
				right.touched = true;
				right.update = parentUpdate;
				right.value = rightStream.value;
			}

			if (left.touched && right.touched)
			{
				var update = false;
				if (left.update && right.update)
				{
					node.value = A2(tieBreaker, left.value, right.value);
					update = true;
				}
				else if (left.update)
				{
					node.value = left.value;
					update = true;
				}
				else if (right.update)
				{
					node.value = right.value;
					update = true;
				}
				left.touched = false;
				right.touched = false;

				broadcastToKids(node, timestamp, update);
			}
		};

		leftStream.kids.push(node);
		rightStream.kids.push(node);

		return node;
	}


	// FILTERING

	function filterMap(toMaybe, base, signal)
	{
		var maybe = toMaybe(signal.value);
		var node = {
			id: Utils.guid(),
			name: 'filterMap',
			value: maybe.ctor === 'Nothing' ? base : maybe._0,
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			var update = false;
			if (parentUpdate)
			{
				var maybe = toMaybe(signal.value);
				if (maybe.ctor === 'Just')
				{
					update = true;
					node.value = maybe._0;
				}
			}
			broadcastToKids(node, timestamp, update);
		};

		signal.kids.push(node);

		return node;
	}


	// SAMPLING

	function sampleOn(ticker, signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'sampleOn',
			value: signal.value,
			parents: [ticker, signal],
			kids: []
		};

		var signalTouch = false;
		var tickerTouch = false;
		var tickerUpdate = false;

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentID === ticker.id)
			{
				tickerTouch = true;
				tickerUpdate = parentUpdate;
			}
			if (parentID === signal.id)
			{
				signalTouch = true;
			}

			if (tickerTouch && signalTouch)
			{
				if (tickerUpdate)
				{
					node.value = signal.value;
				}
				tickerTouch = false;
				signalTouch = false;

				broadcastToKids(node, timestamp, tickerUpdate);
			}
		};

		ticker.kids.push(node);
		signal.kids.push(node);

		return node;
	}


	// DROP REPEATS

	function dropRepeats(signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'dropRepeats',
			value: signal.value,
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			var update = false;
			if (parentUpdate && !Utils.eq(node.value, signal.value))
			{
				node.value = signal.value;
				update = true;
			}
			broadcastToKids(node, timestamp, update);
		};

		signal.kids.push(node);

		return node;
	}


	return localRuntime.Native.Signal.values = {
		input: input,
		constant: constant,
		mailbox: mailbox,
		sendMessage: sendMessage,
		output: output,
		map: F2(map),
		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		foldp: F3(foldp),
		genericMerge: F3(genericMerge),
		filterMap: F3(filterMap),
		sampleOn: F2(sampleOn),
		dropRepeats: dropRepeats,
		timestamp: timestamp,
		delay: F2(delay)
	};
};

Elm.Native.Task = {};

Elm.Native.Task.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Task = localRuntime.Native.Task || {};
	if (localRuntime.Native.Task.values)
	{
		return localRuntime.Native.Task.values;
	}

	var Result = Elm.Result.make(localRuntime);
	var Signal;
	var Utils = Elm.Native.Utils.make(localRuntime);


	// CONSTRUCTORS

	function succeed(value)
	{
		return {
			tag: 'Succeed',
			value: value
		};
	}

	function fail(error)
	{
		return {
			tag: 'Fail',
			value: error
		};
	}

	function asyncFunction(func)
	{
		return {
			tag: 'Async',
			asyncFunction: func
		};
	}

	function andThen(task, callback)
	{
		return {
			tag: 'AndThen',
			task: task,
			callback: callback
		};
	}

	function catch_(task, callback)
	{
		return {
			tag: 'Catch',
			task: task,
			callback: callback
		};
	}


	// RUNNER

	function perform(task) {
		runTask({ task: task }, function() {});
	}

	function performSignal(name, signal)
	{
		var workQueue = [];

		function onComplete()
		{
			workQueue.shift();

			if (workQueue.length > 0)
			{
				var task = workQueue[0];

				setTimeout(function() {
					runTask(task, onComplete);
				}, 0);
			}
		}

		function register(task)
		{
			var root = { task: task };
			workQueue.push(root);
			if (workQueue.length === 1)
			{
				runTask(root, onComplete);
			}
		}

		if (!Signal)
		{
			Signal = Elm.Native.Signal.make(localRuntime);
		}
		Signal.output('perform-tasks-' + name, register, signal);

		register(signal.value);

		return signal;
	}

	function mark(status, task)
	{
		return { status: status, task: task };
	}

	function runTask(root, onComplete)
	{
		var result = mark('runnable', root.task);
		while (result.status === 'runnable')
		{
			result = stepTask(onComplete, root, result.task);
		}

		if (result.status === 'done')
		{
			root.task = result.task;
			onComplete();
		}

		if (result.status === 'blocked')
		{
			root.task = result.task;
		}
	}

	function stepTask(onComplete, root, task)
	{
		var tag = task.tag;

		if (tag === 'Succeed' || tag === 'Fail')
		{
			return mark('done', task);
		}

		if (tag === 'Async')
		{
			var placeHolder = {};
			var couldBeSync = true;
			var wasSync = false;

			task.asyncFunction(function(result) {
				placeHolder.tag = result.tag;
				placeHolder.value = result.value;
				if (couldBeSync)
				{
					wasSync = true;
				}
				else
				{
					runTask(root, onComplete);
				}
			});
			couldBeSync = false;
			return mark(wasSync ? 'done' : 'blocked', placeHolder);
		}

		if (tag === 'AndThen' || tag === 'Catch')
		{
			var result = mark('runnable', task.task);
			while (result.status === 'runnable')
			{
				result = stepTask(onComplete, root, result.task);
			}

			if (result.status === 'done')
			{
				var activeTask = result.task;
				var activeTag = activeTask.tag;

				var succeedChain = activeTag === 'Succeed' && tag === 'AndThen';
				var failChain = activeTag === 'Fail' && tag === 'Catch';

				return (succeedChain || failChain)
					? mark('runnable', task.callback(activeTask.value))
					: mark('runnable', activeTask);
			}
			if (result.status === 'blocked')
			{
				return mark('blocked', {
					tag: tag,
					task: result.task,
					callback: task.callback
				});
			}
		}
	}


	// THREADS

	function sleep(time) {
		return asyncFunction(function(callback) {
			setTimeout(function() {
				callback(succeed(Utils.Tuple0));
			}, time);
		});
	}

	function spawn(task) {
		return asyncFunction(function(callback) {
			var id = setTimeout(function() {
				perform(task);
			}, 0);
			callback(succeed(id));
		});
	}


	return localRuntime.Native.Task.values = {
		succeed: succeed,
		fail: fail,
		asyncFunction: asyncFunction,
		andThen: F2(andThen),
		catch_: F2(catch_),
		perform: perform,
		performSignal: performSignal,
		spawn: spawn,
		sleep: sleep
	};
};

Elm.Task = Elm.Task || {};
Elm.Task.make = function (_elm) {
   "use strict";
   _elm.Task = _elm.Task || {};
   if (_elm.Task.values) return _elm.Task.values;
   var _U = Elm.Native.Utils.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Task = Elm.Native.Task.make(_elm),
   $Result = Elm.Result.make(_elm);
   var _op = {};
   var sleep = $Native$Task.sleep;
   var spawn = $Native$Task.spawn;
   var ThreadID = function (a) {
      return {ctor: "ThreadID",_0: a};
   };
   var onError = $Native$Task.catch_;
   var andThen = $Native$Task.andThen;
   var fail = $Native$Task.fail;
   var mapError = F2(function (f,task) {
      return A2(onError,
      task,
      function (err) {
         return fail(f(err));
      });
   });
   var succeed = $Native$Task.succeed;
   var map = F2(function (func,taskA) {
      return A2(andThen,
      taskA,
      function (a) {
         return succeed(func(a));
      });
   });
   var map2 = F3(function (func,taskA,taskB) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return succeed(A2(func,a,b));
         });
      });
   });
   var map3 = F4(function (func,taskA,taskB,taskC) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,
            taskC,
            function (c) {
               return succeed(A3(func,a,b,c));
            });
         });
      });
   });
   var map4 = F5(function (func,taskA,taskB,taskC,taskD) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,
            taskC,
            function (c) {
               return A2(andThen,
               taskD,
               function (d) {
                  return succeed(A4(func,a,b,c,d));
               });
            });
         });
      });
   });
   var map5 = F6(function (func,taskA,taskB,taskC,taskD,taskE) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,
            taskC,
            function (c) {
               return A2(andThen,
               taskD,
               function (d) {
                  return A2(andThen,
                  taskE,
                  function (e) {
                     return succeed(A5(func,a,b,c,d,e));
                  });
               });
            });
         });
      });
   });
   var andMap = F2(function (taskFunc,taskValue) {
      return A2(andThen,
      taskFunc,
      function (func) {
         return A2(andThen,
         taskValue,
         function (value) {
            return succeed(func(value));
         });
      });
   });
   var sequence = function (tasks) {
      var _p0 = tasks;
      if (_p0.ctor === "[]") {
            return succeed(_U.list([]));
         } else {
            return A3(map2,
            F2(function (x,y) {    return A2($List._op["::"],x,y);}),
            _p0._0,
            sequence(_p0._1));
         }
   };
   var toMaybe = function (task) {
      return A2(onError,
      A2(map,$Maybe.Just,task),
      function (_p1) {
         return succeed($Maybe.Nothing);
      });
   };
   var fromMaybe = F2(function ($default,maybe) {
      var _p2 = maybe;
      if (_p2.ctor === "Just") {
            return succeed(_p2._0);
         } else {
            return fail($default);
         }
   });
   var toResult = function (task) {
      return A2(onError,
      A2(map,$Result.Ok,task),
      function (msg) {
         return succeed($Result.Err(msg));
      });
   };
   var fromResult = function (result) {
      var _p3 = result;
      if (_p3.ctor === "Ok") {
            return succeed(_p3._0);
         } else {
            return fail(_p3._0);
         }
   };
   var Task = {ctor: "Task"};
   return _elm.Task.values = {_op: _op
                             ,succeed: succeed
                             ,fail: fail
                             ,map: map
                             ,map2: map2
                             ,map3: map3
                             ,map4: map4
                             ,map5: map5
                             ,andMap: andMap
                             ,sequence: sequence
                             ,andThen: andThen
                             ,onError: onError
                             ,mapError: mapError
                             ,toMaybe: toMaybe
                             ,fromMaybe: fromMaybe
                             ,toResult: toResult
                             ,fromResult: fromResult
                             ,spawn: spawn
                             ,sleep: sleep};
};
Elm.Signal = Elm.Signal || {};
Elm.Signal.make = function (_elm) {
   "use strict";
   _elm.Signal = _elm.Signal || {};
   if (_elm.Signal.values) return _elm.Signal.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Signal = Elm.Native.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var send = F2(function (_p0,value) {
      var _p1 = _p0;
      return A2($Task.onError,
      _p1._0(value),
      function (_p2) {
         return $Task.succeed({ctor: "_Tuple0"});
      });
   });
   var Message = function (a) {
      return {ctor: "Message",_0: a};
   };
   var message = F2(function (_p3,value) {
      var _p4 = _p3;
      return Message(_p4._0(value));
   });
   var mailbox = $Native$Signal.mailbox;
   var Address = function (a) {
      return {ctor: "Address",_0: a};
   };
   var forwardTo = F2(function (_p5,f) {
      var _p6 = _p5;
      return Address(function (x) {    return _p6._0(f(x));});
   });
   var Mailbox = F2(function (a,b) {
      return {address: a,signal: b};
   });
   var sampleOn = $Native$Signal.sampleOn;
   var dropRepeats = $Native$Signal.dropRepeats;
   var filterMap = $Native$Signal.filterMap;
   var filter = F3(function (isOk,base,signal) {
      return A3(filterMap,
      function (value) {
         return isOk(value) ? $Maybe.Just(value) : $Maybe.Nothing;
      },
      base,
      signal);
   });
   var merge = F2(function (left,right) {
      return A3($Native$Signal.genericMerge,
      $Basics.always,
      left,
      right);
   });
   var mergeMany = function (signalList) {
      var _p7 = $List.reverse(signalList);
      if (_p7.ctor === "[]") {
            return _U.crashCase("Signal",
            {start: {line: 184,column: 3},end: {line: 189,column: 40}},
            _p7)("mergeMany was given an empty list!");
         } else {
            return A3($List.foldl,merge,_p7._0,_p7._1);
         }
   };
   var foldp = $Native$Signal.foldp;
   var map5 = $Native$Signal.map5;
   var map4 = $Native$Signal.map4;
   var map3 = $Native$Signal.map3;
   var map2 = $Native$Signal.map2;
   var map = $Native$Signal.map;
   var constant = $Native$Signal.constant;
   var Signal = {ctor: "Signal"};
   return _elm.Signal.values = {_op: _op
                               ,merge: merge
                               ,mergeMany: mergeMany
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,constant: constant
                               ,dropRepeats: dropRepeats
                               ,filter: filter
                               ,filterMap: filterMap
                               ,sampleOn: sampleOn
                               ,foldp: foldp
                               ,mailbox: mailbox
                               ,send: send
                               ,message: message
                               ,forwardTo: forwardTo
                               ,Mailbox: Mailbox};
};
Elm.Native.String = {};

Elm.Native.String.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.String = localRuntime.Native.String || {};
	if (localRuntime.Native.String.values)
	{
		return localRuntime.Native.String.values;
	}
	if ('values' in Elm.Native.String)
	{
		return localRuntime.Native.String.values = Elm.Native.String.values;
	}


	var Char = Elm.Char.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Result = Elm.Result.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);

	function isEmpty(str)
	{
		return str.length === 0;
	}
	function cons(chr, str)
	{
		return chr + str;
	}
	function uncons(str)
	{
		var hd = str[0];
		if (hd)
		{
			return Maybe.Just(Utils.Tuple2(Utils.chr(hd), str.slice(1)));
		}
		return Maybe.Nothing;
	}
	function append(a, b)
	{
		return a + b;
	}
	function concat(strs)
	{
		return List.toArray(strs).join('');
	}
	function length(str)
	{
		return str.length;
	}
	function map(f, str)
	{
		var out = str.split('');
		for (var i = out.length; i--; )
		{
			out[i] = f(Utils.chr(out[i]));
		}
		return out.join('');
	}
	function filter(pred, str)
	{
		return str.split('').map(Utils.chr).filter(pred).join('');
	}
	function reverse(str)
	{
		return str.split('').reverse().join('');
	}
	function foldl(f, b, str)
	{
		var len = str.length;
		for (var i = 0; i < len; ++i)
		{
			b = A2(f, Utils.chr(str[i]), b);
		}
		return b;
	}
	function foldr(f, b, str)
	{
		for (var i = str.length; i--; )
		{
			b = A2(f, Utils.chr(str[i]), b);
		}
		return b;
	}
	function split(sep, str)
	{
		return List.fromArray(str.split(sep));
	}
	function join(sep, strs)
	{
		return List.toArray(strs).join(sep);
	}
	function repeat(n, str)
	{
		var result = '';
		while (n > 0)
		{
			if (n & 1)
			{
				result += str;
			}
			n >>= 1, str += str;
		}
		return result;
	}
	function slice(start, end, str)
	{
		return str.slice(start, end);
	}
	function left(n, str)
	{
		return n < 1 ? '' : str.slice(0, n);
	}
	function right(n, str)
	{
		return n < 1 ? '' : str.slice(-n);
	}
	function dropLeft(n, str)
	{
		return n < 1 ? str : str.slice(n);
	}
	function dropRight(n, str)
	{
		return n < 1 ? str : str.slice(0, -n);
	}
	function pad(n, chr, str)
	{
		var half = (n - str.length) / 2;
		return repeat(Math.ceil(half), chr) + str + repeat(half | 0, chr);
	}
	function padRight(n, chr, str)
	{
		return str + repeat(n - str.length, chr);
	}
	function padLeft(n, chr, str)
	{
		return repeat(n - str.length, chr) + str;
	}

	function trim(str)
	{
		return str.trim();
	}
	function trimLeft(str)
	{
		return str.replace(/^\s+/, '');
	}
	function trimRight(str)
	{
		return str.replace(/\s+$/, '');
	}

	function words(str)
	{
		return List.fromArray(str.trim().split(/\s+/g));
	}
	function lines(str)
	{
		return List.fromArray(str.split(/\r\n|\r|\n/g));
	}

	function toUpper(str)
	{
		return str.toUpperCase();
	}
	function toLower(str)
	{
		return str.toLowerCase();
	}

	function any(pred, str)
	{
		for (var i = str.length; i--; )
		{
			if (pred(Utils.chr(str[i])))
			{
				return true;
			}
		}
		return false;
	}
	function all(pred, str)
	{
		for (var i = str.length; i--; )
		{
			if (!pred(Utils.chr(str[i])))
			{
				return false;
			}
		}
		return true;
	}

	function contains(sub, str)
	{
		return str.indexOf(sub) > -1;
	}
	function startsWith(sub, str)
	{
		return str.indexOf(sub) === 0;
	}
	function endsWith(sub, str)
	{
		return str.length >= sub.length &&
			str.lastIndexOf(sub) === str.length - sub.length;
	}
	function indexes(sub, str)
	{
		var subLen = sub.length;
		var i = 0;
		var is = [];
		while ((i = str.indexOf(sub, i)) > -1)
		{
			is.push(i);
			i = i + subLen;
		}
		return List.fromArray(is);
	}

	function toInt(s)
	{
		var len = s.length;
		if (len === 0)
		{
			return Result.Err("could not convert string '" + s + "' to an Int" );
		}
		var start = 0;
		if (s[0] === '-')
		{
			if (len === 1)
			{
				return Result.Err("could not convert string '" + s + "' to an Int" );
			}
			start = 1;
		}
		for (var i = start; i < len; ++i)
		{
			if (!Char.isDigit(s[i]))
			{
				return Result.Err("could not convert string '" + s + "' to an Int" );
			}
		}
		return Result.Ok(parseInt(s, 10));
	}

	function toFloat(s)
	{
		var len = s.length;
		if (len === 0)
		{
			return Result.Err("could not convert string '" + s + "' to a Float" );
		}
		var start = 0;
		if (s[0] === '-')
		{
			if (len === 1)
			{
				return Result.Err("could not convert string '" + s + "' to a Float" );
			}
			start = 1;
		}
		var dotCount = 0;
		for (var i = start; i < len; ++i)
		{
			if (Char.isDigit(s[i]))
			{
				continue;
			}
			if (s[i] === '.')
			{
				dotCount += 1;
				if (dotCount <= 1)
				{
					continue;
				}
			}
			return Result.Err("could not convert string '" + s + "' to a Float" );
		}
		return Result.Ok(parseFloat(s));
	}

	function toList(str)
	{
		return List.fromArray(str.split('').map(Utils.chr));
	}
	function fromList(chars)
	{
		return List.toArray(chars).join('');
	}

	return Elm.Native.String.values = {
		isEmpty: isEmpty,
		cons: F2(cons),
		uncons: uncons,
		append: F2(append),
		concat: concat,
		length: length,
		map: F2(map),
		filter: F2(filter),
		reverse: reverse,
		foldl: F3(foldl),
		foldr: F3(foldr),

		split: F2(split),
		join: F2(join),
		repeat: F2(repeat),

		slice: F3(slice),
		left: F2(left),
		right: F2(right),
		dropLeft: F2(dropLeft),
		dropRight: F2(dropRight),

		pad: F3(pad),
		padLeft: F3(padLeft),
		padRight: F3(padRight),

		trim: trim,
		trimLeft: trimLeft,
		trimRight: trimRight,

		words: words,
		lines: lines,

		toUpper: toUpper,
		toLower: toLower,

		any: F2(any),
		all: F2(all),

		contains: F2(contains),
		startsWith: F2(startsWith),
		endsWith: F2(endsWith),
		indexes: F2(indexes),

		toInt: toInt,
		toFloat: toFloat,
		toList: toList,
		fromList: fromList
	};
};

Elm.Native.Char = {};
Elm.Native.Char.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Char = localRuntime.Native.Char || {};
	if (localRuntime.Native.Char.values)
	{
		return localRuntime.Native.Char.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	return localRuntime.Native.Char.values = {
		fromCode: function(c) { return Utils.chr(String.fromCharCode(c)); },
		toCode: function(c) { return c.charCodeAt(0); },
		toUpper: function(c) { return Utils.chr(c.toUpperCase()); },
		toLower: function(c) { return Utils.chr(c.toLowerCase()); },
		toLocaleUpper: function(c) { return Utils.chr(c.toLocaleUpperCase()); },
		toLocaleLower: function(c) { return Utils.chr(c.toLocaleLowerCase()); }
	};
};

Elm.Char = Elm.Char || {};
Elm.Char.make = function (_elm) {
   "use strict";
   _elm.Char = _elm.Char || {};
   if (_elm.Char.values) return _elm.Char.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Native$Char = Elm.Native.Char.make(_elm);
   var _op = {};
   var fromCode = $Native$Char.fromCode;
   var toCode = $Native$Char.toCode;
   var toLocaleLower = $Native$Char.toLocaleLower;
   var toLocaleUpper = $Native$Char.toLocaleUpper;
   var toLower = $Native$Char.toLower;
   var toUpper = $Native$Char.toUpper;
   var isBetween = F3(function (low,high,$char) {
      var code = toCode($char);
      return _U.cmp(code,toCode(low)) > -1 && _U.cmp(code,
      toCode(high)) < 1;
   });
   var isUpper = A2(isBetween,_U.chr("A"),_U.chr("Z"));
   var isLower = A2(isBetween,_U.chr("a"),_U.chr("z"));
   var isDigit = A2(isBetween,_U.chr("0"),_U.chr("9"));
   var isOctDigit = A2(isBetween,_U.chr("0"),_U.chr("7"));
   var isHexDigit = function ($char) {
      return isDigit($char) || (A3(isBetween,
      _U.chr("a"),
      _U.chr("f"),
      $char) || A3(isBetween,_U.chr("A"),_U.chr("F"),$char));
   };
   return _elm.Char.values = {_op: _op
                             ,isUpper: isUpper
                             ,isLower: isLower
                             ,isDigit: isDigit
                             ,isOctDigit: isOctDigit
                             ,isHexDigit: isHexDigit
                             ,toUpper: toUpper
                             ,toLower: toLower
                             ,toLocaleUpper: toLocaleUpper
                             ,toLocaleLower: toLocaleLower
                             ,toCode: toCode
                             ,fromCode: fromCode};
};
Elm.String = Elm.String || {};
Elm.String.make = function (_elm) {
   "use strict";
   _elm.String = _elm.String || {};
   if (_elm.String.values) return _elm.String.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$String = Elm.Native.String.make(_elm),
   $Result = Elm.Result.make(_elm);
   var _op = {};
   var fromList = $Native$String.fromList;
   var toList = $Native$String.toList;
   var toFloat = $Native$String.toFloat;
   var toInt = $Native$String.toInt;
   var indices = $Native$String.indexes;
   var indexes = $Native$String.indexes;
   var endsWith = $Native$String.endsWith;
   var startsWith = $Native$String.startsWith;
   var contains = $Native$String.contains;
   var all = $Native$String.all;
   var any = $Native$String.any;
   var toLower = $Native$String.toLower;
   var toUpper = $Native$String.toUpper;
   var lines = $Native$String.lines;
   var words = $Native$String.words;
   var trimRight = $Native$String.trimRight;
   var trimLeft = $Native$String.trimLeft;
   var trim = $Native$String.trim;
   var padRight = $Native$String.padRight;
   var padLeft = $Native$String.padLeft;
   var pad = $Native$String.pad;
   var dropRight = $Native$String.dropRight;
   var dropLeft = $Native$String.dropLeft;
   var right = $Native$String.right;
   var left = $Native$String.left;
   var slice = $Native$String.slice;
   var repeat = $Native$String.repeat;
   var join = $Native$String.join;
   var split = $Native$String.split;
   var foldr = $Native$String.foldr;
   var foldl = $Native$String.foldl;
   var reverse = $Native$String.reverse;
   var filter = $Native$String.filter;
   var map = $Native$String.map;
   var length = $Native$String.length;
   var concat = $Native$String.concat;
   var append = $Native$String.append;
   var uncons = $Native$String.uncons;
   var cons = $Native$String.cons;
   var fromChar = function ($char) {    return A2(cons,$char,"");};
   var isEmpty = $Native$String.isEmpty;
   return _elm.String.values = {_op: _op
                               ,isEmpty: isEmpty
                               ,length: length
                               ,reverse: reverse
                               ,repeat: repeat
                               ,cons: cons
                               ,uncons: uncons
                               ,fromChar: fromChar
                               ,append: append
                               ,concat: concat
                               ,split: split
                               ,join: join
                               ,words: words
                               ,lines: lines
                               ,slice: slice
                               ,left: left
                               ,right: right
                               ,dropLeft: dropLeft
                               ,dropRight: dropRight
                               ,contains: contains
                               ,startsWith: startsWith
                               ,endsWith: endsWith
                               ,indexes: indexes
                               ,indices: indices
                               ,toInt: toInt
                               ,toFloat: toFloat
                               ,toList: toList
                               ,fromList: fromList
                               ,toUpper: toUpper
                               ,toLower: toLower
                               ,pad: pad
                               ,padLeft: padLeft
                               ,padRight: padRight
                               ,trim: trim
                               ,trimLeft: trimLeft
                               ,trimRight: trimRight
                               ,map: map
                               ,filter: filter
                               ,foldl: foldl
                               ,foldr: foldr
                               ,any: any
                               ,all: all};
};
Elm.Native.Regex = {};
Elm.Native.Regex.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Regex = localRuntime.Native.Regex || {};
	if (localRuntime.Native.Regex.values)
	{
		return localRuntime.Native.Regex.values;
	}
	if ('values' in Elm.Native.Regex)
	{
		return localRuntime.Native.Regex.values = Elm.Native.Regex.values;
	}

	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);

	function escape(str)
	{
		return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}
	function caseInsensitive(re)
	{
		return new RegExp(re.source, 'gi');
	}
	function regex(raw)
	{
		return new RegExp(raw, 'g');
	}

	function contains(re, string)
	{
		return string.match(re) !== null;
	}

	function find(n, re, str)
	{
		n = n.ctor === 'All' ? Infinity : n._0;
		var out = [];
		var number = 0;
		var string = str;
		var lastIndex = re.lastIndex;
		var prevLastIndex = -1;
		var result;
		while (number++ < n && (result = re.exec(string)))
		{
			if (prevLastIndex === re.lastIndex) break;
			var i = result.length - 1;
			var subs = new Array(i);
			while (i > 0)
			{
				var submatch = result[i];
				subs[--i] = submatch === undefined
					? Maybe.Nothing
					: Maybe.Just(submatch);
			}
			out.push({
				match: result[0],
				submatches: List.fromArray(subs),
				index: result.index,
				number: number
			});
			prevLastIndex = re.lastIndex;
		}
		re.lastIndex = lastIndex;
		return List.fromArray(out);
	}

	function replace(n, re, replacer, string)
	{
		n = n.ctor === 'All' ? Infinity : n._0;
		var count = 0;
		function jsReplacer(match)
		{
			if (count++ >= n)
			{
				return match;
			}
			var i = arguments.length - 3;
			var submatches = new Array(i);
			while (i > 0)
			{
				var submatch = arguments[i];
				submatches[--i] = submatch === undefined
					? Maybe.Nothing
					: Maybe.Just(submatch);
			}
			return replacer({
				match: match,
				submatches: List.fromArray(submatches),
				index: arguments[i - 1],
				number: count
			});
		}
		return string.replace(re, jsReplacer);
	}

	function split(n, re, str)
	{
		n = n.ctor === 'All' ? Infinity : n._0;
		if (n === Infinity)
		{
			return List.fromArray(str.split(re));
		}
		var string = str;
		var result;
		var out = [];
		var start = re.lastIndex;
		while (n--)
		{
			if (!(result = re.exec(string))) break;
			out.push(string.slice(start, result.index));
			start = re.lastIndex;
		}
		out.push(string.slice(start));
		return List.fromArray(out);
	}

	return Elm.Native.Regex.values = {
		regex: regex,
		caseInsensitive: caseInsensitive,
		escape: escape,

		contains: F2(contains),
		find: F3(find),
		replace: F4(replace),
		split: F3(split)
	};
};

Elm.Regex = Elm.Regex || {};
Elm.Regex.make = function (_elm) {
   "use strict";
   _elm.Regex = _elm.Regex || {};
   if (_elm.Regex.values) return _elm.Regex.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Regex = Elm.Native.Regex.make(_elm);
   var _op = {};
   var split = $Native$Regex.split;
   var replace = $Native$Regex.replace;
   var find = $Native$Regex.find;
   var AtMost = function (a) {    return {ctor: "AtMost",_0: a};};
   var All = {ctor: "All"};
   var Match = F4(function (a,b,c,d) {
      return {match: a,submatches: b,index: c,number: d};
   });
   var contains = $Native$Regex.contains;
   var caseInsensitive = $Native$Regex.caseInsensitive;
   var regex = $Native$Regex.regex;
   var escape = $Native$Regex.escape;
   var Regex = {ctor: "Regex"};
   return _elm.Regex.values = {_op: _op
                              ,regex: regex
                              ,escape: escape
                              ,caseInsensitive: caseInsensitive
                              ,contains: contains
                              ,find: find
                              ,replace: replace
                              ,split: split
                              ,Match: Match
                              ,All: All
                              ,AtMost: AtMost};
};
Elm.Belt = Elm.Belt || {};
Elm.Belt.make = function (_elm) {
   "use strict";
   _elm.Belt = _elm.Belt || {};
   if (_elm.Belt.values) return _elm.Belt.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Regex = Elm.Regex.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var commafy = function (n) {
      var replacer = function (match) {
         var _p0 = $List.head(match.submatches);
         if (_p0.ctor === "Nothing") {
               return "";
            } else {
               var _p1 = _p0._0;
               if (_p1.ctor === "Nothing") {
                     return "";
                  } else {
                     return A2($Basics._op["++"],_p1._0,",");
                  }
            }
      };
      var re = $Regex.regex("(\\d)(?=(\\d\\d\\d)+(?!\\d))");
      return A4($Regex.replace,
      $Regex.All,
      re,
      replacer,
      $Basics.toString(n));
   };
   var priceFormula = F3(function (base,ratio,count) {
      var count$ = $Basics.toFloat(count);
      var base$ = $Basics.toFloat(base);
      return _U.eq(ratio,
      1) ? $Basics.floor(base$ * count$) : $Basics.floor(base$ - base$ * Math.pow(ratio,
      count$) / (1 - ratio));
   });
   var calcMonkeyPrice = A2(priceFormula,20,2.0);
   var calcSpeedPrice = A2(priceFormula,5,1.5);
   var scoreWord = function (word) {
      return Math.pow(2,$String.length(word));
   };
   return _elm.Belt.values = {_op: _op
                             ,scoreWord: scoreWord
                             ,priceFormula: priceFormula
                             ,calcMonkeyPrice: calcMonkeyPrice
                             ,calcSpeedPrice: calcSpeedPrice
                             ,commafy: commafy};
};
Elm.Native.Json = {};

Elm.Native.Json.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Json = localRuntime.Native.Json || {};
	if (localRuntime.Native.Json.values) {
		return localRuntime.Native.Json.values;
	}

	var ElmArray = Elm.Native.Array.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Result = Elm.Result.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	function crash(expected, actual) {
		throw new Error(
			'expecting ' + expected + ' but got ' + JSON.stringify(actual)
		);
	}


	// PRIMITIVE VALUES

	function decodeNull(successValue) {
		return function(value) {
			if (value === null) {
				return successValue;
			}
			crash('null', value);
		};
	}


	function decodeString(value) {
		if (typeof value === 'string' || value instanceof String) {
			return value;
		}
		crash('a String', value);
	}


	function decodeFloat(value) {
		if (typeof value === 'number') {
			return value;
		}
		crash('a Float', value);
	}


	function decodeInt(value) {
		if (typeof value !== 'number') {
			crash('an Int', value);
		}

		if (value < 2147483647 && value > -2147483647 && (value | 0) === value) {
			return value;
		}

		if (isFinite(value) && !(value % 1)) {
			return value;
		}

		crash('an Int', value);
	}


	function decodeBool(value) {
		if (typeof value === 'boolean') {
			return value;
		}
		crash('a Bool', value);
	}


	// ARRAY

	function decodeArray(decoder) {
		return function(value) {
			if (value instanceof Array) {
				var len = value.length;
				var array = new Array(len);
				for (var i = len; i--; ) {
					array[i] = decoder(value[i]);
				}
				return ElmArray.fromJSArray(array);
			}
			crash('an Array', value);
		};
	}


	// LIST

	function decodeList(decoder) {
		return function(value) {
			if (value instanceof Array) {
				var len = value.length;
				var list = List.Nil;
				for (var i = len; i--; ) {
					list = List.Cons( decoder(value[i]), list );
				}
				return list;
			}
			crash('a List', value);
		};
	}


	// MAYBE

	function decodeMaybe(decoder) {
		return function(value) {
			try {
				return Maybe.Just(decoder(value));
			} catch(e) {
				return Maybe.Nothing;
			}
		};
	}


	// FIELDS

	function decodeField(field, decoder) {
		return function(value) {
			var subValue = value[field];
			if (subValue !== undefined) {
				return decoder(subValue);
			}
			crash("an object with field '" + field + "'", value);
		};
	}


	// OBJECTS

	function decodeKeyValuePairs(decoder) {
		return function(value) {
			var isObject =
				typeof value === 'object'
					&& value !== null
					&& !(value instanceof Array);

			if (isObject) {
				var keyValuePairs = List.Nil;
				for (var key in value)
				{
					var elmValue = decoder(value[key]);
					var pair = Utils.Tuple2(key, elmValue);
					keyValuePairs = List.Cons(pair, keyValuePairs);
				}
				return keyValuePairs;
			}

			crash('an object', value);
		};
	}

	function decodeObject1(f, d1) {
		return function(value) {
			return f(d1(value));
		};
	}

	function decodeObject2(f, d1, d2) {
		return function(value) {
			return A2( f, d1(value), d2(value) );
		};
	}

	function decodeObject3(f, d1, d2, d3) {
		return function(value) {
			return A3( f, d1(value), d2(value), d3(value) );
		};
	}

	function decodeObject4(f, d1, d2, d3, d4) {
		return function(value) {
			return A4( f, d1(value), d2(value), d3(value), d4(value) );
		};
	}

	function decodeObject5(f, d1, d2, d3, d4, d5) {
		return function(value) {
			return A5( f, d1(value), d2(value), d3(value), d4(value), d5(value) );
		};
	}

	function decodeObject6(f, d1, d2, d3, d4, d5, d6) {
		return function(value) {
			return A6( f,
				d1(value),
				d2(value),
				d3(value),
				d4(value),
				d5(value),
				d6(value)
			);
		};
	}

	function decodeObject7(f, d1, d2, d3, d4, d5, d6, d7) {
		return function(value) {
			return A7( f,
				d1(value),
				d2(value),
				d3(value),
				d4(value),
				d5(value),
				d6(value),
				d7(value)
			);
		};
	}

	function decodeObject8(f, d1, d2, d3, d4, d5, d6, d7, d8) {
		return function(value) {
			return A8( f,
				d1(value),
				d2(value),
				d3(value),
				d4(value),
				d5(value),
				d6(value),
				d7(value),
				d8(value)
			);
		};
	}


	// TUPLES

	function decodeTuple1(f, d1) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 1 ) {
				crash('a Tuple of length 1', value);
			}
			return f( d1(value[0]) );
		};
	}

	function decodeTuple2(f, d1, d2) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 2 ) {
				crash('a Tuple of length 2', value);
			}
			return A2( f, d1(value[0]), d2(value[1]) );
		};
	}

	function decodeTuple3(f, d1, d2, d3) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 3 ) {
				crash('a Tuple of length 3', value);
			}
			return A3( f, d1(value[0]), d2(value[1]), d3(value[2]) );
		};
	}


	function decodeTuple4(f, d1, d2, d3, d4) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 4 ) {
				crash('a Tuple of length 4', value);
			}
			return A4( f, d1(value[0]), d2(value[1]), d3(value[2]), d4(value[3]) );
		};
	}


	function decodeTuple5(f, d1, d2, d3, d4, d5) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 5 ) {
				crash('a Tuple of length 5', value);
			}
			return A5( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4])
			);
		};
	}


	function decodeTuple6(f, d1, d2, d3, d4, d5, d6) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 6 ) {
				crash('a Tuple of length 6', value);
			}
			return A6( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4]),
				d6(value[5])
			);
		};
	}

	function decodeTuple7(f, d1, d2, d3, d4, d5, d6, d7) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 7 ) {
				crash('a Tuple of length 7', value);
			}
			return A7( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4]),
				d6(value[5]),
				d7(value[6])
			);
		};
	}


	function decodeTuple8(f, d1, d2, d3, d4, d5, d6, d7, d8) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 8 ) {
				crash('a Tuple of length 8', value);
			}
			return A8( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4]),
				d6(value[5]),
				d7(value[6]),
				d8(value[7])
			);
		};
	}


	// CUSTOM DECODERS

	function decodeValue(value) {
		return value;
	}

	function runDecoderValue(decoder, value) {
		try {
			return Result.Ok(decoder(value));
		} catch(e) {
			return Result.Err(e.message);
		}
	}

	function customDecoder(decoder, callback) {
		return function(value) {
			var result = callback(decoder(value));
			if (result.ctor === 'Err') {
				throw new Error('custom decoder failed: ' + result._0);
			}
			return result._0;
		};
	}

	function andThen(decode, callback) {
		return function(value) {
			var result = decode(value);
			return callback(result)(value);
		};
	}

	function fail(msg) {
		return function(value) {
			throw new Error(msg);
		};
	}

	function succeed(successValue) {
		return function(value) {
			return successValue;
		};
	}


	// ONE OF MANY

	function oneOf(decoders) {
		return function(value) {
			var errors = [];
			var temp = decoders;
			while (temp.ctor !== '[]') {
				try {
					return temp._0(value);
				} catch(e) {
					errors.push(e.message);
				}
				temp = temp._1;
			}
			throw new Error('expecting one of the following:\n    ' + errors.join('\n    '));
		};
	}

	function get(decoder, value) {
		try {
			return Result.Ok(decoder(value));
		} catch(e) {
			return Result.Err(e.message);
		}
	}


	// ENCODE / DECODE

	function runDecoderString(decoder, string) {
		try {
			return Result.Ok(decoder(JSON.parse(string)));
		} catch(e) {
			return Result.Err(e.message);
		}
	}

	function encode(indentLevel, value) {
		return JSON.stringify(value, null, indentLevel);
	}

	function identity(value) {
		return value;
	}

	function encodeObject(keyValuePairs) {
		var obj = {};
		while (keyValuePairs.ctor !== '[]') {
			var pair = keyValuePairs._0;
			obj[pair._0] = pair._1;
			keyValuePairs = keyValuePairs._1;
		}
		return obj;
	}

	return localRuntime.Native.Json.values = {
		encode: F2(encode),
		runDecoderString: F2(runDecoderString),
		runDecoderValue: F2(runDecoderValue),

		get: F2(get),
		oneOf: oneOf,

		decodeNull: decodeNull,
		decodeInt: decodeInt,
		decodeFloat: decodeFloat,
		decodeString: decodeString,
		decodeBool: decodeBool,

		decodeMaybe: decodeMaybe,

		decodeList: decodeList,
		decodeArray: decodeArray,

		decodeField: F2(decodeField),

		decodeObject1: F2(decodeObject1),
		decodeObject2: F3(decodeObject2),
		decodeObject3: F4(decodeObject3),
		decodeObject4: F5(decodeObject4),
		decodeObject5: F6(decodeObject5),
		decodeObject6: F7(decodeObject6),
		decodeObject7: F8(decodeObject7),
		decodeObject8: F9(decodeObject8),
		decodeKeyValuePairs: decodeKeyValuePairs,

		decodeTuple1: F2(decodeTuple1),
		decodeTuple2: F3(decodeTuple2),
		decodeTuple3: F4(decodeTuple3),
		decodeTuple4: F5(decodeTuple4),
		decodeTuple5: F6(decodeTuple5),
		decodeTuple6: F7(decodeTuple6),
		decodeTuple7: F8(decodeTuple7),
		decodeTuple8: F9(decodeTuple8),

		andThen: F2(andThen),
		decodeValue: decodeValue,
		customDecoder: F2(customDecoder),
		fail: fail,
		succeed: succeed,

		identity: identity,
		encodeNull: null,
		encodeArray: ElmArray.toJSArray,
		encodeList: List.toArray,
		encodeObject: encodeObject

	};
};

Elm.Native.Array = {};
Elm.Native.Array.make = function(localRuntime) {

	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Array = localRuntime.Native.Array || {};
	if (localRuntime.Native.Array.values)
	{
		return localRuntime.Native.Array.values;
	}
	if ('values' in Elm.Native.Array)
	{
		return localRuntime.Native.Array.values = Elm.Native.Array.values;
	}

	var List = Elm.Native.List.make(localRuntime);

	// A RRB-Tree has two distinct data types.
	// Leaf -> "height"  is always 0
	//         "table"   is an array of elements
	// Node -> "height"  is always greater than 0
	//         "table"   is an array of child nodes
	//         "lengths" is an array of accumulated lengths of the child nodes

	// M is the maximal table size. 32 seems fast. E is the allowed increase
	// of search steps when concatting to find an index. Lower values will
	// decrease balancing, but will increase search steps.
	var M = 32;
	var E = 2;

	// An empty array.
	var empty = {
		ctor: '_Array',
		height: 0,
		table: []
	};


	function get(i, array)
	{
		if (i < 0 || i >= length(array))
		{
			throw new Error(
				'Index ' + i + ' is out of range. Check the length of ' +
				'your array first or use getMaybe or getWithDefault.');
		}
		return unsafeGet(i, array);
	}


	function unsafeGet(i, array)
	{
		for (var x = array.height; x > 0; x--)
		{
			var slot = i >> (x * 5);
			while (array.lengths[slot] <= i)
			{
				slot++;
			}
			if (slot > 0)
			{
				i -= array.lengths[slot - 1];
			}
			array = array.table[slot];
		}
		return array.table[i];
	}


	// Sets the value at the index i. Only the nodes leading to i will get
	// copied and updated.
	function set(i, item, array)
	{
		if (i < 0 || length(array) <= i)
		{
			return array;
		}
		return unsafeSet(i, item, array);
	}


	function unsafeSet(i, item, array)
	{
		array = nodeCopy(array);

		if (array.height === 0)
		{
			array.table[i] = item;
		}
		else
		{
			var slot = getSlot(i, array);
			if (slot > 0)
			{
				i -= array.lengths[slot - 1];
			}
			array.table[slot] = unsafeSet(i, item, array.table[slot]);
		}
		return array;
	}


	function initialize(len, f)
	{
		if (len <= 0)
		{
			return empty;
		}
		var h = Math.floor( Math.log(len) / Math.log(M) );
		return initialize_(f, h, 0, len);
	}

	function initialize_(f, h, from, to)
	{
		if (h === 0)
		{
			var table = new Array((to - from) % (M + 1));
			for (var i = 0; i < table.length; i++)
			{
			  table[i] = f(from + i);
			}
			return {
				ctor: '_Array',
				height: 0,
				table: table
			};
		}

		var step = Math.pow(M, h);
		var table = new Array(Math.ceil((to - from) / step));
		var lengths = new Array(table.length);
		for (var i = 0; i < table.length; i++)
		{
			table[i] = initialize_(f, h - 1, from + (i * step), Math.min(from + ((i + 1) * step), to));
			lengths[i] = length(table[i]) + (i > 0 ? lengths[i-1] : 0);
		}
		return {
			ctor: '_Array',
			height: h,
			table: table,
			lengths: lengths
		};
	}

	function fromList(list)
	{
		if (list === List.Nil)
		{
			return empty;
		}

		// Allocate M sized blocks (table) and write list elements to it.
		var table = new Array(M);
		var nodes = [];
		var i = 0;

		while (list.ctor !== '[]')
		{
			table[i] = list._0;
			list = list._1;
			i++;

			// table is full, so we can push a leaf containing it into the
			// next node.
			if (i === M)
			{
				var leaf = {
					ctor: '_Array',
					height: 0,
					table: table
				};
				fromListPush(leaf, nodes);
				table = new Array(M);
				i = 0;
			}
		}

		// Maybe there is something left on the table.
		if (i > 0)
		{
			var leaf = {
				ctor: '_Array',
				height: 0,
				table: table.splice(0, i)
			};
			fromListPush(leaf, nodes);
		}

		// Go through all of the nodes and eventually push them into higher nodes.
		for (var h = 0; h < nodes.length - 1; h++)
		{
			if (nodes[h].table.length > 0)
			{
				fromListPush(nodes[h], nodes);
			}
		}

		var head = nodes[nodes.length - 1];
		if (head.height > 0 && head.table.length === 1)
		{
			return head.table[0];
		}
		else
		{
			return head;
		}
	}

	// Push a node into a higher node as a child.
	function fromListPush(toPush, nodes)
	{
		var h = toPush.height;

		// Maybe the node on this height does not exist.
		if (nodes.length === h)
		{
			var node = {
				ctor: '_Array',
				height: h + 1,
				table: [],
				lengths: []
			};
			nodes.push(node);
		}

		nodes[h].table.push(toPush);
		var len = length(toPush);
		if (nodes[h].lengths.length > 0)
		{
			len += nodes[h].lengths[nodes[h].lengths.length - 1];
		}
		nodes[h].lengths.push(len);

		if (nodes[h].table.length === M)
		{
			fromListPush(nodes[h], nodes);
			nodes[h] = {
				ctor: '_Array',
				height: h + 1,
				table: [],
				lengths: []
			};
		}
	}

	// Pushes an item via push_ to the bottom right of a tree.
	function push(item, a)
	{
		var pushed = push_(item, a);
		if (pushed !== null)
		{
			return pushed;
		}

		var newTree = create(item, a.height);
		return siblise(a, newTree);
	}

	// Recursively tries to push an item to the bottom-right most
	// tree possible. If there is no space left for the item,
	// null will be returned.
	function push_(item, a)
	{
		// Handle resursion stop at leaf level.
		if (a.height === 0)
		{
			if (a.table.length < M)
			{
				var newA = {
					ctor: '_Array',
					height: 0,
					table: a.table.slice()
				};
				newA.table.push(item);
				return newA;
			}
			else
			{
			  return null;
			}
		}

		// Recursively push
		var pushed = push_(item, botRight(a));

		// There was space in the bottom right tree, so the slot will
		// be updated.
		if (pushed !== null)
		{
			var newA = nodeCopy(a);
			newA.table[newA.table.length - 1] = pushed;
			newA.lengths[newA.lengths.length - 1]++;
			return newA;
		}

		// When there was no space left, check if there is space left
		// for a new slot with a tree which contains only the item
		// at the bottom.
		if (a.table.length < M)
		{
			var newSlot = create(item, a.height - 1);
			var newA = nodeCopy(a);
			newA.table.push(newSlot);
			newA.lengths.push(newA.lengths[newA.lengths.length - 1] + length(newSlot));
			return newA;
		}
		else
		{
			return null;
		}
	}

	// Converts an array into a list of elements.
	function toList(a)
	{
		return toList_(List.Nil, a);
	}

	function toList_(list, a)
	{
		for (var i = a.table.length - 1; i >= 0; i--)
		{
			list =
				a.height === 0
					? List.Cons(a.table[i], list)
					: toList_(list, a.table[i]);
		}
		return list;
	}

	// Maps a function over the elements of an array.
	function map(f, a)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: new Array(a.table.length)
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths;
		}
		for (var i = 0; i < a.table.length; i++)
		{
			newA.table[i] =
				a.height === 0
					? f(a.table[i])
					: map(f, a.table[i]);
		}
		return newA;
	}

	// Maps a function over the elements with their index as first argument.
	function indexedMap(f, a)
	{
		return indexedMap_(f, a, 0);
	}

	function indexedMap_(f, a, from)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: new Array(a.table.length)
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths;
		}
		for (var i = 0; i < a.table.length; i++)
		{
			newA.table[i] =
				a.height === 0
					? A2(f, from + i, a.table[i])
					: indexedMap_(f, a.table[i], i == 0 ? from : from + a.lengths[i - 1]);
		}
		return newA;
	}

	function foldl(f, b, a)
	{
		if (a.height === 0)
		{
			for (var i = 0; i < a.table.length; i++)
			{
				b = A2(f, a.table[i], b);
			}
		}
		else
		{
			for (var i = 0; i < a.table.length; i++)
			{
				b = foldl(f, b, a.table[i]);
			}
		}
		return b;
	}

	function foldr(f, b, a)
	{
		if (a.height === 0)
		{
			for (var i = a.table.length; i--; )
			{
				b = A2(f, a.table[i], b);
			}
		}
		else
		{
			for (var i = a.table.length; i--; )
			{
				b = foldr(f, b, a.table[i]);
			}
		}
		return b;
	}

	// TODO: currently, it slices the right, then the left. This can be
	// optimized.
	function slice(from, to, a)
	{
		if (from < 0)
		{
			from += length(a);
		}
		if (to < 0)
		{
			to += length(a);
		}
		return sliceLeft(from, sliceRight(to, a));
	}

	function sliceRight(to, a)
	{
		if (to === length(a))
		{
			return a;
		}

		// Handle leaf level.
		if (a.height === 0)
		{
			var newA = { ctor:'_Array', height:0 };
			newA.table = a.table.slice(0, to);
			return newA;
		}

		// Slice the right recursively.
		var right = getSlot(to, a);
		var sliced = sliceRight(to - (right > 0 ? a.lengths[right - 1] : 0), a.table[right]);

		// Maybe the a node is not even needed, as sliced contains the whole slice.
		if (right === 0)
		{
			return sliced;
		}

		// Create new node.
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice(0, right),
			lengths: a.lengths.slice(0, right)
		};
		if (sliced.table.length > 0)
		{
			newA.table[right] = sliced;
			newA.lengths[right] = length(sliced) + (right > 0 ? newA.lengths[right - 1] : 0);
		}
		return newA;
	}

	function sliceLeft(from, a)
	{
		if (from === 0)
		{
			return a;
		}

		// Handle leaf level.
		if (a.height === 0)
		{
			var newA = { ctor:'_Array', height:0 };
			newA.table = a.table.slice(from, a.table.length + 1);
			return newA;
		}

		// Slice the left recursively.
		var left = getSlot(from, a);
		var sliced = sliceLeft(from - (left > 0 ? a.lengths[left - 1] : 0), a.table[left]);

		// Maybe the a node is not even needed, as sliced contains the whole slice.
		if (left === a.table.length - 1)
		{
			return sliced;
		}

		// Create new node.
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice(left, a.table.length + 1),
			lengths: new Array(a.table.length - left)
		};
		newA.table[0] = sliced;
		var len = 0;
		for (var i = 0; i < newA.table.length; i++)
		{
			len += length(newA.table[i]);
			newA.lengths[i] = len;
		}

		return newA;
	}

	// Appends two trees.
	function append(a,b)
	{
		if (a.table.length === 0)
		{
			return b;
		}
		if (b.table.length === 0)
		{
			return a;
		}

		var c = append_(a, b);

		// Check if both nodes can be crunshed together.
		if (c[0].table.length + c[1].table.length <= M)
		{
			if (c[0].table.length === 0)
			{
				return c[1];
			}
			if (c[1].table.length === 0)
			{
				return c[0];
			}

			// Adjust .table and .lengths
			c[0].table = c[0].table.concat(c[1].table);
			if (c[0].height > 0)
			{
				var len = length(c[0]);
				for (var i = 0; i < c[1].lengths.length; i++)
				{
					c[1].lengths[i] += len;
				}
				c[0].lengths = c[0].lengths.concat(c[1].lengths);
			}

			return c[0];
		}

		if (c[0].height > 0)
		{
			var toRemove = calcToRemove(a, b);
			if (toRemove > E)
			{
				c = shuffle(c[0], c[1], toRemove);
			}
		}

		return siblise(c[0], c[1]);
	}

	// Returns an array of two nodes; right and left. One node _may_ be empty.
	function append_(a, b)
	{
		if (a.height === 0 && b.height === 0)
		{
			return [a, b];
		}

		if (a.height !== 1 || b.height !== 1)
		{
			if (a.height === b.height)
			{
				a = nodeCopy(a);
				b = nodeCopy(b);
				var appended = append_(botRight(a), botLeft(b));

				insertRight(a, appended[1]);
				insertLeft(b, appended[0]);
			}
			else if (a.height > b.height)
			{
				a = nodeCopy(a);
				var appended = append_(botRight(a), b);

				insertRight(a, appended[0]);
				b = parentise(appended[1], appended[1].height + 1);
			}
			else
			{
				b = nodeCopy(b);
				var appended = append_(a, botLeft(b));

				var left = appended[0].table.length === 0 ? 0 : 1;
				var right = left === 0 ? 1 : 0;
				insertLeft(b, appended[left]);
				a = parentise(appended[right], appended[right].height + 1);
			}
		}

		// Check if balancing is needed and return based on that.
		if (a.table.length === 0 || b.table.length === 0)
		{
			return [a, b];
		}

		var toRemove = calcToRemove(a, b);
		if (toRemove <= E)
		{
			return [a, b];
		}
		return shuffle(a, b, toRemove);
	}

	// Helperfunctions for append_. Replaces a child node at the side of the parent.
	function insertRight(parent, node)
	{
		var index = parent.table.length - 1;
		parent.table[index] = node;
		parent.lengths[index] = length(node);
		parent.lengths[index] += index > 0 ? parent.lengths[index - 1] : 0;
	}

	function insertLeft(parent, node)
	{
		if (node.table.length > 0)
		{
			parent.table[0] = node;
			parent.lengths[0] = length(node);

			var len = length(parent.table[0]);
			for (var i = 1; i < parent.lengths.length; i++)
			{
				len += length(parent.table[i]);
				parent.lengths[i] = len;
			}
		}
		else
		{
			parent.table.shift();
			for (var i = 1; i < parent.lengths.length; i++)
			{
				parent.lengths[i] = parent.lengths[i] - parent.lengths[0];
			}
			parent.lengths.shift();
		}
	}

	// Returns the extra search steps for E. Refer to the paper.
	function calcToRemove(a, b)
	{
		var subLengths = 0;
		for (var i = 0; i < a.table.length; i++)
		{
			subLengths += a.table[i].table.length;
		}
		for (var i = 0; i < b.table.length; i++)
		{
			subLengths += b.table[i].table.length;
		}

		var toRemove = a.table.length + b.table.length;
		return toRemove - (Math.floor((subLengths - 1) / M) + 1);
	}

	// get2, set2 and saveSlot are helpers for accessing elements over two arrays.
	function get2(a, b, index)
	{
		return index < a.length
			? a[index]
			: b[index - a.length];
	}

	function set2(a, b, index, value)
	{
		if (index < a.length)
		{
			a[index] = value;
		}
		else
		{
			b[index - a.length] = value;
		}
	}

	function saveSlot(a, b, index, slot)
	{
		set2(a.table, b.table, index, slot);

		var l = (index === 0 || index === a.lengths.length)
			? 0
			: get2(a.lengths, a.lengths, index - 1);

		set2(a.lengths, b.lengths, index, l + length(slot));
	}

	// Creates a node or leaf with a given length at their arrays for perfomance.
	// Is only used by shuffle.
	function createNode(h, length)
	{
		if (length < 0)
		{
			length = 0;
		}
		var a = {
			ctor: '_Array',
			height: h,
			table: new Array(length)
		};
		if (h > 0)
		{
			a.lengths = new Array(length);
		}
		return a;
	}

	// Returns an array of two balanced nodes.
	function shuffle(a, b, toRemove)
	{
		var newA = createNode(a.height, Math.min(M, a.table.length + b.table.length - toRemove));
		var newB = createNode(a.height, newA.table.length - (a.table.length + b.table.length - toRemove));

		// Skip the slots with size M. More precise: copy the slot references
		// to the new node
		var read = 0;
		while (get2(a.table, b.table, read).table.length % M === 0)
		{
			set2(newA.table, newB.table, read, get2(a.table, b.table, read));
			set2(newA.lengths, newB.lengths, read, get2(a.lengths, b.lengths, read));
			read++;
		}

		// Pulling items from left to right, caching in a slot before writing
		// it into the new nodes.
		var write = read;
		var slot = new createNode(a.height - 1, 0);
		var from = 0;

		// If the current slot is still containing data, then there will be at
		// least one more write, so we do not break this loop yet.
		while (read - write - (slot.table.length > 0 ? 1 : 0) < toRemove)
		{
			// Find out the max possible items for copying.
			var source = get2(a.table, b.table, read);
			var to = Math.min(M - slot.table.length, source.table.length);

			// Copy and adjust size table.
			slot.table = slot.table.concat(source.table.slice(from, to));
			if (slot.height > 0)
			{
				var len = slot.lengths.length;
				for (var i = len; i < len + to - from; i++)
				{
					slot.lengths[i] = length(slot.table[i]);
					slot.lengths[i] += (i > 0 ? slot.lengths[i - 1] : 0);
				}
			}

			from += to;

			// Only proceed to next slots[i] if the current one was
			// fully copied.
			if (source.table.length <= to)
			{
				read++; from = 0;
			}

			// Only create a new slot if the current one is filled up.
			if (slot.table.length === M)
			{
				saveSlot(newA, newB, write, slot);
				slot = createNode(a.height - 1, 0);
				write++;
			}
		}

		// Cleanup after the loop. Copy the last slot into the new nodes.
		if (slot.table.length > 0)
		{
			saveSlot(newA, newB, write, slot);
			write++;
		}

		// Shift the untouched slots to the left
		while (read < a.table.length + b.table.length )
		{
			saveSlot(newA, newB, write, get2(a.table, b.table, read));
			read++;
			write++;
		}

		return [newA, newB];
	}

	// Navigation functions
	function botRight(a)
	{
		return a.table[a.table.length - 1];
	}
	function botLeft(a)
	{
		return a.table[0];
	}

	// Copies a node for updating. Note that you should not use this if
	// only updating only one of "table" or "lengths" for performance reasons.
	function nodeCopy(a)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice()
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths.slice();
		}
		return newA;
	}

	// Returns how many items are in the tree.
	function length(array)
	{
		if (array.height === 0)
		{
			return array.table.length;
		}
		else
		{
			return array.lengths[array.lengths.length - 1];
		}
	}

	// Calculates in which slot of "table" the item probably is, then
	// find the exact slot via forward searching in  "lengths". Returns the index.
	function getSlot(i, a)
	{
		var slot = i >> (5 * a.height);
		while (a.lengths[slot] <= i)
		{
			slot++;
		}
		return slot;
	}

	// Recursively creates a tree with a given height containing
	// only the given item.
	function create(item, h)
	{
		if (h === 0)
		{
			return {
				ctor: '_Array',
				height: 0,
				table: [item]
			};
		}
		return {
			ctor: '_Array',
			height: h,
			table: [create(item, h - 1)],
			lengths: [1]
		};
	}

	// Recursively creates a tree that contains the given tree.
	function parentise(tree, h)
	{
		if (h === tree.height)
		{
			return tree;
		}

		return {
			ctor: '_Array',
			height: h,
			table: [parentise(tree, h - 1)],
			lengths: [length(tree)]
		};
	}

	// Emphasizes blood brotherhood beneath two trees.
	function siblise(a, b)
	{
		return {
			ctor: '_Array',
			height: a.height + 1,
			table: [a, b],
			lengths: [length(a), length(a) + length(b)]
		};
	}

	function toJSArray(a)
	{
		var jsArray = new Array(length(a));
		toJSArray_(jsArray, 0, a);
		return jsArray;
	}

	function toJSArray_(jsArray, i, a)
	{
		for (var t = 0; t < a.table.length; t++)
		{
			if (a.height === 0)
			{
				jsArray[i + t] = a.table[t];
			}
			else
			{
				var inc = t === 0 ? 0 : a.lengths[t - 1];
				toJSArray_(jsArray, i + inc, a.table[t]);
			}
		}
	}

	function fromJSArray(jsArray)
	{
		if (jsArray.length === 0)
		{
			return empty;
		}
		var h = Math.floor(Math.log(jsArray.length) / Math.log(M));
		return fromJSArray_(jsArray, h, 0, jsArray.length);
	}

	function fromJSArray_(jsArray, h, from, to)
	{
		if (h === 0)
		{
			return {
				ctor: '_Array',
				height: 0,
				table: jsArray.slice(from, to)
			};
		}

		var step = Math.pow(M, h);
		var table = new Array(Math.ceil((to - from) / step));
		var lengths = new Array(table.length);
		for (var i = 0; i < table.length; i++)
		{
			table[i] = fromJSArray_(jsArray, h - 1, from + (i * step), Math.min(from + ((i + 1) * step), to));
			lengths[i] = length(table[i]) + (i > 0 ? lengths[i - 1] : 0);
		}
		return {
			ctor: '_Array',
			height: h,
			table: table,
			lengths: lengths
		};
	}

	Elm.Native.Array.values = {
		empty: empty,
		fromList: fromList,
		toList: toList,
		initialize: F2(initialize),
		append: F2(append),
		push: F2(push),
		slice: F3(slice),
		get: F2(get),
		set: F3(set),
		map: F2(map),
		indexedMap: F2(indexedMap),
		foldl: F3(foldl),
		foldr: F3(foldr),
		length: length,

		toJSArray: toJSArray,
		fromJSArray: fromJSArray
	};

	return localRuntime.Native.Array.values = Elm.Native.Array.values;
};

Elm.Array = Elm.Array || {};
Elm.Array.make = function (_elm) {
   "use strict";
   _elm.Array = _elm.Array || {};
   if (_elm.Array.values) return _elm.Array.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Array = Elm.Native.Array.make(_elm);
   var _op = {};
   var append = $Native$Array.append;
   var length = $Native$Array.length;
   var isEmpty = function (array) {
      return _U.eq(length(array),0);
   };
   var slice = $Native$Array.slice;
   var set = $Native$Array.set;
   var get = F2(function (i,array) {
      return _U.cmp(0,i) < 1 && _U.cmp(i,
      $Native$Array.length(array)) < 0 ? $Maybe.Just(A2($Native$Array.get,
      i,
      array)) : $Maybe.Nothing;
   });
   var push = $Native$Array.push;
   var empty = $Native$Array.empty;
   var filter = F2(function (isOkay,arr) {
      var update = F2(function (x,xs) {
         return isOkay(x) ? A2($Native$Array.push,x,xs) : xs;
      });
      return A3($Native$Array.foldl,update,$Native$Array.empty,arr);
   });
   var foldr = $Native$Array.foldr;
   var foldl = $Native$Array.foldl;
   var indexedMap = $Native$Array.indexedMap;
   var map = $Native$Array.map;
   var toIndexedList = function (array) {
      return A3($List.map2,
      F2(function (v0,v1) {
         return {ctor: "_Tuple2",_0: v0,_1: v1};
      }),
      _U.range(0,$Native$Array.length(array) - 1),
      $Native$Array.toList(array));
   };
   var toList = $Native$Array.toList;
   var fromList = $Native$Array.fromList;
   var initialize = $Native$Array.initialize;
   var repeat = F2(function (n,e) {
      return A2(initialize,n,$Basics.always(e));
   });
   var Array = {ctor: "Array"};
   return _elm.Array.values = {_op: _op
                              ,empty: empty
                              ,repeat: repeat
                              ,initialize: initialize
                              ,fromList: fromList
                              ,isEmpty: isEmpty
                              ,length: length
                              ,push: push
                              ,append: append
                              ,get: get
                              ,set: set
                              ,slice: slice
                              ,toList: toList
                              ,toIndexedList: toIndexedList
                              ,map: map
                              ,indexedMap: indexedMap
                              ,filter: filter
                              ,foldl: foldl
                              ,foldr: foldr};
};
Elm.Dict = Elm.Dict || {};
Elm.Dict.make = function (_elm) {
   "use strict";
   _elm.Dict = _elm.Dict || {};
   if (_elm.Dict.values) return _elm.Dict.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Debug = Elm.Native.Debug.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var foldr = F3(function (f,acc,t) {
      foldr: while (true) {
         var _p0 = t;
         if (_p0.ctor === "RBEmpty_elm_builtin") {
               return acc;
            } else {
               var _v1 = f,
               _v2 = A3(f,_p0._1,_p0._2,A3(foldr,f,acc,_p0._4)),
               _v3 = _p0._3;
               f = _v1;
               acc = _v2;
               t = _v3;
               continue foldr;
            }
      }
   });
   var keys = function (dict) {
      return A3(foldr,
      F3(function (key,value,keyList) {
         return A2($List._op["::"],key,keyList);
      }),
      _U.list([]),
      dict);
   };
   var values = function (dict) {
      return A3(foldr,
      F3(function (key,value,valueList) {
         return A2($List._op["::"],value,valueList);
      }),
      _U.list([]),
      dict);
   };
   var toList = function (dict) {
      return A3(foldr,
      F3(function (key,value,list) {
         return A2($List._op["::"],
         {ctor: "_Tuple2",_0: key,_1: value},
         list);
      }),
      _U.list([]),
      dict);
   };
   var foldl = F3(function (f,acc,dict) {
      foldl: while (true) {
         var _p1 = dict;
         if (_p1.ctor === "RBEmpty_elm_builtin") {
               return acc;
            } else {
               var _v5 = f,
               _v6 = A3(f,_p1._1,_p1._2,A3(foldl,f,acc,_p1._3)),
               _v7 = _p1._4;
               f = _v5;
               acc = _v6;
               dict = _v7;
               continue foldl;
            }
      }
   });
   var reportRemBug = F4(function (msg,c,lgot,rgot) {
      return $Native$Debug.crash($String.concat(_U.list(["Internal red-black tree invariant violated, expected "
                                                        ,msg
                                                        ," and got "
                                                        ,$Basics.toString(c)
                                                        ,"/"
                                                        ,lgot
                                                        ,"/"
                                                        ,rgot
                                                        ,"\nPlease report this bug to <https://github.com/elm-lang/core/issues>"])));
   });
   var isBBlack = function (dict) {
      var _p2 = dict;
      _v8_2: do {
         if (_p2.ctor === "RBNode_elm_builtin") {
               if (_p2._0.ctor === "BBlack") {
                     return true;
                  } else {
                     break _v8_2;
                  }
            } else {
               if (_p2._0.ctor === "LBBlack") {
                     return true;
                  } else {
                     break _v8_2;
                  }
            }
      } while (false);
      return false;
   };
   var Same = {ctor: "Same"};
   var Remove = {ctor: "Remove"};
   var Insert = {ctor: "Insert"};
   var sizeHelp = F2(function (n,dict) {
      sizeHelp: while (true) {
         var _p3 = dict;
         if (_p3.ctor === "RBEmpty_elm_builtin") {
               return n;
            } else {
               var _v10 = A2(sizeHelp,n + 1,_p3._4),_v11 = _p3._3;
               n = _v10;
               dict = _v11;
               continue sizeHelp;
            }
      }
   });
   var size = function (dict) {    return A2(sizeHelp,0,dict);};
   var get = F2(function (targetKey,dict) {
      get: while (true) {
         var _p4 = dict;
         if (_p4.ctor === "RBEmpty_elm_builtin") {
               return $Maybe.Nothing;
            } else {
               var _p5 = A2($Basics.compare,targetKey,_p4._1);
               switch (_p5.ctor)
               {case "LT": var _v14 = targetKey,_v15 = _p4._3;
                    targetKey = _v14;
                    dict = _v15;
                    continue get;
                  case "EQ": return $Maybe.Just(_p4._2);
                  default: var _v16 = targetKey,_v17 = _p4._4;
                    targetKey = _v16;
                    dict = _v17;
                    continue get;}
            }
      }
   });
   var member = F2(function (key,dict) {
      var _p6 = A2(get,key,dict);
      if (_p6.ctor === "Just") {
            return true;
         } else {
            return false;
         }
   });
   var maxWithDefault = F3(function (k,v,r) {
      maxWithDefault: while (true) {
         var _p7 = r;
         if (_p7.ctor === "RBEmpty_elm_builtin") {
               return {ctor: "_Tuple2",_0: k,_1: v};
            } else {
               var _v20 = _p7._1,_v21 = _p7._2,_v22 = _p7._4;
               k = _v20;
               v = _v21;
               r = _v22;
               continue maxWithDefault;
            }
      }
   });
   var RBEmpty_elm_builtin = function (a) {
      return {ctor: "RBEmpty_elm_builtin",_0: a};
   };
   var RBNode_elm_builtin = F5(function (a,b,c,d,e) {
      return {ctor: "RBNode_elm_builtin"
             ,_0: a
             ,_1: b
             ,_2: c
             ,_3: d
             ,_4: e};
   });
   var LBBlack = {ctor: "LBBlack"};
   var LBlack = {ctor: "LBlack"};
   var empty = RBEmpty_elm_builtin(LBlack);
   var isEmpty = function (dict) {    return _U.eq(dict,empty);};
   var map = F2(function (f,dict) {
      var _p8 = dict;
      if (_p8.ctor === "RBEmpty_elm_builtin") {
            return RBEmpty_elm_builtin(LBlack);
         } else {
            var _p9 = _p8._1;
            return A5(RBNode_elm_builtin,
            _p8._0,
            _p9,
            A2(f,_p9,_p8._2),
            A2(map,f,_p8._3),
            A2(map,f,_p8._4));
         }
   });
   var NBlack = {ctor: "NBlack"};
   var BBlack = {ctor: "BBlack"};
   var Black = {ctor: "Black"};
   var ensureBlackRoot = function (dict) {
      var _p10 = dict;
      if (_p10.ctor === "RBNode_elm_builtin" && _p10._0.ctor === "Red")
      {
            return A5(RBNode_elm_builtin,
            Black,
            _p10._1,
            _p10._2,
            _p10._3,
            _p10._4);
         } else {
            return dict;
         }
   };
   var blackish = function (t) {
      var _p11 = t;
      if (_p11.ctor === "RBNode_elm_builtin") {
            var _p12 = _p11._0;
            return _U.eq(_p12,Black) || _U.eq(_p12,BBlack);
         } else {
            return true;
         }
   };
   var blacken = function (t) {
      var _p13 = t;
      if (_p13.ctor === "RBEmpty_elm_builtin") {
            return RBEmpty_elm_builtin(LBlack);
         } else {
            return A5(RBNode_elm_builtin,
            Black,
            _p13._1,
            _p13._2,
            _p13._3,
            _p13._4);
         }
   };
   var Red = {ctor: "Red"};
   var moreBlack = function (color) {
      var _p14 = color;
      switch (_p14.ctor)
      {case "Black": return BBlack;
         case "Red": return Black;
         case "NBlack": return Red;
         default:
         return $Native$Debug.crash("Can\'t make a double black node more black!");}
   };
   var lessBlack = function (color) {
      var _p15 = color;
      switch (_p15.ctor)
      {case "BBlack": return Black;
         case "Black": return Red;
         case "Red": return NBlack;
         default:
         return $Native$Debug.crash("Can\'t make a negative black node less black!");}
   };
   var lessBlackTree = function (dict) {
      var _p16 = dict;
      if (_p16.ctor === "RBNode_elm_builtin") {
            return A5(RBNode_elm_builtin,
            lessBlack(_p16._0),
            _p16._1,
            _p16._2,
            _p16._3,
            _p16._4);
         } else {
            return RBEmpty_elm_builtin(LBlack);
         }
   };
   var balancedTree = function (col) {
      return function (xk) {
         return function (xv) {
            return function (yk) {
               return function (yv) {
                  return function (zk) {
                     return function (zv) {
                        return function (a) {
                           return function (b) {
                              return function (c) {
                                 return function (d) {
                                    return A5(RBNode_elm_builtin,
                                    lessBlack(col),
                                    yk,
                                    yv,
                                    A5(RBNode_elm_builtin,Black,xk,xv,a,b),
                                    A5(RBNode_elm_builtin,Black,zk,zv,c,d));
                                 };
                              };
                           };
                        };
                     };
                  };
               };
            };
         };
      };
   };
   var redden = function (t) {
      var _p17 = t;
      if (_p17.ctor === "RBEmpty_elm_builtin") {
            return $Native$Debug.crash("can\'t make a Leaf red");
         } else {
            return A5(RBNode_elm_builtin,
            Red,
            _p17._1,
            _p17._2,
            _p17._3,
            _p17._4);
         }
   };
   var balanceHelp = function (tree) {
      var _p18 = tree;
      _v31_6: do {
         _v31_5: do {
            _v31_4: do {
               _v31_3: do {
                  _v31_2: do {
                     _v31_1: do {
                        _v31_0: do {
                           if (_p18.ctor === "RBNode_elm_builtin") {
                                 if (_p18._3.ctor === "RBNode_elm_builtin") {
                                       if (_p18._4.ctor === "RBNode_elm_builtin") {
                                             switch (_p18._3._0.ctor)
                                             {case "Red": switch (_p18._4._0.ctor)
                                                  {case "Red":
                                                     if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red")
                                                       {
                                                             break _v31_0;
                                                          } else {
                                                             if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red")
                                                             {
                                                                   break _v31_1;
                                                                } else {
                                                                   if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red")
                                                                   {
                                                                         break _v31_2;
                                                                      } else {
                                                                         if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red")
                                                                         {
                                                                               break _v31_3;
                                                                            } else {
                                                                               break _v31_6;
                                                                            }
                                                                      }
                                                                }
                                                          }
                                                     case "NBlack":
                                                     if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red")
                                                       {
                                                             break _v31_0;
                                                          } else {
                                                             if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red")
                                                             {
                                                                   break _v31_1;
                                                                } else {
                                                                   if (_p18._0.ctor === "BBlack" && _p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                                   {
                                                                         break _v31_4;
                                                                      } else {
                                                                         break _v31_6;
                                                                      }
                                                                }
                                                          }
                                                     default:
                                                     if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red")
                                                       {
                                                             break _v31_0;
                                                          } else {
                                                             if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red")
                                                             {
                                                                   break _v31_1;
                                                                } else {
                                                                   break _v31_6;
                                                                }
                                                          }}
                                                case "NBlack": switch (_p18._4._0.ctor)
                                                  {case "Red":
                                                     if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red")
                                                       {
                                                             break _v31_2;
                                                          } else {
                                                             if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red")
                                                             {
                                                                   break _v31_3;
                                                                } else {
                                                                   if (_p18._0.ctor === "BBlack" && _p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                                   {
                                                                         break _v31_5;
                                                                      } else {
                                                                         break _v31_6;
                                                                      }
                                                                }
                                                          }
                                                     case "NBlack": if (_p18._0.ctor === "BBlack") {
                                                             if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                             {
                                                                   break _v31_4;
                                                                } else {
                                                                   if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                                   {
                                                                         break _v31_5;
                                                                      } else {
                                                                         break _v31_6;
                                                                      }
                                                                }
                                                          } else {
                                                             break _v31_6;
                                                          }
                                                     default:
                                                     if (_p18._0.ctor === "BBlack" && _p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                       {
                                                             break _v31_5;
                                                          } else {
                                                             break _v31_6;
                                                          }}
                                                default: switch (_p18._4._0.ctor)
                                                  {case "Red":
                                                     if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red")
                                                       {
                                                             break _v31_2;
                                                          } else {
                                                             if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red")
                                                             {
                                                                   break _v31_3;
                                                                } else {
                                                                   break _v31_6;
                                                                }
                                                          }
                                                     case "NBlack":
                                                     if (_p18._0.ctor === "BBlack" && _p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                       {
                                                             break _v31_4;
                                                          } else {
                                                             break _v31_6;
                                                          }
                                                     default: break _v31_6;}}
                                          } else {
                                             switch (_p18._3._0.ctor)
                                             {case "Red":
                                                if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red")
                                                  {
                                                        break _v31_0;
                                                     } else {
                                                        if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red")
                                                        {
                                                              break _v31_1;
                                                           } else {
                                                              break _v31_6;
                                                           }
                                                     }
                                                case "NBlack":
                                                if (_p18._0.ctor === "BBlack" && _p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                  {
                                                        break _v31_5;
                                                     } else {
                                                        break _v31_6;
                                                     }
                                                default: break _v31_6;}
                                          }
                                    } else {
                                       if (_p18._4.ctor === "RBNode_elm_builtin") {
                                             switch (_p18._4._0.ctor)
                                             {case "Red":
                                                if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red")
                                                  {
                                                        break _v31_2;
                                                     } else {
                                                        if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red")
                                                        {
                                                              break _v31_3;
                                                           } else {
                                                              break _v31_6;
                                                           }
                                                     }
                                                case "NBlack":
                                                if (_p18._0.ctor === "BBlack" && _p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                  {
                                                        break _v31_4;
                                                     } else {
                                                        break _v31_6;
                                                     }
                                                default: break _v31_6;}
                                          } else {
                                             break _v31_6;
                                          }
                                    }
                              } else {
                                 break _v31_6;
                              }
                        } while (false);
                        return balancedTree(_p18._0)(_p18._3._3._1)(_p18._3._3._2)(_p18._3._1)(_p18._3._2)(_p18._1)(_p18._2)(_p18._3._3._3)(_p18._3._3._4)(_p18._3._4)(_p18._4);
                     } while (false);
                     return balancedTree(_p18._0)(_p18._3._1)(_p18._3._2)(_p18._3._4._1)(_p18._3._4._2)(_p18._1)(_p18._2)(_p18._3._3)(_p18._3._4._3)(_p18._3._4._4)(_p18._4);
                  } while (false);
                  return balancedTree(_p18._0)(_p18._1)(_p18._2)(_p18._4._3._1)(_p18._4._3._2)(_p18._4._1)(_p18._4._2)(_p18._3)(_p18._4._3._3)(_p18._4._3._4)(_p18._4._4);
               } while (false);
               return balancedTree(_p18._0)(_p18._1)(_p18._2)(_p18._4._1)(_p18._4._2)(_p18._4._4._1)(_p18._4._4._2)(_p18._3)(_p18._4._3)(_p18._4._4._3)(_p18._4._4._4);
            } while (false);
            return A5(RBNode_elm_builtin,
            Black,
            _p18._4._3._1,
            _p18._4._3._2,
            A5(RBNode_elm_builtin,
            Black,
            _p18._1,
            _p18._2,
            _p18._3,
            _p18._4._3._3),
            A5(balance,
            Black,
            _p18._4._1,
            _p18._4._2,
            _p18._4._3._4,
            redden(_p18._4._4)));
         } while (false);
         return A5(RBNode_elm_builtin,
         Black,
         _p18._3._4._1,
         _p18._3._4._2,
         A5(balance,
         Black,
         _p18._3._1,
         _p18._3._2,
         redden(_p18._3._3),
         _p18._3._4._3),
         A5(RBNode_elm_builtin,
         Black,
         _p18._1,
         _p18._2,
         _p18._3._4._4,
         _p18._4));
      } while (false);
      return tree;
   };
   var balance = F5(function (c,k,v,l,r) {
      var tree = A5(RBNode_elm_builtin,c,k,v,l,r);
      return blackish(tree) ? balanceHelp(tree) : tree;
   });
   var bubble = F5(function (c,k,v,l,r) {
      return isBBlack(l) || isBBlack(r) ? A5(balance,
      moreBlack(c),
      k,
      v,
      lessBlackTree(l),
      lessBlackTree(r)) : A5(RBNode_elm_builtin,c,k,v,l,r);
   });
   var removeMax = F5(function (c,k,v,l,r) {
      var _p19 = r;
      if (_p19.ctor === "RBEmpty_elm_builtin") {
            return A3(rem,c,l,r);
         } else {
            return A5(bubble,
            c,
            k,
            v,
            l,
            A5(removeMax,_p19._0,_p19._1,_p19._2,_p19._3,_p19._4));
         }
   });
   var rem = F3(function (c,l,r) {
      var _p20 = {ctor: "_Tuple2",_0: l,_1: r};
      if (_p20._0.ctor === "RBEmpty_elm_builtin") {
            if (_p20._1.ctor === "RBEmpty_elm_builtin") {
                  var _p21 = c;
                  switch (_p21.ctor)
                  {case "Red": return RBEmpty_elm_builtin(LBlack);
                     case "Black": return RBEmpty_elm_builtin(LBBlack);
                     default:
                     return $Native$Debug.crash("cannot have bblack or nblack nodes at this point");}
               } else {
                  var _p24 = _p20._1._0;
                  var _p23 = _p20._0._0;
                  var _p22 = {ctor: "_Tuple3",_0: c,_1: _p23,_2: _p24};
                  if (_p22.ctor === "_Tuple3" && _p22._0.ctor === "Black" && _p22._1.ctor === "LBlack" && _p22._2.ctor === "Red")
                  {
                        return A5(RBNode_elm_builtin,
                        Black,
                        _p20._1._1,
                        _p20._1._2,
                        _p20._1._3,
                        _p20._1._4);
                     } else {
                        return A4(reportRemBug,
                        "Black/LBlack/Red",
                        c,
                        $Basics.toString(_p23),
                        $Basics.toString(_p24));
                     }
               }
         } else {
            if (_p20._1.ctor === "RBEmpty_elm_builtin") {
                  var _p27 = _p20._1._0;
                  var _p26 = _p20._0._0;
                  var _p25 = {ctor: "_Tuple3",_0: c,_1: _p26,_2: _p27};
                  if (_p25.ctor === "_Tuple3" && _p25._0.ctor === "Black" && _p25._1.ctor === "Red" && _p25._2.ctor === "LBlack")
                  {
                        return A5(RBNode_elm_builtin,
                        Black,
                        _p20._0._1,
                        _p20._0._2,
                        _p20._0._3,
                        _p20._0._4);
                     } else {
                        return A4(reportRemBug,
                        "Black/Red/LBlack",
                        c,
                        $Basics.toString(_p26),
                        $Basics.toString(_p27));
                     }
               } else {
                  var _p31 = _p20._0._2;
                  var _p30 = _p20._0._4;
                  var _p29 = _p20._0._1;
                  var l$ = A5(removeMax,_p20._0._0,_p29,_p31,_p20._0._3,_p30);
                  var _p28 = A3(maxWithDefault,_p29,_p31,_p30);
                  var k = _p28._0;
                  var v = _p28._1;
                  return A5(bubble,c,k,v,l$,r);
               }
         }
   });
   var update = F3(function (k,alter,dict) {
      var up = function (dict) {
         var _p32 = dict;
         if (_p32.ctor === "RBEmpty_elm_builtin") {
               var _p33 = alter($Maybe.Nothing);
               if (_p33.ctor === "Nothing") {
                     return {ctor: "_Tuple2",_0: Same,_1: empty};
                  } else {
                     return {ctor: "_Tuple2"
                            ,_0: Insert
                            ,_1: A5(RBNode_elm_builtin,Red,k,_p33._0,empty,empty)};
                  }
            } else {
               var _p44 = _p32._2;
               var _p43 = _p32._4;
               var _p42 = _p32._3;
               var _p41 = _p32._1;
               var _p40 = _p32._0;
               var _p34 = A2($Basics.compare,k,_p41);
               switch (_p34.ctor)
               {case "EQ": var _p35 = alter($Maybe.Just(_p44));
                    if (_p35.ctor === "Nothing") {
                          return {ctor: "_Tuple2"
                                 ,_0: Remove
                                 ,_1: A3(rem,_p40,_p42,_p43)};
                       } else {
                          return {ctor: "_Tuple2"
                                 ,_0: Same
                                 ,_1: A5(RBNode_elm_builtin,_p40,_p41,_p35._0,_p42,_p43)};
                       }
                  case "LT": var _p36 = up(_p42);
                    var flag = _p36._0;
                    var newLeft = _p36._1;
                    var _p37 = flag;
                    switch (_p37.ctor)
                    {case "Same": return {ctor: "_Tuple2"
                                         ,_0: Same
                                         ,_1: A5(RBNode_elm_builtin,_p40,_p41,_p44,newLeft,_p43)};
                       case "Insert": return {ctor: "_Tuple2"
                                             ,_0: Insert
                                             ,_1: A5(balance,_p40,_p41,_p44,newLeft,_p43)};
                       default: return {ctor: "_Tuple2"
                                       ,_0: Remove
                                       ,_1: A5(bubble,_p40,_p41,_p44,newLeft,_p43)};}
                  default: var _p38 = up(_p43);
                    var flag = _p38._0;
                    var newRight = _p38._1;
                    var _p39 = flag;
                    switch (_p39.ctor)
                    {case "Same": return {ctor: "_Tuple2"
                                         ,_0: Same
                                         ,_1: A5(RBNode_elm_builtin,_p40,_p41,_p44,_p42,newRight)};
                       case "Insert": return {ctor: "_Tuple2"
                                             ,_0: Insert
                                             ,_1: A5(balance,_p40,_p41,_p44,_p42,newRight)};
                       default: return {ctor: "_Tuple2"
                                       ,_0: Remove
                                       ,_1: A5(bubble,_p40,_p41,_p44,_p42,newRight)};}}
            }
      };
      var _p45 = up(dict);
      var flag = _p45._0;
      var updatedDict = _p45._1;
      var _p46 = flag;
      switch (_p46.ctor)
      {case "Same": return updatedDict;
         case "Insert": return ensureBlackRoot(updatedDict);
         default: return blacken(updatedDict);}
   });
   var insert = F3(function (key,value,dict) {
      return A3(update,
      key,
      $Basics.always($Maybe.Just(value)),
      dict);
   });
   var singleton = F2(function (key,value) {
      return A3(insert,key,value,empty);
   });
   var union = F2(function (t1,t2) {
      return A3(foldl,insert,t2,t1);
   });
   var fromList = function (assocs) {
      return A3($List.foldl,
      F2(function (_p47,dict) {
         var _p48 = _p47;
         return A3(insert,_p48._0,_p48._1,dict);
      }),
      empty,
      assocs);
   };
   var filter = F2(function (predicate,dictionary) {
      var add = F3(function (key,value,dict) {
         return A2(predicate,key,value) ? A3(insert,
         key,
         value,
         dict) : dict;
      });
      return A3(foldl,add,empty,dictionary);
   });
   var intersect = F2(function (t1,t2) {
      return A2(filter,
      F2(function (k,_p49) {    return A2(member,k,t2);}),
      t1);
   });
   var partition = F2(function (predicate,dict) {
      var add = F3(function (key,value,_p50) {
         var _p51 = _p50;
         var _p53 = _p51._1;
         var _p52 = _p51._0;
         return A2(predicate,key,value) ? {ctor: "_Tuple2"
                                          ,_0: A3(insert,key,value,_p52)
                                          ,_1: _p53} : {ctor: "_Tuple2"
                                                       ,_0: _p52
                                                       ,_1: A3(insert,key,value,_p53)};
      });
      return A3(foldl,add,{ctor: "_Tuple2",_0: empty,_1: empty},dict);
   });
   var remove = F2(function (key,dict) {
      return A3(update,key,$Basics.always($Maybe.Nothing),dict);
   });
   var diff = F2(function (t1,t2) {
      return A3(foldl,
      F3(function (k,v,t) {    return A2(remove,k,t);}),
      t1,
      t2);
   });
   return _elm.Dict.values = {_op: _op
                             ,empty: empty
                             ,singleton: singleton
                             ,insert: insert
                             ,update: update
                             ,isEmpty: isEmpty
                             ,get: get
                             ,remove: remove
                             ,member: member
                             ,size: size
                             ,filter: filter
                             ,partition: partition
                             ,foldl: foldl
                             ,foldr: foldr
                             ,map: map
                             ,union: union
                             ,intersect: intersect
                             ,diff: diff
                             ,keys: keys
                             ,values: values
                             ,toList: toList
                             ,fromList: fromList};
};
Elm.Json = Elm.Json || {};
Elm.Json.Encode = Elm.Json.Encode || {};
Elm.Json.Encode.make = function (_elm) {
   "use strict";
   _elm.Json = _elm.Json || {};
   _elm.Json.Encode = _elm.Json.Encode || {};
   if (_elm.Json.Encode.values) return _elm.Json.Encode.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Array = Elm.Array.make(_elm),
   $Native$Json = Elm.Native.Json.make(_elm);
   var _op = {};
   var list = $Native$Json.encodeList;
   var array = $Native$Json.encodeArray;
   var object = $Native$Json.encodeObject;
   var $null = $Native$Json.encodeNull;
   var bool = $Native$Json.identity;
   var $float = $Native$Json.identity;
   var $int = $Native$Json.identity;
   var string = $Native$Json.identity;
   var encode = $Native$Json.encode;
   var Value = {ctor: "Value"};
   return _elm.Json.Encode.values = {_op: _op
                                    ,encode: encode
                                    ,string: string
                                    ,$int: $int
                                    ,$float: $float
                                    ,bool: bool
                                    ,$null: $null
                                    ,list: list
                                    ,array: array
                                    ,object: object};
};
Elm.Json = Elm.Json || {};
Elm.Json.Decode = Elm.Json.Decode || {};
Elm.Json.Decode.make = function (_elm) {
   "use strict";
   _elm.Json = _elm.Json || {};
   _elm.Json.Decode = _elm.Json.Decode || {};
   if (_elm.Json.Decode.values) return _elm.Json.Decode.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Array = Elm.Array.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Json = Elm.Native.Json.make(_elm),
   $Result = Elm.Result.make(_elm);
   var _op = {};
   var tuple8 = $Native$Json.decodeTuple8;
   var tuple7 = $Native$Json.decodeTuple7;
   var tuple6 = $Native$Json.decodeTuple6;
   var tuple5 = $Native$Json.decodeTuple5;
   var tuple4 = $Native$Json.decodeTuple4;
   var tuple3 = $Native$Json.decodeTuple3;
   var tuple2 = $Native$Json.decodeTuple2;
   var tuple1 = $Native$Json.decodeTuple1;
   var succeed = $Native$Json.succeed;
   var fail = $Native$Json.fail;
   var andThen = $Native$Json.andThen;
   var customDecoder = $Native$Json.customDecoder;
   var decodeValue = $Native$Json.runDecoderValue;
   var value = $Native$Json.decodeValue;
   var maybe = $Native$Json.decodeMaybe;
   var $null = $Native$Json.decodeNull;
   var array = $Native$Json.decodeArray;
   var list = $Native$Json.decodeList;
   var bool = $Native$Json.decodeBool;
   var $int = $Native$Json.decodeInt;
   var $float = $Native$Json.decodeFloat;
   var string = $Native$Json.decodeString;
   var oneOf = $Native$Json.oneOf;
   var keyValuePairs = $Native$Json.decodeKeyValuePairs;
   var object8 = $Native$Json.decodeObject8;
   var object7 = $Native$Json.decodeObject7;
   var object6 = $Native$Json.decodeObject6;
   var object5 = $Native$Json.decodeObject5;
   var object4 = $Native$Json.decodeObject4;
   var object3 = $Native$Json.decodeObject3;
   var object2 = $Native$Json.decodeObject2;
   var object1 = $Native$Json.decodeObject1;
   _op[":="] = $Native$Json.decodeField;
   var at = F2(function (fields,decoder) {
      return A3($List.foldr,
      F2(function (x,y) {    return A2(_op[":="],x,y);}),
      decoder,
      fields);
   });
   var decodeString = $Native$Json.runDecoderString;
   var map = $Native$Json.decodeObject1;
   var dict = function (decoder) {
      return A2(map,$Dict.fromList,keyValuePairs(decoder));
   };
   var Decoder = {ctor: "Decoder"};
   return _elm.Json.Decode.values = {_op: _op
                                    ,decodeString: decodeString
                                    ,decodeValue: decodeValue
                                    ,string: string
                                    ,$int: $int
                                    ,$float: $float
                                    ,bool: bool
                                    ,$null: $null
                                    ,list: list
                                    ,array: array
                                    ,tuple1: tuple1
                                    ,tuple2: tuple2
                                    ,tuple3: tuple3
                                    ,tuple4: tuple4
                                    ,tuple5: tuple5
                                    ,tuple6: tuple6
                                    ,tuple7: tuple7
                                    ,tuple8: tuple8
                                    ,at: at
                                    ,object1: object1
                                    ,object2: object2
                                    ,object3: object3
                                    ,object4: object4
                                    ,object5: object5
                                    ,object6: object6
                                    ,object7: object7
                                    ,object8: object8
                                    ,keyValuePairs: keyValuePairs
                                    ,dict: dict
                                    ,maybe: maybe
                                    ,oneOf: oneOf
                                    ,map: map
                                    ,fail: fail
                                    ,succeed: succeed
                                    ,andThen: andThen
                                    ,value: value
                                    ,customDecoder: customDecoder};
};
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":1}],3:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],4:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],5:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":13,"is-object":3}],6:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":11,"../vnode/is-vnode.js":14,"../vnode/is-vtext.js":15,"../vnode/is-widget.js":16,"./apply-properties":5,"global/document":2}],7:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],8:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":16,"../vnode/vpatch.js":19,"./apply-properties":5,"./create-element":6,"./update-widget":10}],9:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":7,"./patch-op":8,"global/document":2,"x-is-array":4}],10:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":16}],11:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":12,"./is-vnode":14,"./is-vtext":15,"./is-widget":16}],12:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],13:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],14:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":17}],15:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":17}],16:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],17:[function(require,module,exports){
module.exports = "2"

},{}],18:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":12,"./is-vhook":13,"./is-vnode":14,"./is-widget":16,"./version":17}],19:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":17}],20:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":17}],21:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":13,"is-object":3}],22:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free,     // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":11,"../vnode/is-thunk":12,"../vnode/is-vnode":14,"../vnode/is-vtext":15,"../vnode/is-widget":16,"../vnode/vpatch":19,"./diff-props":21,"x-is-array":4}],23:[function(require,module,exports){
var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var diff = require('virtual-dom/vtree/diff');
var patch = require('virtual-dom/vdom/patch');
var createElement = require('virtual-dom/vdom/create-element');
var isHook = require("virtual-dom/vnode/is-vhook");


Elm.Native.VirtualDom = {};
Elm.Native.VirtualDom.make = function(elm)
{
	elm.Native = elm.Native || {};
	elm.Native.VirtualDom = elm.Native.VirtualDom || {};
	if (elm.Native.VirtualDom.values)
	{
		return elm.Native.VirtualDom.values;
	}

	var Element = Elm.Native.Graphics.Element.make(elm);
	var Json = Elm.Native.Json.make(elm);
	var List = Elm.Native.List.make(elm);
	var Signal = Elm.Native.Signal.make(elm);
	var Utils = Elm.Native.Utils.make(elm);

	var ATTRIBUTE_KEY = 'UniqueNameThatOthersAreVeryUnlikelyToUse';



	// VIRTUAL DOM NODES


	function text(string)
	{
		return new VText(string);
	}

	function node(name)
	{
		return F2(function(propertyList, contents) {
			return makeNode(name, propertyList, contents);
		});
	}


	// BUILD VIRTUAL DOME NODES


	function makeNode(name, propertyList, contents)
	{
		var props = listToProperties(propertyList);

		var key, namespace;
		// support keys
		if (props.key !== undefined)
		{
			key = props.key;
			props.key = undefined;
		}

		// support namespace
		if (props.namespace !== undefined)
		{
			namespace = props.namespace;
			props.namespace = undefined;
		}

		// ensure that setting text of an input does not move the cursor
		var useSoftSet =
			(name === 'input' || name === 'textarea')
			&& props.value !== undefined
			&& !isHook(props.value);

		if (useSoftSet)
		{
			props.value = SoftSetHook(props.value);
		}

		return new VNode(name, props, List.toArray(contents), key, namespace);
	}

	function listToProperties(list)
	{
		var object = {};
		while (list.ctor !== '[]')
		{
			var entry = list._0;
			if (entry.key === ATTRIBUTE_KEY)
			{
				object.attributes = object.attributes || {};
				object.attributes[entry.value.attrKey] = entry.value.attrValue;
			}
			else
			{
				object[entry.key] = entry.value;
			}
			list = list._1;
		}
		return object;
	}



	// PROPERTIES AND ATTRIBUTES


	function property(key, value)
	{
		return {
			key: key,
			value: value
		};
	}

	function attribute(key, value)
	{
		return {
			key: ATTRIBUTE_KEY,
			value: {
				attrKey: key,
				attrValue: value
			}
		};
	}



	// NAMESPACED ATTRIBUTES


	function attributeNS(namespace, key, value)
	{
		return {
			key: key,
			value: new AttributeHook(namespace, key, value)
		};
	}

	function AttributeHook(namespace, key, value)
	{
		if (!(this instanceof AttributeHook))
		{
			return new AttributeHook(namespace, key, value);
		}

		this.namespace = namespace;
		this.key = key;
		this.value = value;
	}

	AttributeHook.prototype.hook = function (node, prop, prev)
	{
		if (prev
			&& prev.type === 'AttributeHook'
			&& prev.value === this.value
			&& prev.namespace === this.namespace)
		{
			return;
		}

		node.setAttributeNS(this.namespace, prop, this.value);
	};

	AttributeHook.prototype.unhook = function (node, prop, next)
	{
		if (next
			&& next.type === 'AttributeHook'
			&& next.namespace === this.namespace)
		{
			return;
		}

		node.removeAttributeNS(this.namespace, this.key);
	};

	AttributeHook.prototype.type = 'AttributeHook';



	// EVENTS


	function on(name, options, decoder, createMessage)
	{
		function eventHandler(event)
		{
			var value = A2(Json.runDecoderValue, decoder, event);
			if (value.ctor === 'Ok')
			{
				if (options.stopPropagation)
				{
					event.stopPropagation();
				}
				if (options.preventDefault)
				{
					event.preventDefault();
				}
				Signal.sendMessage(createMessage(value._0));
			}
		}
		return property('on' + name, eventHandler);
	}

	function SoftSetHook(value)
	{
		if (!(this instanceof SoftSetHook))
		{
			return new SoftSetHook(value);
		}

		this.value = value;
	}

	SoftSetHook.prototype.hook = function (node, propertyName)
	{
		if (node[propertyName] !== this.value)
		{
			node[propertyName] = this.value;
		}
	};



	// INTEGRATION WITH ELEMENTS


	function ElementWidget(element)
	{
		this.element = element;
	}

	ElementWidget.prototype.type = "Widget";

	ElementWidget.prototype.init = function init()
	{
		return Element.render(this.element);
	};

	ElementWidget.prototype.update = function update(previous, node)
	{
		return Element.update(node, previous.element, this.element);
	};

	function fromElement(element)
	{
		return new ElementWidget(element);
	}

	function toElement(width, height, html)
	{
		return A3(Element.newElement, width, height, {
			ctor: 'Custom',
			type: 'evancz/elm-html',
			render: render,
			update: update,
			model: html
		});
	}



	// RENDER AND UPDATE


	function render(model)
	{
		var element = Element.createNode('div');
		element.appendChild(createElement(model));
		return element;
	}

	function update(node, oldModel, newModel)
	{
		updateAndReplace(node.firstChild, oldModel, newModel);
		return node;
	}

	function updateAndReplace(node, oldModel, newModel)
	{
		var patches = diff(oldModel, newModel);
		var newNode = patch(node, patches);
		return newNode;
	}



	// LAZINESS


	function lazyRef(fn, a)
	{
		function thunk()
		{
			return fn(a);
		}
		return new Thunk(fn, [a], thunk);
	}

	function lazyRef2(fn, a, b)
	{
		function thunk()
		{
			return A2(fn, a, b);
		}
		return new Thunk(fn, [a,b], thunk);
	}

	function lazyRef3(fn, a, b, c)
	{
		function thunk()
		{
			return A3(fn, a, b, c);
		}
		return new Thunk(fn, [a,b,c], thunk);
	}

	function Thunk(fn, args, thunk)
	{
		/* public (used by VirtualDom.js) */
		this.vnode = null;
		this.key = undefined;

		/* private */
		this.fn = fn;
		this.args = args;
		this.thunk = thunk;
	}

	Thunk.prototype.type = "Thunk";
	Thunk.prototype.render = renderThunk;

	function shouldUpdate(current, previous)
	{
		if (current.fn !== previous.fn)
		{
			return true;
		}

		// if it's the same function, we know the number of args must match
		var cargs = current.args;
		var pargs = previous.args;

		for (var i = cargs.length; i--; )
		{
			if (cargs[i] !== pargs[i])
			{
				return true;
			}
		}

		return false;
	}

	function renderThunk(previous)
	{
		if (previous == null || shouldUpdate(this, previous))
		{
			return this.thunk();
		}
		else
		{
			return previous.vnode;
		}
	}


	return elm.Native.VirtualDom.values = Elm.Native.VirtualDom.values = {
		node: node,
		text: text,
		on: F4(on),

		property: F2(property),
		attribute: F2(attribute),
		attributeNS: F3(attributeNS),

		lazy: F2(lazyRef),
		lazy2: F3(lazyRef2),
		lazy3: F4(lazyRef3),

		toElement: F3(toElement),
		fromElement: fromElement,

		render: createElement,
		updateAndReplace: updateAndReplace
	};
};

},{"virtual-dom/vdom/create-element":6,"virtual-dom/vdom/patch":9,"virtual-dom/vnode/is-vhook":13,"virtual-dom/vnode/vnode":18,"virtual-dom/vnode/vtext":20,"virtual-dom/vtree/diff":22}]},{},[23]);

Elm.VirtualDom = Elm.VirtualDom || {};
Elm.VirtualDom.make = function (_elm) {
   "use strict";
   _elm.VirtualDom = _elm.VirtualDom || {};
   if (_elm.VirtualDom.values) return _elm.VirtualDom.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$VirtualDom = Elm.Native.VirtualDom.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var lazy3 = $Native$VirtualDom.lazy3;
   var lazy2 = $Native$VirtualDom.lazy2;
   var lazy = $Native$VirtualDom.lazy;
   var defaultOptions = {stopPropagation: false
                        ,preventDefault: false};
   var Options = F2(function (a,b) {
      return {stopPropagation: a,preventDefault: b};
   });
   var onWithOptions = $Native$VirtualDom.on;
   var on = F3(function (eventName,decoder,toMessage) {
      return A4($Native$VirtualDom.on,
      eventName,
      defaultOptions,
      decoder,
      toMessage);
   });
   var attributeNS = $Native$VirtualDom.attributeNS;
   var attribute = $Native$VirtualDom.attribute;
   var property = $Native$VirtualDom.property;
   var Property = {ctor: "Property"};
   var fromElement = $Native$VirtualDom.fromElement;
   var toElement = $Native$VirtualDom.toElement;
   var text = $Native$VirtualDom.text;
   var node = $Native$VirtualDom.node;
   var Node = {ctor: "Node"};
   return _elm.VirtualDom.values = {_op: _op
                                   ,text: text
                                   ,node: node
                                   ,toElement: toElement
                                   ,fromElement: fromElement
                                   ,property: property
                                   ,attribute: attribute
                                   ,attributeNS: attributeNS
                                   ,on: on
                                   ,onWithOptions: onWithOptions
                                   ,defaultOptions: defaultOptions
                                   ,lazy: lazy
                                   ,lazy2: lazy2
                                   ,lazy3: lazy3
                                   ,Options: Options};
};
Elm.Html = Elm.Html || {};
Elm.Html.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   if (_elm.Html.values) return _elm.Html.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var fromElement = $VirtualDom.fromElement;
   var toElement = $VirtualDom.toElement;
   var text = $VirtualDom.text;
   var node = $VirtualDom.node;
   var body = node("body");
   var section = node("section");
   var nav = node("nav");
   var article = node("article");
   var aside = node("aside");
   var h1 = node("h1");
   var h2 = node("h2");
   var h3 = node("h3");
   var h4 = node("h4");
   var h5 = node("h5");
   var h6 = node("h6");
   var header = node("header");
   var footer = node("footer");
   var address = node("address");
   var main$ = node("main");
   var p = node("p");
   var hr = node("hr");
   var pre = node("pre");
   var blockquote = node("blockquote");
   var ol = node("ol");
   var ul = node("ul");
   var li = node("li");
   var dl = node("dl");
   var dt = node("dt");
   var dd = node("dd");
   var figure = node("figure");
   var figcaption = node("figcaption");
   var div = node("div");
   var a = node("a");
   var em = node("em");
   var strong = node("strong");
   var small = node("small");
   var s = node("s");
   var cite = node("cite");
   var q = node("q");
   var dfn = node("dfn");
   var abbr = node("abbr");
   var time = node("time");
   var code = node("code");
   var $var = node("var");
   var samp = node("samp");
   var kbd = node("kbd");
   var sub = node("sub");
   var sup = node("sup");
   var i = node("i");
   var b = node("b");
   var u = node("u");
   var mark = node("mark");
   var ruby = node("ruby");
   var rt = node("rt");
   var rp = node("rp");
   var bdi = node("bdi");
   var bdo = node("bdo");
   var span = node("span");
   var br = node("br");
   var wbr = node("wbr");
   var ins = node("ins");
   var del = node("del");
   var img = node("img");
   var iframe = node("iframe");
   var embed = node("embed");
   var object = node("object");
   var param = node("param");
   var video = node("video");
   var audio = node("audio");
   var source = node("source");
   var track = node("track");
   var canvas = node("canvas");
   var svg = node("svg");
   var math = node("math");
   var table = node("table");
   var caption = node("caption");
   var colgroup = node("colgroup");
   var col = node("col");
   var tbody = node("tbody");
   var thead = node("thead");
   var tfoot = node("tfoot");
   var tr = node("tr");
   var td = node("td");
   var th = node("th");
   var form = node("form");
   var fieldset = node("fieldset");
   var legend = node("legend");
   var label = node("label");
   var input = node("input");
   var button = node("button");
   var select = node("select");
   var datalist = node("datalist");
   var optgroup = node("optgroup");
   var option = node("option");
   var textarea = node("textarea");
   var keygen = node("keygen");
   var output = node("output");
   var progress = node("progress");
   var meter = node("meter");
   var details = node("details");
   var summary = node("summary");
   var menuitem = node("menuitem");
   var menu = node("menu");
   return _elm.Html.values = {_op: _op
                             ,node: node
                             ,text: text
                             ,toElement: toElement
                             ,fromElement: fromElement
                             ,body: body
                             ,section: section
                             ,nav: nav
                             ,article: article
                             ,aside: aside
                             ,h1: h1
                             ,h2: h2
                             ,h3: h3
                             ,h4: h4
                             ,h5: h5
                             ,h6: h6
                             ,header: header
                             ,footer: footer
                             ,address: address
                             ,main$: main$
                             ,p: p
                             ,hr: hr
                             ,pre: pre
                             ,blockquote: blockquote
                             ,ol: ol
                             ,ul: ul
                             ,li: li
                             ,dl: dl
                             ,dt: dt
                             ,dd: dd
                             ,figure: figure
                             ,figcaption: figcaption
                             ,div: div
                             ,a: a
                             ,em: em
                             ,strong: strong
                             ,small: small
                             ,s: s
                             ,cite: cite
                             ,q: q
                             ,dfn: dfn
                             ,abbr: abbr
                             ,time: time
                             ,code: code
                             ,$var: $var
                             ,samp: samp
                             ,kbd: kbd
                             ,sub: sub
                             ,sup: sup
                             ,i: i
                             ,b: b
                             ,u: u
                             ,mark: mark
                             ,ruby: ruby
                             ,rt: rt
                             ,rp: rp
                             ,bdi: bdi
                             ,bdo: bdo
                             ,span: span
                             ,br: br
                             ,wbr: wbr
                             ,ins: ins
                             ,del: del
                             ,img: img
                             ,iframe: iframe
                             ,embed: embed
                             ,object: object
                             ,param: param
                             ,video: video
                             ,audio: audio
                             ,source: source
                             ,track: track
                             ,canvas: canvas
                             ,svg: svg
                             ,math: math
                             ,table: table
                             ,caption: caption
                             ,colgroup: colgroup
                             ,col: col
                             ,tbody: tbody
                             ,thead: thead
                             ,tfoot: tfoot
                             ,tr: tr
                             ,td: td
                             ,th: th
                             ,form: form
                             ,fieldset: fieldset
                             ,legend: legend
                             ,label: label
                             ,input: input
                             ,button: button
                             ,select: select
                             ,datalist: datalist
                             ,optgroup: optgroup
                             ,option: option
                             ,textarea: textarea
                             ,keygen: keygen
                             ,output: output
                             ,progress: progress
                             ,meter: meter
                             ,details: details
                             ,summary: summary
                             ,menuitem: menuitem
                             ,menu: menu};
};
Elm.Html = Elm.Html || {};
Elm.Html.Attributes = Elm.Html.Attributes || {};
Elm.Html.Attributes.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Attributes = _elm.Html.Attributes || {};
   if (_elm.Html.Attributes.values)
   return _elm.Html.Attributes.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var attribute = $VirtualDom.attribute;
   var contextmenu = function (value) {
      return A2(attribute,"contextmenu",value);
   };
   var property = $VirtualDom.property;
   var stringProperty = F2(function (name,string) {
      return A2(property,name,$Json$Encode.string(string));
   });
   var $class = function (name) {
      return A2(stringProperty,"className",name);
   };
   var id = function (name) {
      return A2(stringProperty,"id",name);
   };
   var title = function (name) {
      return A2(stringProperty,"title",name);
   };
   var accesskey = function ($char) {
      return A2(stringProperty,
      "accessKey",
      $String.fromChar($char));
   };
   var dir = function (value) {
      return A2(stringProperty,"dir",value);
   };
   var draggable = function (value) {
      return A2(stringProperty,"draggable",value);
   };
   var dropzone = function (value) {
      return A2(stringProperty,"dropzone",value);
   };
   var itemprop = function (value) {
      return A2(stringProperty,"itemprop",value);
   };
   var lang = function (value) {
      return A2(stringProperty,"lang",value);
   };
   var tabindex = function (n) {
      return A2(stringProperty,"tabIndex",$Basics.toString(n));
   };
   var charset = function (value) {
      return A2(stringProperty,"charset",value);
   };
   var content = function (value) {
      return A2(stringProperty,"content",value);
   };
   var httpEquiv = function (value) {
      return A2(stringProperty,"httpEquiv",value);
   };
   var language = function (value) {
      return A2(stringProperty,"language",value);
   };
   var src = function (value) {
      return A2(stringProperty,"src",value);
   };
   var height = function (value) {
      return A2(stringProperty,"height",$Basics.toString(value));
   };
   var width = function (value) {
      return A2(stringProperty,"width",$Basics.toString(value));
   };
   var alt = function (value) {
      return A2(stringProperty,"alt",value);
   };
   var preload = function (value) {
      return A2(stringProperty,"preload",value);
   };
   var poster = function (value) {
      return A2(stringProperty,"poster",value);
   };
   var kind = function (value) {
      return A2(stringProperty,"kind",value);
   };
   var srclang = function (value) {
      return A2(stringProperty,"srclang",value);
   };
   var sandbox = function (value) {
      return A2(stringProperty,"sandbox",value);
   };
   var srcdoc = function (value) {
      return A2(stringProperty,"srcdoc",value);
   };
   var type$ = function (value) {
      return A2(stringProperty,"type",value);
   };
   var value = function (value) {
      return A2(stringProperty,"value",value);
   };
   var placeholder = function (value) {
      return A2(stringProperty,"placeholder",value);
   };
   var accept = function (value) {
      return A2(stringProperty,"accept",value);
   };
   var acceptCharset = function (value) {
      return A2(stringProperty,"acceptCharset",value);
   };
   var action = function (value) {
      return A2(stringProperty,"action",value);
   };
   var autocomplete = function (bool) {
      return A2(stringProperty,"autocomplete",bool ? "on" : "off");
   };
   var autosave = function (value) {
      return A2(stringProperty,"autosave",value);
   };
   var enctype = function (value) {
      return A2(stringProperty,"enctype",value);
   };
   var formaction = function (value) {
      return A2(stringProperty,"formAction",value);
   };
   var list = function (value) {
      return A2(stringProperty,"list",value);
   };
   var minlength = function (n) {
      return A2(stringProperty,"minLength",$Basics.toString(n));
   };
   var maxlength = function (n) {
      return A2(stringProperty,"maxLength",$Basics.toString(n));
   };
   var method = function (value) {
      return A2(stringProperty,"method",value);
   };
   var name = function (value) {
      return A2(stringProperty,"name",value);
   };
   var pattern = function (value) {
      return A2(stringProperty,"pattern",value);
   };
   var size = function (n) {
      return A2(stringProperty,"size",$Basics.toString(n));
   };
   var $for = function (value) {
      return A2(stringProperty,"htmlFor",value);
   };
   var form = function (value) {
      return A2(stringProperty,"form",value);
   };
   var max = function (value) {
      return A2(stringProperty,"max",value);
   };
   var min = function (value) {
      return A2(stringProperty,"min",value);
   };
   var step = function (n) {
      return A2(stringProperty,"step",n);
   };
   var cols = function (n) {
      return A2(stringProperty,"cols",$Basics.toString(n));
   };
   var rows = function (n) {
      return A2(stringProperty,"rows",$Basics.toString(n));
   };
   var wrap = function (value) {
      return A2(stringProperty,"wrap",value);
   };
   var usemap = function (value) {
      return A2(stringProperty,"useMap",value);
   };
   var shape = function (value) {
      return A2(stringProperty,"shape",value);
   };
   var coords = function (value) {
      return A2(stringProperty,"coords",value);
   };
   var challenge = function (value) {
      return A2(stringProperty,"challenge",value);
   };
   var keytype = function (value) {
      return A2(stringProperty,"keytype",value);
   };
   var align = function (value) {
      return A2(stringProperty,"align",value);
   };
   var cite = function (value) {
      return A2(stringProperty,"cite",value);
   };
   var href = function (value) {
      return A2(stringProperty,"href",value);
   };
   var target = function (value) {
      return A2(stringProperty,"target",value);
   };
   var downloadAs = function (value) {
      return A2(stringProperty,"download",value);
   };
   var hreflang = function (value) {
      return A2(stringProperty,"hreflang",value);
   };
   var media = function (value) {
      return A2(stringProperty,"media",value);
   };
   var ping = function (value) {
      return A2(stringProperty,"ping",value);
   };
   var rel = function (value) {
      return A2(stringProperty,"rel",value);
   };
   var datetime = function (value) {
      return A2(stringProperty,"datetime",value);
   };
   var pubdate = function (value) {
      return A2(stringProperty,"pubdate",value);
   };
   var start = function (n) {
      return A2(stringProperty,"start",$Basics.toString(n));
   };
   var colspan = function (n) {
      return A2(stringProperty,"colSpan",$Basics.toString(n));
   };
   var headers = function (value) {
      return A2(stringProperty,"headers",value);
   };
   var rowspan = function (n) {
      return A2(stringProperty,"rowSpan",$Basics.toString(n));
   };
   var scope = function (value) {
      return A2(stringProperty,"scope",value);
   };
   var manifest = function (value) {
      return A2(stringProperty,"manifest",value);
   };
   var boolProperty = F2(function (name,bool) {
      return A2(property,name,$Json$Encode.bool(bool));
   });
   var hidden = function (bool) {
      return A2(boolProperty,"hidden",bool);
   };
   var contenteditable = function (bool) {
      return A2(boolProperty,"contentEditable",bool);
   };
   var spellcheck = function (bool) {
      return A2(boolProperty,"spellcheck",bool);
   };
   var async = function (bool) {
      return A2(boolProperty,"async",bool);
   };
   var defer = function (bool) {
      return A2(boolProperty,"defer",bool);
   };
   var scoped = function (bool) {
      return A2(boolProperty,"scoped",bool);
   };
   var autoplay = function (bool) {
      return A2(boolProperty,"autoplay",bool);
   };
   var controls = function (bool) {
      return A2(boolProperty,"controls",bool);
   };
   var loop = function (bool) {
      return A2(boolProperty,"loop",bool);
   };
   var $default = function (bool) {
      return A2(boolProperty,"default",bool);
   };
   var seamless = function (bool) {
      return A2(boolProperty,"seamless",bool);
   };
   var checked = function (bool) {
      return A2(boolProperty,"checked",bool);
   };
   var selected = function (bool) {
      return A2(boolProperty,"selected",bool);
   };
   var autofocus = function (bool) {
      return A2(boolProperty,"autofocus",bool);
   };
   var disabled = function (bool) {
      return A2(boolProperty,"disabled",bool);
   };
   var multiple = function (bool) {
      return A2(boolProperty,"multiple",bool);
   };
   var novalidate = function (bool) {
      return A2(boolProperty,"noValidate",bool);
   };
   var readonly = function (bool) {
      return A2(boolProperty,"readOnly",bool);
   };
   var required = function (bool) {
      return A2(boolProperty,"required",bool);
   };
   var ismap = function (value) {
      return A2(boolProperty,"isMap",value);
   };
   var download = function (bool) {
      return A2(boolProperty,"download",bool);
   };
   var reversed = function (bool) {
      return A2(boolProperty,"reversed",bool);
   };
   var classList = function (list) {
      return $class(A2($String.join,
      " ",
      A2($List.map,$Basics.fst,A2($List.filter,$Basics.snd,list))));
   };
   var style = function (props) {
      return A2(property,
      "style",
      $Json$Encode.object(A2($List.map,
      function (_p0) {
         var _p1 = _p0;
         return {ctor: "_Tuple2"
                ,_0: _p1._0
                ,_1: $Json$Encode.string(_p1._1)};
      },
      props)));
   };
   var key = function (k) {    return A2(stringProperty,"key",k);};
   return _elm.Html.Attributes.values = {_op: _op
                                        ,key: key
                                        ,style: style
                                        ,$class: $class
                                        ,classList: classList
                                        ,id: id
                                        ,title: title
                                        ,hidden: hidden
                                        ,type$: type$
                                        ,value: value
                                        ,checked: checked
                                        ,placeholder: placeholder
                                        ,selected: selected
                                        ,accept: accept
                                        ,acceptCharset: acceptCharset
                                        ,action: action
                                        ,autocomplete: autocomplete
                                        ,autofocus: autofocus
                                        ,autosave: autosave
                                        ,disabled: disabled
                                        ,enctype: enctype
                                        ,formaction: formaction
                                        ,list: list
                                        ,maxlength: maxlength
                                        ,minlength: minlength
                                        ,method: method
                                        ,multiple: multiple
                                        ,name: name
                                        ,novalidate: novalidate
                                        ,pattern: pattern
                                        ,readonly: readonly
                                        ,required: required
                                        ,size: size
                                        ,$for: $for
                                        ,form: form
                                        ,max: max
                                        ,min: min
                                        ,step: step
                                        ,cols: cols
                                        ,rows: rows
                                        ,wrap: wrap
                                        ,href: href
                                        ,target: target
                                        ,download: download
                                        ,downloadAs: downloadAs
                                        ,hreflang: hreflang
                                        ,media: media
                                        ,ping: ping
                                        ,rel: rel
                                        ,ismap: ismap
                                        ,usemap: usemap
                                        ,shape: shape
                                        ,coords: coords
                                        ,src: src
                                        ,height: height
                                        ,width: width
                                        ,alt: alt
                                        ,autoplay: autoplay
                                        ,controls: controls
                                        ,loop: loop
                                        ,preload: preload
                                        ,poster: poster
                                        ,$default: $default
                                        ,kind: kind
                                        ,srclang: srclang
                                        ,sandbox: sandbox
                                        ,seamless: seamless
                                        ,srcdoc: srcdoc
                                        ,reversed: reversed
                                        ,start: start
                                        ,align: align
                                        ,colspan: colspan
                                        ,rowspan: rowspan
                                        ,headers: headers
                                        ,scope: scope
                                        ,async: async
                                        ,charset: charset
                                        ,content: content
                                        ,defer: defer
                                        ,httpEquiv: httpEquiv
                                        ,language: language
                                        ,scoped: scoped
                                        ,accesskey: accesskey
                                        ,contenteditable: contenteditable
                                        ,contextmenu: contextmenu
                                        ,dir: dir
                                        ,draggable: draggable
                                        ,dropzone: dropzone
                                        ,itemprop: itemprop
                                        ,lang: lang
                                        ,spellcheck: spellcheck
                                        ,tabindex: tabindex
                                        ,challenge: challenge
                                        ,keytype: keytype
                                        ,cite: cite
                                        ,datetime: datetime
                                        ,pubdate: pubdate
                                        ,manifest: manifest
                                        ,property: property
                                        ,attribute: attribute};
};
Elm.Html = Elm.Html || {};
Elm.Html.Lazy = Elm.Html.Lazy || {};
Elm.Html.Lazy.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Lazy = _elm.Html.Lazy || {};
   if (_elm.Html.Lazy.values) return _elm.Html.Lazy.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var lazy3 = $VirtualDom.lazy3;
   var lazy2 = $VirtualDom.lazy2;
   var lazy = $VirtualDom.lazy;
   return _elm.Html.Lazy.values = {_op: _op
                                  ,lazy: lazy
                                  ,lazy2: lazy2
                                  ,lazy3: lazy3};
};
Elm.Book = Elm.Book || {};
Elm.Book.make = function (_elm) {
   "use strict";
   _elm.Book = _elm.Book || {};
   if (_elm.Book.values) return _elm.Book.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Lazy = Elm.Html.Lazy.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   _op["=>"] = F2(function (v0,v1) {
      return {ctor: "_Tuple2",_0: v0,_1: v1};
   });
   var viewPage = F2(function (isLeft,page) {
      return A2($Html.div,
      _U.list([]),
      _U.list([A2($Html.div,
              _U.list([$Html$Attributes.style(_U.list([A2(_op["=>"],
              "height",
              "100px")]))]),
              _U.list([$Html.text(A2($String.join," ",page.words))]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class(isLeft ? "text-left" : "text-right")]),
              _U.list([$Html.text(A2($Basics._op["++"],
              "Page ",
              $Basics.toString(page.pageNum)))]))]));
   });
   var view = function (model) {
      return A2($Html.div,
      _U.list([$Html$Attributes.$class("panel panel-default")]),
      _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("panel-heading")]),
              _U.list([A2($Html.span,
                      _U.list([$Html$Attributes.style(_U.list([A2(_op["=>"],
                      "font-style",
                      "italic")]))]),
                      _U.list([$Html.text("Wrath of the Monkey")]))
                      ,$Html.text(" by Dan Brown")]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("panel-body")
                      ,$Html$Attributes.style(_U.list([A2(_op["=>"],
                      "font-family",
                      "serif")]))]),
              _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("row")]),
              _U.list([A2($Html.div,
                      _U.list([$Html$Attributes.$class("col-sm-6")]),
                      _U.list([A3($Html$Lazy.lazy2,viewPage,true,model.left)]))
                      ,A2($Html.div,
                      _U.list([$Html$Attributes.$class("col-sm-6")
                              ,$Html$Attributes.style(_U.list([A2(_op["=>"],
                              "border-left",
                              "1px solid #ccc")]))]),
                      _U.list([A3($Html$Lazy.lazy2,
                      viewPage,
                      false,
                      model.right)]))]))]))]));
   };
   var AddWord = function (a) {
      return {ctor: "AddWord",_0: a};
   };
   var Model = F3(function (a,b,c) {
      return {left: a,right: b,wordsPerPage: c};
   });
   var initPage = F2(function (pageNum,words) {
      return {words: words,pageNum: pageNum};
   });
   var init = function (wordsPerPage) {
      return {left: A2(initPage,1,_U.list([]))
             ,right: A2(initPage,2,_U.list([]))
             ,wordsPerPage: wordsPerPage};
   };
   var update = F2(function (action,model) {
      var _p0 = action;
      var _p1 = _p0._0;
      if (_U.cmp($List.length(model.left.words),
      model.wordsPerPage) < 0) {
            var oldLeft = model.left;
            return _U.update(model,
            {left: _U.update(oldLeft,
            {words: A2($List.append,oldLeft.words,_U.list([_p1]))})});
         } else if (_U.cmp($List.length(model.right.words),
         model.wordsPerPage) < 0) {
               var oldRight = model.right;
               return _U.update(model,
               {right: _U.update(oldRight,
               {words: A2($List.append,oldRight.words,_U.list([_p1]))})});
            } else {
               var newRightPageNum = model.right.pageNum + 1;
               var newRightPage = A2(initPage,newRightPageNum,_U.list([]));
               var newLeftPageNum = model.left.pageNum + 1;
               var newLeftPage = A2(initPage,newLeftPageNum,_U.list([_p1]));
               return _U.update(model,{left: newLeftPage,right: newRightPage});
            }
   });
   var Page = F2(function (a,b) {
      return {words: a,pageNum: b};
   });
   return _elm.Book.values = {_op: _op
                             ,Page: Page
                             ,initPage: initPage
                             ,Model: Model
                             ,init: init
                             ,AddWord: AddWord
                             ,update: update
                             ,viewPage: viewPage
                             ,view: view};
};
Elm.Words = Elm.Words || {};
Elm.Words.make = function (_elm) {
   "use strict";
   _elm.Words = _elm.Words || {};
   if (_elm.Words.values) return _elm.Words.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Regex = Elm.Regex.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var re = $Regex.regex("^(?:c(?:o(?:u(?:n(?:t(?:(?:e(?:r(?:(?:revolution(?:ar(?:ies|y))?|in(?:t(?:elligence|uitive)|g)|p(?:roductive|oi(?:nt(?:(?:ed|s))?|se)|a(?:rts?|ne))|balanc(?:ing|ed?)|offensive|a(?:ttack(?:(?:ed|s))?|ct(?:(?:ing|ed|s))?)|m(?:easures|anded)|f(?:eit(?:(?:e(?:rs|d)|ing|s))?|oils?)|s(?:ign(?:(?:ed|s))?)?|ed))?|nanc(?:ing|e(?:[ds])?)|ss(?:es)?|d)|ab(?:ility|l[ey])|r(?:y(?:(?:side|wide|m(?:en|an)))?|ies)|down|less|i(?:es|ng)|y|s))?|cil(?:(?:lors?|s))?|sel(?:(?:l(?:ing|ors?|ed)|s))?)|r(?:age(?:ous(?:ly)?)?|t(?:(?:martial|e(?:ous(?:ly)?|s(?:ies|ans?|y)|d)|yards?|s(?:hips?)?|rooms?|house|i(?:ers?|ng)|ly))?|s(?:e(?:(?:work|book|s|d))?|ing)|gettes?|iers?)|t(?:ur(?:iers?|e)|her)|p(?:(?:l(?:ings?|e(?:(?:rs?|ts?|s|d))?)|ons?|es?|s))?|ch(?:(?:ing|e[sd]))?|g(?:h(?:(?:ing|ed|s))?|ars?)|l(?:o(?:mbs?|ir)|d)|s(?:cous|in(?:(?:ly|s))?))|m(?:p(?:a(?:r(?:tment(?:(?:alis(?:ation|ing|ed)|s))?|a(?:b(?:ility|l[ye])|t(?:ive(?:(?:ly|s))?|ors?))|i(?:sons?|ng)|e(?:[ds])?)|ss(?:(?:ion(?:ate(?:ly)?)?|e[ds]))?|t(?:ib(?:ilit(?:ies|y)|l(?:es?|y))|riots?)|n(?:i(?:on(?:(?:abl[ey]|s(?:hip)?))?|es)|y)|ct(?:(?:i(?:ons?|ng)|ness|ed|ly|s))?)|r(?:e(?:hen(?:si(?:ve(?:(?:ness|ly|s))?|b(?:ility|l[ey])|on)|d(?:(?:ing|ed|s))?)|ss(?:(?:i(?:b(?:ility|le)|on(?:(?:al|s))?|ng|ve)|ors?|e[sd]))?)|omis(?:ing|e(?:[ds])?)|is(?:ing|e(?:[ds])?))|u(?:t(?:e(?:(?:r(?:(?:literate|is(?:ation|ing|ed?)|s))?|d|s))?|a(?:tion(?:(?:al(?:ly)?|s))?|b(?:ility|l[ye]))|ing)|ls(?:i(?:ve(?:ly)?|ons?)|or(?:ily|y))|nction)|e(?:t(?:i(?:t(?:i(?:ve(?:(?:ness|ly))?|ons?)|ors?)|ng)|e(?:(?:n(?:c(?:ies|es?|y)|t(?:ly)?)|d|s))?)|n(?:sat(?:i(?:ons?|ng)|ory?|e(?:[ds])?)|di(?:ums?|a))|l(?:(?:l(?:ing(?:ly)?|ed)|s))?|re)|l(?:e(?:ment(?:(?:ar(?:ity|y)|ing|ed|s))?|t(?:e(?:(?:ness|ly|d|s))?|able|i(?:ons?|ng))|x(?:(?:i(?:on(?:(?:ed|s))?|t(?:ies|y))|es|ly))?)|a(?:i(?:n(?:(?:ing(?:ly)?|ants?|ts?|e[rd]|s))?|sant)|cen(?:t(?:ly)?|cy))|i(?:c(?:at(?:i(?:ons?|ng)|e(?:[ds])?)|ity?)|ment(?:(?:ary|ing|ed|s))?|an(?:ce|t)|e[ds])|y(?:ing)?|ot)|o(?:s(?:i(?:t(?:ion(?:(?:al|s))?|ors?|es?)|ng)|e(?:(?:d(?:ly)?|rs?|s))?|ure|ts?)|und(?:(?:ing|ed|s))?|nents?|rt)|il(?:a(?:tions?|ble)|e(?:(?:rs?|d|s))?|ing)|troller)|m(?:e(?:rc(?:ial(?:(?:is(?:ation|ed?|m)|ly|s))?|e)|morat(?:i(?:ons?|ng|ve)|e(?:[ds])?)|n(?:surate(?:ly)?|d(?:(?:a(?:tions?|bl[ey])|ing|ed|s))?|c(?:e(?:(?:ment|d|s))?|ing)|t(?:(?:a(?:r(?:ies|y)|t(?:ing|ors?|e))|ing|e[dr]|s))?))|u(?:n(?:i(?:ca(?:t(?:i(?:ve(?:ness)?|ons?|ng)|ors?|e(?:[ds])?)|ble|nts?)|t(?:arian|ies|y)|ques?|s(?:ts?|m)|ons?|ng)|al(?:(?:ity|ly))?|e(?:[ds])?)|t(?:at(?:i(?:v(?:ity|e)|on)|or)|e(?:(?:rs?|d|s))?|ing))|i(?:s(?:erat(?:i(?:ons?|ng)|ed?)|s(?:ion(?:(?:aire|e(?:rs?|d)|ing|s))?|ar(?:(?:iat|s))?))|t(?:(?:ments?|t(?:ing|e(?:es?|d)|al)|s))?)|o(?:n(?:(?:s(?:ens(?:ical|e))?|alit(?:ies|y)|places?|wealth|ness|e(?:rs?|st)|l(?:aw|y)))?|d(?:i(?:t(?:ies|y)|ous)|ores?|es?)|tions?)|a(?:(?:nd(?:(?:e(?:er(?:(?:ing|ed))?|rs?|d)|ing(?:ly)?|ments?|ant|o|s))?|s))?)|b(?:(?:at(?:(?:i(?:ve(?:ness)?|ng)|ants?|ed|s))?|in(?:at(?:orial|ions?)|ing|e(?:[ds])?|g)|ust(?:i(?:bles?|on)|ed|s)|e[dr]|s))?|rade(?:(?:inarms|s(?:hip)?|ly))?|f(?:ort(?:(?:ing(?:ly)?|abl[ey]|e(?:rs?|d)|s))?|y)|e(?:(?:s(?:tibles?)?|l(?:iness|y)|d(?:i(?:ans?|es)|own|y)|back|t(?:(?:ary|s))?|rs?))?|i(?:c(?:(?:al(?:ly)?|s))?|ngs?|ty)|a(?:(?:tose|s))?)|n(?:(?:s(?:(?:t(?:i(?:tu(?:t(?:i(?:on(?:(?:al(?:(?:i(?:s(?:ts|m)|ty)|ly))?|s))?|ve(?:ly)?|ng)|e(?:[ds])?)|en(?:c(?:ies|y)|ts?))|pat(?:ion|ed))|a(?:b(?:ular(?:ies|y)|les?)|n(?:t(?:(?:ly|s))?|cy))|e(?:llations?|rnati(?:ng|on))|r(?:u(?:ct(?:(?:i(?:on(?:(?:al|s))?|v(?:e(?:ly)?|is[mt])|ng)|able|ors?|ed|s))?|ing|e(?:[ds])?)|ict(?:(?:i(?:ons?|ng|ve)|ors?|ed|s))?|ain(?:(?:ing|ed|ts?|s))?))|c(?:i(?:en(?:ce(?:s(?:tricken)?)?|tious(?:(?:ness|ly))?)|o(?:us(?:(?:ness(?:es)?|ly))?|nable))|ript(?:(?:i(?:ng|on)|ed|s))?)|e(?:rv(?:at(?:i(?:on(?:(?:ists?|s))?|ve(?:(?:ness|ly|s))?|sm)|o(?:r(?:(?:ies|s|y))?|ire))|ing|e(?:[ds])?)|quen(?:t(?:(?:ial(?:ly)?|ly))?|ces?)|c(?:utive(?:ly)?|rat(?:i(?:ng|on)|ed?))|n(?:su(?:al(?:ly)?|s)|t(?:(?:ing|ed|s))?))|p(?:i(?:r(?:a(?:tor(?:(?:ial(?:ly)?|s))?|c(?:ies|y))|ing|e(?:[ds])?)|cuous(?:(?:ness|ly))?)|ecific)|anguin(?:eous|ity)|i(?:der(?:(?:a(?:t(?:ions?|e(?:ly)?)|bl[ey])|ing|ed|s))?|st(?:(?:e(?:n(?:c(?:ies|y)|t(?:ly)?)|d)|ing|s))?|gn(?:(?:ments?|ing|e[de]|s))?)|o(?:l(?:i(?:dat(?:i(?:ons?|ng)|e(?:[ds])?)|ng(?:ly)?)|ations?|e(?:[ds])?)|nan(?:t(?:(?:al|s))?|ce)|rt(?:(?:i(?:um|ng|a)|ed|s))?)|u(?:l(?:(?:t(?:(?:a(?:n(?:c(?:ies|y)|ts?)|ti(?:ons?|ve))|ing|ed|s))?|a(?:tes?|r)|s))?|m(?:mat(?:e(?:(?:ly|d))?|ion)|pti(?:ons?|ve)|ables?|e(?:(?:r(?:(?:is[mt]|s))?|d|s))?|ing))))?|c(?:e(?:pt(?:(?:ual(?:(?:is(?:ations?|ing|ed?)|ly))?|ions?|s))?|i(?:v(?:ab(?:ility|l[ey])|ing|e(?:[ds])?)|t(?:(?:ed|s))?)|ntr(?:at(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|ic)|ssion(?:(?:a(?:ry|l)|s))?|r(?:t(?:(?:goers|i(?:na)?|ed|o|s))?|n(?:(?:ed(?:ly)?|ing|s))?)|al(?:(?:ment|ing|ed|s))?|d(?:ing|e(?:[ds])?))|a(?:tenat(?:i(?:ons?|ng)|e(?:[ds])?)|v(?:ity|e))|o(?:mitant(?:ly)?|rd(?:(?:a(?:n(?:ces?|t)|t)|s))?|ct(?:(?:i(?:ons?|ng)|ed|s))?|urses?)|i(?:lia(?:t(?:i(?:ng|on)|ory?|e)|r)|se(?:(?:ness|ly))?|erge)|l(?:u(?:si(?:ve(?:ly)?|ons?)|d(?:ing|e(?:[ds])?))|aves?)|ret(?:e(?:(?:ness|ly|d|s))?|i(?:ons|ng))|u(?:r(?:(?:r(?:e(?:n(?:t(?:ly)?|c[ey])|d)|ing)|s))?|ss(?:(?:ion|ed))?|bines?))|v(?:e(?:r(?:s(?:a(?:tion(?:(?:al(?:(?:ists?|ly))?|s))?|zione|nt)|i(?:ons?|ng)|e(?:(?:ly|d|s))?)|t(?:(?:i(?:b(?:ility|les?)|ng)|ors?|e(?:rs?|d)|s))?|g(?:e(?:(?:n(?:ces?|t)|d|s))?|ing))|n(?:t(?:(?:i(?:on(?:(?:al(?:(?:i(?:s[mt]|ty)|ly))?|s))?|cle)|s))?|i(?:en(?:ces?|t(?:ly)?)|ng)|ors?|e(?:[drs])?)|ct(?:(?:i(?:on(?:al)?|ve|ng)|ed|or|s))?|y(?:(?:anc(?:ing|e)|ing|ors?|ed|s))?|x(?:ity)?)|alesc(?:e(?:n(?:ce|t))?|ing)|i(?:nc(?:ing(?:ly)?|e(?:[ds])?)|vial(?:ity)?|ct(?:(?:i(?:ons?|ng)|ed|s))?)|o(?:cations?|l(?:ut(?:ions?|ed)|ved?)|ys?)|uls(?:i(?:ve(?:ly)?|ons?|ng)|e(?:[ds])?))|t(?:e(?:mp(?:ora(?:ne(?:ous(?:ly)?|ity)|r(?:ies|y))|t(?:(?:uous(?:ly)?|ibl[ey]))?|lat(?:i(?:ons?|ng|ve)|e(?:[ds])?))|xt(?:(?:ual(?:(?:isation|ly))?|s))?|n(?:t(?:(?:i(?:o(?:us(?:ly)?|ns?)|ng)|ed(?:ly)?|ment|s))?|d(?:(?:ing|e(?:rs?|d)|s))?)|st(?:(?:a(?:ble|nts?)|ing|ed|s))?)|r(?:a(?:(?:di(?:stinction|ct(?:(?:or(?:ily|y)|i(?:ons?|ng)|ed|s))?)|indications?|c(?:epti(?:ves?|on)|t(?:(?:ual(?:ly)?|i(?:ble|ons?|le|ng)|ors?|ed|s))?)|ven(?:tions?|ing|e(?:[ds])?)|s(?:t(?:(?:i(?:ng(?:ly)?|ve)|ed|s|y))?)?|p(?:tions?|untal)|r(?:i(?:ness|wise|ly)|y)|flows?|band|lto))?|o(?:ver(?:s(?:i(?:al(?:ly)?|es)|y)|t(?:ed)?)|l(?:(?:l(?:able|e(?:rs?|d)|ing)|s))?)|i(?:but(?:i(?:ons?|ng)|or(?:[sy])?|e(?:[ds])?)|v(?:ances?|ing|e(?:[ds])?)|t(?:ion|e(?:ly)?))|etemps)|a(?:mina(?:t(?:i(?:ng|on)|e(?:[ds])?)|nts?)|ct(?:(?:able|ing|ed|s))?|in(?:(?:able|ment|ing|e(?:rs?|d)|s))?|gio(?:us|n))|i(?:n(?:gen(?:c(?:ies|y)|t(?:(?:ly|s))?)|u(?:a(?:(?:tions?|ble|l(?:ly)?|nce))?|i(?:t(?:ies|y)|ng)|ous(?:ly)?|e(?:[ds])?|um)|en(?:t(?:(?:als?|s))?|ce))|gu(?:ous(?:ly)?|ity))|o(?:rt(?:(?:i(?:on(?:(?:ist|s))?|ng)|ed|s))?|ur(?:(?:ing|ed|s))?)|u(?:s(?:ions?|e)|mely))|d(?:e(?:scen(?:d(?:(?:ing(?:ly)?|ed|s))?|sion)|mn(?:(?:a(?:t(?:ions?|ory)|ble)|ing|ed|s))?|ns(?:at(?:ions?|e)|ing|e(?:(?:rs?|d|s))?))|i(?:tion(?:(?:al(?:(?:ity|ly|s))?|e(?:rs?|d)|ing|s))?|ments?)|u(?:c(?:t(?:(?:i(?:v(?:it(?:ies|y)|e)|on|ng)|ance|ress|ors?|ed|s))?|ive)|its?)|o(?:le(?:(?:nces?|d|s))?|n(?:able|ing|e(?:[ds])?)|rs?))|f(?:i(?:d(?:e(?:(?:n(?:t(?:(?:ial(?:(?:ity|ly))?|ly))?|ces?)|d|s))?|ant(?:(?:es?|s))?|ing(?:ly)?)|gur(?:a(?:tions?|ble)|ing|e(?:[sd])?)|rm(?:(?:at(?:ions?|ory)|ing|ed|s))?|scat(?:i(?:ons?|ng)|ory|e(?:[ds])?)|n(?:e(?:(?:ments?|d|s))?|ing))|ront(?:(?:ation(?:(?:al|s))?|ing|ed|s))?|e(?:dera(?:t(?:ions?|es?)|cy)|ction(?:(?:er(?:[sy])?|ist|s))?|ss(?:(?:i(?:on(?:(?:als?|s))?|ng)|ors?|e[ds]))?|r(?:(?:enc(?:ing|es?)|r(?:ing|ed)|ment|s))?|tti)|l(?:a(?:grations?|t(?:i(?:on|ng)|e[ds]))|ict(?:(?:ing(?:ly)?|ual|ed|s))?|uen(?:ce|t))|o(?:rm(?:(?:a(?:tion(?:al)?|ble|nce|l)|i(?:s(?:ts?|m)|ty|ng)|ed|s))?|und(?:(?:ed(?:ly)?|ing|s))?|cal)|abulate|us(?:i(?:ng(?:ly)?|ons?)|e(?:(?:d(?:ly)?|r|s))?|able))|g(?:r(?:atulat(?:i(?:ons?|ng)|ory|e(?:[ds])?)|e(?:gat(?:i(?:on(?:(?:al|s))?|ng)|ed?)|ss(?:(?:ional|m(?:an|en)|es))?)|u(?:en(?:t(?:ial)?|c(?:es?|y))|ity))|lomerat(?:ion|e(?:[ds])?)|e(?:ni(?:al(?:ity)?|tal(?:ly)?)|st(?:(?:i(?:ve|on|ng)|ed))?|al(?:(?:ing|ed|s))?|r)|o|a)|n(?:o(?:isseur(?:s(?:hip)?)?|t(?:ations?|ing|e(?:[ds])?))|e(?:ct(?:(?:i(?:on(?:(?:less|s))?|v(?:ity|es?)|ng)|ed(?:ness)?|ors?|s))?|xions?|d)|iv(?:ance|ing|ed?))|j(?:u(?:nct(?:(?:i(?:v(?:itis|e)|ons?)|ures))?|ga(?:t(?:i(?:ons?|ng)|e(?:[sd])?)|cy|l)|r(?:e(?:(?:rs?|d|s))?|ing|ors?|y))|ectur(?:ing|al|e(?:[ds])?)|oin(?:(?:ing|ed|t))?)|qu(?:istador(?:es)?|e(?:r(?:(?:able|ors?|ing|ed|s))?|sts?))|u(?:rbations?|ndrums?)|i(?:fer(?:(?:ous|s))?|c(?:(?:al|s))?)|akry|k(?:ers?)?|m(?:an|en)|e(?:[sd])?|y))?|s(?:t(?:(?:e(?:ff(?:ective(?:ness)?|icient)|d)|cutting|l(?:i(?:ness|e(?:st|r))|ess|y)|ar(?:(?:r(?:ing|ed)|s))?|i(?:ngs?|ve)|ume(?:[ds])?|s))?|m(?:o(?:log(?:i(?:cal(?:ly)?|sts?|es)|y)|politans?|nauts?|s)|etic(?:(?:ally|s))?|ic(?:al(?:ly)?)?)|i(?:ne(?:ss?)?|e(?:st|r)|ly)|s(?:acks|et(?:(?:ed|s))?)|y)|l(?:(?:l(?:a(?:borat(?:i(?:on(?:(?:ist|s))?|ve(?:ly)?|ng)|ors?|e(?:[ds])?)|t(?:e(?:(?:ral(?:ly)?|d|s))?|i(?:ng|on))|ps(?:i(?:ble|ng)|e(?:[ds])?)|r(?:(?:less|bone|ing|ed|s))?|ge(?:[ns])?)|e(?:ct(?:(?:i(?:v(?:i(?:s(?:ation|m|t)|ty)|e(?:(?:ly|s))?)|ons?|ng)|ab(?:ility|les?)|ors?|ed|s))?|g(?:ia(?:te|l)|es?)|agues?)|o(?:qui(?:a(?:l(?:(?:isms?|ly))?)?|um)|cat(?:ion(?:(?:al|s))?|ed)|id(?:(?:al|s))?)|i(?:mat(?:ion|or)|sion(?:(?:al|s))?|e(?:(?:r(?:(?:ies|s|y))?|s))?|d(?:ing|e(?:[ds])?)|n(?:ear|s))|u(?:d(?:ing|ed?)|sion))|d(?:(?:blooded(?:ly)?|hearted|ness|e(?:st|r)|ish|war|ly|s))?|o(?:n(?:(?:i(?:s(?:ations?|ing|e(?:(?:rs|d))?|ts?)|al(?:(?:is(?:ts?|m)|s))?|es|c)|nade(?:[sd])?|els?|s|y))?|ur(?:(?:i(?:s(?:ation|ing|ed?)|ngs?)|a(?:tion|nts?)|blind|ful(?:ly)?|less|e|s|y))?|s(?:tom(?:ies|y)|s(?:al(?:ly)?|us))|bus|gne)|um(?:n(?:(?:ists?|ar|ed|s))?|bus)|a(?:(?:nder|s))?|e(?:slaw)?|itis|ts?|s))?|r(?:(?:r(?:e(?:spond(?:(?:e(?:n(?:ces?|ts?)|d)|ing(?:ly)?|s))?|ct(?:(?:i(?:on(?:(?:al|s))?|ve|ng)|able|ness|ors?|ed|ly|s))?|lat(?:i(?:ons?|ng|ve)|e(?:[sd])?))|o(?:borat(?:i(?:ng|on|ve)|ory|e(?:[ds])?)|d(?:ing|e(?:[ds])?)|si(?:on|ve))|u(?:gat(?:ions|ed)|pt(?:(?:i(?:ble|ons?|ng)|ed|ly|s))?)|i(?:genda|dors?)|al(?:(?:led|s))?)|t(?:i(?:c(?:osteroids?|al)|so(?:ne|l))|e(?:ge|x))|e(?:s(?:pondent)?)?|n(?:(?:e(?:r(?:(?:s(?:tones?)?|ing|ed))?|ts?|a(?:[sl])?|d)|f(?:l(?:o(?:wers?|ur)|akes?)|ields?)|ucopia|crake|i(?:ces?|sh)|meal|s|y))?|p(?:or(?:a(?:(?:t(?:i(?:ons?|s[mt])|e(?:(?:ly|s))?)|ls?))?|eal(?:ly)?)|u(?:s(?:c(?:ular|les?))?|lent)|s(?:es?)?)|o(?:llar(?:ies|y)|n(?:a(?:(?:tions?|r(?:ies|y)|s|l))?|e(?:rs?|ts?)))|uscates|morants?|k(?:(?:s(?:crews?)?|age|ed|y))?|d(?:(?:i(?:llera|al(?:(?:ity|ly|s))?|te)|uroys?|less|on(?:(?:ed|s))?|a(?:te|ge)|ed|s))?|a(?:l(?:(?:line|s))?|cle)|i(?:ander|nth)|vettes?|s(?:let|ica|e(?:ts?)?|age)|gis?))?|i(?:n(?:(?:cid(?:e(?:(?:n(?:t(?:al(?:ly)?)?|ces?)|d|s))?|ing)|ages?|e(?:rs?|d)|ing|s))?|ffure|l(?:(?:ing|ed|s))?|t(?:al|us))|d(?:(?:i(?:f(?:i(?:cations?|e[ds])|y(?:ing)?)|c(?:ils?|es)|ng)|e(?:(?:breaker|named?|words?|ine|rs?|x|s|d))?|dl(?:ing|e)|piece|fish|ling|s|a))?|e(?:lenterates|fficients?|x(?:ist(?:(?:e(?:n(?:ce|t)|d)|ing|s))?|tensive)|rc(?:i(?:ve(?:ly)?|ble|ons?|ng)|e(?:[drs])?)|val)|o(?:(?:p(?:(?:e(?:r(?:(?:at(?:i(?:ve(?:(?:ly|s))?|ng|on)|e(?:[sd])?)|s))?|d)|s))?|rdinat(?:i(?:ng|on)|ors?|e(?:[ds])?)|k(?:(?:books?|ware|e(?:r(?:[sy])?|d)|i(?:es|ng)|s))?|l(?:(?:ants?|ness|ing|e(?:st|rs?|d)|s))?|ing|ns?|ed|s))?|p(?:(?:y(?:(?:right(?:(?:able|ing|ed|s))?|writer|able|cats?|i(?:sts?|ng)))?|r(?:o(?:cessors?|phagous|duced|lite)|a)|p(?:er(?:(?:plate|y|s))?|ic(?:ing|e(?:[ds])?))|ulat(?:i(?:ons?|ng)|ory|e)|i(?:ous(?:ly)?|lot|e(?:rs?|s|d)|ng)|lanar|outs?|s(?:es?)?|e(?:[ds])?))?|b(?:(?:bl(?:e(?:(?:s(?:tones)?|rs?|d))?|ing)|web(?:(?:b(?:ed|y)|s))?|alt|ras?|le|s))?|h(?:abit(?:(?:ation|ing|ees))?|e(?:si(?:ve(?:(?:ness|ly))?|on)|re(?:(?:n(?:t(?:ly)?|c[ey])|d|s))?)|orts?)|quett(?:ish(?:ly)?|es?)|v(?:e(?:(?:t(?:(?:ous(?:ness)?|ing|ed|s))?|n(?:(?:ant(?:(?:e(?:rs|d)|s))?|s))?|r(?:(?:s(?:heet)?|a(?:ges?|lls)|ings?|lets?|t(?:(?:ly|s))?|ups?|ed))?|s))?|a(?:riances?|lent(?:ly)?))|a(?:gulat(?:ion|ed?)|l(?:(?:esc(?:e(?:(?:nce|d|s))?|ing)|miners|itions?|f(?:ields?|ace)|black|s))?|st(?:(?:guards?|l(?:ines?|ands)|e(?:rs?|d)|ing|al|s))?|uthor(?:(?:ing|ed|s))?|t(?:(?:hanger|ings?|ed|s))?|rse(?:(?:n(?:ess|s)|ly|st|r))?|c(?:h(?:(?:loads?|work|ing|m(?:an|en)|e[ds]))?|t(?:ion|ed|s))|x(?:(?:i(?:ng(?:ly)?|al)|e[ds]))?|pts)|c(?:k(?:(?:at(?:rices?|oos?)|roach(?:es)?|e(?:rels?|yed|d)|i(?:n(?:ess|g)|e(?:st|r))|s(?:(?:hies|ure))?|tails?|crow|neys?|pits?|les?|y))?|hlear?|o(?:nuts?|on(?:(?:ed|s))?|a)|a(?:ine?)?)|g(?:(?:itat(?:i(?:ons?|ve|ng)|ed?)|n(?:i(?:ti(?:ve(?:ly)?|on)|zan(?:ce|t)|san(?:ce|t))|oscenti|a(?:tes?|cs?))|en(?:t(?:ly)?|cy)|s))?|t(?:(?:er(?:minous|ie)|t(?:ages?|on(?:(?:ed|s))?)|s))?|ff(?:e(?:r(?:(?:dams?|s))?|es?)|ins?)|w(?:(?:ard(?:(?:ice|ly|s))?|orkers?|rit(?:ten|er)|e(?:r(?:(?:ing|ed|s))?|d)|girls?|s(?:(?:heds?|lips?))?|l(?:(?:ing|ed))?|h(?:erd|and)|boys?|ing))?|x(?:(?:combs?|swain|ing|e[ds]))?|y(?:(?:otes?|ness|ly))?|zier|ke)|h(?:l(?:or(?:o(?:f(?:luorocarbons?|orm(?:(?:ing|ed))?)|phyll|quine)|i(?:n(?:at(?:ion|ed)|e)|de)|ate)|amydia)|a(?:r(?:(?:a(?:cter(?:(?:is(?:tic(?:(?:ally|s))?|ations?|ing|e(?:[ds])?)|less|ful|s))?|banc|des?)|i(?:sma(?:(?:tic(?:(?:ally|s))?|s))?|ot(?:(?:eers?|s))?|t(?:abl[ye]|ies|y))|c(?:uterie|oal)|t(?:(?:e(?:r(?:(?:ing|ed|s))?|d)|i(?:sts|ng)|s))?|m(?:(?:ing(?:ly)?|less|e(?:rs?|d)|s))?|l(?:a(?:tans?|dy)|es|ie)|g(?:e(?:(?:able|rs?|d|s))?|ing)|woman|r(?:ing|ed)|ed|on|y|s))?|n(?:c(?:e(?:(?:l(?:l(?:or(?:s(?:hip)?)?|ery))?|ry?|d|s))?|i(?:e(?:st|r)|ng)|y)|g(?:e(?:(?:ab(?:ility|le)|overs?|l(?:ing|ess)|rs?|d|s))?|ing)|d(?:eliers?|ler)|nel(?:(?:l(?:ing|ed)|s))?|t(?:(?:e(?:use|d|r)|ings?|r(?:ies|y)|s))?)|i(?:r(?:(?:m(?:an(?:ships?)?|en)|persons?|wom(?:en|an)|lift|ing|ed|s))?|n(?:(?:s(?:(?:mok(?:ing|ed?)|aws?))?|ing|ed))?)|l(?:leng(?:ing(?:ly)?|e(?:(?:rs?|s|d))?)|dron|ices?|k(?:(?:ing|ed|s|y))?|ets?)|m(?:p(?:(?:i(?:on(?:(?:s(?:hips?)?|ing|ed))?|ng)|agnes?|s))?|ber(?:(?:lains?|maids?|pots?|ed|s))?|eleons?|fer(?:ed)?|o(?:mile|is))|s(?:t(?:i(?:s(?:e(?:(?:ment|d|s))?|ing)|ty)|e(?:(?:n(?:ing|ed)|ly))?)|e(?:(?:rs?|d|s))?|ing|sis|ms?)|u(?:vinis(?:t(?:(?:ic|s))?|m)|ffeur(?:(?:ed|s))?)|f(?:f(?:(?:in(?:ch(?:es)?|g)|ed))?|ing|e(?:[ds])?)|o(?:tic(?:ally)?|s)|t(?:(?:t(?:e(?:r(?:(?:ing|box|e[dr]|s))?|ls?|d)|i(?:ly|ng)|y)|eau|s))?|p(?:(?:lain(?:(?:cy|s))?|e(?:ron(?:e(?:[sd])?)?|ls?)|p(?:ing|ed)|ters?|man|s))?|grin(?:ed)?|cha|d)|e(?:m(?:i(?:luminescen(?:ce|t)|c(?:al(?:(?:ly|s))?)?|s(?:t(?:(?:ry|s))?|e))|o(?:therap(?:eutic|y)|synthesis))|e(?:r(?:(?:le(?:ss(?:ness)?|aders?)|ful(?:(?:ness|ly))?|i(?:e(?:st|r)|ly|ng|o)|ed|s|y))?|s(?:e(?:(?:b(?:urgers?|oard)|making|c(?:loth|ake)|s))?|y)|k(?:(?:bones?|i(?:e(?:st|r)|ly|ng)|ed|s|y))?|p(?:ing)?|tahs?)|que(?:(?:r(?:(?:board|ing|ed|s))?|books?|s))?|s(?:t(?:(?:e(?:r(?:field)?|d)|nuts?|s|y))?|s(?:(?:boards?|men))?)|a(?:p(?:(?:skates|e(?:n(?:(?:ing|ed|s))?|st|r)|ness|ish|ly))?|t(?:(?:e(?:rs?|d)|ing|s))?)|ck(?:(?:points?|lists?|e(?:r(?:(?:ing|ed|s))?|d)|mate|outs?|ing?|ups?|s))?|r(?:ish(?:(?:ing|e[ds]))?|r(?:y(?:red)?|ies)|oots?|ub(?:(?:i[cm]|s))?)|v(?:alier|rons?)|w(?:(?:able|i(?:e(?:st|r)|ng)|e[dr]|y|s))?|ddar|kov|fs?)|r(?:o(?:m(?:a(?:t(?:ograph(?:(?:ic|y))?|ic(?:ism)?))?|osom(?:al|es?)|i(?:te|um)|ed?)|n(?:o(?:log(?:i(?:cal(?:ly)?|es)|y)|met(?:ric|er)|graph)|ic(?:(?:ally|l(?:e(?:(?:rs?|s|d))?|ing)))?))|ysa(?:nthemums?|lis)|ist(?:(?:en(?:(?:ings?|ed))?|ian))?)|o(?:r(?:e(?:(?:ograph(?:e(?:rs?|d)|i(?:ng|c)|y)|a|s))?|isters?|tl(?:ing|e(?:[ds])?)|al(?:(?:es?|s))?|us(?:e[ds])?|d(?:(?:al|s))?)|c(?:k(?:(?:ablock|full|s))?|olates?)|i(?:r(?:(?:master|boys?|s))?|ce(?:st?)?)|l(?:e(?:sterol|ra)|ine)|p(?:(?:s(?:ticks)?|p(?:i(?:e(?:st|r)|ng)|e(?:rs?|d)|y)|in))?|mp(?:(?:ing|ed|s))?|os(?:e(?:(?:rs?|s|y))?|i(?:er|ng)|y)|k(?:ing|e(?:[drs])?)|ughs|sen?|w)|i(?:l(?:d(?:(?:l(?:ess(?:ness)?|ike|y)|b(?:earing|irth)|ish(?:(?:ness|ly))?|minders|proof|hoods?|care|ren))?|l(?:(?:i(?:(?:n(?:g(?:ly)?|ess)|e(?:st?|r)))?|e(?:rs?|d)|s|y))?|blains?|ean|i)|r(?:op(?:ract(?:ors?|ic)|od(?:ist|y))|ruped|p(?:(?:ing|ed|s|y))?|al)|v(?:alr(?:ous(?:ly)?|ic|y)|v(?:y(?:ing)?|ied)|es)|m(?:aer(?:ical|a)|p(?:(?:anzees?|s))?|e(?:(?:r(?:ical|as?)|d|s))?|neys?|ing)|n(?:(?:oiserie|k(?:(?:ing|ed|s))?|less|ese|tzy?|s|a))?|sel(?:(?:l(?:ing|ed)|ed|s))?|huahuas?|ef(?:(?:tains?|ly|s))?|c(?:(?:a(?:ne(?:ry)?|go)|k(?:(?:ens?|s))?|ory))?|p(?:(?:board|p(?:ings?|ed)|munk|s))?|d(?:ing|e(?:[ds])?)|ffon|ts?)|u(?:r(?:ch(?:(?:wardens?|goers?|yards?|m(?:an|en)|es))?|lish(?:(?:ness|ly))?|n(?:(?:ing|ed|s))?)|n(?:tering|k(?:(?:ier|s|y))?|nel)|bb(?:iness|y)|ck(?:(?:l(?:ing|e(?:[ds])?)|ing|ed|s))?|g(?:(?:g(?:ing|ed)|s))?|t(?:zpah|ney|es?)|ff(?:ed)?|m(?:[sp])?))|i(?:r(?:c(?:u(?:m(?:navigat(?:ion(?:al)?|e(?:[ds])?)|s(?:tan(?:tial(?:ly)?|ces?)|crib(?:ing|ed?)|pect(?:(?:ion|ly))?)|f(?:eren(?:tial|ces?)|lex(?:es)?)|locut(?:ions?|ory)|vent(?:(?:able|i(?:ons?|ng)|ed|s))?|cis(?:ion|ed?))|la(?:r(?:(?:i(?:sed?|ty)|ly|s))?|t(?:i(?:ons?|ng)|ory|e(?:[sd])?)|nt)|it(?:(?:ous|ry|s))?|s(?:es)?)|a(?:dian)?|l(?:e(?:(?:ts?|d|s))?|ing))|r(?:ho(?:sis|tic)|us))|n(?:e(?:ma(?:(?:t(?:ograph(?:er|y)|ic)|s))?)?|namon|ders?|ch)|vi(?:l(?:(?:i(?:s(?:ations?|ing|ed?)|t(?:ies|y)|ans?)|ly))?|cs?|es)|t(?:i(?:zen(?:(?:s(?:hip)?|ry))?|es|ng)|a(?:tions?|dels?)|y(?:scape)?|r(?:ates?|us(?:es)?|ons?|ic)|hers|tern|e(?:[sd])?)|gar(?:(?:et(?:tes?)?|s))?|pher(?:(?:ed|s))?|st(?:erns?)?|c(?:adas?|ero)|ders?|li(?:um|a))|r(?:o(?:s(?:s(?:(?:f(?:ertilisation|ire)|e(?:xamin(?:ation|ing|e(?:[ds])?)|s|r|d)|r(?:eferenc(?:ing|e(?:[ds])?)|oads)|section(?:(?:al|s))?|c(?:heck(?:(?:ing|ed|s))?|ountry)|w(?:ords?|inds?|ays)|overs?|b(?:o(?:nes|ws?)|ars?|red)|\\-bun|ings?|ness|talk|ly))?|iers?)|tch(?:(?:et(?:(?:iness|y))?|less))?|o(?:k(?:(?:ed(?:(?:ness|ly))?|ing|s))?|n(?:(?:e(?:rs?|d)|ing|s))?)|quet(?:(?:ing|ed|te))?|issants?|c(?:odiles?|het(?:(?:ed|s))?|k(?:(?:ery|s))?|us(?:es)?)|u(?:ch(?:(?:ing|e[ds]))?|p(?:ier)?|tons)|a(?:k(?:(?:i(?:e(?:st|r)|ng)|ed|s))?|tian?)|ft(?:(?:ers?|ing|s))?|p(?:(?:p(?:e(?:rs?|d)|ing)|s))?|w(?:(?:bars?|d(?:(?:ing|ed|s))?|n(?:(?:ing|ed|s))?|ing|ed|s))?|ziers?|n(?:ies|es?|y)|res)|y(?:(?:pt(?:(?:o(?:gra(?:ph(?:ic(?:ally)?|ers?|y)|m)|logy)|analy(?:s(?:is|t)|tic)|ic(?:ally)?|s))?|stal(?:(?:l(?:ograph(?:ers?|ic|y)|i(?:s(?:ation|ing|e(?:[ds])?)|ne))|clear|s))?|o(?:genics?|stat)|ings?))?|e(?:d(?:i(?:t(?:(?:worth(?:iness|y)|ab(?:ility|l[ye])|ing|ors?|ed|s))?|b(?:ility|l[ey]))|en(?:tials|ce)|ul(?:ity|ous)|o)|nellat(?:ions?|ed)|a(?:t(?:i(?:on(?:(?:is(?:ts?|m)|s))?|v(?:e(?:(?:ness|ly))?|ity)|ng)|able|ures?|ors?|e(?:[sd])?)|k(?:(?:i(?:e(?:st|r)|ng)|ed|y|s))?|m(?:(?:i(?:e(?:st|r)|ng)|e(?:ry?|d)|y|s))?|s(?:ing|e(?:[sd])?))|m(?:at(?:ori(?:um|a)|ions?|e(?:[ds])?)|e)|p(?:uscular|e|t)|s(?:t(?:(?:fallen|ing|ed|s))?|cen(?:do|ts?)|s)|t(?:a(?:ceous|ns?)|in(?:(?:ous|s))?|e)|v(?:asses?|ices?)|e(?:p(?:(?:ers?|ing|y|s))?|ks?|ds?|l)|o(?:sote|les?)|w(?:(?:m(?:en|an)|ing|ed|s))?|ches?)|i(?:m(?:(?:in(?:al(?:(?:i(?:s(?:ation|ing|ed?)|ty)|ly|s))?|olog(?:i(?:cal|sts?)|y))|p(?:(?:ing|ed))?|son|e(?:[sa])?))?|s(?:scrosse[ds]|p(?:(?:ie(?:st|r)|ness|ly|e[rd]|y|s))?|is|es)|ppl(?:ing(?:ly)?|e(?:[ds])?)|t(?:i(?:c(?:(?:is(?:ing|ms?|e(?:[sd])?)|al(?:ly)?|s))?|ques?)|eri(?:on|a)|ter)|ck(?:et(?:(?:ing|ers?|s))?)?|n(?:kl(?:ing|ed?|y)|oline|g(?:ing|e(?:[sd])?))|b(?:(?:b(?:age|ing|ed)|s))?|e[drs])|a(?:ft(?:(?:s(?:(?:m(?:an(?:ship)?|en)|people))?|i(?:e(?:st|r)|ly|ng)|e[rd]|y))?|s(?:h(?:(?:land(?:(?:ing|ed))?|ing(?:ly)?|e(?:rs?|s|d)))?|s(?:(?:ness|ly|er))?)|n(?:(?:berr(?:ies|y)|k(?:(?:s(?:haft)?|ing|ed|y))?|n(?:ies|y)|i(?:um|ng|al)|e(?:[sd])?))?|ck(?:(?:downs?|able|l(?:ing|e(?:[ds])?|y)|pots?|e(?:rs?|d)|ing|s))?|z(?:i(?:ness|e(?:st|r)|ly)|e(?:[sd])?|y)|dl(?:ing|e(?:[sd])?)|m(?:(?:m(?:ing|e[rd])|p(?:(?:ing|ons?|ed|s))?|s))?|te(?:(?:ful|r(?:(?:ed|s))?|s))?|v(?:e(?:(?:n(?:ly)?|s|d))?|ings?|ats?)|w(?:l(?:(?:e(?:rs?|d)|ing|s))?|s)|y(?:fish|on(?:(?:ed|s))?)|g(?:(?:gy|s))?|b(?:(?:by|s))?|p)|u(?:ci(?:f(?:i(?:x(?:(?:ions?|es))?|able|ed)|y(?:ing)?|orm)|a(?:l(?:ly)?|te)|bles?)|s(?:t(?:(?:a(?:ceans?|l)|ie(?:st|r)|ed|y|s))?|h(?:(?:ing(?:ly)?|e(?:rs?|s|d)))?|ad(?:e(?:(?:rs?|d|s))?|ing))|nch(?:(?:i(?:e(?:st|r)|ng)|e(?:rs?|d|s)|y))?|m(?:b(?:(?:l(?:i(?:e(?:st|r)|ng)|e(?:[ds])?|y)|ing|y|s))?|p(?:l(?:ing|e(?:[ds])?)|ets?)|my)|d(?:e(?:(?:ness|st|ly|r))?|it(?:ies|y))|el(?:(?:l(?:e(?:st|r)|y)|ness|t(?:ies|y)|e(?:st|r)))?|is(?:e(?:(?:rs?|s|d))?|ing)|tch(?:es)?|ller|x(?:es)?))|a(?:r(?:(?:i(?:catur(?:isation|e(?:[ds])?)|bou|es|ng)|d(?:(?:i(?:o(?:pulmonary|vascular|log(?:ist|y)|id)|n(?:al(?:(?:ity|s))?|g)|gans?|ac|ff)|holders|board|ed|s))?|n(?:iv(?:or(?:ous(?:ness)?|es?)|als?)|a(?:tions?|l(?:(?:ity|ly))?|ges?))|c(?:ino(?:gen(?:(?:esis|ic|s))?|mas?)|as(?:s(?:es)?|es?))|b(?:o(?:hydrates?|n(?:(?:i(?:ferous|se|c)|a(?:ceous|te(?:[sd])?)|yl|s))?|rundum|lic|xyl)|u(?:rettors?|ncles?)|i(?:nes?|de))|t(?:(?:o(?:graph(?:ers?|ic|y)|on(?:(?:ists?|s))?|uche|ns?)|wheels?|ridges?|horses|i(?:lage|ng)|loads?|e(?:ls?|d|r)|s))?|e(?:(?:less(?:(?:ness|ly))?|f(?:ul(?:(?:ness|ly))?|ree)|s(?:s(?:(?:ing(?:ly)?|e[ds]))?)?|t(?:akers?|s)|er(?:(?:i(?:s(?:ts?|m)|ng)|ed|s))?|worn|rs?|d))?|r(?:i(?:age(?:(?:ways?|s))?|e(?:rs?|d|s)|on)|y(?:(?:cot|ing))?|ot(?:[sy])?|el)|a(?:binieri|mel(?:(?:ised|s))?|v(?:an(?:(?:ning|s))?|el)|cals?|pace|way|fe|ts?)|p(?:(?:e(?:nt(?:ers?|ry)|t(?:(?:ing|ed|s))?)|orts?|ing|al|s))?|o(?:us(?:ing|el?)|t(?:ene|i[dn])|ls?)|yatids|v(?:ings?|e(?:(?:r(?:[sy])?|d|s))?)|mine|s(?:ick)?|go))?|t(?:(?:a(?:stroph(?:ic(?:ally)?|es?)|c(?:lysm(?:ic)?|ombs?)|l(?:ogu(?:e(?:(?:rs?|s|d))?|ing)|y(?:s(?:i(?:ng|s)|e(?:[ds])?|ts?)|tic)|epsy)|pult(?:(?:ing|ed|s))?|marans?|nddog|r(?:acts?|rh)|tonic)|e(?:gor(?:i(?:s(?:ations?|ing|e(?:[ds])?)|cal(?:ly)?|es)|y)|r(?:(?:pillars?|wauls?|e(?:rs?|d)|ing|s))?|chis(?:ts?|ms?))|h(?:e(?:ter(?:(?:isation|s))?|drals?)|ar(?:sis|tic)|o(?:des?|lic))|c(?:h(?:(?:phrases?|words?|i(?:e(?:st|r)|ng)|ment|e(?:rs?|d|s)|y))?|alls)|ion(?:(?:ic|s))?|walks?|fish|guts?|like|s(?:uit)?|t(?:ery|le)|n(?:ap|ip)))?|m(?:(?:p(?:(?:a(?:n(?:olog(?:i(?:cal|st)|y)|ile)|ign(?:(?:e(?:rs?|d)|ing|s))?)|fires?|s(?:ites?)?|us(?:es)?|e(?:rs?|d)|hor|ing))?|o(?:uflag(?:ing|e(?:[ds])?)|mile)|araderie|e(?:(?:ra(?:(?:work|m(?:an|en)|s))?|l(?:(?:hair|ot|s))?|o))?|corders?|b(?:odia|er)|isole|s(?:haft)?))?|p(?:(?:i(?:t(?:a(?:(?:l(?:(?:is(?:ation|ing|t(?:(?:ic|s))?|e(?:[ds])?|m)|ly|s))?|t(?:ion|e)))?|ulat(?:i(?:ng|on)|e(?:[ds])?)|ol)|llar(?:ies|y))|ri(?:(?:c(?:ious(?:(?:ness|ly))?|es?)|ole|s))?|a(?:b(?:ilit(?:ies|y)|l[ey])|ci(?:t(?:ance|ors?|i(?:ve|es)|y)|ous)|risoned)|t(?:i(?:v(?:at(?:i(?:ng|on)|ed?)|ity|es?)|o(?:n(?:(?:ed|s))?|us))|ain(?:(?:ing|cy|ed|s))?|ur(?:ing|e(?:[ds])?)|ors?)|p(?:uccino|ing|ed)|s(?:(?:iz(?:ing|e(?:[ds])?)|tans?|ules?))?|e(?:(?:r(?:(?:ing|ed|s))?|town|s|d))?|ybara))?|l(?:c(?:i(?:f(?:i(?:cation|ed)|y)|te|um)|u(?:l(?:a(?:t(?:e(?:(?:d(?:ly)?|s))?|i(?:ons?|ng|ve)|ors?)|ble)|us)|tta)|areous)|l(?:(?:i(?:sthenics|graph(?:er|ic|y)|pers?|ngs?)|o(?:us(?:(?:ness|ed|ly))?|w(?:ness)?)|girls?|able|e(?:rs?|d)|u[ps]|s))?|amit(?:ous(?:ly)?|ies|y)|i(?:br(?:at(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|e)|f(?:ornia)?|p(?:ers?|h)|co)|or(?:i(?:met(?:ers?|ry)|fic|es?)|y)|umn(?:i(?:ate|es)|y)|endars?|d(?:rons?|era)|m(?:(?:ness|e(?:st|d|r)|ing|ly|s))?|v(?:ary|ing?|es?)|ypso|f)|n(?:(?:c(?:e(?:l(?:(?:l(?:ations?|ing|ed)|s))?|r(?:(?:ous|s))?)|an)|n(?:i(?:bal(?:(?:is(?:ing|tic|ed?|m)|s))?|ly|ng)|o(?:n(?:(?:balls?|ing|ed|s))?|t)|abis|e(?:ry|d|l|s)|ula|y)|a(?:l(?:(?:isation|s))?|d(?:ian|a)|r(?:ies|d|y)|pes?|an)|d(?:i(?:d(?:(?:a(?:t(?:ures?|es?)|cy)|ly))?|es)|le(?:(?:s(?:ticks?)?|li(?:ght|t)|power))?|ela(?:bra|s)|our|y)|o(?:n(?:(?:i(?:s(?:ation|ed?)|c(?:al(?:ly)?)?)|ry|s))?|e(?:(?:i(?:sts?|ng)|d|s))?|p(?:ener|ie[ds]|y))|t(?:(?:a(?:nkerous|loupe|tas?)|i(?:lever(?:ed)?|cles?)|e(?:r(?:(?:ing|ed|s))?|ens?|d)|o(?:ns?|r)))?|vas(?:(?:s(?:(?:ing|e(?:rs?|d|s)))?|e[ds]))?|i(?:sters?|n(?:es?|gs?))|berra|yons?|e(?:[sd])?|s))?|u(?:l(?:iflowers?|drons?|king)|t(?:io(?:us(?:(?:ness|ly))?|n(?:(?:ing|ary|ed|s))?)|eris(?:ing|e))|s(?:tic(?:(?:ally|s))?|a(?:l(?:(?:ity|ly))?|ti(?:on|ve))|e(?:(?:ways?|d|s))?|ing)|cus(?:es)?|dal|ght)|b(?:(?:in(?:(?:et(?:(?:maker|s))?|s))?|riolet|a(?:rets?|ls?)|b(?:ages?|y)|l(?:e(?:(?:way|d|s))?|ing)|oo(?:dle|se)|m(?:an|en)|s))?|c(?:ophon(?:ous|y)|kl(?:ing|e(?:[ds])?)|t(?:us(?:es)?|i)|h(?:ing|e(?:[dst])?)|ao)|s(?:t(?:(?:e(?:(?:llated|rs?|s))?|i(?:gat(?:ing|e(?:[sd])?)|ngs?|ron)|rat(?:i(?:on|ng)|ed?|o)|a(?:nets?|ways?)|l(?:ing|e(?:[ds])?)|o(?:ffs?|rs?)|s))?|u(?:al(?:(?:t(?:ies|y)|ness|ly|s))?|istry)|s(?:e(?:roles?|ttes?)|o(?:wary|cks?)|ava)|ca(?:d(?:ing|e(?:[ds])?)|ra)|e(?:(?:loads?|ments?|book|work|s|d))?|anova|h(?:(?:i(?:ers?|ng)|less|mere|box|e[dsw]))?|in(?:gs?|o)|k(?:(?:ets?|s))?)|v(?:i(?:t(?:ation|ies|y)|ar(?:[es])?|ng)|al(?:ry(?:m(?:en|an))?|ier(?:(?:ly|s))?|cade)|e(?:(?:r(?:(?:n(?:(?:ous|s))?|s))?|ats?|m(?:an|en)|in|s|d))?|ort(?:(?:ing|ed|s))?)|f(?:e(?:(?:terias?|s))?|tans?)|d(?:(?:aver(?:(?:ous|s))?|d(?:y(?:ing)?|ie(?:[ds])?)|e(?:(?:n(?:ces?|zas?)|ts?))?|mium|ge(?:[drs])?|s))?|g(?:oules?|i(?:est|ng)|e(?:[ysd])?|y)|jol(?:ing|ed?)|hoots|i(?:mans?|r(?:ns?|o)|n)|ymans?|esar|k(?:ing|e(?:[sd])?)|w(?:ing)?)|l(?:a(?:s(?:s(?:(?:i(?:f(?:i(?:cat(?:ions?|ory)|able|e(?:rs?|s|d))|y(?:ing)?)|c(?:(?:al(?:ly)?|is(?:ts?|m)|s))?|e(?:st|r)|ng)|less(?:ness)?|rooms?|mates?|e[ds]|y))?|h(?:(?:ing|e[ds]))?|p(?:(?:ing|e[dr]|s))?)|r(?:i(?:f(?:i(?:cations?|e[ds])|y(?:ing)?)|net(?:(?:tist|s))?|on|ty)|ets?)|us(?:trophobi[ac]|al|es?)|n(?:(?:destine(?:ly)?|g(?:(?:e(?:rs|d)|ing))?|k(?:(?:ing|ed))?|nish|s(?:men)?))?|i(?:rvoyan(?:ce|ts?)|m(?:(?:a(?:ble|nts?)|ing|ed|s))?)|m(?:(?:o(?:rous(?:ly)?|ur(?:(?:ing|ed|s))?)|ber(?:(?:ing|ed|s))?|p(?:(?:down|ing|ed|s))?|m(?:ing|ed|y)|s))?|vic(?:hord|le)|tter(?:(?:ing|ed|s))?|y(?:(?:mores?|ey|s))?|cking|d(?:ding)?|p(?:(?:p(?:e(?:rs?|d)|ing)|trap|s))?|w(?:(?:ing|ed|s))?)|i(?:m(?:a(?:t(?:olog(?:i(?:cal|sts)|y)|ic(?:ally)?|es?)|ctic|x(?:(?:ing|e[ds]))?)|b(?:(?:able|down|e(?:rs?|d)|ing|s))?|es)|ff(?:(?:hanger|s))?|p(?:(?:boards?|p(?:ings?|e(?:rs?|d))|s))?|n(?:ic(?:(?:ians?|al(?:ly)?|s))?|ch(?:(?:ing|e[ds]))?|g(?:(?:ers|ing|s))?|k(?:(?:ing|e[dr]))?)|ent(?:(?:ele|s))?|c(?:k(?:(?:ing|ed|s))?|hes?)|tor(?:al|is)|que(?:[sy])?)|o(?:a(?:k(?:(?:anddagger|rooms?|ing|ed|s))?|ca)|s(?:e(?:(?:d(?:circuit)?|knit|ness|t(?:(?:ed|s))?|ups?|ly|rs?|st?))?|able|ings?|ures?)|t(?:(?:h(?:(?:e(?:(?:s(?:pegs?)?|d))?|i(?:ers?|ng)|s))?|t(?:ing|ed)|s))?|u(?:d(?:(?:bursts?|s(?:capes?)?|i(?:n(?:ess|g)|e(?:st|r))|less|ed|y))?|t(?:(?:ed|s))?)|ister(?:(?:ed|s))?|ck(?:(?:maker|w(?:ise|ork)|ing|ed|s))?|ying(?:ly)?|g(?:(?:g(?:ing|ed)|s))?|wn(?:(?:i(?:ng|sh)|ed|s))?|bber|n(?:ing|al|e(?:[ds])?)|ve(?:[nrs])?|ds?)|e(?:a(?:r(?:(?:s(?:ighted)?|headed|ances?|ings?|ness|cut|e(?:st|d|r)|ups?|way|ly))?|n(?:(?:l(?:i(?:ness|ving)|y)|s(?:(?:haven|ing|e(?:[drs])?))?|ness|cut|e(?:rs?|st|d)|ing|up))?|v(?:ages?|e(?:(?:rs?|d|s))?|ing)|t)|ver(?:(?:ness|e(?:st|r)|ly))?|r(?:ic(?:(?:al(?:ly)?|s))?|g(?:y(?:m(?:an|en))?|ies)|ks?)|nch(?:(?:ing|e[ds]))?|m(?:atis|en(?:cy|t))|f(?:ts?)?|g)|u(?:t(?:ter(?:(?:ing|ed|s))?|ch(?:(?:ing|e[ds]))?)|ster(?:(?:ing|ed|s))?|m(?:s(?:i(?:ness|e(?:st|r)|ly)|y)|p(?:(?:ing|ed|s|y))?|ber)|b(?:(?:footed|house|b(?:ing|ed)|room|man|s))?|ck(?:(?:ing|ed|s))?|e(?:(?:less|d(?:up)?|s))?|ng))|u(?:s(?:t(?:o(?:m(?:(?:is(?:a(?:tions?|ble)|ing|ed?)|ar(?:ily|y)|ers?|s))?|d(?:ia(?:n(?:s(?:hip)?)?|l)|y))|ards?)|s(?:edness)?|hion(?:(?:ing|ed|s))?|ps?)|r(?:(?:t(?:(?:ai(?:l(?:(?:ments?|ing|ed|s))?|n(?:(?:ing|ed|s))?)|s(?:ey(?:(?:ing|ed|s))?|y(?:ing)?|ie[ds])|ilage|ness|ly))?|a(?:t(?:or(?:(?:s(?:hips)?|ial))?|ive|e(?:[sd])?)|ble|re)|i(?:o(?:(?:sit(?:ies|y)|us(?:ly)?))?|ng|es?|al?)|mudgeons|v(?:i(?:linear|ng)|a(?:tures?|ceous)|e(?:[sd])?|y)|r(?:i(?:c(?:ul(?:um|ar?)|le)|e[sd])|en(?:c(?:ies|y)|t(?:(?:ly|s))?)|ants?|y(?:ing)?)|l(?:(?:i(?:cues|n(?:ess|g)|e(?:st|r))|e(?:ws?|rs|d)|s|y))?|s(?:(?:or(?:(?:ily|y|s))?|i(?:ve|ng)|e(?:[sd])?))?|d(?:(?:l(?:ing|e(?:[sd])?)|s))?|fews?|b(?:(?:ing|ed|s))?|e(?:[drs])?))?|l(?:t(?:(?:iva(?:t(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|ble|r)|u(?:r(?:al(?:ly)?|ing|e(?:[ds])?)|s)|s))?|minat(?:i(?:ng|on)|e(?:[sd])?)|p(?:ab(?:ility|l[ey])|rits?)|desac|inary|vert|l(?:(?:ing|ed|s))?)|m(?:bersome(?:ly)?|ul(?:ative(?:ly)?|us)|merbund|laude)|p(?:(?:id(?:i(?:nously|ty))?|boards?|rous|p(?:ing|ed)|olas?|ful|s))?|n(?:ni(?:lingus|ng(?:ly)?)|eiform)|t(?:(?:t(?:le(?:fish)?|hroat|ing(?:(?:ly|s))?|ers?)|l(?:ass(?:es)?|e(?:ts?|ry?))|backs?|e(?:(?:ness|st|ly))?|icles?|price|rate|outs?|s))?|d(?:(?:dl(?:i(?:n(?:ess|g)|e(?:st|r))|e(?:[sd])?|y)|gels?|s))?|b(?:(?:i(?:c(?:(?:al(?:ly)?|les?))?|s(?:t(?:(?:ic|s))?|m)|ts?|ng)|oid|a(?:ns?)?|e(?:[ds])?|s))?|c(?:ko(?:ld(?:ed)?|os?)|umbers?)|i(?:sine|rass|ng)|ff(?:(?:ing|ed|s))?|e(?:(?:ing|d|s))?)|e(?:n(?:s(?:or(?:(?:i(?:ous(?:ness)?|al|ng)|s(?:hip)?|ed))?|u(?:r(?:ing|e(?:[ds])?)|s(?:es)?)|er)|t(?:(?:r(?:al(?:(?:i(?:s(?:ation|e(?:(?:rs?|d|s))?|ing|t|m)|ty)|ly))?|i(?:fug(?:a(?:tion|l(?:ly)?)|ing|e(?:[ds])?)|petal|sts?|ng|c)|e(?:(?:pieces?|folds?|ing|d|s))?|oids?)|en(?:ar(?:ians|y)|nial)|i(?:me(?:(?:tres?|s))?|pedes?|grade)|ur(?:i(?:ons?|es)|y)|aurs?|s))?|otaph)|r(?:e(?:mon(?:i(?:ous(?:ly)?|al(?:(?:ly|s))?|es)|y)|b(?:ellum|r(?:al|um))|als?|s)|t(?:i(?:f(?:i(?:cat(?:ion|e(?:[ds])?)|abl[ey]|e[ds])|y(?:ing)?)|tudes?)|ain(?:(?:t(?:ies|y)|ly))?)|ami(?:cs?|st)|vi(?:cal|x)|ise)|l(?:e(?:b(?:r(?:a(?:t(?:i(?:ons?|ng)|ory|e(?:[sd])?)|nts?)|it(?:ies|y)))?|stial(?:ly)?|r(?:iac|y))|l(?:(?:o(?:phane)?|ul(?:ite|o(?:id|se)|ar)|ists?|ars?|s))?|andine|iba(?:cy|te)|sius|tic)|as(?:e(?:(?:less(?:ly)?|fires?|d|s))?|ing)|phalopods|ss(?:(?:ations?|p(?:ools?|it)|ion))?|me(?:ter(?:ies|y)|nt(?:(?:ing|ed|s))?)|d(?:ar(?:(?:wood|s))?|i(?:lla|ng)|ed?)|ili(?:dhs?|ngs?)|tacean|ylon)|y(?:lind(?:rical(?:ly)?|ers?)|b(?:er(?:netics?|space|punk)|org)|to(?:genetic|log(?:ical|y)|plasm(?:ic)?|chrome|toxic|sine)|c(?:l(?:o(?:trons?|nes?|ps|id)|i(?:c(?:al(?:ly)?)?|sts?|ng)|e(?:(?:ways?|s|d))?)|ads?)|nic(?:(?:al(?:ly)?|ism|s))?|p(?:r(?:ess(?:es)?|i(?:ans?|ots?)|us)|hers?)|an(?:(?:ogen|ide))?|st(?:(?:eine|i(?:tis|ne|c)|s))?|mbals?|gnets?)|z(?:echs?|ars?))|h(?:y(?:p(?:e(?:r(?:c(?:holesterolaemia|ubes?)|s(?:ensitiv(?:e(?:ness)?|ity)|p(?:here|ace)|onic)|ventilat(?:i(?:on|ng)|ed)|inflation|activ(?:ity|e)|t(?:e(?:nsion|xt)|onic)|markets?|bol(?:oids?|as?|ic|e)|planes?|fine))?|o(?:c(?:hondria(?:c(?:(?:al|s))?)?|ri(?:t(?:ical(?:ly)?|es?)|s(?:ies|y)))|t(?:h(?:e(?:tical(?:ly)?|s(?:is(?:(?:ing|e(?:[srd])?))?|es)|rmia)|alamus)|ension)|glycaemi[ca]|dermic|xia)|no(?:t(?:herap(?:ists|y)|i(?:c(?:ally)?|s(?:ing|e(?:[ds])?|m|t)))|sis)|hen(?:(?:at(?:i(?:ons?|ng)|e(?:[ds])?)|ed|s))?)|dr(?:o(?:(?:electric(?:ity)?|p(?:onically|hobi[ca])|m(?:echanics|agnetic)|l(?:og(?:i(?:cal(?:ly)?|sts)|y)|ysis)|dynamic(?:(?:al|s))?|g(?:en(?:at(?:ion|ed))?|raph(?:ic|er))|c(?:hlori(?:de|c)|arbons?)|thermal|s(?:tatics?|phere)|f(?:luoric|oils?)|xides?|us))?|a(?:(?:ulic(?:(?:ally|s))?|n(?:geas?|ts?)|t(?:ion|ed?)|zine))?|ide)|brid(?:(?:is(?:ation|ed)|s))?|s(?:ter(?:i(?:c(?:(?:al(?:ly)?|s))?|a)|e(?:ctomy|sis))|sop)|g(?:ien(?:i(?:c(?:ally)?|sts?)|e)|roscopic)|a(?:cinths?|enas?)|m(?:n(?:(?:book|al|s))?|ens?)|enas?)|i(?:s(?:(?:t(?:o(?:r(?:i(?:ograph(?:ical|y)|c(?:(?:al(?:ly)?|ist))?|ans?|es)|y)|log(?:i(?:cal(?:ly)?|sts)|y)|grams?)|rionics?|amine)|panic|s(?:(?:ings?|e[sd]))?))?|g(?:gledypiggledy|h(?:(?:h(?:andedness|eeled)|s(?:pirited)?|l(?:ight(?:(?:ing|e[rd]|s))?|and(?:(?:ers?|s))?|y)|ranking|p(?:itched|oint)|way(?:(?:m(?:an|en)|s))?|brow|jack|ness|ish|e(?:st|r)|t))?)|er(?:a(?:rch(?:(?:i(?:c(?:al(?:ly)?)?|es)|y))?|tic)|oglyph(?:(?:ics?|s))?)|p(?:(?:p(?:o(?:(?:potamus|campus|drome))?|ies?|y)|s(?:ters?)?|bone))?|n(?:d(?:(?:quarters|rances?|brain|er(?:(?:ing|e[dr]|s))?|sight|most|u(?:ism)?))?|t(?:(?:e(?:rlands?|d)|ing|s))?|n(?:ies|y)|ge(?:[sd])?)|t(?:(?:ch(?:(?:hik(?:ing|e(?:(?:rs?|d))?)|ing|e[srd]))?|andrun|her(?:to)?|t(?:able|ing|ers)|ler|s))?|r(?:sute(?:ness)?|e(?:(?:ling|d|r|s))?|ings?)|l(?:l(?:(?:walking|s(?:ides?)?|ie(?:st|r)|ock(?:[sy])?|tops?|man|ed|y))?|ari(?:ous(?:ly)?|ty)|ts?)|d(?:(?:e(?:(?:ou(?:s(?:(?:ness|ly))?|ts?)|a(?:ndseek|ways?)|bound|r|s))?|ings?|den))?|b(?:erna(?:t(?:i(?:on|ng)|e)|l)|iscus)|jack(?:(?:ings?|e(?:rs?|d)|s))?|atus(?:es)?|c(?:(?:c(?:ough|ups?)|kory))?|m(?:self)?|v(?:ing|e(?:[ds])?)|k(?:ing|e(?:(?:rs?|d|s))?))|u(?:n(?:t(?:(?:e(?:r(?:(?:gatherers?|s))?|d)|s(?:m(?:an|en))?|ing))?|dred(?:(?:weights?|fold|ths?|s))?|ch(?:(?:back(?:ed)?|ing|e[sd]))?|g(?:(?:er(?:(?:ing|ed|s))?|r(?:i(?:e(?:st|r)|ly)|y)|ary))?|k(?:(?:ers|s))?)|m(?:(?:an(?:(?:i(?:t(?:arian(?:ism)?|ies|y)|s(?:ing|t(?:(?:ic|s))?|ed?|m))|ness|oids?|kind|e(?:(?:ly|r))?|ly|s))?|i(?:li(?:at(?:i(?:ng(?:ly)?|ons?)|e(?:[ds])?)|ty)|d(?:i(?:fiers?|ty))?|fy)|m(?:ing(?:birds?)?|able|ock(?:[sy])?|e[rd])|b(?:l(?:e(?:(?:ness|st?|r|d))?|ing|y)|ugs?)|o(?:r(?:ous(?:ly)?|ist)|ur(?:(?:less|ing|ed|s))?)|p(?:(?:back|ing|ed|s))?|erus|drum|us|s))?|ckleberry|l(?:l(?:(?:abaloo|ed|o|s))?|k(?:(?:ing|s))?)|r(?:l(?:(?:yburly|ing|ed|s))?|r(?:i(?:canes?|e(?:d(?:ly)?|s))|y(?:ing)?|a(?:hs?|y))|dle(?:(?:rs?|s|d))?|t(?:(?:l(?:ing|e(?:[sd])?)|ing|ful|s))?)|s(?:band(?:(?:m(?:an|en)|ry|s))?|h(?:(?:hush|ing|e[sd]))?|k(?:(?:i(?:e(?:st?|r)|ly)|ed|s|y))?|t(?:ings|l(?:e(?:(?:rs?|s|d))?|ing))|s(?:ies|y))|b(?:(?:ris(?:tic)?|caps?|b(?:ies|ub|y)|s))?|ddl(?:ing|e(?:[sd])?)|g(?:(?:e(?:(?:ness|ly))?|uenot|g(?:ing|ed)|s))?|t(?:(?:ch(?:es)?|s))?|ff(?:(?:i(?:ng|ly)|ed|y))?|es?|h)|o(?:s(?:pi(?:ta(?:l(?:(?:i(?:s(?:ation|ed)|ty)|s))?|bl[ey])|ces?)|t(?:(?:i(?:l(?:it(?:ies|y)|e(?:ly)?)|ng)|e(?:l(?:(?:r(?:ies|y)|s))?|ss(?:es)?|d)|a(?:ges?)?|ler|s))?|annas?|e(?:(?:pipe|d|s))?|i(?:ery?|ng))|r(?:ticultur(?:ists?|al|e)|r(?:or(?:s(?:tricken)?)?|i(?:f(?:y(?:ing(?:ly)?)?|i(?:c(?:ally)?|e[ds]))|bl[ey]|d(?:ly)?)|endous(?:ly)?)|s(?:e(?:(?:whip(?:ped)?|radish|fl(?:esh|y)|p(?:ower|lay)|s(?:hoes?)?|b(?:ack|ox)|hair|less|m(?:an|en)|y))?|ing)|izon(?:(?:tal(?:(?:ly|s))?|s))?|mon(?:al(?:ly)?|es?)|oscopes?|n(?:(?:b(?:ills|eam)|pipes?|e(?:ts?|d)|s|y))?|des?)|m(?:o(?:gen(?:is(?:ation|ing|ed?)|e(?:ous(?:ly)?|ity)|ates)|sexual(?:(?:ity|ly|s))?|morphisms?|eopath(?:ic|y)|log(?:i(?:cal|es)|ous|ues?|y)|pho(?:b(?:es|i[ac])|n(?:es|y))|zygous|nyms?|topy)|e(?:(?:w(?:ard(?:(?:bound|s))?|ork)|s(?:(?:ick(?:ness)?|teads?|pun))?|l(?:ess(?:ness)?|i(?:ness|er)|ands?|y)|comings?|owners?|made|d))?|unculus|i(?:cid(?:al|es?)|l(?:ies|y)|n(?:ids?|g)|est)|ages?|bre|y)|u(?:s(?:e(?:(?:b(?:u(?:ild(?:ing|ers?)|yers)|reak(?:ing|ers?)|o(?:ats?|und))|keep(?:ing|ers?)|h(?:unting|old(?:(?:ers?|s))?)|f(?:lies|ul)|maids?|w(?:i(?:ves|fe)|ork)|room|s|d))?|ings?|ton)|r(?:(?:glass|ly|s))?|nd(?:(?:ing|ed|s))?)|l(?:i(?:day(?:(?:makers?|ing|s))?|s(?:tic(?:ally)?|m)|n(?:ess|g)|e(?:st?|r)|ly)|o(?:gra(?:ph(?:ic|y)|ms?)|causts?)|l(?:ow(?:(?:ness|ed|ly|s))?|y(?:hocks)?|er(?:ed)?|ies|and)|e(?:(?:inone|d|s))?|d(?:(?:a(?:ble|lls?)|ings?|ups?|out|ers?|s))?|sters?|mes|y)|p(?:(?:e(?:(?:less(?:(?:ness|ly))?|ful(?:(?:ness|ly|s))?|d|s))?|p(?:ing|e(?:rs?|d))|ing|s))?|n(?:e(?:(?:y(?:(?:suckles?|moon(?:(?:ers|s))?|comb(?:(?:ing|ed))?|bee|dew|ed))?|s(?:t(?:(?:ly|y))?)?|d))?|o(?:r(?:ar(?:ium|y)|ific|s)|ur(?:(?:abl[ey]|ing|ed|s))?)|k(?:(?:ing|s))?|shu|ing)|t(?:(?:t(?:e(?:mpered|st|r)|ing)|b(?:looded|eds?)|chpotch|el(?:(?:iers?|s))?|h(?:ead(?:ed|s)|ouses?)|p(?:lates?|ot)|spots?|ness|l(?:ine|y)|dogs?|rod|air))?|o(?:ligan(?:(?:ism|s))?|d(?:(?:wink(?:(?:ing|ed))?|lums?|ed|s))?|k(?:(?:nosed|ing|e(?:rs?|d)|ah|s|y))?|ve(?:r(?:(?:ing|ed))?|s)|t(?:(?:ing|e(?:rs?|d)|s))?|ray|p(?:(?:ed|s))?|fs?)|a(?:r(?:(?:se(?:(?:ness|ly|r))?|d(?:(?:ings?|e(?:rs?|d)|s))?|frost|y))?|x(?:(?:ing|e(?:rs?|s|d)))?)|b(?:(?:goblins?|b(?:y(?:ists?)?|l(?:ing|e(?:[sd])?)|i(?:es|t))|nail(?:ed|s)|s|o))?|c(?:us(?:pocus)?|k(?:(?:ey|s))?)|ve(?:(?:r(?:(?:craft|ing|e[rd]|s))?|ls?))?|w(?:(?:itzers?|soever|l(?:(?:ings?|e(?:rs?|d)|s))?|ever|dy))?|ist(?:(?:ing|ed|s))?|g(?:(?:wash|g(?:(?:ing|e[rd]|s))?|s))?|e(?:(?:ing|s|d))?|d)|e(?:tero(?:sex(?:ual(?:(?:ity|ly|s))?|ist)|gene(?:ous|ity)|zygous|logous|doxy?)|r(?:(?:m(?:(?:aphrodit(?:ic|es?)|e(?:tic(?:ally)?|neutics?)|it(?:(?:age|s))?))?|it(?:a(?:b(?:ility|le)|ge)|ors)|ring(?:(?:bone|s))?|e(?:(?:in(?:after)?|a(?:bouts|fter)|dit(?:ary|y)|t(?:o(?:fore)?|ic(?:(?:al|s))?)|u(?:nder|pon)|s(?:ies|y)|with|of|by))?|b(?:(?:i(?:vor(?:ous|es?)|cides?)|a(?:ceous|l(?:is(?:ts?|m))?|ge)|s))?|o(?:(?:i(?:c(?:(?:al(?:ly)?|s))?|n(?:es?)?|sm)|n(?:(?:ry|s))?|d))?|ald(?:(?:i(?:ng|c)|ed|ry|s))?|d(?:(?:s(?:m(?:an|en))?|ing|ed))?|s(?:elf)?|nias?|pes|tz))?|a(?:r(?:(?:t(?:(?:s(?:(?:earching|trings))?|l(?:ess(?:(?:ness|ly))?|ands?)|b(?:r(?:eak(?:(?:ing|s))?|oken)|eats?|urn)|w(?:arming|ood)|toheart|rending|en(?:(?:ing|ed))?|i(?:ness|est?|ly)|ache|felt|h(?:(?:rug|s))?|y))?|ken(?:(?:ing|ed|s))?|able|ings?|s(?:(?:es?|ay))?|ers?|d))?|d(?:(?:m(?:istress(?:es)?|a(?:ster(?:s(?:hip)?)?|n)|en)|quarters|s(?:(?:car(?:ves|f)|t(?:o(?:nes?|ck)|rong|and)|ets?|hip))?|hunte(?:rs|d)|dress(?:es)?|b(?:oards?|ands?)|l(?:i(?:ghts?|n(?:ing|e(?:[ds])?))|a(?:mps?|nds?)|ess|o(?:ck|ng))|p(?:hones?|iece)|w(?:a(?:ters|y)|inds?|or(?:ds?|k))|aches?|count|fast|gear|i(?:e(?:st|r)|ngs?)|note|r(?:est|oom)|e(?:rs?|d)|on|y))?|t(?:(?:resistant|h(?:(?:e(?:n(?:(?:is[hm]|s))?|r(?:[sy])?)|land|s))?|e(?:d(?:ly)?|rs?)|wave|ing|s))?|v(?:y(?:(?:weights?|duty))?|e(?:(?:n(?:(?:wards?|s(?:ent)?|ly))?|ho|s|d))?|i(?:n(?:ess|gs?)|e(?:st?|r)|ly))|l(?:(?:th(?:(?:i(?:ness|e(?:st|r)|ly)|ful|y|s))?|ing|e(?:rs?|d)|s))?|p(?:(?:ing|ed|s))?)|uristic(?:(?:ally|s))?|m(?:(?:ispher(?:ic(?:al)?|es?)|l(?:ines?|ock)|m(?:ing|ed)|an|en|s|p))?|l(?:terskelter|p(?:(?:l(?:ess(?:(?:ness|ly))?|ines?)|ful(?:(?:ness|ly))?|mates?|ings?|e(?:rs?|d)|s))?|i(?:o(?:centric|sphere|graphy|trope)|c(?:opters?|es|al)|x(?:es)?|pad|um)|l(?:(?:raiser|ish(?:ly)?|enic|fire|o|s))?|m(?:(?:et(?:(?:ed|s))?|s(?:man)?))?|sinki|ots|en|d)|sita(?:t(?:i(?:ng(?:ly)?|ons?)|e(?:[ds])?)|n(?:t(?:ly)?|cy))|n(?:(?:c(?:e(?:for(?:ward|th))?|hm(?:an|en))|peck|ge|na|ry|s))?|e(?:d(?:(?:less(?:(?:ness|ly))?|ing|ful|ed|s))?|l(?:(?:ed|s))?)|x(?:(?:a(?:decimal|g(?:on(?:(?:al|s))?|rams?)|meter|ne)|ed))?|i(?:ght(?:(?:en(?:(?:ing|ed|s))?|s))?|r(?:(?:ess(?:es)?|looms?|s))?|nous|fers?|sts?)|c(?:t(?:o(?:litres|r(?:ing)?)|ic(?:ally)?|ares?)|k(?:l(?:e(?:(?:rs?|s|d))?|ing))?)|d(?:onis(?:t(?:(?:ic|s))?|m)|g(?:e(?:(?:hogs?|rows?|s|d))?|ing))|p(?:ta(?:gon(?:(?:al|s))?|ne)|ati(?:tis|c))|gemon(?:ic|y)|y(?:days?)?|ft(?:(?:i(?:ng|er)|ed|y))?|brews?|w(?:(?:ing|e[dr]|n))?)|a(?:r(?:d(?:(?:h(?:ea(?:rted(?:ness)?|ded)|it(?:ting)?)|w(?:o(?:rking|ods?)|are)|pressed|b(?:o(?:iled|ard)|acks?)|e(?:arned|n(?:(?:e(?:rs?|d)|ing|s))?|st|r)|l(?:ine(?:rs?)?|y)|i(?:ness|e(?:st|r)|ly)|ships?|core|ness|up|y))?|m(?:(?:on(?:i(?:s(?:ation|ing|ed?)|ous(?:ly)?|c(?:(?:a(?:lly)?|s))?|es|um)|y)|less(?:(?:ness|ly))?|ful(?:(?:ness|ly))?|ing|e[rd]|s))?|p(?:(?:s(?:ichords?)?|i(?:sts?|ng)|oons?|ed))?|e(?:(?:b(?:rained|ells?)|ms?|d|s))?|a(?:ngu(?:ing|e(?:[ds])?)|ss(?:(?:ment|e(?:rs|d|s)|ing))?|re)|b(?:ingers?|our(?:(?:ing|ed|s))?)|l(?:equins?|ots?)|ness(?:(?:ing|e[ds]))?|v(?:est(?:(?:e(?:rs?|d)|ing|s))?|ard)|r(?:ow(?:(?:ing|ed|s))?|i(?:dan|e(?:rs?|d))|y(?:ing)?)|sh(?:(?:ness|e(?:ns?|st|r)|ly))?|k(?:(?:e(?:n(?:(?:ed|s))?|d)|ing|s))?|ts?)|l(?:f(?:(?:h(?:earted(?:(?:ness|ly))?|our(?:(?:ly|s))?)|truths?|sister|way))?|l(?:(?:ucinat(?:i(?:ons?|ng)|ory|ed?)|elujah|marks?|o(?:w(?:(?:ed|s))?)?|ways?|s))?|o(?:(?:gen(?:(?:ated|s))?|ns?|ed))?|i(?:t(?:osis|e)|fax|but)|t(?:(?:ing(?:ly)?|e(?:r(?:(?:ed|s))?|d)|s))?|v(?:ing|e(?:[sd])?)|e)|em(?:at(?:o(?:log(?:i(?:cal|st)|y)|ma)|uria)|o(?:philia(?:cs?)?|rrh(?:ag(?:i(?:ng|c)|es?)|oids?)|globin|lytic))|n(?:d(?:(?:kerchiefs?|s(?:(?:ome(?:(?:ness|ly|st|r))?|hak(?:ing|es?)|tands?|ets?))?|i(?:c(?:ap(?:(?:p(?:ing|ed)|s))?|rafts?)|work|e(?:st|r)|ng|ly)|writ(?:ten|ing)|ma(?:idens?|de)|c(?:uff(?:(?:ing|ed|s))?|art?)|b(?:rakes?|a(?:sin|gs?|ll)|ills?|ooks?|ell)|e(?:d(?:ness)?|l)|l(?:e(?:(?:bars?|rs?|s|d))?|ing)|picked|holds?|o(?:vers?|uts?)|rails?|fuls?|guns?|y(?:m(?:an|en))?))?|g(?:(?:glid(?:ing|e(?:(?:rs?|d|s))?)|o(?:vers?|uts)|ings?|m(?:en|an)|e(?:rs?|d)|dog|ars?|up|s))?|k(?:er(?:(?:ing|ed|s))?|ies?)|s(?:ard|om)|o(?:ver|i))|i(?:r(?:(?:s(?:(?:p(?:litting|rays?)|tyl(?:ing|es?)))?|d(?:ress(?:ers?|ing)|o)|raising|brush|i(?:ness|e(?:st|r))|pi(?:ece|ns?)|c(?:are|uts?)|l(?:ess|ine)|net|ed|y))?|l(?:(?:s(?:to(?:rms?|nes?))?|ing|ed))?|ti(?:an)?|ku)|p(?:p(?:y(?:golucky)?|en(?:(?:ings?|ed|s))?|i(?:ness|e(?:st|r)|ly))|hazard(?:ly)?|less)|b(?:erdasher(?:[sy])?|it(?:(?:a(?:b(?:ility|le)|t(?:(?:ions?|s))?)|forming|ua(?:t(?:ion|ed?)|l(?:ly)?)|s))?)|u(?:ght(?:i(?:ness|e(?:st|r)|ly)|y)|n(?:t(?:(?:ing(?:ly)?|ed|s))?|ch(?:es)?)|l(?:(?:ages?|i(?:ers?|ng)|e(?:rs?|d)|ms|s))?|teur)|g(?:(?:g(?:ard(?:ness)?|l(?:ing|e(?:[rd])?)|is)|iography|s))?|m(?:(?:burg(?:ers?)?|m(?:er(?:(?:head|ing|ed|s))?|ocks?)|s(?:t(?:r(?:ings?|ung)|ers?))?|per(?:(?:ing|ed|s))?|lets?|itic))?|t(?:(?:ch(?:(?:backs?|e(?:r(?:ies|y)|ts?|s|d)|ing|way))?|e(?:(?:ful(?:ly)?|rs?|d|s))?|s(?:tands)?|t(?:ricks?|e(?:rs?|d))|r(?:acks?|eds?)|less|ing|ful))?|c(?:k(?:(?:ney(?:ed)?|able|l(?:ing|es?)|s(?:aw)?|ing|e(?:rs?|d)))?|ienda)|s(?:(?:t(?:e(?:(?:n(?:(?:ing|ed|s))?|s|d))?|i(?:ness|e(?:st|r)|ly)|y)|beens?|h(?:(?:i(?:sh|ng)|e[sd]))?|sle|nt|p))?|v(?:e(?:(?:r(?:sack|ing)|n(?:(?:ots|t|s))?|s))?|ing|ana|oc)|w(?:thorns?|aii(?:an)?|sers?|k(?:(?:i(?:sh|ng)|e(?:rs?|d)|s))?)|y(?:(?:stacks?|f(?:ever|ield)|w(?:ire|ain)|loft|dn))?|z(?:ard(?:(?:ing|ous|ed|s))?|e(?:l(?:nuts?)?)?|i(?:ness|e(?:st|r)|ly)|y)|d(?:(?:docks?|rons?|es|nt))?|fts?|kea?|ha)|mm)|m(?:a(?:g(?:(?:n(?:e(?:t(?:(?:o(?:(?:hydrodynamic(?:al|s)|dynamics|sphere|meters?))?|i(?:s(?:ation|ed?|m)|c(?:ally)?|te)|ron|s))?|si(?:um|a))|i(?:f(?:i(?:c(?:ations?|en(?:t(?:ly)?|ce))|e[drs])|y(?:ing)?)|loquent|tudes?)|a(?:nim(?:o(?:us(?:ly)?|sity)|ity)|tes?)|olias?|ums?)|i(?:(?:st(?:erial(?:ly)?|rates?)|c(?:(?:al(?:ly)?|ians?|s))?))?|azines?|ma(?:(?:tic|s))?|pies?|gots?|enta|s))?|t(?:(?:e(?:(?:r(?:(?:ial(?:(?:i(?:s(?:t(?:(?:ic(?:ally)?|s))?|ation|ing|e(?:[sd])?|m)|ty)|ly|s))?|n(?:al(?:ly)?|ity)))?|s|d))?|h(?:(?:ematic(?:ians?|al(?:ly)?|s)|s))?|r(?:i(?:mon(?:ial(?:ly)?|y)|c(?:ulat(?:i(?:on|ng)|ed?)|es)|arch(?:(?:ies|al|y))?|lineal|x(?:es)?)|on(?:(?:ly|s))?)|ur(?:ation(?:al)?|e(?:(?:ly|s|r|d))?|i(?:ng|ty))|t(?:(?:e(?:(?:r(?:(?:offact|ing|ed|s))?|d))?|ress(?:es)?|ing|hew))?|ch(?:(?:sticks?|mak(?:ing|er)|box(?:es)?|able|less|play|ing|e[srd]))?|adors?|in(?:ees?|gs?|s)|s))?|l(?:a(?:d(?:ministration|just(?:ment|ed)|aptive|roit|ies|y)|chite|thion|rial?|y(?:(?:s(?:ia)?|an))?|ise|wi)|n(?:ourish(?:ment|ed)|utrition)|f(?:unction(?:(?:ing|ed|s))?|orm(?:ations?|ed))|i(?:c(?:ious(?:(?:ness|ly))?|es?)|gn(?:(?:an(?:c(?:ies|y)|t(?:ly)?)|e(?:rs|d)|i(?:ng|ty)|s))?|nger(?:ing|ers))|t(?:(?:reat(?:(?:ment|ed))?|ing|e(?:se|d)|y|s|a))?|practices?|l(?:(?:e(?:ab(?:ility|le)|ts?)|ards?|ow|s))?|e(?:(?:volen(?:t(?:ly)?|ce)|fact(?:ions?|ors?)|ness|s))?|contents?|odorous|dives|va)|s(?:(?:o(?:chis(?:t(?:(?:ic(?:ally)?|s))?|m)|n(?:(?:ry|ic|s))?)|t(?:(?:e(?:r(?:(?:mind(?:(?:ing|ed))?|pieces?|works?|ful(?:ly)?|class|s(?:hip)?|ing|ed|ly|y))?|ctomy|d)|i(?:cati(?:on|ng)|tis|ff)|o(?:dons?|ids?)|head|s))?|s(?:(?:produc(?:ing|ed)|a(?:cr(?:ing|e(?:[ds])?)|g(?:ing|e(?:[drs])?))|e(?:u(?:ses?|rs?)|s|d)|i(?:ve(?:ly)?|ng|f)|less))?|que(?:(?:rad(?:ing|e(?:[sd])?)|s))?|c(?:ulin(?:ity|e)|ots?|ara)|k(?:(?:ing|ed|s))?|h(?:(?:ing|e[rd]))?|eru?))?|r(?:(?:g(?:in(?:(?:al(?:(?:i(?:s(?:ation|ing|e(?:[sd])?)|ty|a)|ly|s))?|s))?|a(?:rines?|te))|k(?:(?:e(?:t(?:(?:ab(?:ility|le)|place|e(?:ers?|d|r)|ing|s))?|d(?:ly)?|rs?)|s(?:m(?:an(?:ship)?|en))?|ings?|ups?))?|vel(?:(?:l(?:ous(?:ly)?|ing|ed)|s))?|s(?:(?:h(?:(?:mallows?|al(?:(?:l(?:ing|e[dr])|s))?|i(?:ness|e(?:st|r))|land|gas|es|y))?|upials?|ala))?|r(?:i(?:age(?:(?:able|s))?|ng|e[sd])|y(?:ing)?|ows?|ed)|t(?:(?:i(?:n(?:(?:gales?|et|s|i))?|a(?:ns?|l))|yr(?:(?:dom|ed|y|s))?|ens?))?|i(?:onettes?|golds?|juana|n(?:a(?:(?:ted?|de|s))?|e(?:(?:rs?|s))?)|t(?:ime|al)|a)|ch(?:(?:i(?:oness|ng)|e(?:rs?|s|d)))?|a(?:(?:thons?|ud(?:ers|ing)))?|m(?:alade|o(?:sets?|ts?))|oon(?:(?:ing|ed|s))?|qu(?:e(?:(?:try|es?|ss?))?|is)|x(?:is(?:ts?|m))?|zipan|ble(?:[sd])?|ls?|es?|y))?|n(?:(?:o(?:euvr(?:ab(?:ility|le)|ings?|e(?:[ds])?)|meter|r(?:(?:ial|s))?)|i(?:c(?:(?:depressive|ally|ured?))?|f(?:est(?:(?:ations?|ing|ed|ly|o|s))?|olds?)|pula(?:t(?:i(?:ons?|ve|ng)|ors?|e(?:[sd])?)|ble)|a(?:(?:c(?:(?:al(?:ly)?|s))?|s))?|kin|la)|u(?:factur(?:ing|e(?:(?:rs?|s|d))?)|scripts?|al(?:(?:ly|s))?|r(?:ing|e(?:[sd])?))|a(?:g(?:e(?:(?:ab(?:ility|le)|r(?:(?:ial(?:ly)?|ess(?:es)?|s(?:hip)?))?|ments?|s|d))?|ing)|cle(?:[ds])?|tee)|t(?:el(?:(?:pieces?|shelf))?|i(?:s(?:sas?)?|ds)|l(?:ing|e(?:[sd])?)|ra(?:(?:ps?|s))?)|s(?:laughter|e(?:rvant)?|i(?:ons?|zed))|n(?:e(?:r(?:(?:l(?:iness|y)|is(?:ms?|t)|ed|s))?|quins?|d)|ing|a)|h(?:andl(?:ing|ed?)|o(?:les?|od)|unts?)|d(?:ib(?:ular|les?)|a(?:rins?|t(?:ing|ory|e(?:[ds])?))|olins?|r(?:ake|ill?)|ela)|g(?:anese|roves?|l(?:ing|e(?:[srd])?)|e(?:rs?)?|o)|l(?:i(?:ness|est)|y)|ciple|e(?:(?:uver|s|d))?|fully|power|made|kind|y))?|i(?:n(?:(?:t(?:ain(?:(?:ab(?:ility|le)|ing|e(?:rs?|d)|s))?|enance)|frames?|s(?:(?:pring|t(?:ream|ays?)|ail))?|brace|l(?:and|ine|y)|e))?|d(?:(?:s(?:ervants?)?|en(?:(?:ly|s))?))?|sonettes?|l(?:(?:order|s(?:hots?)?|able|ings?|m(?:en|an)|box|e[rd]))?|m(?:(?:ings?|ed|s))?|zes?)|c(?:(?:ro(?:(?:scopic(?:ally)?|molecul(?:es|ar)|economics?|phages?|biotic|cosm|n))?|k(?:intosh(?:es)?|erel)|h(?:i(?:n(?:ations?|e(?:(?:guns?|ry|d|s))?|ists?)|smo)|etes?|o)|intosh(?:es)?|a(?:ro(?:ons?|ni)|ques?|bre|ws?)|es?))?|j(?:est(?:i(?:c(?:ally)?|es)|y)|o(?:r(?:(?:ettes?|it(?:ies|y)|s))?|lica))|d(?:(?:e(?:(?:moiselle|ira))?|de(?:n(?:(?:ing(?:ly)?|ed|s))?|st|r)|r(?:i(?:gals?|d)|as)|house|woman|ness|m(?:en|an)|cap|am(?:[se])?|ly))?|xi(?:m(?:(?:is(?:ation|ing|e(?:[drs])?)|a(?:l(?:(?:ity|ly))?)?|um|s))?)?|w(?:kish(?:ness)?)?|k(?:e(?:(?:weight|s(?:hift)?|over|up|rs?))?|ings?)|u(?:soleums?|l(?:(?:ing|e(?:rs?|d)|s))?|dlin|mau|ve)|y(?:(?:o(?:nnaise|r(?:(?:al(?:ty)?|ess|s))?)|fl(?:ower|ies|y)|pole|days?|h(?:em|ap)|be|as?))?|e(?:lstrom|stro)|m(?:m(?:a(?:l(?:(?:ian?|s))?|ry)|oths?|y)|bas?|as?)|quettes|vericks?|h(?:ogany|atma)|p(?:(?:p(?:able|ings?|e(?:rs?|d))|uto|les?|s))?|z(?:urka|ie(?:st|r)|es?|y)|o(?:is(?:ts?|m)|ri)|fi(?:osi|a))|i(?:s(?:r(?:e(?:present(?:(?:ations?|ing|ed|s))?|member(?:(?:ing|ed))?|ad(?:ing)?)|ule)|i(?:n(?:terpret(?:(?:ations?|ing|ed|s))?|form(?:(?:ation|ed))?)|dentification)|u(?:nderst(?:and(?:(?:ings?|s))?|ood)|s(?:ing|e(?:[srd])?))|p(?:r(?:on(?:unciations?|ounc(?:ing|ed))|int(?:(?:ing|ed|s))?)|ositioned|lac(?:e(?:(?:ment|d|s))?|ing))|c(?:o(?:n(?:figuration|ce(?:ptions?|ived)|strued|duct)|mprehended|unt(?:(?:ing|ed))?|pying)|a(?:lculat(?:ions?|ed?)|rr(?:i(?:ages?|ed)|y(?:ing)?)|st(?:ing)?)|h(?:ie(?:f(?:mak(?:ing|ers))?|vous(?:ly)?)|ance)|lassified|e(?:llan(?:e(?:ous|a)|ies|y)|genation)|reants?|ible|ues?)|a(?:pp(?:r(?:opriat(?:ion|ed)|ehensions?)|l(?:ication|y))|n(?:throp(?:i(?:sts|c)|es?|y)|alysed)|lign(?:ment|ed)|dventure)|t(?:(?:r(?:anslat(?:i(?:ons?|ng)|e[sd])|ust(?:(?:ful(?:ly)?|ing|ed|s))?|e(?:at(?:(?:ment|ing|ed))?|ss(?:es)?))|ak(?:e(?:(?:n(?:ly)?|s))?|ing)|y(?:p(?:ings?|e(?:[ds])?))?|i(?:n(?:ess|g)|e(?:st|r)|med?|ly)|letoe|ook|e(?:rs?|d)|s))?|ma(?:nage(?:(?:ment|d))?|tch(?:(?:ing|e[ds]))?)|judg(?:e(?:(?:ments?|d))?|ment|ing)|g(?:overnment|uide(?:d(?:ly)?)?|iv(?:ings?|e))|d(?:i(?:rect(?:(?:i(?:ons?|ng)|ed))?|agnosis)|e(?:meanours?|al(?:ing)?|eds?)|oing|ate)|s(?:(?:t(?:atement|eps)|pe(?:l(?:l(?:(?:ings?|ed|s))?|t)|n[dt])|i(?:on(?:(?:ar(?:ies|y)|s))?|les?|ves?|ng)|hapen|ouri|us(?:es)?|als?|e[sd]|y))?|quot(?:ation|ing|e(?:[ds])?)|ogyn(?:ist(?:(?:ic|s))?|y)|l(?:e(?:ad(?:(?:ing(?:ly)?|s))?|d)|a(?:belled|id|y))|be(?:hav(?:i(?:our|ng)|e(?:[ds])?)|gotten)|h(?:a(?:ndl(?:ing|e(?:[ds])?)|ps?)|ear(?:(?:ing|d|s))?|itting)|f(?:ortunes?|i(?:eld|led|re(?:[ds])?|ts?))|er(?:(?:l(?:iness|y)|abl[ey]|ies|y|s))?|n(?:omers?|amed?))|c(?:ro(?:(?:hydrodynamics|d(?:ensitometer|ot)|electronics?|s(?:cop(?:i(?:c(?:ally)?|st)|es?|y)|urgery|econds?)|p(?:ro(?:cessors?|gram)|hones?)|b(?:i(?:olog(?:i(?:sts?|cal)|y)|al|c)|es?)|organisms?|c(?:o(?:mputers?|sm(?:ic)?|de)|hips?)|wave(?:(?:able|d|s))?|analyses|gra(?:vity|m(?:mes|s)|phs?)|f(?:i(?:lm(?:ing)?|che)|arad)|met(?:res|ers?)|light|ns?))?|turition|e(?:lles)?|higan|a)|n(?:i(?:(?:atur(?:is(?:ation|ing|e(?:[sd])?|t)|es?)|s(?:t(?:r(?:ations?|ies|y)|er(?:(?:i(?:al(?:ly)?|ng)|ed|s))?)|kirt)|c(?:omputers?|ab)|m(?:(?:is(?:ation|ing|e(?:[drs])?)|a(?:l(?:(?:i(?:s(?:t(?:(?:ic|s))?|m)|ty)|ly))?)?|um))?|b(?:us(?:es)?|ar)|ons?|ngs?|fy))?|e(?:(?:r(?:(?:al(?:(?:is(?:ation|ed)|og(?:ical|y)|s))?|s))?|s(?:(?:weepers?|trone|haft))?|d(?:etector)?|workers|fields?))?|d(?:(?:boggling(?:ly)?|less(?:(?:ness|ly))?|e(?:d(?:ness)?|rs?)|reader|s(?:et)?|ing|ful))?|or(?:(?:it(?:ies|y)|s))?|u(?:t(?:e(?:(?:ness|ly|st?|d))?|iae)|s(?:(?:cule|es))?|ets?)|c(?:e(?:(?:meat|rs?|s|d))?|ing)|st(?:rels?|er)|arets?|gl(?:ing|e(?:[sd])?)|t(?:(?:i(?:e(?:st|r)|ng)|ed|y|s))?|nows?|x(?:es)?|k(?:[se])?)|d(?:(?:d(?:l(?:e(?:(?:oftheroad|weight|s(?:ized)?|class|aged?|m(?:an|en)))?|ing)|ays?|en)|a(?:fternoon|ir|s)|f(?:ield(?:ers?)?|light)|evening|mo(?:rning|st)|s(?:hip(?:(?:man|s))?|t(?:ream)?|ummer)|nights?|w(?:i(?:cket|fe(?:ry)?|nter|ves)|eek|ay)|l(?:ands?|i(?:ne|fe))|ri(?:ff|bs)|ge(?:(?:ts?|s))?|i))?|r(?:a(?:c(?:ulous(?:(?:ness|ly))?|les?)|ges?)|th(?:(?:less(?:ly)?|ful))?|ror(?:(?:ing|ed|s))?|e(?:[sd])?)|l(?:l(?:(?:e(?:n(?:arian(?:ism)?|ni(?:al?|um))|rs?|t|d)|i(?:seconds?|on(?:(?:aires?|ths?|s))?|metres?|litres|grams?|pedes?|bars|n(?:er(?:[sy])?|g))|s(?:tones?)?|pond))?|i(?:t(?:a(?:r(?:i(?:s(?:ation|t(?:ic)?|ed|m)|ly)|y)|n(?:t(?:(?:ly|s))?|cy)|t(?:ing|e(?:[ds])?))|ia(?:(?:m(?:an|en)|s))?)|eu(?:[xs])?)|d(?:(?:mannered|e(?:w(?:(?:ed|y|s))?|st|r)|ness|ly))?|e(?:(?:s(?:tones?)?|posts?|ages?|r))?|k(?:(?:s(?:hakes?)?|m(?:a(?:ids?|n)|en)|i(?:e(?:st|r)|ng)|y(?:way)?|e(?:rs?|d)))?|ord|a(?:dy|n)|t)|t(?:o(?:chondrial?|sis)|igat(?:i(?:ng|on)|ory|e(?:[ds])?)|t(?:(?:ens?|s))?|re(?:[sd])?|es?)|m(?:e(?:(?:ographed|tic|s|d))?|i(?:c(?:(?:k(?:ing|e[dr])|ry|s))?|ng)|osa)|g(?:ra(?:t(?:i(?:ons?|ng)|ory|e(?:[ds])?)|ines?|nts?)|ht(?:(?:i(?:e(?:st|r)|ly)|y|s))?)|x(?:(?:tures?|able|ups?|ing|e(?:rs?|s|d)))?|osis|a(?:sma|mi)|kes?|en)|e(?:t(?:(?:h(?:od(?:(?:olog(?:i(?:cal(?:ly)?|es)|y)|ical(?:ly)?|s))?|ionine|yl(?:(?:ated|ene))?|a(?:done|n(?:ol|e)))|e(?:or(?:(?:olog(?:i(?:sts?|cal)|y)|i(?:t(?:es?|ic)|c)|s))?|mpsychosis|r(?:(?:ing|ed|s))?|d)|a(?:ph(?:ysic(?:al(?:ly)?|s)|or(?:(?:ic(?:al(?:ly)?)?|s))?)|l(?:(?:inguistic|l(?:urg(?:i(?:cal|st)|y)|i(?:sed|c)|ed)|work(?:ing)?|anguage|s))?|sta(?:b(?:ility|le)|s(?:es|is)|tic)|morph(?:os(?:is|e(?:[sd])?)|i(?:sm|c))|boli(?:c(?:ally)?|s(?:ms?|e(?:[sd])?))|tarsal)|r(?:o(?:(?:poli(?:tan|s(?:es)?)|nom(?:es?|ic)))?|ic(?:(?:a(?:tion|l(?:ly)?)|s))?|es?)|i(?:culous(?:ly)?|er)|onym(?:ic|y)|tle))?|l(?:o(?:d(?:rama(?:(?:tic(?:ally)?|s))?|i(?:ous(?:ly)?|c(?:ally)?|es)|y)|ns?)|l(?:ifluous(?:(?:ness|ly))?|ow(?:(?:ing|e[dr]|s))?)|a(?:n(?:chol(?:i(?:es|c|a)|y)|omas?|in|ge)|tonin)|t(?:(?:down|ing|e[rd]|s))?|ee|d)|r(?:c(?:han(?:t(?:(?:ab(?:ility|le)|m(?:en|an)|s))?|dis(?:ing|e))|i(?:less(?:ly)?|ful(?:ly)?|es)|enar(?:ies|y)|antile|ur(?:i(?:al|c)|y)|y)|r(?:y(?:(?:gorounds?|making))?|i(?:ment|e(?:st|r)|ly))|i(?:t(?:(?:o(?:cra(?:t(?:ic|s)|cy)|rious)|ing|ed|s))?|di(?:onal|ans?)|n(?:gues?|o))|e(?:(?:tricious|st|ly))?|omorphic|m(?:a(?:ids?|n)|en)|g(?:ing|e(?:(?:rs?|s|d))?))|c(?:hani(?:s(?:t(?:ic(?:ally)?)?|a(?:tion|ble)|ing|ed?|ms?)|c(?:(?:al(?:(?:ly|s))?|s))?)|ca)|a(?:n(?:(?:i(?:ng(?:(?:less(?:(?:ness|ly))?|ful(?:(?:ness|ly))?|s))?|es?)|der(?:(?:ings?|ed|s))?|while|ness|t(?:ime)?|e(?:st|r)|ly|y|s))?|s(?:ur(?:e(?:(?:ments?|less|d|s))?|abl[ey]|ing)|l(?:es|y))|d(?:ow(?:(?:land|s))?)?|gre(?:(?:ness|ly))?|l(?:(?:times?|ies?|y|s))?|t(?:(?:balls?|ie(?:st|r)|less|pie|axe|y|s))?)|ga(?:(?:l(?:omania(?:cs?)?|ith(?:ic)?)|joules|p(?:arsec|hone)|bytes?|hertz|watts?|star|tons?|volt))?|zz(?:osoprano|anine)|n(?:(?:s(?:trua(?:ti(?:on|ng)|l)|wear)|t(?:ion(?:(?:able|ing|ed|s))?|al(?:(?:i(?:t(?:ies|y)|stic)|ly))?|ors?|hol)|d(?:(?:e(?:l(?:evium)?|rs?|d)|aci(?:ous|ty)|i(?:cant|ng)|s))?|a(?:c(?:ing(?:ly)?|e(?:[sd])?)|gerie|rche)|i(?:ngitis|scus|al)|o(?:paus(?:al|e)|rah)|hirs?|folk|us?))?|m(?:o(?:(?:r(?:i(?:s(?:ation|ing|e(?:[ds])?)|als?|es)|a(?:nd(?:ums?|a)|b(?:ilia|l[ey]))|y)|irs?))?|b(?:er(?:s(?:hips?)?)?|ranes?)|phis|ento)|d(?:i(?:tat(?:i(?:ve(?:ly)?|ons?|ng)|e(?:[ds])?|or)|eval(?:ists?)?|um(?:s(?:ized)?)?|c(?:(?:a(?:t(?:ions?|ed?)|l(?:(?:ly|s))?)|in(?:al|es?)|s))?|ocr(?:ity|e)|a(?:(?:eval|t(?:i(?:ng|on)|or(?:[sy])?|e(?:[ds])?)|l(?:ly)?|ns?))?)|al(?:(?:li(?:ons?|sts?)|s))?|dl(?:e(?:(?:s(?:ome)?|rs?|d))?|ing)|u(?:lla|sa)|l(?:eys?|ar))|s(?:meri(?:s(?:ing|ed)|c)|o(?:lithic|sphere|zoic|ns?)|s(?:(?:e(?:ngers?|s|d)|ag(?:ing|es?)|i(?:n(?:ess|g)|e(?:st|r)|ly|ah)|y))?|caline|tizo|h(?:(?:ing|e[sd]))?)|e(?:k(?:(?:ness|e(?:st|r)|ly))?|t(?:(?:ings?|er|s))?)|xic(?:ans?|o)|io(?:tic|sis)|w(?:(?:ing|s))?|ows?)|u(?:l(?:ti(?:p(?:ro(?:gramming|cess(?:ors?|ing))|l(?:i(?:c(?:ati(?:ons?|ve)|it(?:ies|y))|e(?:rs?|d|s))|e(?:(?:x(?:(?:ors?|ing|e(?:rs?|s|d)))?|s))?|y(?:ing)?)|hase)|dimensional|c(?:ultural(?:ism)?|olour(?:ed)?|hannel)|l(?:a(?:teral(?:ism)?|yer)|ingual|evel)|f(?:unction(?:al)?|arious|orm)|nationals?|m(?:illion|e(?:dia|ter))|racial|tudes?)|berr(?:ies|y)|l(?:(?:i(?:on(?:ed|s)|ng)|ahs?|e[td]))?|ch(?:(?:ing|es))?|es?)|s(?:c(?:ul(?:oskeletal|a(?:ture|r(?:ity)?))|a(?:del|t)|l(?:ing|e(?:[sd])?))|i(?:c(?:(?:olog(?:ists?|y)|ian(?:s(?:hip)?)?|al(?:(?:ity|ly|s))?))?|ng(?:(?:ly|s))?)|h(?:(?:room(?:(?:ing|ed|s))?|es|y))?|k(?:(?:et(?:(?:eers?|s))?|ie(?:st|r)|y|s))?|t(?:(?:er(?:(?:ing|ed|s))?|i(?:ness|e(?:st|r)|ly)|a(?:che|ngs?|rd)|y|s))?|sels?|li(?:ms?|n)|e(?:(?:ums?|s|d))?)|n(?:i(?:c(?:ipal(?:it(?:ies|y))?|h)|ficen(?:t(?:ly)?|ce)|tions?)|dane(?:ly)?|ch(?:(?:e(?:rs?|s|d)|ing))?)|m(?:(?:m(?:i(?:f(?:i(?:cation|ed)|y)|es)|y)|b(?:ojumbo|l(?:ings?|e(?:[srd])?))|ps|s))?|t(?:i(?:lat(?:i(?:ons?|ng)|e(?:[ds])?)|n(?:ous(?:ly)?|eers?|ie[ds]|y|g))|a(?:b(?:ility|le)|t(?:i(?:on(?:(?:al|s))?|ng)|e(?:[sd])?)|gens|nts?)|t(?:(?:er(?:(?:ings?|e(?:rs?|d)|s))?|ons?|s))?|ual(?:(?:ity|ly))?|e(?:(?:ness|ly|s|d))?)|r(?:der(?:(?:ous(?:ly)?|e(?:rs?|ss|d)|ing|s))?|mur(?:(?:ings?|e[dr]|s))?|k(?:(?:i(?:ness|e(?:st|r))|y))?|ray|als?)|d(?:(?:guards?|d(?:ie(?:st?|r|d)|l(?:ing|e(?:[sd])?)|y(?:ing)?)|fl(?:ats|ows?)|larks|s))?|c(?:h(?:ness)?|k(?:(?:ing|ed|y|s))?|o(?:us|sa)|us)|f(?:f(?:(?:l(?:e(?:(?:rs?|d))?|ing)|ins?|ed|s))?|ti)|g(?:(?:g(?:i(?:ngs?|er)|e(?:rs?|d)|y)|s(?:hots)?))?|z(?:zl(?:ing|e(?:[sd])?)|ak)|esli|ons)|o(?:r(?:ph(?:(?:o(?:log(?:i(?:cal(?:ly)?|es)|y)|gene(?:tic|sis))|e(?:mes?|us)|i(?:sms?|ne|a)))?|t(?:(?:i(?:f(?:i(?:cation|ed)|y(?:ing)?)|ces?|ses?)|gag(?:e(?:(?:able|es?|d|s))?|ing|or)|a(?:l(?:(?:it(?:ies|y)|ly|s))?|rs?)|uary))?|ibund(?:(?:ity|ly))?|a(?:l(?:(?:i(?:s(?:ing|t(?:(?:ic|s))?|ed?|m)|t(?:ies|y))|ly|es?|s))?|torium|ines?|ss(?:es)?|ys?)|o(?:se(?:(?:ness|ly))?|cc(?:an|o)|n(?:(?:ic|s))?)|bid(?:(?:ity|ly))?|e(?:(?:over|s))?|n(?:(?:ings?|s))?|se(?:ls?)?|mons?|dant|row|gue)|u(?:n(?:t(?:(?:a(?:in(?:(?:eer(?:(?:ing|s))?|s(?:ides?)?|ous))?|ble)|i(?:ngs?|es?)|ed|s))?|d(?:(?:ed|s))?)|th(?:(?:wa(?:tering|sh)|tomouth|p(?:ieces?|arts)|organ|fuls?|ing|ed|s))?|rn(?:(?:ful(?:(?:ness|ly))?|e(?:rs?|d)|ing|s))?|l(?:d(?:(?:e(?:r(?:(?:ing|s))?|d)|i(?:e(?:st|r)|ngs?)|y|s))?|t(?:(?:ing|ed|s))?)|s(?:e(?:(?:traps?|like|y))?|tache(?:[ds])?|s(?:aka|es?)|y))|n(?:o(?:(?:p(?:ol(?:i(?:s(?:ation|t(?:(?:ic|s))?|ing|e(?:[sd])?)|es)|es?|y)|h(?:thongs|onic)|lane)|t(?:on(?:ic(?:(?:ally|ity))?|ous(?:ly)?|e|y)|heis(?:t(?:(?:ic|s))?|m))|s(?:yllab(?:les?|ic)|table)|m(?:olecular|ania|er(?:(?:ic|s))?|ials?)|c(?:hrom(?:atic|e)|ul(?:ture|ar)|l(?:onal|ed?)|ytes)|g(?:am(?:ous(?:ly)?|y)|ra(?:ph(?:(?:ic|s))?|m(?:med)?))|l(?:i(?:ngual|th(?:(?:ic|s))?)|ayers?|ogues?)|rail|xide))?|s(?:t(?:ro(?:sit(?:ies|y)|us(?:ly)?)|ers?)|ieur|oons?)|ument(?:(?:al(?:ly)?|s))?|e(?:y(?:(?:le(?:nders?|ss)|ed|s))?|tar(?:is(?:ts?|m)|y))|a(?:st(?:ic(?:ism)?|er(?:ies|y))|rch(?:(?:i(?:sts?|c(?:al)?|es)|s|y))?|lisa|ural|dic|co)|i(?:t(?:or(?:(?:ing|ed|s))?|ion)|es)|k(?:(?:ey(?:(?:ing|ed|s))?|fish|ish|s))?|t(?:h(?:(?:l(?:ies|y)|s))?|ages?|real)|g(?:o(?:ose|ls?)|rels?|ers?)|days?|roe)|d(?:(?:ul(?:a(?:r(?:i(?:s(?:ation|ing|ed?)|ty))?|t(?:i(?:ons?|ng)|e(?:[ds])?|or))|us|es?|i)|e(?:(?:r(?:n(?:(?:i(?:s(?:ations?|t(?:(?:ic|s))?|ing|ed?|m)|ty)|er))?|at(?:i(?:ons?|ng)|e(?:(?:ly|d|s))?|ors?))|l(?:(?:l(?:e(?:rs?|d)|ing)|s))?|s(?:t(?:(?:ly|y))?)?|ms?))?|i(?:f(?:i(?:cations?|able|e(?:rs?|d|s))|y(?:ing)?)|sh(?:ly)?|cum)|al(?:it(?:ies|y))?))?|t(?:o(?:r(?:(?:c(?:ycl(?:i(?:sts?|ng)|es?)|a(?:de|rs?))|bikes?|i(?:s(?:ed|ts?)|ng)|ways?|ed|s))?|cross)|h(?:(?:e(?:r(?:(?:ofpearl|s(?:(?:inlaw|tobe))?|boards?|in(?:law|g)|hood|l(?:and|ess|y)|ed))?|aten)|ball(?:(?:ed|s))?|s))?|i(?:v(?:at(?:i(?:on(?:(?:al|s))?|ng)|ors?|e(?:[ds])?)|e(?:(?:less|s))?)|on(?:(?:less(?:ly)?|ing|al|ed|s))?|l(?:ity|e)|fs?)|l(?:ie(?:st|r)|ey)|t(?:led|o)|e(?:ts?|ls?|s))|i(?:st(?:(?:ur(?:is(?:e(?:rs?)?|ing)|e)|e(?:n(?:(?:ing|ed|s))?|r)|ness))?|ety)|b(?:(?:il(?:i(?:s(?:a(?:tion|ble)|ing|e(?:[ds])?)|t(?:ies|y))|es?)|s(?:ters?)?|b(?:i(?:sh|ng)|ed)))?|o(?:(?:n(?:(?:l(?:i(?:ght(?:ing)?|t)|ess)|s(?:(?:tones|h(?:ine|ots?)))?|beams?|rise|ing))?|d(?:(?:i(?:ness|est|ly)|y|s))?|r(?:(?:lands?|hens?|ings?|ed|s))?|t(?:ed)?|ing|se?|ed))?|l(?:e(?:(?:s(?:(?:t(?:(?:ations?|e(?:rs?|d)|ing|s))?|kin))?|cul(?:ar|es?)|hills?))?|a(?:r(?:(?:it(?:ies|y)|s))?|sses)|ybdenum|l(?:if(?:ie[ds]|y)|usc(?:(?:an|s))?)|t(?:en|s)|d(?:[ys])?)|m(?:(?:ent(?:(?:ar(?:ily|y)|ous|um|s))?|s))?|c(?:k(?:(?:ing(?:(?:bird|ly))?|e(?:r(?:(?:ies|y|s))?|d)|ups?|s))?|casins?)|v(?:e(?:(?:ments?|able|rs?|s|d))?|i(?:ng(?:ly)?|es?)|able)|s(?:qu(?:ito|es?)|s(?:(?:ie(?:st|r)|es|y))?|aics?|t(?:ly)?|cow|es)|p(?:(?:p(?:ing|ed)|ing|e(?:(?:ds?|s))?|s))?|hairs?|a(?:n(?:(?:ing|e(?:rs?|d)|s))?|t(?:(?:ed|s))?|s)|zart|w(?:(?:ing|e(?:rs?|d)|n|s))?|guls?)|y(?:s(?:t(?:i(?:f(?:i(?:cation|e[ds])|y(?:ing)?)|c(?:(?:al(?:ly)?|ism|s))?|que)|er(?:i(?:ous(?:ly)?|es)|y))|elf)|th(?:(?:olog(?:i(?:sed|cal|es)|y)|ic(?:al)?|s))?|xomatosis|o(?:cardial|p(?:i(?:c(?:ally)?|a)|e))|r(?:iads?|rh)|algic|na(?:hs)?|elin)|nemonic(?:(?:ally|s))?|babane|rs)|b(?:u(?:c(?:k(?:(?:minsterfullerene|passing|e(?:t(?:(?:fuls?|ing|s))?|d)|l(?:e(?:(?:rs?|d|s))?|ing)|s(?:(?:hot|kin))?|ing))?|caneer(?:(?:ing|s))?|olic)|r(?:(?:e(?:au(?:(?:cra(?:t(?:(?:i(?:sation|c(?:ally)?)|s))?|c(?:ies|y))|s|x))?|tte)|l(?:esqu(?:ing|e)|ie(?:st|r)|y)|n(?:(?:i(?:sh(?:ing|ed)|ngs?)|e(?:rs?|d)|t|s))?|g(?:(?:l(?:ar(?:(?:ies|s|y))?|ing|e(?:[ds])?)|e(?:on(?:(?:ing|ed|s))?|rs?)|hers|undy))?|d(?:en(?:(?:s(?:ome)?|ing|ed))?|ock)|r(?:ow(?:(?:ing|ed|s))?)?|s(?:(?:ar(?:(?:ies|s|y))?|t(?:(?:ing|ed|s))?))?|bl(?:ing|e(?:[ds])?)|i(?:als?|e[ds])|m(?:ese|a)|p(?:(?:ing|ed|s))?|undi|y(?:ing)?))?|s(?:(?:i(?:ness(?:(?:woman|like|m(?:an|en)|es))?|e(?:st?|d|r)|ly)|y(?:(?:bod(?:ies|y)|ing))?|h(?:(?:i(?:n(?:ess|g)|e(?:st|r))|fire|land|e(?:ls?|s)|m(?:an|en)|y))?|t(?:(?:ards?|l(?:ing|e(?:[ds])?)|e(?:rs|d)|i(?:er|ng)|y|s))?|k(?:(?:ers?|ing))?|s(?:ing|ed)|m(?:an|en)|es))?|l(?:l(?:(?:f(?:i(?:ght(?:ing)?|nch)|rog)|et(?:(?:proof|ins?|s))?|do(?:z(?:ing|e(?:(?:rs?|d))?)|gs?)|ocks?|y(?:ing)?|i(?:e[ds]|on|sh)|s))?|k(?:(?:heads?|ie(?:st|r)|y|s))?|rushes|g(?:aria|ing|e(?:[ds])?|y)|warks?|b(?:(?:ous|s))?|imi[ac])|t(?:(?:t(?:(?:e(?:r(?:(?:s(?:cotch)?|f(?:l(?:ies|y)|at)|milk|cups?|ing|ed|y))?|d)|o(?:n(?:(?:hole(?:[ds])?|ing|ed|s))?|cks?)|ress(?:(?:ing|e[sd]))?|ing|s))?|cher(?:(?:ing|ed|s|y))?|lers?|ane|s))?|ff(?:(?:oon(?:(?:ery|s))?|e(?:t(?:(?:ings?|ed|s))?|r(?:(?:ing|ed|s))?)|alo|ing|s))?|d(?:(?:g(?:e(?:(?:rigar|t(?:(?:ary|ing|ed|s))?|d))?|i(?:es?|ng))|apest|d(?:his[mt]|i(?:ngs?|es)|ed|y)|s))?|b(?:(?:bl(?:e(?:(?:gum|d|s))?|i(?:e(?:st|r)|ng)|y)|onic))?|g(?:(?:g(?:e(?:r(?:(?:ing|ed|s|y))?|d)|i(?:es|ng)|y)|bears?|eyed|le(?:(?:rs?|s))?|s))?|il(?:d(?:(?:ings?|ers?|ups?|s))?|t(?:(?:in|up))?)|m(?:(?:p(?:(?:tious|i(?:e(?:st|r)|ng)|kins?|e(?:rs?|d)|y|s))?|bl(?:e(?:(?:rs?|d|s))?|ing)|s))?|n(?:(?:g(?:(?:alows?|l(?:e(?:(?:rs?|d|s))?|ing)|ee))?|ch(?:(?:ing|e[ds]))?|dl(?:ing|e(?:[ds])?)|k(?:(?:e(?:r(?:(?:ed|s))?|d)|um|s))?|ions?|n(?:ies|y)|ting|yan|s))?|oy(?:(?:an(?:t(?:ly)?|cy)|ed|s))?|zz(?:(?:words|ards?|e(?:rs?|d|s)|ing))?|y(?:(?:ers?|ing|out|s))?|xom)|i(?:o(?:t(?:echnolog(?:i(?:cal|sts?)|y)|ic|a)|g(?:eographical|raph(?:i(?:cal(?:ly)?|es)|ers?|y))|engineering|chemi(?:cal(?:ly)?|st(?:(?:ry|s))?)|d(?:egradable|iversity)|log(?:i(?:cal(?:ly)?|sts?)|y)|s(?:ynthesis|pheres?|cope)|feedback|p(?:hysical|s(?:ies|y))|rhythms?|m(?:e(?:tr(?:ics?|y)|dical)|orph|ass)|nics?)|b(?:(?:l(?:i(?:o(?:graph(?:i(?:c(?:al)?|es)|y)|phile)|c(?:ists|al(?:ly)?))|es?)|s))?|d(?:(?:i(?:rectional|ng)|d(?:ings?|e(?:rs?|n))|e(?:[tsd])?|s))?|r(?:efringen(?:ce|t)|d(?:(?:watch(?:ers?|ing)|tables|baths?|cages?|s(?:ong)?|ies?))?|th(?:(?:r(?:ights?|ate)|place|marks?|days?|s))?|ch(?:e[ds])?)|c(?:e(?:nten(?:nial|ary)|ps)|a(?:rb(?:onate)?|meral)|ker(?:ings?)?|ycl(?:ing|e(?:[ds])?))|f(?:urcat(?:ions?|ed)|ocals?)|l(?:i(?:ngual(?:(?:ism|s))?|ary|ous)|l(?:(?:i(?:on(?:(?:aires?|th|s))?|ards?|ngs?)|posters|boards?|e(?:t(?:(?:ing|ed|s))?|d)|ow(?:(?:ing|ed|s|y))?|able|y|s))?|a(?:teral(?:ly)?|bial)|harzia|tong|ges?|es?)|s(?:e(?:xual(?:(?:ity|s))?|ct(?:(?:ing|ed|s))?)|hop(?:(?:rics?|s))?|cuit(?:[sy])?|m(?:arck|uth)|t(?:able|ro)|ons?|sau)|t(?:(?:t(?:e(?:r(?:(?:s(?:weet)?|n(?:ess)?|est|ly))?|n)|iness|y|s)|um(?:inous|en)|ch(?:(?:in(?:ess|g)|es|y))?|ing(?:ly)?|e(?:(?:rs?|s))?|map|s))?|z(?:arre(?:(?:ness|ly))?)?|v(?:ouac(?:(?:ked|s))?|alves?)|p(?:ed(?:(?:al(?:ism)?|s))?|arti(?:san|te)|lanes?|olar)|n(?:(?:o(?:culars?|mial|dal)|ar(?:ies|y)|d(?:(?:ings?|weed|er(?:[sy])?|s))?|nacle|g(?:[oe])?|s))?|e(?:nnials?|r)|g(?:(?:a(?:m(?:ists?|ous|y)|pple)|heads|g(?:e(?:st|r)|ish)|ness|ot(?:(?:ed|ry|s))?|ben))?|m(?:o(?:nthly|dal)|bo)|a(?:nnual|s(?:(?:s(?:ing|e[ds])|ing|e[ds]))?)|weekly|k(?:in(?:is?|g)|e(?:[sr])?)|joux?)|l(?:o(?:o(?:d(?:(?:y(?:mindedness)?|thirst(?:ie(?:st|r)|y)|curdling|l(?:e(?:ss(?:ness)?|tting)|ine|ust)|s(?:(?:t(?:ain(?:(?:ed|s))?|ream|o(?:ne|ck))|uckers|ports?|h(?:ed|ot)))?|hounds?|bath|i(?:e(?:st?|d|r)|ly)|worm|red|ed))?|m(?:(?:e(?:rs?|d)|ing|s|y))?)|c(?:(?:k(?:(?:bust(?:ers?|ing)|heads?|a(?:d(?:ing|e(?:[ds])?)|ges?)|e(?:rs|d)|i(?:ng|sh)|s|y))?|s))?|nd(?:(?:haired|e(?:(?:st?|r))?|s))?|w(?:(?:torch(?:es)?|dr(?:ying|ied)|pipes?|lamp|e(?:rs?|d)|fly|ing|up|s|n))?|ssom(?:(?:ing|ed|s))?|at(?:(?:ing|ed))?|t(?:(?:ch(?:(?:e[ds]|y))?|t(?:ing|e[dr])|s))?|uses?|kes?|bs?)|a(?:ck(?:(?:currants?|b(?:all(?:(?:ing|ed))?|err(?:ies|y)|oards?|irds?)|l(?:ist(?:(?:ing|ed|s))?|eg|y)|mail(?:(?:e(?:rs?|d)|ing|s))?|s(?:(?:hirts|miths?|ea))?|thorn|heads?|guard|e(?:n(?:(?:ing|ed|s))?|st|d|r)|jack|ness|outs?|fly|i(?:ng|sh)))?|m(?:e(?:(?:less(?:(?:ness|ly))?|worthy|able|ful|d|s))?|ing)|n(?:d(?:(?:ishments|ness|est|ly))?|k(?:(?:e(?:t(?:(?:ing|ed|s))?|d|r)|ness|ing|ly|s))?|c(?:mange|h(?:(?:ing|ed))?))|s(?:phem(?:ous(?:ly)?|e(?:(?:rs?|d))?|i(?:es|ng)|y)|t(?:(?:e(?:rs?|d)|ing|s))?|e)|b(?:(?:be(?:r(?:ing)?|d)|s))?|t(?:an(?:t(?:ly)?|cy))?|d(?:ders?|e(?:[ds])?)|r(?:ing|e(?:[ds])?)|z(?:e(?:(?:rs?|d|s))?|ing)|h)|i(?:s(?:ter(?:(?:ing(?:ly)?|ed|s))?|s(?:ful(?:ly)?)?)|n(?:d(?:(?:fold(?:(?:ed|s))?|ing(?:ly)?|ness|e(?:st|d|r)|ly|s))?|k(?:(?:e(?:r(?:(?:ing|ed|s))?|d)|ing|s))?)|t(?:z(?:krieg)?|he(?:(?:ring|ly))?)|ght(?:(?:ing|ed|s))?|zzards?|mps?|ps?)|e(?:s(?:s(?:(?:e(?:d(?:ness)?|s)|ings?))?|bok)|a(?:r(?:y(?:eyed)?|ily)|ch(?:(?:e(?:rs?|d|s)|ing))?|k(?:(?:ness|e(?:st|r)|ly))?|t(?:(?:ing|ed|s))?)|mish(?:e[ds])?|e(?:d(?:(?:ers?|ing|s))?|p(?:(?:ing|e[dr]|s))?)|n(?:ch(?:ed)?|d(?:(?:e(?:rs?|d)|ing|s))?)|d|w)|u(?:dgeon(?:(?:ing|ed|s))?|e(?:(?:b(?:e(?:rr(?:ies|y)|lls?)|looded|ottles?|irds?)|prints?|collar|moon|n(?:ess|ile)|ish|s(?:[ty])?|r))?|n(?:der(?:(?:buss|ings?|ed|s))?|t(?:(?:ness|e(?:st|d|r)|ing|ly|s))?)|s(?:ter(?:(?:ing|ed|s|y))?|h(?:(?:ing(?:ly)?|e(?:rs?|d|s)))?)|bber(?:(?:ing|ed))?|ff(?:(?:e(?:rs?|d)|ing|s))?|r(?:(?:r(?:ing|ed|y)|t(?:(?:ing|ed|s))?|bs?|s))?|ish))|r(?:o(?:a(?:d(?:(?:minded(?:ness)?|cast(?:(?:ers?|ing|s))?|l(?:eaved|oom|y)|s(?:heets?|words?|ides?)|e(?:n(?:(?:ing|ed|s))?|st|r)|band|ness|way))?|ch(?:(?:ing|e[ds]))?)|k(?:e(?:(?:n(?:(?:hearted|ly))?|r(?:(?:age|ed|s))?))?|ing)|th(?:(?:e(?:r(?:(?:s(?:inlaw)?|inlaw|hood|ly))?|ls?)|s))?|n(?:tosaurus|c(?:hi(?:(?:tis|al))?|o)|ze(?:[ds])?)|o(?:m(?:s(?:ticks?)?)?|d(?:(?:in(?:g(?:ly)?|ess)|ed|s|y))?|ch(?:es)?|k(?:(?:lyn|s))?)|w(?:(?:beat(?:(?:ing|en))?|n(?:(?:ness|e(?:st|d|r)|i(?:es?|ng|sh)|s))?|s(?:(?:e(?:(?:rs?|d|s))?|ing))?))?|c(?:hures?|aded?|coli)|il(?:(?:ing|e[dr]|s))?|mi(?:des?|ne)|u(?:haha|ght)|gues?)|e(?:a(?:d(?:(?:andbutter|winners?|boards?|crumbs|fruit|line|ths?|ed|s))?|th(?:(?:ing(?:s(?:pace)?)?|less(?:(?:ness|ly))?|taking(?:ly)?|a(?:lyse(?:rs?|d)|ble)|e(?:[drs])?|s|y))?|k(?:(?:throughs?|fast(?:(?:ing|ed|s))?|points?|waters?|downs?|a(?:ways?|ble|ges?)|neck|ers?|in(?:[gs])?|out|ups?|s))?|st(?:(?:feed(?:ing)?|s(?:troke)?|plate|bone|ing|ed))?|ch(?:(?:ing|e[ds]))?|m)|ccia(?:ted|s)|e(?:z(?:i(?:e(?:st|r)|ly|ng)|e(?:[ds])?|y)|ch(?:es)?|d(?:(?:ers?|ing|s))?)|w(?:(?:e(?:r(?:(?:ies|s|y))?|d)|age|ing|s))?|t(?:hren|on)|vi(?:ary|ty)|d)|i(?:d(?:g(?:e(?:(?:building|head|d|s))?|ing)|e(?:(?:grooms?|s(?:maids?)?))?|l(?:e(?:(?:ways?|d|s))?|ing)|als?)|g(?:(?:ht(?:(?:ness(?:es)?|e(?:n(?:(?:ing|ed|s))?|yed|st|r)|ly|on))?|a(?:d(?:iers?|es?)|nds?)))?|n(?:k(?:(?:manship|s))?|dled|g(?:(?:ing|er|s))?|es?|y)|c(?:k(?:(?:lay(?:ers?|ing)|bats?|work|ing|red|ed|s))?|abrac)|llian(?:t(?:ly)?|c[ye])|t(?:(?:tle(?:ness)?|ain|ish|ons))?|quettes|e(?:f(?:(?:cases?|ings?|e(?:st|d|r)|ly|s))?|rs)|m(?:(?:s(?:tone)?|m(?:ing|ed)))?|s(?:k(?:(?:ness|e(?:st|r)|ly))?|tl(?:ing|e(?:[ds])?|y)|bane)|b(?:e(?:(?:r(?:[sy])?|d|s))?|ing)|o(?:che)?|ar)|u(?:t(?:al(?:(?:i(?:s(?:ation|ing|ed?|m)|t(?:ies|y))|ly))?|ish(?:ness)?|es?|us)|s(?:que(?:(?:ness|ly))?|h(?:(?:wo(?:od|rk)|ing|off|e[ds]|up|y))?|sels)|n(?:e(?:t(?:(?:tes?|s))?|i)|ch(?:es)?|ts?)|is(?:e(?:(?:rs?|d|s))?|ing))|a(?:(?:i(?:n(?:(?:less(?:(?:ness|ly))?|s(?:torm(?:(?:ing|s))?)?|d(?:amaged|ead)|teas(?:ers|ing)|wa(?:sh(?:(?:ing|ed))?|ves?)|power|c(?:hild|ells?)|ier|y))?|d(?:(?:ing|ed|s))?|l(?:le)?|sed?)|c(?:hiopods|k(?:e(?:t(?:(?:ing|ed|s))?|n)|ish)|e(?:(?:lets?|d|r|s))?|ing(?:ly)?)|d(?:ycardia|awl)|n(?:(?:d(?:(?:i(?:sh(?:(?:ing|e[sd]))?|es|ng)|ed|s|y))?|ch(?:(?:ing|e[ds]|y))?|s))?|z(?:e(?:n(?:(?:ness|ed|ly))?)?|i(?:ers?|ng|l))|g(?:(?:g(?:arts?|ing|ed)|s))?|s(?:(?:h(?:(?:ness|er|ly))?|s(?:(?:e(?:rie|s)|iere|y))?|i(?:ers|l(?:ia)?)))?|w(?:(?:n(?:(?:ie(?:st|r)|y))?|l(?:(?:ing|e[dr]|s))?))?|bble(?:[ds])?|mbles?|hm(?:an|s)|k(?:ing|e(?:[ds])?)|v(?:ado|e(?:(?:ly|ry?|st?|d))?|ing|o)|y(?:(?:ing|ed|s))?|t(?:(?:ty|s))?))?)|a(?:c(?:teri(?:o(?:log(?:i(?:cal|sts?)|y)|phage)|cidal|al?|um)|k(?:(?:p(?:edal(?:l(?:ing|ed))?|ack(?:(?:ers?|ing|s))?)|b(?:ench(?:ers?)?|ones?)|s(?:(?:l(?:a(?:pping|sh)|iding)|t(?:a(?:bbing|irs|ge)|r(?:eets?|oke))|pac(?:ing|es?)|ides?|eat))?|track(?:(?:ing|ed|s))?|w(?:a(?:rd(?:(?:ness|s))?|ters?|sh)|oods(?:men)?)|g(?:rounds?|ammon)|hand(?:ed)?|fir(?:ing|e(?:[ds])?)|d(?:ated?|rop)|l(?:i(?:ght|t)|ash|ess|ogs?)|rest|yard|ache|chat|e(?:rs?|d)|ing|ups?))?|h(?:elors?)?|c(?:arat|hus)|ill(?:us|i)|on)|s(?:t(?:ard(?:(?:is(?:ation|ed?)|s|y))?|i(?:ons?|ng)|ed?)|h(?:(?:ful(?:(?:ness|ly))?|ing|e[ds]))?|reliefs?|k(?:(?:e(?:t(?:(?:ball|ful|ry|s))?|d)|ing|s))?|e(?:(?:balls?|l(?:ines?|ess|y)|ments?|ness|st?|r|d))?|i(?:c(?:(?:ally|s))?|l(?:i(?:cas?|sks?))?|n(?:(?:ful|g|s))?|fy|s)|al(?:t(?:(?:ic|s))?)?|s(?:(?:oons?|ist|es))?|que)|t(?:(?:t(?:l(?:e(?:(?:grounds?|fields?|ment(?:(?:ed|s))?|d(?:ress)?|s(?:hips?)?|axe|cry|rs?))?|ing)|alions?|e(?:n(?:(?:ing|ed|s))?|r(?:(?:i(?:es|ng)|ed|s|y))?|d)|ing|y)|h(?:(?:house|ro(?:oms?|be)|water|e(?:(?:tic|rs?|d|s))?|tubs?|urst|ing|os|s))?|ch(?:(?:ing|e[ds]))?|s(?:m(?:an|en))?|i(?:ks?|ng)|m(?:an|en)|ons?|e(?:[sd])?))?|l(?:l(?:(?:bearings?|o(?:on(?:(?:i(?:sts?|ng)|ed|s))?|t(?:(?:ing|ed|s))?)|istics?|e(?:rinas?|t(?:(?:ic|s))?)|p(?:oint|ens?)|rooms?|a(?:d(?:(?:es?|s))?|sts?)|yhoo|s))?|ust(?:rade(?:[ds])?|ers?)|d(?:(?:e(?:r(?:dash)?|st)|ness|ing|ly|y))?|a(?:clavas?|laika|nc(?:ing|e(?:[drs])?))|con(?:ies|y)|e(?:(?:ful(?:ly)?|en|d|s))?|m(?:(?:ie(?:st|r)|oral|y|s))?|oney|i(?:ng)?|sam?|tic)|n(?:(?:k(?:(?:rupt(?:(?:c(?:ies|y)|ing|ed|s))?|notes?|able|e(?:rs?|d)|ing|s))?|t(?:am(?:(?:weight|s))?|er(?:(?:ing|ed))?)|quet(?:(?:ing|s))?|n(?:i(?:sters?|ng)|e(?:rs?|d)|s)|is(?:h(?:(?:ment|ing|e[ds]))?|ters?)|d(?:(?:w(?:idths?|agons?)|a(?:g(?:ing|e(?:[ds])?)|nna)|s(?:tand)?|i(?:e(?:st|d|r)|t(?:(?:ry|s))?|ng)|pass|ed))?|a(?:l(?:it(?:ies|y))?|nas?)|s(?:hees?)?|g(?:(?:e(?:rs?|d)|ing|kok|les?|s))?|jo|e))?|r(?:(?:b(?:(?:ar(?:i(?:c(?:ally)?|t(?:ies|y)|ans?|sm)|ous(?:ly)?)|i(?:turates?|e)|e(?:cue(?:[ds])?|l[ls]|rs?|d)|s))?|n(?:(?:s(?:torming)?|acles?|yard))?|ley(?:corns?)?|r(?:i(?:sters?|cade(?:[sd])?|ers?|ng)|e(?:(?:n(?:ness)?|l(?:(?:led|s))?|d))?|a(?:c(?:k(?:(?:ing|s))?|uda)|ges?)|ows?)|o(?:n(?:(?:e(?:ss(?:es)?|ts?)|age|i(?:al|es)|s|y))?|met(?:ric|ers?)|que)|g(?:ain(?:(?:ing|e(?:rs|d)|s))?|e(?:(?:pole|d|s))?|ing)|e(?:(?:f(?:oot(?:ed)?|aced)|back|ness|ly|st?|r|d))?|t(?:e(?:nder|r(?:(?:ing|e[dr]))?))?|i(?:tones?|ng|um)|m(?:a(?:ids?|n)|en)|code|k(?:(?:e(?:rs?|d)|ing|y|s))?|ds?|s))?|b(?:y(?:(?:sit(?:t(?:ers?|ing))?|face|hood|i(?:ng|sh)|lon))?|bl(?:e(?:(?:rs?|d|s))?|ing)|oons?|ies|as|e(?:[ls])?)|d(?:(?:tempered|ge(?:(?:r(?:(?:ing|ed|s))?|d|s))?|minton|inage|l(?:ands|y)|ness|dy|er?))?|mb(?:oo(?:(?:zle(?:[sd])?|s))?|ino)|ffl(?:ing(?:ly)?|e(?:(?:ment|d|r|s))?)|g(?:(?:atelle|uettes?|g(?:ages?|i(?:e(?:st|r)|ng)|e[dr]|y)|pipe(?:[rs])?|fuls?|hdad|dad|els|m(?:an|en)|s))?|i(?:l(?:(?:i(?:wick|ffs?|ng)|out|ed|s))?|t(?:(?:ings?|e(?:rs|d)|s))?)|k(?:e(?:(?:house|r(?:(?:ies|s|y))?|d|s))?|lavas|ings?)|p(?:tis(?:ing|m(?:(?:al|s))?|e(?:[ds])?|ts?))?|u(?:lk(?:(?:ing|ed|s|y))?|bles?|xite|d)|varian?|w(?:d(?:ie(?:st|r)|y)|l(?:(?:ing|ed|s))?)|y(?:(?:onets?|ing|ed|s))?|z(?:ookas?|aars?)|h(?:amas)?|obabs?|a(?:(?:ing|l))?)|o(?:w(?:(?:dleris(?:ation|ing|ed)|s(?:(?:tring|prit))?|l(?:(?:in(?:es|g)|der|e(?:rs?|d)|s))?|e(?:ls?|rs?|d)|i(?:ng|e)|m(?:an|en)))?|u(?:g(?:ainvillea|h(?:[st])?)|n(?:d(?:(?:e(?:d(?:ness)?|rs?)|ar(?:ies|y)|less|ing|s))?|t(?:i(?:ful(?:ly)?|es)|eous|y)|c(?:i(?:e(?:st|r)|ng)|e(?:(?:rs?|d|s))?|y))|r(?:geois(?:ie)?|bons?)|l(?:evards?|ders?)|t(?:(?:iques?|s))?|doirs?|ffant|quets?)|a(?:(?:s(?:t(?:(?:ful(?:(?:ness|ly))?|e(?:rs?|d)|ing|s))?)?|t(?:(?:houses?|s(?:wain)?|load|e(?:rs?|d)|ing|m(?:an|en)))?|r(?:(?:d(?:(?:rooms?|games|ings?|e(?:rs?|d)|s))?|s))?))?|d(?:y(?:(?:building|guards?|work))?|i(?:l(?:ess|y)|ces?|e[ds]|ng)|kin|e(?:[sd])?)|i(?:l(?:(?:e(?:r(?:(?:makers|s))?|d)|ing|s))?|sterous(?:ly)?)|mb(?:(?:a(?:rd(?:(?:ments?|i(?:ng|er)|ed|s))?|st(?:(?:ic|s))?|y)|s(?:hell)?|ings?|e(?:rs?|d)))?|o(?:(?:b(?:y(?:trap(?:(?:ped|s))?)?|ies|oo)|m(?:(?:e(?:r(?:ang(?:(?:ing|s))?)?|d)|ing|s))?|k(?:(?:bind(?:ers?|ing)|keep(?:ing|er)|s(?:(?:ellers?|h(?:el(?:ves|f)|ops?)|talls?))?|ma(?:k(?:ing|ers?)|rks?)|cases?|wor(?:ms?|k)|able|e(?:nds|rs|d)|i(?:ngs?|es?|sh)|lets?))?|r(?:(?:ish(?:(?:ness|ly))?|s))?|t(?:(?:s(?:traps?)?|prints|l(?:aces?|e(?:ss|g))|e(?:es|d)|ing|hs?|y))?|s(?:t(?:(?:e(?:rs?|d)|ing|s))?)?|ze(?:(?:rs?|d|s))?|hoo|ing|ns?|ed))?|n(?:d(?:(?:holders|ings?|age|ed|s))?|anzas?|e(?:(?:less|meal|y|s|d))?|fires?|n(?:(?:et(?:(?:ed|s))?|ie(?:st)?|y))?|bons?|ie(?:st|r)|us(?:es)?|obo|sai|gs?|y)|t(?:an(?:i(?:c(?:al(?:ly)?)?|sts?)|y)|t(?:l(?:e(?:(?:necks?|fe(?:ed|d)|d|r|s))?|ing)|om(?:(?:most|less|ing|ed|s))?)|h(?:(?:er(?:(?:s(?:ome)?|ing|ed))?|y))?|swana|ulism|ch(?:ed)?)|y(?:(?:friends?|cott(?:(?:ing|ed|s))?|ish(?:ly)?|s(?:cout)?|hood))?|r(?:row(?:(?:ings?|able|e(?:rs?|d)|s))?|de(?:r(?:(?:line|ing|e[dr]|s))?|aux)|e(?:(?:holes?|d(?:om)?|al|rs?|s))?|n(?:(?:again|eo?))?|ing(?:ly)?|o(?:ughs?|n)|stals?|a(?:cic|tes?|x))|l(?:ster(?:(?:ing|ed|s))?|d(?:(?:face|ness|e(?:st|r)|ly))?|lards?|ivia|ogna|t(?:(?:ing|ed|s))?|e(?:(?:ro|yn))?|a)|g(?:(?:g(?:l(?:ing(?:ly)?|e(?:[ds])?)|i(?:est|ng)|ed|y)|ey(?:(?:m(?:an|en)|s))?|ies|us|s|y))?|s(?:s(?:(?:i(?:n(?:ess|g)|e(?:st|r))|e[ds]|y))?|nia|o(?:ms?|ns?)|ton|un)|x(?:(?:office|tops|wood|e(?:rs?|s|d)|ful|ing|y))?|b(?:(?:tails?|b(?:i(?:es|n(?:[gs])?)|les?|ed|y)|s(?:led)?|cat))?|hemian|er(?:(?:war|s))?|ffins?|vine|ps?)|e(?:a(?:t(?:(?:i(?:f(?:i(?:c(?:ations?)?|e[ds])|y)|tudes?|ngs?)|niks?|e(?:rs?|n)|up|s))?|c(?:h(?:(?:comber|head|side|ing|e[ds]|y))?|on(?:(?:ed|s))?)|st(?:(?:l(?:i(?:ness|est)|y)|s))?|u(?:(?:t(?:i(?:f(?:ie(?:rs?|s|d)|ul(?:ly)?|y)|cian|es)|eous|s|y)|x|s))?|n(?:(?:s(?:talks?)?|pole|bag|ery|ie|y))?|d(?:(?:y(?:eyed)?|i(?:e(?:st|r)|ngs?)|work|les?|ed|s))?|r(?:(?:d(?:(?:less|ed|s))?|s(?:kins?)?|abl[ey]|i(?:ngs?|sh)|ers?))?|ver(?:(?:ing|s))?|gles?|k(?:(?:e(?:rs?|d)|s))?|m(?:(?:ing|ed|y|s))?)|h(?:a(?:v(?:i(?:our(?:(?:al(?:ly)?|is(?:ts?|m)|s))?|ng)|e(?:[ds])?)|lf)|ind(?:(?:hand|s))?|e(?:ad(?:(?:ing|ed))?|moth|ld|st)|o(?:ld(?:(?:e(?:rs?|n)|ing|s))?|ve[ds]))|l(?:(?:i(?:e(?:(?:v(?:ab(?:ility|l[ye])|e(?:(?:rs?|d|s))?|ing)|fs?|d|s))?|ttl(?:ing|e(?:[ds])?)|ke)|l(?:(?:i(?:geren(?:t(?:(?:ly|s))?|ce)|cos(?:ity|e)|es)|bottoms|adonna|ow(?:(?:ing|ed|s))?|y(?:ful)?|e(?:[ds])?|s))?|a(?:ted(?:(?:ness|ly))?|bour|y(?:(?:ed|s))?)|eaguered|o(?:ng(?:(?:ings?|ed|s))?|ved|w)|ch(?:(?:ing|e[ds]))?|f(?:r(?:ies|y)|ast)|g(?:i(?:ans?|um)|rade)|t(?:(?:ings?|ed|s))?|ying))?|n(?:(?:e(?:f(?:i(?:c(?:ia(?:r(?:ies|y)|l(?:ly)?)|e(?:n(?:ce|t))?)|t(?:(?:ing|ed|s))?)|act(?:ions?|ress|ors?))|dictions?|volen(?:t(?:ly)?|ce)|ath|lux)|ch(?:(?:mark(?:(?:ing|s))?|es))?|ig(?:hted(?:ly)?|n(?:(?:ity|ly))?)|d(?:(?:able|ings?|e(?:rs?|d)|s))?|jamin|zene|gal|t))?|w(?:i(?:lder(?:(?:ing(?:ly)?|ment|ed|s))?|tch(?:(?:ing|ed))?)|hiskered|a(?:il(?:(?:ing|ed|s))?|re))|g(?:(?:rudg(?:ingly|ed?)|u(?:il(?:e(?:(?:ment|d))?|ing)|n)|in(?:(?:n(?:ings?|ers?)|s))?|et(?:(?:ting|s))?|g(?:ar(?:(?:ed|ly|s|y))?|ings?|ed)|o(?:n(?:ias|e)|t(?:ten)?)|a[tn]|s))?|r(?:e(?:av(?:e(?:(?:ments?|d))?|ing)|ft|ts?)|yl(?:lium)?|at(?:ing|ed?)|lin(?:er)?|muda|r(?:ies|y)|serk|th(?:(?:ed|s))?|ber|gs|k|n)|s(?:e(?:ech(?:(?:ing(?:ly)?|e[ds]))?|t(?:(?:ting|s))?)|p(?:e(?:ctacled|ak(?:(?:ing|s))?)|attered|oke)|t(?:(?:s(?:ell(?:ers?|ing))?|i(?:r(?:r(?:ing|ed))?|a(?:l(?:ity)?|ry))|known|ow(?:(?:als?|ing|ed|s))?|r(?:ide|ode)))?|i(?:eg(?:ing|ed?)|des?)|mirch|ot(?:ted)?)|d(?:(?:e(?:vil(?:(?:ment|led|s))?|ck(?:ed|s))|s(?:(?:preads?|i(?:t(?:ters?)?|de)|heets|teads?|ores?))?|r(?:aggled|idden|o(?:oms?|ck))|fellows?|c(?:lothes|hamber|over)|azzled?|makers?|d(?:ings?|e[dr])|l(?:inen|am)|ouins?|times?|bugs?|p(?:ans?|ost)))?|e(?:(?:f(?:(?:burgers?|eater|cake|ie(?:st|r)|y|s))?|keepers|ch(?:(?:wood|nut|es))?|hives?|lines?|r(?:(?:mats?|y|s))?|t(?:(?:root|les?|s))?|p(?:(?:ing|er|s))?|s(?:wax)?|n))?|f(?:riend(?:(?:ing|ed|s))?|uddl(?:ing|ed?)|o(?:re(?:hand)?|ul|g)|all(?:(?:ing|en|s))?|it(?:(?:t(?:ing|ed)|s))?|ell)|que(?:ath(?:(?:ing|ed))?|sts?)|t(?:(?:t(?:e(?:r(?:(?:ment|ing|ed|s))?|d)|ing)|oken(?:(?:ed|s))?|r(?:ay(?:(?:als?|e(?:rs?|d)|ing|s))?|oth(?:(?:al|ed|s))?)|i(?:mes|de)|w(?:een|ixt)|el|a|s))?|m(?:use(?:(?:ment|d(?:ly)?))?|oan(?:(?:ing|ed|s))?)|jewel(?:led)?|c(?:k(?:(?:on(?:(?:ing|ed|s))?|s))?|a(?:lm(?:ed)?|use|me)|om(?:ing|es?))|v(?:e(?:l(?:(?:l(?:ing|ed)|s))?|rages?)|vy|y)|i(?:jing|ngs?|rut|ge)|yond|bop)|y(?:e(?:(?:l(?:ections?|aws?)|bye|s))?|standers?|p(?:roducts?|a(?:ss(?:(?:ing|e[ds]))?|ths?))|gones?|l(?:aws?|ine)|w(?:ays?|ord)|tes?)|mus)|e(?:l(?:e(?:ct(?:(?:r(?:o(?:(?:encephalogram|c(?:ardiogra(?:phic|m)|hemical(?:ly)?|ut(?:i(?:ng|on)|e(?:[ds])?))|m(?:agnet(?:i(?:c(?:ally)?|sm))?|echanic(?:al|s)|otive)|l(?:uminescent|y(?:t(?:ic(?:ally)?|es?)|s(?:i(?:ng|s)|ed?)))|technical|d(?:ynamics?|es?)|n(?:(?:egative|ic(?:(?:ally|s))?|s))?|phoresis|statics?))?|i(?:f(?:i(?:cation|ed)|y(?:ing)?)|c(?:(?:al(?:ly)?|i(?:ans?|ty)|s))?))|i(?:on(?:(?:eering|s))?|ng|ve)|ab(?:ility|le)|or(?:(?:a(?:l(?:ly)?|tes?)|s))?|ed|s))?|phant(?:(?:i(?:asis|ne)|s))?|ment(?:(?:a(?:r(?:ily|y)|l(?:ly)?)|s))?|v(?:at(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|en(?:th)?)|g(?:an(?:t(?:ly)?|ce)|i(?:es|ac)|y))|a(?:st(?:odynamics|i(?:c(?:(?:it(?:ies|y)|a(?:lly|ted)|s))?|n))|borat(?:e(?:(?:ness|ly|s|d))?|i(?:ons?|ng))|ps(?:ing|e(?:[sd])?)|t(?:ion|e(?:[sd])?)|n(?:ds?)?|l)|d(?:e(?:r(?:(?:berr(?:ies|y)|flower|ly|s))?|st)|orado)|i(?:minat(?:i(?:ons?|ng)|or|e(?:[sd])?)|cit(?:(?:ation|ing|ed|s))?|gib(?:ility|l[ey])|sions?|t(?:is(?:ts?|m)|es?)|xirs?|d(?:ing|e(?:[sd])?)|jah)|l(?:(?:ip(?:tic(?:al(?:ly)?)?|s(?:oid(?:(?:al|s))?|es?|is))|s))?|o(?:ngat(?:i(?:ons?|ng)|e(?:[ds])?)|quen(?:t(?:ly)?|ce)|cution|p(?:e(?:(?:ment|s|d))?|ing))|u(?:cidat(?:i(?:ng|on)|e(?:[sd])?)|si(?:ve(?:(?:ness|ly))?|ons?)|t(?:ion|ed)|d(?:ing|e(?:[sd])?))|s(?:e(?:where)?)?|b(?:ow(?:(?:ing|ed|s))?|e)|greco|f(?:(?:like|in))?|ysee|v(?:ish|e[ns])|nino|ms?|ks?)|n(?:v(?:i(?:ron(?:(?:ment(?:(?:al(?:(?:is(?:ts?|m)|ly))?|s))?|s))?|s(?:ion(?:ed)?|ag(?:ing|e(?:[ds])?))|ous(?:ly)?|abl[ey]|e[sd])|elop(?:(?:ing|e(?:(?:rs?|d|s))?|s))?|y(?:ing)?|oys?)|t(?:h(?:us(?:i(?:as(?:t(?:(?:ic(?:ally)?|s))?|ms?)|ng)|e(?:[ds])?)|r(?:one(?:(?:ment|d))?|all(?:ing|ed))|alp(?:ies|y))|r(?:e(?:preneur(?:(?:s(?:hip)?|ial))?|at(?:(?:i(?:ng(?:ly)?|es)|ed|s|y))?|nch(?:(?:ment|ing|ed))?|e)|a(?:i(?:n(?:(?:ment|ed))?|ls)|p(?:(?:p(?:ing|ed)|ment))?|n(?:c(?:ing|e(?:[ds])?)|ts?))|ust(?:(?:ing|ed|s))?|op(?:ic|y)|ies|y)|e(?:r(?:(?:tain(?:(?:ing(?:ly)?|ments?|e(?:rs?|d)|s))?|pris(?:ing|es?)|i(?:tis|ng)|ed|s))?|nte)|a(?:ngl(?:e(?:(?:ments?|d|r|s))?|ing)|blature|il(?:(?:ment|ing|ed|s))?)|o(?:m(?:olog(?:i(?:cal|sts?)|y)|b(?:(?:ment|ed|s))?)|urage)|i(?:t(?:l(?:e(?:(?:ments?|d|s))?|ing)|ies|y)|c(?:e(?:(?:ments?|s|d))?|ing(?:ly)?)|re(?:(?:ly|ty|s))?)|win(?:ing|e(?:[ds])?))|f(?:ranchis(?:e(?:(?:ment|d|r))?|ing)|o(?:rc(?:e(?:(?:ab(?:ility|le)|ments?|rs?|d|s))?|ing)|ld(?:(?:ing|ed|s))?)|eeble(?:(?:ment|d))?)|c(?:a(?:psulat(?:i(?:ons?|ng)|e(?:[ds])?)|mp(?:(?:ments?|ed))?|s(?:hment|ing|e(?:[sd])?)|ge)|ephal(?:opathy|itis)|o(?:u(?:rag(?:e(?:(?:ments?|s|r|d))?|ing(?:ly)?)|nter(?:(?:ing|ed|s))?)|m(?:pass(?:(?:ing|e[ds]))?|ium)|d(?:e(?:(?:rs?|s|d))?|ing)|re(?:[sd])?)|ycl(?:op(?:aedi(?:as?|c)|edi(?:as?|c))|ical)|i(?:rcl(?:e(?:(?:ments?|d|s))?|ing)|phering)|r(?:oach(?:(?:ments?|ing|e[sd]))?|ust(?:(?:ation|ing|ed))?|ypt(?:(?:i(?:on|ng)|ed|s))?)|h(?:a(?:nt(?:(?:ing(?:ly)?|ments?|ress|e(?:rs?|d)|s))?|in)|iladas)|umb(?:rances?|er(?:(?:ing|ed))?)|l(?:os(?:ures?|ing|e(?:[ds])?)|a(?:ves?|sp)))|d(?:(?:o(?:m(?:etri(?:osis|al|um)|orphisms?)|genous(?:ly)?|r(?:s(?:e(?:(?:ments?|d|r|s))?|ing)|phins)|plasmic|t(?:hermic|oxin)|w(?:(?:ments?|ing|ed|s))?|scop(?:ic|e|y)|crine)|e(?:a(?:vour(?:(?:ing|ed|s))?|r(?:(?:ing(?:ly)?|ments?|ed|s))?)|mic(?:ally)?|d)|anger(?:(?:ing|ed|s))?|less(?:(?:ness|ly))?|u(?:ngeoned|r(?:a(?:ble|nce)|ing|e(?:[sd])?)|e[sd])|papers|i(?:ngs?|ve)|game|s))?|e(?:r(?:g(?:etic(?:(?:ally|s))?|i(?:s(?:ing|e(?:(?:rs?|d))?)|es)|y)|vat(?:ing|ed?))|m(?:ies|as?|y))|igma(?:(?:tic(?:ally)?|s))?|l(?:i(?:ghten(?:(?:ment|ing|ed|s))?|ven(?:(?:ing|ed|s))?|st(?:(?:ment|ing|ed|s))?)|a(?:rg(?:e(?:(?:ments?|d|r|s))?|ing)|ce))|ha(?:nc(?:e(?:(?:ments?|able|rs?|d|s))?|ing)|rmonic)|jo(?:y(?:(?:ab(?:ility|l[ey])|ments?|ing|e[rd]|s))?|in(?:(?:ing|ed|s))?)|u(?:mera(?:t(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|ble)|nciat(?:i(?:ng|on)|ed?))|g(?:a(?:g(?:e(?:(?:ments?|s|d))?|ing(?:ly)?)|rde)|e(?:nder(?:(?:ing|ed|s))?|ls)|ine(?:(?:er(?:(?:ing|ed|s))?|s|d))?|r(?:oss(?:(?:ing|ed))?|a(?:v(?:ings?|e(?:(?:rs?|d|s))?)|ined))|ulf(?:(?:ing|ed|s))?|orged?|l(?:ish|and))|quir(?:i(?:ng(?:ly)?|es)|e(?:(?:rs?|d|s))?|y)|r(?:ich(?:(?:ments?|ing|e[ds]))?|o(?:l(?:(?:ments?|l(?:(?:ing|ed|s))?|s))?|ute|bed?)|a(?:ptured|g(?:ing|e(?:[sd])?)))|s(?:lav(?:e(?:(?:ment|d|s))?|ing)|hr(?:oud(?:ed)?|in(?:ing|e(?:[ds])?))|conced?|embles?|nar(?:ing|ed?|l)|u(?:r(?:ing|e(?:[sd])?)|ing|e(?:[sd])?)|igns?)|o(?:rm(?:ous(?:ly)?|it(?:ies|y))|u(?:nce[ds]|gh))|a(?:ct(?:(?:ments?|ing|ed|s))?|m(?:el(?:(?:led|s))?|oured)|bl(?:ing|e(?:[sd])?))|n(?:obl(?:ing|e(?:[ds])?)|eads|ui)|zym(?:atic|es?)|m(?:eshed|it(?:ies|y)|asse)|wrap)|x(?:t(?:(?:r(?:a(?:(?:terr(?:estrials?|itorial)|linguistic|ordinar(?:ily|y)|polat(?:i(?:ons?|ng)|ed?)|c(?:ellular|t(?:(?:able|i(?:ons?|ve|ng)|ed|or|s))?)|galactic|judicial|vagan(?:ces?|t(?:ly)?|zas?)|dit(?:able|i(?:ng|on)|ed?)|m(?:arital|ural)|s(?:olar)?|neous))?|i(?:nsic(?:ally)?|cat(?:i(?:ng|on)|ed?))|over(?:sion|ts?)|em(?:i(?:t(?:ies|y)|s(?:ts?|m))|e(?:(?:ly|st?))?|al?)|u(?:sions?|ded?))|e(?:r(?:minat(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|n(?:(?:al(?:(?:ised|ly|s))?|s))?|iors?)|n(?:d(?:(?:ab(?:ility|le)|i(?:ble|ng)|e(?:rs?|d)|s))?|s(?:i(?:b(?:ility|le)|on(?:(?:al(?:ly)?|s))?|ve(?:(?:ness|ly))?)|ors)|uat(?:i(?:ng|on)|ed?)|ts?))|i(?:n(?:guish(?:(?:ment|e(?:rs?|d|s)|ing))?|ct(?:ions?)?)|rpat(?:ion|e))|o(?:rt(?:(?:i(?:on(?:(?:ate(?:ly)?|ists))?|ng)|ed|s))?|l(?:(?:l(?:ing|ed)|s))?)))?|i(?:st(?:(?:e(?:n(?:t(?:ial(?:(?:is(?:t(?:ic)?|m)|ly))?)?|ces?)|d)|ing|s))?|g(?:en(?:c(?:ies|y)|t)|uous)|t(?:(?:ing|ed|s))?|l(?:ing|e(?:[sd])?))|p(?:e(?:r(?:i(?:ment(?:(?:a(?:l(?:(?:ists?|ly))?|tion)|e(?:rs?|d)|ing|s))?|en(?:c(?:ing|e(?:[ds])?)|tial))|t(?:(?:ness|ise|ly|s))?)|ct(?:(?:a(?:tion(?:(?:al|s))?|n(?:c(?:ies|y)|t(?:ly)?))|orat(?:ion|ed?)|ing|ed|s))?|di(?:t(?:i(?:o(?:n(?:(?:ary|s))?|us(?:ly)?)|ng)|e(?:[ds])?)|en(?:ts?|c[ye]))|n(?:d(?:(?:i(?:tures?|ng)|able|ed|s))?|s(?:ive(?:ly)?|es?))|l(?:(?:l(?:ing|ed)|s))?)|r(?:ess(?:(?:i(?:on(?:(?:less(?:ly)?|is(?:t(?:(?:ic|s))?|m)|s))?|ve(?:(?:ness|ly))?|ble|ng)|e[ds]|ly))?|opriat(?:ions?|ed?))|o(?:(?:nent(?:(?:ia(?:tion|l(?:ly)?)|s))?|s(?:tulat(?:i(?:ons?|ng)|ed?)|i(?:t(?:ions?|ory)|ng)|ures?|e(?:[sd])?)|rt(?:(?:ab(?:ility|le)|e(?:rs?|d)|ing|s))?|und(?:(?:ing|ed|s))?))?|a(?:n(?:d(?:(?:ab(?:ility|le)|ing|e[dr]|s))?|s(?:i(?:ve(?:(?:ness|ly))?|on(?:(?:ary|is[mt]|s))?|ble)|es?))|triate(?:[ds])?)|l(?:o(?:it(?:(?:a(?:ti(?:ons?|ve)|ble)|ing|e(?:rs?|d)|s))?|si(?:ve(?:(?:ness|ly|s))?|ons?)|r(?:a(?:t(?:ions?|ory)|ble)|e(?:(?:rs?|d|s))?|ing)|d(?:e(?:(?:rs?|d|s))?|ing))|a(?:nat(?:ions?|ory)|in(?:(?:able|ing|ed|s))?)|ic(?:it(?:(?:ness|ly))?|a(?:t(?:i(?:on|ve)|ed?)|ble))|etives?)|u(?:rgat(?:ing|ed?)|lsions?|ng(?:ing|e(?:[ds])?))|i(?:r(?:at(?:ory|ion)|ing|e(?:[sd])?|y)|at(?:ion|ory|e)))|c(?:ommunicat(?:i(?:ng|on)|ed?)|r(?:uciati(?:ng(?:ly)?|on)|ete)|e(?:pt(?:(?:i(?:on(?:(?:a(?:ble|l(?:ly)?)|s))?|ng)|ed|s))?|l(?:(?:l(?:e(?:n(?:c(?:ies|y|e)|t(?:ly)?)|d)|ing)|s(?:ior)?))?|ed(?:(?:ing(?:ly)?|ed|s))?|ss(?:(?:ive(?:ly)?|es))?|rpt(?:(?:ed|s))?)|l(?:u(?:si(?:v(?:e(?:(?:ness|ly))?|i(?:st|ty))|on(?:(?:ary|s))?)|d(?:ing|e(?:[ds])?))|a(?:mat(?:ions?|ory)|im(?:(?:ing|ed|s))?))|u(?:rs(?:ion(?:(?:ists|s))?|us)|s(?:able|ing|e(?:[sd])?))|h(?:ang(?:e(?:(?:able|rs?|d|s))?|ing)|equer)|i(?:t(?:a(?:b(?:ility|le)|tions?)|e(?:(?:ments?|d(?:ly)?|s))?|ing(?:ly)?|on)|s(?:i(?:ng|on)|ed?))|avat(?:i(?:ons?|ng)|ors?|ed?))|e(?:mp(?:l(?:if(?:i(?:cation|e[ds])|y(?:ing)?)|ar(?:[sy])?)|t(?:(?:i(?:ons?|ng)|ed|s))?)|cut(?:i(?:on(?:(?:ers?|s))?|ves?|ng)|able|ors?|e(?:[ds])?)|r(?:cis(?:able|ing|e(?:[drs])?)|t(?:(?:i(?:ons?|ng)|ed|s))?)|ge(?:tical|sis)|unt|s)|h(?:i(?:bit(?:(?:i(?:on(?:(?:is(?:ts?|m)|ers?|s))?|ng)|ors?|ed|s))?|larat(?:i(?:ng|on)|ed?))|a(?:ust(?:(?:i(?:ve(?:ly)?|ble|on|ng)|ed|s))?|l(?:ations?|ing|e(?:[sd])?))|ort(?:(?:ations?|ing|ed|s))?|u(?:m(?:ation|ing|e(?:[sd])?)|sband))|o(?:t(?:hermic(?:ally)?|ic(?:(?:a(?:lly)?|ism))?)|r(?:bitant(?:ly)?|cis(?:ing|ed?|ms?|t))|genous(?:ly)?|nerat(?:i(?:ng|on)|e(?:[sd])?)|skeleton|crine|d(?:erm|us))|a(?:ggerat(?:e(?:(?:d(?:ly)?|s))?|i(?:ons?|ng))|sperat(?:e(?:d(?:ly)?)?|i(?:ng|on))|c(?:erbat(?:i(?:ng|on)|e(?:[ds])?)|t(?:(?:i(?:tude|ng|on)|ness|ly|ed|s))?)|m(?:(?:in(?:a(?:tions?|ble)|e(?:(?:es|rs?|d|s))?|ing)|ples?|s))?|lt(?:(?:ation|ing|ed|s))?)|quisite(?:(?:ness|ly))?|foliation|u(?:beran(?:t(?:ly)?|ce)|lt(?:(?:ing(?:ly)?|a(?:tion|nt(?:ly)?)|ed|s))?|d(?:ing|ate|e(?:[sd])?))|members?|wi(?:ves|fe))|c(?:c(?:lesiastic(?:al(?:ly)?)?|entric(?:(?:it(?:ies|y)|ally|s))?)|o(?:nom(?:i(?:s(?:ation|ing|ts?|e(?:[sd])?)|c(?:(?:al(?:ly)?|s))?|es)|etrics?|y)|log(?:i(?:cal(?:ly)?|sts?)|y)|systems?)|sta(?:tic(?:ally)?|s(?:ies|y))|u(?:meni(?:cal(?:ly)?|sm)|ador)|h(?:i(?:noderms?|dnas?)|elons?|o(?:(?:i(?:ng|c)|ed))?)|l(?:ectic(?:ism)?|ip(?:s(?:ing|e(?:[ds])?)|tic)|airs?)|top(?:lasm|ic)|zema)|a(?:r(?:(?:th(?:(?:s(?:ha(?:ttering|king))?|e(?:n(?:ware)?|d)|quakes?|w(?:or(?:ms?|ks?)|ards)|l(?:ings?|y)|in(?:ess|g)|bound|y))?|s(?:(?:plitting|hot))?|n(?:(?:e(?:st(?:(?:ness|ly))?|rs?|d)|ings?|s))?|mark(?:(?:ing|ed))?|p(?:hones?|ieces?|lugs?)|aches?|dr(?:ops?|ums?)|holes|l(?:(?:doms?|ie(?:st|r)|obes?|s|y))?|rings?|w(?:igs?|ax)|ful|ed))?|ves(?:drop(?:(?:p(?:e(?:rs?|d)|ing)|s))?)?|s(?:t(?:(?:er(?:(?:n(?:(?:most|ers))?|ly))?|bound|wards?|ing))?|e(?:(?:ments?|ls?|d|s))?|y(?:going)?|i(?:n(?:ess|g)|e(?:st|r)|ly))|g(?:er(?:(?:ness|ly))?|le(?:(?:ts?|s))?)|t(?:(?:ings?|a(?:ble|ge)|e(?:r(?:[ys])?|n)|s))?|ch)|d(?:uc(?:at(?:i(?:on(?:(?:al(?:(?:ists?|ly))?|ists?|s))?|ng|ve)|ors?|e(?:[ds])?)|tion)|i(?:t(?:(?:or(?:(?:ial(?:(?:ised|ly|s))?|s(?:hips?)?))?|able|i(?:ons?|ng)|ed|s))?|f(?:i(?:c(?:ation|es?)|e[sd])|y(?:ing)?)|b(?:ility|les?)|son|cts?)|g(?:e(?:(?:less|w(?:ays|ise)|d|s))?|i(?:n(?:ess|gs?)|ly|er)|y)|d(?:y(?:ing)?|ie[sd])|e(?:ma|n))|p(?:i(?:d(?:e(?:mi(?:olog(?:i(?:cal|sts?)|y)|cs?)|rm(?:al|is))|ural)|s(?:t(?:em(?:olog(?:ical|y)|ic)|olary|les?)|copa(?:l(?:ian)?|te|cy)|od(?:ic(?:ally)?|es?))|ph(?:enomen(?:on|a)|anies)|g(?:ra(?:m(?:(?:matic|s))?|ph(?:(?:ical|y))?)|enetic|on(?:es)?)|nephrine|t(?:om(?:ise(?:[sd])?|e)|he(?:li(?:um|al)|t(?:(?:ic|s))?)|a(?:x(?:ial|y)|p(?:hs?)?))|l(?:ep(?:tics?|sy)|ogue)|c(?:(?:ycl(?:oid|es)|entre|ure(?:an)?|a(?:lly|rp)|s))?)|aulettes|h(?:emer(?:al?|is)|or)|silon|o(?:x(?:ies|y)|ch(?:(?:al|s))?))|u(?:ph(?:emis(?:tic(?:ally)?|ms?)|o(?:n(?:i(?:ums?|ous)|y)|ri[ac]))|t(?:hanasia|ectic)|log(?:i(?:s(?:tic|ing|es?)|es)|y)|karyot(?:ic|es?)|calyptus|genics?|r(?:asian?|o(?:pe(?:an)?)?|ydice|ekas?)|nuchs?)|g(?:alitarian(?:(?:ism|s))?|o(?:(?:centric(?:ity)?|tis(?:t(?:(?:ic(?:al(?:ly)?)?|s))?|m)|mania(?:cs?)?|is(?:t(?:(?:ic|s))?|m)))?|g(?:(?:s(?:hells?)?|heads|ing|ed))?|re(?:gious|ts?|ss)|ypt(?:ian)?)|i(?:g(?:en(?:functions?|states?|values?)|ht(?:(?:pence|een(?:th)?|fold|ie(?:th|s)|y|s|h))?)|steddfod|de(?:r(?:down)?|tic)|nstein|ther|re)|m(?:b(?:a(?:r(?:rass(?:(?:ing(?:ly)?|ments?|e(?:d(?:ly)?|s)))?|k(?:(?:ation|ing|ed|s))?|go(?:ed)?)|nk(?:ments?)?|lm(?:(?:e(?:rs?|d)|ing|s))?|ss(?:ies|y)|ttled?)|e(?:llish(?:(?:ments?|ing|ed))?|zzl(?:e(?:(?:ment|rs?|d))?|ing)|d(?:(?:d(?:ings?|able|ed)|s))?|rs?)|r(?:yo(?:(?:log(?:ical|y)|n(?:al|ic)))?|o(?:i(?:der(?:(?:e(?:rs|d)|i(?:es|ng)|y))?|l(?:(?:ing|ed))?)|cation)|a(?:c(?:ing|e(?:[ds])?)|sure))|itter(?:(?:ment|ing|ed))?|o(?:d(?:i(?:ments?|e[ds])|y(?:ing)?)|l(?:den(?:(?:ing|ed|s))?|ism)|s(?:s(?:ed)?|om))|l(?:em(?:(?:atic|s))?|azoned))|p(?:l(?:oy(?:(?:ab(?:ility|le)|ments?|e(?:es?|rs?|d)|ing|s))?|acements?)|ath(?:etic(?:al)?|i(?:s(?:ing|e)|c)|y)|h(?:a(?:tic(?:ally)?|s(?:is(?:(?:ing|e(?:[sd])?))?|es))|ysema)|ir(?:ic(?:(?:al(?:ly)?|is(?:ts?|m)))?|es?)|o(?:wer(?:(?:ment|ing|ed|s))?|ri(?:um|a))|t(?:y(?:(?:handed|ing))?|i(?:ness|e(?:st?|r|d)|ly))|erors?|ress)|a(?:n(?:cipat(?:i(?:ng|on)|ory?|e(?:[ds])?)|at(?:i(?:ons?|ng)|e(?:[ds])?))|sculat(?:i(?:ng|on)|ed?)|ciat(?:ion|ed?)|il(?:ed)?)|i(?:ss(?:i(?:vit(?:ies|y)|ons?)|ar(?:ies|y))|gr(?:a(?:t(?:i(?:on|ng)|ed?)|nts?)|es?)|nen(?:ces?|t(?:ly)?)|r(?:(?:ates?|s))?|t(?:(?:t(?:e(?:rs?|d)|ing)|s))?)|o(?:ti(?:on(?:(?:al(?:(?:i(?:sm|ty)|ly))?|less|s))?|ve(?:ly)?)|l(?:uments?|lient))|e(?:nd(?:ations?|ed)|r(?:g(?:e(?:(?:n(?:c(?:ies|e|y)|t)|s|d))?|ing)|alds?|itus|sion|y)|tic)|u(?:(?:l(?:si(?:fies|ons?)|at(?:i(?:ons?|ng)|ors?|e(?:[ds])?))|s))?|s)|s(?:c(?:h(?:atolog(?:ical|y)|ew(?:(?:ing|ed|s))?)|a(?:rp(?:(?:ments?|s))?|p(?:ology|e(?:(?:ment|es?|s|d))?|ades?|i(?:ng|s[mt]))|la(?:t(?:ors?|i(?:on|ng)|e(?:[ds])?)|de))|ort(?:(?:ing|ed|s))?|udo)|t(?:(?:a(?:blish(?:(?:ments?|ing|e[ds]))?|tes?)|range(?:ments?|d)|ima(?:t(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|ble)|uar(?:i(?:es|ne)|y)|e(?:em(?:(?:ed|s))?|rs?)|het(?:ic|e)|onia))?|oteric(?:a(?:lly)?)?|s(?:en(?:(?:tial(?:(?:is[mt]|ly|s))?|ces?))?|ay(?:(?:ists?|ed|s))?)|p(?:adrilles|ecial(?:ly)?|i(?:onage|ed)|lanade|ous(?:ing|al|e(?:[ds])?)|r(?:esso|it)|y(?:ing)?)|quires?|kimo|au)|t(?:ymolog(?:i(?:cal(?:ly)?|sts?|es)|y)|h(?:n(?:o(?:graph(?:ers?|ic|y)|centric|log(?:ical|y))|ic(?:(?:al(?:ly)?|ity))?)|o(?:log(?:i(?:cal|sts?)|y)|s)|er(?:(?:eal(?:ly)?|ised))?|i(?:c(?:(?:al(?:ly)?|ist|s))?|opia)|yl(?:ene)?|an(?:ol|e))|ern(?:al(?:ly)?|ity)|iquette|c(?:etera|h(?:(?:ings?|e(?:rs?|s|d)))?)|u(?:des|i)|na|al?)|v(?:a(?:n(?:geli(?:cal(?:(?:ism|s))?|s(?:ation|ing|t(?:(?:ic|s))?|m|e))|escent)|lua(?:t(?:i(?:on(?:(?:al|s))?|ve|ng)|ors?|e(?:[ds])?)|ble)|cu(?:at(?:i(?:ons?|ng)|ed?)|ees?)|porat(?:i(?:ng|on)|or|e(?:[sd])?)|si(?:ve(?:(?:ness|ly))?|ons?)|d(?:able|ing|e(?:(?:rs?|s|d))?))|e(?:(?:r(?:(?:increasing|l(?:asting(?:ly)?|iving)|changing|present|y(?:(?:where|thing|body|day|one))?|greens?|more|sion|ting|est))?|n(?:(?:t(?:(?:ual(?:(?:it(?:ies|y)|ly))?|ful|i(?:de|ng)|s))?|handed|ings?|ness|s(?:ong)?|ly|e[rd]))?|s))?|o(?:l(?:ut(?:ion(?:(?:ar(?:ily|y)|is(?:ts?|m)|s))?|e)|v(?:ing|e(?:[sd])?))|cati(?:ve(?:ly)?|ons?)|k(?:ing|e(?:[sd])?))|i(?:scerate|den(?:t(?:(?:ial|ly))?|ce(?:[ds])?)|ct(?:(?:i(?:ons?|ng)|ed|s))?|l(?:(?:doer|ness|ly|s))?|nc(?:ing|e(?:[sd])?)))|ff(?:e(?:ct(?:(?:i(?:ve(?:(?:ness|ly))?|ng)|ual(?:ly)?|ors?|ed|s))?|r(?:vescen(?:ce|t)|ent)|mina(?:te|cy)|te)|i(?:c(?:ien(?:c(?:ies|y)|t(?:ly)?)|ac(?:ious|y))|g(?:ies|y))|ort(?:(?:less(?:ly)?|s))?|u(?:si(?:ve(?:ly)?|ons?)|lgen(?:ce|t))|rontery|lu(?:ents?|xion|via)|ac(?:ing|ed?))|qu(?:e(?:strian(?:ism)?|rry)|i(?:l(?:ibr(?:ati(?:ng|on)|i(?:um|a))|ateral)|p(?:(?:artition|ments?|p(?:ing|ed)|s))?|v(?:oca(?:t(?:i(?:ons?|ng)|ed)|l)|alen(?:ces?|t(?:(?:ly|s))?))|angular|distant|n(?:o(?:ctial|x(?:es)?)|e)|t(?:abl[ey]|ies|y))|a(?:l(?:(?:i(?:s(?:ation|ing|e(?:(?:rs?|d))?)|t(?:ies|y))|l(?:ing|ed|y)|s))?|t(?:or(?:ial)?|i(?:ons?|ng)|e(?:[sd])?)|nimity|bl[ye]))|r(?:g(?:(?:o(?:(?:nomic(?:(?:ally|s))?|phobia|dic|t))?|s))?|a(?:(?:dicat(?:i(?:ng|on)|ed?)|s(?:(?:able|ures?|ing|e(?:(?:rs?|s|d))?))?))?|r(?:(?:a(?:t(?:ic(?:ally)?|um|a)|n(?:ds?|t))|o(?:neous(?:ly)?|rs?)|ing|ed|s))?|ysipelas|o(?:tic(?:(?:a(?:lly)?|ism))?|genous|s(?:(?:i(?:on(?:(?:al|s))?|ve)|e))?|d(?:ing|e(?:[sd])?))|e(?:ct(?:(?:i(?:ons?|le|ng)|ly|e[rd]|s))?)?|s(?:t(?:while)?|atz)|u(?:dit(?:ion|e)|pt(?:(?:i(?:ons?|ng|ve)|ed|s))?)|i(?:trea|cas?)|mine|bium)|ye(?:(?:w(?:itness(?:es)?|ash)|catching|glass(?:es)?|l(?:ash(?:es)?|e(?:vel|ts?|ss)|i(?:ner|ke|ds?))|s(?:(?:hadow|ight|ores?))?|b(?:alls?|rows?)|p(?:atch|iece)|t(?:eeth|ooth)|ing|ful|d))?|b(?:ullien(?:ce|t)|b(?:(?:tide|ing|ed|s))?|ony)|ject(?:(?:i(?:ons?|ng)|ors?|ed|s))?|e(?:l(?:(?:worms?|s))?|r(?:i(?:ness|e(?:(?:st|r))?|ly)|y))|k(?:ing|ed?)|o(?:sin|ns?)|wes?)|i(?:n(?:s(?:(?:t(?:i(?:tut(?:i(?:on(?:(?:al(?:(?:is(?:ation|ing|ed?|m)|ly))?|s))?|ng)|e(?:[ds])?)|nct(?:(?:ive(?:ly)?|ual|s))?|l(?:(?:l(?:ation|ing|ed|s)|s))?|gat(?:ors?|i(?:on|ng)|e(?:[ds])?))|ru(?:ment(?:(?:a(?:l(?:(?:i(?:sts?|ty)|ly|s))?|tion)|ed|s))?|ct(?:(?:i(?:on(?:(?:al|s))?|ve|ng)|ors?|ed|s))?)|a(?:n(?:t(?:(?:aneous(?:ly)?|iat(?:i(?:ons?|ng)|e(?:[sd])?)|ly|s))?|c(?:e(?:[ds])?|y))|l(?:l(?:(?:a(?:tions?|ble)|e(?:rs?|d)|ing|s))?|ments?)|bilit(?:ies|y)|ted)|e(?:ps?|ad))|u(?:r(?:rection(?:(?:ary|s))?|mountabl[ye]|ances?|gen(?:cy|ts?)|e(?:(?:rs?|s|d))?|ing)|b(?:ordinat(?:ion|e)|stantial)|ff(?:icien(?:t(?:ly)?|cy)|erabl[ye])|p(?:portable|erable)|l(?:t(?:(?:ing(?:ly)?|e[dr]|s))?|a(?:r(?:ity)?|t(?:i(?:ng|on)|ors?|e(?:[ds])?)|nt)|in))|i(?:g(?:ni(?:fican(?:t(?:ly)?|ce)|a)|ht(?:(?:ful|s))?)|n(?:uat(?:i(?:ng(?:ly)?|ons?)|ed?)|cer(?:ity|e(?:ly)?))|st(?:(?:e(?:n(?:t(?:ly)?|ce)|d)|ing|s))?|d(?:ious(?:ly)?|e(?:(?:out|rs?|s))?)|pid)|cr(?:utab(?:ility|l[ye])|i(?:ptions?|b(?:ing|ed?)))|p(?:ir(?:ation(?:(?:al|s))?|ing|e(?:[ds])?)|ect(?:(?:or(?:(?:ates?|s))?|i(?:ons?|ng)|ed|s))?)|e(?:nsi(?:tiv(?:ity|e(?:ly)?)|b(?:ility|l[ey]))|c(?:t(?:(?:i(?:vor(?:ous|es)|cid(?:es?|al))|s))?|ur(?:it(?:ies|y)|e(?:ly)?))|mination|parabl[ye]|rt(?:(?:i(?:ons?|ng)|ed|s))?|ts?)|o(?:l(?:ven(?:c(?:ies|y)|t)|ub(?:ility|le)|e(?:n(?:t(?:ly)?|ce))?)|ucian(?:ce|t)|mnia(?:cs?)?|far)|a(?:lubrious|n(?:it(?:ary|ies|y)|e(?:ly)?)|tiabl[ey])|hore))?|t(?:e(?:r(?:(?:n(?:(?:a(?:tional(?:(?:is(?:ation|ts?|ed|m)|ly|s))?|l(?:(?:is(?:ation|ing|e(?:[sd])?)|ly|s))?)|uclear|ments?|e(?:es|d|t)|ing|s))?|d(?:e(?:nominational|p(?:artmental|enden(?:c[ye]|t)))|i(?:sciplinary|ct(?:ed)?))|r(?:e(?:lat(?:ion(?:s(?:hips?)?)?|e(?:d(?:ness)?)?)|gnum|d)|upt(?:(?:i(?:bility|ons?|ng)|ed|s))?|ogat(?:i(?:ve(?:(?:ly|s))?|ons?|ng)|or(?:[ys])?|e(?:[sd])?)|acial)|c(?:o(?:n(?:nect(?:(?:ed(?:ness)?|i(?:ons?|ng)|s))?|tinental|version)|m(?:municat(?:ion|e))?|llegiate|u(?:ntry|rse))|hang(?:e(?:(?:ab(?:ility|l[ye])|s|d))?|ing)|e(?:ssions?|pt(?:(?:i(?:ons?|ng)|ors?|ed|s))?|d(?:ing|ed?))|ity|ut)|g(?:overnmental|alactic|lacial)|p(?:ret(?:(?:a(?:ti(?:on(?:(?:al|s))?|ve)|ble)|i(?:ve(?:ly)?|ng)|e(?:rs?|d)|s))?|e(?:netration|llation|rsonal)|o(?:lat(?:i(?:ons?|ng)|able|e(?:[sd])?)|s(?:i(?:tion|ng)|e(?:[ds])?))|la(?:netary|ys?))|o(?:perab(?:ility|le)|cular)|v(?:en(?:tion(?:(?:is[tm]|s))?|ing|e(?:[ds])?)|iew(?:(?:ing|e(?:rs?|es?|d)|s))?|als?)|f(?:er(?:o(?:met(?:r(?:ic|y)|ers?)|n)|e(?:(?:nces?|d|r|s))?|ing)|ac(?:ing|e(?:[ds])?))|a(?:ct(?:(?:i(?:ve(?:(?:ness|ly))?|on(?:(?:al|s))?|ng)|ed|s))?|tomic)|s(?:t(?:i(?:tial(?:ly)?|ces)|ellar)|pers(?:ing|e(?:[sd])?)|ect(?:(?:i(?:ons?|ng)|ed|s))?)|m(?:olecular|i(?:ttent(?:ly)?|ssions?|n(?:gl(?:ing|ed)|abl[ye])|x(?:(?:ing|ed))?)|e(?:dia(?:r(?:ies|y)|tes?)|nts?)|arriages?)|ject(?:(?:i(?:on(?:(?:al|s))?|ng)|ed|s))?|l(?:o(?:c(?:utor(?:[ys])?|k(?:(?:ing|ed|s))?)|pers?)|in(?:gual|ked)|eav(?:ing|e(?:[sd])?)|a(?:c(?:ing|ed?)|p)|udes?)|est(?:(?:ing(?:ly)?|ed(?:ly)?|s))?|b(?:re(?:ed(?:ing)?|d)|ank)|w(?:eaving|oven)|t(?:win(?:ing|ed?)|idal)|i(?:ors?|ms?)))?|n(?:s(?:i(?:f(?:i(?:cation|e[sd])|y(?:ing)?)|ve(?:ly)?|t(?:ies|y))|e(?:ly)?)|t(?:(?:ion(?:(?:al(?:(?:ity|ly))?|ed|s))?|ness|ly|s))?|d(?:(?:ing|ed|s))?)|ll(?:ig(?:ib(?:ility|l[ye])|en(?:t(?:(?:sia|ly))?|ces?))|ect(?:(?:ual(?:(?:i(?:ty|sm)|ly|s))?|s))?)|g(?:r(?:a(?:t(?:i(?:on(?:(?:ist|s))?|ve|ng)|ors?|e(?:[ds])?)|b(?:ility|le)|l(?:(?:ly|s))?|nds?)|ity)|ers?)|mpera(?:nce|te)|st(?:in(?:al|es?)|a(?:cy|te)))|r(?:o(?:(?:specti(?:ve(?:ly)?|on)|duc(?:t(?:ions?|ory)|ing|e(?:[ds])?)|ver(?:sion|t(?:(?:ed|s))?)))?|a(?:c(?:tab(?:ility|l[ye])|ellular)|venous(?:ly)?|nsi(?:gen(?:ce|t)|tive)|mu(?:scular|ral)|uterine)|u(?:si(?:ve(?:ness)?|ons?)|d(?:e(?:(?:rs?|d|s))?|ing))|i(?:nsic(?:ally)?|gu(?:ing(?:ly)?|e(?:[ds])?)|ca(?:te(?:ly)?|c(?:ies|y)))|epid(?:ly)?)|uit(?:i(?:ve(?:(?:ness|ly))?|on(?:(?:ist|s))?)|ed)|o(?:(?:xica(?:t(?:i(?:on|ng)|ed?)|nts?)|n(?:ation(?:(?:al|s))?|ing|e(?:[sd])?)|lera(?:n(?:ce|t)|bl[ye])))?|i(?:m(?:idat(?:ory|i(?:on|ng)|e(?:[sd])?)|a(?:t(?:i(?:ons?|ng)|e(?:(?:ly|d|s))?)|c(?:ies|y)))|fada)|a(?:ngibles?|glio|kes?|ct))|c(?:o(?:m(?:p(?:re(?:hensi(?:b(?:ility|l[ye])|on)|ssible)|a(?:tib(?:ilit(?:ies|y)|l[ye])|rabl[ye])|lete(?:(?:ness|ly))?|eten(?:t(?:(?:ly|s))?|ce))|m(?:ensurable|unica(?:ble|do)|oding)|bustible|e(?:(?:rs?|s))?|ing)|n(?:s(?:picuous(?:(?:ness|ly))?|i(?:dera(?:te(?:(?:ness|ly))?|ble)|sten(?:c(?:ies|y)|t(?:ly)?))|equential(?:ly)?|olabl[ye]|tan(?:cy|t))|t(?:rovertibl[ye]|inen(?:t(?:ly)?|ce)|establ[ye])|venien(?:c(?:ing|e(?:[sd])?)|t(?:ly)?)|c(?:lusive(?:ly)?|eivabl[ye])|gru(?:ous(?:ly)?|it(?:ies|y)))|r(?:r(?:uptible|ect(?:(?:ness|ly))?|igibl[ye])|pora(?:t(?:i(?:on|ng)|e(?:[sd])?)|ble))|heren(?:t(?:ly)?|c[ye])|gnito)|r(?:e(?:ment(?:(?:a(?:tion|l(?:ly)?)|ing|ed|s))?|d(?:ul(?:ous(?:ly)?|ity)|ibl[ey])|as(?:ing(?:ly)?|e(?:[ds])?))|iminat(?:i(?:on|ng)|e(?:[sd])?))|e(?:s(?:t(?:(?:uous(?:ness)?|s))?|sant(?:ly)?)|n(?:diar(?:ies|y)|tives?|s(?:ing|e(?:[ds])?))|ption)|a(?:(?:pa(?:cit(?:at(?:i(?:on|ng)|e(?:[sd])?)|y)|b(?:ility|le))|n(?:descen(?:t(?:ly)?|ce)|t(?:at(?:ions?|ory))?)|r(?:cerat(?:i(?:on|ng)|ed)|nat(?:ions?|ed?))|utious(?:ly)?|lculabl[ye]|s(?:ed)?))?|l(?:u(?:si(?:ve(?:(?:ness|ly))?|ons?)|d(?:ing|e(?:[ds])?))|in(?:ations?|ing|e(?:[ds])?)|emen(?:cy|t))|i(?:s(?:i(?:ve(?:(?:ness|ly))?|ons?)|ors?|ed)|nerat(?:ors?|i(?:on|ng)|e(?:[sd])?)|den(?:t(?:(?:al(?:ly)?|s))?|ces?)|t(?:e(?:(?:ments?|rs?|s|d))?|ing)|pient)|u(?:r(?:(?:iously|s(?:ions?)?|abl[ey]|r(?:ing|ed)))?|lcat(?:i(?:on|ng)|ed?)|bat(?:i(?:ons?|ng)|ors?|ed?)|mben(?:cy|ts?))|h(?:(?:oate|ing|e[sd]))?)|d(?:u(?:str(?:i(?:al(?:(?:is(?:ation|ing|ts?|ed?|m)|ly))?|ous(?:(?:ness|ly))?|es)|y)|lg(?:e(?:(?:n(?:t(?:ly)?|ces?)|d|r|s))?|ing)|c(?:t(?:(?:i(?:ve(?:ly)?|ons?)|ance|ors?|ed|s))?|e(?:(?:ments?|s|d))?|i(?:ble|ng))|bitabl[ye]|na)|i(?:s(?:tin(?:guishabl[ye]|ct(?:(?:ness|ly))?)|p(?:ensab(?:ility|l[ye])|os(?:ition|ed?)|utabl[ye])|c(?:r(?:iminate(?:ly)?|e(?:tions?|et(?:ly)?))|ipline)|solubl[ye])|vi(?:dua(?:l(?:(?:i(?:s(?:t(?:(?:ic|s))?|ed|m)|ty)|ly|s))?|tion)|sib(?:ility|l[ye]))|fferen(?:t(?:ly)?|ce)|rect(?:(?:ness|ions?|ly))?|g(?:e(?:sti(?:ble|on)|nous)|n(?:it(?:ies|y)|a(?:tion|nt(?:ly)?))|o)|c(?:t(?:(?:ments?|able|ing|ed|s))?|a(?:t(?:i(?:ons?|ng|ve)|ors?|e(?:[ds])?)|nts?)|es)|a(?:n(?:[sa])?)?|te)|e(?:s(?:tructib(?:ility|le)|cribabl[ye])|termina(?:ble|te|cy)|c(?:i(?:si(?:ve(?:(?:ness|ly))?|on)|pherable)|linable|en(?:t(?:ly)?|cy)|orous)|p(?:enden(?:t(?:(?:ly|s))?|ce)|th)|f(?:atigable|in(?:ite(?:ly)?|abl[ye])|e(?:nsible|asible))|nt(?:(?:ations?|ures|ing|ed|s))?|bted(?:ness)?|mni(?:t(?:ies|y)|f(?:ied|y))|li(?:ca(?:cy|te)|bl[ey])|x(?:(?:ation|e(?:rs?|s|d)|ing))?|ed)|o(?:ctrinat(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|mitable|le(?:n(?:t(?:ly)?|ce))?|rse[ds]|ors?)|rawn|aba)|a(?:p(?:p(?:ropriate(?:(?:ness|ly))?|licab(?:ility|le))|tly)|rticula(?:te(?:ness)?|cy)|c(?:c(?:essib(?:ility|le)|ura(?:te(?:ly)?|c(?:ies|y)))|ti(?:v(?:at(?:i(?:on|ng)|ed)|ity|e)|on))|u(?:thenticity|spicious(?:ly)?|gura(?:t(?:i(?:on|ng)|e(?:[sd])?)|l)|dib(?:ility|l[ey]))|d(?:v(?:is(?:ab(?:ility|le)|edly)|erten(?:t(?:ly)?|ce))|missible|equa(?:te(?:ly)?|c(?:ies|y)))|ttenti(?:ve(?:ly)?|on)|lienable|bilit(?:ies|y)|n(?:i(?:mate|t(?:ies|y))|e(?:ly)?)|smuch)|e(?:x(?:t(?:inguishable|ricabl[ye]|ensible)|p(?:ressib(?:ility|l[ye])|e(?:r(?:ienced?|t(?:ly)?)|nsive(?:ly)?|dient)|licabl[ye])|orab(?:ility|l[ey])|haustibl[ye]|act(?:itudes?)?|cusabl[ye])|ff(?:ect(?:ual(?:(?:ness|ly))?|ive(?:(?:ness|ly))?)|icien(?:c(?:ies|y)|t(?:ly)?)|able)|vitab(?:ility|l[ey])|l(?:igib(?:ility|le)|uctabl[ye]|egan(?:t(?:ly)?|ce)|astic)|r(?:adicabl[ye]|t(?:(?:ness|ial?))?)|qu(?:alit(?:ies|y)|it(?:able|ies|y))|s(?:timabl[ye]|sential|capabl[ye])|briat(?:ion|ed?)|pt(?:(?:itude|ness|ly))?|dible)|v(?:ulnerab(?:ility|le)|i(?:s(?:ib(?:ilit(?:ies|y)|l(?:es?|y))|cid)|g(?:orat(?:ing(?:ly)?|ed?)|ilat(?:ors?|ing|ed?))|ola(?:b(?:ility|le)|te)|ncib(?:ility|le)|t(?:ations?|ing(?:ly)?|e(?:[sd])?)|dious)|e(?:st(?:(?:i(?:gat(?:i(?:ons?|ve|ng)|or(?:[ys])?|e(?:[sd])?)|ture|ng)|ments?|ors?|ed|s))?|r(?:t(?:(?:e(?:brates?|rs?|d)|i(?:ble|ng)|s))?|s(?:ions?|e(?:(?:ly|s))?))|nt(?:(?:i(?:ve(?:(?:ness|ly))?|ons?|ng)|or(?:(?:ies|s|y))?|ed|s))?|ctives?|ig(?:h(?:ing)?|l(?:e(?:(?:rs?|d))?|ing))|terate)|o(?:l(?:u(?:ntar(?:ily|y)|t(?:ions?|e))|v(?:e(?:(?:ments?|d|s))?|ing))|cations?|ic(?:ing|e(?:[ds])?)|k(?:able|e(?:(?:rs?|s|d))?|ing))|a(?:l(?:id(?:(?:at(?:i(?:on|ng)|e(?:[sd])?)|ity|ed|s))?|uable)|ria(?:bl[ey]|n(?:ce|ts?))|si(?:ons?|ve)|d(?:e(?:(?:rs?|s|d))?|ing)))|qu(?:i(?:sit(?:or(?:(?:ial(?:ly)?|s))?|i(?:ve(?:(?:ness|ly))?|on(?:(?:al|s))?))|r(?:i(?:ng(?:ly)?|es)|e(?:(?:rs?|d|s))?|y))|orate|ests?)|i(?:tia(?:l(?:(?:is(?:ations?|ing|e(?:[sd])?)|l(?:ed|y)|s))?|t(?:i(?:ves?|ons?|ng)|ors?|e(?:[ds])?))|quit(?:ous(?:ly)?|ies|y)|mi(?:tabl[ey]|cal))|h(?:o(?:mogene(?:it(?:ies|y)|ous)|spitable|use)|uman(?:(?:it(?:ies|y)|e(?:ly)?|ly))?|er(?:it(?:(?:a(?:nces?|ble)|ing|ors?|ed|s))?|ent(?:ly)?)|ibit(?:(?:i(?:ons?|ng)|or(?:[sy])?|ed|s))?|a(?:l(?:a(?:tions?|nt)|e(?:(?:rs?|s|d))?|ing)|bit(?:(?:a(?:nts?|ble)|ing|ed|s))?))|f(?:r(?:a(?:(?:structur(?:es?|al)|ctions?|red))?|ing(?:e(?:(?:ments?|d|s))?|ing)|equen(?:t(?:ly)?|cy))|o(?:rm(?:(?:a(?:t(?:i(?:ve(?:(?:ness|ly))?|on(?:al)?|cs)|ory)|l(?:(?:ity|ly))?|nts?)|e(?:rs?|d)|ing|s))?)?|i(?:nit(?:e(?:(?:simal(?:(?:ly|s))?|ly))?|i(?:ves?|es)|ude|y)|l(?:trat(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|l(?:ing)?)|del(?:(?:it(?:ies|y)|s))?|rm(?:(?:it(?:ies|y)|ar(?:ies|y)))?|ghting|eld|x)|e(?:licit(?:ous(?:ly)?|ies|y)|r(?:(?:en(?:tial(?:ly)?|ces?)|til(?:ity|e)|ior(?:(?:ity|s))?|n(?:al(?:ly)?|o)|r(?:ing|ed)|s))?|asib(?:ility|le)|st(?:(?:ations?|ing|ed|s))?|ct(?:(?:i(?:o(?:us(?:ly)?|ns?)|ng|ve)|ed|s))?)|u(?:riat(?:ing(?:ly)?|e(?:[ds])?)|s(?:i(?:ons?|ng)|e(?:[sd])?))|l(?:e(?:xi(?:b(?:ility|l[ey])|ons?)|ct(?:(?:i(?:on(?:(?:al|s))?|ng)|ed|s))?)|a(?:t(?:i(?:on(?:ary)?|ng)|able|e(?:[ds])?)|m(?:ma(?:t(?:ory|ion)|ble)|ing|e(?:[ds])?))|u(?:en(?:tial|c(?:ing|e(?:[ds])?)|za)|x(?:es)?)|ict(?:(?:i(?:ons?|ng)|e[dr]|s))?|ow(?:(?:ing|s))?)|a(?:llib(?:ility|l[ey])|tuat(?:ions?|ed?)|rct(?:ions?)?|n(?:t(?:(?:ry(?:m(?:en|an))?|i(?:cide|le)|s|e|a))?|cy)|m(?:ous(?:ly)?|y)))|g(?:r(?:a(?:t(?:i(?:at(?:ing(?:ly)?|ed?)|tude)|e)|ined)|e(?:dients?|ss(?:ion)?)|own)|e(?:n(?:u(?:ous(?:(?:ness|ly))?|ity)|ious(?:ly)?)|st(?:(?:i(?:ng|on)|ed))?)|athered|lorious|o(?:ing|ts?))|n(?:(?:o(?:c(?:uous(?:ness)?|en(?:t(?:(?:ly|s))?|ce))|vat(?:i(?:ve(?:ly)?|ons?|ng)|or(?:[sy])?|ed?))|u(?:mera(?:bl[ye]|cy|te)|endo)|er(?:(?:vation|most))?|keepers?|a(?:te(?:ly)?|rds)|ings|s))?|j(?:u(?:dicious(?:ly)?|r(?:i(?:ous(?:ly)?|es|ng)|e(?:[sd])?|y)|nctions?|stices?)|ect(?:(?:able|i(?:ons?|ng)|ed|or|s))?|okes?)|o(?:r(?:dinate(?:ly)?|ganic)|culat(?:i(?:ons?|ng)|e(?:[ds])?)|p(?:portune|era(?:tive|ble))|ffensive)|b(?:re(?:eding|d)|uilt|o(?:und|ard|rn))|u(?:ndat(?:ion|ed?)|red?|its?)|ward(?:(?:ness|ly|s))?|k(?:(?:s(?:tands?)?|lings?|wells?|p(?:ots?|ad)|i(?:e(?:st|r)|ng)|ed|y))?|put(?:(?:ting|s))?|r(?:oads?|ush)|m(?:ates?|ost)|l(?:ets?|a(?:ys?|ws?|nd|id)))|m(?:m(?:u(?:n(?:o(?:suppressi(?:ve|on)|compromised|deficiency|log(?:i(?:cal(?:ly)?|sts?)|y)|assay)|i(?:s(?:ations?|e(?:[ds])?)|t(?:ies|y))|e)|tab(?:ility|l[ey])|red)|o(?:bil(?:i(?:s(?:ation|ing|e(?:[srd])?)|ty)|e)|v(?:ab(?:ility|le)|eable)|r(?:tal(?:(?:i(?:sed|ty)|ly|s))?|al(?:(?:ity|ly))?)|de(?:rate(?:ly)?|st)|lat(?:ion|ed?))|e(?:dia(?:te(?:(?:ness|ly))?|cy)|asurabl[ye]|ns(?:it(?:ies|y)|e(?:(?:ness|ly))?)|morial|rs(?:i(?:ng|on)|e(?:[ds])?))|i(?:gra(?:t(?:i(?:ons?|ng)|ed?)|nts?)|nen(?:t(?:ly)?|ce)|scible)|a(?:culate(?:ly)?|nen(?:t(?:ly)?|ce)|t(?:erial|ur(?:e(?:ly)?|ity))))|p(?:(?:r(?:actica(?:l(?:(?:it(?:ies|y)|ly))?|b(?:ility|le))|o(?:v(?:i(?:s(?:at(?:ion(?:(?:al|s))?|ory)|ing|e(?:[ds])?)|den(?:ce|t)|ng)|e(?:(?:ments?|d|r|s))?|able)|bab(?:ilit(?:ies|y)|l[ey])|p(?:riet(?:ies|y)|er(?:ly)?)|mptu)|e(?:s(?:s(?:(?:i(?:on(?:(?:is(?:t(?:(?:ic|s))?|m)|able|s))?|ve(?:(?:ness|ly))?|ng)|e[ds]))?|ario)|c(?:is(?:e(?:(?:ness|ly))?|ion)|ations?)|gna(?:t(?:i(?:on|ng)|ed?)|bl[ye]))|i(?:son(?:(?:ments?|ing|ed|s))?|matur|nt(?:(?:ing|ed|s))?)|uden(?:t(?:ly)?|ce))|e(?:r(?:t(?:urbab(?:ility|l[ye])|inen(?:t(?:ly)?|ce))|sona(?:t(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|l(?:(?:ity|ly))?)|m(?:eab(?:ility|le)|issible|anen(?:ce|t))|i(?:ous(?:(?:ness|ly))?|al(?:(?:is(?:t(?:(?:ic|s))?|m)|ly))?|shable|l(?:led)?|um)|fect(?:(?:ions?|ly))?|ceptibl[ye]|ative(?:(?:ly|s))?|vious)|n(?:etrab(?:ility|l[ye])|d(?:ing)?)|ach(?:(?:ments?|e[ds]))?|tu(?:o(?:us(?:ly)?|sity)|s)|d(?:i(?:ment(?:[sa])?|ng)|ance|e(?:[sd])?)|c(?:unious|cabl[ey])|l(?:(?:l(?:ing|ed)|s))?)|o(?:s(?:sib(?:ilit(?:ies|y)|l[ey])|i(?:tions?|ng)|able|t(?:ers?|ors?)|e(?:[sd])?)|verish(?:(?:ment|ing|ed))?|rt(?:(?:un(?:ate(?:ly)?|ity|ed?)|a(?:tion|n(?:t(?:ly)?|ce)|ble)|e(?:rs?|d)|ing|s))?|nderables?|lit(?:e(?:ness)?|ic)|ten(?:t(?:ly)?|c[ey])|und(?:(?:ing|ed))?)|l(?:ement(?:(?:a(?:tions?|ble)|ing|e(?:rs?|d)|s))?|a(?:usib(?:ility|l[ye])|nt(?:(?:ation|ing|ed|s))?|cabl[ey])|i(?:c(?:at(?:i(?:ons?|ng)|e(?:[ds])?)|it(?:ly)?)|e(?:d(?:ly)?|s))|o(?:r(?:ing(?:ly)?|e(?:[ds])?)|d(?:ing|e(?:[ds])?)|sion)|y(?:ing)?)|u(?:ls(?:i(?:ve(?:(?:ness|ly))?|on)|es?)|t(?:ations?|ing|ed?)|den(?:t(?:ly)?|ce)|gn(?:(?:able|ing|ed))?|r(?:it(?:ies|y)|e)|nity)|a(?:ss(?:i(?:v(?:e(?:(?:ness|ly))?|ity)|oned)|able|e)|rt(?:(?:i(?:al(?:(?:ity|ly))?|ng)|ed|s))?|tien(?:t(?:ly)?|ce)|ir(?:(?:ments?|ing|ed|s))?|l(?:pable|ing|e(?:[srd])?|as?)|ct(?:(?:i(?:ng|on)|ed|s))?)|i(?:(?:ng(?:e(?:(?:ment|d|s))?|ing)|sh(?:(?:ness|ly))?|ous|ety))?|s))?|a(?:g(?:in(?:a(?:ti(?:ve(?:ly)?|ons?)|ble|ry)|ings?|e(?:[ds])?|g)|e(?:(?:ry|s|d))?|o)|ms?)|b(?:e(?:cil(?:i(?:t(?:ies|y)|c)|es?)|d(?:ded|s))|alance(?:[ds])?|roglio|ib(?:e(?:(?:rs?|d))?|ing)|ued?)|itat(?:i(?:ons?|ng|ve)|ors?|e(?:[ds])?))|d(?:io(?:syncra(?:tic(?:ally)?|s(?:ies|y))|m(?:(?:atic(?:ally)?|s))?|t(?:(?:ic(?:ally)?|s))?|pathic|c(?:ies|y)|lect)|e(?:nti(?:f(?:i(?:cations?|abl[ye]|e(?:rs?|d|s))|y(?:ing)?)|cal(?:ly)?|t(?:ies|y))|a(?:(?:l(?:(?:i(?:s(?:t(?:(?:ic(?:ally)?|s))?|ations?|ing|e(?:[ds])?|m)|ty)|ly|s))?|s))?|o(?:log(?:i(?:cal(?:ly)?|sts?|es)|ues?|y)|gra(?:ph(?:ic|s)|ms))|s|m)|yll(?:ic(?:ally)?)?|ol(?:(?:is(?:ation|ed?)|at(?:r(?:ous|y)|ers)|s))?|l(?:e(?:(?:ness|st?|rs?|d))?|ing|y)|aho|s)|r(?:r(?:e(?:s(?:p(?:onsib(?:ility|l[ye])|ective(?:ly)?)|ol(?:vable|ut(?:ion|e(?:ly)?))|istibl[ye])|v(?:er(?:sib(?:ility|l[ye])|en(?:t(?:ly)?|ce))|ocabl[ye])|p(?:r(?:oachabl[ye]|essibl[ye])|laceable|arabl[ye])|gular(?:(?:it(?:ies|y)|ly|s))?|d(?:ucib(?:ility|l[ye])|eemabl[ye])|co(?:ncilable|verabl[ye])|trievabl[ye]|m(?:ediable|ovable)|l(?:evan(?:t(?:ly)?|c(?:es?|y))|igious)|futable)|a(?:tional(?:(?:it(?:ies|y)|ly))?|diat(?:i(?:on|ng)|ed?))|i(?:ta(?:t(?:i(?:ng(?:ly)?|ons?)|e(?:(?:d(?:ly)?|s))?)|b(?:ility|l[ey])|nts?)|gat(?:i(?:ng|on)|ed?))|upt(?:ion|ed))|a(?:scib(?:ility|l[ey])|n(?:ians?)?|q(?:is?)?|te)|on(?:(?:monger(?:[ys])?|i(?:c(?:al(?:ly)?)?|ng|es)|s(?:tone)?|works?|lady|age|ed|y))?|k(?:(?:s(?:ome(?:ness)?)?|ing|ed))?|i(?:d(?:escen(?:ce|t)|ium)|s(?:(?:h(?:m(?:an|en))?|es))?)|e(?:land)?)|s(?:o(?:perimetrical|t(?:rop(?:ic(?:ally)?|y)|hermal(?:ly)?|o(?:nic|p(?:es?|ic)))|m(?:e(?:tr(?:ic(?:ally)?|y)|r(?:(?:ic|s))?)|orph(?:i(?:sms?|c))?)|lat(?:i(?:on(?:is[tm])?|ng)|ors?|e(?:[ds])?)|s(?:celes|tatic)|gram|bars?)|l(?:a(?:nd(?:(?:ers?|s))?|m(?:ic)?)|e(?:(?:ts?|s))?)|rael(?:is?)?|su(?:a(?:ble|nce)|ing|e(?:(?:rs?|s|d))?)|t(?:anbul|hmus)|is|ms|nt)|l(?:l(?:(?:e(?:g(?:i(?:tima(?:te(?:ly)?|cy)|b(?:ility|l[ey]))|al(?:(?:it(?:ies|y)|ly))?)|quipped)|u(?:s(?:tr(?:at(?:i(?:ons?|ve|ng)|ors?|e(?:[sd])?)|ious)|i(?:on(?:(?:ists?|s))?|ve)|ory)|min(?:a(?:t(?:i(?:ons?|ng)|e(?:[sd])?)|nt)|e))|ogic(?:al(?:(?:ity|ly))?)?|conceived|t(?:empered|reated)|mannered|i(?:tera(?:tes?|cy)|n(?:formed|ois)|mitable|beral|cit(?:ly)?|quid)|humoured|fa(?:voured|ted)|advised|behaved|defined|ness(?:es)?|s))?|menite|eum|iad|k)|c(?:o(?:n(?:(?:o(?:graph(?:ic(?:al)?|y)|clas(?:t(?:(?:ic|s))?|m))|ic|s))?|sahedr(?:on|al?))|e(?:(?:s(?:kat(?:ing|e))?|b(?:ergs?|ox)|c(?:ream|old|ap)|p(?:icks?|ack)|land|man|age|d))?|hneumon|i(?:n(?:ess|gs?)|cles?|e(?:st|r)|ly)|arus|y)|t(?:al(?:i(?:c(?:(?:is(?:ation|ed?)|s))?|ans?)|y)|inera(?:r(?:ies|y)|nts?)|e(?:rat(?:i(?:ve(?:ly)?|ons?|ng)|ors|e(?:[ds])?)|m(?:(?:is(?:ing|e(?:[ds])?)|s))?)|ch(?:(?:i(?:e(?:st|r)|ng)|e[sd]|y))?|s(?:elf)?|ll)|g(?:n(?:o(?:min(?:ious(?:ly)?|y)|r(?:a(?:mus(?:es)?|n(?:t(?:ly)?|ce)|ble)|ing|e(?:[sd])?)|bl[ye])|it(?:i(?:ng|on)|e(?:[srd])?)|eous)|uanas?|l(?:oos?|u))|o(?:n(?:(?:ospher(?:ic|e)|i(?:s(?:ation|ing|ed?)|an|c)|s))?|di(?:ne|de)|tas?)|a(?:trogenic|mb(?:us|ic))|v(?:or(?:ies|y)|ies|y|e)|b(?:e(?:rian?|x(?:es)?)|is(?:es)?|sen)|fs)|u(?:n(?:c(?:h(?:a(?:r(?:acteristic(?:ally)?|i(?:smatic|tabl[ye])|te(?:red|d)|ged)|llenge(?:able|d)|peroned|ng(?:e(?:able|d)|ing)|in(?:(?:ing|ed))?)|r(?:onicled|ist(?:ened|ian))|eck(?:able|ed))|o(?:n(?:s(?:t(?:itutional(?:ly)?|rained)|cio(?:us(?:(?:ness|ly))?|nabl[ye])|ecrated|idered|oled|umed)|t(?:ro(?:versial(?:ly)?|ll(?:abl[ye]|ed))|a(?:minated|inable)|e(?:ntious|sted))|v(?:e(?:ntional(?:ly)?|rted)|inc(?:ing(?:ly)?|ed))|dition(?:al(?:ly)?|ed)|quer(?:able|ed)|cern(?:ed(?:ly)?)?|nected|genial|f(?:i(?:rmed|ned)|used))|m(?:p(?:r(?:e(?:hending(?:ly)?|ssed)|omis(?:ing(?:ly)?|able))|etitive(?:ness)?|l(?:i(?:mentary|cated)|aining(?:ly)?|eted)|ilable)|fortabl(?:e(?:ness)?|y)|m(?:unicative|itted|on(?:ly)?)|ely|bed)|r(?:r(?:oborated|e(?:ct(?:able|ed)|lated)|upted)|ked)|o(?:rdinated|perative|ked)|ll(?:imated|ected|ated)|u(?:th(?:ness)?|nt(?:abl[ye]|ed)|pled?)|ver(?:(?:ing|ed|s))?|il(?:(?:ing|ed|s))?)|e(?:r(?:emoniously|tain(?:(?:t(?:ies|y)|ly))?)|lebrated|asing(?:ly)?|nsored)|l(?:a(?:s(?:sifi(?:able|ed)|p(?:ing|ed))|imed|d)|e(?:(?:a(?:n(?:l(?:iness|y))?|r(?:ed)?)|nch(?:(?:ing|ed))?|s(?:am)?))?|uttered|imb(?:able|ed)|o(?:uded|thed|sed|g))|i(?:rcumcised|vil(?:ised)?)|u(?:lt(?:ivated|ured)|r(?:led|ed)|t)|r(?:itical(?:ly)?|ushable|o(?:ss(?:(?:able|ed))?|w(?:ned|ded))|ackable|e(?:a(?:t(?:ive|ed)|sed)|dited))|a(?:talogued|l(?:ibrated|led)|n(?:celled|n(?:ily|y))|ught|r(?:ing|ed)|pped|sed)|t(?:uous(?:ly)?|ion))|e(?:n(?:t(?:husiastic(?:ally)?|ered)|lighten(?:ing|ed)|forceable|c(?:umbered|rypted)|d(?:urable|ing(?:ly)?)|viable|gaged)|x(?:c(?:eptiona(?:ble|l)|it(?:ing|ed))|p(?:ected(?:(?:ness|ly))?|l(?:ain(?:able|ed)|o(?:ited|ded|red))|urgated|ressed|anded|ired)|a(?:cting|mined))|s(?:tablished|corted)|qu(?:ivocal(?:ly)?|al(?:l(?:ed|y))?)|m(?:otional(?:ly)?|ploy(?:ment|able|ed))|v(?:en(?:(?:tful(?:ly)?|ness|ly))?|aluated)|conomic(?:al)?|thical(?:ly)?|r(?:gonomic|ring(?:ly)?)|lect(?:able|ed)|a(?:r(?:th(?:(?:ing|ly|ed|s))?|ned)|s(?:i(?:ness|e(?:st|r)|ly)|y|e)|t(?:able|en))|d(?:i(?:fying|ted)|ucated))|s(?:a(?:t(?:isf(?:actor(?:i(?:ness|ly)|y)|i(?:able|ed)|ying)|urated)|fe(?:(?:ness|ly))?|l(?:eable|ted)|nitary|v(?:o(?:ury|ry)|ed)|ddled|id)|y(?:mpathetic(?:ally)?|stematic)|e(?:l(?:f(?:conscious(?:ly)?|ish(?:(?:ness|ly))?)|ected|lable)|a(?:worthiness|sona(?:bl[ye]|l)|l(?:(?:able|ing|ed))?|t(?:ed)?)|rvice(?:able|d)|n(?:t(?:imental)?|sational)|e(?:ing(?:ly)?|mly|ded|n)|t(?:tl(?:ing|ed?))?|cured)|o(?:phisticat(?:ion|ed)|u(?:nd(?:ness)?|ght)|l(?:icited|v(?:able|ed)|d(?:er)?)|cia(?:ble|l)|rted|iled)|u(?:b(?:s(?:t(?:antia(?:ted|l)|ituted)|idised)|dued|tl[ye])|r(?:p(?:ris(?:ing(?:ly)?|ed)|ass(?:able|ed))|vivable|e(?:ness)?|faced)|it(?:ab(?:l(?:e(?:ness)?|y)|ility)|ed)|ccessful(?:ly)?|s(?:tainable|pect(?:ing|ed))|p(?:p(?:ort(?:able|ed)|ressed)|ervised)|llied|ng)|t(?:r(?:e(?:tchable|ssed)|uctured|apped)|i(?:nting(?:ly)?|mulated|cking|rred)|e(?:rilised|ad(?:i(?:ness|ly)|y))|opp(?:abl[ye]|ed)|a(?:ck(?:(?:ing|ed))?|mped|ined|ted|ble)|uck)|p(?:e(?:c(?:tacular|i(?:alised|fi(?:ed|c)))|akabl[ye]|nt)|o(?:rting|il(?:ed|t)|ken)|anned)|i(?:mplified|nkable|g(?:ht(?:ly|ed)|ned))|c(?:r(?:upulous|a(?:mbl(?:ing|e(?:[sd])?)|tched)|ew(?:(?:ing|ed))?|ipted)|ientific|heduled|a(?:thed|led))|w(?:e(?:rving(?:ly)?|etened)|appable)|m(?:iling(?:ly)?|ooth)|h(?:rinking|o(?:ckable|rn|d)|a(?:k(?:e(?:able|n)|able)|ckled|r(?:able|ed)|ve[nd]|pe[nd]|ded)|eathed|ielded)|kil(?:led|ful)|liced)|d(?:e(?:r(?:(?:s(?:t(?:a(?:nd(?:(?:ab(?:ility|l[ye])|ing(?:(?:ly|s))?|er|s))?|t(?:e(?:(?:ment|s|d))?|ing)|ffed)|o(?:cked|rey|od)|udy)|i(?:gned|des?|zed)|cored|kirt|ea)|p(?:erform(?:ance|ed)|ri(?:vileged|c(?:ing|ed))|o(?:pulat(?:ion|ed)|wered)|in(?:(?:n(?:ings?|ed)|s))?|lay(?:(?:ed|s))?|a(?:y(?:ing)?|nts|rts|ss|id))|n(?:ourish(?:ment|ed)|eath)|d(?:evelop(?:ment|ed)|o(?:ne|gs?))|a(?:chiev(?:ement|ing)|rm)|investment|e(?:stimat(?:i(?:on|ng)|e(?:[sd])?)|mp(?:loyment|hasis)|xploited|ducated)|g(?:r(?:aduates?|o(?:unds?|wth))|arments?|o(?:(?:ing|ne|es))?)|utilised|c(?:u(?:rrents?|t(?:(?:ting|s))?)|l(?:oth(?:ing|es)|ass)|arriage|o(?:at(?:ing)?|oked|ver)|roft)|w(?:r(?:it(?:ten|ing|e(?:(?:rs?|s))?)|ote)|e(?:ight|nt|ar)|ater|o(?:rld|od))|valu(?:ing|e[sd])|t(?:ak(?:ings?|e(?:(?:rs?|n|s))?)|o(?:nes?|ok))|l(?:i(?:n(?:ings?|e(?:[ds])?|gs?)|es?)|oaded|ying|a(?:in|y))|f(?:und(?:(?:ing|ed))?|lo(?:or|w)|rame|oot|ed)|m(?:in(?:ing|e(?:[ds])?)|anned)|b(?:elly|ody)|rated?|hand))?|m(?:o(?:cratic(?:ally)?|nstrative)|anding)|t(?:e(?:ct(?:ab(?:ility|l[ye])|ed)|r(?:mined|red))|onated)|c(?:id(?:ab(?:ility|le)|ed)|orated|eived|lared)|s(?:ir(?:ab(?:ility|l(?:es?|y))|ed)|erv(?:ed(?:ly)?|ing))|liver(?:able|ed)|veloped|f(?:i(?:n(?:able|ed)|led)|e(?:ated|nded))|niabl[ey]|ad)|i(?:s(?:c(?:riminat(?:ing|ed)|iplined|overed|erning|losed)|t(?:inguished|ributed|urbed|orted)|guised(?:ly)?|sipated|p(?:layed|uted)|mayed)|fferentiated|agnos(?:able|ed)|plomatic|minished|g(?:nified|ested)|rected|vided|luted|d)|r(?:inkab(?:ility|le)|oppable|ess(?:(?:ing|ed))?)|o(?:(?:mesticated|cumented|ubted(?:ly)?|ings?|ne))?|u(?:l(?:at(?:i(?:ons?|ng)|e(?:[sd])?)|y)|e)|a(?:unted|maged|ted)|ying)|a(?:tt(?:r(?:active(?:ness)?|ibut(?:able|ed))|en(?:uated|ded)|a(?:in(?:abl[ye]|ed)|ched))|c(?:c(?:o(?:unt(?:ab(?:ility|l[ye])|ed)|m(?:modating|panied))|ept(?:ab(?:ility|l[ye])|ed)|ustomed)|knowledged|quainted|hievable|tivated)|u(?:th(?:enticated|orised)|dited)|v(?:ail(?:ab(?:ility|le)|ing(?:ly)?)|oidabl[ye]|enged)|p(?:p(?:r(?:o(?:achable|ved)|eciat(?:ive|ed))|e(?:tising|a(?:ling|sed)))|ologetic|t)|r(?:ticulated|chived|guabl[ey]|oused|m(?:(?:ed|s))?|y)|n(?:ticipated|swer(?:able|ed)|no(?:unced|tated)|im(?:ous(?:ly)?|ity))|m(?:bi(?:gu(?:ous(?:ly)?|ity)|tious)|ended|used)|d(?:ve(?:nturous|rtised)|ulterated|dress(?:able|ed)|apt(?:ive|ed)|justed|orned)|s(?:s(?:ociated|ail(?:able|ed)|ertive|i(?:gned|sted)|u(?:aged|ming))|hamed(?:ly)?|ked)|f(?:f(?:ordable|iliated|ected(?:ly)?)|raid)|w(?:a(?:re(?:(?:ness|s))?|kened)|ed)|l(?:ter(?:abl[ye]|ed)|lo(?:cated|yed)|i(?:gned|ke))|esthetic|b(?:a(?:shed(?:ly)?|ted)|ridged|sorbed|le)|ided)|r(?:e(?:s(?:ponsive(?:ness)?|isting(?:ly)?|t(?:(?:r(?:icted|ained)|s))?|olv(?:able|ed)|erved(?:ly)?)|p(?:r(?:esent(?:a(?:tive|ble)|ed)|oducible)|e(?:at(?:ab(?:ility|le)|ed)|ntant(?:ly)?)|airable|orted)|a(?:son(?:abl(?:e(?:ness)?|y)|ing|ed)|l(?:i(?:s(?:tic(?:ally)?|able|ed)|ty))?|d(?:(?:ab(?:ility|le)|y))?|ch(?:able|ed))|c(?:o(?:n(?:structed|ciled)|gnis(?:abl[ye]|ed)|verable|mmended|rded)|e(?:ptive|ived))|f(?:r(?:igerated|eshed)|ere(?:nc(?:ing|ed)|ed)|lected|ormed|ined)|m(?:itting(?:ly)?|embered|ark(?:able|ed))|l(?:i(?:ab(?:ility|l[ey])|eved)|e(?:nting(?:ly)?|as(?:able|ed))|ated)|g(?:istered|enerate|ulated|arded)|ward(?:ing|ed)|v(?:eal(?:ing|ed)|ised)|qu(?:ested|ited)|hearsed|d(?:eemed|uced))|a(?:vel(?:(?:l(?:ing|ed)|s))?|isable)|i(?:valled|ddle|pe)|o(?:mantic|ll(?:(?:ing|ed))?)|u(?:l(?:iness|y)|ffled))|p(?:r(?:e(?:dict(?:ab(?:ility|l[ye])|ed)|p(?:ossessing|ared(?:ness)?)|cedented(?:ly)?|meditated|ten(?:tious|ding)|ssurised|judiced)|o(?:nounce(?:able|d)|f(?:essional|itabl[ye])|blematic|ductive|tected|m(?:ising|pted)|cessed|v(?:able|oked|e[nd]))|i(?:vileged|n(?:cipled|t(?:able|ed)))|acti(?:sed|cal))|l(?:eas(?:ant(?:(?:ness|ly))?|ing)|a(?:yab(?:ility|le)|nned|ced)|oughed|ug(?:g(?:ing|ed))?)|e(?:r(?:s(?:onalised|ua(?:sive|ded))|turbed|ceived)|eled)|u(?:n(?:ctual(?:ity)?|ished)|bli(?:sh(?:able|ed)|cised))|a(?:ste(?:urised|d)|r(?:donable|alleled|odied)|triotic|latable|i(?:nted|red|d)|ck(?:(?:ing|e(?:rs|d)|s))?|ved)|o(?:pula(?:r(?:ity)?|ted)|etical|l(?:ished|luted)|rtable)|hysical|ick(?:(?:ing|ed))?)|o(?:b(?:jectionable|t(?:rusive(?:ly)?|ainable)|s(?:tructed|erv(?:a(?:ble|nt)|ed))|liging)|r(?:iginal(?:ity)?|thodoxy?|ganised|dered)|fficial(?:ly)?|p(?:timised|posed|ened)|ccupied|wned)|i(?:n(?:t(?:e(?:r(?:rupted(?:ly)?|pret(?:able|ed)|est(?:ed(?:ly)?|ing))|n(?:tional(?:ly)?|ded)|ll(?:ig(?:ible|ent)|ectual))|uitive)|f(?:orm(?:ative(?:ly)?|ed)|luenced|ected)|corporated|itia(?:lised|ted)|h(?:ibited(?:ly)?|abit(?:able|ed))|s(?:u(?:r(?:able|ed)|lated)|pir(?:ing|ed))|v(?:ented|it(?:ing|ed)|olved)|jured)|m(?:p(?:lement(?:able|ed)|e(?:achable|ded)|r(?:ess(?:ive|ed)|oved)|ortan(?:ce|t)|aired)|agin(?:a(?:tive(?:ly)?|bl[ye])|ed))|d(?:irectional|e(?:ntifi(?:able|ed)|al))|l(?:lustrated|ateral(?:(?:is[tm]|ly))?)|vers(?:it(?:ies|y)|al(?:(?:i(?:ty|s[tm])|ly|s))?|es?)|on(?:(?:is(?:ation|ts?|ed|m)|s))?|f(?:i(?:cation|able|e[srd])|orm(?:(?:ity|ly|ed|s))?|y(?:ing)?)|c(?:ycl(?:ists?|es?)|ellular|ameral|orns?)|que(?:(?:ness|ly))?|s(?:sued|ons?|ex)|polar|t(?:(?:i(?:ng|es)|ary|e(?:[sd])?|s|y))?)|b(?:e(?:liev(?:ab(?:ility|l[ye])|ing|e(?:rs?|d))|known(?:st)?|a(?:rabl[ey]|t(?:able|en))|coming|n(?:d(?:ing)?|t))|r(?:eakab(?:ility|le)|id(?:ge(?:able|d)|led)|a(?:c(?:keted|ed)|nded)|uised|oken)|l(?:inking(?:ly)?|e(?:mished|ached)|o(?:ck(?:(?:ing|ed))?|odied))|u(?:tton(?:(?:ing|ed))?|r(?:den(?:(?:ing|ed))?|n(?:ed|t)|ied)|ckl(?:ing|ed?)|ndled)|i(?:as(?:sed(?:ly)?|ed(?:ly)?)|dden|nd)|a(?:lanc(?:ing|e(?:[ds])?)|ptised|nn(?:ing|ed)|r(?:(?:red|s))?)|o(?:thered|und(?:ed)?|oked|lt(?:ed)?|iled|wed|som|rn))|t(?:r(?:a(?:ns(?:portable|lat(?:able|ed)|formed)|mmelled|ppable|ce(?:able|d)|ined)|u(?:st(?:worthy|ed|y)|th(?:(?:ful(?:ly)?|s))?|e)|eat(?:able|ed)|o(?:ubled|dden)|ied)|o(?:(?:uch(?:ables?|ed)|ward|ld))?|h(?:oughtful|ink(?:ing(?:ly)?|abl[ye]))|e(?:rminated|n(?:ab(?:ility|le)|ded)|mpered|st(?:able|ed)|thered|xtured)|y(?:p(?:ical(?:ly)?|ed)|ing)|a(?:rnished|lented|ngl(?:ing|ed?)|inted|ctful|x(?:ing|ed)|ught|sted|pped|gged|med)|i(?:d(?:i(?:ness|e(?:st|r)|ly)|y)|tled|ring|mely|e(?:[sd])?|l)|wist(?:ed)?|u(?:tored|rned))|qu(?:e(?:stion(?:ing(?:ly)?|abl[ye]|ed)|nchable)|a(?:ntifi(?:able|ed)|lified)|oted?|iet)|m(?:e(?:ntion(?:ables?|ed)|r(?:cifully|ited)|chanised|asurable|mor(?:ised|able)|lodious|etable|t)|a(?:intain(?:able|ed)|n(?:ageabl[ye]|ne(?:rly|d)|ly)|tch(?:able|ed)|gnified|r(?:ried|ked)|sk(?:(?:ed|s))?|pped|king|de)|i(?:s(?:tak(?:eabl[ye]|abl[ye])|sable)|tigated|xed)|o(?:difi(?:able|ed)|tivated|nitored|lested|unted|v(?:ing|ed))|u(?:tilated|sical(?:ly)?|zzled)|nemonic)|h(?:e(?:sitating(?:ly)?|a(?:lth(?:i(?:e(?:st|r)|ly)|y)|ted|rd)|lpful(?:ly)?|r(?:alded|oic)|eded)|y(?:phenated|gienic)|a(?:pp(?:i(?:ness|e(?:st|r)|ly)|y)|mpered|rmed|ndy?)|u(?:r(?:ried(?:ly)?|t)|man)|i(?:n(?:dered|ged?)|dden)|o(?:noured|ok(?:(?:ed|s))?|ped|ly))|f(?:r(?:iendl(?:i(?:ness|e(?:st|r))|y)|e(?:quented|ez(?:ing|e))|uitful|ozen)|a(?:i(?:thful(?:ness)?|ling(?:ly)?|r(?:(?:ness|ly))?)|s(?:hionabl[ye]|ten(?:(?:ing|ed))?)|miliar(?:ity)?|lsifiable|vour(?:abl[ye]|ed)|t(?:hom(?:able|ed)|igued)|ncied)|u(?:lfill(?:able|ed)|r(?:nished|l(?:(?:ing|ed|s))?)|n(?:ded|ny)|ssy)|o(?:r(?:t(?:unate(?:(?:ly|s))?|hcoming)|g(?:ettable|iv(?:abl[ye]|ing|en))|esee(?:able|n)|dable|med|ced)|cus(?:sed|ed)|unded|ld(?:(?:ing|ed|s))?)|l(?:inching(?:ly)?|a(?:ttering|gging|wed)|edged)|e(?:rtilised|t(?:chable|tered)|eling(?:ly)?|asibl[ey]|minine|igned|nced|lt|d)|i(?:nished|t(?:(?:ting|ness|s))?|lled|x(?:ed)?|r(?:ed|m)))|w(?:o(?:r(?:kab(?:ility|le)|th(?:i(?:ness|ly)|y)|ried|ldly|n)|ntedly|und(?:ed)?)|i(?:lling(?:(?:ness|ly))?|tting(?:ly)?|nd(?:(?:able|ing|s))?|s(?:e(?:(?:st|ly))?|dom)|eldy)|a(?:r(?:rant(?:abl[ye]|ed)|ned|med|ily|y)|vering(?:ly)?|tch(?:able|ed)|shed|nted)|holesome|e(?:l(?:com(?:ing|e)|l)|ighted|a(?:r(?:ied|y)|ned)|d(?:(?:ded|ge))?)|r(?:ap(?:(?:p(?:ing|ed)|s))?|itten))|n(?:e(?:cessar(?:ily|y)|rv(?:ing(?:ly)?|ed?)|eded)|ot(?:ice(?:able|d)|ed)|a(?:vigable|tural(?:ly)?|med)|umbered)|j(?:ust(?:(?:ifi(?:abl[ye]|ed)|ness|ly))?|a(?:undiced|m(?:m(?:ing|ed))?))|g(?:r(?:a(?:mmatical|teful(?:ly)?|c(?:ious(?:ly)?|eful))|ounded)|e(?:n(?:tlemanly|erous(?:ly)?)|rminated)|o(?:vern(?:able|ed)|dly)|u(?:essable|lates|arded|ided)|la(?:morous|zed)|ainly)|l(?:i(?:ke(?:(?:l(?:i(?:ness|hood|est)|y)|able))?|censed|mited|sted|n(?:k(?:ed)?|ed)|t)|a(?:wful(?:(?:ness|ly))?|belled|d(?:ylike|en)|mented|tching|c(?:ing|ed?))|e(?:a(?:sh(?:(?:ing|e[sd]))?|vened|rn(?:ed)?|ded)|ss)|uck(?:i(?:e(?:st|r)|ly)|y)|o(?:v(?:able|ing|e(?:ly|d))|ck(?:(?:ing|ed|s))?|ad(?:(?:ing|ed|s))?|ose))|v(?:e(?:r(?:ifi(?:able|ed)|sed)|ntilated|il(?:(?:ing|ed|s))?)|a(?:nquished|r(?:ying(?:ly)?|nished)|l(?:idated|ued))|isit(?:able|ed)|oiced)|u(?:tterabl[ye]|s(?:ual(?:ly)?|abl[ye]|ed))|k(?:n(?:ow(?:ing(?:ly)?|able|ns?)|ightly)|ind(?:(?:ness|est|ly))?|e(?:mpt|pt))|yielding|zip(?:(?:p(?:ing|ed)|s))?)|s(?:e(?:(?:r(?:(?:friendl(?:iness|y)|s))?|less(?:(?:ness|ly))?|ful(?:(?:ness|ly))?|able|d|s))?|u(?:r(?:p(?:(?:ation|ing|e[rd]))?|ious|ers?|y)|al(?:ly)?)|her(?:(?:e(?:tte|d)|ing|s))?|a(?:b(?:ility|le)|nces|ges?)|ing)|t(?:ili(?:t(?:arian(?:(?:ism|s))?|ies|y)|s(?:ation|ing|e(?:[sd])?))|ter(?:(?:ances?|most|ing|ly|e[rd]|s))?|opia(?:(?:ns?|s))?|e(?:nsils?|r(?:i(?:ne)?|us))|urns|most|ah)|p(?:t(?:o(?:theminute|wn)|urn(?:ed)?|hrust|ake)|r(?:o(?:ar(?:(?:ious(?:ly)?|s))?|o(?:t(?:(?:ing|ed|s))?)?)|i(?:ght(?:(?:ness|ly|s))?|s(?:ings?|e)|ver)|a(?:t(?:ing|ed?)|ised))|h(?:ol(?:ster(?:(?:e(?:rs?|d)|y))?|d(?:(?:ing|ers?|s))?)|e(?:avals?|ld)|ill)|dat(?:ability|ing|e(?:[srd])?)|grad(?:e(?:(?:able|s|d))?|able|ings?)|b(?:r(?:ingings?|aid(?:(?:ing|ed|s))?)|eat)|pe(?:r(?:(?:c(?:lass|ase|ut)|most|s))?|d)|s(?:(?:i(?:de(?:down)?|lon)|t(?:a(?:nding|g(?:ing|e(?:[sd])?)|rts?|irs)|ream)|et(?:(?:ting|s))?|urges?|wing|hot))?|l(?:i(?:ft(?:(?:ing|ed|s))?|nks?)|oad(?:(?:ed|s))?|ands?)|c(?:oming|ast)|w(?:ard(?:(?:ly|s))?|ind)|m(?:arket|ost)|f(?:ront|ield)|ended|keep|on)|r(?:ban(?:(?:i(?:s(?:ation|ing|ed?)|t(?:es|y))|e(?:ly)?))?|e(?:t(?:h(?:r(?:itis|a(?:[sle])?)|ane)|ers?)|a)|ticaria|ologist|g(?:e(?:(?:n(?:t(?:ly)?|cy)|s|d))?|ings?)|uguay|in(?:ary|e)|chins?|an(?:ium|us)|sine|ns?)|l(?:t(?:ra(?:(?:m(?:ontane|arine)|violet|so(?:nics?|und)))?|im(?:a(?:t(?:e(?:ly)?|ums?)|cy)|o)|erior)|cer(?:(?:at(?:ions?|ed?)|ous|s))?|sters?)|g(?:l(?:i(?:fication|ness|e(?:st|r))|y)|andan?)|m(?:b(?:r(?:a(?:(?:ge(?:ous)?|s|e))?|ellas?)|ilic(?:us|al))|p(?:teen(?:th)?|ir(?:ing|e(?:[sd])?))|lauts?)|k(?:uleles?|raine|e)|vular?|dders?|boats|huh|fo)|d(?:e(?:n(?:(?:dr(?:ochronolog(?:ical|y)|it(?:es|ic))|at(?:ionalisation|ur(?:ing|ed))|o(?:minat(?:ion(?:(?:al|s))?|ors?|ed)|u(?:nc(?:e(?:(?:ments|d|s))?|ing)|ement)|t(?:ation(?:(?:al|s))?|ing|e(?:[sd])?))|u(?:nciations?|d(?:ation|e(?:[sd])?))|i(?:grat(?:i(?:ons?|ng)|e(?:[sd])?)|a(?:ble|ls?)|zens?|e(?:rs?|s|d)|ms?)|s(?:(?:it(?:ometry|ies|y)|e(?:(?:ness|st|ly|r))?))?|t(?:(?:i(?:st(?:(?:ry|s))?|tion|n(?:[ge])?)|ures?|ed|al|s))?|y(?:ing)?|mark|ver))?|c(?:o(?:(?:n(?:struct(?:(?:i(?:on(?:ist)?|ng|ve)|ed))?|taminat(?:i(?:ng|on)|ed)|gestants|vol(?:ution|ve))|m(?:mission(?:(?:ing|ed))?|p(?:os(?:i(?:tions?|ng)|able|e(?:[sd])?)|ress(?:(?:i(?:ng|on)|ed))?))|lonisation|r(?:(?:at(?:i(?:ve(?:ly)?|ons?|ng)|ors?|e(?:[ds])?)|ous(?:ly)?|um|s))?|upl(?:ing|ed?)|d(?:e(?:(?:rs?|s|d))?|ing)|y(?:(?:ing|ed|s))?|ke))?|r(?:i(?:minalis(?:ation|ing|ed?)|e[sd])|e(?:as(?:ing(?:ly)?|e(?:[ds])?)|ment(?:(?:ing|al|ed|s))?|pit(?:ude)?|e(?:(?:ing|s|d))?)|y(?:(?:pt(?:(?:i(?:on|ng)|ed|s))?|ing))?)|e(?:n(?:t(?:(?:ralis(?:ation|ing|ed?)|ly))?|cy)|i(?:t(?:(?:ful(?:ness)?|s))?|v(?:ing|e(?:[drs])?))|lerat(?:i(?:ons?|ng)|e(?:[ds])?)|pti(?:ve(?:ly)?|ons?)|ase(?:[ds])?|mber)|l(?:a(?:ssifi(?:cation|ed)|r(?:at(?:i(?:ons?|ve)|ory)|e(?:(?:rs?|d|s))?|ing)|mat(?:ion|ory)|im(?:(?:ing|ed|s))?)|i(?:n(?:ations?|ing|e(?:[ds])?)|vity)|ensions?)|i(?:m(?:a(?:l(?:(?:is(?:ation|e)|s))?|t(?:i(?:on|ng)|ed?))|etres)|pher(?:(?:ments?|able|ing|ed))?|d(?:ab(?:ility|le)|e(?:(?:d(?:ly)?|s|r))?|uous|ing)|si(?:ve(?:(?:ness|ly))?|ons?)|l(?:itre|es?)|bels?)|a(?:f(?:feinated?)?|p(?:itat(?:i(?:ons?|ng)|e(?:[ds])?)|od)|de(?:(?:n(?:ce|t)|s))?|nt(?:(?:e(?:rs?|d)|ing|s))?|thlon|gons?|mp(?:ed)?|y(?:(?:ing|ed|s))?)|ustomised|k(?:(?:chairs?|ing|e[rd]|s))?)|p(?:e(?:rsonalis(?:ation|ing)|nd(?:(?:a(?:b(?:ility|le)|nts?)|e(?:n(?:c(?:ies|y|e)|t)|d)|ing|s))?)|o(?:l(?:iticisation|arisations?)|pulat(?:ion|ed)|rt(?:(?:ations?|ment|e(?:es?|d)|ing|s))?|s(?:i(?:t(?:(?:i(?:on(?:(?:al|s))?|ng)|or(?:ies|y|s)|ary|ed|s))?|ng)|ed?)|nent|ts?)|art(?:(?:ment(?:(?:al(?:ly)?|s))?|ures?|ing|e[dr]|s))?|r(?:e(?:c(?:at(?:i(?:ng(?:ly)?|ons?)|ory|e(?:[sd])?)|iat(?:i(?:ng|on)|ed?))|dations?|ss(?:(?:i(?:ng(?:ly)?|ons?|ves?)|ants?|e[ds]))?)|iv(?:ations?|ing|e(?:[ds])?)|av(?:i(?:ng|ty)|e(?:[ds])?))|l(?:o(?:y(?:(?:ments?|ing|ed|s))?|r(?:abl[ye]|ing|e(?:[ds])?))|et(?:i(?:ng|on)|ed?))|ut(?:ations?|i(?:s(?:ing|e(?:[ds])?)|es)|e(?:[sd])?|y)|ict(?:(?:i(?:ons?|ng)|ed|s))?|ths?)|t(?:e(?:r(?:(?:min(?:i(?:s(?:t(?:ic(?:ally)?)?|m)|ng)|a(?:t(?:i(?:ons?|ve)|e(?:ly)?)|ble|nts?|cy)|e(?:(?:d(?:ly)?|s|r))?)|iorat(?:i(?:ng|on)|e(?:[ds])?)|r(?:e(?:n(?:ts?|ce)|d)|ing)|gents?|s))?|ct(?:(?:ab(?:ility|l[ye])|i(?:ves?|ons?|ng)|ors?|ed|s))?|st(?:(?:a(?:tion|bl[ye])|e(?:rs?|d)|ing|s))?|nt(?:(?:ions?|e))?)|o(?:x(?:if(?:ication|y))?|nat(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|ur(?:(?:ed|s))?)|r(?:i(?:ment(?:al(?:ly)?)?|t(?:al|us))|act(?:(?:ors?|i(?:on|ng)|ed|s))?|oit)|a(?:ch(?:(?:ments?|able|ing|e[ds]))?|i(?:l(?:(?:ing|ed|s))?|n(?:(?:e(?:es?|d|r)|ing|s))?))|hroned?)|m(?:i(?:litaris(?:ation|ed)|johns|gods?|s(?:ts?|e(?:[sd])?))|a(?:g(?:netis(?:ation|e)|og(?:(?:ue(?:(?:ry|s))?|ic|y))?)|terialise(?:[ds])?|rcat(?:i(?:ons?|ng)|ed?)|nd(?:(?:ing|e[dr]|s))?)|o(?:(?:cra(?:t(?:(?:i(?:s(?:ation|ing)|c(?:ally)?)|s))?|c(?:ies|y))|graph(?:ic(?:(?:ally|s))?|ers?|y)|n(?:(?:s(?:tra(?:t(?:i(?:ve(?:(?:ly|s))?|ons?|ng)|ors?|e(?:[ds])?)|bl[ey]))?|ology|i(?:se|c)))?|b(?:ilis(?:ation|ed)|s)|ralis(?:ation|ing|ed?)|dulator|li(?:sh(?:(?:ing|e[srd]))?|tions?)|unt(?:(?:able|ing|ed))?|t(?:i(?:on|c)|e(?:[sd])?)))?|ystif(?:ication|y(?:ing)?)|e(?:nt(?:(?:ed(?:ly)?|ia))?|an(?:(?:ing|our|ed|s))?|r(?:it|ge))|ur(?:(?:r(?:ing|ed)|e(?:ly)?|s))?)|f(?:e(?:n(?:ce(?:(?:less(?:ness)?|s))?|estrat(?:ion|ed?)|s(?:i(?:b(?:ility|le)|ve(?:(?:ness|ly))?)|es)|d(?:(?:ants?|e(?:rs?|d)|ing|s))?)|c(?:t(?:(?:i(?:ve(?:(?:ness|s))?|ons?|ng)|ors?|ed|s))?|at(?:ing|e))|r(?:(?:en(?:tial(?:ly)?|ce)|ment|r(?:ing|al|ed)|s))?|at(?:(?:i(?:ng|s[mt])|e[dr]|s))?)|r(?:a(?:gmentation|ud(?:(?:ing|ed|s))?|y(?:ed)?)|ost(?:(?:ing|ed|s))?)|i(?:brillators?|n(?:i(?:t(?:i(?:ve(?:(?:ness|ly))?|on(?:(?:al|s))?)|e(?:(?:ness|ly))?)|ng)|abl[ey]|e(?:[srd])?)|ci(?:en(?:c(?:ies|y)|t)|ts?)|l(?:e(?:(?:ment|s|d))?|ing)|an(?:t(?:ly)?|ce)|e[srd])|o(?:r(?:est(?:ation|ed)|m(?:(?:a(?:tions?|ble)|i(?:t(?:ies|y)|ng)|ed|s))?)|lia(?:tion|nts))|l(?:at(?:i(?:on(?:ary)?|ng)|able|e(?:[ds])?)|ect(?:(?:i(?:ons?|ng)|ors?|ed|s))?|ower(?:ing)?)|a(?:ult(?:(?:ing|e(?:rs?|d)|s))?|m(?:at(?:ory|ion)|ing|e(?:[srd])?)|c(?:ing|to|e(?:[sd])?))|t(?:(?:ness|ly|er))?|u(?:s(?:ing|e(?:[sd])?)|nct)|y(?:ing)?)|s(?:c(?:ri(?:pt(?:i(?:v(?:e(?:(?:ness|ly))?|ism)|ons?)|ors?)|b(?:able|ing|e(?:(?:rs?|d|s))?))|en(?:d(?:(?:ants?|ing|e(?:rs?|nt|d)|s))?|ts?)|ant)|e(?:r(?:t(?:(?:i(?:fication|ons?|ng)|e(?:rs?|d)|s))?|v(?:e(?:(?:d(?:ly)?|s))?|ing))|gregation|nsitising|crat(?:i(?:ng|on)|e(?:[sd])?)|lected)|t(?:abilis(?:ation|ing|ed?)|r(?:uct(?:i(?:ve(?:(?:ness|ly))?|on))?|oy(?:(?:able|ing|e(?:rs?|d)|s))?)|i(?:n(?:ations?|ies|ed?|y)|tut(?:ion|e)))|i(?:gn(?:(?:a(?:t(?:i(?:on(?:(?:al|s))?|ng)|ors?|e(?:[sd])?)|ble)|e(?:d(?:ly)?|rs?)|ing|s))?|r(?:ab(?:l(?:e(?:ness)?|y)|ili(?:ty|a))|ing|ous|e(?:[sd])?)|ccat(?:ion|or|ed)|derat(?:um|a)|st(?:(?:ing|ed))?)|u(?:ltor(?:i(?:ness|ly)|y)|etude)|a(?:l(?:ination|t)|turated)|p(?:a(?:ir(?:(?:ing(?:ly)?|ed|s))?|tch(?:(?:ing|e[sd]))?)|o(?:nd(?:en(?:t(?:ly)?|cy))?|il(?:(?:ing|ed))?|t(?:(?:i(?:sm|c)|s))?)|era(?:t(?:e(?:ly)?|ion)|do)|i(?:cabl[ye]|s(?:ing|al|e(?:[ds])?)|te))|s(?:icat(?:ion|ed)|erts?)|o(?:rption|lat(?:i(?:on|ng)|ed?))|k(?:(?:illing|tops?|s))?)|v(?:elop(?:(?:ment(?:(?:al(?:ly)?|s))?|ing|e(?:rs?|d)|s))?|a(?:stat(?:i(?:ng(?:ly)?|on)|ed?)|lu(?:ations?|ing|e(?:[ds])?))|i(?:ous(?:(?:ness|ly))?|l(?:(?:ish(?:ly)?|ment|led|ry|s))?|a(?:t(?:i(?:ons?|ng)|e(?:[ds])?)|n(?:c[ey]|ts?))|s(?:ing|e(?:[srd])?|al)|ces?)|o(?:t(?:e(?:(?:d(?:(?:ness|ly))?|es?|s))?|i(?:on(?:(?:al|s))?|ng))|u(?:t(?:(?:ness|ly))?|r(?:(?:e(?:rs?|d)|ing|s))?)|l(?:ution|v(?:ing|ed?))|i(?:ce|r|d)))|r(?:m(?:a(?:t(?:olog(?:i(?:cal|sts?)|y)|itis)|l)|i[sc])|e(?:gulat(?:i(?:ng|on)|ed?)|lict(?:ions?)?)|i(?:v(?:a(?:ti(?:ve(?:(?:ly|s))?|ons?)|ble)|ing|e(?:[sd])?)|s(?:i(?:ve(?:ly)?|on)|ory)|d(?:e(?:(?:rs|s|d))?|ing))|a(?:nge(?:(?:ment|d))?|il(?:(?:ment|ing|ed|s))?|te(?:[sd])?)|ogat(?:ions?|ory|e)|vishes|rick|b(?:ies|y))|l(?:e(?:t(?:e(?:(?:r(?:ious(?:ly)?)?|s|d))?|able|i(?:ons?|ng))|cta(?:tion|ble)|gat(?:i(?:ons?|ng)|e(?:[ds])?))|i(?:(?:b(?:erat(?:i(?:ons?|ng|ve)|e(?:(?:ly|d))?)|le)|c(?:a(?:te(?:(?:ssens?|ly))?|c(?:ies|y))|ious(?:ly)?|t)|ght(?:(?:ful(?:ly)?|ed(?:ly)?|ing|s))?|quesce(?:nt|d)|n(?:eat(?:i(?:ng|on)|e(?:[sd])?)|quen(?:cy|ts?))|ri(?:ous(?:ly)?|um)|ver(?:(?:a(?:ble|nce)|i(?:ng|es)|e(?:rs?|d)|s|y))?|mit(?:(?:ing|e(?:rs?|d)|s))?|lah))?|phi(?:niums)?|u(?:si(?:on(?:(?:al|s))?|ve)|d(?:ing|e(?:[sd])?)|g(?:ing|e(?:[sd])?)|xe)|a(?:y(?:(?:ing|ed|s))?|te)|t(?:oids?|as?)|v(?:ing|e(?:[sd])?)|hi|ls?)|a(?:c(?:tivat(?:i(?:ng|on)|e(?:[ds])?)|on(?:(?:ess(?:es)?|s))?)|d(?:(?:l(?:ock(?:(?:ing|ed|s))?|i(?:e(?:st|r)|nes?)|y)|e(?:n(?:(?:ing|ed|s|d))?|r)|beat|ness|sea|pan|on))?|f(?:(?:anddumb|e(?:n(?:(?:ing(?:ly)?|ed|s))?|st|r)|ness))?|l(?:(?:er(?:s(?:hips?)?)?|ings?|s|t))?|th(?:(?:l(?:ess|y)|bed|s))?|r(?:(?:ness|ies?|e(?:st|r)|th|ly|s|y))?|n(?:(?:ery|s))?)|b(?:(?:i(?:lit(?:at(?:ing|ed?)|y)|t(?:(?:ing|ed|s))?)|u(?:t(?:(?:ant(?:(?:es?|s))?|s))?|g(?:(?:g(?:e(?:rs?|d)|ing)|s))?|nks?)|ri(?:ef(?:(?:ing|ed))?|s)|entures?|a(?:uch(?:e(?:ry|d))?|s(?:e(?:(?:ment|r|d))?|ing)|t(?:able|e(?:(?:rs?|s|d))?|ing)|cles?|r(?:(?:red|s|k))?)|on(?:air|e(?:[sd])?)|t(?:(?:ors?|s))?))?|e(?:(?:p(?:(?:fr(?:eez(?:ing|e)|ozen|ied)|s(?:ea(?:ted)?)?|rooted|e(?:n(?:(?:ing|ed|s))?|st|r)|ness|ish|ly))?|r(?:stalk(?:ers?|ing))?|m(?:(?:ing|ed|s))?|jay|ds?))?|g(?:enera(?:c(?:ies|y)|t(?:i(?:ng|on|ve)|e(?:[ds])?))|r(?:ad(?:a(?:tions?|ble)|ing|e(?:[ds])?)|e(?:ase|es?))|a(?:uss(?:(?:ing|ed))?|s))|h(?:um(?:anis(?:ing|e[ds])|idifier)|ydrat(?:i(?:ng|on)|ed?)|orn)|xt(?:er(?:ous(?:ly)?|ity)|r(?:o(?:us(?:ly)?|se)|al))|d(?:icat(?:i(?:ons?|ng)|e(?:[ds])?)|uc(?:t(?:(?:i(?:ve(?:ly)?|ons?|ble|ng)|ed|s))?|i(?:ble|ng)|e(?:[sd])?))|i(?:f(?:i(?:cation|e[sd])|y(?:ing)?)|t(?:ies|y)|s(?:ts?|m))|odor(?:ised|ants?)|ject(?:(?:ed(?:ly)?|ion|s))?|u(?:ter(?:ium|on)|ce(?:[sd])?)|w(?:(?:drops?|s|y))?|klerk)|i(?:s(?:e(?:n(?:franchis(?:e(?:(?:ment|d|s))?|ing)|chant(?:ment|ed)|gag(?:e(?:(?:ment|d))?|ing)|tangl(?:ing|e(?:[ds])?))|stablish(?:(?:ment|ing|ed))?|mb(?:ark(?:(?:ation|ing|ed))?|o(?:wel(?:(?:ment|led|s))?|di(?:ment|ed)))|quilibrium|ase(?:[ds])?)|p(?:ro(?:portiona(?:te(?:ly)?|l(?:ly)?)|v(?:able|ing|e(?:[ds])?)|ofs?)|a(?:ssionate(?:ly)?|r(?:a(?:g(?:e(?:(?:ment|d))?|ing(?:ly)?)|te)|it(?:ies|y))|tch(?:(?:e(?:rs?|s|d)|ing))?)|e(?:ns(?:a(?:tions?|r(?:ies|y)|ble)|ing|e(?:(?:rs?|d|s))?)|rs(?:i(?:ve(?:ly)?|ons?|ng)|e(?:(?:rs?|d|s))?|a(?:nt|l))|l(?:(?:l(?:ing|ed)|s))?)|l(?:a(?:c(?:e(?:(?:ments?|d|r|s))?|ing)|y(?:(?:able|ing|ed|s))?)|eas(?:ing|ure|ed?))|o(?:s(?:sess(?:(?:ion|ed))?|i(?:tions?|ng)|a(?:bles?|ls?)|e(?:(?:rs?|d|s))?)|rting)|irit(?:ed(?:ly)?|ing)|ut(?:a(?:tio(?:us|n)|nts?|ble)|ing|e(?:[ds])?))|a(?:dvantage(?:(?:ous(?:ly)?|d|s))?|pp(?:oint(?:(?:ing(?:ly)?|ments?|ed|s))?|ear(?:(?:ances?|ing|ed|s))?|ro(?:bation|v(?:ing(?:ly)?|al|e(?:[ds])?)))|ff(?:iliat(?:i(?:ng|on)|ed?)|ect(?:ion|ed))|g(?:gregat(?:ion|ed?)|ree(?:(?:ments?|abl[ey]|ing|d|s))?)|mbiguat(?:i(?:ng|on)|ed?)|s(?:s(?:ociat(?:i(?:ng|on)|ed?)|embl(?:ing|e(?:[drs])?|y))|t(?:rous(?:ly)?|ers?))|b(?:ilit(?:ies|y)|l(?:e(?:(?:ment|d|s))?|ing)|used?)|r(?:ra(?:nging|y(?:ed)?)|m(?:(?:ament|ing(?:ly)?|e[dr]|s))?)|llow(?:(?:ing|ed|s))?|vow(?:(?:ing|al|ed))?)|i(?:n(?:te(?:r(?:(?:est(?:ed(?:(?:ness|ly))?)?|red))?|grat(?:i(?:ng|on)|e(?:[ds])?))|c(?:lin(?:ation|ed)|entives?)|f(?:ormation|ect(?:(?:ants?|i(?:ng|on)|ed))?)|genuous(?:ly)?|vest(?:ment)?|herit(?:ed)?)|llusion(?:(?:ment|ing|ed))?)|qu(?:alif(?:i(?:cations?|e[ds])|y(?:ing)?)|i(?:sitions?|et(?:(?:ing|ude))?))|s(?:atisf(?:actions?|y(?:ing)?|ie[ds])|i(?:m(?:ilar(?:it(?:ies|y))?|ulation)|pat(?:i(?:ng|on|ve)|e(?:[sd])?)|den(?:ts?|ce))|o(?:ciat(?:i(?:ve(?:ly)?|ng|on)|ed?)|l(?:ut(?:ion|e)|v(?:ing|e(?:[ds])?))|nan(?:ces?|t))|e(?:m(?:inat(?:i(?:ng|on)|ed?)|bl(?:ing|ed?))|r(?:tations?|vice)|ct(?:(?:i(?:ons?|ng)|ed|or|s))?|n(?:sions?|t(?:(?:ing|e(?:rs?|d)))?))|uad(?:ing|e(?:[ds])?))|c(?:(?:ipl(?:in(?:ar(?:ians?|y)|ing|e(?:[ds])?)|e(?:s(?:hip)?)?)|o(?:(?:n(?:cert(?:(?:ing(?:ly)?|ed))?|t(?:inu(?:a(?:tion|nce)|i(?:t(?:ies|y)|ng)|ous(?:ly)?|e(?:[ds])?)|ent(?:(?:ed(?:ly)?|s))?)|nect(?:(?:i(?:ons?|ng)|ed|s))?|solat(?:e(?:ly)?|ion))|u(?:nt(?:(?:ab(?:ility|le)|ing|ed|s))?|r(?:ag(?:e(?:(?:ments?|d|s))?|ing(?:ly)?)|te(?:ous(?:ly)?|sy)|s(?:ing|e(?:[sd])?)))|lour(?:(?:ation|ed|s))?|mf(?:ort(?:(?:ing|s))?|it(?:(?:ure|ed))?)|theques?|ver(?:(?:able|e(?:rs?|d)|i(?:es|ng)|s|y))?|graphy|rd(?:(?:an(?:ce|t)|s))?))?|r(?:imina(?:t(?:i(?:ng|on|ve)|or(?:[sy])?|e(?:[ds])?)|nts?)|e(?:dit(?:(?:able|ing|ed|s))?|pan(?:c(?:ies|y)|t)|t(?:ion(?:ary)?|e(?:ly)?)|et(?:(?:ness|ly))?))|u(?:rsive(?:ly)?|s(?:s(?:(?:able|i(?:ons?|ng)|e[ds]))?)?)|ern(?:(?:i(?:bl[ey]|ng)|ment|ed|s))?|harg(?:ing|e(?:[sd])?)|l(?:aim(?:(?:e(?:rs?|d)|ing|s))?|os(?:ures?|ing|e(?:[ds])?))|a(?:rd(?:(?:ing|ed|s))?|nt)|s))?|o(?:r(?:ganis(?:ation|ing|ed?)|ient(?:(?:at(?:i(?:ng|on)|ed)|ed))?|der(?:(?:ly|ed|s))?)|be(?:dien(?:ce|t)|y(?:(?:ing|ed|s))?)|wn(?:(?:ing|ed|s))?)|r(?:e(?:spect(?:(?:ful(?:ly)?|s))?|gard(?:(?:ing|ed|s))?|p(?:ut(?:able|e)|air))|upt(?:(?:i(?:ve(?:ly)?|ons?|ng)|ed|or|s))?|ob(?:ing|e))|t(?:i(?:n(?:ct(?:(?:i(?:ve(?:(?:ness|ly))?|ons?)|ness|ly))?|guish(?:(?:abl[ey]|ing|e[ds]))?)|l(?:(?:l(?:at(?:ions?|e)|e(?:r(?:(?:ies|y|s))?|d)|ing)|s))?)|r(?:a(?:ct(?:(?:ed(?:(?:ness|ly))?|i(?:ng(?:ly)?|ons?)|s))?|ught)|i(?:but(?:i(?:on(?:(?:al|s))?|v(?:ity|e)|ng)|able|ors?|e(?:[ds])?)|cts?)|ess(?:(?:ing(?:ly)?|e[sd]))?|ust(?:(?:ful(?:ly)?|ing|ed|s))?)|a(?:ste(?:ful(?:ly)?)?|n(?:c(?:ing|e(?:[ds])?)|t(?:ly)?)|l(?:ly)?|ff)|urb(?:(?:ances?|ing(?:ly)?|ed|s))?|e(?:mper(?:(?:ed|s))?|n(?:sion|ded))|ort(?:(?:i(?:ons?|ng)|e[dr]|s))?)|b(?:elie(?:v(?:ing(?:ly)?|e(?:(?:rs?|d))?)|f)|urse(?:(?:ments?|d))?|a(?:nd(?:(?:ment|ing|ed|s))?|rs))|f(?:igur(?:e(?:(?:ments?|s|d))?|ing)|ranchise|avour)|g(?:r(?:untle(?:ment|d)|ac(?:e(?:(?:ful(?:ly)?|d|s))?|ing))|u(?:st(?:(?:ing(?:ly)?|ed(?:ly)?|s))?|is(?:ing|e(?:[ds])?))|org(?:ing|ed?))|h(?:(?:armon(?:ious|y)|e(?:arten(?:ing|ed)|velled|s|d)|on(?:our(?:(?:abl[ey]|ed))?|est(?:(?:ly|y))?)|wa(?:shers?|ter)|cloth|pan|i(?:ng|er)|y))?|m(?:ember(?:(?:ment|ing|ed|s))?|iss(?:(?:i(?:ve(?:ly)?|ble|ng)|als?|e[ds]))?|a(?:ntl(?:ing|e(?:[sd])?)|y(?:(?:ing|ed|s))?|l(?:ly)?)|ount(?:(?:ing|ed|s))?)|dain(?:(?:ful(?:ly)?|ing|ed))?|j(?:oin(?:t(?:(?:ed(?:ly)?|ness))?)?|unct(?:i(?:ons?|ve))?)|l(?:o(?:cat(?:i(?:ons?|ng)|e(?:[sd])?)|yal(?:ty)?|dg(?:ing|e(?:[ds])?))|ik(?:ing|e(?:[ds])?))|yllab(?:le|ic)|u(?:lphide|ni(?:on|t[ey])|sed?)|kettes?)|ff(?:er(?:(?:e(?:n(?:t(?:(?:ia(?:b(?:ility|le)|t(?:i(?:ons?|ng)|ors|e(?:[ds])?)|l(?:(?:ly|s))?)|ly))?|c(?:ing|es?))|d)|ing|s))?|i(?:cult(?:(?:ies|y))?|den(?:t(?:ly)?|ce))|ract(?:(?:i(?:ng|on)|ed|s))?|us(?:i(?:on(?:al)?|v(?:ity|e)|ng)|e(?:(?:rs?|d|s))?))|a(?:g(?:ram(?:(?:matic(?:ally)?|s))?|nos(?:tic(?:(?:ally|ian|s))?|able|i(?:ng|s)|e(?:[ds])?)|onal(?:(?:is(?:ing|e(?:[ds])?)|ly|s))?)|l(?:(?:ect(?:(?:ic(?:(?:al(?:ly)?|s))?|al|s))?|og(?:ues?)?|l(?:ing|e[rd])|ysis|ing|s))?|m(?:et(?:ric(?:ally)?|ers?)|ante|onds?)|p(?:h(?:ragm(?:(?:atic|s))?|anous)|ason|ers?)|b(?:oli(?:c(?:al(?:ly)?)?|sm)|et(?:ics?|es))|c(?:ritic(?:als?|s)|hronic|onal)|r(?:rh(?:oeal?|ea)|i(?:st|es)|y)|s(?:tolic|pora)|t(?:hermy|ribes?|o(?:m(?:(?:ic|s))?|nic))|dems?|na)|v(?:e(?:(?:r(?:(?:s(?:(?:i(?:f(?:i(?:cation|e[ds])|y(?:ing)?)|on(?:(?:ary|s))?|t(?:ies|y))|e(?:ly)?))?|t(?:(?:i(?:cular|ng)|ed|s))?|g(?:e(?:(?:n(?:ces?|t)|d|s))?|ing)))?|bombing|s(?:t(?:(?:ing|ed))?)?|d))?|i(?:s(?:i(?:b(?:ility|le)|ve(?:ness)?|on(?:(?:al|s))?)|ors?)|n(?:i(?:t(?:ies|y)|ng)|ation|e(?:(?:ly|st?|r|d))?|g)|d(?:e(?:(?:nds?|rs?|s|d))?|ing))|o(?:rc(?:e(?:(?:es?|d|s))?|ing)|ts?)|ulg(?:ing|e(?:[ds])?)|a(?:(?:ns?|s))?)|e(?:(?:s(?:el(?:(?:electric|s))?)?|lectrics?|t(?:(?:i(?:tians?|cians?|ng)|e(?:tic|r|d)|ary|s))?|hards?|d))?|m(?:(?:e(?:(?:nsion(?:(?:al(?:(?:ity|ly))?|less|ing|ed|s))?|rs?|s))?|in(?:ish(?:(?:able|ing|e[sd]))?|u(?:ti(?:ves?|on)|endo))|orphi(?:sm|c)|ple(?:[sd])?|ness|m(?:ing|e(?:st|rs?|d))|wit|ly|s))?|p(?:(?:l(?:o(?:ma(?:(?:t(?:(?:ic(?:ally)?|s))?|cy|s))?|id)|exers)|s(?:(?:omania(?:cs?)?|ticks?))?|hth(?:ongs?|eria)|p(?:ing|e[rd])|ol(?:es?|ar)))?|r(?:e(?:(?:ct(?:(?:i(?:on(?:(?:al(?:(?:ity|ly))?|less|s))?|ves?|ng)|or(?:(?:s(?:hips?)?|ates?|i(?:al|es)|y))?|ness|ed|ly|s))?|ness|st|ly))?|igi(?:ble|ste)|t(?:(?:i(?:ness|e(?:st?|r|d)|ly)|y(?:ing)?|s))?|ges?)|c(?:t(?:at(?:or(?:(?:ial(?:ly)?|s(?:hips?)?))?|i(?:ng|on)|e(?:[ds])?)|ion(?:(?:ar(?:ies|y)|s))?|um)|h(?:otom(?:ies|ous|y)|loride)|kens|i(?:est|ng)|e(?:[dsy])?)|g(?:(?:it(?:(?:is(?:ation|ing|e(?:(?:rs?|d))?)|al(?:(?:is|ly))?|s))?|ni(?:t(?:ar(?:ies|y)|ies|y)|f(?:y(?:ing)?|ied))|r(?:ess(?:(?:i(?:ons?|ng)|ed))?|aphs)|est(?:(?:i(?:ves?|ons?|ble|ng)|e[dr]|s))?|g(?:ings?|ers?)|s))?|l(?:a(?:pidat(?:ion|ed)|t(?:ation|i(?:ng|on)|ory?|e(?:[sd])?))|e(?:ttantes?|mmas?)|igen(?:t(?:ly)?|ce)|u(?:t(?:i(?:ons?|ng)|e(?:[srd])?)|ent)|do|ly?)|zz(?:y(?:ing(?:ly)?)?|i(?:ness|e(?:st|r)|ly))|n(?:(?:g(?:(?:i(?:ness|e(?:st|r))|dong|h(?:ies|y)|le|ed|o|y))?|osaurs?|ners?|ing|e(?:(?:rs?|d|s))?|ars?|ky|ts?))?|t(?:her(?:(?:ing|ed|s))?|ch(?:(?:ing|e[sd]))?|t(?:ies|o|y))|ur(?:e(?:tics?|sis)|nal)|d(?:(?:actic|nt))?|hedral|o(?:ces(?:an|e)|ptres?|xi(?:des?|ns?)|des?)|k(?:tats?|es))|o(?:u(?:b(?:l(?:e(?:(?:barrelled|cross(?:ing)?|d(?:e(?:aling|ckers?))?|t(?:(?:alk|s))?|s))?|ing|y)|t(?:(?:less(?:ly)?|ing(?:ly)?|ful(?:ly)?|e(?:rs?|d)|s))?)|gh(?:(?:nuts?|ty|s))?|ch(?:ing|e)|r(?:(?:ness|ly))?|s(?:ing|ed?))|c(?:(?:ument(?:(?:a(?:r(?:ies|y)|tion)|ing|ed|s))?|t(?:rin(?:a(?:ire|l(?:ly)?)|es?)|or(?:(?:a(?:tes?|l)|ing|ed|s))?)|k(?:(?:lands?|yards?|s(?:ide)?|ing|e(?:ts?|rs?|d)|age))?|il(?:e(?:ly)?|ity)|s))?|m(?:e(?:(?:s(?:tic(?:(?:a(?:t(?:ion|ed)|lly)|ity|s))?)?|d))?|i(?:cil(?:iary|ed?)|n(?:eer(?:(?:ing|ed))?|a(?:t(?:i(?:on|ng)|e(?:[ds])?)|n(?:t(?:ly)?|ce))|ions?|o))|ains?)|d(?:ecahedr(?:al?|on)|g(?:i(?:ng|er)|e(?:(?:rs?|ms?|s|d))?|y)|o)|g(?:(?:ma(?:(?:ti(?:c(?:ally)?|s(?:ts?|m))|s))?|g(?:e(?:d(?:(?:ness|ly))?|rel)|ing|y)|fi(?:ghts?|sh)|ood(?:ers?)?|e(?:(?:ared|s))?|s(?:body)?|like|days|tag|y))?|i(?:tyourself|ngs?|ly)|l(?:phin(?:(?:arium|s))?|e(?:(?:ful(?:ly)?|rite|d|s))?|drums|o(?:mite|rous)|l(?:(?:ies|ars?|op|ed|s|y))?|m(?:en|an)|ing|t)|o(?:r(?:(?:handles|k(?:eepers?|nobs?)|bells?|s(?:t(?:eps?|ops?))?|m(?:a(?:ts?|n)|en)|nail|post|ways?))?|dl(?:ing|e(?:[sd])?)|m(?:(?:s(?:day)?|ing|ed))?)|r(?:(?:m(?:i(?:tor(?:ies|y)|ce)|an(?:cy|t)|ouse|ers?)|sal(?:ly)?|ado))?|w(?:n(?:(?:grad(?:ing|e(?:[sd])?)|h(?:earted|ill)|l(?:oad(?:(?:ing|ed|s))?|ands?)|t(?:oearth|rodden|urns?)|w(?:ard(?:(?:ly|s))?|ind)|s(?:(?:t(?:ream|a(?:irs|ge))|i(?:z(?:ing|ed?)|de)|wing))?|p(?:lay(?:ed)?|ipes?|ours?)|right|beat|cast|fall|ing|ed|y))?|el(?:(?:ling|s))?|agers?|d(?:ie(?:st|r)|y)|s(?:ing|e(?:rs?)?)|r(?:ies|y))|n(?:(?:at(?:i(?:ons?|ng)|e(?:[sd])?)|n(?:ing|ed)|keys?|juan|ors?|ga?|ut|t|s|e))?|t(?:(?:t(?:in(?:ess|g)|ed|y)|ing|age|e(?:[ds])?|s))?|ve(?:(?:tails?|cote?|r|s))?|berman|p(?:amine|i(?:ng|er)|e(?:[dsy])?|y)|s(?:siers?|ages?|ing|e(?:[ds])?)|yen(?:(?:ne|s))?|ff(?:ing|ed)|z(?:i(?:ng|er)|e(?:(?:ns?|d|s))?|y)|e(?:(?:s(?:nt)?|rs?))?|hs?)|r(?:a(?:ught(?:(?:s(?:m(?:an(?:ship)?|en))?|ie(?:st|r)|y))?|m(?:a(?:(?:t(?:i(?:s(?:ations?|ing|ts?|ed?)|c(?:(?:ally|s))?)|urgical)|s))?)?|g(?:(?:o(?:n(?:(?:fl(?:ies|y)|s))?|on(?:(?:ed|s))?)|g(?:ing|ed)|net|s))?|stic(?:ally)?|w(?:(?:b(?:ridges?|acks?)|able|cord|ings?|l(?:(?:ing|ed|s))?|e(?:rs?|es)|n|s))?|in(?:(?:pipes?|age|ing|e[rd]|s))?|c(?:on(?:ian|e)|hm(?:as?)?|ula)|ft(?:(?:s(?:man)?|e(?:es?|rs?|d)|i(?:er|ng)|y))?|p(?:e(?:(?:r(?:(?:ies|y|s))?|s|d))?|ing)|b(?:ness)?|kes?|nk|ys?|t)|e(?:a(?:d(?:(?:ful(?:(?:ness|ly))?|nought|locks|ing|ed|s))?|r(?:(?:i(?:ness|e(?:st|r)|ly)|y))?|m(?:(?:i(?:e(?:st|r)|ly|ng)|l(?:and|ess|ike)|e(?:rs?|d)|y|t|s))?)|ss(?:(?:mak(?:ers?|ing)|ings?|age|e(?:rs?|s|d)|y))?|nch(?:(?:ing|e[ds]))?|dg(?:ing|e(?:[srd])?)|gs|w)|o(?:medar(?:ies|y)|w(?:s(?:i(?:ness|e(?:st|r)|ly)|e(?:[sd])?|y)|n(?:(?:ings?|ed|s))?)|o(?:p(?:(?:i(?:ng(?:ly)?|e(?:st|r))|ed|y|s))?|l(?:(?:ing|ed|s))?)|p(?:(?:p(?:ings?|e[rd])|lets?|outs?|sy?))?|ll(?:e(?:ry?|st))?|ughts?|v(?:ing|e(?:(?:rs?|s))?)|n(?:ing|e(?:[sd])?)|ss)|u(?:nk(?:(?:e(?:n(?:(?:ness|ly))?|r)|ards?|s))?|m(?:(?:s(?:ticks)?|beats?|m(?:e(?:rs?|d)|ing)))?|b(?:b(?:ing|ed))?|dge(?:(?:ry|s))?|g(?:(?:g(?:i(?:ng|st)|ed)|s))?|ids?)|y(?:(?:clean(?:ing|ed)|stone|ness|e(?:yed|rs?)|i(?:sh|ng)|ly))?|i(?:v(?:e(?:(?:r(?:(?:less|s))?|l(?:(?:l(?:ing|ed)|s))?|ways?|ins?|s|n))?|able|ing)|bbl(?:ing|e(?:[drs])?)|ft(?:(?:wood|e(?:rs?|d)|ing|s))?|nk(?:(?:able|ers?|ing|s))?|zzl(?:ing|e(?:[ds])?|y)|l(?:l(?:(?:ing|e[rd]|s))?|y)|p(?:(?:p(?:ing|ed|y)|dry|s))?|e(?:st?|rs?|d)))|a(?:u(?:ghter(?:(?:s(?:inlaw)?|inlaw))?|nt(?:(?:ing(?:ly)?|less|ed|s))?|phins?|b(?:(?:ing|e[rd]))?)|d(?:(?:d(?:y(?:longlegs)?|ies)|o|s))?|n(?:(?:g(?:er(?:(?:ous(?:(?:ness|ly))?|s))?|l(?:ing|e(?:[sd])?))|d(?:elions?|ruff|ies|y)|c(?:e(?:(?:able|rs?|s|d))?|ing)|k(?:est)?|zig|ube|i(?:sh|el)|es?|te))?|y(?:(?:dream(?:(?:ing|s))?|l(?:ights?|ong)|break|time|care|old|s))?|z(?:zl(?:ing(?:ly)?|e(?:[srd])?)|e(?:d(?:ly)?)?|ing)|r(?:t(?:(?:boards?|ing|e(?:rs?|d)|s))?|e(?:(?:d(?:evil)?|s))?|k(?:(?:e(?:n(?:(?:ing|ed|s))?|st|r)|rooms?|ness|ish|ly))?|ing(?:ly)?|lings?|n(?:(?:ing|ed|s))?|win)|m(?:(?:a(?:g(?:ing(?:ly)?|e(?:[sd])?)|s(?:cus|k))|n(?:(?:a(?:tion|bl[ey])|i(?:ng(?:ly)?|fy)|ed|s))?|p(?:(?:e(?:n(?:(?:ing|ed|s))?|st|rs?|d)|ness|i(?:sh|ng)|ly|s))?|s(?:(?:ons?|els?))?|m(?:ing|ed)|es?))?|i(?:nt(?:i(?:ness|e(?:st|r)|ly)|y)|r(?:y(?:(?:ing|m(?:an|en)))?|ies)|s(?:(?:ies|y))?|l(?:ies|y))|c(?:h(?:shund|au?)|tyl(?:(?:ic|s))?|e)|f(?:f(?:odils?|y)|t(?:(?:ness|e(?:st|r)))?)|l(?:l(?:i(?:ance|ed)|y(?:ing)?|as)|es?)|s(?:h(?:(?:board|ing|e[sd]))?|tardly|sies?)|t(?:a(?:b(?:ases?|le))?|e(?:(?:line|d|s))?|i(?:ve|ng)|um)|b(?:(?:b(?:l(?:ing|e(?:[srd])?)|ing|ed)|s))?|emon(?:(?:ic|s))?|w(?:dl(?:ing|ed?)|n(?:(?:ing|ed|s))?)|vi(?:nci|d)|pp(?:le(?:[sd])?|er)|k(?:oits|ar)|h(?:omey|lias?)|g(?:g(?:ers?|a)|ama))|u(?:p(?:l(?:ic(?:a(?:bility|t(?:i(?:ons?|ng)|ors?|e(?:[sd])?))|it(?:ies|ous|y))|ex)|e(?:[ds])?)|m(?:b(?:(?:found(?:(?:ing|ed|s))?|struck|bell|ness|e(?:st|r)|ly))?|found(?:(?:ing|ed|s))?|p(?:(?:lings?|ing|e[rd]|s|y))?|m(?:ie[sd]|y))|b(?:(?:ious(?:(?:ness|ly))?|b(?:ing|ed)|lin|s))?|t(?:i(?:ful(?:(?:ness|ly))?|es)|ch(?:m(?:an|en))?|y(?:free)?)|r(?:a(?:b(?:ility|les?)|tions?|nce)|ing|ess|ban)|n(?:(?:g(?:(?:beetle|arees|eons?|hill))?|k(?:i(?:rk|ng)|ed)|ces?|es?))?|c(?:k(?:(?:b(?:oards|ill(?:ed)?)|lings?|ings?|pond|ed|s))?|h(?:ess(?:es)?|ies|y)|t(?:(?:i(?:ng|le)|ed|s))?|e)|al(?:(?:i(?:s(?:t(?:ic)?|ms?)|t(?:ies|y))|ly|s))?|e(?:(?:l(?:(?:l(?:e(?:rs?|d)|i(?:ng|st))|s))?|ts?|s))?|ke(?:(?:doms?|s))?|l(?:c(?:imer|et)|l(?:(?:ards?|ness|ing|e(?:st|r|d)|s|y))?|ness|y)|o(?:(?:den(?:al|um)|logue|poly|mo))?|s(?:t(?:(?:bins?|cart|pan|m(?:en|an)|i(?:ng|ly|er)|e(?:rs?|d)|s|y))?|k(?:(?:ier|y))?)|g(?:outs?)?|d(?:(?:geon|es?|s))?|vets?|iker|ff(?:el)?|x)|y(?:s(?:function(?:(?:al|s))?|lexi(?:c(?:(?:ally|s))?|a)|entery|pep(?:sia|tic)|trophy)|n(?:a(?:m(?:i(?:c(?:(?:al(?:ly)?|s))?|ted?|sm)|o)|st(?:(?:i(?:es|c)|y|s))?)|e)|e(?:(?:s(?:tuffs?)?|ings?|rs?|d))?|ad(?:ic)?|ing|kes?)|w(?:el(?:l(?:(?:ings?|e(?:rs?|d)|s))?|t)|indl(?:ing|e(?:[ds])?)|ar(?:f(?:(?:i(?:ng|sh)|ed|s))?|ves))|day|how)|s(?:t(?:r(?:a(?:i(?:ght(?:(?:forward(?:(?:ness|ly))?|e(?:n(?:(?:ing|ed|s))?|st|r)|ness|away))?|t(?:(?:jackets?|en(?:ed)?|s))?|n(?:(?:ing|e(?:rs?|d)|s))?)|t(?:ospher(?:ic(?:ally)?|e)|i(?:graph(?:ic(?:al)?|y)|f(?:i(?:cation|e[ds])|ying))|eg(?:i(?:c(?:ally)?|sts?|es)|y)|a(?:gems?)?|u[ms])|n(?:g(?:ulat(?:ion|ed)|l(?:e(?:(?:hold|rs?|s|d))?|ing)|e(?:(?:ness|st|rs?|ly))?)|d(?:(?:ing|ed|s))?)|w(?:(?:berr(?:ies|y)|man|s))?|ddl(?:ing|e(?:[sd])?)|ggl(?:e(?:(?:rs?|d))?|ing|y)|p(?:(?:p(?:ing|e[rd])|less|s))?|y(?:(?:ing|e[dr]|s))?|f(?:ing|ed?))|u(?:c(?:tur(?:al(?:(?:is(?:ts?|m)|ly))?|e(?:(?:less|d|s))?|ing)|k)|ggl(?:ing|e(?:[sd])?)|t(?:(?:t(?:ing|e[rd])|s))?|m(?:(?:m(?:ing|ed)|pet))?|dels?|ng)|e(?:tch(?:(?:ab(?:ility|le)|in(?:ess|g)|e(?:r(?:(?:ed|s))?|s|d)|y))?|ss(?:(?:ful(?:ness)?|ing|e[sd]))?|pto(?:cocc(?:al|i)|mycin)|n(?:gth(?:(?:en(?:(?:ing|ed|s))?|s))?|uous(?:ly)?)|et(?:(?:w(?:alkers|ise)|s))?|a(?:m(?:(?:lin(?:ing|e(?:[sd])?)|ing|e(?:rs?|d)|s))?|k(?:(?:i(?:e(?:st|r)|ng)|e(?:rs?|d)|s|y))?)|w(?:(?:ing|ed|n))?)|o(?:n(?:g(?:(?:m(?:inded|en|an)|holds?|room|ish|e(?:st|r)|ly))?|tium)|p(?:(?:p(?:ing|ed)|s))?|ll(?:(?:ing|e(?:rs?|d)|s))?|k(?:ing|e(?:[ds])?)|de|ve)|i(?:ng(?:(?:e(?:n(?:c(?:ies|y)|t(?:ly)?)|r|d)|ing|s|y))?|at(?:ions?|ed)|c(?:t(?:(?:ness|ures?|e(?:st|r)|ly))?|ken)|d(?:e(?:(?:n(?:t(?:ly)?|cy)|r|s))?|ing)|k(?:ing(?:ly)?|e(?:(?:rs?|s))?)|v(?:ings?|e(?:[dnrs])?)|p(?:(?:p(?:ing|e(?:rs?|d))|ling|i(?:e(?:st|r)|ng)|e(?:[drs])?|s|y))?|fes?)|ychnine)|e(?:r(?:eo(?:(?:s(?:cop(?:ic(?:ally)?|y))?|typ(?:i(?:cal(?:ly)?|ng)|e(?:[sd])?)|graphic|phonic))?|il(?:i(?:s(?:ations?|ing|e(?:[dr])?)|ty)|e)|adians|n(?:(?:ness|e(?:st|r)|ly|um|s))?|oids?|ling)|e(?:p(?:(?:l(?:e(?:(?:chas(?:ing|e(?:rs?)?)|jack|s|d))?|y)|e(?:n(?:(?:ing|ed|s))?|st|d|r)|ness|ing|s))?|l(?:(?:work(?:(?:ers?|s))?|clad|ing|ed|s|y))?|r(?:(?:a(?:ble|ge)|ing|ed|s))?|ds?)|n(?:o(?:graph(?:ers?|ic|y)|sis)|c(?:il(?:(?:led|s))?|h(?:es)?)|tor(?:ian)?)|a(?:d(?:(?:fast(?:(?:ness|ly))?|y(?:(?:going|ing))?|i(?:ness|e(?:st|r|d)|ly)))?|m(?:(?:rollers?|boats?|s(?:hips?)?|i(?:e(?:st|r)|ng)|e(?:rs?|d)|y))?|l(?:(?:th(?:(?:i(?:e(?:st|r)|ly)|y))?|ing|ers?|s))?|ks?)|w(?:(?:ard(?:(?:ess(?:es)?|s(?:hip)?))?|ing|ed|s))?|p(?:(?:daughter|children|p(?:arents|ing|e(?:[ds])?)|brother|father|ladder|mother|s(?:(?:ister|ons?))?|wise))?|t(?:hoscope)?|gosaurus|vedore|lla(?:ted|r)|m(?:(?:m(?:ing|ed)|s))?)|a(?:n(?:d(?:(?:ard(?:(?:is(?:ations?|ing|e(?:[sd])?)|s))?|points?|s(?:till)?|ings?|by))?|c(?:hions?|es?)|zas?|k)|p(?:hylococcus|l(?:ing|e(?:(?:rs?|d|s))?)|es)|t(?:i(?:stic(?:(?:ians?|al(?:ly)?|s))?|on(?:(?:master|ary|e(?:r(?:[sy])?|d)|ing|s))?|c(?:(?:al(?:ly)?|s))?|ng)|e(?:(?:s(?:m(?:an(?:(?:ship|like))?|en))?|oftheart|l(?:i(?:ness|est)|ess|y)|craft|ments?|rooms|hood|d))?|u(?:t(?:or(?:ily|y)|es?)|e(?:(?:s(?:que)?|ttes?))?|s(?:es)?|res?|ary)|ors?)|b(?:(?:ili(?:s(?:ation|ing|e(?:(?:rs?|d|s))?)|ty)|l(?:e(?:(?:mate|d|r|s))?|ing|y)|b(?:ings?|e[dr])|s))?|r(?:(?:s(?:(?:pangled|t(?:udded|ruck)|hip))?|t(?:(?:l(?:ing(?:ly)?|e(?:[sd])?)|ups?|ing|e(?:rs?|d)|s))?|ch(?:(?:ie(?:st|r)|e[sd]|y))?|gaz(?:e(?:rs?)?|ing)|r(?:y(?:eyed)?|i(?:e(?:st|r)|ng)|ed)|v(?:ation|ing|e(?:[ds])?)|l(?:i(?:ngs?|ght|ke|t)|e(?:ts?|ss))|k(?:(?:ness|e(?:st|r)|ly))?|board|fish|d(?:ust|om)|ing|e(?:[drs])?))?|l(?:l(?:(?:holders|i(?:ons?|ng)|ed|s))?|a(?:gmites?|ctites?)|e(?:(?:mate(?:[ds])?|ness))?|warts?|k(?:(?:ing|e(?:rs?|d)|s))?|in)|k(?:e(?:(?:holders?|d|s))?|ing)|g(?:(?:ger(?:(?:ing(?:ly)?|ed|s))?|e(?:(?:coach(?:es)?|hands|d|r|s|y))?|flation|na(?:t(?:i(?:ng|on)|e(?:[sd])?)|n(?:cy|t))|ings?|s))?|unch(?:(?:ness|est|ing|ly))?|i(?:r(?:(?:cases?|w(?:ells?|ays?)|head|s))?|n(?:(?:less|ing|e[dr]|s))?|d(?:ness)?)|m(?:mer(?:(?:ing|ed|s))?|p(?:(?:e(?:d(?:(?:ing|ed?))?|rs?)|ings?|s))?|ens?|ina)|ff(?:(?:room|ing|ed|s))?|s(?:h(?:ing|e[ds])|is)|di(?:ums?|a)|c(?:k(?:(?:ing|e[dr]|s))?|cato)|v(?:ing|e(?:[ds])?)|y(?:(?:e(?:rs|d)|ing|s))?)|i(?:gma(?:(?:t(?:is(?:ation|ing|ed?)|a)|s))?|p(?:ulat(?:i(?:ons?|ng)|e(?:[ds])?)|e(?:nd(?:(?:iary|s))?|l)|ple[sd])|ck(?:(?:le(?:backs?|r)|i(?:n(?:ess|g)|est|ly)|ers?|s|y))?|mul(?:a(?:t(?:ory?|i(?:on|ng)|e(?:[ds])?)|nts?)|us|i)|l(?:l(?:(?:b(?:irths|orn)|ness|ing|e[dr]|s))?|etto|t(?:(?:ed|s))?)|f(?:f(?:(?:ne(?:cked|ss)|e(?:n(?:(?:ing|e[rd]|s))?|st|r)|ly))?|l(?:ing(?:ly)?|e(?:[ds])?))|tch(?:(?:ing|e[srd]))?|r(?:(?:r(?:ings?|ups?|e(?:rs?|d))|fr(?:ied|y)|s))?|n(?:k(?:(?:ing|ers?|s|y))?|g(?:(?:ray|i(?:ng|ly|er)|e(?:rs?|d)|s|y))?|t(?:(?:ed|s))?)|es)|y(?:(?:l(?:i(?:(?:s(?:t(?:(?:ic(?:(?:ally|s))?|s))?|h(?:(?:ness|ly))?|ation|ed)|ng))?|us(?:es)?|e(?:[ds])?)|mied?|rene|x))?|o(?:r(?:m(?:(?:troopers|i(?:e(?:st|r)|ng)|e(?:rs?|d)|s|y))?|y(?:(?:tell(?:ing|ers?)|lines?|book))?|e(?:(?:keepers?|houses?|rooms?|man|ys?|d|s))?|ages?|i(?:es|ng)|ks?)|c(?:k(?:(?:hold(?:ing|ers)|brok(?:ing|ers?)|taking|pil(?:ing|e(?:[ds])?)|i(?:ng(?:(?:ed|s))?|sts?|ly|er)|room|car|ade|ed|s|y))?|hastic)|o(?:l(?:(?:pigeon|s))?|p(?:(?:ing|ed|s))?|ges?|d)|n(?:e(?:(?:w(?:a(?:lled|re)|ork)|masons?|less|cold|d|s))?|i(?:e(?:st|r)|ly|ng)|y)|m(?:a(?:(?:ch(?:(?:ache|s))?|ta))?|p(?:(?:ing|ed|s))?)|ve(?:(?:pipe|s))?|ut(?:(?:ness|e(?:st|r)|ly))?|p(?:(?:watch|p(?:e(?:r(?:(?:ed|s))?|d)|a(?:ges?|ble)|ing)|over|cock|gap|s))?|l(?:id(?:(?:ity|ly))?|en?)|ic(?:(?:al(?:ly)?|ism|s))?|dg(?:ie(?:st|r)|e|y)|w(?:(?:a(?:way|ge)|ing|ed|s))?|k(?:e(?:(?:rs?|d|s))?|ing)|a(?:ts?)?|ep)|u(?:p(?:e(?:ndous(?:ly)?|f(?:y(?:ing(?:ly)?)?|action|ied))|id(?:(?:it(?:ies|y)|e(?:st|r)|ly))?|ors?)|d(?:(?:i(?:o(?:(?:us(?:(?:ness|ly))?|s))?|e(?:rs?|d|s))|ent(?:s(?:hips?)?)?|y(?:ing)?|ded|s))?|b(?:(?:b(?:orn(?:(?:ness|ly))?|l(?:e(?:[sd])?|y)|ing|ed|y)|s))?|m(?:bl(?:ing(?:ly)?|e(?:[sd])?)|p(?:(?:ing|ed|s|y))?)|ltif(?:y(?:ing)?|ied)|ff(?:(?:i(?:n(?:ess|g)|e(?:st|r))|e[dr]|s|y))?|n(?:(?:n(?:ing(?:ly)?|e[dr])|t(?:(?:man|ing|ed|s))?|s|g))?|tter(?:(?:ing|ed|s))?|r(?:geons?|d(?:i(?:e(?:st|r)|ly)|y))|c(?:co(?:ed)?|k(?:up)?)))|p(?:e(?:c(?:(?:t(?:r(?:o(?:photomet(?:ers?|ry)|scop(?:ic(?:ally)?|es?|y)|met(?:r(?:ic|y)|ers?)|gra(?:ph|m))|um|es?|al?)|a(?:c(?:ular(?:(?:ly|s))?|les?)|tors?))|i(?:a(?:l(?:(?:i(?:s(?:ations?|ing|ts?|ms?|e(?:[sd])?)|t(?:ies|y))|ness|ty|ly|s))?|tion)|f(?:i(?:c(?:(?:a(?:tions?|lly)|it(?:ies|y)|ness|s))?|abl[ye]|e(?:rs?|s|d))|y(?:ing)?)|mens?|ous|es)|ul(?:a(?:t(?:i(?:ve(?:ly)?|ons?|ng)|ors?|e(?:[ds])?)|r)|um)|k(?:(?:le(?:[sd])?|s))?|s))?|l(?:l(?:(?:b(?:ind(?:ing|er)|ound)|ings?|able|e(?:rs?|d)|s))?|t)|e(?:d(?:(?:ometers?|boats?|w(?:ell|ay)|i(?:e(?:st|r)|ng|ly)|cop|ed|up|s|y))?|ch(?:(?:less(?:ly)?|ifying|es))?)|a(?:r(?:(?:head(?:(?:ing|ed|s))?|ing|ed|s))?|k(?:(?:able|ing|ers?|s))?)|rmatozoa|n(?:d(?:(?:thrift|ing|ers?|s))?|cer|t)|w(?:(?:ing|ed|s))?|d)|h(?:ygmomanometer|er(?:ic(?:al(?:ly)?)?|oid(?:al)?|es?)|in(?:cters?|x)|agnum)|r(?:i(?:n(?:g(?:(?:clean(?:ed)?|bo(?:ards?|ks?)|i(?:e(?:st|r)|ng)|time|er|s|y))?|kl(?:e(?:(?:rs?|s|d))?|ing)|t(?:(?:ing|e(?:rs?|d)|s))?)|g(?:(?:htl(?:i(?:ness|e(?:st|r))|y)|s))?|tes?)|e(?:ad(?:(?:s(?:heets?)?|e(?:agled|rs)|ing))?|e(?:ing)?)|o(?:ut(?:(?:ing|ed|s))?|ckets?)|a(?:wl(?:(?:ing|ed|s))?|in(?:(?:ing|ed|s))?|y(?:(?:ing|e(?:rs?|d)|s))?|ng|ts?)|u(?:c(?:ing|ed?)|ng)|y)|o(?:r(?:t(?:(?:s(?:(?:m(?:an(?:ship)?|en)|wear))?|i(?:ng(?:ly)?|ve)|ed|y))?|adic(?:ally)?|rans?|es?)|n(?:tane(?:ous(?:ly)?|ity)|sor(?:(?:s(?:hips?)?|ing|ed))?|g(?:i(?:n(?:ess|g)|e(?:st|r))|e(?:[drs])?|y))|ke(?:(?:s(?:(?:pe(?:rsons?|ople)|wom(?:en|an)|haves?|m(?:en|an)))?|n))?|t(?:(?:l(?:i(?:ght(?:(?:ing|s))?|t)|ess(?:(?:ness|ly))?)|t(?:i(?:e(?:st|r)|ng)|e(?:rs?|d)|y)|on|s))?|il(?:(?:s(?:port)?|ing|e(?:rs?|d)|age|t))?|o(?:n(?:(?:fuls?|ing|ed|s))?|l(?:(?:ing|ed|s))?|k(?:(?:ing|ed|s|y))?|fs?|r)|u(?:t(?:(?:ing|ed|s))?|ses?))|i(?:r(?:it(?:(?:ual(?:(?:i(?:s(?:ts?|ed|m)|ty)|ly|s))?|ed(?:ly?)?|less|s))?|a(?:l(?:(?:l(?:ing|ed|y)|s))?|nts?)|es?)|n(?:(?:e(?:(?:chilling|less|s|t))?|s(?:ter(?:(?:hood|s))?)?|d(?:r(?:i(?:ers?|ft)|y)|l(?:es?|y))|n(?:aker|ing|e(?:rs?|y))|offs?|a(?:ch|l)|y))?|t(?:(?:e(?:ful(?:ly)?)?|t(?:oons?|ing|le)|fires?|s))?|l(?:l(?:(?:ages?|ing|e[dr]|s))?|t)|k(?:i(?:e(?:st|r)|ng)|e(?:[ds])?|y)|c(?:e(?:(?:ry?|d|s))?|i(?:er|ly|ng)|y)|der(?:[sy])?|got|e[sd])|a(?:(?:s(?:(?:m(?:(?:odic(?:ally)?|s))?|tics?))?|c(?:i(?:ous(?:(?:ness|ly))?|ngs?|al)|e(?:(?:flight|craft|s(?:(?:hips?|uits?))?|m(?:en|an)|age|rs?|d|y))?)|r(?:(?:r(?:ow(?:(?:hawk|s))?|ing|ed)|k(?:(?:l(?:ing(?:ly)?|e(?:(?:rs?|s|d))?|y)|ing|ed|s))?|s(?:(?:e(?:(?:ness|st|ly|r))?|ity))?|ing(?:ly)?|e(?:(?:time|ly|d|s))?|ta(?:ns?)?))?|t(?:(?:ter(?:(?:ing|ed|s))?|ial(?:ly)?|ulas?|s|e))?|n(?:(?:k(?:(?:ings?|e[dr]|s))?|drels|n(?:ing|e(?:rs?|d))|i(?:els?|sh)|gle(?:[sd])?|s))?|ghetti|de(?:(?:work|d|s))?|wn(?:(?:ing|ed|s))?|y(?:(?:ing|ed|s))?|in|m))?|l(?:u(?:tter(?:(?:ing|ed|s))?|rge)|i(?:n(?:t(?:(?:e(?:r(?:(?:ing|ed|s))?|d)|s))?|es?)|t(?:(?:t(?:able|ings?|ers?)|s))?|c(?:ing|e(?:(?:rs?|d|s))?))|a(?:t(?:ter(?:(?:ing|ed))?)?|sh(?:(?:down|ing|e[sd]|y))?|y(?:ing|ed))|e(?:n(?:d(?:id(?:ly)?|ours?)|etic)|ens?)|o(?:tches|dges?))|u(?:r(?:(?:ious(?:ly)?|t(?:(?:ing|ed|s))?|r(?:ing|ed)|n(?:(?:ing|ed|s))?|ges?|s))?|t(?:ter(?:(?:ing|ed))?|niks?|um)|n(?:ky)?|me|d)|y(?:(?:glass|hole|ings?))?)|u(?:p(?:(?:er(?:(?:c(?:o(?:nduct(?:i(?:vity|ng)|ors?)|mput(?:ing|ers?)|ol(?:ing|ed))|ilious(?:(?:ness|ly))?|ritical|harge[rd])|s(?:t(?:ructures?|itio(?:us(?:ly)?|ns?)|ores?|a(?:tes?|rs?))|aturat(?:ion|ed)|onic(?:ally)?|cripts?|ed(?:ing|e(?:[ds])?))|i(?:ntend(?:en(?:ts?|ce))?|mpos(?:i(?:tion|ng)|e(?:[sd])?)|or(?:(?:ity|s))?)|po(?:s(?:itions?|ed?)|wers?)|n(?:at(?:ural(?:ly)?|ant)|umerary|ovae?)|f(?:i(?:cial(?:(?:ity|ly))?|x)|lu(?:ous(?:ly)?|it(?:ies|y))|amily)|a(?:nnuat(?:i(?:on|ng)|ed?)|bundan(?:ce|t))|ordinate|lative(?:(?:ly|s))?|v(?:is(?:i(?:ons?|ng)|or(?:[ys])?|e(?:[ds])?)|ene)|tankers?|m(?:a(?:rkets?|n)|odels?|en)|h(?:e(?:at(?:ed)?|ro)|uman)|dense|glue|b(?:ly)?))?|r(?:anational(?:ism)?|em(?:a(?:c(?:ist|y)|l)|e(?:ly)?|o))|p(?:l(?:e(?:(?:ment(?:(?:a(?:tion|ry|l)|ing|ed|s))?|ness))?|i(?:ca(?:t(?:i(?:ons?|ng)|e)|nts?)|ants?|e(?:rs?|s|d))|ant(?:(?:ing|ed))?|y(?:ing)?)|o(?:rt(?:(?:ab(?:ility|le)|e(?:rs?|d)|i(?:ng|ve)|s))?|s(?:i(?:t(?:ories|ions?)|ng)|e(?:(?:d(?:ly)?|s))?))|ress(?:(?:i(?:ble|ve|on|ng)|ors?|e[ds]))?|urating|e(?:rs?|d)|ing)|ine|s))?|s(?:ceptib(?:ilit(?:ies|y)|le)|t(?:ain(?:(?:ab(?:ility|l[ye])|ing|ed|s))?|enance)|p(?:icio(?:us(?:ly)?|ns?)|e(?:n(?:s(?:ions?|e)|d(?:(?:e(?:rs?|d)|ing|s))?)|ct(?:(?:ing|ed|s))?))|his?)|b(?:(?:c(?:o(?:n(?:scious(?:(?:ness|ly))?|t(?:ract(?:(?:ors?|ing|ed))?|inent))|mmittees?)|u(?:taneous(?:ly)?|ltur(?:es?|al))|lass(?:es)?)|u(?:rb(?:(?:an(?:i(?:sation|tes))?|ia|s))?|nits?)|s(?:(?:t(?:a(?:n(?:ti(?:a(?:t(?:i(?:on|ng)|e(?:[sd])?)|l(?:ly)?)|ve(?:(?:ly|s))?)|dard|ces?)|tion)|r(?:uctures?|at(?:es?|um|a))|itut(?:i(?:ons?|ng)|able|e(?:[sd])?))|cri(?:pt(?:(?:ions?|s))?|b(?:ing|e(?:(?:rs?|d|s))?))|i(?:d(?:i(?:ar(?:i(?:ty|es)|y)|s(?:ing|e(?:[ds])?)|ng|es)|e(?:(?:nce|s|d))?|y)|st(?:(?:e(?:nce|d)|ing|s))?)|e(?:rvien(?:ce|t)|quent(?:ly)?|ctions?|ts?)|p(?:ecies|aces?)|u(?:rface|m(?:ing|e(?:[sd])?))|ystems?|o(?:nic|il)))?|m(?:i(?:ssi(?:ve(?:(?:ness|ly))?|ons?)|t(?:(?:t(?:able|e(?:rs?|d)|ing)|s))?)|er(?:si(?:ble|on)|g(?:e(?:(?:nce|s|d))?|ing))|arines?)|t(?:r(?:act(?:(?:i(?:ve(?:ly)?|ons?|ng)|ed|s))?|opic(?:al|s))|e(?:r(?:ranean|fuge)|n(?:ants|d(?:(?:ing|ed|s))?)|xt)|itl(?:ing|e(?:[sd])?)|l(?:e(?:(?:t(?:ies|y)|st|r))?|y)|otals?|ypes?)|o(?:rdinat(?:i(?:on|ng)|e(?:[sd])?)|ptimal)|ve(?:r(?:si(?:ve(?:(?:ly|s))?|on)|t(?:(?:ing|ed|s))?)|ntions?)|l(?:im(?:i(?:nal(?:ly)?|ty)|at(?:ion|ed?)|e(?:(?:st?|ly|d))?)|unary|ayer)|j(?:ect(?:(?:i(?:v(?:i(?:ty|s[tm])|e(?:ly)?)|ng|on)|ed|s))?|u(?:nctive|gat(?:i(?:on|ng)|ed?)))|h(?:armonics?|uman)|d(?:ivi(?:sions?|d(?:ing|e(?:[ds])?))|u(?:ct(?:ion|ed)|ing|e(?:[ds])?))|r(?:outines?|egional)|p(?:rograms?|oena(?:ed)?|lots?)|a(?:lterns?|tomic|rctic)|editors?|normal|groups?|family|b(?:ing|ed)|ways?|zero))?|r(?:r(?:e(?:ptitious(?:ly)?|nder(?:(?:ing|ed|s))?|al(?:i(?:s(?:t(?:(?:ic|s))?|m)|ty))?|ys?)|o(?:und(?:(?:ings?|ed|s))?|ga(?:tes?|cy)))|v(?:iv(?:a(?:b(?:ility|le)|ls?)|ors?|ing|e(?:[sd])?)|e(?:illance|y(?:(?:ors?|ing|ed|s))?))|p(?:ris(?:ing(?:ly)?|e(?:[sd])?)|ass(?:(?:ing|e[sd]))?|l(?:us(?:es)?|ice))|m(?:ount(?:(?:able|ing|ed))?|is(?:ing|e(?:[sd])?))|f(?:(?:ac(?:tants?|ing|e(?:[srd])?)|board|ings?|e(?:it|rs?|d)|s))?|charge(?:[ds])?|e(?:(?:footed|t(?:ies|y)|ness|ly|st|r))?|g(?:i(?:cal(?:ly)?|ng)|e(?:(?:r(?:ies|y)|ons?|d|s))?)|l(?:i(?:ness|est|ly)|y)|t(?:itles|ax)|names?|d)|g(?:gest(?:(?:i(?:ve(?:(?:ness|ly))?|b(?:ility|le)|ons?|ng)|e(?:rs?|d)|s))?|ar(?:(?:coated|plums|ing|ed|s|y))?|illate)|m(?:(?:p(?:(?:tuous(?:(?:ness|ly))?|s))?|m(?:a(?:(?:r(?:i(?:s(?:ing|e(?:(?:rs?|d|s))?)|ly|es)|y)|b(?:ility|le)|tions?))?|e(?:r(?:(?:time|s|y))?|d)|on(?:(?:ings?|s(?:(?:ing|e[sd]))?|e[rd]))?|i(?:ng|ts?))|atra|s|o))?|l(?:ph(?:onamides|ur(?:(?:ous|ic))?|ides?|ates?)|l(?:en(?:(?:ness|ly))?|y(?:ing)?|ied)|k(?:(?:i(?:n(?:ess|g)|e(?:st|r)|ly)|ed|y|s))?|t(?:an(?:(?:as?|s))?|ry))|i(?:t(?:(?:ab(?:ilit(?:ies|y)|l(?:e(?:ness)?|y))|cases?|ing|ors?|e(?:[ds])?|s))?|cid(?:al(?:ly)?|es?)|ng)|ff(?:ocat(?:i(?:ng(?:ly)?|on)|e(?:[ds])?)|rag(?:e(?:ttes?)?|ist)|i(?:c(?:i(?:en(?:t(?:ly)?|cy)|ng)|e(?:[sd])?)|x(?:e[sd])?)|er(?:(?:ance|ings?|e(?:rs?|d)|s))?|us(?:i(?:on|ng)|e(?:[sd])?))|c(?:c(?:inct(?:(?:ness|ly))?|e(?:ss(?:(?:i(?:ve(?:ly)?|ons?)|ful(?:ly)?|ors?|es))?|ed(?:(?:ing|ed|s))?)|u(?:len(?:ce|t)|mb(?:(?:ing|ed|s))?)|our)|h(?:(?:andsuch|like))?|k(?:(?:l(?:ings?|e(?:[ds])?)|able|e(?:rs?|d)|ing|s))?|rose|tion)|d(?:(?:den(?:(?:ness|ly))?|an|s))?|n(?:(?:b(?:ath(?:(?:e(?:(?:rs|d))?|ing))?|ur(?:n(?:(?:ed|t|s))?|st)|lock|e(?:ams?|ds?))|flowers?|g(?:lasses)?|l(?:ounger|i(?:ght|t)|ess)|s(?:(?:creens?|troke|pots?|h(?:ine|ade)|ets?))?|tan(?:ned)?|r(?:ises?|oof)|n(?:i(?:e(?:st|r)|ng)|ed|y)|d(?:r(?:ie[sd]|y)|ials?|a(?:es|ys?)|own)|cream|k(?:(?:ing|en))?))?|zerainty|a(?:sion|ve(?:ly)?)|tures?|e(?:(?:de?|t|s))?)|e(?:l(?:f(?:(?:r(?:ighteous(?:(?:ness|ly))?|es(?:pect(?:ing)?|traint))|c(?:on(?:scious(?:(?:ness|ly))?|trol(?:led)?|fiden(?:ce|t))|entred(?:ness)?)|s(?:a(?:crific(?:ing|e)|me)|upporting)|d(?:e(?:struct(?:(?:i(?:ve|on|ng)|ed|s))?|fence)|iscipline)|govern(?:ment|ing)|p(?:ortraits?|ity)|i(?:n(?:flicted|terest)|sh(?:(?:ness|ly))?)|e(?:mployed|vident|steem)|less(?:ly)?|taught|made))?|e(?:ct(?:(?:i(?:v(?:ity|e(?:ly)?)|ons?|ng)|able|ors?|e[ed]|s))?|n(?:ology|ium))|l(?:(?:able|ers?|ing|s))?|dom|ves)|n(?:(?:s(?:ation(?:(?:al(?:(?:is(?:t(?:ic)?|ed|m)|ly))?|s))?|i(?:ti(?:v(?:it(?:ies|y)|e(?:(?:ness|ly))?)|s(?:ation|e(?:rs|d)))|b(?:ilit(?:ies|y)|l(?:e(?:ness)?|y))|ngs?)|e(?:(?:less(?:(?:ness|ly))?|d|s))?|u(?:ous(?:(?:ness|ly))?|al(?:(?:ity|ly))?)|or(?:[sy])?)|t(?:(?:i(?:ment(?:(?:al(?:(?:i(?:s(?:ed|t|m)|ty)|ly))?|s))?|nels?|en(?:ce|t))|en(?:ti(?:ous(?:ly)?|al)|c(?:ing|e(?:[sd])?))|r(?:ies|y)))?|at(?:or(?:(?:ial|s))?|es?)|or(?:itas|a)|i(?:or(?:(?:ity|s))?|l(?:ity|e))|d(?:(?:ers?|ing|s))?|egal|hors?))?|r(?:en(?:dipit(?:ous(?:ly)?|y)|a(?:d(?:ing|e(?:[sr])?)|ta)|ity|e(?:(?:st|ly|r))?)|v(?:i(?:c(?:e(?:(?:ab(?:ility|le)|m(?:an|en)|s|d))?|ing)|tude|l(?:ity|e(?:ly)?)|ette|ngs?)|ants?|e(?:(?:rs?|d|s))?)|i(?:al(?:(?:is(?:ations?|ing|ed?)|ly|s))?|ous(?:(?:ness|ly))?|f(?:(?:ed|s))?|es)|o(?:negative|log(?:ical|y)|tonin)|a(?:ph(?:i(?:c(?:ally)?|m)|s)|glio|i)|pent(?:(?:ine|s))?|ge(?:ants?)?|r(?:ated?|ied)|f(?:(?:hood|dom|s))?|mons?|ums?)|m(?:i(?:(?:c(?:o(?:n(?:duct(?:ors?|ing)|scious)|lons?)|irc(?:ular|le))|final(?:(?:ists?|s))?|detached|nar(?:(?:ies|y|s))?|t(?:ics?|es?)))?|a(?:ntic(?:(?:ally|s))?|phor(?:ing|es?))|blances?|e(?:sters?|n))|c(?:(?:u(?:lar(?:is(?:ation|ts?|ed|m))?|r(?:i(?:t(?:ies|y)|ng)|e(?:(?:st?|ly|d|r))?))|re(?:t(?:(?:i(?:ve(?:(?:ness|ly))?|ons?|ng)|ar(?:y(?:ship)?|i(?:a(?:ts?|l)|es))|ory|ly|e(?:[sd])?|s))?|cy)|e(?:ssion(?:(?:ists?|s))?|d(?:ing|e(?:[ds])?))|t(?:(?:arian(?:ism)?|ion(?:(?:ing|ed|al|s))?|or(?:(?:ed|al|s))?|s))?|ond(?:(?:ments?|class|ar(?:i(?:ly|es)|y)|best|hand|rate|ing|e(?:rs?|d)|ly|s))?|lu(?:sion|ded?)|a(?:teurs|nt)))?|qu(?:e(?:st(?:rat(?:ion|ed)|ered)|n(?:t(?:ial(?:ly)?)?|c(?:e(?:(?:rs?|s|d))?|ing))|ls?)|in(?:(?:ned|s))?|oia)|i(?:s(?:m(?:o(?:log(?:i(?:sts?|cal)|y)|meters?|gra(?:ph|m))|ic)|in)|z(?:ures?|ing|e(?:[drs])?)|ne)|d(?:u(?:c(?:ti(?:ve(?:(?:ness|ly))?|ons?)|ing|e(?:(?:rs?|d|s))?)|lously)|i(?:ment(?:(?:a(?:tion|ry)|s))?|tio(?:us|n))|a(?:t(?:e(?:(?:ness|ly|d|r|s))?|i(?:ves?|on|ng))|n)|entary|ges?)|p(?:ara(?:t(?:e(?:(?:ness|ly|s|d))?|i(?:s(?:ts?|m)|ons?|ng)|ors?)|b(?:ility|le))|t(?:ic(?:aemia)?|e(?:mber|ts?))|ulchr(?:al|es?)|ia)|g(?:ment(?:(?:a(?:tion|l)|ing|ed|s))?|regat(?:i(?:on|ng)|e(?:[ds])?))|a(?:(?:r(?:(?:ch(?:(?:lights?|ing(?:ly)?|e(?:rs?|s|d)))?|ing|ed|s))?|m(?:(?:s(?:tress(?:es)?)?|a(?:n(?:ship)?|il)|less(?:ly)?|ier|e[dn]|y))?|s(?:(?:on(?:(?:a(?:l(?:(?:ity|ly))?|bl[ey])|ing|e[rd]|s))?|i(?:ck(?:ness)?|de)|h(?:ores?|ells)|capes?))?|w(?:orthy|eeds?|a(?:ter|rds?))|p(?:lanes?|orts?)|f(?:ar(?:ing|ers?)|ront|ood)|t(?:(?:ings?|tle|ed|s))?|l(?:(?:ants?|e(?:rs?|d)|i(?:ng|on)|s))?|g(?:ulls?|reen|o(?:ing|d))|b(?:o(?:rne|ard)|irds?|ed)|cows?|nces?))?|x(?:(?:ual(?:(?:it(?:ies|y)|ly))?|olog(?:ists|y)|t(?:uplets?|ants?|ets?|ons?)|i(?:n(?:ess|g)|e(?:st|r)|s(?:ts?|m)|ly)|less|e[sd]|y))?|ve(?:n(?:(?:t(?:een(?:th)?|ie(?:th|s)|h|y)|pence|fold|s))?|r(?:(?:a(?:nce|l(?:ly)?|ble)|i(?:ty|ng)|e(?:(?:st|ly|d|r))?|s))?)|t(?:(?:t(?:l(?:e(?:(?:ments?|rs?|d|s))?|ing)|ings?|e(?:es?|rs?)|s)|s(?:wana)?|backs?|up|h))?|e(?:(?:th(?:rough|ing|e(?:[ds])?)|m(?:(?:l(?:ie(?:st|r)|y)|ing(?:ly)?|ed|s))?|d(?:(?:l(?:ings?|ess)|i(?:n(?:ess|g)|e(?:st|r))|bed|e[dr]|y|s))?|able|ings?|k(?:(?:ers?|ing|s))?|p(?:(?:age|ing|ed|s))?|s(?:aws?)?|rs?|n))?|baceous|w(?:(?:e(?:r(?:(?:rat|age|s))?|d)|ings?|age|n|s))?|s(?:si(?:ons?|le)|otho|ame)|oul)|c(?:h(?:i(?:zo(?:phreni(?:c(?:(?:ally|s))?|a)|id)|s(?:t(?:(?:osomiasis|s))?|m(?:(?:atics?|s))?))|o(?:o(?:l(?:(?:teachers?|m(?:istress|a(?:sters?|tes))|child(?:ren)?|house|girls?|boys?|days|room|ing|ed|s))?|ners?)|la(?:stic(?:ism)?|r(?:(?:s(?:hips?)?|ly))?))|e(?:m(?:a(?:(?:t(?:ic(?:(?:ally|s))?|a)|s))?|ing|e(?:[drs])?)|dul(?:e(?:(?:rs?|s|d))?|ing)|rz[io])|napps|malz|was?)|r(?:u(?:p(?:ulous(?:(?:ness|ly))?|les?)|tin(?:i(?:s(?:ing|e(?:[sd])?)|es)|eers|y)|m(?:(?:mag(?:ing|e)|half|s))?|nched|ff(?:(?:ier|y))?|b(?:(?:land|b(?:ing|e(?:rs?|d)|y)|s))?)|i(?:pt(?:(?:writ(?:ing|ers?)|orium|ur(?:al|es?)|ing|ed|s))?|b(?:bl(?:ings?|e(?:(?:rs?|s|d))?)|ing|al|e(?:[ds])?)|mped)|e(?:w(?:(?:drivers?|ing|ed|s|y))?|e(?:(?:n(?:(?:writer|plays?|ings?|ed|s))?|ch(?:(?:i(?:e(?:st|r)|ng)|e[sd]|y))?|ds?))?|am(?:(?:ing(?:ly)?|e(?:rs?|d)|s))?)|a(?:tch(?:(?:i(?:n(?:ess|gs?)|e(?:st|r))|e[sd]|y))?|bbl(?:ing|ed?)|m(?:(?:bl(?:e(?:(?:rs?|s|d))?|ing)|s))?|p(?:(?:books?|p(?:i(?:e(?:st|r)|ng)|ed|y)|yards?|i(?:ngs?|e)|e(?:(?:rs?|d|s))?|s))?|w(?:n(?:ie(?:st|r)|y)|l(?:(?:ing|ed|s))?))|o(?:ll(?:(?:able|ing|ed|s))?|oges?|tum))|i(?:nti(?:llat(?:i(?:ons?|ng)|ors?|ed?)|graphy)|en(?:ti(?:fic(?:ally)?|sts?)|ces?)|ssor(?:(?:ed|s))?|mitars?|atica|fi)|a(?:r(?:(?:e(?:(?:monger(?:ing)?|crows?|d|s))?|c(?:e(?:(?:ness|st|ly|r))?|it(?:ies|y))|i(?:f(?:y(?:ing)?|ied)|e(?:st|r)|ly|ng)|r(?:ing|ed)|lets?|ves|ab|fs?|y|s|p))?|t(?:(?:ological|ter(?:(?:ings?|e(?:rs?|d)|s))?|h(?:ing(?:ly)?|ed?)))?|n(?:(?:dal(?:(?:ous(?:ly)?|ised?|s))?|t(?:(?:i(?:ness|e(?:st|r)|ly)|y))?|s(?:ion)?|n(?:ing|e(?:rs?|d))))?|l(?:a(?:b(?:ility|le)|rs?)|lop(?:(?:ed|s))?|p(?:(?:ing|e(?:ls?|d)|s))?|d(?:(?:ing|ed|s))?|e(?:(?:ne|d|s))?|ing|y)|ffold(?:(?:ing|s))?|m(?:(?:p(?:(?:e(?:r(?:(?:ing|ed))?|d)|i))?|s))?|p(?:e(?:goats?)?|ula)|veng(?:e(?:(?:rs?|d))?|ing)|b(?:(?:b(?:ards?|ed|y)|ies|s))?)|o(?:u(?:t(?:(?:masters?|ing|ed|s))?|ndrels?|r(?:(?:g(?:ing|e(?:[sd])?)|ing|ed|s))?)|r(?:e(?:(?:boards?|cards?|l(?:ine|ess)|rs?|d|s))?|n(?:(?:ful(?:ly)?|ing|ed|s))?|pions?|ch(?:(?:ing|e[srd]))?|ing)|wl(?:(?:ing|ed|s))?|t(?:(?:tish|s(?:man)?|land|free|ch(?:e[sd])?))?|o(?:t(?:(?:ing|ers?|s))?|p(?:(?:ing|ful|e[dr]|s))?)|ld(?:(?:ing|e[dr]|s))?|ff(?:(?:ing|ed))?|nes?|pes?)|e(?:pt(?:ic(?:(?:al(?:ly)?|ism|s))?|re(?:[sd])?)|n(?:ic(?:ally)?|t(?:(?:less|ing|ed|s))?|ario|e(?:(?:ry|s))?))|u(?:l(?:l(?:(?:e(?:r(?:(?:ies|y))?|d)|ing|s))?|pt(?:(?:ress|ur(?:al|e(?:[ds])?)|ors?|ing|ed))?)|r(?:r(?:i(?:lous|e[sd])|y(?:ings?)?)|vy)|ttl(?:ing|e(?:[sd])?)|pper(?:ed)?|ff(?:(?:l(?:ing|e(?:[sd])?)|ing|ed))?|d(?:(?:d(?:ing|ed)|s))?|bas?|m)|lerosis|yth(?:ing|e(?:[ds])?))|o(?:c(?:i(?:o(?:l(?:inguist(?:ics?|s)|og(?:i(?:cal(?:ly)?|sts?)|y))|political|economic|cultural|biology)|a(?:l(?:(?:i(?:s(?:ation|t(?:(?:ic|s))?|ing|ed?|m)|te)|ly|s))?|b(?:ility|l[ye]))|et(?:ies|al|y))|rates|alled|k(?:(?:e(?:ts?|d)|ing|s))?|cer)|u(?:l(?:(?:destroying|s(?:earching)?|ful(?:ly)?|less|ed))?|nd(?:(?:proof(?:(?:ing|ed))?|tracks?|l(?:ess(?:ly)?|y)|check|ness|ings?|e(?:st|d|r)|s))?|th(?:(?:er(?:n(?:(?:most|ers?))?|ly)|bound|wards?))?|ght(?:after)?|briquet|r(?:(?:c(?:e(?:(?:less|d|s))?|ing)|ness|e(?:st|d)|ing|ly|s))?|venirs?|ffle|dan|sed|p(?:[ys])?|ks?)|p(?:(?:hist(?:(?:icat(?:ion|e(?:[sd])?)|ry|s))?|orific|p(?:ing|y)|rano))?|l(?:i(?:d(?:(?:i(?:f(?:i(?:cation|e[ds])|y(?:ing)?)|ty)|arity|ness|ly|s))?|cit(?:(?:ations?|o(?:us(?:ly)?|rs?)|ing|ude|ed|s))?|t(?:udes?|a(?:ire|ry)))|e(?:(?:mn(?:(?:it(?:ies|y)|ly))?|noid(?:(?:al|s))?|cisms?|ly|s|r))?|d(?:(?:ier(?:(?:ing|ly|ed|y|s))?|er(?:(?:ing|ed|s))?))?|u(?:b(?:ility|le)|t(?:ions?|es?))|stices?|v(?:e(?:(?:n(?:ts?|cy)|rs?|d|s))?|able|ing)|o(?:i(?:sts?|ng))?|a(?:r(?:i(?:um|a))?|ces?|num)|fa)|m(?:e(?:(?:rsault(?:(?:ing|ed|s))?|w(?:h(?:ere|at)|ays?)|t(?:imes?|hing)|body|day|how|one))?|n(?:ambulist|olen(?:ce|t))|bre(?:(?:ness|ro|ly))?|a(?:(?:lia?|tic|s))?)|n(?:(?:or(?:ous(?:(?:ness|ly))?|it(?:ies|y)|a)|g(?:(?:writ(?:ing|ers?)|s(?:ters)?|b(?:irds?|ook)))?|s(?:inlaw)?|i(?:c(?:ally)?|nlaw)|a(?:tas?|rs?)|n(?:ets?|y)|es))?|v(?:ereign(?:(?:ty|s))?|iet)|r(?:r(?:ow(?:(?:ful(?:ly)?|ing|ed|s))?|ie(?:st|r)|el|y)|did(?:(?:ness|ly))?|cer(?:e(?:ss|rs?)|y)|t(?:(?:able|e(?:rs?|d)|i(?:es?|ng)|s))?|ority|e(?:(?:ness|ly|s))?|bets?|ghum)|o(?:t(?:(?:h(?:say(?:ing|ers?)|ing(?:ly)?|e(?:(?:rs|d|s))?)|ier|y|s))?|n(?:(?:e(?:st|r)|ish))?)|f(?:t(?:(?:hearted|b(?:oiled|all)|spoken|e(?:n(?:(?:ing|e(?:rs?|d)|s))?|st|r)|w(?:ood|are)|ness|i(?:sh|e)|ly|y))?|fit|as?)|d(?:(?:om(?:(?:i(?:s(?:ing|ed?)|tes?)|y))?|d(?:e[dn]|y)|ium|as?|s))?|journ(?:(?:e(?:rs?|d)|ing|s))?|b(?:(?:ri(?:quet|ety)|er(?:(?:ing|e[dr]|ly|s))?|b(?:ings?|ed)|s))?|a(?:r(?:(?:ing(?:ly)?|ed|s))?|p(?:(?:i(?:e(?:st|r)|ng)|box|ed|y|s))?|k(?:(?:ings?|e(?:rs?|d)|s))?|ndso)|y(?:(?:beans?|a))?|i(?:l(?:(?:ings?|ed|s))?|ree)|gg(?:ie(?:st|r)|y)|w(?:(?:e(?:rs?|to|d)|ing|n|s))?|t(?:ho)?|so?|h)|i(?:n(?:(?:g(?:(?:l(?:e(?:(?:minded(?:(?:ness|ly))?|handed(?:ly)?|ness|s))?|y)|ular(?:(?:i(?:sation|t(?:ies|y))|ly|s))?|a(?:long|ble)|s(?:ong)?|e(?:(?:ing|rs?|d|s))?|ing))?|u(?:s(?:(?:oid(?:al(?:ly)?)?|itis|es))?|ous(?:ly)?)|e(?:(?:cur(?:ist|es?)|w(?:[sy])?|s))?|ful(?:(?:ness|ly))?|ist(?:er(?:ly)?|ral)|ce(?:r(?:ity|e(?:(?:st|ly))?))?|k(?:(?:able|ers?|ing|s))?|less|n(?:e(?:rs?|d)|ing)|ters?|ai|s))?|m(?:p(?:l(?:i(?:f(?:i(?:cations?|e[drs])|y(?:ing)?)|s(?:tic(?:ally)?|m)|cit(?:ies|y))|e(?:(?:minded|tons?|x(?:es)?|st|r))?|y)|er(?:(?:ing|ed|s))?)|ul(?:tane(?:ous(?:ly)?|ity)|a(?:t(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|crum)|casts)|il(?:ar(?:(?:it(?:ies|y)|ly))?|itude|es?)|mer(?:(?:ing|ed|s))?|eon)|g(?:n(?:(?:i(?:f(?:i(?:ca(?:tions?|n(?:t(?:ly)?|ces?))|e[srd])|y(?:ing)?)|ngs?)|post(?:(?:ing|ed|s))?|a(?:t(?:or(?:ies|y)|ures?)|l(?:(?:l(?:e(?:rs?|d)|ing|y)|m(?:en|an)|s))?)|boards|writer|e(?:rs?|d|t)|or(?:[as])?|s))?|h(?:(?:t(?:(?:s(?:ee(?:(?:ing|rs))?)?|l(?:ess(?:ly)?|y)|ed(?:ness)?|ings?))?|ing|ed|s))?|m(?:oid|a))|t(?:(?:uat(?:i(?:on(?:(?:al(?:ly)?|ist|s))?|ng)|ed?)|t(?:ings?|ers?)|coms?|ings?|e(?:[sd])?|ar|s))?|s(?:(?:ter(?:(?:s(?:inlaw)?|inlaw|hood|ly))?|s(?:ies|y)|al))?|l(?:ver(?:(?:s(?:miths?)?|ware|ing|ed|y))?|houette(?:[sd])?|t(?:(?:s(?:tone)?|ing|ed|y))?|l(?:i(?:ness|e(?:st|r))|y)|k(?:(?:worms?|i(?:ness|e(?:st|r)|ly)|like|en|y|s))?|ic(?:o(?:sis|ne?)|a(?:tes?)?)|en(?:c(?:ing|e(?:(?:rs?|s|d))?)|t(?:ly)?)|age|o)|d(?:e(?:(?:track(?:(?:ing|ed))?|s(?:(?:tep(?:(?:p(?:ing|ed)|s))?|wipes|hows?))?|w(?:inders|a(?:rds|ys|lk))|b(?:oards?|urns|ands?)|l(?:i(?:ghts?|nes?)|ong)|r(?:eal)?|kick|car|d))?|ings?|l(?:ing|ed?))|c(?:(?:k(?:(?:e(?:n(?:(?:ing(?:ly)?|ed|s))?|st|r)|ness(?:es)?|l(?:iest|es?|y)|room|b(?:ay|ed)))?|il(?:ian|y)))?|x(?:(?:t(?:een(?:th)?|ie(?:th|s)|hs?|y)|pence|fold|es))?|p(?:(?:hon(?:(?:ing|ed|s))?|p(?:e(?:rs?|d)|ing)|s))?|b(?:ilan(?:c[ye]|t)|lings?|erian?|yl)|z(?:zl(?:ing|e(?:[ds])?)|e(?:(?:able|s|d))?|ing)|r(?:(?:loins?|e(?:(?:ns?|s|d))?|ius|s))?|ft(?:(?:ings?|e(?:rs?|d)|s))?|am(?:ese)?|e(?:stas?|v(?:ing|e(?:[ds])?)|ges?|nna|rra))|h(?:o(?:r(?:t(?:(?:s(?:(?:ighted(?:(?:ness|ly))?|taffed))?|c(?:ircuit(?:(?:ing|ed))?|omings?|rust|uts?)|te(?:mpered|rm)|l(?:i(?:st(?:(?:ing|ed))?|ved)|y)|winded|bread|e(?:n(?:(?:ing|ed|s))?|st|d|r)|falls?|ness|hand|ages?|i(?:sh|ng)|y))?|e(?:(?:lines?|wards?|d|s))?|ing|n)|w(?:(?:m(?:an(?:ship)?|en)|jumpers|cas(?:ing|es?)|g(?:round|irl)|p(?:ieces?|lace)|rooms?|e(?:r(?:(?:ing|ed|s|y))?|d)|i(?:ngs?|e(?:st|r))|down|off|y|s|n))?|u(?:ld(?:er(?:(?:ing|ed|s))?)?|t(?:(?:ing|e(?:rs?|d)|s))?)|p(?:(?:lift(?:(?:ing|e(?:rs?|d)))?|keep(?:ing|ers?)|fronts?|p(?:ing|e(?:rs?|d))|s))?|e(?:(?:s(?:trings?)?|makers?|l(?:aces?|ess)|horn|box|ing|d))?|ck(?:(?:ing(?:ly)?|e(?:rs?|d)|s))?|d(?:d(?:i(?:ness|e(?:st|r)|ly)|y))?|v(?:e(?:(?:l(?:(?:l(?:ing|e[rd])|ful|s))?|d|s))?|ing)|o(?:(?:t(?:(?:ings?|ers?|s))?|ing|ed|k))?|t(?:(?:guns?|s))?|guns?|als?|ne)|a(?:r(?:e(?:(?:hold(?:ings?|ers?)|ware|able|d|r|s))?|p(?:(?:e(?:n(?:(?:e(?:rs?|d)|ing|s))?|st|r)|ness|ly|s))?|able|ing|ds?|ks?)|m(?:(?:e(?:(?:less(?:(?:ness|ly))?|f(?:aced(?:ly)?|ul(?:ly)?)|d|s))?|an(?:(?:i(?:s(?:tic|m)|c)|s))?|poo(?:(?:ing|ed|s))?|bl(?:ing|e(?:[sd])?)|rock|m(?:ing|ed)|ing|s))?|tter(?:(?:proof|ing(?:ly)?|ed|s))?|l(?:l(?:o(?:w(?:(?:ness|e(?:st|r)|ly|s))?|ts?))?|e)|bb(?:i(?:ness|e(?:st|r)|ly)|y)|d(?:ow(?:(?:less|ing|ed|s|y))?|e(?:(?:less|d|s))?|i(?:ngs?|e(?:st|r)|ly)|y)|p(?:e(?:(?:l(?:ie(?:st|r)|ess|y)|rs?|d|s))?|ing)|k(?:e(?:(?:down|able|ups?|rs?|n|s))?|i(?:e(?:st|r)|ly|ng)|able|y)|g(?:(?:g(?:iest|ed|y)|s))?|v(?:ings?|e(?:(?:rs?|d|n|s))?)|n(?:t(?:ies|y)|dy|ks?)|ft(?:(?:ing|ed|s))?|ck(?:(?:le(?:[sd])?|s))?|w(?:ls?)?|hs?)|u(?:t(?:(?:t(?:l(?:e(?:(?:cocks?|s|d))?|ing)|er(?:(?:ing|ed|s))?|ing)|downs?|up|s))?|dder(?:(?:ing|ed|s))?|ffl(?:ing|e(?:(?:rs?|s|d))?)|n(?:(?:t(?:(?:ing|e(?:rs?|d)|s))?|n(?:ing|ed)|s))?|shed)|i(?:r(?:t(?:(?:s(?:leeves)?|less))?|k(?:(?:ing|ed))?|es?)|p(?:(?:b(?:uild(?:ing|ers?)|o(?:rne|ard))|wr(?:ights?|eck(?:(?:ed|s))?)|owners?|yards?|s(?:hape)?|p(?:able|ing|ed)|m(?:ents?|ates?)|loads?))?|ver(?:(?:ing(?:ly)?|ed|s|y))?|bboleths?|ft(?:(?:i(?:n(?:ess|g)|ly|er)|less|e(?:rs?|d)|s|y))?|mmer(?:(?:ing|ed|s))?|e(?:l(?:ings|d(?:(?:ing|ed|s))?)|s|d)|n(?:(?:n(?:ing|ed)|i(?:e(?:st|r)|ng)|gles?|bone|dig|e(?:[drs])?|y|s))?|lling)|e(?:(?:e(?:p(?:(?:ish(?:(?:ness|ly))?|skins?|dogs?))?|r(?:(?:ness|e(?:st|d)))?|t(?:(?:ing|ed|s))?|n)|pherd(?:(?:ing|e(?:ss|d)|s))?|a(?:r(?:(?:waters?|ing|e(?:rs?|d)|s))?|th(?:(?:ing|ed?|s))?|ves|f)|l(?:ter(?:(?:ing|ed|s))?|l(?:(?:fi(?:sh|re)|ing|ac|ed|s))?|v(?:ing|e(?:[ds])?)|f)|tland|r(?:r(?:ies|y)|lock|iffs?|bet|ds)|d(?:(?:ding|s))?|ik(?:(?:hs?|s))?|kels?))?|r(?:u(?:b(?:(?:b(?:er(?:ies|y)|y)|s))?|g(?:(?:g(?:ing|ed)|s))?|nk(?:en)?)|i(?:vel(?:(?:l(?:ing|ed)|s))?|n(?:k(?:(?:ing(?:ly)?|a(?:ble|ge)|s))?|es?)|ll(?:(?:ness|e(?:st|d)|s|y))?|ek(?:(?:ing|e(?:rs?|d)|s))?|mps?|ft)|e(?:w(?:(?:d(?:(?:ness|e(?:st|r)|ly))?|s))?|d(?:(?:d(?:ing|e(?:rs?|d))|s))?)|oud(?:(?:ing|ed|s))?|a(?:pnel|nk))|y(?:(?:ness|e(?:st|r)|ing|ly))?)|y(?:st(?:em(?:(?:ati(?:s(?:ation|e)|c(?:ally)?)|ic(?:ally)?|s))?|ol(?:ic|es))|n(?:c(?:(?:hro(?:n(?:i(?:s(?:ation|ing|e(?:[sd])?)|c(?:ity)?)|ous(?:ly)?|y)|tron)|opat(?:ion|ed)|retic))?|t(?:he(?:tic(?:(?:ally|s))?|s(?:is(?:(?:ing|e(?:(?:rs?|s|d))?))?|es))|a(?:ctic(?:al(?:ly)?)?|gmatic|x))|o(?:nym(?:(?:ous(?:ly)?|ic|y|s))?|vial|p(?:tic|s(?:is|es))|d(?:(?:ic|s))?)|erg(?:is(?:tic|m)|y)|d(?:ica(?:t(?:ion|e(?:[ds])?)|lis[tm])|romes?)|a(?:gogues?|p(?:tic|ses?)))|m(?:p(?:tom(?:(?:atic(?:ally)?|less|s))?|ath(?:etic(?:ally)?|i(?:s(?:ing|e(?:(?:rs?|s|d))?)|es)|y)|hon(?:i(?:sts|es|c)|y)|osi(?:um|a))|metr(?:i(?:s(?:ation|ing)|c(?:al(?:ly)?)?|es)|y)|b(?:ol(?:(?:i(?:s(?:ation|ing|e(?:[ds])?|ts?|m)|c(?:al(?:ly)?)?)|s))?|io(?:tic(?:ally)?|sis|nt)))|c(?:ophan(?:t(?:(?:ic(?:ally)?|s))?|cy)|amores?)|l(?:l(?:ogis(?:tic|ms?)|ab(?:u(?:s(?:es)?|b)|les?|ary|ic?))|phs?)|ph(?:ili(?:tic|s)|on(?:(?:ing|ed|s))?)|r(?:i(?:nges?|an?)|up(?:[sy])?)|dney)|m(?:a(?:ll(?:(?:minded(?:ness)?|hold(?:ings?|ers?)|s(?:cale)?|t(?:own|ime|alk)|ness|pox|ish|e(?:st|r)))?|tterings?|rt(?:(?:e(?:n(?:(?:ing|ed))?|st|d|r)|ness|ing|ly|s))?|sh(?:(?:ing|e[drs]))?|ck(?:(?:ing|e[dr]|s))?)|o(?:o(?:th(?:(?:tongued|ness|ing|e(?:st|r|d)|ly|s))?|ch)|ulder(?:(?:ing|ed|s))?|k(?:e(?:(?:s(?:(?:tacks?|creen))?|less|rs?|d))?|i(?:n(?:ess|g)|e(?:st|r))|y)|t(?:her(?:(?:ing|ed|s))?|e)|lder|cks?|g(?:(?:gy|s))?)|i(?:t(?:h(?:(?:ereens|s|y))?|ing|ten|e)|l(?:ing(?:ly)?|e(?:(?:rs?|d|s))?)|rk(?:(?:ing|ed|s))?|dgeon)|u(?:g(?:(?:gl(?:ing|e(?:(?:rs?|s|d))?)|ness|ly))?|dg(?:i(?:e(?:st|r)|ng)|e(?:[ds])?|y)|t(?:(?:ty|s))?)|e(?:l(?:l(?:(?:i(?:e(?:st|r)|ng)|able|ed|s|y))?|t(?:(?:ing|e(?:rs?|d)))?)|ar(?:(?:ing|ed|s))?|gma))|l(?:a(?:ughter(?:(?:houses?|ings?|e[rd]|s))?|v(?:(?:e(?:(?:d(?:rivers?)?|r(?:(?:ing|ed|s|y))?|s))?|i(?:sh(?:ly)?|ng|c)|s))?|ck(?:(?:e(?:n(?:(?:ing|ed|s))?|st|rs?|d)|ness|ing|ly|s))?|n(?:der(?:(?:e(?:rs?|d)|ing|ous|s))?|t(?:(?:wise|ing|ed|s))?|g(?:ing)?)|p(?:(?:s(?:tick)?|p(?:ing|e[dr])|dash))?|sh(?:(?:ing|e[drs]))?|m(?:(?:m(?:ing|ed)|s))?|loms?|t(?:(?:e(?:(?:rs?|d|s))?|ing|ted|s))?|y(?:(?:e(?:rs?|d)|ing|s))?|ked?|in|gs?|bs?)|e(?:e(?:p(?:(?:less(?:ness)?|walk(?:(?:ing|er|s))?|i(?:n(?:ess|g)|e(?:st|r)|ly)|ers?|s|y))?|ve(?:(?:less|d|s))?|k(?:(?:ness|er|ly|s))?|ts?)|d(?:(?:g(?:e(?:(?:hammers?|s))?|ing)|ding|s))?|nder(?:(?:ness|est|ly))?|az(?:ie(?:st|r)|e|y)|igh(?:(?:ts?|s))?|uths?|w(?:(?:ing|ed))?|pt)|u(?:g(?:(?:g(?:i(?:sh(?:(?:ness|ly))?|ng)|ards?|ed)|s))?|m(?:(?:ber(?:(?:ing|ed|s))?|p(?:(?:ing|ed|s))?|ming|s))?|sh(?:(?:ie(?:st|r)|e[ds]|y))?|r(?:(?:r(?:ing|ed|y)|p(?:(?:ing|ed|s))?|s))?|ic(?:ing|e(?:[ds])?)|dg[ey]|ts?|n[kg])|o(?:v(?:en(?:l(?:iness|y)|ia)|ak)|w(?:(?:coaches|poke|ness|down|e(?:st|d|r)|i(?:ng|sh)|ly|s))?|b(?:(?:ber(?:(?:ing|y|s))?|s))?|p(?:(?:p(?:i(?:n(?:ess|g)|e(?:st|r)|ly)|ed|y)|ing|e(?:[ds])?|s))?|u(?:gh(?:(?:ing|ed))?|ch(?:(?:ing|e[sd]))?)|t(?:(?:t(?:ing|ed)|h(?:(?:ful|s))?|s))?|sh(?:(?:ing|ed))?|g(?:(?:g(?:ing|ed)|ans?|s))?|op)|i(?:p(?:(?:p(?:e(?:r(?:(?:iness|y|s))?|d)|ing|age)|s(?:(?:tream|hod))?|way|up))?|ght(?:(?:ing(?:ly)?|e(?:st|r|d)|ly|s))?|t(?:(?:her(?:(?:ing|ed|y|s))?|ting|s))?|n(?:g(?:(?:s(?:hot)?|ing))?|k(?:(?:ing|y))?)|c(?:k(?:(?:ness|e(?:st|d|r)|ly|s))?|ings?|e(?:(?:rs?|d|s))?)|m(?:(?:ness|m(?:ing|e(?:st|rs?|d))|l(?:ine|y)|ie(?:st|r)|es?|y|s))?|d(?:(?:e(?:(?:rs?|d|s))?|ing))?|vers?|ly)|y(?:(?:ness|ly|er))?)|a(?:d(?:(?:omasochis(?:tic|m)|is(?:t(?:(?:ic(?:ally)?|s))?|m)|d(?:l(?:e(?:(?:bags?|rs?|d|s))?|ing)|e(?:n(?:(?:ing|ed|s))?|st|r))|ness|sack|ly))?|t(?:(?:i(?:sf(?:act(?:or(?:ily|y)|ions?)|y(?:ing(?:ly)?)?|i(?:able|e[sd]))|r(?:i(?:c(?:al(?:ly)?)?|s(?:ing|ts?|e(?:[sd])?))|es?)|n(?:(?:wood|g|s|y))?|at(?:ion|ed?))|an(?:i(?:c(?:ally)?|sm))?|e(?:llites?|d)|ur(?:at(?:i(?:ng|on)|e(?:[sd])?)|n(?:(?:alia|ine))?|day)|sumas|chels?|raps?|yr(?:(?:ic|s))?))?|n(?:(?:ct(?:i(?:f(?:i(?:cation|e[ds])|y(?:ing)?)|monious|on(?:(?:ing|ed|s))?|ty)|u(?:ar(?:ies|y)|m))|d(?:(?:p(?:aper(?:ing)?|i(?:pers?|t))|wich(?:(?:ing|e[ds]))?|castles?|al(?:(?:wood|led|s))?|ba(?:g(?:(?:ged|s))?|nks?)|s(?:tones?)?|i(?:e(?:st|r)|ng)|dune|man|e[dr]|y))?|atorium|it(?:a(?:tion|ry)|ise(?:(?:rs?|d))?|y)|tiago|s(?:krit|erif)|g(?:uine)?|e(?:(?:ly|st|r))?|k))?|r(?:c(?:as(?:tic(?:ally)?|ms?)|o(?:phag(?:us|i)|ma))|d(?:onic(?:ally)?|in(?:ia|es?))|torial(?:ly)?|ong|is?|ge)|l(?:e(?:(?:s(?:(?:m(?:an(?:ship)?|en)|pe(?:rson|ople)|woman|girl))?|ab(?:ility|le)|m))?|v(?:a(?:g(?:e(?:(?:able|s|r|d))?|ing)|tion)|e(?:(?:rs?|d))?|ing|o)|u(?:t(?:a(?:tions?|ry)|ing|e(?:[ds])?)|bri(?:ous|ty))|i(?:va(?:(?:t(?:i(?:ons?|ng)|e)|ry|s))?|cylic|n(?:ity|e)|en(?:ce|t))|a(?:m(?:anders?|is?)|cious|r(?:ie[sd]|y)|am|ds?)|mon(?:(?:ella|s))?|t(?:(?:water|petre|i(?:ness|e(?:st|r))|ed|y|s))?|l(?:y(?:ing)?|ie[ds]|ow)|o(?:ons?|me|ns?)|sa)|f(?:e(?:(?:guard(?:(?:ing|ed|s))?|t(?:ies|y)|ness|ly|st?|r))?|aris?|fron)|c(?:(?:r(?:i(?:leg(?:ious|e)|fic(?:i(?:ng|al)|e(?:[ds])?)|sty)|a(?:ment(?:(?:al|s))?|l)|ed(?:(?:ness|ly))?|osanct|um)|chari(?:des|ne?)|erdotal|k(?:(?:cloth|fuls?|ing|ed|s))?|hets?|s))?|b(?:r(?:e(?:(?:toothed|s))?|as?)|bat(?:(?:icals?|hs?))?|ot(?:ag(?:ing|e(?:[sd])?)|eurs?)|les?|er)|xo(?:phon(?:ist|es?)|n(?:[sy])?)|i(?:nt(?:(?:l(?:i(?:ness|e(?:st|r))|y)|hood|ed|s))?|l(?:(?:maker|cloth|ings?|ors?|e[dr]|s))?|gon|pan|d)|g(?:(?:a(?:(?:ci(?:ous(?:ly)?|ty)|s))?|g(?:ing|ed)|e(?:(?:ly|st?))?|o|s))?|u(?:erkraut|n(?:ter(?:(?:ing|ed|s))?|as?)|c(?:i(?:ness|e(?:st|r)|ly)|e(?:(?:pans?|rs?|s))?|y)|sages?|dis?|te)|v(?:our(?:(?:ing|ed|s|y))?|i(?:ours?|ngs?)|a(?:n(?:nah?|ts?)|g(?:ing|e(?:(?:ry|ly|d|s))?))|e(?:(?:loy|rs?|s|d))?|vy)|p(?:(?:p(?:hires?|e(?:rs?|d)|ing)|lings?|ient|s))?|m(?:(?:p(?:l(?:ings?|e(?:(?:rs?|d|s))?)|an)|izdat|e(?:ness)?|o(?:sas|var|a)|urai|bas?))?|w(?:(?:tooth|mills?|dust|yers?|ing|ed|n|s))?|y(?:(?:ings?|s))?|h(?:ara|ib)|sh(?:es)?|k(?:es?|i))|w(?:a(?:s(?:hbuckling|tikas?)|llow(?:(?:tail|ing|e[rd]|s))?|g(?:(?:ger(?:(?:ing|ed))?|s))?|m(?:p(?:(?:lands?|i(?:e(?:st|r)|ng)|ed|s|y))?)?|r(?:th(?:ie(?:st|r)|y)|m(?:(?:ing|ed|s))?|d)|p(?:(?:p(?:able|ing|e(?:rs?|d))|s))?|d(?:(?:dl(?:ing|ed)|s))?|t(?:(?:t(?:ing|ed)|he(?:[ds])?|s))?|n(?:s(?:ong)?)?|b(?:(?:b(?:ing|ed)|s))?|hili|y(?:(?:ing|ed|s))?|ins|zis?)|i(?:tch(?:(?:b(?:oards?|ack)|able|gear|ing|e[srd]))?|m(?:(?:m(?:ing(?:ly)?|ers?)|s(?:uits?)?|wear))?|vel(?:(?:l(?:ing|ed)|s))?|n(?:g(?:(?:e(?:ing|rs?)|ing|s|y))?|dl(?:ing|e(?:(?:rs?|s|d))?)|es?)|ft(?:(?:ness|l(?:et|y)|e(?:st|r)|s))?|s(?:h(?:(?:ing|ed|y))?|s)|rl(?:(?:ing|ed|s))?|ll(?:(?:ing|ed))?|pe(?:[ds])?)|e(?:e(?:t(?:(?:hearts?|bread|e(?:n(?:(?:e(?:rs?|d)|ing|s))?|st|r)|meats?|s(?:hop)?|ness|corn|pea|i(?:sh|e)|ly))?|p(?:(?:ing(?:(?:ly|s))?|s(?:take)?|able|ers?))?)|a(?:t(?:(?:s(?:h(?:irts?|ops?))?|i(?:e(?:st|r)|ng|ly)|band|e(?:rs?|d)|y))?|r(?:(?:words?|ing|ers?|s))?)|l(?:t(?:ering|ry)|l(?:(?:ings?|ed|s))?)|rv(?:ing|e(?:[ds])?)|d(?:ish|en?)|pt)|o(?:r(?:d(?:(?:s(?:m(?:en|an))?|fish))?|n|e)|t(?:(?:t(?:ing|ed)|s))?|p(?:(?:p(?:ing|ed)|s))?|o(?:p(?:(?:ing|ed|s))?|n(?:(?:ing|ed|s))?)|llen)|u(?:ng|m))|qu(?:e(?:a(?:mish(?:(?:ness|ly))?|k(?:(?:i(?:e(?:st|r)|ng)|e[rd]|s|y))?|l(?:(?:ing|e[rd]|s))?)|lch(?:(?:ing|ed|y))?|e(?:z(?:ing|e(?:[srd])?|y)|gee))|i(?:r(?:rel(?:(?:led|s))?|e(?:(?:archy|s))?|t(?:(?:ing|ed|s))?|m(?:(?:ing|ed|s))?)|nt(?:(?:ing|ed|s))?|ggles?|bs?|ds?)|a(?:nder(?:(?:ing|ed|s))?|bbl(?:ing|e(?:[sd])?)|r(?:e(?:(?:ness|ly|d|r|s))?|i(?:sh|ng))|sh(?:(?:i(?:e(?:st|r)|ng)|e[sd]|y))?|w(?:k(?:(?:ing|ed|s))?)?|t(?:(?:t(?:ing|e(?:rs?|d))|s))?|l(?:l(?:(?:ing|s|y))?|id|or)|d(?:(?:rons?|s))?))|n(?:o(?:b(?:(?:b(?:ish(?:(?:ness|ly))?|ery)|s))?|w(?:(?:ploughs?|b(?:all(?:(?:ing|ed|s))?|ound)|capped|dr(?:ifts?|ops?)|f(?:ields|lakes?|alls?)|s(?:torms?)?|white|line|i(?:e(?:st|r)|ng)|m(?:an|en)|ed|y))?|r(?:kel(?:(?:ling|s))?|t(?:(?:ing|ed|s))?|e(?:(?:rs?|d|s))?|ing)|o(?:z(?:ing|e(?:[ds])?)|p(?:(?:ing|e(?:rs?|d)|s|y))?|ker)|tty|uts?|ek)|e(?:e(?:r(?:(?:ing(?:ly)?|ed|s))?|z(?:ing|e(?:[ds])?))|ak(?:(?:i(?:e(?:st|r)|ng|ly)|e(?:rs|d)|s|y))?)|i(?:gger(?:(?:ing|ed|s))?|vel(?:ling)?|f(?:f(?:(?:l(?:ing|es?|y)|ing|e(?:rs?|d)|s))?|ter)|p(?:(?:p(?:ing|e(?:ts?|d))|e(?:(?:rs?|s))?|ing|s))?|ts|de|ck)|a(?:tch(?:(?:ing|e(?:rs?|s|d)))?|p(?:(?:s(?:hots?)?|p(?:i(?:ng|ly|er)|e[dr]|y)))?|k(?:e(?:(?:s(?:kin)?|pit|d))?|ing|y)|r(?:l(?:(?:ing|ed|s))?|ing|e(?:[ds])?)|g(?:(?:g(?:ing|ed)|s))?|ffle|cks?|ils?)|u(?:g(?:(?:g(?:l(?:ing|e(?:[sd])?)|er)|ness|ly))?|ff(?:(?:l(?:ing|e(?:[sd])?)|ing|box|ed|s))?|b(?:(?:nosed|b(?:ing|ed)|s))?))|k(?:u(?:l(?:l(?:(?:duggery|cap|s))?|duggery|k(?:(?:ing|ed|s))?)|nks?|as?)|i(?:(?:t(?:(?:t(?:ish(?:(?:ness|ly))?|les?)|s))?|r(?:mish(?:(?:ing|es))?|t(?:(?:ing|ed|s))?|l)|p(?:(?:p(?:e(?:r(?:(?:ing|ed|s))?|d)|ing)|s))?|n(?:(?:tight|n(?:i(?:e(?:st|r)|ng)|e(?:rs?|d)|y)|heads?|flint|less|deep|care|s))?|l(?:ful(?:ly)?|l(?:(?:ful|e[dt]|s))?)|m(?:(?:p(?:(?:ing|ed|y))?|m(?:ing|e[dr])|s))?|d(?:(?:d(?:ing|ed)|s))?|e(?:rs?|s|d)|ing|s))?|y(?:(?:sc(?:rapers?|ape)|l(?:i(?:ghts?|nes?)|arks?)|div(?:ing|e(?:(?:rs?|s|d))?)|wards?|high))?|e(?:tch(?:(?:books?|i(?:e(?:st|r)|ng|ly)|pad|e[srd]|y))?|let(?:ons?|al)|w(?:(?:ness|e(?:r(?:(?:ed|s))?|d)|s))?|rries|ptic|in)|at(?:e(?:(?:boards?|rs?|d|s))?|ing))|rilanka|jambok)|o(?:v(?:e(?:r(?:(?:s(?:(?:i(?:mplif(?:i(?:cations?|e[ds])|y(?:ing)?)|ghts?|zed?)|e(?:nsitiv(?:ity|e)|e(?:(?:ing|rs?|s|n))?|xed|as)|u(?:bscribed|pply)|h(?:adow(?:(?:ing|ed|s))?|o(?:ot(?:(?:ing|s))?|t))|t(?:a(?:t(?:e(?:(?:ment|s|d))?|ing)|ffed)|r(?:e(?:tch(?:ed)?|ss(?:ed)?)|ung)|ep(?:(?:p(?:ing|ed)|s))?|ock(?:ing|ed)|uffed)|a(?:mpl(?:ing|ed)|w)|p(?:en(?:d(?:ing)?|t)|ill)|le(?:pt|ep)))?|e(?:nthusiastic|m(?:phasis(?:ed?)?|otional)|stimat(?:i(?:ng|on)|e(?:[ds])?)|x(?:pos(?:ure|ed)|tended)|at(?:(?:ing|s))?)|g(?:eneralis(?:ing|ed)|r(?:azing|o(?:w(?:th|n)|und)))|f(?:amiliarity|e(?:ed(?:ing)?|d)|i(?:shing|ll)|l(?:ow(?:(?:ing|ed|s|n))?|y(?:ing)?)|ull)|in(?:credulous|dulgen(?:ce|t)|flated)|r(?:e(?:presented|ac(?:h(?:(?:ing|ed))?|t(?:(?:i(?:ng|on)|ed|s))?))|u(?:n(?:(?:ning|s))?|l(?:ing|ed?))|i(?:d(?:ing|den|es?)|pe)|a(?:ted?|n)|ode)|c(?:o(?:m(?:mitments?|p(?:l(?:icated|exity)|ensate)|ing|es?)|nfident|ok(?:ed)?|ats?)|a(?:pacity|st|me)|harg(?:ing|ed?)|rowd(?:(?:ing|ed))?)|optimistic|p(?:o(?:pul(?:at(?:ion|ed)|ous)|wer(?:(?:ing(?:ly)?|ed|s))?)|r(?:oduc(?:tion|ed)|essure|i(?:nt(?:(?:ing|ed|s))?|ced))|a(?:y(?:ment)?|ss|id)|lay(?:(?:ing|ed))?)|w(?:helm(?:(?:ing(?:ly)?|ed|s))?|inter(?:(?:ing|ed))?|e(?:ening|ight)|ork(?:(?:ing|ed))?|r(?:it(?:ing|ten|es?)|o(?:ught|te)))|a(?:ll(?:(?:ocation|s))?|mbitious|nxious|ct(?:(?:i(?:ve|ng)|ed|s))?|te)|d(?:etermined|r(?:a(?:matic|fts?|wn?)|essed|ive)|u(?:bbing|e)|o(?:(?:s(?:ing|e(?:[sd])?)|ing|ne|es))?|id)|t(?:(?:i(?:ghtened|me)|h(?:r(?:ow(?:(?:ing|s|n))?|ew)|etop)|ur(?:n(?:(?:ing|ed|s))?|es?)|a(?:k(?:ing|e(?:(?:rs?|s|n))?)|x)|o(?:nes?|ps|ok)|ness|ly))?|qualified|m(?:a(?:tching|n(?:ning|tel))|uch)|b(?:urdened|earing|oard)|h(?:a(?:n(?:g(?:(?:ing|s))?|d)|ul(?:(?:ing|ed|s))?|sty)|ea(?:r(?:(?:ing|s|d))?|t(?:(?:ing|ed))?|ds?)|ung)|l(?:a(?:p(?:(?:p(?:ing|ed)|s))?|y(?:(?:ing|s))?|den|nd|i[nd])|o(?:ad(?:(?:ing|ed|s))?|ok(?:(?:ing|ed|s))?|rds?|ng)|y(?:ing)?|ies?|eaf)|v(?:alued?|iews?)|night|joyed|use(?:[sd])?|kill))?|ns?)|u(?:la(?:tion|r)|m)|a(?:(?:t(?:ions?|e)|r(?:i(?:an|es)|y)|ls?))?|iduct|oid)|p(?:p(?:o(?:rtun(?:i(?:s(?:t(?:(?:ic(?:ally)?|s))?|m)|t(?:ies|y))|e(?:ly)?)|s(?:i(?:t(?:ion(?:(?:al|s))?|e(?:(?:ly|s))?)|ng)|e(?:[sd])?)|nents?)|r(?:ess(?:(?:i(?:ve(?:(?:ness|ly))?|ons?|ng)|ors?|e[ds]))?|obri(?:ous|um)))|hthalm(?:olog(?:ists?|y)|ics?)|e(?:n(?:(?:minded(?:ness)?|h(?:anded(?:ness)?|eart(?:ed)?)|ings?|ness|e(?:rs?|d)|ly|s))?|r(?:a(?:(?:t(?:i(?:on(?:(?:al(?:ly)?|s))?|ves?|ng|c)|ors?|e(?:[ds])?)|ble|nds?|s))?|culum|ettas?))|t(?:(?:oelectronic|i(?:m(?:is(?:t(?:(?:ic(?:ally)?|s))?|ations?|e(?:(?:rs?|d|s))?|ing|m)|a(?:l(?:(?:ity|ly))?)?|um)|on(?:(?:al(?:(?:ity|ly))?|s))?|c(?:(?:al(?:ly)?|ians?|s))?|ng)|ed|s))?|i(?:n(?:i(?:on(?:(?:ated|s))?|ng)|e(?:[sd])?)|oids?|ates?|um)|a(?:l(?:(?:escent|s))?|city|que)|u(?:len(?:ce|t)|s(?:es)?)|ossum)|b(?:ject(?:(?:i(?:on(?:(?:abl(?:e(?:ness)?|y)|s))?|v(?:ity|e(?:(?:ly|s))?)|fied|ng)|less|ors?|ed|s))?|s(?:t(?:r(?:uct(?:(?:i(?:ve(?:(?:ness|ly))?|on(?:(?:ism|s))?|ng)|ed|s))?|eperous)|etric(?:(?:ians?|s))?|ina(?:te(?:ly)?|cy)|acles?)|e(?:rv(?:a(?:t(?:ion(?:(?:al(?:ly)?|s))?|or(?:ies|y))|b(?:ility|l(?:es?|y))|n(?:ces?|t))|e(?:(?:rs?|d|s))?|ing)|quious(?:(?:ness|ly))?|ss(?:(?:i(?:ve(?:(?:ness|ly))?|on(?:(?:al|s))?|ng)|e[ds]))?)|ole(?:scen(?:ce|t)|te)|c(?:ur(?:a(?:ntis[tm]|tion)|i(?:t(?:ies|y)|ng)|e(?:(?:ness|ly|st?|d|r))?)|en(?:it(?:ies|y)|e(?:ly)?))|idian)|noxious(?:(?:ness|ly))?|l(?:i(?:vio(?:us(?:ness)?|n)|terat(?:i(?:on|ng)|e(?:[sd])?)|g(?:at(?:or(?:ily|y)|ions?|ed?)|ing(?:ly)?|e(?:[sd])?)|qu(?:e(?:(?:ness|ly|d))?|ity))|o(?:quy|ngs?)|ate)|t(?:ru(?:sive(?:ness)?|d(?:ing|ed?))|ain(?:(?:able|ing|ed|s))?|use(?:(?:ness|ly))?)|fuscat(?:ory|ion|e(?:[ds])?)|v(?:i(?:ous(?:(?:ness|ly))?|at(?:ing|e(?:[ds])?))|erse)|dura(?:te(?:ly)?|cy)|e(?:dien(?:t(?:ly)?|ce)|isance|lisks?|y(?:(?:ing|ed|s))?|s(?:ity|e))|ituar(?:ies|y)|o(?:ist|es?))|r(?:g(?:an(?:(?:i(?:s(?:a(?:tion(?:(?:al(?:ly)?|s))?|ble)|ing|e(?:(?:rs?|s|d))?|ts?|ms?)|c(?:(?:ally|s))?)|elles|za|s))?|ies|y)|tho(?:g(?:raph(?:ic(?:al(?:ly)?)?|y)|onal(?:(?:ity|ly))?)|paedics?|rhombic|do(?:ntist|x(?:(?:ies|y))?)|normal)|c(?:h(?:estra(?:(?:t(?:i(?:ons?|ng)|e(?:[ds])?|or)|s|l))?|ards?|ids?)|a)|n(?:itholog(?:i(?:cal|sts?)|y)|a(?:ment(?:(?:a(?:tion|l)|ing|ed|s))?|te(?:ly)?))|i(?:ent(?:(?:a(?:t(?:ions?|e(?:[sd])?)|l(?:(?:ism|s))?|ble)|e(?:ering|d)|ing))?|g(?:in(?:(?:a(?:l(?:(?:ity|ly|s))?|t(?:i(?:ng|on)|ors?|e(?:[sd])?))|s))?|ami)|mulsion|fices?)|d(?:ina(?:r(?:i(?:ness|ly)|y)|t(?:ions?|es?)|n(?:ces?|ds)|ls?)|e(?:r(?:(?:l(?:i(?:ness|es)|ess|y)|ings?|ed|s))?|als?)|ain(?:(?:ing|ed|s))?|nance|ure)|ph(?:an(?:(?:ages?|ed|s))?|eus)|a(?:ng(?:(?:utans?|es?|s))?|t(?:or(?:(?:i(?:cal|o)|y|s))?|i(?:ons?|ng)|e(?:[sd])?)|c(?:ular|les?)|l(?:ly)?)|b(?:(?:it(?:(?:als?|ing|e[rd]|s))?|s))?|yxes|es?)|m(?:ni(?:directional|p(?:resen(?:ce|t)|oten(?:ce|t))|scien(?:ce|t)|vor(?:ous|es?)|bus(?:es)?)|budsm(?:an|en)|e(?:lettes?|ns?|ga)|i(?:nous(?:ly)?|ssions?|t(?:(?:t(?:ing|ed)|s))?))|s(?:t(?:e(?:o(?:arthritis|p(?:orosis|ath(?:[ys])?))|n(?:tatio(?:us(?:ly)?|n)|sibl[ye]))|r(?:acis(?:ed?|m)|ich(?:es)?)|lers?)|c(?:ill(?:oscopes?|at(?:i(?:ons?|ng)|or(?:[sy])?|e(?:[sd])?))|ars?)|sifi(?:cation|ed)|m(?:o(?:sis|tic)|ium)|preys?|iris|lo)|c(?:e(?:an(?:(?:ograph(?:ers?|ic|y)|ic|s))?|lots?)|c(?:u(?:p(?:a(?:tion(?:(?:al(?:ly)?|s))?|n(?:c(?:ies|y)|ts?))|ie(?:rs?|d|s)|y(?:ing)?)|r(?:(?:r(?:e(?:nces?|d)|ing)|s))?|lt(?:(?:ism|s))?)|asion(?:(?:al(?:ly)?|ing|ed|s))?|i(?:dent(?:al)?|pital)|lu(?:sion|de[ds]))|t(?:o(?:genarians?|pus(?:es)?|ber)|a(?:hedr(?:al|on)|gon(?:(?:al|s))?|v(?:es?|o)|n(?:es?|t)|l)|ets?)|ul(?:ist|ar)|hres?)|zone(?:friendly)?|f(?:f(?:(?:ic(?:i(?:ous(?:(?:ness|ly))?|a(?:l(?:(?:ness|dom|ly|s))?|t(?:ing|ed?)))|e(?:(?:r(?:s(?:hips?)?)?|s))?)|e(?:n(?:sive(?:(?:ness|ly|s))?|d(?:(?:e(?:rs?|d)|ing|s))?|ces?)|r(?:(?:ings?|tory|ed|s))?)|print|s(?:ho(?:ot|re)|et)|hand|cuts?|beat|al))?|t(?:en)?)|u(?:t(?:(?:m(?:anoeuvred?|o(?:ded|st))|p(?:erform(?:(?:ing|ed|s))?|la(?:cement|y(?:ed)?)|a(?:tients?|c(?:ing|ed?))|o(?:int(?:ing|ed)|urings?|sts?)|ut(?:(?:ting|s))?)|s(?:(?:p(?:oken(?:(?:ness|ly))?|read|an)|t(?:a(?:nding(?:ly)?|tions?|y(?:ed)?)|r(?:etched|ip(?:(?:p(?:ing|ed)|s))?)|ep)|o(?:urcing|ld)|h(?:in(?:ing|es?)|one)|kirts|i(?:de(?:(?:rs?|s))?|ze)|mart|e(?:ll|ts?)))?|number(?:(?:ing|ed|s))?|r(?:a(?:g(?:e(?:(?:ous(?:ly)?|s|d))?|ing)|nk?)|i(?:g(?:ger|ht)|de(?:rs?)?)|each|uns?)|b(?:u(?:ildings?|rsts?)|re(?:aks?|d)|o(?:und|ard)|ack|ids?)|w(?:eigh(?:(?:ing|ed|s))?|ork(?:ing)?|it(?:(?:t(?:ing|ed)|h|s))?|ard(?:(?:ly|s))?)|l(?:a(?:ndish|w(?:(?:ing|ry|ed|s))?|st(?:(?:ed|s))?|ys?)|i(?:v(?:ing|e(?:[sd])?)|n(?:ing|e(?:[sd])?)|ers?)|ying|ooks?|ets?)|g(?:r(?:ow(?:(?:ths?|ing|n))?|ew)|o(?:ings?)?|uess)|f(?:l(?:ank(?:ed)?|ows?)|i(?:t(?:(?:ters|s))?|eld)|ox(?:e[sd])?|a(?:lls?|ce))|c(?:lassed|r(?:ops?|ies|y)|omes?|a(?:sts?|ll))|houses?|er(?:most)?|voted|d(?:o(?:(?:ors?|ing|es|ne))?|ated|id)|ages?|ings?))?|r(?:s(?:elves)?)?|st(?:(?:ing|e[dr]|s))?|nces?|ght|ch)|n(?:t(?:o(?:(?:log(?:ical(?:ly)?|y)|geny))?|ario)|l(?:y(?:begotten)?|ook(?:ers?|ing))|e(?:(?:s(?:(?:ided(?:(?:ness|ly))?|elf))?|r(?:ous)?|ness))?|s(?:laughts?|hore|et)|wards?|going|agers?|yx(?:es)?|us(?:es)?|ions?|ce)|l(?:d(?:(?:fashioned|timers?|maids|i(?:sh|e)|e(?:st|r|n)|age))?|e(?:anders?)?|factory|ive(?:(?:oil|s|r))?|ymp(?:i(?:a(?:[dn])?|cs?)|us)|ms?)|d(?:o(?:r(?:iferous|ous)|ur(?:(?:less|s))?|meter)|i(?:ous(?:(?:ness|ly))?|ums?|n)|d(?:(?:it(?:ies|y)|ments?|ness|job|e(?:st|r)|ly|s))?|yssey|es?)|x(?:id(?:is(?:ation|ing|e(?:[rd])?)|a(?:tion|nts?)|es?)|y(?:gen(?:at(?:i(?:ng|on)|ed))?|moron)|al(?:ate|ic)|tails?|cart|ford|en)|w(?:n(?:(?:e(?:r(?:s(?:hips?)?)?|d)|ing|s))?|l(?:(?:ish(?:ly)?|ets?|s))?|ing|e(?:[ds])?)|e(?:s(?:ophagus|tr(?:ogens?|us))|uvres?|d(?:ipus|ema))|i(?:l(?:(?:fields?|cloth|i(?:n(?:ess|g)|e(?:st|r))|m(?:an|en)|rig|e(?:rs?|d)|y|s))?|n(?:tments?|k(?:(?:ed|s))?))|t(?:her(?:(?:wise|ness|s))?|t(?:oman|ers?))|a(?:t(?:(?:cakes|meal|hs?|s))?|r(?:s(?:m(?:en|an))?)?|f(?:(?:ish|s))?|s(?:is|es|t)|k(?:(?:um|en|s))?)|k(?:lahoma|a(?:y(?:(?:ed|s))?|pis?))|o(?:l(?:itic|ogy)|cytes|z(?:ing|e(?:[sd])?|y)|mpah|dles|ps|h)|ysters?|g(?:r(?:ish|es?)|l(?:ing|ed?))|h(?:m(?:(?:ic|s))?|io))|p(?:r(?:o(?:(?:f(?:ess(?:(?:i(?:on(?:(?:al(?:(?:is(?:ation|ed|m)|ly|s))?|s))?|ng)|or(?:(?:s(?:hips?)?|ial))?|e(?:d(?:ly)?|s)))?|i(?:t(?:(?:ab(?:ility|l[ye])|e(?:er(?:ing|s)|roles|d)|taking|less|ing|s))?|cien(?:c(?:ies|y)|t(?:ly)?)|l(?:ing|e(?:[sd])?))|liga(?:te(?:ly)?|cy)|an(?:ation|e(?:(?:ness|ly|d))?|it(?:ies|y))|o(?:und(?:(?:e(?:st|r)|ly))?|rmas?)|u(?:s(?:e(?:(?:ness|ly))?|ion)|ndity)|fer(?:(?:ing|ed|s))?)|l(?:etaria(?:n(?:(?:isation|s))?|t)|i(?:f(?:erat(?:i(?:ng|on|ve)|e(?:[ds])?)|ic(?:ally)?)|x)|o(?:ng(?:(?:ation|ing|ed|s))?|gues?)|a(?:psed?|ctin))|b(?:a(?:b(?:ili(?:st(?:ic(?:ally)?)?|t(?:ies|y))|l[ye])|t(?:i(?:on(?:ary)?|ve)|e))|lem(?:(?:atic(?:al(?:ly)?)?|s))?|oscis|i(?:ng|ty)|e(?:[drs])?)|c(?:r(?:astinat(?:i(?:ons?|ng)|ors?|e)|eat(?:i(?:on(?:al)?|ng|ve)|ory|ed?))|l(?:a(?:mations?|im(?:(?:e(?:rs|d)|ing|s))?)|ivit(?:ies|y))|e(?:dur(?:al(?:ly)?|es?)|ss(?:(?:i(?:on(?:(?:al|s))?|ng)|able|ors?|e[sd]))?|ed(?:(?:ings?|ed|s))?)|ur(?:e(?:(?:ments?|s|d))?|able|ing)|tor(?:(?:ial|s))?)|g(?:nos(?:ticat(?:ions?|e)|is|es)|r(?:ess(?:(?:i(?:ve(?:(?:ness|ly|s))?|ons?|ng)|e[sd]))?|am(?:(?:m(?:a(?:ble|tic)|e(?:(?:rs?|s|d))?|ing)|s))?)|e(?:sterone|n(?:itors?|y)))|hibit(?:(?:i(?:on(?:(?:ists?|s))?|ve(?:ly)?|ng)|ed|s))?|p(?:(?:o(?:rtion(?:(?:a(?:l(?:(?:ity|ly))?|te(?:ly)?)|ed|s))?|s(?:i(?:tion(?:(?:ing|al|ed|s))?|ng)|e(?:(?:rs?|s|d))?|als?)|und(?:(?:ing|ed))?|nents?)|ri(?:et(?:or(?:(?:ial(?:ly)?|s(?:hip)?))?|ress|ary|ies|y)|oceptive)|a(?:ga(?:nd(?:ists?|a)|t(?:i(?:ng|on)|ors?|e(?:[sd])?))|ne)|h(?:e(?:t(?:(?:ic(?:ally)?|ess|s))?|s(?:y(?:ing)?|ie[sd])|c(?:ies|y))|yla(?:ctics?|xis))|e(?:nsit(?:ies|y)|l(?:(?:l(?:ants?|ing|e(?:rs?|d))|s))?|r(?:(?:t(?:ie[sd]|y)|ly))?)|i(?:ti(?:at(?:i(?:ng|on)|ory|ed?)|ous)|nquity|onate)|ulsi(?:ve|on)|ylene|p(?:ing|ed)|s))?|n(?:o(?:un(?:(?:c(?:e(?:(?:ments?|able|d(?:ly)?|s))?|ing)|s))?|minal)|unciations?|e(?:ness)?|gs?|to)|s(?:(?:t(?:a(?:glandins?|t(?:ic|es?))|itut(?:i(?:ng|on)|e(?:[ds])?)|rat(?:i(?:ng|on)|e(?:[sd])?)|he(?:tic|sis))|e(?:(?:cut(?:or(?:(?:ial|s))?|able|i(?:ons?|ng)|e(?:[sd])?)|lytis(?:ing|e)))?|pe(?:ct(?:(?:i(?:ve(?:ly)?|ng)|us(?:es)?|ors?|s))?|r(?:(?:ous(?:ly)?|i(?:ty|ng)|ed|s))?)|c(?:ri(?:pti(?:on|ve)|bed?)|enium)|ai(?:c(?:ally)?|st)|od(?:ic|y)))?|t(?:e(?:ct(?:(?:i(?:on(?:(?:is(?:ts?|m)|s))?|ve(?:(?:ness|ly))?|ng)|or(?:(?:ates?|s))?|ed|s))?|st(?:(?:a(?:nt(?:(?:ism|s))?|tions?)|ors?|ing|e(?:rs?|d)|s))?|ge(?:(?:es?|s))?|ins?|a(?:(?:se?|n))?)|uberances?|a(?:ctinium|gonists?)|o(?:plasm(?:ic)?|typ(?:i(?:cal|ng)|e(?:[sd])?)|zoa(?:ns?)?|cols?|ns?)|r(?:act(?:(?:ors?|ed))?|u(?:si(?:ons?|ve)|d(?:ing|e(?:[sd])?)))|ists)|v(?:i(?:d(?:e(?:(?:n(?:t(?:ial(?:ly)?)?|ce)|rs?|s|d))?|able|ing)|n(?:c(?:ial(?:ism)?|es?)|g)|sion(?:(?:al(?:ly)?|ing|ed|s))?)|o(?:cati(?:ve(?:ly)?|ons?)|k(?:ing(?:ly)?|e(?:[srd])?)|st)|e(?:(?:rb(?:(?:ial(?:ly)?|s))?|n(?:(?:ance|ce))?|d|s))?|abl[ye])|ject(?:(?:i(?:on(?:(?:ist|s))?|ve(?:ly)?|les?|ng)|ors?|ed|s))?|m(?:i(?:s(?:cu(?:ous(?:ly)?|ity)|ing(?:ly)?|sory|e(?:[sd])?)|nen(?:ces?|t(?:ly)?))|ulgat(?:i(?:ons?|ng)|ed?)|o(?:ntor(?:ies|y)|t(?:i(?:on(?:(?:al|s))?|ng)|able|e(?:(?:rs?|s|d))?))|enade(?:(?:rs?|s|d))?|pt(?:(?:i(?:tude|ngs?)|ness|e(?:rs?|d)|ly|s))?)|d(?:(?:ig(?:i(?:ous(?:ly)?|es)|al(?:(?:ity|ly))?|y)|uc(?:t(?:(?:i(?:v(?:e(?:ly)?|ity)|ons?)|s))?|i(?:ble|ng)|e(?:(?:rs?|s|d))?)|d(?:ing|ed)|eo|s))?|of(?:(?:read(?:(?:ers?|ing|s))?|ing|ed|s))?|karyotes|x(?:i(?:m(?:a(?:te(?:ly)?|l(?:ly)?)|ity|o)|es)|y)|active|w(?:(?:l(?:(?:ing|e(?:rs?|d)|s))?|ess|s))?|ud(?:(?:e(?:st|r)|ly))?))?|e(?:(?:s(?:t(?:i(?:digitat(?:or(?:ial)?|ion)|g(?:ious|e))|o)|u(?:m(?:pt(?:uous(?:(?:ness|ly))?|i(?:ve(?:ly)?|ons?))|abl[ye]|ing|e(?:[sd])?)|ppos(?:i(?:tions?|ng)|e(?:[ds])?))|e(?:rv(?:ati(?:on(?:ists)?|ves?)|ing|e(?:[srd])?)|n(?:t(?:(?:a(?:tion(?:(?:al|s))?|ble)|i(?:ments?|ng)|e(?:rs?|d)|ly|s))?|ces?)|lect(?:(?:ed|s))?|t(?:(?:ting|s))?)|s(?:(?:u(?:r(?:e(?:(?:cooking|s|d))?|i(?:s(?:ing|e(?:[ds])?)|ng))|ps?)|ing(?:(?:ly|s))?|m(?:en|an)|e[ds]))?|c(?:ri(?:pti(?:v(?:e(?:ly)?|is[mt])|ons?)|b(?:ing|e(?:[sd])?))|hool)|id(?:e(?:(?:n(?:c(?:ies|y)|t(?:(?:ial|s))?)|s|d))?|i(?:um|ng))|bytery)|d(?:e(?:termin(?:ation|e(?:[ds])?)|stin(?:ation|ed)|c(?:e(?:ssors?|ased)|lared)|fin(?:ing|ed?))|i(?:spos(?:i(?:tions?|ng)|e(?:[ds])?)|c(?:t(?:(?:ab(?:ility|l[ey])|i(?:ons?|ve|ng)|ors?|ed|s))?|a(?:ments?|t(?:i(?:ng|ve)|e(?:[sd])?)))|lections?)|omina(?:n(?:t(?:ly)?|ce)|t(?:ing|e(?:[ds])?))|at(?:i(?:ons?|ng)|or(?:[ys])?|e(?:[sd])?))|t(?:e(?:n(?:tious(?:(?:ness|ly))?|sions?|d(?:(?:ing|e(?:rs?|d)|s))?|ces?)|r(?:natural(?:ly)?|ite)|xts?)|reat(?:ments?|ed)|t(?:i(?:ness|e(?:st|r)|ly|fy)|y)|or(?:ia)?)|c(?:a(?:rious(?:(?:ness|ly))?|ution(?:(?:ary|s))?)|o(?:ci(?:ous(?:(?:ness|ly))?|ty)|n(?:ce(?:ptions?|ived)|ditions?)|gnitions?|mputed|oked)|i(?:pi(?:t(?:at(?:e(?:(?:ly|d|s))?|i(?:ng|on))|ous(?:ly)?)|ces?)|ous(?:(?:ness|ly))?|s(?:(?:e(?:(?:ness|ly))?|ions?))?|ncts?)|e(?:d(?:e(?:(?:n(?:ces?|ts?)|s|d))?|ing)|ss(?:(?:i(?:on|ng)|ed))?|pts?)|l(?:inical|ud(?:ing|e(?:[sd])?))|ursors?)|f(?:a(?:b(?:(?:ricat(?:ion|ed)|s))?|tory|c(?:ing|e(?:[sd])?))|e(?:r(?:(?:en(?:tial(?:ly)?|ces?)|r(?:ing|ed)|ment|abl[ye]|s))?|ct(?:(?:ure|s))?)|i(?:gured|x(?:(?:ing|e[sd]))?))|o(?:ccup(?:ations?|y(?:ing)?|ied)|rdained)|p(?:(?:o(?:nderan(?:t(?:ly)?|ce)|s(?:terous(?:ly)?|ition(?:(?:al|s))?))|a(?:r(?:at(?:i(?:ons?|ve)|ory)|e(?:(?:d(?:ness)?|rs?|s))?|ing)|y(?:ment|s)|id)|lanned|s))?|a(?:dolescent|m(?:p(?:lifier)?|bles?)|uthorise|llocate|rranged|ch(?:(?:ings?|e(?:rs?|s|d)))?)|l(?:iminar(?:i(?:es|ly)|y)|udes?|ates?)|m(?:atur(?:e(?:(?:ness|ly))?|ity)|e(?:ditat(?:ion|ed?)|nstrual)|o(?:nitions?|lars?)|i(?:er(?:(?:s(?:hip)?|e(?:[sd])?))?|s(?:s(?:es)?|ing|e(?:[sd])?)|ums?))|v(?:a(?:ricat(?:i(?:ng|on)|ed?)|len(?:t(?:ly)?|ce)|il(?:(?:ing|ed|s))?)|ent(?:(?:able|i(?:ons?|ve|ng)|ed|s))?|i(?:ous(?:ly)?|ew(?:(?:ing|e(?:rs?|d)|s))?)|ues?)|rogatives?|gnan(?:c(?:ies|y)|t)|h(?:istor(?:ic|y)|e(?:nsile|at(?:ing)?))|jud(?:ic(?:i(?:al|ng)|e(?:[sd])?)|g(?:ing|ed?))|bend(?:ary)?|natal|en(?:(?:ing|ed|s))?|y(?:(?:ing|ed|s))?))?|a(?:cti(?:c(?:a(?:b(?:ilit(?:ies|y)|le)|l(?:(?:it(?:ies|y)|ly|s))?)|es?)|tioners?|s(?:ing|e(?:[sd])?))|g(?:mati(?:c(?:(?:ally|s))?|s(?:ts?|m))|ue)|i(?:s(?:e(?:(?:worthy|d|s))?|ing)|ries?)|y(?:(?:e(?:r(?:(?:ful(?:ly)?|book|s))?|d)|ing|s))?|n(?:k(?:s(?:ters?)?)?|c(?:ing|e(?:[dr])?)|g)|t(?:tl(?:ing|e(?:[rd])?))?|line|wns?|ms?)|i(?:n(?:c(?:ip(?:al(?:(?:it(?:ies|y)|ly|s))?|le(?:[sd])?)|e(?:(?:l(?:ings|y)|s(?:s(?:es)?)?))?)|t(?:(?:mak(?:ers|ing)|outs?|ings?|able|e(?:rs?|d)|s))?)|o(?:r(?:(?:i(?:t(?:i(?:s(?:ation|ing|e(?:[ds])?)|es)|y)|es)|s|y))?|ns)|v(?:a(?:t(?:i(?:s(?:ations?|ing|e(?:[sd])?)|ons?)|e(?:(?:ers?|ly|s))?)|cy)|ileg(?:ing|e(?:[sd])?)|et|y)|m(?:(?:i(?:tive(?:(?:ness|ly|s))?|ng)|o(?:geniture|rdial)|roses?|e(?:(?:time|ness|val|rs?|d|s))?|a(?:r(?:i(?:ly|es)|y)|eval|tes?|cy|l)|ness|ly|us))?|g(?:gish(?:(?:ness|ly))?)?|c(?:k(?:(?:l(?:i(?:n(?:ess|g)|e(?:st|r))|e(?:[sd])?|y)|ing|ed|s))?|e(?:(?:less|war|d|s|y))?|i(?:er|ng)|y)|e(?:s(?:t(?:(?:ess(?:es)?|hood|ly|s))?)?|d)|z(?:e(?:(?:winner|d|r|s))?|ing)|s(?:on(?:(?:ers?|s))?|m(?:(?:atic|s))?|tine|ing|e(?:[ds])?|sy)|apic|de(?:[ds])?)|u(?:d(?:ish(?:ness)?|e(?:(?:n(?:t(?:(?:ial|ly))?|ce)|ry))?)|ri(?:en(?:ce|t)|tus)|ssi(?:an?|c)|n(?:ings?|e(?:(?:rs|d|s))?))|y(?:ings?)?)|h(?:e(?:n(?:o(?:men(?:o(?:log(?:i(?:cal(?:ly)?|sts)|y)|n)|a(?:l(?:ly)?)?)|types?|ls?)|ylalanine)|romones?|asants?|w)|o(?:to(?:(?:s(?:(?:ynthe(?:tic(?:ally)?|sis(?:ing)?)|ensitive|phere|tat))?|electric(?:ally)?|g(?:raph(?:(?:i(?:c(?:ally)?|ng)|e(?:rs?|d)|s|y))?|enic)|typesett(?:ing|er)|c(?:hemi(?:cal(?:ly)?|stry)|op(?:ie(?:rs?|d|s)|y(?:ing)?)|ells)|m(?:etr(?:ic(?:ally)?|y)|ultiplier)|receptor|voltaic|ly(?:tic|sis)|ns?))?|sph(?:o(?:r(?:(?:escen(?:ce|t)|ous|us|ic|s))?|lipids)|at(?:ase|ic|es?))|n(?:o(?:log(?:ical(?:ly)?|y)|graph(?:ic)?|n)|e(?:(?:m(?:ic(?:ally)?|es?)|tic(?:(?:ally|i(?:ans|st)|s))?|ys?|d|r|s))?|ing|y)|enix(?:es)?|bi(?:as?|c)|oey)|y(?:si(?:o(?:(?:therap(?:ists?|y)|log(?:i(?:cal(?:ly)?|sts?)|y)|gnom(?:ies|y)))?|c(?:(?:al(?:(?:ity|ly))?|i(?:sts?|ans?)|s))?|que)|toplankton|l(?:ogen(?:etic|y)|a(?:ctery)?|um))|a(?:r(?:mac(?:euticals?|olog(?:i(?:cal|sts?)|y)|i(?:sts?|es)|y)|aoh|ynx)|nt(?:oms?|asy)|lanx|s(?:ing|e(?:[ds])?))|il(?:a(?:nthrop(?:i(?:sts?|c)|y)|tel(?:i(?:sts|c)|y))|o(?:soph(?:i(?:c(?:al(?:ly)?)?|s(?:ing|e)|es)|ers?|y)|log(?:i(?:cal|sts?)|y))|harmonic|istine)|r(?:enolog(?:i(?:cal(?:ly)?|sts)|y)|as(?:e(?:(?:ology|book|d|s))?|ing|al))|l(?:e(?:gm(?:atic(?:ally)?)?|botomy)|o(?:giston|x)))|e(?:d(?:e(?:st(?:rian(?:(?:is(?:ation|ed)|s))?|als?)|rasts)|a(?:gog(?:ic(?:al(?:ly)?)?|ue|y)|nt(?:(?:ic(?:ally)?|ry|s))?|l(?:(?:l(?:ing|ed)|s))?)|i(?:ment(?:(?:ed|s))?|grees?)|ology|dl(?:ing|e(?:(?:rs?|d|s))?)|lars?)|r(?:(?:s(?:on(?:(?:if(?:i(?:cations?|e[ds])|y(?:ing)?)|a(?:(?:l(?:(?:i(?:s(?:ation|ing|ed?)|t(?:ies|y))|ly))?|ges?|ble|e))?|nel|s))?|ua(?:si(?:ve(?:(?:ness|ly))?|ons?)|d(?:ing|e(?:(?:rs|s|d))?))|p(?:i(?:c(?:aci(?:ous|ty)|u(?:ous(?:ly)?|ity))|r(?:ation|ing|e))|e(?:ctives?|x))|e(?:ver(?:ing(?:ly)?|ance|e(?:[sd])?)|cut(?:i(?:ons?|ng)|ors?|ed?))|i(?:st(?:(?:e(?:n(?:t(?:ly)?|ce)|d)|ing|s))?|an?))|p(?:e(?:ndicular(?:(?:ly|s))?|t(?:rat(?:i(?:ng|on)|ors?|e(?:[ds])?)|u(?:a(?:t(?:i(?:ng|on)|e(?:[ds])?)|l(?:ly)?)|ity)))|lex(?:(?:i(?:t(?:ies|y)|ng)|ed(?:ly)?))?)|t(?:(?:in(?:aci(?:ous(?:ly)?|ty)|en(?:t(?:ly)?|ce))|urb(?:(?:ations?|ing|ed))?|ain(?:(?:ing|ed|s))?|ness|ly|h))?|a(?:mbulat(?:i(?:ons|ng)|ed?|or)|nnum)|c(?:e(?:pt(?:(?:i(?:b(?:ility|l[ey])|ve(?:(?:ness|ly))?|ons?)|ual(?:ly)?|s))?|iv(?:able|ing|e(?:[sd])?)|nt(?:(?:ages?|iles?))?)|u(?:ss(?:(?:i(?:on(?:ists?)?|ve(?:ly)?|ng)|e[sd]))?|taneous)|h(?:(?:lorate|ance|ing|e[drs]))?|olat(?:i(?:ng|on)|ors?|e(?:[sd])?)|ipient|ales)|e(?:grin(?:ations|es?)|mptor(?:i(?:ness|ly)|y)|nnial(?:(?:ly|s))?|stroika)|f(?:ect(?:(?:i(?:bility|on(?:(?:is(?:ts?|m)|s))?|ng)|ly|ed|s))?|u(?:nctor(?:ily|y)|s(?:ion|ed)|m(?:ing|e(?:(?:ry|s|d))?))|id(?:ious(?:ly)?|y)|or(?:at(?:ions?|ed?)|m(?:(?:a(?:nces?|ble)|ing|e(?:rs?|d)|s))?|ce))|m(?:(?:i(?:ssi(?:b(?:ility|le)|ve(?:ness)?|ons?)|t(?:(?:t(?:i(?:vity|ng)|ed)|s))?|ng)|a(?:n(?:ganate|en(?:t(?:ly)?|c[ye]))|frost)|e(?:a(?:b(?:ility|le)|t(?:i(?:on|ng)|e(?:[sd])?))|d)|ut(?:ations?|ing|e(?:[sd])?)|s))?|nicious(?:ness)?|v(?:a(?:sive(?:ness)?|d(?:ing|e(?:[sd])?))|er(?:s(?:e(?:(?:ness|ly))?|i(?:ons?|ty))|t(?:(?:ing|ed|s))?))|i(?:(?:o(?:perative|d(?:(?:ic(?:(?:al(?:(?:ly|s))?|ity))?|s))?)|p(?:h(?:er(?:al(?:(?:ly|s))?|ies|y)|ras(?:tic|is))|atetic)|g(?:lacial|ee)|s(?:h(?:(?:ables?|ing|e[sd]))?|copes?)|toneum|meters?|l(?:(?:ous(?:ly)?|s))?|helion|astron|n(?:atal|e(?:um|al))))?|quisites?|o(?:xid(?:ase|es?)|ration)|dition|u(?:(?:vian|s(?:ing|al|e(?:[ds])?)))?|k(?:(?:i(?:e(?:st|r)|ly|ng)|ed|s|y))?|jur(?:e(?:[rd])?|y)|golas?|haps|r(?:on|y)))?|s(?:simis(?:t(?:(?:ic(?:ally)?|s))?|m)|t(?:(?:i(?:len(?:t(?:ial)?|ce)|cides?)|er(?:(?:ing|ed))?|le|s))?|etas?|ky)|t(?:(?:r(?:o(?:chemicals?|graphic(?:al)?|l(?:(?:og(?:ical|y)|eum))?)|if(?:i(?:cation|e[sd])|y(?:ing)?)|els?)|t(?:i(?:fogg(?:ers|ing)|sh(?:(?:ness|ly))?|coats?|n(?:ess|g)|e(?:st|r))|ed|y)|it(?:(?:ion(?:(?:e(?:rs?|d)|ing|s))?|e))?|u(?:lan(?:t(?:ly)?|ce)|nias?)|hidine|er(?:(?:ing|ed|s))?|a(?:ls?|rd)|s))?|c(?:u(?:liar(?:(?:it(?:ies|y)|ly))?|niary)|t(?:orals?|in)|cary|k(?:(?:e(?:rs?|d)|i(?:ng|sh)|s))?|an)|n(?:(?:etra(?:t(?:i(?:ng(?:ly)?|ons?|ve)|e(?:[sd])?)|ble)|n(?:y(?:pinching)?|i(?:less|es|ng)|a(?:nts?|mes?)|ed)|t(?:(?:a(?:syllabic|meters?|t(?:hl(?:ete|on)|onic)|g(?:rams?|on(?:(?:al|s))?))|ecostal|house))?|u(?:ltimate(?:ly)?|r(?:ious|y)|mbra)|a(?:l(?:(?:is(?:ation|ing|e(?:[sd])?)|t(?:ies|y)))?|nces?)|i(?:ten(?:t(?:(?:ia(?:ry|l)|ly|s))?|ce)|nsula(?:[sr])?|cillin|le)|s(?:i(?:on(?:(?:able|ing|e(?:rs?|d)|s))?|ve(?:(?:ness|ly))?))?|c(?:il(?:(?:l(?:ing|ed)|s))?|hant|e)|d(?:ul(?:ums?|ous)|ants?|ing)|ology|knife|guins?))?|jorative(?:(?:ly|s))?|a(?:(?:c(?:e(?:(?:ful(?:(?:ness|ly))?|keep(?:ers|ing)|mak(?:ers?|ing)|time|abl[ye]))?|h(?:(?:ie(?:st|r)|es|y))?|ocks?)|t(?:(?:lands?|y))?|s(?:ant(?:(?:ry|s))?)?|r(?:(?:trees|l(?:[sy])?|s))?|k(?:(?:in(?:ess|g)|ed|s|y))?|fowl|hens|l(?:(?:ing|ed|s))?|nuts?))?|e(?:vish(?:(?:ness|ly))?|r(?:(?:less|ages?|ing|ed|s))?|p(?:(?:hole|e(?:rs?|d)|ing|s))?|l(?:(?:ings?|e(?:rs?|d)|s))?|k(?:(?:ing|ed|s))?)|p(?:(?:per(?:(?:corns?|mints?|ing|ed|s|y))?|ti(?:des?|c)|eroni|s))?|l(?:vi(?:s(?:es)?|c)|icans?|lets?|mets?|t(?:(?:ing|ed|s))?|e)|bbl(?:e(?:[ds])?|y)|g(?:(?:asus|g(?:ing|ed)|s))?|o(?:nies|ple(?:[ds])?)|k(?:ing|an)|w(?:(?:ter|s))?)|s(?:ych(?:o(?:(?:l(?:inguist(?:ics?|s)|og(?:i(?:cal(?:ly)?|sts?|es)|y))|t(?:herap(?:ists?|y)|ic(?:(?:ally|s))?)|path(?:(?:ology|ic|s))?|analy(?:s(?:is|ts?|e)|tic)|kine(?:sis|tic)|s(?:o(?:matic|cial)|is|es)|metric))?|i(?:atr(?:i(?:sts?|c)|y)|c(?:(?:ally|s))?)|e(?:deli[ac])?)|e(?:phologist|udo(?:(?:nym(?:(?:ous|s))?|pod))?)|oriasis|al(?:ter(?:[ys])?|m(?:(?:ody|ist|s))?))|a(?:l(?:(?:a(?:eo(?:ntolog(?:i(?:sts?|cal)|y)|graphic|lithic)|t(?:a(?:b(?:ility|le)|l)|i(?:n(?:ate|e)|al)|es?)|ces?|ver)|p(?:(?:itat(?:i(?:ons?|ng)|ed?)|a(?:te(?:[sd])?|bl[ye])))?|i(?:n(?:drom(?:es?|ic)|g)|mpsest|sades?)|l(?:(?:bearers|i(?:atives?|d)|adium|mall|e(?:ts?|d)|or|s))?|tr(?:i(?:ness|e(?:st|r))|y)|m(?:(?:i(?:st(?:ry)?|ng)|tops?|ed|s|y))?|e(?:(?:ttes?|ness|face|ly|st?|d|r))?|s(?:(?:ied|y))?|udal))?|r(?:(?:a(?:p(?:sycholog(?:ist|y)|h(?:ernalia|ras(?:ing|e(?:[ds])?))|legic|ets?)|m(?:e(?:t(?:ri(?:s(?:ation|e(?:[ds])?)|c(?:ally)?)|ers?)|dic(?:(?:al|s))?)|ilitar(?:ies|y)|agneti(?:sm|c)|ou(?:nt(?:cy)?|r))|l(?:l(?:el(?:(?:e(?:piped|d)|ograms?|i(?:ng|sm)|s))?|ax(?:es)?)|inguistic|y(?:tic(?:ally)?|s(?:i(?:ng|s)|e(?:[sd])?)))|s(?:it(?:olog(?:ist|y)|i(?:c(?:al)?|s(?:ed|m))|es?)|ols?)|d(?:ox(?:(?:ical(?:ly)?|es))?|i(?:gm(?:(?:atic|s))?|ses?|ng)|e(?:[drs])?)|c(?:hut(?:i(?:sts?|ng)|e(?:[sd])?)|etamol)|g(?:raph(?:(?:ing|s))?|liding|uay|ons?)|troop(?:(?:ers?|s))?|b(?:ol(?:oids?|ic|as?)|les?)|no(?:rmal|i(?:a(?:cs?)?|d))|keets?|quat|ffin)|l(?:iament(?:(?:ar(?:ians?|y)|s))?|ou(?:r(?:(?:maid|s))?|s)|ey(?:ing)?|ance)|e(?:(?:nt(?:(?:h(?:e(?:tic(?:al(?:ly)?)?|s(?:is(?:ed?)?|es))|ood)|s(?:inlaw)?|in(?:law|g)|e(?:ral|d)|a(?:ge|l)))?|d|s))?|t(?:(?:henogenesis|i(?:c(?:ula(?:r(?:(?:i(?:t(?:ies|y)|s(?:ed?|m))|ly|s))?|tes?)|ip(?:a(?:t(?:or[sy]|i(?:ng|on|ve)|e(?:[ds])?)|nts?)|les?)|les?)|san(?:s(?:hip)?)?|tion(?:(?:ing|ed|s))?|al(?:(?:ity|ly))?|ngs?|es)|ner(?:(?:s(?:hips?)?|ing|ed))?|ridges?|ak(?:ing|e(?:(?:rs?|s|n))?)|time|ook|ed|ly|s|y))?|i(?:s(?:(?:h(?:(?:ioners?|es))?|ian))?|t(?:ies|y)|etal|ahs?|ng)|o(?:chial(?:i(?:sm|ty))?|xysms?|d(?:y(?:ing)?|i(?:st|e[sd]))|le)|s(?:i(?:mon(?:ious|y)|ngs?)|on(?:(?:age|s))?|nips?|e(?:(?:cs?|rs?|d|s))?|ley)|don(?:(?:able|ing|ed|s))?|c(?:h(?:(?:ments?|e[ds]))?|el(?:(?:l(?:ing|ed)|s))?)|r(?:ot(?:(?:ing|s))?|y(?:ing)?|ie[ds])|k(?:(?:land|ing|as?|ed|s))?|faits?|boil|quet|venu))?|s(?:s(?:(?:i(?:on(?:(?:ate(?:(?:ness|ly))?|less|s))?|v(?:ated|ity|e(?:(?:ly|s))?)|ng|m)|a(?:ge(?:(?:ways?|s))?|bl[ye]|nt)|e(?:(?:ngers?|r(?:s(?:by)?)?|d|s))?|words?|ports?|over|mark))?|t(?:(?:e(?:(?:ur(?:is(?:ation|ed))?|board|ls?|d|s))?|or(?:(?:al(?:ism)?|s))?|ur(?:e(?:(?:land|s|d))?|ing)|i(?:ches?|mes?|lle|es|ng|s)|r(?:ies|ami|y)|as?|s|y))?|c(?:als?|hal))|t(?:(?:h(?:(?:o(?:log(?:i(?:cal(?:ly)?|sts?|es)|y)|gen(?:(?:esis|ic|s))?|s)|etic(?:ally)?|finders?|ways?|less|s))?|e(?:(?:r(?:n(?:al(?:(?:is(?:t(?:ic)?|m)|ly))?|ity))?|n(?:t(?:(?:able|ing|ly|e[ed]|s))?)?|lla|s))?|r(?:o(?:n(?:(?:is(?:ation|ing(?:ly)?|e(?:[sd])?)|ess(?:es)?|age|s))?|l(?:(?:l(?:ing|ed)|s))?)|i(?:arch(?:(?:ies|al|y|s))?|lineal|ot(?:(?:i(?:sm|c)|s))?|cians?|mony))|t(?:e(?:r(?:(?:n(?:(?:less|ing|ed|s))?|ing|ed|s))?|ns?|d)|i(?:es|ng))|i(?:sserie|na(?:tion)?|en(?:t(?:(?:ly|s))?|ce)|o)|ch(?:(?:i(?:n(?:ess|g)|e(?:st|r)|ly)|work|able|e[ds]|up|y))?|ois|s))?|e(?:d(?:iatric(?:(?:ians?|s))?|ophil(?:es?|ia))|ans?|lla|ony)|i(?:n(?:(?:s(?:taking(?:ly)?)?|ful(?:(?:ness|ly))?|killers?|t(?:(?:b(?:rush|ox)|work|ings?|e(?:rs?|d)|s))?|less(?:ly)?|ing|ed))?|r(?:(?:wise|ings?|ed|s))?|d(?:up)?|ls?)|n(?:(?:ic(?:(?:s(?:tricken)?|k(?:ing|ed|y)))?|t(?:(?:e(?:chnicon|d)|he(?:is(?:t(?:ic)?|m)|rs?|on)|o(?:graphs?|mimes?)|aloons|r(?:ies|y)|i(?:le(?:[sd])?|es|ng)|s))?|d(?:e(?:m(?:onium|ics?)|r(?:(?:ing|s))?)|ora|as?)|jandrum|e(?:(?:l(?:(?:l(?:i(?:sts?|ng)|ed)|s))?|d|s))?|c(?:rea(?:tic|s)|ake(?:[sd])?)|o(?:ram(?:ic|as?)|ply)|n(?:i(?:ers?|ng)|ed)|g(?:(?:olin|as?|s))?|a(?:c(?:eas?|he)|ma)|s(?:(?:ies|y))?|zer))?|c(?:i(?:f(?:i(?:c(?:ation)?|s(?:ts?|m)|e[srd])|y(?:ing)?)|ng)|e(?:(?:m(?:a(?:kers?|n)|en)|rs?|d|s|y))?|k(?:(?:horse|a(?:g(?:ing|e(?:[sd])?)|ble)|ings?|e(?:rs?|ts?|d)|s))?|hyderm|ts?)|mp(?:hlet(?:(?:eers?|s))?|er(?:(?:ing|ed|s))?|as)|p(?:(?:er(?:(?:w(?:eights?|ork)|backs?|thin|less|ing|ed|s|y))?|a(?:(?:razzi|cy|ws?|ya|l|s))?|i(?:lla|st)|rika|yr(?:us|i)|u(?:le|a)|py))?|w(?:(?:n(?:(?:brokers?|s(?:hops?)?|ing|ed))?|paws?|ing|ed|s))?|y(?:(?:m(?:asters?|ents?)|phones?|s(?:lips)?|rolls?|loads?|able|back|days?|e(?:es?|rs?|d)|ing))?|g(?:in(?:a(?:t(?:i(?:on|ng)|ed?)|l)|g)|e(?:(?:ant(?:(?:ry|s))?|boy|ful|rs?|d|s))?|an(?:(?:ism|s))?|odas?)|d(?:(?:lock(?:(?:ing|ed|s))?|d(?:ocks?|l(?:ing|e(?:(?:rs?|d|s))?)|ings?|ed|y)|res?|s))?|v(?:i(?:lions?|ngs?)|e(?:(?:ments?|d|s))?|lov)|kistan|jamas?|u(?:city|nchy?|pers?|s(?:ing|e(?:[ds])?)|l))|i(?:c(?:t(?:ur(?:e(?:(?:s(?:que(?:(?:ness|ly))?)?|d))?|ing|al)|o(?:gra(?:phic|ms?)|rial(?:ly)?))|k(?:(?:pocket(?:(?:ing|s))?|e(?:t(?:(?:ing|ed|s))?|r(?:(?:els?|s))?|d)|l(?:ing|e(?:[ds])?)|ings?|axes?|ups?|s))?|oseconds|nic(?:(?:k(?:ing|e(?:rs|d))|s))?|a(?:(?:resque|sso))?|colo)|e(?:(?:zoelectric|r(?:(?:c(?:ing(?:ly)?|e(?:(?:rs?|d|s))?)|s))?|c(?:e(?:(?:w(?:ork|ise)|meal|d|s))?|ing)|bald|t[ay]|s|d))?|g(?:(?:ment(?:(?:ation|ed|s))?|tail(?:(?:ed|s))?|g(?:y(?:back)?|ery|ish)|s(?:t(?:ies|y))?|eons?|lets?))?|l(?:grim(?:(?:ages?|s))?|l(?:(?:o(?:w(?:(?:cases?|ed|s))?|r(?:ie[sd]|y))|a(?:g(?:ing|e(?:[sd])?)|r(?:(?:ed|s))?)|box|ion|s))?|fer(?:(?:ing|ed))?|chards?|asters?|ot(?:(?:ing|ed|s))?|e(?:(?:up|d|s))?|ing)|n(?:(?:c(?:ushions?|h(?:(?:ing|e[drs]))?|er(?:(?:ed|s))?)|p(?:oint(?:(?:ing|ed|s))?|ricks?)|s(?:tripe(?:[sd])?)?|e(?:(?:a(?:pples?|l)|d|s))?|t(?:s(?:ized)?)?|n(?:acle(?:[sd])?|ing|ed)|afores?|k(?:(?:ness|i(?:es?|ng|sh)|e[dr]|s|y))?|i(?:on(?:(?:ed|s))?|ng)|h(?:oles?|eads?)|g(?:(?:pong|s))?|ball|ups?|y))?|r(?:ouett(?:ing|e(?:[sd])?)|a(?:t(?:i(?:cal|ng)|e(?:[ds])?)|nhas?|c(?:ies|y)))|t(?:(?:i(?:less(?:ly)?|ful(?:ly)?|abl[ye]|e[ds])|ch(?:(?:forks?|dark|ing|e(?:rs?|d|s)))?|y(?:ing(?:ly)?)?|uitary|eous(?:ly)?|t(?:ance|ing|ed)|h(?:(?:i(?:e(?:st|r)|ly)|ead|s|y))?|falls?|bull|ons?|s))?|o(?:n(?:(?:eer(?:(?:ing|ed|s))?|s))?|us(?:ly)?)|a(?:n(?:o(?:(?:forte|la))?|is(?:simo|t(?:(?:ic|s))?))|zzas?)|z(?:z(?:icato|erias?|as?)|azz)|p(?:(?:e(?:(?:lines?|work|ttes?|rs?|d|s))?|i(?:ngs?|ts?)|p(?:ing?|ed)|s))?|mp(?:(?:ernel|ing|l(?:e(?:[ds])?|y)|s))?|ke(?:(?:s(?:taff)?|men))?|vot(?:(?:ing|al|ed|s))?|qu(?:an(?:cy|t)|ed?)|s(?:to(?:ls?|ns?)|a)|dgin|ffle|x(?:els?|ies?))|l(?:e(?:n(?:i(?:potentiary|tude)|t(?:eous(?:ly)?|iful(?:ly)?|y)|ary|um)|a(?:(?:s(?:(?:ant(?:(?:ness|r(?:ies|y)|e(?:st|r)|ly))?|ur(?:abl[ey]|es?)|ing(?:ly)?|e(?:[ds])?))?|d(?:(?:ing(?:(?:ly|s))?|ed|s))?|t(?:(?:ed|s))?))?|b(?:(?:iscite|eian|s))?|ctrums?|ur(?:isy|al?)|thora|dg(?:ing|e(?:[ds])?)|xus)|a(?:n(?:(?:e(?:(?:t(?:(?:esimals|ar(?:ium|y)|oids|s))?|d|s))?|t(?:(?:a(?:tions?|in)|ings?|e(?:rs?|d)|s))?|k(?:(?:ton(?:ic)?|ing|s))?|n(?:ing|e(?:rs?|d))|gent|ing|ar|s))?|t(?:i(?:tud(?:inous|es?)|n(?:um|g))|ypus(?:es)?|forms?|e(?:(?:lets?|fuls?|au(?:[xs])?|ns?|d|s))?|ters?|o(?:(?:ons?|nic))?)|g(?:iaris(?:ing|ed?|ts?|m)|u(?:ing|e(?:[ds])?))|s(?:t(?:er(?:(?:board|work|ing|e(?:rs?|d)|s))?|ic(?:(?:i(?:se(?:rs|d)|ty)|s))?)|m(?:(?:ids?|as?))?)|u(?:sib(?:ility|l[ye])|dits)|c(?:a(?:t(?:ing(?:ly)?|ory|e(?:[sd])?)|rds?)|e(?:(?:holder|men(?:ts?)?|nta(?:[sle])?|bo|rs?|d|s))?|i(?:d(?:(?:ity|ly))?|ngs?))|i(?:n(?:(?:t(?:i(?:ve(?:ly)?|ffs?))?|ness|est|ly|s))?|t(?:(?:ing|ed|s))?|ce|ds?)|y(?:(?:f(?:ellows?|ul(?:(?:ness|ly))?)|grou(?:nds?|ps?)|wrights?|t(?:hings?|ime)|mates?|house|room|ings?|b(?:oys?|ack)|able|e(?:rs?|d)|s))?|ques?|zas?)|u(?:ral(?:(?:i(?:s(?:ation|ing|t(?:(?:ic|s))?|ed?|m)|ty)|s))?|to(?:(?:cra(?:ts|cy)|ni(?:um|c)))?|perfect|n(?:der(?:(?:ing|e(?:rs|d)|s))?|g(?:ing|e(?:(?:rs?|d|s))?))|m(?:(?:m(?:et(?:(?:ing|ed|s))?|y)|p(?:(?:ness|ing|e[dr]))?|tree|b(?:(?:ing|e(?:rs?|d)|ago|s))?|ages?|ing|e(?:[ds])?|s|y))?|ck(?:(?:i(?:e(?:st|r)|ng)|e[dr]|s|y))?|g(?:(?:hole|g(?:ing|ed)|s))?|s(?:(?:es|hy?))?)|o(?:ugh(?:(?:s(?:hares?)?|m(?:en|an)|ing|e(?:rs|d)))?|t(?:(?:t(?:ing|e(?:rs?|d))|s))?|p(?:(?:p(?:ing|ed)|s))?|d(?:(?:d(?:ing|e[dr])|s))?|sive|vers?|ys?)|i(?:msolls|a(?:ble|nt)|ghts?|nths?|e(?:rs|d|s))|y(?:(?:wood|ing))?)|o(?:l(?:y(?:c(?:rystalline|arbonate|hrom(?:atic|e)|yclic|otton)|s(?:accharides?|yllab(?:les?|ic)|tyrene)|u(?:nsaturate[ds]|rethane)|m(?:er(?:(?:i(?:s(?:ation|ed)|c)|ases?|s))?|orph(?:i(?:sms?|c)|ous)|ath)|p(?:(?:ropylene|eptides?|hon(?:ic|y)|s))?|e(?:thylene|sters?)|nomial(?:(?:ly|s))?|t(?:echnics?|he(?:is(?:t(?:(?:ic|s))?|m)|ne)|opes)|hedr(?:on|al?)|g(?:yn(?:ous|y)|am(?:ous|y)|raph|on(?:(?:al|s))?|lots?)|a(?:tomic|ndry))|i(?:t(?:ic(?:(?:i(?:s(?:ation|ing|ed?)|ans?)|al(?:ly)?|king|s))?|e(?:(?:ness|s(?:se|t)|ly|r))?|buro|y)|c(?:y(?:holders?)?|e(?:(?:wom(?:en|an)|m(?:en|an)|d|s))?|i(?:ng|es))|o(?:myelitis)?|sh(?:(?:ings?|e(?:rs?|s|d)))?)|a(?:r(?:i(?:s(?:ations?|ing|ed?)|t(?:ies|y)))?|nd)|e(?:(?:vaulting|mic(?:(?:ist|al|s))?|wards?|s(?:tar)?|cats?|d))?|t(?:ergeists?|roon)|l(?:(?:in(?:at(?:i(?:ng|on)|ors?|ed?)|g)|ut(?:i(?:ons?|ng)|ants?|e(?:(?:rs?|s|d))?)|s(?:ters?)?|arded|e(?:ns?|d)))?|o(?:n(?:aises?|i(?:um|es)|eck|y))?|der|kas?)|p(?:(?:u(?:l(?:a(?:r(?:(?:i(?:s(?:ations?|ing|ed?)|ty)|ly))?|t(?:i(?:ons?|ng)|ed?)|ce)|is(?:ts?|m)|ous)|p)|p(?:y(?:cock)?|i(?:es|ng)|e[drt])|music|corn|e(?:(?:yed|s))?|lars?|s))?|s(?:t(?:(?:operative(?:ly)?|graduates?|m(?:o(?:dern(?:is[mt])?|rtems?)|istress|a(?:sters?|rk(?:(?:ed|s))?|n)|en)|pon(?:e(?:(?:ments?|s|d))?|ing)|humous(?:ly)?|s(?:cripts?)?|u(?:lat(?:i(?:ng|on)|e(?:[sd])?)|r(?:ings?|e(?:[sd])?|al))|i(?:l(?:lion|ions?)|ngs?)|e(?:r(?:(?:i(?:ors?|ty)|s))?|d)|natal|fixes|dated|c(?:odes?|ards?)|b(?:ox(?:es)?|ag)|lude|a(?:ge|l)))?|s(?:e(?:ss(?:(?:i(?:ve(?:(?:ness|ly|s))?|ons?|ng)|ors?|e[sd]))?)?|ib(?:ilit(?:ies|y)|l(?:es?|y))|ums?)|i(?:t(?:(?:i(?:on(?:(?:a(?:ble|l(?:ly)?)|ing|ed|s))?|v(?:e(?:(?:ness|ly|s))?|i(?:s(?:ts?|m)|ty))|ng)|rons?|ed|s))?|es|ng)|e(?:(?:idon|urs?|rs?|d|s))?|y|h)|verty(?:stricken)?|i(?:kilothermic|n(?:t(?:(?:less(?:(?:ness|ly))?|e(?:d(?:(?:ness|ly))?|rs?)|i(?:llis[mt]|ng)|blank|s|y))?|settias)|s(?:on(?:(?:ings?|ous|e[rd]|s))?|ing|e(?:[ds])?)|gnan(?:t(?:ly)?|cy))|n(?:t(?:if(?:ica(?:t(?:i(?:ons?|ng)|ed?)|l)|fs?)|oons?)|d(?:(?:er(?:(?:ous(?:ly)?|ing|ed|s))?|s))?|y(?:tail)?|c(?:ho|e)|ies)|t(?:(?:en(?:t(?:(?:i(?:al(?:(?:it(?:ies|y)|ly|s))?|ometers?)|ates?|ly))?|c(?:ies|y))|bellied|t(?:e(?:r(?:(?:i(?:ng|es)|ed|s|y))?|d)|age|i(?:es|ng)|y)|s(?:h(?:erds|ots?))?|pourri|a(?:s(?:sium|h)|ble|to)|holes?|ions?|ch))?|r(?:n(?:(?:o(?:graph(?:ers?|ic|y))?|s))?|t(?:(?:cullis(?:es)?|e(?:n(?:t(?:(?:ous(?:ly)?|s))?|d(?:(?:ing|ed|s))?)|r(?:(?:age|s))?|d)|manteaus?|a(?:b(?:ility|les?)|ge|ls?)|ra(?:it(?:(?:ist|ure|s))?|y(?:(?:ing|als?|ed|s))?)|holes?|folio|ugal|i(?:ons?|co|ng)|ly|s))?|p(?:hyr(?:itic|y)|oises?)|c(?:upines?|elain|h(?:es)?|ine)|ridge|o(?:sity|us)|k(?:(?:chop|er|y))?|ing|e(?:[ds])?)|w(?:er(?:(?:less(?:ness)?|ful(?:(?:ness|ly))?|s(?:haring)?|houses?|boats?|ing|ed))?|der(?:(?:ing|ed|s|y))?)|m(?:e(?:granates?|lo)|p(?:(?:o(?:us(?:(?:ness|ly))?|sity)|adour|e(?:ii|y)))?|ades?)|o(?:r(?:(?:spirited|ness|e(?:st|r)|ly))?|l(?:(?:s(?:ide)?|ing|ed))?|ch(?:es)?|dles?|p|h|f)|k(?:e(?:(?:r(?:(?:faced|s))?|d|s))?|ing|y)|e(?:t(?:(?:i(?:c(?:(?:al(?:ly)?|s))?|se)|ess|ry|s))?|ms?)|ck(?:(?:marked|e(?:t(?:(?:book|ing|ful|ed|s))?|d)|s))?|u(?:lt(?:(?:erer|ice|ry))?|r(?:(?:able|ing|ed|s))?|n(?:d(?:(?:ing|age|ed|s))?|c(?:ing|e(?:[ds])?))|ch(?:es)?|ffes?|t(?:(?:ing|e[dr]|s))?)|ach(?:(?:ing|e(?:rs?|d|s)))?|d(?:(?:i(?:ums?|a)|ded|gy|s))?|g(?:roms?|o)|x)|u(?:r(?:p(?:o(?:s(?:e(?:(?:ful(?:(?:ness|ly))?|l(?:ess(?:ly)?|y)|s|d))?|i(?:ve|ng))|rt(?:(?:ed(?:ly)?|ing|s))?)|l(?:ish|es?))|i(?:f(?:i(?:cation|e[srd])|y(?:ing)?)|t(?:an(?:(?:i(?:cal|sm)|s))?|ies|y)|nes|sts?|ms)|chas(?:able|ing|e(?:(?:rs?|s|d))?)|g(?:at(?:or(?:ial|y)|ive)|ings?|e(?:[ds])?)|v(?:ey(?:(?:ance|ors?|ing|ed))?|iew)|s(?:u(?:an(?:ce|t)|i(?:ts?|ng)|e(?:(?:rs?|d|s))?)|ing|e(?:[drs])?)|l(?:(?:oin(?:ed)?|i(?:eus|n[gs])|s))?|e(?:(?:ness|es?|ly|st|r))?|blind|r(?:(?:ing|ed|s))?|dah)|l(?:veris(?:ation|ing|ed?)|chritude|s(?:a(?:t(?:i(?:ons?|ng)|e(?:[sd])?)|rs?)|ing|e(?:[ds])?)|monary|l(?:(?:overs?|e(?:ts|ys?|d|r)|ing|s))?|p(?:(?:i(?:ng|ts?)|ed|s|y))?|ing)|n(?:(?:c(?:t(?:ilious(?:ly)?|u(?:a(?:t(?:i(?:on(?:(?:al|s))?|ng)|e(?:[sd])?)|l(?:(?:ity|ly))?)|r(?:ing|e(?:[sd])?))|ate)|h(?:(?:lines?|card|bowl|able|ing|e[drs]|y))?)|i(?:sh(?:(?:ments?|able|ing|e[sd]))?|tive(?:ly)?|e(?:st|r))|gen(?:t(?:ly)?|cy)|dits?|n(?:ing|e[dt])|s(?:ter)?|t(?:(?:e(?:rs?|d)|ing|s))?|k(?:[sy])?|y))?|b(?:(?:li(?:c(?:(?:a(?:tions?|ns?)|i(?:s(?:ing|ts?|e(?:[sd])?)|ty)|ly))?|sh(?:(?:able|ing|e(?:rs?|s|d)))?)|e(?:scent|rty)|ic|s))?|g(?:(?:naci(?:ous(?:ly)?|ty)|ilist(?:ic)?|s))?|s(?:(?:s(?:y(?:(?:footing|cat))?)?|h(?:(?:overs|able|e(?:rs?|d|s)|i(?:er|ng)|ups|y))?|tul(?:es?|ar)))?|t(?:(?:r(?:e(?:f(?:action|y(?:ing)?)|scent)|id(?:ity)?)|ative(?:ly)?|t(?:(?:e(?:rs?|d)|i(?:ng)?|s|y))?|put|s(?:ch)?))?|zzl(?:ing(?:ly)?|e(?:(?:ment|d|r|s))?)|m(?:mel(?:(?:l(?:ing|ed)|s))?|p(?:(?:kins?|ing|ed|s))?|ice|as?)|p(?:(?:p(?:y(?:hood)?|et(?:(?:eer|ry|s))?|ies)|il(?:(?:lage|s))?|a(?:(?:t(?:ing|e[ds])|e|l))?|s))?|ff(?:(?:in(?:(?:ess|g|s))?|balls|e[dr]|s|y))?|er(?:peral|il(?:ity|e))|issant|dd(?:ings?|les?)|k(?:ing|e))|y(?:r(?:o(?:technics?|maniacs?|xenes?|lys(?:is|e))|a(?:cantha|mid(?:(?:al|s))?)|i(?:dine|tes?)|es?)|gm(?:ies|y)|jamas?|thons?|lons?)|t(?:ero(?:dactyl|saurs)|armigans?|olemy)|neum(?:atics?|onia))|t(?:e(?:l(?:e(?:co(?:m(?:mu(?:nications?|ting)|s)|nference)|p(?:ath(?:ic(?:ally)?|y)|rinters?|ho(?:n(?:i(?:sts?|ng|c)|e(?:[ds])?|y)|to))|olog(?:ical|y)|gra(?:ph(?:(?:i(?:ng|c)|ed|s|y))?|ms?)|working|vis(?:i(?:ons?|ng)|ual|ed?)|s(?:cop(?:i(?:ng|c)|e(?:[ds])?)|ales)|kinesis|t(?:ypes?|hon|ext)|metry|x(?:es)?)|l(?:(?:ing(?:ly)?|tale|ers?|s|y))?|aviv)|c(?:h(?:n(?:o(?:log(?:i(?:cal(?:ly)?|sts?|es)|y)|cra(?:c(?:ies|y)|t(?:(?:ic|s))?)|ph(?:obi[ca]|iles))|i(?:c(?:al(?:(?:it(?:ies|y)|ly))?|ians?)|ques?)))?|tonic(?:(?:ally|s))?)|m(?:p(?:e(?:r(?:(?:a(?:(?:ment(?:(?:al(?:ly)?|s))?|t(?:ures?|e(?:ly)?)|nce))?|ing|ed|s))?|st(?:(?:uous|s))?)|t(?:(?:ations?|ing(?:ly)?|ress|e(?:rs?|d)|s))?|o(?:ra(?:r(?:i(?:ly|es)|y)|l(?:(?:ity|ly))?))?|l(?:ates?|es?)|i)|erity)|r(?:r(?:or(?:(?:s(?:tricken)?|is(?:ing|ed?|ts?|m)))?|i(?:tor(?:i(?:al(?:(?:ity|ly))?|es)|y)|f(?:y(?:ing(?:ly)?)?|i(?:c(?:ally)?|e[sd]))|ers?|bl[ye]|ne)|estrial|a(?:form(?:ed)?|c(?:otta|ing|e(?:[sd])?)|pins?|zzo|ins?)|y)|m(?:(?:i(?:n(?:olog(?:i(?:cal|es)|y)|a(?:t(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|l(?:(?:ly|s))?)|us|i|g)|tes?)|ly|ed|s))?|centenary|tiar(?:ies|y)|se(?:(?:ness|ly|r))?|n(?:(?:ary|s))?)|t(?:r(?:a(?:(?:chloride|hedr(?:ons?|al?)|meters))?|oxide)|her(?:(?:ing|ed|s))?|ch(?:ily|y)|anus)|s(?:se(?:llat(?:ions?|ed)|ral)|t(?:(?:osterone|i(?:mon(?:i(?:als?|es)|y)|c(?:ular|les?)|f(?:y(?:ing)?|ie[sd])|n(?:ess|gs?)|e(?:st|r)|ly|s)|a(?:ment(?:(?:ary|s))?|b(?:ility|le))|driv(?:ing|e)|tube|e(?:rs?|s|d)|s|y))?)|n(?:(?:d(?:(?:e(?:n(?:tious(?:ly)?|c(?:ies|y))|r(?:(?:ness|ing|e(?:st|r|d)|ly|s))?|d)|rils?|ons?|ing|s))?|t(?:(?:e(?:rhooks|d)|a(?:tive(?:ly)?|cle(?:[sd])?)|hs?|s))?|a(?:ci(?:ous(?:ly)?|ty)|b(?:ility|le)|n(?:c(?:ies|y)|t(?:(?:ry|ed|s))?))|u(?:ous(?:ly)?|r(?:ial|e(?:[sd])?))|s(?:(?:i(?:on(?:(?:ed|al|s))?|ty|ng|le)|e(?:(?:ness|st?|ly|r|d))?|ors?))?|e(?:ments?|ts?)|n(?:ers|is)|fold|o(?:rs?|n)|ch))?|e(?:(?:t(?:otal(?:(?:lers?|ism))?|h(?:(?:marks|ing|e(?:[sd])?))?|er(?:(?:ing|ed))?)|n(?:(?:y(?:weeny)?|age(?:(?:rs?|d))?|iest|sy?))?|pees?|m(?:(?:ing|ed|s))?|ing|hee|d|s))?|a(?:(?:s(?:(?:poon(?:(?:fuls?|s))?|ing(?:ly)?|hops?|e(?:(?:rs?|s|d))?))?|r(?:(?:s(?:tained)?|ful(?:(?:ness|ly))?|drops?|ooms?|less|away|ing|gas))?|m(?:(?:mates?|work|s(?:ter)?|ing|ed))?|c(?:h(?:(?:ings?|able|e(?:rs?|s)))?|loth|ups?)|t(?:(?:imes?|s))?|p(?:arty|ots?)|bags?|k|l))?|d(?:(?:i(?:ous(?:(?:ness|ly))?|ums?)|d(?:ies|y)|s))?|x(?:t(?:(?:u(?:al(?:(?:ity|ly))?|r(?:al(?:ly)?|e(?:[sd])?))|books?|iles?|s))?|a(?:ns?|s))|quila|heran|p(?:ee|id))|r(?:a(?:n(?:s(?:m(?:ogrif(?:i(?:cation|es)|y)|i(?:gration|t(?:(?:t(?:a(?:nce|ble)|ing|e(?:rs?|d))|s))?|ssi(?:ons?|ble|ve))|ut(?:ation|ing|ed?))|p(?:o(?:rt(?:(?:a(?:b(?:ility|le)|tion)|ing|e(?:rs?|d)|s))?|s(?:i(?:tions?|ng)|e(?:[ds])?)|nders?)|lant(?:(?:ation|ing|ed|s))?|aren(?:c(?:ies|y)|t(?:ly)?)|ir(?:ation|e(?:[ds])?))|l(?:iterat(?:i(?:ons?|ng)|e(?:[sd])?)|at(?:i(?:on(?:(?:al|s))?|ng)|able|ors?|e(?:[ds])?)|ucen(?:c[ye]|t))|f(?:orm(?:(?:ati(?:on(?:(?:al|s))?|ve)|ing|e(?:rs?|d)|s))?|i(?:gur(?:ation|ed)|nite(?:ly)?|xed)|er(?:(?:ab(?:ility|le)|r(?:ing|ed|al)|e(?:nce|es?)|s))?|us(?:i(?:ons?|ng)|ed))|c(?:ontinental|e(?:nd(?:(?:e(?:n(?:t(?:al(?:(?:ly|s))?)?|ce)|d)|ing|s))?|ivers?)|ri(?:pt(?:(?:ion(?:(?:al|s))?|s))?|b(?:ing|e(?:(?:rs?|s|d))?)))|i(?:t(?:(?:or(?:iness|y)|i(?:v(?:ity|e(?:ly)?)|on(?:(?:al|s))?)|s))?|stor(?:(?:ised|s))?|en(?:t(?:(?:ly|s))?|ce))|gress(?:(?:i(?:ons?|ve|ng)|ors?|e[sd]))?|ve(?:sti(?:tes?|sm)|rse(?:ly)?)|national|a(?:tlantic|ct(?:(?:i(?:on(?:(?:al|s))?|ng)|ed|or))?)|hipment|duc(?:tion|ers?)|e(?:ction|pts?)|o(?:nic|m))|quil(?:l(?:i(?:se(?:(?:rs?|d))?|ty)|y))?|c(?:hes?|es?)|ny)|d(?:(?:i(?:tion(?:(?:al(?:(?:is(?:ts?|m)|ly))?|s))?|ngs?)|e(?:(?:s(?:(?:people|m(?:en|an)))?|mark(?:(?:ed|s))?|able|ins?|rs?|d))?|uce[rd]))?|m(?:(?:p(?:(?:olin(?:i(?:st|ng)|es?)|l(?:ing|e(?:[sd])?)|ing|ed|s))?|lines|ways?|cars?|mel|s))?|jector(?:ies|y)|i(?:t(?:(?:or(?:(?:ous(?:ly)?|s))?|s))?|n(?:(?:load|ings?|e(?:rs?|es?|d)|s))?|l(?:(?:ing|e(?:rs?|d)|s))?)|c(?:t(?:(?:ab(?:ility|le)|ors?|ion|s))?|he(?:o(?:stomy|tomy)|al?)|e(?:(?:ab(?:ility|le)|less|r(?:[ys])?|s|d))?|k(?:(?:s(?:uits?)?|ways?|less|ing|e(?:rs?|d)|bed))?|ings?)|v(?:e(?:l(?:(?:ogues?|l(?:e(?:rs?|d)|ing)|s))?|rs(?:als?|ing|e(?:[sd])?)|st(?:ies|y))|ails?)|uma(?:(?:t(?:i(?:sed?|c)|a)|s))?|ffic(?:k(?:ing|e(?:rs?|d)))?|g(?:ed(?:i(?:ans?|es)|y)|ic(?:al(?:ly)?)?)|p(?:(?:p(?:ings?|able|e(?:rs?|d))|doors?|eze|s))?|wl(?:(?:net|ing|e(?:rs?|d)|s))?|sh(?:(?:ed|y))?|ys?)|u(?:s(?:t(?:(?:worth(?:iness|y)|ful(?:(?:ness|ly))?|e(?:e(?:s(?:hip)?)?|d)|i(?:ng(?:ly)?|es)|y|s))?|s(?:(?:ing|e[sd]))?)|th(?:(?:ful(?:(?:ness|ly))?|s))?|n(?:c(?:at(?:i(?:ons?|ng)|e(?:[sd])?)|heons?)|nions?|dl(?:ing|e(?:[sd])?)|k(?:(?:ing|s))?)|c(?:ulen(?:t(?:ly)?|ce)|ks?|es?)|mp(?:(?:e(?:t(?:(?:e(?:rs?|d)|ing|s))?|ry|d)|s))?|an(?:t(?:(?:ing|s))?|cy)|ffles?|e(?:(?:blue|st|r))?|dg(?:ing|e(?:[sd])?)|isms?|ly)|o(?:u(?:b(?:l(?:e(?:(?:s(?:(?:ome(?:ness)?|hoot(?:ing|ers?)))?|makers?|d))?|ing)|adours?)|nc(?:ing|e(?:[sd])?)|sers?|pe(?:(?:rs?|s))?|ghs?|ts?)|p(?:o(?:spher(?:ic|e)|pause)|ic(?:(?:al(?:ly)?|s))?|h(?:ies|y)|es?)|mbon(?:ists?|es?)|glodytes?|op(?:(?:s(?:hip)?|ing|e(?:rs?|d)))?|t(?:(?:t(?:ing|e(?:rs?|d))|s))?|ll(?:(?:i(?:sh|ng)|eys?|s))?|wels?|ikas?|d(?:den)?|ve|y)|i(?:via(?:l(?:(?:i(?:s(?:ations?|ing|e(?:[sd])?)|t(?:ies|y))|ly))?)?|g(?:onometr(?:ic(?:al)?|y)|lyceride|ger(?:(?:happy|ing|ed|s))?|rams?|s)|a(?:ng(?:ula(?:t(?:i(?:ons?|ng)|ed?)|r)|les?)|t(?:omic|hlon)|d(?:(?:ic|s))?|ls?|ge)|b(?:u(?:lations?|t(?:ar(?:ies|y)|es?)|n(?:als?|es?))|e(?:s(?:(?:people|m(?:en|an)))?)?|al(?:(?:ism|ly))?)|um(?:ph(?:(?:a(?:nt(?:ly)?|l(?:is[tm])?)|ing|ed|s))?|virate)|p(?:(?:l(?:i(?:cat(?:ion|e)|ng)|e(?:(?:ts?|x|s|d))?|ane|y)|artite|wires?|tych|p(?:ing|e(?:rs|d))|o(?:li|ds?)|e|s))?|c(?:k(?:(?:s(?:ters?)?|l(?:ing|e(?:[sd])?)|i(?:e(?:st|r)|ng|ly)|e(?:ry|d)|y))?|olours?|ycles?|e)|l(?:ateral|ingual|o(?:bites?|g(?:ies|y))|l(?:(?:i(?:ons?|ng)|ed|s))?|by)|s(?:ect(?:i(?:ng|on)|or)|tan)|t(?:e(?:ness)?|ium)|m(?:(?:m(?:ings?|e(?:rs?|d))|odal|aran|s))?|e(?:nnial|d|r|s)|n(?:kets?|i(?:dad|ty))|f(?:l(?:ing|e(?:[srd])?)|fids?)|dents?|reme|kes|o)|e(?:m(?:ulous(?:(?:ness|ly))?|endous(?:ly)?|bl(?:ing(?:(?:ly|s))?|e(?:[srd])?)|o(?:rs?|lo))|a(?:s(?:ur(?:e(?:(?:r(?:s(?:hip)?)?|s|d))?|i(?:es|ng)|y)|on(?:(?:able|ous|s))?)|c(?:her(?:ous(?:ly)?|y)|le)|d(?:(?:mills?|ing|le|er|s))?|t(?:(?:ments?|i(?:ses?|ng|es)|able|ed|y|s))?)|p(?:idations?|anned)|s(?:pass(?:(?:ing|e(?:rs?|d|s)))?|tles?|s(?:es)?)|n(?:ch(?:(?:ant(?:ly)?|ing|e[srd]))?|d(?:(?:i(?:ness|e(?:st|r))|y|s))?)|llis(?:e[sd])?|k(?:(?:k(?:ing|e(?:rs?|d))|s))?|foils?|e(?:(?:tops?|less|s))?|bl(?:ing|e(?:[sd])?)|ws)|y(?:ing)?)|h(?:e(?:(?:r(?:m(?:o(?:dynamic(?:(?:al(?:ly)?|s))?|stat(?:(?:ic(?:ally)?|s))?|electric|chemical|plastic|meters?)|al(?:(?:ly|s))?|s)|ap(?:eutic(?:ally)?|i(?:sts?|es)|y)|e(?:(?:a(?:bouts|fter)|u(?:nder|pon)|with|f(?:rom|ore?)|to|o[nf]|in|by))?)|o(?:r(?:e(?:tic(?:(?:ians?|al(?:ly)?))?|ms?)|i(?:s(?:ation|ing|ts?|e(?:[sd])?)|es)|y)|log(?:i(?:cal(?:ly)?|sts|ans?|es)|y)|dolites?|crac(?:ies|y)|sophy)|n(?:ce(?:for(?:ward|th))?)?|atr(?:ical(?:(?:ity|ly|s))?|es?)|m(?:(?:a(?:tic(?:ally)?|s)|selves|e(?:[sd])?))?|s(?:pians?|aur(?:us|i)|is|e)|i(?:s(?:t(?:(?:ic|s))?|m)|rs?)|fts?|bes|ta|e|y))?|r(?:e(?:e(?:(?:dimensional|quarters|s(?:omes?)?|fold))?|a(?:t(?:(?:en(?:(?:ing(?:ly)?|ed|s))?|s))?|d(?:(?:bare|ing|ed|s))?)|sh(?:(?:olds?|ing|e(?:rs?|d)))?|w)|o(?:roughly|at(?:(?:i(?:e(?:st|r)|ly)|y|s))?|mb(?:os(?:es|is)|us)|ttl(?:ing|e(?:[sd])?)|ugh(?:(?:out|put))?|w(?:(?:back|away|ing|ers?|s|n))?|n(?:g(?:(?:ing|ed|s))?|e(?:[sd])?)|b(?:(?:b(?:ing|ed)|s))?)|i(?:ll(?:(?:ing(?:ly)?|e(?:rs?|d)|s))?|ft(?:(?:ie(?:st|r)|less|y|s))?|v(?:ing|e(?:[sd])?)|ce)|a(?:sh(?:(?:ings?|e[srd]))?|ll)|u(?:s(?:t(?:(?:ing|ers?|s))?|h(?:es)?)|m))|o(?:u(?:(?:gh(?:t(?:(?:provoking|less(?:(?:ness|ly))?|ful(?:(?:ness|ly))?|s))?)?|sand(?:(?:fold|ths?|s))?))?|r(?:(?:ough(?:(?:going|fares?|breds?|ness|ly))?|n(?:(?:ie(?:st|r)|y|s))?|a(?:cic|x)|ium))?|ngs?|mas|se)|u(?:nder(?:(?:flashes|s(?:t(?:ruck|orms?))?|ous(?:ly)?|cl(?:oud|aps?)|bolts?|ing|ed|y))?|m(?:b(?:(?:s(?:crews?)?|print|nail|ing|ed))?|p(?:(?:ing|ed|s))?)|rsday|g(?:(?:g(?:ish|ery)|s))?|d(?:(?:d(?:ing|ed)|s))?|s)|i(?:e(?:v(?:i(?:sh(?:ness)?|ng)|e(?:(?:ry|s|d))?)|f)|ck(?:(?:s(?:kinned|et)|ness(?:es)?|e(?:n(?:(?:ing|ed|s))?|ts?|st|r)|ish|ly))?|mble(?:(?:fuls?|s))?|r(?:st(?:(?:i(?:e(?:st|r)|ng|ly)|ed|y|s))?|t(?:een(?:th)?|ie(?:th|s)|y)|d(?:(?:ly|s))?)|n(?:(?:k(?:(?:tank|able|ing|ers?|s))?|n(?:i(?:sh|ng)|e(?:s[ts]|rs?|d))|ly|gs?|e|s))?|s(?:tles?)?|ther|ghs?)|a(?:n(?:(?:k(?:(?:s(?:giving)?|ful(?:(?:ness|ly))?|less(?:ly)?|ing|ed))?|e))?|umaturge|l(?:idomide|lium|amus)|t(?:ch(?:(?:ing|e(?:rs?|d)))?)?|w(?:(?:ing|ed|s))?|mes|i)|y(?:(?:r(?:istors?|oids?)|self|m(?:us|e)))?|wa(?:rt(?:(?:ing|ed|s))?|ck))|y(?:p(?:o(?:graph(?:ic(?:al(?:ly)?)?|ers?|y)|log(?:i(?:cal(?:ly)?|es)|y))|e(?:(?:writ(?:ten|ing|ers?)|s(?:(?:et(?:(?:t(?:ing|ers?)|s))?|cripts?))?|cast(?:ing)?|faces?|less|d))?|i(?:cal(?:(?:ity|ly))?|f(?:y(?:ing)?|ie[sd])|sts?|ngs?)|h(?:o(?:ons?|id)|us))|r(?:an(?:n(?:i(?:c(?:(?:al(?:ly)?|ide))?|sed?|es)|ous|y)|ts?)|es?)|coons?|ing|kes?)|o(?:t(?:(?:al(?:(?:i(?:t(?:arian(?:ism)?|y)|sing)|l(?:ing|ed|y)|s))?|t(?:e(?:r(?:(?:ing|ed|s))?|d)|ing)|em(?:(?:ic|s))?|s))?|p(?:(?:o(?:graph(?:ic(?:al(?:ly)?)?|y)|log(?:i(?:cal(?:ly)?|sts?|es)|y))|i(?:c(?:(?:al(?:(?:ity|ly))?|s))?|ary)|s(?:(?:yturvy|pin|oil))?|p(?:l(?:ing|e(?:[sd])?)|ings?|e[rd])|notch|le(?:vel|ss)|heavy|most|coat|az(?:es)?))?|n(?:(?:g(?:ue(?:(?:t(?:wisters?|ied)|incheek|s))?|a|s)|s(?:(?:il(?:(?:l(?:ectomy|itis)|s))?|ure))?|al(?:(?:it(?:ies|y)|ly))?|e(?:(?:less(?:ly)?|d(?:eaf)?|rs?|s))?|n(?:ages?|es?)|i(?:ght|ng|cs?)|y))?|x(?:i(?:c(?:(?:olog(?:ical|y)|ity))?|ns?)|aemia)|r(?:t(?:oise(?:s(?:hell)?)?|u(?:ous(?:ly)?|r(?:ous|ing|e(?:(?:rs?|s|d))?))|s)|ch(?:(?:bearers?|li(?:ght|t)|e[sd]))?|ment(?:(?:ing|ors?|ed|s))?|r(?:ent(?:(?:ial|s))?|id)|s(?:ion(?:(?:al|s))?|o)|p(?:edo(?:ed)?|or|id)|ques?|onto|n(?:ado)?|i(?:es)?|ah|us|y|e)|o(?:(?:t(?:(?:h(?:(?:brush(?:es)?|marks|p(?:aste|icks?)|some|less|ie(?:st|r)|ache|ed|y))?|ing|le|ed))?|l(?:(?:mak(?:ing|er)|box(?:es)?|ing|ed|s))?|k))?|g(?:(?:ether(?:ness)?|gl(?:ing|e(?:[sd])?)|as?|s|o))?|b(?:a(?:cco(?:nists?)?|go)|oggan(?:ing)?|y)|w(?:(?:n(?:s(?:(?:people|capes?|hips?|folk|m(?:en|an)))?)?|e(?:l(?:(?:l(?:ing|ed)|s))?|r(?:(?:ing|ed|s))?|d)|paths?|ards?|ing|s))?|u(?:r(?:(?:n(?:aments?|iquet|ey)|i(?:s(?:t(?:(?:ic|y|s))?|m)|ng)|e(?:rs?|d)|s))?|c(?:h(?:(?:andgo|downs?|i(?:n(?:ess|g(?:ly)?)|e(?:st|r))|e(?:[srd])?|y))?|ans)|gh(?:(?:ness|e(?:n(?:(?:ed|s))?|st|r)|ies?|ly|s))?|t(?:(?:ing|ed|s))?|sle[sd]|pee)|a(?:d(?:(?:s(?:tools?)?|ies|y))?|st(?:(?:ing|e(?:rs?|d)|y|s))?)|i(?:l(?:(?:e(?:t(?:(?:r(?:ies|y)|ing|te|s))?|r|d)|ing|s))?|toi)|k(?:en(?:(?:is(?:tic|m)|s))?|amak|yo)|l(?:e(?:ra(?:n(?:ces?|t(?:ly)?)|t(?:i(?:ng|on)|e(?:[sd])?)|bl[ye])|do)|l(?:(?:gate|ing|ed|s))?|booth|uene|d)|m(?:b(?:(?:s(?:tones?)?|o(?:ys?|la)))?|foolery|o(?:graphy|rrows?)|a(?:hawks?|to)|tom|cat|es?)|y(?:(?:maker|s(?:hop)?|ing|ed))?|e(?:(?:nails?|less|hold|ing|s|d))?|d(?:d(?:l(?:ing|e(?:(?:rs?|d))?)|y)|ies|ay)|ss(?:(?:ups?|ing|e(?:rs|s|d)))?|f(?:f(?:ees?|y)|u)|c(?:cata|sin))|a(?:b(?:(?:l(?:e(?:(?:s(?:poon(?:(?:fuls|s))?)?|cloths?|ware|land|bay|aux?|ts?|d))?|oids?|ing)|ula(?:t(?:i(?:ons?|ng)|or|e(?:[sd])?)|r)|ernacles?|asco|b(?:ing|ed|y)|oos?|s))?|u(?:(?:t(?:(?:olog(?:i(?:cal(?:ly)?|es)|ous|y)|ness|e(?:st|r)|ly))?|nt(?:(?:ing(?:ly)?|e[rd]|s))?|ght))?|x(?:(?:deductible|i(?:(?:derm(?:ists?|y)|ing|cab|ng|e[sd]|s))?|onom(?:i(?:sts?|c(?:al)?|es)|y)|pay(?:ing|ers?)|a(?:tion|ble)|free|man|e[ds]))?|s(?:t(?:e(?:(?:less(?:(?:ness|ly))?|ful(?:(?:ness|ly))?|rs?|s|d))?|i(?:ngs?|e(?:st|r))|y)|k(?:(?:master|ing|ed|s))?|sel(?:(?:led|s))?|mania)|p(?:(?:e(?:(?:r(?:(?:e(?:cord(?:ing|ed)|d|r)|ing|s))?|s(?:tr(?:ies|y))?|worms?|d))?|danc(?:ing|e)|p(?:ings?|e(?:rs|d))|i(?:oca|ng|r)|room|as|s))?|n(?:(?:t(?:a(?:l(?:is(?:ing(?:ly)?|ed?)|um)|mount)|rums?)|g(?:(?:e(?:nt(?:(?:ial(?:ly)?|s))?|rines?|lo)|l(?:ing|e(?:[ds])?)|ibl[ye]|y|o))?|n(?:e(?:r(?:(?:ies|s|y))?|d)|i(?:n(?:[gs])?|c)|oy)|zania|k(?:(?:a(?:rds?|ge)|e(?:rs?|d)|ful|ing|s))?|dems?|s))?|l(?:k(?:(?:ative(?:ness)?|i(?:ngs?|es?)|back|e(?:rs?|d)|s))?|e(?:(?:nt(?:(?:less|ed|s))?|s))?|ismans?|l(?:(?:y(?:(?:ing|ho))?|ness|boy|e(?:st|r)|i(?:e[ds]|sh)|ow))?|c(?:um)?|mud|ons?)|r(?:(?:a(?:masalata|ntulas?)|mac(?:adam)?|n(?:(?:ish(?:(?:ing|ed))?|s))?|paulins?|get(?:(?:ing|ed|s))?|d(?:i(?:ness|ly)|y)|t(?:(?:rate|ness|a(?:r(?:ic)?|ns?)|ly|s|y))?|r(?:y(?:ing)?|i(?:e(?:st|r|d)|ng)|agon|ed)|iffs?|zan|s(?:(?:us|al))?|es|ot))?|i(?:l(?:(?:less(?:ness)?|or(?:(?:able|made|ing|ed|s))?|p(?:lane|iece)|wind|s(?:pin)?|ing|ed))?|nt(?:(?:ing|ed|s))?|pei|wan)|c(?:t(?:(?:less(?:(?:ness|ly))?|i(?:c(?:(?:al(?:ly)?|ian|s))?|le)|ful(?:ly)?|ual))?|h(?:y(?:cardia|ons?)|ographs?)|k(?:(?:i(?:n(?:ess|g)|e(?:st|r))|l(?:ing|e(?:[drs])?)|ed|y|s))?|it(?:(?:urn|ly))?)|m(?:bourines?|p(?:e(?:r(?:(?:ing|ed|s))?|d))?|e(?:(?:ness|ly|rs?|st?|d))?|ing)|t(?:t(?:oo(?:(?:ing|ed|s))?|er(?:ed|s)|le|y))?|k(?:e(?:(?:overs?|a(?:ways?|ble)|rs?|s|n))?|ings?)|vern(?:(?:as?|s))?|dpoles?|ffeta|g(?:(?:g(?:ing|ed)|s))?|ylor|w(?:dry|ny)|h(?:iti|r)|al)|w(?:o(?:(?:dimensional|f(?:aced|old)|some))?|i(?:t(?:(?:ter(?:(?:ing|ed))?|ch(?:(?:ing|e[sd]|y))?))?|n(?:(?:kl(?:ing|e(?:[sd])?)|n(?:ing|ed)|ing|ges?|e(?:[sd])?|s))?|ddl(?:ing|e(?:[srd])?|y)|st(?:(?:ing|e(?:rs?|d)|y|s))?|rl(?:(?:ing|ed|s))?|l(?:i(?:ght|t)|l)|g(?:(?:g(?:ed|y)|s))?|ce)|e(?:nt(?:ie(?:th|s)|y)|l(?:fths?|ves?)|e(?:(?:zers|t(?:(?:ers?|s))?|ness|d(?:[ys])?))?|ak(?:(?:ing|ed|s))?)|a(?:ng(?:(?:ing|ed|s))?|in))|i(?:m(?:e(?:(?:consuming|l(?:ess(?:ness)?|iness|apse|y)|honoured|tabl(?:ing|e(?:[ds])?)|keep(?:ing|ers?)|s(?:(?:cales?|hare))?|piece|frame|base|out|rs?|d))?|i(?:d(?:(?:ity|ly))?|ngs?)|b(?:er(?:ed)?|re))|g(?:ht(?:(?:l(?:ipped|y)|fisted|e(?:n(?:(?:ing|ed|s))?|st|r)|rope|ness|wad|s))?|er(?:(?:ish|s))?|r(?:ess|is))|d(?:dl(?:ywinks|ers)|i(?:n(?:ess|gs?)|e(?:st?|r|d)|ly)|e(?:(?:less|way|s))?|y(?:ing)?|bits?|al)|t(?:(?:illat(?:i(?:on|ng)|ed?)|an(?:(?:i(?:c(?:ally)?|um)|s))?|ter(?:(?:ing|ed|s))?|r(?:at(?:ion|ed)|es?)|fortat|ular|l(?:ing|e(?:[sd])?)|h(?:ing|es?)|bits?|s))?|r(?:e(?:(?:less(?:ly)?|s(?:ome(?:ly)?)?|d(?:(?:ness|ly))?))?|ades?|ing|o)|n(?:(?:opener|k(?:er(?:(?:ing|ed|s))?|l(?:ing|ed?|y))|g(?:l(?:i(?:e(?:st|r)|ng)|e(?:[sd])?|y)|e(?:[sd])?)|der(?:box)?|c(?:tured?|an)|t(?:(?:ings?|ed|s))?|n(?:i(?:tus|e(?:st|r)|ly)|e[rd]|y)|ware|s(?:els?)?|ie(?:st|r)|foil|pot|y))?|p(?:(?:to(?:e(?:(?:ing|s|d))?|p)|s(?:(?:ters?|y))?|p(?:l(?:ing|e)|ing|e[rd])|offs?))?|e(?:(?:break|r(?:(?:ed|s))?|s|d))?|c(?:(?:k(?:(?:l(?:i(?:sh|ng)|e(?:[srd])?)|e(?:t(?:(?:ed|s))?|rs?|d)|ing|s))?|s))?|ssues?|l(?:t(?:(?:ing|ed|s))?|l(?:(?:ing|e(?:rs?|d)|age|s))?|ings?|des?|e(?:[drs])?)|biae?|aras?|kka)|u(?:r(?:b(?:o(?:(?:charge[rd]|prop|t))?|ulen(?:ce|t)|i(?:d(?:ity)?|nes?)|ans?)|n(?:(?:a(?:round|bout)|s(?:tiles?)?|tables?|round|o(?:vers?|uts?)|coats?|pike|i(?:ngs?|ps?)|key|e(?:rs?|d)))?|p(?:entine|itude)|tle(?:(?:neck|s))?|quoise|gid(?:(?:ity|ly))?|ret(?:(?:ed|s))?|m(?:oils?|eric)|k(?:(?:ish|eys?|s))?|eens?|f(?:(?:ed|s|y))?|in)|m(?:ul(?:t(?:(?:uous(?:ly)?|s))?|us)|b(?:l(?:e(?:(?:d(?:own)?|rs?|s))?|ing)|rils)|escent|ours?|m(?:ies|y))|b(?:(?:e(?:(?:r(?:(?:cul(?:osis|ar)|s))?|less|d|s))?|ul(?:es|ar)|ing|as?|by|s))?|n(?:(?:e(?:(?:less(?:ly)?|ful(?:ly)?|rs?|d|s))?|n(?:el(?:(?:l(?:e(?:rs|d)|ing)|s))?|y)|i(?:sian?|ngs?|cs?)|gsten|dras?|a(?:(?:ble|s))?|s))?|t(?:or(?:(?:i(?:als?|ng)|ed|s))?|ela(?:ry|ge)|u)|ppences?|s(?:s(?:ock(?:[ys])?|l(?:ing|es?))|cany|k(?:(?:e[rd]|s))?)|es(?:days?)?|ition|g(?:(?:g(?:ing|ed)|ela|s))?|ft(?:(?:ing|ed|s))?|ck(?:(?:ing|e(?:rs?|d)|s))?|a(?:tara|regs?)|xedo|lips?)|s(?:wanas?|unami|hirt|etse))|r(?:e(?:p(?:(?:r(?:e(?:s(?:ent(?:(?:a(?:ti(?:ve(?:(?:ness|s))?|on(?:(?:al|s))?)|ble)|ing|ed|s))?|s(?:(?:i(?:ve(?:ly)?|ons?|ng)|e[sd]))?)|hen(?:sible|d))|o(?:duc(?:i(?:b(?:ility|l[ye])|ng)|ti(?:ve(?:ly)?|ons?)|e(?:[ds])?)|ach(?:(?:ful(?:(?:ness|ly))?|ing|e[ds]))?|gram(?:m(?:able|ing|ed?))?|cess(?:(?:ing|ed))?|v(?:ingly|ed?)|jected|bates?|ofs?)|i(?:mand(?:(?:ing|ed|s))?|nt(?:(?:ing|ed|s))?|s(?:als?|e)|eved?))|e(?:titi(?:ve(?:(?:ness|ly))?|o(?:us|ns?))|r(?:cussions?|to(?:ires?|ry))|a(?:t(?:(?:ab(?:ility|l[ey])|e(?:d(?:ly)?|rs?)|ing|s))?|l(?:(?:ing|ed|s))?)|nt(?:(?:an(?:t(?:ly)?|ce)|ing|ed|s))?|l(?:(?:l(?:ing(?:ly)?|e(?:nt|d))|s))?)|a(?:r(?:t(?:ition(?:(?:ing|ed))?|ee)|ations?)|triat(?:i(?:ons?|ng)|ed?)|ck(?:(?:aged?|ing|ed))?|i(?:nt(?:(?:ing|ed))?|r(?:(?:able|man|ing|e(?:rs?|d)|s))?|d)|y(?:(?:ments?|able|ing|s))?|per|sts?)|u(?:ls(?:i(?:ve(?:(?:ness|ly))?|ons?|ng)|ed?)|bli(?:c(?:(?:a(?:tion|n(?:(?:ism|s))?)|s))?|sh(?:(?:ing|e[sd]))?)|t(?:a(?:tions?|bl[ye])|e(?:(?:d(?:ly)?|s))?)|diat(?:i(?:on|ng)|e(?:[ds])?)|gnan(?:ce|t)|rchase)|o(?:s(?:sess(?:(?:i(?:ons?|ng)|ed))?|i(?:t(?:ion(?:(?:ing|ed|s))?|or(?:ies|y))|ng)|e(?:[ds])?)|pulated?|rt(?:(?:a(?:ble|ge)|e(?:d(?:ly)?|rs?)|ing|s))?)|l(?:e(?:nish(?:(?:ment|ing|ed))?|te)|i(?:ca(?:(?:t(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|ble|s))?|e(?:rs?|d|s))|a(?:c(?:e(?:(?:ments?|able|s|d))?|ing)|n(?:ning|t(?:(?:ing|ed))?)|y(?:(?:ing|ed|s))?)|ug(?:g(?:ing|ed))?|otted|y(?:ing)?)|hras(?:ing|e(?:[sd])?)|til(?:ians?|es?)|in(?:ing|ed?)|s))?|c(?:r(?:ystallisation|iminat(?:ions?|e)|eat(?:i(?:on(?:(?:al|s))?|ng)|e(?:[sd])?)|uit(?:(?:ment|ing|e(?:rs?|d)|s))?)|a(?:p(?:(?:it(?:alisation|ulat(?:ion|es?))|tur(?:ing|ed?)|ped|s))?|l(?:c(?:itran(?:ce|t)|ulat(?:ion|ed?))|ibrat(?:i(?:ng|on)|e)|l(?:(?:ing|ed|s))?)|nt(?:(?:ation|ing|ed|s))?|st(?:(?:ing|s))?)|l(?:a(?:ssif(?:i(?:cation|e[ds])|y(?:ing)?)|mations?|im(?:(?:able|ing|e[rd]|s))?)|us(?:ive|es?)|in(?:ing|e(?:[srd])?)|othe)|o(?:n(?:figur(?:a(?:tions?|ble)|ing|e(?:[ds])?)|cil(?:i(?:ations?|ng)|e(?:(?:ment|s|d))?|able)|s(?:ider(?:(?:ation|ing|ed|s))?|t(?:ruct(?:(?:i(?:ons?|ng)|ed|s))?|itut(?:i(?:ng|on)|e(?:[ds])?))|ult(?:(?:ing|ed))?)|dit(?:ion(?:ing|ed)|e)|n(?:aissance|oitr(?:ing|ed?)|ect(?:(?:i(?:ng|on)|ed))?)|tribute|ve(?:r(?:sion|t(?:ed)?)|n(?:ing|ed?))|que(?:st|r))|m(?:m(?:en(?:d(?:(?:a(?:tions?|ble)|ing|ed|s))?|c(?:e(?:(?:ment|d|s))?|ing))|issioning)|p(?:il(?:ations?|ing|ed?)|ut(?:able|ing|e(?:[sd])?)|ense(?:[ds])?)|bin(?:a(?:tion|nts?)|ing|e(?:[sd])?))|rd(?:(?:breaking|i(?:sts?|ngs?)|able|e(?:rs?|d)|s))?|ver(?:(?:ab(?:ility|le)|i(?:ng|es)|ed|y|s))?|gni(?:s(?:a(?:nces|bl[ey])|e(?:(?:rs?|s|d))?|ing)|tions?)|llect(?:(?:i(?:ons?|ng)|ed|s))?|u(?:nt(?:(?:ing|ed|s))?|p(?:(?:ing|le|ed|s))?|rse)|il(?:(?:ing|ed|s))?|p(?:ied|y)|d(?:ing|e(?:[ds])?))|e(?:pt(?:i(?:on(?:(?:ists?|s))?|v(?:e(?:ness)?|ity))|acles?|ors?)|i(?:v(?:e(?:(?:r(?:s(?:hip)?)?|s|d))?|able|ing)|pt(?:(?:ed|s))?)|ss(?:(?:i(?:on(?:(?:a(?:ry|l)|s))?|ve)|e[sd]))?|n(?:sion|t(?:ly)?|cy)|d(?:ing|e(?:[ds])?))|i(?:p(?:roc(?:a(?:t(?:i(?:ng|on)|ed?)|l(?:(?:ly|s))?)|ity)|ients?|es?)|rculat(?:i(?:ng|on)|ed?)|divis(?:ts?|m)|t(?:a(?:ti(?:ons?|ves?)|ls?)|ing|e(?:[ds])?))|t(?:i(?:f(?:i(?:cation|able|e[srd])|y(?:ing)?)|linear|tude)|a(?:ng(?:ular|les?)|l)|o(?:r(?:[sy])?)?|rix|ums?)|h(?:arg(?:e(?:(?:able|s|r|d))?|ing)|eck(?:(?:ing|ed))?)|k(?:less(?:(?:ness|ly))?|on(?:(?:ing|e[rd]|s))?)|u(?:perat(?:i(?:ng|on|ve)|e(?:[ds])?)|r(?:(?:r(?:e(?:n(?:ces?|t(?:ly)?)|d)|ing)|s(?:i(?:ve(?:ly)?|ons?))?|ing|e[ds]))?|mbent)|ycl(?:able|ing|e(?:(?:rs|s|d))?))|l(?:a(?:t(?:i(?:v(?:i(?:s(?:t(?:(?:ic(?:ally)?|s))?|m)|ty)|e(?:(?:ly|s))?)|on(?:(?:s(?:hips?)?|al(?:ly)?))?|ng)|e(?:(?:d(?:ness)?|s))?|or)|bel(?:l(?:ings?|ed))?|unch(?:(?:ing|ed))?|x(?:(?:a(?:tions?|nts?)|ing(?:ly)?|e[ds]))?|ps(?:ing|e(?:[sd])?)|y(?:(?:ing|ed|s))?|id)|e(?:nt(?:(?:less(?:(?:ness|ly))?|ing|ed|s))?|gat(?:i(?:ng|on)|e(?:[sd])?)|a(?:rn(?:ing)?|s(?:able|ing|e(?:[sd])?))|van(?:t(?:ly)?|c[ye]))|i(?:n(?:quish(?:(?:ing|e[sd]))?|k(?:(?:ing|ed))?|ed)|g(?:io(?:us(?:(?:ness|ly))?|sity|ns?)|ht(?:ing)?)|a(?:b(?:ilit(?:ies|y)|l[ye])|n(?:ce|t))|quar(?:ies|y)|sh(?:(?:ing|e[sd]))?|e(?:v(?:ing|e(?:[sd])?)|fs?|d|s)|v(?:ing|e(?:[ds])?)|c(?:(?:ts?|s))?|t)|uctan(?:t(?:ly)?|ce)|o(?:c(?:at(?:i(?:ons?|ng)|able|e(?:[sd])?)|ked)|ad(?:(?:ing|ed|s))?)|y(?:ing)?)|s(?:p(?:on(?:s(?:i(?:b(?:ilit(?:ies|y)|l[ye])|ve(?:(?:ness|ly))?)|es?)|d(?:(?:e(?:nts?|rs?|d)|ing|s))?)|ec(?:t(?:(?:ab(?:ility|l[ye])|i(?:ve(?:ly)?|ng)|ful(?:ly)?|ed|s))?|if(?:ied|y))|lendent|i(?:r(?:at(?:or(?:[ys])?|ion)|ed?)|te)|ray(?:(?:ed|s))?)|o(?:u(?:rc(?:e(?:(?:ful(?:ness)?|s|d))?|ing)|nd(?:(?:ing(?:ly)?|ed|s))?)|l(?:v(?:ab(?:ility|le)|ing|e(?:(?:rs?|nt|s|d))?)|ut(?:ions?|e(?:ly)?)|d)|na(?:n(?:ces?|t(?:ly)?)|t(?:ing|ors?|e(?:[sd])?))|rt(?:(?:ing|ed|s))?)|u(?:scitat(?:i(?:on|ng)|ed?)|b(?:mi(?:ssions?|t(?:(?:t(?:ing|ed)|s))?)|stitute)|r(?:rect(?:(?:i(?:on|ng)|ed|s))?|fac(?:ing|ed?)|gen(?:ce|t))|m(?:ption|ing|e(?:[ds])?)|lt(?:(?:ing|ant|ed|s))?|pply)|t(?:(?:r(?:uctur(?:ing|e(?:[sd])?)|ict(?:(?:i(?:ve(?:ly)?|ons?|ng)|ed|s))?|ain(?:(?:ing|ed|ts?|s))?|oom)|a(?:ura(?:teurs?|nts?)|t(?:e(?:(?:ment|s|d))?|ing)|rt(?:(?:able|ing|ed|s))?)|o(?:r(?:ati(?:ons?|ve)|ing|e(?:(?:rs?|s|d))?)|ck(?:ing)?)|less(?:(?:ness|ly))?|i(?:ve(?:ness)?|tution|ng)|ful(?:ness)?|yled|ed|s))?|i(?:gn(?:(?:a(?:tions?|l)|ed(?:ly)?|ing|s))?|st(?:(?:i(?:v(?:ity|e(?:ly)?)|ble|ng)|an(?:ces?|t)|ors?|ed|s))?|d(?:e(?:(?:n(?:t(?:(?:ial|s))?|c(?:es?|y))|d|s))?|u(?:a(?:ry|ls?)|um|es?)|ing)|lien(?:ce|t)|z(?:ing|e)|t(?:(?:ing|s))?|n(?:(?:ous|s|y))?)|h(?:a(?:rpen(?:(?:ing|ed))?|p(?:ing|e(?:[sd])?))|uffl(?:ing|e(?:[ds])?)|ow(?:ing)?)|e(?:t(?:(?:t(?:l(?:e(?:(?:ment|d))?|ing)|able|ing)|s))?|rv(?:ations?|i(?:sts|ng)|oirs?|e(?:[srd])?)|mbl(?:ances?|ing|e(?:[sd])?)|n(?:t(?:(?:ments?|ful(?:ly)?|ing|ed|s))?|d(?:ing)?)|l(?:ect(?:(?:ion|ed))?|l(?:(?:ing|ers?))?)|a(?:(?:rch(?:(?:ing|e(?:rs?|d|s)))?|ted|led))?|eding)|c(?:hedul(?:ing|ed?)|a(?:n(?:(?:n(?:ing|ed)|s))?|l(?:ing|e(?:[sd])?))|ind(?:(?:ing|ed))?|u(?:ing|e(?:(?:rs?|d|s))?))|ale)|i(?:m(?:p(?:lement(?:ation|ing|ed)|o(?:rting|sed?))|burs(?:e(?:(?:ment|s|d))?|ing))|n(?:(?:i(?:tialis(?:ation|ing|ed?)|ng)|t(?:e(?:rpret(?:(?:ation|ing|ed))?|gration)|roduc(?:tions?|ing|e(?:[ds])?))|v(?:e(?:st(?:(?:igation|ment|ed))?|nt(?:(?:i(?:ons?|ng)|ed|s))?)|igorated?)|carnat(?:i(?:ons?|ng)|ed?)|f(?:orc(?:e(?:(?:ments?|s|d))?|ing)|ection)|s(?:(?:ta(?:t(?:e(?:(?:ment|s|d))?|ing)|ll(?:(?:ing|ed))?)|urance|ert(?:ed)?))?|deer|ed))?|f(?:ication|y)|terat(?:i(?:ng|on)|e(?:[sd])?)|ssu(?:ing|e(?:[sd])?)|gn(?:(?:ing|ed|s))?|ch)|a(?:ff(?:orestation|irm(?:(?:ation|ing|ed|s))?)|r(?:(?:rang(?:e(?:(?:ments?|s|d))?|ing)|m(?:(?:ament|ing|ed|s))?|guard|ward|view|ing|e[dr]|s))?|s(?:on(?:(?:abl(?:e(?:ness)?|y)|less|ing|e(?:rs?|d)|s))?|s(?:e(?:ss(?:(?:ments?|ed))?|mbl(?:ing|ed?|y)|rt(?:(?:i(?:ng|on)|ed|s))?)|ign(?:(?:ment|ing|ed|s))?|u(?:r(?:ances?|ing(?:ly)?|e(?:[sd])?)|m(?:ing|e))))|c(?:qu(?:ainting|i(?:sition|red))|t(?:(?:i(?:on(?:(?:ar(?:ies|y)|s))?|v(?:at(?:i(?:ng|on)|e(?:[ds])?)|it(?:ies|y)|e)|ng)|ants?|ors?|ed|s))?|h(?:(?:i(?:eved|ng)|able|e[ds]))?|ce(?:ssed|pt))|d(?:(?:just(?:(?:ments?|ing|ed))?|a(?:b(?:ility|l[ye])|pt)|er(?:s(?:hips?)?)?|mi(?:ssion|t(?:(?:ted|s))?)|y(?:(?:made|ing))?|i(?:n(?:ess|gs?)|e(?:st?|d|r)|ly)|s))?|l(?:(?:i(?:s(?:t(?:(?:ic(?:ally)?|s))?|a(?:tions?|ble)|ing|e(?:[sd])?|m)|gn(?:(?:ments?|ing|ed|s))?|t(?:ies|y))|l(?:ocat(?:i(?:ng|on)|e(?:[ds])?)|ife|y)|politik|ness|ms?|ty|s))?|p(?:(?:p(?:oint(?:(?:ment|ed))?|ear(?:(?:ance|ing|ed|s))?|rais(?:ing|al|ed)|l(?:y(?:ing)?|ied))|e(?:rs?|d)|ing|s))?|bsor(?:ption|b(?:ed)?)|tt(?:achment|empt)|nimat(?:ing|ed)|waken(?:(?:ing|ed))?|gents?|ms?)|v(?:(?:o(?:l(?:ution(?:(?:is(?:ing|e(?:[sd])?)|ar(?:ies|y)|s))?|t(?:(?:ing(?:ly)?|ed|s))?|v(?:ing|e(?:(?:rs?|s|d))?))|ca(?:tions?|ble)|k(?:ing|e(?:(?:rs?|d|s))?))|i(?:talis(?:ation|ing|ed?)|s(?:i(?:on(?:(?:is(?:ts?|m)|ary|s))?|t(?:(?:ing|ed|s))?|ng)|a(?:ble|l)|e(?:[drs])?)|v(?:i(?:fy(?:ing)?|ng)|al(?:(?:is(?:ts?|m)|s))?|e(?:[drs])?)|ew(?:(?:able|ing|e(?:rs?|d)|s))?|l(?:ing|ed?))|e(?:r(?:bera(?:t(?:i(?:ons?|ng)|e(?:[sd])?)|nt)|s(?:i(?:b(?:ility|l[ey])|on|ng)|als?|e(?:[srd])?)|e(?:(?:n(?:t(?:(?:ial(?:ly)?|ly))?|ce|d)|d|s))?|t(?:(?:ing|ed|s))?|i(?:ng|es?))|l(?:(?:at(?:ions?|ory)|r(?:ies|y)|l(?:ing|e(?:rs?|d))|s))?|al(?:(?:ing(?:ly)?|able|ed|s))?|n(?:g(?:e(?:(?:ful|s|d))?|ing)|ues?|ant)|ille)|a(?:lu(?:ations?|e(?:[sd])?)|nchist|mp(?:(?:ing|ed|s))?)|u(?:lsion|es?)|v(?:ing|ed)|s))?|t(?:r(?:o(?:(?:spect(?:i(?:ve(?:(?:ly|s))?|on))?|gr(?:essive|ade)|active(?:ly)?|viruses|fit(?:t(?:ing|ed))?))?|a(?:nsmi(?:ssions?|t(?:(?:t(?:ing|ed)|s))?)|c(?:t(?:(?:i(?:ons?|ng)|able|ed|s))?|ing|e(?:[sd])?)|in(?:(?:ing|ed))?|l)|e(?:nch(?:ment)?|a(?:t(?:(?:ing|ed|s))?|ds?))|i(?:e(?:v(?:a(?:ble|ls?)|e(?:(?:rs?|s|d))?|ing)|d|s)|buti(?:ve|on)|al)|y(?:ing)?)|e(?:nti(?:v(?:e(?:ness)?|ity)|ons?)|st(?:(?:ing|ed|s))?|ll(?:ing)?)|i(?:c(?:ul(?:a(?:t(?:ion|ed)|r)|um|es?)|en(?:ce|t))|r(?:e(?:(?:ments?|d|e|s))?|ing)|tl(?:ing|ed?)|n(?:itis|ues?|a(?:[ls])?)|ed)|a(?:rd(?:(?:a(?:tion|nt)|ing|ed|s))?|liat(?:ory|i(?:on|ng)|e(?:[ds])?)|i(?:n(?:(?:ing|e(?:rs?|d)|s))?|l(?:(?:ing|e(?:rs?|d)|s))?)|k(?:ing|e(?:[ns])?))|h(?:ink(?:ing)?|ought)|o(?:uch(?:(?:ing|ed))?|rt(?:(?:ing|ed|s))?|ld|ok)|u(?:rn(?:(?:able|ing|e(?:es|d)|s))?|n(?:ing|e))|yp(?:ing|e(?:[ds])?)|ch(?:(?:ing|ed))?|sina|ted)|d(?:(?:i(?:s(?:tribut(?:able|i(?:ons?|ng|ve)|e(?:[ds])?)|c(?:over(?:(?:i(?:es|ng)|ed|s|y))?|ussed)|play(?:ed)?)|rect(?:(?:i(?:ng|on)|ed|s))?|al(?:ling)?)|e(?:c(?:laration|orat(?:i(?:ng|on)|ed))|fin(?:i(?:tions?|ng)|e(?:[srd])?)|velop(?:(?:ment|ing|ed))?|dication|p(?:loy(?:(?:ment|ing|ed))?|osit(?:ion|ed))|mpti(?:ons?|ve)|sign(?:(?:ing|ed|s))?|livery?|em(?:(?:able|ing|e[rd]|s))?)|u(?:c(?:ti(?:on(?:(?:is(?:ts?|m)|s))?|ve)|i(?:b(?:ility|le)|ng)|e(?:(?:rs?|d|s))?)|ndan(?:c(?:ies|y)|t(?:ly)?))|o(?:(?:u(?:b(?:t(?:(?:able|s))?|l(?:ing|ed?))|nd(?:ed)?)|lent|ing|ne|x))?|r(?:ess(?:(?:ing|ed))?|a(?:ft(?:(?:ing|ed))?|w(?:(?:ing|n|s))?))|b(?:looded|reast)|s(?:(?:tarts|hifts?|ea))?|h(?:ead(?:(?:ed|s))?|anded)|d(?:e(?:n(?:(?:ing|ed|s))?|st|r)|ish)|action|faced|c(?:ross|oats)|ne(?:ck|ss)|tape|wood))?|g(?:i(?:on(?:(?:al(?:(?:is(?:ation|m)|ly))?|s))?|me(?:(?:n(?:(?:t(?:(?:a(?:tion|l)|ed|s))?|s))?|s))?|st(?:r(?:a(?:tions?|ble|rs?)|ies|y)|er(?:(?:ing|ed|s))?)|cide|nas?)|u(?:la(?:r(?:(?:i(?:s(?:ation|ed?)|t(?:ies|y))|ly|s))?|t(?:i(?:ons?|ve|ng)|or(?:[ys])?|e(?:[sd])?))|rgitat(?:i(?:ng|on)|ed?))|e(?:n(?:erat(?:i(?:ons?|ng|ve)|e(?:[ds])?)|cy|ts?)|late)|r(?:e(?:ss(?:(?:i(?:ons?|ve|ng)|e[sd]))?|t(?:(?:ful(?:ly)?|t(?:abl[ey]|ing|ed)|s))?)|o(?:up(?:(?:ing|ed))?|w(?:th)?)|ading)|a(?:rd(?:(?:less|ing|ed|s))?|in(?:(?:ing|ed|s))?|ttas?|l(?:(?:i(?:ty|ng|a)|e(?:[ds])?|ly))?)|gae)|o(?:r(?:ganis(?:ations?|ing|e(?:[sd])?)|ientat(?:ion|e[sd])|der(?:(?:ing|ed|s))?)|ccu(?:p(?:ation|y(?:ing)?|ied)|r)|pen(?:(?:ing|ed|s))?)|n(?:o(?:rmalisation|unc(?:e(?:(?:ment|s|d))?|ing)|vat(?:i(?:ons?|ng)|ed?)|wn(?:ed)?)|u(?:nciations?|mber(?:(?:ing|ed))?)|e(?:g(?:otiat(?:i(?:on|ng)|ed?)|ades?|ing|ed?)|w(?:(?:a(?:ble|ls?)|ing|ed|s))?)|d(?:e(?:zvous(?:ed)?|r(?:(?:ings?|ed|s))?)|i(?:tions?|ng)|s)|a(?:issance|m(?:ing|e(?:[ds])?)|l)|t(?:(?:i(?:ers|ng)|als?|e(?:rs?|d)|s))?)|b(?:el(?:(?:l(?:i(?:o(?:us(?:(?:ness|ly))?|ns?)|ng)|ed)|s))?|u(?:t(?:t(?:a(?:ble|ls?)|ing|ed))?|il(?:d(?:(?:ing|s))?|t)|ff(?:(?:ing|ed|s))?|r(?:i(?:ed|al)|y)|k(?:ing|e(?:[ds])?)|s)|o(?:und(?:(?:ing|ed|s))?|o(?:t(?:ed)?|k)|rn)|a(?:lanced|tes?)|i(?:rths?|nd))|f(?:(?:l(?:e(?:ct(?:(?:i(?:v(?:e(?:(?:ness|ly))?|ity)|on(?:(?:al|s))?|ng)|ance|ors?|ed|s))?|x(?:(?:i(?:v(?:e(?:(?:ness|ly))?|ity)|ons?)|ology|es))?)|o(?:oring|at)|ux(?:(?:ing|ed))?|ation)|o(?:r(?:m(?:(?:ulat(?:i(?:ons?|ng)|e(?:[ds])?)|a(?:t(?:(?:i(?:ons?|ve)|t(?:ing|ed)))?|ble)|i(?:sts?|ng)|e(?:rs?|d)|s))?|estation)|cus(?:(?:s(?:ing|e[sd])|ing|e[sd]))?|ld(?:ing|ed))|u(?:rbish(?:(?:ments?|ing|ed))?|t(?:a(?:tions?|ble)|ing|e(?:[ds])?)|s(?:e(?:(?:niks|d|s))?|ing|als?)|nd(?:(?:able|ing|ed|s))?|el(?:(?:l(?:ing|ed)|s))?|ge(?:(?:es?|s))?)|er(?:(?:e(?:n(?:t(?:(?:ial(?:ly)?|s))?|c(?:ing|e(?:[srd])?)|d(?:ums?|a))|e(?:(?:ing|s|d))?)|r(?:ing|als?|ed)|able|s))?|r(?:igera(?:t(?:ion|ors?|ed?)|nts?)|e(?:sh(?:(?:ing(?:ly)?|ments?|able|e[srd]))?|eze)|a(?:ct(?:(?:i(?:ons?|ve|ng)|or[ys]|ed|s))?|in(?:(?:ing|ed|s))?))|i(?:n(?:anc(?:ing|ed?)|e(?:(?:ments?|r(?:(?:ies|y|s))?|d|s))?|i(?:sh|ng))|l(?:l(?:(?:ings?|able|ed|s))?|ing|ed?)|t(?:(?:t(?:ing|ed)|s))?)|s))?|r(?:e(?:gistration|ad(?:(?:ing|s))?)|o(?:ut(?:e(?:(?:ing|s|d))?|ing)|lled)|un(?:(?:ning|s))?|an)|qu(?:i(?:sit(?:ion(?:(?:ing|ed|s))?|es?)|r(?:e(?:(?:ments?|s|d))?|ing)|t(?:ed?|al)|ems?)|est(?:(?:ing|e[rd]|s))?)|h(?:a(?:bilitat(?:i(?:ng|on)|ed?)|sh(?:(?:ing|e[sd]))?)|ea(?:r(?:s(?:(?:ing|als?|e(?:[sd])?))?|ing|d)|t(?:(?:ing|ed|s))?)|ydrate|ous(?:ing|ed?))|m(?:(?:o(?:nstra(?:t(?:i(?:ons?|ng)|ed?)|nce)|rse(?:(?:less(?:ly)?|ful(?:ly)?))?|del(?:l(?:ing|ed))?|te(?:(?:ness|st|ly|r))?|v(?:a(?:ble|ls?)|ing|e(?:(?:rs?|d|s))?)|u(?:nt(?:(?:ed|s))?|ld))|a(?:t(?:erialised|ch(?:ing)?)|in(?:(?:der(?:(?:ing|ed|s))?|ing|ed|s))?|ster(?:(?:ing|ed|s))?|r(?:k(?:(?:abl[ey]|ing|ed|s))?|r(?:i(?:age|ed)|y))|nd(?:(?:ed|s))?|k(?:ing|es?)|de|ps?)|i(?:n(?:isc(?:e(?:(?:n(?:t(?:ly)?|ces?)|d|s))?|ing)|d(?:(?:ing|e(?:rs?|d)|s))?)|t(?:(?:t(?:a(?:nces?|l)|ing|ed)|s))?|ss(?:ions?)?|x(?:e[ds])?)|u(?:nerat(?:i(?:ve|on)|ed?)|s)|e(?:mb(?:rances?|er(?:(?:ing|ed|s))?)|d(?:i(?:a(?:ble|l)|e[sd])|y(?:ing)?))|nants?))?|u(?:ni(?:f(?:i(?:cation|ed)|y)|t(?:ing|e(?:[sd])?)|ons?)|s(?:able|ing|e(?:[ds])?))|j(?:u(?:venat(?:i(?:ons?|ng)|ory|ed?)|stified)|oi(?:n(?:(?:ders?|ing|ed|s))?|c(?:ings?|e(?:[sd])?))|ect(?:(?:i(?:ons?|ng)|ed|s))?)|w(?:i(?:nd(?:(?:able|ing|s))?|r(?:ing|ed?))|o(?:r(?:d(?:(?:ings?|ed))?|k(?:(?:ing|ed|s))?)|und)|r(?:it(?:able|ings?|ten|es?)|ote|ap)|eighed|ard(?:(?:ing|ed|s))?)|kindled?|e(?:l(?:(?:e(?:cts|d)|ing|s))?|f(?:(?:ing|ed|s))?|k(?:(?:ing|ed|s))?|ds?))|a(?:d(?:(?:i(?:o(?:(?:a(?:stronomical|ctiv(?:e(?:ly)?|ity))|g(?:alax(?:ies|y)|ra(?:ph(?:(?:ers?|ic|s|y))?|m))|log(?:i(?:cal|sts?)|y)|nuclide|therapy|carbon|metric|ing|ed|s))?|a(?:t(?:i(?:ve(?:ly)?|ons?|ng)|ors?|e(?:[sd])?)|n(?:(?:t(?:ly)?|c[ye]|s))?|l(?:(?:ly|s))?)|c(?:al(?:(?:ism|ly|s))?|es)|sh(?:es)?|u[ms]|i|x)|ars?|on))?|t(?:(?:i(?:o(?:(?:n(?:(?:al(?:(?:i(?:s(?:ations?|ing|t(?:(?:ic|s))?|ed?|m)|t(?:ies|y))|ly|es?))?|ing|ed|s))?|cination|s))?|f(?:i(?:cations?|e[srd])|y(?:ing)?)|ngs?)|t(?:l(?:e(?:(?:s(?:nakes?)?|d|r))?|ing)|ier|y)|atouille|e(?:(?:payers?|d|r|s))?|like|race|her|s))?|m(?:(?:if(?:i(?:cations?|e[sd])|y)|s(?:hackle)?|p(?:(?:a(?:nt(?:ly)?|g(?:ing|e(?:[sd])?)|rts?)|ing|ed|s))?|bl(?:ings?|e(?:(?:rs?|d|s))?)|m(?:ing|e[dr])|rod))?|n(?:(?:d(?:(?:om(?:(?:is(?:ation|ing|ed?)|ness|ly))?|s|y))?|s(?:ack(?:(?:ing|ed))?|om(?:(?:ing|ed|s))?)|c(?:o(?:rous|ur)|h(?:(?:ing|e(?:rs?|s)))?|id)|t(?:(?:ings?|e(?:rs?|d)|s))?|k(?:(?:ness|l(?:ing|e(?:[ds])?)|ings?|e(?:rs?|st|d)|s))?|g(?:(?:e(?:(?:rs?|d|s))?|ing|y))?|is?))?|p(?:(?:p(?:rochement|ort(?:(?:eurs?|s))?|ing|ed)|t(?:(?:ur(?:ous(?:ly)?|es?)|ors?))?|aci(?:ous|ty)|i(?:d(?:(?:ity|ly|s))?|ers?|sts?|n[eg])|e(?:(?:s(?:eed)?|d))?|s))?|c(?:k(?:(?:e(?:t(?:(?:eering|s))?|d)|ing|s))?|e(?:(?:courses?|horses?|track|goers|rs?|d|s))?|i(?:al(?:(?:is(?:ts?|m)|ly))?|e(?:st|r)|ngs?|s(?:ts?|m)|ly)|o(?:nteur|on)|quets?|coons?|his|y)|g(?:(?:s(?:toriches)?|amuffins?|ged(?:ly)?|time|wort|bag|ing|out|e(?:[ds])?))?|r(?:e(?:(?:f(?:actions?|ied)|ness|bit|ly|st|r))?|i(?:t(?:ies|y)|ng))|i(?:n(?:(?:f(?:orests?|all)|s(?:(?:torms?|wept))?|c(?:louds?|oats?)|water|drops?|less|i(?:e(?:st|r)|ng)|bows?|out|ed|y))?|l(?:(?:way(?:(?:m(?:en|an)|s))?|road|lery|ings?|e[ds]|s))?|d(?:(?:e(?:rs?|d)|ing|s))?|ment|s(?:in(?:[gs])?|e(?:[drs])?))|s(?:p(?:(?:berr(?:ies|y)|ing|e[dr]|s|y))?|h(?:(?:ness|e(?:rs?|st?)|ly))?|cal(?:(?:ly|s))?|ters?|ing|ed)|v(?:i(?:sh(?:(?:ing(?:ly)?|e[srd]))?|n(?:g(?:(?:ly|s))?|es?)|oli)|e(?:(?:n(?:(?:ous(?:ly)?|ing|s))?|l(?:(?:l(?:ing|ed)|s))?|rs?|s|d))?|ag(?:ing|e(?:[ds])?))|z(?:or(?:(?:b(?:lades|ills)|s(?:harp)?|ing))?|zmatazz|ing|e(?:[sd])?)|ucous(?:ly)?|b(?:b(?:i(?:(?:t(?:(?:ing|s))?|s))?|le)|i(?:d(?:ly)?|es)|ats?)|ll(?:y(?:ing)?|ie[ds])|f(?:t(?:(?:s(?:man)?|ers?|ing|man))?|f(?:le(?:[ds])?|ia))|w(?:(?:ness|est))?|k(?:i(?:ng|sh)|e(?:[ds])?)|j(?:ah)?|y(?:(?:on|ed|s))?)|i(?:t(?:ual(?:(?:is(?:tic(?:ally)?|ed)|ly|s))?|es?)|g(?:(?:ht(?:(?:hand(?:e(?:d(?:ness)?|rs?))?|thinking|e(?:ous(?:(?:ness|ly))?|d|n|r)|w(?:ing(?:ers?)?|ards?)|m(?:inded|ost)|ful(?:ly)?|ness|i(?:st|ng)|ly|s))?|id(?:(?:i(?:f(?:ies|y)|t(?:ies|y))|ly))?|o(?:r(?:ous(?:ly)?)?|urs?)|marole|g(?:e(?:rs?|d)|ing)|s))?|d(?:(?:i(?:cul(?:ous(?:(?:ness|ly))?|ing|e(?:[sd])?)|ngs?)|d(?:l(?:ing|e(?:[ds])?)|ance|ing|en)|e(?:(?:rs?|s))?|ge(?:[ds])?|s))?|n(?:g(?:(?:le(?:aders?|ts?|ss)|master|ing(?:ly)?|worm|s(?:ide)?|e(?:rs?|d)))?|s(?:ing|e(?:[ds])?)|ks?|ds?)|c(?:ochet(?:(?:ing|ed))?|k(?:(?:s(?:ha(?:(?:ws?|s))?)?|et[sy]|ing))?|h(?:(?:ness|e(?:st?|r)|ly))?|e)|b(?:(?:o(?:nucleic|flavin|som(?:es?|al))|ald(?:ry)?|b(?:ing|ons?|ed)|cage|s))?|v(?:e(?:t(?:(?:ing(?:ly)?|e[dr]|s))?|r(?:(?:s(?:ide)?|ine))?|n)|al(?:(?:r(?:ies|y)|l(?:ing|ed)|s))?|ulets?|iera)|s(?:k(?:(?:i(?:n(?:ess|g)|e(?:st|r))|ed|y|s))?|soles?|i(?:ble|ngs?)|otto|e(?:(?:rs?|s|n))?|que)|ot(?:(?:ous(?:ly)?|e(?:rs?|d)|ing|s))?|p(?:(?:p(?:l(?:ing|e(?:[ds])?)|e(?:rs?|d)|ing)|o(?:ste(?:[sd])?|ff)|e(?:(?:n(?:(?:ing|e(?:ss|d)|s))?|ly|st|r))?|cord|s(?:top)?|ing))?|f(?:l(?:ings?|e(?:(?:m(?:en|an)|d|s))?)|f(?:(?:led?|s))?|t(?:(?:ing|s))?|e)|m(?:(?:less|med|e|s))?|a(?:l(?:(?:to|s))?)?|l(?:ing|ls?|e(?:[sd])?))|u(?:b(?:(?:b(?:e(?:r(?:(?:s(?:tamp(?:(?:ing|ed))?)?|ised|y))?|d)|i(?:sh(?:(?:ing|e[sd]|y))?|ngs?)|les?)|i(?:dium|c(?:und|on)|es)|ella|ric|s|y))?|t(?:(?:h(?:less(?:(?:ness|ly))?)?|ted|s))?|n(?:(?:ofthemill|n(?:er(?:(?:s(?:up)?|up))?|i(?:e(?:st|r)|ng)|able|y)|away|down|ways?|ts?|gs?|es?|s))?|m(?:(?:ina(?:t(?:i(?:ve(?:ly)?|ons?|ng)|ed?)|nts?)|b(?:ustious|l(?:ings?|e(?:[ds])?)|as?)|m(?:ag(?:ing|e(?:[sd])?)|y)|p(?:(?:us(?:es)?|l(?:ing|ed?)|s))?|our(?:(?:ed|s))?|ania|en))?|d(?:iment(?:ary|s)|d(?:er(?:(?:less|s))?|iness|y)|e(?:(?:ness|ly|st|r))?)|e(?:(?:ful(?:(?:ness|ly))?|s))?|g(?:(?:ged(?:(?:ness|ly))?|by|s))?|in(?:(?:ations?|ous(?:ly)?|ing|e[dr]|s))?|s(?:t(?:(?:i(?:c(?:(?:a(?:lly|ted?)|ity|s))?|n(?:ess|g)|e(?:st|r))|proof|l(?:ing|e(?:(?:rs?|d|s))?)|ed|y|s))?|h(?:(?:hour|i(?:er|ng)|e[ds]))?|s(?:ian?|et)|ks?|e)|p(?:tur(?:ing|e(?:[sd])?)|e(?:es?|rt))|l(?:e(?:(?:books?|rs?|s|d))?|ings?)|c(?:k(?:s(?:acks?)?)?|tions?)|ral(?:(?:ist|ly))?|ff(?:(?:l(?:ing|e(?:[ds])?)|ians?|s))?|anda)|o(?:u(?:nd(?:(?:theclock|abouts?|house|ness|ups?|i(?:sh|ng)|e(?:st|rs?|ls?|d)|ly|s))?|t(?:(?:in(?:e(?:(?:ly|s))?|g)|e(?:(?:ing|rs?|d|s))?|s))?|g(?:h(?:(?:s(?:hod)?|ness|e(?:n(?:(?:ed|s))?|st|d|r)|i(?:ng|e)|age|ly))?|e(?:[ds])?)|lette|bles?|s(?:ing|e(?:[ds])?))|m(?:(?:an(?:(?:tic(?:(?:is(?:ing|e[sd]|m)|ally|s))?|c(?:ing|e(?:[srd])?)|s|y))?|p(?:(?:ing|e[dr]|s))?|ulus|mel|e))?|l(?:l(?:(?:e(?:r(?:(?:s(?:kating)?|coaster))?|d)|i(?:cking|ng)|call|s))?|ypoly|es?)|t(?:(?:a(?:(?:t(?:i(?:on(?:(?:al(?:ly)?|s))?|ng)|able|or(?:[ys])?|e(?:[ds])?)|ry|s))?|t(?:e(?:n(?:(?:ness|ly))?|d|r)|ing)|und(?:(?:ity|a))?|ors?|e|s))?|a(?:d(?:(?:s(?:(?:weepers|i(?:gns|des?)|hows?|ter))?|blocks?|w(?:or(?:thy|ks)|ays?)|house|map))?|st(?:(?:ing|e[dr]|s))?|ch(?:es)?|m(?:(?:ing|e[dr]|s))?|r(?:(?:ing|e[dr]|s))?|n)|gu(?:ish(?:(?:ness|ly))?|e(?:(?:ry|s))?)|b(?:(?:ust(?:(?:ness|ly))?|b(?:e(?:r(?:(?:ies|s|y))?|d)|ing)|ot(?:(?:ics?|s))?|ins?|e(?:[sd])?|s))?|c(?:(?:k(?:(?:bottom|s(?:olid)?|falls?|e(?:t(?:(?:ing|ry|ed|s))?|r(?:[sy])?|d)|i(?:e(?:st|r)|ng)|y))?|oco|s))?|ister(?:ing)?|o(?:(?:f(?:(?:garden|tops?|less|ings?|e[dr]|s))?|k(?:(?:er(?:ies|y)|ies|s))?|t(?:(?:less|ings?|ed|s))?|st(?:(?:ing|e(?:rs?|d)|s))?|m(?:(?:mate|ie(?:st|r)|ful|y|s))?|ibos))?|yal(?:(?:t(?:ies|y)|ists?|ly|s))?|w(?:(?:d(?:i(?:ness|e(?:st|r)|ly)|y(?:ism)?)|boats?|e(?:rs?|d)|ing|s))?|s(?:t(?:er(?:(?:ing|s))?|rums?)|e(?:(?:wood|ttes?|mary|bu(?:sh|ds?)|s))?|ar(?:ies|y)|i(?:e(?:st|r)|ly|n)|y)|ndavel|e(?:(?:ntgen|buck|s))?|d(?:(?:e(?:(?:nts?|os?))?|s))?|v(?:ings?|e(?:(?:rs?|s|d))?)|p(?:ing|e(?:[sd])?))|h(?:o(?:(?:d(?:odendrons?|esia|ium)|mb(?:us(?:es)?|oids|ic)))?|y(?:thm(?:(?:ic(?:al(?:ly)?)?|s))?|m(?:ing|e(?:[drs])?))|i(?:n(?:o(?:ceros(?:es)?)?|e(?:stone)?|itis)|zome)|e(?:umat(?:o(?:logy|id)|i(?:cs?|sm))|toric(?:(?:ians?|al(?:ly)?))?|o(?:log(?:ical|y)|stat)|nium|sus|in|a)|apsod(?:i(?:c(?:al)?|es)|y)|u(?:barb|mbas))|wanda|ye)|a(?:n(?:t(?:(?:h(?:r(?:op(?:o(?:m(?:orphi(?:s(?:ing|m)|c)|etric)|genic(?:ally)?|centric|log(?:i(?:cal|sts?)|y)|id)|ic)|a(?:cite|x))|olog(?:i(?:sed?|es)|y)|e(?:ms?|r))|i(?:(?:c(?:(?:o(?:nstitutional|agulants)|ipat(?:i(?:ons?|ng|ve)|ory|e(?:[ds])?)|l(?:ockwise|imax)|yclone|s))?|a(?:bortionists|ircraft)|d(?:epressants?|otes?)|histamines|qu(?:a(?:r(?:i(?:an(?:(?:ism|s))?|es)|y)|ted)|it(?:ies|y)|es?)|t(?:he(?:tic(?:al(?:ly)?)?|s(?:is|es))|rust)|p(?:a(?:rticles|th(?:etic|ies|y))|odes)|s(?:ymmetr(?:ic|y)|eptics?|tatic|ocial)|oxidants|b(?:iotics?|od(?:ies|y))|m(?:atter|ony)|freeze|gen(?:(?:ic|s))?|viral|lope))?|a(?:gonis(?:ing|t(?:(?:ic|s))?|e(?:[ds])?|ms?)|cids?)|e(?:(?:d(?:iluvian|at(?:ing|es?))|c(?:edents?|hamber)|r(?:ior(?:ly)?|oom)|aters?|lopes?|n(?:atal|na(?:[es])?)))?|l(?:ions?|ers?)|onyms?|werp|r(?:al|um)|s))?|a(?:(?:c(?:hronis(?:tic(?:ally)?|ms?)|ondas?)|gram(?:(?:matic(?:ally)?|s))?|e(?:sthe(?:ti(?:s(?:ing|ed?|ts?)|cs?)|sia)|robic(?:ally)?|mi[ac])|l(?:(?:y(?:tic(?:al(?:ly)?)?|s(?:able|e(?:(?:rs?|d|s))?|i(?:ng|s)|ts?))|og(?:ous(?:ly)?|i(?:cal|es|se)|ues?|y)|gesi(?:cs?|a)|ly))?|t(?:om(?:i(?:c(?:al(?:ly)?)?|sts?|es)|y)|hema)|rch(?:i(?:s(?:t(?:(?:ic|s))?|m)|c(?:al)?)|y)|morphic|phor(?:ic|a)|bolic|nas))?|n(?:i(?:versar(?:ies|y)|hilat(?:i(?:ng|on)|e(?:[ds])?))|o(?:unc(?:e(?:(?:ments?|rs?|d|s))?|ing)|tat(?:i(?:ons?|ng)|e(?:[ds])?)|y(?:(?:ing(?:ly)?|ances?|e(?:rs?|d)|s))?)|u(?:nciation|al(?:(?:ised|ly|s))?|it(?:ies|y)|l(?:(?:l(?:ing|ed)|ment|ar|us|i|s))?)|e(?:x(?:(?:ations?|ing|e(?:[ds])?))?|al(?:(?:ing|e[dr]))?)|a(?:ls?)?)|i(?:s(?:otrop(?:i(?:es|c)|y)|e(?:eds?)?)|m(?:osit(?:ies|y)|a(?:t(?:i(?:ons?|ng)|e(?:(?:d(?:ly)?|s))?|ors?)|ls?)|is(?:ts?|m)|us)|l(?:ine)?|on(?:(?:ic|s))?)|d(?:(?:r(?:o(?:gynous|ids?)|ew)|ante|es))?|e(?:c(?:dot(?:al(?:ly)?|es?)|hoic)|urysms?|m(?:ones?|i[ac])|r(?:oid|gy)|w)|g(?:i(?:oplasty|nal?)|u(?:lar(?:ity)?|ish(?:e[ds])?)|l(?:e(?:(?:poise|rs?|d|s))?|i(?:can|an|ng))|st(?:roms)?|e(?:l(?:(?:ica?|us|s))?|r(?:(?:ing|ed|s))?)|o(?:la(?:ns?)?|ras?)|r(?:i(?:e(?:st|r)|ly)|y))|o(?:m(?:al(?:ous(?:ly)?|ies|y)|ic)|n(?:ym(?:(?:ous(?:ly)?|ity|s))?)?|int(?:(?:ing|ed|s))?|d(?:ised|yne|es?)|r(?:exi[ac]|aks?)|ther)|swer(?:(?:able|ing|e[dr]|s))?|c(?:ho(?:r(?:(?:ages?|i(?:ng|te)|ed|s))?|v(?:ies|y))|est(?:r(?:ies|al|y)|ors?)|i(?:ent(?:(?:ly|s))?|llary))|hydrous|xi(?:et(?:ies|y)|ous(?:ly)?)|y(?:(?:place|thing|w(?:here|ays?)|body|more|how|one))?|k(?:le(?:(?:ts?|s))?|ara)|vils?|us)|u(?:t(?:o(?:(?:b(?:iograph(?:i(?:cal(?:ly)?|es)|y)|ahns?)|c(?:ra(?:t(?:(?:ic(?:ally)?|s))?|c(?:ies|y))|ue)|suggestion|m(?:at(?:(?:i(?:c(?:(?:ally|s))?|on|ng)|e(?:[ds])?|on|a|s))?|o(?:rphisms?|tive|bile))|graph(?:(?:ing|ed|s))?|i(?:gnition|mmune)|nom(?:ous(?:ly)?|ic|y)|p(?:ilot|s(?:ies|y))))?|h(?:or(?:(?:i(?:t(?:a(?:rian(?:(?:ism|s))?|tive(?:ly)?)|ies|y)|s(?:ations?|ing|e(?:[sd])?)|al|ng)|s(?:hip)?|e(?:ss|d)))?|entic(?:(?:a(?:t(?:i(?:ng|on)|ors?|e(?:[ds])?)|lly)|ity))?)|archy|is(?:tic|m)|umn(?:(?:al|s))?|eur)|g(?:ment(?:(?:ations?|ing|ed|s))?|u(?:st(?:us)?|r(?:(?:ed|s|y))?)|ers?|ite)|s(?:pic(?:ious(?:ly)?|es?)|t(?:r(?:al(?:ian)?|ia)|er(?:e(?:ly)?|ity))|sies?)|ction(?:(?:e(?:ers?|d)|ing|s))?|d(?:aci(?:ous(?:ly)?|ty)|i(?:o(?:visual)?|t(?:(?:i(?:on(?:(?:ing|ed|s))?|ng|ve)|or(?:(?:ium|s|y))?|ed|s))?|b(?:ility|l[ey])|ences?))|xiliar(?:ies|y)|b(?:ergines?|urn)|r(?:ic(?:ulas)?|evoir|a(?:(?:l(?:ly)?|s))?|ora(?:[els])?)|nt(?:(?:ies?|s))?|pairs?|ks?)|r(?:c(?:(?:h(?:(?:a(?:eo(?:log(?:i(?:cal(?:ly)?|sts?)|y)|pteryx)|ngels?|i(?:sms?|c))|i(?:t(?:ect(?:(?:ur(?:al(?:ly)?|es?)|onic|s))?|raves?)|pelago|v(?:i(?:sts?|ng)|al|e(?:[ds])?)|ng)|d(?:eacon(?:(?:ry|s))?|iocese|ukes?)|e(?:typ(?:ical|es?|al)|nem(?:ies|y)|r(?:[sy])?|d|s)|bishops?|ness|ways?|ly))?|a(?:n(?:e(?:(?:ness|ly))?|a)|d(?:i(?:ng|a)|es?))|ing|tic|ed|s))?|g(?:u(?:ment(?:(?:ati(?:ve(?:ly)?|on)|s))?|abl[ey]|e(?:(?:rs?|d|s))?|ing|s)|ent|o[nt])|i(?:thmetic(?:al(?:ly)?)?|s(?:tocra(?:c(?:ies|y)|t(?:(?:ic|s))?)|ing|e(?:[ns])?)|d(?:(?:ness|ity))?|zona|ght|as?)|o(?:ma(?:(?:t(?:herap(?:ist|y)|ic(?:(?:ity|s))?)|s))?|u(?:s(?:als?|ing|e(?:[ds])?)|nd)|se)|a(?:chn(?:o(?:phobia|id)|ids?)|b(?:(?:esques?|i(?:a(?:ns?)?|c)|le|s))?|rat|ks?)|b(?:it(?:ra(?:r(?:i(?:ness|ly)|y)|ge(?:urs?)?|t(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|l)|ers?)|o(?:r(?:e(?:tum|al))?|ur))|t(?:(?:i(?:c(?:ula(?:t(?:i(?:ons?|ng)|e(?:(?:ly|d|s))?|ory)|cy|r)|hokes?|le(?:[ds])?)|fic(?:ial(?:(?:ity|ly))?|e)|s(?:t(?:(?:ic(?:ally)?|es?|ry|s))?|ans?)|llery|er)|e(?:fact(?:(?:ual|s))?|r(?:i(?:al|es)|y))|less(?:(?:ness|ly))?|h(?:r(?:opods?|iti[cs])|ur)|ful(?:(?:ness|ly))?|works?|y|s))?|m(?:(?:our(?:(?:plated|e(?:rs?|d)|ies|y))?|a(?:d(?:illo|as?)|ments?|tures?)|chairs?|i(?:stice|es|ng)|bands?|holes?|e(?:nia|d)|fuls?|le(?:ss|ts?)|pits?|rest|y|s))?|r(?:a(?:n(?:g(?:e(?:(?:ments?|able|d|r|s))?|ing)|t)|y(?:(?:ing|ed|s))?|ses)|o(?:w(?:(?:heads?|root|ing|ed|s))?|gan(?:t(?:ly)?|ce))|hythmia|e(?:st(?:(?:able|ing|e[dr]|s))?|ars)|iv(?:als?|ing|e(?:[drs])?))|s(?:on(?:ists?)?|en(?:als?|i(?:de|c)))|d(?:en(?:t(?:ly)?|cy)|uous|our)|k(?:(?:ansas|s))?|e(?:(?:n(?:as?|t)|a(?:[ls])?))?|um)|b(?:s(?:e(?:n(?:t(?:(?:minded(?:(?:ness|ly))?|e(?:e(?:(?:ism|s))?|d)|ing|ly))?|ces?)|il(?:(?:ing|e[dr]|s))?)|t(?:e(?:mious(?:(?:ness|ly))?|ntions?)|r(?:act(?:(?:ed(?:ly)?|i(?:ons?|ng)|ly|s))?|use(?:ly)?)|inen(?:ce|t)|ain(?:(?:ing|e(?:rs?|d)|s))?)|o(?:r(?:pti(?:v(?:ity|e)|ons?)|b(?:(?:ing(?:ly)?|e(?:n(?:cy|t)|rs?|d)|s))?)|l(?:ut(?:e(?:(?:ness|ly|s))?|i(?:s(?:ts?|m)|on))|v(?:ing|e(?:[ds])?)))|urd(?:(?:i(?:t(?:ies|y)|st)|e(?:st|r)|ly))?|c(?:ond(?:(?:ing|e[dr]|s))?|ess(?:es)?|issa(?:[es])?))|n(?:ormal(?:(?:it(?:ies|y)|ly))?|egation)|o(?:li(?:tion(?:ists?)?|sh(?:(?:ing|e[ds]))?)|m(?:ina(?:t(?:ions?|ed?)|bl[ye])|b)|r(?:t(?:(?:i(?:on(?:(?:ists?|s))?|ng|ve)|ed|s))?|igin(?:es|al))|u(?:nd(?:(?:ing|ed|s))?|t)|ard|des?|ve)|b(?:reviat(?:i(?:ons?|ng)|e(?:[ds])?)|e(?:(?:ss|ys?))?|ots?)|r(?:a(?:si(?:ve(?:(?:ness|ly|s))?|ons?)|ded|ham)|idg(?:e(?:(?:ment|d))?|ing)|o(?:gat(?:i(?:ons?|ng)|ed?)|ad)|upt(?:(?:ness|ly))?|east)|a(?:ndon(?:(?:ment|ed|s))?|t(?:toirs?|e(?:(?:ment|d|s))?)|s(?:e(?:(?:ment|d))?|h(?:ed)?)|lone|c(?:us|k)|ft)|u(?:s(?:i(?:ve(?:(?:ness|ly))?|ng)|e(?:(?:rs?|d|s))?)|ndan(?:t(?:ly)?|ces?)|t(?:(?:ments?|t(?:ing|ed)))?|zz)|e(?:(?:r(?:ra(?:tions?|nt)|deen)|t(?:(?:t(?:ing|ed)|s))?|yance|am|le?))?|l(?:e(?:(?:bodied|st|r))?|utions?|a(?:t(?:i(?:ng|on|ve)|es?)|ze)|oom|y)|hor(?:(?:re(?:n(?:ce|t)|d)|s))?|d(?:uct(?:(?:i(?:ons?|ng)|ors?|ed|s))?|icat(?:i(?:on|ng)|e(?:[ds])?)|om(?:inal|ens?))|i(?:lit(?:ies|y)|d(?:ing|jan|e(?:[ds])?)|es)|y(?:s(?:mal(?:ly)?|s(?:(?:al|es))?))?|j(?:ect(?:ly)?|ured?))|c(?:knowledg(?:e(?:(?:ments?|d|s))?|ments?|ing)|qu(?:i(?:siti(?:ve(?:ness)?|ons?)|esc(?:e(?:(?:n(?:ce|t)|d))?|ing)|t(?:(?:t(?:a(?:nce|ls?)|ing|ed)|e[ds]|s))?|r(?:e(?:(?:rs?|d|s))?|ing))|aint(?:(?:ances?|ing|ed|s))?)|c(?:l(?:imatis(?:ation|ing|ed?)|a(?:mations?|im(?:(?:ed|s))?))|o(?:m(?:p(?:li(?:sh(?:(?:ments?|ing|e[ds]))?|ces?)|an(?:i(?:ments?|e[ds]|st)|y(?:ing)?))|modat(?:i(?:ons?|ng)|e(?:[ds])?))|unt(?:(?:a(?:b(?:ility|le)|n(?:cy|ts?))|ing|ed|s))?|rd(?:(?:i(?:on(?:(?:ist|s))?|ng(?:ly)?)|ance|ed|s))?|lades?|st(?:(?:ing|ed|s))?)|e(?:ler(?:ometers?|at(?:i(?:ons?|ng)|ors?|e(?:[ds])?))|pt(?:(?:a(?:b(?:ility|l[ye])|nces?)|ing|ors?|ed|s))?|ss(?:(?:i(?:b(?:ility|le)|ons?|ng)|or(?:ies|y)|e[ds]))?|nt(?:(?:uat(?:i(?:ng|on)|e(?:[ds])?)|ing|ed|s))?|d(?:ing|ed?))|r(?:e(?:dit(?:(?:ation|ing|ed|s))?|t(?:ions?|ed))|u(?:ing|als?|e(?:[ds])?)|a)|u(?:mulat(?:i(?:ons?|ng|ve)|ors?|e(?:[ds])?)|s(?:a(?:t(?:i(?:ons?|ve)|ory)|ls?)|tom(?:(?:ing|ed))?|ing(?:ly)?|e(?:(?:rs?|d|s))?)|r(?:a(?:te(?:ly)?|c(?:ies|y))|sed))|iden(?:t(?:(?:prone|al(?:ly)?|s))?|ce))|u(?:punctur(?:ists?|e)|te(?:(?:ness|ly|st|r))?|ity|men)|id(?:(?:i(?:f(?:i(?:cation|ed)|y(?:ing)?)|ty|c)|ophiles|rain|ly|s))?|r(?:i(?:mon(?:ious(?:ly)?|y)|d)|o(?:bat(?:(?:ics?|s))?|s(?:tics?|s)|nyms?)|ylics?|e(?:(?:age|s))?)|t(?:(?:ua(?:l(?:(?:i(?:s(?:ation|ed?)|t(?:ies|y))|ly))?|r(?:i(?:al|es)|y)|t(?:i(?:ng|on)|ors?|e(?:[ds])?))|i(?:v(?:at(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|i(?:t(?:ies|y)|s(?:ts?|m))|e(?:(?:ly|s))?)|on(?:(?:able|s))?|n(?:ides|gs?))|ress(?:es)?|ors?|ed|s))?|a(?:dem(?:i(?:c(?:(?:al(?:ly)?|ians?|s))?|es|a)|e|y)|nthus|pulco|cia)|h(?:i(?:ev(?:e(?:(?:ments?|rs?|d|s))?|able|ing)|ng(?:(?:ly|s))?)|romatic|e(?:[ds])?|y)|o(?:ustic(?:(?:al(?:ly)?|s))?|lytes?|nite|rns?)|e(?:(?:t(?:ylene|a(?:tes?|l)|one|ic)|ntric|r(?:bi(?:ty|c)|s)|d|s))?|yclic|me|ne)|d(?:m(?:i(?:n(?:ist(?:rat(?:i(?:ve(?:ly)?|ons?|ng)|ors?|ed?)|er(?:(?:ing|ed|s))?))?|ssi(?:b(?:ility|le)|ons?)|t(?:(?:t(?:ances?|ed(?:ly)?|ing)|s))?|r(?:ing(?:ly)?|a(?:tion|bl[ey]|ls?)|e(?:(?:rs?|d|s))?)|x(?:ture)?)|oni(?:sh(?:(?:ment|ing|e[sd]))?|t(?:ions?|ory))|an|en)|d(?:(?:ress(?:(?:ab(?:ility|le)|ing|e(?:es?|d|s)))?|i(?:ct(?:(?:i(?:ve(?:ness)?|ons?)|ed|s))?|ti(?:on(?:(?:al(?:ly)?|s))?|ve(?:(?:ly|s))?)|ng)|e(?:nd(?:um|a)|rs?|d)|uc(?:ing|e(?:[ds])?)|l(?:ing|e(?:[ds])?)|s))?|v(?:an(?:tage(?:(?:ous(?:ly)?|s|d))?|c(?:e(?:(?:ments?|d|r|s))?|ing))|e(?:r(?:t(?:(?:is(?:e(?:(?:ments?|rs?|s|d))?|ing)|ed|s))?|s(?:ar(?:i(?:al|es)|y)|it(?:ies|y)|e(?:ly)?)|b(?:(?:ial|s))?)|nt(?:(?:ur(?:ous(?:ly)?|e(?:(?:rs?|s|d))?|i(?:ng|sm))|s))?)|i(?:s(?:ab(?:ility|le)|e(?:(?:d(?:ly)?|rs?|s))?|ing|ory)|ces?)|oca(?:t(?:ing|e(?:[ds])?)|cy))|u(?:l(?:t(?:(?:er(?:at(?:i(?:ons?|ng)|e(?:[ds])?)|e(?:ss(?:es)?|rs?)|ous|y)|hood|s))?|at(?:ion|ory))|mbrat(?:ing|ed?))|i(?:abatic(?:ally)?|pose|eu(?:[xs])?|os|t)|j(?:u(?:d(?:icat(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|ge(?:[ds])?)|st(?:(?:ments?|able|ing|e[dr]|s))?|ncts?|tant|re)|o(?:urn(?:(?:ment|ing|ed|s))?|in(?:(?:ing|ed|s))?)|ectiv(?:es?|al)|acen(?:t(?:ly)?|cy))|a(?:pt(?:(?:a(?:b(?:ility|le)|tions?)|i(?:v(?:ity|e(?:ly)?)|ng)|e(?:rs?|d)|ors?|s))?|m(?:ant(?:ly)?)?|g(?:es?|io))|h(?:e(?:si(?:ve(?:(?:ness|s))?|ons?)|r(?:e(?:(?:n(?:ce|ts?)|rs?|d|s))?|ing))|oc)|o(?:(?:lescen(?:ce|ts?)|r(?:n(?:(?:ments?|ing|ed|s))?|a(?:tion|bl[ey])|ing(?:ly)?|e(?:(?:rs?|d|s))?)|pt(?:(?:i(?:ons?|ng|ve)|e[dr]|s))?|nis|be))?|sor(?:ption|b(?:ed)?)|r(?:oit(?:(?:ness|ly))?|enal(?:ine?)?|ift)|e(?:qua(?:te(?:ly)?|cy)|laide|n(?:(?:o(?:ids?|mas?)|ine))?|pts?)|libs?|ze)|g(?:r(?:i(?:cultur(?:al(?:(?:ists?|ly))?|e)|business|mony)|ee(?:(?:abl(?:e(?:ness)?|y)|ments?|ing|d|s))?|o(?:chemicals?|nom(?:ists?|y)|und)|arian)|g(?:l(?:omerat(?:i(?:ons?|ng)|ed)|utinative)|r(?:e(?:ss(?:i(?:ve(?:(?:ness|ly))?|ons?)|ors?)|gat(?:i(?:ons?|ng)|e(?:[sd])?))|avat(?:i(?:ons?|ng)|e(?:[sd])?)|ieved(?:ly)?))|nostic(?:(?:ism|s))?|o(?:(?:n(?:i(?:s(?:ing(?:ly)?|e(?:[ds])?|ts?)|es)|y)|ra(?:phobi[ac])?|uti|g))?|i(?:t(?:at(?:i(?:ons?|ng)|e(?:(?:d(?:ly)?|s))?|ors?)|prop)|l(?:ity|er?)|ngs?|o)|a(?:(?:r(?:agar)?|in(?:st)?|khan|ves?|pe))?|e(?:(?:n(?:c(?:ies|y)|d(?:ums|as?)|ts?)|i(?:ngs?|sm)|less|old|s|d))?|hast|l(?:eam|ow)|ue)|i(?:r(?:(?:c(?:ondition(?:ing|e[dr])|r(?:aft|ews?))|w(?:orth(?:iness|y)|a(?:ves?|ys?))|s(?:(?:ick(?:ness)?|tr(?:eam|ips?)|hips?|pace))?|l(?:i(?:ft(?:(?:ing|ed|s))?|ne(?:(?:rs?|s))?)|ocks?|ess)|f(?:ields?|rames?|orce|low)|p(?:la(?:ne|y)|orts?)|ti(?:ght|me)|b(?:orne|rush|ase|us)|i(?:n(?:ess|gs?)|e(?:st|r)|ly)|m(?:a(?:il|n)|en)|raid|gun|ed?|y))?|d(?:(?:e(?:(?:s(?:decamp)?|d(?:ecamp)?|rs?))?|ing|s))?|m(?:(?:less(?:(?:ness|ly))?|ing|e[dr]|s))?|l(?:(?:erons?|ments?|ing|s))?|tches|sles?|nt)|p(?:p(?:r(?:e(?:ntice(?:(?:s(?:hips?)?|d))?|cia(?:t(?:i(?:ve(?:ly)?|ons?|ng)|e(?:[ds])?)|bl[ey])|hen(?:si(?:ve(?:ly)?|ons?)|d(?:(?:ing|ed|s))?))|o(?:(?:ach(?:(?:ab(?:ility|le)|ing|e[sd]))?|priat(?:e(?:(?:ness|ly|d|s))?|i(?:ons?|ng))|ximat(?:i(?:ons?|ng)|e(?:(?:ly|d|s))?)|bation|v(?:ing(?:ly)?|als?|e(?:[ds])?)))?|ais(?:ing(?:ly)?|e(?:(?:rs?|es|d|s))?|als?)|is(?:ing|ed?))|l(?:i(?:ca(?:b(?:ility|le)|t(?:i(?:ons?|ve)|ors?)|nts?)|ances?|que|e[drs])|au(?:d(?:(?:ing|ed|s))?|se)|e(?:(?:cart|pie|s|t))?|y(?:ing)?)|o(?:rtion(?:(?:ment|ing|ed|s))?|int(?:(?:ments?|ing|e(?:es?|d)|s))?|sit(?:ion|e))|a(?:r(?:at(?:chiks?|us(?:es)?)|itions?|e(?:nt(?:ly)?|l(?:led)?))|l(?:(?:l(?:ing(?:ly)?|ed)|s))?)|e(?:lla(?:t(?:ions?|e)|nts?)|nd(?:(?:i(?:c(?:itis|es)|ng|x)|ages?|ed|s))?|rtain(?:(?:ing|ed))?|a(?:l(?:(?:ing(?:ly)?|ed|s))?|r(?:(?:ances?|ing|ed|s))?|s(?:e(?:(?:ment|rs?|d|s))?|ing))|ti(?:s(?:ing|er)|tes?)))|o(?:l(?:og(?:etic(?:ally)?|i(?:s(?:ing|ts?|e(?:[sd])?)|es|a)|y)|itical|lo)|st(?:roph(?:ised|es?)|ol(?:ate|ic)|a(?:tes?|sy)|les?)|the(?:car(?:ies|y)|osis)|c(?:alyp(?:tic|se)|ryphal)|ple(?:ctic|xy)|gee)|a(?:th(?:etic(?:ally)?|y)|rt(?:(?:ments?|ness))?|c(?:hes?|e))|e(?:(?:r(?:i(?:odic(?:ally)?|tifs?|es)|tures?|y)|man|x|s|d))?|h(?:rodisiacs?|oris(?:t(?:ic)?|ms?)|elion|asia|ids?)|t(?:(?:itudes?|ness|est|ly))?|i(?:a(?:r(?:i(?:es|st)|y)|n)|ece|ng|sh?)|r(?:i(?:cots?|ori|l)|o(?:pos|ns?))|l(?:enty|omb)|n(?:oea|ea)|s(?:es?|is))|l(?:g(?:orithm(?:(?:ic(?:ally)?|s))?|e(?:bra(?:(?:i(?:c(?:al(?:ly)?)?|st)|s))?|rian?)|iers|a(?:[el])?)|p(?:(?:ha(?:(?:bet(?:(?:ic(?:al(?:ly)?)?|s))?|numeric|s))?|acas?|ine|s))?|t(?:(?:ruis(?:t(?:ic(?:ally)?)?|m)|er(?:(?:nat(?:i(?:ve(?:(?:ly|s))?|ons?|ng)|e(?:(?:ly|s|d))?|ors?)|cat(?:ions?|e)|a(?:tions?|ble)|e(?:go|d)|ing|s))?|ar(?:(?:pieces?|s))?|o(?:gether)?|i(?:meters?|tudes?)|hough|s))?|l(?:(?:e(?:g(?:or(?:i(?:cal(?:ly)?|es)|y)|ations?|i(?:ances?|ng)|e(?:(?:d(?:ly)?|s))?|r[io])|viat(?:i(?:ons?|ng)|e(?:[sd])?)|rg(?:ens?|i(?:es|c)|y)|y(?:(?:ways?|s))?|l(?:es?|ic))|i(?:terat(?:i(?:ons?|ng|ve)|ed?)|gators?|ances?|e[ds])|o(?:cat(?:able|i(?:ons?|ng)|ors?|e(?:[ds])?)|w(?:(?:a(?:nces?|ble)|ing|ed|s))?|t(?:(?:rop(?:ic|e)|ments?|t(?:ing|ed)|s))?|phones|y(?:(?:ing|ed|s))?)|u(?:r(?:e(?:(?:ments?|d|s))?|ing(?:ly)?)|si(?:ons?|ve)|d(?:ing|e(?:[ds])?)|vi(?:al?|um))|ay(?:(?:ing|ed|s))?|y(?:ing)?))?|b(?:(?:a(?:tross(?:es)?|n(?:ia|y))|in(?:ism|o)|um(?:(?:en|in|s))?|eit))?|m(?:s(?:houses?)?|anacs?|ighty|o(?:nds?|st))|k(?:a(?:l(?:i(?:(?:n(?:ity|e)|se?|c))?|oids?)|nes)|yl)|i(?:m(?:entary|ony)|g(?:n(?:(?:ments?|ing|ed|s))?|ht(?:(?:ing|ed|s))?)|en(?:(?:at(?:i(?:on|ng)|e(?:[ds])?)|ing|ed|s))?|phatic|quots?|as(?:es)?|b(?:aba|is?)|n(?:ing|e(?:[ds])?)|ke|ve)|c(?:o(?:hol(?:(?:i(?:sm|cs?)|s))?|ves?)|hem(?:i(?:sts?|cal)|y))|a(?:(?:rm(?:(?:i(?:ng(?:ly)?|s[mt])|ed|s))?|ba(?:ster|ma)|c(?:arte|rity|k)|ddin|nine|s(?:kan?)?))?|d(?:e(?:hydes?|r(?:m(?:an|en))?)|rin)|e(?:(?:rt(?:(?:ness|ing|ed|ly|s))?|house|mbic|s))?|o(?:n(?:e(?:ness)?|g(?:side)?)|of(?:ness)?|es?|ft|ha|ud)|um(?:(?:in(?:ium|um)|n(?:us|i)))?|veol(?:ar|i)|fa(?:lfa|tah)|r(?:eady|ight)|ways|so)|s(?:t(?:r(?:o(?:physic(?:ists?|al|s)|n(?:om(?:ic(?:al(?:ly)?)?|ers?|y)|aut(?:(?:ic(?:al|s)|s))?)|l(?:og(?:ical|ers?|y)|abes?))|i(?:ngent|de)|a(?:ddle|l(?:ly)?|y))|o(?:nish(?:(?:ing(?:ly)?|ment|e[sd]))?|und(?:(?:ing(?:ly)?|ed|s))?)|i(?:gmati(?:sm|c)|r)|ute(?:(?:ness|ly))?|hma(?:tics?)?|er(?:(?:isk(?:(?:ed|s))?|oids?|n|s))?)|s(?:(?:a(?:ssin(?:(?:at(?:i(?:ons?|ng)|ed?)|s))?|ult(?:(?:ing|ed|s))?|il(?:(?:a(?:nts?|ble)|ing|ed|s))?|y(?:(?:e[dr]|s))?)|e(?:rt(?:(?:i(?:ve(?:(?:ness|ly))?|ons?|ng)|ed|s))?|mbl(?:ages?|i(?:ng|es)|e(?:(?:rs?|d|s))?|y)|s(?:s(?:(?:ments?|able|ing|ors?|e[ds]))?)?|nt(?:(?:ing|ed|s))?|gais?|ts?)|o(?:ciat(?:e(?:(?:s(?:hip)?|d))?|i(?:on(?:(?:al|s))?|v(?:e(?:ly)?|ity)|ng))|rt(?:(?:ments?|ed))?|nance)|i(?:gn(?:(?:a(?:tions?|ble)|ments?|e(?:es|d|r)|ing|s))?|mila(?:t(?:i(?:ng|on)|e(?:[ds])?)|ble)|du(?:ous(?:ly)?|ity)|st(?:(?:an(?:ts?|ce)|ing|ed|s))?|zes)|u(?:m(?:ptions?|ing|e(?:[ds])?)|r(?:ances?|e(?:(?:d(?:ly)?|s))?|ing)|ag(?:ing|e(?:[ds])?))|yrian?))?|y(?:m(?:metr(?:i(?:c(?:al(?:ly)?)?|es)|y)|pto(?:t(?:ic(?:ally)?|es?)|matic))|nchronous(?:ly)?|lums?)|c(?:e(?:rtain(?:(?:able|ment|ing|ed|s))?|tic(?:(?:ism|s))?|n(?:sions?|d(?:(?:e(?:ncy|d|r)|an(?:cy|t)|ing|s))?|ts?))|ri(?:ptions?|b(?:able|ing|e(?:[ds])?))|orbic)|p(?:(?:h(?:yxia(?:t(?:ion|ed?))?|alt)|i(?:r(?:a(?:t(?:i(?:on(?:(?:al|s))?|ng)|ors|e(?:[ds])?)|nts?)|in(?:[gs])?|e(?:[ds])?)|distra|c)|e(?:r(?:sions?|ity)|cts?)|aragus|s))?|bestos(?:is)?|h(?:(?:amed(?:ly)?|trays?|bins?|cans|ore|e[ns]|y))?|e(?:ptic|xual)|i(?:a(?:(?:tic|ns?))?|nine|des?)|k(?:(?:ance|e(?:rs|d|w)|ing|s))?|ocial|under|l(?:ant|eep)|wan)|t(?:h(?:e(?:rosclerosis|is(?:t(?:(?:ic(?:ally)?|s))?|m)|n[as])|let(?:ic(?:(?:ally|ism|s))?|es?))|mospher(?:ic(?:(?:ally|s))?|es?)|t(?:r(?:act(?:(?:i(?:ve(?:(?:ness|ly))?|ons?|ng)|ors?|ed|s))?|i(?:but(?:able|i(?:ons?|ng|ve)|e(?:[sd])?)|tion(?:al)?))|e(?:n(?:ti(?:ve(?:(?:ness|ly))?|on(?:(?:al|s))?)|d(?:(?:an(?:ces?|ts?)|e(?:es|rs?|d)|ing|s))?|uat(?:i(?:ng|on)|ors?|e(?:[sd])?))|st(?:(?:ation|ing|ed|s))?|mpt(?:(?:ing|ed|s))?)|a(?:c(?:h(?:(?:ments?|able|ing|e(?:[ds])?))?|k(?:(?:e(?:rs?|d)|ing|s))?)|in(?:(?:ments?|able|ing|ed|s))?)|i(?:tud(?:inal|es?)|r(?:ing|ed?)|cs?|la)|orneys?|uned?)|o(?:m(?:(?:i(?:s(?:ation|tic|ed)|c(?:(?:ally|ity))?)|bomb|s))?|n(?:al(?:ity)?|e(?:(?:ment|d|s))?|i(?:ng|c))|lls?|p)|r(?:o(?:ci(?:ous(?:ly)?|t(?:ies|y))|p(?:h(?:y(?:ing)?|ie[ds])|ine))|i(?:al|um))|ypical(?:ly)?|avis(?:tic|m)|la(?:nt(?:i[cs]|a)|s(?:es)?)|e(?:lier)?)|e(?:r(?:o(?:d(?:ynamic(?:(?:ally|s))?|romes?)|naut(?:ic(?:(?:al|s))?)?|b(?:ic(?:(?:ally|s))?|raking|atics?|es?)|planes?|foils?|s(?:pace|ols?))|at(?:i(?:ng|on)|e(?:[ds])?|or)|i(?:al(?:(?:ly|s))?|fy))|s(?:thet(?:ic(?:(?:ally|ism|sy))?|es?)|op)|o(?:lian|ns?)|g(?:ean|i(?:na|s)))|m(?:a(?:t(?:eur(?:(?:is(?:h(?:(?:ness|ly))?|m)|s))?|ory)|lgam(?:(?:at(?:i(?:ons?|ng)|e(?:[ds])?)|s))?|nuensis|z(?:e(?:(?:ment|d|s))?|ing(?:ly)?|ons?)|ss(?:(?:ing|e[ds]))?)|p(?:(?:l(?:i(?:f(?:i(?:cations?|e(?:rs?|d|s))|y(?:ing)?)|tudes?)|er?|y)|h(?:i(?:theatres?|bi(?:ous|a(?:ns?)?))|etamines?|ora)|u(?:t(?:at(?:i(?:ons?|ng)|ed?)|ees?)|l(?:es?|s))|er(?:sands?|es?)|oules|s))?|b(?:assador(?:(?:ial|s))?|i(?:dextrous|valen(?:t(?:ly)?|ce)|gu(?:it(?:ies|y)|ous(?:ly)?)|t(?:io(?:us(?:ly)?|ns?))?|ance|en(?:ce|t))|u(?:s(?:cades?|h(?:(?:e(?:rs|d|s)|ing))?)|la(?:t(?:ory|e)|n(?:ces?|t)))|er(?:gris)?|rosia|l(?:ing|e(?:[drs])?))|e(?:liorat(?:i(?:ng|on)|e(?:[ds])?)|n(?:(?:ab(?:ility|le)|orrhoea|d(?:(?:ments?|able|ing|ed|s))?|it(?:ies|y)|s))?|thyst(?:(?:ine|s))?|ric(?:a(?:ns?)?|ium))|o(?:r(?:tis(?:ation|ed?)|al(?:ity)?|ous(?:ly)?|phous|ist)|u(?:nt(?:(?:ing|ed|s))?|rs?)|eb(?:ae?|ic)|ng(?:st)?|k)|i(?:ab(?:l(?:e(?:ness)?|y)|ility)|cab(?:ility|l[ey])|d(?:(?:s(?:hips|t)|e))?|n(?:es?|o)|go|ss|ty|r)|u(?:s(?:e(?:(?:ments?|d|s))?|ing(?:ly)?)|lets?|ck)|m(?:unition|o(?:ni(?:tes|um|a))?|eters?|an)|n(?:es(?:t(?:ies|y)|i(?:ac?|c))|iotic))|v(?:a(?:il(?:(?:ab(?:ilit(?:ies|y)|le)|ing|ed|s))?|ric(?:ious(?:ness)?|e)|lanch(?:ing|es?)|ntgarde)|o(?:i(?:rdupois|d(?:(?:a(?:ble|nce)|ing|ed|s))?)|w(?:(?:ed(?:ly)?|als?|ing))?|cado)|e(?:(?:r(?:(?:ag(?:e(?:(?:ly|d|s))?|ing)|s(?:(?:i(?:ons?|ve)|e))?|r(?:ing|ed)|t(?:(?:ing|ed|s))?))?|n(?:g(?:e(?:(?:rs?|d|s))?|ing)|ues?|s)))?|u(?:ncular|lsion)|i(?:a(?:r(?:ies|y)|t(?:ion|ors?|e)|n)|onics|d(?:(?:ity|ly))?))|f(?:f(?:e(?:ct(?:(?:i(?:on(?:(?:ate(?:ly)?|s))?|ng|ve)|ations?|ed(?:ly)?|s))?|rent)|i(?:rm(?:(?:ati(?:ve(?:ly)?|ons?)|ing|ed|s))?|liat(?:i(?:ons?|ng)|e(?:[sd])?)|n(?:it(?:ies|y)|e)|davits?|x(?:(?:ing|e[ds]))?)|or(?:d(?:(?:ab(?:ility|le)|ing|ed|s))?|est(?:ation|ed))|l(?:ict(?:(?:i(?:ons?|ng)|ed|s))?|u(?:en(?:ce|t)|x))|a(?:b(?:ility|l[ey])|irs?)|r(?:ont(?:(?:ed|s))?|ay))|o(?:re(?:mentioned|thought|said)|ot)|t(?:er(?:(?:t(?:houghts?|aste)|effects?|sh(?:ocks|ave)|wards?|noons?|li(?:ves|fe)|birth|care|glow|math))?)?|r(?:ica(?:ns?)?|aid|esh|os?)|ghan(?:[is])?|i(?:eld|re)|l(?:ame|oat)|ar)|x(?:i(?:om(?:(?:ati(?:c(?:ally)?|sing)|s))?|llary|al(?:ly)?|ng|s)|e(?:(?:heads?|man|s|d))?|o(?:lotl|ns?)|les?)|w(?:e(?:(?:s(?:ome(?:(?:ness|ly))?|truck)|less|d))?|kward(?:(?:ness|est|ly))?|a(?:k(?:e(?:(?:n(?:(?:ings?|ed|s))?|s))?|ing)|r(?:e(?:ness)?|d(?:(?:ing|ed|s))?)|it(?:(?:ing|ed|s))?|sh|y)|ful(?:(?:ness|ly))?|n(?:ings?)?|hile|o(?:ken?|l)|ry|ls)|qu(?:a(?:(?:marine|ri(?:ums?|a)|lung|naut|tics?))?|e(?:ducts?|ous)|i(?:fers?|line))|y(?:urvedic|e)|z(?:imuth(?:al)?|aleas?|ores|tecs?|ure)|ar(?:d(?:wolf|vark)|on)|ki(?:mbo|n)|or(?:ist|t(?:as?|ic))|h(?:e(?:ad|m)|oy|a)|jar)|g(?:r(?:e(?:a(?:t(?:(?:grand(?:children|daughter|mothers?|father|son)|aunts?|coats?|ness|e(?:st|r)|ly))?|s(?:e(?:(?:p(?:aint|roof)|rs|s|d))?|i(?:e(?:st|r)|ng)|y))|garious(?:(?:ness|ly))?|e(?:n(?:(?:g(?:rocer(?:[sy])?|ages)|ho(?:uses?|rns?)|s(?:(?:ward|tone))?|f(?:ield|ly)|e(?:yed|ry?|st|d)|ness|wich|i(?:ng|sh|e)|ly))?|d(?:(?:i(?:ness|e(?:st|r)|ly)|y|s))?|t(?:(?:ings?|ed|s))?|ks?|ce)|y(?:(?:hounds?|beard|ness|i(?:sh|ng)|e(?:st|r|d)|s))?|nad(?:iers?|es?)|mlins?|cian|w)|a(?:v(?:i(?:t(?:a(?:t(?:i(?:on(?:al(?:ly)?)?|ng)|ed?)|s)|ies|ons?|y)|es)|e(?:(?:diggers?|s(?:(?:t(?:ones?)?|ide))?|yards?|l(?:(?:l(?:ed|y)|y|s))?|r|n))?|ures|y)|n(?:d(?:(?:da(?:ughters?|d)|child(?:ren)?|i(?:loquent|os(?:ity|e))|fathers?|m(?:a(?:s(?:ters?)?)?|others?)|pa(?:(?:rents?|s))?|s(?:(?:tand|ons?))?|ads|e(?:es?|st|ur|r)|ly))?|ul(?:a(?:r(?:ity)?|t(?:ion|ed))|ocyte|es?)|ar(?:ies|y)|it(?:es?|ic)|n(?:ies?|y)|t(?:(?:ing|e[ed]|s))?|ge)|t(?:i(?:f(?:i(?:cations?|e[ds])|y(?:ing(?:ly)?)?)|cule|tude|ngs?|s)|uit(?:ous(?:(?:ness|ly))?|ies|y)|e(?:(?:ful(?:ly)?|rs?|s|d))?)|m(?:(?:m(?:a(?:tical(?:ly)?|r(?:(?:ians?|s))?)|es?)|ophones?|s))?|p(?:h(?:(?:olog(?:ists?|y)|i(?:c(?:(?:al(?:ly)?|s))?|te)|ed|s))?|tolites|e(?:(?:fruit|s(?:hot)?|vine))?|pl(?:ing|e(?:[ds])?)|nel)|c(?:e(?:(?:ful(?:(?:ness|ly))?|less(?:ly)?|s|d))?|i(?:ous(?:(?:ness|ly))?|ng))|s(?:s(?:(?:hoppers?|roots|lands?|ie(?:st|r)|e[sd]|y))?|p(?:(?:ing|e[rd]|s))?)|d(?:ua(?:t(?:i(?:ons?|ng)|e(?:[ds])?)|l(?:(?:is[tm]|ly))?|nds?)|ations?|i(?:ents?|ngs?)|e(?:(?:rs?|s|d))?)|i(?:n(?:(?:i(?:ness|e(?:st|r))|ed|y|s))?|ls?)|b(?:(?:b(?:e(?:rs?|d)|ing)|s))?|f(?:fit[io]|t(?:(?:ing|ed|s))?)|z(?:ing|e(?:[srd])?)|ham)|o(?:t(?:esque(?:(?:ness|ly))?|to)|u(?:nd(?:(?:s(?:(?:heet|well|man))?|w(?:ater|ork)|nuts?|less|ing|ed))?|p(?:(?:i(?:ngs?|es?)|e[rd]|s))?|t(?:ing)?|ses?|chy?)|ve(?:(?:l(?:(?:l(?:ing|e[dr])|s))?|s))?|cer(?:(?:ies|y|s))?|g(?:g(?:i(?:est|ly)|y))?|p(?:ing(?:(?:ly|s))?|e(?:(?:rs?|s|d))?)|ss(?:(?:ness|e(?:st|r|d)|ly))?|a(?:n(?:(?:e(?:rs?|d)|ing|s))?|ts?)|mmets?|o(?:m(?:(?:e(?:rs?|d)|ing|s))?|v(?:i(?:er|ng)|e(?:[sd])?|y))|w(?:(?:l(?:(?:ing|e[rd]|s))?|n(?:ups?)?|ths?|ing|ers?|s))?|ins?)|u(?:e(?:some(?:(?:ness|ly))?|l(?:(?:ling|ing))?)|m(?:bl(?:ings?|e(?:[drs])?)|p(?:i(?:e(?:st|r)|ly)|y|s))|dg(?:ing(?:ly)?|es?)|b(?:(?:b(?:i(?:e(?:st|r)|ng)|ed|y)|s))?|ff(?:(?:ness|ly))?|n(?:t(?:(?:ing|e[rd]|s))?|ge))|i(?:zzl(?:ie(?:st|r)|ed|y)|n(?:(?:d(?:(?:s(?:tone)?|e(?:rs?|d)|ing))?|n(?:ing|e[rd])|s))?|e(?:v(?:ous(?:ly)?|ances?|e(?:(?:rs?|s|d))?|ing)|fs?)|m(?:(?:ac(?:ing|e(?:[ds])?)|iest|m(?:e(?:st|r))?|ness|ly|e|y))?|s(?:l(?:ie(?:st|r)|y)|t(?:le)?)|t(?:(?:t(?:i(?:e(?:st|r)|ng)|ed|y)|s))?|d(?:(?:iron|lock|ded|s))?|ff(?:ins?|on)|ll(?:(?:ing|e(?:[sd])?|s))?|p(?:(?:p(?:e(?:rs?|d)|ing)|ing|e(?:[sd])?|s))?))|a(?:s(?:(?:tr(?:o(?:intestinal|enteritis|nom(?:ic|y)|pods?)|ectomy|i(?:tis|c))|h(?:(?:older|ing|e[sd]))?|ometer|light|s(?:i(?:e(?:st|r)|ng)|e[sd]|y)|works|p(?:(?:ing|e[rd]|s))?|kets?|e(?:ous|s)|ify))?|l(?:(?:van(?:omet(?:ric|er)|i(?:s(?:ing|ed?)|c))|l(?:(?:i(?:vant(?:ing|ed)|um|ng|c)|ant(?:(?:r(?:ies|y)|ly|s))?|s(?:tones)?|e(?:r(?:ie[ds]|y)|ons?|ys?|d)|o(?:p(?:(?:ing|ed|s))?|ws|ns?)))?|a(?:(?:ctic|x(?:ies|y)|s))?|ile(?:an|o)|o(?:shes|re|p)|e(?:(?:na|s))?|s))?|m(?:e(?:(?:s(?:m(?:anship|en))?|keepers?|tes?|rs|ly|d))?|b(?:ol(?:(?:ling|s))?|l(?:e(?:(?:rs?|s|d))?|ing)|i(?:ts?|an?))|m(?:on|a)|ing|ut|y)|t(?:e(?:(?:crash(?:(?:e(?:rs?|d)|ing))?|keepers?|houses?|posts?|ways?|au(?:[xs])?|d|s))?|her(?:(?:ings?|e(?:rs?|d)|s))?|ing)|n(?:g(?:(?:s(?:ter(?:(?:ism|s))?)?|ren(?:ous|e)|l(?:i(?:on(?:ic)?|ng|a)|and|y)|plank|ways?|ing|e(?:rs?|s|d)))?|tr(?:ies|y)|nets?|d(?:ers?|hi))|u(?:che(?:(?:ness|rie))?|d(?:(?:i(?:ness|est|ly)|y))?|nt(?:(?:l(?:ets?|y)|er))?|g(?:ing|e(?:[sd])?)|ls?|ze)|r(?:r(?:ott(?:ing|e(?:[ds])?)|ison(?:(?:ed|s))?|ulous|ets?)|n(?:ish(?:(?:ing|ed))?|e(?:r(?:(?:ing|ed))?|ts?))|g(?:antuan|oyles?|l(?:ing|e(?:[sd])?))|den(?:(?:ers?|ing|s))?|l(?:and(?:(?:ed|s))?|ic)|ott(?:ing|e(?:[ds])?)|b(?:(?:l(?:ing|e(?:[sd])?)|age|ed|s))?|ish(?:ly)?|ments?|ters?|age(?:[sd])?)|i(?:n(?:(?:s(?:ay(?:ing)?)?|ful(?:ly)?|ing|e(?:rs?|d)|ly))?|t(?:(?:ers?|s))?|jin|ety|ly)|b(?:(?:erdine|bl(?:ing|e(?:[sd])?)|le(?:[sd])?|on))?|z(?:e(?:(?:tte(?:(?:er|s))?|lles?|bo|d|s))?|ing)|d(?:(?:get(?:(?:ry|s))?|d(?:ing|ed)|fly))?|p(?:(?:ing(?:ly)?|e(?:[ds])?|s))?|w(?:k(?:(?:ing|y))?|pin)|v(?:otte|ials?|el?)|ol(?:(?:e(?:rs?|d)|s))?|g(?:(?:s(?:ter)?|g(?:led?|ing|ed)|ing|e|a))?|y(?:(?:est|s))?|ff(?:es?)?)|e(?:o(?:m(?:orpholog(?:i(?:cal|sts)|y)|agneti(?:c(?:ally)?|sm)|et(?:r(?:i(?:c(?:al(?:ly)?)?|es)|y)|ers?))|graph(?:ic(?:al(?:ly)?)?|ers?|y)|s(?:ynchronous|cientific|tationary)|p(?:hysic(?:ists?|al|s)|olitical)|c(?:hemi(?:stry|cal)|entric)|log(?:i(?:c(?:al(?:ly)?)?|sts?)|y)|thermal|desics?|rg(?:ia|e))|n(?:(?:e(?:(?:r(?:a(?:(?:l(?:(?:i(?:s(?:a(?:tions?|ble)|ing|e(?:[ds])?|ts?)|t(?:ies|y))|s(?:hip)?|ly))?|t(?:i(?:on(?:(?:al|s))?|ve|ng)|ors?|e(?:[ds])?)))?|o(?:sit(?:ies|y)|us(?:ly)?)|ic(?:ally)?)|alog(?:i(?:cal|es|st)|y)|t(?:ic(?:(?:ally|ists?|s))?|s)|s(?:is)?|va))?|t(?:(?:r(?:if(?:i(?:cation|ed)|ying)|y)|l(?:e(?:(?:m(?:an(?:ly)?|en)|ness|folk|st|r))?|ing|y)|eel(?:(?:est|ly))?|i(?:l(?:ity|es?)|ans)|s))?|u(?:flect(?:ions)?|ine(?:(?:ness|ly))?|s)|der(?:(?:less|ed|s))?|i(?:al(?:(?:ity|ly))?|t(?:al(?:(?:ia|s))?|ives?)|us(?:es)?|e|i)|o(?:cid(?:al|e)|types?|m(?:ic|es?)|a)|res?))?|st(?:iculat(?:i(?:ons?|ng)|ed?)|a(?:t(?:i(?:on(?:al)?|ng)|e)|po|lt)|ur(?:ing|al|e(?:[ds])?))|r(?:onto(?:log(?:ist|y)|cracy)|rymander(?:ed)?|m(?:(?:i(?:na(?:t(?:i(?:ng|on)|ed?)|l)|cid(?:es|al))|an(?:(?:i(?:um|c)|y|s|e))?|s))?|iatrics?|aniums?|und(?:ive)?|bils?)|t(?:(?:richquick|t(?:able|ing|er)|a(?:way|ble)|s))?|l(?:(?:atin(?:(?:ous|e))?|ignite|dings?|led|s))?|ar(?:(?:box(?:es)?|s(?:tick)?|ing|ed))?|m(?:(?:s(?:(?:tones?|bok))?|med|ini))?|ysers?|i(?:shas?|ger)|e(?:zer|ks?|se)|cko)|o(?:o(?:(?:d(?:(?:fornothings?|h(?:umoured(?:ly)?|ope)|n(?:atured(?:ly)?|ight|ess)|tempered|l(?:ooking|y)|byes?|will|i(?:sh|es)|s|y))?|se(?:(?:step(?:ping)?|berr(?:ies|y)))?|gl(?:ies|y)|f(?:(?:ing|ed|s|y))?|ey|ns?))?|vern(?:(?:or(?:s(?:hips?)?)?|ment(?:(?:al|s))?|e(?:ss(?:es)?|d)|ance|ing|s))?|b(?:b(?:l(?:e(?:(?:d(?:(?:egook|ygook))?|s|r))?|ing)|ets?)|etween|l(?:ins?|ets?)|i(?:es)?)|r(?:g(?:e(?:(?:ous(?:(?:ness|ly))?|s|d))?|ons?|ing)|i(?:llas?|e(?:st|r)|ng)|mless|dian|e(?:[ds])?|se|y)|a(?:l(?:(?:keep(?:ers?|ing)|s(?:cor(?:ers?|ing))?|mouth|posts?|less|ies))?|t(?:(?:s(?:kin)?|ees?))?|head|d(?:(?:ing|ed|s))?)|d(?:(?:f(?:orsaken|athers?)|l(?:ess(?:ness)?|i(?:ness|ke|er)|y)|parents|mothers?|dess(?:es)?|child|s(?:(?:ons?|end))?|head))?|n(?:orrhoea|dol(?:iers?|as?)|ads?|gs?|e)|l(?:d(?:(?:s(?:miths?)?|fish|en))?|gotha|l(?:iwog|y)|iath|f(?:(?:ing|ers?))?)|s(?:s(?:ip(?:(?:ing|ed|y|s))?|amer)|l(?:ings?|ows?)|pels?|h)|ggl(?:ing|e[sd])|u(?:r(?:m(?:and|ets?)|ds?)|lash|g(?:ing|e(?:[sd])?)|da|t)|phers?|i(?:tres?|ngs?)|wn(?:(?:ed|s))?|t(?:(?:ten|h(?:(?:ic|s))?))?|e(?:the|rs?|s)|fer)|y(?:naecolog(?:i(?:cal|sts?)|y)|r(?:o(?:(?:magnetic|scop(?:ic|es?)))?|at(?:i(?:ons?|ng)|e(?:[sd])?))|m(?:(?:nas(?:t(?:(?:ics?|s))?|i(?:ums?|a))|khana|s))?|ps(?:ies|um|y))|l(?:a(?:c(?:i(?:olog(?:i(?:cal|sts?)|y)|a(?:t(?:ions?|ed)|l(?:ly)?)|ers?)|e)|d(?:(?:i(?:ator(?:(?:ial|s))?|ol(?:us|i))|de(?:n(?:(?:ing|ed|s))?|st|r)|ness|ly|es?))?|s(?:s(?:(?:houses?|ie(?:st|r)|less|ware|ful|e[sd]|y))?|nost|gow)|mo(?:rous|ur)|n(?:d(?:(?:ular|s))?|c(?:ing|e(?:[sd])?)|s)|r(?:ing(?:ly)?|e(?:[sd])?)|uco(?:ma|us)|z(?:i(?:ers?|ng)|e(?:[srd])?))|o(?:b(?:(?:al(?:(?:isation|ly))?|e(?:(?:trott(?:ers|ing)|s|d))?|ul(?:ar|es?)|ose))?|r(?:i(?:f(?:i(?:cation|e[ds])|y(?:ing)?)|ous(?:ly)?|e[sd])|y(?:ing)?)|ss(?:(?:ar(?:ies|y)|i(?:e(?:st|r)|ly|ng)|e[sd]|y))?|om(?:(?:i(?:ness|e(?:st|r)|ly)|ful|y|s))?|w(?:(?:e(?:r(?:(?:ing|ed|s))?|d)|ing(?:ly)?|worms?|s))?|a(?:ming|t(?:(?:ing|ed))?)|ttal|ve(?:[sd])?)|e(?:e(?:ful(?:(?:ness|ly))?)?|a(?:n(?:(?:ings?|ed|s))?|m(?:(?:ing|ed|s))?)|be|n(?:[ns])?)|i(?:m(?:(?:mer(?:(?:ings?|ed|s))?|ps(?:ing|e(?:[ds])?)))?|t(?:ter(?:(?:ing|ed|s|y))?|zy)|sten(?:(?:ing|ed|s))?|b(?:(?:ness|ly))?|nt(?:(?:ing|ed|s))?|d(?:ing|e(?:(?:rs?|s|d))?)|a)|u(?:t(?:(?:t(?:on(?:(?:ous|s|y))?|ed)|amate|inous|en))?|e(?:(?:ing|d|s|y))?|cose|m(?:ly)?|ing|on)|y(?:c(?:er(?:ine|ol)|ine|ol)|phs?))|u(?:bernatorial|i(?:l(?:e(?:less(?:ness)?)?|l(?:otin(?:ing|e(?:[ds])?)|emots?)|t(?:(?:i(?:ness|e(?:st|r)|ly)|less|y|s))?|d(?:(?:ers?|s))?)|tar(?:(?:ists?|s))?|d(?:e(?:(?:lines?|books?|rs?|s|d))?|ance|ings?)|neas?|ses?)|a(?:r(?:ant(?:ee(?:(?:ing|s|d))?|ors?)|d(?:(?:i(?:an(?:s(?:hip)?)?|ng)|ed(?:(?:ness|ly))?|house|room|s(?:m(?:an|en))?))?)|camole|n(?:ine|aco|o)|vas?)|t(?:(?:t(?:e(?:r(?:(?:s(?:nipes?)?|ing|ed))?|d)|ural(?:ly)?|ing)|s(?:(?:ier|y))?|less))?|l(?:l(?:(?:i(?:b(?:ility|le)|es)|e(?:ys?|ts?)|s|y))?|p(?:(?:ing|ed|s))?|f(?:(?:war|s))?)|e(?:r(?:rillas?|illas?)|s(?:s(?:(?:able|work|ing|e[sd]))?|t(?:(?:ing|s))?))|n(?:(?:po(?:wder|int)|s(?:(?:miths?|h(?:ips?|ots?)|ight))?|boats?|fi(?:ght|res?)|m(?:e(?:tal|n)|an)|wales?|n(?:ing|e(?:r(?:[ys])?|d))|ite|k))?|ffaw(?:(?:ed|s))?|m(?:(?:bo(?:ils?|ots)|drops?|trees?|s(?:hoe)?|m(?:ing|ed)))?|r(?:gl(?:ing|e(?:[sd])?)|us?)|s(?:t(?:(?:i(?:e(?:st|r)|ng)|ed|o|s|y))?|h(?:(?:ing|e[srd]))?|set)|zzl(?:e(?:(?:rs?|d))?|ing)|pp(?:ies|y)|dgeon|ys?)|i(?:ant(?:(?:killers?|ess|ism|s))?|g(?:(?:a(?:ntic(?:ally)?|bytes|volt)|gl(?:ing|e(?:[sd])?|y)|olo))?|n(?:(?:g(?:er(?:(?:bread|ly|y|s))?|ivitis|ham)|s(?:eng)?))?|r(?:l(?:(?:friends?|i(?:sh(?:(?:ness|ly))?|e)|hood|s))?|affes?|d(?:(?:l(?:ing|e(?:[sd])?)|ing|e(?:rs?|d)))?|t(?:hs?)?|o)|b(?:b(?:e(?:r(?:(?:i(?:ng|sh)|ed))?|ts?)|o(?:us|ns?))|lets|e[ds])|dd(?:i(?:ness|e(?:st|r)|ly)|y)|l(?:t(?:(?:edged|s))?|d(?:ing|e(?:rs|d)|s)|l(?:(?:ie|s))?)|m(?:mick(?:(?:ry|s|y))?|crack|lets?)|ft(?:(?:ware|ing|ed|s))?|v(?:e(?:(?:away|rs?|n|s))?|ings?)|zzard|ps(?:ies|y)|st)|h(?:a(?:stl(?:i(?:ness|e(?:st|r))|y)|n(?:ian|a))|o(?:st(?:(?:l(?:i(?:e(?:st|r)|ke)|y)|ing|ed|s))?|ul(?:(?:ish|s))?)|e(?:rkins?|tto))|n(?:o(?:stic(?:ism)?|m(?:ic|es?))|a(?:rl(?:(?:ing|ed|s))?|sh(?:(?:ing|e[sd]))?|w(?:(?:ing|e(?:rs?|d)|s))?|ts?)|eiss|us?)|dansk)|v(?:i(?:deo(?:(?:conferencing|tap(?:ing|e(?:[ds])?)|phone|disc|ing|ed|s))?|c(?:e(?:(?:presiden(?:t(?:(?:ial|s))?|cy)|chancellors?|roys?|s))?|t(?:im(?:(?:is(?:ation|ing|e(?:[ds])?)|less|s))?|or(?:(?:i(?:ous(?:ly)?|es|a)|y|s))?|ual(?:ling|s))|i(?:ssitudes?|ous(?:(?:ness|ly))?|nit(?:ies|y))|ar(?:(?:ious(?:ly)?|ages?|s))?)|v(?:i(?:sect(?:ion(?:ists?)?|ed)|d(?:(?:ness|ly))?|fied)|a(?:ci(?:ous(?:ly)?|ty))?)|n(?:dic(?:tive(?:(?:ness|ly))?|at(?:i(?:on|ng)|e(?:[ds])?))|e(?:(?:yards?|gars?|s))?|t(?:ages?|ner)|yls?|o)|s(?:ual(?:(?:is(?:ation|ing|ed?)|ly|s))?|i(?:b(?:ilit(?:ies|y)|l[ye])|t(?:(?:a(?:tions?|ble|nt)|ors?|ing|ed|s))?|on(?:(?:ar(?:ies|y)|s))?)|co(?:s(?:ity|e)|u(?:nts?|s))|tas?|ors?|a(?:(?:ge|s))?|e)|b(?:ra(?:t(?:i(?:on(?:(?:al(?:ly)?|s))?|ng)|o(?:r(?:[ys])?)?|e(?:[sd])?)|n(?:t(?:ly)?|cy))|es)|t(?:uperat(?:i(?:ve|on)|e)|r(?:i(?:ol(?:ic)?|fied)|eous)|iat(?:ing|e(?:[sd])?)|a(?:mins?|l(?:(?:i(?:ty|se)|ly|s))?))|l(?:if(?:i(?:cation|ed)|y(?:ing)?)|la(?:(?:in(?:(?:ous|y|s))?|ge(?:(?:rs?|s))?|s))?|e(?:(?:ness|st|ly|r))?)|e(?:(?:w(?:(?:finders?|points?|ings?|able|e(?:rs?|d)|s))?|nna|d|r|s))?|g(?:il(?:(?:an(?:t(?:(?:es?|ly))?|ce)|s))?|o(?:rous(?:ly)?|ur)|nettes?)|ol(?:(?:a(?:(?:t(?:i(?:ons?|ng)|ors?|e(?:[sd])?)|s))?|i(?:n(?:(?:ists?|s))?|st)|e(?:n(?:t(?:ly)?|ce)|ts?)))?|r(?:tu(?:o(?:s(?:i(?:(?:ty|c))?|o)|us(?:ly)?)|al(?:ly)?|es?)|u(?:len(?:t(?:ly)?|ce)|s(?:es)?)|gi(?:n(?:(?:i(?:ty|a)|al|s))?|l)|ology|il(?:ity|e)|a(?:go|l))|a(?:(?:b(?:ility|l[ye])|ducts?|ls?))?|kings?|zier|xens?|pers?|ms?)|ul(?:nerab(?:ilit(?:ies|y)|le)|can(?:(?:ologist|is(?:ed?|m)))?|ga(?:r(?:(?:it(?:ies|y)|ly))?|te)|tures?|pine|va)|e(?:r(?:i(?:similitude|f(?:i(?:cations?|ab(?:ility|le)|e(?:rs?|s|d))|y(?:ing)?)|t(?:abl[ye]|ies|y)|ly)|s(?:i(?:fi(?:cation|er)|ons?|cle)|atil(?:ity|e)|us|e(?:[sd])?)|t(?:i(?:g(?:inous|o)|c(?:al(?:(?:ity|ly|s))?|es))|e(?:bra(?:(?:tes?|l|e))?|x))|b(?:(?:os(?:e(?:(?:ness|ly))?|ity)|a(?:l(?:(?:ise|ly|s))?|tim)|iage|s))?|n(?:a(?:cular|l)|ier)|mi(?:n(?:ous)?|lion)|d(?:i(?:gris|cts?)|ure|ant)|a(?:nda(?:(?:hs?|s))?|city)|g(?:ing|e(?:[srd])?)|ona|ve|y)|n(?:t(?:(?:r(?:i(?:loqu(?:is(?:ts?|m)|y)|c(?:ular|les?))|al(?:ly)?)|i(?:lat(?:ors?|i(?:on|ng)|ed?)|ngs?)|ur(?:e(?:(?:s(?:ome)?|r|d))?|ing)|ed|s))?|e(?:r(?:a(?:t(?:i(?:ng|on)|e(?:[sd])?)|ble)|eal)|tian|er(?:(?:ed|s))?)|ge(?:ful(?:ly)?|ance)|o(?:m(?:(?:ous(?:ly)?|s))?|us|se)|d(?:(?:e(?:ttas?|rs)|ors?|ing|s))?|al(?:ity)?|i(?:son|ce|al)|u(?:es?|s))|g(?:(?:et(?:a(?:rian(?:(?:ism|s))?|t(?:i(?:on(?:al)?|ng|ve)|ed?)|bles?)|ive)|gies|ans?))?|ctor(?:(?:i(?:s(?:ation|ed)|ng)|ed|s))?|h(?:emen(?:t(?:ly)?|ce)|ic(?:ular|les?))|l(?:o(?:ci(?:pede|t(?:ies|y))|drome|ur)|vet(?:(?:eens?|y|s))?|lum|um|dt?|ar)|s(?:t(?:(?:i(?:bul(?:ar|es?)|g(?:ial|es?)|ng)|ments?|ry|ed|al|s))?|ic(?:ular|les?)|uvius|sels?|pers)|t(?:(?:er(?:inary|ans?)|t(?:ing|ed)|o(?:(?:ing|ed))?|s))?|x(?:(?:atio(?:us|ns?)|ing|e[sd]))?|i(?:l(?:(?:ing|ed|s))?|n(?:(?:ed|s))?)|er(?:(?:ing|ed|s))?|al)|o(?:l(?:u(?:ptuous(?:(?:ness|ly))?|nt(?:eer(?:(?:ing|ed|s))?|ar(?:ily|y))|b(?:ility|l[ye])|m(?:e(?:(?:tric|s))?|inous)|te)|can(?:i(?:c(?:ally)?|sm)|o)|atil(?:ity|es?)|ley(?:(?:ball|ing|ed|s))?|t(?:(?:meter|ages?|s))?|ition|ga|es?)|c(?:a(?:l(?:(?:is(?:ations?|ing|ts?|ed?)|ly|s))?|ti(?:on(?:(?:al(?:ly)?|s))?|ve)|bular(?:ies|y))|iferous(?:ly)?)|y(?:eur(?:(?:is(?:tic|m)|s))?|ag(?:ing|e(?:(?:rs?|s|d))?))|uch(?:(?:saf(?:ing|ed?)|e(?:rs?|s|d)))?|r(?:aci(?:ous(?:ly)?|ty)|t(?:ic(?:ity|es)|ex(?:es)?))|i(?:c(?:e(?:(?:less|s|d))?|ings?)|d(?:(?:able|ing|ed|s))?|le)|t(?:e(?:(?:less|rs?|s|d))?|i(?:ve|ng))|mit(?:(?:ing|ed|s))?|w(?:(?:ing|e(?:ls?|d)|s))?|odoo|gue|dka)|a(?:l(?:u(?:e(?:(?:formoney|added|less|rs?|s|d))?|a(?:tions?|bles?)|ing|ta)|e(?:(?:dict(?:ory|ion)|n(?:tine|c(?:ies|y|e))|ts?|s))?|i(?:d(?:(?:at(?:i(?:ng|on)|e(?:[sd])?)|ity|ly))?|ant(?:ly)?|se)|halla|leys?|ance|ves?|our)|p(?:o(?:r(?:is(?:ation|ing|ed?)|ous)|urs?)|id)|in(?:(?:glor(?:ious|y)|e(?:st|r)|ly))?|c(?:illat(?:i(?:ons?|ng)|e)|cin(?:at(?:i(?:ons?|ng)|ed?)|es?)|u(?:o(?:us(?:ly)?|les?)|ums?|ity|a)|a(?:t(?:i(?:ons?|ng)|e(?:[sd])?)|n(?:c(?:ies|y)|t(?:ly)?)))|s(?:e(?:(?:ctom(?:ies|y)|line|s))?|sal(?:(?:age|s))?|t(?:(?:ness|ly|er))?|cular)|r(?:i(?:a(?:t(?:ion(?:(?:al|s))?|es?)|b(?:ility|l(?:es?|y))|n(?:ces?|ts?))|e(?:gated|t(?:ies|al|y)|s|d)|ous(?:ly)?|cose)|nish(?:(?:ing|e[sd]))?|y(?:ing)?|sity)|n(?:(?:quish(?:(?:ing|ed))?|i(?:sh(?:(?:ing(?:ly)?|e[sd]))?|t(?:ies|y)|lla)|dal(?:(?:is(?:ing|ed?|m)|s))?|g(?:uard|ogh)|adium|tage|e(?:[sd])?|s))?|g(?:ue(?:(?:ness|st|ly|r))?|abonds?|ran(?:ts?|cy))|u(?:nt(?:ing|ed)|lt(?:(?:ing|ed|s))?)|mp(?:(?:i(?:res?|ng)|e[rd]|s))?|t(?:(?:ican|s))?|duz)|ying)|n(?:e(?:u(?:r(?:o(?:t(?:ransmitters?|ic(?:(?:ally|s))?)|s(?:cien(?:tists|ce)|urge(?:ons?|ry)|es|is)|physiology|log(?:i(?:cal(?:ly)?|sts?)|y)|biology|n(?:(?:al|es?|s))?)|al(?:gia)?)|t(?:r(?:al(?:(?:i(?:s(?:ation|ing|e(?:[srd])?|m|t)|ty)|ly|s))?|ino|ons?)|er(?:(?:ing|ed|s))?))|i(?:gh(?:(?:bour(?:(?:l(?:iness|y)|hoods?|ing|s))?|ing|ed))?|ther)|r(?:v(?:e(?:(?:less(?:ness)?|s))?|ous(?:(?:ness|ly))?|y)|ds?)|g(?:l(?:ig(?:ib(?:ility|l[ey])|e(?:n(?:t(?:ly)?|ce)|es?))|ect(?:(?:ful|ing|ed|s))?)|otia(?:t(?:i(?:ons?|ng)|ors?|e(?:[ds])?)|ble)|at(?:i(?:v(?:e(?:(?:ness|ly|s))?|i(?:sm|ty))|ons?|ng)|e(?:[sd])?)|roid|ev)|c(?:ro(?:p(?:hilia(?:cs?)?|olis|sy)|man(?:c(?:ers?|y)|tic)|sis|tic)|ess(?:it(?:at(?:ing|e(?:[sd])?)|ies|y)|ar(?:i(?:ly|es)|y))|tar(?:(?:ines|s))?|k(?:(?:l(?:aces?|ines?)|band|tie|ing|ed|s))?)|bul(?:o(?:us(?:(?:ness|ly))?|sity)|a(?:[sre])?)|w(?:(?:s(?:(?:p(?:aper(?:(?:men|s))?|rint)|r(?:e(?:aders?|els?)|oom)|letters?|flash(?:es)?|cast(?:ers)?|agents?|stands?|worthy|m(?:en|an)|boy|y))?|f(?:angled|ound)|comers?|l(?:y(?:weds?)?|ook)|ness|born|t(?:(?:on|s))?|ish|e(?:st|r)))?|ver(?:(?:theless|ending))?|e(?:d(?:(?:l(?:e(?:(?:craft|s(?:s(?:ly)?)?|work|d))?|ing)|i(?:n(?:ess|g)|e(?:st|r))|ful|ed|y|s))?)?|a(?:r(?:(?:s(?:i(?:ghted|de))?|ness|ing|e(?:st|r|d)|ly|by))?|t(?:(?:e(?:n(?:(?:ing|s))?|st|r)|ness|ly))?)|o(?:l(?:ogisms?|ithic)|p(?:hytes?|lasms?|rene)|n(?:at(?:al|es?))?)|t(?:(?:her(?:most)?|work(?:(?:ing|ed|s))?|t(?:(?:le(?:[sd])?|ing|ed|s))?|ball|s))?|m(?:atodes?|esis)|p(?:h(?:ritis|ews?)|tun(?:ium|e)|otism|al)|st(?:(?:able|l(?:ing|e(?:[sd])?)|ing|e(?:gg|d)|s))?|xt)|a(?:t(?:i(?:on(?:(?:al(?:(?:i(?:s(?:ations?|ing|t(?:(?:ic|s))?|ed?|m)|t(?:ies|y))|ly|s))?|hood|wide|s))?|v(?:ity|es?))|ur(?:al(?:(?:is(?:ation|t(?:(?:ic|s))?|ed?|m)|ness|ly))?|ists?|es?)|tering|al|o)|r(?:r(?:ow(?:(?:minded(?:ness)?|ness|e(?:st|d|r)|ing|ly|s))?|at(?:o(?:logy|rs?)|i(?:ons?|ves?|ng)|e(?:[ds])?))|c(?:issis(?:tic|m)|o(?:leptic|tics?|sis))|whal)|n(?:o(?:technology|seconds?|metres?)|n(?:ies|y))|v(?:i(?:ga(?:t(?:i(?:on(?:al)?|ng)|ors?|ed?)|ble)|es)|v(?:ies|y)|e(?:ls?)?|al|y)|u(?:se(?:ous(?:ness)?|a(?:t(?:ing(?:ly)?|e(?:[ds])?))?)|ght(?:(?:i(?:ness|est|ly)|y|s))?|ti(?:cal|l(?:us|i)))|m(?:e(?:(?:d(?:ropping)?|calling|plates?|s(?:akes?)?|able|l(?:ess|y)))?|i(?:bian?|ngs?))|s(?:t(?:urtiums?|i(?:ness|e(?:st|r)|ly)|y)|al(?:(?:ised|ly))?|cent)|i(?:l(?:(?:biting|ing|ed|s))?|ve(?:(?:t[ye]|ly))?|robi|ads?)|ked(?:(?:ness|ly))?|g(?:(?:asaki|g(?:ing|e[rd])|s))?|p(?:(?:oleon|p(?:i(?:ng|es)|ed|y)|kins?|htha|les|alm|s|e))?|zi(?:(?:ism|sm?))?|b(?:(?:bed|s))?|omi|dir|y)|o(?:n(?:(?:p(?:a(?:rticipation|yment)|lussed)|inter(?:vention|ference)|c(?:onformi(?:sts?|ty)|halan(?:t(?:ly)?|ce))|functional|e(?:(?:ssentials?|xisten(?:ce|t)|theless|ntit(?:ies|y)|vent))?|believers?|violen(?:ce|t)|s(?:ens(?:ical|es?)|mok(?:ers?|ing))|drinkers))?|t(?:(?:withstanding|i(?:f(?:i(?:cations?|able|e[ds])|y(?:ing)?)|c(?:e(?:(?:boards?|abl[ey]|s|d))?|ing)|on(?:(?:al(?:ly)?|s))?|ng)|a(?:tion(?:(?:al(?:ly)?|s))?|bl(?:es?|y)|r(?:ies|y))|ori(?:ous(?:ly)?|ety)|hing(?:(?:ness|s))?|e(?:(?:worthy|books?|pa(?:per|ds?)|s|d))?|ch(?:(?:ing|e[sd]))?))?|r(?:(?:m(?:(?:a(?:l(?:(?:i(?:s(?:a(?:tions?|ble)|ing|e(?:(?:rs?|d|s))?)|ty)|cy|ly|s))?|tive|n(?:(?:dy|s))?)|ed|s))?|adrenaline?|th(?:(?:er(?:n(?:(?:most|ers?))?|ly)|bound|wards?|men))?|semen|way|dic))?|s(?:t(?:algi(?:c(?:ally)?|a)|r(?:ils?|um))|e(?:(?:d(?:ive)?|y|s))?|i(?:n(?:ess|g)|e(?:st|r)|ly)|y)|m(?:enclatures?|in(?:a(?:t(?:i(?:ons?|ng|ve)|e(?:[ds])?|or)|l(?:ly)?)|ees?)|ad(?:(?:ic|s))?)|is(?:e(?:(?:less(?:ly)?|s))?|i(?:ness|e(?:st|r)|ly)|ome|y)|ctu(?:rn(?:al(?:ly)?|es?)|ids)|xious(?:(?:ness|ly))?|u(?:rish(?:(?:ment|ing|e[ds]))?|g(?:hts?|ats?)|n(?:(?:al|s))?)|v(?:e(?:l(?:(?:ist(?:(?:ic|s))?|ette|t(?:ies|y)|le|s))?|mber)|ices?)|b(?:l(?:e(?:(?:ness|m(?:an|en)|st?|r))?|y)|ility|od(?:ies|y))|o(?:n(?:(?:tide|day|s))?|dles?|se(?:[sd])?|ks?)|w(?:(?:adays|here))?|zzles?|gging?|d(?:(?:ul(?:e(?:[sd])?|ar)|d(?:ing|le|ed|y)|es?|al|s))?|how|el|ah)|i(?:t(?:(?:r(?:o(?:g(?:lycerine|en(?:ous)?)|us)|ates?|ic)|picking|wit|s))?|g(?:h(?:t(?:(?:w(?:atchman|ear)|i(?:ngales?|es?)|dress(?:es)?|c(?:l(?:othes|ubs?)|aps?)|mar(?:ish|es?)|fall|gown|l(?:ife|y)|s))?)?|g(?:ardly|l(?:ing|e(?:[sd])?))|er(?:ia)?)|hilis(?:t(?:ic)?|m)|mb(?:l(?:e(?:ness)?|y)|us)|n(?:compoop|e(?:(?:t(?:een(?:th)?|ie(?:th|s)|y)|fold|veh|s))?|ths?|ny)|c(?:k(?:(?:name(?:[ds])?|ing|e[ld]|s))?|e(?:(?:ness|t(?:ies|y)|st|ly|r))?|otine|hes?)|b(?:(?:bl(?:e(?:(?:rs?|s|d))?|ing)|s))?|rvana|p(?:(?:p(?:les?|ing|on|e[rd])|s))?|ft(?:ily|y)|agara|eces?|xon|l(?:[se])?)|u(?:t(?:(?:ri(?:ti(?:o(?:n(?:(?:ists?|al(?:ly)?))?|us)|ve)|ents?|ment)|crackers?|ation|s(?:hell)?|t(?:ier|y)|megs?))?|m(?:er(?:o(?:log(?:i(?:sts?|cal)|y)|us)|ic(?:al(?:ly)?)?|a(?:t(?:ors?|e)|cy|ls?))|ismatics?|b(?:(?:e(?:r(?:(?:plate|ings?|less|ed|s))?|d)|ing(?:ly)?|s(?:kull)?|ness|ly))?|skull)|ll(?:(?:i(?:f(?:i(?:cation|e[ds])|y(?:ing)?)|ty)|s))?|r(?:s(?:e(?:(?:maids?|r(?:y(?:m(?:an|en))?|ies)|s|d))?|ing)|tur(?:ing|e(?:[ds])?))|isances?|n(?:(?:ner(?:ies|y)|s))?|d(?:e(?:(?:ness|s))?|i(?:t(?:ies|y)|s(?:ts?|m))|g(?:ing|e(?:[sd])?))|ptials?|zzl(?:ing|e(?:[sd])?)|ggets?|cle(?:us|ic?|ar)|ances?|ke)|y(?:mph(?:(?:o(?:maniac?|lepsy)|s))?|lons?|ala)|debele|g(?:unis?|oing))|l(?:e(?:x(?:ic(?:o(?:graph(?:ic(?:al(?:ly)?)?|ers?|y)|ns?)|al(?:ly)?)|emes?)|g(?:(?:i(?:tim(?:is(?:ation|ing|ed?)|a(?:t(?:i(?:on|ng)|e(?:(?:ly|d))?)|cy))|slat(?:i(?:ve(?:ly)?|on|ng)|ures?|ors?|ed?)|on(?:(?:naires|ar(?:ies|y)|s))?|b(?:ility|l[ye]))|a(?:l(?:(?:i(?:s(?:ation|ing|tic|ed?|m)|t(?:ies|y))|ese|ly))?|c(?:ies|y)|t(?:e(?:(?:es?|s))?|ion|or?))|e(?:rdemain|nd(?:(?:ary|s))?)|um(?:inous|es?)|g(?:ings?|ed|y)|horns?|work|room|less|man|s))?|ft(?:(?:hande(?:d(?:(?:ness|ly))?|rs?)|overs?|wards?|i(?:s(?:ts?|h)|es)|most|y|s))?|t(?:(?:ha(?:rg(?:ic(?:ally)?|y)|l(?:(?:ity|ly))?)|t(?:er(?:(?:writer|press|heads?|box(?:es)?|ing|ed|s))?|i(?:ngs?|sh)|uces?)|s))?|c(?:her(?:(?:ous(?:ness)?|y))?|t(?:ur(?:e(?:(?:s(?:hips?)?|rs?|d))?|ing)|ors?|ern))|a(?:(?:s(?:e(?:(?:hold(?:ers?)?|s|d))?|h(?:(?:ing|e[sd]))?|ing|t)|p(?:(?:frog(?:ging)?|year|ing|e[rd]|t|s))?|d(?:(?:e(?:r(?:(?:s(?:hips?)?|less))?|n|d)|free|ing|s))?|f(?:(?:i(?:n(?:ess|g)|e(?:st|r))|le(?:ss|ts?)|ed|y))?|k(?:(?:i(?:n(?:ess|g)|e(?:st|r))|ages?|ed|y|s))?|rn(?:(?:able|e(?:d(?:ly)?|rs?)|ing|t|s))?|v(?:e(?:(?:n(?:(?:ing|ed))?|rs?|s|d))?|ings?)|ch(?:(?:ing|e[sd]))?|n(?:(?:ings?|ness|e(?:st|r|d)|t|s))?|t(?:her(?:[sy])?)?|gues?))?|v(?:e(?:l(?:(?:headed|l(?:ing|e[dr]|y)|s))?|r(?:(?:aged?|ing|ed|s))?)|i(?:(?:t(?:at(?:i(?:ng|on)|e(?:[ds])?)|y)|athan|e[sd]))?|y(?:ing)?)|p(?:r(?:echauns?|o(?:us|s[ye]))|tons?|ers?)|o(?:pard(?:s(?:kin)?)?|n(?:ardo|e)|tards?)|n(?:gth(?:(?:en(?:(?:ing|ed|s))?|i(?:e(?:st|r)|ly)|w(?:ays|ise)|y|s))?|i(?:en(?:t(?:ly)?|cy)|n)|t(?:(?:ils?|o))?|s(?:(?:ing|es))?|d(?:(?:ing|ers?|s))?)|i(?:sure(?:(?:wear|ly|d))?|tmoti(?:fs?|vs?)|pzig)|b(?:ensraum|anon)|s(?:bian(?:(?:ism|s))?|s(?:(?:e(?:n(?:(?:ing|ed|s))?|es?|r)|o(?:rs?|ns?)))?|otho|ions?|t)|e(?:(?:r(?:(?:ing(?:ly)?|ed|s))?|ch(?:(?:ing|es))?|wa(?:rd|y)|ks?|ds|s))?|u(?:k(?:aemia|emia)|cine)|m(?:m(?:ings?|as?)|on(?:(?:ade|s))?|urs?)|wd(?:ness)?|d(?:ge(?:(?:rs?|s))?)?|yden)|i(?:g(?:ht(?:(?:h(?:ea(?:rted(?:(?:ness|ly))?|ded(?:ness)?)|ouses?)|weights?|e(?:n(?:(?:ing|ed|s))?|rs?|st|d)|l(?:ess|y)|n(?:ess|ing)|s(?:hip)?|ing))?|a(?:tur(?:ing|e(?:[ds])?)|ments?|nds?)|nite)|f(?:e(?:(?:t(?:hreatening|aking|imes?)|l(?:ess(?:(?:ness|ly))?|i(?:nes?|ke)|ong)|anddeath|b(?:oat(?:(?:men|s))?|lood|elt)|g(?:iving|uards?)|s(?:aving|tyles?|ized?|pans?)|forms|rafts?|work))?|t(?:(?:off|m(?:en|an)|ing|e(?:rs?|d)|s))?)|n(?:g(?:u(?:ist(?:(?:ic(?:(?:ally|s))?|s))?|al?)|er(?:(?:i(?:ng(?:ly)?|e)|e[dr]|s))?)|e(?:(?:a(?:ments|r(?:(?:i(?:sed|ty)|ly))?|ges?|lly)|feed|outs?|s(?:m(?:an|en))?|ups?|m(?:en|an)|rs?|ns?|d))?|i(?:ments?|ngs?)|c(?:hpin|oln)|k(?:(?:a(?:ble|ges?)|ups?|ing|e(?:rs?|d)|s))?|o(?:leum)?|t(?:els?)?|seed|nets?|den|age|y)|c(?:e(?:n(?:ti(?:ous(?:ness)?|ate)|s(?:e(?:(?:es?|d|s))?|ing)|ces?))?|k(?:(?:e(?:rish|d)|ing|s))?|h(?:e(?:n(?:(?:ed|s))?|e)|is?)|orice)|b(?:e(?:r(?:t(?:arian(?:(?:ism|s))?|i(?:nes?|es)|y)|a(?:t(?:i(?:on(?:ists)?|ng)|ors?|e(?:[ds])?)|l(?:(?:i(?:s(?:ation|ing|ed?|m)|ty)|ly|s))?)|ia|o)|l(?:(?:l(?:ing|ous|e[dr])|e[rd]|s))?)|r(?:a(?:r(?:i(?:an(?:s(?:hip)?)?|es)|y)|te(?:[ds])?)|ett(?:i(?:sts?)?|o))|id(?:inous|o)|ations?|ya(?:ns?)?)|t(?:(?:ig(?:ious(?:ness)?|a(?:t(?:i(?:ng|on)|e)|nts?))|h(?:o(?:log(?:i(?:cal|es)|y)|graph(?:(?:ic|y|s))?|sphere)|ium|e(?:ly)?)|era(?:l(?:(?:is(?:tic|m)|ly|s))?|t(?:ures?|e|i)|cy|ry)|t(?:le(?:(?:ness|st|r))?|er(?:(?:ing|ed|s))?|oral)|urg(?:i(?:cal|es)|y)|an(?:ies|y)|otes|res?|mus|chi))?|s(?:t(?:(?:less(?:(?:ness|ly))?|e(?:n(?:(?:e(?:rs?|d)|ing|s))?|ria|d)|ings?|s))?|som(?:(?:e(?:ness)?|ness))?|p(?:(?:ing|ed|s))?|bon)|qu(?:i(?:d(?:(?:at(?:i(?:ons?|ng)|ors?|ed?)|i(?:s(?:ing|e(?:[dr])?)|ty)|s))?|fy)|e(?:f(?:action|ied|y)|urs?)|or(?:(?:i(?:ce|sh)|s))?)|v(?:e(?:(?:l(?:i(?:hoods?|ness|e(?:st|r))|y)|r(?:(?:worts|i(?:e[ds]|sh)|y|s))?|s(?:tock)?|able|n(?:(?:ing|ed|s))?|wire|d))?|i(?:ngs?|d(?:ly)?)|able)|m(?:i(?:t(?:(?:ations?|less|e(?:rs?|d)|ing|s))?|n(?:al|g))|e(?:(?:s(?:tones?)?|light|ricks?|kiln|ys))?|o(?:usin(?:es?)?)?|b(?:(?:er(?:(?:ing|s))?|less|s|o))?|p(?:(?:opo|i(?:ng|d)|e(?:ts?|d)|ly|s))?|a)|l(?:y(?:(?:livered|white))?|liput(?:ian)?|ongwe|t(?:ing)?|ies|acs?)|k(?:e(?:(?:ab(?:ility|le)|l(?:i(?:hood|e(?:st|r))|y)|minded|n(?:(?:e(?:ss(?:es)?|d)|ing|s))?|wise|s|d))?|ings?|able)|e(?:(?:u(?:tenan(?:ts?|cy))?|d(?:er)?|ns?|s))?|a(?:b(?:ilit(?:ies|y)|le)|is(?:ing|ons?|e(?:[sd])?)|rs?)|p(?:(?:read(?:ing)?|s(?:(?:ervice|ticks?))?|ped|ids?|ase))?|on(?:(?:ess(?:es)?|ised?|s))?|zards?|d(?:(?:less|ded|o|s))?|r[ae])|a(?:b(?:(?:o(?:ur(?:(?:in(?:tensive|g)|s(?:aving)?|e(?:rs?|d)))?|r(?:ious(?:(?:ness|ly))?|ator(?:ies|y)))|yrinth(?:(?:ine|s))?|el(?:(?:l(?:ings?|ed)|s))?|urnum|i(?:a(?:ls?)?|um|le)|s))?|t(?:e(?:(?:r(?:al(?:(?:isation|ly|s))?)?|comers?|n(?:c(?:ies|y)|ess|t)|st|ly|x))?|i(?:tud(?:inal|es?)|ces|no?)|ch(?:(?:ing|e[sd]))?|h(?:(?:e(?:(?:r(?:(?:ed|s))?|s))?|s))?|rines?|t(?:ice(?:[ds])?|er)|vian?)|s(?:(?:civious(?:(?:ness|ly))?|s(?:(?:i(?:tude|es?)|o(?:(?:ing|ed))?|es))?|h(?:(?:ings?|e(?:rs|s|d)))?|t(?:(?:ing|ly|ed|s))?|agne|ing|e(?:rs?)?))?|c(?:k(?:(?:adaisical|lustre|ing|e(?:ys?|d)|s))?|onic(?:ally)?|e(?:(?:rat(?:i(?:ons?|ng)|ed?)|work|s|d))?|h(?:rym(?:ose|al)|es)|quer(?:(?:ed|s))?|t(?:at(?:ion|e)|ose|eal|ic)|rosse|una(?:[se])?|i(?:ngs?|er)|s|y)|u(?:n(?:d(?:er(?:(?:e(?:ttes?|d)|ing))?|r(?:e(?:ttes?|ss)|ies|y))|ch(?:(?:e(?:rs?|d|s)|ing))?)|gh(?:(?:ing(?:ly)?|abl[ey]|ter|e[rd]|s))?|d(?:(?:a(?:tory|ble)|ing|e(?:rs|d)|s))?|re(?:ate|ls?))|n(?:gu(?:or(?:ous(?:ly)?)?|i(?:sh(?:(?:ing|e[ds]))?|d(?:ly)?)|ages?)|d(?:(?:hold(?:ings?|ers)|s(?:(?:cap(?:ing|e(?:[ds])?)|li(?:des?|ps?)|ide))?|l(?:ad(?:ies|y)|o(?:cked|rds?)|ines|ess)|own(?:ers?|ing)|f(?:orms?|all|ill)|m(?:a(?:rks?|ss|n)|ine)|ings?|ward|e[rd]))?|c(?:e(?:(?:lot|ts?|rs?|s|d))?|ing)|k(?:(?:ie(?:st|r)|y))?|terns?|yard|olin|es?)|m(?:(?:e(?:(?:n(?:t(?:(?:a(?:tions?|bl[ey])|ing|e[dr]|s))?|ess)|st|ly|d))?|p(?:(?:li(?:ght(?:er)?|t)|oon(?:(?:e(?:ry|d)|ing|s))?|s(?:hades?)?|posts?|reys?))?|b(?:(?:ast(?:ing|ed)|s(?:(?:wool|kin))?|ing|ent|da))?|ina(?:(?:t(?:ion|e(?:[ds])?)|r))?|as?))?|i(?:ssezfaire|r(?:(?:ds?|s))?|ty|d|n)|w(?:(?:less(?:ness)?|break(?:ing|ers?)|abiding|ful(?:(?:ness|ly))?|n(?:(?:mowers?|s))?|m(?:a(?:kers?|n)|en)|s(?:uits?)?|yers?))?|r(?:yn(?:g(?:itis|eal)|x(?:es)?)|g(?:e(?:(?:ness|st|ly|r))?|ish|o)|k(?:(?:ing|s))?|d(?:(?:ers?|s))?|c(?:h(?:es)?|eny)|va(?:[le])?)|v(?:a(?:(?:tor(?:i(?:al|es)|y)|s))?|ish(?:(?:ness|ing|e[ds]|ly))?|ender)|d(?:(?:y(?:(?:b(?:irds?|ug)|ships?|like))?|d(?:er(?:(?:ed|s))?|ies?)|l(?:ing|e(?:[sd])?)|i(?:ng|es)|en?|s))?|x(?:(?:atives?|ness|ity|er))?|y(?:(?:abouts?|person|er(?:(?:ing|ed|s))?|o(?:uts?|ffs?)|m(?:en|an)|ing|bys?|s))?|z(?:y(?:bones)?|i(?:n(?:ess|g)|e(?:st|r)|ly)|ar(?:us|et)|uli|ed?)|g(?:(?:g(?:ards?|ing|ed)|o(?:ons?|s)|une|ers?|s))?|ke(?:s(?:ide)?)?|p(?:(?:idary|wings?|tops?|s(?:(?:ing|e(?:[sd])?))?|p(?:(?:ing|ed))?|land|dogs?|ful|els?))?|ager|os)|o(?:g(?:(?:a(?:rithm(?:(?:ic(?:ally)?|s))?|nberr(?:ies|y))|i(?:stic(?:(?:al(?:ly)?|s))?|c(?:(?:al(?:(?:ity|ly))?|ians?|s))?)|g(?:e(?:r(?:(?:heads|s))?|d)|ing)|books?|o(?:(?:ff|s))?|jam|s))?|o(?:(?:k(?:(?:ing(?:glass(?:es)?)?|alikes?|outs?|e(?:rs?|d)|s))?|p(?:(?:holes?|ing|ed|y|s))?|s(?:e(?:(?:n(?:(?:e(?:ss|d)|ing|s))?|st?|ly|r|d))?|ing)|t(?:(?:ing|e(?:rs?|d)|s))?|m(?:(?:ing|ed|s))?|n(?:(?:ey|y))?))?|n(?:g(?:(?:winded(?:ness)?|i(?:tud(?:inal(?:ly)?|es?)|ng(?:(?:ly|s))?|sh)|s(?:(?:uffering|tanding))?|l(?:asting|ived|ost)|awaited|e(?:vity|st|r|d)|faced|hand))?|e(?:(?:some(?:ness)?|l(?:i(?:ness|e(?:st|r))|y)|rs?))?|don(?:er)?)|c(?:a(?:l(?:(?:i(?:s(?:ations?|ing|e(?:[ds])?)|t(?:ies|y))|ly|es?|s))?|t(?:i(?:on(?:(?:al|s))?|ng|ve)|able|ors?|e(?:[sd])?))|o(?:mot(?:i(?:ves?|on)|e))?|k(?:(?:s(?:mith)?|a(?:ble|ge)|outs?|jaw|ing|e(?:rs?|t|d)))?|h(?:(?:ness|s))?|us(?:ts?)?|i)|a(?:th(?:(?:some(?:(?:ness|ly))?|ing|e(?:[sd])?))?|n(?:(?:words?|able|ing|e[rd]|s))?|d(?:(?:able|ings?|e(?:rs?|d)|s))?|f(?:(?:ing|e(?:rs?|d)|s))?|ves|m(?:[ys])?)|u(?:d(?:(?:speakers?|mouthed|hailers?|ness|e(?:st|r)|ly))?|t(?:(?:ish(?:ness)?|s))?|ng(?:e(?:(?:rs?|s|d))?|ing)|s(?:i(?:est|ly)|y|e)|v(?:re(?:[sd])?|ers?)|che|is)|b(?:(?:otom(?:i(?:s(?:ing|ed|t)|es)|y)|b(?:y(?:i(?:sts?|ng))?|i(?:ng|e[sd])|ed)|s(?:ters?)?|ular|e(?:(?:lia|s|d))?))?|w(?:(?:s(?:pirited)?|l(?:and(?:(?:ers|s))?|ie(?:st|r)|y(?:ing)?)|pitched|e(?:r(?:(?:case|ing|ed|s))?|st)|ness|key|i(?:sh|ng)))?|p(?:(?:sided(?:ly)?|p(?:ing|e(?:rs?|d))|ing|e(?:[sd])?))?|quaci(?:ous|ty)|r(?:r(?:y(?:loads?)?|ies)|d(?:(?:s(?:hips?)?|ing|ly))?|e(?:lei)?)|v(?:e(?:(?:l(?:i(?:ness|e(?:st?|r))|ess|orn|y)|making|s(?:(?:truck|ick))?|birds|able|rs?|d))?|ing(?:ly)?|able)|d(?:e(?:st(?:one|ar))?|g(?:e(?:(?:ment|rs?|s|d))?|ings?))|ft(?:(?:i(?:ness|e(?:st|r)|ly)|ed|y|s))?|i(?:n(?:(?:cloth|s))?|ter(?:(?:e(?:rs?|d)|ing|s))?|re)|ll(?:(?:i(?:pops?|ng|es)|ed|y))?|t(?:(?:t(?:er(?:ies|y)|o)|ions?|us|h|s))?|yal(?:(?:ists?|t(?:ies|y)|ly))?|zenges?|s(?:ings?|able|s(?:es)?|e(?:(?:rs?|s))?|t)|ess)|u(?:d(?:icrous(?:(?:ness|ly))?|o)|m(?:in(?:o(?:sit(?:ies|y)|us(?:ly)?)|escen(?:ce|t)|a(?:r(?:ies|y)|nce|l))|b(?:er(?:(?:jacks?|ing|ed|s))?|a(?:go|r))|p(?:(?:i(?:n(?:ess|g)|e(?:st|r)|sh)|e[nd]|y|s))?|en)|g(?:(?:ubrious(?:ly)?|g(?:ing|age|ed)|s))?|b(?:ric(?:a(?:t(?:i(?:on|ng)|e(?:[ds])?)|nts?)|ious)|bers?)|x(?:(?:ur(?:i(?:ous(?:ly)?|a(?:t(?:ing|e)|n(?:t(?:ly)?|ce))|es)|y)|or))?|n(?:ch(?:(?:times?|e(?:ons?|rs|s|d)|pack|ing))?|a(?:(?:c(?:ies|y)|t(?:ics?|e)|r))?|g(?:(?:f(?:ish|uls?)|ing|e(?:[sd])?|s))?|e)|s(?:cious(?:ly)?|t(?:(?:r(?:e(?:less)?|ous)|ful(?:ly)?|i(?:e(?:st|r)|ng|ly)|ed|y|s))?|h(?:(?:ness|e(?:st|r)))?|aka)|c(?:r(?:ative|e)|i(?:d(?:(?:ity|ly))?|fer)|k(?:(?:i(?:e(?:st|r)|ly)|less|y))?)|l(?:l(?:(?:ab(?:ies|y)|ing|ed|s))?|u)|ke(?:warm)?|r(?:(?:ch(?:(?:e(?:rs|s|d)|ing))?|k(?:(?:ing|e(?:rs?|d)|s))?|i(?:d(?:ly)?|ng)|e(?:[xsd])?))?|pin(?:(?:es|s))?|t(?:her|es?)|anda)|y(?:mph(?:(?:o(?:cyt(?:ic|es?)|mas?|id)|atic))?|r(?:i(?:c(?:(?:al(?:ly)?|is(?:ts?|m)|s))?|st)|es?|a)|n(?:ch(?:(?:ing|pin|e[sd]))?|x(?:es)?)|chees?|sine|ons?|ing|e)|l(?:amas?|s))|q(?:u(?:i(?:n(?:t(?:e(?:ssen(?:tial(?:ly)?|ce)|ts?)|i(?:llion|c)|uple)|ce(?:(?:ntenary|s))?|quennial|ine)|c(?:k(?:(?:s(?:ilver|ands?)|witted|e(?:n(?:(?:ing|ed|s))?|st|r)|ness|l(?:ime|y)))?|hes?)|ver(?:(?:ing(?:ly)?|ed|s))?|z(?:z(?:i(?:cal(?:ly)?|ng)|e[ds]))?|r(?:k(?:(?:i(?:ness|e(?:st|r))|s|y))?|e)|e(?:t(?:(?:e(?:n(?:(?:ing|ed|s))?|st|d|r)|ness|ing|ly|us|s))?|sce(?:(?:n(?:ce|t)|d))?)|bbl(?:ing|es?)|xotic|t(?:(?:t(?:ing|e[dr])|e|s))?|sling|l(?:t(?:(?:ing|ed|s))?|ls?)|p(?:(?:pe[dr]|s))?|ds?|ff)|a(?:(?:dr(?:i(?:l(?:aterals?|les?)|partite)|a(?:t(?:ic(?:(?:ally|s))?|ures?)|n(?:g(?:ular|les?)|ts?))|up(?:l(?:i(?:cate|ng)|e(?:(?:ts|s|d))?|y)|ole|eds?)|ophonic)|l(?:i(?:f(?:i(?:cations?|e(?:rs?|s|d))|y(?:ing)?)|t(?:ative(?:ly)?|ies|y))|ms?)|nt(?:i(?:f(?:i(?:cation|able|e(?:rs?|s|d))|y(?:ing)?)|t(?:ative(?:ly)?|ies|y)|s(?:ation|ed?))|um)|r(?:t(?:(?:e(?:r(?:(?:master|s(?:taffs?)?|back|ing|ly|ed))?|ts?)|z(?:ite)?|i(?:les?|cs?)|o|s))?|antined?|r(?:el(?:(?:l(?:ing|ed)|s(?:ome)?))?|y(?:(?:men|ing))?|ie[sd])|ks?)|s(?:i(?:linear)?|h(?:(?:ing|ed))?|ars?)|t(?:ern(?:ions?|ary)|rains?)|i(?:nt(?:(?:ness|ly|er))?|l(?:(?:ed|s))?)|ver(?:(?:ing|ed|s))?|g(?:mires?|gas?)|y(?:s(?:ide)?)?|ff(?:(?:ing|ed))?|ck(?:(?:i(?:sh|ng)|ed|s))?|k(?:e(?:(?:rs?|d|s))?|ing)))?|e(?:st(?:(?:i(?:on(?:(?:naires?|ing(?:(?:ly|s))?|abl[ey]|e(?:rs?|d)|s))?|ng)|s))?|r(?:ulous(?:(?:ness|ly))?|y(?:ing)?|ie[ds]|n)|as(?:iness|y)|nch(?:(?:ing|e(?:rs?|s|d)))?|u(?:e(?:(?:ing|d|s))?|ing)|ll(?:(?:ing|ed|s))?|e(?:r(?:(?:est|ly))?|n(?:(?:ly|s))?)|bec)|o(?:t(?:a(?:(?:tions?|ble|s))?|i(?:ents?|dian|ng)|e(?:[drs])?)|vadis|ndam|r(?:ate|um)|i(?:ns|ts)))|atar)|k(?:i(?:n(?:(?:d(?:(?:hearted(?:ness)?|e(?:r(?:gartens?)?|st)|l(?:i(?:n(?:ess|g)|e(?:st|r))|e(?:[sd])?|y)|ness(?:es)?|red|s))?|g(?:(?:fishers?|s(?:(?:ized?|hip))?|doms?|pin|ly))?|e(?:tic(?:(?:ally|s))?|matics?)|s(?:woman|folk|h(?:asa|ip)|m(?:en|an))|folk|k(?:(?:ed|y|s))?|a(?:se)?))?|d(?:(?:n(?:ey(?:s(?:haped)?)?|ap(?:(?:p(?:ings?|e(?:rs?|d))|s))?)|d(?:i(?:ng|e)|ed)|s))?|ck(?:(?:s(?:tart(?:(?:ing|ed|s))?)?|back|ing|e[rd]))?|t(?:(?:chen(?:(?:ware|ette|s))?|t(?:i(?:wakes|ng)|e(?:n(?:(?:ish|s))?|d)|y)|bags?|s(?:ch)?|es?|h))?|l(?:o(?:(?:joules|metres?|b(?:ytes?|its)|hertz|watts?|tons?|volt))?|l(?:(?:ings?|joys?|e(?:rs?|d)|s))?|t(?:(?:e[rd]|s))?|ns?)|s(?:s(?:(?:ing|e[srd]))?|met)|ppers?|bbutz|osks?|mono|wis?|ev|rk)|n(?:uckl(?:e(?:(?:d(?:usters?)?|s))?|ing)|o(?:w(?:(?:ledge(?:abl[ye])?|ing(?:ly)?|able|how|s|n))?|ck(?:(?:ings?|e(?:rs?|d)|out|s))?|t(?:(?:t(?:i(?:e(?:st|r)|ng)|ed|y)|s))?|b(?:(?:bly|s))?|lls?)|i(?:ght(?:(?:hoods?|ed|ly|s))?|f(?:e(?:(?:point|s|d))?|ing)|ckers|t(?:(?:t(?:e(?:rs?|d)|ing)|wear|s))?|ves)|a(?:psacks?|ck(?:(?:ers?|s))?|v(?:ish|e(?:(?:ry|s))?))|e(?:ad(?:(?:ing|ed|s))?|e(?:(?:caps?|d(?:eep)?|l(?:(?:ing|e[rd]|s))?|s))?|sset|l[tl]|w))|l(?:eptomania(?:cs?)?|axons?|oof|ick)|a(?:l(?:e(?:idoscop(?:ic|e))?|ahari|if)|ngaroos?|m(?:ikaze|p(?:ong|ala))|tydid|r(?:a(?:oke|kul|te)|st|ma)|ftans?|yaks?|olin|iser)|e(?:y(?:(?:board(?:(?:ist|s))?|s(?:t(?:rokes?|ones?))?|holes?|notes?|words?|ring|pads?|ing|ed))?|e(?:p(?:(?:s(?:akes?)?|ing|ers?))?|l(?:(?:haul|ing|ed|s))?|n(?:(?:ness|ing|e(?:st|r)|ly))?)|n(?:(?:ne(?:l(?:(?:led|s))?|dy)|t(?:ucky)?|yan?))?|t(?:tle(?:(?:ful|s))?|ch(?:up)?)|dgeree|r(?:b(?:s(?:ide)?)?|chief|osene|n(?:ing|e(?:ls?|d))|atin)|strels?|l(?:p(?:ers)?|vin|ts?)|babs?|gs?|pt)|o(?:okaburra|r(?:ea(?:ns?)?|an)|sher|alas?|ngo)|r(?:i(?:egspiel|ll)|ypton|emlin|a(?:als?|ft))|h(?:oi(?:khoi|san)|a(?:lif|ns?|ki))|wachas?|u(?:wait|ngfu|dus?))|j(?:u(?:r(?:i(?:s(?:pruden(?:tial|ce)|diction(?:(?:al|s))?|t(?:(?:ic|s))?)|dic(?:al)?|es)|assic|y(?:m(?:en|an))?|ors?)|xtapos(?:i(?:tions?|ng)|e(?:[ds])?)|s(?:t(?:(?:i(?:f(?:i(?:cat(?:ions?|ory)|ab(?:ility|l[ye])|e[ds])|y(?:ing)?)|ces?)|ness|ly))?|sive)|m(?:p(?:(?:s(?:(?:tart(?:ing)?|uit))?|i(?:n(?:ess|g)|e(?:st|r))|e(?:rs?|d)|y))?|b(?:le(?:[sd])?|o))|g(?:(?:g(?:e(?:rnauts?|d)|l(?:e(?:(?:rs?|s|d))?|ing))|ular|s))?|d(?:ic(?:i(?:ous(?:ly)?|a(?:r(?:ies|y)|l(?:ly)?))|ature)|g(?:e(?:(?:ment(?:(?:al|s))?|s|d))?|ment(?:(?:al|s))?|ing)|der(?:(?:ing|ed|s))?|a(?:i(?:sm|c)|s)|o)|bil(?:a(?:nt(?:ly)?|t(?:ion|e))|ees?)|ic(?:i(?:ness|e(?:st|r))|es?|y)|kebox(?:es)?|n(?:ct(?:ions?|ure)|i(?:or(?:(?:ity|s))?|per)|k(?:(?:mail|yard|ies?|e[tr]|s))?|gles?|tas?|e|o)|veniles?|t(?:(?:t(?:ing|ed)|e|s))?|piter|l(?:eps?|y))|o(?:u(?:rn(?:al(?:(?:is(?:t(?:(?:ic|s))?|m)|l(?:ing|ed)|ese|s))?|ey(?:(?:ing|man|e[dr]|s))?)|st(?:(?:ing|er|s))?|les?)|y(?:(?:less(?:ness)?|ful(?:(?:ness|ly))?|ous(?:(?:ness|ly))?|rid(?:e(?:rs?)?|ing)|s(?:ticks?)?|ed))?|b(?:(?:less(?:ness)?|bing|s))?|c(?:ular(?:(?:ity|ly))?|k(?:ey(?:(?:ing|s))?)?)|i(?:n(?:(?:t(?:(?:ures|ing|ly|ed|s))?|ing|e(?:r(?:[ys])?|d)|s))?|sts?)|via(?:l(?:(?:ity|ly))?|n)|k(?:i(?:ng(?:ly)?|ly|er)|e(?:(?:rs?|y|s|d))?)|l(?:l(?:i(?:e(?:st|r)|ty|ly|fy)|y)|t(?:(?:ing|ed|s))?)|na(?:than|h)|s(?:tl(?:ing|e(?:[sd])?)|hua|eph)|t(?:(?:t(?:ings?|e[rd])|s))?|g(?:(?:g(?:ing|e(?:rs?|d))|s))?|wls?|ey|hn)|e(?:t(?:(?:p(?:ropelled|lane)|t(?:i(?:son(?:(?:ing|ed))?|ng|es)|ed|y)|s(?:(?:etting|am))?|lagged))?|opard(?:is(?:ing|e(?:[sd])?)|y)|a(?:lous(?:(?:ies|ly|y))?|ns)|e(?:r(?:(?:ing(?:(?:ly|s))?|ed|s))?|ps?)|ll(?:(?:y(?:fish)?|i(?:fy|e[sd])))?|s(?:t(?:(?:ing(?:ly)?|e(?:rs?|d)|s))?|u(?:it|s))|w(?:(?:e(?:l(?:(?:le(?:r(?:[sy])?|d)|ry|s))?|ss)|s(?:harp)?|ish))?|r(?:emiah|k(?:(?:i(?:e(?:st|r)|n(?:(?:gs?|s))?|ly)|ed|y|s))?|seys?|icho|boas)|zebel|nnets|jun(?:um|e)|mmy|had)|a(?:c(?:k(?:(?:in(?:thebox|g)|boot(?:(?:ed|s))?|a(?:ss(?:es)?|ls?)|daws?|pots?|e(?:ts?|d)|s))?|uzzi|ob)|y(?:(?:walk(?:(?:ing|er))?|s))?|b(?:(?:b(?:e(?:r(?:(?:ing|ed|s))?|d)|ing)|s))?|de(?:(?:d(?:(?:ness|ly))?|s))?|un(?:diced?|t(?:(?:i(?:e(?:st|r)|ly|ng)|ed|y|s))?)|g(?:(?:ged(?:ly)?|uars?))?|il(?:(?:bird|ing|e(?:rs?|d)|s))?|m(?:(?:aican?|b(?:(?:oree|s))?|m(?:ing|ed)|es|s))?|n(?:gl(?:ing|ed?|y)|itors?|u(?:ary|s))|p(?:(?:onica|es?|an))?|v(?:elins?|a)|w(?:(?:bones?|line|ing|ed|s))?|zz(?:(?:ie(?:st|r)|ed|y))?|smine|r(?:(?:r(?:ing|ed)|gons?|l|s))?|karta|lopy|hweh)|i(?:n(?:g(?:o(?:is(?:tic|m))?|l(?:ing|e(?:[sd])?))|x(?:e[sd])?|k(?:ed|s))|g(?:gl(?:ing|e)|s(?:aws?)?)|ujitsu|tter(?:[ys])?|lt(?:(?:ing|ed|s))?|ve(?:[sd])?|mmy|had|ffy))|w(?:e(?:l(?:l(?:(?:in(?:tentioned|formed|g(?:tons?)?)|e(?:stablished|quipped|d(?:ucated)?|ndowed|arned)|t(?:houghtout|ried|imed|aken|odo)|s(?:(?:tructured|upported|poken))?|p(?:re(?:served|pared)|laced|aid)|o(?:r(?:ganised|dered)|ff)|d(?:e(?:veloped|s(?:igned|erved)|fined)|isposed|ressed)|c(?:onnected|hosen)|r(?:e(?:ceived|ad)|ounded)|m(?:a(?:nnered|tched|rked|de)|ean(?:ing|t))|grounded|b(?:alanced|e(?:loved|haved|ing)|uilt|red|orn)|adjusted|w(?:ishers?|orn)|f(?:o(?:unded|rmed)|ed)|l(?:oved|iked)|k(?:nown|ept)|used|head|y))?|t(?:(?:er(?:(?:weight|ing|s))?|s))?|com(?:ing|e(?:[srd])?)|sh(?:man)?|fare|d(?:(?:ing|e(?:rs?|d)|s))?)|st(?:(?:er(?:n(?:(?:is(?:ation|ed)|most|ers?|s))?|ly)|wards?|bound))?|i(?:gh(?:(?:t(?:(?:l(?:ess(?:(?:ness|ly))?|ift(?:ing|ers?))|i(?:e(?:st|r)|ngs?|ly)|ed|y|s))?|bridge|ing|ed|s))?|r(?:(?:d(?:(?:ness|e(?:st|r)|ly|o))?|s))?)|a(?:ther(?:(?:b(?:eaten|ound)|proof|cocks?|worn|vane|ing|m(?:an|en)|ed|s))?|k(?:(?:minded|ness(?:es)?|l(?:ings?|y)|kneed|e(?:n(?:(?:ing|ed|s))?|st|r)|ish))?|l(?:th(?:(?:ie(?:st|r)|y))?)?|r(?:(?:y(?:ing(?:ly)?)?|i(?:some|n(?:ess|g)|e(?:st?|r|d)|ly)|able|ers?|s))?|sel(?:(?:l(?:ing|y)|s))?|v(?:ings?|e(?:(?:rs?|s|d))?)|pon(?:(?:ry|s))?|n(?:(?:ling|ing|ed|s))?)|e(?:(?:d(?:(?:killers?|i(?:e(?:st|r)|ng)|ed|y|s))?|k(?:(?:end(?:(?:ers|s))?|l(?:ies|y)|days?|s))?|p(?:(?:ings?|er|y|s))?|vils?|ny?))?|re(?:wol(?:ves|f))?|t(?:(?:t(?:able|ing|e(?:st|r|d))|s(?:uits?)?|l(?:ands?|y)|ness|her))?|d(?:(?:d(?:ings?|ed)|lock|g(?:ing|e(?:[sd])?)|s))?|n(?:d(?:(?:ing|ed|s))?|ch(?:es)?|t)|b(?:(?:s(?:ite)?|foot|b(?:ing|ed|y)))?|pt)|a(?:t(?:er(?:(?:c(?:o(?:lour(?:(?:ists|s))?|urses?|oled)|ress)|resistant|proof(?:(?:ing|ed|s))?|s(?:(?:oluble|pouts|kiing|heds?|ide))?|m(?:e(?:lons?|n)|a(?:rks?|n)|ills?)|l(?:o(?:gged|o)|ine|ess)|w(?:heels?|orks|ays?)|f(?:alls?|ront|owl)|glass|holes?|t(?:able|ight)|beds?|ing|ed|y))?|ch(?:(?:ful(?:(?:ness|ly))?|towers?|m(?:a(?:kers?|n)|en)|words?|dogs?|able|ing|e(?:rs?|s|d)))?|t(?:(?:age|le|s))?)|r(?:(?:m(?:(?:hearted(?:ness)?|blooded|onger|ness|i(?:sh|ng)|e(?:st|rs?|d)|up|th|ly|s))?|e(?:(?:hous(?:e(?:(?:m(?:en|an)|d|s))?|ing)|s))?|r(?:ant(?:(?:i(?:es|ng)|ed|y|s))?|i(?:ors?|ng)|e(?:ns?|d))|p(?:(?:lanes|a(?:int|th)|ing|ed|s))?|n(?:(?:ing(?:(?:ly|s))?|e(?:rs|d)|s))?|h(?:orses?|eads?)|d(?:(?:robes?|s(?:hip)?|ing|e(?:rs?|ns?|d)))?|t(?:(?:hogs?|ime|y|s))?|s(?:(?:hips?|aw))?|l(?:o(?:rds?|cks?)|ike)|i(?:n(?:ess|g)|est|ly)|bl(?:ing|e(?:(?:rs?|s|d))?)|fare|y))?|l(?:k(?:(?:i(?:etalkies?|ng)|ab(?:outs?|le)|ways?|o(?:ver|ut)|e(?:rs?|d)|s))?|l(?:(?:paper(?:(?:ing|s))?|flowers?|towall|o(?:w(?:(?:ing|ed|s))?|p)|chart|ab(?:ies|y)|ing|e(?:ts?|d)|s))?|tz(?:(?:ing|e[sd]))?|rus(?:es)?|nuts?|es)|s(?:(?:t(?:(?:e(?:(?:ful(?:(?:ness|ly))?|lands?|paper|rs?|s|d))?|ings?|ages?|rel))?|p(?:(?:waisted|ish(?:ly)?|s))?|h(?:(?:e(?:r(?:(?:wom(?:en|an)|s))?|s|d)|b(?:asins?|oard)|ing(?:(?:ton|s))?|stand|able|out|day|y))?))?|k(?:e(?:(?:ful(?:ness)?|n(?:(?:ing|ed|s))?|s|d))?|ing)|i(?:nscot(?:ing)?|st(?:(?:coats?|line|band|s))?|t(?:(?:ress(?:es)?|ing|e(?:rs?|d)|s))?|v(?:ing|e(?:(?:rs?|s|d))?)|l(?:(?:ing|e[rd]|s))?|fs?)|y(?:(?:ward(?:(?:ness|ly))?|s(?:ide)?|out))?|v(?:e(?:(?:l(?:e(?:ngths?|ts?)|ike)|guides?|f(?:ront|orms?)|bands?|r(?:(?:ing|e(?:rs|d)|s))?|s|d))?|i(?:ngs?|e(?:st|r)|ly)|y)|n(?:(?:d(?:(?:er(?:(?:ings?|lust|e(?:rs?|d)|s))?|s))?|t(?:(?:on(?:(?:ness|ly))?|ing|ed|s))?|ing|ly|e(?:[sd])?))?|g(?:(?:g(?:on(?:ers|s)|i(?:sh(?:ly)?|ng)|l(?:ing|e(?:[sd])?|y)|e(?:ry|d))|tails?|e(?:(?:r(?:(?:e[rd]|s))?|s|d))?|ons?|ing|s))?|d(?:(?:d(?:l(?:ing|e(?:[sd])?)|ing)|i(?:(?:ngs?|s))?|e(?:(?:rs?|s|d))?|s))?|x(?:(?:works?|paper|ing|e[snd]|y))?|pitis?|f(?:t(?:(?:ure|ing|ed|s))?|fle(?:[sd])?|ers?)|ck(?:ier|y))|o(?:r(?:d(?:(?:p(?:rocessing|lay)|less(?:ly)?|s(?:mith)?|i(?:n(?:ess|gs?)|e(?:st|r))|game|age|ed|y))?|th(?:(?:less(?:ness)?|i(?:ness|e(?:st?|r)|ly)|while|y))?|k(?:(?:s(?:(?:tations?|h(?:eets?|ops?|y)|pace))?|m(?:a(?:n(?:(?:ship|like))?|tes?)|en)|a(?:b(?:ility|le)|day)|f(?:orces?|are)|ho(?:rses?|uses?)|p(?:eople|ieces?|laces?)|rooms?|l(?:oads?|ess)|b(?:ooks?|ench)|days?|week|tops?|outs?|ings?|e(?:rs?|d)))?|s(?:hip(?:(?:p(?:ing|e(?:rs?|d))|ful|s))?|e(?:(?:n(?:(?:ing|ed|s))?|r))?|t(?:ed)?)|ld(?:(?:l(?:iness|y)|famous|class|w(?:ide|ar)|s))?|r(?:y(?:ing(?:ly)?)?|i(?:some|e(?:d(?:ly)?|rs?|s)))|m(?:(?:holes?|like|ing|y|s))?|n|e)|n(?:(?:d(?:er(?:(?:ful(?:(?:ness|ly))?|ing(?:ly)?|land|ment|ed|s))?|rous(?:ly)?)|t))?|l(?:f(?:(?:whistles|hounds?|ish(?:ly)?|cubs|ed))?|ves|ds?)|o(?:(?:d(?:(?:w(?:or(?:k(?:(?:ing|ers?))?|m)|ind)|p(?:eckers?|ile)|c(?:ut(?:(?:ters?|s))?|ocks?)|e(?:n(?:(?:ness|ly))?|d)|s(?:(?:m(?:oke|an)|hed))?|l(?:ouse|ands?|ice)|bine|m(?:en|an)|y))?|l(?:(?:l(?:i(?:ness|ke|e[sr])|ens?|y)|y|s))?|f(?:ers?)?|ing|e[rd]|s))?|m(?:an(?:(?:l(?:iness|y)|is(?:ing|er?|h)|hood|kind|s))?|en(?:folk)?|b(?:(?:ats?|s))?)|e(?:(?:begone|ful(?:ly)?|s))?|bbl(?:i(?:e(?:st|r)|ng)|e(?:[srd])?|y)|u(?:nd(?:(?:ing|ed|s))?|ld)|w(?:(?:ed|s))?|ven?|k(?:(?:en?|s))?|d(?:ge|an)|ad)|i(?:n(?:(?:d(?:(?:ow(?:(?:s(?:hop(?:ping)?)?|less|ing|ed))?|cheaters?|s(?:(?:urf(?:(?:ing|ers?))?|creens?|wept|o(?:ck|r)))?|mills?|falls?|b(?:reak|ags?)|ward|pipe|l(?:ess|ass)|i(?:ngs?|e(?:st|r)|ly)|e(?:rs?|d)|y))?|e(?:(?:glass(?:es)?|makers|s(?:kin)?|ry|d))?|t(?:er(?:(?:time|ing|ed|y|s))?|r(?:ie(?:st|r)|y))|n(?:ow(?:ing)?|ing(?:(?:ly|s))?|able|ers?)|g(?:(?:s(?:pan)?|less|ing|e(?:rs?|d)))?|c(?:h(?:(?:ing|e[sd]))?|ing|e(?:[sd])?)|s(?:ome)?|k(?:(?:le(?:[sd])?|ing|e(?:rs?|d)|s))?|ing))?|ck(?:(?:e(?:t(?:(?:keep(?:ing|ers?)|s))?|d(?:(?:ness|est|ly))?|r(?:work)?)|s))?|t(?:(?:h(?:(?:st(?:and(?:(?:ing|s))?|ood)|h(?:old(?:(?:ing|s))?|eld)|er(?:(?:ing(?:ly)?|ed|s))?|dr(?:aw(?:(?:ing|als?|s|n))?|ew)|out|in))?|ch(?:(?:doctors?|craft|hunts?|like|e(?:ry|s)))?|ness(?:(?:ing|e[sd]))?|t(?:i(?:cisms?|n(?:g(?:ly)?|ess)|e(?:st|r)|ly)|er(?:ing)?|y)|less|s))?|l(?:d(?:(?:e(?:r(?:ness(?:es)?)?|beest|yed|st)|f(?:ires?|owl)|oats|ness|l(?:ife|y)|cats?|s))?|l(?:(?:ing(?:(?:ness|ly))?|ynilly|power|ow(?:[ys])?|ed|s))?|ful(?:(?:ness|ly))?|t(?:(?:ing|ed|s))?|i(?:e(?:st|r)|ng)|es?|y)|d(?:e(?:(?:r(?:anging)?|s(?:(?:creen|pread|t))?|open|n(?:(?:ing|e(?:ss|d)|s))?|eyed|ly))?|ow(?:(?:hood|e(?:rs?|d)|s))?|ge(?:on|t)|ths?)|s(?:tful(?:(?:ness|ly))?|e(?:(?:cracks|guys|st|ly|r))?|h(?:(?:ywashy|ful(?:ly)?|bone|ing|e[sd]))?|doms?|p(?:[ys])?)|r(?:e(?:(?:less|s|r|d))?|i(?:ngs?|e(?:st|r))|y)|g(?:(?:g(?:l(?:ing|e(?:[srd])?)|ing)|wams?|eons?|s))?|fe(?:l(?:ess|y))?|eld(?:(?:ing|e[rd]|s))?|z(?:ard(?:(?:ry|s))?|ened)|p(?:ing|e(?:(?:rs?|s|d))?)|mp(?:(?:le|y))?|ves)|h(?:o(?:(?:l(?:e(?:(?:hearted(?:ly)?|s(?:(?:ome(?:(?:ness|ly))?|al(?:ing|e(?:rs?)?)))?|grain|wheat|ness|meal|food))?|ly)|m(?:(?:soever|ever))?|r(?:e(?:(?:house|s))?|l(?:ed|s)|ing)|s(?:oever|e)|dun(?:nit|it)|o(?:p(?:(?:ing|ed|s))?|sh)|ever|a|p))?|i(?:t(?:e(?:(?:wash(?:(?:ing|ed))?|collar|b(?:oards|ait)|n(?:(?:ing|e(?:ss|r|d)|s))?|st?|ly|r))?|tl(?:ing|ed?)|i(?:sh|ng)|her)|s(?:per(?:(?:ings?|e(?:rs|d)|s))?|t(?:(?:l(?:ing|e(?:[srd])?)|s))?|k(?:(?:i(?:es|ng)|e(?:ys?|r(?:[ys])?|d)|y|s))?)|m(?:(?:s(?:(?:ical(?:ly)?|y))?|per(?:(?:ing|ed|s))?))?|r(?:(?:l(?:(?:pools?|winds?|i(?:gig|ng)|ed|s))?|r(?:(?:ing|ed))?))?|n(?:n(?:y(?:ing)?|ied)|ing|e(?:[sd])?)|ch(?:ever)?|p(?:(?:p(?:ing|e(?:ts?|r|d)|y)|lash|cord|s))?|z(?:z(?:kid)?|kids)|l(?:ing|st|e(?:[sd])?)|ffs?)|e(?:e(?:(?:l(?:(?:wrights?|ba(?:rrows?|se)|chairs?|house|i(?:ng|e)|e(?:rs?|d)|s))?|dl(?:ing|ed?)|z(?:ing|e(?:[sd])?|y)))?|r(?:e(?:(?:with(?:al)?|soever|a(?:bouts|s)|fores?|upon|ver|to|o[nf]|in|by))?|ry)|t(?:(?:stones?|t(?:ing|ed)|her))?|a(?:t(?:(?:germ|e(?:ars|n)|s))?|ls)|n(?:(?:ever|ce))?|l(?:k(?:(?:ed|s))?|p)|y)|a(?:t(?:(?:soever|ever|not))?|l(?:e(?:(?:bone|rs?|s))?|ing)|r(?:ves|fs?)|ck(?:(?:e[rd]|s|o))?|m|p)|ys?)|r(?:e(?:tch(?:e(?:d(?:(?:ness|ly))?|s))?|a(?:th(?:(?:ing|e(?:[sd])?|s))?|k(?:(?:ing|ed|s))?)|st(?:(?:l(?:ing|e(?:(?:rs?|d|s))?)|ing|ed))?|n(?:(?:ch(?:(?:ing|e[sd]))?|s))?|ck(?:(?:ing|e(?:rs?|d)|age|s))?)|o(?:ught(?:iron)?|ng(?:(?:do(?:ings?|ers?)|ful(?:ly)?|ness|ing|e(?:st|r|d)|ly|s))?|te)|a(?:p(?:(?:around|p(?:ings?|e(?:rs?|d))|s))?|th(?:(?:ful(?:ly)?|s))?|ngl(?:ing|e(?:[srd])?)|iths?|ck(?:ed)?|sse)|i(?:st(?:(?:bands?|watch|s))?|n(?:kl(?:ing|e(?:[sd])?|y)|g(?:(?:ing|er|s))?)|g(?:gl(?:ing|e(?:[sd])?|y)|ht)|t(?:(?:ings?|h(?:ing|e(?:[sd])?)|able|ten|e(?:(?:rs?|s))?|s))?)|y(?:(?:ness|ly))?|ung)|underkind)|f(?:a(?:m(?:i(?:l(?:i(?:a(?:r(?:(?:i(?:s(?:ation|ing|ed?)|t(?:ies|y))|ly))?|l)|es)|y)|sh(?:ed)?|nes?)|ous(?:ly)?|ed?)|c(?:t(?:(?:o(?:r(?:(?:i(?:s(?:a(?:tions?|ble)|ing|e(?:[sd])?)|als?|es|ng)|ed|y|s))?|tum)|i(?:o(?:n(?:(?:al(?:ism)?|s))?|us)|tious)|ual(?:ly)?|s))?|e(?:(?:t(?:(?:i(?:ous(?:(?:ness|ly))?|ng)|ed|s))?|plate|l(?:ess|ift)|rs?|d|s))?|i(?:l(?:it(?:at(?:i(?:ng|on|ve)|ors?|e(?:[ds])?)|ies|y)|e)|ngs?|a(?:ls?)?)|similes?|ult(?:ies|y)|ades?)|l(?:s(?:i(?:f(?:i(?:ab(?:ility|le)|cations?|e(?:rs?|d|s))|y(?:ing)?)|t(?:ies|y))|e(?:(?:hoods?|ness|bay|tto|ly|r))?)|l(?:(?:i(?:b(?:ility|le)|ng)|ac(?:i(?:ous|es)|y)|o(?:pian|ut|w)|guy|e(?:rs?|n)|s))?|ter(?:(?:ing(?:ly)?|ed|s))?|con(?:(?:er|ry|s))?)|s(?:t(?:(?:i(?:dious(?:(?:ness|ly))?|ngs?)|ness(?:es)?|e(?:n(?:(?:ings?|e(?:rs?|d)|s))?|st|r|d)|s))?|ci(?:nat(?:i(?:ng(?:ly)?|ons?)|e(?:[sd])?)|s(?:ts?|m)|as?)|hion(?:(?:abl[ey]|ing|ed|s))?)|t(?:(?:al(?:(?:i(?:s(?:t(?:ic(?:ally)?)?|m)|t(?:ies|y))|ly))?|h(?:e(?:adedness|r(?:(?:s(?:inlaw)?|in(?:law|g)|l(?:ess|and|y)|hood|ed))?)|om(?:(?:less|ing|ed|s))?)|igu(?:ing|e(?:[ds])?)|t(?:e(?:n(?:(?:ing|ed|s))?|st|r|d)|ie(?:st|r)|y)|u(?:ous(?:ly)?|ity)|ness|less|e(?:(?:ful|d|s))?|cat|wa|s))?|i(?:th(?:(?:less(?:ness)?|ful(?:(?:ness|ly))?|s))?|nt(?:(?:hearted|ness|e(?:st|r|d)|ing|ly|s))?|r(?:(?:grounds?|y(?:tale)?|ness|ways?|s(?:ex)?|i(?:sh|ng|es)|e(?:st|r)|ly))?|l(?:(?:ings?|ures?|ed|s))?)|b(?:(?:ric(?:(?:at(?:i(?:ons?|ng)|or|e(?:[sd])?)|s))?|ul(?:ous(?:ly)?|ists)|le(?:[sd])?))?|n(?:(?:atic(?:(?:al(?:ly)?|ism|s))?|c(?:i(?:ful(?:ly)?|able|e(?:rs?|st?|d))|y(?:ing)?)|ta(?:s(?:tic|ia)|ils?)|dango|fares?|light|n(?:ing|ed|y)|belt|gs?|s))?|r(?:(?:r(?:eaching|iers?|ago|ow)|s(?:ighted|eeing)|m(?:(?:s(?:teads?)?|houses?|yards?|ings?|land|e(?:rs?|d)))?|f(?:etched|lung)|e(?:(?:wells?|d|s))?|th(?:ings?|e(?:st|r))|c(?:ical|es?)|a(?:way|d(?:ay)?)|o(?:ut|ff)|ing))?|u(?:lt(?:(?:less(?:ly)?|ing|ed|y|s))?|st(?:us)?|cets?|n(?:(?:a(?:[sl])?|s))?)|vour(?:(?:i(?:t(?:ism|es?)|ng)|abl[ye]|ed|s))?|wn(?:(?:ing(?:ly)?|ed|s))?|g(?:(?:gots?|ot|s))?|d(?:(?:e(?:(?:out|d|s))?|ing|s))?|x(?:(?:ing|e[ds]))?|k(?:ing|e(?:(?:r[ys]|d|s))?)|ec(?:es|al))|u(?:n(?:(?:ction(?:(?:a(?:l(?:(?:i(?:t(?:ies|y)|s[mt])|ly))?|r(?:ies|y))|less|ing|ed|s))?|d(?:(?:amental(?:(?:is(?:ts?|m)|ly|s))?|hold(?:ers|ing)|rais(?:ers?|ing)|ings?|ed|s))?|n(?:el(?:(?:l(?:ing|ed)|s))?|i(?:e(?:st?|r)|ly)|y)|g(?:i(?:cid(?:es?|al))?|us(?:es)?|o(?:us|id)|al)|icular|er(?:a(?:ls?|ry)|eal)|k(?:(?:ier|ed|y))?|fair))?|t(?:ur(?:ologists|i(?:s(?:t(?:(?:ic|s))?|m)|ty)|es?)|il(?:e(?:ly)?|ity)|on)|l(?:mina(?:t(?:i(?:ons?|ng)|e)|nt)|l(?:(?:b(?:lo(?:oded|wn)|odied|acks?)|time(?:rs?)?|length|colour|grown|s(?:cale|tops?)|moon|ness|page|i(?:sh|ng)|e(?:st|r)|y))?|fil(?:(?:ment|l(?:ing|ed)|s))?|some(?:ly)?|crum)|r(?:(?:n(?:i(?:sh(?:(?:ings?|e(?:rs|d|s)))?|ture)|aces?)|t(?:he(?:r(?:(?:ance|more|ing|ed|s))?|st)|ive(?:(?:ness|ly))?)|bish(?:ing|ed)|i(?:ous(?:ly)?|es)|r(?:i(?:n(?:ess|g)|e(?:rs?|st))|ow(?:(?:ed|s))?|ed|y)|l(?:o(?:ngs?|ugh)|ing|ed|s)|ores?|ze|y|s))?|m(?:i(?:gat(?:i(?:on|ng)|e)|ng(?:ly)?)|aroles?|bl(?:ing|e(?:[sd])?)|e(?:[ds])?)|g(?:(?:itives?|ues?|al))?|s(?:i(?:l(?:iers?|lade)|ons?|ble|ng)|s(?:(?:i(?:n(?:ess|g)|e(?:st|r)|ly)|e[sd]|y))?|e(?:(?:lage|d|s))?|t(?:ian|y))|zz(?:(?:i(?:ness|e(?:st|r)|ly)|e[sd]|y))?|chsias?|el(?:(?:l(?:ing|ed)|s))?|d(?:g(?:ing|e(?:[sd])?)|dle(?:[sd])?)|hrer)|i(?:n(?:(?:ger(?:(?:print(?:(?:ing|ed|s))?|board|marks|nails?|tips?|less|ings?|ed|s))?|a(?:l(?:(?:i(?:s(?:ation|ing|ed?|ts?)|ty)|ly|es?|s))?|nc(?:i(?:al(?:ly)?|ers?|ng)|e(?:[ds])?))|i(?:te(?:(?:ness|ly))?|s(?:h(?:(?:e(?:rs?|d|s)|ing))?)?|cky|ng|al)|e(?:(?:tun(?:ing|e(?:[ds])?)|ness|s(?:(?:se|t))?|ry?|ly|d))?|d(?:(?:able|ings?|ers?|s))?|n(?:(?:ish|ed))?|land|ch(?:es)?|s))?|b(?:(?:r(?:illati(?:ng|on)|o(?:blasts?|sis|us)|e(?:(?:glass|board|s|d))?)|b(?:ing|e(?:rs?|d))|ula|ers|s))?|d(?:dl(?:e(?:(?:s(?:ticks)?|rs?|d))?|ings?|y)|get(?:(?:ing|ed|y|s))?|uciary|elity)|e(?:ld(?:(?:work(?:ers?)?|e(?:rs?|d)|ing|s))?|r(?:ce(?:(?:ness|ly|st|r))?|i(?:e(?:st|r)|ly)|y)|nd(?:(?:ish(?:ly)?|s))?|f(?:(?:doms?|s))?|stas?)|g(?:(?:ur(?:a(?:ti(?:ve(?:ly)?|on)|l)|e(?:(?:heads?|s|r|d))?|in(?:es?|g))|ht(?:(?:back|ers?|ing|s))?|ments?|tree|leaf|s))?|r(?:(?:e(?:(?:f(?:ight(?:(?:ers?|ing))?|l(?:ies|y))|light(?:ers)?|b(?:o(?:mb(?:(?:ing|ed|s))?|x)|alls?|rand)|control|p(?:roof(?:ed)?|laces?|ower)|guard|s(?:ides?)?|wo(?:rks?|od)|arms?|m(?:en|an)|d|r))?|s(?:t(?:(?:borns?|hand|aid|ly|s))?)?|m(?:(?:ament|ness|ware|ing|e(?:st|r|d)|ly|s))?|ings?|kin|th))?|l(?:ament(?:(?:ary|ous|s))?|t(?:rat(?:ion|e)|er(?:(?:ing|ed|s))?|h(?:(?:i(?:e(?:st|r)|ly)|y))?)|m(?:(?:makers|s(?:et)?|i(?:ng|c)|ed|y))?|i(?:buster|gree|ngs?|al)|l(?:(?:i(?:ngs?|es|p)|e(?:ts?|rs?|d)|s|y))?|ch(?:ed)?|e(?:(?:rs?|d|s|t))?)|s(?:h(?:(?:mongers?|e(?:r(?:(?:ies|m(?:an|en)|y|s))?|s|d)|hooks?|i(?:e(?:st|r)|ngs?)|like|wife|net|y))?|t(?:(?:icuffs|ula|ful|ed|s))?|cal(?:ly)?|s(?:i(?:ons?|le)|ure(?:[ds])?))|t(?:(?:ful(?:(?:ness|ly))?|t(?:ing(?:(?:ly|s))?|e(?:st|rs?|d))|ments?|ness|ly|s))?|c(?:ti(?:tious|on(?:(?:al|s))?|ve)|kle(?:ness)?|hes?|us)|f(?:t(?:een(?:th)?|ie(?:th|s)|h(?:(?:ly|s))?|y)|es?)|x(?:(?:a(?:t(?:i(?:ons?|ve)|e(?:[sd])?)|ble)|tures?|ings?|e(?:d(?:ly)?|rs?|s)))?|ve(?:(?:fold|rs?|s))?|zz(?:(?:i(?:e(?:st|r)|ng)|le(?:[sd])?|e[sd]|y))?|ji(?:ans)?|a(?:ncee?|sco|t)|ords?)|o(?:r(?:(?:e(?:(?:s(?:ee(?:(?:ab(?:ility|le)|ing|n|s))?|h(?:or(?:ten(?:ing|ed)|es?)|adow(?:(?:ing|ed|s))?)|t(?:(?:all(?:(?:ing|ed|s))?|e(?:rs?|d)|ry|s))?|ight|kins?|a(?:il|w))|g(?:round(?:(?:ing|ed|s))?|ather(?:ed)?|o(?:(?:ing|ne))?)|knowledge|n(?:sic(?:ally)?|ames?)|b(?:od(?:ings?|ed)|ears?|rain)|c(?:ast(?:(?:ers?|ing|s))?|los(?:ure|ed?)|ourts?)|f(?:athers?|ingers?|ront)|ign(?:(?:ness|ers?))?|runners?|t(?:ell(?:ing)?|hought|astes?|old)|w(?:arn(?:(?:ing|ed))?|ords?)|arm(?:(?:ed|s))?|h(?:eads?|and)|l(?:imbs|and|egs?|ock)|deck|m(?:ost|en|an)|p(?:aws?|lay)|ver))?|m(?:(?:a(?:l(?:(?:i(?:s(?:ations?|ing|t(?:ic)?|ms?|e(?:[sd])?)|t(?:ies|y)|n)|dehyde|ly))?|t(?:(?:t(?:ing|ed)|i(?:ons?|ve)|ed|s))?|nt)|less(?:ness)?|ula(?:(?:t(?:i(?:ons?|ng)|or|e(?:[sd])?)|ic|ry|e|s))?|i(?:dabl[ye]|ng|c)|e(?:r(?:(?:ly|s))?|d)|osa|s))?|t(?:(?:h(?:(?:right(?:(?:ness|ly))?|coming|with))?|i(?:f(?:i(?:cations?|ed)|y(?:ing)?)|ssimo|tude|e(?:th|s))|u(?:n(?:e(?:(?:tell(?:ers?|ing)|s))?|ate(?:ly)?)|itous(?:ly)?)|night(?:(?:ly|s))?|ress(?:es)?|knox|e|s|y))?|ward(?:(?:l(?:ooking|y)|ness|ing|e[dr]|s))?|g(?:e(?:(?:t(?:(?:ful(?:ness)?|menots?|t(?:able|ing)|s))?|r(?:(?:ies|y|s))?|s|d))?|i(?:v(?:e(?:(?:n(?:ess)?|s))?|able|ing)|ngs?)|o(?:(?:t(?:ten)?|ing|ne))?|ave)|b(?:id(?:(?:d(?:ing(?:ly)?|en)|s))?|ear(?:(?:ance|ing|s))?|ore|ade?)|c(?:e(?:(?:f(?:eed(?:ing)?|ul(?:(?:ness|ly))?)|ps|s|d))?|i(?:bl[ey]|ng))|lorn(?:(?:ness|ly))?|nicat(?:i(?:ng|on)|ors?|e(?:[sd])?)|s(?:w(?:ear(?:ing)?|or[en])|ak(?:ing|e(?:[ns])?)|ythia|ook)|feit(?:(?:ure|ing|ed|s))?|a(?:g(?:e(?:(?:rs|s|d))?|ing)|men|ys?)|k(?:(?:ing|ed|s))?|d(?:(?:ing|ed|s))?|ums?))?|o(?:l(?:(?:hard(?:i(?:ness|ly)|y)|i(?:sh(?:(?:ness|ly))?|ng)|proof|s(?:cap)?|e(?:ry|d)))?|t(?:(?:b(?:a(?:ll(?:(?:ers?|ing|s))?|th)|ridge)|s(?:(?:t(?:ools?|eps?)|ore|ie))?|p(?:rints?|a(?:ths?|ds)|late)|l(?:ights|oose|ess)|falls?|h(?:ills?|olds?)|m(?:a(?:rks|n)|en)|notes?|ages?|gear|ings?|rest|w(?:ear|ork|ay)|ed))?|d(?:(?:s(?:tuffs?)?|less))?)|s(?:s(?:il(?:(?:i(?:ferous|s(?:ing|ed?))|s))?|a)|ter(?:(?:ing|ed|s))?)|u(?:n(?:d(?:(?:ation(?:(?:al|s))?|e(?:r(?:(?:ing|ed|s))?|d)|ling|r(?:ies|y)|ing|s))?|t(?:(?:ains?|s))?)|l(?:(?:mouthed|ness|ups?|ing|e(?:st|r|d)|ly|s))?|r(?:(?:t(?:een(?:th)?|h(?:(?:ly|s))?)|fold|s(?:ome)?))?|ght)|l(?:k(?:(?:lor(?:ists?|e)|tale|ish|art|s))?|l(?:ow(?:(?:ings?|able|e(?:rs?|d)|s))?|i(?:c(?:ular|les?)|es)|y)|i(?:a(?:ted?|ge)|o)|d(?:(?:ing|e(?:rs?|d)|s))?)|x(?:(?:h(?:unt(?:(?:ing|s))?|o(?:unds|les?))|i(?:n(?:ess|g)|e(?:st|r)|ly)|trots?|e[ds]|y))?|c(?:us(?:(?:s(?:ing|e[ds])|ing|e[sd]))?|al(?:ly)?|i)|ment(?:(?:ing|ed))?|a(?:m(?:(?:i(?:e(?:st|r)|ng)|ed|s|y))?|l(?:(?:ing|ed|s))?)|e(?:(?:t(?:us(?:es)?|id|al)|hns|s))?|g(?:(?:g(?:i(?:e(?:st|r)|ng)|ed|y)|horns?|bank|ey|y|s))?|i(?:st(?:(?:ing|ed))?|l(?:(?:ing|ed|s))?|bles?)|n(?:d(?:(?:l(?:ing|e(?:[sd])?|y)|ness|ues?|e(?:st|r)|ant))?|t(?:(?:anel|s))?)|dders?|b(?:(?:b(?:ing|ed)|s))?|yers?|wls?|ps?)|r(?:i(?:e(?:nd(?:(?:l(?:ess(?:ness)?|i(?:ness|e(?:st?|r)|ly)|y)|s(?:hips?)?))?|zes?|rs|d|s)|g(?:ht(?:(?:e(?:n(?:(?:ing(?:ly)?|e(?:rs|d)|s))?|d)|ful(?:ly)?|s))?|id(?:(?:ity|ly))?|ates?)|c(?:tion(?:(?:less|al|s))?|atives?)|vol(?:(?:it(?:ies|y)|ous(?:ly)?|s))?|tter(?:(?:ing|ed|s))?|ll(?:(?:ie(?:st|r)|ed|y|s))?|s(?:k(?:(?:i(?:e(?:st|r)|ly|ng)|ed|y|s))?|son)|ng(?:ing|e(?:[sd])?|y)|ppery|zz(?:les?|y)|jole|d(?:ges?|ays?)|a(?:ble|r(?:[ys])?))|a(?:c(?:t(?:io(?:n(?:(?:a(?:t(?:i(?:ng|on)|ed?)|l(?:ly)?)|s))?|us)|ur(?:ing|e(?:[ds])?)|als?)|as)|g(?:ment(?:(?:a(?:tion|ry)|ing|ed|s))?|ran(?:ces?|t)|il(?:ity|e))|n(?:k(?:(?:in(?:cense|g)|furter|ness|e(?:st|r|d)|ly|s))?|c(?:(?:his(?:e(?:(?:es?|s|d))?|ing|or)|ophone|s|e))?|tic(?:ally)?|gipani)|t(?:ern(?:i(?:s(?:ing|e)|t(?:ies|y))|al)|ricid(?:al|e))|u(?:d(?:(?:ulent(?:ly)?|s(?:ters?)?))?|ght)|m(?:e(?:(?:works?|up|rs?|s|d))?|ing)|il(?:(?:t(?:ies|y)|e(?:st|r)|ly))?|zzled?|y(?:(?:ing|ed|s))?)|o(?:(?:n(?:t(?:(?:i(?:spieces?|ers?|ng)|a(?:ges?|l(?:(?:ly|s))?)|line|page|ed|s))?|ds?)|g(?:(?:m(?:a(?:rched|n)|en)|gy|s))?|st(?:(?:bit(?:ten|e)|i(?:e(?:st|r)|ly|ng)|ed|y|s))?|w(?:n(?:(?:ing(?:ly)?|ed|s))?|ard)|lic(?:(?:s(?:ome)?|k(?:ing|ed)))?|th(?:(?:i(?:e(?:st|r)|ng)|ed|y|s))?|zen?|cks?|m))?|u(?:it(?:(?:less(?:(?:ness|ly))?|ful(?:(?:ness|ly))?|i(?:n(?:ess|g)|e(?:st|r)|on)|cakes?|e[rd]|y|s))?|st(?:rat(?:i(?:ng(?:ly)?|ons?)|e(?:(?:d(?:ly)?|s))?)|um)|gal(?:(?:ity|ly))?|ctose|mp[sy])|e(?:e(?:(?:s(?:(?:t(?:anding|yle)|ias?))?|w(?:heel(?:ing|s)|ay)|b(?:ooters|ie)|f(?:all(?:ing)?|orall)|h(?:old(?:(?:ers?|s))?|and)|l(?:anc(?:e(?:(?:rs?|s))?|ing)|y)|m(?:a(?:sonry|n)|en)|r(?:ange)?|d(?:oms?)?|z(?:e(?:(?:rs?|s))?|ing)|ing))?|n(?:etic(?:ally)?|z(?:ie(?:d(?:ly)?|s)|y)|ch)|quen(?:c(?:ies|y)|t(?:(?:ing|ly|ed|s))?)|t(?:(?:ful(?:(?:ness|ly))?|board|less|s(?:aws?)?|t(?:ing|ed)|work))?|s(?:h(?:(?:water|e(?:n(?:(?:ing|e(?:rs?|d)|s))?|rs?|st)|ness|m(?:an|en)|ly))?|co)|ight(?:(?:e(?:rs?|d)|s))?|ak(?:(?:ish|ed|y|s))?|ckle(?:[ds])?|ons?|ud|ya)|y(?:(?:ings?|ers?))?)|e(?:a(?:t(?:(?:her(?:(?:weight|light|ing|ed|s|y))?|ur(?:e(?:(?:less|d|s))?|ing)|s))?|r(?:(?:less(?:(?:ness|ly))?|s(?:ome(?:(?:ness|ly))?)?|ful(?:(?:ness|ly))?|ing|ed))?|s(?:ib(?:ility|l[ey])|t(?:(?:ing|ed|s))?)|lty)|l(?:i(?:ci(?:t(?:ations?|ous|ies|y)|a)|nes?)|l(?:(?:ow(?:s(?:hips?)?)?|atio|ing|e[rd]|s))?|dspars?|on(?:(?:ious|y|s))?|t(?:pen)?)|r(?:oci(?:ous(?:(?:ness|ly))?|ty)|r(?:o(?:magnetic|us)|et(?:(?:ing|ed|s))?|y(?:(?:ing|man))?|ule|i(?:te|e[sd]|c))|til(?:i(?:s(?:ation|e(?:(?:rs?|s|d))?|ing)|ty)|e)|m(?:ent(?:(?:ation|ing|ed|s))?|ions?)|v(?:ent(?:ly)?|id(?:ly)?|our)|al|n(?:[sy])?)|c(?:kless(?:ness)?|und(?:ity)?)|e(?:(?:bl(?:e(?:(?:minded|ness|st|r))?|y)|d(?:(?:s(?:t(?:uffs|ock))?|back|ings?|ers?))?|l(?:(?:ing(?:(?:ly|s))?|ers?|s))?|t|s))?|d(?:(?:era(?:l(?:(?:is(?:ts?|m)|ly))?|t(?:ions?|ed?))|ora|up|s))?|s(?:t(?:(?:iv(?:it(?:ies|y)|als?|e)|oon(?:(?:ing|ed|s))?|er(?:(?:ing|ed|s))?|al))?|cue)|t(?:i(?:sh(?:(?:is(?:t(?:(?:ic|s))?|m)|es))?|d)|ch(?:(?:ing|e[sd]))?|locks?|t(?:er(?:(?:ed|s))?|le)|al|e(?:[ds])?|us)|ver(?:(?:ish(?:ly)?|ed|s))?|m(?:ini(?:n(?:ity|e(?:ly)?)|s(?:ts?|m))|ale(?:(?:ness|s))?|urs?)|n(?:(?:c(?:e(?:(?:post|rs?|s|d))?|ings?)|land|d(?:(?:ing|e(?:rs?|d)|s))?|nel|s))?|ud(?:(?:al(?:ism)?|i(?:st|ng)|ed|s))?|br(?:uary|ile)|i(?:gn(?:(?:ing|ed|s))?|nt(?:(?:ing|ed|s))?)|w(?:(?:ness|e(?:st|r)))?|z)|l(?:a(?:b(?:(?:b(?:ergasted|ie(?:st|r)|y)|s))?|g(?:(?:ella(?:t(?:ion|e))?|rant(?:ly)?|s(?:hips?)?|g(?:ing|ed)|pole|ons?))?|m(?:boyan(?:t(?:ly)?|ce)|mab(?:ility|le)|e(?:(?:proof|nco|s|d))?|ingo?)|t(?:(?:t(?:e(?:r(?:(?:ing(?:ly)?|e(?:rs?|d)|s|y))?|n(?:(?:ing|ed|s))?|st)|ish)|u(?:len(?:ce|t)|s)|mates?|worms|fish|ness|ly|s))?|n(?:(?:nel(?:(?:ette|s))?|k(?:(?:ing|e[rd]|s))?|ge(?:[sd])?|s))?|s(?:h(?:(?:lights?|points?|b(?:acks?|ulb)|i(?:e(?:st|r)|ly|ng)|e[srd]|y))?|ks?)|vour(?:(?:ings?|ed|s))?|w(?:(?:less(?:ly)?|ed|s))?|c(?:cid(?:ity)?|k)|u(?:nt(?:(?:ing|ed|s))?|tist)|k(?:(?:i(?:est|ng)|e(?:[sd])?|y))?|p(?:(?:jack|p(?:e(?:rs?|d)|ing)|s))?|r(?:e(?:(?:ups?|s|d))?|ing)|y(?:(?:ing|e(?:rs?|d)))?|x(?:en)?|ir)|e(?:x(?:(?:i(?:b(?:ilit(?:ies|y)|l[ey])|on|ng|le)|or|e[sd]))?|e(?:(?:t(?:(?:ing(?:ly)?|ly|e[rd]|s))?|c(?:ing|e(?:[sd])?|y)|ing|s))?|d(?:g(?:lings?|e(?:(?:ling|s|d))?))?|a(?:(?:bites|s))?|sh(?:(?:i(?:e(?:st|r)|ng)|l(?:ess|y)|pots|e[srd]|y))?|mish|ck(?:(?:ed|s))?|w)|i(?:rt(?:(?:atio(?:us(?:ly)?|ns?)|ing|ed|s))?|p(?:(?:p(?:a(?:n(?:t(?:ly)?|cy)|ble)|e(?:rs?|d)|ing)|flops?|s))?|n(?:t(?:(?:locks?|y|s))?|ch(?:(?:ing|ed))?|g(?:(?:ing|s))?)|ms(?:i(?:ness|e(?:st|r)|ly)|y)|ght(?:(?:path|less|ed|y|s))?|ck(?:(?:e(?:r(?:(?:ing|ed|s|y))?|d)|ing|s))?|t(?:(?:t(?:ing|ed)|ing|s))?|e(?:rs?|s))|o(?:o(?:d(?:(?:li(?:ght(?:(?:ing|s))?|t)|gates|ing|ed|s))?|r(?:(?:boards?|s(?:pace)?|ing|ed))?|z(?:ies?|y))|u(?:n(?:der(?:(?:ing|ed|s))?|c(?:ing|e(?:[ds])?))|r(?:(?:ish(?:(?:ing|e[sd]))?|ed|y|s))?|t(?:(?:ing|ed|s))?)|w(?:(?:e(?:r(?:(?:pots?|less|ing|ed|y|s))?|d)|ing|n|s))?|t(?:ations?|illas?|sam)|g(?:(?:g(?:ings?|e(?:rs?|d))|s))?|p(?:(?:p(?:i(?:e(?:st?|r)|ng)|e[rd]|y)|s))?|at(?:(?:e(?:rs?|d)|ing|y|s))?|ck(?:(?:ing|ed|s))?|r(?:e(?:nce|at|t)|i(?:d(?:(?:ly|a))?|sts?|ns?)|a(?:[sl])?)|ss(?:(?:ing|es|y))?|e)|u(?:or(?:(?:ocarbons?|esc(?:e(?:(?:n(?:ce|t)|s))?|ing)|i(?:d(?:ation|e)|ne)))?|ctuat(?:i(?:ons?|ng)|e(?:[sd])?)|t(?:ter(?:(?:ing|ed|s|y))?|i(?:st|ng)|e(?:[sd])?)|ff(?:(?:i(?:e(?:st|r)|ng)|ed|y|s))?|id(?:(?:i(?:sed|ty)|ly|s))?|s(?:ter(?:ed)?|h(?:(?:ing|e[srd]))?)|e(?:(?:n(?:t(?:ly)?|cy)|s))?|k(?:ie(?:st|r)|e(?:[ys])?)|rr(?:ie[ds]|y)|vial|n(?:ked|g)|m(?:ped|es)|b(?:bed)?|x(?:es)?)|y(?:(?:w(?:eight|heel|ays?)|overs?|pa(?:per|st)|half|away|ing|ers?))?)|jords?)|y(?:o(?:u(?:(?:th(?:(?:ful(?:ness)?|s))?|ng(?:(?:sters?|ish|e(?:st|r)))?|r(?:s(?:el(?:ves|f))?)?))?|del(?:(?:l(?:ing|e[rd])|s))?|r(?:k(?:ers?)?|e)|n(?:der)?|ke(?:(?:ls?|s|d))?|lks?|yo|wl|g[ia])|a(?:r(?:d(?:(?:s(?:ticks?)?|age))?|ns?)|cht(?:(?:s(?:m(?:an|en))?|ing))?|w(?:(?:n(?:(?:ing(?:ly)?|ed|s))?|ls?|ed|s))?|le(?:lock)?|p(?:(?:ping|s))?|nk(?:(?:ees?|s))?|ms?|ks?)|e(?:a(?:(?:r(?:(?:n(?:(?:ing(?:(?:ly|s))?|ed|s))?|l(?:ings?|ong|y)|books?|s))?|s(?:t(?:[ys])?)?|ned|h))?|s(?:ter(?:days?|year))?|l(?:l(?:(?:ow(?:(?:i(?:sh|ng)|e[rd]|y|s))?|ings?|ed|s))?|p(?:(?:ings?|ed|s))?)|om(?:an(?:ry)?|en)|t(?:is?)?|men|ws?|ns?|p)|u(?:mm(?:iest|y)|le(?:tide)?|ppies?|kon|ck)|i(?:eld(?:(?:ing|ed|s))?|ddish|p(?:pee)?)|ttrium|rs)|x(?:ylophon(?:ist|e)|e(?:no(?:phob(?:i[ac]|e)|n)|rography)|ray(?:(?:ing|ed|s))?|hosas?|mas)|z(?:o(?:o(?:(?:plankton|log(?:i(?:sts?|cal)|y)|keepers|m(?:(?:ing|ed|s))?|s))?|n(?:a(?:tion|l)|ing|e(?:[sd])?)|mbi(?:es?)?)|e(?:al(?:(?:o(?:us(?:(?:ness|ly))?|t(?:(?:ry|s))?)|s))?|st(?:(?:fully|y))?|p(?:pelin|hyrs?)|olites?|ro(?:(?:ing|ed))?|niths?|b(?:ras?|us?)|us|ta|es)|i(?:g(?:zag(?:(?:g(?:ing|ed)|s))?)?|on(?:is(?:ts?|m))?|mbabwe|llions?|thers?|p(?:(?:p(?:ing|e(?:rs?|d)|y)|s))?|nc)|a(?:n(?:zibar|iest|y)|mb(?:ia(?:ns?)?|ezi)|p(?:(?:p(?:ing|y)|s))?|ire|g)|ulus?))");
   return _elm.Words.values = {_op: _op,re: re};
};
Elm.Native.Time = {};

Elm.Native.Time.make = function(localRuntime)
{
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Time = localRuntime.Native.Time || {};
	if (localRuntime.Native.Time.values)
	{
		return localRuntime.Native.Time.values;
	}

	var NS = Elm.Native.Signal.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);


	// FRAMES PER SECOND

	function fpsWhen(desiredFPS, isOn)
	{
		var msPerFrame = 1000 / desiredFPS;
		var ticker = NS.input('fps-' + desiredFPS, null);

		function notifyTicker()
		{
			localRuntime.notify(ticker.id, null);
		}

		function firstArg(x, y)
		{
			return x;
		}

		// input fires either when isOn changes, or when ticker fires.
		// Its value is a tuple with the current timestamp, and the state of isOn
		var input = NS.timestamp(A3(NS.map2, F2(firstArg), NS.dropRepeats(isOn), ticker));

		var initialState = {
			isOn: false,
			time: localRuntime.timer.programStart,
			delta: 0
		};

		var timeoutId;

		function update(input, state)
		{
			var currentTime = input._0;
			var isOn = input._1;
			var wasOn = state.isOn;
			var previousTime = state.time;

			if (isOn)
			{
				timeoutId = localRuntime.setTimeout(notifyTicker, msPerFrame);
			}
			else if (wasOn)
			{
				clearTimeout(timeoutId);
			}

			return {
				isOn: isOn,
				time: currentTime,
				delta: (isOn && !wasOn) ? 0 : currentTime - previousTime
			};
		}

		return A2(
			NS.map,
			function(state) { return state.delta; },
			A3(NS.foldp, F2(update), update(input.value, initialState), input)
		);
	}


	// EVERY

	function every(t)
	{
		var ticker = NS.input('every-' + t, null);
		function tellTime()
		{
			localRuntime.notify(ticker.id, null);
		}
		var clock = A2(NS.map, fst, NS.timestamp(ticker));
		setInterval(tellTime, t);
		return clock;
	}


	function fst(pair)
	{
		return pair._0;
	}


	function read(s)
	{
		var t = Date.parse(s);
		return isNaN(t) ? Maybe.Nothing : Maybe.Just(t);
	}

	return localRuntime.Native.Time.values = {
		fpsWhen: F2(fpsWhen),
		every: every,
		toDate: function(t) { return new Date(t); },
		read: read
	};
};

Elm.Time = Elm.Time || {};
Elm.Time.make = function (_elm) {
   "use strict";
   _elm.Time = _elm.Time || {};
   if (_elm.Time.values) return _elm.Time.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Native$Signal = Elm.Native.Signal.make(_elm),
   $Native$Time = Elm.Native.Time.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var delay = $Native$Signal.delay;
   var since = F2(function (time,signal) {
      var stop = A2($Signal.map,
      $Basics.always(-1),
      A2(delay,time,signal));
      var start = A2($Signal.map,$Basics.always(1),signal);
      var delaydiff = A3($Signal.foldp,
      F2(function (x,y) {    return x + y;}),
      0,
      A2($Signal.merge,start,stop));
      return A2($Signal.map,
      F2(function (x,y) {    return !_U.eq(x,y);})(0),
      delaydiff);
   });
   var timestamp = $Native$Signal.timestamp;
   var every = $Native$Time.every;
   var fpsWhen = $Native$Time.fpsWhen;
   var fps = function (targetFrames) {
      return A2(fpsWhen,targetFrames,$Signal.constant(true));
   };
   var inMilliseconds = function (t) {    return t;};
   var millisecond = 1;
   var second = 1000 * millisecond;
   var minute = 60 * second;
   var hour = 60 * minute;
   var inHours = function (t) {    return t / hour;};
   var inMinutes = function (t) {    return t / minute;};
   var inSeconds = function (t) {    return t / second;};
   return _elm.Time.values = {_op: _op
                             ,millisecond: millisecond
                             ,second: second
                             ,minute: minute
                             ,hour: hour
                             ,inMilliseconds: inMilliseconds
                             ,inSeconds: inSeconds
                             ,inMinutes: inMinutes
                             ,inHours: inHours
                             ,fps: fps
                             ,fpsWhen: fpsWhen
                             ,every: every
                             ,timestamp: timestamp
                             ,delay: delay
                             ,since: since};
};
Elm.Html = Elm.Html || {};
Elm.Html.Events = Elm.Html.Events || {};
Elm.Html.Events.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Events = _elm.Html.Events || {};
   if (_elm.Html.Events.values) return _elm.Html.Events.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var keyCode = A2($Json$Decode._op[":="],
   "keyCode",
   $Json$Decode.$int);
   var targetChecked = A2($Json$Decode.at,
   _U.list(["target","checked"]),
   $Json$Decode.bool);
   var targetValue = A2($Json$Decode.at,
   _U.list(["target","value"]),
   $Json$Decode.string);
   var defaultOptions = $VirtualDom.defaultOptions;
   var Options = F2(function (a,b) {
      return {stopPropagation: a,preventDefault: b};
   });
   var onWithOptions = $VirtualDom.onWithOptions;
   var on = $VirtualDom.on;
   var messageOn = F3(function (name,addr,msg) {
      return A3(on,
      name,
      $Json$Decode.value,
      function (_p0) {
         return A2($Signal.message,addr,msg);
      });
   });
   var onClick = messageOn("click");
   var onDoubleClick = messageOn("dblclick");
   var onMouseMove = messageOn("mousemove");
   var onMouseDown = messageOn("mousedown");
   var onMouseUp = messageOn("mouseup");
   var onMouseEnter = messageOn("mouseenter");
   var onMouseLeave = messageOn("mouseleave");
   var onMouseOver = messageOn("mouseover");
   var onMouseOut = messageOn("mouseout");
   var onBlur = messageOn("blur");
   var onFocus = messageOn("focus");
   var onSubmit = messageOn("submit");
   var onKey = F3(function (name,addr,handler) {
      return A3(on,
      name,
      keyCode,
      function (code) {
         return A2($Signal.message,addr,handler(code));
      });
   });
   var onKeyUp = onKey("keyup");
   var onKeyDown = onKey("keydown");
   var onKeyPress = onKey("keypress");
   return _elm.Html.Events.values = {_op: _op
                                    ,onBlur: onBlur
                                    ,onFocus: onFocus
                                    ,onSubmit: onSubmit
                                    ,onKeyUp: onKeyUp
                                    ,onKeyDown: onKeyDown
                                    ,onKeyPress: onKeyPress
                                    ,onClick: onClick
                                    ,onDoubleClick: onDoubleClick
                                    ,onMouseMove: onMouseMove
                                    ,onMouseDown: onMouseDown
                                    ,onMouseUp: onMouseUp
                                    ,onMouseEnter: onMouseEnter
                                    ,onMouseLeave: onMouseLeave
                                    ,onMouseOver: onMouseOver
                                    ,onMouseOut: onMouseOut
                                    ,on: on
                                    ,onWithOptions: onWithOptions
                                    ,defaultOptions: defaultOptions
                                    ,targetValue: targetValue
                                    ,targetChecked: targetChecked
                                    ,keyCode: keyCode
                                    ,Options: Options};
};
Elm.Random = Elm.Random || {};
Elm.Random.make = function (_elm) {
   "use strict";
   _elm.Random = _elm.Random || {};
   if (_elm.Random.values) return _elm.Random.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $List = Elm.List.make(_elm);
   var _op = {};
   var magicNum8 = 2147483562;
   var range = function (_p0) {
      return {ctor: "_Tuple2",_0: 0,_1: magicNum8};
   };
   var magicNum7 = 2137383399;
   var magicNum6 = 2147483563;
   var magicNum5 = 3791;
   var magicNum4 = 40692;
   var magicNum3 = 52774;
   var magicNum2 = 12211;
   var magicNum1 = 53668;
   var magicNum0 = 40014;
   var generate = F2(function (_p1,seed) {
      var _p2 = _p1;
      return _p2._0(seed);
   });
   var Seed = function (a) {    return {ctor: "Seed",_0: a};};
   var State = F2(function (a,b) {
      return {ctor: "State",_0: a,_1: b};
   });
   var initState = function (s$) {
      var s = A2($Basics.max,s$,0 - s$);
      var q = s / (magicNum6 - 1) | 0;
      var s2 = A2($Basics._op["%"],q,magicNum7 - 1);
      var s1 = A2($Basics._op["%"],s,magicNum6 - 1);
      return A2(State,s1 + 1,s2 + 1);
   };
   var next = function (_p3) {
      var _p4 = _p3;
      var _p6 = _p4._1;
      var _p5 = _p4._0;
      var k$ = _p6 / magicNum3 | 0;
      var s2$ = magicNum4 * (_p6 - k$ * magicNum3) - k$ * magicNum5;
      var s2$$ = _U.cmp(s2$,0) < 0 ? s2$ + magicNum7 : s2$;
      var k = _p5 / magicNum1 | 0;
      var s1$ = magicNum0 * (_p5 - k * magicNum1) - k * magicNum2;
      var s1$$ = _U.cmp(s1$,0) < 0 ? s1$ + magicNum6 : s1$;
      var z = s1$$ - s2$$;
      var z$ = _U.cmp(z,1) < 0 ? z + magicNum8 : z;
      return {ctor: "_Tuple2",_0: z$,_1: A2(State,s1$$,s2$$)};
   };
   var split = function (_p7) {
      var _p8 = _p7;
      var _p11 = _p8._1;
      var _p10 = _p8._0;
      var _p9 = $Basics.snd(next(_p8));
      var t1 = _p9._0;
      var t2 = _p9._1;
      var new_s2 = _U.eq(_p11,1) ? magicNum7 - 1 : _p11 - 1;
      var new_s1 = _U.eq(_p10,magicNum6 - 1) ? 1 : _p10 + 1;
      return {ctor: "_Tuple2"
             ,_0: A2(State,new_s1,t2)
             ,_1: A2(State,t1,new_s2)};
   };
   var initialSeed = function (n) {
      return Seed({state: initState(n)
                  ,next: next
                  ,split: split
                  ,range: range});
   };
   var Generator = function (a) {
      return {ctor: "Generator",_0: a};
   };
   var andThen = F2(function (_p12,callback) {
      var _p13 = _p12;
      return Generator(function (seed) {
         var _p14 = _p13._0(seed);
         var result = _p14._0;
         var newSeed = _p14._1;
         var _p15 = callback(result);
         var genB = _p15._0;
         return genB(newSeed);
      });
   });
   var map5 = F6(function (func,_p20,_p19,_p18,_p17,_p16) {
      var _p21 = _p20;
      var _p22 = _p19;
      var _p23 = _p18;
      var _p24 = _p17;
      var _p25 = _p16;
      return Generator(function (seed0) {
         var _p26 = _p21._0(seed0);
         var a = _p26._0;
         var seed1 = _p26._1;
         var _p27 = _p22._0(seed1);
         var b = _p27._0;
         var seed2 = _p27._1;
         var _p28 = _p23._0(seed2);
         var c = _p28._0;
         var seed3 = _p28._1;
         var _p29 = _p24._0(seed3);
         var d = _p29._0;
         var seed4 = _p29._1;
         var _p30 = _p25._0(seed4);
         var e = _p30._0;
         var seed5 = _p30._1;
         return {ctor: "_Tuple2",_0: A5(func,a,b,c,d,e),_1: seed5};
      });
   });
   var map4 = F5(function (func,_p34,_p33,_p32,_p31) {
      var _p35 = _p34;
      var _p36 = _p33;
      var _p37 = _p32;
      var _p38 = _p31;
      return Generator(function (seed0) {
         var _p39 = _p35._0(seed0);
         var a = _p39._0;
         var seed1 = _p39._1;
         var _p40 = _p36._0(seed1);
         var b = _p40._0;
         var seed2 = _p40._1;
         var _p41 = _p37._0(seed2);
         var c = _p41._0;
         var seed3 = _p41._1;
         var _p42 = _p38._0(seed3);
         var d = _p42._0;
         var seed4 = _p42._1;
         return {ctor: "_Tuple2",_0: A4(func,a,b,c,d),_1: seed4};
      });
   });
   var map3 = F4(function (func,_p45,_p44,_p43) {
      var _p46 = _p45;
      var _p47 = _p44;
      var _p48 = _p43;
      return Generator(function (seed0) {
         var _p49 = _p46._0(seed0);
         var a = _p49._0;
         var seed1 = _p49._1;
         var _p50 = _p47._0(seed1);
         var b = _p50._0;
         var seed2 = _p50._1;
         var _p51 = _p48._0(seed2);
         var c = _p51._0;
         var seed3 = _p51._1;
         return {ctor: "_Tuple2",_0: A3(func,a,b,c),_1: seed3};
      });
   });
   var map2 = F3(function (func,_p53,_p52) {
      var _p54 = _p53;
      var _p55 = _p52;
      return Generator(function (seed0) {
         var _p56 = _p54._0(seed0);
         var a = _p56._0;
         var seed1 = _p56._1;
         var _p57 = _p55._0(seed1);
         var b = _p57._0;
         var seed2 = _p57._1;
         return {ctor: "_Tuple2",_0: A2(func,a,b),_1: seed2};
      });
   });
   var map = F2(function (func,_p58) {
      var _p59 = _p58;
      return Generator(function (seed0) {
         var _p60 = _p59._0(seed0);
         var a = _p60._0;
         var seed1 = _p60._1;
         return {ctor: "_Tuple2",_0: func(a),_1: seed1};
      });
   });
   var listHelp = F4(function (list,n,generate,seed) {
      listHelp: while (true) if (_U.cmp(n,1) < 0)
      return {ctor: "_Tuple2",_0: $List.reverse(list),_1: seed};
      else {
            var _p61 = generate(seed);
            var value = _p61._0;
            var newSeed = _p61._1;
            var _v19 = A2($List._op["::"],value,list),
            _v20 = n - 1,
            _v21 = generate,
            _v22 = newSeed;
            list = _v19;
            n = _v20;
            generate = _v21;
            seed = _v22;
            continue listHelp;
         }
   });
   var list = F2(function (n,_p62) {
      var _p63 = _p62;
      return Generator(function (seed) {
         return A4(listHelp,_U.list([]),n,_p63._0,seed);
      });
   });
   var pair = F2(function (genA,genB) {
      return A3(map2,
      F2(function (v0,v1) {
         return {ctor: "_Tuple2",_0: v0,_1: v1};
      }),
      genA,
      genB);
   });
   var minInt = -2147483648;
   var maxInt = 2147483647;
   var iLogBase = F2(function (b,i) {
      return _U.cmp(i,b) < 0 ? 1 : 1 + A2(iLogBase,b,i / b | 0);
   });
   var $int = F2(function (a,b) {
      return Generator(function (_p64) {
         var _p65 = _p64;
         var _p70 = _p65._0;
         var base = 2147483561;
         var f = F3(function (n,acc,state) {
            f: while (true) {
               var _p66 = n;
               if (_p66 === 0) {
                     return {ctor: "_Tuple2",_0: acc,_1: state};
                  } else {
                     var _p67 = _p70.next(state);
                     var x = _p67._0;
                     var state$ = _p67._1;
                     var _v26 = n - 1,_v27 = x + acc * base,_v28 = state$;
                     n = _v26;
                     acc = _v27;
                     state = _v28;
                     continue f;
                  }
            }
         });
         var _p68 = _U.cmp(a,b) < 0 ? {ctor: "_Tuple2"
                                      ,_0: a
                                      ,_1: b} : {ctor: "_Tuple2",_0: b,_1: a};
         var lo = _p68._0;
         var hi = _p68._1;
         var k = hi - lo + 1;
         var n = A2(iLogBase,base,k);
         var _p69 = A3(f,n,1,_p70.state);
         var v = _p69._0;
         var state$ = _p69._1;
         return {ctor: "_Tuple2"
                ,_0: lo + A2($Basics._op["%"],v,k)
                ,_1: Seed(_U.update(_p70,{state: state$}))};
      });
   });
   var $float = F2(function (a,b) {
      return Generator(function (seed) {
         var _p71 = A2(generate,A2($int,minInt,maxInt),seed);
         var number = _p71._0;
         var newSeed = _p71._1;
         var negativeOneToOne = $Basics.toFloat(number) / $Basics.toFloat(maxInt - minInt);
         var _p72 = _U.cmp(a,b) < 0 ? {ctor: "_Tuple2"
                                      ,_0: a
                                      ,_1: b} : {ctor: "_Tuple2",_0: b,_1: a};
         var lo = _p72._0;
         var hi = _p72._1;
         var scaled = (lo + hi) / 2 + (hi - lo) * negativeOneToOne;
         return {ctor: "_Tuple2",_0: scaled,_1: newSeed};
      });
   });
   var bool = A2(map,
   F2(function (x,y) {    return _U.eq(x,y);})(1),
   A2($int,0,1));
   return _elm.Random.values = {_op: _op
                               ,bool: bool
                               ,$int: $int
                               ,$float: $float
                               ,list: list
                               ,pair: pair
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,andThen: andThen
                               ,minInt: minInt
                               ,maxInt: maxInt
                               ,generate: generate
                               ,initialSeed: initialSeed};
};
Elm.Chimp = Elm.Chimp || {};
Elm.Chimp.make = function (_elm) {
   "use strict";
   _elm.Chimp = _elm.Chimp || {};
   if (_elm.Chimp.values) return _elm.Chimp.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Belt = Elm.Belt.make(_elm),
   $Char = Elm.Char.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Events = Elm.Html.Events.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Random = Elm.Random.make(_elm),
   $Regex = Elm.Regex.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm),
   $Time = Elm.Time.make(_elm),
   $Words = Elm.Words.make(_elm);
   var _op = {};
   _op["=>"] = F2(function (v0,v1) {
      return {ctor: "_Tuple2",_0: v0,_1: v1};
   });
   var speedToInterval = function (speed) {
      return (500 - ($Basics.toFloat(speed) - 1) * 50) * $Time.millisecond;
   };
   var detectWord = function (register) {
      var matches = A3($Regex.find,
      $Regex.AtMost(1),
      $Words.re,
      register);
      var _p0 = $List.head(matches);
      if (_p0.ctor === "Nothing") {
            return $Maybe.Nothing;
         } else {
            return $Maybe.Just(_p0._0.match);
         }
   };
   var generateChar = function (seed) {
      var gen = A2($Random.$int,97,122);
      var _p1 = A2($Random.generate,gen,seed);
      var charCode = _p1._0;
      var nextSeed = _p1._1;
      return {ctor: "_Tuple2"
             ,_0: $Char.fromCode(charCode)
             ,_1: nextSeed};
   };
   var view = F3(function (ctx,cash,model) {
      return A2($Html.div,
      _U.list([$Html$Attributes.$class("panel panel-default col-md-3 col-sm-4 col-xs-6")]),
      _U.list([A2($Html.div,
      _U.list([$Html$Attributes.$class("panel-body")]),
      _U.list([A2($Html.p,
              _U.list([]),
              _U.list([A2($Html.code,
                      _U.list([]),
                      _U.list([$Html.text($String.fromList(model.register))]))
                      ,A2($Html.img,
                      _U.list([$Html$Attributes.src("public/img/monkey.gif")]),
                      _U.list([]))]))
              ,A2($Html.ul,
              _U.list([$Html$Attributes.$class("list-unstyled")]),
              _U.list([A2($Html.li,
                      _U.list([]),
                      _U.list([$Html.text(A2($Basics._op["++"],
                              "Speed: ",
                              A2($Basics._op["++"],$Basics.toString(model.speed)," ")))
                              ,function () {
                                 var speedPrice = $Belt.calcSpeedPrice(model.speed);
                                 var canAffordSpeed = _U.cmp(cash,speedPrice) > -1;
                                 return A2($Html.button,
                                 _U.list([A2($Html$Events.onClick,ctx.incSpeed,{ctor: "_Tuple0"})
                                         ,$Html$Attributes.classList(_U.list([A2(_op["=>"],"btn",true)
                                                                             ,A2(_op["=>"],"disabled",_U.eq(model.speed,10))
                                                                             ,A2(_op["=>"],"btn-success",canAffordSpeed)
                                                                             ,A2(_op["=>"],"btn-default",$Basics.not(canAffordSpeed))
                                                                             ,A2(_op["=>"],"btn-xs",true)]))
                                         ,$Html$Attributes.disabled($Basics.not(canAffordSpeed))]),
                                 _U.list([function () {
                                    var cost = _U.eq(model.speed,
                                    10) ? "Max" : A2($Basics._op["++"],
                                    "$",
                                    $Basics.toString(speedPrice));
                                    return $Html.text(A2($Basics._op["++"],
                                    "Upgrade (",
                                    A2($Basics._op["++"],cost,")")));
                                 }()]));
                              }()]))
                      ,A2($Html.li,
                      _U.list([]),
                      _U.list([$Html.text(A2($Basics._op["++"],
                      "Words: ",
                      $Basics.toString(model.wordCount)))]))
                      ,A2($Html.li,
                      _U.list([]),
                      _U.list([A2($Html.span,
                              _U.list([]),
                              _U.list([$Html.text("Latest Word: ")]))
                              ,A2($Html.code,
                              _U.list([]),
                              _U.list([$Html.text(A2($Maybe.withDefault,
                              "--",
                              model.latestWord))]))]))
                      ,A2($Html.li,
                      _U.list([]),
                      _U.list([$Html.text(A2($Basics._op["++"],
                      "Cash Generated: $",
                      $Basics.toString(model.cashTotal)))]))]))]))]));
   });
   var Context = F2(function (a,b) {
      return {actions: a,incSpeed: b};
   });
   var update = F2(function (action,model) {
      var _p2 = action;
      if (_p2.ctor === "IncSpeed") {
            if (_U.cmp(model.speed + 1,10) > 0) return model; else {
                  var newSpeed = model.speed + 1;
                  var newInterval = speedToInterval(newSpeed);
                  return _U.update(model,{speed: newSpeed,interval: newInterval});
               }
         } else {
            var _p10 = _p2._0;
            var _p3 = model.prevBeat;
            if (_p3.ctor === "Nothing") {
                  return _U.update(model,{prevBeat: $Maybe.Just(_p10)});
               } else {
                  var _p9 = _p3._0;
                  if (_U.cmp(_p10 - _p9,model.interval) > 0) {
                        var detectedWord = detectWord($String.fromList(model.register));
                        var nextLatestWords = function () {
                           var _p4 = detectedWord;
                           if (_p4.ctor === "Nothing") {
                                 return model.latestWords;
                              } else {
                                 return A2($List._op["::"],_p4._0,model.latestWords);
                              }
                        }();
                        var nextWordCount = function () {
                           var _p5 = detectedWord;
                           if (_p5.ctor === "Nothing") {
                                 return model.wordCount;
                              } else {
                                 return model.wordCount + 1;
                              }
                        }();
                        var nextLatestWord = function () {
                           var _p6 = detectedWord;
                           if (_p6.ctor === "Nothing") {
                                 return model.latestWord;
                              } else {
                                 return $Maybe.Just(_p6._0);
                              }
                        }();
                        var nextCashTotal = function () {
                           var _p7 = detectedWord;
                           if (_p7.ctor === "Nothing") {
                                 return model.cashTotal;
                              } else {
                                 return model.cashTotal + $Belt.scoreWord(_p7._0);
                              }
                        }();
                        var _p8 = generateChar(model.seed);
                        var $char = _p8._0;
                        var nextSeed = _p8._1;
                        var nextRegister = _U.eq($List.length(model.register),
                        15) ? A2($List.append,
                        A2($List.drop,1,model.register),
                        _U.list([$char])) : A2($List.append,
                        model.register,
                        _U.list([$char]));
                        return _U.update(model,
                        {prevBeat: $Maybe.Just(_p9 + model.interval)
                        ,register: nextRegister
                        ,seed: nextSeed
                        ,latestWords: nextLatestWords
                        ,latestWord: nextLatestWord
                        ,wordCount: nextWordCount
                        ,cashTotal: nextCashTotal});
                     } else return model;
               }
         }
   });
   var IncSpeed = {ctor: "IncSpeed"};
   var Beat = function (a) {    return {ctor: "Beat",_0: a};};
   var init = F2(function (seed,speed) {
      var interval = speedToInterval(speed);
      return {register: A2($List.repeat,15,_U.chr("_"))
             ,interval: interval
             ,prevBeat: $Maybe.Nothing
             ,seed: seed
             ,latestWords: _U.list([])
             ,speed: speed
             ,latestWord: $Maybe.Nothing
             ,wordCount: 0
             ,cashTotal: 0};
   });
   var Model = F9(function (a,b,c,d,e,f,g,h,i) {
      return {register: a
             ,interval: b
             ,prevBeat: c
             ,seed: d
             ,latestWords: e
             ,speed: f
             ,latestWord: g
             ,wordCount: h
             ,cashTotal: i};
   });
   return _elm.Chimp.values = {_op: _op
                              ,Model: Model
                              ,init: init
                              ,Beat: Beat
                              ,IncSpeed: IncSpeed
                              ,update: update
                              ,Context: Context
                              ,view: view
                              ,generateChar: generateChar
                              ,detectWord: detectWord
                              ,speedToInterval: speedToInterval};
};
Elm.Native.Current = {};
Elm.Native.Current.make = function(localRuntime) {

  localRuntime.Native = localRuntime.Native || {};
  localRuntime.Native.Current = localRuntime.Native.Current || {};

  if (localRuntime.Native.Current.values) {
    return localRuntime.Native.Current.values;
  }

  function time() {
    return new Date().getTime();
  }

  function date() {
    return new Date();
  }

  return localRuntime.Native.Current.values = {
    time: time,
    date: date,
  };
};

Elm.Native.Date = {};
Elm.Native.Date.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Date = localRuntime.Native.Date || {};
	if (localRuntime.Native.Date.values)
	{
		return localRuntime.Native.Date.values;
	}

	var Result = Elm.Result.make(localRuntime);

	function readDate(str)
	{
		var date = new Date(str);
		return isNaN(date.getTime())
			? Result.Err('unable to parse \'' + str + '\' as a date')
			: Result.Ok(date);
	}

	var dayTable = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	var monthTable =
		['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


	return localRuntime.Native.Date.values = {
		read: readDate,
		year: function(d) { return d.getFullYear(); },
		month: function(d) { return { ctor: monthTable[d.getMonth()] }; },
		day: function(d) { return d.getDate(); },
		hour: function(d) { return d.getHours(); },
		minute: function(d) { return d.getMinutes(); },
		second: function(d) { return d.getSeconds(); },
		millisecond: function(d) { return d.getMilliseconds(); },
		toTime: function(d) { return d.getTime(); },
		fromTime: function(t) { return new Date(t); },
		dayOfWeek: function(d) { return { ctor: dayTable[d.getDay()] }; }
	};
};

Elm.Date = Elm.Date || {};
Elm.Date.make = function (_elm) {
   "use strict";
   _elm.Date = _elm.Date || {};
   if (_elm.Date.values) return _elm.Date.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Native$Date = Elm.Native.Date.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var millisecond = $Native$Date.millisecond;
   var second = $Native$Date.second;
   var minute = $Native$Date.minute;
   var hour = $Native$Date.hour;
   var dayOfWeek = $Native$Date.dayOfWeek;
   var day = $Native$Date.day;
   var month = $Native$Date.month;
   var year = $Native$Date.year;
   var fromTime = $Native$Date.fromTime;
   var toTime = $Native$Date.toTime;
   var fromString = $Native$Date.read;
   var Dec = {ctor: "Dec"};
   var Nov = {ctor: "Nov"};
   var Oct = {ctor: "Oct"};
   var Sep = {ctor: "Sep"};
   var Aug = {ctor: "Aug"};
   var Jul = {ctor: "Jul"};
   var Jun = {ctor: "Jun"};
   var May = {ctor: "May"};
   var Apr = {ctor: "Apr"};
   var Mar = {ctor: "Mar"};
   var Feb = {ctor: "Feb"};
   var Jan = {ctor: "Jan"};
   var Sun = {ctor: "Sun"};
   var Sat = {ctor: "Sat"};
   var Fri = {ctor: "Fri"};
   var Thu = {ctor: "Thu"};
   var Wed = {ctor: "Wed"};
   var Tue = {ctor: "Tue"};
   var Mon = {ctor: "Mon"};
   var Date = {ctor: "Date"};
   return _elm.Date.values = {_op: _op
                             ,fromString: fromString
                             ,toTime: toTime
                             ,fromTime: fromTime
                             ,year: year
                             ,month: month
                             ,day: day
                             ,dayOfWeek: dayOfWeek
                             ,hour: hour
                             ,minute: minute
                             ,second: second
                             ,millisecond: millisecond
                             ,Jan: Jan
                             ,Feb: Feb
                             ,Mar: Mar
                             ,Apr: Apr
                             ,May: May
                             ,Jun: Jun
                             ,Jul: Jul
                             ,Aug: Aug
                             ,Sep: Sep
                             ,Oct: Oct
                             ,Nov: Nov
                             ,Dec: Dec
                             ,Mon: Mon
                             ,Tue: Tue
                             ,Wed: Wed
                             ,Thu: Thu
                             ,Fri: Fri
                             ,Sat: Sat
                             ,Sun: Sun};
};
Elm.Current = Elm.Current || {};
Elm.Current.make = function (_elm) {
   "use strict";
   _elm.Current = _elm.Current || {};
   if (_elm.Current.values) return _elm.Current.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Date = Elm.Date.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Current = Elm.Native.Current.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var date = function (_p0) {
      return $Native$Current.date({ctor: "_Tuple0"});
   };
   var time = function (_p1) {
      return $Native$Current.time({ctor: "_Tuple0"});
   };
   return _elm.Current.values = {_op: _op,time: time,date: date};
};
Elm.Native.Effects = {};
Elm.Native.Effects.make = function(localRuntime) {

	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Effects = localRuntime.Native.Effects || {};
	if (localRuntime.Native.Effects.values)
	{
		return localRuntime.Native.Effects.values;
	}

	var Task = Elm.Native.Task.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);
	var Signal = Elm.Signal.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);


	// polyfill so things will work even if rAF is not available for some reason
	var _requestAnimationFrame =
		typeof requestAnimationFrame !== 'undefined'
			? requestAnimationFrame
			: function(cb) { setTimeout(cb, 1000 / 60); }
			;


	// batchedSending and sendCallback implement a small state machine in order
	// to schedule only one send(time) call per animation frame.
	//
	// Invariants:
	// 1. In the NO_REQUEST state, there is never a scheduled sendCallback.
	// 2. In the PENDING_REQUEST and EXTRA_REQUEST states, there is always exactly
	//    one scheduled sendCallback.
	var NO_REQUEST = 0;
	var PENDING_REQUEST = 1;
	var EXTRA_REQUEST = 2;
	var state = NO_REQUEST;
	var messageArray = [];


	function batchedSending(address, tickMessages)
	{
		// insert ticks into the messageArray
		var foundAddress = false;

		for (var i = messageArray.length; i--; )
		{
			if (messageArray[i].address === address)
			{
				foundAddress = true;
				messageArray[i].tickMessages = A3(List.foldl, List.cons, messageArray[i].tickMessages, tickMessages);
				break;
			}
		}

		if (!foundAddress)
		{
			messageArray.push({ address: address, tickMessages: tickMessages });
		}

		// do the appropriate state transition
		switch (state)
		{
			case NO_REQUEST:
				_requestAnimationFrame(sendCallback);
				state = PENDING_REQUEST;
				break;
			case PENDING_REQUEST:
				state = PENDING_REQUEST;
				break;
			case EXTRA_REQUEST:
				state = PENDING_REQUEST;
				break;
		}
	}


	function sendCallback(time)
	{
		switch (state)
		{
			case NO_REQUEST:
				// This state should not be possible. How can there be no
				// request, yet somehow we are actively fulfilling a
				// request?
				throw new Error(
					'Unexpected send callback.\n' +
					'Please report this to <https://github.com/evancz/elm-effects/issues>.'
				);

			case PENDING_REQUEST:
				// At this point, we do not *know* that another frame is
				// needed, but we make an extra request to rAF just in
				// case. It's possible to drop a frame if rAF is called
				// too late, so we just do it preemptively.
				_requestAnimationFrame(sendCallback);
				state = EXTRA_REQUEST;

				// There's also stuff we definitely need to send.
				send(time);
				return;

			case EXTRA_REQUEST:
				// Turns out the extra request was not needed, so we will
				// stop calling rAF. No reason to call it all the time if
				// no one needs it.
				state = NO_REQUEST;
				return;
		}
	}


	function send(time)
	{
		for (var i = messageArray.length; i--; )
		{
			var messages = A3(
				List.foldl,
				F2( function(toAction, list) { return List.Cons(toAction(time), list); } ),
				List.Nil,
				messageArray[i].tickMessages
			);
			Task.perform( A2(Signal.send, messageArray[i].address, messages) );
		}
		messageArray = [];
	}


	function requestTickSending(address, tickMessages)
	{
		return Task.asyncFunction(function(callback) {
			batchedSending(address, tickMessages);
			callback(Task.succeed(Utils.Tuple0));
		});
	}


	return localRuntime.Native.Effects.values = {
		requestTickSending: F2(requestTickSending)
	};

};

Elm.Effects = Elm.Effects || {};
Elm.Effects.make = function (_elm) {
   "use strict";
   _elm.Effects = _elm.Effects || {};
   if (_elm.Effects.values) return _elm.Effects.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Effects = Elm.Native.Effects.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var ignore = function (task) {
      return A2($Task.map,$Basics.always({ctor: "_Tuple0"}),task);
   };
   var requestTickSending = $Native$Effects.requestTickSending;
   var toTaskHelp = F3(function (address,effect,_p0) {
      var _p1 = _p0;
      var _p5 = _p1._1;
      var _p4 = _p1;
      var _p3 = _p1._0;
      var _p2 = effect;
      switch (_p2.ctor)
      {case "Task": var reporter = A2($Task.andThen,
           _p2._0,
           function (answer) {
              return A2($Signal.send,address,_U.list([answer]));
           });
           return {ctor: "_Tuple2"
                  ,_0: A2($Task.andThen,
                  _p3,
                  $Basics.always(ignore($Task.spawn(reporter))))
                  ,_1: _p5};
         case "Tick": return {ctor: "_Tuple2"
                             ,_0: _p3
                             ,_1: A2($List._op["::"],_p2._0,_p5)};
         case "None": return _p4;
         default: return A3($List.foldl,toTaskHelp(address),_p4,_p2._0);}
   });
   var toTask = F2(function (address,effect) {
      var _p6 = A3(toTaskHelp,
      address,
      effect,
      {ctor: "_Tuple2"
      ,_0: $Task.succeed({ctor: "_Tuple0"})
      ,_1: _U.list([])});
      var combinedTask = _p6._0;
      var tickMessages = _p6._1;
      return $List.isEmpty(tickMessages) ? combinedTask : A2($Task.andThen,
      combinedTask,
      $Basics.always(A2(requestTickSending,address,tickMessages)));
   });
   var Never = function (a) {    return {ctor: "Never",_0: a};};
   var Batch = function (a) {    return {ctor: "Batch",_0: a};};
   var batch = Batch;
   var None = {ctor: "None"};
   var none = None;
   var Tick = function (a) {    return {ctor: "Tick",_0: a};};
   var tick = Tick;
   var Task = function (a) {    return {ctor: "Task",_0: a};};
   var task = Task;
   var map = F2(function (func,effect) {
      var _p7 = effect;
      switch (_p7.ctor)
      {case "Task": return Task(A2($Task.map,func,_p7._0));
         case "Tick": return Tick(function (_p8) {
              return func(_p7._0(_p8));
           });
         case "None": return None;
         default: return Batch(A2($List.map,map(func),_p7._0));}
   });
   return _elm.Effects.values = {_op: _op
                                ,none: none
                                ,task: task
                                ,tick: tick
                                ,map: map
                                ,batch: batch
                                ,toTask: toTask};
};
Elm.Game = Elm.Game || {};
Elm.Game.make = function (_elm) {
   "use strict";
   _elm.Game = _elm.Game || {};
   if (_elm.Game.values) return _elm.Game.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Belt = Elm.Belt.make(_elm),
   $Book = Elm.Book.make(_elm),
   $Chimp = Elm.Chimp.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Events = Elm.Html.Events.make(_elm),
   $Html$Lazy = Elm.Html.Lazy.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Random = Elm.Random.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   _op["=>"] = F2(function (v0,v1) {
      return {ctor: "_Tuple2",_0: v0,_1: v1};
   });
   var generateChimpSeed = function (seed) {
      var gen = A2($Random.$int,$Random.minInt,$Random.maxInt);
      return A2($Random.generate,gen,seed);
   };
   var IncSpeed = function (a) {
      return {ctor: "IncSpeed",_0: a};
   };
   var Modify = F2(function (a,b) {
      return {ctor: "Modify",_0: a,_1: b};
   });
   var viewChimp = F3(function (address,cash,_p0) {
      var _p1 = _p0;
      var _p2 = _p1._0;
      var ctx = {actions: A2($Signal.forwardTo,address,Modify(_p2))
                ,incSpeed: A2($Signal.forwardTo,
                address,
                $Basics.always(IncSpeed(_p2)))};
      return A3($Chimp.view,ctx,cash,_p1._1);
   });
   var BuyChimp = {ctor: "BuyChimp"};
   var view = F2(function (address,model) {
      return A2($Html.div,
      _U.list([]),
      _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("row")]),
              _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("col-lg-8 col-lg-offset-2")]),
              _U.list([A2($Html$Lazy.lazy,$Book.view,model.book)]))]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.style(_U.list([A2(_op["=>"],
              "margin-bottom",
              "20px")]))]),
              _U.list([function () {
                         var monkeyPrice = function (_p3) {
                            return $Belt.calcMonkeyPrice($List.length(_p3));
                         }(model.chimps);
                         var canAffordMonkey = _U.cmp(model.cash,monkeyPrice) > -1;
                         return A2($Html.button,
                         _U.list([A2($Html$Events.onClick,address,BuyChimp)
                                 ,$Html$Attributes.classList(_U.list([A2(_op["=>"],"btn",true)
                                                                     ,A2(_op["=>"],"btn-success",canAffordMonkey)
                                                                     ,A2(_op["=>"],"btn-default",$Basics.not(canAffordMonkey))]))
                                 ,$Html$Attributes.disabled($Basics.not(canAffordMonkey))]),
                         _U.list([$Html.text(A2($Basics._op["++"],
                         "Buy Chimp ($",
                         A2($Basics._op["++"],$Belt.commafy(monkeyPrice),")")))]));
                      }()
                      ,A2($Html.ul,
                      _U.list([$Html$Attributes.$class("list-inline lead pull-right")]),
                      _U.list([A2($Html.li,
                              _U.list([]),
                              _U.list([A2($Html.strong,
                                      _U.list([]),
                                      _U.list([$Html.text("Cash: ")]))
                                      ,$Html.text(A2($Basics._op["++"],
                                      "$",
                                      $Belt.commafy(model.cash)))]))
                              ,A2($Html.li,
                              _U.list([]),
                              _U.list([A2($Html.strong,
                                      _U.list([]),
                                      _U.list([$Html.text("Score: ")]))
                                      ,$Html.text($Belt.commafy(model.score))]))]))]))
              ,A2($Html.div,
              _U.list([]),
              $List.isEmpty(model.chimps) ? _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("well")]),
              _U.list([A2($Html.p,
              _U.list([$Html$Attributes.$class("lead text-center")]),
              _U.list([$Html.text("Buy your first monkey to get the ball rolling")]))]))]) : _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("row")
                      ,$Html$Attributes.style(_U.list([A2(_op["=>"],
                                                      "margin-left",
                                                      "0px")
                                                      ,A2(_op["=>"],"margin-right","0px")]))]),
              A2($List.map,
              A3($Html$Lazy.lazy3,viewChimp,address,model.cash),
              model.chimps))]))
              ,A2($Html.footer,
              _U.list([$Html$Attributes.style(_U.list([A2(_op["=>"],
                                                      "margin-top",
                                                      "100px")
                                                      ,A2(_op["=>"],"text-align","center")
                                                      ,A2(_op["=>"],"clear","both")]))]),
              _U.list([A2($Html.p,
              _U.list([]),
              _U.list([$Html.text("Source code at ")
                      ,A2($Html.a,
                      _U.list([$Html$Attributes.href("https://github.com/danneu/infinite-monkey-incremental")
                              ,$Html$Attributes.target("_blank")]),
                      _U.list([$Html.text("danneu/infinite-monkey-incremental")]))]))]))]));
   });
   var Beat = function (a) {    return {ctor: "Beat",_0: a};};
   var init = function (seed) {
      return {ctor: "_Tuple2"
             ,_0: {chimps: _U.list([])
                  ,nextId: 1
                  ,seed: seed
                  ,score: 0
                  ,cash: 200
                  ,book: $Book.init(50)}
             ,_1: $Effects.tick(Beat)};
   };
   var update = F2(function (action,model) {
      var _p4 = action;
      switch (_p4.ctor)
      {case "IncSpeed": var _p11 = _p4._0;
           var priceReducer = F2(function (_p5,price) {
              var _p6 = _p5;
              return _U.eq(_p11,
              _p6._0) ? $Belt.calcSpeedPrice(_p6._1.speed) : price;
           });
           var speedPrice = A3($List.foldl,priceReducer,0,model.chimps);
           if (_U.cmp(model.cash,speedPrice) < 0) return {ctor: "_Tuple2"
                                                         ,_0: model
                                                         ,_1: $Effects.none}; else {
                 var updateChimp = function (_p7) {
                    var _p8 = _p7;
                    var _p10 = _p8._1;
                    var _p9 = _p8._0;
                    return _U.eq(_p11,_p9) ? {ctor: "_Tuple2"
                                             ,_0: _p9
                                             ,_1: A2($Chimp.update,$Chimp.IncSpeed,_p10)} : {ctor: "_Tuple2"
                                                                                            ,_0: _p9
                                                                                            ,_1: _p10};
                 };
                 var newChimps = A2($List.map,updateChimp,model.chimps);
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model,
                        {chimps: newChimps,cash: model.cash - speedPrice})
                        ,_1: $Effects.none};
              }
         case "Modify": var updateChimp = function (_p12) {
              var _p13 = _p12;
              var _p15 = _p13._1;
              var _p14 = _p13._0;
              return _U.eq(_p4._0,_p14) ? {ctor: "_Tuple2"
                                          ,_0: _p14
                                          ,_1: A2($Chimp.update,_p4._1,_p15)} : {ctor: "_Tuple2"
                                                                                ,_0: _p14
                                                                                ,_1: _p15};
           };
           var newChimps = A2($List.map,updateChimp,model.chimps);
           return {ctor: "_Tuple2"
                  ,_0: _U.update(model,{chimps: newChimps})
                  ,_1: $Effects.none};
         case "BuyChimp": var monkeyPrice = function (_p16) {
              return $Belt.calcMonkeyPrice($List.length(_p16));
           }(model.chimps);
           if (_U.cmp(model.cash,monkeyPrice) < 0) return {ctor: "_Tuple2"
                                                          ,_0: model
                                                          ,_1: $Effects.none}; else {
                 var _p17 = generateChimpSeed(model.seed);
                 var chimpSeed = _p17._0;
                 var nextSeed = _p17._1;
                 var chimpModel = A2($Chimp.init,
                 $Random.initialSeed(chimpSeed),
                 5);
                 var nextModel = _U.update(model,
                 {nextId: model.nextId + 1
                 ,chimps: A2($List.append,
                 model.chimps,
                 _U.list([{ctor: "_Tuple2",_0: model.nextId,_1: chimpModel}]))
                 ,seed: nextSeed
                 ,cash: model.cash - function (_p18) {
                    return $Belt.calcMonkeyPrice($List.length(_p18));
                 }(model.chimps)});
                 return {ctor: "_Tuple2",_0: nextModel,_1: $Effects.none};
              }
         default: var reducer = F2(function (_p19,memo) {
              var _p20 = _p19;
              var _p22 = _p20._1._1;
              if (_U.cmp(_p20._0._1.wordCount,_p22.wordCount) < 0) {
                    var _p21 = $List.head(_p22.latestWords);
                    if (_p21.ctor === "Nothing") {
                          return memo;
                       } else {
                          return A2($List.append,memo,_U.list([_p21._0]));
                       }
                 } else return memo;
           });
           var updateChimp = function (_p23) {
              var _p24 = _p23;
              return {ctor: "_Tuple2"
                     ,_0: _p24._0
                     ,_1: A2($Chimp.update,$Chimp.Beat(_p4._0),_p24._1)};
           };
           var newChimps = A2($List.map,updateChimp,model.chimps);
           var newWords = A3($List.foldl,
           reducer,
           _U.list([]),
           A3($List.map2,
           F2(function (v0,v1) {
              return {ctor: "_Tuple2",_0: v0,_1: v1};
           }),
           model.chimps,
           newChimps));
           var newBook = _U.cmp($List.length(newWords),
           0) > 0 ? A2($Book.update,
           $Book.AddWord(A2($Maybe.withDefault,"",$List.head(newWords))),
           model.book) : model.book;
           var beatScore = A3($List.foldl,
           F2(function (word,score) {
              return score + $Belt.scoreWord(word);
           }),
           0,
           newWords);
           return {ctor: "_Tuple2"
                  ,_0: _U.update(model,
                  {chimps: newChimps
                  ,score: model.score + beatScore
                  ,cash: model.cash + beatScore
                  ,book: newBook})
                  ,_1: $Effects.tick(Beat)};}
   });
   var Model = F6(function (a,b,c,d,e,f) {
      return {chimps: a
             ,nextId: b
             ,seed: c
             ,score: d
             ,cash: e
             ,book: f};
   });
   return _elm.Game.values = {_op: _op
                             ,Model: Model
                             ,Beat: Beat
                             ,BuyChimp: BuyChimp
                             ,Modify: Modify
                             ,IncSpeed: IncSpeed
                             ,init: init
                             ,generateChimpSeed: generateChimpSeed
                             ,update: update
                             ,viewChimp: viewChimp
                             ,view: view};
};
Elm.StartApp = Elm.StartApp || {};
Elm.StartApp.make = function (_elm) {
   "use strict";
   _elm.StartApp = _elm.StartApp || {};
   if (_elm.StartApp.values) return _elm.StartApp.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Html = Elm.Html.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var start = function (config) {
      var updateStep = F2(function (action,_p0) {
         var _p1 = _p0;
         var _p2 = A2(config.update,action,_p1._0);
         var newModel = _p2._0;
         var additionalEffects = _p2._1;
         return {ctor: "_Tuple2"
                ,_0: newModel
                ,_1: $Effects.batch(_U.list([_p1._1,additionalEffects]))};
      });
      var update = F2(function (actions,_p3) {
         var _p4 = _p3;
         return A3($List.foldl,
         updateStep,
         {ctor: "_Tuple2",_0: _p4._0,_1: $Effects.none},
         actions);
      });
      var messages = $Signal.mailbox(_U.list([]));
      var singleton = function (action) {
         return _U.list([action]);
      };
      var address = A2($Signal.forwardTo,messages.address,singleton);
      var inputs = $Signal.mergeMany(A2($List._op["::"],
      messages.signal,
      A2($List.map,$Signal.map(singleton),config.inputs)));
      var effectsAndModel = A3($Signal.foldp,
      update,
      config.init,
      inputs);
      var model = A2($Signal.map,$Basics.fst,effectsAndModel);
      return {html: A2($Signal.map,config.view(address),model)
             ,model: model
             ,tasks: A2($Signal.map,
             function (_p5) {
                return A2($Effects.toTask,messages.address,$Basics.snd(_p5));
             },
             effectsAndModel)};
   };
   var App = F3(function (a,b,c) {
      return {html: a,model: b,tasks: c};
   });
   var Config = F4(function (a,b,c,d) {
      return {init: a,update: b,view: c,inputs: d};
   });
   return _elm.StartApp.values = {_op: _op
                                 ,start: start
                                 ,Config: Config
                                 ,App: App};
};
Elm.Main = Elm.Main || {};
Elm.Main.make = function (_elm) {
   "use strict";
   _elm.Main = _elm.Main || {};
   if (_elm.Main.values) return _elm.Main.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Current = Elm.Current.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Game = Elm.Game.make(_elm),
   $Html = Elm.Html.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Random = Elm.Random.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $StartApp = Elm.StartApp.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var app = $StartApp.start({view: $Game.view
                             ,update: $Game.update
                             ,init: $Game.init($Random.initialSeed($Basics.floor($Current.time({ctor: "_Tuple0"}))))
                             ,inputs: _U.list([])});
   var main = app.html;
   var tasks = Elm.Native.Task.make(_elm).performSignal("tasks",
   app.tasks);
   return _elm.Main.values = {_op: _op,app: app,main: main};
};
