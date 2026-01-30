import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import '../../../ui/action-button/component.js';
import { getCurrentWindow } from '../../../../helpers/tauri.js';

/**
 * Alert component that displays when a countdown completes.
 * Reads tracker name from URL params and displays a dismissable notification.
 */
class CountdownAlert extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    // Get tracker info from URL params
    const params = new URLSearchParams(window.location.search);
    const trackerName = params.get('name') || 'Unknown Tracker';
    const tickLabel = params.get('tickLabel') || '';

    // Update display
    this.$('.tracker-name').textContent = trackerName;

    // Show tick label if provided
    const tickLabelEl = this.$('.tick-label');
    if (tickLabel && tickLabelEl) {
      tickLabelEl.textContent = tickLabel;
      tickLabelEl.hidden = false;
    }

    // Dismiss button
    const dismissBtn = this.$('.dismiss-btn');
    dismissBtn.addEventListener('action-click', async () => {
      const win = getCurrentWindow();
      await win.close();
    });

    // Auto-focus the dismiss button for keyboard accessibility
    setTimeout(() => dismissBtn.focus(), 100);

    // Also close on Escape key
    document.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape') {
        const win = getCurrentWindow();
        await win.close();
      }
    });
  }
}

customElements.define('countdown-alert', CountdownAlert);
