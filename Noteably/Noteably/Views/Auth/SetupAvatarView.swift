import SwiftUI
import UIKit
import PhotosUI

private struct IdentifiableImage: Identifiable {
    let id = UUID()
    let image: UIImage
}

struct SetupAvatarView: View {
    @Environment(AuthService.self) private var authService

    var onComplete: () -> Void

    @State private var selectedItem: PhotosPickerItem?
    @State private var avatarImage: UIImage?
    @State private var imageToCrop: IdentifiableImage?
    @State private var isUploading = false
    @State private var errorMessage: String?
    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.noteablyBackground
                .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: 60)

                    formCard
                        .padding(.horizontal, 24)

                    Spacer()
                }
                .padding(.top, 8)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                appeared = true
            }
        }
        .onChange(of: selectedItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    imageToCrop = IdentifiableImage(image: image)
                }
            }
        }
        .fullScreenCover(item: $imageToCrop) { identifiable in
            ImageCropperView(image: identifiable.image) { cropped in
                avatarImage = cropped
                imageToCrop = nil
            } onCancel: {
                imageToCrop = nil
                selectedItem = nil
            }
        }
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(spacing: 32) {
            VStack(spacing: 10) {
                Text("Add a profile photo")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Help others recognize you.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, alignment: .center)

            if let errorMessage {
                HStack(spacing: 10) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundStyle(Color.noteablyDestructive)
                    Text(errorMessage)
                        .font(.noteablyBody(14))
                        .foregroundStyle(Color.noteablyDestructive)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.noteablyDestructive.opacity(0.08))
                )
            }
            
            Spacer(minLength: 25)
            
            // Avatar preview with edit badge
            GeometryReader { geo in
                let size = geo.size.width
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    ZStack {
                        avatarCircle

                        Image(systemName: "pencil.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.noteablyPrimary)
                            .background(
                                Circle()
                                    .fill(Color.noteablyCard)
                                    .padding(3)
                            )
                            .position(
                                x: size / 2 + (size / 2) * 0.707,
                                y: size / 2 + (size / 2) * 0.707
                            )
                    }
                    .frame(width: size, height: size)
                }
                .buttonStyle(.plain)
            }
            .aspectRatio(1, contentMode: .fit)
            Spacer(minLength: 25)
            // Buttons
            VStack(spacing: 12) {
                Button(action: uploadAvatar) {
                    if isUploading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Save Photo")
                    }
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())
                .disabled(isUploading || avatarImage == nil)
                .opacity(avatarImage == nil ? 0.6 : 1.0)

                Button("Skip for now") {
                    onComplete()
                }
                .font(.noteablyBody(16))
                .foregroundStyle(Color.noteablySecondaryText)
                .padding(.vertical, 8)
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Avatar Display

    @ViewBuilder
    private var avatarCircle: some View {
        GeometryReader { geo in
            let size = geo.size.width
            if let avatarImage {
                Image(uiImage: avatarImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.noteablyBorder, lineWidth: 1.5))
            } else if let avatarUrl = authService.currentAvatarUrl,
                      let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: size, height: size)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.noteablyBorder, lineWidth: 1.5))
                    default:
                        initialsCircle(size: size)
                    }
                }
            } else {
                initialsCircle(size: size)
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func initialsCircle(size: CGFloat) -> some View {
        let firstName = authService.currentFirstName ?? ""
        let lastName = authService.currentLastName ?? ""
        let initials = [firstName.prefix(1), lastName.prefix(1)]
            .filter { !$0.isEmpty }
            .joined()
            .uppercased()

        return ZStack {
            Circle()
                .fill(Color.noteablyPrimary.opacity(0.12))
                .frame(width: size, height: size)
            Text(initials.isEmpty ? "?" : initials)
                .font(.noteablySerif(size * 0.36, weight: .bold))
                .foregroundStyle(Color.noteablyPrimary)
        }
        .overlay(Circle().stroke(Color.noteablyBorder, lineWidth: 1.5))
    }

    // MARK: - Actions

    private func uploadAvatar() {
        guard let image = avatarImage,
              let imageData = image.jpegData(compressionQuality: 0.8) else { return }

        isUploading = true
        errorMessage = nil

        Task {
            do {
                try await authService.updateAvatar(imageData: imageData)
                onComplete()
            } catch {
                errorMessage = error.localizedDescription
            }
            isUploading = false
        }
    }
}

#Preview {
    let auth = AuthService.shared
    auth.debugSetUser(email: "john@example.com", id: "preview-id", firstName: "John", lastName: "Doe")
    return SetupAvatarView(onComplete: {})
        .environment(auth)
}
