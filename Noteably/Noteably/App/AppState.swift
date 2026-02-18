import SwiftUI
import Network

// MARK: - App State

@Observable
final class AppState {
    var isAuthenticated = false
    var userId: String?
    var needsProfileCompletion = false
    var needsAvatarSetup = false
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

    func signOut() {
        Task {
            await authService.signOut()
            await MainActor.run { syncAuthState() }
        }
    }

    private func listenToAuthChanges() {
        authService.listenToAuthChanges { [weak self] isAuth in
            self?.isAuthenticated = isAuth
            if isAuth {
                self?.userId = self?.authService.currentUserId
                self?.needsProfileCompletion = !(self?.authService.profileCompleted ?? false)
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
