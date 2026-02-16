# Quick Capture Implementation Summary

## What We Built

Ultra-fast task capture from iPhone lock screen using iOS Shortcuts + App Intents with Keychain integration.

## Architecture

```
User taps Lock Screen button
         ↓
iOS Shortcut / App Intent triggered
         ↓
Read API key from iOS Keychain (App Group shared)
         ↓
POST /api/tasks with { title, projectId: null }
         ↓
Task saved to Inbox
         ↓
Notification: "✓ Task Saved"
```

## Files Changed/Created

### Core Implementation

1. **`lib/keychain.ts`** - Keychain utility functions
   - `saveApiKeyToKeychain()` - Save with App Group access
   - `getApiKeyFromKeychain()` - Retrieve key
   - `removeApiKeyFromKeychain()` - Remove on revoke

2. **`app/settings.tsx`** - Updated to save/remove from Keychain
   - Saves API key to Keychain on generation
   - Removes from Keychain on revocation

3. **`app.config.ts`** - Added App Groups entitlement
   - `group.com.lucidity.app` for Keychain sharing

### Native Integration

4. **`ios/QuickCaptureIntent.swift`** - Native App Intent
   - Reads from Keychain with App Group access
   - Creates task via API
   - Shows success/failure notification
   - Can be added to Lock Screen buttons

5. **`plugins/withAppIntents.js`** - Expo config plugin
   - Adds Swift file to Xcode project
   - Configures Info.plist with API URL

### Documentation

6. **`docs/IOS_SHORTCUT_SETUP.md`** - User guide
7. **`docs/QUICK_CAPTURE_IMPLEMENTATION.md`** - This file

## Dependencies Added

```json
{
  "react-native-keychain": "^10.0.0"
}
```

## Next Steps

### 1. Rebuild the iOS App

The native code (Swift) and entitlements need to be compiled:

```bash
# Development build
pnpm ios:local

# Production build
pnpm ios:prod
```

### 2. Test Keychain Integration

1. Generate API key in Settings
2. Verify it's saved to Keychain (check console logs)
3. Revoke and verify it's removed

### 3. Create the iOS Shortcut

Two options:

**Option A: Native App Intent** (Recommended)
- After rebuilding, the "Quick Capture Task" intent will appear in Shortcuts
- Add it directly to Lock Screen buttons
- No third-party apps needed

**Option B: Manual Shortcut**
- Follow `docs/IOS_SHORTCUT_SETUP.md`
- Requires Toolbox Pro for Keychain access
- More flexible but requires additional app

### 4. Add to Lock Screen

1. Lock iPhone
2. Long press lock screen → Customize
3. Tap circular button below time
4. Select "Quick Capture Task" shortcut
5. Done!

## How It Works

### Keychain Storage

When an API key is generated:
```typescript
const saved = await saveApiKeyToKeychain(data.key);
```

This stores the key in iOS Keychain with:
- **Service**: `com.lucidity.api-key`
- **Account**: `api-key`
- **Access Group**: `group.com.lucidity.app` ← Enables Shortcuts access
- **Accessibility**: `AFTER_FIRST_UNLOCK` (secure but accessible)

### App Intent Execution

When the shortcut runs:
```swift
1. Read from Keychain (App Group shared storage)
2. Ask user "What's the task?"
3. POST to /api/tasks with Authorization: Bearer {key}
4. Show notification with result
```

### Security

- API keys stored in encrypted iOS Keychain
- Only accessible to:
  - Lucidity app (via bundleId)
  - Shortcuts configured with App Group
- Can be revoked anytime from Settings
- Never exposed in logs or UI after initial generation

## Troubleshooting

### Build Errors

**"App Groups not found"**
- Run `npx expo prebuild --clean`
- Verify `ios/lucidity.entitlements` contains the App Group
- Check Apple Developer Console has the App Group registered

**"Swift file not found"**
- Verify `ios/QuickCaptureIntent.swift` exists
- Check Xcode project includes the file
- Try `npx expo prebuild --clean`

### Runtime Issues

**"No API key found"**
- Generate key in Settings first
- Check console logs for save errors
- Verify App Group matches in both Swift and TypeScript

**"Failed to save task"**
- Check API URL in Info.plist matches your environment
- Verify API key is valid (test in Settings)
- Check network connection

**Shortcut not appearing**
- Requires iOS 16+
- Rebuild app after adding Swift file
- Restart iPhone
- Check Shortcuts app → "Quick Capture Task" should appear

## Testing Checklist

- [ ] Generate API key in Settings
- [ ] Verify Keychain save (check logs)
- [ ] Rebuild iOS app
- [ ] Test App Intent from Shortcuts app
- [ ] Add to Lock Screen button
- [ ] Test from locked iPhone
- [ ] Verify task appears in Inbox
- [ ] Test task with special characters
- [ ] Test with no internet (should fail gracefully)
- [ ] Revoke key and verify Shortcut fails appropriately

## Future Enhancements

1. **Siri Integration** - "Hey Siri, capture task in Lucidity"
2. **Rich Input** - Due dates, priorities, projects via dialog
3. **Offline Queue** - Store tasks locally if offline, sync later
4. **Voice Input** - Built-in dictation support
5. **Quick Actions** - 3D Touch shortcuts on home screen icon
6. **Widget** - Home screen widget with quick capture button

## Performance Target

**Goal:** < 3 seconds from lock screen to saved task
- Lock screen tap: 0s
- Shortcut launch: 0.2s
- User input (typing): 2s
- API request + response: 0.5s
- Notification: 0.3s
- **Total:** ~3s ✅
