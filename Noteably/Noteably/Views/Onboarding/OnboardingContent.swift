import SwiftUI

enum OnboardingVisualType {
    case hook
    case capture
    case aiTutor
    case getStarted
}

struct OnboardingPageData: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let type: OnboardingVisualType
}

struct OnboardingContent {
    static let pages: [OnboardingPageData] = [
        OnboardingPageData(
            title: "Turn content into\nknowledge.",
            subtitle: "Upload audio, videos, or PDFs. Let AI transform them into structured study guides instantly.",
            type: .hook
        ),
        OnboardingPageData(
            title: "From Chaos\nto Clarity",
            subtitle: "Record lectures or import files on the go. Focus on the moment while we handle the notes.",
            type: .capture
        ),
        OnboardingPageData(
            title: "Your personal\nAI buddy.",
            subtitle: "Generate flashcards, practice quizzes, and detailed summaries tailored to your learning style.",
            type: .aiTutor
        ),
        OnboardingPageData(
            title: "Ready to 10x\nyour learning?",
            subtitle: "Join students and professionals using Noteably to master any subject.",
            type: .getStarted
        )
    ]
}
