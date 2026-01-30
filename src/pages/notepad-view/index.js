// Notepad view component imports
import '../../components/base/extended-html-element.js';
import { initTheme } from '../../helpers/theme.js';
import { initWindow } from '../../helpers/window-lifecycle.js';

// Initialize theme and window lifecycle
initTheme();
initWindow();

// Layout components
import '../../components/overlays/dropdown-menu/component.js';
import '../../components/overlays/modal-dialog/component.js';
import '../../components/overlays/confirm-dialog/component.js';

// UI components
import '../../components/ui/action-button/component.js';

// Feedback components
import '../../components/feedback/toast-message/component.js';

// Feature components
import '../../components/features/campaign/notepad/component.js';
