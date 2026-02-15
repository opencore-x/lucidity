# App Groups Setup for iOS Shortcuts

## What We Did (Automatic Fallback)

The app now **gracefully handles App Groups**:
- ✅ Tries to save with App Group first (for Shortcuts)
- ✅ Falls back to regular Keychain if App Group not provisioned
- ✅ App won't crash if App Group is missing
- ✅ Shortcuts will work once App Group is properly provisioned

## Current Status

Right now you're seeing this error:
```
Internal error when a required entitlement isn't present
```

This is **expected** and **harmless** because:
1. App Groups require registration in Apple Developer Portal
2. Development builds may not have proper provisioning
3. The app automatically falls back to regular Keychain

## When Shortcuts Will Work

Shortcuts will work when you do **either**:

### Option 1: Register App Group in Apple Developer Portal (Recommended for Production)

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **App Groups**
4. Click **+** to create new App Group
5. Register: `group.com.lucidity.app`
6. Go back to **Identifiers** → **App IDs** → **com.lucidity.app**
7. Enable **App Groups** capability
8. Edit → Select `group.com.lucidity.app`
9. Save

Then rebuild the app:
```bash
pnpm ios:prod
```

### Option 2: Use Automatic Signing (Easier for Development)

Xcode can automatically register the App Group:

1. Open `ios/Lucidity.xcworkspace` in Xcode
2. Select **Lucidity** target
3. Go to **Signing & Capabilities** tab
4. Enable **Automatically manage signing**
5. Select your Team
6. Xcode will register the App Group automatically

Then rebuild:
```bash
pnpm ios:local
```

## How to Verify It's Working

After setting up App Groups, check the console when generating an API key:

**Success:**
```
✅ API key saved to Keychain with App Group access (Shortcuts enabled)
```

**Fallback (current):**
```
⚠️ App Group access failed, trying without App Group...
✅ API key saved to Keychain (App Group pending - Shortcuts not available yet)
```

## Current Behavior

Right now (without App Group provisioned):
- ✅ API key generation works
- ✅ API key is saved to Keychain (secure)
- ✅ MCP server access works
- ⚠️ iOS Shortcuts won't work yet (can't access Keychain across apps)

After provisioning App Group:
- ✅ Everything above
- ✅ iOS Shortcuts can access the API key
- ✅ Lock Screen quick capture works

## For Testing Now

You can test the rest of the implementation:
1. Generate API key → Should see fallback message in console
2. Verify MCP server still works (uses Clerk auth in mobile app)
3. Copy API key manually to test Shortcuts (without Keychain auto-access)

## Next Steps

1. **Development:** Use automatic signing in Xcode
2. **Production:** Register App Group in Developer Portal before App Store submission
3. **Testing:** Regenerate API key after provisioning to enable Shortcuts

The app is fully functional now, just Shortcuts won't work until App Groups are provisioned. Everything else works perfectly!
