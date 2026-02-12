import SwiftUI

struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    var switchToSignIn: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var isGoogleLoading = false
    @State private var showEmailForm = false
    @State private var errorMessage: String?
    @State private var appeared = false
    @State private var showCompleteProfile = false

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case email, password, confirmPassword
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
                        .padding(.bottom, 48)

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
        .fullScreenCover(isPresented: $showCompleteProfile) {
            CompleteProfileView()
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
            VStack(spacing: 10) {
                Text("Create an account")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Get started with Noteably today.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

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
                            .font(.system(size: 18))
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

            // Email form toggle or form
            if !showEmailForm {
                Button {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showEmailForm = true
                    }
                } label: {
                    Text("Sign up with email")
                        .font(.noteablyBody(16, weight: .medium))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
            } else {
                VStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        TextField("student@university.edu", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .noteablyTextField(isFocused: focusedField == .email)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .password }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        SecureField("••••••••", text: $password)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .password)
                            .noteablyTextField(isFocused: focusedField == .password)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .confirmPassword }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Confirm Password")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        SecureField("••••••••", text: $confirmPassword)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .confirmPassword)
                            .noteablyTextField(isFocused: focusedField == .confirmPassword)
                            .submitLabel(.go)
                            .onSubmit { signUp() }
                    }

                    if !password.isEmpty && password.count < 6 {
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle")
                                .font(.system(size: 13))
                            Text("Password must be at least 6 characters")
                                .font(.noteablyBody(13))
                        }
                        .foregroundStyle(Color.noteablySecondaryText)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))

                Button(action: signUp) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Sign Up")
                    }
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())
                .disabled(isLoading || !isFormValid)
                .opacity(isFormValid ? 1.0 : 0.6)
            }
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.noteablyCard)
                .shadow(color: Color.black.opacity(0.06), radius: 24, x: 0, y: 8)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.3), lineWidth: 1)
        )
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 4) {
            Text("Already have an account?")
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)

            Button {
                switchToSignIn()
            } label: {
                Text("Sign in")
                    .font(.noteablyBody(15, weight: .semibold))
                    .foregroundStyle(Color.noteablyPrimary)
            }
        }
        .opacity(appeared ? 1 : 0)
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        !email.isEmpty && password.count >= 6 && password == confirmPassword
    }

    // MARK: - Actions

    private func signUp() {
        guard isFormValid else { return }

        if password != confirmPassword {
            errorMessage = "Passwords don't match."
            return
        }

        focusedField = nil
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.signUp(email: email, password: password)
                showCompleteProfile = true
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
    SignUpView(switchToSignIn: {})
        .environment(AppState())
        .environment(AuthService.shared)
}
