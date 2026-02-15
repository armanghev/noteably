import SwiftUI

struct CompleteProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @Environment(AuthService.self) private var authService

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phoneNumber = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var appeared = false

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case firstName, lastName, phone
    }

    var body: some View {
        ZStack {
            Color.noteablyBackground
                .ignoresSafeArea()
                .onTapGesture { focusedField = nil }

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
            prefillFromOAuth()
            withAnimation(.easeOut(duration: 0.6)) {
                appeared = true
            }
        }
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(spacing: 28) {
            VStack(spacing: 10) {
                Text("Complete Your Profile")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Just a few more details to get started.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
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
                    RoundedRectangle(cornerRadius: AppRadius.lg, style: .continuous)
                        .fill(Color.noteablyDestructive.opacity(0.08))
                )
            }

            VStack(spacing: 18) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("First name")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        TextField("John", text: $firstName)
                            .textContentType(.givenName)
                            .textInputAutocapitalization(.words)
                            .focused($focusedField, equals: .firstName)
                            .noteablyTextField(isFocused: focusedField == .firstName)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .lastName }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Last name")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        TextField("Doe", text: $lastName)
                            .textContentType(.familyName)
                            .textInputAutocapitalization(.words)
                            .focused($focusedField, equals: .lastName)
                            .noteablyTextField(isFocused: focusedField == .lastName)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .phone }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Phone number")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)
                        Text("(optional)")
                            .font(.noteablyBody(13))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }

                    TextField("+1 (555) 123-4567", text: $phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                        .focused($focusedField, equals: .phone)
                        .noteablyTextField(isFocused: focusedField == .phone)
                }
            }

            Button(action: completeProfile) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Continue")
                }
            }
            .buttonStyle(NoteablyPrimaryButtonStyle())
            .disabled(isLoading || !isFormValid)
            .opacity(isFormValid ? 1.0 : 0.6)
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !lastName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Prefill

    private func prefillFromOAuth() {
        if let first = authService.currentFirstName, !first.isEmpty {
            firstName = first
        }
        if let last = authService.currentLastName, !last.isEmpty {
            lastName = last
        }
    }

    // MARK: - Actions

    private func completeProfile() {
        guard isFormValid else { return }
        focusedField = nil
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.completeProfile(
                    firstName: firstName.trimmingCharacters(in: .whitespaces),
                    lastName: lastName.trimmingCharacters(in: .whitespaces),
                    phoneNumber: phoneNumber.trimmingCharacters(in: .whitespaces).isEmpty
                        ? nil
                        : phoneNumber.trimmingCharacters(in: .whitespaces)
                )
                // needsAvatarSetup is set in AppState.completeProfile(), root view will transition
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
    CompleteProfileView()
        .environment(AppState())
        .environment(AuthService.shared)
}
