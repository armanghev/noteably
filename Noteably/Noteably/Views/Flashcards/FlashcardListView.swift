import SwiftUI

struct FlashcardListView: View {
    @State private var viewModel: StudySetsViewModel

    init(viewModel: StudySetsViewModel = StudySetsViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    NoteablySearchBar(
                        text: $viewModel.searchText,
                        placeholder: "Search flashcard decks..."
                    )

                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if flashcardJobs.isEmpty {
                        EmptyStateView(
                            icon: "rectangle.on.rectangle",
                            title: "No flashcard decks",
                            message: "Upload a file and select flashcards to generate them."
                        )
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(flashcardJobs) { job in
                                NavigationLink(value: job.id) {
                                    flashcardDeckCard(job)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .background(Color.noteablyBackground)
            .navigationTitle("Flashcards")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: String.self) { jobId in
                FlashcardLoadingView(jobId: jobId)
            }
        }
        .task {
            await viewModel.loadJobs()
        }
    }

    private var flashcardJobs: [JobListItem] {
        viewModel.filteredJobs.filter { job in
            job.contentTypes?.contains("flashcards") ?? false
        }
    }

    private func flashcardDeckCard(_ job: JobListItem) -> some View {
        HStack(spacing: 14) {
            Image(systemName: "rectangle.on.rectangle")
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
                .frame(width: 48, height: 48)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.noteablyPrimary.opacity(0.10))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(job.summaryTitle ?? job.filename)
                    .font(.noteablyBody(16, weight: .semibold))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    if let count = job.flashcardCount {
                        Text("\(count) cards")
                            .font(.noteablyBody(13))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.noteablySecondaryText)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.noteablyCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }
}

// MARK: - Loading wrapper that fetches content then shows deck

struct FlashcardLoadingView: View {
    let jobId: String
    @State private var viewModel: StudySetDetailViewModel

    init(jobId: String) {
        self.jobId = jobId
        _viewModel = State(initialValue: StudySetDetailViewModel(jobId: jobId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.hasFlashcards {
                FlashcardDeckView(flashcards: viewModel.flashcards)
            } else {
                EmptyStateView(
                    icon: "rectangle.on.rectangle",
                    title: "No flashcards",
                    message: "This study set doesn't have flashcards."
                )
            }
        }
        .background(Color.noteablyBackground)
        .task {
            await viewModel.loadAll()
        }
    }
}

#if DEBUG
#Preview {
    FlashcardListView(viewModel: StudySetsViewModel(jobs: MockData.jobList))
        .environment(AppState())
}
#endif
