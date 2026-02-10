# Profile Picture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add profile picture upload and display to both web and iOS, storing images in Supabase Storage "avatars" bucket with URL in `user_metadata.avatar_url`.

**Architecture:** Client-direct upload — both platforms upload images directly to Supabase Storage via their respective SDKs, then call `updateUser()` to persist the public URL in `user_metadata`. No backend changes needed. Images resized to 400x400 JPEG before upload.

**Tech Stack:** Supabase Storage SDK (JS + Swift), HTML Canvas (web resize), UIImage (iOS resize), PhotosPicker (SwiftUI), Radix Avatar (web)

---

### Task 1: Web — Add avatar upload to Profile page

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`
- Modify: `frontend/src/contexts/AuthContext.tsx`

**Step 1: Add refreshUser method to AuthContext**

In `frontend/src/contexts/AuthContext.tsx`, add a `refreshUser` function that re-fetches the current session user so the UI updates after avatar upload:

```typescript
// Add to AuthContextType interface (line 7):
refreshUser: () => Promise<void>;

// Add implementation inside AuthProvider (after logout function):
const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUser(user);
};

// Add refreshUser to the Provider value object
```

**Step 2: Update Profile.tsx with avatar upload**

In `frontend/src/pages/Profile.tsx`:

1. Add imports: `Pencil`, `Loader2` from lucide-react, `AvatarImage` from avatar component, `supabase` from lib/supabase, `useRef`/`useState`/`useCallback` from react.
2. Add `refreshUser` to the `useAuth()` destructure.
3. Add state: `const [uploading, setUploading] = useState(false)` and `const fileInputRef = useRef<HTMLInputElement>(null)`.
4. Add `resizeImage` function — takes a `File`, returns a `Blob`:
   - Create an `Image` element, load the file via `URL.createObjectURL`
   - On load: create a 400x400 canvas, `drawImage` to fit (center-crop)
   - `canvas.toBlob` with `image/jpeg` quality 0.8
5. Add `handleAvatarUpload` function:
   - Get file from input event
   - `setUploading(true)`
   - Call `resizeImage(file)` to get the resized blob
   - Upload via `supabase.storage.from('avatars').upload(`${user.id}/avatar.jpg`, blob, { upsert: true, contentType: 'image/jpeg' })`
   - Get public URL via `supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.jpg`)`
   - Call `supabase.auth.updateUser({ data: { avatar_url: publicUrl + '?t=' + Date.now() } })` (cache bust)
   - Call `refreshUser()`
   - `setUploading(false)`
6. Replace the static `<Avatar>` in the CardHeader (lines 50-62) with a clickable version:
   - Wrap in a `<div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>`
   - Keep the existing Avatar but use `<AvatarImage>` component instead of raw `<img>`
   - Add pencil overlay: a small circle (absolute positioned, bottom-right) with `<Pencil>` icon, 16x16
   - If `uploading`, show `<Loader2 className="animate-spin">` instead of the pencil
   - Add hidden `<input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} className="hidden" />`

**Step 3: Also update sidebar avatar display**

In `frontend/src/components/ui/sidebar.tsx`, the `SidebarProfile` component (around line 218) already reads `avatarUrl` and displays it. No changes needed — it will pick up the new avatar automatically since it reads from `user.user_metadata.avatar_url`.

**Step 4: Verify locally**

Run: `cd frontend && npm run dev`
- Navigate to Profile page
- Click avatar → file picker should open
- Select image → avatar should update with new image
- Sidebar avatar should also update
- Refresh page → avatar should persist

**Step 5: Commit**

```bash
git add frontend/src/pages/Profile.tsx frontend/src/contexts/AuthContext.tsx
git commit -m "feat: add profile picture upload on web"
```

---

### Task 2: iOS — Add avatarUrl to AuthService

**Files:**
- Modify: `Noteably/Noteably/Services/AuthService.swift`

**Step 1: Add avatarUrl property and populate from session**

