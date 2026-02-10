import SwiftUI

struct OnboardingPageData: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let iconName: String
    let showMockup: Bool
}

struct OnboardingContent {
    static let pages: [OnboardingPageData] = [
        OnboardingPageData(
            title: "Turn content into\nknowledge.",
            subtitle: "Upload any video, audio, or PDF. Noteably automatically generates notes, flashcards, and quizzes.",
            iconName: "sparkles",
            showMockup: true
        ),
        OnboardingPageData(
            title: "Your personal\nAI tutor.",
            subtitle: "Instant, accurate transcripts from lectures. Never miss a word again with semantic search.",
            iconName: "brain.head.profile",
            showMockup: false
        ),
        OnboardingPageData(
            title: "Master any\nsubject faster.",
            subtitle: "Stop rewinding videos. Our AI identifies key concepts and creates spaced-repetition decks automatically.",
            iconName: "bolt.fill",
            showMockup: false
        ),
        OnboardingPageData(
            title: "Ready to study\nsmarter?",
            subtitle: "Join thousands of students who stopped wasting time on prep work.",
            iconName: "checkmark.circle.fill",
            showMockup: false
        )
    ]
}
