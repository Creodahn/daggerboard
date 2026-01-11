/**
 * A mixin that adds campaign-aware data loading to components.
 * Handles current campaign tracking, event filtering, and reload on campaign change.
 *
 * Usage:
 *   import { CampaignAwareMixin } from '../../helpers/campaign-aware-mixin.js';
 *   import ExtendedHtmlElement from '../extended-html-element.js';
 *
 *   class MyComponent extends CampaignAwareMixin(ExtendedHtmlElement) {
 *     async loadData() {
 *       // Called on initial load and when campaign changes
 *       this.items = await invoke('get_items');
 *     }
 *
 *     async setup() {
 *       // Setup campaign awareness first
 *       await this.setupCampaignAwareness({
 *         loadData: () => this.loadData(),
 *         // Optional: custom event handlers
 *         events: {
 *           'items-updated': (payload) => {
 *             this.items = payload.items;
 *             this.render();
 *           }
 *         }
 *       });
 *
 *       // Rest of setup...
 *     }
 *   }
 */

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

export function CampaignAwareMixin(Base) {
  return class extends Base {
    #currentCampaignId = null;
    #eventUnlisteners = [];

    /**
     * Get the current campaign ID
     * @returns {string|null}
     */
    get currentCampaignId() {
      return this.#currentCampaignId;
    }

    /**
     * Check if an event payload belongs to the current campaign
     * @param {Object} payload - Event payload with campaign_id
     * @returns {boolean}
     */
    isCurrentCampaign(payload) {
      return payload?.campaign_id === this.#currentCampaignId;
    }

    /**
     * Setup campaign awareness with data loading and event handling
     * @param {Object} options
     * @param {Function} options.loadData - Function to call to load/reload data
     * @param {Object} [options.events] - Map of event names to handlers
     * @param {Function} [options.onCampaignChange] - Optional callback before reload
     */
    async setupCampaignAwareness({ loadData, events = {}, onCampaignChange }) {
      // Fetch current campaign
      await this.#refreshCurrentCampaign();

      // Initial data load
      await loadData();

      // Setup event listeners with campaign filtering
      for (const [eventName, handler] of Object.entries(events)) {
        const unlisten = await listen(eventName, (event) => {
          if (this.isCurrentCampaign(event.payload)) {
            handler(event.payload);
          }
        });
        this.#eventUnlisteners.push(unlisten);
      }

      // Listen for campaign changes
      window.addEventListener('campaign-changed', async () => {
        if (onCampaignChange) {
          onCampaignChange();
        }
        await this.#refreshCurrentCampaign();
        await loadData();
      });
    }

    async #refreshCurrentCampaign() {
      try {
        const campaign = await invoke('get_current_campaign');
        this.#currentCampaignId = campaign?.id ?? null;
      } catch (error) {
        console.error('Failed to get current campaign:', error);
        this.#currentCampaignId = null;
      }
    }

    /**
     * Cleanup event listeners on disconnect
     */
    cleanup() {
      super.cleanup?.();
      for (const unlisten of this.#eventUnlisteners) {
        unlisten();
      }
      this.#eventUnlisteners = [];
    }
  };
}