```swift
// Add property (after currentEmail):
private(set) var currentAvatarUrl: String?

// Update applySession to extract avatar_url from user_metadata:
private func applySession(_ session: Session) {
    currentUserId = session.user.id.uuidString
    currentEmail = session.user.email
    // Extract avatar_url from user metadata
    if let metadata = session.user.userMetadata,
       let avatarUrl = metadata["avatar_url"]?.stringValue {
        currentAvatarUrl = avatarUrl
    }
    isAuthenticated = true
}

// Update clearSession:
private func clearSession() {
    currentUserId = nil
    currentEmail = nil
    currentAvatarUrl = nil
    isAuthenticated = false
}
```

**Step 2: Add updateAvatarUrl method**

Add a method to upload an image and update user metadata:

```swift
func updateAvatar(imageData: Data) async throws {
    guard let userId = currentUserId else { return }

    let path = "\(userId)/avatar.jpg"

    // Upload to Supabase Storage (upsert)
    try await supabase.storage
        .from("avatars")
        .upload(
            path: path,
            file: imageData,
            options: FileOptions(contentType: "image/jpeg", upsert: true)
        )

    // Get public URL
    let publicUrl = try supabase.storage
        .from("avatars")
        .getPublicURL(path: path)
        .absoluteString

    let urlWithCacheBust = "\(publicUrl)?t=\(Int(Date().timeIntervalSince1970))"

    // Update user metadata
    try await supabase.auth.update(user: UserAttributes(data: ["avatar_url": .string(urlWithCacheBust)]))

    // Update local state
    await MainActor.run {
        self.currentAvatarUrl = urlWithCacheBust
    }
}
```

**Step 3: Update debugSetUser for previews**

```swift
#if DEBUG
func debugSetUser(email: String, id: String, avatarUrl: String? = nil) {
    self.currentEmail = email
    self.currentUserId = id
    self.currentAvatarUrl = avatarUrl
    self.isAuthenticated = true
}
#endif
```

**Step 4: Commit**

```bash
git add Noteably/Noteably/Services/AuthService.swift
git commit -m "feat(ios): add avatar URL tracking and upload to AuthService"
```

---

### Task 3: iOS — Update ProfileView with avatar upload UI

**Files:**
- Modify: `Noteably/Noteably/Views/Profile/ProfileView.swift`

**Step 1: Add PhotosPicker and state**

```swift
import PhotosUI  // Add at top

// Add state properties to ProfileView:
@State private var selectedPhoto: PhotosPickerItem?
@State private var isUploadingAvatar = false
```

**Step 2: Replace avatarSection with tappable avatar + PhotosPicker**

Replace the `avatarSection` computed property:

```swift
private var avatarSection: some View {
    VStack(spacing: 12) {
        PhotosPicker(selection: $selectedPhoto, matching: .images) {
            ZStack(alignment: .bottomTrailing) {
                // Avatar circle
                Group {
                    if let avatarUrl = AuthService.shared.currentAvatarUrl,
                       let url = URL(string: avatarUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                            default:
                                initialsFallback
                            }
                        }
                    } else {
                        initialsFallback
                    }
                }
                .frame(width: 80, height: 80)
                .clipShape(Circle())

                // Pencil overlay
                if isUploadingAvatar {
                    ProgressView()
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Color.noteablyCard))
                        .overlay(Circle().stroke(Color.noteablyBorder, lineWidth: 1))
                } else {
                    Image(systemName: "pencil")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.noteablyForeground)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Color.noteablyCard))
                        .overlay(Circle().stroke(Color.noteablyBorder, lineWidth: 1))
                }
            }
        }
        .buttonStyle(.plain)
        .onChange(of: selectedPhoto) { _, newItem in
            guard let newItem else { return }
            Task { await handlePhotoSelection(newItem) }
        }

        Text(AuthService.shared.currentEmail ?? "")
            .font(.noteablyBody(15))
            .foregroundStyle(Color.noteablySecondaryText)
    }
    .padding(.vertical, 8)
}

private var initialsFallback: some View {
    ZStack {
        Circle()
            .fill(Color.noteablyPrimary.opacity(0.15))
        Text(initials)
            .font(.noteablySerif(28, weight: .bold))
            .foregroundStyle(Color.noteablyPrimary)
    }
}
```

