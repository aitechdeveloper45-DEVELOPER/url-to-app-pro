# Droidify Capacitor Template

This is the template project used by Droidify's Codemagic CI/CD pipeline to build native Android apps.

## How it works

1. User submits a URL on Droidify
2. Edge function triggers a Codemagic build with environment variables
3. Codemagic clones this repo and runs `codemagic.yaml`
4. The build script dynamically configures the app based on env vars
5. Gradle builds a signed AAB/APK

## Setup

1. Fork/clone this repo
2. Connect it to Codemagic
3. Set the Codemagic App ID in Droidify's secrets

## Environment Variables (set by Droidify automatically)

- `APP_URL` - The web app URL to wrap
- `APP_NAME` - Display name
- `APP_PACKAGE_NAME` - Android package name
- `APP_ICON_URL` - Icon URL (512x512 PNG)
- `STATUS_BAR_COLOR` - Status bar color hex
- `NAVIGATION_BAR_COLOR` - Nav bar color hex
- `LOADING_SCREEN_ENABLED` - Show native splash
- `LOADING_SCREEN_COLOR` - Splash background color
- `FULLSCREEN_MODE` - Hide system bars
- `ORIENTATION_LOCK` - default/portrait/landscape
- `SCREENSHOT_DISABLE` - Block screenshots
- `PULL_TO_REFRESH` - Enable pull-to-refresh
- `KEEP_SCREEN_ON` - Prevent screen sleep
- `SECURE_MODE` - Block recent apps preview
- `PERM_*` - Android permissions flags
- `CUSTOM_JS_HEAD` / `CUSTOM_JS_BODY` / `CUSTOM_CSS` - Code injection
