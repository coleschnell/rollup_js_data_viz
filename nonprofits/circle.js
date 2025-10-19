(function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {string} style_sheet_id
	 * @param {string} styles
	 * @returns {void}
	 */
	function append_styles(target, style_sheet_id, styles) {
		const append_styles_to = get_root_for_style(target);
		if (!append_styles_to.getElementById(style_sheet_id)) {
			const style = element('style');
			style.id = style_sheet_id;
			style.textContent = styles;
			append_stylesheet(append_styles_to, style);
		}
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, '');
		}
	}

	/**
	 * @returns {void} */
	function select_option(select, value, mounting) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];
			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
		if (!mounting || value !== undefined) {
			select.selectedIndex = -1; // no option should be selected
		}
	}

	function select_value(select) {
		const selected_option = select.querySelector(':checked');
		return selected_option && selected_option.__value;
	}
	// unfortunately this can't be a constant as that wouldn't be tree-shakeable
	// so we cache the result instead

	/**
	 * @type {boolean} */
	let crossorigin;

	/**
	 * @returns {boolean} */
	function is_crossorigin() {
		if (crossorigin === undefined) {
			crossorigin = false;
			try {
				if (typeof window !== 'undefined' && window.parent) {
					void window.parent.document;
				}
			} catch (error) {
				crossorigin = true;
			}
		}
		return crossorigin;
	}

	/**
	 * @param {HTMLElement} node
	 * @param {() => void} fn
	 * @returns {() => void}
	 */
	function add_iframe_resize_listener(node, fn) {
		const computed_style = getComputedStyle(node);
		if (computed_style.position === 'static') {
			node.style.position = 'relative';
		}
		const iframe = element('iframe');
		iframe.setAttribute(
			'style',
			'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
				'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;'
		);
		iframe.setAttribute('aria-hidden', 'true');
		iframe.tabIndex = -1;
		const crossorigin = is_crossorigin();

		/**
		 * @type {() => void}
		 */
		let unsubscribe;
		if (crossorigin) {
			iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
			unsubscribe = listen(
				window,
				'message',
				/** @param {MessageEvent} event */ (event) => {
					if (event.source === iframe.contentWindow) fn();
				}
			);
		} else {
			iframe.src = 'about:blank';
			iframe.onload = () => {
				unsubscribe = listen(iframe.contentWindow, 'resize', fn);
				// make sure an initial resize event is fired _after_ the iframe is loaded (which is asynchronous)
				// see https://github.com/sveltejs/svelte/issues/4233
				fn();
			};
		}
		append(node, iframe);
		return () => {
			if (crossorigin) {
				unsubscribe();
			} else if (unsubscribe && iframe.contentWindow) {
				unsubscribe();
			}
			detach(iframe);
		};
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	function formatDecimal(x) {
	  return Math.abs(x = Math.round(x)) >= 1e21
	      ? x.toLocaleString("en").replace(/,/g, "")
	      : x.toString(10);
	}

	// Computes the decimal coefficient and exponent of the specified number x with
	// significant digits p, where x is positive and p is in [1, 21] or undefined.
	// For example, formatDecimalParts(1.23) returns ["123", 0].
	function formatDecimalParts(x, p) {
	  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
	  var i, coefficient = x.slice(0, i);

	  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
	  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
	  return [
	    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
	    +x.slice(i + 1)
	  ];
	}

	function exponent(x) {
	  return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
	}

	function formatGroup(grouping, thousands) {
	  return function(value, width) {
	    var i = value.length,
	        t = [],
	        j = 0,
	        g = grouping[0],
	        length = 0;

	    while (i > 0 && g > 0) {
	      if (length + g + 1 > width) g = Math.max(1, width - length);
	      t.push(value.substring(i -= g, i + g));
	      if ((length += g + 1) > width) break;
	      g = grouping[j = (j + 1) % grouping.length];
	    }

	    return t.reverse().join(thousands);
	  };
	}

	function formatNumerals(numerals) {
	  return function(value) {
	    return value.replace(/[0-9]/g, function(i) {
	      return numerals[+i];
	    });
	  };
	}

	// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
	var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

	function formatSpecifier(specifier) {
	  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
	  var match;
	  return new FormatSpecifier({
	    fill: match[1],
	    align: match[2],
	    sign: match[3],
	    symbol: match[4],
	    zero: match[5],
	    width: match[6],
	    comma: match[7],
	    precision: match[8] && match[8].slice(1),
	    trim: match[9],
	    type: match[10]
	  });
	}

	formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

	function FormatSpecifier(specifier) {
	  this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
	  this.align = specifier.align === undefined ? ">" : specifier.align + "";
	  this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
	  this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
	  this.zero = !!specifier.zero;
	  this.width = specifier.width === undefined ? undefined : +specifier.width;
	  this.comma = !!specifier.comma;
	  this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
	  this.trim = !!specifier.trim;
	  this.type = specifier.type === undefined ? "" : specifier.type + "";
	}

	FormatSpecifier.prototype.toString = function() {
	  return this.fill
	      + this.align
	      + this.sign
	      + this.symbol
	      + (this.zero ? "0" : "")
	      + (this.width === undefined ? "" : Math.max(1, this.width | 0))
	      + (this.comma ? "," : "")
	      + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
	      + (this.trim ? "~" : "")
	      + this.type;
	};

	// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
	function formatTrim(s) {
	  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
	    switch (s[i]) {
	      case ".": i0 = i1 = i; break;
	      case "0": if (i0 === 0) i0 = i; i1 = i; break;
	      default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
	    }
	  }
	  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
	}

	var prefixExponent;

	function formatPrefixAuto(x, p) {
	  var d = formatDecimalParts(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1],
	      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
	      n = coefficient.length;
	  return i === n ? coefficient
	      : i > n ? coefficient + new Array(i - n + 1).join("0")
	      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
	      : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
	}

	function formatRounded(x, p) {
	  var d = formatDecimalParts(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1];
	  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
	      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
	      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
	}

	var formatTypes = {
	  "%": (x, p) => (x * 100).toFixed(p),
	  "b": (x) => Math.round(x).toString(2),
	  "c": (x) => x + "",
	  "d": formatDecimal,
	  "e": (x, p) => x.toExponential(p),
	  "f": (x, p) => x.toFixed(p),
	  "g": (x, p) => x.toPrecision(p),
	  "o": (x) => Math.round(x).toString(8),
	  "p": (x, p) => formatRounded(x * 100, p),
	  "r": formatRounded,
	  "s": formatPrefixAuto,
	  "X": (x) => Math.round(x).toString(16).toUpperCase(),
	  "x": (x) => Math.round(x).toString(16)
	};

	function identity(x) {
	  return x;
	}

	var map = Array.prototype.map,
	    prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

	function formatLocale(locale) {
	  var group = locale.grouping === undefined || locale.thousands === undefined ? identity : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
	      currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
	      currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
	      decimal = locale.decimal === undefined ? "." : locale.decimal + "",
	      numerals = locale.numerals === undefined ? identity : formatNumerals(map.call(locale.numerals, String)),
	      percent = locale.percent === undefined ? "%" : locale.percent + "",
	      minus = locale.minus === undefined ? "−" : locale.minus + "",
	      nan = locale.nan === undefined ? "NaN" : locale.nan + "";

	  function newFormat(specifier) {
	    specifier = formatSpecifier(specifier);

	    var fill = specifier.fill,
	        align = specifier.align,
	        sign = specifier.sign,
	        symbol = specifier.symbol,
	        zero = specifier.zero,
	        width = specifier.width,
	        comma = specifier.comma,
	        precision = specifier.precision,
	        trim = specifier.trim,
	        type = specifier.type;

	    // The "n" type is an alias for ",g".
	    if (type === "n") comma = true, type = "g";

	    // The "" type, and any invalid type, is an alias for ".12~g".
	    else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

	    // If zero fill is specified, padding goes after sign and before digits.
	    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

	    // Compute the prefix and suffix.
	    // For SI-prefix, the suffix is lazily computed.
	    var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
	        suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

	    // What format function should we use?
	    // Is this an integer type?
	    // Can this type generate exponential notation?
	    var formatType = formatTypes[type],
	        maybeSuffix = /[defgprs%]/.test(type);

	    // Set the default precision if not specified,
	    // or clamp the specified precision to the supported range.
	    // For significant precision, it must be in [1, 21].
	    // For fixed precision, it must be in [0, 20].
	    precision = precision === undefined ? 6
	        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
	        : Math.max(0, Math.min(20, precision));

	    function format(value) {
	      var valuePrefix = prefix,
	          valueSuffix = suffix,
	          i, n, c;

	      if (type === "c") {
	        valueSuffix = formatType(value) + valueSuffix;
	        value = "";
	      } else {
	        value = +value;

	        // Determine the sign. -0 is not less than 0, but 1 / -0 is!
	        var valueNegative = value < 0 || 1 / value < 0;

	        // Perform the initial formatting.
	        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

	        // Trim insignificant zeros.
	        if (trim) value = formatTrim(value);

	        // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
	        if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

	        // Compute the prefix and suffix.
	        valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
	        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

	        // Break the formatted value into the integer “value” part that can be
	        // grouped, and fractional or exponential “suffix” part that is not.
	        if (maybeSuffix) {
	          i = -1, n = value.length;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), 48 > c || c > 57) {
	              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
	              value = value.slice(0, i);
	              break;
	            }
	          }
	        }
	      }

	      // If the fill character is not "0", grouping is applied before padding.
	      if (comma && !zero) value = group(value, Infinity);

	      // Compute the padding.
	      var length = valuePrefix.length + value.length + valueSuffix.length,
	          padding = length < width ? new Array(width - length + 1).join(fill) : "";

	      // If the fill character is "0", grouping is applied after padding.
	      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

	      // Reconstruct the final output based on the desired alignment.
	      switch (align) {
	        case "<": value = valuePrefix + value + valueSuffix + padding; break;
	        case "=": value = valuePrefix + padding + value + valueSuffix; break;
	        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
	        default: value = padding + valuePrefix + value + valueSuffix; break;
	      }

	      return numerals(value);
	    }

	    format.toString = function() {
	      return specifier + "";
	    };

	    return format;
	  }

	  function formatPrefix(specifier, value) {
	    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
	        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
	        k = Math.pow(10, -e),
	        prefix = prefixes[8 + e / 3];
	    return function(value) {
	      return f(k * value) + prefix;
	    };
	  }

	  return {
	    format: newFormat,
	    formatPrefix: formatPrefix
	  };
	}

	var locale;
	var format;

	defaultLocale({
	  thousands: ",",
	  grouping: [3],
	  currency: ["$", ""]
	});

	function defaultLocale(definition) {
	  locale = formatLocale(definition);
	  format = locale.format;
	  locale.formatPrefix;
	  return locale;
	}

	/* server/src/_compontents/Circle.svelte generated by Svelte v4.2.20 */

	function add_css$4(target) {
		append_styles(target, "svelte-1wdxylo", ".circle-container.svelte-1wdxylo{display:flex;justify-content:center;align-items:end;position:relative;transition:all 2s}.circle.svelte-1wdxylo{font-family:sans-serif;position:absolute;border-radius:100%;transition:all 2s;display:flex;justify-content:center;align-items:center;text-shadow:-1px -1px 0 #fff,\n            1px -1px 0 #fff,\n            -1px 1px 0 #fff,\n            1px 1px 0 #fff,\n            0px -1px 0 #fff,\n            0px 1px 0 #fff,\n            -1px 0px 0 #fff,\n            1px 0px 0 #fff}.label.svelte-1wdxylo{position:relative}.dash-line-container.svelte-1wdxylo{transition:all 2s;position:relative;display:flex;flex-direction:row;justify-content:end;align-items:center}.dash-line.svelte-1wdxylo{transition:all 2s;width:0px;height:70%;border-left:dashed black 1px;left:calc(50% - 1px)}.label-text.svelte-1wdxylo{text-align:center;margin-top:13px}#reference.svelte-1wdxylo{border:dashed 1px rgba(0, 0, 0, 0.8);transform:translateY(-1px);background-color:rgba(173, 170, 168, 0.2);z-index:-100}");
	}

	// (33:4) {#if reference}
	function create_if_block_3(ctx) {
		let div;

		return {
			c() {
				div = element("div");
				attr(div, "class", "circle svelte-1wdxylo");
				attr(div, "id", "reference");
				set_style(div, "height", /*largest_circle_diameter*/ ctx[11] - 4 + "px");
				set_style(div, "width", /*largest_circle_diameter*/ ctx[11] - 4 + "px");
			},
			m(target, anchor) {
				insert(target, div, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div, "height", /*largest_circle_diameter*/ ctx[11] - 4 + "px");
				}

				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div, "width", /*largest_circle_diameter*/ ctx[11] - 4 + "px");
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	// (55:8) {#if label}
	function create_if_block_2(ctx) {
		let div2;
		let div1;
		let div0;

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				attr(div0, "class", "dash-line svelte-1wdxylo");
				attr(div1, "class", "dash-line-container svelte-1wdxylo");
				set_style(div1, "transform", "translateY(-50%)");
				set_style(div1, "height", /*largest_circle_diameter*/ ctx[11] / 2 - /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) / 2 + "px");
				attr(div2, "class", "label svelte-1wdxylo");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, div0);
			},
			p(ctx, dirty) {
				if (dirty & /*largest_circle_diameter, diameter_generator, data, big_variable*/ 2059) {
					set_style(div1, "height", /*largest_circle_diameter*/ ctx[11] / 2 - /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) / 2 + "px");
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	// (75:8) {#if label}
	function create_if_block_1$1(ctx) {
		let div2;
		let div1;
		let div0;

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				attr(div0, "class", "dash-line svelte-1wdxylo");
				attr(div1, "class", "dash-line-container svelte-1wdxylo");
				set_style(div1, "transform", "translateY(50%)");
				set_style(div1, "height", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) / 2 + 28 + "px");
				attr(div2, "class", "label svelte-1wdxylo");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, div0);
			},
			p(ctx, dirty) {
				if (dirty & /*diameter_generator, data, small_variable*/ 67) {
					set_style(div1, "height", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) / 2 + 28 + "px");
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	// (90:4) {#if label}
	function create_if_block$2(ctx) {
		let div0;
		let t0;
		let t1;
		let t2_value = /*data_format*/ ctx[9](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) + "";
		let t2;
		let t3;
		let div1;
		let t4;
		let t5;
		let t6_value = /*data_format*/ ctx[9](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) + "";
		let t6;
		let div1_resize_listener;

		return {
			c() {
				div0 = element("div");
				t0 = text(/*big_variable_title*/ ctx[5]);
				t1 = text(": ");
				t2 = text(t2_value);
				t3 = space();
				div1 = element("div");
				t4 = text(/*small_variable_title*/ ctx[8]);
				t5 = text(": ");
				t6 = text(t6_value);
				attr(div0, "class", "circle svelte-1wdxylo");
				set_style(div0, "height", /*largest_circle_diameter*/ ctx[11] - 2 + "px");
				set_style(div0, "width", /*largest_circle_diameter*/ ctx[11] - 2 + "px");
				attr(div1, "class", "label-text svelte-1wdxylo");
				set_style(div1, "width", /*largest_circle_diameter*/ ctx[11] - 20 + "px");
				set_style(div1, "transform", "translateY(" + (20 + /*label_height*/ ctx[12]) + "px)");
				add_render_callback(() => /*div1_elementresize_handler*/ ctx[14].call(div1));
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				append(div0, t0);
				append(div0, t1);
				append(div0, t2);
				insert(target, t3, anchor);
				insert(target, div1, anchor);
				append(div1, t4);
				append(div1, t5);
				append(div1, t6);
				div1_resize_listener = add_iframe_resize_listener(div1, /*div1_elementresize_handler*/ ctx[14].bind(div1));
			},
			p(ctx, dirty) {
				if (dirty & /*big_variable_title*/ 32) set_data(t0, /*big_variable_title*/ ctx[5]);
				if (dirty & /*data_format, data, big_variable*/ 522 && t2_value !== (t2_value = /*data_format*/ ctx[9](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) + "")) set_data(t2, t2_value);

				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div0, "height", /*largest_circle_diameter*/ ctx[11] - 2 + "px");
				}

				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div0, "width", /*largest_circle_diameter*/ ctx[11] - 2 + "px");
				}

				if (dirty & /*small_variable_title*/ 256) set_data(t4, /*small_variable_title*/ ctx[8]);
				if (dirty & /*data_format, data, small_variable*/ 578 && t6_value !== (t6_value = /*data_format*/ ctx[9](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) + "")) set_data(t6, t6_value);

				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div1, "width", /*largest_circle_diameter*/ ctx[11] - 20 + "px");
				}

				if (dirty & /*label_height*/ 4096) {
					set_style(div1, "transform", "translateY(" + (20 + /*label_height*/ ctx[12]) + "px)");
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t3);
					detach(div1);
				}

				div1_resize_listener();
			}
		};
	}

	function create_fragment$4(ctx) {
		let div2;
		let t0;
		let div0;
		let t1;
		let div1;
		let t2;
		let if_block0 = /*reference*/ ctx[10] && create_if_block_3(ctx);
		let if_block1 = /*label*/ ctx[2] && create_if_block_2(ctx);
		let if_block2 = /*label*/ ctx[2] && create_if_block_1$1(ctx);
		let if_block3 = /*label*/ ctx[2] && create_if_block$2(ctx);

		return {
			c() {
				div2 = element("div");
				if (if_block0) if_block0.c();
				t0 = space();
				div0 = element("div");
				if (if_block1) if_block1.c();
				t1 = space();
				div1 = element("div");
				if (if_block2) if_block2.c();
				t2 = space();
				if (if_block3) if_block3.c();
				attr(div0, "class", "circle svelte-1wdxylo");
				attr(div0, "id", "revenue");
				set_style(div0, "height", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) + "px");
				set_style(div0, "width", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) + "px");
				set_style(div0, "background-color", /*big_variable_color*/ ctx[4]);

				set_style(div0, "z-index", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) > /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]])
				? -20
				: 20);

				attr(div1, "class", "circle svelte-1wdxylo");
				set_style(div1, "height", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) + "px");
				set_style(div1, "width", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) + "px");
				set_style(div1, "background-color", /*small_variable_color*/ ctx[7]);
				attr(div2, "class", "circle-container svelte-1wdxylo");
				set_style(div2, "height", /*largest_circle_diameter*/ ctx[11] + "px");
				set_style(div2, "width", /*largest_circle_diameter*/ ctx[11] + "px");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				if (if_block0) if_block0.m(div2, null);
				append(div2, t0);
				append(div2, div0);
				if (if_block1) if_block1.m(div0, null);
				append(div2, t1);
				append(div2, div1);
				if (if_block2) if_block2.m(div1, null);
				append(div2, t2);
				if (if_block3) if_block3.m(div2, null);
			},
			p(ctx, [dirty]) {
				if (/*reference*/ ctx[10]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_3(ctx);
						if_block0.c();
						if_block0.m(div2, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*label*/ ctx[2]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_2(ctx);
						if_block1.c();
						if_block1.m(div0, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (dirty & /*diameter_generator, data, big_variable*/ 11) {
					set_style(div0, "height", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) + "px");
				}

				if (dirty & /*diameter_generator, data, big_variable*/ 11) {
					set_style(div0, "width", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) + "px");
				}

				if (dirty & /*big_variable_color*/ 16) {
					set_style(div0, "background-color", /*big_variable_color*/ ctx[4]);
				}

				if (dirty & /*diameter_generator, data, big_variable, small_variable*/ 75) {
					set_style(div0, "z-index", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*big_variable*/ ctx[3]]) > /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]])
					? -20
					: 20);
				}

				if (/*label*/ ctx[2]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block_1$1(ctx);
						if_block2.c();
						if_block2.m(div1, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (dirty & /*diameter_generator, data, small_variable*/ 67) {
					set_style(div1, "height", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) + "px");
				}

				if (dirty & /*diameter_generator, data, small_variable*/ 67) {
					set_style(div1, "width", /*diameter_generator*/ ctx[0](/*data*/ ctx[1][/*small_variable*/ ctx[6]]) + "px");
				}

				if (dirty & /*small_variable_color*/ 128) {
					set_style(div1, "background-color", /*small_variable_color*/ ctx[7]);
				}

				if (/*label*/ ctx[2]) {
					if (if_block3) {
						if_block3.p(ctx, dirty);
					} else {
						if_block3 = create_if_block$2(ctx);
						if_block3.c();
						if_block3.m(div2, null);
					}
				} else if (if_block3) {
					if_block3.d(1);
					if_block3 = null;
				}

				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div2, "height", /*largest_circle_diameter*/ ctx[11] + "px");
				}

				if (dirty & /*largest_circle_diameter*/ 2048) {
					set_style(div2, "width", /*largest_circle_diameter*/ ctx[11] + "px");
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				if (if_block3) if_block3.d();
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { diameter_generator } = $$props;
		let { max_big_variable } = $$props;
		let { data } = $$props;
		let { label } = $$props;
		let { big_variable } = $$props;
		let { big_variable_color } = $$props;
		let { big_variable_title } = $$props;
		let { small_variable } = $$props;
		let { small_variable_color } = $$props;
		let { small_variable_title } = $$props;
		let { data_format } = $$props;
		let { reference } = $$props;
		let largest_circle_diameter;
		let label_height;

		function div1_elementresize_handler() {
			label_height = this.clientHeight;
			$$invalidate(12, label_height);
		}

		$$self.$$set = $$props => {
			if ('diameter_generator' in $$props) $$invalidate(0, diameter_generator = $$props.diameter_generator);
			if ('max_big_variable' in $$props) $$invalidate(13, max_big_variable = $$props.max_big_variable);
			if ('data' in $$props) $$invalidate(1, data = $$props.data);
			if ('label' in $$props) $$invalidate(2, label = $$props.label);
			if ('big_variable' in $$props) $$invalidate(3, big_variable = $$props.big_variable);
			if ('big_variable_color' in $$props) $$invalidate(4, big_variable_color = $$props.big_variable_color);
			if ('big_variable_title' in $$props) $$invalidate(5, big_variable_title = $$props.big_variable_title);
			if ('small_variable' in $$props) $$invalidate(6, small_variable = $$props.small_variable);
			if ('small_variable_color' in $$props) $$invalidate(7, small_variable_color = $$props.small_variable_color);
			if ('small_variable_title' in $$props) $$invalidate(8, small_variable_title = $$props.small_variable_title);
			if ('data_format' in $$props) $$invalidate(9, data_format = $$props.data_format);
			if ('reference' in $$props) $$invalidate(10, reference = $$props.reference);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*reference, diameter_generator, max_big_variable, data, big_variable, small_variable*/ 9291) {
				$$invalidate(11, largest_circle_diameter = reference
				? diameter_generator(max_big_variable)
				: Math.max(diameter_generator(data[big_variable]), diameter_generator(data[small_variable])));
			}
		};

		return [
			diameter_generator,
			data,
			label,
			big_variable,
			big_variable_color,
			big_variable_title,
			small_variable,
			small_variable_color,
			small_variable_title,
			data_format,
			reference,
			largest_circle_diameter,
			label_height,
			max_big_variable,
			div1_elementresize_handler
		];
	}

	class Circle extends SvelteComponent {
		constructor(options) {
			super();

			init(
				this,
				options,
				instance$4,
				create_fragment$4,
				safe_not_equal,
				{
					diameter_generator: 0,
					max_big_variable: 13,
					data: 1,
					label: 2,
					big_variable: 3,
					big_variable_color: 4,
					big_variable_title: 5,
					small_variable: 6,
					small_variable_color: 7,
					small_variable_title: 8,
					data_format: 9,
					reference: 10
				},
				add_css$4
			);
		}
	}

	/* server/src/_compontents/CircleLegend.svelte generated by Svelte v4.2.20 */

	function add_css$3(target) {
		append_styles(target, "svelte-ogjr9u", ".legend-container.svelte-ogjr9u{font-size:14px}.legend-row.svelte-ogjr9u{display:flex;flex-direction:row;justify-content:start;align-items:center;gap:5px}.legend-circle.svelte-ogjr9u{border-radius:100%;height:10px;width:10px;min-width:10px}");
	}

	function create_fragment$3(ctx) {
		let div4;
		let div1;
		let div0;
		let t0;
		let t1;
		let t2;
		let t3_value = /*data_format*/ ctx[7](/*data*/ ctx[0][/*big_variable*/ ctx[1]]) + "";
		let t3;
		let t4;
		let div3;
		let div2;
		let t5;
		let t6;
		let t7;
		let t8_value = /*data_format*/ ctx[7](/*data*/ ctx[0][/*small_variable*/ ctx[4]]) + "";
		let t8;

		return {
			c() {
				div4 = element("div");
				div1 = element("div");
				div0 = element("div");
				t0 = space();
				t1 = text(/*big_variable_title*/ ctx[3]);
				t2 = text(": ");
				t3 = text(t3_value);
				t4 = space();
				div3 = element("div");
				div2 = element("div");
				t5 = space();
				t6 = text(/*small_variable_title*/ ctx[6]);
				t7 = text(": ");
				t8 = text(t8_value);
				attr(div0, "class", "legend-circle svelte-ogjr9u");
				set_style(div0, "background-color", /*big_variable_color*/ ctx[2]);
				attr(div1, "class", "legend-row svelte-ogjr9u");
				attr(div2, "class", "legend-circle svelte-ogjr9u");
				set_style(div2, "background-color", /*small_variable_color*/ ctx[5]);
				attr(div3, "class", "legend-row svelte-ogjr9u");
				attr(div4, "class", "legend-container svelte-ogjr9u");
			},
			m(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div1);
				append(div1, div0);
				append(div1, t0);
				append(div1, t1);
				append(div1, t2);
				append(div1, t3);
				append(div4, t4);
				append(div4, div3);
				append(div3, div2);
				append(div3, t5);
				append(div3, t6);
				append(div3, t7);
				append(div3, t8);
			},
			p(ctx, [dirty]) {
				if (dirty & /*big_variable_color*/ 4) {
					set_style(div0, "background-color", /*big_variable_color*/ ctx[2]);
				}

				if (dirty & /*big_variable_title*/ 8) set_data(t1, /*big_variable_title*/ ctx[3]);
				if (dirty & /*data_format, data, big_variable*/ 131 && t3_value !== (t3_value = /*data_format*/ ctx[7](/*data*/ ctx[0][/*big_variable*/ ctx[1]]) + "")) set_data(t3, t3_value);

				if (dirty & /*small_variable_color*/ 32) {
					set_style(div2, "background-color", /*small_variable_color*/ ctx[5]);
				}

				if (dirty & /*small_variable_title*/ 64) set_data(t6, /*small_variable_title*/ ctx[6]);
				if (dirty & /*data_format, data, small_variable*/ 145 && t8_value !== (t8_value = /*data_format*/ ctx[7](/*data*/ ctx[0][/*small_variable*/ ctx[4]]) + "")) set_data(t8, t8_value);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div4);
				}
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { data } = $$props;
		let { big_variable } = $$props;
		let { big_variable_color } = $$props;
		let { big_variable_title } = $$props;
		let { small_variable } = $$props;
		let { small_variable_color } = $$props;
		let { small_variable_title } = $$props;
		let { data_format } = $$props;

		$$self.$$set = $$props => {
			if ('data' in $$props) $$invalidate(0, data = $$props.data);
			if ('big_variable' in $$props) $$invalidate(1, big_variable = $$props.big_variable);
			if ('big_variable_color' in $$props) $$invalidate(2, big_variable_color = $$props.big_variable_color);
			if ('big_variable_title' in $$props) $$invalidate(3, big_variable_title = $$props.big_variable_title);
			if ('small_variable' in $$props) $$invalidate(4, small_variable = $$props.small_variable);
			if ('small_variable_color' in $$props) $$invalidate(5, small_variable_color = $$props.small_variable_color);
			if ('small_variable_title' in $$props) $$invalidate(6, small_variable_title = $$props.small_variable_title);
			if ('data_format' in $$props) $$invalidate(7, data_format = $$props.data_format);
		};

		return [
			data,
			big_variable,
			big_variable_color,
			big_variable_title,
			small_variable,
			small_variable_color,
			small_variable_title,
			data_format
		];
	}

	class CircleLegend extends SvelteComponent {
		constructor(options) {
			super();

			init(
				this,
				options,
				instance$3,
				create_fragment$3,
				safe_not_equal,
				{
					data: 0,
					big_variable: 1,
					big_variable_color: 2,
					big_variable_title: 3,
					small_variable: 4,
					small_variable_color: 5,
					small_variable_title: 6,
					data_format: 7
				},
				add_css$3
			);
		}
	}

	/* server/src/_compontents/CircleGroup.svelte generated by Svelte v4.2.20 */

	function add_css$2(target) {
		append_styles(target, "svelte-1y0ix7b", ".circle-group.svelte-1y0ix7b{display:flex;flex-direction:row;justify-content:center;align-items:center;justify-items:center;align-content:center;margin-bottom:40px}.facet-group.svelte-1y0ix7b{display:flex;flex-direction:row;justify-content:center;align-items:center;justify-items:center;align-content:center}.facet-column.svelte-1y0ix7b{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;gap:10px}");
	}

	// (73:0) {:else}
	function create_else_block$1(ctx) {
		let div2;
		let div0;
		let circle0;
		let t0;
		let circlelegend0;
		let t1;
		let div1;
		let circle1;
		let t2;
		let circlelegend1;
		let current;

		circle0 = new Circle({
				props: {
					data: /*selected_data*/ ctx[3],
					max_big_variable: Math.max(.../*data*/ ctx[0].map(func_2)),
					diameter_generator: /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]),
					label: false,
					reference: true,
					big_variable: "revenue",
					big_variable_color: "#b29c58",
					big_variable_title: "Revenue",
					small_variable: "government_grants",
					small_variable_title: "Government grants",
					small_variable_color: "#d7c78e",
					data_format: /*data_format*/ ctx[7]
				}
			});

		circlelegend0 = new CircleLegend({
				props: {
					data: /*selected_data*/ ctx[3],
					big_variable: "revenue",
					big_variable_color: "#b29c58",
					big_variable_title: "Revenue",
					small_variable: "government_grants",
					small_variable_title: "Government grants",
					small_variable_color: "#d7c78e",
					data_format: /*data_format*/ ctx[7]
				}
			});

		circle1 = new Circle({
				props: {
					data: /*selected_data*/ ctx[3],
					max_big_variable: Math.max(.../*data*/ ctx[0].map(func_3)),
					diameter_generator: /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]),
					reference: true,
					label: false,
					big_variable: "assets",
					big_variable_color: "#256788",
					big_variable_title: "Assets",
					small_variable: "liabilities",
					small_variable_title: "Liabilites",
					small_variable_color: "#b9c9d5",
					data_format: /*data_format*/ ctx[7]
				}
			});

		circlelegend1 = new CircleLegend({
				props: {
					data: /*selected_data*/ ctx[3],
					big_variable: "assets",
					big_variable_color: "#256788",
					big_variable_title: "Assets",
					small_variable: "liabilities",
					small_variable_title: "Liabilites",
					small_variable_color: "#b9c9d5",
					data_format: /*data_format*/ ctx[7]
				}
			});

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				create_component(circle0.$$.fragment);
				t0 = space();
				create_component(circlelegend0.$$.fragment);
				t1 = space();
				div1 = element("div");
				create_component(circle1.$$.fragment);
				t2 = space();
				create_component(circlelegend1.$$.fragment);
				attr(div0, "class", "facet-column svelte-1y0ix7b");
				attr(div1, "class", "facet-column svelte-1y0ix7b");
				attr(div2, "class", "facet-group svelte-1y0ix7b");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				mount_component(circle0, div0, null);
				append(div0, t0);
				mount_component(circlelegend0, div0, null);
				append(div2, t1);
				append(div2, div1);
				mount_component(circle1, div1, null);
				append(div1, t2);
				mount_component(circlelegend1, div1, null);
				current = true;
			},
			p(ctx, dirty) {
				const circle0_changes = {};
				if (dirty & /*selected_data*/ 8) circle0_changes.data = /*selected_data*/ ctx[3];
				if (dirty & /*data*/ 1) circle0_changes.max_big_variable = Math.max(.../*data*/ ctx[0].map(func_2));
				if (dirty & /*max_circle_width*/ 4) circle0_changes.diameter_generator = /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]);
				circle0.$set(circle0_changes);
				const circlelegend0_changes = {};
				if (dirty & /*selected_data*/ 8) circlelegend0_changes.data = /*selected_data*/ ctx[3];
				circlelegend0.$set(circlelegend0_changes);
				const circle1_changes = {};
				if (dirty & /*selected_data*/ 8) circle1_changes.data = /*selected_data*/ ctx[3];
				if (dirty & /*data*/ 1) circle1_changes.max_big_variable = Math.max(.../*data*/ ctx[0].map(func_3));
				if (dirty & /*max_circle_width*/ 4) circle1_changes.diameter_generator = /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]);
				circle1.$set(circle1_changes);
				const circlelegend1_changes = {};
				if (dirty & /*selected_data*/ 8) circlelegend1_changes.data = /*selected_data*/ ctx[3];
				circlelegend1.$set(circlelegend1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(circle0.$$.fragment, local);
				transition_in(circlelegend0.$$.fragment, local);
				transition_in(circle1.$$.fragment, local);
				transition_in(circlelegend1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(circle0.$$.fragment, local);
				transition_out(circlelegend0.$$.fragment, local);
				transition_out(circle1.$$.fragment, local);
				transition_out(circlelegend1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				destroy_component(circle0);
				destroy_component(circlelegend0);
				destroy_component(circle1);
				destroy_component(circlelegend1);
			}
		};
	}

	// (37:0) {#if chart_width >= 400}
	function create_if_block$1(ctx) {
		let div;
		let circle0;
		let t;
		let circle1;
		let current;

		circle0 = new Circle({
				props: {
					data: /*selected_data*/ ctx[3],
					max_big_variable: Math.max(.../*data*/ ctx[0].map(func$2)),
					diameter_generator: /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]),
					label: true,
					reference: true,
					big_variable: "revenue",
					big_variable_color: "#b29c58",
					big_variable_title: "Revenue",
					small_variable: "government_grants",
					small_variable_title: "Government grants",
					small_variable_color: "#d7c78e",
					data_format: /*data_format*/ ctx[7]
				}
			});

		circle1 = new Circle({
				props: {
					data: /*selected_data*/ ctx[3],
					max_big_variable: Math.max(.../*data*/ ctx[0].map(func_1$1)),
					diameter_generator: /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]),
					reference: true,
					label: true,
					big_variable: "assets",
					big_variable_color: "#256788",
					big_variable_title: "Assets",
					small_variable: "liabilities",
					small_variable_title: "Liabilites",
					small_variable_color: "#b9c9d5",
					data_format: /*data_format*/ ctx[7]
				}
			});

		return {
			c() {
				div = element("div");
				create_component(circle0.$$.fragment);
				t = space();
				create_component(circle1.$$.fragment);
				attr(div, "class", "circle-group svelte-1y0ix7b");

				set_style(div, "height", (/*chart_width*/ ctx[1] >= 400
				? /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2])(/*max_value*/ ctx[4])
				: /*get_diameter_generator*/ ctx[6](/*min_value*/ ctx[5], /*max_circle_width*/ ctx[2])(/*min_value*/ ctx[5]) + /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2])(/*max_value*/ ctx[4])) + "px");

				set_style(div, "flex-direction", /*chart_width*/ ctx[1] >= 400 ? "row" : "column");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(circle0, div, null);
				append(div, t);
				mount_component(circle1, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const circle0_changes = {};
				if (dirty & /*selected_data*/ 8) circle0_changes.data = /*selected_data*/ ctx[3];
				if (dirty & /*data*/ 1) circle0_changes.max_big_variable = Math.max(.../*data*/ ctx[0].map(func$2));
				if (dirty & /*max_circle_width*/ 4) circle0_changes.diameter_generator = /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]);
				circle0.$set(circle0_changes);
				const circle1_changes = {};
				if (dirty & /*selected_data*/ 8) circle1_changes.data = /*selected_data*/ ctx[3];
				if (dirty & /*data*/ 1) circle1_changes.max_big_variable = Math.max(.../*data*/ ctx[0].map(func_1$1));
				if (dirty & /*max_circle_width*/ 4) circle1_changes.diameter_generator = /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]);
				circle1.$set(circle1_changes);

				if (!current || dirty & /*chart_width, max_circle_width*/ 6) {
					set_style(div, "height", (/*chart_width*/ ctx[1] >= 400
					? /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2])(/*max_value*/ ctx[4])
					: /*get_diameter_generator*/ ctx[6](/*min_value*/ ctx[5], /*max_circle_width*/ ctx[2])(/*min_value*/ ctx[5]) + /*get_diameter_generator*/ ctx[6](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2])(/*max_value*/ ctx[4])) + "px");
				}

				if (!current || dirty & /*chart_width*/ 2) {
					set_style(div, "flex-direction", /*chart_width*/ ctx[1] >= 400 ? "row" : "column");
				}
			},
			i(local) {
				if (current) return;
				transition_in(circle0.$$.fragment, local);
				transition_in(circle1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(circle0.$$.fragment, local);
				transition_out(circle1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(circle0);
				destroy_component(circle1);
			}
		};
	}

	function create_fragment$2(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$1, create_else_block$1];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*chart_width*/ ctx[1] >= 400) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	const func$2 = x => x["revenue"];
	const func_1$1 = x => x["assets"];
	const func_2 = x => x["revenue"];
	const func_3 = x => x["assets"];

	function instance$2($$self, $$props, $$invalidate) {
		let selected_data;
		let { data = {} } = $$props;
		let { selected } = $$props;
		let { chart_width } = $$props;
		let max_circle_width;
		const max_revenue = Math.max(...data.map(x => x.revenue));
		const max_assets = Math.max(...data.map(x => x.assets));
		const max_value = Math.max(max_revenue, max_assets);
		const min_value = Math.min(max_revenue, max_assets);

		const get_diameter_generator = (max, max_circle_width) => {
			return value => {
				return Math.sqrt(value / max * (Math.PI * max_circle_width ** 2) / Math.PI);
			};
		};

		const data_format = d => format(`$.3~s`)(d).replace("G", "B");

		$$self.$$set = $$props => {
			if ('data' in $$props) $$invalidate(0, data = $$props.data);
			if ('selected' in $$props) $$invalidate(8, selected = $$props.selected);
			if ('chart_width' in $$props) $$invalidate(1, chart_width = $$props.chart_width);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*chart_width*/ 2) {
				$$invalidate(2, max_circle_width = chart_width - chart_width * (max_revenue / max_value));
			}

			if ($$self.$$.dirty & /*data, selected*/ 257) {
				$$invalidate(3, selected_data = data
				? data.filter(x => x.classification === selected)[0]
				: {});
			}
		};

		return [
			data,
			chart_width,
			max_circle_width,
			selected_data,
			max_value,
			min_value,
			get_diameter_generator,
			data_format,
			selected
		];
	}

	class CircleGroup extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 0, selected: 8, chart_width: 1 }, add_css$2);
		}
	}

	/* server/src/_compontents/FacetCircles.svelte generated by Svelte v4.2.20 */

	function add_css$1(target) {
		append_styles(target, "svelte-k9zg3d", ".facet-container.svelte-k9zg3d{display:flex;flex-direction:row;align-items:flex-start;margin-bottom:10px}.facet-title.svelte-k9zg3d{text-align:center;padding:0 30px 0 30px}.facet-column.svelte-k9zg3d:nth-child(2){border-left:1px dashed gray;border-right:1px dashed gray}.facet-column.svelte-k9zg3d{padding:0 10px 0 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:40px;width:100%;gap:20px}h3.svelte-k9zg3d{margin:unset}");
	}

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[10] = list[i];
		return child_ctx;
	}

	// (43:0) {#each selected_data['top_three'] as d}
	function create_each_block$1(ctx) {
		let div1;
		let div0;
		let t0_value = /*d*/ ctx[10].organization_name + "";
		let t0;
		let t1;
		let circle0;
		let t2;
		let circlelegend0;
		let t3;
		let circle1;
		let t4;
		let circlelegend1;
		let t5;
		let current;

		circle0 = new Circle({
				props: {
					data: /*d*/ ctx[10],
					max_big_variable: Math.max(.../*data*/ ctx[0].map(func$1)),
					diameter_generator: /*get_diameter_generator*/ ctx[5](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]),
					label: false,
					reference: false,
					big_variable: "revenue",
					big_variable_color: "#b29c58",
					big_variable_title: "Revenue",
					small_variable: "government_grants",
					small_variable_title: "Government grants",
					small_variable_color: "#d7c78e",
					data_format: /*data_format*/ ctx[6]
				}
			});

		circlelegend0 = new CircleLegend({
				props: {
					data: /*d*/ ctx[10],
					big_variable: "revenue",
					big_variable_color: "#b29c58",
					big_variable_title: "Revenue",
					small_variable: "government_grants",
					small_variable_title: "Government grants",
					small_variable_color: "#d7c78e",
					data_format: /*data_format*/ ctx[6]
				}
			});

		circle1 = new Circle({
				props: {
					data: /*d*/ ctx[10],
					max_big_variable: Math.max(.../*data*/ ctx[0].map(func_1)),
					diameter_generator: /*get_diameter_generator*/ ctx[5](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]),
					label: false,
					reference: false,
					big_variable: "assets",
					big_variable_color: "#256788",
					big_variable_title: "Assets",
					small_variable: "liabilities",
					small_variable_title: "Liabilites",
					small_variable_color: "#b9c9d5",
					data_format: /*data_format*/ ctx[6]
				}
			});

		circlelegend1 = new CircleLegend({
				props: {
					data: /*d*/ ctx[10],
					big_variable: "assets",
					big_variable_color: "#256788",
					big_variable_title: "Assets",
					small_variable: "liabilities",
					small_variable_title: "Liabilites",
					small_variable_color: "#b9c9d5",
					data_format: /*data_format*/ ctx[6]
				}
			});

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				t0 = text(t0_value);
				t1 = space();
				create_component(circle0.$$.fragment);
				t2 = space();
				create_component(circlelegend0.$$.fragment);
				t3 = space();
				create_component(circle1.$$.fragment);
				t4 = space();
				create_component(circlelegend1.$$.fragment);
				t5 = space();
				attr(div0, "class", "facet-title svelte-k9zg3d");
				attr(div1, "class", "facet-column svelte-k9zg3d");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, t0);
				append(div1, t1);
				mount_component(circle0, div1, null);
				append(div1, t2);
				mount_component(circlelegend0, div1, null);
				append(div1, t3);
				mount_component(circle1, div1, null);
				append(div1, t4);
				mount_component(circlelegend1, div1, null);
				append(div1, t5);
				current = true;
			},
			p(ctx, dirty) {
				if ((!current || dirty & /*selected_data*/ 8) && t0_value !== (t0_value = /*d*/ ctx[10].organization_name + "")) set_data(t0, t0_value);
				const circle0_changes = {};
				if (dirty & /*selected_data*/ 8) circle0_changes.data = /*d*/ ctx[10];
				if (dirty & /*data*/ 1) circle0_changes.max_big_variable = Math.max(.../*data*/ ctx[0].map(func$1));
				if (dirty & /*max_circle_width*/ 4) circle0_changes.diameter_generator = /*get_diameter_generator*/ ctx[5](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]);
				circle0.$set(circle0_changes);
				const circlelegend0_changes = {};
				if (dirty & /*selected_data*/ 8) circlelegend0_changes.data = /*d*/ ctx[10];
				circlelegend0.$set(circlelegend0_changes);
				const circle1_changes = {};
				if (dirty & /*selected_data*/ 8) circle1_changes.data = /*d*/ ctx[10];
				if (dirty & /*data*/ 1) circle1_changes.max_big_variable = Math.max(.../*data*/ ctx[0].map(func_1));
				if (dirty & /*max_circle_width*/ 4) circle1_changes.diameter_generator = /*get_diameter_generator*/ ctx[5](/*max_value*/ ctx[4], /*max_circle_width*/ ctx[2]);
				circle1.$set(circle1_changes);
				const circlelegend1_changes = {};
				if (dirty & /*selected_data*/ 8) circlelegend1_changes.data = /*d*/ ctx[10];
				circlelegend1.$set(circlelegend1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(circle0.$$.fragment, local);
				transition_in(circlelegend0.$$.fragment, local);
				transition_in(circle1.$$.fragment, local);
				transition_in(circlelegend1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(circle0.$$.fragment, local);
				transition_out(circlelegend0.$$.fragment, local);
				transition_out(circle1.$$.fragment, local);
				transition_out(circlelegend1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_component(circle0);
				destroy_component(circlelegend0);
				destroy_component(circle1);
				destroy_component(circlelegend1);
			}
		};
	}

	function create_fragment$1(ctx) {
		let div0;
		let h3;
		let t0;
		let t1_value = /*selected*/ ctx[1].toLowerCase() + "";
		let t1;
		let t2;
		let t3;
		let div1;
		let current;
		let each_value = ensure_array_like(/*selected_data*/ ctx[3]['top_three']);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		return {
			c() {
				div0 = element("div");
				h3 = element("h3");
				t0 = text("Largest ");
				t1 = text(t1_value);
				t2 = text(" nonprofits");
				t3 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(h3, "class", "svelte-k9zg3d");
				attr(div1, "class", "facet-container svelte-k9zg3d");
			},
			m(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h3);
				append(h3, t0);
				append(h3, t1);
				append(h3, t2);
				insert(target, t3, anchor);
				insert(target, div1, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if ((!current || dirty & /*selected*/ 2) && t1_value !== (t1_value = /*selected*/ ctx[1].toLowerCase() + "")) set_data(t1, t1_value);

				if (dirty & /*selected_data, data_format, Math, data, get_diameter_generator, max_value, max_circle_width*/ 125) {
					each_value = ensure_array_like(/*selected_data*/ ctx[3]['top_three']);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div1, null);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div0);
					detach(t3);
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	const func$1 = x => x["revenue"];
	const func_1 = x => x["assets"];

	function instance$1($$self, $$props, $$invalidate) {
		let selected_data;
		let { data = {} } = $$props;
		let { selected } = $$props;
		let { chart_width } = $$props;
		let max_circle_width;
		const max_revenue = Math.max(...data.map(x => x.revenue));
		const max_assets = Math.max(...data.map(x => x.assets));
		const max_value = Math.max(max_revenue, max_assets);

		const get_diameter_generator = (max, max_circle_width) => {
			return value => {
				return Math.sqrt(value / max * (Math.PI * max_circle_width ** 2) / Math.PI);
			};
		};

		const data_format = d => format(`$.3~s`)(d).replace("G", "B");

		$$self.$$set = $$props => {
			if ('data' in $$props) $$invalidate(0, data = $$props.data);
			if ('selected' in $$props) $$invalidate(1, selected = $$props.selected);
			if ('chart_width' in $$props) $$invalidate(7, chart_width = $$props.chart_width);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*chart_width*/ 128) {
				$$invalidate(2, max_circle_width = chart_width - chart_width * (max_revenue / max_value));
			}

			if ($$self.$$.dirty & /*data, selected*/ 3) {
				$$invalidate(3, selected_data = data
				? data.filter(x => x.classification === selected)[0]
				: {});
			}
		};

		return [
			data,
			selected,
			max_circle_width,
			selected_data,
			max_value,
			get_diameter_generator,
			data_format,
			chart_width
		];
	}

	class FacetCircles extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { data: 0, selected: 1, chart_width: 7 }, add_css$1);
		}
	}

	var data = [
		{
			classification: "Hospital",
			revenue: 6251502545,
			assets: 13215806046,
			government_grants: 180618719,
			liabilities: 1376821828,
			top_three: [
				{
					organization_name: "Methodist Healthcare - Memphis Hospitals",
					for_fiscal_year_ending_in: "December 2023",
					revenue: 1936900010,
					assets: 1037190692,
					government_grants: 0,
					liabilities: 81082821
				},
				{
					organization_name: "St Jude Children's Research Hospital",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 1707244071,
					assets: 10479499175,
					government_grants: 127032916,
					liabilities: 277577319
				},
				{
					organization_name: "Baptist Memorial Hospital",
					for_fiscal_year_ending_in: "September 2023",
					revenue: 898107746,
					assets: 522179995,
					government_grants: 6333530,
					liabilities: 336220964
				}
			],
			description: "only hospitals"
		},
		{
			classification: "Health Care",
			revenue: 4414359755,
			assets: 14018532529,
			government_grants: 127913577,
			liabilities: 2561605234,
			top_three: [
				{
					organization_name: "American Lebanese Syrian Associated Charities Inc. (ALSAC)",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 2686629420,
					assets: 9109419712,
					government_grants: 0,
					liabilities: 142305459
				},
				{
					organization_name: "Baptist Memorial Health Care Corp.",
					for_fiscal_year_ending_in: "September 2023",
					revenue: 280996342,
					assets: 1361642699,
					government_grants: 38664,
					liabilities: 250739999
				},
				{
					organization_name: "Baptist Memorial Medical Group Inc.",
					for_fiscal_year_ending_in: "September 2023",
					revenue: 241599300,
					assets: 452403050,
					government_grants: 0,
					liabilities: 832396379
				}
			],
			description: "hospital system adminstrative/fiscal entities, health care service centers, physician groups, and other health care and medical practices"
		},
		{
			classification: "Social Assistance",
			revenue: 1391204429,
			assets: 2758472464,
			government_grants: 186573786,
			liabilities: 1454065227,
			top_three: [
				{
					organization_name: "Youth Villages Inc.",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 342204199,
					assets: 289113021,
					government_grants: 17391800,
					liabilities: 42149106
				},
				{
					organization_name: "Mid-South Food Bank",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 71842542,
					assets: 40968408,
					government_grants: 15452628,
					liabilities: 1768739
				},
				{
					organization_name: "Memphis Goodwill Inc.",
					for_fiscal_year_ending_in: "December 2023",
					revenue: 47631419,
					assets: 54175429,
					government_grants: 0,
					liabilities: 47401441
				}
			],
			description: "food banks, homeless shelters, mental health support services, and other human and socal service organizations"
		},
		{
			classification: "Other",
			revenue: 1366735511,
			assets: 3051724534,
			government_grants: 133281558,
			liabilities: 1608106451,
			top_three: [
				{
					organization_name: "Ducks Unlimited Inc.",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 302178704,
					assets: 342577877,
					government_grants: 117844708,
					liabilities: 78814186
				},
				{
					organization_name: "Baptist Memorial Medical Ministries Employee Health & Welfare Trust",
					for_fiscal_year_ending_in: "September 2023",
					revenue: 182875853,
					assets: 4875501,
					government_grants: 0,
					liabilities: 8930486
				},
				{
					organization_name: "Northcentral Electric Cooperative",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 142343736,
					assets: 228436980,
					government_grants: 0,
					liabilities: 110867002
				}
			],
			description: "recreation organizatons, labor unions, sororities/fraternities, employee trusts, and other miscellaneous organizations"
		},
		{
			classification: "Education",
			revenue: 1345779513,
			assets: 2960228949,
			government_grants: 346060467,
			liabilities: 765158072,
			top_three: [
				{
					organization_name: "Rhodes College",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 165430903,
					assets: 641026108,
					government_grants: 2589112,
					liabilities: 112403145
				},
				{
					organization_name: "Christian Brothers University",
					for_fiscal_year_ending_in: "May 2023",
					revenue: 65399822,
					assets: 92597874,
					government_grants: 1741795,
					liabilities: 9022563
				},
				{
					organization_name: "Institute of Community Services Inc.",
					for_fiscal_year_ending_in: "January 2024",
					revenue: 44536084,
					assets: 6630371,
					government_grants: 44103264,
					liabilities: 6457698
				}
			],
			description: "private schools, charter school operators, and other organizations that provides instruction"
		},
		{
			classification: "Grantmaking & Giving",
			revenue: 665148158,
			assets: 3689260547,
			government_grants: 5986619,
			liabilities: 73397062,
			top_three: [
				{
					organization_name: "Community Foundation of Greater Memphis Inc.",
					for_fiscal_year_ending_in: "April 2023",
					revenue: 114399155,
					assets: 852675440,
					government_grants: 0,
					liabilities: 10368700
				},
				{
					organization_name: "Christian Community Foundation of Memphis & the Mid-South Inc.",
					for_fiscal_year_ending_in: "April 2023",
					revenue: 88254536,
					assets: 209700256,
					government_grants: 0,
					liabilities: 7835406
				},
				{
					organization_name: "Pyramid Peak Foundation",
					for_fiscal_year_ending_in: "December 2023",
					revenue: 4415478,
					assets: 169322586,
					government_grants: 0,
					liabilities: 10010
				}
			],
			description: "private foundations, community foundations, and other organizations whose primary function is granting"
		},
		{
			classification: "Arts & Culture",
			revenue: 273804666,
			assets: 764992425,
			government_grants: 24520544,
			liabilities: 172366967,
			top_three: [
				{
					organization_name: "Memphis Zoo Inc.",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 25890431,
					assets: 13415654,
					government_grants: 1425448,
					liabilities: 7778823
				},
				{
					organization_name: "Memphis River Parks Partnership Inc.",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 7696270,
					assets: 25503761,
					government_grants: 0,
					liabilities: 18183192
				},
				{
					organization_name: "Orpheum Theatre Group",
					for_fiscal_year_ending_in: "June 2024",
					revenue: 20900390,
					assets: 64486127,
					government_grants: 144840,
					liabilities: 9512810
				}
			],
			description: "musuems, art galleries, festivals, radio stations, theaters, and dance studios"
		},
		{
			classification: "Business Advocacy",
			revenue: 90643146,
			assets: 171009902,
			government_grants: 359695,
			liabilities: 27307922,
			top_three: [
				{
					organization_name: "National Cotton Council of America",
					for_fiscal_year_ending_in: "December 2023",
					revenue: 18290874,
					assets: 24999554,
					government_grants: 0,
					liabilities: 2107826
				},
				{
					organization_name: "Memphis Tourism",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 19186089,
					assets: 48257129,
					government_grants: 0,
					liabilities: 3603535
				},
				{
					organization_name: "Greater Memphis Chamber",
					for_fiscal_year_ending_in: "December 2023",
					revenue: 8305030,
					assets: 6347879,
					government_grants: 0,
					liabilities: 4118121
				}
			],
			description: "chambers of commerce, trade organizations, and other business advocacy organizations"
		},
		{
			classification: "All",
			revenue: 15799177723,
			assets: 40630027396,
			government_grants: 1005314965,
			liabilities: 8038828763,
			top_three: [
				{
					organization_name: "American Lebanese Syrian Assoc Char Inc.",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 2686629420,
					assets: 9109419712,
					government_grants: 0,
					liabilities: 142305459
				},
				{
					organization_name: "Methodist Healthcare-Memphis",
					for_fiscal_year_ending_in: "December 2023",
					revenue: 1936900010,
					assets: 1037190692,
					government_grants: 0,
					liabilities: 81082821
				},
				{
					organization_name: "St Jude Childrens Research Hospital Inc.",
					for_fiscal_year_ending_in: "June 2023",
					revenue: 1707244071,
					assets: 10479499175,
					government_grants: 127032916,
					liabilities: 277577319
				}
			]
		}
	];

	/* server/src/1016_nonprofit/BalanceSheet.svelte generated by Svelte v4.2.20 */

	function add_css(target) {
		append_styles(target, "svelte-4jdl8s", ".svelte-4jdl8s{font-family:sans-serif}.chart.svelte-4jdl8s{width:100%;display:flex;flex-direction:column;gap:10px}.inline-select.svelte-4jdl8s{-webkit-appearance:none;-moz-appearance:none;appearance:none;font:inherit;color:inherit;background-color:transparent;border:1px solid #ccc;border-radius:4px;padding:0 0.5em 0 0.25em;line-height:1.5;cursor:pointer;display:inline-block;min-width:8ch;background-image:url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3e%3cpath fill='%23666' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e\");background-repeat:no-repeat;background-position:right 0.25em center;background-size:0.5em 0.35em;padding-right:1.5em}.inline-select.svelte-4jdl8s:focus{outline:none;border-color:#007bff}");
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[5] = list[i];
		return child_ctx;
	}

	// (34:8) {#each data as d}
	function create_each_block(ctx) {
		let option;

		return {
			c() {
				option = element("option");
				option.textContent = `${/*d*/ ctx[5].classification} `;
				option.__value = /*d*/ ctx[5].classification;
				set_input_value(option, option.__value);
				attr(option, "class", "cat svelte-4jdl8s");
			},
			m(target, anchor) {
				insert(target, option, anchor);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(option);
				}
			}
		};
	}

	// (49:4) {#if selected != "All"}
	function create_if_block(ctx) {
		let p;
		let b;
		let t0_value = /*selected_data*/ ctx[2].classification.slice(0, 1).toUpperCase() + /*selected_data*/ ctx[2].classification.toLowerCase().slice(1) + "";
		let t0;
		let t1;
		let t2;
		let t3_value = /*selected_data*/ ctx[2].description + "";
		let t3;
		let t4;
		let t5;
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block_1, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*chart_width*/ ctx[1] > 400) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				p = element("p");
				b = element("b");
				t0 = text(t0_value);
				t1 = text(" nonprofits");
				t2 = text(" include ");
				t3 = text(t3_value);
				t4 = text(".");
				t5 = space();
				if_block.c();
				if_block_anchor = empty();
				attr(b, "class", "svelte-4jdl8s");
				attr(p, "class", "svelte-4jdl8s");
			},
			m(target, anchor) {
				insert(target, p, anchor);
				append(p, b);
				append(b, t0);
				append(b, t1);
				append(p, t2);
				append(p, t3);
				append(p, t4);
				insert(target, t5, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if ((!current || dirty & /*selected_data*/ 4) && t0_value !== (t0_value = /*selected_data*/ ctx[2].classification.slice(0, 1).toUpperCase() + /*selected_data*/ ctx[2].classification.toLowerCase().slice(1) + "")) set_data(t0, t0_value);
				if ((!current || dirty & /*selected_data*/ 4) && t3_value !== (t3_value = /*selected_data*/ ctx[2].description + "")) set_data(t3, t3_value);
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(p);
					detach(t5);
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	// (57:4) {:else}
	function create_else_block(ctx) {
		let t0;
		let t1_value = /*selected_data*/ ctx[2].classification.toLowerCase() + "";
		let t1;
		let t2;
		let t3_value = and_list(/*selected_data*/ ctx[2]['top_three'].map(func)) + "";
		let t3;
		let t4;

		return {
			c() {
				t0 = text("The three largest ");
				t1 = text(t1_value);
				t2 = text(" nonprofits are ");
				t3 = text(t3_value);
				t4 = text(".");
			},
			m(target, anchor) {
				insert(target, t0, anchor);
				insert(target, t1, anchor);
				insert(target, t2, anchor);
				insert(target, t3, anchor);
				insert(target, t4, anchor);
			},
			p(ctx, dirty) {
				if (dirty & /*selected_data*/ 4 && t1_value !== (t1_value = /*selected_data*/ ctx[2].classification.toLowerCase() + "")) set_data(t1, t1_value);
				if (dirty & /*selected_data*/ 4 && t3_value !== (t3_value = and_list(/*selected_data*/ ctx[2]['top_three'].map(func)) + "")) set_data(t3, t3_value);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(t1);
					detach(t2);
					detach(t3);
					detach(t4);
				}
			}
		};
	}

	// (51:4) {#if chart_width > 400}
	function create_if_block_1(ctx) {
		let facetcircles;
		let current;

		facetcircles = new FacetCircles({
				props: {
					data,
					selected: /*selected*/ ctx[0],
					chart_width: /*chart_width*/ ctx[1]
				}
			});

		return {
			c() {
				create_component(facetcircles.$$.fragment);
			},
			m(target, anchor) {
				mount_component(facetcircles, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const facetcircles_changes = {};
				if (dirty & /*selected*/ 1) facetcircles_changes.selected = /*selected*/ ctx[0];
				if (dirty & /*chart_width*/ 2) facetcircles_changes.chart_width = /*chart_width*/ ctx[1];
				facetcircles.$set(facetcircles_changes);
			},
			i(local) {
				if (current) return;
				transition_in(facetcircles.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(facetcircles.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(facetcircles, detaching);
			}
		};
	}

	function create_fragment(ctx) {
		let div1;
		let div0;
		let t0;
		let select;
		let t1;
		let circlegroup;
		let t2;
		let div1_resize_listener;
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(data);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		circlegroup = new CircleGroup({
				props: {
					data,
					selected: /*selected*/ ctx[0],
					chart_width: /*chart_width*/ ctx[1]
				}
			});

		let if_block = /*selected*/ ctx[0] != "All" && create_if_block(ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				t0 = text("Filter by category: \n    ");
				select = element("select");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t1 = space();
				create_component(circlegroup.$$.fragment);
				t2 = space();
				if (if_block) if_block.c();
				attr(select, "class", "inline-select svelte-4jdl8s");
				if (/*selected*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[3].call(select));
				attr(div0, "class", "svelte-4jdl8s");
				attr(div1, "class", "chart svelte-4jdl8s");
				add_render_callback(() => /*div1_elementresize_handler*/ ctx[4].call(div1));
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, t0);
				append(div0, select);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*selected*/ ctx[0], true);
				append(div1, t1);
				mount_component(circlegroup, div1, null);
				append(div1, t2);
				if (if_block) if_block.m(div1, null);
				div1_resize_listener = add_iframe_resize_listener(div1, /*div1_elementresize_handler*/ ctx[4].bind(div1));
				current = true;

				if (!mounted) {
					dispose = listen(select, "change", /*select_change_handler*/ ctx[3]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*selected*/ 1) {
					select_option(select, /*selected*/ ctx[0]);
				}

				const circlegroup_changes = {};
				if (dirty & /*selected*/ 1) circlegroup_changes.selected = /*selected*/ ctx[0];
				if (dirty & /*chart_width*/ 2) circlegroup_changes.chart_width = /*chart_width*/ ctx[1];
				circlegroup.$set(circlegroup_changes);

				if (/*selected*/ ctx[0] != "All") {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*selected*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(div1, null);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(circlegroup.$$.fragment, local);
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(circlegroup.$$.fragment, local);
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
				destroy_component(circlegroup);
				if (if_block) if_block.d();
				div1_resize_listener();
				mounted = false;
				dispose();
			}
		};
	}

	function and_list(l = []) {
		if (l.length === 1) {
			return l[0];
		}

		if (l.length === 2) {
			return l[0] + " and " + l[1];
		}

		l[l.length - 1] = "and " + l[l.length - 1].replace(".", "");
		return l.join(", ");
	}

	const func = x => x.organization_name;

	function instance($$self, $$props, $$invalidate) {
		let chart_width;
		let selected = "All";
		let selected_data;

		function select_change_handler() {
			selected = select_value(this);
			$$invalidate(0, selected);
		}

		function div1_elementresize_handler() {
			chart_width = this.clientWidth;
			$$invalidate(1, chart_width);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*selected*/ 1) {
				$$invalidate(2, selected_data = data
				? data.filter(x => x.classification === selected)[0]
				: {});
			}
		};

		data.sort((a, b) => b.revenue - a.revenue);

		return [
			selected,
			chart_width,
			selected_data,
			select_change_handler,
			div1_elementresize_handler
		];
	}

	class BalanceSheet extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
		}
	}

	var div = document.createElement("div");
	var script = document.currentScript;
	script.parentNode.insertBefore(div, script);

	new BalanceSheet({
	  target: div,
	  props: {},
	});

})();
