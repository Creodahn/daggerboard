// Settings view component imports
import '../../components/base/extended-html-element.js';
import { initTheme } from '../../helpers/theme.js';
import { initWindow } from '../../helpers/window-lifecycle.js';

// Initialize theme and window lifecycle
initTheme();
initWindow();

// Layout components
import '../../components/layout/page-container/component.js';
import '../../components/layout/card-container/component.js';

// UI components
import '../../components/ui/toggle-switch/component.js';
import '../../components/ui/section-header/component.js';
import '../../components/ui/input-group/component.js';
import '../../components/ui/action-button/component.js';

// Overlay components
import '../../components/overlays/modal-dialog/component.js';

// Feature components
import '../../components/features/campaign/settings-panel/component.js';
