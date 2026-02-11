import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0


    var body: some View {
        Group {
            switch selectedTab {
            case 0:
                DashboardView()
            case 1:
                StudySetListView()
            case 2:
                UploadView()
            case 3:
                 FlashcardListView()
            case 4:
                 ProfileView()
            default:
                EmptyView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .safeAreaInset(edge: .bottom) {
            CustomTabBar(selectedTab: $selectedTab) {
                selectedTab = 2
            }
        }
        .ignoresSafeArea(.keyboard)
    }

}

#if DEBUG
#Preview {
    let appState = AppState()
    appState.isAuthenticated = true
    
    return MainTabView()
        .environment(appState)
}
#endif
