import SwiftUI

@main
struct NoteablyApp: App {
    @State private var appState = AppState()
    @State private var authService = AuthService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if appState.isAuthenticated {
                    MainTabView()
                } else {
                    LandingView()
                }
            }
            .environment(appState)
            .environment(authService)
            .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
        }
    }
}
