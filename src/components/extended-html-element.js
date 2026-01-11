// Class-level cache for templates and styles
const resourceCache = new Map();

export default class ExtendedHtmlElement extends HTMLElement {
  // Promise that resolves when the component is fully set up
  #readyResolve;
  #isSetup = false;
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
