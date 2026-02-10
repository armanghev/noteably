import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = DashboardViewModel()
    @State private var showProfile = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    // Greeting
                    greetingSection

                    // Offline indicator
                    if !appState.isConnected {
                        OfflineIndicator()
                    }

                    // Stats
                    statsSection

                    // Quick upload
                    quickUploadCard

                    // Recent activity
                    recentActivitySection
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .background(Color.noteablyBackground)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("Noteably")
                        .font(.noteablySerif(24, weight: .bold))
                        .foregroundStyle(Color.noteablyForeground)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showProfile = true
                    } label: {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 28, weight: .light))
                            .foregroundStyle(Color.noteablyPrimary)
                    }
                    .padding(0)
                    .background
                }
            }
            .sheet(isPresented: $showProfile) {
                ProfileView()
            }
        }
        .task {
            await viewModel.loadDashboard()
        }
    }

    // MARK: - Greeting

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greetingText)
                .font(.noteablySerif(28, weight: .bold))
                .foregroundStyle(Color.noteablyForeground)

            Text("Ready to study?")
                .font(.noteablyBody(16))
                .foregroundStyle(Color.noteablySecondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        HStack(spacing: 12) {
            StatCard(
                title: "Notes",
                value: "\(viewModel.totalNotes)",
                icon: "doc.text"
            )
            StatCard(
                title: "Flashcards",
                value: "\(viewModel.totalFlashcards)",
                icon: "rectangle.on.rectangle"
            )
        }
    }

    // MARK: - Quick Upload

    private var quickUploadCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Upload a file")
                        .font(.noteablyBody(17, weight: .semibold))
                        .foregroundStyle(Color.noteablyForeground)
                    Text("Generate study materials instantly")
                        .font(.noteablyBody(14))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                Spacer()
                Image(systemName: "arrow.up.doc.fill")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundStyle(Color.noteablyPrimary)
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.noteablyPrimary.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.noteablyPrimary.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Recent Activity

    private var recentActivitySection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Recent Activity")
                .font(.noteablyBody(18, weight: .semibold))
                .foregroundStyle(Color.noteablyForeground)

            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if viewModel.recentJobs.isEmpty {
                EmptyStateView(
                    icon: "tray",
                    title: "No activity yet",
                    message: "Upload your first file to get started."
                )
            } else {
                ForEach(viewModel.recentJobs) { job in
                    recentJobRow(job)
                }
            }
        }
    }

    private func recentJobRow(_ job: RecentJob) -> some View {
        HStack(spacing: 14) {
            Image(systemName: fileIcon(for: job.fileType))
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
                .frame(width: 40, height: 40)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.noteablyPrimary.opacity(0.10))
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(job.filename)
                    .font(.noteablyBody(15, weight: .medium))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineLimit(1)

                StatusBadge(status: job.status)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.noteablySecondaryText)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.noteablyCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }

    private func fileIcon(for type: String) -> String {
        let t = type.lowercased()
        if t.contains("pdf") { return "doc.text" }
        if t.contains("audio") || t.contains("mp3") || t.contains("wav") { return "waveform" }
        if t.contains("video") || t.contains("mp4") || t.contains("mov") { return "play.rectangle" }
        return "doc"
    }
    
    init(viewModel: DashboardViewModel = DashboardViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }
}

#if DEBUG
#Preview {
    DashboardView(viewModel: DashboardViewModel(dashboard: MockData.dashboardResponse))
        .environment(AppState())
}
#endif
