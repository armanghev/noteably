import SwiftUI
import Supabase

struct LinkAccountView: View {
    @Environment(AppState.self) private var appState
    @Environment(AuthService.self) private var authService

    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Icon
            Image(systemName: "lock.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(Color.noteablyPrimary)
                .padding(.bottom, 24)

            // Title
            Text("Link your account")
                .font(.noteablySerif(24, weight: .bold))
                .foregroundStyle(Color.noteablyForeground)
                .padding(.bottom, 8)

            // Description
            Text("We found an existing account with this email. Please enter your password to link your Google account.")
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
                .padding(.bottom, 32)

            // Error
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
                    RoundedRectangle(cornerRadius: AppRadius.lg, style: .continuous)
                        .fill(Color.noteablyDestructive.opacity(0.08))
                )
                .padding(.bottom, 16)
            }

            // Password field
            VStack(alignment: .leading, spacing: 8) {
                Text("Password")
                    .font(.noteablyBody(14, weight: .medium))
                    .foregroundStyle(Color.noteablyForeground)

                SecureField("Enter your password", text: $password)
                    .textContentType(.password)
                    .focused($isFocused)
                    .foregroundColor(Color.noteablyForeground)
                    .noteablyTextField(isFocused: isFocused)
                    .submitLabel(.go)
                    .onSubmit { linkAccount() }
                    .tint(Color.noteablyForeground)
            }
            .padding(.bottom, 24)

            // Link button
            Button(action: linkAccount) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Link Account")
                }
            }
            .buttonStyle(NoteablyPrimaryButtonStyle())
            .disabled(isLoading || password.isEmpty)
            .opacity(password.isEmpty ? 0.6 : 1.0)
            .padding(.bottom, 12)

            // Cancel button
            Button("Cancel") {
                appState.cancelAccountLinking()
            }
            .font(.noteablyBody(16, weight: .medium))
            .foregroundStyle(Color.noteablySecondaryText)
            .disabled(isLoading)

            Spacer()
        }
        .padding(.horizontal, 32)
        .background(Color.noteablyBackground)
        .onAppear { isFocused = true }
    }

    private func linkAccount() {
        guard !password.isEmpty, let email = authService.currentEmail else { return }
        isFocused = false
        isLoading = true
        errorMessage = nil

        Task {
            do {
                _ = try await SupabaseConfig.client.auth.signIn(
                    email: email,
                    password: password
                )
                await MainActor.run {
                    appState.completeAccountLinking()
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Incorrect password. Please try again."
                    isLoading = false
                }
            }
        }
    }
}