**Step 3: Add photo selection handler with resize**

```swift
private func handlePhotoSelection(_ item: PhotosPickerItem) async {
    isUploadingAvatar = true
    defer { isUploadingAvatar = false }

    guard let data = try? await item.loadTransferable(type: Data.self),
          let uiImage = UIImage(data: data),
          let resized = resizeImage(uiImage, to: CGSize(width: 400, height: 400)),
          let jpegData = resized.jpegData(compressionQuality: 0.8) else {
        return
    }

    do {
        try await AuthService.shared.updateAvatar(imageData: jpegData)
    } catch {
        print("Avatar upload failed: \(error)")
    }
}

private func resizeImage(_ image: UIImage, to targetSize: CGSize) -> UIImage? {
    let widthRatio = targetSize.width / image.size.width
    let heightRatio = targetSize.height / image.size.height
    let scale = max(widthRatio, heightRatio)

    let scaledSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let origin = CGPoint(
        x: (targetSize.width - scaledSize.width) / 2,
        y: (targetSize.height - scaledSize.height) / 2
    )

    let renderer = UIGraphicsImageRenderer(size: targetSize)
    return renderer.image { _ in
        image.draw(in: CGRect(origin: origin, size: scaledSize))
    }
}
```

**Step 4: Verify locally**

Build and run the iOS app:
- Navigate to Profile
- Tap avatar → PhotosPicker should open
- Select image → spinner shows, then avatar updates
- Avatar should persist after closing/reopening profile

**Step 5: Commit**

```bash
git add Noteably/Noteably/Views/Profile/ProfileView.swift
git commit -m "feat(ios): add profile picture upload with PhotosPicker"
```

---

### Task 4: iOS — Show avatar in dashboard header

**Files:**
- Modify: `Noteably/Noteably/Views/Dashboard/DashboardView.swift`

**Step 1: Replace the person.circle.fill icon with actual avatar**

In the dashboard header, replace the static SF Symbol with an avatar that shows the user's profile picture (or falls back to the icon):

```swift
// Replace the Button label (around line 19-22):
Button {
    showProfile = true
} label: {
    if let avatarUrl = AuthService.shared.currentAvatarUrl,
       let url = URL(string: avatarUrl) {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
                    .frame(width: 35, height: 35)
                    .clipShape(Circle())
            default:
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 35, weight: .medium))
                    .foregroundStyle(Color.noteablyPrimary)
                    .frame(width: 35, height: 35)
            }
        }
    } else {
        Image(systemName: "person.circle.fill")
            .font(.system(size: 35, weight: .medium))
            .foregroundStyle(Color.noteablyPrimary)
            .frame(width: 35, height: 35)
    }
}
```

**Step 2: Verify locally**

- Upload an avatar in Profile
- Return to Dashboard → header should show the avatar image instead of the generic icon

**Step 3: Commit**

```bash
git add Noteably/Noteably/Views/Dashboard/DashboardView.swift
git commit -m "feat(ios): show user avatar in dashboard header"
```

---

### Task 5: Final verification and combined commit

**Step 1: Test web end-to-end**
- Login → Profile → upload avatar → verify it shows on profile and sidebar
- Refresh page → avatar persists
- Logout → login again → avatar still shows

**Step 2: Test iOS end-to-end**
- Login → Profile → upload avatar → verify it shows on profile and dashboard header
- Kill and relaunch app → avatar still shows

**Step 3: Create final commit if any fixups needed**

```bash
git add -A
git commit -m "feat: add profile picture support for web and iOS"
```
