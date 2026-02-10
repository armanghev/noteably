import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Home", systemImage: "house", value: 0) {
                DashboardView()
            }

            Tab("Upload", systemImage: "plus.circle", value: 1) {
                UploadView()
            }

            Tab("Notes", systemImage: "doc.text", value: 2) {
                StudySetListView()
            }

            Tab("Cards", systemImage: "rectangle.on.rectangle", value: 3) {
                FlashcardListView()
            }

            Tab("Quizzes", systemImage: "questionmark.circle", value: 4) {
                QuizListView()
            }
        }
        .tint(Color.noteablyPrimary)
    }
}
