import SwiftUI

struct StudySetDetailView: View {
    let jobId: String
    @State private var viewModel: StudySetDetailViewModel
    enum DetailTab: String, CaseIterable {
        case summary = "Summary"
        case notes = "Notes"
        case flashcards = "Cards"
        case quiz = "Quiz"
    }

    @State private var selectedTab: DetailTab = .summary
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

    var availableTabs: [DetailTab] {
        var tabs: [DetailTab] = [.summary, .notes]
        if viewModel.hasFlashcards { tabs.append(.flashcards) }
        if viewModel.hasQuiz { tabs.append(.quiz) }
        return tabs
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab picker
            CustomTabList(
                selection: $selectedTab,
                options: availableTabs,
                titlePath: \.rawValue
            )
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            // Content
            ScrollView(showsIndicators: false) {
                Group {
                    switch selectedTab {
                    case .summary: summaryTab
                    case .notes: notesTab
                    case .flashcards: flashcardsTab
                    case .quiz: quizTab
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 64)
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
            if viewModel.notes?.cornell != nil {
                // Cornell notes embed the summary — show a note instead
                Text("Summary is included in the Cornell Notes tab.")
                    .font(.noteablyBody(15))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if viewModel.isLoading {
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
                        RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
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
                if let cornell = notes.cornell {
                    CornellNotesView(
                        data: cornell,
                        summaryText: viewModel.summary?.summary
                    )
                } else if let qa = notes.qa {
                    QANotesView(items: qa)
                } else if let outline = notes.outline {
                    OutlineNotesView(data: outline)
                } else if let content = notes.content {
                    MarkdownView(text: content)
                        .textSelection(.enabled)
                } else {
                    EmptyStateView(
                        icon: "doc.text",
                        title: "No notes",
                        message: "Notes weren't generated for this study set."
                    )
                }
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
                        RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                            .fill(Color.noteablyCard)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
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
                        RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                            .fill(Color.noteablyCard)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
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
