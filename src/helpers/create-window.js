export default async function createWindow(name, options = {}) {
  const { WebviewWindow } = window.__TAURI__.webviewWindow;

  const existing = await WebviewWindow.getByLabel(name);
  if (existing) {
    console.log(`Window "${name}" already exists, closing it first`);
    await existing.close();
  }

  console.log(`Creating window "${name}" with URL: ${options.url}`);
  const webview = new WebviewWindow(name, options);

  webview.once('tauri://created', () => {
    console.log(`Webview "${name}" created successfully`);
  });

  webview.once('tauri://error', error => {
    console.error(`Error creating webview "${name}":`, error);
  });
}
