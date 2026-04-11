const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = 'android/app/src/main/AndroidManifest.xml';

if (!fs.existsSync(MANIFEST_PATH)) {
  console.log('AndroidManifest.xml not found, skipping permissions');
  process.exit(0);
}

let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');

const permissionMap = {
  PERM_CAMERA: 'android.permission.CAMERA',
  PERM_MICROPHONE: 'android.permission.RECORD_AUDIO',
  PERM_VIBRATION: 'android.permission.VIBRATE',
  PERM_SMS: 'android.permission.SEND_SMS',
  PERM_FILE_ACCESS: 'android.permission.READ_EXTERNAL_STORAGE',
  PERM_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
  PERM_CONTACTS: 'android.permission.READ_CONTACTS',
  PERM_PHONE: 'android.permission.CALL_PHONE',
  PERM_BLUETOOTH: 'android.permission.BLUETOOTH',
  PERM_NFC: 'android.permission.NFC',
  PERM_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  PERM_BIOMETRIC: 'android.permission.USE_BIOMETRIC',
  PERM_WIFI: 'android.permission.ACCESS_WIFI_STATE',
  PERM_AUDIO: 'android.permission.MODIFY_AUDIO_SETTINGS',
};

const permissions = [];
for (const [envKey, androidPerm] of Object.entries(permissionMap)) {
  if (process.env[envKey] === 'true') {
    permissions.push(`    <uses-permission android:name="${androidPerm}" />`);
    console.log(`✓ Added permission: ${androidPerm}`);
  }
}

// Additional permissions for file access on Android 13+
if (process.env.PERM_FILE_ACCESS === 'true') {
  permissions.push('    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />');
  permissions.push('    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />');
  permissions.push('    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />');
}

// Always add INTERNET permission
permissions.push('    <uses-permission android:name="android.permission.INTERNET" />');
permissions.push('    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />');

if (process.env.PERM_LOCATION === 'true') {
  permissions.push('    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />');
}

if (process.env.PERM_BLUETOOTH === 'true') {
  permissions.push('    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />');
  permissions.push('    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />');
  permissions.push('    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />');
}

// Insert permissions before the <application> tag
const permBlock = permissions.join('\n');
manifest = manifest.replace(
  '<application',
  `${permBlock}\n\n    <application`
);

fs.writeFileSync(MANIFEST_PATH, manifest);
console.log(`✓ ${permissions.length} permissions configured`);
