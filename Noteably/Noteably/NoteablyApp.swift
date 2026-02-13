import SwiftUI
import Supabase

@main
struct NoteablyApp: App {
    @State private var appState = AppState()
    @State private var authService = AuthService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if appState.isAuthenticated {
                    if appState.needsProfileCompletion {
                        CompleteProfileView()
                    } else if appState.needsAvatarSetup {
                        SetupAvatarView {
                            appState.finishAvatarSetup()
                        }
                        .environment(authService)
                    } else {
                        MainTabView()
                    }
                } else {
                    OnboardingView()
                }
            }
            .environment(appState)
            .environment(authService)
            .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
            .animation(.easeInOut(duration: 0.3), value: appState.needsProfileCompletion)
            .onOpenURL { url in
                Task {
                    try? await SupabaseConfig.client.auth.session(from: url)
                    appState.syncAuthState()
                }
            }
        }
    }
}
