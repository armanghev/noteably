import SwiftUI

struct QuizListView: View {
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
                        placeholder: "Search quizzes..."
                    )

                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if quizJobs.isEmpty {
                        EmptyStateView(
                            icon: "questionmark.circle",
                            title: "No quizzes",
                            message: "Upload a file and select quiz to generate one."
                        )
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(quizJobs) { job in
                                NavigationLink(value: job.id) {
                                    quizCard(job)
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
            .navigationTitle("Quizzes")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: String.self) { jobId in
                QuizLoadingView(jobId: jobId)
            }
        }
        .task {
            await viewModel.loadJobs()
        }
    }

    private var quizJobs: [JobListItem] {
        viewModel.filteredJobs.filter { job in
            (job.contentTypes?.contains(where: { $0 == "quiz" || $0 == "quizzes" }) ?? false) && job.status == .completed
        }
    }

    private func quizCard(_ job: JobListItem) -> some View {
        HStack(spacing: 14) {
            Image(systemName: "questionmark.circle")
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
                .frame(width: 48, height: 48)
                .background(
                    RoundedRectangle(cornerRadius: AppRadius.lg, style: .continuous)
                        .fill(Color.noteablyPrimary.opacity(0.10))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(job.summaryTitle ?? job.filename)
                    .font(.noteablyBody(16, weight: .semibold))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineLimit(1)

                if let count = job.quizCount {
                    Text("\(count) questions")
                        .font(.noteablyBody(13))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.noteablySecondaryText)
        }
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

// MARK: - Loading wrapper

struct QuizLoadingView: View {
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
            } else if viewModel.hasQuiz, let quiz = viewModel.quiz {
                QuizDetailView(jobId: jobId, questions: quiz.questions)
            } else {
                EmptyStateView(
                    icon: "questionmark.circle",
                    title: "No quiz",
                    message: "This study set doesn't have a quiz."
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
    QuizListView(viewModel: StudySetsViewModel(jobs: MockData.jobList))
        .environment(AppState())
}
#endif
