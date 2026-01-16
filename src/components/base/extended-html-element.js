// Class-level cache for templates and styles
const resourceCache = new Map();

export default class ExtendedHtmlElement extends HTMLElement {
  // Promise that resolves when the component is fully set up
  #readyResolve;
  #isSetup = false;
  #eventUnlisteners = [];
  ready;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Create ready promise
    this.ready = new Promise(resolve => {
      this.#readyResolve = resolve;
    });
  }

  /**
   * Returns true if the component has completed setup
   */
  get isSetup() {
    return this.#isSetup;
  }

  async connectedCallback() {
    await this.setupComponent();
    this.setup?.();
    this.#isSetup = true;
    this.#readyResolve();
  }

  disconnectedCallback() {
    // Clean up managed event listeners
    for (const unlisten of this.#eventUnlisteners) {
      unlisten();
    }
    this.#eventUnlisteners = [];

    // Call component's cleanup method if defined
    this.cleanup?.();
  }

  // ============================================================================
  // Query Helpers
  // ============================================================================

  /**
   * Shorthand for this.shadowRoot.querySelector()
   * @param {string} selector - CSS selector
   * @returns {Element|null}
   */
  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  /**
   * Shorthand for this.shadowRoot.querySelectorAll()
   * @param {string} selector - CSS selector
   * @returns {NodeList}
   */
  $$(selector) {
    return this.shadowRoot.querySelectorAll(selector);
  }

  // ============================================================================
  // Event Helpers
  // ============================================================================

  /**
   * Dispatch a custom event with bubbles and composed set to true
   * @param {string} name - Event name
   * @param {Object} detail - Event detail object
   */
  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail
    }));
  }

  /**
   * Register an unlisten function to be called on disconnect.
   * Use this to track Tauri event listeners for automatic cleanup.
   * @param {Function} unlisten - Function to call to unsubscribe from event
   */
  addUnlisten(unlisten) {
    this.#eventUnlisteners.push(unlisten);
  }

  /**
   * Register a Tauri event listener with automatic cleanup on disconnect.
   * @param {string} eventName - The Tauri event name
   * @param {Function} handler - Event handler function
   * @returns {Promise<void>}
   */
  async listenTauri(eventName, handler) {
    const { listen } = await import('../../helpers/tauri.js');
    const unlisten = await listen(eventName, (event) => handler(event.payload, event));
    this.#eventUnlisteners.push(unlisten);
  }

  // ============================================================================
  // Attribute Helpers
  // ============================================================================

  /**
   * Get an attribute as a string with optional default
   * @param {string} name - Attribute name
   * @param {string} defaultValue - Default value if attribute is not set
   * @returns {string}
   */
  getStringAttr(name, defaultValue = '') {
    return this.getAttribute(name) ?? defaultValue;
  }

  /**
   * Get an attribute as an integer with optional default
   * @param {string} name - Attribute name
   * @param {number} defaultValue - Default value if attribute is not set or invalid
   * @returns {number}
   */
  getIntAttr(name, defaultValue = 0) {
    const value = this.getAttribute(name);
    if (value === null) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get an attribute as a boolean (true if attribute exists)
   * @param {string} name - Attribute name
   * @returns {boolean}
   */
  getBoolAttr(name) {
    return this.hasAttribute(name);
  }

  /**
   * Get the cache key for this component class
   */
  getCacheKey() {
    return this.constructor.moduleUrl;
  }

  /**
   * Import a resource (styles or template) with class-level caching
   */
  async importResource(type) {
    const moduleUrl = this.constructor.moduleUrl;
    const path = this[`${type}Path`];

    if (!moduleUrl) {
      throw new Error(`Component requires static moduleUrl (pass import.meta.url from component)`);
    }

    if (!path) {
      throw new Error(`Component requires ${type}Path to be defined`);
    }

    const cacheKey = `${moduleUrl}:${type}`;

    // Return cached resource if available
    if (resourceCache.has(cacheKey)) {
      return resourceCache.get(cacheKey);
    }

    try {
      const url = new URL(path, moduleUrl).href;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} file: ${response.statusText}`);
      }

      const content = await response.text();
      resourceCache.set(cacheKey, content);
      return content;
    } catch (error) {
      console.error(`Error importing ${type} from "${path}":`, error);
      throw error; // Re-throw so component knows setup failed
    }
  }

  async importStyles() {
    const style = document.createElement('style');
    style.textContent = await this.importResource('styles');
    return style;
  }

  async importTemplate() {
    const template = document.createElement('template');
    template.innerHTML = await this.importResource('template');
    return template;
  }

  async setupComponent() {
    const styles = await this.importStyles();
    const template = await this.importTemplate();

    this.shadowRoot.append(styles);
    this.shadowRoot.append(template.content.cloneNode(true));
  }
}
