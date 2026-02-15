import SwiftUI
import PhotosUI

struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @Environment(AuthService.self) private var authService
    @State private var showSignOutConfirm = false
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var isUploadingAvatar = false
    @State private var showImageCropper = false
    @State private var imageToCrop: UIImage?

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    // Avatar
                    avatarSection

                    // Account
                    sectionCard(title: "Account") {
                        infoRow(icon: "envelope", label: "Email",
                                value: authService.currentEmail ?? "—")
                    }

                    // Preferences
                    sectionCard(title: "Preferences") {
                        VStack(spacing: 0) {
                            navigationRow(icon: "paintbrush", label: "Appearance", detail: "System")
                            Divider().padding(.leading, 44)
                            navigationRow(icon: "bell", label: "Notifications", detail: "On")
                        }
                    }

                    // About
                    sectionCard(title: "About") {
                        VStack(spacing: 0) {
                            infoRow(icon: "info.circle", label: "Version",
                                    value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                            Divider().padding(.leading, 44)
                            navigationRow(icon: "questionmark.circle", label: "Help & Support", detail: "")
                        }
                    }

                    // Sign Out
                    Button {
                        showSignOutConfirm = true
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                        }
                        .font(.noteablyBody(16, weight: .medium))
                        .foregroundStyle(Color.noteablyDestructive)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                                .fill(Color.noteablyDestructive.opacity(0.08))
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
            .background(Color.noteablyBackground)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.noteablyBody(16, weight: .medium))
                        .foregroundStyle(Color.noteablyPrimary)
                }
            }
            .alert("Sign Out", isPresented: $showSignOutConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    appState.signOut()
                    dismiss()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }

    // MARK: - Avatar

    private var avatarSection: some View {
        VStack(spacing: 12) {
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                ZStack(alignment: .bottomTrailing) {
                    // Avatar circle
                    Group {
                        if let avatarUrl = authService.currentAvatarUrl,
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
                            .id(avatarUrl) // Force refresh when URL changes
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
                Task { await loadPhotoForCropping(newItem) }
            }
            .sheet(isPresented: $showImageCropper) {
                if let imageToCrop {
                    ImageCropperView(
                        image: imageToCrop,
                        onCrop: { croppedImage in
                            showImageCropper = false
                            Task { await uploadCroppedImage(croppedImage) }
                        },
                        onCancel: {
                            showImageCropper = false
                        }
                    )
                    .presentationDetents([.large])
                    .presentationDragIndicator(.hidden)
                }
            }

            Text(authService.currentEmail ?? "")
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

    private var initials: String {
        guard let email = authService.currentEmail else { return "?" }
        return String(email.prefix(1)).uppercased()
    }

    // MARK: - Photo Handling

    private func loadPhotoForCropping(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let uiImage = UIImage(data: data) else {
            return
        }
        
        await MainActor.run {
            imageToCrop = uiImage
            showImageCropper = true
        }
    }
    
    private func uploadCroppedImage(_ image: UIImage) async {
        isUploadingAvatar = true
        defer { isUploadingAvatar = false }
        
        guard let jpegData = image.jpegData(compressionQuality: 0.8) else {
            print("Failed to convert image to JPEG")
            return
        }
        
        do {
            try await authService.updateAvatar(imageData: jpegData)
            print("✅ Avatar upload successful! New URL: \(authService.currentAvatarUrl ?? "nil")")
            
            // Reset state after successful upload
            await MainActor.run {
                selectedPhoto = nil
                imageToCrop = nil
            }
        } catch {
            print("❌ Avatar upload failed: \(error)")
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

    // MARK: - Section Card

    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.noteablyBody(13, weight: .semibold))
                .foregroundStyle(Color.noteablySecondaryText)
                .textCase(.uppercase)
                .tracking(0.5)

            VStack(spacing: 0) {
                content()
            }
            .background(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .fill(Color.noteablyCard)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                    .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
            )
        }
    }

    private func infoRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
                .frame(width: 24)
            Text(label)
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablyForeground)
            Spacer()
            Text(value)
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func navigationRow(icon: String, label: String, detail: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
                .frame(width: 24)
            Text(label)
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablyForeground)
            Spacer()
            if !detail.isEmpty {
                Text(detail)
                    .font(.noteablyBody(14))
                    .foregroundStyle(Color.noteablySecondaryText)
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.noteablySecondaryText.opacity(0.5))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

#if DEBUG
#Preview {
    let _ = AuthService.shared.debugSetUser(
        email: MockData.user.email,
        id: MockData.user.id
    )
    
    NavigationStack {
        ProfileView()
            .environment(AppState())
    }
}
#endif
