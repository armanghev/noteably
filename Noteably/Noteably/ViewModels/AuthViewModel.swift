import SwiftUI

@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var confirmPassword = ""
    var isLoading = false
    var errorMessage: String?

    private let appState: AppState

    init(appState: AppState) {
        self.appState = appState
    }

    var isSignInValid: Bool {
        !email.isEmpty && !password.isEmpty
    }

    var isSignUpValid: Bool {
        !email.isEmpty && password.count >= 6 && password == confirmPassword
    }

    func signIn() async {
        guard isSignInValid else { return }
        isLoading = true
        errorMessage = nil

        do {
            try await appState.signIn(email: email, password: password)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func signUp() async {
        guard isSignUpValid else { return }

        if password != confirmPassword {
            errorMessage = "Passwords don't match."
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await appState.signUp(email: email, password: password)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func reset() {
        email = ""
        password = ""
        confirmPassword = ""
        errorMessage = nil
        isLoading = false
    }
}
