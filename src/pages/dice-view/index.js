import '../../components/base/extended-html-element.js';
import { initTheme } from '../../helpers/theme.js';
import { initWindow } from '../../helpers/window-lifecycle.js';

// Initialize theme and window lifecycle
initTheme();
initWindow();

// Feature components
import '../../components/features/dice/shape/component.js';
import '../../components/features/dice/roller/component.js';
