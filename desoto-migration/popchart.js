(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function append_styles(target, style_sheet_id, styles) {
        const append_styles_to = get_root_for_style(target);
        if (!append_styles_to.getElementById(style_sheet_id)) {
            const style = element('style');
            style.id = style_sheet_id;
            style.textContent = styles;
            append_stylesheet(append_styles_to, style);
        }
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        text.data = data;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_iframe_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
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
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Associates an arbitrary `context` object with the current component and the specified `key`
     * and returns that object. The context is then available to children of the component
     * (including slotted content) with `getContext`.
     *
     * Like lifecycle functions, this must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-setcontext
     */
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    /**
     * Retrieves the context that belongs to the closest parent component with the specified `key`.
     * Must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-getcontext
     */
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
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
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
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
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
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
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
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
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier} [start]
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let started = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (started) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            started = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
                // We need to set this to false because callbacks can still happen despite having unsubscribed:
                // Callbacks might already be placed in the queue which doesn't know it should no longer
                // invoke this derived store.
                started = false;
            };
        });
    }

    /**
    	A function to help truth test values. Returns a `true` if zero.
    	@param {any} val The value to test.
    	@returns {any}
    */
    function canBeZero (val) {
    	if (val === 0) {
    		return true;
    	}
    	return val;
    }

    /**
    	Make an accessor from a string, number, function or an array of the combination of any
    	@param {String|Number|Function|Array} acc The accessor function, key or list of them.
    	@returns {Function} An accessor function.
    */
    function makeAccessor (acc) {
    	if (!canBeZero(acc)) return null;
    	if (Array.isArray(acc)) {
    		return d => acc.map(k => {
    			return typeof k !== 'function' ? d[k] : k(d);
    		});
    	} else if (typeof acc !== 'function') { // eslint-disable-line no-else-return
    		return d => d[acc];
    	}
    	return acc;
    }

    // From Object.fromEntries polyfill https://github.com/tc39/proposal-object-from-entries/blob/master/polyfill.js#L1
    function fromEntries(iter) {
    	const obj = {};

    	for (const pair of iter) {
    		if (Object(pair) !== pair) {
    			throw new TypeError("iterable for fromEntries should yield objects");
    		}
    		// Consistency with Map: contract is that entry has "0" and "1" keys, not
    		// that it is an array or iterable.
    		const { "0": key, "1": val } = pair;

    		Object.defineProperty(obj, key, {
    			configurable: true,
    			enumerable: true,
    			writable: true,
    			value: val,
    		});
    	}

    	return obj;
    }

    /**
    	Remove undefined fields from an object
    	@param {object} obj The object to filter
    	@param {object} [comparisonObj={}] An object that, for any key, if the key is not present on that object, the key will be filtered out. Note, this ignores the value on that object
    	@returns {object}
    */
    function filterObject (obj, comparisonObj = {}) {
    	return fromEntries(Object.entries(obj).filter(([key, value]) => {
    		return value !== undefined
    			&& comparisonObj[key] === undefined;
    	}));
    }

    /**
    	A simple debounce function taken from here https://www.freecodecamp.org/news/javascript-debounce-example/
    	@param {function} func The function to debounce.
    	@param {number} timeout The time in ms to wait.
    	@returns {function}
    */
    function debounce(func, timeout = 300) {
    	let timer;
    	return (...args) => {
    		clearTimeout(timer);
    		timer = setTimeout(() => {
    			func.apply(this, args);
    		}, timeout);
    	};
    }

    function ascending(a, b) {
      return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function descending(a, b) {
      return a == null || b == null ? NaN
        : b < a ? -1
        : b > a ? 1
        : b >= a ? 0
        : NaN;
    }

    function bisector(f) {
      let compare1, compare2, delta;

      // If an accessor is specified, promote it to a comparator. In this case we
      // can test whether the search value is (self-) comparable. We can’t do this
      // for a comparator (except for specific, known comparators) because we can’t
      // tell if the comparator is symmetric, and an asymmetric comparator can’t be
      // used to test whether a single value is comparable.
      if (f.length !== 2) {
        compare1 = ascending;
        compare2 = (d, x) => ascending(f(d), x);
        delta = (d, x) => f(d) - x;
      } else {
        compare1 = f === ascending || f === descending ? f : zero$1;
        compare2 = f;
        delta = f;
      }

      function left(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) < 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function right(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) <= 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function center(a, x, lo = 0, hi = a.length) {
        const i = left(a, x, lo, hi - 1);
        return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
      }

      return {left, center, right};
    }

    function zero$1() {
      return 0;
    }

    function number$1(x) {
      return x === null ? NaN : +x;
    }

    const ascendingBisect = bisector(ascending);
    const bisectRight = ascendingBisect.right;
    bisector(number$1).center;

    class InternMap extends Map {
      constructor(entries, key = keyof) {
        super();
        Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
        if (entries != null) for (const [key, value] of entries) this.set(key, value);
      }
      get(key) {
        return super.get(intern_get(this, key));
      }
      has(key) {
        return super.has(intern_get(this, key));
      }
      set(key, value) {
        return super.set(intern_set(this, key), value);
      }
      delete(key) {
        return super.delete(intern_delete(this, key));
      }
    }

    class InternSet extends Set {
      constructor(values, key = keyof) {
        super();
        Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
        if (values != null) for (const value of values) this.add(value);
      }
      has(value) {
        return super.has(intern_get(this, value));
      }
      add(value) {
        return super.add(intern_set(this, value));
      }
      delete(value) {
        return super.delete(intern_delete(this, value));
      }
    }

    function intern_get({_intern, _key}, value) {
      const key = _key(value);
      return _intern.has(key) ? _intern.get(key) : value;
    }

    function intern_set({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) return _intern.get(key);
      _intern.set(key, value);
      return value;
    }

    function intern_delete({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) {
        value = _intern.get(key);
        _intern.delete(key);
      }
      return value;
    }

    function keyof(value) {
      return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    const e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function tickSpec(start, stop, count) {
      const step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log10(step)),
          error = step / Math.pow(10, power),
          factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
      let i1, i2, inc;
      if (power < 0) {
        inc = Math.pow(10, -power) / factor;
        i1 = Math.round(start * inc);
        i2 = Math.round(stop * inc);
        if (i1 / inc < start) ++i1;
        if (i2 / inc > stop) --i2;
        inc = -inc;
      } else {
        inc = Math.pow(10, power) * factor;
        i1 = Math.round(start / inc);
        i2 = Math.round(stop / inc);
        if (i1 * inc < start) ++i1;
        if (i2 * inc > stop) --i2;
      }
      if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
      return [i1, i2, inc];
    }

    function ticks(start, stop, count) {
      stop = +stop, start = +start, count = +count;
      if (!(count > 0)) return [];
      if (start === stop) return [start];
      const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
      if (!(i2 >= i1)) return [];
      const n = i2 - i1 + 1, ticks = new Array(n);
      if (reverse) {
        if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
        else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
      } else {
        if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
        else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
      }
      return ticks;
    }

    function tickIncrement(start, stop, count) {
      stop = +stop, start = +start, count = +count;
      return tickSpec(start, stop, count)[2];
    }

    function tickStep(start, stop, count) {
      stop = +stop, start = +start, count = +count;
      const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
      return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
    }

    /**
    	Calculate the unique values of desired fields
    	For example, data like this:
    	[{ x: 0, y: -10 }, { x: 10, y: 0 }, { x: 5, y: 10 }]
    	and a fields object like this:
    	`{'x': d => d.x, 'y': d => d.y}`
    	returns an object like this:e
    	`{ x: [0, 10, 5], y: [-10, 0, 10] }`
    	@param {Array} data A flat array of.
    	@param {{x?: Function, y?: Function, z?: Function, r?: Function}} fields An object containing `x`, `y`, `r` or `z` keys that equal an accessor function. If an accessor function returns an array of values, each value will also be evaluated.
    	@param {{ sort?: Boolean, x?: Boolean , y?: Boolean , z?: Boolean , r?: Boolean }} sortOptions An object containing `sort`, `x`, `y`, `r` or `z` keys with Boolean values that designate how results should be sorted. Default is un-sorted. Pass in `sort: true` to sort all fields or specify fields individually.
    	@returns {{x?: [min: Number, max: Number]|[min: String, max: String], y?: [min: Number, max: Number]|[min: String, max: String], z?: [min: Number, max: Number]|[min: String, max: String], r?: [min: Number, max: Number]|[min: String, max: String]}} An object with the same structure as `fields` but instead of an accessor, each key contains an array of unique items.
    */
    function calcUniques(data, fields, sortOptions = {}) {
    	if (!Array.isArray(data)) {
    		throw new TypeError(
    			`The first argument of calcUniques() must be an array. You passed in a ${typeof data}. If you got this error using the <LayerCake> component, consider passing a flat array to the \`flatData\` prop. More info: https://layercake.graphics/guide/#flatdata`
    		);
    	}

    	if (Array.isArray(fields) || fields === undefined || fields === null) {
    		throw new TypeError(
    			'The second argument of calcUniques() must be an ' +
    				'object with field names as keys as accessor functions as values.'
    		);
    	}

    	const uniques = {};

    	const keys = Object.keys(fields);
    	const kl = keys.length;
    	let i;
    	let j;
    	let k;
    	let s;
    	let acc;
    	let val;
    	let set;

    	const dl = data.length;
    	for (i = 0; i < kl; i += 1) {
    		set = new InternSet();
    		s = keys[i];
    		acc = fields[s];
    		for (j = 0; j < dl; j += 1) {
    			val = acc(data[j]);
    			if (Array.isArray(val)) {
    				const vl = val.length;
    				for (k = 0; k < vl; k += 1) {
    					set.add(val[k]);
    				}
    			} else {
    				set.add(val);
    			}
    		}
    		const results = Array.from(set);
    		if (sortOptions.sort === true || sortOptions[s] === true) {
    			results.sort(ascending);
    		}
    		uniques[s] = results;
    	}
    	return uniques;
    }

    /**
    	Calculate the extents of desired fields, skipping `false`, `undefined`, `null` and `NaN` values
    	For example, data like this:
    	[{ x: 0, y: -10 }, { x: 10, y: 0 }, { x: 5, y: 10 }]
    	and a fields object like this:
    	`{'x': d => d.x, 'y': d => d.y}`
    	returns an object like this:
    	`{ x: [0, 10], y: [-10, 10] }`
    	@param {Array} data A flat array of objects.
    	@param {{x?: Function, y?: Function, z?: Function, r?: Function}} fields An object containing `x`, `y`, `r` or `z` keys that equal an accessor function. If an accessor function returns an array of values, each value will also be evaluated.
    	@returns {{x?: [min: Number, max: Number]|[min: String, max: String], y?: [min: Number, max: Number]|[min: String, max: String], z?: [min: Number, max: Number]|[min: String, max: String], r?: [min: Number, max: Number]|[min: String, max: String]}} An object with the same structure as `fields` but instead of an accessor, each key contains an array of a min and a max.
    */
    function calcExtents (data, fields) {
    	if (!Array.isArray(data)) {
    		throw new TypeError(`The first argument of calcExtents() must be an array. You passed in a ${typeof data}. If you got this error using the <LayerCake> component, consider passing a flat array to the \`flatData\` prop. More info: https://layercake.graphics/guide/#flatdata`);
    	}

    	if (
    		Array.isArray(fields)
    		|| fields === undefined
    		|| fields === null
    	) {
    		throw new TypeError('The second argument of calcExtents() must be an '
    		+ 'object with field names as keys as accessor functions as values.');
    	}

    	const extents = {};

    	const keys = Object.keys(fields);
    	const kl = keys.length;
    	let i;
    	let j;
    	let k;
    	let s;
    	let min;
    	let max;
    	let acc;
    	let val;

    	const dl = data.length;
    	for (i = 0; i < kl; i += 1) {
    		s = keys[i];
    		acc = fields[s];
    		min = null;
    		max = null;
    		for (j = 0; j < dl; j += 1) {
    			val = acc(data[j]);
    			if (Array.isArray(val)) {
    				const vl = val.length;
    				for (k = 0; k < vl; k += 1) {
    					if (val[k] !== false && val[k] !== undefined && val[k] !== null && Number.isNaN(val[k]) === false) {
    						if (min === null || val[k] < min) {
    							min = val[k];
    						}
    						if (max === null || val[k] > max) {
    							max = val[k];
    						}
    					}
    				}
    			} else if (val !== false && val !== undefined && val !== null && Number.isNaN(val) === false) {
    				if (min === null || val < min) {
    					min = val;
    				}
    				if (max === null || val > max) {
    					max = val;
    				}
    			}
    		}
    		extents[s] = [min, max];
    	}

    	return extents;
    }

    /**
      Determine whether two arrays equal one another, order not important.
    	This uses includes instead of converting to a set because this is only
    	used internally on a small array size and it's not worth the cost
    	of making a set
    	@param {Array} arr1 An array to test
    	@param {Array} arr2 An array to test against
    	@returns {Boolean} Whether they contain all and only the same items
     */
    function arraysEqual(arr1, arr2) {
    	if (arr1.length !== arr2.length) return false;
    	return arr1.every(k => {
    		return arr2.includes(k);
    	});
    }

    /**
      Determine whether a scale has an ordinal domain
    	https://svelte.dev/repl/ec6491055208401ca41120c9c8a67737?version=3.49.0
    	@param {Function} scale A D3 scale
    	@returns {Boolean} Whether the scale is an ordinal scale
     */
    function isOrdinalDomain(scale) {
    	// scaleBand, scalePoint
    	// @ts-ignore
    	if (typeof scale.bandwidth === 'function') {
    		return true;
    	}
    	// scaleOrdinal
    	if (arraysEqual(Object.keys(scale), ['domain', 'range', 'unknown', 'copy'])) {
    		return true;
    	}
    	return false;
    }

    /* --------------------------------------------
     * Figure out which of our scales are ordinal
     * and calculate unique items for them
     * for the others, calculate an extent
     */
    function calcScaleExtents (flatData, getters, activeScales) {
    	const scaleGroups = Object.entries(activeScales).reduce((groups, [k, scaleInfo]) => {
    		const domainType = isOrdinalDomain(scaleInfo.scale) === true ? 'ordinal' : 'other';
    		// @ts-ignore
    		if (!groups[domainType]) groups[domainType] = {};
    		groups[domainType][k] = getters[k];
    		return groups;
    	}, { ordinal: false, other: false});

    	let extents = {};
    	if (scaleGroups.ordinal) {
    		const sortOptions = Object.fromEntries(Object.entries(activeScales).map(([k, scaleInfo]) => {
    			return [k, scaleInfo.sort];
    		}));
    		extents = calcUniques(flatData, scaleGroups.ordinal, sortOptions);
    	}
    	if (scaleGroups.other) {
    		// @ts-ignore
    		extents = { ...extents, ...calcExtents(flatData, scaleGroups.other) };
    	}

    	return extents;
    }

    /**
    	If we have a domain from settings (the directive), fill in
    	any null values with ones from our measured extents
    	otherwise, return the measured extent
    	@param {Number[]} domain A two-value array of numbers
    	@param {Number[]} directive A two-value array of numbers that will have any nulls filled in from the `domain` array
    	@returns {Number[]} The filled in domain
    */
    function partialDomain (domain = [], directive) {
    	if (Array.isArray(directive) === true) {
    		return directive.map((d, i) => {
    			if (d === null) {
    				return domain[i];
    			}
    			return d;
    		});
    	}
    	return domain;
    }

    function calcDomain (s) {
    	return function domainCalc ([$extents, $domain]) {
    		if (typeof $domain === 'function') {
    			$domain = $domain($extents[s]);
    		}
    		return $extents ? partialDomain($extents[s], $domain) : $domain;
    	};
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    const implicit = Symbol("implicit");

    function ordinal() {
      var index = new InternMap(),
          domain = [],
          range = [],
          unknown = implicit;

      function scale(d) {
        let i = index.get(d);
        if (i === undefined) {
          if (unknown !== implicit) return unknown;
          index.set(d, i = domain.push(d) - 1);
        }
        return range[i % range.length];
      }

      scale.domain = function(_) {
        if (!arguments.length) return domain.slice();
        domain = [], index = new InternMap();
        for (const value of _) {
          if (index.has(value)) continue;
          index.set(value, domain.push(value) - 1);
        }
        return scale;
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), scale) : range.slice();
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      scale.copy = function() {
        return ordinal(domain, range).unknown(unknown);
      };

      initRange.apply(scale, arguments);

      return scale;
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
        reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
        reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
        reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
        reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
        reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHex8: color_formatHex8,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHex8() {
      return this.rgb().formatHex8();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb$1, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb() {
        return this;
      },
      clamp() {
        return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
      },
      displayable() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatHex8: rgb_formatHex8,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
    }

    function rgb_formatHex8() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
    }

    function rgb_formatRgb() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
    }

    function clampa(opacity) {
      return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
    }

    function clampi(value) {
      return Math.max(0, Math.min(255, Math.round(value) || 0));
    }

    function hex(value) {
      value = clampi(value);
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      clamp() {
        return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
      },
      displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl() {
        const a = clampa(this.opacity);
        return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
      }
    }));

    function clamph(value) {
      value = (value || 0) % 360;
      return value < 0 ? value + 360 : value;
    }

    function clampt(value) {
      return Math.max(0, Math.min(1, value || 0));
    }

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant = x => () => x;

    function linear$1(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant(isNaN(a) ? b : a);
    }

    var rgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb(start, end) {
        var r = color((start = rgb$1(start)).r, (end = rgb$1(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb.gamma = rgbGamma;

      return rgb;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function string(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, rgb) : string)
          : b instanceof color ? rgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    function constants(x) {
      return function() {
        return x;
      };
    }

    function number(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity$2(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constants(isNaN(b) ? NaN : 0.5);
    }

    function clamper(a, b) {
      var t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisectRight(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate$1 = interpolate,
          transform,
          untransform,
          unknown,
          clamp = identity$2,
          piecewise,
          output,
          input;

      function rescale() {
        var n = Math.min(domain.length, range.length);
        if (clamp !== identity$2) clamp = clamper(domain[0], domain[n - 1]);
        piecewise = n > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? true : identity$2, rescale()) : clamp !== identity$2;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous() {
      return transformer()(identity$2, identity$2);
    }

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

    function identity$1(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale$1(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
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

    var locale$1;
    var format;
    var formatPrefix;

    defaultLocale$1({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale$1(definition) {
      locale$1 = formatLocale$1(definition);
      format = locale$1.format;
      formatPrefix = locale$1.formatPrefix;
      return locale$1;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous();

      scale.copy = function() {
        return copy(scale, linear());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    function transformPow(exponent) {
      return function(x) {
        return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
      };
    }

    function transformSqrt(x) {
      return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
    }

    function transformSquare(x) {
      return x < 0 ? -x * x : x * x;
    }

    function powish(transform) {
      var scale = transform(identity$2, identity$2),
          exponent = 1;

      function rescale() {
        return exponent === 1 ? transform(identity$2, identity$2)
            : exponent === 0.5 ? transform(transformSqrt, transformSquare)
            : transform(transformPow(exponent), transformPow(1 / exponent));
      }

      scale.exponent = function(_) {
        return arguments.length ? (exponent = +_, rescale()) : exponent;
      };

      return linearish(scale);
    }

    function pow$1() {
      var scale = powish(transformer());

      scale.copy = function() {
        return copy(scale, pow$1()).exponent(scale.exponent());
      };

      initRange.apply(scale, arguments);

      return scale;
    }

    function sqrt() {
      return pow$1.apply(null, arguments).exponent(0.5);
    }

    const t0 = new Date, t1 = new Date;

    function timeInterval(floori, offseti, count, field) {

      function interval(date) {
        return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
      }

      interval.floor = (date) => {
        return floori(date = new Date(+date)), date;
      };

      interval.ceil = (date) => {
        return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
      };

      interval.round = (date) => {
        const d0 = interval(date), d1 = interval.ceil(date);
        return date - d0 < d1 - date ? d0 : d1;
      };

      interval.offset = (date, step) => {
        return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
      };

      interval.range = (start, stop, step) => {
        const range = [];
        start = interval.ceil(start);
        step = step == null ? 1 : Math.floor(step);
        if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
        let previous;
        do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
        while (previous < start && start < stop);
        return range;
      };

      interval.filter = (test) => {
        return timeInterval((date) => {
          if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
        }, (date, step) => {
          if (date >= date) {
            if (step < 0) while (++step <= 0) {
              while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
            } else while (--step >= 0) {
              while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
            }
          }
        });
      };

      if (count) {
        interval.count = (start, end) => {
          t0.setTime(+start), t1.setTime(+end);
          floori(t0), floori(t1);
          return Math.floor(count(t0, t1));
        };

        interval.every = (step) => {
          step = Math.floor(step);
          return !isFinite(step) || !(step > 0) ? null
              : !(step > 1) ? interval
              : interval.filter(field
                  ? (d) => field(d) % step === 0
                  : (d) => interval.count(0, d) % step === 0);
        };
      }

      return interval;
    }

    const durationSecond = 1000;
    const durationMinute = durationSecond * 60;
    const durationHour = durationMinute * 60;
    const durationDay = durationHour * 24;
    const durationWeek = durationDay * 7;

    const timeDay = timeInterval(
      date => date.setHours(0, 0, 0, 0),
      (date, step) => date.setDate(date.getDate() + step),
      (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
      date => date.getDate() - 1
    );

    timeDay.range;

    const utcDay = timeInterval((date) => {
      date.setUTCHours(0, 0, 0, 0);
    }, (date, step) => {
      date.setUTCDate(date.getUTCDate() + step);
    }, (start, end) => {
      return (end - start) / durationDay;
    }, (date) => {
      return date.getUTCDate() - 1;
    });

    utcDay.range;

    const unixDay = timeInterval((date) => {
      date.setUTCHours(0, 0, 0, 0);
    }, (date, step) => {
      date.setUTCDate(date.getUTCDate() + step);
    }, (start, end) => {
      return (end - start) / durationDay;
    }, (date) => {
      return Math.floor(date / durationDay);
    });

    unixDay.range;

    function timeWeekday(i) {
      return timeInterval((date) => {
        date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
        date.setHours(0, 0, 0, 0);
      }, (date, step) => {
        date.setDate(date.getDate() + step * 7);
      }, (start, end) => {
        return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
      });
    }

    const timeSunday = timeWeekday(0);
    const timeMonday = timeWeekday(1);
    const timeTuesday = timeWeekday(2);
    const timeWednesday = timeWeekday(3);
    const timeThursday = timeWeekday(4);
    const timeFriday = timeWeekday(5);
    const timeSaturday = timeWeekday(6);

    timeSunday.range;
    timeMonday.range;
    timeTuesday.range;
    timeWednesday.range;
    timeThursday.range;
    timeFriday.range;
    timeSaturday.range;

    function utcWeekday(i) {
      return timeInterval((date) => {
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
        date.setUTCHours(0, 0, 0, 0);
      }, (date, step) => {
        date.setUTCDate(date.getUTCDate() + step * 7);
      }, (start, end) => {
        return (end - start) / durationWeek;
      });
    }

    const utcSunday = utcWeekday(0);
    const utcMonday = utcWeekday(1);
    const utcTuesday = utcWeekday(2);
    const utcWednesday = utcWeekday(3);
    const utcThursday = utcWeekday(4);
    const utcFriday = utcWeekday(5);
    const utcSaturday = utcWeekday(6);

    utcSunday.range;
    utcMonday.range;
    utcTuesday.range;
    utcWednesday.range;
    utcThursday.range;
    utcFriday.range;
    utcSaturday.range;

    const timeYear = timeInterval((date) => {
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, (date, step) => {
      date.setFullYear(date.getFullYear() + step);
    }, (start, end) => {
      return end.getFullYear() - start.getFullYear();
    }, (date) => {
      return date.getFullYear();
    });

    // An optimized implementation for this simple case.
    timeYear.every = (k) => {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
        date.setFullYear(Math.floor(date.getFullYear() / k) * k);
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
      }, (date, step) => {
        date.setFullYear(date.getFullYear() + step * k);
      });
    };

    timeYear.range;

    const utcYear = timeInterval((date) => {
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, (date, step) => {
      date.setUTCFullYear(date.getUTCFullYear() + step);
    }, (start, end) => {
      return end.getUTCFullYear() - start.getUTCFullYear();
    }, (date) => {
      return date.getUTCFullYear();
    });

    // An optimized implementation for this simple case.
    utcYear.every = (k) => {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
        date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
        date.setUTCMonth(0, 1);
        date.setUTCHours(0, 0, 0, 0);
      }, (date, step) => {
        date.setUTCFullYear(date.getUTCFullYear() + step * k);
      });
    };

    utcYear.range;

    function localDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
        date.setFullYear(d.y);
        return date;
      }
      return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
    }

    function utcDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
        date.setUTCFullYear(d.y);
        return date;
      }
      return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
    }

    function newDate(y, m, d) {
      return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
    }

    function formatLocale(locale) {
      var locale_dateTime = locale.dateTime,
          locale_date = locale.date,
          locale_time = locale.time,
          locale_periods = locale.periods,
          locale_weekdays = locale.days,
          locale_shortWeekdays = locale.shortDays,
          locale_months = locale.months,
          locale_shortMonths = locale.shortMonths;

      var periodRe = formatRe(locale_periods),
          periodLookup = formatLookup(locale_periods),
          weekdayRe = formatRe(locale_weekdays),
          weekdayLookup = formatLookup(locale_weekdays),
          shortWeekdayRe = formatRe(locale_shortWeekdays),
          shortWeekdayLookup = formatLookup(locale_shortWeekdays),
          monthRe = formatRe(locale_months),
          monthLookup = formatLookup(locale_months),
          shortMonthRe = formatRe(locale_shortMonths),
          shortMonthLookup = formatLookup(locale_shortMonths);

      var formats = {
        "a": formatShortWeekday,
        "A": formatWeekday,
        "b": formatShortMonth,
        "B": formatMonth,
        "c": null,
        "d": formatDayOfMonth,
        "e": formatDayOfMonth,
        "f": formatMicroseconds,
        "g": formatYearISO,
        "G": formatFullYearISO,
        "H": formatHour24,
        "I": formatHour12,
        "j": formatDayOfYear,
        "L": formatMilliseconds,
        "m": formatMonthNumber,
        "M": formatMinutes,
        "p": formatPeriod,
        "q": formatQuarter,
        "Q": formatUnixTimestamp,
        "s": formatUnixTimestampSeconds,
        "S": formatSeconds,
        "u": formatWeekdayNumberMonday,
        "U": formatWeekNumberSunday,
        "V": formatWeekNumberISO,
        "w": formatWeekdayNumberSunday,
        "W": formatWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatYear,
        "Y": formatFullYear,
        "Z": formatZone,
        "%": formatLiteralPercent
      };

      var utcFormats = {
        "a": formatUTCShortWeekday,
        "A": formatUTCWeekday,
        "b": formatUTCShortMonth,
        "B": formatUTCMonth,
        "c": null,
        "d": formatUTCDayOfMonth,
        "e": formatUTCDayOfMonth,
        "f": formatUTCMicroseconds,
        "g": formatUTCYearISO,
        "G": formatUTCFullYearISO,
        "H": formatUTCHour24,
        "I": formatUTCHour12,
        "j": formatUTCDayOfYear,
        "L": formatUTCMilliseconds,
        "m": formatUTCMonthNumber,
        "M": formatUTCMinutes,
        "p": formatUTCPeriod,
        "q": formatUTCQuarter,
        "Q": formatUnixTimestamp,
        "s": formatUnixTimestampSeconds,
        "S": formatUTCSeconds,
        "u": formatUTCWeekdayNumberMonday,
        "U": formatUTCWeekNumberSunday,
        "V": formatUTCWeekNumberISO,
        "w": formatUTCWeekdayNumberSunday,
        "W": formatUTCWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatUTCYear,
        "Y": formatUTCFullYear,
        "Z": formatUTCZone,
        "%": formatLiteralPercent
      };

      var parses = {
        "a": parseShortWeekday,
        "A": parseWeekday,
        "b": parseShortMonth,
        "B": parseMonth,
        "c": parseLocaleDateTime,
        "d": parseDayOfMonth,
        "e": parseDayOfMonth,
        "f": parseMicroseconds,
        "g": parseYear,
        "G": parseFullYear,
        "H": parseHour24,
        "I": parseHour24,
        "j": parseDayOfYear,
        "L": parseMilliseconds,
        "m": parseMonthNumber,
        "M": parseMinutes,
        "p": parsePeriod,
        "q": parseQuarter,
        "Q": parseUnixTimestamp,
        "s": parseUnixTimestampSeconds,
        "S": parseSeconds,
        "u": parseWeekdayNumberMonday,
        "U": parseWeekNumberSunday,
        "V": parseWeekNumberISO,
        "w": parseWeekdayNumberSunday,
        "W": parseWeekNumberMonday,
        "x": parseLocaleDate,
        "X": parseLocaleTime,
        "y": parseYear,
        "Y": parseFullYear,
        "Z": parseZone,
        "%": parseLiteralPercent
      };

      // These recursive directive definitions must be deferred.
      formats.x = newFormat(locale_date, formats);
      formats.X = newFormat(locale_time, formats);
      formats.c = newFormat(locale_dateTime, formats);
      utcFormats.x = newFormat(locale_date, utcFormats);
      utcFormats.X = newFormat(locale_time, utcFormats);
      utcFormats.c = newFormat(locale_dateTime, utcFormats);

      function newFormat(specifier, formats) {
        return function(date) {
          var string = [],
              i = -1,
              j = 0,
              n = specifier.length,
              c,
              pad,
              format;

          if (!(date instanceof Date)) date = new Date(+date);

          while (++i < n) {
            if (specifier.charCodeAt(i) === 37) {
              string.push(specifier.slice(j, i));
              if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
              else pad = c === "e" ? " " : "0";
              if (format = formats[c]) c = format(date, pad);
              string.push(c);
              j = i + 1;
            }
          }

          string.push(specifier.slice(j, i));
          return string.join("");
        };
      }

      function newParse(specifier, Z) {
        return function(string) {
          var d = newDate(1900, undefined, 1),
              i = parseSpecifier(d, specifier, string += "", 0),
              week, day;
          if (i != string.length) return null;

          // If a UNIX timestamp is specified, return it.
          if ("Q" in d) return new Date(d.Q);
          if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

          // If this is utcParse, never use the local timezone.
          if (Z && !("Z" in d)) d.Z = 0;

          // The am-pm flag is 0 for AM, and 1 for PM.
          if ("p" in d) d.H = d.H % 12 + d.p * 12;

          // If the month was not specified, inherit from the quarter.
          if (d.m === undefined) d.m = "q" in d ? d.q : 0;

          // Convert day-of-week and week-of-year to day-of-year.
          if ("V" in d) {
            if (d.V < 1 || d.V > 53) return null;
            if (!("w" in d)) d.w = 1;
            if ("Z" in d) {
              week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
              week = day > 4 || day === 0 ? utcMonday.ceil(week) : utcMonday(week);
              week = utcDay.offset(week, (d.V - 1) * 7);
              d.y = week.getUTCFullYear();
              d.m = week.getUTCMonth();
              d.d = week.getUTCDate() + (d.w + 6) % 7;
            } else {
              week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
              week = day > 4 || day === 0 ? timeMonday.ceil(week) : timeMonday(week);
              week = timeDay.offset(week, (d.V - 1) * 7);
              d.y = week.getFullYear();
              d.m = week.getMonth();
              d.d = week.getDate() + (d.w + 6) % 7;
            }
          } else if ("W" in d || "U" in d) {
            if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
            day = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
            d.m = 0;
            d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
          }

          // If a time zone is specified, all fields are interpreted as UTC and then
          // offset according to the specified time zone.
          if ("Z" in d) {
            d.H += d.Z / 100 | 0;
            d.M += d.Z % 100;
            return utcDate(d);
          }

          // Otherwise, all fields are in local time.
          return localDate(d);
        };
      }

      function parseSpecifier(d, specifier, string, j) {
        var i = 0,
            n = specifier.length,
            m = string.length,
            c,
            parse;

        while (i < n) {
          if (j >= m) return -1;
          c = specifier.charCodeAt(i++);
          if (c === 37) {
            c = specifier.charAt(i++);
            parse = parses[c in pads ? specifier.charAt(i++) : c];
            if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
          } else if (c != string.charCodeAt(j++)) {
            return -1;
          }
        }

        return j;
      }

      function parsePeriod(d, string, i) {
        var n = periodRe.exec(string.slice(i));
        return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseShortWeekday(d, string, i) {
        var n = shortWeekdayRe.exec(string.slice(i));
        return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseWeekday(d, string, i) {
        var n = weekdayRe.exec(string.slice(i));
        return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseShortMonth(d, string, i) {
        var n = shortMonthRe.exec(string.slice(i));
        return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseMonth(d, string, i) {
        var n = monthRe.exec(string.slice(i));
        return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseLocaleDateTime(d, string, i) {
        return parseSpecifier(d, locale_dateTime, string, i);
      }

      function parseLocaleDate(d, string, i) {
        return parseSpecifier(d, locale_date, string, i);
      }

      function parseLocaleTime(d, string, i) {
        return parseSpecifier(d, locale_time, string, i);
      }

      function formatShortWeekday(d) {
        return locale_shortWeekdays[d.getDay()];
      }

      function formatWeekday(d) {
        return locale_weekdays[d.getDay()];
      }

      function formatShortMonth(d) {
        return locale_shortMonths[d.getMonth()];
      }

      function formatMonth(d) {
        return locale_months[d.getMonth()];
      }

      function formatPeriod(d) {
        return locale_periods[+(d.getHours() >= 12)];
      }

      function formatQuarter(d) {
        return 1 + ~~(d.getMonth() / 3);
      }

      function formatUTCShortWeekday(d) {
        return locale_shortWeekdays[d.getUTCDay()];
      }

      function formatUTCWeekday(d) {
        return locale_weekdays[d.getUTCDay()];
      }

      function formatUTCShortMonth(d) {
        return locale_shortMonths[d.getUTCMonth()];
      }

      function formatUTCMonth(d) {
        return locale_months[d.getUTCMonth()];
      }

      function formatUTCPeriod(d) {
        return locale_periods[+(d.getUTCHours() >= 12)];
      }

      function formatUTCQuarter(d) {
        return 1 + ~~(d.getUTCMonth() / 3);
      }

      return {
        format: function(specifier) {
          var f = newFormat(specifier += "", formats);
          f.toString = function() { return specifier; };
          return f;
        },
        parse: function(specifier) {
          var p = newParse(specifier += "", false);
          p.toString = function() { return specifier; };
          return p;
        },
        utcFormat: function(specifier) {
          var f = newFormat(specifier += "", utcFormats);
          f.toString = function() { return specifier; };
          return f;
        },
        utcParse: function(specifier) {
          var p = newParse(specifier += "", true);
          p.toString = function() { return specifier; };
          return p;
        }
      };
    }

    var pads = {"-": "", "_": " ", "0": "0"},
        numberRe = /^\s*\d+/, // note: ignores next directive
        percentRe = /^%/,
        requoteRe = /[\\^$*+?|[\]().{}]/g;

    function pad(value, fill, width) {
      var sign = value < 0 ? "-" : "",
          string = (sign ? -value : value) + "",
          length = string.length;
      return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
    }

    function requote(s) {
      return s.replace(requoteRe, "\\$&");
    }

    function formatRe(names) {
      return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
    }

    function formatLookup(names) {
      return new Map(names.map((name, i) => [name.toLowerCase(), i]));
    }

    function parseWeekdayNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.w = +n[0], i + n[0].length) : -1;
    }

    function parseWeekdayNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.u = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.U = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberISO(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.V = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.W = +n[0], i + n[0].length) : -1;
    }

    function parseFullYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 4));
      return n ? (d.y = +n[0], i + n[0].length) : -1;
    }

    function parseYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
    }

    function parseZone(d, string, i) {
      var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
      return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
    }

    function parseQuarter(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
    }

    function parseMonthNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
    }

    function parseDayOfMonth(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.d = +n[0], i + n[0].length) : -1;
    }

    function parseDayOfYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
    }

    function parseHour24(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.H = +n[0], i + n[0].length) : -1;
    }

    function parseMinutes(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.M = +n[0], i + n[0].length) : -1;
    }

    function parseSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.S = +n[0], i + n[0].length) : -1;
    }

    function parseMilliseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.L = +n[0], i + n[0].length) : -1;
    }

    function parseMicroseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 6));
      return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
    }

    function parseLiteralPercent(d, string, i) {
      var n = percentRe.exec(string.slice(i, i + 1));
      return n ? i + n[0].length : -1;
    }

    function parseUnixTimestamp(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.Q = +n[0], i + n[0].length) : -1;
    }

    function parseUnixTimestampSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.s = +n[0], i + n[0].length) : -1;
    }

    function formatDayOfMonth(d, p) {
      return pad(d.getDate(), p, 2);
    }

    function formatHour24(d, p) {
      return pad(d.getHours(), p, 2);
    }

    function formatHour12(d, p) {
      return pad(d.getHours() % 12 || 12, p, 2);
    }

    function formatDayOfYear(d, p) {
      return pad(1 + timeDay.count(timeYear(d), d), p, 3);
    }

    function formatMilliseconds(d, p) {
      return pad(d.getMilliseconds(), p, 3);
    }

    function formatMicroseconds(d, p) {
      return formatMilliseconds(d, p) + "000";
    }

    function formatMonthNumber(d, p) {
      return pad(d.getMonth() + 1, p, 2);
    }

    function formatMinutes(d, p) {
      return pad(d.getMinutes(), p, 2);
    }

    function formatSeconds(d, p) {
      return pad(d.getSeconds(), p, 2);
    }

    function formatWeekdayNumberMonday(d) {
      var day = d.getDay();
      return day === 0 ? 7 : day;
    }

    function formatWeekNumberSunday(d, p) {
      return pad(timeSunday.count(timeYear(d) - 1, d), p, 2);
    }

    function dISO(d) {
      var day = d.getDay();
      return (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
    }

    function formatWeekNumberISO(d, p) {
      d = dISO(d);
      return pad(timeThursday.count(timeYear(d), d) + (timeYear(d).getDay() === 4), p, 2);
    }

    function formatWeekdayNumberSunday(d) {
      return d.getDay();
    }

    function formatWeekNumberMonday(d, p) {
      return pad(timeMonday.count(timeYear(d) - 1, d), p, 2);
    }

    function formatYear(d, p) {
      return pad(d.getFullYear() % 100, p, 2);
    }

    function formatYearISO(d, p) {
      d = dISO(d);
      return pad(d.getFullYear() % 100, p, 2);
    }

    function formatFullYear(d, p) {
      return pad(d.getFullYear() % 10000, p, 4);
    }

    function formatFullYearISO(d, p) {
      var day = d.getDay();
      d = (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
      return pad(d.getFullYear() % 10000, p, 4);
    }

    function formatZone(d) {
      var z = d.getTimezoneOffset();
      return (z > 0 ? "-" : (z *= -1, "+"))
          + pad(z / 60 | 0, "0", 2)
          + pad(z % 60, "0", 2);
    }

    function formatUTCDayOfMonth(d, p) {
      return pad(d.getUTCDate(), p, 2);
    }

    function formatUTCHour24(d, p) {
      return pad(d.getUTCHours(), p, 2);
    }

    function formatUTCHour12(d, p) {
      return pad(d.getUTCHours() % 12 || 12, p, 2);
    }

    function formatUTCDayOfYear(d, p) {
      return pad(1 + utcDay.count(utcYear(d), d), p, 3);
    }

    function formatUTCMilliseconds(d, p) {
      return pad(d.getUTCMilliseconds(), p, 3);
    }

    function formatUTCMicroseconds(d, p) {
      return formatUTCMilliseconds(d, p) + "000";
    }

    function formatUTCMonthNumber(d, p) {
      return pad(d.getUTCMonth() + 1, p, 2);
    }

    function formatUTCMinutes(d, p) {
      return pad(d.getUTCMinutes(), p, 2);
    }

    function formatUTCSeconds(d, p) {
      return pad(d.getUTCSeconds(), p, 2);
    }

    function formatUTCWeekdayNumberMonday(d) {
      var dow = d.getUTCDay();
      return dow === 0 ? 7 : dow;
    }

    function formatUTCWeekNumberSunday(d, p) {
      return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
    }

    function UTCdISO(d) {
      var day = d.getUTCDay();
      return (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
    }

    function formatUTCWeekNumberISO(d, p) {
      d = UTCdISO(d);
      return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
    }

    function formatUTCWeekdayNumberSunday(d) {
      return d.getUTCDay();
    }

    function formatUTCWeekNumberMonday(d, p) {
      return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
    }

    function formatUTCYear(d, p) {
      return pad(d.getUTCFullYear() % 100, p, 2);
    }

    function formatUTCYearISO(d, p) {
      d = UTCdISO(d);
      return pad(d.getUTCFullYear() % 100, p, 2);
    }

    function formatUTCFullYear(d, p) {
      return pad(d.getUTCFullYear() % 10000, p, 4);
    }

    function formatUTCFullYearISO(d, p) {
      var day = d.getUTCDay();
      d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
      return pad(d.getUTCFullYear() % 10000, p, 4);
    }

    function formatUTCZone() {
      return "+0000";
    }

    function formatLiteralPercent() {
      return "%";
    }

    function formatUnixTimestamp(d) {
      return +d;
    }

    function formatUnixTimestampSeconds(d) {
      return Math.floor(+d / 1000);
    }

    var locale;
    var timeFormat;
    var timeParse;

    defaultLocale({
      dateTime: "%x, %X",
      date: "%-m/%-d/%Y",
      time: "%-I:%M:%S %p",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      timeFormat = locale.format;
      timeParse = locale.parse;
      locale.utcFormat;
      locale.utcParse;
      return locale;
    }

    var defaultScales = {
    	x: linear,
    	y: linear,
    	z: linear,
    	r: sqrt
    };

    /* --------------------------------------------
     *
     * Determine whether a scale is a log, symlog, power or other
     * This is not meant to be exhaustive of all the different types of
     * scales in d3-scale and focuses on continuous scales
     *
     * --------------------------------------------
     */
    function findScaleType(scale) {
    	if (scale.constant) {
    		return 'symlog';
    	}
    	if (scale.base) {
    		return 'log';
    	}
    	if (scale.exponent) {
    		if (scale.exponent() === 0.5) {
    			return 'sqrt';
    		}
    		return 'pow';
    	}
    	return 'other';
    }

    /**
    	An identity function
    	@param {any} d The value to return.
    	@returns {any}
    */
    function identity (d) {
    	return d;
    }

    function log(sign) {
    	return x => Math.log(sign * x);
    }

    function exp(sign) {
    	return x => sign * Math.exp(x);
    }

    function symlog(c) {
    	return x => Math.sign(x) * Math.log1p(Math.abs(x / c));
    }

    function symexp(c) {
    	return x => Math.sign(x) * Math.expm1(Math.abs(x)) * c;
    }

    function pow(exponent) {
    	return function powFn(x) {
    		return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
    	};
    }

    function getPadFunctions(scale) {
    	const scaleType = findScaleType(scale);

    	if (scaleType === 'log') {
    		const sign = Math.sign(scale.domain()[0]);
    		return { lift: log(sign), ground: exp(sign), scaleType };
    	}
    	if (scaleType === 'pow') {
    		const exponent = 1;
    		return { lift: pow(exponent), ground: pow(1 / exponent), scaleType };
    	}
    	if (scaleType === 'sqrt') {
    		const exponent = 0.5;
    		return { lift: pow(exponent), ground: pow(1 / exponent), scaleType };
    	}
    	if (scaleType === 'symlog') {
    		const constant = 1;
    		return { lift: symlog(constant), ground: symexp(constant), scaleType };
    	}

    	return { lift: identity, ground: identity, scaleType };
    }

    function toTitleCase(str) {
    	return str.replace(/^\w/, d => d.toUpperCase())
    }

    function f(name, modifier = '') {
    	return `scale${toTitleCase(modifier)}${toTitleCase(name)}`;
    }

    /**
      Get a D3 scale name
    	https://svelte.dev/repl/ec6491055208401ca41120c9c8a67737?version=3.49.0
    	@param {Function} scale A D3 scale
    	@returns {String} The scale's name
     */
    function findScaleName(scale) {
    	/**
    	 * Ordinal scales
    	 */
    	// scaleBand, scalePoint
    	// @ts-ignore
    	if (typeof scale.bandwidth === 'function') {
    		// @ts-ignore
    		if (typeof scale.paddingInner === 'function') {
    			return f('band');
    		}
    		return f('point');
    	}
    	// scaleOrdinal
    	if (arraysEqual(Object.keys(scale), ['domain', 'range', 'unknown', 'copy'])) {
    		return f('ordinal');
    	}

    	/**
    	 * Sequential versus divergin
    	 */
    	let modifier = '';
    	// @ts-ignore
    	if (scale.interpolator) {
    		// @ts-ignore
    		if (scale.domain().length === 3) {
    			modifier = 'diverging';
    		} else {
    			modifier = 'sequential';
    		}
    	}

    	/**
    	 * Continuous scales
    	 */
    	// @ts-ignore
    	if (scale.quantiles) {
    		return f('quantile', modifier);
    	}
    	// @ts-ignore
    	if (scale.thresholds) {
    		return f('quantize', modifier);
    	}
    	// @ts-ignore
    	if (scale.constant) {
    		return f('symlog', modifier);
    	}
    	// @ts-ignore
    	if (scale.base) {
    		return f('log', modifier);
    	}
    	// @ts-ignore
    	if (scale.exponent) {
    		// @ts-ignore
    		if (scale.exponent() === 0.5) {
    			return f('sqrt', modifier);
    		}
    		return f('pow', modifier);
    	}

    	if (arraysEqual(Object.keys(scale), ['domain', 'range', 'invertExtent', 'unknown', 'copy'])) {
    		return f('threshold');
    	}

    	if (arraysEqual(Object.keys(scale), ['invert', 'range', 'domain', 'unknown', 'copy', 'ticks', 'tickFormat', 'nice'])) {
    		return f('identity');
    	}

    	if (
    		arraysEqual(Object.keys(scale), [
    			'invert', 'domain', 'range', 'rangeRound', 'round', 'clamp', 'unknown', 'copy', 'ticks', 'tickFormat', 'nice'
    		])
    	) {
    		return f('radial');
    	}

    	if (modifier) {
    		return f(modifier);
    	}

    	/**
    	 * Test for scaleTime vs scaleUtc
    	 * https://github.com/d3/d3-scale/pull/274#issuecomment-1462935595
    	 */
    	// @ts-ignore
    	if (scale.domain()[0] instanceof Date) {
    		const d = new Date;
    		let s;
    		// @ts-ignore
    		d.getDay = () => s = 'time';
    		// @ts-ignore
    		d.getUTCDay = () => s = 'utc';

    		// @ts-ignore
    		scale.tickFormat(0, '%a')(d);
    		return f(s);
    	}

    	return f('linear');
    }

    /**
    	Returns a modified scale domain by in/decreasing
    	the min/max by taking the desired difference
    	in pixels and converting it to units of data.
    	Returns an array that you can set as the new domain.
    	Padding contributed by @veltman.
    	See here for discussion of transforms: https://github.com/d3/d3-scale/issues/150
    	@param {Function} scale A D3 scale funcion
    	@param {Number[]} padding A two-value array of numbers specifying padding in pixels
    	@returns {Number[]} The padded domain
    */

    // These scales have a discrete range so they can't be padded
    const unpaddable = ['scaleThreshold', 'scaleQuantile', 'scaleQuantize', 'scaleSequentialQuantile'];

    function padScale (scale, padding) {
    	if (typeof scale.range !== 'function') {
    		console.log(scale);
    		throw new Error('Scale method `range` must be a function');
    	}
    	if (typeof scale.domain !== 'function') {
    		throw new Error('Scale method `domain` must be a function');
    	}

    	if (!Array.isArray(padding) || unpaddable.includes(findScaleName(scale))) {
    		return scale.domain();
    	}

    	if (isOrdinalDomain(scale) === true) {
    		return scale.domain();
    	}

    	const { lift, ground } = getPadFunctions(scale);

    	const d0 = scale.domain()[0];

    	const isTime = Object.prototype.toString.call(d0) === '[object Date]';

    	const [d1, d2] = scale.domain().map(d => {
    		return isTime ? lift(d.getTime()) : lift(d);
    	});
    	const [r1, r2] = scale.range();
    	const paddingLeft = padding[0] || 0;
    	const paddingRight = padding[1] || 0;

    	const step = (d2 - d1) / (Math.abs(r2 - r1) - paddingLeft - paddingRight); // Math.abs() to properly handle reversed scales

    	return [d1 - paddingLeft * step, paddingRight * step + d2].map(d => {
    		return isTime ? ground(new Date(d)) : ground(d);
    	});
    }

    /* eslint-disable no-nested-ternary */
    function calcBaseRange(s, width, height, reverse, percentRange) {
    	let min;
    	let max;
    	if (percentRange === true) {
    		min = 0;
    		max = 100;
    	} else {
    		min = s === 'r' ? 1 : 0;
    		max = s === 'y' ? height : s === 'r' ? 25 : width;
    	}
    	return reverse === true ? [max, min] : [min, max];
    }

    function getDefaultRange(s, width, height, reverse, range, percentRange) {
    	return !range
    		? calcBaseRange(s, width, height, reverse, percentRange)
    		: typeof range === 'function'
    			? range({ width, height })
    			: range;
    }

    function createScale (s) {
    	return function scaleCreator ([$scale, $extents, $domain, $padding, $nice, $reverse, $width, $height, $range, $percentScale]) {
    		if ($extents === null) {
    			return null;
    		}

    		const defaultRange = getDefaultRange(s, $width, $height, $reverse, $range, $percentScale);

    		const scale = $scale === defaultScales[s] ? $scale() : $scale.copy();

    		/* --------------------------------------------
    		 * Set the domain
    		 */
    		scale.domain($domain);

    		/* --------------------------------------------
    		 * Set the range of the scale to our default if
    		 * the scale doesn't have an interpolator function
    		 * or if it does, still set the range if that function
    		 * is the default identity function
    		 */
    		if (
    			!scale.interpolator ||
    			(
    				typeof scale.interpolator === 'function'
    				&& scale.interpolator().name.startsWith('identity')
    			)
    		) {
    			scale.range(defaultRange);
    		}

    		if ($padding) {
    			scale.domain(padScale(scale, $padding));
    		}

    		if ($nice === true || typeof $nice === 'number') {
    			if (typeof scale.nice === 'function') {
    				scale.nice(typeof $nice === 'number' ? $nice : undefined);
    			} else {
    				console.error(`[Layer Cake] You set \`${s}Nice: true\` but the ${s}Scale does not have a \`.nice\` method. Ignoring...`);
    			}
    		}

    		return scale;
    	};
    }

    function createGetter ([$acc, $scale]) {
    	return d => {
    		const val = $acc(d);
    		if (Array.isArray(val)) {
    			return val.map(v => $scale(v));
    		}
    		return $scale(val);
    	};
    }

    function getRange([$scale]) {
    	if (typeof $scale === 'function') {
    		if (typeof $scale.range === 'function') {
    			return $scale.range();
    		}
    		console.error('[LayerCake] Your scale doesn\'t have a `.range` method?');
    	}
    	return null;
    }

    const indent = '    ';

    function getRgb(clr){
    	const { r, g, b, opacity: o } = rgb$1(clr);
    	if (![r, g, b].every(c => c >= 0 && c <= 255)) {
    		return false;
    	}
    	return { r, g, b, o };
    }

    /**
     * Calculate human-perceived lightness from RGB
     * This doesn't take opacity into account
     * https://stackoverflow.com/a/596243
     */
    function contrast({ r, g, b }) {
    	const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    	return luminance > 0.6 ? 'black' : 'white';
    }

    /* --------------------------------------------
     *
     * Print out the values of an object
     * --------------------------------------------
     */
    function printDebug(obj) {
    	console.log('/********* LayerCake Debug ************/');
    	console.log('Bounding box:');
    	printObject(obj.boundingBox);
    	console.log('Data:');
    	console.log(indent, obj.data);
    	console.log('flatData:');
    	console.log(indent, obj.flatData);
    	console.log('Scales:\n');
    	Object.keys(obj.activeGetters).forEach(g => {
    		printScale(g, obj[`${g}Scale`], obj[g]);
    	});
    	console.log('/************ End LayerCake Debug ***************/\n');
    }

    function printObject(obj) {
    	Object.entries(obj).forEach(([key, value]) => {
    		console.log(`${indent}${key}:`, value);
    	});
    }

    function printScale(s, scale, acc) {
    	const scaleName = findScaleName(scale);
    	console.log(`${indent}${s}:`);
    	console.log(`${indent}${indent}Accessor: "${acc.toString()}"`);
    	console.log(`${indent}${indent}Type: ${scaleName}`);
    	printValues(scale, 'domain');
    	printValues(scale, 'range', ' ');
    }

    function printValues(scale, method, extraSpace = '') {
    	const values = scale[method]();
    	const colorValues = colorizeArray(values);
    	if (colorValues) {
    		printColorArray(colorValues, method, values);
    	} else {
    		console.log(`${indent}${indent}${toTitleCase(method)}:${extraSpace}`, values);
    	}
    }

    function printColorArray(colorValues, method, values) {
    	console.log(
    		`${indent}${indent}${toTitleCase(method)}:    %cArray%c(${values.length}) ` + colorValues[0] + '%c ]',
    		'color: #1377e4',
    		'color: #737373',
    		'color: #1478e4',
    		...colorValues[1],
    		'color: #1478e4'
    	);
    }
    function colorizeArray(arr) {
    	const colors = [];
    	const a = arr.map((d, i) => {
    		const rgbo = getRgb(d);
    		if (rgbo !== false) {
    			colors.push(rgbo);
    			// Add a space to the last item
    			const space = i === arr.length - 1 ? ' ' : '';
    			return `%c ${d}${space}`;
    		}
    		return d;
    	});
    	if (colors.length) {
    		return [
    			`%c[ ${a.join(', ')}`,
    			colors.map(
    				d => `background-color: rgba(${d.r}, ${d.g}, ${d.b}, ${d.o}); color:${contrast(d)};`
    			)
    		];
    	}
    	return null;
    }

    /* node_modules/layercake/dist/LayerCake.svelte generated by Svelte v3.59.2 */

    function add_css$a(target) {
    	append_styles(target, "svelte-vhzpsp", ".layercake-container.svelte-vhzpsp,.layercake-container.svelte-vhzpsp *{box-sizing:border-box}.layercake-container.svelte-vhzpsp{width:100%;height:100%}");
    }

    const get_default_slot_changes$3 = dirty => ({
    	element: dirty[0] & /*element*/ 4,
    	width: dirty[1] & /*$width_d*/ 8,
    	height: dirty[1] & /*$height_d*/ 16,
    	aspectRatio: dirty[1] & /*$aspectRatio_d*/ 32,
    	containerWidth: dirty[1] & /*$_containerWidth*/ 2,
    	containerHeight: dirty[1] & /*$_containerHeight*/ 1,
    	activeGetters: dirty[0] & /*$activeGetters_d*/ 1024,
    	percentRange: dirty[1] & /*$_percentRange*/ 4,
    	x: dirty[0] & /*$_x*/ 1073741824,
    	y: dirty[0] & /*$_y*/ 536870912,
    	z: dirty[0] & /*$_z*/ 268435456,
    	r: dirty[0] & /*$_r*/ 134217728,
    	custom: dirty[0] & /*$_custom*/ 16384,
    	data: dirty[0] & /*$_data*/ 4096,
    	xNice: dirty[0] & /*$_xNice*/ 67108864,
    	yNice: dirty[0] & /*$_yNice*/ 33554432,
    	zNice: dirty[0] & /*$_zNice*/ 16777216,
    	rNice: dirty[0] & /*$_rNice*/ 8388608,
    	xDomainSort: dirty[1] & /*$_xDomainSort*/ 64,
    	yDomainSort: dirty[1] & /*$_yDomainSort*/ 128,
    	zDomainSort: dirty[1] & /*$_zDomainSort*/ 256,
    	rDomainSort: dirty[1] & /*$_rDomainSort*/ 512,
    	xReverse: dirty[0] & /*$_xReverse*/ 4194304,
    	yReverse: dirty[0] & /*$_yReverse*/ 2097152,
    	zReverse: dirty[0] & /*$_zReverse*/ 1048576,
    	rReverse: dirty[0] & /*$_rReverse*/ 524288,
    	xPadding: dirty[0] & /*$_xPadding*/ 262144,
    	yPadding: dirty[0] & /*$_yPadding*/ 131072,
    	zPadding: dirty[0] & /*$_zPadding*/ 65536,
    	rPadding: dirty[0] & /*$_rPadding*/ 32768,
    	padding: dirty[1] & /*$padding_d*/ 1024,
    	flatData: dirty[0] & /*$_flatData*/ 2048,
    	extents: dirty[1] & /*$extents_d*/ 2048,
    	xDomain: dirty[1] & /*$xDomain_d*/ 4096,
    	yDomain: dirty[1] & /*$yDomain_d*/ 8192,
    	zDomain: dirty[1] & /*$zDomain_d*/ 16384,
    	rDomain: dirty[1] & /*$rDomain_d*/ 32768,
    	xRange: dirty[1] & /*$xRange_d*/ 65536,
    	yRange: dirty[1] & /*$yRange_d*/ 131072,
    	zRange: dirty[1] & /*$zRange_d*/ 262144,
    	rRange: dirty[1] & /*$rRange_d*/ 524288,
    	config: dirty[0] & /*$_config*/ 8192,
    	xScale: dirty[0] & /*$xScale_d*/ 512,
    	xGet: dirty[1] & /*$xGet_d*/ 1048576,
    	yScale: dirty[0] & /*$yScale_d*/ 256,
    	yGet: dirty[1] & /*$yGet_d*/ 2097152,
    	zScale: dirty[0] & /*$zScale_d*/ 128,
    	zGet: dirty[1] & /*$zGet_d*/ 4194304,
    	rScale: dirty[0] & /*$rScale_d*/ 64,
    	rGet: dirty[1] & /*$rGet_d*/ 8388608
    });

    const get_default_slot_context$3 = ctx => ({
    	element: /*element*/ ctx[2],
    	width: /*$width_d*/ ctx[34],
    	height: /*$height_d*/ ctx[35],
    	aspectRatio: /*$aspectRatio_d*/ ctx[36],
    	containerWidth: /*$_containerWidth*/ ctx[32],
    	containerHeight: /*$_containerHeight*/ ctx[31],
    	activeGetters: /*$activeGetters_d*/ ctx[10],
    	percentRange: /*$_percentRange*/ ctx[33],
    	x: /*$_x*/ ctx[30],
    	y: /*$_y*/ ctx[29],
    	z: /*$_z*/ ctx[28],
    	r: /*$_r*/ ctx[27],
    	custom: /*$_custom*/ ctx[14],
    	data: /*$_data*/ ctx[12],
    	xNice: /*$_xNice*/ ctx[26],
    	yNice: /*$_yNice*/ ctx[25],
    	zNice: /*$_zNice*/ ctx[24],
    	rNice: /*$_rNice*/ ctx[23],
    	xDomainSort: /*$_xDomainSort*/ ctx[37],
    	yDomainSort: /*$_yDomainSort*/ ctx[38],
    	zDomainSort: /*$_zDomainSort*/ ctx[39],
    	rDomainSort: /*$_rDomainSort*/ ctx[40],
    	xReverse: /*$_xReverse*/ ctx[22],
    	yReverse: /*$_yReverse*/ ctx[21],
    	zReverse: /*$_zReverse*/ ctx[20],
    	rReverse: /*$_rReverse*/ ctx[19],
    	xPadding: /*$_xPadding*/ ctx[18],
    	yPadding: /*$_yPadding*/ ctx[17],
    	zPadding: /*$_zPadding*/ ctx[16],
    	rPadding: /*$_rPadding*/ ctx[15],
    	padding: /*$padding_d*/ ctx[41],
    	flatData: /*$_flatData*/ ctx[11],
    	extents: /*$extents_d*/ ctx[42],
    	xDomain: /*$xDomain_d*/ ctx[43],
    	yDomain: /*$yDomain_d*/ ctx[44],
    	zDomain: /*$zDomain_d*/ ctx[45],
    	rDomain: /*$rDomain_d*/ ctx[46],
    	xRange: /*$xRange_d*/ ctx[47],
    	yRange: /*$yRange_d*/ ctx[48],
    	zRange: /*$zRange_d*/ ctx[49],
    	rRange: /*$rRange_d*/ ctx[50],
    	config: /*$_config*/ ctx[13],
    	xScale: /*$xScale_d*/ ctx[9],
    	xGet: /*$xGet_d*/ ctx[51],
    	yScale: /*$yScale_d*/ ctx[8],
    	yGet: /*$yGet_d*/ ctx[52],
    	zScale: /*$zScale_d*/ ctx[7],
    	zGet: /*$zGet_d*/ ctx[53],
    	rScale: /*$rScale_d*/ ctx[6],
    	rGet: /*$rGet_d*/ ctx[54]
    });

    // (496:0) {#if ssr === true || typeof window !== 'undefined'}
    function create_if_block$6(ctx) {
    	let div;
    	let div_resize_listener;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[165].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[164], get_default_slot_context$3);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "layercake-container svelte-vhzpsp");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[167].call(div));
    			set_style(div, "position", /*position*/ ctx[5]);
    			set_style(div, "top", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			set_style(div, "right", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			set_style(div, "bottom", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			set_style(div, "left", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			set_style(div, "pointer-events", /*pointerEvents*/ ctx[4] === false ? 'none' : null);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[166](div);
    			div_resize_listener = add_iframe_resize_listener(div, /*div_elementresize_handler*/ ctx[167].bind(div));
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*element, $activeGetters_d, $_x, $_y, $_z, $_r, $_custom, $_data, $_xNice, $_yNice, $_zNice, $_rNice, $_xReverse, $_yReverse, $_zReverse, $_rReverse, $_xPadding, $_yPadding, $_zPadding, $_rPadding, $_flatData, $_config, $xScale_d, $yScale_d, $zScale_d, $rScale_d*/ 2147483588 | dirty[1] & /*$width_d, $height_d, $aspectRatio_d, $_containerWidth, $_containerHeight, $_percentRange, $_xDomainSort, $_yDomainSort, $_zDomainSort, $_rDomainSort, $padding_d, $extents_d, $xDomain_d, $yDomain_d, $zDomain_d, $rDomain_d, $xRange_d, $yRange_d, $zRange_d, $rRange_d, $xGet_d, $yGet_d, $zGet_d, $rGet_d*/ 16777215 | dirty[5] & /*$$scope*/ 512)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[164],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[164])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[164], dirty, get_default_slot_changes$3),
    						get_default_slot_context$3
    					);
    				}
    			}

    			if (dirty[0] & /*position*/ 32) {
    				set_style(div, "position", /*position*/ ctx[5]);
    			}

    			if (dirty[0] & /*position*/ 32) {
    				set_style(div, "top", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			}

    			if (dirty[0] & /*position*/ 32) {
    				set_style(div, "right", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			}

    			if (dirty[0] & /*position*/ 32) {
    				set_style(div, "bottom", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			}

    			if (dirty[0] & /*position*/ 32) {
    				set_style(div, "left", /*position*/ ctx[5] === 'absolute' ? '0' : null);
    			}

    			if (dirty[0] & /*pointerEvents*/ 16) {
    				set_style(div, "pointer-events", /*pointerEvents*/ ctx[4] === false ? 'none' : null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[166](null);
    			div_resize_listener();
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = (/*ssr*/ ctx[3] === true || typeof window !== 'undefined') && create_if_block$6(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*ssr*/ ctx[3] === true || typeof window !== 'undefined') {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*ssr*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let yReverseValue;
    	let context;
    	let $rScale_d;
    	let $zScale_d;
    	let $yScale_d;
    	let $xScale_d;
    	let $activeGetters_d;
    	let $box_d;
    	let $_flatData;
    	let $_data;
    	let $_config;
    	let $_custom;
    	let $_rScale;
    	let $_zScale;
    	let $_yScale;
    	let $_xScale;
    	let $_rRange;
    	let $_zRange;
    	let $_yRange;
    	let $_xRange;
    	let $_rPadding;
    	let $_zPadding;
    	let $_yPadding;
    	let $_xPadding;
    	let $_rReverse;
    	let $_zReverse;
    	let $_yReverse;
    	let $_xReverse;
    	let $_rNice;
    	let $_zNice;
    	let $_yNice;
    	let $_xNice;
    	let $_rDomain;
    	let $_zDomain;
    	let $_yDomain;
    	let $_xDomain;
    	let $_r;
    	let $_z;
    	let $_y;
    	let $_x;
    	let $_padding;
    	let $_extents;
    	let $_containerHeight;
    	let $_containerWidth;
    	let $_percentRange;
    	let $width_d;
    	let $height_d;
    	let $aspectRatio_d;
    	let $_xDomainSort;
    	let $_yDomainSort;
    	let $_zDomainSort;
    	let $_rDomainSort;
    	let $padding_d;
    	let $extents_d;
    	let $xDomain_d;
    	let $yDomain_d;
    	let $zDomain_d;
    	let $rDomain_d;
    	let $xRange_d;
    	let $yRange_d;
    	let $zRange_d;
    	let $rRange_d;
    	let $xGet_d;
    	let $yGet_d;
    	let $zGet_d;
    	let $rGet_d;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const printDebug_debounced = debounce(printDebug, 200);
    	let { ssr = false } = $$props;
    	let { pointerEvents = true } = $$props;
    	let { position = 'relative' } = $$props;
    	let { percentRange = false } = $$props;
    	let { width = undefined } = $$props;
    	let { height = undefined } = $$props;
    	let { containerWidth = width || 100 } = $$props;
    	let { containerHeight = height || 100 } = $$props;
    	let { element = undefined } = $$props;
    	let { x = undefined } = $$props;
    	let { y = undefined } = $$props;
    	let { z = undefined } = $$props;
    	let { r = undefined } = $$props;
    	let { data = [] } = $$props;
    	let { xDomain = undefined } = $$props;
    	let { yDomain = undefined } = $$props;
    	let { zDomain = undefined } = $$props;
    	let { rDomain = undefined } = $$props;
    	let { xNice = false } = $$props;
    	let { yNice = false } = $$props;
    	let { zNice = false } = $$props;
    	let { rNice = false } = $$props;
    	let { xPadding = undefined } = $$props;
    	let { yPadding = undefined } = $$props;
    	let { zPadding = undefined } = $$props;
    	let { rPadding = undefined } = $$props;
    	let { xScale = defaultScales.x } = $$props;
    	let { yScale = defaultScales.y } = $$props;
    	let { zScale = defaultScales.z } = $$props;
    	let { rScale = defaultScales.r } = $$props;
    	let { xRange = undefined } = $$props;
    	let { yRange = undefined } = $$props;
    	let { zRange = undefined } = $$props;
    	let { rRange = undefined } = $$props;
    	let { xReverse = false } = $$props;
    	let { yReverse = undefined } = $$props;
    	let { zReverse = false } = $$props;
    	let { rReverse = false } = $$props;
    	let { xDomainSort = true } = $$props;
    	let { yDomainSort = true } = $$props;
    	let { zDomainSort = true } = $$props;
    	let { rDomainSort = true } = $$props;
    	let { padding = {} } = $$props;
    	let { extents = {} } = $$props;
    	let { flatData = undefined } = $$props;
    	let { custom = {} } = $$props;
    	let { debug = false } = $$props;

    	/* --------------------------------------------
     * Keep track of whether the component has mounted
     * This is used to emit warnings once we have measured
     * the container object and it doesn't have proper dimensions
     */
    	let isMounted = false;

    	onMount(() => {
    		isMounted = true;
    	});

    	/* --------------------------------------------
     * Preserve a copy of our passed in settings before we modify them
     * Return this to the user's context so they can reference things if need be
     * Add the active keys since those aren't on our settings object.
     * This is mostly an escape-hatch
     */
    	const config = {};

    	/* --------------------------------------------
     * Make store versions of each parameter
     * Prefix these with `_` to keep things organized
     */
    	const _percentRange = writable(percentRange);

    	component_subscribe($$self, _percentRange, value => $$invalidate(33, $_percentRange = value));
    	const _containerWidth = writable(containerWidth);
    	component_subscribe($$self, _containerWidth, value => $$invalidate(32, $_containerWidth = value));
    	const _containerHeight = writable(containerHeight);
    	component_subscribe($$self, _containerHeight, value => $$invalidate(31, $_containerHeight = value));
    	const _extents = writable(filterObject(extents));
    	component_subscribe($$self, _extents, value => $$invalidate(182, $_extents = value));
    	const _data = writable(data);
    	component_subscribe($$self, _data, value => $$invalidate(12, $_data = value));
    	const _flatData = writable(flatData || data);
    	component_subscribe($$self, _flatData, value => $$invalidate(11, $_flatData = value));
    	const _padding = writable(padding);
    	component_subscribe($$self, _padding, value => $$invalidate(181, $_padding = value));
    	const _x = writable(makeAccessor(x));
    	component_subscribe($$self, _x, value => $$invalidate(30, $_x = value));
    	const _y = writable(makeAccessor(y));
    	component_subscribe($$self, _y, value => $$invalidate(29, $_y = value));
    	const _z = writable(makeAccessor(z));
    	component_subscribe($$self, _z, value => $$invalidate(28, $_z = value));
    	const _r = writable(makeAccessor(r));
    	component_subscribe($$self, _r, value => $$invalidate(27, $_r = value));
    	const _xDomain = writable(xDomain);
    	component_subscribe($$self, _xDomain, value => $$invalidate(180, $_xDomain = value));
    	const _yDomain = writable(yDomain);
    	component_subscribe($$self, _yDomain, value => $$invalidate(179, $_yDomain = value));
    	const _zDomain = writable(zDomain);
    	component_subscribe($$self, _zDomain, value => $$invalidate(178, $_zDomain = value));
    	const _rDomain = writable(rDomain);
    	component_subscribe($$self, _rDomain, value => $$invalidate(177, $_rDomain = value));
    	const _xNice = writable(xNice);
    	component_subscribe($$self, _xNice, value => $$invalidate(26, $_xNice = value));
    	const _yNice = writable(yNice);
    	component_subscribe($$self, _yNice, value => $$invalidate(25, $_yNice = value));
    	const _zNice = writable(zNice);
    	component_subscribe($$self, _zNice, value => $$invalidate(24, $_zNice = value));
    	const _rNice = writable(rNice);
    	component_subscribe($$self, _rNice, value => $$invalidate(23, $_rNice = value));
    	const _xReverse = writable(xReverse);
    	component_subscribe($$self, _xReverse, value => $$invalidate(22, $_xReverse = value));
    	const _yReverse = writable(yReverseValue);
    	component_subscribe($$self, _yReverse, value => $$invalidate(21, $_yReverse = value));
    	const _zReverse = writable(zReverse);
    	component_subscribe($$self, _zReverse, value => $$invalidate(20, $_zReverse = value));
    	const _rReverse = writable(rReverse);
    	component_subscribe($$self, _rReverse, value => $$invalidate(19, $_rReverse = value));
    	const _xPadding = writable(xPadding);
    	component_subscribe($$self, _xPadding, value => $$invalidate(18, $_xPadding = value));
    	const _yPadding = writable(yPadding);
    	component_subscribe($$self, _yPadding, value => $$invalidate(17, $_yPadding = value));
    	const _zPadding = writable(zPadding);
    	component_subscribe($$self, _zPadding, value => $$invalidate(16, $_zPadding = value));
    	const _rPadding = writable(rPadding);
    	component_subscribe($$self, _rPadding, value => $$invalidate(15, $_rPadding = value));
    	const _xRange = writable(xRange);
    	component_subscribe($$self, _xRange, value => $$invalidate(176, $_xRange = value));
    	const _yRange = writable(yRange);
    	component_subscribe($$self, _yRange, value => $$invalidate(175, $_yRange = value));
    	const _zRange = writable(zRange);
    	component_subscribe($$self, _zRange, value => $$invalidate(174, $_zRange = value));
    	const _rRange = writable(rRange);
    	component_subscribe($$self, _rRange, value => $$invalidate(173, $_rRange = value));
    	const _xScale = writable(xScale);
    	component_subscribe($$self, _xScale, value => $$invalidate(172, $_xScale = value));
    	const _yScale = writable(yScale);
    	component_subscribe($$self, _yScale, value => $$invalidate(171, $_yScale = value));
    	const _zScale = writable(zScale);
    	component_subscribe($$self, _zScale, value => $$invalidate(170, $_zScale = value));
    	const _rScale = writable(rScale);
    	component_subscribe($$self, _rScale, value => $$invalidate(169, $_rScale = value));
    	const _xDomainSort = writable(xDomainSort);
    	component_subscribe($$self, _xDomainSort, value => $$invalidate(37, $_xDomainSort = value));
    	const _yDomainSort = writable(yDomainSort);
    	component_subscribe($$self, _yDomainSort, value => $$invalidate(38, $_yDomainSort = value));
    	const _zDomainSort = writable(zDomainSort);
    	component_subscribe($$self, _zDomainSort, value => $$invalidate(39, $_zDomainSort = value));
    	const _rDomainSort = writable(rDomainSort);
    	component_subscribe($$self, _rDomainSort, value => $$invalidate(40, $_rDomainSort = value));
    	const _config = writable(config);
    	component_subscribe($$self, _config, value => $$invalidate(13, $_config = value));
    	const _custom = writable(custom);
    	component_subscribe($$self, _custom, value => $$invalidate(14, $_custom = value));

    	/* --------------------------------------------
     * Create derived values
     * Suffix these with `_d`
     */
    	const activeGetters_d = derived([_x, _y, _z, _r], ([$x, $y, $z, $r]) => {
    		const obj = {};

    		if ($x) {
    			obj.x = $x;
    		}

    		if ($y) {
    			obj.y = $y;
    		}

    		if ($z) {
    			obj.z = $z;
    		}

    		if ($r) {
    			obj.r = $r;
    		}

    		return obj;
    	});

    	component_subscribe($$self, activeGetters_d, value => $$invalidate(10, $activeGetters_d = value));

    	const padding_d = derived([_padding, _containerWidth, _containerHeight], ([$padding]) => {
    		const defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };
    		return Object.assign(defaultPadding, $padding);
    	});

    	component_subscribe($$self, padding_d, value => $$invalidate(41, $padding_d = value));

    	const box_d = derived([_containerWidth, _containerHeight, padding_d], ([$containerWidth, $containerHeight, $padding]) => {
    		const b = {};
    		b.top = $padding.top;
    		b.right = $containerWidth - $padding.right;
    		b.bottom = $containerHeight - $padding.bottom;
    		b.left = $padding.left;
    		b.width = b.right - b.left;
    		b.height = b.bottom - b.top;

    		if (b.width <= 0 && isMounted === true) {
    			console.warn('[LayerCake] Target div has zero or negative width. Did you forget to set an explicit width in CSS on the container?');
    		}

    		if (b.height <= 0 && isMounted === true) {
    			console.warn('[LayerCake] Target div has zero or negative height. Did you forget to set an explicit height in CSS on the container?');
    		}

    		return b;
    	});

    	component_subscribe($$self, box_d, value => $$invalidate(163, $box_d = value));

    	const width_d = derived([box_d], ([$box]) => {
    		return $box.width;
    	});

    	component_subscribe($$self, width_d, value => $$invalidate(34, $width_d = value));

    	const height_d = derived([box_d], ([$box]) => {
    		return $box.height;
    	});

    	component_subscribe($$self, height_d, value => $$invalidate(35, $height_d = value));

    	/* --------------------------------------------
     * Calculate extents by taking the extent of the data
     * and filling that in with anything set by the user
     * Note that this is different from an "extent" passed
     * in as a domain, which can be a partial domain
     */
    	const extents_d = derived(
    		[
    			_flatData,
    			activeGetters_d,
    			_extents,
    			_xScale,
    			_yScale,
    			_rScale,
    			_zScale,
    			_xDomainSort,
    			_yDomainSort,
    			_zDomainSort,
    			_rDomainSort
    		],
    		([
    				$flatData,
    				$activeGetters,
    				$extents,
    				$_xScale,
    				$_yScale,
    				$_rScale,
    				$_zScale,
    				$_xDomainSort,
    				$_yDomainSort,
    				$_zDomainSort,
    				$_rDomainSort
    			]) => {
    			const scaleLookup = {
    				x: { scale: $_xScale, sort: $_xDomainSort },
    				y: { scale: $_yScale, sort: $_yDomainSort },
    				r: { scale: $_rScale, sort: $_rDomainSort },
    				z: { scale: $_zScale, sort: $_zDomainSort }
    			};

    			const getters = filterObject($activeGetters, $extents);
    			const activeScales = Object.fromEntries(Object.keys(getters).map(k => [k, scaleLookup[k]]));

    			if (Object.keys(getters).length > 0) {
    				const calculatedExtents = calcScaleExtents($flatData, getters, activeScales);
    				return { ...calculatedExtents, ...$extents };
    			} else {
    				return {};
    			}
    		}
    	);

    	component_subscribe($$self, extents_d, value => $$invalidate(42, $extents_d = value));
    	const xDomain_d = derived([extents_d, _xDomain], calcDomain('x'));
    	component_subscribe($$self, xDomain_d, value => $$invalidate(43, $xDomain_d = value));
    	const yDomain_d = derived([extents_d, _yDomain], calcDomain('y'));
    	component_subscribe($$self, yDomain_d, value => $$invalidate(44, $yDomain_d = value));
    	const zDomain_d = derived([extents_d, _zDomain], calcDomain('z'));
    	component_subscribe($$self, zDomain_d, value => $$invalidate(45, $zDomain_d = value));
    	const rDomain_d = derived([extents_d, _rDomain], calcDomain('r'));
    	component_subscribe($$self, rDomain_d, value => $$invalidate(46, $rDomain_d = value));

    	const xScale_d = derived(
    		[
    			_xScale,
    			extents_d,
    			xDomain_d,
    			_xPadding,
    			_xNice,
    			_xReverse,
    			width_d,
    			height_d,
    			_xRange,
    			_percentRange
    		],
    		createScale('x')
    	);

    	component_subscribe($$self, xScale_d, value => $$invalidate(9, $xScale_d = value));
    	const xGet_d = derived([_x, xScale_d], createGetter);
    	component_subscribe($$self, xGet_d, value => $$invalidate(51, $xGet_d = value));

    	const yScale_d = derived(
    		[
    			_yScale,
    			extents_d,
    			yDomain_d,
    			_yPadding,
    			_yNice,
    			_yReverse,
    			width_d,
    			height_d,
    			_yRange,
    			_percentRange
    		],
    		createScale('y')
    	);

    	component_subscribe($$self, yScale_d, value => $$invalidate(8, $yScale_d = value));
    	const yGet_d = derived([_y, yScale_d], createGetter);
    	component_subscribe($$self, yGet_d, value => $$invalidate(52, $yGet_d = value));

    	const zScale_d = derived(
    		[
    			_zScale,
    			extents_d,
    			zDomain_d,
    			_zPadding,
    			_zNice,
    			_zReverse,
    			width_d,
    			height_d,
    			_zRange,
    			_percentRange
    		],
    		createScale('z')
    	);

    	component_subscribe($$self, zScale_d, value => $$invalidate(7, $zScale_d = value));
    	const zGet_d = derived([_z, zScale_d], createGetter);
    	component_subscribe($$self, zGet_d, value => $$invalidate(53, $zGet_d = value));

    	const rScale_d = derived(
    		[
    			_rScale,
    			extents_d,
    			rDomain_d,
    			_rPadding,
    			_rNice,
    			_rReverse,
    			width_d,
    			height_d,
    			_rRange,
    			_percentRange
    		],
    		createScale('r')
    	);

    	component_subscribe($$self, rScale_d, value => $$invalidate(6, $rScale_d = value));
    	const rGet_d = derived([_r, rScale_d], createGetter);
    	component_subscribe($$self, rGet_d, value => $$invalidate(54, $rGet_d = value));
    	const xRange_d = derived([xScale_d], getRange);
    	component_subscribe($$self, xRange_d, value => $$invalidate(47, $xRange_d = value));
    	const yRange_d = derived([yScale_d], getRange);
    	component_subscribe($$self, yRange_d, value => $$invalidate(48, $yRange_d = value));
    	const zRange_d = derived([zScale_d], getRange);
    	component_subscribe($$self, zRange_d, value => $$invalidate(49, $zRange_d = value));
    	const rRange_d = derived([rScale_d], getRange);
    	component_subscribe($$self, rRange_d, value => $$invalidate(50, $rRange_d = value));

    	const aspectRatio_d = derived([width_d, height_d], ([$width, $height]) => {
    		return $width / $height;
    	});

    	component_subscribe($$self, aspectRatio_d, value => $$invalidate(36, $aspectRatio_d = value));

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			element = $$value;
    			$$invalidate(2, element);
    		});
    	}

    	function div_elementresize_handler() {
    		containerWidth = this.clientWidth;
    		containerHeight = this.clientHeight;
    		$$invalidate(0, containerWidth);
    		$$invalidate(1, containerHeight);
    	}

    	$$self.$$set = $$props => {
    		if ('ssr' in $$props) $$invalidate(3, ssr = $$props.ssr);
    		if ('pointerEvents' in $$props) $$invalidate(4, pointerEvents = $$props.pointerEvents);
    		if ('position' in $$props) $$invalidate(5, position = $$props.position);
    		if ('percentRange' in $$props) $$invalidate(119, percentRange = $$props.percentRange);
    		if ('width' in $$props) $$invalidate(120, width = $$props.width);
    		if ('height' in $$props) $$invalidate(121, height = $$props.height);
    		if ('containerWidth' in $$props) $$invalidate(0, containerWidth = $$props.containerWidth);
    		if ('containerHeight' in $$props) $$invalidate(1, containerHeight = $$props.containerHeight);
    		if ('element' in $$props) $$invalidate(2, element = $$props.element);
    		if ('x' in $$props) $$invalidate(122, x = $$props.x);
    		if ('y' in $$props) $$invalidate(123, y = $$props.y);
    		if ('z' in $$props) $$invalidate(124, z = $$props.z);
    		if ('r' in $$props) $$invalidate(125, r = $$props.r);
    		if ('data' in $$props) $$invalidate(126, data = $$props.data);
    		if ('xDomain' in $$props) $$invalidate(127, xDomain = $$props.xDomain);
    		if ('yDomain' in $$props) $$invalidate(128, yDomain = $$props.yDomain);
    		if ('zDomain' in $$props) $$invalidate(129, zDomain = $$props.zDomain);
    		if ('rDomain' in $$props) $$invalidate(130, rDomain = $$props.rDomain);
    		if ('xNice' in $$props) $$invalidate(131, xNice = $$props.xNice);
    		if ('yNice' in $$props) $$invalidate(132, yNice = $$props.yNice);
    		if ('zNice' in $$props) $$invalidate(133, zNice = $$props.zNice);
    		if ('rNice' in $$props) $$invalidate(134, rNice = $$props.rNice);
    		if ('xPadding' in $$props) $$invalidate(135, xPadding = $$props.xPadding);
    		if ('yPadding' in $$props) $$invalidate(136, yPadding = $$props.yPadding);
    		if ('zPadding' in $$props) $$invalidate(137, zPadding = $$props.zPadding);
    		if ('rPadding' in $$props) $$invalidate(138, rPadding = $$props.rPadding);
    		if ('xScale' in $$props) $$invalidate(139, xScale = $$props.xScale);
    		if ('yScale' in $$props) $$invalidate(140, yScale = $$props.yScale);
    		if ('zScale' in $$props) $$invalidate(141, zScale = $$props.zScale);
    		if ('rScale' in $$props) $$invalidate(142, rScale = $$props.rScale);
    		if ('xRange' in $$props) $$invalidate(143, xRange = $$props.xRange);
    		if ('yRange' in $$props) $$invalidate(144, yRange = $$props.yRange);
    		if ('zRange' in $$props) $$invalidate(145, zRange = $$props.zRange);
    		if ('rRange' in $$props) $$invalidate(146, rRange = $$props.rRange);
    		if ('xReverse' in $$props) $$invalidate(147, xReverse = $$props.xReverse);
    		if ('yReverse' in $$props) $$invalidate(148, yReverse = $$props.yReverse);
    		if ('zReverse' in $$props) $$invalidate(149, zReverse = $$props.zReverse);
    		if ('rReverse' in $$props) $$invalidate(150, rReverse = $$props.rReverse);
    		if ('xDomainSort' in $$props) $$invalidate(151, xDomainSort = $$props.xDomainSort);
    		if ('yDomainSort' in $$props) $$invalidate(152, yDomainSort = $$props.yDomainSort);
    		if ('zDomainSort' in $$props) $$invalidate(153, zDomainSort = $$props.zDomainSort);
    		if ('rDomainSort' in $$props) $$invalidate(154, rDomainSort = $$props.rDomainSort);
    		if ('padding' in $$props) $$invalidate(155, padding = $$props.padding);
    		if ('extents' in $$props) $$invalidate(156, extents = $$props.extents);
    		if ('flatData' in $$props) $$invalidate(157, flatData = $$props.flatData);
    		if ('custom' in $$props) $$invalidate(158, custom = $$props.custom);
    		if ('debug' in $$props) $$invalidate(159, debug = $$props.debug);
    		if ('$$scope' in $$props) $$invalidate(164, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[4] & /*yReverse, yScale*/ 16842752) {
    			/**
     * Make this reactive
     */
    			$$invalidate(162, yReverseValue = typeof yReverse === 'undefined'
    			? typeof yScale.bandwidth === 'function' ? false : true
    			: yReverse);
    		}

    		if ($$self.$$.dirty[3] & /*x*/ 536870912) {
    			if (x) $$invalidate(160, config.x = x, config);
    		}

    		if ($$self.$$.dirty[3] & /*y*/ 1073741824) {
    			if (y) $$invalidate(160, config.y = y, config);
    		}

    		if ($$self.$$.dirty[4] & /*z*/ 1) {
    			if (z) $$invalidate(160, config.z = z, config);
    		}

    		if ($$self.$$.dirty[4] & /*r*/ 2) {
    			if (r) $$invalidate(160, config.r = r, config);
    		}

    		if ($$self.$$.dirty[4] & /*xDomain*/ 8) {
    			if (xDomain) $$invalidate(160, config.xDomain = xDomain, config);
    		}

    		if ($$self.$$.dirty[4] & /*yDomain*/ 16) {
    			if (yDomain) $$invalidate(160, config.yDomain = yDomain, config);
    		}

    		if ($$self.$$.dirty[4] & /*zDomain*/ 32) {
    			if (zDomain) $$invalidate(160, config.zDomain = zDomain, config);
    		}

    		if ($$self.$$.dirty[4] & /*rDomain*/ 64) {
    			if (rDomain) $$invalidate(160, config.rDomain = rDomain, config);
    		}

    		if ($$self.$$.dirty[4] & /*xRange*/ 524288) {
    			if (xRange) $$invalidate(160, config.xRange = xRange, config);
    		}

    		if ($$self.$$.dirty[4] & /*yRange*/ 1048576) {
    			if (yRange) $$invalidate(160, config.yRange = yRange, config);
    		}

    		if ($$self.$$.dirty[4] & /*zRange*/ 2097152) {
    			if (zRange) $$invalidate(160, config.zRange = zRange, config);
    		}

    		if ($$self.$$.dirty[4] & /*rRange*/ 4194304) {
    			if (rRange) $$invalidate(160, config.rRange = rRange, config);
    		}

    		if ($$self.$$.dirty[3] & /*percentRange*/ 67108864) {
    			set_store_value(_percentRange, $_percentRange = percentRange, $_percentRange);
    		}

    		if ($$self.$$.dirty[0] & /*containerWidth*/ 1) {
    			set_store_value(_containerWidth, $_containerWidth = containerWidth, $_containerWidth);
    		}

    		if ($$self.$$.dirty[0] & /*containerHeight*/ 2) {
    			set_store_value(_containerHeight, $_containerHeight = containerHeight, $_containerHeight);
    		}

    		if ($$self.$$.dirty[5] & /*extents*/ 2) {
    			set_store_value(_extents, $_extents = filterObject(extents), $_extents);
    		}

    		if ($$self.$$.dirty[4] & /*data*/ 4) {
    			set_store_value(_data, $_data = data, $_data);
    		}

    		if ($$self.$$.dirty[4] & /*data*/ 4 | $$self.$$.dirty[5] & /*flatData*/ 4) {
    			set_store_value(_flatData, $_flatData = flatData || data, $_flatData);
    		}

    		if ($$self.$$.dirty[5] & /*padding*/ 1) {
    			set_store_value(_padding, $_padding = padding, $_padding);
    		}

    		if ($$self.$$.dirty[3] & /*x*/ 536870912) {
    			set_store_value(_x, $_x = makeAccessor(x), $_x);
    		}

    		if ($$self.$$.dirty[3] & /*y*/ 1073741824) {
    			set_store_value(_y, $_y = makeAccessor(y), $_y);
    		}

    		if ($$self.$$.dirty[4] & /*z*/ 1) {
    			set_store_value(_z, $_z = makeAccessor(z), $_z);
    		}

    		if ($$self.$$.dirty[4] & /*r*/ 2) {
    			set_store_value(_r, $_r = makeAccessor(r), $_r);
    		}

    		if ($$self.$$.dirty[4] & /*xDomain*/ 8) {
    			set_store_value(_xDomain, $_xDomain = xDomain, $_xDomain);
    		}

    		if ($$self.$$.dirty[4] & /*yDomain*/ 16) {
    			set_store_value(_yDomain, $_yDomain = yDomain, $_yDomain);
    		}

    		if ($$self.$$.dirty[4] & /*zDomain*/ 32) {
    			set_store_value(_zDomain, $_zDomain = zDomain, $_zDomain);
    		}

    		if ($$self.$$.dirty[4] & /*rDomain*/ 64) {
    			set_store_value(_rDomain, $_rDomain = rDomain, $_rDomain);
    		}

    		if ($$self.$$.dirty[4] & /*xNice*/ 128) {
    			set_store_value(_xNice, $_xNice = xNice, $_xNice);
    		}

    		if ($$self.$$.dirty[4] & /*yNice*/ 256) {
    			set_store_value(_yNice, $_yNice = yNice, $_yNice);
    		}

    		if ($$self.$$.dirty[4] & /*zNice*/ 512) {
    			set_store_value(_zNice, $_zNice = zNice, $_zNice);
    		}

    		if ($$self.$$.dirty[4] & /*rNice*/ 1024) {
    			set_store_value(_rNice, $_rNice = rNice, $_rNice);
    		}

    		if ($$self.$$.dirty[4] & /*xReverse*/ 8388608) {
    			set_store_value(_xReverse, $_xReverse = xReverse, $_xReverse);
    		}

    		if ($$self.$$.dirty[5] & /*yReverseValue*/ 128) {
    			set_store_value(_yReverse, $_yReverse = yReverseValue, $_yReverse);
    		}

    		if ($$self.$$.dirty[4] & /*zReverse*/ 33554432) {
    			set_store_value(_zReverse, $_zReverse = zReverse, $_zReverse);
    		}

    		if ($$self.$$.dirty[4] & /*rReverse*/ 67108864) {
    			set_store_value(_rReverse, $_rReverse = rReverse, $_rReverse);
    		}

    		if ($$self.$$.dirty[4] & /*xPadding*/ 2048) {
    			set_store_value(_xPadding, $_xPadding = xPadding, $_xPadding);
    		}

    		if ($$self.$$.dirty[4] & /*yPadding*/ 4096) {
    			set_store_value(_yPadding, $_yPadding = yPadding, $_yPadding);
    		}

    		if ($$self.$$.dirty[4] & /*zPadding*/ 8192) {
    			set_store_value(_zPadding, $_zPadding = zPadding, $_zPadding);
    		}

    		if ($$self.$$.dirty[4] & /*rPadding*/ 16384) {
    			set_store_value(_rPadding, $_rPadding = rPadding, $_rPadding);
    		}

    		if ($$self.$$.dirty[4] & /*xRange*/ 524288) {
    			set_store_value(_xRange, $_xRange = xRange, $_xRange);
    		}

    		if ($$self.$$.dirty[4] & /*yRange*/ 1048576) {
    			set_store_value(_yRange, $_yRange = yRange, $_yRange);
    		}

    		if ($$self.$$.dirty[4] & /*zRange*/ 2097152) {
    			set_store_value(_zRange, $_zRange = zRange, $_zRange);
    		}

    		if ($$self.$$.dirty[4] & /*rRange*/ 4194304) {
    			set_store_value(_rRange, $_rRange = rRange, $_rRange);
    		}

    		if ($$self.$$.dirty[4] & /*xScale*/ 32768) {
    			set_store_value(_xScale, $_xScale = xScale, $_xScale);
    		}

    		if ($$self.$$.dirty[4] & /*yScale*/ 65536) {
    			set_store_value(_yScale, $_yScale = yScale, $_yScale);
    		}

    		if ($$self.$$.dirty[4] & /*zScale*/ 131072) {
    			set_store_value(_zScale, $_zScale = zScale, $_zScale);
    		}

    		if ($$self.$$.dirty[4] & /*rScale*/ 262144) {
    			set_store_value(_rScale, $_rScale = rScale, $_rScale);
    		}

    		if ($$self.$$.dirty[5] & /*custom*/ 8) {
    			set_store_value(_custom, $_custom = custom, $_custom);
    		}

    		if ($$self.$$.dirty[5] & /*config*/ 32) {
    			set_store_value(_config, $_config = config, $_config);
    		}

    		if ($$self.$$.dirty[5] & /*context*/ 64) {
    			setContext('LayerCake', context);
    		}

    		if ($$self.$$.dirty[0] & /*ssr, $_data, $_flatData, $activeGetters_d, $xScale_d, $yScale_d, $zScale_d, $rScale_d*/ 8136 | $$self.$$.dirty[5] & /*$box_d, debug, flatData, config*/ 308) {
    			if ($box_d && debug === true && (ssr === true || typeof window !== 'undefined')) {
    				// Call this as a debounce so that it doesn't get called multiple times as these vars get filled in
    				printDebug_debounced({
    					data: $_data,
    					flatData: typeof flatData !== 'undefined' ? $_flatData : null,
    					boundingBox: $box_d,
    					activeGetters: $activeGetters_d,
    					x: config.x,
    					y: config.y,
    					z: config.z,
    					r: config.r,
    					xScale: $xScale_d,
    					yScale: $yScale_d,
    					zScale: $zScale_d,
    					rScale: $rScale_d
    				});
    			}
    		}
    	};

    	$$invalidate(161, context = {
    		activeGetters: activeGetters_d,
    		width: width_d,
    		height: height_d,
    		percentRange: _percentRange,
    		aspectRatio: aspectRatio_d,
    		containerWidth: _containerWidth,
    		containerHeight: _containerHeight,
    		x: _x,
    		y: _y,
    		z: _z,
    		r: _r,
    		custom: _custom,
    		data: _data,
    		xNice: _xNice,
    		yNice: _yNice,
    		zNice: _zNice,
    		rNice: _rNice,
    		xDomainSort: _xDomainSort,
    		yDomainSort: _yDomainSort,
    		zDomainSort: _zDomainSort,
    		rDomainSort: _rDomainSort,
    		xReverse: _xReverse,
    		yReverse: _yReverse,
    		zReverse: _zReverse,
    		rReverse: _rReverse,
    		xPadding: _xPadding,
    		yPadding: _yPadding,
    		zPadding: _zPadding,
    		rPadding: _rPadding,
    		padding: padding_d,
    		flatData: _flatData,
    		extents: extents_d,
    		xDomain: xDomain_d,
    		yDomain: yDomain_d,
    		zDomain: zDomain_d,
    		rDomain: rDomain_d,
    		xRange: xRange_d,
    		yRange: yRange_d,
    		zRange: zRange_d,
    		rRange: rRange_d,
    		config: _config,
    		xScale: xScale_d,
    		xGet: xGet_d,
    		yScale: yScale_d,
    		yGet: yGet_d,
    		zScale: zScale_d,
    		zGet: zGet_d,
    		rScale: rScale_d,
    		rGet: rGet_d
    	});

    	return [
    		containerWidth,
    		containerHeight,
    		element,
    		ssr,
    		pointerEvents,
    		position,
    		$rScale_d,
    		$zScale_d,
    		$yScale_d,
    		$xScale_d,
    		$activeGetters_d,
    		$_flatData,
    		$_data,
    		$_config,
    		$_custom,
    		$_rPadding,
    		$_zPadding,
    		$_yPadding,
    		$_xPadding,
    		$_rReverse,
    		$_zReverse,
    		$_yReverse,
    		$_xReverse,
    		$_rNice,
    		$_zNice,
    		$_yNice,
    		$_xNice,
    		$_r,
    		$_z,
    		$_y,
    		$_x,
    		$_containerHeight,
    		$_containerWidth,
    		$_percentRange,
    		$width_d,
    		$height_d,
    		$aspectRatio_d,
    		$_xDomainSort,
    		$_yDomainSort,
    		$_zDomainSort,
    		$_rDomainSort,
    		$padding_d,
    		$extents_d,
    		$xDomain_d,
    		$yDomain_d,
    		$zDomain_d,
    		$rDomain_d,
    		$xRange_d,
    		$yRange_d,
    		$zRange_d,
    		$rRange_d,
    		$xGet_d,
    		$yGet_d,
    		$zGet_d,
    		$rGet_d,
    		_percentRange,
    		_containerWidth,
    		_containerHeight,
    		_extents,
    		_data,
    		_flatData,
    		_padding,
    		_x,
    		_y,
    		_z,
    		_r,
    		_xDomain,
    		_yDomain,
    		_zDomain,
    		_rDomain,
    		_xNice,
    		_yNice,
    		_zNice,
    		_rNice,
    		_xReverse,
    		_yReverse,
    		_zReverse,
    		_rReverse,
    		_xPadding,
    		_yPadding,
    		_zPadding,
    		_rPadding,
    		_xRange,
    		_yRange,
    		_zRange,
    		_rRange,
    		_xScale,
    		_yScale,
    		_zScale,
    		_rScale,
    		_xDomainSort,
    		_yDomainSort,
    		_zDomainSort,
    		_rDomainSort,
    		_config,
    		_custom,
    		activeGetters_d,
    		padding_d,
    		box_d,
    		width_d,
    		height_d,
    		extents_d,
    		xDomain_d,
    		yDomain_d,
    		zDomain_d,
    		rDomain_d,
    		xScale_d,
    		xGet_d,
    		yScale_d,
    		yGet_d,
    		zScale_d,
    		zGet_d,
    		rScale_d,
    		rGet_d,
    		xRange_d,
    		yRange_d,
    		zRange_d,
    		rRange_d,
    		aspectRatio_d,
    		percentRange,
    		width,
    		height,
    		x,
    		y,
    		z,
    		r,
    		data,
    		xDomain,
    		yDomain,
    		zDomain,
    		rDomain,
    		xNice,
    		yNice,
    		zNice,
    		rNice,
    		xPadding,
    		yPadding,
    		zPadding,
    		rPadding,
    		xScale,
    		yScale,
    		zScale,
    		rScale,
    		xRange,
    		yRange,
    		zRange,
    		rRange,
    		xReverse,
    		yReverse,
    		zReverse,
    		rReverse,
    		xDomainSort,
    		yDomainSort,
    		zDomainSort,
    		rDomainSort,
    		padding,
    		extents,
    		flatData,
    		custom,
    		debug,
    		config,
    		context,
    		yReverseValue,
    		$box_d,
    		$$scope,
    		slots,
    		div_binding,
    		div_elementresize_handler
    	];
    }

    class LayerCake extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$b,
    			create_fragment$b,
    			safe_not_equal,
    			{
    				ssr: 3,
    				pointerEvents: 4,
    				position: 5,
    				percentRange: 119,
    				width: 120,
    				height: 121,
    				containerWidth: 0,
    				containerHeight: 1,
    				element: 2,
    				x: 122,
    				y: 123,
    				z: 124,
    				r: 125,
    				data: 126,
    				xDomain: 127,
    				yDomain: 128,
    				zDomain: 129,
    				rDomain: 130,
    				xNice: 131,
    				yNice: 132,
    				zNice: 133,
    				rNice: 134,
    				xPadding: 135,
    				yPadding: 136,
    				zPadding: 137,
    				rPadding: 138,
    				xScale: 139,
    				yScale: 140,
    				zScale: 141,
    				rScale: 142,
    				xRange: 143,
    				yRange: 144,
    				zRange: 145,
    				rRange: 146,
    				xReverse: 147,
    				yReverse: 148,
    				zReverse: 149,
    				rReverse: 150,
    				xDomainSort: 151,
    				yDomainSort: 152,
    				zDomainSort: 153,
    				rDomainSort: 154,
    				padding: 155,
    				extents: 156,
    				flatData: 157,
    				custom: 158,
    				debug: 159
    			},
    			add_css$a,
    			[-1, -1, -1, -1, -1, -1]
    		);
    	}
    }

    /* node_modules/layercake/dist/layouts/Html.svelte generated by Svelte v3.59.2 */

    function add_css$9(target) {
    	append_styles(target, "svelte-1bu60uu", "div.svelte-1bu60uu,slot.svelte-1bu60uu{position:absolute;top:0;left:0}");
    }

    const get_default_slot_changes$2 = dirty => ({ element: dirty & /*element*/ 1 });
    const get_default_slot_context$2 = ctx => ({ element: /*element*/ ctx[0] });

    function create_fragment$a(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], get_default_slot_context$2);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "layercake-layout-html svelte-1bu60uu");
    			attr(div, "role", /*roleVal*/ ctx[6]);
    			attr(div, "aria-label", /*label*/ ctx[3]);
    			attr(div, "aria-labelledby", /*labelledBy*/ ctx[4]);
    			attr(div, "aria-describedby", /*describedBy*/ ctx[5]);
    			set_style(div, "z-index", /*zIndex*/ ctx[1]);
    			set_style(div, "pointer-events", /*pointerEvents*/ ctx[2] === false ? 'none' : null);
    			set_style(div, "top", /*$padding*/ ctx[7].top + 'px');
    			set_style(div, "right", /*$padding*/ ctx[7].right + 'px');
    			set_style(div, "bottom", /*$padding*/ ctx[7].bottom + 'px');
    			set_style(div, "left", /*$padding*/ ctx[7].left + 'px');
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[12](div);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, element*/ 1025)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, get_default_slot_changes$2),
    						get_default_slot_context$2
    					);
    				}
    			}

    			if (!current || dirty & /*roleVal*/ 64) {
    				attr(div, "role", /*roleVal*/ ctx[6]);
    			}

    			if (!current || dirty & /*label*/ 8) {
    				attr(div, "aria-label", /*label*/ ctx[3]);
    			}

    			if (!current || dirty & /*labelledBy*/ 16) {
    				attr(div, "aria-labelledby", /*labelledBy*/ ctx[4]);
    			}

    			if (!current || dirty & /*describedBy*/ 32) {
    				attr(div, "aria-describedby", /*describedBy*/ ctx[5]);
    			}

    			if (dirty & /*zIndex*/ 2) {
    				set_style(div, "z-index", /*zIndex*/ ctx[1]);
    			}

    			if (dirty & /*pointerEvents*/ 4) {
    				set_style(div, "pointer-events", /*pointerEvents*/ ctx[2] === false ? 'none' : null);
    			}

    			if (dirty & /*$padding*/ 128) {
    				set_style(div, "top", /*$padding*/ ctx[7].top + 'px');
    			}

    			if (dirty & /*$padding*/ 128) {
    				set_style(div, "right", /*$padding*/ ctx[7].right + 'px');
    			}

    			if (dirty & /*$padding*/ 128) {
    				set_style(div, "bottom", /*$padding*/ ctx[7].bottom + 'px');
    			}

    			if (dirty & /*$padding*/ 128) {
    				set_style(div, "left", /*$padding*/ ctx[7].left + 'px');
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[12](null);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let roleVal;
    	let $padding;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const { padding } = getContext('LayerCake');
    	component_subscribe($$self, padding, value => $$invalidate(7, $padding = value));
    	let { element = undefined } = $$props;
    	let { zIndex = undefined } = $$props;
    	let { pointerEvents = undefined } = $$props;
    	let { role = undefined } = $$props;
    	let { label = undefined } = $$props;
    	let { labelledBy = undefined } = $$props;
    	let { describedBy = undefined } = $$props;

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			element = $$value;
    			$$invalidate(0, element);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('element' in $$props) $$invalidate(0, element = $$props.element);
    		if ('zIndex' in $$props) $$invalidate(1, zIndex = $$props.zIndex);
    		if ('pointerEvents' in $$props) $$invalidate(2, pointerEvents = $$props.pointerEvents);
    		if ('role' in $$props) $$invalidate(9, role = $$props.role);
    		if ('label' in $$props) $$invalidate(3, label = $$props.label);
    		if ('labelledBy' in $$props) $$invalidate(4, labelledBy = $$props.labelledBy);
    		if ('describedBy' in $$props) $$invalidate(5, describedBy = $$props.describedBy);
    		if ('$$scope' in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*role, label, labelledBy, describedBy*/ 568) {
    			$$invalidate(6, roleVal = role || (label || labelledBy || describedBy
    			? 'figure'
    			: undefined));
    		}
    	};

    	return [
    		element,
    		zIndex,
    		pointerEvents,
    		label,
    		labelledBy,
    		describedBy,
    		roleVal,
    		$padding,
    		padding,
    		role,
    		$$scope,
    		slots,
    		div_binding
    	];
    }

    class Html extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				element: 0,
    				zIndex: 1,
    				pointerEvents: 2,
    				role: 9,
    				label: 3,
    				labelledBy: 4,
    				describedBy: 5
    			},
    			add_css$9
    		);
    	}
    }

    /* node_modules/layercake/dist/layouts/Svg.svelte generated by Svelte v3.59.2 */

    function add_css$8(target) {
    	append_styles(target, "svelte-u84d8d", "svg.svelte-u84d8d{position:absolute;top:0;left:0;overflow:visible}");
    }

    const get_default_slot_changes$1 = dirty => ({ element: dirty & /*element*/ 1 });
    const get_default_slot_context$1 = ctx => ({ element: /*element*/ ctx[0] });
    const get_defs_slot_changes = dirty => ({ element: dirty & /*element*/ 1 });
    const get_defs_slot_context = ctx => ({ element: /*element*/ ctx[0] });
    const get_title_slot_changes = dirty => ({ element: dirty & /*element*/ 1 });
    const get_title_slot_context = ctx => ({ element: /*element*/ ctx[0] });

    // (50:20) {#if title}
    function create_if_block$5(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 256) set_data(t, /*title*/ ctx[8]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (50:20) {#if title}
    function fallback_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[8] && create_if_block$5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let svg;
    	let defs;
    	let g;
    	let g_transform_value;
    	let current;
    	const title_slot_template = /*#slots*/ ctx[16].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[15], get_title_slot_context);
    	const title_slot_or_fallback = title_slot || fallback_block(ctx);
    	const defs_slot_template = /*#slots*/ ctx[16].defs;
    	const defs_slot = create_slot(defs_slot_template, ctx, /*$$scope*/ ctx[15], get_defs_slot_context);
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], get_default_slot_context$1);

    	return {
    		c() {
    			svg = svg_element("svg");
    			if (title_slot_or_fallback) title_slot_or_fallback.c();
    			defs = svg_element("defs");
    			if (defs_slot) defs_slot.c();
    			g = svg_element("g");
    			if (default_slot) default_slot.c();
    			attr(g, "class", "layercake-layout-svg_g");
    			attr(g, "transform", g_transform_value = "translate(" + /*$padding*/ ctx[11].left + ", " + /*$padding*/ ctx[11].top + ")");
    			attr(svg, "class", "layercake-layout-svg svelte-u84d8d");
    			attr(svg, "viewBox", /*viewBox*/ ctx[4]);
    			attr(svg, "width", /*$containerWidth*/ ctx[9]);
    			attr(svg, "height", /*$containerHeight*/ ctx[10]);
    			attr(svg, "aria-label", /*label*/ ctx[5]);
    			attr(svg, "aria-labelledby", /*labelledBy*/ ctx[6]);
    			attr(svg, "aria-describedby", /*describedBy*/ ctx[7]);
    			set_style(svg, "z-index", /*zIndex*/ ctx[2]);
    			set_style(svg, "pointer-events", /*pointerEvents*/ ctx[3] === false ? 'none' : null);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);

    			if (title_slot_or_fallback) {
    				title_slot_or_fallback.m(svg, null);
    			}

    			append(svg, defs);

    			if (defs_slot) {
    				defs_slot.m(defs, null);
    			}

    			append(svg, g);

    			if (default_slot) {
    				default_slot.m(g, null);
    			}

    			/*g_binding*/ ctx[17](g);
    			/*svg_binding*/ ctx[18](svg);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (title_slot) {
    				if (title_slot.p && (!current || dirty & /*$$scope, element*/ 32769)) {
    					update_slot_base(
    						title_slot,
    						title_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[15], dirty, get_title_slot_changes),
    						get_title_slot_context
    					);
    				}
    			} else {
    				if (title_slot_or_fallback && title_slot_or_fallback.p && (!current || dirty & /*title*/ 256)) {
    					title_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}

    			if (defs_slot) {
    				if (defs_slot.p && (!current || dirty & /*$$scope, element*/ 32769)) {
    					update_slot_base(
    						defs_slot,
    						defs_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(defs_slot_template, /*$$scope*/ ctx[15], dirty, get_defs_slot_changes),
    						get_defs_slot_context
    					);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, element*/ 32769)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, get_default_slot_changes$1),
    						get_default_slot_context$1
    					);
    				}
    			}

    			if (!current || dirty & /*$padding*/ 2048 && g_transform_value !== (g_transform_value = "translate(" + /*$padding*/ ctx[11].left + ", " + /*$padding*/ ctx[11].top + ")")) {
    				attr(g, "transform", g_transform_value);
    			}

    			if (!current || dirty & /*viewBox*/ 16) {
    				attr(svg, "viewBox", /*viewBox*/ ctx[4]);
    			}

    			if (!current || dirty & /*$containerWidth*/ 512) {
    				attr(svg, "width", /*$containerWidth*/ ctx[9]);
    			}

    			if (!current || dirty & /*$containerHeight*/ 1024) {
    				attr(svg, "height", /*$containerHeight*/ ctx[10]);
    			}

    			if (!current || dirty & /*label*/ 32) {
    				attr(svg, "aria-label", /*label*/ ctx[5]);
    			}

    			if (!current || dirty & /*labelledBy*/ 64) {
    				attr(svg, "aria-labelledby", /*labelledBy*/ ctx[6]);
    			}

    			if (!current || dirty & /*describedBy*/ 128) {
    				attr(svg, "aria-describedby", /*describedBy*/ ctx[7]);
    			}

    			if (dirty & /*zIndex*/ 4) {
    				set_style(svg, "z-index", /*zIndex*/ ctx[2]);
    			}

    			if (dirty & /*pointerEvents*/ 8) {
    				set_style(svg, "pointer-events", /*pointerEvents*/ ctx[3] === false ? 'none' : null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot_or_fallback, local);
    			transition_in(defs_slot, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot_or_fallback, local);
    			transition_out(defs_slot, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (title_slot_or_fallback) title_slot_or_fallback.d(detaching);
    			if (defs_slot) defs_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			/*g_binding*/ ctx[17](null);
    			/*svg_binding*/ ctx[18](null);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $containerWidth;
    	let $containerHeight;
    	let $padding;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { element = undefined } = $$props;
    	let { innerElement = undefined } = $$props;
    	let { zIndex = undefined } = $$props;
    	let { pointerEvents = undefined } = $$props;
    	let { viewBox = undefined } = $$props;
    	let { label = undefined } = $$props;
    	let { labelledBy = undefined } = $$props;
    	let { describedBy = undefined } = $$props;
    	let { title = undefined } = $$props;
    	const { containerWidth, containerHeight, padding } = getContext('LayerCake');
    	component_subscribe($$self, containerWidth, value => $$invalidate(9, $containerWidth = value));
    	component_subscribe($$self, containerHeight, value => $$invalidate(10, $containerHeight = value));
    	component_subscribe($$self, padding, value => $$invalidate(11, $padding = value));

    	function g_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			innerElement = $$value;
    			$$invalidate(1, innerElement);
    		});
    	}

    	function svg_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			element = $$value;
    			$$invalidate(0, element);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('element' in $$props) $$invalidate(0, element = $$props.element);
    		if ('innerElement' in $$props) $$invalidate(1, innerElement = $$props.innerElement);
    		if ('zIndex' in $$props) $$invalidate(2, zIndex = $$props.zIndex);
    		if ('pointerEvents' in $$props) $$invalidate(3, pointerEvents = $$props.pointerEvents);
    		if ('viewBox' in $$props) $$invalidate(4, viewBox = $$props.viewBox);
    		if ('label' in $$props) $$invalidate(5, label = $$props.label);
    		if ('labelledBy' in $$props) $$invalidate(6, labelledBy = $$props.labelledBy);
    		if ('describedBy' in $$props) $$invalidate(7, describedBy = $$props.describedBy);
    		if ('title' in $$props) $$invalidate(8, title = $$props.title);
    		if ('$$scope' in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	return [
    		element,
    		innerElement,
    		zIndex,
    		pointerEvents,
    		viewBox,
    		label,
    		labelledBy,
    		describedBy,
    		title,
    		$containerWidth,
    		$containerHeight,
    		$padding,
    		containerWidth,
    		containerHeight,
    		padding,
    		$$scope,
    		slots,
    		g_binding,
    		svg_binding
    	];
    }

    class Svg extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$9,
    			create_fragment$9,
    			safe_not_equal,
    			{
    				element: 0,
    				innerElement: 1,
    				zIndex: 2,
    				pointerEvents: 3,
    				viewBox: 4,
    				label: 5,
    				labelledBy: 6,
    				describedBy: 7,
    				title: 8
    			},
    			add_css$8
    		);
    	}
    }

    /**
    	Flatten arrays of arrays one level deep
    	@param {Array} list The list to flatten.
    	@param {String|Function} accessor An optional accessor function. If this is a string, it will be transformed into an accessor for that key.
    	@returns {Array}
    */
    function flatten (list, accessor = d => d) {
    	const acc = typeof accessor === 'string' ? d => d[accessor] : accessor;
    	if (Array.isArray(list) && Array.isArray(acc(list[0]))) {
    		let flat = [];
    		const l = list.length;
    		for (let i = 0; i < l; i += 1) {
    			flat = flat.concat(acc(list[i]));
    		}
    		return flat;
    	}
    	return list;
    }

    /**
      Pivots your data by "lengthening" it - increasing the number
      of rows and decreasing the number of columns.
      Similar to R's tidyverse [pivot_longer function](https://tidyr.tidyverse.org/reference/pivot_longer.html)

      // Input data
      const data = [
    		{ month: '2015-01-01', apples: 320, bananas: 480, cherries: 640, dates: 400 },
    		{ month: '2015-02-01', apples: 640, bananas: 960, cherries: 640, dates: 500 },
        { month: '2015-03-01', apples: 1600, bananas: 1440, cherries: 960, dates: 600 }
      ];

    	// Usage
    	groupLonger(data, ['apples', 'bananas', 'cherries', 'dates']);

      // Output
      [{
      	group: 'apples',
      	values: [
      		{ month: '2010-01-01', value: 320 },
      		{ month: '2010-02-01', value: 640 },
      		// ...
      	]
      },
      // etc...
      ]
      --------------------------------------------

    	@param {Array} data The data to be transformed.
    	@param {Array} keys The groups names to break out into separate groups.
    	@param {Object} options Options object
    	@param {String} [options.groupTo='group'] This name of the field that is added to each group object. Defaults to 'group'. This field is also added to each row of data.
    	@param {String} [options.valueTo='value'] The name of the new field on each row of data to store the value under. Defaults to 'value'.
    	@param {String[]} [options.keepKeys] Any keys we want to explicitly keep. If this is unset, all keys not specified in your groups will be kept. The list of full keys is determined by naively looking at the first row of the data.

    	@returns {Array} [dataLong] The transformed data that is a list of one object for each group. Each object has `key` and `values` where `key` is the group name and `values` is a list of transformed data.
    */

    function groupLonger(data, keys, {
    	groupTo = 'group',
    	valueTo = 'value',
    	keepKeys = undefined
    } = {}) {
    	if (!Array.isArray(data)) {
    		throw new TypeError('The first argument of groupLonger() must be an array of data')
    	}
    	if (!Array.isArray(keys)) {
    		throw new TypeError('The second argument of groupLonger() must be an array of key names');
    	}
    	const keysSet = new Set(keys);
    	const keep = keepKeys || Object.keys(data[0]).filter(d => !keysSet.has(d));

    	return keys.map(key => {
    		return {
    			[groupTo]: key,
    			values: data.map(d => {
    				return {
    					...Object.fromEntries(keep.map((k => [k, d[k]]))),
    					[valueTo]: d[key],
    					[groupTo]: key,
    				};
    			})
    		};
    	});
    }

    /* src/routes/scrollygraph/_compotents/MultiLine.svelte generated by Svelte v3.59.2 */

    function add_css$7(target) {
    	append_styles(target, "svelte-1801kzk", ".path-line.svelte-1801kzk{fill:none;stroke-linejoin:round;stroke-linecap:round;stroke-width:3px;stroke-opacity:0.7}");
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (21:2) {#each $data as group}
    function create_each_block$4(ctx) {
    	let path_1;
    	let path_1_d_value;
    	let path_1_stroke_value;

    	return {
    		c() {
    			path_1 = svg_element("path");
    			attr(path_1, "class", "path-line svelte-1801kzk");
    			attr(path_1, "d", path_1_d_value = /*path*/ ctx[0](/*group*/ ctx[9].values));
    			attr(path_1, "stroke", path_1_stroke_value = /*$zGet*/ ctx[2](/*group*/ ctx[9]));
    		},
    		m(target, anchor) {
    			insert(target, path_1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*path, $data*/ 3 && path_1_d_value !== (path_1_d_value = /*path*/ ctx[0](/*group*/ ctx[9].values))) {
    				attr(path_1, "d", path_1_d_value);
    			}

    			if (dirty & /*$zGet, $data*/ 6 && path_1_stroke_value !== (path_1_stroke_value = /*$zGet*/ ctx[2](/*group*/ ctx[9]))) {
    				attr(path_1, "stroke", path_1_stroke_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(path_1);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let g;
    	let each_value = /*$data*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	return {
    		c() {
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(g, "class", "line-group");
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*path, $data, $zGet*/ 7) {
    				each_value = /*$data*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(g);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let path;
    	let $yGet;
    	let $xGet;
    	let $data;
    	let $zGet;
    	const { data, xGet, yGet, zGet } = getContext('LayerCake');
    	component_subscribe($$self, data, value => $$invalidate(1, $data = value));
    	component_subscribe($$self, xGet, value => $$invalidate(8, $xGet = value));
    	component_subscribe($$self, yGet, value => $$invalidate(7, $yGet = value));
    	component_subscribe($$self, zGet, value => $$invalidate(2, $zGet = value));

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$xGet, $yGet*/ 384) {
    			$$invalidate(0, path = values => {
    				return 'M' + values.map(d => {
    					return $xGet(d) + ',' + $yGet(d);
    				}).join('L');
    			});
    		}
    	};

    	return [path, $data, $zGet, data, xGet, yGet, zGet, $yGet, $xGet];
    }

    class MultiLine extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {}, add_css$7);
    	}
    }

    /* src/routes/scrollygraph/_compotents/AxisX.svelte generated by Svelte v3.59.2 */

    function add_css$6(target) {
    	append_styles(target, "svelte-10p0gj4", ".tick.svelte-10p0gj4.svelte-10p0gj4{font-size:12.5px}line.svelte-10p0gj4.svelte-10p0gj4,.tick.svelte-10p0gj4 line.svelte-10p0gj4{stroke:#aaa;stroke-dasharray:2}.tick.svelte-10p0gj4 text.svelte-10p0gj4{fill:#666}.tick.svelte-10p0gj4 .tick-mark.svelte-10p0gj4,.baseline.svelte-10p0gj4.svelte-10p0gj4{stroke-dasharray:0}.axis.snapLabels.svelte-10p0gj4 .tick:last-child text.svelte-10p0gj4{transform:translateX(3px)}.axis.snapLabels.svelte-10p0gj4 .tick.tick-0 text.svelte-10p0gj4{transform:translateX(-3px)}");
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    // (70:4) {#if baseline === true}
    function create_if_block_2$1(ctx) {
    	let line;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "baseline svelte-10p0gj4");
    			attr(line, "y1", /*$height*/ ctx[12]);
    			attr(line, "y2", /*$height*/ ctx[12]);
    			attr(line, "x1", "0");
    			attr(line, "x2", /*$width*/ ctx[13]);
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$height*/ 4096) {
    				attr(line, "y1", /*$height*/ ctx[12]);
    			}

    			if (dirty & /*$height*/ 4096) {
    				attr(line, "y2", /*$height*/ ctx[12]);
    			}

    			if (dirty & /*$width*/ 8192) {
    				attr(line, "x2", /*$width*/ ctx[13]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (81:6) {#if gridlines === true}
    function create_if_block_1$2(ctx) {
    	let line;
    	let line_y__value;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "gridline svelte-10p0gj4");
    			attr(line, "x1", /*halfBand*/ ctx[9]);
    			attr(line, "x2", /*halfBand*/ ctx[9]);
    			attr(line, "y1", line_y__value = -/*$height*/ ctx[12]);
    			attr(line, "y2", "0");
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*halfBand*/ 512) {
    				attr(line, "x1", /*halfBand*/ ctx[9]);
    			}

    			if (dirty & /*halfBand*/ 512) {
    				attr(line, "x2", /*halfBand*/ ctx[9]);
    			}

    			if (dirty & /*$height*/ 4096 && line_y__value !== (line_y__value = -/*$height*/ ctx[12])) {
    				attr(line, "y1", line_y__value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (90:6) {#if tickMarks === true}
    function create_if_block$4(ctx) {
    	let line;
    	let line_y__value;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "tick-mark svelte-10p0gj4");
    			attr(line, "x1", /*halfBand*/ ctx[9]);
    			attr(line, "x2", /*halfBand*/ ctx[9]);
    			attr(line, "y1", /*tickGutter*/ ctx[5]);
    			attr(line, "y2", line_y__value = /*tickGutter*/ ctx[5] + /*tickLen*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*halfBand*/ 512) {
    				attr(line, "x1", /*halfBand*/ ctx[9]);
    			}

    			if (dirty & /*halfBand*/ 512) {
    				attr(line, "x2", /*halfBand*/ ctx[9]);
    			}

    			if (dirty & /*tickGutter*/ 32) {
    				attr(line, "y1", /*tickGutter*/ ctx[5]);
    			}

    			if (dirty & /*tickGutter, tickLen*/ 2080 && line_y__value !== (line_y__value = /*tickGutter*/ ctx[5] + /*tickLen*/ ctx[11])) {
    				attr(line, "y2", line_y__value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (69:2) {#each tickVals as tick, i (i)}
    function create_each_block$3(key_1, ctx) {
    	let first;
    	let g;
    	let if_block1_anchor;
    	let text_1;
    	let t_value = /*format*/ ctx[4](/*tick*/ ctx[23]) + "";
    	let t;
    	let text_1_y_value;
    	let text_1_text_anchor_value;
    	let g_class_value;
    	let g_transform_value;
    	let if_block0 = /*baseline*/ ctx[2] === true && create_if_block_2$1(ctx);
    	let if_block1 = /*gridlines*/ ctx[1] === true && create_if_block_1$2(ctx);
    	let if_block2 = /*tickMarks*/ ctx[0] === true && create_if_block$4(ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			if (if_block0) if_block0.c();
    			g = svg_element("g");
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			if (if_block2) if_block2.c();
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr(text_1, "x", /*halfBand*/ ctx[9]);
    			attr(text_1, "y", text_1_y_value = /*tickGutter*/ ctx[5] + /*tickLen*/ ctx[11]);
    			attr(text_1, "dx", /*dx*/ ctx[6]);
    			attr(text_1, "dy", /*dy*/ ctx[7]);
    			attr(text_1, "text-anchor", text_1_text_anchor_value = /*textAnchor*/ ctx[19](/*i*/ ctx[25], /*snapLabels*/ ctx[3]));
    			attr(text_1, "class", "svelte-10p0gj4");
    			attr(g, "class", g_class_value = "tick tick-" + /*i*/ ctx[25] + " svelte-10p0gj4");
    			attr(g, "transform", g_transform_value = "translate(" + /*$xScale*/ ctx[8](/*tick*/ ctx[23]) + "," + Math.max(.../*$yRange*/ ctx[14]) + ")");
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, g, anchor);
    			if (if_block1) if_block1.m(g, null);
    			append(g, if_block1_anchor);
    			if (if_block2) if_block2.m(g, null);
    			append(g, text_1);
    			append(text_1, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*baseline*/ ctx[2] === true) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(g.parentNode, g);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*gridlines*/ ctx[1] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(g, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*tickMarks*/ ctx[0] === true) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$4(ctx);
    					if_block2.c();
    					if_block2.m(g, text_1);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*format, tickVals*/ 1040 && t_value !== (t_value = /*format*/ ctx[4](/*tick*/ ctx[23]) + "")) set_data(t, t_value);

    			if (dirty & /*halfBand*/ 512) {
    				attr(text_1, "x", /*halfBand*/ ctx[9]);
    			}

    			if (dirty & /*tickGutter, tickLen*/ 2080 && text_1_y_value !== (text_1_y_value = /*tickGutter*/ ctx[5] + /*tickLen*/ ctx[11])) {
    				attr(text_1, "y", text_1_y_value);
    			}

    			if (dirty & /*dx*/ 64) {
    				attr(text_1, "dx", /*dx*/ ctx[6]);
    			}

    			if (dirty & /*dy*/ 128) {
    				attr(text_1, "dy", /*dy*/ ctx[7]);
    			}

    			if (dirty & /*tickVals, snapLabels*/ 1032 && text_1_text_anchor_value !== (text_1_text_anchor_value = /*textAnchor*/ ctx[19](/*i*/ ctx[25], /*snapLabels*/ ctx[3]))) {
    				attr(text_1, "text-anchor", text_1_text_anchor_value);
    			}

    			if (dirty & /*tickVals*/ 1024 && g_class_value !== (g_class_value = "tick tick-" + /*i*/ ctx[25] + " svelte-10p0gj4")) {
    				attr(g, "class", g_class_value);
    			}

    			if (dirty & /*$xScale, tickVals, $yRange*/ 17664 && g_transform_value !== (g_transform_value = "translate(" + /*$xScale*/ ctx[8](/*tick*/ ctx[23]) + "," + Math.max(.../*$yRange*/ ctx[14]) + ")")) {
    				attr(g, "transform", g_transform_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(g);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let g;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*tickVals*/ ctx[10];
    	const get_key = ctx => /*i*/ ctx[25];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	return {
    		c() {
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(g, "class", "axis x-axis svelte-10p0gj4");
    			toggle_class(g, "snapLabels", /*snapLabels*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*tickVals, $xScale, Math, $yRange, halfBand, tickGutter, tickLen, dx, dy, textAnchor, snapLabels, format, tickMarks, $height, gridlines, $width, baseline*/ 557055) {
    				each_value = /*tickVals*/ ctx[10];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, g, destroy_block, create_each_block$3, null, get_each_context$3);
    			}

    			if (dirty & /*snapLabels*/ 8) {
    				toggle_class(g, "snapLabels", /*snapLabels*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(g);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let tickLen;
    	let isBandwidth;
    	let tickVals;
    	let halfBand;
    	let $xScale;
    	let $height;
    	let $width;
    	let $yRange;
    	const { width, height, xScale, yRange } = getContext('LayerCake');
    	component_subscribe($$self, width, value => $$invalidate(13, $width = value));
    	component_subscribe($$self, height, value => $$invalidate(12, $height = value));
    	component_subscribe($$self, xScale, value => $$invalidate(8, $xScale = value));
    	component_subscribe($$self, yRange, value => $$invalidate(14, $yRange = value));
    	let { tickMarks = false } = $$props;
    	let { gridlines = true } = $$props;
    	let { tickMarkLength = 6 } = $$props;
    	let { baseline = false } = $$props;
    	let { snapLabels = false } = $$props;
    	let { format = d => d } = $$props;
    	let { ticks = 20 } = $$props;
    	let { tickGutter = 0 } = $$props;
    	let { dx = 0 } = $$props;
    	let { dy = 12 } = $$props;

    	function textAnchor(i, sl) {
    		if (sl === true) {
    			if (i === 0) {
    				return 'start';
    			}

    			if (i === tickVals.length - 1) {
    				return 'end';
    			}
    		}

    		return 'middle';
    	}

    	$$self.$$set = $$props => {
    		if ('tickMarks' in $$props) $$invalidate(0, tickMarks = $$props.tickMarks);
    		if ('gridlines' in $$props) $$invalidate(1, gridlines = $$props.gridlines);
    		if ('tickMarkLength' in $$props) $$invalidate(20, tickMarkLength = $$props.tickMarkLength);
    		if ('baseline' in $$props) $$invalidate(2, baseline = $$props.baseline);
    		if ('snapLabels' in $$props) $$invalidate(3, snapLabels = $$props.snapLabels);
    		if ('format' in $$props) $$invalidate(4, format = $$props.format);
    		if ('ticks' in $$props) $$invalidate(21, ticks = $$props.ticks);
    		if ('tickGutter' in $$props) $$invalidate(5, tickGutter = $$props.tickGutter);
    		if ('dx' in $$props) $$invalidate(6, dx = $$props.dx);
    		if ('dy' in $$props) $$invalidate(7, dy = $$props.dy);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*tickMarks, tickMarkLength*/ 1048577) {
    			$$invalidate(11, tickLen = tickMarks === true ? tickMarkLength ?? 6 : 0);
    		}

    		if ($$self.$$.dirty & /*$xScale*/ 256) {
    			$$invalidate(22, isBandwidth = typeof $xScale.bandwidth === 'function');
    		}

    		if ($$self.$$.dirty & /*ticks, isBandwidth, $xScale*/ 6291712) {
    			$$invalidate(10, tickVals = Array.isArray(ticks)
    			? ticks
    			: isBandwidth
    				? $xScale.domain()
    				: typeof ticks === 'function'
    					? ticks($xScale.ticks())
    					: $xScale.ticks(ticks));
    		}

    		if ($$self.$$.dirty & /*isBandwidth, $xScale*/ 4194560) {
    			$$invalidate(9, halfBand = isBandwidth ? $xScale.bandwidth() / 2 : 0);
    		}
    	};

    	return [
    		tickMarks,
    		gridlines,
    		baseline,
    		snapLabels,
    		format,
    		tickGutter,
    		dx,
    		dy,
    		$xScale,
    		halfBand,
    		tickVals,
    		tickLen,
    		$height,
    		$width,
    		$yRange,
    		width,
    		height,
    		xScale,
    		yRange,
    		textAnchor,
    		tickMarkLength,
    		ticks,
    		isBandwidth
    	];
    }

    class AxisX extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$7,
    			create_fragment$7,
    			safe_not_equal,
    			{
    				tickMarks: 0,
    				gridlines: 1,
    				tickMarkLength: 20,
    				baseline: 2,
    				snapLabels: 3,
    				format: 4,
    				ticks: 21,
    				tickGutter: 5,
    				dx: 6,
    				dy: 7
    			},
    			add_css$6
    		);
    	}
    }

    /* src/routes/scrollygraph/_compotents/AxisY.svelte generated by Svelte v3.59.2 */

    function add_css$5(target) {
    	append_styles(target, "svelte-1niew3w", ".tick.svelte-1niew3w.svelte-1niew3w{font-size:12.5px;z-index:9999}.tick.svelte-1niew3w line.svelte-1niew3w{stroke:#aaa}.tick.svelte-1niew3w .gridline.svelte-1niew3w{stroke-dasharray:2}.tick.svelte-1niew3w text.svelte-1niew3w{fill:#666;z-index:9999}.tick.tick-0.svelte-1niew3w line.svelte-1niew3w{stroke-dasharray:0;stroke:#666\n  }");
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	const constants_0 = /*$yScale*/ child_ctx[9](/*tick*/ child_ctx[25]);
    	child_ctx[26] = constants_0;
    	return child_ctx;
    }

    // (76:6) {#if gridlines === true}
    function create_if_block_1$1(ctx) {
    	let line;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "gridline svelte-1niew3w");
    			attr(line, "x1", /*x1*/ ctx[12]);
    			attr(line, "x2", /*$width*/ ctx[14]);
    			attr(line, "y1", /*y*/ ctx[11]);
    			attr(line, "y2", /*y*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*x1*/ 4096) {
    				attr(line, "x1", /*x1*/ ctx[12]);
    			}

    			if (dirty & /*$width*/ 16384) {
    				attr(line, "x2", /*$width*/ ctx[14]);
    			}

    			if (dirty & /*y*/ 2048) {
    				attr(line, "y1", /*y*/ ctx[11]);
    			}

    			if (dirty & /*y*/ 2048) {
    				attr(line, "y2", /*y*/ ctx[11]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (85:6) {#if tickMarks === true}
    function create_if_block$3(ctx) {
    	let line;
    	let line_x__value;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "tick-mark svelte-1niew3w");
    			attr(line, "x1", /*x1*/ ctx[12]);
    			attr(line, "x2", line_x__value = /*x1*/ ctx[12] + /*tickLen*/ ctx[8]);
    			attr(line, "y1", /*y*/ ctx[11]);
    			attr(line, "y2", /*y*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*x1*/ 4096) {
    				attr(line, "x1", /*x1*/ ctx[12]);
    			}

    			if (dirty & /*x1, tickLen*/ 4352 && line_x__value !== (line_x__value = /*x1*/ ctx[12] + /*tickLen*/ ctx[8])) {
    				attr(line, "x2", line_x__value);
    			}

    			if (dirty & /*y*/ 2048) {
    				attr(line, "y1", /*y*/ ctx[11]);
    			}

    			if (dirty & /*y*/ 2048) {
    				attr(line, "y2", /*y*/ ctx[11]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (73:2) {#each tickVals as tick (tick)}
    function create_each_block$2(key_1, ctx) {
    	let g;
    	let if_block0_anchor;
    	let text_1;
    	let t_value = /*format*/ ctx[4](/*tick*/ ctx[25]) + "";
    	let t;
    	let text_1_dx_value;
    	let text_1_text_anchor_value;
    	let text_1_dy_value;
    	let g_class_value;
    	let g_transform_value;
    	let if_block0 = /*gridlines*/ ctx[3] === true && create_if_block_1$1(ctx);
    	let if_block1 = /*tickMarks*/ ctx[0] === true && create_if_block$3(ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			g = svg_element("g");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr(text_1, "x", /*x1*/ ctx[12]);
    			attr(text_1, "y", /*y*/ ctx[11]);
    			attr(text_1, "dx", text_1_dx_value = /*dx*/ ctx[5] + (/*labelPosition*/ ctx[1] === 'even' ? -3 : 0));
    			attr(text_1, "text-anchor", text_1_text_anchor_value = /*labelPosition*/ ctx[1] === 'above' ? 'start' : 'end');

    			attr(text_1, "dy", text_1_dy_value = /*dy*/ ctx[6] + (/*labelPosition*/ ctx[1] === 'above' || /*snapBaselineLabel*/ ctx[2] === true && /*tickValPx*/ ctx[26] === /*maxTickValPx*/ ctx[10]
    			? -3
    			: 4));

    			attr(text_1, "class", "svelte-1niew3w");
    			attr(g, "class", g_class_value = "tick tick-" + /*tick*/ ctx[25] + " svelte-1niew3w");
    			attr(g, "transform", g_transform_value = "translate(" + /*$xRange*/ ctx[13][0] + ", " + /*tickValPx*/ ctx[26] + ")");
    			this.first = g;
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);
    			if (if_block0) if_block0.m(g, null);
    			append(g, if_block0_anchor);
    			if (if_block1) if_block1.m(g, null);
    			append(g, text_1);
    			append(text_1, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*gridlines*/ ctx[3] === true) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(g, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*tickMarks*/ ctx[0] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(g, text_1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*format, tickVals*/ 144 && t_value !== (t_value = /*format*/ ctx[4](/*tick*/ ctx[25]) + "")) set_data(t, t_value);

    			if (dirty & /*x1*/ 4096) {
    				attr(text_1, "x", /*x1*/ ctx[12]);
    			}

    			if (dirty & /*y*/ 2048) {
    				attr(text_1, "y", /*y*/ ctx[11]);
    			}

    			if (dirty & /*dx, labelPosition*/ 34 && text_1_dx_value !== (text_1_dx_value = /*dx*/ ctx[5] + (/*labelPosition*/ ctx[1] === 'even' ? -3 : 0))) {
    				attr(text_1, "dx", text_1_dx_value);
    			}

    			if (dirty & /*labelPosition*/ 2 && text_1_text_anchor_value !== (text_1_text_anchor_value = /*labelPosition*/ ctx[1] === 'above' ? 'start' : 'end')) {
    				attr(text_1, "text-anchor", text_1_text_anchor_value);
    			}

    			if (dirty & /*dy, labelPosition, snapBaselineLabel, $yScale, tickVals, maxTickValPx*/ 1734 && text_1_dy_value !== (text_1_dy_value = /*dy*/ ctx[6] + (/*labelPosition*/ ctx[1] === 'above' || /*snapBaselineLabel*/ ctx[2] === true && /*tickValPx*/ ctx[26] === /*maxTickValPx*/ ctx[10]
    			? -3
    			: 4))) {
    				attr(text_1, "dy", text_1_dy_value);
    			}

    			if (dirty & /*tickVals*/ 128 && g_class_value !== (g_class_value = "tick tick-" + /*tick*/ ctx[25] + " svelte-1niew3w")) {
    				attr(g, "class", g_class_value);
    			}

    			if (dirty & /*$xRange, $yScale, tickVals*/ 8832 && g_transform_value !== (g_transform_value = "translate(" + /*$xRange*/ ctx[13][0] + ", " + /*tickValPx*/ ctx[26] + ")")) {
    				attr(g, "transform", g_transform_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(g);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let g;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*tickVals*/ ctx[7];
    	const get_key = ctx => /*tick*/ ctx[25];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	return {
    		c() {
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(g, "class", "axis y-axis");
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*tickVals, $xRange, $yScale, x1, y, dx, labelPosition, dy, snapBaselineLabel, maxTickValPx, format, tickLen, tickMarks, $width, gridlines*/ 32767) {
    				each_value = /*tickVals*/ ctx[7];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, g, destroy_block, create_each_block$2, null, get_each_context$2);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(g);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let isBandwidth;
    	let tickVals;
    	let tickLen;
    	let widestTickLen;
    	let x1;
    	let y;
    	let maxTickValPx;
    	let $yScale;
    	let $xRange;
    	let $width;
    	const { xRange, yScale, width } = getContext('LayerCake');
    	component_subscribe($$self, xRange, value => $$invalidate(13, $xRange = value));
    	component_subscribe($$self, yScale, value => $$invalidate(9, $yScale = value));
    	component_subscribe($$self, width, value => $$invalidate(14, $width = value));
    	let { tickMarks = false } = $$props;
    	let { labelPosition = 'above' } = $$props;
    	let { snapBaselineLabel = false } = $$props;
    	let { gridlines = true } = $$props;
    	let { tickMarkLength = undefined } = $$props;
    	let { format = d => d } = $$props;
    	let { ticks = 4 } = $$props;
    	let { tickGutter = -32 } = $$props;
    	let { dx = 0 } = $$props;
    	let { dy = 0 } = $$props;
    	let { charPixelWidth = 7.25 } = $$props;

    	function calcStringLength(sum, val) {
    		if (val === ',' || val === '.') return sum + charPixelWidth * 0.5;
    		return sum + charPixelWidth;
    	}

    	$$self.$$set = $$props => {
    		if ('tickMarks' in $$props) $$invalidate(0, tickMarks = $$props.tickMarks);
    		if ('labelPosition' in $$props) $$invalidate(1, labelPosition = $$props.labelPosition);
    		if ('snapBaselineLabel' in $$props) $$invalidate(2, snapBaselineLabel = $$props.snapBaselineLabel);
    		if ('gridlines' in $$props) $$invalidate(3, gridlines = $$props.gridlines);
    		if ('tickMarkLength' in $$props) $$invalidate(18, tickMarkLength = $$props.tickMarkLength);
    		if ('format' in $$props) $$invalidate(4, format = $$props.format);
    		if ('ticks' in $$props) $$invalidate(19, ticks = $$props.ticks);
    		if ('tickGutter' in $$props) $$invalidate(20, tickGutter = $$props.tickGutter);
    		if ('dx' in $$props) $$invalidate(5, dx = $$props.dx);
    		if ('dy' in $$props) $$invalidate(6, dy = $$props.dy);
    		if ('charPixelWidth' in $$props) $$invalidate(21, charPixelWidth = $$props.charPixelWidth);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$yScale*/ 512) {
    			$$invalidate(22, isBandwidth = typeof $yScale.bandwidth === 'function');
    		}

    		if ($$self.$$.dirty & /*ticks, isBandwidth, $yScale*/ 4719104) {
    			$$invalidate(7, tickVals = Array.isArray(ticks)
    			? ticks
    			: isBandwidth
    				? $yScale.domain()
    				: typeof ticks === 'function'
    					? ticks($yScale.ticks())
    					: $yScale.ticks(ticks));
    		}

    		if ($$self.$$.dirty & /*tickVals, format*/ 144) {
    			$$invalidate(23, widestTickLen = Math.max(10, Math.max(...tickVals.map(d => format(d).toString().split('').reduce(calcStringLength, 0)))));
    		}

    		if ($$self.$$.dirty & /*tickMarks, labelPosition, tickMarkLength, widestTickLen*/ 8650755) {
    			$$invalidate(8, tickLen = tickMarks === true
    			? labelPosition === 'above'
    				? tickMarkLength ?? widestTickLen
    				: tickMarkLength ?? 6
    			: 0);
    		}

    		if ($$self.$$.dirty & /*tickGutter, labelPosition, widestTickLen, tickLen*/ 9437442) {
    			$$invalidate(12, x1 = -tickGutter - (labelPosition === 'above' ? widestTickLen : tickLen));
    		}

    		if ($$self.$$.dirty & /*isBandwidth, $yScale*/ 4194816) {
    			$$invalidate(11, y = isBandwidth ? $yScale.bandwidth() / 2 : 0);
    		}

    		if ($$self.$$.dirty & /*tickVals, $yScale*/ 640) {
    			$$invalidate(10, maxTickValPx = Math.max(...tickVals.map($yScale)));
    		}
    	};

    	return [
    		tickMarks,
    		labelPosition,
    		snapBaselineLabel,
    		gridlines,
    		format,
    		dx,
    		dy,
    		tickVals,
    		tickLen,
    		$yScale,
    		maxTickValPx,
    		y,
    		x1,
    		$xRange,
    		$width,
    		xRange,
    		yScale,
    		width,
    		tickMarkLength,
    		ticks,
    		tickGutter,
    		charPixelWidth,
    		isBandwidth,
    		widestTickLen
    	];
    }

    class AxisY extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				tickMarks: 0,
    				labelPosition: 1,
    				snapBaselineLabel: 2,
    				gridlines: 3,
    				tickMarkLength: 18,
    				format: 4,
    				ticks: 19,
    				tickGutter: 20,
    				dx: 5,
    				dy: 6,
    				charPixelWidth: 21
    			},
    			add_css$5
    		);
    	}
    }

    /* src/routes/scrollygraph/_compotents/GroupLabels.html.svelte generated by Svelte v3.59.2 */

    function add_css$4(target) {
    	append_styles(target, "svelte-xfzs1h", ".svelte-xfzs1h{font-family:'Graphik Web', 'Helvetica Neue', Helvetica, Arial, sans-serif}:root{--overlap-offset:8px;--x-offset:4px;--y-offset:-11px}.label.svelte-xfzs1h{position:absolute;transform:translateY(var(--y-offset))translateX(var(--x-offset));font-size:15px;display:flex;flex-direction:row;justify-content:flex-start;align-items:flex-start;gap:5px}.text.svelte-xfzs1h{line-height:16px;width:90px;transform:translatey(0%)}.point.svelte-xfzs1h{transform:translatey(100%);width:6px;height:6px}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (27:0) {#each $data as group}
    function create_each_block$1(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1_value = /*cap*/ ctx[12](/*$z*/ ctx[4](/*group*/ ctx[19])) + "";
    	let t1;
    	let t2;

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr(div0, "class", "point svelte-xfzs1h");
    			set_style(div0, "background-color", /*$zGet*/ ctx[3](/*group*/ ctx[19]));
    			attr(div1, "class", "text svelte-xfzs1h");

    			set_style(div1, "transform", "translatey(" + (/*$z*/ ctx[4](/*group*/ ctx[19]) == "All other domestic counties"
    			? "-33px"
    			: "0") + ")");

    			attr(div2, "class", "label svelte-xfzs1h");
    			set_style(div2, "top", /*top*/ ctx[0](/*group*/ ctx[19].values) * 100 + "%");
    			set_style(div2, "left", /*left*/ ctx[1](/*group*/ ctx[19].values) * 100 + "%");
    			set_style(div2, "width", "205px");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, t1);
    			append(div2, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$zGet, $data*/ 12) {
    				set_style(div0, "background-color", /*$zGet*/ ctx[3](/*group*/ ctx[19]));
    			}

    			if (dirty & /*$z, $data*/ 20 && t1_value !== (t1_value = /*cap*/ ctx[12](/*$z*/ ctx[4](/*group*/ ctx[19])) + "")) set_data(t1, t1_value);

    			if (dirty & /*$z, $data*/ 20) {
    				set_style(div1, "transform", "translatey(" + (/*$z*/ ctx[4](/*group*/ ctx[19]) == "All other domestic counties"
    				? "-33px"
    				: "0") + ")");
    			}

    			if (dirty & /*top, $data*/ 5) {
    				set_style(div2, "top", /*top*/ ctx[0](/*group*/ ctx[19].values) * 100 + "%");
    			}

    			if (dirty & /*left, $data*/ 6) {
    				set_style(div2, "left", /*left*/ ctx[1](/*group*/ ctx[19].values) * 100 + "%");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let each_1_anchor;
    	let each_value = /*$data*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*top, $data, left, $z, cap, $zGet*/ 4127) {
    				each_value = /*$data*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let left;
    	let top;
    	let $yRange;
    	let $yScale;
    	let $xRange;
    	let $xScale;
    	let $data;
    	let $zGet;
    	let $z;
    	const { data, x, y, xScale, yScale, xRange, yRange, z, zGet } = getContext('LayerCake');
    	component_subscribe($$self, data, value => $$invalidate(2, $data = value));
    	component_subscribe($$self, xScale, value => $$invalidate(16, $xScale = value));
    	component_subscribe($$self, yScale, value => $$invalidate(14, $yScale = value));
    	component_subscribe($$self, xRange, value => $$invalidate(15, $xRange = value));
    	component_subscribe($$self, yRange, value => $$invalidate(13, $yRange = value));
    	component_subscribe($$self, z, value => $$invalidate(4, $z = value));
    	component_subscribe($$self, zGet, value => $$invalidate(3, $zGet = value));

    	/* --------------------------------------------
     * Title case the first letter
     */
    	const cap = val => val.replace(/^\w/, d => d.toUpperCase());

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$xScale, $xRange*/ 98304) {
    			/* --------------------------------------------
     * Put the label on the highest value
     */
    			// $: left = values => $xScale(max(values, $x)) /  Math.max(...$xRange);
    			// $: top = values => $yScale(max(values, $y)) / Math.max(...$yRange);
    			$$invalidate(1, left = values => $xScale(values.slice(-1)[0].Date) / Math.max(...$xRange));
    		}

    		if ($$self.$$.dirty & /*$yScale, $yRange*/ 24576) {
    			$$invalidate(0, top = values => $yScale(values.slice(-1)[0].value) / Math.max(...$yRange));
    		}
    	};

    	return [
    		top,
    		left,
    		$data,
    		$zGet,
    		$z,
    		data,
    		xScale,
    		yScale,
    		xRange,
    		yRange,
    		z,
    		zGet,
    		cap,
    		$yRange,
    		$yScale,
    		$xRange,
    		$xScale
    	];
    }

    class GroupLabels_html extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {}, add_css$4);
    	}
    }

    function tree_add(d) {
      const x = +this._x.call(null, d),
          y = +this._y.call(null, d);
      return add(this.cover(x, y), x, y, d);
    }

    function add(tree, x, y, d) {
      if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

      var parent,
          node = tree._root,
          leaf = {data: d},
          x0 = tree._x0,
          y0 = tree._y0,
          x1 = tree._x1,
          y1 = tree._y1,
          xm,
          ym,
          xp,
          yp,
          right,
          bottom,
          i,
          j;

      // If the tree is empty, initialize the root as a leaf.
      if (!node) return tree._root = leaf, tree;

      // Find the existing leaf for the new point, or add it.
      while (node.length) {
        if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
        if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
        if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
      }

      // Is the new point is exactly coincident with the existing point?
      xp = +tree._x.call(null, node.data);
      yp = +tree._y.call(null, node.data);
      if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

      // Otherwise, split the leaf node until the old and new point are separated.
      do {
        parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
        if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
        if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
      } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
      return parent[j] = node, parent[i] = leaf, tree;
    }

    function addAll(data) {
      var d, i, n = data.length,
          x,
          y,
          xz = new Array(n),
          yz = new Array(n),
          x0 = Infinity,
          y0 = Infinity,
          x1 = -Infinity,
          y1 = -Infinity;

      // Compute the points and their extent.
      for (i = 0; i < n; ++i) {
        if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
        xz[i] = x;
        yz[i] = y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }

      // If there were no (valid) points, abort.
      if (x0 > x1 || y0 > y1) return this;

      // Expand the tree to cover the new points.
      this.cover(x0, y0).cover(x1, y1);

      // Add the new points.
      for (i = 0; i < n; ++i) {
        add(this, xz[i], yz[i], data[i]);
      }

      return this;
    }

    function tree_cover(x, y) {
      if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

      var x0 = this._x0,
          y0 = this._y0,
          x1 = this._x1,
          y1 = this._y1;

      // If the quadtree has no extent, initialize them.
      // Integer extent are necessary so that if we later double the extent,
      // the existing quadrant boundaries don’t change due to floating point error!
      if (isNaN(x0)) {
        x1 = (x0 = Math.floor(x)) + 1;
        y1 = (y0 = Math.floor(y)) + 1;
      }

      // Otherwise, double repeatedly to cover.
      else {
        var z = x1 - x0 || 1,
            node = this._root,
            parent,
            i;

        while (x0 > x || x >= x1 || y0 > y || y >= y1) {
          i = (y < y0) << 1 | (x < x0);
          parent = new Array(4), parent[i] = node, node = parent, z *= 2;
          switch (i) {
            case 0: x1 = x0 + z, y1 = y0 + z; break;
            case 1: x0 = x1 - z, y1 = y0 + z; break;
            case 2: x1 = x0 + z, y0 = y1 - z; break;
            case 3: x0 = x1 - z, y0 = y1 - z; break;
          }
        }

        if (this._root && this._root.length) this._root = node;
      }

      this._x0 = x0;
      this._y0 = y0;
      this._x1 = x1;
      this._y1 = y1;
      return this;
    }

    function tree_data() {
      var data = [];
      this.visit(function(node) {
        if (!node.length) do data.push(node.data); while (node = node.next)
      });
      return data;
    }

    function tree_extent(_) {
      return arguments.length
          ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
          : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
    }

    function Quad(node, x0, y0, x1, y1) {
      this.node = node;
      this.x0 = x0;
      this.y0 = y0;
      this.x1 = x1;
      this.y1 = y1;
    }

    function tree_find(x, y, radius) {
      var data,
          x0 = this._x0,
          y0 = this._y0,
          x1,
          y1,
          x2,
          y2,
          x3 = this._x1,
          y3 = this._y1,
          quads = [],
          node = this._root,
          q,
          i;

      if (node) quads.push(new Quad(node, x0, y0, x3, y3));
      if (radius == null) radius = Infinity;
      else {
        x0 = x - radius, y0 = y - radius;
        x3 = x + radius, y3 = y + radius;
        radius *= radius;
      }

      while (q = quads.pop()) {

        // Stop searching if this quadrant can’t contain a closer node.
        if (!(node = q.node)
            || (x1 = q.x0) > x3
            || (y1 = q.y0) > y3
            || (x2 = q.x1) < x0
            || (y2 = q.y1) < y0) continue;

        // Bisect the current quadrant.
        if (node.length) {
          var xm = (x1 + x2) / 2,
              ym = (y1 + y2) / 2;

          quads.push(
            new Quad(node[3], xm, ym, x2, y2),
            new Quad(node[2], x1, ym, xm, y2),
            new Quad(node[1], xm, y1, x2, ym),
            new Quad(node[0], x1, y1, xm, ym)
          );

          // Visit the closest quadrant first.
          if (i = (y >= ym) << 1 | (x >= xm)) {
            q = quads[quads.length - 1];
            quads[quads.length - 1] = quads[quads.length - 1 - i];
            quads[quads.length - 1 - i] = q;
          }
        }

        // Visit this point. (Visiting coincident points isn’t necessary!)
        else {
          var dx = x - +this._x.call(null, node.data),
              dy = y - +this._y.call(null, node.data),
              d2 = dx * dx + dy * dy;
          if (d2 < radius) {
            var d = Math.sqrt(radius = d2);
            x0 = x - d, y0 = y - d;
            x3 = x + d, y3 = y + d;
            data = node.data;
          }
        }
      }

      return data;
    }

    function tree_remove(d) {
      if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

      var parent,
          node = this._root,
          retainer,
          previous,
          next,
          x0 = this._x0,
          y0 = this._y0,
          x1 = this._x1,
          y1 = this._y1,
          x,
          y,
          xm,
          ym,
          right,
          bottom,
          i,
          j;

      // If the tree is empty, initialize the root as a leaf.
      if (!node) return this;

      // Find the leaf node for the point.
      // While descending, also retain the deepest parent with a non-removed sibling.
      if (node.length) while (true) {
        if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
        if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
        if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
        if (!node.length) break;
        if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
      }

      // Find the point to remove.
      while (node.data !== d) if (!(previous = node, node = node.next)) return this;
      if (next = node.next) delete node.next;

      // If there are multiple coincident points, remove just the point.
      if (previous) return (next ? previous.next = next : delete previous.next), this;

      // If this is the root point, remove it.
      if (!parent) return this._root = next, this;

      // Remove this leaf.
      next ? parent[i] = next : delete parent[i];

      // If the parent now contains exactly one leaf, collapse superfluous parents.
      if ((node = parent[0] || parent[1] || parent[2] || parent[3])
          && node === (parent[3] || parent[2] || parent[1] || parent[0])
          && !node.length) {
        if (retainer) retainer[j] = node;
        else this._root = node;
      }

      return this;
    }

    function removeAll(data) {
      for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
      return this;
    }

    function tree_root() {
      return this._root;
    }

    function tree_size() {
      var size = 0;
      this.visit(function(node) {
        if (!node.length) do ++size; while (node = node.next)
      });
      return size;
    }

    function tree_visit(callback) {
      var quads = [], q, node = this._root, child, x0, y0, x1, y1;
      if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
      while (q = quads.pop()) {
        if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
          var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
          if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
          if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
          if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
          if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
        }
      }
      return this;
    }

    function tree_visitAfter(callback) {
      var quads = [], next = [], q;
      if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
      while (q = quads.pop()) {
        var node = q.node;
        if (node.length) {
          var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
          if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
          if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
          if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
          if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
        }
        next.push(q);
      }
      while (q = next.pop()) {
        callback(q.node, q.x0, q.y0, q.x1, q.y1);
      }
      return this;
    }

    function defaultX(d) {
      return d[0];
    }

    function tree_x(_) {
      return arguments.length ? (this._x = _, this) : this._x;
    }

    function defaultY(d) {
      return d[1];
    }

    function tree_y(_) {
      return arguments.length ? (this._y = _, this) : this._y;
    }

    function quadtree(nodes, x, y) {
      var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
      return nodes == null ? tree : tree.addAll(nodes);
    }

    function Quadtree(x, y, x0, y0, x1, y1) {
      this._x = x;
      this._y = y;
      this._x0 = x0;
      this._y0 = y0;
      this._x1 = x1;
      this._y1 = y1;
      this._root = undefined;
    }

    function leaf_copy(leaf) {
      var copy = {data: leaf.data}, next = copy;
      while (leaf = leaf.next) next = next.next = {data: leaf.data};
      return copy;
    }

    var treeProto = quadtree.prototype = Quadtree.prototype;

    treeProto.copy = function() {
      var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
          node = this._root,
          nodes,
          child;

      if (!node) return copy;

      if (!node.length) return copy._root = leaf_copy(node), copy;

      nodes = [{source: node, target: copy._root = new Array(4)}];
      while (node = nodes.pop()) {
        for (var i = 0; i < 4; ++i) {
          if (child = node.source[i]) {
            if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
            else node.target[i] = leaf_copy(child);
          }
        }
      }

      return copy;
    };

    treeProto.add = tree_add;
    treeProto.addAll = addAll;
    treeProto.cover = tree_cover;
    treeProto.data = tree_data;
    treeProto.extent = tree_extent;
    treeProto.find = tree_find;
    treeProto.remove = tree_remove;
    treeProto.removeAll = removeAll;
    treeProto.root = tree_root;
    treeProto.size = tree_size;
    treeProto.visit = tree_visit;
    treeProto.visitAfter = tree_visitAfter;
    treeProto.x = tree_x;
    treeProto.y = tree_y;

    /* src/routes/scrollygraph/_compotents/QuadTree.html.svelte generated by Svelte v3.59.2 */

    function add_css$3(target) {
    	append_styles(target, "svelte-1kz3ofa", ".bg.svelte-1kz3ofa{position:absolute;top:0;right:0;bottom:0;left:0}");
    }

    const get_default_slot_changes = dirty => ({
    	x: dirty & /*xGetter, found*/ 10,
    	y: dirty & /*yGetter, found*/ 9,
    	found: dirty & /*found*/ 8,
    	visible: dirty & /*visible*/ 4,
    	e: dirty & /*e*/ 16
    });

    const get_default_slot_context = ctx => ({
    	x: /*xGetter*/ ctx[1](/*found*/ ctx[3]) || 0,
    	y: /*yGetter*/ ctx[0](/*found*/ ctx[3]) || 0,
    	found: /*found*/ ctx[3],
    	visible: /*visible*/ ctx[2],
    	e: /*e*/ ctx[4]
    });

    function create_fragment$4(ctx) {
    	let div;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[21].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[20], get_default_slot_context);

    	return {
    		c() {
    			div = element("div");
    			t = space();
    			if (default_slot) default_slot.c();
    			attr(div, "class", "bg svelte-1kz3ofa");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div, "mousemove", /*findItem*/ ctx[10]),
    					listen(div, "mouseout", /*mouseout_handler*/ ctx[22]),
    					listen(div, "blur", /*blur_handler*/ ctx[23])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, xGetter, found, yGetter, visible, e*/ 1048607)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[20],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[20])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[20], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let xGetter;
    	let yGetter;
    	let finder;
    	let $data;
    	let $height;
    	let $width;
    	let $xGet;
    	let $yGet;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const { data, xGet, yGet, width, height } = getContext('LayerCake');
    	component_subscribe($$self, data, value => $$invalidate(15, $data = value));
    	component_subscribe($$self, xGet, value => $$invalidate(18, $xGet = value));
    	component_subscribe($$self, yGet, value => $$invalidate(19, $yGet = value));
    	component_subscribe($$self, width, value => $$invalidate(17, $width = value));
    	component_subscribe($$self, height, value => $$invalidate(16, $height = value));
    	let visible = false;
    	let found = {};
    	let e = {};
    	let { x = 'x' } = $$props;
    	let { y = 'y' } = $$props;
    	let { searchRadius = undefined } = $$props;
    	let { dataset = undefined } = $$props;

    	function findItem(evt) {
    		$$invalidate(4, e = evt);
    		const xLayerKey = `layer${x.toUpperCase()}`;
    		const yLayerKey = `layer${y.toUpperCase()}`;
    		$$invalidate(3, found = finder.find(evt[xLayerKey], evt[yLayerKey], searchRadius) || {});
    		$$invalidate(2, visible = Object.keys(found).length > 0);
    	}

    	const mouseout_handler = () => $$invalidate(2, visible = false);
    	const blur_handler = () => $$invalidate(2, visible = false);

    	$$self.$$set = $$props => {
    		if ('x' in $$props) $$invalidate(11, x = $$props.x);
    		if ('y' in $$props) $$invalidate(12, y = $$props.y);
    		if ('searchRadius' in $$props) $$invalidate(13, searchRadius = $$props.searchRadius);
    		if ('dataset' in $$props) $$invalidate(14, dataset = $$props.dataset);
    		if ('$$scope' in $$props) $$invalidate(20, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*x, $xGet, $yGet*/ 788480) {
    			$$invalidate(1, xGetter = x === 'x' ? $xGet : $yGet);
    		}

    		if ($$self.$$.dirty & /*y, $yGet, $xGet*/ 790528) {
    			$$invalidate(0, yGetter = y === 'y' ? $yGet : $xGet);
    		}

    		if ($$self.$$.dirty & /*$width, $height, xGetter, yGetter, dataset, $data*/ 245763) {
    			finder = quadtree().extent([[-1, -1], [$width + 1, $height + 1]]).x(xGetter).y(yGetter).addAll(dataset || $data);
    		}
    	};

    	return [
    		yGetter,
    		xGetter,
    		visible,
    		found,
    		e,
    		data,
    		xGet,
    		yGet,
    		width,
    		height,
    		findItem,
    		x,
    		y,
    		searchRadius,
    		dataset,
    		$data,
    		$height,
    		$width,
    		$xGet,
    		$yGet,
    		$$scope,
    		slots,
    		mouseout_handler,
    		blur_handler
    	];
    }

    class QuadTree_html extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{
    				x: 11,
    				y: 12,
    				searchRadius: 13,
    				dataset: 14
    			},
    			add_css$3
    		);
    	}
    }

    /* src/routes/scrollygraph/_compotents/SharedTooltip.html.svelte generated by Svelte v3.59.2 */

    function add_css$2(target) {
    	append_styles(target, "svelte-tabgeo", ".tooltip-but-cool.svelte-tabgeo{position:absolute;font-size:14px;pointer-events:none;transform:translate(-50%, -95%);z-index:15;pointer-events:none;text-shadow:1px 1px 0 #fff,\n            -1px 1px 0 #fff,\n            2px 0 0 #fff,\n            -2px 0 0 #fff}.data.svelte-tabgeo{transform:translate(-50%, -100%);width:50px}.point.svelte-tabgeo{position:absolute;pointer-events:none;transform:translate(-50%, -50%);z-index:15;pointer-events:none;width:8px;height:8px;background-color:black;border-radius:50%;transition:left 250ms ease-out, top 250ms ease-out}");
    }

    // (112:0) {#if visible === true}
    function create_if_block$2(ctx) {
    	let div0;
    	let t0_value = /*formatValue*/ ctx[1](/*found*/ ctx[21].value) + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let div2;
    	let t3_value = /*formatTitle*/ ctx[0](/*found*/ ctx[21].Date) + "";
    	let t3;
    	let t4;
    	let div3;

    	return {
    		c() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div2 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			div3 = element("div");
    			attr(div0, "class", "tooltip-but-cool data svelte-tabgeo");
    			set_style(div0, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			set_style(div0, "top", /*y*/ ctx[19] + "px");
    			set_style(div0, "left", Math.min(Math.max(22, /*x*/ ctx[18] + 14), /*$width*/ ctx[3]) + "px");
    			set_style(div0, "z-index", "100");
    			attr(div1, "class", "tooltip-but-cool svelte-tabgeo");
    			set_style(div1, "width", "1.5px");
    			set_style(div1, "height", "6px");
    			set_style(div1, "background-color", "#aaa");
    			set_style(div1, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			set_style(div1, "top", /*$yScale*/ ctx[4](0) + "px");
    			set_style(div1, "left", /*x*/ ctx[18] + "px");
    			attr(div2, "class", "tooltip-but-cool svelte-tabgeo");
    			set_style(div2, "width", w + "px");
    			set_style(div2, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			set_style(div2, "top", /*$yScale*/ ctx[4](0) + "px");
    			set_style(div2, "left", Math.min(Math.max(/*w2*/ ctx[9], /*x*/ ctx[18] + 5), /*$width*/ ctx[3] - /*w2*/ ctx[9]) + "px");
    			attr(div3, "class", "point svelte-tabgeo");
    			set_style(div3, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			set_style(div3, "top", /*y*/ ctx[19] + "px");
    			set_style(div3, "left", /*x*/ ctx[18] + "px");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, t0);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			insert(target, t2, anchor);
    			insert(target, div2, anchor);
    			append(div2, t3);
    			insert(target, t4, anchor);
    			insert(target, div3, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*formatValue, found*/ 2097154 && t0_value !== (t0_value = /*formatValue*/ ctx[1](/*found*/ ctx[21].value) + "")) set_data(t0, t0_value);

    			if (dirty & /*visible*/ 1048576) {
    				set_style(div0, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			}

    			if (dirty & /*y*/ 524288) {
    				set_style(div0, "top", /*y*/ ctx[19] + "px");
    			}

    			if (dirty & /*x, $width*/ 262152) {
    				set_style(div0, "left", Math.min(Math.max(22, /*x*/ ctx[18] + 14), /*$width*/ ctx[3]) + "px");
    			}

    			if (dirty & /*visible*/ 1048576) {
    				set_style(div1, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			}

    			if (dirty & /*$yScale*/ 16) {
    				set_style(div1, "top", /*$yScale*/ ctx[4](0) + "px");
    			}

    			if (dirty & /*x*/ 262144) {
    				set_style(div1, "left", /*x*/ ctx[18] + "px");
    			}

    			if (dirty & /*formatTitle, found*/ 2097153 && t3_value !== (t3_value = /*formatTitle*/ ctx[0](/*found*/ ctx[21].Date) + "")) set_data(t3, t3_value);

    			if (dirty & /*visible*/ 1048576) {
    				set_style(div2, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			}

    			if (dirty & /*$yScale*/ 16) {
    				set_style(div2, "top", /*$yScale*/ ctx[4](0) + "px");
    			}

    			if (dirty & /*x, $width*/ 262152) {
    				set_style(div2, "left", Math.min(Math.max(/*w2*/ ctx[9], /*x*/ ctx[18] + 5), /*$width*/ ctx[3] - /*w2*/ ctx[9]) + "px");
    			}

    			if (dirty & /*visible*/ 1048576) {
    				set_style(div3, "display", /*visible*/ ctx[20] ? 'block' : 'none');
    			}

    			if (dirty & /*y*/ 524288) {
    				set_style(div3, "top", /*y*/ ctx[19] + "px");
    			}

    			if (dirty & /*x*/ 262144) {
    				set_style(div3, "left", /*x*/ ctx[18] + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);
    			if (detaching) detach(t2);
    			if (detaching) detach(div2);
    			if (detaching) detach(t4);
    			if (detaching) detach(div3);
    		}
    	};
    }

    // (102:0) <QuadTree   dataset={$data.flatMap(obj => obj.values)}   y = "y"   searchRadius = 500   let:x   let:y   let:visible   let:found   let:e >
    function create_default_slot$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*visible*/ ctx[20] === true && create_if_block$2(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*visible*/ ctx[20] === true) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let quadtree;
    	let current;

    	quadtree = new QuadTree_html({
    			props: {
    				dataset: /*$data*/ ctx[2].flatMap(func),
    				y: "y",
    				searchRadius: "500",
    				$$slots: {
    					default: [
    						create_default_slot$1,
    						({ x, y, visible, found, e }) => ({
    							18: x,
    							19: y,
    							20: visible,
    							21: found,
    							22: e
    						}),
    						({ x, y, visible, found, e }) => (x ? 262144 : 0) | (y ? 524288 : 0) | (visible ? 1048576 : 0) | (found ? 2097152 : 0) | (e ? 4194304 : 0)
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(quadtree.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(quadtree, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const quadtree_changes = {};
    			if (dirty & /*$data*/ 4) quadtree_changes.dataset = /*$data*/ ctx[2].flatMap(func);

    			if (dirty & /*$$scope, visible, y, x, $yScale, $width, formatTitle, found, formatValue*/ 12320795) {
    				quadtree_changes.$$scope = { dirty, ctx };
    			}

    			quadtree.$set(quadtree_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(quadtree.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(quadtree.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(quadtree, detaching);
    		}
    	};
    }

    const w = 35;
    const func = obj => obj.values;

    function instance$3($$self, $$props, $$invalidate) {
    	let $data;
    	let $width;
    	let $yScale;
    	const { data, width, yScale, config, zGet } = getContext('LayerCake');
    	component_subscribe($$self, data, value => $$invalidate(2, $data = value));
    	component_subscribe($$self, width, value => $$invalidate(3, $width = value));
    	component_subscribe($$self, yScale, value => $$invalidate(4, $yScale = value));
    	component_subscribe($$self, config, value => $$invalidate(13, value));
    	const commas = format(',');
    	const titleCase = d => d.replace(/^\w/, w => w.toUpperCase());
    	let { formatTitle = d => d } = $$props;
    	let { formatValue = d => isNaN(+d) ? d : commas(d) } = $$props;
    	let { formatKey = d => titleCase(d) } = $$props;
    	let { offset = -20 } = $$props;
    	let { dataset = undefined } = $$props;
    	const w2 = w / 2;

    	$$self.$$set = $$props => {
    		if ('formatTitle' in $$props) $$invalidate(0, formatTitle = $$props.formatTitle);
    		if ('formatValue' in $$props) $$invalidate(1, formatValue = $$props.formatValue);
    		if ('formatKey' in $$props) $$invalidate(10, formatKey = $$props.formatKey);
    		if ('offset' in $$props) $$invalidate(11, offset = $$props.offset);
    		if ('dataset' in $$props) $$invalidate(12, dataset = $$props.dataset);
    	};

    	return [
    		formatTitle,
    		formatValue,
    		$data,
    		$width,
    		$yScale,
    		data,
    		width,
    		yScale,
    		config,
    		w2,
    		formatKey,
    		offset,
    		dataset
    	];
    }

    class SharedTooltip_html extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				formatTitle: 0,
    				formatValue: 1,
    				formatKey: 10,
    				offset: 11,
    				dataset: 12
    			},
    			add_css$2
    		);
    	}
    }

    /* src/routes/scrollygraph/_compotents/RecessionBars.svelte generated by Svelte v3.59.2 */

    function add_css$1(target) {
    	append_styles(target, "svelte-usj2zs", "rect.svelte-usj2zs{fill:#666;fill-opacity:0.15}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (39:0) {#each dates as date}
    function create_each_block(ctx) {
    	let rect;
    	let rect_width_value;
    	let rect_height_value;
    	let rect_x_value;
    	let rect_y_value;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "width", rect_width_value = /*$xScale*/ ctx[0](/*date*/ ctx[6].end) - /*$xScale*/ ctx[0](/*date*/ ctx[6].start));
    			attr(rect, "height", rect_height_value = /*$yRange*/ ctx[1][0]);
    			attr(rect, "x", rect_x_value = /*$xScale*/ ctx[0](/*date*/ ctx[6].start));
    			attr(rect, "y", rect_y_value = /*$yRange*/ ctx[1][1]);
    			attr(rect, "class", "svelte-usj2zs");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$xScale*/ 1 && rect_width_value !== (rect_width_value = /*$xScale*/ ctx[0](/*date*/ ctx[6].end) - /*$xScale*/ ctx[0](/*date*/ ctx[6].start))) {
    				attr(rect, "width", rect_width_value);
    			}

    			if (dirty & /*$yRange*/ 2 && rect_height_value !== (rect_height_value = /*$yRange*/ ctx[1][0])) {
    				attr(rect, "height", rect_height_value);
    			}

    			if (dirty & /*$xScale*/ 1 && rect_x_value !== (rect_x_value = /*$xScale*/ ctx[0](/*date*/ ctx[6].start))) {
    				attr(rect, "x", rect_x_value);
    			}

    			if (dirty & /*$yRange*/ 2 && rect_y_value !== (rect_y_value = /*$yRange*/ ctx[1][1])) {
    				attr(rect, "y", rect_y_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let each_1_anchor;
    	let each_value = /*dates*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$xScale, dates, $yRange*/ 19) {
    				each_value = /*dates*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $xScale;
    	let $yRange;
    	const { xScale, yScale, yRange } = getContext('LayerCake');
    	component_subscribe($$self, xScale, value => $$invalidate(0, $xScale = value));
    	component_subscribe($$self, yRange, value => $$invalidate(1, $yRange = value));

    	const dates = [
    		{
    			start: new Date("2020-02-01"),
    			end: new Date("2020-04-01")
    		},
    		{
    			start: new Date("1980-01-01"),
    			end: new Date("1980-07-01")
    		},
    		{
    			start: new Date("1981-07-01"),
    			end: new Date("1982-11-01")
    		},
    		{
    			start: new Date("1990-07-01"),
    			end: new Date("1991-03-01")
    		},
    		{
    			start: new Date("2001-03-01"),
    			end: new Date("2001-11-01")
    		},
    		{
    			start: new Date("2007-12-01"),
    			end: new Date("2009-06-01")
    		}
    	];

    	return [$xScale, $yRange, xScale, yRange, dates];
    }

    class RecessionBars extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, add_css$1);
    	}
    }

    /* src/routes/scrollygraph/_compotents/LineChart.svelte generated by Svelte v3.59.2 */

    function add_css(target) {
    	append_styles(target, "svelte-zfj9ch", ".chart-container.svelte-zfj9ch.svelte-zfj9ch{width:100%;height:300px;z-index:10}.svelte-zfj9ch.svelte-zfj9ch{font-family:'Graphik Web', 'Helvetica Neue', Helvetica, Arial, sans-serif}.footnotes.svelte-zfj9ch.svelte-zfj9ch{font-size:12.5px;color:#666;display:flex;width:calc(100% - 20px);flex-direction:column;justify-content:space-between;padding:10px 0px}.footnotes.svelte-zfj9ch>div.svelte-zfj9ch{line-height:15px}.chart-title.svelte-zfj9ch.svelte-zfj9ch{font-size:20px}");
    }

    // (139:2) {#if title !== 'null'}
    function create_if_block_4(ctx) {
    	let h3;
    	let t;
    	let h3_resize_listener;

    	return {
    		c() {
    			h3 = element("h3");
    			t = text(/*title*/ ctx[1]);
    			attr(h3, "class", "chart-title svelte-zfj9ch");
    			set_style(h3, "text-align", /*title_position*/ ctx[10]);
    			add_render_callback(() => /*h3_elementresize_handler*/ ctx[19].call(h3));
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			append(h3, t);
    			h3_resize_listener = add_iframe_resize_listener(h3, /*h3_elementresize_handler*/ ctx[19].bind(h3));
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 2) set_data(t, /*title*/ ctx[1]);

    			if (dirty & /*title_position*/ 1024) {
    				set_style(h3, "text-align", /*title_position*/ ctx[10]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			h3_resize_listener();
    		}
    	};
    }

    // (154:6) {#if recessions}
    function create_if_block_3(ctx) {
    	let recessionbars;
    	let current;
    	recessionbars = new RecessionBars({});

    	return {
    		c() {
    			create_component(recessionbars.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(recessionbars, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(recessionbars.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(recessionbars.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(recessionbars, detaching);
    		}
    	};
    }

    // (153:4) <Svg>
    function create_default_slot_2(ctx) {
    	let t0;
    	let axisx;
    	let t1;
    	let axisy;
    	let t2;
    	let multiline;
    	let current;
    	let if_block = /*recessions*/ ctx[5] && create_if_block_3();

    	axisx = new AxisX({
    			props: {
    				gridlines: false,
    				ticks: /*xticks*/ ctx[17],
    				format: /*formatLabelX*/ ctx[15],
    				snapLabels: false,
    				tickMarks: true
    			}
    		});

    	axisy = new AxisY({
    			props: {
    				ticks: /*yticks*/ ctx[4],
    				format: /*formatLabelY*/ ctx[7],
    				labelPosition: 'above',
    				tickGutter: 5
    			}
    		});

    	multiline = new MultiLine({});

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t0 = space();
    			create_component(axisx.$$.fragment);
    			t1 = space();
    			create_component(axisy.$$.fragment);
    			t2 = space();
    			create_component(multiline.$$.fragment);
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t0, anchor);
    			mount_component(axisx, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(axisy, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(multiline, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*recessions*/ ctx[5]) {
    				if (if_block) {
    					if (dirty & /*recessions*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_3();
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const axisy_changes = {};
    			if (dirty & /*yticks*/ 16) axisy_changes.ticks = /*yticks*/ ctx[4];
    			if (dirty & /*formatLabelY*/ 128) axisy_changes.format = /*formatLabelY*/ ctx[7];
    			axisy.$set(axisy_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(axisx.$$.fragment, local);
    			transition_in(axisy.$$.fragment, local);
    			transition_in(multiline.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(axisx.$$.fragment, local);
    			transition_out(axisy.$$.fragment, local);
    			transition_out(multiline.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t0);
    			destroy_component(axisx, detaching);
    			if (detaching) detach(t1);
    			destroy_component(axisy, detaching);
    			if (detaching) detach(t2);
    			destroy_component(multiline, detaching);
    		}
    	};
    }

    // (173:6) {#if labels}
    function create_if_block_2(ctx) {
    	let labels_1;
    	let current;
    	labels_1 = new GroupLabels_html({});

    	return {
    		c() {
    			create_component(labels_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(labels_1, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(labels_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(labels_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(labels_1, detaching);
    		}
    	};
    }

    // (172:4) <Html>
    function create_default_slot_1(ctx) {
    	let t;
    	let sharedtooltip;
    	let current;
    	let if_block = /*labels*/ ctx[8] && create_if_block_2();

    	sharedtooltip = new SharedTooltip_html({
    			props: {
    				formatTitle: timeFormat('%Y'),
    				dataset: /*data*/ ctx[0],
    				formatValue: /*formatLabelY*/ ctx[7]
    			}
    		});

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			create_component(sharedtooltip.$$.fragment);
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);
    			mount_component(sharedtooltip, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*labels*/ ctx[8]) {
    				if (if_block) {
    					if (dirty & /*labels*/ 256) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2();
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const sharedtooltip_changes = {};
    			if (dirty & /*data*/ 1) sharedtooltip_changes.dataset = /*data*/ ctx[0];
    			if (dirty & /*formatLabelY*/ 128) sharedtooltip_changes.formatValue = /*formatLabelY*/ ctx[7];
    			sharedtooltip.$set(sharedtooltip_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(sharedtooltip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(sharedtooltip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			destroy_component(sharedtooltip, detaching);
    		}
    	};
    }

    // (142:2) <LayerCake     {padding}     x={xKey}     y={yKey}     z={zKey}     yDomain={yDomain}     zScale={scaleOrdinal()}     zRange={seriesColors}     flatData={flatten(groupedData, 'values')}     data={groupedData}   >
    function create_default_slot(ctx) {
    	let svg;
    	let t;
    	let html;
    	let current;

    	svg = new Svg({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	html = new Html({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(svg.$$.fragment);
    			t = space();
    			create_component(html.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(svg, target, anchor);
    			insert(target, t, anchor);
    			mount_component(html, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const svg_changes = {};

    			if (dirty & /*$$scope, yticks, formatLabelY, recessions*/ 16777392) {
    				svg_changes.$$scope = { dirty, ctx };
    			}

    			svg.$set(svg_changes);
    			const html_changes = {};

    			if (dirty & /*$$scope, data, formatLabelY, labels*/ 16777601) {
    				html_changes.$$scope = { dirty, ctx };
    			}

    			html.$set(html_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(svg.$$.fragment, local);
    			transition_in(html.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(svg.$$.fragment, local);
    			transition_out(html.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(svg, detaching);
    			if (detaching) detach(t);
    			destroy_component(html, detaching);
    		}
    	};
    }

    // (184:4) {#if source !== 'null'}
    function create_if_block_1(ctx) {
    	let div;
    	let t0;
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Source: ");
    			t1 = text(/*source*/ ctx[2]);
    			attr(div, "class", "svelte-zfj9ch");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*source*/ 4) set_data(t1, /*source*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (187:4) {#if notes !== 'null'}
    function create_if_block$1(ctx) {
    	let div;
    	let t0;
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Notes: ");
    			t1 = text(/*notes*/ ctx[3]);
    			attr(div, "class", "svelte-zfj9ch");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*notes*/ 8) set_data(t1, /*notes*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let t0;
    	let layercake;
    	let t1;
    	let div0;
    	let t2;
    	let div0_resize_listener;
    	let current;
    	let if_block0 = /*title*/ ctx[1] !== 'null' && create_if_block_4(ctx);

    	layercake = new LayerCake({
    			props: {
    				padding: /*padding*/ ctx[6],
    				x: xKey,
    				y: yKey,
    				z: zKey,
    				yDomain: /*yDomain*/ ctx[9],
    				zScale: ordinal(),
    				zRange: /*seriesColors*/ ctx[14],
    				flatData: flatten(/*groupedData*/ ctx[16], 'values'),
    				data: /*groupedData*/ ctx[16],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	let if_block1 = /*source*/ ctx[2] !== 'null' && create_if_block_1(ctx);
    	let if_block2 = /*notes*/ ctx[3] !== 'null' && create_if_block$1(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(layercake.$$.fragment);
    			t1 = space();
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			attr(div0, "class", "footnotes svelte-zfj9ch");
    			add_render_callback(() => /*div0_elementresize_handler*/ ctx[20].call(div0));
    			attr(div1, "class", "chart-container svelte-zfj9ch");
    			set_style(div1, "margin", /*margin*/ ctx[11].top + "px " + /*margin*/ ctx[11].right + "px " + (/*margin*/ ctx[11].bottom + /*footnote_height*/ ctx[12] + /*title_height*/ ctx[13]) + "px " + /*margin*/ ctx[11].left + "px");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t0);
    			mount_component(layercake, div1, null);
    			append(div1, t1);
    			append(div1, div0);
    			if (if_block1) if_block1.m(div0, null);
    			append(div0, t2);
    			if (if_block2) if_block2.m(div0, null);
    			div0_resize_listener = add_iframe_resize_listener(div0, /*div0_elementresize_handler*/ ctx[20].bind(div0));
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*title*/ ctx[1] !== 'null') {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			const layercake_changes = {};
    			if (dirty & /*padding*/ 64) layercake_changes.padding = /*padding*/ ctx[6];
    			if (dirty & /*yDomain*/ 512) layercake_changes.yDomain = /*yDomain*/ ctx[9];

    			if (dirty & /*$$scope, data, formatLabelY, labels, yticks, recessions*/ 16777649) {
    				layercake_changes.$$scope = { dirty, ctx };
    			}

    			layercake.$set(layercake_changes);

    			if (/*source*/ ctx[2] !== 'null') {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div0, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*notes*/ ctx[3] !== 'null') {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty & /*margin, footnote_height, title_height*/ 14336) {
    				set_style(div1, "margin", /*margin*/ ctx[11].top + "px " + /*margin*/ ctx[11].right + "px " + (/*margin*/ ctx[11].bottom + /*footnote_height*/ ctx[12] + /*title_height*/ ctx[13]) + "px " + /*margin*/ ctx[11].left + "px");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(layercake.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(layercake.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			destroy_component(layercake);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			div0_resize_listener();
    		}
    	};
    }

    const xKey = 'Date';
    const yKey = 'value';
    const zKey = 'place';

    function instance$1($$self, $$props, $$invalidate) {
    	let footnote_height = 0, title_height = 0;
    	let { data } = $$props;
    	let { title = 'null' } = $$props;
    	let { source = 'null' } = $$props;
    	let { notes = 'null' } = $$props;
    	let { xtick_settings = { 'start': 0, 'end': 100, 'jump': 1 } } = $$props;
    	let { yticks = 7 } = $$props;
    	let { recessions = false } = $$props;

    	let { padding = {
    		top: 20,
    		right: 120,
    		bottom: 20,
    		left: 45
    	} } = $$props;

    	let { formatLabelY = d => format(`.3~s`)(d).replace("G", "B").concat('%') } = $$props;
    	let { labels = true } = $$props;
    	let { yDomain = [null, null] } = $$props;
    	let { title_position = 'left' } = $$props;
    	let { margin = { top: 0, right: 0, bottom: 0, left: 0 } } = $$props;

    	data.forEach(x => {
    		x.Date = x.Date + 86400000;
    	});

    	const xKeyCast = timeParse('%Y');
    	const seriesNames = Object.keys(data[0]).filter(d => d !== xKey);

    	// const seriesColors = ['#ffe4b8', '#ffb3c0', '#ff7ac7', '#ff00cc'];
    	const seriesColors = [
    		"#B29C58",
    		"#1e4357",
    		// "#16242c",  // --co-bizj-blue-900
    		"#b9c9d5",
    		"#D4C48A",
    		// "#95aec1", // --co-bizj-blue-200
    		"#7597ae",
    		// "#517f9a", // --co-bizj-blue-400
    		"#256788"
    	]; // --co-bizj-blue-700
    	// --co-bizj-blue-100
    	// --co-bizj-blue-300
    	// --co-bizj-blue-500
    	// "#22546d", // --co-bizj-blue-600
    	// "#1e4357", // --co-bizj-blue-700
    	// "#1b3341", // --co-bizj-blue-800

    	/* --------------------------------------------
     * Cast values
     */
    	data.forEach(d => {
    		d[xKey] = typeof d[xKey] === 'string'
    		? xKeyCast(d[xKey])
    		: d[xKey];

    		seriesNames.forEach(name => {
    			d[name] = +d[name];
    		});
    	});

    	const formatLabelX = timeFormat('%Y');
    	const groupedData = groupLonger(data, seriesNames, { groupTo: zKey, valueTo: yKey });

    	// Function to create an array of dates from 2014 to 2023 with June 30th
    	function createDatesArray() {
    		const datesArray = [];

    		for (let year = xtick_settings.start; year <= xtick_settings.end; year = year + xtick_settings.jump) {
    			// Note: Months are zero-indexed in JavaScript, so June is represented as 5
    			const date = new Date(year - 1, 12, 1);

    			datesArray.push(date);
    		}

    		return datesArray;
    	}

    	// Call the function to create the dates array
    	const xticks = createDatesArray();

    	function h3_elementresize_handler() {
    		title_height = this.clientHeight;
    		$$invalidate(13, title_height);
    	}

    	function div0_elementresize_handler() {
    		footnote_height = this.clientHeight;
    		$$invalidate(12, footnote_height);
    	}

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('source' in $$props) $$invalidate(2, source = $$props.source);
    		if ('notes' in $$props) $$invalidate(3, notes = $$props.notes);
    		if ('xtick_settings' in $$props) $$invalidate(18, xtick_settings = $$props.xtick_settings);
    		if ('yticks' in $$props) $$invalidate(4, yticks = $$props.yticks);
    		if ('recessions' in $$props) $$invalidate(5, recessions = $$props.recessions);
    		if ('padding' in $$props) $$invalidate(6, padding = $$props.padding);
    		if ('formatLabelY' in $$props) $$invalidate(7, formatLabelY = $$props.formatLabelY);
    		if ('labels' in $$props) $$invalidate(8, labels = $$props.labels);
    		if ('yDomain' in $$props) $$invalidate(9, yDomain = $$props.yDomain);
    		if ('title_position' in $$props) $$invalidate(10, title_position = $$props.title_position);
    		if ('margin' in $$props) $$invalidate(11, margin = $$props.margin);
    	};

    	return [
    		data,
    		title,
    		source,
    		notes,
    		yticks,
    		recessions,
    		padding,
    		formatLabelY,
    		labels,
    		yDomain,
    		title_position,
    		margin,
    		footnote_height,
    		title_height,
    		seriesColors,
    		formatLabelX,
    		groupedData,
    		xticks,
    		xtick_settings,
    		h3_elementresize_handler,
    		div0_elementresize_handler
    	];
    }

    class LineChart extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				data: 0,
    				title: 1,
    				source: 2,
    				notes: 3,
    				xtick_settings: 18,
    				yticks: 4,
    				recessions: 5,
    				padding: 6,
    				formatLabelY: 7,
    				labels: 8,
    				yDomain: 9,
    				title_position: 10,
    				margin: 11
    			},
    			add_css
    		);
    	}
    }

    /* src/routes/scrollygraph/_each/PopChart.svelte generated by Svelte v3.59.2 */

    function create_if_block(ctx) {
    	let div;
    	let linechart;
    	let current;

    	linechart = new LineChart({
    			props: {
    				data: /*pop_data*/ ctx[0],
    				title: 'Population percent change, year-over-year',
    				source: "U.S. Census Bureau's Population Estimates (1980-2023)",
    				notes: 'Shaded areas show recessions',
    				recessions: true,
    				xtick_settings: { 'start': 1980, 'end': 2023, 'jump': 10 },
    				padding: { top: 20, right: 93, bottom: 20, left: 20 },
    				formatLabelY: /*func*/ ctx[1]
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(linechart.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(linechart, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const linechart_changes = {};
    			if (dirty & /*pop_data*/ 1) linechart_changes.data = /*pop_data*/ ctx[0];
    			linechart.$set(linechart_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(linechart.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(linechart.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(linechart);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*pop_data*/ ctx[0] && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*pop_data*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*pop_data*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let pop_data;

    	onMount(async () => {
    		$$invalidate(0, pop_data = await fetch("https://cdn.jsdelivr.net/gh/coleschnell/portfolio_website@latest/src/routes/scrollygraph/_assets/population_percent_change.json").then(d => d.json()));
    	});

    	const func = d => format(`.2`)(d).replace("G", "B").concat('%');
    	return [pop_data, func];
    }

    class PopChart extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    var div = document.createElement("div");
    var script = document.currentScript;
    script.parentNode.insertBefore(div, script);

    new PopChart({
      target: div,
      props: {},
    });

})();
