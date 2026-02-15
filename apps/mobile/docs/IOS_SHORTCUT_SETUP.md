# iOS Lock Screen Quick Capture Setup

This guide shows how to set up ultra-fast task capture from your iPhone lock screen using iOS Shortcuts.

## Prerequisites

1. Lucidity app installed on iOS device
2. API key generated in Settings (the app automatically saves it to Keychain)
3. iOS 16+ (for Lock Screen shortcuts)

## Method 1: Shortcuts App (Home Screen Widget)

### Creating the Shortcut

1. Open **Shortcuts** app on iPhone
2. Tap **+** to create new shortcut
3. Add the following actions:

#### Action 1: Ask for Input
- Search and add **Ask for Input** action
- Set question: "What's the task?"
- Type: Text

#### Action 2: Get Keychain Value (Requires Toolbox Pro or Data Jar)
- Install **Toolbox Pro** app (free) from App Store
- Add **Get Keychain Value** action
- Key: `com.lucidity.api-key`
- Account: `api-key`
- Service: `com.lucidity.api-key`

**Alternative if you don't have Toolbox Pro:**
You'll need to manually paste your API key:
- Add **Text** action
- Paste your API key from Settings

#### Action 3: Get Contents of URL
- Add **Get Contents of URL** action
- URL: `https://your-api-url.com/api/tasks` (use your actual API URL)
- Method: POST
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer [Keychain Value from Action 2]`
- Request Body: JSON
```json
{
  "title": "[Provided Input from Action 1]",
  "projectId": null
}
```

#### Action 4: Show Notification
- Add **Show Notification** action
- Title: "✓ Task Saved"
- Body: [Provided Input from Action 1]

4. Name the shortcut "Quick Capture"
5. Tap **Done**

### Adding to Lock Screen

1. **Lock your iPhone**
2. **Long press** on the lock screen
3. Tap **Customize**
4. Tap on a lock screen to edit it
5. Tap on one of the **two circular buttons** (below the time)
6. Select **Quick Capture** shortcut
7. Tap **Done**

Now you can tap the lock screen button to instantly capture tasks!

## Method 2: App Intent (Native Integration) - Coming Soon

For the best experience with no third-party dependencies, we're implementing native App Intents that will:
- Work directly from Lock Screen without additional apps
- Access Keychain automatically
- Provide native iOS integration

This requires Swift implementation and will be available in the next update.

## Troubleshooting

### "Keychain access denied"
- Make sure you've generated an API key in Lucidity Settings
- Rebuild the app: `pnpm ios:local`

### "URL request failed"
- Verify your API URL in the shortcut matches your environment
- Check that your API key hasn't been revoked
- Ensure you have internet connection

### Shortcut not appearing on Lock Screen
- Requires iOS 16+
- Try restarting your iPhone
- Make sure the shortcut is saved properly

## Security Notes

- API keys are stored in iOS Keychain (encrypted)
- Only accessible to Lucidity app and shortcuts you explicitly configure
- Can be revoked anytime from Settings
