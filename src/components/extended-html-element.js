export default class ExtendedHtmlElement extends HTMLElement {
  shadowRoot;
  styles;
  template;

  constructor() {
    super();
    this.shadowRoot = this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    await this.setupComponent();
    this.setup?.();
  }

  importResource = async type => {
    // Use static moduleUrl from subclass
    const moduleUrl = this.constructor.moduleUrl;

    if (!moduleUrl) {
      throw new Error(`Relative path "${path}" requires moduleUrl (pass import.meta.url from component)`);
    }

    const path = this[`${type}Path`];

    try {
      let url = new URL(path, moduleUrl).href;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${type} file: ${response.statusText}`);
        }

        return await response.text();
    } catch (error) {
      console.error(`Error importing ${type} from "${path}":`, error);
    }
  }

  importStyles = async () => {
    const style = document.createElement('style');

    style.textContent = await this.importResource('styles');

    return style;
  }

  importTemplate = async () => {
    const template = document.createElement('template');

    template.innerHTML = await this.importResource('template');

    return template;
  }

  setupComponent = async () => {
    this.styles = await this.importStyles();
    this.template = await this.importTemplate();

    this.shadowRoot.append(this.styles.cloneNode(true));
    this.shadowRoot.append(this.template.content.cloneNode(true));
  }
}