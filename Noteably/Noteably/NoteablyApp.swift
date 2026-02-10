import SwiftUI

@main
struct NoteablyApp: App {
    @State private var appState = AppState()

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
            .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
        }
    }
}
