import Foundation
import Supabase

// MARK: - Auth Service

@Observable
final class AuthService {
    static let shared = AuthService()

    private let supabase = SupabaseConfig.client
    private let api = APIClient.shared

    private(set) var currentUserId: String?
    private(set) var currentEmail: String?
    private(set) var isAuthenticated = false

    private init() {
        Task { await restoreSession() }
    }

    // MARK: - Restore Existing Session

    func restoreSession() async {
        do {
            let session = try await supabase.auth.session
            applySession(session)
        } catch {
            // No valid session — user needs to sign in
            clearSession()
        }
    }

    // MARK: - Sign In

    /// Authenticates via backend, then sets the session in the Supabase client.
    /// This mirrors the web app's flow: backend validates credentials with Supabase,
    /// returns tokens, and we set them in the local Supabase client for
    /// Keychain persistence and auto-refresh.
    func signIn(email: String, password: String) async throws {
        let response: AuthResponse = try await api.post(
            path: "/api/auth/login",
            body: ["email": email, "password": password]
        )

        guard let sessionData = response.session else {
            throw APIError.serverError(statusCode: 401, message: "No session returned.")
        }

        // Set the session in the Supabase client (persists to Keychain, enables auto-refresh)
        let session = try await supabase.auth.setSession(
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken
        )
        applySession(session)
    }

    // MARK: - Sign Up

    func signUp(email: String, password: String) async throws {
        let response: AuthResponse = try await api.post(
            path: "/api/auth/signup",
            body: ["email": email, "password": password]
        )

        guard let sessionData = response.session else {
            throw APIError.serverError(statusCode: 400, message: response.message ?? "No session returned. Check your email for verification.")
        }

        let session = try await supabase.auth.setSession(
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken
        )
        applySession(session)
    }

    // MARK: - Sign Out

    func signOut() async {
        do {
            try await supabase.auth.signOut()
        } catch {
            // Sign out locally even if remote sign out fails
        }
        clearSession()
        CacheService.shared.clearAll()
    }

    // MARK: - Token Provider for APIClient

    /// Returns a fresh access token. The Supabase SDK auto-refreshes if expired.
    func getAccessToken() async -> String? {
        do {
            let session = try await supabase.auth.session
            return session.accessToken
        } catch {
            return nil
        }
    }

    // MARK: - Listen to Auth State Changes

    func listenToAuthChanges(onChange: @escaping (Bool) -> Void) {
        Task {
            for await (event, session) in supabase.auth.authStateChanges {
                await MainActor.run {
                    switch event {
                    case .signedIn, .tokenRefreshed:
                        if let session {
                            self.applySession(session)
                        }
                        onChange(true)
                    case .signedOut:
                        self.clearSession()
                        onChange(false)
                    default:
                        break
                    }
                }
            }
        }
    }

    // MARK: - Private

    private func applySession(_ session: Session) {
        currentUserId = session.user.id.uuidString
        currentEmail = session.user.email
        isAuthenticated = true
    }

    private func clearSession() {
        currentUserId = nil
        currentEmail = nil
        isAuthenticated = false
    }
    
    #if DEBUG
    func debugSetUser(email: String, id: String) {
        self.currentEmail = email
        self.currentUserId = id
        self.isAuthenticated = true
    }
    #endif
}
