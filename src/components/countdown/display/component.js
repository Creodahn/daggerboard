import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class CountdownDisplay extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #countdownsList;
  trackers = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#countdownsList = this.shadowRoot.querySelector('.countdowns-list');

    // Load visible trackers
    await this.loadTrackers();

    // Listen for tracker updates
    await listen('trackers-updated', event => {
      console.log('Received trackers-updated event:', event);
      console.log('Payload:', event.payload);
      this.trackers = event.payload.trackers.filter(t => t.visible_to_players);
      console.log('Filtered visible trackers:', this.trackers);
      this.renderTrackers();
    });
  }

  async loadTrackers() {
    try {
      this.trackers = await invoke('get_trackers', { visibleOnly: true });
      this.renderTrackers();
    } catch (error) {
      console.error('Failed to load trackers:', error);
    }
  }

  getUrgencyClass(current) {
    if (current === 0) return 'critical';
    if (current <= 2) return 'urgent';
    if (current < 5) return 'warning';
    return '';
  }

  renderTrackers() {
    this.#countdownsList.innerHTML = '';

    if (this.trackers.length === 0) {
      this.#countdownsList.innerHTML = '<empty-state message="No active countdowns"></empty-state>';
      return;
    }

    this.trackers.forEach(tracker => {
      const urgencyClass = this.getUrgencyClass(tracker.current);
      const displayName = tracker.hide_name_from_players ? '???' : tracker.name;

      const trackerEl = document.createElement('div');
      trackerEl.className = `countdown-item ${urgencyClass}`;

      trackerEl.innerHTML = `
        <div class="countdown-content">
          <h4 class="countdown-name">${displayName}</h4>
          <div class="countdown-value">${tracker.current}</div>
        </div>
      `;

      this.#countdownsList.appendChild(trackerEl);
    });
  }
}

customElements.define('countdown-display', CountdownDisplay);
