import SwiftUI

struct StudySetListView: View {
    @State private var viewModel: StudySetsViewModel

    init(viewModel: StudySetsViewModel = StudySetsViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    private var completedJobs: [JobListItem] {
        viewModel.filteredJobs.filter { $0.status == .completed }
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    // Search
                    NoteablySearchBar(
                        text: $viewModel.searchText,
                        placeholder: "Search notes..."
                    )

                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if completedJobs.isEmpty {
                        EmptyStateView(
                            icon: "doc.text",
                            title: "No notes yet",
                            message: "Upload a file to generate study materials."
                        )
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(completedJobs) { job in
                                NavigationLink(value: job.id) {
                                    JobCard(job: job)
                                }
                                .buttonStyle(.plain)
                                .onAppear {
                                    // Infinite scroll
                                    if job.id == viewModel.filteredJobs.last?.id {
                                        Task { await viewModel.loadMore() }
                                    }
                                }
                            }

                            if viewModel.isLoadingMore {
                                ProgressView()
                                    .padding()
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 64)
            }
            .background(Color.noteablyBackground)
            .navigationTitle("Notes")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: String.self) { jobId in
                StudySetDetailView(jobId: jobId)
            }
        }
        .task {
            await viewModel.loadJobs()
        }
    }
}

#if DEBUG
#Preview {
    StudySetListView(viewModel: StudySetsViewModel(jobs: MockData.jobList))
        .environment(AppState())
}
#endif
