import SwiftUI

struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var showSignOutConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    // Avatar
                    avatarSection

                    // Account
                    sectionCard(title: "Account") {
                        infoRow(icon: "envelope", label: "Email",
                                value: AuthService.shared.currentEmail ?? "—")
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
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
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
            ZStack {
                Circle()
                    .fill(Color.noteablyPrimary.opacity(0.15))
                    .frame(width: 80, height: 80)
                Text(initials)
                    .font(.noteablySerif(28, weight: .bold))
                    .foregroundStyle(Color.noteablyPrimary)
            }

            Text(AuthService.shared.currentEmail ?? "")
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)
        }
        .padding(.vertical, 8)
    }

    private var initials: String {
        guard let email = AuthService.shared.currentEmail else { return "?" }
        return String(email.prefix(1)).uppercased()
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
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.noteablyCard)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
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
