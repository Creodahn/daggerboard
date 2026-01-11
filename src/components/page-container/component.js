import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A container component for page content with consistent max-width and padding.
 *
 * Usage:
 *   <page-container>
 *     <my-component></my-component>
 *     <another-component></another-component>
 *   </page-container>
 */
class PageContainer extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;

  stylesPath = './styles.css';
  templatePath = './template.html';
}

customElements.define('page-container', PageContainer);
