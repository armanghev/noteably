import SwiftUI

struct SignInView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    var switchToSignUp: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
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
                Text("Welcome back")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Enter your details to access your account.")
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
                        .textContentType(.password)
                        .focused($focusedField, equals: .password)
                        .noteablyTextField(isFocused: focusedField == .password)
                        .submitLabel(.go)
                        .onSubmit { signIn() }
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
}

#Preview {
    SignInView(switchToSignUp: {})
        .environment(AppState())
}
