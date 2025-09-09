(function () {
    'use strict';

    function noop$1() { }
    const identity$4 = x => x;
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
            return noop$1;
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
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop$1;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append$1(target, node) {
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
        append$1(node.head || node, style);
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
        append$1(node, iframe);
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
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
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
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
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
            update: noop$1,
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
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop$1;
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

    // https://github.com/python/cpython/blob/a74eea238f5baba15797e2e8b570d153bc8690a7/Modules/mathmodule.c#L1423
    class Adder {
      constructor() {
        this._partials = new Float64Array(32);
        this._n = 0;
      }
      add(x) {
        const p = this._partials;
        let i = 0;
        for (let j = 0; j < this._n && j < 32; j++) {
          const y = p[j],
            hi = x + y,
            lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
          if (lo) p[i++] = lo;
          x = hi;
        }
        p[i] = x;
        this._n = i + 1;
        return this;
      }
      valueOf() {
        const p = this._partials;
        let n = this._n, x, y, lo, hi = 0;
        if (n > 0) {
          hi = p[--n];
          while (n > 0) {
            x = hi;
            y = p[--n];
            hi = x + y;
            lo = y - (hi - x);
            if (lo) break;
          }
          if (n > 0 && ((lo < 0 && p[n - 1] < 0) || (lo > 0 && p[n - 1] > 0))) {
            y = lo * 2;
            x = hi + y;
            if (y == x - hi) hi = x;
          }
        }
        return hi;
      }
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

    function* flatten(arrays) {
      for (const array of arrays) {
        yield* array;
      }
    }

    function merge(arrays) {
      return Array.from(flatten(arrays));
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

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb, extend(Color, {
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

    function basis(t1, v0, v1, v2, v3) {
      var t2 = t1 * t1, t3 = t2 * t1;
      return ((1 - 3 * t1 + 3 * t2 - t3) * v0
          + (4 - 6 * t2 + 3 * t3) * v1
          + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
          + t3 * v3) / 6;
    }

    function basis$1(values) {
      var n = values.length - 1;
      return function(t) {
        var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
            v1 = values[i],
            v2 = values[i + 1],
            v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
            v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
        return basis((t - i / n) * n, v0, v1, v2, v3);
      };
    }

    var constant = x => () => x;

    function linear(a, d) {
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
      return d ? linear(a, d) : constant(isNaN(a) ? b : a);
    }

    var interpolateRgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb$1(start, end) {
        var r = color((start = rgb(start)).r, (end = rgb(end)).r),
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

      rgb$1.gamma = rgbGamma;

      return rgb$1;
    })(1);

    function rgbSpline(spline) {
      return function(colors) {
        var n = colors.length,
            r = new Array(n),
            g = new Array(n),
            b = new Array(n),
            i, color;
        for (i = 0; i < n; ++i) {
          color = rgb(colors[i]);
          r[i] = color.r || 0;
          g[i] = color.g || 0;
          b[i] = color.b || 0;
        }
        r = spline(r);
        g = spline(g);
        b = spline(b);
        color.opacity = 1;
        return function(t) {
          color.r = r(t);
          color.g = g(t);
          color.b = b(t);
          return color + "";
        };
      };
    }

    var rgbBasis = rgbSpline(basis$1);

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

    function object$1(a, b) {
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

    function interpolateString(a, b) {
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
          : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
          : b instanceof color ? interpolateRgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object$1
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
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

    function identity$3(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity$3 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity$3 : formatNumerals(map.call(locale.numerals, String)),
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
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
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

    var epsilon = 1e-6;
    var epsilon2 = 1e-12;
    var pi = Math.PI;
    var halfPi = pi / 2;
    var quarterPi = pi / 4;
    var tau = pi * 2;

    var degrees = 180 / pi;
    var radians = pi / 180;

    var abs = Math.abs;
    var atan = Math.atan;
    var atan2 = Math.atan2;
    var cos = Math.cos;
    var sin = Math.sin;
    var sign = Math.sign || function(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; };
    var sqrt = Math.sqrt;

    function acos(x) {
      return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
    }

    function asin(x) {
      return x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);
    }

    function noop() {}

    function streamGeometry(geometry, stream) {
      if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
        streamGeometryType[geometry.type](geometry, stream);
      }
    }

    var streamObjectType = {
      Feature: function(object, stream) {
        streamGeometry(object.geometry, stream);
      },
      FeatureCollection: function(object, stream) {
        var features = object.features, i = -1, n = features.length;
        while (++i < n) streamGeometry(features[i].geometry, stream);
      }
    };

    var streamGeometryType = {
      Sphere: function(object, stream) {
        stream.sphere();
      },
      Point: function(object, stream) {
        object = object.coordinates;
        stream.point(object[0], object[1], object[2]);
      },
      MultiPoint: function(object, stream) {
        var coordinates = object.coordinates, i = -1, n = coordinates.length;
        while (++i < n) object = coordinates[i], stream.point(object[0], object[1], object[2]);
      },
      LineString: function(object, stream) {
        streamLine(object.coordinates, stream, 0);
      },
      MultiLineString: function(object, stream) {
        var coordinates = object.coordinates, i = -1, n = coordinates.length;
        while (++i < n) streamLine(coordinates[i], stream, 0);
      },
      Polygon: function(object, stream) {
        streamPolygon(object.coordinates, stream);
      },
      MultiPolygon: function(object, stream) {
        var coordinates = object.coordinates, i = -1, n = coordinates.length;
        while (++i < n) streamPolygon(coordinates[i], stream);
      },
      GeometryCollection: function(object, stream) {
        var geometries = object.geometries, i = -1, n = geometries.length;
        while (++i < n) streamGeometry(geometries[i], stream);
      }
    };

    function streamLine(coordinates, stream, closed) {
      var i = -1, n = coordinates.length - closed, coordinate;
      stream.lineStart();
      while (++i < n) coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
      stream.lineEnd();
    }

    function streamPolygon(coordinates, stream) {
      var i = -1, n = coordinates.length;
      stream.polygonStart();
      while (++i < n) streamLine(coordinates[i], stream, 1);
      stream.polygonEnd();
    }

    function geoStream(object, stream) {
      if (object && streamObjectType.hasOwnProperty(object.type)) {
        streamObjectType[object.type](object, stream);
      } else {
        streamGeometry(object, stream);
      }
    }

    function spherical(cartesian) {
      return [atan2(cartesian[1], cartesian[0]), asin(cartesian[2])];
    }

    function cartesian(spherical) {
      var lambda = spherical[0], phi = spherical[1], cosPhi = cos(phi);
      return [cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi)];
    }

    function cartesianDot(a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function cartesianCross(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    // TODO return a
    function cartesianAddInPlace(a, b) {
      a[0] += b[0], a[1] += b[1], a[2] += b[2];
    }

    function cartesianScale(vector, k) {
      return [vector[0] * k, vector[1] * k, vector[2] * k];
    }

    // TODO return d
    function cartesianNormalizeInPlace(d) {
      var l = sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      d[0] /= l, d[1] /= l, d[2] /= l;
    }

    function compose(a, b) {

      function compose(x, y) {
        return x = a(x, y), b(x[0], x[1]);
      }

      if (a.invert && b.invert) compose.invert = function(x, y) {
        return x = b.invert(x, y), x && a.invert(x[0], x[1]);
      };

      return compose;
    }

    function rotationIdentity(lambda, phi) {
      if (abs(lambda) > pi) lambda -= Math.round(lambda / tau) * tau;
      return [lambda, phi];
    }

    rotationIdentity.invert = rotationIdentity;

    function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
      return (deltaLambda %= tau) ? (deltaPhi || deltaGamma ? compose(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma))
        : rotationLambda(deltaLambda))
        : (deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma)
        : rotationIdentity);
    }

    function forwardRotationLambda(deltaLambda) {
      return function(lambda, phi) {
        lambda += deltaLambda;
        if (abs(lambda) > pi) lambda -= Math.round(lambda / tau) * tau;
        return [lambda, phi];
      };
    }

    function rotationLambda(deltaLambda) {
      var rotation = forwardRotationLambda(deltaLambda);
      rotation.invert = forwardRotationLambda(-deltaLambda);
      return rotation;
    }

    function rotationPhiGamma(deltaPhi, deltaGamma) {
      var cosDeltaPhi = cos(deltaPhi),
          sinDeltaPhi = sin(deltaPhi),
          cosDeltaGamma = cos(deltaGamma),
          sinDeltaGamma = sin(deltaGamma);

      function rotation(lambda, phi) {
        var cosPhi = cos(phi),
            x = cos(lambda) * cosPhi,
            y = sin(lambda) * cosPhi,
            z = sin(phi),
            k = z * cosDeltaPhi + x * sinDeltaPhi;
        return [
          atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
          asin(k * cosDeltaGamma + y * sinDeltaGamma)
        ];
      }

      rotation.invert = function(lambda, phi) {
        var cosPhi = cos(phi),
            x = cos(lambda) * cosPhi,
            y = sin(lambda) * cosPhi,
            z = sin(phi),
            k = z * cosDeltaGamma - y * sinDeltaGamma;
        return [
          atan2(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
          asin(k * cosDeltaPhi - x * sinDeltaPhi)
        ];
      };

      return rotation;
    }

    // Generates a circle centered at [0°, 0°], with a given radius and precision.
    function circleStream(stream, radius, delta, direction, t0, t1) {
      if (!delta) return;
      var cosRadius = cos(radius),
          sinRadius = sin(radius),
          step = direction * delta;
      if (t0 == null) {
        t0 = radius + direction * tau;
        t1 = radius - step / 2;
      } else {
        t0 = circleRadius(cosRadius, t0);
        t1 = circleRadius(cosRadius, t1);
        if (direction > 0 ? t0 < t1 : t0 > t1) t0 += direction * tau;
      }
      for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
        point = spherical([cosRadius, -sinRadius * cos(t), -sinRadius * sin(t)]);
        stream.point(point[0], point[1]);
      }
    }

    // Returns the signed angle of a cartesian point relative to [cosRadius, 0, 0].
    function circleRadius(cosRadius, point) {
      point = cartesian(point), point[0] -= cosRadius;
      cartesianNormalizeInPlace(point);
      var radius = acos(-point[1]);
      return ((-point[2] < 0 ? -radius : radius) + tau - epsilon) % tau;
    }

    function clipBuffer() {
      var lines = [],
          line;
      return {
        point: function(x, y, m) {
          line.push([x, y, m]);
        },
        lineStart: function() {
          lines.push(line = []);
        },
        lineEnd: noop,
        rejoin: function() {
          if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
        },
        result: function() {
          var result = lines;
          lines = [];
          line = null;
          return result;
        }
      };
    }

    function pointEqual(a, b) {
      return abs(a[0] - b[0]) < epsilon && abs(a[1] - b[1]) < epsilon;
    }

    function Intersection(point, points, other, entry) {
      this.x = point;
      this.z = points;
      this.o = other; // another intersection
      this.e = entry; // is an entry?
      this.v = false; // visited
      this.n = this.p = null; // next & previous
    }

    // A generalized polygon clipping algorithm: given a polygon that has been cut
    // into its visible line segments, and rejoins the segments by interpolating
    // along the clip edge.
    function clipRejoin(segments, compareIntersection, startInside, interpolate, stream) {
      var subject = [],
          clip = [],
          i,
          n;

      segments.forEach(function(segment) {
        if ((n = segment.length - 1) <= 0) return;
        var n, p0 = segment[0], p1 = segment[n], x;

        if (pointEqual(p0, p1)) {
          if (!p0[2] && !p1[2]) {
            stream.lineStart();
            for (i = 0; i < n; ++i) stream.point((p0 = segment[i])[0], p0[1]);
            stream.lineEnd();
            return;
          }
          // handle degenerate cases by moving the point
          p1[0] += 2 * epsilon;
        }

        subject.push(x = new Intersection(p0, segment, null, true));
        clip.push(x.o = new Intersection(p0, null, x, false));
        subject.push(x = new Intersection(p1, segment, null, false));
        clip.push(x.o = new Intersection(p1, null, x, true));
      });

      if (!subject.length) return;

      clip.sort(compareIntersection);
      link(subject);
      link(clip);

      for (i = 0, n = clip.length; i < n; ++i) {
        clip[i].e = startInside = !startInside;
      }

      var start = subject[0],
          points,
          point;

      while (1) {
        // Find first unvisited intersection.
        var current = start,
            isSubject = true;
        while (current.v) if ((current = current.n) === start) return;
        points = current.z;
        stream.lineStart();
        do {
          current.v = current.o.v = true;
          if (current.e) {
            if (isSubject) {
              for (i = 0, n = points.length; i < n; ++i) stream.point((point = points[i])[0], point[1]);
            } else {
              interpolate(current.x, current.n.x, 1, stream);
            }
            current = current.n;
          } else {
            if (isSubject) {
              points = current.p.z;
              for (i = points.length - 1; i >= 0; --i) stream.point((point = points[i])[0], point[1]);
            } else {
              interpolate(current.x, current.p.x, -1, stream);
            }
            current = current.p;
          }
          current = current.o;
          points = current.z;
          isSubject = !isSubject;
        } while (!current.v);
        stream.lineEnd();
      }
    }

    function link(array) {
      if (!(n = array.length)) return;
      var n,
          i = 0,
          a = array[0],
          b;
      while (++i < n) {
        a.n = b = array[i];
        b.p = a;
        a = b;
      }
      a.n = b = array[0];
      b.p = a;
    }

    function longitude(point) {
      return abs(point[0]) <= pi ? point[0] : sign(point[0]) * ((abs(point[0]) + pi) % tau - pi);
    }

    function polygonContains(polygon, point) {
      var lambda = longitude(point),
          phi = point[1],
          sinPhi = sin(phi),
          normal = [sin(lambda), -cos(lambda), 0],
          angle = 0,
          winding = 0;

      var sum = new Adder();

      if (sinPhi === 1) phi = halfPi + epsilon;
      else if (sinPhi === -1) phi = -halfPi - epsilon;

      for (var i = 0, n = polygon.length; i < n; ++i) {
        if (!(m = (ring = polygon[i]).length)) continue;
        var ring,
            m,
            point0 = ring[m - 1],
            lambda0 = longitude(point0),
            phi0 = point0[1] / 2 + quarterPi,
            sinPhi0 = sin(phi0),
            cosPhi0 = cos(phi0);

        for (var j = 0; j < m; ++j, lambda0 = lambda1, sinPhi0 = sinPhi1, cosPhi0 = cosPhi1, point0 = point1) {
          var point1 = ring[j],
              lambda1 = longitude(point1),
              phi1 = point1[1] / 2 + quarterPi,
              sinPhi1 = sin(phi1),
              cosPhi1 = cos(phi1),
              delta = lambda1 - lambda0,
              sign = delta >= 0 ? 1 : -1,
              absDelta = sign * delta,
              antimeridian = absDelta > pi,
              k = sinPhi0 * sinPhi1;

          sum.add(atan2(k * sign * sin(absDelta), cosPhi0 * cosPhi1 + k * cos(absDelta)));
          angle += antimeridian ? delta + sign * tau : delta;

          // Are the longitudes either side of the point’s meridian (lambda),
          // and are the latitudes smaller than the parallel (phi)?
          if (antimeridian ^ lambda0 >= lambda ^ lambda1 >= lambda) {
            var arc = cartesianCross(cartesian(point0), cartesian(point1));
            cartesianNormalizeInPlace(arc);
            var intersection = cartesianCross(normal, arc);
            cartesianNormalizeInPlace(intersection);
            var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin(intersection[2]);
            if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
              winding += antimeridian ^ delta >= 0 ? 1 : -1;
            }
          }
        }
      }

      // First, determine whether the South pole is inside or outside:
      //
      // It is inside if:
      // * the polygon winds around it in a clockwise direction.
      // * the polygon does not (cumulatively) wind around it, but has a negative
      //   (counter-clockwise) area.
      //
      // Second, count the (signed) number of times a segment crosses a lambda
      // from the point to the South pole.  If it is zero, then the point is the
      // same side as the South pole.

      return (angle < -epsilon || angle < epsilon && sum < -epsilon2) ^ (winding & 1);
    }

    function clip(pointVisible, clipLine, interpolate, start) {
      return function(sink) {
        var line = clipLine(sink),
            ringBuffer = clipBuffer(),
            ringSink = clipLine(ringBuffer),
            polygonStarted = false,
            polygon,
            segments,
            ring;

        var clip = {
          point: point,
          lineStart: lineStart,
          lineEnd: lineEnd,
          polygonStart: function() {
            clip.point = pointRing;
            clip.lineStart = ringStart;
            clip.lineEnd = ringEnd;
            segments = [];
            polygon = [];
          },
          polygonEnd: function() {
            clip.point = point;
            clip.lineStart = lineStart;
            clip.lineEnd = lineEnd;
            segments = merge(segments);
            var startInside = polygonContains(polygon, start);
            if (segments.length) {
              if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
              clipRejoin(segments, compareIntersection, startInside, interpolate, sink);
            } else if (startInside) {
              if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
              sink.lineStart();
              interpolate(null, null, 1, sink);
              sink.lineEnd();
            }
            if (polygonStarted) sink.polygonEnd(), polygonStarted = false;
            segments = polygon = null;
          },
          sphere: function() {
            sink.polygonStart();
            sink.lineStart();
            interpolate(null, null, 1, sink);
            sink.lineEnd();
            sink.polygonEnd();
          }
        };

        function point(lambda, phi) {
          if (pointVisible(lambda, phi)) sink.point(lambda, phi);
        }

        function pointLine(lambda, phi) {
          line.point(lambda, phi);
        }

        function lineStart() {
          clip.point = pointLine;
          line.lineStart();
        }

        function lineEnd() {
          clip.point = point;
          line.lineEnd();
        }

        function pointRing(lambda, phi) {
          ring.push([lambda, phi]);
          ringSink.point(lambda, phi);
        }

        function ringStart() {
          ringSink.lineStart();
          ring = [];
        }

        function ringEnd() {
          pointRing(ring[0][0], ring[0][1]);
          ringSink.lineEnd();

          var clean = ringSink.clean(),
              ringSegments = ringBuffer.result(),
              i, n = ringSegments.length, m,
              segment,
              point;

          ring.pop();
          polygon.push(ring);
          ring = null;

          if (!n) return;

          // No intersections.
          if (clean & 1) {
            segment = ringSegments[0];
            if ((m = segment.length - 1) > 0) {
              if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
              sink.lineStart();
              for (i = 0; i < m; ++i) sink.point((point = segment[i])[0], point[1]);
              sink.lineEnd();
            }
            return;
          }

          // Rejoin connected segments.
          // TODO reuse ringBuffer.rejoin()?
          if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));

          segments.push(ringSegments.filter(validSegment));
        }

        return clip;
      };
    }

    function validSegment(segment) {
      return segment.length > 1;
    }

    // Intersections are sorted along the clip edge. For both antimeridian cutting
    // and circle clipping, the same comparison is used.
    function compareIntersection(a, b) {
      return ((a = a.x)[0] < 0 ? a[1] - halfPi - epsilon : halfPi - a[1])
           - ((b = b.x)[0] < 0 ? b[1] - halfPi - epsilon : halfPi - b[1]);
    }

    var clipAntimeridian = clip(
      function() { return true; },
      clipAntimeridianLine,
      clipAntimeridianInterpolate,
      [-pi, -halfPi]
    );

    // Takes a line and cuts into visible segments. Return values: 0 - there were
    // intersections or the line was empty; 1 - no intersections; 2 - there were
    // intersections, and the first and last segments should be rejoined.
    function clipAntimeridianLine(stream) {
      var lambda0 = NaN,
          phi0 = NaN,
          sign0 = NaN,
          clean; // no intersections

      return {
        lineStart: function() {
          stream.lineStart();
          clean = 1;
        },
        point: function(lambda1, phi1) {
          var sign1 = lambda1 > 0 ? pi : -pi,
              delta = abs(lambda1 - lambda0);
          if (abs(delta - pi) < epsilon) { // line crosses a pole
            stream.point(lambda0, phi0 = (phi0 + phi1) / 2 > 0 ? halfPi : -halfPi);
            stream.point(sign0, phi0);
            stream.lineEnd();
            stream.lineStart();
            stream.point(sign1, phi0);
            stream.point(lambda1, phi0);
            clean = 0;
          } else if (sign0 !== sign1 && delta >= pi) { // line crosses antimeridian
            if (abs(lambda0 - sign0) < epsilon) lambda0 -= sign0 * epsilon; // handle degeneracies
            if (abs(lambda1 - sign1) < epsilon) lambda1 -= sign1 * epsilon;
            phi0 = clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1);
            stream.point(sign0, phi0);
            stream.lineEnd();
            stream.lineStart();
            stream.point(sign1, phi0);
            clean = 0;
          }
          stream.point(lambda0 = lambda1, phi0 = phi1);
          sign0 = sign1;
        },
        lineEnd: function() {
          stream.lineEnd();
          lambda0 = phi0 = NaN;
        },
        clean: function() {
          return 2 - clean; // if intersections, rejoin first and last segments
        }
      };
    }

    function clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1) {
      var cosPhi0,
          cosPhi1,
          sinLambda0Lambda1 = sin(lambda0 - lambda1);
      return abs(sinLambda0Lambda1) > epsilon
          ? atan((sin(phi0) * (cosPhi1 = cos(phi1)) * sin(lambda1)
              - sin(phi1) * (cosPhi0 = cos(phi0)) * sin(lambda0))
              / (cosPhi0 * cosPhi1 * sinLambda0Lambda1))
          : (phi0 + phi1) / 2;
    }

    function clipAntimeridianInterpolate(from, to, direction, stream) {
      var phi;
      if (from == null) {
        phi = direction * halfPi;
        stream.point(-pi, phi);
        stream.point(0, phi);
        stream.point(pi, phi);
        stream.point(pi, 0);
        stream.point(pi, -phi);
        stream.point(0, -phi);
        stream.point(-pi, -phi);
        stream.point(-pi, 0);
        stream.point(-pi, phi);
      } else if (abs(from[0] - to[0]) > epsilon) {
        var lambda = from[0] < to[0] ? pi : -pi;
        phi = direction * lambda / 2;
        stream.point(-lambda, phi);
        stream.point(0, phi);
        stream.point(lambda, phi);
      } else {
        stream.point(to[0], to[1]);
      }
    }

    function clipCircle(radius) {
      var cr = cos(radius),
          delta = 6 * radians,
          smallRadius = cr > 0,
          notHemisphere = abs(cr) > epsilon; // TODO optimise for this common case

      function interpolate(from, to, direction, stream) {
        circleStream(stream, radius, delta, direction, from, to);
      }

      function visible(lambda, phi) {
        return cos(lambda) * cos(phi) > cr;
      }

      // Takes a line and cuts into visible segments. Return values used for polygon
      // clipping: 0 - there were intersections or the line was empty; 1 - no
      // intersections 2 - there were intersections, and the first and last segments
      // should be rejoined.
      function clipLine(stream) {
        var point0, // previous point
            c0, // code for previous point
            v0, // visibility of previous point
            v00, // visibility of first point
            clean; // no intersections
        return {
          lineStart: function() {
            v00 = v0 = false;
            clean = 1;
          },
          point: function(lambda, phi) {
            var point1 = [lambda, phi],
                point2,
                v = visible(lambda, phi),
                c = smallRadius
                  ? v ? 0 : code(lambda, phi)
                  : v ? code(lambda + (lambda < 0 ? pi : -pi), phi) : 0;
            if (!point0 && (v00 = v0 = v)) stream.lineStart();
            if (v !== v0) {
              point2 = intersect(point0, point1);
              if (!point2 || pointEqual(point0, point2) || pointEqual(point1, point2))
                point1[2] = 1;
            }
            if (v !== v0) {
              clean = 0;
              if (v) {
                // outside going in
                stream.lineStart();
                point2 = intersect(point1, point0);
                stream.point(point2[0], point2[1]);
              } else {
                // inside going out
                point2 = intersect(point0, point1);
                stream.point(point2[0], point2[1], 2);
                stream.lineEnd();
              }
              point0 = point2;
            } else if (notHemisphere && point0 && smallRadius ^ v) {
              var t;
              // If the codes for two points are different, or are both zero,
              // and there this segment intersects with the small circle.
              if (!(c & c0) && (t = intersect(point1, point0, true))) {
                clean = 0;
                if (smallRadius) {
                  stream.lineStart();
                  stream.point(t[0][0], t[0][1]);
                  stream.point(t[1][0], t[1][1]);
                  stream.lineEnd();
                } else {
                  stream.point(t[1][0], t[1][1]);
                  stream.lineEnd();
                  stream.lineStart();
                  stream.point(t[0][0], t[0][1], 3);
                }
              }
            }
            if (v && (!point0 || !pointEqual(point0, point1))) {
              stream.point(point1[0], point1[1]);
            }
            point0 = point1, v0 = v, c0 = c;
          },
          lineEnd: function() {
            if (v0) stream.lineEnd();
            point0 = null;
          },
          // Rejoin first and last segments if there were intersections and the first
          // and last points were visible.
          clean: function() {
            return clean | ((v00 && v0) << 1);
          }
        };
      }

      // Intersects the great circle between a and b with the clip circle.
      function intersect(a, b, two) {
        var pa = cartesian(a),
            pb = cartesian(b);

        // We have two planes, n1.p = d1 and n2.p = d2.
        // Find intersection line p(t) = c1 n1 + c2 n2 + t (n1 ⨯ n2).
        var n1 = [1, 0, 0], // normal
            n2 = cartesianCross(pa, pb),
            n2n2 = cartesianDot(n2, n2),
            n1n2 = n2[0], // cartesianDot(n1, n2),
            determinant = n2n2 - n1n2 * n1n2;

        // Two polar points.
        if (!determinant) return !two && a;

        var c1 =  cr * n2n2 / determinant,
            c2 = -cr * n1n2 / determinant,
            n1xn2 = cartesianCross(n1, n2),
            A = cartesianScale(n1, c1),
            B = cartesianScale(n2, c2);
        cartesianAddInPlace(A, B);

        // Solve |p(t)|^2 = 1.
        var u = n1xn2,
            w = cartesianDot(A, u),
            uu = cartesianDot(u, u),
            t2 = w * w - uu * (cartesianDot(A, A) - 1);

        if (t2 < 0) return;

        var t = sqrt(t2),
            q = cartesianScale(u, (-w - t) / uu);
        cartesianAddInPlace(q, A);
        q = spherical(q);

        if (!two) return q;

        // Two intersection points.
        var lambda0 = a[0],
            lambda1 = b[0],
            phi0 = a[1],
            phi1 = b[1],
            z;

        if (lambda1 < lambda0) z = lambda0, lambda0 = lambda1, lambda1 = z;

        var delta = lambda1 - lambda0,
            polar = abs(delta - pi) < epsilon,
            meridian = polar || delta < epsilon;

        if (!polar && phi1 < phi0) z = phi0, phi0 = phi1, phi1 = z;

        // Check that the first point is between a and b.
        if (meridian
            ? polar
              ? phi0 + phi1 > 0 ^ q[1] < (abs(q[0] - lambda0) < epsilon ? phi0 : phi1)
              : phi0 <= q[1] && q[1] <= phi1
            : delta > pi ^ (lambda0 <= q[0] && q[0] <= lambda1)) {
          var q1 = cartesianScale(u, (-w + t) / uu);
          cartesianAddInPlace(q1, A);
          return [q, spherical(q1)];
        }
      }

      // Generates a 4-bit vector representing the location of a point relative to
      // the small circle's bounding box.
      function code(lambda, phi) {
        var r = smallRadius ? radius : pi - radius,
            code = 0;
        if (lambda < -r) code |= 1; // left
        else if (lambda > r) code |= 2; // right
        if (phi < -r) code |= 4; // below
        else if (phi > r) code |= 8; // above
        return code;
      }

      return clip(visible, clipLine, interpolate, smallRadius ? [0, -radius] : [-pi, radius - pi]);
    }

    function clipLine(a, b, x0, y0, x1, y1) {
      var ax = a[0],
          ay = a[1],
          bx = b[0],
          by = b[1],
          t0 = 0,
          t1 = 1,
          dx = bx - ax,
          dy = by - ay,
          r;

      r = x0 - ax;
      if (!dx && r > 0) return;
      r /= dx;
      if (dx < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dx > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }

      r = x1 - ax;
      if (!dx && r < 0) return;
      r /= dx;
      if (dx < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dx > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }

      r = y0 - ay;
      if (!dy && r > 0) return;
      r /= dy;
      if (dy < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dy > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }

      r = y1 - ay;
      if (!dy && r < 0) return;
      r /= dy;
      if (dy < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dy > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }

      if (t0 > 0) a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
      if (t1 < 1) b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
      return true;
    }

    var clipMax = 1e9, clipMin = -clipMax;

    // TODO Use d3-polygon’s polygonContains here for the ring check?
    // TODO Eliminate duplicate buffering in clipBuffer and polygon.push?

    function clipRectangle(x0, y0, x1, y1) {

      function visible(x, y) {
        return x0 <= x && x <= x1 && y0 <= y && y <= y1;
      }

      function interpolate(from, to, direction, stream) {
        var a = 0, a1 = 0;
        if (from == null
            || (a = corner(from, direction)) !== (a1 = corner(to, direction))
            || comparePoint(from, to) < 0 ^ direction > 0) {
          do stream.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
          while ((a = (a + direction + 4) % 4) !== a1);
        } else {
          stream.point(to[0], to[1]);
        }
      }

      function corner(p, direction) {
        return abs(p[0] - x0) < epsilon ? direction > 0 ? 0 : 3
            : abs(p[0] - x1) < epsilon ? direction > 0 ? 2 : 1
            : abs(p[1] - y0) < epsilon ? direction > 0 ? 1 : 0
            : direction > 0 ? 3 : 2; // abs(p[1] - y1) < epsilon
      }

      function compareIntersection(a, b) {
        return comparePoint(a.x, b.x);
      }

      function comparePoint(a, b) {
        var ca = corner(a, 1),
            cb = corner(b, 1);
        return ca !== cb ? ca - cb
            : ca === 0 ? b[1] - a[1]
            : ca === 1 ? a[0] - b[0]
            : ca === 2 ? a[1] - b[1]
            : b[0] - a[0];
      }

      return function(stream) {
        var activeStream = stream,
            bufferStream = clipBuffer(),
            segments,
            polygon,
            ring,
            x__, y__, v__, // first point
            x_, y_, v_, // previous point
            first,
            clean;

        var clipStream = {
          point: point,
          lineStart: lineStart,
          lineEnd: lineEnd,
          polygonStart: polygonStart,
          polygonEnd: polygonEnd
        };

        function point(x, y) {
          if (visible(x, y)) activeStream.point(x, y);
        }

        function polygonInside() {
          var winding = 0;

          for (var i = 0, n = polygon.length; i < n; ++i) {
            for (var ring = polygon[i], j = 1, m = ring.length, point = ring[0], a0, a1, b0 = point[0], b1 = point[1]; j < m; ++j) {
              a0 = b0, a1 = b1, point = ring[j], b0 = point[0], b1 = point[1];
              if (a1 <= y1) { if (b1 > y1 && (b0 - a0) * (y1 - a1) > (b1 - a1) * (x0 - a0)) ++winding; }
              else { if (b1 <= y1 && (b0 - a0) * (y1 - a1) < (b1 - a1) * (x0 - a0)) --winding; }
            }
          }

          return winding;
        }

        // Buffer geometry within a polygon and then clip it en masse.
        function polygonStart() {
          activeStream = bufferStream, segments = [], polygon = [], clean = true;
        }

        function polygonEnd() {
          var startInside = polygonInside(),
              cleanInside = clean && startInside,
              visible = (segments = merge(segments)).length;
          if (cleanInside || visible) {
            stream.polygonStart();
            if (cleanInside) {
              stream.lineStart();
              interpolate(null, null, 1, stream);
              stream.lineEnd();
            }
            if (visible) {
              clipRejoin(segments, compareIntersection, startInside, interpolate, stream);
            }
            stream.polygonEnd();
          }
          activeStream = stream, segments = polygon = ring = null;
        }

        function lineStart() {
          clipStream.point = linePoint;
          if (polygon) polygon.push(ring = []);
          first = true;
          v_ = false;
          x_ = y_ = NaN;
        }

        // TODO rather than special-case polygons, simply handle them separately.
        // Ideally, coincident intersection points should be jittered to avoid
        // clipping issues.
        function lineEnd() {
          if (segments) {
            linePoint(x__, y__);
            if (v__ && v_) bufferStream.rejoin();
            segments.push(bufferStream.result());
          }
          clipStream.point = point;
          if (v_) activeStream.lineEnd();
        }

        function linePoint(x, y) {
          var v = visible(x, y);
          if (polygon) ring.push([x, y]);
          if (first) {
            x__ = x, y__ = y, v__ = v;
            first = false;
            if (v) {
              activeStream.lineStart();
              activeStream.point(x, y);
            }
          } else {
            if (v && v_) activeStream.point(x, y);
            else {
              var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))],
                  b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
              if (clipLine(a, b, x0, y0, x1, y1)) {
                if (!v_) {
                  activeStream.lineStart();
                  activeStream.point(a[0], a[1]);
                }
                activeStream.point(b[0], b[1]);
                if (!v) activeStream.lineEnd();
                clean = false;
              } else if (v) {
                activeStream.lineStart();
                activeStream.point(x, y);
                clean = false;
              }
            }
          }
          x_ = x, y_ = y, v_ = v;
        }

        return clipStream;
      };
    }

    var identity$2 = x => x;

    var areaSum = new Adder(),
        areaRingSum = new Adder(),
        x00$2,
        y00$2,
        x0$3,
        y0$3;

    var areaStream = {
      point: noop,
      lineStart: noop,
      lineEnd: noop,
      polygonStart: function() {
        areaStream.lineStart = areaRingStart;
        areaStream.lineEnd = areaRingEnd;
      },
      polygonEnd: function() {
        areaStream.lineStart = areaStream.lineEnd = areaStream.point = noop;
        areaSum.add(abs(areaRingSum));
        areaRingSum = new Adder();
      },
      result: function() {
        var area = areaSum / 2;
        areaSum = new Adder();
        return area;
      }
    };

    function areaRingStart() {
      areaStream.point = areaPointFirst;
    }

    function areaPointFirst(x, y) {
      areaStream.point = areaPoint;
      x00$2 = x0$3 = x, y00$2 = y0$3 = y;
    }

    function areaPoint(x, y) {
      areaRingSum.add(y0$3 * x - x0$3 * y);
      x0$3 = x, y0$3 = y;
    }

    function areaRingEnd() {
      areaPoint(x00$2, y00$2);
    }

    var x0$2 = Infinity,
        y0$2 = x0$2,
        x1 = -x0$2,
        y1 = x1;

    var boundsStream = {
      point: boundsPoint,
      lineStart: noop,
      lineEnd: noop,
      polygonStart: noop,
      polygonEnd: noop,
      result: function() {
        var bounds = [[x0$2, y0$2], [x1, y1]];
        x1 = y1 = -(y0$2 = x0$2 = Infinity);
        return bounds;
      }
    };

    function boundsPoint(x, y) {
      if (x < x0$2) x0$2 = x;
      if (x > x1) x1 = x;
      if (y < y0$2) y0$2 = y;
      if (y > y1) y1 = y;
    }

    // TODO Enforce positive area for exterior, negative area for interior?

    var X0 = 0,
        Y0 = 0,
        Z0 = 0,
        X1 = 0,
        Y1 = 0,
        Z1 = 0,
        X2 = 0,
        Y2 = 0,
        Z2 = 0,
        x00$1,
        y00$1,
        x0$1,
        y0$1;

    var centroidStream = {
      point: centroidPoint,
      lineStart: centroidLineStart,
      lineEnd: centroidLineEnd,
      polygonStart: function() {
        centroidStream.lineStart = centroidRingStart;
        centroidStream.lineEnd = centroidRingEnd;
      },
      polygonEnd: function() {
        centroidStream.point = centroidPoint;
        centroidStream.lineStart = centroidLineStart;
        centroidStream.lineEnd = centroidLineEnd;
      },
      result: function() {
        var centroid = Z2 ? [X2 / Z2, Y2 / Z2]
            : Z1 ? [X1 / Z1, Y1 / Z1]
            : Z0 ? [X0 / Z0, Y0 / Z0]
            : [NaN, NaN];
        X0 = Y0 = Z0 =
        X1 = Y1 = Z1 =
        X2 = Y2 = Z2 = 0;
        return centroid;
      }
    };

    function centroidPoint(x, y) {
      X0 += x;
      Y0 += y;
      ++Z0;
    }

    function centroidLineStart() {
      centroidStream.point = centroidPointFirstLine;
    }

    function centroidPointFirstLine(x, y) {
      centroidStream.point = centroidPointLine;
      centroidPoint(x0$1 = x, y0$1 = y);
    }

    function centroidPointLine(x, y) {
      var dx = x - x0$1, dy = y - y0$1, z = sqrt(dx * dx + dy * dy);
      X1 += z * (x0$1 + x) / 2;
      Y1 += z * (y0$1 + y) / 2;
      Z1 += z;
      centroidPoint(x0$1 = x, y0$1 = y);
    }

    function centroidLineEnd() {
      centroidStream.point = centroidPoint;
    }

    function centroidRingStart() {
      centroidStream.point = centroidPointFirstRing;
    }

    function centroidRingEnd() {
      centroidPointRing(x00$1, y00$1);
    }

    function centroidPointFirstRing(x, y) {
      centroidStream.point = centroidPointRing;
      centroidPoint(x00$1 = x0$1 = x, y00$1 = y0$1 = y);
    }

    function centroidPointRing(x, y) {
      var dx = x - x0$1,
          dy = y - y0$1,
          z = sqrt(dx * dx + dy * dy);

      X1 += z * (x0$1 + x) / 2;
      Y1 += z * (y0$1 + y) / 2;
      Z1 += z;

      z = y0$1 * x - x0$1 * y;
      X2 += z * (x0$1 + x);
      Y2 += z * (y0$1 + y);
      Z2 += z * 3;
      centroidPoint(x0$1 = x, y0$1 = y);
    }

    function PathContext(context) {
      this._context = context;
    }

    PathContext.prototype = {
      _radius: 4.5,
      pointRadius: function(_) {
        return this._radius = _, this;
      },
      polygonStart: function() {
        this._line = 0;
      },
      polygonEnd: function() {
        this._line = NaN;
      },
      lineStart: function() {
        this._point = 0;
      },
      lineEnd: function() {
        if (this._line === 0) this._context.closePath();
        this._point = NaN;
      },
      point: function(x, y) {
        switch (this._point) {
          case 0: {
            this._context.moveTo(x, y);
            this._point = 1;
            break;
          }
          case 1: {
            this._context.lineTo(x, y);
            break;
          }
          default: {
            this._context.moveTo(x + this._radius, y);
            this._context.arc(x, y, this._radius, 0, tau);
            break;
          }
        }
      },
      result: noop
    };

    var lengthSum = new Adder(),
        lengthRing,
        x00,
        y00,
        x0,
        y0;

    var lengthStream = {
      point: noop,
      lineStart: function() {
        lengthStream.point = lengthPointFirst;
      },
      lineEnd: function() {
        if (lengthRing) lengthPoint(x00, y00);
        lengthStream.point = noop;
      },
      polygonStart: function() {
        lengthRing = true;
      },
      polygonEnd: function() {
        lengthRing = null;
      },
      result: function() {
        var length = +lengthSum;
        lengthSum = new Adder();
        return length;
      }
    };

    function lengthPointFirst(x, y) {
      lengthStream.point = lengthPoint;
      x00 = x0 = x, y00 = y0 = y;
    }

    function lengthPoint(x, y) {
      x0 -= x, y0 -= y;
      lengthSum.add(sqrt(x0 * x0 + y0 * y0));
      x0 = x, y0 = y;
    }

    // Simple caching for constant-radius points.
    let cacheDigits, cacheAppend, cacheRadius, cacheCircle;

    class PathString {
      constructor(digits) {
        this._append = digits == null ? append : appendRound(digits);
        this._radius = 4.5;
        this._ = "";
      }
      pointRadius(_) {
        this._radius = +_;
        return this;
      }
      polygonStart() {
        this._line = 0;
      }
      polygonEnd() {
        this._line = NaN;
      }
      lineStart() {
        this._point = 0;
      }
      lineEnd() {
        if (this._line === 0) this._ += "Z";
        this._point = NaN;
      }
      point(x, y) {
        switch (this._point) {
          case 0: {
            this._append`M${x},${y}`;
            this._point = 1;
            break;
          }
          case 1: {
            this._append`L${x},${y}`;
            break;
          }
          default: {
            this._append`M${x},${y}`;
            if (this._radius !== cacheRadius || this._append !== cacheAppend) {
              const r = this._radius;
              const s = this._;
              this._ = ""; // stash the old string so we can cache the circle path fragment
              this._append`m0,${r}a${r},${r} 0 1,1 0,${-2 * r}a${r},${r} 0 1,1 0,${2 * r}z`;
              cacheRadius = r;
              cacheAppend = this._append;
              cacheCircle = this._;
              this._ = s;
            }
            this._ += cacheCircle;
            break;
          }
        }
      }
      result() {
        const result = this._;
        this._ = "";
        return result.length ? result : null;
      }
    }

    function append(strings) {
      let i = 1;
      this._ += strings[0];
      for (const j = strings.length; i < j; ++i) {
        this._ += arguments[i] + strings[i];
      }
    }

    function appendRound(digits) {
      const d = Math.floor(digits);
      if (!(d >= 0)) throw new RangeError(`invalid digits: ${digits}`);
      if (d > 15) return append;
      if (d !== cacheDigits) {
        const k = 10 ** d;
        cacheDigits = d;
        cacheAppend = function append(strings) {
          let i = 1;
          this._ += strings[0];
          for (const j = strings.length; i < j; ++i) {
            this._ += Math.round(arguments[i] * k) / k + strings[i];
          }
        };
      }
      return cacheAppend;
    }

    function geoPath(projection, context) {
      let digits = 3,
          pointRadius = 4.5,
          projectionStream,
          contextStream;

      function path(object) {
        if (object) {
          if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
          geoStream(object, projectionStream(contextStream));
        }
        return contextStream.result();
      }

      path.area = function(object) {
        geoStream(object, projectionStream(areaStream));
        return areaStream.result();
      };

      path.measure = function(object) {
        geoStream(object, projectionStream(lengthStream));
        return lengthStream.result();
      };

      path.bounds = function(object) {
        geoStream(object, projectionStream(boundsStream));
        return boundsStream.result();
      };

      path.centroid = function(object) {
        geoStream(object, projectionStream(centroidStream));
        return centroidStream.result();
      };

      path.projection = function(_) {
        if (!arguments.length) return projection;
        projectionStream = _ == null ? (projection = null, identity$2) : (projection = _).stream;
        return path;
      };

      path.context = function(_) {
        if (!arguments.length) return context;
        contextStream = _ == null ? (context = null, new PathString(digits)) : new PathContext(context = _);
        if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
        return path;
      };

      path.pointRadius = function(_) {
        if (!arguments.length) return pointRadius;
        pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
        return path;
      };

      path.digits = function(_) {
        if (!arguments.length) return digits;
        if (_ == null) digits = null;
        else {
          const d = Math.floor(_);
          if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
          digits = d;
        }
        if (context === null) contextStream = new PathString(digits);
        return path;
      };

      return path.projection(projection).digits(digits).context(context);
    }

    function transformer$1(methods) {
      return function(stream) {
        var s = new TransformStream;
        for (var key in methods) s[key] = methods[key];
        s.stream = stream;
        return s;
      };
    }

    function TransformStream() {}

    TransformStream.prototype = {
      constructor: TransformStream,
      point: function(x, y) { this.stream.point(x, y); },
      sphere: function() { this.stream.sphere(); },
      lineStart: function() { this.stream.lineStart(); },
      lineEnd: function() { this.stream.lineEnd(); },
      polygonStart: function() { this.stream.polygonStart(); },
      polygonEnd: function() { this.stream.polygonEnd(); }
    };

    function fit(projection, fitBounds, object) {
      var clip = projection.clipExtent && projection.clipExtent();
      projection.scale(150).translate([0, 0]);
      if (clip != null) projection.clipExtent(null);
      geoStream(object, projection.stream(boundsStream));
      fitBounds(boundsStream.result());
      if (clip != null) projection.clipExtent(clip);
      return projection;
    }

    function fitExtent(projection, extent, object) {
      return fit(projection, function(b) {
        var w = extent[1][0] - extent[0][0],
            h = extent[1][1] - extent[0][1],
            k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])),
            x = +extent[0][0] + (w - k * (b[1][0] + b[0][0])) / 2,
            y = +extent[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;
        projection.scale(150 * k).translate([x, y]);
      }, object);
    }

    function fitSize(projection, size, object) {
      return fitExtent(projection, [[0, 0], size], object);
    }

    function fitWidth(projection, width, object) {
      return fit(projection, function(b) {
        var w = +width,
            k = w / (b[1][0] - b[0][0]),
            x = (w - k * (b[1][0] + b[0][0])) / 2,
            y = -k * b[0][1];
        projection.scale(150 * k).translate([x, y]);
      }, object);
    }

    function fitHeight(projection, height, object) {
      return fit(projection, function(b) {
        var h = +height,
            k = h / (b[1][1] - b[0][1]),
            x = -k * b[0][0],
            y = (h - k * (b[1][1] + b[0][1])) / 2;
        projection.scale(150 * k).translate([x, y]);
      }, object);
    }

    var maxDepth = 16, // maximum depth of subdivision
        cosMinDistance = cos(30 * radians); // cos(minimum angular distance)

    function resample(project, delta2) {
      return +delta2 ? resample$1(project, delta2) : resampleNone(project);
    }

    function resampleNone(project) {
      return transformer$1({
        point: function(x, y) {
          x = project(x, y);
          this.stream.point(x[0], x[1]);
        }
      });
    }

    function resample$1(project, delta2) {

      function resampleLineTo(x0, y0, lambda0, a0, b0, c0, x1, y1, lambda1, a1, b1, c1, depth, stream) {
        var dx = x1 - x0,
            dy = y1 - y0,
            d2 = dx * dx + dy * dy;
        if (d2 > 4 * delta2 && depth--) {
          var a = a0 + a1,
              b = b0 + b1,
              c = c0 + c1,
              m = sqrt(a * a + b * b + c * c),
              phi2 = asin(c /= m),
              lambda2 = abs(abs(c) - 1) < epsilon || abs(lambda0 - lambda1) < epsilon ? (lambda0 + lambda1) / 2 : atan2(b, a),
              p = project(lambda2, phi2),
              x2 = p[0],
              y2 = p[1],
              dx2 = x2 - x0,
              dy2 = y2 - y0,
              dz = dy * dx2 - dx * dy2;
          if (dz * dz / d2 > delta2 // perpendicular projected distance
              || abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 // midpoint close to an end
              || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) { // angular distance
            resampleLineTo(x0, y0, lambda0, a0, b0, c0, x2, y2, lambda2, a /= m, b /= m, c, depth, stream);
            stream.point(x2, y2);
            resampleLineTo(x2, y2, lambda2, a, b, c, x1, y1, lambda1, a1, b1, c1, depth, stream);
          }
        }
      }
      return function(stream) {
        var lambda00, x00, y00, a00, b00, c00, // first point
            lambda0, x0, y0, a0, b0, c0; // previous point

        var resampleStream = {
          point: point,
          lineStart: lineStart,
          lineEnd: lineEnd,
          polygonStart: function() { stream.polygonStart(); resampleStream.lineStart = ringStart; },
          polygonEnd: function() { stream.polygonEnd(); resampleStream.lineStart = lineStart; }
        };

        function point(x, y) {
          x = project(x, y);
          stream.point(x[0], x[1]);
        }

        function lineStart() {
          x0 = NaN;
          resampleStream.point = linePoint;
          stream.lineStart();
        }

        function linePoint(lambda, phi) {
          var c = cartesian([lambda, phi]), p = project(lambda, phi);
          resampleLineTo(x0, y0, lambda0, a0, b0, c0, x0 = p[0], y0 = p[1], lambda0 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
          stream.point(x0, y0);
        }

        function lineEnd() {
          resampleStream.point = point;
          stream.lineEnd();
        }

        function ringStart() {
          lineStart();
          resampleStream.point = ringPoint;
          resampleStream.lineEnd = ringEnd;
        }

        function ringPoint(lambda, phi) {
          linePoint(lambda00 = lambda, phi), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
          resampleStream.point = linePoint;
        }

        function ringEnd() {
          resampleLineTo(x0, y0, lambda0, a0, b0, c0, x00, y00, lambda00, a00, b00, c00, maxDepth, stream);
          resampleStream.lineEnd = lineEnd;
          lineEnd();
        }

        return resampleStream;
      };
    }

    var transformRadians = transformer$1({
      point: function(x, y) {
        this.stream.point(x * radians, y * radians);
      }
    });

    function transformRotate(rotate) {
      return transformer$1({
        point: function(x, y) {
          var r = rotate(x, y);
          return this.stream.point(r[0], r[1]);
        }
      });
    }

    function scaleTranslate(k, dx, dy, sx, sy) {
      function transform(x, y) {
        x *= sx; y *= sy;
        return [dx + k * x, dy - k * y];
      }
      transform.invert = function(x, y) {
        return [(x - dx) / k * sx, (dy - y) / k * sy];
      };
      return transform;
    }

    function scaleTranslateRotate(k, dx, dy, sx, sy, alpha) {
      if (!alpha) return scaleTranslate(k, dx, dy, sx, sy);
      var cosAlpha = cos(alpha),
          sinAlpha = sin(alpha),
          a = cosAlpha * k,
          b = sinAlpha * k,
          ai = cosAlpha / k,
          bi = sinAlpha / k,
          ci = (sinAlpha * dy - cosAlpha * dx) / k,
          fi = (sinAlpha * dx + cosAlpha * dy) / k;
      function transform(x, y) {
        x *= sx; y *= sy;
        return [a * x - b * y + dx, dy - b * x - a * y];
      }
      transform.invert = function(x, y) {
        return [sx * (ai * x - bi * y + ci), sy * (fi - bi * x - ai * y)];
      };
      return transform;
    }

    function projectionMutator(projectAt) {
      var project,
          k = 150, // scale
          x = 480, y = 250, // translate
          lambda = 0, phi = 0, // center
          deltaLambda = 0, deltaPhi = 0, deltaGamma = 0, rotate, // pre-rotate
          alpha = 0, // post-rotate angle
          sx = 1, // reflectX
          sy = 1, // reflectX
          theta = null, preclip = clipAntimeridian, // pre-clip angle
          x0 = null, y0, x1, y1, postclip = identity$2, // post-clip extent
          delta2 = 0.5, // precision
          projectResample,
          projectTransform,
          projectRotateTransform,
          cache,
          cacheStream;

      function projection(point) {
        return projectRotateTransform(point[0] * radians, point[1] * radians);
      }

      function invert(point) {
        point = projectRotateTransform.invert(point[0], point[1]);
        return point && [point[0] * degrees, point[1] * degrees];
      }

      projection.stream = function(stream) {
        return cache && cacheStream === stream ? cache : cache = transformRadians(transformRotate(rotate)(preclip(projectResample(postclip(cacheStream = stream)))));
      };

      projection.preclip = function(_) {
        return arguments.length ? (preclip = _, theta = undefined, reset()) : preclip;
      };

      projection.postclip = function(_) {
        return arguments.length ? (postclip = _, x0 = y0 = x1 = y1 = null, reset()) : postclip;
      };

      projection.clipAngle = function(_) {
        return arguments.length ? (preclip = +_ ? clipCircle(theta = _ * radians) : (theta = null, clipAntimeridian), reset()) : theta * degrees;
      };

      projection.clipExtent = function(_) {
        return arguments.length ? (postclip = _ == null ? (x0 = y0 = x1 = y1 = null, identity$2) : clipRectangle(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]), reset()) : x0 == null ? null : [[x0, y0], [x1, y1]];
      };

      projection.scale = function(_) {
        return arguments.length ? (k = +_, recenter()) : k;
      };

      projection.translate = function(_) {
        return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
      };

      projection.center = function(_) {
        return arguments.length ? (lambda = _[0] % 360 * radians, phi = _[1] % 360 * radians, recenter()) : [lambda * degrees, phi * degrees];
      };

      projection.rotate = function(_) {
        return arguments.length ? (deltaLambda = _[0] % 360 * radians, deltaPhi = _[1] % 360 * radians, deltaGamma = _.length > 2 ? _[2] % 360 * radians : 0, recenter()) : [deltaLambda * degrees, deltaPhi * degrees, deltaGamma * degrees];
      };

      projection.angle = function(_) {
        return arguments.length ? (alpha = _ % 360 * radians, recenter()) : alpha * degrees;
      };

      projection.reflectX = function(_) {
        return arguments.length ? (sx = _ ? -1 : 1, recenter()) : sx < 0;
      };

      projection.reflectY = function(_) {
        return arguments.length ? (sy = _ ? -1 : 1, recenter()) : sy < 0;
      };

      projection.precision = function(_) {
        return arguments.length ? (projectResample = resample(projectTransform, delta2 = _ * _), reset()) : sqrt(delta2);
      };

      projection.fitExtent = function(extent, object) {
        return fitExtent(projection, extent, object);
      };

      projection.fitSize = function(size, object) {
        return fitSize(projection, size, object);
      };

      projection.fitWidth = function(width, object) {
        return fitWidth(projection, width, object);
      };

      projection.fitHeight = function(height, object) {
        return fitHeight(projection, height, object);
      };

      function recenter() {
        var center = scaleTranslateRotate(k, 0, 0, sx, sy, alpha).apply(null, project(lambda, phi)),
            transform = scaleTranslateRotate(k, x - center[0], y - center[1], sx, sy, alpha);
        rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma);
        projectTransform = compose(project, transform);
        projectRotateTransform = compose(rotate, projectTransform);
        projectResample = resample(projectTransform, delta2);
        return reset();
      }

      function reset() {
        cache = cacheStream = null;
        return projection;
      }

      return function() {
        project = projectAt.apply(this, arguments);
        projection.invert = project.invert && invert;
        return recenter();
      };
    }

    function conicProjection(projectAt) {
      var phi0 = 0,
          phi1 = pi / 3,
          m = projectionMutator(projectAt),
          p = m(phi0, phi1);

      p.parallels = function(_) {
        return arguments.length ? m(phi0 = _[0] * radians, phi1 = _[1] * radians) : [phi0 * degrees, phi1 * degrees];
      };

      return p;
    }

    function cylindricalEqualAreaRaw(phi0) {
      var cosPhi0 = cos(phi0);

      function forward(lambda, phi) {
        return [lambda * cosPhi0, sin(phi) / cosPhi0];
      }

      forward.invert = function(x, y) {
        return [x / cosPhi0, asin(y * cosPhi0)];
      };

      return forward;
    }

    function conicEqualAreaRaw(y0, y1) {
      var sy0 = sin(y0), n = (sy0 + sin(y1)) / 2;

      // Are the parallels symmetrical around the Equator?
      if (abs(n) < epsilon) return cylindricalEqualAreaRaw(y0);

      var c = 1 + sy0 * (2 * n - sy0), r0 = sqrt(c) / n;

      function project(x, y) {
        var r = sqrt(c - 2 * n * sin(y)) / n;
        return [r * sin(x *= n), r0 - r * cos(x)];
      }

      project.invert = function(x, y) {
        var r0y = r0 - y,
            l = atan2(x, abs(r0y)) * sign(r0y);
        if (r0y * n < 0)
          l -= pi * sign(x) * sign(r0y);
        return [l / n, asin((c - (x * x + r0y * r0y) * n * n) / (2 * n))];
      };

      return project;
    }

    function conicEqualArea() {
      return conicProjection(conicEqualAreaRaw)
          .scale(155.424)
          .center([0, 33.6442]);
    }

    function albers() {
      return conicEqualArea()
          .parallels([29.5, 45.5])
          .scale(1070)
          .translate([480, 250])
          .rotate([96, 0])
          .center([-0.6, 38.7]);
    }

    // The projections must have mutually exclusive clip regions on the sphere,
    // as this will avoid emitting interleaving lines and polygons.
    function multiplex(streams) {
      var n = streams.length;
      return {
        point: function(x, y) { var i = -1; while (++i < n) streams[i].point(x, y); },
        sphere: function() { var i = -1; while (++i < n) streams[i].sphere(); },
        lineStart: function() { var i = -1; while (++i < n) streams[i].lineStart(); },
        lineEnd: function() { var i = -1; while (++i < n) streams[i].lineEnd(); },
        polygonStart: function() { var i = -1; while (++i < n) streams[i].polygonStart(); },
        polygonEnd: function() { var i = -1; while (++i < n) streams[i].polygonEnd(); }
      };
    }

    // A composite projection for the United States, configured by default for
    // 960×500. The projection also works quite well at 960×600 if you change the
    // scale to 1285 and adjust the translate accordingly. The set of standard
    // parallels for each region comes from USGS, which is published here:
    // http://egsc.usgs.gov/isb/pubs/MapProjections/projections.html#albers
    function geoAlbersUsa() {
      var cache,
          cacheStream,
          lower48 = albers(), lower48Point,
          alaska = conicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), alaskaPoint, // EPSG:3338
          hawaii = conicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), hawaiiPoint, // ESRI:102007
          point, pointStream = {point: function(x, y) { point = [x, y]; }};

      function albersUsa(coordinates) {
        var x = coordinates[0], y = coordinates[1];
        return point = null,
            (lower48Point.point(x, y), point)
            || (alaskaPoint.point(x, y), point)
            || (hawaiiPoint.point(x, y), point);
      }

      albersUsa.invert = function(coordinates) {
        var k = lower48.scale(),
            t = lower48.translate(),
            x = (coordinates[0] - t[0]) / k,
            y = (coordinates[1] - t[1]) / k;
        return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
            : y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
            : lower48).invert(coordinates);
      };

      albersUsa.stream = function(stream) {
        return cache && cacheStream === stream ? cache : cache = multiplex([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream)]);
      };

      albersUsa.precision = function(_) {
        if (!arguments.length) return lower48.precision();
        lower48.precision(_), alaska.precision(_), hawaii.precision(_);
        return reset();
      };

      albersUsa.scale = function(_) {
        if (!arguments.length) return lower48.scale();
        lower48.scale(_), alaska.scale(_ * 0.35), hawaii.scale(_);
        return albersUsa.translate(lower48.translate());
      };

      albersUsa.translate = function(_) {
        if (!arguments.length) return lower48.translate();
        var k = lower48.scale(), x = +_[0], y = +_[1];

        lower48Point = lower48
            .translate(_)
            .clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
            .stream(pointStream);

        alaskaPoint = alaska
            .translate([x - 0.307 * k, y + 0.201 * k])
            .clipExtent([[x - 0.425 * k + epsilon, y + 0.120 * k + epsilon], [x - 0.214 * k - epsilon, y + 0.234 * k - epsilon]])
            .stream(pointStream);

        hawaiiPoint = hawaii
            .translate([x - 0.205 * k, y + 0.212 * k])
            .clipExtent([[x - 0.214 * k + epsilon, y + 0.166 * k + epsilon], [x - 0.115 * k - epsilon, y + 0.234 * k - epsilon]])
            .stream(pointStream);

        return reset();
      };

      albersUsa.fitExtent = function(extent, object) {
        return fitExtent(albersUsa, extent, object);
      };

      albersUsa.fitSize = function(size, object) {
        return fitSize(albersUsa, size, object);
      };

      albersUsa.fitWidth = function(width, object) {
        return fitWidth(albersUsa, width, object);
      };

      albersUsa.fitHeight = function(height, object) {
        return fitHeight(albersUsa, height, object);
      };

      function reset() {
        cache = cacheStream = null;
        return albersUsa;
      }

      return albersUsa.scale(1070);
    }

    function initInterpolator(domain, interpolator) {
      switch (arguments.length) {
        case 0: break;
        case 1: {
          if (typeof domain === "function") this.interpolator(domain);
          else this.range(domain);
          break;
        }
        default: {
          this.domain(domain);
          if (typeof interpolator === "function") this.interpolator(interpolator);
          else this.range(interpolator);
          break;
        }
      }
      return this;
    }

    function identity$1(x) {
      return x;
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

    function transformer() {
      var x0 = 0,
          x1 = 1,
          t0,
          t1,
          k10,
          transform,
          interpolator = identity$1,
          clamp = false,
          unknown;

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : interpolator(k10 === 0 ? 0.5 : (x = (transform(x) - t0) * k10, clamp ? Math.max(0, Math.min(1, x)) : x));
      }

      scale.domain = function(_) {
        return arguments.length ? ([x0, x1] = _, t0 = transform(x0 = +x0), t1 = transform(x1 = +x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0), scale) : [x0, x1];
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = !!_, scale) : clamp;
      };

      scale.interpolator = function(_) {
        return arguments.length ? (interpolator = _, scale) : interpolator;
      };

      function range(interpolate) {
        return function(_) {
          var r0, r1;
          return arguments.length ? ([r0, r1] = _, interpolator = interpolate(r0, r1), scale) : [interpolator(0), interpolator(1)];
        };
      }

      scale.range = range(interpolate);

      scale.rangeRound = range(interpolateRound);

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t) {
        transform = t, t0 = t(x0), t1 = t(x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0);
        return scale;
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .interpolator(source.interpolator())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function sequential() {
      var scale = linearish(transformer()(identity$1));

      scale.copy = function() {
        return copy(scale, sequential());
      };

      return initInterpolator.apply(scale, arguments);
    }

    function colors(specifier) {
      var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
      while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
      return colors;
    }

    var ramp = scheme => rgbBasis(scheme[scheme.length - 1]);

    var scheme = new Array(3).concat(
      "e9a3c9f7f7f7a1d76a",
      "d01c8bf1b6dab8e1864dac26",
      "d01c8bf1b6daf7f7f7b8e1864dac26",
      "c51b7de9a3c9fde0efe6f5d0a1d76a4d9221",
      "c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221",
      "c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221",
      "c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221",
      "8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419",
      "8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419"
    ).map(colors);

    var interpolatePiYG = ramp(scheme);

    function Transform(k, x, y) {
      this.k = k;
      this.x = x;
      this.y = y;
    }

    Transform.prototype = {
      constructor: Transform,
      scale: function(k) {
        return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
      },
      translate: function(x, y) {
        return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
      },
      apply: function(point) {
        return [point[0] * this.k + this.x, point[1] * this.k + this.y];
      },
      applyX: function(x) {
        return x * this.k + this.x;
      },
      applyY: function(y) {
        return y * this.k + this.y;
      },
      invert: function(location) {
        return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
      },
      invertX: function(x) {
        return (x - this.x) / this.k;
      },
      invertY: function(y) {
        return (y - this.y) / this.k;
      },
      rescaleX: function(x) {
        return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
      },
      rescaleY: function(y) {
        return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
      },
      toString: function() {
        return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
      }
    };

    Transform.prototype;

    /* src/routes/scrollygraph/_compotents/Legend.svelte generated by Svelte v3.59.2 */

    function add_css$5(target) {
    	append_styles(target, "svelte-p09are", ".container.svelte-p09are{position:absolute;width:250px;background-color:white;font-size:13px;padding:0px;z-index:15;height:65px;box-shadow:0.1px 0.2px 0.2px hsl(0deg 0% 0% / 0.1),\n    0.4px 0.8px 0.9px -0.5px hsl(0deg 0% 0% / 0.09),\n    0.8px 1.4px 1.6px -1px hsl(0deg 0% 0% / 0.09),\n    1.4px 2.5px 2.8px -1.5px hsl(0deg 0% 0% / 0.08),\n    2.3px 4.3px 4.8px -1.9px hsl(0deg 0% 0% / 0.07),\n    3.8px 7.1px 8px -2.4px hsl(0deg 0% 0% / 0.07),\n    6px 11.1px 12.5px -2.9px hsl(0deg 0% 0% / 0.06),\n    9.1px 16.8px 18.9px -3.4px hsl(0deg 0% 0% / 0.05)}text.svelte-p09are{font-family:'Graphik Web', 'Helvetica Neue', Helvetica, Arial, sans-serif}");
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[13] = i;
    	const constants_0 = /*i*/ child_ctx[13] * /*distance*/ child_ctx[8];
    	child_ctx[11] = constants_0;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[17] = i;
    	const constants_0 = /*colorScale*/ child_ctx[0].interpolator()(/*index*/ child_ctx[17] / (/*n*/ child_ctx[5] - 1));
    	child_ctx[15] = constants_0;
    	return child_ctx;
    }

    // (38:1) {#each Array(n) as _, index}
    function create_each_block_1$1(ctx) {
    	let rect;
    	let rect_fill_value;
    	let rect_stroke_value;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "x", /*index*/ ctx[17] * width);
    			attr(rect, "y", "0");
    			attr(rect, "width", width);
    			attr(rect, "height", "15");
    			attr(rect, "fill", rect_fill_value = /*color*/ ctx[15]);
    			attr(rect, "stroke", rect_stroke_value = /*color*/ ctx[15]);
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*colorScale, n*/ 33 && rect_fill_value !== (rect_fill_value = /*color*/ ctx[15])) {
    				attr(rect, "fill", rect_fill_value);
    			}

    			if (dirty & /*colorScale, n*/ 33 && rect_stroke_value !== (rect_stroke_value = /*color*/ ctx[15])) {
    				attr(rect, "stroke", rect_stroke_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
    }

    // (51:1) {#each ticks as tick, i}
    function create_each_block$2(ctx) {
    	let g;
    	let line;
    	let text_1;
    	let t_value = format(/*tickFormat*/ ctx[2])(/*tick*/ ctx[10]) + "";
    	let t;

    	return {
    		c() {
    			g = svg_element("g");
    			line = svg_element("line");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr(line, "stroke", "#000");
    			attr(line, "y2", "25");
    			attr(line, "y1", "0");
    			attr(text_1, "y", "25");
    			attr(text_1, "dy", "1em");
    			attr(text_1, "class", "svelte-p09are");
    			attr(g, "transform", "translate(" + /*xPosition*/ ctx[11] + ", 0)");
    			attr(g, "text-anchor", "middle");
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);
    			append$1(g, line);
    			append$1(g, text_1);
    			append$1(text_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*tickFormat*/ 4 && t_value !== (t_value = format(/*tickFormat*/ ctx[2])(/*tick*/ ctx[10]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(g);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div;
    	let svg;
    	let g;
    	let text_1;
    	let t;
    	let text_1_y_value;
    	let each0_anchor;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[9]);
    	let each_value_1 = Array(/*n*/ ctx[5]);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*ticks*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");
    			svg = svg_element("svg");
    			g = svg_element("g");
    			text_1 = svg_element("text");
    			t = text(/*title*/ ctx[1]);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(text_1, "x", /*marginLeft*/ ctx[4]);
    			attr(text_1, "y", text_1_y_value = /*marginTop*/ ctx[3] - 25);
    			attr(text_1, "font-weight", "bold");
    			attr(text_1, "class", "svelte-p09are");
    			attr(svg, "viewBox", "-15 -25 285 70");
    			attr(div, "class", "container svelte-p09are");
    			set_style(div, "top", /*innerWidth*/ ctx[6] > 1200 ? "10px" : "-80px");
    			set_style(div, "right", /*innerWidth*/ ctx[6] > 1200 ? "10px" : "0");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append$1(div, svg);
    			append$1(svg, g);
    			append$1(g, text_1);
    			append$1(text_1, t);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(g, null);
    				}
    			}

    			append$1(g, each0_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}

    			if (!mounted) {
    				dispose = listen(window, "resize", /*onwindowresize*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*title*/ 2) set_data(t, /*title*/ ctx[1]);

    			if (dirty & /*marginLeft*/ 16) {
    				attr(text_1, "x", /*marginLeft*/ ctx[4]);
    			}

    			if (dirty & /*marginTop*/ 8 && text_1_y_value !== (text_1_y_value = /*marginTop*/ ctx[3] - 25)) {
    				attr(text_1, "y", text_1_y_value);
    			}

    			if (dirty & /*width, colorScale, n*/ 33) {
    				each_value_1 = Array(/*n*/ ctx[5]);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(g, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*distance, format, tickFormat, ticks*/ 388) {
    				each_value = /*ticks*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*innerWidth*/ 64) {
    				set_style(div, "top", /*innerWidth*/ ctx[6] > 1200 ? "10px" : "-80px");
    			}

    			if (dirty & /*innerWidth*/ 64) {
    				set_style(div, "right", /*innerWidth*/ ctx[6] > 1200 ? "10px" : "0");
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    let width = 1; // width of color-rects inside legend

    function instance$6($$self, $$props, $$invalidate) {
    	let { colorScale } = $$props;
    	let { title } = $$props;
    	let { tickFormat } = $$props;
    	let { marginTop = 18 } = $$props;
    	let { marginLeft = 0 } = $$props;
    	let { n = 256 } = $$props;

    	// create ticks-array
    	let ticks = colorScale.ticks(3);

    	let innerWidth;

    	// distance between each tick label to go from exactly
    	// one end to exactly the other end
    	let distance = n * width / (ticks.length - 1);

    	function onwindowresize() {
    		$$invalidate(6, innerWidth = window.innerWidth);
    	}

    	$$self.$$set = $$props => {
    		if ('colorScale' in $$props) $$invalidate(0, colorScale = $$props.colorScale);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('tickFormat' in $$props) $$invalidate(2, tickFormat = $$props.tickFormat);
    		if ('marginTop' in $$props) $$invalidate(3, marginTop = $$props.marginTop);
    		if ('marginLeft' in $$props) $$invalidate(4, marginLeft = $$props.marginLeft);
    		if ('n' in $$props) $$invalidate(5, n = $$props.n);
    	};

    	return [
    		colorScale,
    		title,
    		tickFormat,
    		marginTop,
    		marginLeft,
    		n,
    		innerWidth,
    		ticks,
    		distance,
    		onwindowresize
    	];
    }

    class Legend extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				colorScale: 0,
    				title: 1,
    				tickFormat: 2,
    				marginTop: 3,
    				marginLeft: 4,
    				n: 5
    			},
    			add_css$5
    		);
    	}
    }

    function identity(x) {
      return x;
    }

    function transform(transform) {
      if (transform == null) return identity;
      var x0,
          y0,
          kx = transform.scale[0],
          ky = transform.scale[1],
          dx = transform.translate[0],
          dy = transform.translate[1];
      return function(input, i) {
        if (!i) x0 = y0 = 0;
        var j = 2, n = input.length, output = new Array(n);
        output[0] = (x0 += input[0]) * kx + dx;
        output[1] = (y0 += input[1]) * ky + dy;
        while (j < n) output[j] = input[j], ++j;
        return output;
      };
    }

    function reverse(array, n) {
      var t, j = array.length, i = j - n;
      while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
    }

    function feature(topology, o) {
      return o.type === "GeometryCollection"
          ? {type: "FeatureCollection", features: o.geometries.map(function(o) { return feature$1(topology, o); })}
          : feature$1(topology, o);
    }

    function feature$1(topology, o) {
      var id = o.id,
          bbox = o.bbox,
          properties = o.properties == null ? {} : o.properties,
          geometry = object(topology, o);
      return id == null && bbox == null ? {type: "Feature", properties: properties, geometry: geometry}
          : bbox == null ? {type: "Feature", id: id, properties: properties, geometry: geometry}
          : {type: "Feature", id: id, bbox: bbox, properties: properties, geometry: geometry};
    }

    function object(topology, o) {
      var transformPoint = transform(topology.transform),
          arcs = topology.arcs;

      function arc(i, points) {
        if (points.length) points.pop();
        for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
          points.push(transformPoint(a[k], k));
        }
        if (i < 0) reverse(points, n);
      }

      function point(p) {
        return transformPoint(p);
      }

      function line(arcs) {
        var points = [];
        for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
        if (points.length < 2) points.push(points[0]); // This should never happen per the specification.
        return points;
      }

      function ring(arcs) {
        var points = line(arcs);
        while (points.length < 4) points.push(points[0]); // This may happen if an arc has only two points.
        return points;
      }

      function polygon(arcs) {
        return arcs.map(ring);
      }

      function geometry(o) {
        var type = o.type, coordinates;
        switch (type) {
          case "GeometryCollection": return {type: type, geometries: o.geometries.map(geometry)};
          case "Point": coordinates = point(o.coordinates); break;
          case "MultiPoint": coordinates = o.coordinates.map(point); break;
          case "LineString": coordinates = line(o.arcs); break;
          case "MultiLineString": coordinates = o.arcs.map(line); break;
          case "Polygon": coordinates = polygon(o.arcs); break;
          case "MultiPolygon": coordinates = o.arcs.map(polygon); break;
          default: return null;
        }
        return {type: type, coordinates: coordinates};
      }

      return geometry(o);
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop$1) {
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
        function subscribe(run, invalidate = noop$1) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop$1;
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

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity$4, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    /* src/routes/scrollygraph/_compotents/InfoBlurb.svelte generated by Svelte v3.59.2 */

    function add_css$4(target) {
    	append_styles(target, "svelte-zt0t47", ".inside.svelte-zt0t47{display:flex;flex-direction:column;width:100%}.row-inside.svelte-zt0t47{display:flex;flex-direction:row;justify-content:space-between;height:21px;text-shadow:1px 1px 0 #fff, -1px 1px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff}.name.svelte-zt0t47{width:100%;text-align:left}.text.svelte-zt0t47{font-family:'Graphik Web', 'Helvetica Neue', Helvetica, Arial, sans-serif;padding:0}");
    }

    // (15:4) {:else}
    function create_else_block(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2_value = /*props*/ ctx[0].movedin.toLocaleString() + "";
    	let t2;
    	let t3;
    	let div5;
    	let div3;
    	let t5;
    	let div4;
    	let t6_value = /*props*/ ctx[0].movedout.toLocaleString() + "";
    	let t6;
    	let t7;
    	let div8;
    	let div6;
    	let t9;
    	let div7;
    	let t10_value = /*props*/ ctx[0].movednet.toLocaleString() + "";
    	let t10;

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "To DeSoto";
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div3.textContent = "From DeSoto";
    			t5 = space();
    			div4 = element("div");
    			t6 = text(t6_value);
    			t7 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = "Net migration";
    			t9 = space();
    			div7 = element("div");
    			t10 = text(t10_value);
    			attr(div0, "class", "text svelte-zt0t47");
    			attr(div1, "class", "text svelte-zt0t47");
    			attr(div2, "class", "row-inside svelte-zt0t47");
    			set_style(div2, "box-shadow", "inset 0 -1px 0 0 #fff, inset 0 -7px 0 0 " + /*color*/ ctx[1](/*props*/ ctx[0].movedin));
    			attr(div3, "class", "text svelte-zt0t47");
    			attr(div4, "class", "text svelte-zt0t47");
    			attr(div5, "class", "row-inside svelte-zt0t47");
    			set_style(div5, "box-shadow", "inset 0 -1px 0 0 #fff, inset 0 -7px 0 0 " + /*color*/ ctx[1](-/*props*/ ctx[0].movedout));
    			attr(div6, "class", "text svelte-zt0t47");
    			attr(div7, "class", "text svelte-zt0t47");
    			attr(div8, "class", "row-inside svelte-zt0t47");
    			set_style(div8, "box-shadow", "inset 0 -1px 0 0 #fff, inset 0 -7px 0 0 " + /*color*/ ctx[1](/*props*/ ctx[0].movednet));
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append$1(div2, div0);
    			append$1(div2, t1);
    			append$1(div2, div1);
    			append$1(div1, t2);
    			insert(target, t3, anchor);
    			insert(target, div5, anchor);
    			append$1(div5, div3);
    			append$1(div5, t5);
    			append$1(div5, div4);
    			append$1(div4, t6);
    			insert(target, t7, anchor);
    			insert(target, div8, anchor);
    			append$1(div8, div6);
    			append$1(div8, t9);
    			append$1(div8, div7);
    			append$1(div7, t10);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*props*/ 1 && t2_value !== (t2_value = /*props*/ ctx[0].movedin.toLocaleString() + "")) set_data(t2, t2_value);

    			if (dirty & /*color, props*/ 3) {
    				set_style(div2, "box-shadow", "inset 0 -1px 0 0 #fff, inset 0 -7px 0 0 " + /*color*/ ctx[1](/*props*/ ctx[0].movedin));
    			}

    			if (dirty & /*props*/ 1 && t6_value !== (t6_value = /*props*/ ctx[0].movedout.toLocaleString() + "")) set_data(t6, t6_value);

    			if (dirty & /*color, props*/ 3) {
    				set_style(div5, "box-shadow", "inset 0 -1px 0 0 #fff, inset 0 -7px 0 0 " + /*color*/ ctx[1](-/*props*/ ctx[0].movedout));
    			}

    			if (dirty & /*props*/ 1 && t10_value !== (t10_value = /*props*/ ctx[0].movednet.toLocaleString() + "")) set_data(t10, t10_value);

    			if (dirty & /*color, props*/ 3) {
    				set_style(div8, "box-shadow", "inset 0 -1px 0 0 #fff, inset 0 -7px 0 0 " + /*color*/ ctx[1](/*props*/ ctx[0].movednet));
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (detaching) detach(t3);
    			if (detaching) detach(div5);
    			if (detaching) detach(t7);
    			if (detaching) detach(div8);
    		}
    	};
    }

    // (13:4) {#if props.movedin == 0 && props.movedout == 0 && props.movednet == 0}
    function create_if_block$4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<i>Not available or no migration</i>`;
    			attr(div, "class", "text svelte-zt0t47");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let b;
    	let t0;

    	let t1_value = (/*opt_name*/ ctx[3]
    	? /*opt_name*/ ctx[3]
    	: /*props*/ ctx[0].name + " County, " + /*props*/ ctx[0].state) + "";

    	let t1;
    	let t2;

    	function select_block_type(ctx, dirty) {
    		if (/*props*/ ctx[0].movedin == 0 && /*props*/ ctx[0].movedout == 0 && /*props*/ ctx[0].movednet == 0) return create_if_block$4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			b = element("b");
    			t0 = text(/*prefix*/ ctx[2]);
    			t1 = text(t1_value);
    			t2 = space();
    			if_block.c();
    			attr(div0, "class", "name text svelte-zt0t47");
    			attr(div1, "class", "inside svelte-zt0t47");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append$1(div1, div0);
    			append$1(div0, b);
    			append$1(b, t0);
    			append$1(b, t1);
    			append$1(div1, t2);
    			if_block.m(div1, null);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*prefix*/ 4) set_data(t0, /*prefix*/ ctx[2]);

    			if (dirty & /*opt_name, props*/ 9 && t1_value !== (t1_value = (/*opt_name*/ ctx[3]
    			? /*opt_name*/ ctx[3]
    			: /*props*/ ctx[0].name + " County, " + /*props*/ ctx[0].state) + "")) set_data(t1, t1_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(div1);
    			if_block.d();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { props } = $$props;
    	let { color } = $$props;
    	let { prefix = "" } = $$props;
    	let { opt_name } = $$props;

    	$$self.$$set = $$props => {
    		if ('props' in $$props) $$invalidate(0, props = $$props.props);
    		if ('color' in $$props) $$invalidate(1, color = $$props.color);
    		if ('prefix' in $$props) $$invalidate(2, prefix = $$props.prefix);
    		if ('opt_name' in $$props) $$invalidate(3, opt_name = $$props.opt_name);
    	};

    	return [props, color, prefix, opt_name];
    }

    class InfoBlurb extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				props: 0,
    				color: 1,
    				prefix: 2,
    				opt_name: 3
    			},
    			add_css$4
    		);
    	}
    }

    /* src/routes/scrollygraph/_compotents/Highlight.svelte generated by Svelte v3.59.2 */

    function add_css$3(target) {
    	append_styles(target, "svelte-1mruuwq", "@import url('https://fonts.googleapis.com/css2?family=Cedarville+Cursive&display=swap');.dot.svelte-1mruuwq,.line.svelte-1mruuwq,.label.svelte-1mruuwq{box-shadow:0.1px 0.2px 0.2px hsl(0deg 0% 0% / 0.1),\n    0.4px 0.8px 0.9px -0.5px hsl(0deg 0% 0% / 0.09),\n    0.8px 1.4px 1.6px -1px hsl(0deg 0% 0% / 0.09),\n    1.4px 2.5px 2.8px -1.5px hsl(0deg 0% 0% / 0.08),\n    2.3px 4.3px 4.8px -1.9px hsl(0deg 0% 0% / 0.07),\n    3.8px 7.1px 8px -2.4px hsl(0deg 0% 0% / 0.07),\n    6px 11.1px 12.5px -2.9px hsl(0deg 0% 0% / 0.06),\n    9.1px 16.8px 18.9px -3.4px hsl(0deg 0% 0% / 0.05);;}.dot.svelte-1mruuwq{z-index:2;height:8px;width:8px;background-color:#7597ae;position:absolute;transform:translate(-50%, -50%);border-radius:50%}.line.svelte-1mruuwq{z-index:1;height:3px;background-color:#7597ae;position:absolute;transform-origin:center left}.label.svelte-1mruuwq{z-index:1;position:absolute;background-color:white;font-size:13px;background:rgba(255, 255, 255, 1);padding:8px;z-index:15;min-width:180px}.label-words.svelte-1mruuwq{font-size:40px;color:white;font-family:\"Cedarville Cursive\", cursive;font-weight:400;font-style:normal;position:absolute;transform:translate(-50%, -50%);line-height:40px}.pointer-words.svelte-1mruuwq{padding:0 4px;position:absolute;font-size:18px;color:black;width:100px;text-shadow:1px 1px 0 #fff,\n            -1px 1px 0 #fff,\n            2px 0 0 #fff,\n            -2px 0 0 #fff}");
    }

    // (65:0) {#if $ox == init_ox && step == init_step}
    function create_if_block$3(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*style*/ ctx[7] == "infoblurb" && create_if_block_3(ctx);
    	let if_block1 = /*style*/ ctx[7] == "label" && create_if_block_2$2(ctx);
    	let if_block2 = /*style*/ ctx[7] == "pointer" && create_if_block_1$3(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*style*/ ctx[7] == "infoblurb") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*style*/ 128) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*style*/ ctx[7] == "label") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$2(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*style*/ ctx[7] == "pointer") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$3(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    // (66:4) {#if style == "infoblurb"}
    function create_if_block_3(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let infoblurb;
    	let current;

    	infoblurb = new InfoBlurb({
    			props: {
    				color: /*color*/ ctx[3],
    				props: /*props*/ ctx[2],
    				prefix: /*prefix*/ ctx[6],
    				opt_name: /*opt_name*/ ctx[10]
    			}
    		});

    	return {
    		c() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			create_component(infoblurb.$$.fragment);
    			attr(div0, "class", "dot svelte-1mruuwq");
    			set_style(div0, "top", /*top*/ ctx[12] + "px");
    			set_style(div0, "left", /*left*/ ctx[11] + "px");
    			attr(div1, "class", "line svelte-1mruuwq");
    			set_style(div1, "width", /*line_width*/ ctx[5] + "px");
    			set_style(div1, "top", /*top*/ ctx[12] + "px");
    			set_style(div1, "left", /*left*/ ctx[11] + "px");
    			set_style(div1, "transform", "translate(0%, -50%) rotate(" + /*angle*/ ctx[4] + "deg)");
    			attr(div2, "class", "label svelte-1mruuwq");
    			set_style(div2, "top", /*end_y*/ ctx[15] + "px");
    			set_style(div2, "left", /*end_x*/ ctx[14] + "px");
    			set_style(div2, "transform", "translate(" + /*trans*/ ctx[16].x + "%, " + /*trans*/ ctx[16].y + "%)");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t0, anchor);
    			insert(target, div1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div2, anchor);
    			mount_component(infoblurb, div2, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*top*/ 4096) {
    				set_style(div0, "top", /*top*/ ctx[12] + "px");
    			}

    			if (!current || dirty & /*left*/ 2048) {
    				set_style(div0, "left", /*left*/ ctx[11] + "px");
    			}

    			if (!current || dirty & /*line_width*/ 32) {
    				set_style(div1, "width", /*line_width*/ ctx[5] + "px");
    			}

    			if (!current || dirty & /*top*/ 4096) {
    				set_style(div1, "top", /*top*/ ctx[12] + "px");
    			}

    			if (!current || dirty & /*left*/ 2048) {
    				set_style(div1, "left", /*left*/ ctx[11] + "px");
    			}

    			if (!current || dirty & /*angle*/ 16) {
    				set_style(div1, "transform", "translate(0%, -50%) rotate(" + /*angle*/ ctx[4] + "deg)");
    			}

    			const infoblurb_changes = {};
    			if (dirty & /*color*/ 8) infoblurb_changes.color = /*color*/ ctx[3];
    			if (dirty & /*props*/ 4) infoblurb_changes.props = /*props*/ ctx[2];
    			if (dirty & /*prefix*/ 64) infoblurb_changes.prefix = /*prefix*/ ctx[6];
    			if (dirty & /*opt_name*/ 1024) infoblurb_changes.opt_name = /*opt_name*/ ctx[10];
    			infoblurb.$set(infoblurb_changes);

    			if (!current || dirty & /*end_y*/ 32768) {
    				set_style(div2, "top", /*end_y*/ ctx[15] + "px");
    			}

    			if (!current || dirty & /*end_x*/ 16384) {
    				set_style(div2, "left", /*end_x*/ ctx[14] + "px");
    			}

    			if (!current || dirty & /*trans*/ 65536) {
    				set_style(div2, "transform", "translate(" + /*trans*/ ctx[16].x + "%, " + /*trans*/ ctx[16].y + "%)");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(infoblurb.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(infoblurb.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t0);
    			if (detaching) detach(div1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div2);
    			destroy_component(infoblurb);
    		}
    	};
    }

    // (94:4) {#if style == "label"}
    function create_if_block_2$2(ctx) {
    	let div;

    	let t_value = (/*opt_name*/ ctx[10]
    	? /*opt_name*/ ctx[10]
    	: /*props*/ ctx[2].name) + "";

    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "label-words svelte-1mruuwq");
    			set_style(div, "top", /*top*/ ctx[12] + "px");
    			set_style(div, "left", /*left*/ ctx[11] + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append$1(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*opt_name, props*/ 1028 && t_value !== (t_value = (/*opt_name*/ ctx[10]
    			? /*opt_name*/ ctx[10]
    			: /*props*/ ctx[2].name) + "")) set_data(t, t_value);

    			if (dirty & /*top*/ 4096) {
    				set_style(div, "top", /*top*/ ctx[12] + "px");
    			}

    			if (dirty & /*left*/ 2048) {
    				set_style(div, "left", /*left*/ ctx[11] + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (105:4) {#if style == "pointer"}
    function create_if_block_1$3(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;

    	let t2_value = (/*opt_name*/ ctx[10]
    	? /*opt_name*/ ctx[10]
    	: /*props*/ ctx[2].name) + "";

    	let t2;

    	return {
    		c() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = text(t2_value);
    			attr(div0, "class", "dot svelte-1mruuwq");
    			set_style(div0, "top", /*top*/ ctx[12] + "px");
    			set_style(div0, "left", /*left*/ ctx[11] + "px");
    			attr(div1, "class", "line svelte-1mruuwq");
    			set_style(div1, "width", /*line_width*/ ctx[5] + "px");
    			set_style(div1, "top", /*top*/ ctx[12] + "px");
    			set_style(div1, "left", /*left*/ ctx[11] + "px");
    			set_style(div1, "transform", "translate(0%, -50%) rotate(" + /*angle*/ ctx[4] + "deg)");
    			attr(div2, "class", "pointer-words svelte-1mruuwq");
    			set_style(div2, "top", /*end_y*/ ctx[15] + "px");
    			set_style(div2, "left", /*end_x*/ ctx[14] + "px");
    			set_style(div2, "transform", "translate(" + /*trans*/ ctx[16].x + "%, " + /*trans*/ ctx[16].y + "%)");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append$1(div3, div0);
    			append$1(div3, t0);
    			append$1(div3, div1);
    			append$1(div3, t1);
    			append$1(div3, div2);
    			append$1(div2, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*top*/ 4096) {
    				set_style(div0, "top", /*top*/ ctx[12] + "px");
    			}

    			if (dirty & /*left*/ 2048) {
    				set_style(div0, "left", /*left*/ ctx[11] + "px");
    			}

    			if (dirty & /*line_width*/ 32) {
    				set_style(div1, "width", /*line_width*/ ctx[5] + "px");
    			}

    			if (dirty & /*top*/ 4096) {
    				set_style(div1, "top", /*top*/ ctx[12] + "px");
    			}

    			if (dirty & /*left*/ 2048) {
    				set_style(div1, "left", /*left*/ ctx[11] + "px");
    			}

    			if (dirty & /*angle*/ 16) {
    				set_style(div1, "transform", "translate(0%, -50%) rotate(" + /*angle*/ ctx[4] + "deg)");
    			}

    			if (dirty & /*opt_name, props*/ 1028 && t2_value !== (t2_value = (/*opt_name*/ ctx[10]
    			? /*opt_name*/ ctx[10]
    			: /*props*/ ctx[2].name) + "")) set_data(t2, t2_value);

    			if (dirty & /*end_y*/ 32768) {
    				set_style(div2, "top", /*end_y*/ ctx[15] + "px");
    			}

    			if (dirty & /*end_x*/ 16384) {
    				set_style(div2, "left", /*end_x*/ ctx[14] + "px");
    			}

    			if (dirty & /*trans*/ 65536) {
    				set_style(div2, "transform", "translate(" + /*trans*/ ctx[16].x + "%, " + /*trans*/ ctx[16].y + "%)");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$ox*/ ctx[13] == /*init_ox*/ ctx[9] && /*step*/ ctx[1] == /*init_step*/ ctx[8] && create_if_block$3(ctx);

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
    			if (/*$ox*/ ctx[13] == /*init_ox*/ ctx[9] && /*step*/ ctx[1] == /*init_step*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$ox, init_ox, step, init_step*/ 8962) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
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

    function instance$4($$self, $$props, $$invalidate) {
    	let $ox,
    		$$unsubscribe_ox = noop$1,
    		$$subscribe_ox = () => ($$unsubscribe_ox(), $$unsubscribe_ox = subscribe(ox, $$value => $$invalidate(13, $ox = $$value)), ox);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_ox());
    	let { p } = $$props;
    	let { ox } = $$props;
    	$$subscribe_ox();
    	let { step } = $$props;
    	let { props } = $$props;
    	let { color } = $$props;
    	let { sticky } = $$props;
    	let { angle = -90 } = $$props;
    	let { line_width = 50 } = $$props;
    	let { prefix = "" } = $$props;
    	let { style = "infoblurb" } = $$props;
    	let { init_step = 1 } = $$props;
    	let { init_ox = 560 } = $$props;
    	let { opt_name = false } = $$props;
    	let left, top, end_x, end_y, offset_x, offset_y, trans;

    	const translate_vals = {
    		right: { x: 0, y: -50 },
    		top: { x: -50, y: -100 },
    		bottom: { x: -50, y: 0 },
    		left: { x: -100, y: -50 }
    	};

    	$$self.$$set = $$props => {
    		if ('p' in $$props) $$invalidate(17, p = $$props.p);
    		if ('ox' in $$props) $$subscribe_ox($$invalidate(0, ox = $$props.ox));
    		if ('step' in $$props) $$invalidate(1, step = $$props.step);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    		if ('sticky' in $$props) $$invalidate(18, sticky = $$props.sticky);
    		if ('angle' in $$props) $$invalidate(4, angle = $$props.angle);
    		if ('line_width' in $$props) $$invalidate(5, line_width = $$props.line_width);
    		if ('prefix' in $$props) $$invalidate(6, prefix = $$props.prefix);
    		if ('style' in $$props) $$invalidate(7, style = $$props.style);
    		if ('init_step' in $$props) $$invalidate(8, init_step = $$props.init_step);
    		if ('init_ox' in $$props) $$invalidate(9, init_ox = $$props.init_ox);
    		if ('opt_name' in $$props) $$invalidate(10, opt_name = $$props.opt_name);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$ox, init_ox, step, init_step, p, sticky, angle, line_width, left, offset_x, top, offset_y*/ 1981234) {
    			{
    				if ($ox == init_ox && step == init_step && p) {
    					$$invalidate(12, top = p.getBoundingClientRect().top - sticky.getBoundingClientRect().top);
    					$$invalidate(11, left = p.getBoundingClientRect().left - sticky.getBoundingClientRect().left);
    					$$invalidate(19, offset_x = Math.cos(angle * (Math.PI / 180)) * line_width);
    					$$invalidate(20, offset_y = Math.sin(angle * (Math.PI / 180)) * line_width);
    					$$invalidate(14, end_x = left + offset_x);
    					$$invalidate(15, end_y = top + offset_y);

    					if (angle < -45 && angle > -135) {
    						$$invalidate(16, trans = translate_vals.top);
    					}

    					if (angle < -135 && angle > -180 || angle < 180 && angle > 135) {
    						$$invalidate(16, trans = translate_vals.left);
    					}

    					if (angle < 135 && angle > 45) {
    						$$invalidate(16, trans = translate_vals.bottom);
    					}

    					if (angle < 45 && angle > -45) {
    						$$invalidate(16, trans = translate_vals.right);
    					}
    				}
    			}
    		}
    	};

    	return [
    		ox,
    		step,
    		props,
    		color,
    		angle,
    		line_width,
    		prefix,
    		style,
    		init_step,
    		init_ox,
    		opt_name,
    		left,
    		top,
    		$ox,
    		end_x,
    		end_y,
    		trans,
    		p,
    		sticky,
    		offset_x,
    		offset_y
    	];
    }

    class Highlight extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{
    				p: 17,
    				ox: 0,
    				step: 1,
    				props: 2,
    				color: 3,
    				sticky: 18,
    				angle: 4,
    				line_width: 5,
    				prefix: 6,
    				style: 7,
    				init_step: 8,
    				init_ox: 9,
    				opt_name: 10
    			},
    			add_css$3
    		);
    	}
    }

    /* src/routes/scrollygraph/_compotents/Map.svelte generated by Svelte v3.59.2 */

    function add_css$2(target) {
    	append_styles(target, "svelte-1es0hi9", ".county.svelte-1es0hi9{stroke:white;stroke-width:0.1;transition:all 1s ease-out}.state.svelte-1es0hi9{stroke:white;transition:all 1s ease-out}.desoto.svelte-1es0hi9{z-index:10;stroke:white;stroke-width:0.3;stroke-opacity:1;box-shadow:rgba(0, 0, 0, 0.4) 0px 2px 4px,\n            rgba(0, 0, 0, 0.3) 0px 7px 13px -3px,\n            rgba(0, 0, 0, 0.2) 0px -3px 0px inset}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	const constants_0 = /*point_elements*/ child_ctx[7][/*props*/ child_ctx[36].id];
    	child_ctx[37] = constants_0;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[41] = list;
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[45] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[45] = i;
    	const constants_0 = /*feature*/ child_ctx[43].id == "28033";
    	child_ctx[46] = constants_0;
    	const constants_1 = /*feature*/ child_ctx[43].id == "47157";
    	child_ctx[47] = constants_1;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[45] = i;
    	return child_ctx;
    }

    // (304:12) {#each states.filter((state) => state.id == "28") as feature, i}
    function create_each_block_4(ctx) {
    	let path_1;
    	let path_1_d_value;
    	let path_1_fill_opacity_value;

    	return {
    		c() {
    			path_1 = svg_element("path");
    			attr(path_1, "d", path_1_d_value = /*path*/ ctx[5](/*feature*/ ctx[43]));
    			attr(path_1, "class", "state svelte-1es0hi9");
    			attr(path_1, "fill", "#b9c9d5");

    			attr(path_1, "fill-opacity", path_1_fill_opacity_value = /*step*/ ctx[0] == 0 || /*step*/ ctx[0] == undefined
    			? 1
    			: 0);
    		},
    		m(target, anchor) {
    			insert(target, path_1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*path, states*/ 48 && path_1_d_value !== (path_1_d_value = /*path*/ ctx[5](/*feature*/ ctx[43]))) {
    				attr(path_1, "d", path_1_d_value);
    			}

    			if (dirty[0] & /*step*/ 1 && path_1_fill_opacity_value !== (path_1_fill_opacity_value = /*step*/ ctx[0] == 0 || /*step*/ ctx[0] == undefined
    			? 1
    			: 0)) {
    				attr(path_1, "fill-opacity", path_1_fill_opacity_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(path_1);
    		}
    	};
    }

    // (312:12) {#each counties as feature, i}
    function create_each_block_3(ctx) {
    	let path_1;
    	let path_1_d_value;
    	let path_1_class_value;
    	let path_1_stroke_opacity_value;
    	let path_1_fill_opacity_value;
    	let path_1_fill_value;
    	let mounted;
    	let dispose;

    	function mouseover_handler(...args) {
    		return /*mouseover_handler*/ ctx[21](/*feature*/ ctx[43], ...args);
    	}

    	return {
    		c() {
    			path_1 = svg_element("path");
    			attr(path_1, "d", path_1_d_value = /*path*/ ctx[5](/*feature*/ ctx[43]));
    			attr(path_1, "class", path_1_class_value = "" + (null_to_empty(/*desoto*/ ctx[46] ? "desoto" : "county") + " svelte-1es0hi9"));

    			attr(path_1, "stroke-opacity", path_1_stroke_opacity_value = /*desoto*/ ctx[46]
    			? 1
    			: /*shelby*/ ctx[47] && (/*step*/ ctx[0] == 0 || /*step*/ ctx[0] == undefined)
    				? 1
    				: /*step*/ ctx[0] < 1 || /*step*/ ctx[0] == undefined
    					? 0
    					: 1);

    			attr(path_1, "fill-opacity", path_1_fill_opacity_value = /*desoto*/ ctx[46]
    			? 1
    			: /*shelby*/ ctx[47] && (/*step*/ ctx[0] == 0 || /*step*/ ctx[0] == undefined)
    				? 1
    				: /*step*/ ctx[0] < 1 || /*step*/ ctx[0] == undefined
    					? 0
    					: 1);

    			attr(path_1, "fill", path_1_fill_value = /*desoto*/ ctx[46]
    			? "#256788"
    			: /*shelby*/ ctx[47] && (/*step*/ ctx[0] < 1 || /*step*/ ctx[0] == undefined)
    				? "#b9c9d5"
    				: /*feature*/ ctx[43].properties.movednet == 0
    					? "#D3D3D3"
    					: /*color*/ ctx[2](/*feature*/ ctx[43].properties.movednet));

    			attr(path_1, "role", "tooltip");
    		},
    		m(target, anchor) {
    			insert(target, path_1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(path_1, "mouseover", mouseover_handler),
    					listen(path_1, "mousemove", function () {
    						if (is_function(/*handleMousemove*/ ctx[19](/*feature*/ ctx[43]))) /*handleMousemove*/ ctx[19](/*feature*/ ctx[43]).apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*path, counties*/ 40 && path_1_d_value !== (path_1_d_value = /*path*/ ctx[5](/*feature*/ ctx[43]))) {
    				attr(path_1, "d", path_1_d_value);
    			}

    			if (dirty[0] & /*counties*/ 8 && path_1_class_value !== (path_1_class_value = "" + (null_to_empty(/*desoto*/ ctx[46] ? "desoto" : "county") + " svelte-1es0hi9"))) {
    				attr(path_1, "class", path_1_class_value);
    			}

    			if (dirty[0] & /*counties, step*/ 9 && path_1_stroke_opacity_value !== (path_1_stroke_opacity_value = /*desoto*/ ctx[46]
    			? 1
    			: /*shelby*/ ctx[47] && (/*step*/ ctx[0] == 0 || /*step*/ ctx[0] == undefined)
    				? 1
    				: /*step*/ ctx[0] < 1 || /*step*/ ctx[0] == undefined
    					? 0
    					: 1)) {
    				attr(path_1, "stroke-opacity", path_1_stroke_opacity_value);
    			}

    			if (dirty[0] & /*counties, step*/ 9 && path_1_fill_opacity_value !== (path_1_fill_opacity_value = /*desoto*/ ctx[46]
    			? 1
    			: /*shelby*/ ctx[47] && (/*step*/ ctx[0] == 0 || /*step*/ ctx[0] == undefined)
    				? 1
    				: /*step*/ ctx[0] < 1 || /*step*/ ctx[0] == undefined
    					? 0
    					: 1)) {
    				attr(path_1, "fill-opacity", path_1_fill_opacity_value);
    			}

    			if (dirty[0] & /*counties, step, color*/ 13 && path_1_fill_value !== (path_1_fill_value = /*desoto*/ ctx[46]
    			? "#256788"
    			: /*shelby*/ ctx[47] && (/*step*/ ctx[0] < 1 || /*step*/ ctx[0] == undefined)
    				? "#b9c9d5"
    				: /*feature*/ ctx[43].properties.movednet == 0
    					? "#D3D3D3"
    					: /*color*/ ctx[2](/*feature*/ ctx[43].properties.movednet))) {
    				attr(path_1, "fill", path_1_fill_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(path_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (349:12) {#each states as feature, i}
    function create_each_block_2(ctx) {
    	let path_1;
    	let path_1_d_value;

    	return {
    		c() {
    			path_1 = svg_element("path");
    			attr(path_1, "d", path_1_d_value = /*path*/ ctx[5](/*feature*/ ctx[43]));
    			attr(path_1, "class", "state svelte-1es0hi9");
    			attr(path_1, "fill", "none");
    			set_style(path_1, "stroke-width", /*step*/ ctx[0] == 0 ? 0.4 : 0.6);
    		},
    		m(target, anchor) {
    			insert(target, path_1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*path, states*/ 48 && path_1_d_value !== (path_1_d_value = /*path*/ ctx[5](/*feature*/ ctx[43]))) {
    				attr(path_1, "d", path_1_d_value);
    			}

    			if (dirty[0] & /*step*/ 1) {
    				set_style(path_1, "stroke-width", /*step*/ ctx[0] == 0 ? 0.4 : 0.6);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(path_1);
    		}
    	};
    }

    // (359:8) {#if highlight_props}
    function create_if_block_1$2(ctx) {
    	let g;
    	let each_value_1 = /*counties*/ ctx[3].filter(/*func_1*/ ctx[22]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*counties, highlight_props, point_elements*/ 392) {
    				each_value_1 = /*counties*/ ctx[3].filter(/*func_1*/ ctx[22]);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(g);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (361:16) {#each counties.filter((county) => highlight_props                         .map((x) => x.id)                         .includes(county.id)) as county, index}
    function create_each_block_1(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let county = /*county*/ ctx[40];
    	const assign_circle = () => /*circle_binding*/ ctx[23](circle, county);
    	const unassign_circle = () => /*circle_binding*/ ctx[23](null, county);

    	return {
    		c() {
    			circle = svg_element("circle");
    			attr(circle, "cx", circle_cx_value = /*county*/ ctx[40].properties.point[0]);
    			attr(circle, "cy", circle_cy_value = /*county*/ ctx[40].properties.point[1]);
    			attr(circle, "r", "0");
    		},
    		m(target, anchor) {
    			insert(target, circle, anchor);
    			assign_circle();
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*counties, highlight_props*/ 264 && circle_cx_value !== (circle_cx_value = /*county*/ ctx[40].properties.point[0])) {
    				attr(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*counties, highlight_props*/ 264 && circle_cy_value !== (circle_cy_value = /*county*/ ctx[40].properties.point[1])) {
    				attr(circle, "cy", circle_cy_value);
    			}

    			if (county !== /*county*/ ctx[40]) {
    				unassign_circle();
    				county = /*county*/ ctx[40];
    				assign_circle();
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(circle);
    			unassign_circle();
    		}
    	};
    }

    // (376:0) {#if highlight_props}
    function create_if_block$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*highlight_props*/ ctx[8];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

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
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*color, point_elements, highlight_props, ox, step, sticky, innerWidth, counties*/ 17295) {
    				each_value = /*highlight_props*/ ctx[8];
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
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
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
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (377:4) {#each highlight_props as props}
    function create_each_block$1(ctx) {
    	let highlight;
    	let current;

    	function func_2(...args) {
    		return /*func_2*/ ctx[26](/*props*/ ctx[36], ...args);
    	}

    	highlight = new Highlight({
    			props: {
    				color: /*color*/ ctx[2],
    				p: /*ele*/ ctx[37],
    				ox: /*ox*/ ctx[14],
    				step: /*step*/ ctx[0] == undefined ? 0 : /*step*/ ctx[0],
    				sticky: /*sticky*/ ctx[1],
    				opt_name: /*props*/ ctx[36].name
    				? /*props*/ ctx[36].name
    				: undefined,
    				style: /*props*/ ctx[36].style
    				? /*props*/ ctx[36].style
    				: /*innerWidth*/ ctx[9] > 1200 ? "infoblurb" : "pointer",
    				init_ox: /*props*/ ctx[36].init_ox || /*props*/ ctx[36].init_ox == 0
    				? /*props*/ ctx[36].init_ox
    				: undefined,
    				init_step: /*props*/ ctx[36].init_step || /*props*/ ctx[36].init_step == 0
    				? /*props*/ ctx[36].init_step
    				: undefined,
    				angle: /*props*/ ctx[36].angle
    				? /*props*/ ctx[36].angle
    				: undefined,
    				line_width: /*props*/ ctx[36].line_width
    				? /*props*/ ctx[36].line_width
    				: undefined,
    				prefix: /*props*/ ctx[36].prefix
    				? /*props*/ ctx[36].prefix
    				: undefined,
    				props: /*counties*/ ctx[3].filter(func_2)[0].properties
    			}
    		});

    	return {
    		c() {
    			create_component(highlight.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(highlight, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const highlight_changes = {};
    			if (dirty[0] & /*color*/ 4) highlight_changes.color = /*color*/ ctx[2];
    			if (dirty[0] & /*point_elements, highlight_props*/ 384) highlight_changes.p = /*ele*/ ctx[37];
    			if (dirty[0] & /*step*/ 1) highlight_changes.step = /*step*/ ctx[0] == undefined ? 0 : /*step*/ ctx[0];
    			if (dirty[0] & /*sticky*/ 2) highlight_changes.sticky = /*sticky*/ ctx[1];

    			if (dirty[0] & /*highlight_props*/ 256) highlight_changes.opt_name = /*props*/ ctx[36].name
    			? /*props*/ ctx[36].name
    			: undefined;

    			if (dirty[0] & /*highlight_props, innerWidth*/ 768) highlight_changes.style = /*props*/ ctx[36].style
    			? /*props*/ ctx[36].style
    			: /*innerWidth*/ ctx[9] > 1200 ? "infoblurb" : "pointer";

    			if (dirty[0] & /*highlight_props*/ 256) highlight_changes.init_ox = /*props*/ ctx[36].init_ox || /*props*/ ctx[36].init_ox == 0
    			? /*props*/ ctx[36].init_ox
    			: undefined;

    			if (dirty[0] & /*highlight_props*/ 256) highlight_changes.init_step = /*props*/ ctx[36].init_step || /*props*/ ctx[36].init_step == 0
    			? /*props*/ ctx[36].init_step
    			: undefined;

    			if (dirty[0] & /*highlight_props*/ 256) highlight_changes.angle = /*props*/ ctx[36].angle
    			? /*props*/ ctx[36].angle
    			: undefined;

    			if (dirty[0] & /*highlight_props*/ 256) highlight_changes.line_width = /*props*/ ctx[36].line_width
    			? /*props*/ ctx[36].line_width
    			: undefined;

    			if (dirty[0] & /*highlight_props*/ 256) highlight_changes.prefix = /*props*/ ctx[36].prefix
    			? /*props*/ ctx[36].prefix
    			: undefined;

    			if (dirty[0] & /*counties, highlight_props*/ 264) highlight_changes.props = /*counties*/ ctx[3].filter(func_2)[0].properties;
    			highlight.$set(highlight_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(highlight.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(highlight.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(highlight, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div;
    	let svg;
    	let g;
    	let each0_anchor;
    	let each1_anchor;
    	let svg_viewBox_value;
    	let div_resize_listener;
    	let t;
    	let if_block1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[20]);
    	let each_value_4 = /*states*/ ctx[4].filter(func);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_2[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*counties*/ ctx[3];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*states*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block0 = /*highlight_props*/ ctx[8] && create_if_block_1$2(ctx);
    	let if_block1 = /*highlight_props*/ ctx[8] && create_if_block$2(ctx);

    	return {
    		c() {
    			div = element("div");
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr(svg, "id", "map");
    			attr(svg, "viewBox", svg_viewBox_value = "" + (/*$ox*/ ctx[10] + " " + /*$oy*/ ctx[11] + " " + /*$w*/ ctx[12] + " " + /*$h*/ ctx[13]));
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[25].call(div));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append$1(div, svg);
    			append$1(svg, g);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(g, null);
    				}
    			}

    			append$1(g, each0_anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(g, null);
    				}
    			}

    			append$1(g, each1_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}

    			if (if_block0) if_block0.m(svg, null);
    			div_resize_listener = add_iframe_resize_listener(div, /*div_elementresize_handler*/ ctx[25].bind(div));
    			insert(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(window, "resize", /*onwindowresize*/ ctx[20]),
    					listen(svg, "mouseout", /*mouseout_handler*/ ctx[24])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*path, states, step*/ 49) {
    				each_value_4 = /*states*/ ctx[4].filter(func);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_4(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(g, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_4.length;
    			}

    			if (dirty[0] & /*path, counties, step, color, dispatch, handleMousemove*/ 786477) {
    				each_value_3 = /*counties*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(g, each1_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty[0] & /*path, states, step*/ 49) {
    				each_value_2 = /*states*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (/*highlight_props*/ ctx[8]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					if_block0.m(svg, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty[0] & /*$ox, $oy, $w, $h*/ 15360 && svg_viewBox_value !== (svg_viewBox_value = "" + (/*$ox*/ ctx[10] + " " + /*$oy*/ ctx[11] + " " + /*$w*/ ctx[12] + " " + /*$h*/ ctx[13]))) {
    				attr(svg, "viewBox", svg_viewBox_value);
    			}

    			if (/*highlight_props*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*highlight_props*/ 256) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			div_resize_listener();
    			if (detaching) detach(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }
    const func = state => state.id == "28";

    function instance$3($$self, $$props, $$invalidate) {
    	let $ox;
    	let $oy;
    	let $w;
    	let $h;
    	let { step = 0 } = $$props;
    	let { sticky } = $$props;

    	const tweenOptions = {
    		delay: 0,
    		duration: 1000,
    		easing: cubicOut
    	};

    	let width = 100,
    		height = 100,
    		counties = [],
    		states = [],
    		path,
    		map_height,
    		point_elements = {},
    		highlight_props,
    		innerWidth,
    		ox = tweened(598, tweenOptions),
    		oy = tweened(376, tweenOptions),
    		w = tweened(20, tweenOptions),
    		h = tweened(20, tweenOptions);

    	component_subscribe($$self, ox, value => $$invalidate(10, $ox = value));
    	component_subscribe($$self, oy, value => $$invalidate(11, $oy = value));
    	component_subscribe($$self, w, value => $$invalidate(12, $w = value));
    	component_subscribe($$self, h, value => $$invalidate(13, $h = value));

    	function change_viewBox(new_ox, new_oy, new_w, new_h) {
    		ox.set(new_ox);
    		oy.set(new_oy);
    		w.set(new_w);
    		h.set(new_h);
    	}

    	function zoom_level(level) {
    		if (level == "us") {
    			change_viewBox(0, -100, 1000, 700);
    		}

    		if (level == "midsouth") {
    			change_viewBox(560, 350, 100, 100);
    		}

    		if (level == "local") {
    			change_viewBox(598, 376, 20, 20);
    		}

    		if (level == "nashville") {
    			change_viewBox(580, 335, 160, 160);
    		}
    	}

    	let { color } = $$props;
    	const dispatch = createEventDispatcher();

    	// const color = scaleQuantize([-200, 200], schemeBlues[9]);
    	onMount(async () => {
    		const us = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json").then(d => d.json());
    		const flows = await fetch("https://cdn.jsdelivr.net/gh/coleschnell/portfolio_website@master/src/routes/scrollygraph/_assets/flow_15y.json").then(d => d.json());
    		geoAlbersUsa().fitSize([width, height], us);
    		$$invalidate(5, path = geoPath());

    		const state_abbreviations_fips = {
    			"01": "Ala.",
    			"02": "Alaska",
    			"04": "Ariz.",
    			"05": "Ark.",
    			"06": "Calif.",
    			"08": "Colo.",
    			"09": "Conn.",
    			"10": "Del.",
    			"12": "Fla.",
    			"13": "Ga.",
    			"15": "Hawaii",
    			"16": "Idaho",
    			"17": "Ill.",
    			"18": "Ind.",
    			"19": "Iowa",
    			"20": "Kan.",
    			"21": "Ky.",
    			"22": "La.",
    			"23": "Maine",
    			"24": "Md.",
    			"25": "Mass.",
    			"26": "Mich.",
    			"27": "Minn.",
    			"28": "Miss.",
    			"29": "Mo.",
    			"30": "Mont.",
    			"31": "Neb.",
    			"32": "Nev.",
    			"33": "N.H.",
    			"34": "N.J.",
    			"35": "N.M.",
    			"36": "N.Y.",
    			"37": "N.C.",
    			"38": "N.D.",
    			"39": "Ohio",
    			"40": "Okla.",
    			"41": "Ore.",
    			"42": "Pa.",
    			"44": "R.I.",
    			"45": "S.C.",
    			"46": "S.D.",
    			"47": "Tenn.",
    			"48": "Texas",
    			"49": "Utah",
    			"50": "Vt.",
    			"51": "Va.",
    			"53": "Wash.",
    			"54": "W.Va.",
    			"55": "Wis.",
    			"56": "Wyo."
    		};

    		$$invalidate(3, counties = feature(us, us.objects.counties).features.map(county => {
    			county.properties.movedin = flows.MOVEDIN[county.id] ? flows.MOVEDIN[county.id] : 0;

    			county.properties.movedout = flows.MOVEDOUT[county.id]
    			? flows.MOVEDOUT[county.id]
    			: 0;

    			county.properties.movednet = flows.MOVEDNET[county.id]
    			? flows.MOVEDNET[county.id]
    			: 0;

    			county.properties.state = state_abbreviations_fips[county.id.slice(0, 2)];
    			county.properties.point = path.centroid(county);
    			return county;
    		}));

    		$$invalidate(4, states = feature(us, us.objects.states).features);

    		$$invalidate(8, highlight_props = [
    			{
    				id: "47157",
    				init_step: 0,
    				init_ox: 598,
    				style: "label",
    				name: "Shelby Co."
    			},
    			{
    				id: "28033",
    				init_step: 0,
    				init_ox: 598,
    				style: "label",
    				name: "DeSoto Co."
    			},
    			{
    				id: "28137",
    				init_step: 0,
    				init_ox: 598,
    				style: "label",
    				name: "Mississippi"
    			},
    			{
    				id: "47157",
    				init_step: 2,
    				init_ox: 560,
    				angle: -165,
    				name: "1. Shelby County, Tenn."
    			},
    			{
    				id: "28027",
    				init_step: 3,
    				init_ox: 560,
    				angle: -165,
    				name: "2. Coahoma County, Miss."
    			},
    			{
    				id: "28143",
    				init_step: 3,
    				init_ox: 560,
    				angle: 25,
    				line_width: 100,
    				name: "3. Tunica County, Miss."
    			},
    			{
    				id: "28133",
    				init_step: 3,
    				init_ox: 560,
    				angle: 25,
    				name: "4. Sunflower County, Miss."
    			},
    			{
    				id: "34003",
    				init_step: 4,
    				init_ox: 0,
    				angle: -150,
    				name: "5. Bergen County, N.J."
    			},
    			{
    				id: "28105",
    				init_step: 6,
    				init_ox: 580,
    				angle: 10,
    				name: "1. Oktibbeha County, Miss."
    			},
    			{
    				id: "47037",
    				init_step: 7,
    				init_ox: 580,
    				angle: 91,
    				name: "2. Davidson County, Tenn."
    			},
    			{
    				id: "28093",
    				init_step: 8,
    				init_ox: 580,
    				angle: 44,
    				name: "3. Marshall County, Miss."
    			},
    			{
    				id: "28059",
    				init_step: 8,
    				init_ox: 580,
    				angle: 0,
    				name: "4. Jackson County, Miss."
    			},
    			{
    				id: "47035",
    				init_step: 8,
    				init_ox: 580,
    				angle: 46,
    				name: "5. Cumberland County, Tenn."
    			},
    			{
    				id: "02020",
    				init_step: 9,
    				init_ox: 0,
    				angle: -30,
    				name: "Anchorage Municipality, Alaska"
    			}
    		]);
    	});

    	function handleMousemove(feature) {
    		return function handleMousemoveFn(e) {
    			// When the element gets raised, it flashes 0,0 for a second so skip that
    			if (e.layerX !== 0 && e.layerY !== 0) {
    				dispatch("mousemove", {
    					e,
    					props: feature.properties,
    					id: feature.id
    				});
    			}
    		};
    	}

    	function onwindowresize() {
    		$$invalidate(9, innerWidth = window.innerWidth);
    	}

    	const mouseover_handler = (feature, e) => dispatch("mousemove", {
    		e,
    		props: feature.properties,
    		id: feature.id
    	});

    	const func_1 = county => highlight_props.map(x => x.id).includes(county.id);

    	function circle_binding($$value, county) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			point_elements[county.id] = $$value;
    			$$invalidate(7, point_elements);
    		});
    	}

    	const mouseout_handler = () => dispatch("mouseout");

    	function div_elementresize_handler() {
    		map_height = this.clientHeight;
    		$$invalidate(6, map_height);
    	}

    	const func_2 = (props, county) => county.id == props.id;

    	$$self.$$set = $$props => {
    		if ('step' in $$props) $$invalidate(0, step = $$props.step);
    		if ('sticky' in $$props) $$invalidate(1, sticky = $$props.sticky);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*step*/ 1) {
    			{
    				if (step >= 1 && step <= 3) {
    					zoom_level("midsouth");
    				}

    				if (step == 0) {
    					zoom_level("local");
    				}

    				if (step == 4) {
    					zoom_level("us");
    				}

    				if (step >= 5 && step <= 8) {
    					zoom_level("nashville");
    				}

    				if (step >= 9) {
    					zoom_level("us");
    				}
    			}
    		}
    	};

    	return [
    		step,
    		sticky,
    		color,
    		counties,
    		states,
    		path,
    		map_height,
    		point_elements,
    		highlight_props,
    		innerWidth,
    		$ox,
    		$oy,
    		$w,
    		$h,
    		ox,
    		oy,
    		w,
    		h,
    		dispatch,
    		handleMousemove,
    		onwindowresize,
    		mouseover_handler,
    		func_1,
    		circle_binding,
    		mouseout_handler,
    		div_elementresize_handler,
    		func_2
    	];
    }

    let Map$1 = class Map extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { step: 0, sticky: 1, color: 2 }, add_css$2, [-1, -1]);
    	}
    };

    /* src/routes/scrollygraph/_compotents/Tooltip.svelte generated by Svelte v3.59.2 */

    function add_css$1(target) {
    	append_styles(target, "svelte-65tlf1", ".tooltip.svelte-65tlf1{position:absolute;width:150px;border:1px solid #ccc;font-size:13px;background:rgba(255, 255, 255, 0.85);transform:translate(-50%, -100%);padding:5px;z-index:15}.inside.svelte-65tlf1{display:flex;flex-direction:column;width:100%}.name.svelte-65tlf1{width:100%;text-align:left}");
    }

    // (18:2) {#if evt.detail}
    function create_if_block$1(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block0 = /*evt*/ ctx[0].detail.id != "28033" && create_if_block_2$1(ctx);
    	let if_block1 = /*evt*/ ctx[0].detail.id == "28033" && create_if_block_1$1();

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr(div, "class", "tooltip svelte-65tlf1");
    			set_style(div, "top", /*evt*/ ctx[0].detail.e.layerY + /*offset*/ ctx[1] + "px");
    			set_style(div, "left", /*evt*/ ctx[0].detail.e.layerX + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append$1(div, t);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*evt*/ ctx[0].detail.id != "28033") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*evt*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*evt*/ ctx[0].detail.id == "28033") {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$1();
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*evt, offset*/ 3) {
    				set_style(div, "top", /*evt*/ ctx[0].detail.e.layerY + /*offset*/ ctx[1] + "px");
    			}

    			if (!current || dirty & /*evt*/ 1) {
    				set_style(div, "left", /*evt*/ ctx[0].detail.e.layerX + "px");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    // (26:4) {#if evt.detail.id != "28033"}
    function create_if_block_2$1(ctx) {
    	let infoblurb;
    	let current;

    	infoblurb = new InfoBlurb({
    			props: {
    				color: /*color*/ ctx[2],
    				props: /*evt*/ ctx[0].detail.props
    			}
    		});

    	return {
    		c() {
    			create_component(infoblurb.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(infoblurb, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const infoblurb_changes = {};
    			if (dirty & /*color*/ 4) infoblurb_changes.color = /*color*/ ctx[2];
    			if (dirty & /*evt*/ 1) infoblurb_changes.props = /*evt*/ ctx[0].detail.props;
    			infoblurb.$set(infoblurb_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(infoblurb.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(infoblurb.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(infoblurb, detaching);
    		}
    	};
    }

    // (29:4) {#if evt.detail.id == "28033"}
    function create_if_block_1$1(ctx) {
    	let div1;

    	return {
    		c() {
    			div1 = element("div");
    			div1.innerHTML = `<div class="name svelte-65tlf1"><b>DeSoto County</b></div>`;
    			attr(div1, "class", "inside svelte-65tlf1");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*evt*/ ctx[0].detail && create_if_block$1(ctx);

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
    			if (/*evt*/ ctx[0].detail) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*evt*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { evt = {} } = $$props;
    	let { offset = -35 } = $$props;
    	let { color } = $$props;

    	$$self.$$set = $$props => {
    		if ('evt' in $$props) $$invalidate(0, evt = $$props.evt);
    		if ('offset' in $$props) $$invalidate(1, offset = $$props.offset);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    	};

    	return [evt, offset, color];
    }

    class Tooltip extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { evt: 0, offset: 1, color: 2 }, add_css$1);
    	}
    }

    /* src/routes/scrollygraph/_compotents/Scrolly.svelte generated by Svelte v3.59.2 */

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[8](div);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[6],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
    						null
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
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[8](null);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { root = null } = $$props;
    	let { top = 0 } = $$props;
    	let { bottom = 0 } = $$props;
    	let { increments = 100 } = $$props;
    	let { value = undefined } = $$props;
    	const steps = [];
    	const threshold = [];
    	let nodes = [];
    	let intersectionObservers = [];
    	let container;

    	const update = () => {
    		if (!nodes.length) return;
    		nodes.forEach(createObserver);
    	};

    	const mostInView = () => {
    		let maxRatio = 0;
    		let maxIndex = 0;

    		for (let i = 0; i < steps.length; i++) {
    			if (steps[i] > maxRatio) {
    				maxRatio = steps[i];
    				maxIndex = i;
    			}
    		}

    		if (maxRatio > 0) $$invalidate(1, value = maxIndex); else $$invalidate(1, value = undefined);
    	};

    	const createObserver = (node, index) => {
    		const handleIntersect = e => {
    			e[0].isIntersecting;
    			const ratio = e[0].intersectionRatio;
    			steps[index] = ratio;
    			mostInView();
    		};

    		const marginTop = top ? top * -1 : 0;
    		const marginBottom = bottom ? bottom * -1 : 0;
    		const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
    		const options = { root, rootMargin, threshold };
    		if (intersectionObservers[index]) intersectionObservers[index].disconnect();
    		const io = new IntersectionObserver(handleIntersect, options);
    		io.observe(node);
    		intersectionObservers[index] = io;
    	};

    	onMount(() => {
    		for (let i = 0; i < increments + 1; i++) {
    			threshold.push(i / increments);
    		}

    		nodes = container.querySelectorAll(":scope > *");
    		update();
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('root' in $$props) $$invalidate(2, root = $$props.root);
    		if ('top' in $$props) $$invalidate(3, top = $$props.top);
    		if ('bottom' in $$props) $$invalidate(4, bottom = $$props.bottom);
    		if ('increments' in $$props) $$invalidate(5, increments = $$props.increments);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('$$scope' in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*top, bottom*/ 24) {
    			(update());
    		}
    	};

    	return [container, value, root, top, bottom, increments, $$scope, slots, div_binding];
    }

    class Scrolly extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			root: 2,
    			top: 3,
    			bottom: 4,
    			increments: 5,
    			value: 1
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var sticky_compile = {exports: {}};

    (function (module, exports) {
    	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    	/**
    	 * Sticky.js
    	 * Library for sticky elements written in vanilla javascript. With this library you can easily set sticky elements on your website. It's also responsive.
    	 *
    	 * @version 1.3.0
    	 * @author Rafal Galus <biuro@rafalgalus.pl>
    	 * @website https://rgalus.github.io/sticky-js/
    	 * @repo https://github.com/rgalus/sticky-js
    	 * @license https://github.com/rgalus/sticky-js/blob/master/LICENSE
    	 */
    	var Sticky = /*#__PURE__*/function () {
    	  /**
    	   * Sticky instance constructor
    	   * @constructor
    	   * @param {string} selector - Selector which we can find elements
    	   * @param {string} options - Global options for sticky elements (could be overwritten by data-{option}="" attributes)
    	   */
    	  function Sticky() {
    	    var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    	    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    	    _classCallCheck(this, Sticky);

    	    this.selector = selector;
    	    this.elements = [];
    	    this.version = '1.3.0';
    	    this.vp = this.getViewportSize();
    	    this.body = document.querySelector('body');
    	    this.options = {
    	      wrap: options.wrap || false,
    	      wrapWith: options.wrapWith || '<span></span>',
    	      marginTop: options.marginTop || 0,
    	      marginBottom: options.marginBottom || 0,
    	      stickyFor: options.stickyFor || 0,
    	      stickyClass: options.stickyClass || null,
    	      stickyContainer: options.stickyContainer || 'body'
    	    };
    	    this.updateScrollTopPosition = this.updateScrollTopPosition.bind(this);
    	    this.updateScrollTopPosition();
    	    window.addEventListener('load', this.updateScrollTopPosition);
    	    window.addEventListener('scroll', this.updateScrollTopPosition);
    	    this.run();
    	  }
    	  /**
    	   * Function that waits for page to be fully loaded and then renders & activates every sticky element found with specified selector
    	   * @function
    	   */


    	  _createClass(Sticky, [{
    	    key: "run",
    	    value: function run() {
    	      var _this = this;

    	      // wait for page to be fully loaded
    	      var pageLoaded = setInterval(function () {
    	        if (document.readyState === 'complete') {
    	          clearInterval(pageLoaded);
    	          var elements = document.querySelectorAll(_this.selector);

    	          _this.forEach(elements, function (element) {
    	            return _this.renderElement(element);
    	          });
    	        }
    	      }, 10);
    	    }
    	    /**
    	     * Function that assign needed variables for sticky element, that are used in future for calculations and other
    	     * @function
    	     * @param {node} element - Element to be rendered
    	     */

    	  }, {
    	    key: "renderElement",
    	    value: function renderElement(element) {
    	      var _this2 = this;

    	      // create container for variables needed in future
    	      element.sticky = {}; // set default variables

    	      element.sticky.active = false;
    	      element.sticky.marginTop = parseInt(element.getAttribute('data-margin-top')) || this.options.marginTop;
    	      element.sticky.marginBottom = parseInt(element.getAttribute('data-margin-bottom')) || this.options.marginBottom;
    	      element.sticky.stickyFor = parseInt(element.getAttribute('data-sticky-for')) || this.options.stickyFor;
    	      element.sticky.stickyClass = element.getAttribute('data-sticky-class') || this.options.stickyClass;
    	      element.sticky.wrap = element.hasAttribute('data-sticky-wrap') ? true : this.options.wrap; // @todo attribute for stickyContainer
    	      // element.sticky.stickyContainer = element.getAttribute('data-sticky-container') || this.options.stickyContainer;

    	      element.sticky.stickyContainer = this.options.stickyContainer;
    	      element.sticky.container = this.getStickyContainer(element);
    	      element.sticky.container.rect = this.getRectangle(element.sticky.container);
    	      element.sticky.rect = this.getRectangle(element); // fix when element is image that has not yet loaded and width, height = 0

    	      if (element.tagName.toLowerCase() === 'img') {
    	        element.onload = function () {
    	          return element.sticky.rect = _this2.getRectangle(element);
    	        };
    	      }

    	      if (element.sticky.wrap) {
    	        this.wrapElement(element);
    	      } // activate rendered element


    	      this.activate(element);
    	    }
    	    /**
    	     * Wraps element into placeholder element
    	     * @function
    	     * @param {node} element - Element to be wrapped
    	     */

    	  }, {
    	    key: "wrapElement",
    	    value: function wrapElement(element) {
    	      element.insertAdjacentHTML('beforebegin', element.getAttribute('data-sticky-wrapWith') || this.options.wrapWith);
    	      element.previousSibling.appendChild(element);
    	    }
    	    /**
    	     * Function that activates element when specified conditions are met and then initalise events
    	     * @function
    	     * @param {node} element - Element to be activated
    	     */

    	  }, {
    	    key: "activate",
    	    value: function activate(element) {
    	      if (element.sticky.rect.top + element.sticky.rect.height < element.sticky.container.rect.top + element.sticky.container.rect.height && element.sticky.stickyFor < this.vp.width && !element.sticky.active) {
    	        element.sticky.active = true;
    	      }

    	      if (this.elements.indexOf(element) < 0) {
    	        this.elements.push(element);
    	      }

    	      if (!element.sticky.resizeEvent) {
    	        this.initResizeEvents(element);
    	        element.sticky.resizeEvent = true;
    	      }

    	      if (!element.sticky.scrollEvent) {
    	        this.initScrollEvents(element);
    	        element.sticky.scrollEvent = true;
    	      }

    	      this.setPosition(element);
    	    }
    	    /**
    	     * Function which is adding onResizeEvents to window listener and assigns function to element as resizeListener
    	     * @function
    	     * @param {node} element - Element for which resize events are initialised
    	     */

    	  }, {
    	    key: "initResizeEvents",
    	    value: function initResizeEvents(element) {
    	      var _this3 = this;

    	      element.sticky.resizeListener = function () {
    	        return _this3.onResizeEvents(element);
    	      };

    	      window.addEventListener('resize', element.sticky.resizeListener);
    	    }
    	    /**
    	     * Removes element listener from resize event
    	     * @function
    	     * @param {node} element - Element from which listener is deleted
    	     */

    	  }, {
    	    key: "destroyResizeEvents",
    	    value: function destroyResizeEvents(element) {
    	      window.removeEventListener('resize', element.sticky.resizeListener);
    	    }
    	    /**
    	     * Function which is fired when user resize window. It checks if element should be activated or deactivated and then run setPosition function
    	     * @function
    	     * @param {node} element - Element for which event function is fired
    	     */

    	  }, {
    	    key: "onResizeEvents",
    	    value: function onResizeEvents(element) {
    	      this.vp = this.getViewportSize();
    	      element.sticky.rect = this.getRectangle(element);
    	      element.sticky.container.rect = this.getRectangle(element.sticky.container);

    	      if (element.sticky.rect.top + element.sticky.rect.height < element.sticky.container.rect.top + element.sticky.container.rect.height && element.sticky.stickyFor < this.vp.width && !element.sticky.active) {
    	        element.sticky.active = true;
    	      } else if (element.sticky.rect.top + element.sticky.rect.height >= element.sticky.container.rect.top + element.sticky.container.rect.height || element.sticky.stickyFor >= this.vp.width && element.sticky.active) {
    	        element.sticky.active = false;
    	      }

    	      this.setPosition(element);
    	    }
    	    /**
    	     * Function which is adding onScrollEvents to window listener and assigns function to element as scrollListener
    	     * @function
    	     * @param {node} element - Element for which scroll events are initialised
    	     */

    	  }, {
    	    key: "initScrollEvents",
    	    value: function initScrollEvents(element) {
    	      var _this4 = this;

    	      element.sticky.scrollListener = function () {
    	        return _this4.onScrollEvents(element);
    	      };

    	      window.addEventListener('scroll', element.sticky.scrollListener);
    	    }
    	    /**
    	     * Removes element listener from scroll event
    	     * @function
    	     * @param {node} element - Element from which listener is deleted
    	     */

    	  }, {
    	    key: "destroyScrollEvents",
    	    value: function destroyScrollEvents(element) {
    	      window.removeEventListener('scroll', element.sticky.scrollListener);
    	    }
    	    /**
    	     * Function which is fired when user scroll window. If element is active, function is invoking setPosition function
    	     * @function
    	     * @param {node} element - Element for which event function is fired
    	     */

    	  }, {
    	    key: "onScrollEvents",
    	    value: function onScrollEvents(element) {
    	      if (element.sticky && element.sticky.active) {
    	        this.setPosition(element);
    	      }
    	    }
    	    /**
    	     * Main function for the library. Here are some condition calculations and css appending for sticky element when user scroll window
    	     * @function
    	     * @param {node} element - Element that will be positioned if it's active
    	     */

    	  }, {
    	    key: "setPosition",
    	    value: function setPosition(element) {
    	      this.css(element, {
    	        position: '',
    	        width: '',
    	        top: '',
    	        left: ''
    	      });

    	      if (this.vp.height < element.sticky.rect.height || !element.sticky.active) {
    	        return;
    	      }

    	      if (!element.sticky.rect.width) {
    	        element.sticky.rect = this.getRectangle(element);
    	      }

    	      if (element.sticky.wrap) {
    	        this.css(element.parentNode, {
    	          display: 'block',
    	          width: element.sticky.rect.width + 'px',
    	          height: element.sticky.rect.height + 'px'
    	        });
    	      }

    	      if (element.sticky.rect.top === 0 && element.sticky.container === this.body) {
    	        this.css(element, {
    	          position: 'fixed',
    	          top: element.sticky.rect.top + 'px',
    	          left: element.sticky.rect.left + 'px',
    	          width: element.sticky.rect.width + 'px'
    	        });

    	        if (element.sticky.stickyClass) {
    	          element.classList.add(element.sticky.stickyClass);
    	        }
    	      } else if (this.scrollTop > element.sticky.rect.top - element.sticky.marginTop) {
    	        this.css(element, {
    	          position: 'fixed',
    	          width: element.sticky.rect.width + 'px',
    	          left: element.sticky.rect.left + 'px'
    	        });

    	        if (this.scrollTop + element.sticky.rect.height + element.sticky.marginTop > element.sticky.container.rect.top + element.sticky.container.offsetHeight - element.sticky.marginBottom) {
    	          if (element.sticky.stickyClass) {
    	            element.classList.remove(element.sticky.stickyClass);
    	          }

    	          this.css(element, {
    	            top: element.sticky.container.rect.top + element.sticky.container.offsetHeight - (this.scrollTop + element.sticky.rect.height + element.sticky.marginBottom) + 'px'
    	          });
    	        } else {
    	          if (element.sticky.stickyClass) {
    	            element.classList.add(element.sticky.stickyClass);
    	          }

    	          this.css(element, {
    	            top: element.sticky.marginTop + 'px'
    	          });
    	        }
    	      } else {
    	        if (element.sticky.stickyClass) {
    	          element.classList.remove(element.sticky.stickyClass);
    	        }

    	        this.css(element, {
    	          position: '',
    	          width: '',
    	          top: '',
    	          left: ''
    	        });

    	        if (element.sticky.wrap) {
    	          this.css(element.parentNode, {
    	            display: '',
    	            width: '',
    	            height: ''
    	          });
    	        }
    	      }
    	    }
    	    /**
    	     * Function that updates element sticky rectangle (with sticky container), then activate or deactivate element, then update position if it's active
    	     * @function
    	     */

    	  }, {
    	    key: "update",
    	    value: function update() {
    	      var _this5 = this;

    	      this.forEach(this.elements, function (element) {
    	        element.sticky.rect = _this5.getRectangle(element);
    	        element.sticky.container.rect = _this5.getRectangle(element.sticky.container);

    	        _this5.activate(element);

    	        _this5.setPosition(element);
    	      });
    	    }
    	    /**
    	     * Destroys sticky element, remove listeners
    	     * @function
    	     */

    	  }, {
    	    key: "destroy",
    	    value: function destroy() {
    	      var _this6 = this;

    	      window.removeEventListener('load', this.updateScrollTopPosition);
    	      window.removeEventListener('scroll', this.updateScrollTopPosition);
    	      this.forEach(this.elements, function (element) {
    	        _this6.destroyResizeEvents(element);

    	        _this6.destroyScrollEvents(element);

    	        delete element.sticky;
    	      });
    	    }
    	    /**
    	     * Function that returns container element in which sticky element is stuck (if is not specified, then it's stuck to body)
    	     * @function
    	     * @param {node} element - Element which sticky container are looked for
    	     * @return {node} element - Sticky container
    	     */

    	  }, {
    	    key: "getStickyContainer",
    	    value: function getStickyContainer(element) {
    	      var container = element.parentNode;

    	      while (!container.hasAttribute('data-sticky-container') && !container.parentNode.querySelector(element.sticky.stickyContainer) && container !== this.body) {
    	        container = container.parentNode;
    	      }

    	      return container;
    	    }
    	    /**
    	     * Function that returns element rectangle & position (width, height, top, left)
    	     * @function
    	     * @param {node} element - Element which position & rectangle are returned
    	     * @return {object}
    	     */

    	  }, {
    	    key: "getRectangle",
    	    value: function getRectangle(element) {
    	      this.css(element, {
    	        position: '',
    	        width: '',
    	        top: '',
    	        left: ''
    	      });
    	      var width = Math.max(element.offsetWidth, element.clientWidth, element.scrollWidth);
    	      var height = Math.max(element.offsetHeight, element.clientHeight, element.scrollHeight);
    	      var top = 0;
    	      var left = 0;

    	      do {
    	        top += element.offsetTop || 0;
    	        left += element.offsetLeft || 0;
    	        element = element.offsetParent;
    	      } while (element);

    	      return {
    	        top: top,
    	        left: left,
    	        width: width,
    	        height: height
    	      };
    	    }
    	    /**
    	     * Function that returns viewport dimensions
    	     * @function
    	     * @return {object}
    	     */

    	  }, {
    	    key: "getViewportSize",
    	    value: function getViewportSize() {
    	      return {
    	        width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    	        height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    	      };
    	    }
    	    /**
    	     * Function that updates window scroll position
    	     * @function
    	     * @return {number}
    	     */

    	  }, {
    	    key: "updateScrollTopPosition",
    	    value: function updateScrollTopPosition() {
    	      this.scrollTop = (window.pageYOffset || document.scrollTop) - (document.clientTop || 0) || 0;
    	    }
    	    /**
    	     * Helper function for loops
    	     * @helper
    	     * @param {array}
    	     * @param {function} callback - Callback function (no need for explanation)
    	     */

    	  }, {
    	    key: "forEach",
    	    value: function forEach(array, callback) {
    	      for (var i = 0, len = array.length; i < len; i++) {
    	        callback(array[i]);
    	      }
    	    }
    	    /**
    	     * Helper function to add/remove css properties for specified element.
    	     * @helper
    	     * @param {node} element - DOM element
    	     * @param {object} properties - CSS properties that will be added/removed from specified element
    	     */

    	  }, {
    	    key: "css",
    	    value: function css(element, properties) {
    	      for (var property in properties) {
    	        if (properties.hasOwnProperty(property)) {
    	          element.style[property] = properties[property];
    	        }
    	      }
    	    }
    	  }]);

    	  return Sticky;
    	}();
    	/**
    	 * Export function that supports AMD, CommonJS and Plain Browser.
    	 */


    	(function (root, factory) {
    	  {
    	    module.exports = factory;
    	  }
    	})(commonjsGlobal, Sticky); 
    } (sticky_compile));

    var sticky_compileExports = sticky_compile.exports;

    var Sticky = sticky_compileExports;

    var stickyJs = Sticky;

    var Sticky$1 = /*@__PURE__*/getDefaultExportFromCjs(stickyJs);

    /* src/routes/scrollygraph/_each/ScrollyMap.svelte generated by Svelte v3.59.2 */

    function add_css(target) {
    	append_styles(target, "svelte-1vwlxi5", ".svelte-1vwlxi5.svelte-1vwlxi5{font-family:Graphik Web,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji}body{overflow-x:hidden}section.svelte-1vwlxi5.svelte-1vwlxi5{width:100%;max-width:672px}.sticky.svelte-1vwlxi5.svelte-1vwlxi5{width:100%;max-width:672px;margin:0 !important;position:relative;transition:top 1s;z-index:0}.section-container.svelte-1vwlxi5.svelte-1vwlxi5{margin-top:1em;text-align:center;transition:background 100ms;display:flex}.step.svelte-1vwlxi5.svelte-1vwlxi5{height:80vh;display:flex;place-items:center;justify-content:center}.step-content.svelte-1vwlxi5.svelte-1vwlxi5{background:whitesmoke;color:#ccc;border-radius:5px;padding:0.5rem 1rem;display:flex;flex-direction:column;justify-content:center;transition:background 500ms ease;box-shadow:1px 1px 10px rgba(0, 0, 0, 0.2);text-align:left;width:75%;margin:auto;max-width:500px;font-family:'Guardian Text Egyptian ACBJ Web',Georgia,'Times New Roman',serif}.step.active.svelte-1vwlxi5 .step-content.svelte-1vwlxi5{background:white;color:black}.steps-container.svelte-1vwlxi5.svelte-1vwlxi5{height:100%}.steps-container.svelte-1vwlxi5.svelte-1vwlxi5{flex:1 1 40%}.source.svelte-1vwlxi5.svelte-1vwlxi5{position:absolute;left:0px;font-size:12.5px;color:#666;width:calc(100% - 20px);padding:10px 0px;line-height:15px;text-align:left}.section-container.svelte-1vwlxi5.svelte-1vwlxi5{flex-direction:column-reverse}.sticky.svelte-1vwlxi5.svelte-1vwlxi5{width:95%;margin:auto}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (44:24) {#if i != 0}
    function create_if_block_2(ctx) {
    	let div;
    	let raw_value = /*text*/ ctx[13] + "";

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "step-content svelte-1vwlxi5");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: noop$1,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (42:16) {#each steps as text, i}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let if_block = /*i*/ ctx[15] != 0 && create_if_block_2(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			attr(div, "class", "step svelte-1vwlxi5");

    			set_style(div, "visibility", /*i*/ ctx[15] == /*steps*/ ctx[6].length - 1
    			? "hidden"
    			: "visible");

    			toggle_class(div, "active", /*value*/ ctx[0] === /*i*/ ctx[15]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append$1(div, t);
    		},
    		p(ctx, dirty) {
    			if (/*i*/ ctx[15] != 0) if_block.p(ctx, dirty);

    			if (dirty & /*value*/ 1) {
    				toggle_class(div, "active", /*value*/ ctx[0] === /*i*/ ctx[15]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (41:12) <Scrolly bind:value>
    function create_default_slot(ctx) {
    	let each_1_anchor;
    	let each_value = /*steps*/ ctx[6];
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
    		p(ctx, dirty) {
    			if (dirty & /*steps, value*/ 65) {
    				each_value = /*steps*/ ctx[6];
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
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (52:12) {#if hideTooltip !== true && value == 10}
    function create_if_block_1(ctx) {
    	let tooltip;
    	let current;

    	tooltip = new Tooltip({
    			props: {
    				evt: /*evt*/ ctx[3],
    				color: /*color*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(tooltip.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tooltip, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tooltip_changes = {};
    			if (dirty & /*evt*/ 8) tooltip_changes.evt = /*evt*/ ctx[3];
    			tooltip.$set(tooltip_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tooltip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tooltip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tooltip, detaching);
    		}
    	};
    }

    // (55:12) {#if value > 0}
    function create_if_block(ctx) {
    	let legend;
    	let current;

    	legend = new Legend({
    			props: {
    				colorScale: /*color*/ ctx[5],
    				title: "Net migration to DeSoto",
    				tickFormat: `.2~s`
    			}
    		});

    	return {
    		c() {
    			create_component(legend.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(legend, target, anchor);
    			current = true;
    		},
    		p: noop$1,
    		i(local) {
    			if (current) return;
    			transition_in(legend.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(legend.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(legend, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let section;
    	let div3;
    	let div0;
    	let scrolly;
    	let updating_value;
    	let div0_resize_listener;
    	let t0;
    	let div2;
    	let t1;
    	let t2;
    	let map;
    	let t3;
    	let div1;
    	let current;

    	function scrolly_value_binding(value) {
    		/*scrolly_value_binding*/ ctx[7](value);
    	}

    	let scrolly_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		scrolly_props.value = /*value*/ ctx[0];
    	}

    	scrolly = new Scrolly({ props: scrolly_props });
    	binding_callbacks.push(() => bind(scrolly, 'value', scrolly_value_binding));
    	let if_block0 = /*hideTooltip*/ ctx[4] !== true && /*value*/ ctx[0] == 10 && create_if_block_1(ctx);
    	let if_block1 = /*value*/ ctx[0] > 0 && create_if_block(ctx);

    	map = new Map$1({
    			props: {
    				color: /*color*/ ctx[5],
    				sticky: /*sticky_element*/ ctx[1],
    				step: /*value*/ ctx[0]
    			}
    		});

    	map.$on("mousemove", /*mousemove_handler*/ ctx[9]);
    	map.$on("mouseout", /*mouseout_handler*/ ctx[10]);

    	return {
    		c() {
    			section = element("section");
    			div3 = element("div");
    			div0 = element("div");
    			create_component(scrolly.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			create_component(map.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "Source: U.S. Census Bureau's 5-year American Community Survey Migration Flows (2006-2010, 2011-2015, 2016-2020)";
    			attr(div0, "class", "steps-container svelte-1vwlxi5");

    			set_style(div0, "z-index", /*value*/ ctx[0] != /*steps*/ ctx[6].length - 1
    			? 10
    			: -10);

    			add_render_callback(() => /*div0_elementresize_handler*/ ctx[8].call(div0));
    			attr(div1, "class", "source svelte-1vwlxi5");
    			attr(div2, "class", "sticky svelte-1vwlxi5");
    			attr(div2, "data-margin-top", "300");
    			set_style(div2, "left", "unset", 1);
    			attr(div3, "class", "section-container svelte-1vwlxi5");
    			attr(div3, "data-sticky-container", "");
    			set_style(div3, "margin", "0");

    			set_style(div3, "z-index", /*value*/ ctx[0] != /*steps*/ ctx[6].length - 1
    			? 10
    			: -10);

    			set_style(section, "padding", "0");
    			attr(section, "class", "svelte-1vwlxi5");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append$1(section, div3);
    			append$1(div3, div0);
    			mount_component(scrolly, div0, null);
    			div0_resize_listener = add_iframe_resize_listener(div0, /*div0_elementresize_handler*/ ctx[8].bind(div0));
    			append$1(div3, t0);
    			append$1(div3, div2);
    			if (if_block0) if_block0.m(div2, null);
    			append$1(div2, t1);
    			if (if_block1) if_block1.m(div2, null);
    			append$1(div2, t2);
    			mount_component(map, div2, null);
    			append$1(div2, t3);
    			append$1(div2, div1);
    			/*div2_binding*/ ctx[11](div2);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const scrolly_changes = {};

    			if (dirty & /*$$scope, value*/ 65537) {
    				scrolly_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				scrolly_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			scrolly.$set(scrolly_changes);

    			if (!current || dirty & /*value*/ 1) {
    				set_style(div0, "z-index", /*value*/ ctx[0] != /*steps*/ ctx[6].length - 1
    				? 10
    				: -10);
    			}

    			if (/*hideTooltip*/ ctx[4] !== true && /*value*/ ctx[0] == 10) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*hideTooltip, value*/ 17) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div2, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*value*/ ctx[0] > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*value*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div2, t2);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			const map_changes = {};
    			if (dirty & /*sticky_element*/ 2) map_changes.sticky = /*sticky_element*/ ctx[1];
    			if (dirty & /*value*/ 1) map_changes.step = /*value*/ ctx[0];
    			map.$set(map_changes);

    			if (!current || dirty & /*value*/ 1) {
    				set_style(div3, "z-index", /*value*/ ctx[0] != /*steps*/ ctx[6].length - 1
    				? 10
    				: -10);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(scrolly.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(map.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(scrolly.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(map.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_component(scrolly);
    			div0_resize_listener();
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_component(map);
    			/*div2_binding*/ ctx[11](null);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const color = sequential(interpolatePiYG).domain([-2000, 2000]);
    	let value = 0, sticky_element, steps_height;

    	onMount(async () => {
    		new Sticky$1(".sticky");
    	});

    	const steps = [
    		'',
    		'<p class="content__segment combx paywall__content">The U.S. Census Bureau\'s American Community Survey (ACS) measured county-to-county migration flows from 2006 to 2020. The net migration – or number of net movers – is the number of people who moved to a county minus the number of people left for another county.</p><p class="content__segment combx paywall__content">Green represents counties that DeSoto had positive net migration (or net movers) – more people moved from that county to DeSoto than moved to the county from DeSoto.</p>',
    		'<p class="content__segment combx paywall__content">Shelby County was the biggest loser, in terms of net migration to DeSoto. The Tennessee county had a net migration of about 19,190 residents to DeSoto from 2006 to 2020.</p>',
    		'<p class="content__segment combx paywall__content">Shelby lost significantly more net movers than the next three counties. Those places, all in Mississippi, had a combined net migration of 7,370 from 2006 to 2020.</p>',
    		'<p class="content__segment combx paywall__content">Over 1,000 miles away, Bergen County – where Newark is located and the largest county in New Jersey – had the fifth-largest net migration in favor of DeSoto.</p>',
    		'<p class="content__segment combx paywall__content">DeSoto is not so alluring that every local county has flocks of movers to it. For instance, university students seem to be leaving for college and not returning home to DeSoto after college.</p><p class="content__segment combx paywall__content">Pink represents counties that DeSoto had negative net migration (or net movers) – more people moved to that county from DeSoto than moved from the county to DeSoto.</p>',
    		'<p class="content__segment combx paywall__content">Oktibbeha County, where Mississippi State University is located, gained 4,025 residents from DeSoto and lost only 820 residents to DeSoto, gaining 3,205 net movers in the exchange from 2006 to 2020.</p>',
    		'<p class="content__segment combx paywall__content">Davidson County, the second-largest Tennessee county following Shelby, attracted the second-most net movers, gaining 2,300 residents from DeSoto over the 15 years studied.</p>',
    		'<p class="content__segment combx paywall__content">Adjacent to DeSoto, Marshall County had the third-most negative net movers, exchanging 14,690 movers, including those who were leaving and those coming. Whereas, both farther away, the counties with the fourth- and fifth-most negative net movers exchanged less than 2,000 residents each; nearly all were residents who moved away from DeSoto.</p>',
    		'<p class="content__segment combx paywall__content">The farthest U.S. county to have migration with DeSoto was Anchorage, Alaska. However, 1,520 net movers came to DeSoto from other nations in the 15 years, compared to total domestic net migration of 34,295.</p>',
    		''
    	];

    	let evt;
    	let hideTooltip = true;

    	function scrolly_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function div0_elementresize_handler() {
    		steps_height = this.clientHeight;
    		$$invalidate(2, steps_height);
    	}

    	const mousemove_handler = event => $$invalidate(3, evt = $$invalidate(4, hideTooltip = event));
    	const mouseout_handler = () => $$invalidate(4, hideTooltip = true);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			sticky_element = $$value;
    			$$invalidate(1, sticky_element);
    		});
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 1) {
    			console.log(value);
    		}
    	};

    	return [
    		value,
    		sticky_element,
    		steps_height,
    		evt,
    		hideTooltip,
    		color,
    		steps,
    		scrolly_value_binding,
    		div0_elementresize_handler,
    		mousemove_handler,
    		mouseout_handler,
    		div2_binding
    	];
    }

    class ScrollyMap extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
    	}
    }

    var div = document.createElement("div");
    var script = document.currentScript;
    script.parentNode.insertBefore(div, script);

    new ScrollyMap({
      target: div,
      props: {},
    });

})();
