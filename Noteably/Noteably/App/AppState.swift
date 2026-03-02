import SwiftUI
import Network
import Supabase

// MARK: - App State

@Observable
final class AppState {
    var isAuthenticated = false
    var userId: String?
    var needsProfileCompletion = false
    var needsAvatarSetup = false
    var needsAccountLinking = false
    var isAccountDeleted = false
    var isConnected = true

    private let authService = AuthService.shared
    private let networkMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.noteably.network")

    init() {
        setupNetworkMonitoring()
        setupAPIClient()
        syncAuthState()
        listenToAuthChanges()
    }

    // MARK: - Auth

    func syncAuthState() {
        isAuthenticated = authService.isAuthenticated
        userId = authService.currentUserId
        needsProfileCompletion = isAuthenticated && !authService.profileCompleted
        isAccountDeleted = authService.accountScheduledForDeletion != nil
    }

    func signIn(email: String, password: String) async throws {
        try await authService.signIn(email: email, password: password)
        syncAuthState()
    }

    func signUp(email: String, password: String) async throws {
        try await authService.signUp(email: email, password: password)
        syncAuthState()
    }

    func signInWithGoogle() async throws {
        try await authService.signInWithGoogle()
    }

    func completeProfile(firstName: String, lastName: String, phoneNumber: String? = nil) async throws {
        try await authService.completeProfile(firstName: firstName, lastName: lastName, phoneNumber: phoneNumber)
        syncAuthState()
        needsAvatarSetup = true
    }

    func finishAvatarSetup() {
        needsAvatarSetup = false
    }

    func deleteAccount() async throws {
        try await authService.deleteAccount()
        await MainActor.run { syncAuthState() }
    }

    func restoreAccount() async throws {
        try await authService.restoreAccount()
        await MainActor.run { syncAuthState() }
    }

    func signOut() {
        Task {
            await authService.signOut()
            await MainActor.run { syncAuthState() }
        }
    }

    // MARK: - OAuth Account Linking

    /// Check if the current session has both email and OAuth identities (auto-merge).
    /// If so, require password verification before granting full access.
    func checkOAuthIdentityConflict() async {
        do {
            let session = try await SupabaseConfig.client.auth.session
            let identities = session.user.identities ?? []
            let hasEmail = identities.contains { $0.provider == "email" }
            let hasGoogle = identities.contains { $0.provider == "google" }

            if hasEmail && hasGoogle {
                let userId = session.user.id.uuidString.lowercased()
                let key = "oauth_link_verified_\(userId)"
                if UserDefaults.standard.bool(forKey: key) {
                    return
                }
                await MainActor.run {
                    needsAccountLinking = true
                }
            }
        } catch {
            // No session or error — ignore
        }
    }

    func completeAccountLinking() {
        if let userId = authService.currentUserId {
            let key = "oauth_link_verified_\(userId)"
            UserDefaults.standard.set(true, forKey: key)
        }
        needsAccountLinking = false
    }

    func cancelAccountLinking() {
        signOut()
        needsAccountLinking = false
    }

    private func listenToAuthChanges() {
        authService.listenToAuthChanges { [weak self] isAuth in
            self?.isAuthenticated = isAuth
            if isAuth {
                self?.userId = self?.authService.currentUserId
                self?.needsProfileCompletion = !(self?.authService.profileCompleted ?? false)
                self?.isAccountDeleted = self?.authService.accountScheduledForDeletion != nil
            } else {
                self?.userId = nil
                self?.needsProfileCompletion = false
            }
        }
    }

    // MARK: - Network

    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        networkMonitor.start(queue: monitorQueue)
    }

    // MARK: - API Client Setup

    private func setupAPIClient() {
        APIClient.shared.baseURL = "http://192.168.1.42:8000"
        APIClient.shared.tokenProvider = { [weak self] in
            guard self != nil else { return nil }
            return await AuthService.shared.getAccessToken()
        }
    }
}
