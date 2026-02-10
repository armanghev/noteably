import SwiftUI

struct StudySetDetailView: View {
    let jobId: String
    @State private var viewModel: StudySetDetailViewModel
    @State private var selectedTab = 0
    @State private var showDeleteConfirm = false
    @Environment(\.dismiss) private var dismiss

    init(jobId: String, job: Job? = nil, content: ContentResponse? = nil) {
        self.jobId = jobId
        _viewModel = State(initialValue: StudySetDetailViewModel(
            jobId: jobId,
            job: job,
            content: content
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab picker
            Picker("Section", selection: $selectedTab) {
                Text("Summary").tag(0)
                Text("Notes").tag(1)
                if viewModel.hasFlashcards {
                    Text("Cards").tag(2)
                }
                if viewModel.hasQuiz {
                    Text("Quiz").tag(3)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            // Content
            ScrollView(showsIndicators: false) {
                Group {
                    switch selectedTab {
                    case 0: summaryTab
                    case 1: notesTab
                    case 2: flashcardsTab
                    case 3: quizTab
                    default: EmptyView()
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
        .background(Color.noteablyBackground)
        .navigationTitle(viewModel.summary?.title ?? viewModel.job?.filename ?? "Study Set")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(Color.noteablyPrimary)
                }
            }
        }
        .alert("Delete Study Set", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    if await viewModel.deleteJob() {
                        dismiss()
                    }
                }
            }
        } message: {
            Text("This will permanently delete all generated materials.")
        }
        .task {
            await viewModel.loadAll()
        }
    }

    // MARK: - Summary Tab

    private var summaryTab: some View {
        VStack(alignment: .leading, spacing: 20) {
            if viewModel.isLoading {
                ProgressView().frame(maxWidth: .infinity, minHeight: 200)
            } else if let summary = viewModel.summary {
                // Title
                Text(summary.title)
                    .font(.noteablySerif(24, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                // Summary text
                Text(summary.summary)
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineSpacing(4)

                // Key points
                if !summary.keyPoints.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Key Points")
                            .font(.noteablyBody(16, weight: .semibold))
                            .foregroundStyle(Color.noteablyForeground)

                        ForEach(summary.keyPoints, id: \.self) { point in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(Color.noteablyPrimary)
                                    .padding(.top, 2)
                                Text(point)
                                    .font(.noteablyBody(15))
                                    .foregroundStyle(Color.noteablyForeground)
                                    .lineSpacing(2)
                            }
                        }
                    }
                    .padding(18)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color.noteablyPrimary.opacity(0.05))
                    )
                }
            } else if let error = viewModel.errorMessage {
                Text(error)
                    .font(.noteablyBody(15))
                    .foregroundStyle(Color.noteablyDestructive)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Notes Tab

    private var notesTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let notes = viewModel.notes {
                Text(notes.content)
                    .font(.noteablyBody(15))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineSpacing(4)
                    .textSelection(.enabled)
            } else {
                EmptyStateView(
                    icon: "doc.text",
                    title: "No notes",
                    message: "Notes weren't generated for this study set."
                )
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Flashcards Tab

    private var flashcardsTab: some View {
        VStack(spacing: 16) {
            if viewModel.hasFlashcards {
                NavigationLink {
                    FlashcardDeckView(flashcards: viewModel.flashcards)
                } label: {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Study \(viewModel.flashcards.count) Cards")
                    }
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())

                // Card list preview
                ForEach(Array(viewModel.flashcards.enumerated()), id: \.offset) { index, card in
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Card \(index + 1)")
                            .font(.noteablyBody(12, weight: .medium))
                            .foregroundStyle(Color.noteablySecondaryText)
                        Text(card.front)
                            .font(.noteablyBody(15, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)
                        Text(card.back)
                            .font(.noteablyBody(14))
                            .foregroundStyle(Color.noteablySecondaryText)
                            .lineSpacing(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.noteablyCard)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
                    )
                }
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Quiz Tab

    private var quizTab: some View {
        VStack(spacing: 16) {
            if let quiz = viewModel.quiz {
                NavigationLink {
                    QuizDetailView(jobId: jobId, questions: quiz.questions)
                } label: {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Start Quiz (\(quiz.questions.count) questions)")
                    }
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())

                // Question preview
                ForEach(Array(quiz.questions.enumerated()), id: \.offset) { index, question in
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Q\(index + 1)")
                            .font(.noteablyBody(12, weight: .medium))
                            .foregroundStyle(Color.noteablySecondaryText)
                        Text(question.question)
                            .font(.noteablyBody(15))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineSpacing(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.noteablyCard)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
                    )
                }
            }
        }
        .padding(.top, 8)
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        StudySetDetailView(
            jobId: "mock-job-id",
            job: MockData.jobCompleted,
            content: MockData.contentResponse
        )
    }
}
#endif
