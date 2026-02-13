import SwiftUI

struct SignInView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    var switchToSignUp: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var isGoogleLoading = false
    @State private var errorMessage: String?
    @State private var appeared = false

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case email, password
    }

    var body: some View {
        ZStack {
            Color.noteablyBackground
                .ignoresSafeArea()
                .onTapGesture { focusedField = nil }

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    header
                        .padding(.top, 16)
                        .padding(.bottom, 24)

                    formCard
                        .padding(.horizontal, 24)

                    footer
                        .padding(.top, 32)

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
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "arrow.left")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Color.noteablyForeground)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.noteablyCard)
                            .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
                    )
            }
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(spacing: 28) {
            VStack(alignment: .center, spacing: 4) {
                Text("Welcome back")
                    .font(.noteablySerif(28, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Enter your details to access your account.")
                    .font(.noteablyBody(14))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .multilineTextAlignment(.center)
            }
            
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

            VStack(spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Email")
                        .font(.noteablyBody(14, weight: .medium))
                        .foregroundStyle(Color.noteablyForeground)

                    TextField("student@university.edu", text: $email, prompt: Text("student@university.\u{200B}edu").foregroundColor(Color.noteablySecondaryText))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .email)
                        .foregroundColor(Color.noteablyForeground)
                        .noteablyTextField(isFocused: focusedField == .email)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .password }
                        .tint(Color.noteablyForeground)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Password")
                        .font(.noteablyBody(14, weight: .medium))
                        .foregroundStyle(Color.noteablyForeground)

                    SecureField("••••••••", text: $password, prompt: Text("••••••••").foregroundColor(Color.noteablySecondaryText))
                        .textContentType(.password)
                        .focused($focusedField, equals: .password)
                        .foregroundColor(Color.noteablyForeground)
                        .noteablyTextField(isFocused: focusedField == .password)
                        .submitLabel(.go)
                        .onSubmit { signIn() }
                        .tint(Color.noteablyForeground)
                }
            }

            Button(action: signIn) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Sign In")
                }
            }
            .buttonStyle(NoteablyPrimaryButtonStyle())
            .disabled(isLoading || email.isEmpty || password.isEmpty)
            .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1.0)
            
            // Divider
            HStack {
                Rectangle()
                    .fill(Color.noteablyBorder)
                    .frame(height: 1)
                Text("or")
                    .font(.noteablyBody(14))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .padding(.horizontal, 16)
                Rectangle()
                    .fill(Color.noteablyBorder)
                    .frame(height: 1)
            }
            
            // OAuth Buttons
            VStack(spacing: 12) {
                Button(action: signInWithGoogle) {
                    HStack(spacing: 12) {
                        if isGoogleLoading {
                            ProgressView()
                                .tint(Color.noteablyForeground)
                        } else {
                            Image("google-logo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 20, height: 20)
                        }
                        Text("Continue with Google")
                            .font(.noteablyBody(16, weight: .medium))
                    }
                    .foregroundStyle(Color.noteablyForeground)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.noteablyBorder, lineWidth: 1)
                    )
                }
                .disabled(isGoogleLoading || isLoading)

                Button(action: signInWithApple) {
                    HStack(spacing: 12) {
                        Image(systemName: "apple.logo")
                            .font(.system(size: 24))
                        Text("Continue with Apple")
                            .font(.noteablyBody(16, weight: .medium))
                        Text("(Coming soon)")
                            .font(.noteablyBody(13))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                    .foregroundStyle(Color.noteablyForeground)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.noteablyBorder, lineWidth: 1)
                    )
                    .opacity(0.6)
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 4) {
            Text("Don't have an account?")
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)

            Button {
                switchToSignUp()
            } label: {
                Text("Sign up")
                    .font(.noteablyBody(15, weight: .semibold))
                    .foregroundStyle(Color.noteablyPrimary)
            }
        }
        .opacity(appeared ? 1 : 0)
    }

    // MARK: - Actions

    private func signIn() {
        guard !email.isEmpty, !password.isEmpty else { return }
        focusedField = nil
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.signIn(email: email, password: password)
                dismiss()
            } catch let error as APIError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func signInWithGoogle() {
        isGoogleLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.signInWithGoogle()
            } catch let error as APIError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isGoogleLoading = false
        }
    }

    private func signInWithApple() {
        errorMessage = "Apple Sign-In is coming soon!"
    }
}

#Preview {
    SignInView(switchToSignUp: {})
        .environment(AppState())
}
