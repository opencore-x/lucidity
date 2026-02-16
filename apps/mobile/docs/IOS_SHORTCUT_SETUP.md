# iOS Lock Screen Quick Capture Setup

This guide shows how to set up ultra-fast task capture from your iPhone lock screen using iOS Shortcuts.

## Prerequisites

1. Lucidity app installed on iOS device
2. API key generated in Settings
3. iOS 16+ (for Lock Screen shortcuts)

## Method 1: Manual Shortcut (Works Now - 5 minutes)

### Step 1: Get Your API Key

1. Open Lucidity app
2. Go to **Settings**
3. Tap **Generate API Key**
4. **Copy the key** (it starts with `luc_...`)
5. Keep this copied - you'll paste it in the shortcut

### Step 2: Create the Shortcut

1. Open **Shortcuts** app on iPhone
2. Tap **+** to create new shortcut
3. Add the following actions **in order**:

#### Action 1: Ask for Input
- Search and add **Ask for Input** action
- Question: `What's the task?`
- Input Type: `Text`

#### Action 2: Text (Convert to String)
- Search and add **Text** action
- Tap the text field
- Select **"Ask for Input"** variable (this converts the input to a plain string)

#### Action 3: Get Contents of URL
- Add **Get Contents of URL** action
- **URL:** `https://your-api-url.com/api/tasks` *(replace with your actual API URL)*
- **Method:** `POST`
- **Headers:** (tap "Show More" or expand Headers section)
  - Add Header: `Content-Type` = `application/json`
  - Add Header: `Authorization` = `Bearer luc_YOUR_API_KEY_HERE` *(paste your actual key)*
- **Request Body:** Select `JSON` (not Dictionary or Form)
- You'll see fields appear - add these:
  - **Key:** `title` → **Value:** Tap and select **"Text"** (from Action 2)
  - **Key:** `description` → **Value:** Leave empty or type `""`
  - Remove any other fields (like projectId)

#### Action 4: Show Notification (Optional)
- Add **Show Notification** action
- Title: `✓ Task Saved`
- Body: Tap and select **"Ask for Input"** variable

4. **Name** the shortcut: `Quick Capture`
5. Tap **Done**

**Important Notes:**
- The Text action (Action 2) is critical - it converts the input to a plain string that the API expects
- Use `title` not `subject` for the field name
- Make sure to use the **"Text"** variable (from Action 2) for the title value, not the "Ask for Input" directly

### Step 3: Add to Lock Screen

1. **Lock your iPhone**
2. **Long press** on the lock screen
3. Tap **Customize**
4. Select your active lock screen
5. Tap on one of the **two circular buttons** below the time
6. Find and select **Quick Capture** shortcut
7. Tap **Done**

**That's it!** Now tap the lock screen button to instantly capture tasks.

---

## Method 2: Native App Intent (Coming Soon - Best Experience)

We have implemented a native iOS App Intent that will:
- ✅ Automatically access your API key (no manual paste)
- ✅ Work directly from Lock Screen
- ✅ Available via Siri voice commands
- ✅ Native iOS integration

**Status:** Code is ready (`ios/Lucidity/QuickCaptureIntent.swift`) but disabled due to build integration issues. Once we fix the Expo config plugin, this will be the recommended method.

**What it enables:**
- Native "Quick Capture Task" intent in Shortcuts app
- Automatic API key retrieval from Keychain
- No manual configuration needed
- True native iOS experience

---

## Troubleshooting

### "The operation couldn't be completed"
- Check that your API URL is correct
- Verify your API key hasn't been revoked in Settings
- Make sure you have internet connection

### Shortcut not appearing on Lock Screen
- Requires iOS 16+
- Try restarting your iPhone
- Make sure you saved the shortcut

### "Authentication failed" or 401 error
- Your API key may have been revoked
- Generate a new key in Settings
- Update the `Authorization` header in the shortcut with the new key

---

## Security Notes

- API keys are like passwords - keep them secure
- Don't share your shortcuts with the hardcoded API key
- Revoke and regenerate if compromised
- Once native App Intent is enabled, keys will be stored securely in Keychain

---

## What's Your API URL?

The API URL depends on your environment:
- **Local Development:** `http://localhost:3000/api/tasks`
- **Production:** `https://api.lucidity.app/api/tasks` (replace with actual domain)

You can find your API URL in the app's settings or configuration.
