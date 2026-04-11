const fs = require('fs');
const path = require('path');

// Read environment variables set by Droidify
const APP_URL = process.env.APP_URL || 'https://example.com';
const APP_NAME = process.env.APP_NAME || 'MyApp';
const APP_PACKAGE_NAME = process.env.APP_PACKAGE_NAME || 'com.droidify.myapp';
const APP_ICON_URL = process.env.APP_ICON_URL || '';
const STATUS_BAR_COLOR = process.env.STATUS_BAR_COLOR || '#000000';
const NAVIGATION_BAR_COLOR = process.env.NAVIGATION_BAR_COLOR || '#000000';
const LOADING_SCREEN_ENABLED = process.env.LOADING_SCREEN_ENABLED === 'true';
const LOADING_SCREEN_COLOR = process.env.LOADING_SCREEN_COLOR || '#ffffff';
const FULLSCREEN_MODE = process.env.FULLSCREEN_MODE === 'true';
const ORIENTATION_LOCK = process.env.ORIENTATION_LOCK || 'default';
const CUSTOM_JS_HEAD = process.env.CUSTOM_JS_HEAD || '';
const CUSTOM_JS_BODY = process.env.CUSTOM_JS_BODY || '';
const CUSTOM_CSS = process.env.CUSTOM_CSS || '';

console.log(`Configuring app: ${APP_NAME} (${APP_PACKAGE_NAME})`);
console.log(`URL: ${APP_URL}`);

// 1. Generate capacitor.config.json
const capacitorConfig = {
  appId: APP_PACKAGE_NAME,
  appName: APP_NAME,
  webDir: 'www',
  server: {
    url: APP_URL,
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: LOADING_SCREEN_ENABLED ? 3000 : 0,
      backgroundColor: LOADING_SCREEN_COLOR,
      showSpinner: LOADING_SCREEN_ENABLED,
      spinnerColor: STATUS_BAR_COLOR,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: STATUS_BAR_COLOR,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
  },
};

fs.writeFileSync('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));
console.log('✓ capacitor.config.json generated');

// 2. Create www directory with offline fallback and native bridge
if (!fs.existsSync('www')) fs.mkdirSync('www', { recursive: true });

const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: ${LOADING_SCREEN_COLOR};
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .container { max-width: 400px; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { font-size: 14px; color: #666; margin-bottom: 24px; }
    button {
      background: ${STATUS_BAR_COLOR};
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
    ${CUSTOM_CSS}
  </style>
  ${CUSTOM_JS_HEAD ? `<script>${CUSTOM_JS_HEAD}</script>` : ''}
</head>
<body>
  <div class="container">
    <div class="icon">📱</div>
    <h1>${APP_NAME}</h1>
    <p>No internet connection. Please check your network and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
  ${CUSTOM_JS_BODY ? `<script>${CUSTOM_JS_BODY}</script>` : ''}
</body>
</html>`;

fs.writeFileSync('www/index.html', offlineHtml);
console.log('✓ Offline fallback page generated');

// 3. Download app icon if provided
if (APP_ICON_URL) {
  console.log(`Downloading icon from: ${APP_ICON_URL}`);
  // Icon download handled in enhance-native.js with proper Android resource placement
}

console.log('✓ Configuration complete');
