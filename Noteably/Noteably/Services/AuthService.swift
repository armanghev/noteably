import Foundation
import Supabase
import UIKit

// MARK: - Auth Service

@Observable
final class AuthService {
    static let shared = AuthService()

    private let supabase = SupabaseConfig.client
    private let api = APIClient.shared

    private(set) var currentUserId: String?
    private(set) var currentEmail: String?
    private(set) var currentAvatarUrl: String?
    private(set) var currentFirstName: String?
    private(set) var currentLastName: String?
    private(set) var profileCompleted: Bool = false
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

    // MARK: - Complete Profile

    func completeProfile(firstName: String, lastName: String, phoneNumber: String? = nil) async throws {
        let body = CompleteProfileRequest(
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber
        )
        let _: CompleteProfileResponse = try await api.post(
            path: "/api/auth/complete-profile",
            body: body
        )

        // Refresh the session to pick up updated user_metadata
        try await supabase.auth.refreshSession()
        if let session = try? await supabase.auth.session {
            applySession(session)
        }
    }

    // MARK: - Google OAuth

    func signInWithGoogle() async throws {
        let url = try supabase.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "noteably://auth/callback")
        )

        // Open the URL in the system browser
        await MainActor.run {
            UIApplication.shared.open(url)
        }
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
        currentUserId = session.user.id.uuidString.lowercased()
        currentEmail = session.user.email
        if let avatarUrl = session.user.userMetadata["avatar_url"]?.stringValue {
            currentAvatarUrl = avatarUrl
        } else {
            currentAvatarUrl = nil
        }
        currentFirstName = session.user.userMetadata["first_name"]?.stringValue
        currentLastName = session.user.userMetadata["last_name"]?.stringValue
        profileCompleted = session.user.userMetadata["profile_completed"]?.boolValue ?? false
        isAuthenticated = true
    }

    private func clearSession() {
        currentUserId = nil
        currentEmail = nil
        currentAvatarUrl = nil
        currentFirstName = nil
        currentLastName = nil
        profileCompleted = false
        isAuthenticated = false
    }
    
    // MARK: - Avatar Upload

    func updateAvatar(imageData: Data) async throws {
        guard let userId = currentUserId else { return }
        
        let path = "\(userId)/avatar.jpg"
        
        // Upload to Supabase Storage (upsert)
        // Note: SDK v2.41+ automatically handles auth headers
        try await supabase.storage
            .from("avatars")
            .upload(
                path,
                data: imageData,
                options: FileOptions(contentType: "image/jpeg", upsert: true)
            )
            
        print("✅ Avatar upload successful")

        // Get public URL
        let publicUrl = try supabase.storage
            .from("avatars")
            .getPublicURL(path: path)
            .absoluteString

        let urlWithCacheBust = "\(publicUrl)?t=\(Int(Date().timeIntervalSince1970))"

        // Update user metadata
        try await supabase.auth.update(user: UserAttributes(data: ["avatar_url": .string(urlWithCacheBust)]))

        // Update local state
        await MainActor.run {
            self.currentAvatarUrl = urlWithCacheBust
        }
    }

    #if DEBUG
    func debugSetUser(email: String, id: String, avatarUrl: String? = nil, firstName: String? = nil, lastName: String? = nil) {
        self.currentEmail = email
        self.currentUserId = id
        self.currentAvatarUrl = avatarUrl
        self.currentFirstName = firstName
        self.currentLastName = lastName
        self.isAuthenticated = true
    }
    #endif
}
