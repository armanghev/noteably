import SwiftUI
import UniformTypeIdentifiers

struct UploadView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = UploadViewModel()
    @State private var showDocumentPicker = false

    private var showUploadControls: Bool {
        switch viewModel.uploadMode {
        case .file:
            return viewModel.hasFile
        case .youtube:
            return viewModel.hasValidYoutube
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    CustomTabList(
                        selection: $viewModel.uploadMode,
                        options: UploadViewModel.UploadMode.allCases,
                        titlePath: \.title
                    )

                    if viewModel.isUploading || viewModel.isComplete {
                        progressSection
                    } else {
                        if viewModel.uploadMode == .file {
                            fileSelectionSection
                        } else {
                            youtubeInputSection
                        }
                        
                        if showUploadControls {
                            materialTypeSection
                            
                            AdvancedSettingsView(
                                options: $viewModel.jobOptions,
                                selectedTypes: viewModel.selectedMaterialTypes
                            )
                            .padding(.top, 8)
                            
                            uploadButton
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 64)
            }
            .background(Color.noteablyBackground)
            .navigationTitle("Upload")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showDocumentPicker) {
                DocumentPicker(viewModel: viewModel)
            }
            .navigationDestination(isPresented: Binding(
                get: { viewModel.navigateToJobId != nil },
                set: { if !$0 { viewModel.navigateToJobId = nil } }
            )) {
                if let jobId = viewModel.navigateToJobId {
                    StudySetDetailView(jobId: jobId)
                }
            }
        }
    }

    // MARK: - File Selection

    private var fileSelectionSection: some View {
        VStack(spacing: 16) {
            // Drop zone
            Button {
                showDocumentPicker = true
            } label: {
                VStack(spacing: 16) {
                    if let name = viewModel.selectedFileName {
                        // File selected
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40, weight: .light))
                            .foregroundStyle(Color.noteablyPrimary)

                        Text(name)
                            .font(.noteablyBody(16, weight: .semibold))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineLimit(1)

                        Button {
                            viewModel.clearFile()
                        } label: {
                            Text("Change file")
                                .font(.noteablyBody(14, weight: .medium))
                                .foregroundStyle(Color.noteablyPrimary)
                        }
                    } else {
                        // No file
                        Image(systemName: "arrow.up.doc")
                            .font(.system(size: 40, weight: .light))
                            .foregroundStyle(Color.noteablyPrimary)

                        Text("Select a file")
                            .font(.noteablyBody(17, weight: .semibold))
                            .foregroundStyle(Color.noteablyForeground)

                        Text("PDF, MP3, WAV, MP4, MOV, TXT")
                            .font(.noteablyBody(13))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .background(
                    RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                        .strokeBorder(
                            Color.noteablyPrimary.opacity(0.3),
                            style: StrokeStyle(lineWidth: 2, dash: [8])
                        )
                        .background(
                            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                                .fill(Color.noteablyPrimary.opacity(0.04))
                        )
                )
            }
            .buttonStyle(.plain)

            // Error
            if let error = viewModel.errorMessage {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill")
                    Text(error)
                        .font(.noteablyBody(14))
                }
                .foregroundStyle(Color.noteablyDestructive)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var youtubeInputSection: some View {
        VStack(spacing: 16) {
            if let meta = viewModel.videoMeta {
                // Video Preview Card
                HStack(spacing: 16) {
                    AsyncImage(url: URL(string: meta.thumbnail)) { image in
                        image.resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.noteablyBorder
                    }
                    .frame(width: 120, height: 68)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
                    .overlay(alignment: .bottomTrailing) {
                        Text(formatDuration(meta.duration))
                            .font(.noteablyBody(10, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(Color.black.opacity(0.75))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .padding(4)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(meta.title)
                            .font(.noteablyBody(14, weight: .semibold))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineLimit(2)
                        
                        Text(meta.author)
                            .font(.noteablyBody(12))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                    
                    if viewModel.isFetchingMeta {
                        ProgressView()
                            .scaleEffect(0.8)
                            .padding(.leading, 8)
                    }
                    
                    Spacer()
                    
                    Button {
                        viewModel.youtubeUrl = ""
                        viewModel.videoMeta = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                }
                .padding(12)
                .background(Color.noteablyPrimary.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.xl))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.xl)
                        .stroke(Color.noteablyPrimary.opacity(0.1), lineWidth: 1)
                )
            } else {
                // URL Input
                VStack(spacing: 16) {
                    Image(systemName: "video.fill")
                        .font(.system(size: 40, weight: .light))
                        .foregroundStyle(Color.noteablyPrimary)
                    
                    Text("Paste YouTube URL")
                        .font(.noteablyBody(17, weight: .semibold))
                        .foregroundStyle(Color.noteablyForeground)
                    
                    HStack {
                        TextField("https://youtube.com/watch?v=...", text: $viewModel.youtubeUrl)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.noteablyBorder.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: AppRadius.xl))
                            .onChange(of: viewModel.youtubeUrl) { _, _ in
                                Task { await viewModel.fetchYoutubeMeta() }
                            }
                        
                        Button {
                            if UIPasteboard.general.hasStrings {
                                if let string = UIPasteboard.general.string {
                                    viewModel.youtubeUrl = string
                                    Task { await viewModel.fetchYoutubeMeta() }
                                }
                            }
                        } label: {
                            Image(systemName: "doc.on.clipboard")
                                .padding()
                                .background(Color.noteablyPrimary.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
                                .foregroundStyle(Color.noteablyPrimary)
                        }
                    }
                }
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                        .strokeBorder(
                            Color.noteablyPrimary.opacity(0.3),
                            style: StrokeStyle(lineWidth: 2, dash: [8])
                        )
                        .background(
                            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                                .fill(Color.noteablyPrimary.opacity(0.04))
                        )
                )
            }
            
            if viewModel.isFetchingMeta && viewModel.videoMeta == nil {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("Fetching video details...")
                        .font(.noteablyBody(14))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                .padding(.top, 8)
            }
            
            if let error = viewModel.errorMessage, viewModel.uploadMode == .youtube {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill")
                    Text(error)
                        .font(.noteablyBody(14))
                }
                .foregroundStyle(Color.noteablyDestructive)
                .padding(.top, 8)
            }
        }
    }

    // MARK: - Material Types

    private var materialTypeSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Select content to generate")
                .font(.noteablyBody(14, weight: .medium))
                .foregroundStyle(Color.noteablySecondaryText)
                .frame(maxWidth: .infinity, alignment: .leading)

            let columns = [
                GridItem(.flexible(), spacing: 10),
                GridItem(.flexible(), spacing: 10)
            ]

            LazyVGrid(columns: columns, spacing: 10) {
                MaterialTypeToggle(
                    type: "Summary",
                    icon: "text.alignleft",
                    isSelected: $viewModel.generateSummary
                )
                MaterialTypeToggle(
                    type: "Notes",
                    icon: "doc.text",
                    isSelected: $viewModel.generateNotes
                )
                MaterialTypeToggle(
                    type: "Flashcards",
                    icon: "rectangle.on.rectangle",
                    isSelected: $viewModel.generateFlashcards
                )
                MaterialTypeToggle(
                    type: "Quiz",
                    icon: "questionmark.circle",
                    isSelected: $viewModel.generateQuiz
                )
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Upload Button

    private var uploadButton: some View {
        Button {
            Task { await viewModel.upload() }
        } label: {
            HStack(spacing: 8) {
                Text("Generate Study Materials")
                Image(systemName: "sparkles")
            }
        }
        .buttonStyle(NoteablyPrimaryButtonStyle())
        .disabled(!viewModel.canUpload)
        .opacity(viewModel.canUpload ? 1.0 : 0.6)
    }

    // MARK: - Progress Section

    private var progressSection: some View {
        VStack(spacing: 32) {
            if viewModel.isComplete {
                // Completed
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 56, weight: .light))
                        .foregroundStyle(Color.noteablyPrimary)

                    Text("Study materials ready!")
                        .font(.noteablySerif(24, weight: .bold))
                        .foregroundStyle(Color.noteablyForeground)

                    Text("Your content has been generated.")
                        .font(.noteablyBody(15))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                .padding(.top, 40)

                Button {
                    viewModel.reset()
                } label: {
                    Text("Upload Another")
                }
                .buttonStyle(NoteablySecondaryButtonStyle())
            } else {
                // Steps List
                VStack(spacing: 12) {
                    ForEach(Array(viewModel.steps.enumerated()), id: \.element.id) { index, step in
                        HStack(spacing: 16) {
                            // Icon
                            ZStack {
                                if index < viewModel.currentStepIndex {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Color.noteablyPrimary)
                                        .font(.system(size: 24))
                                } else if index == viewModel.currentStepIndex {
                                    ProgressView()
                                        .tint(Color.noteablyPrimary)
                                        .scaleEffect(0.9)
                                        .frame(width: 24, height: 24)
                                        .background(
                                            Circle()
                                                .stroke(Color.noteablyPrimary.opacity(0.3), lineWidth: 2)
                                                .background(Circle().fill(Color.noteablyBackground))
                                        )
                                } else {
                                    Text("\(index + 1)")
                                        .font(.noteablyBody(13, weight: .semibold))
                                        .foregroundStyle(Color.noteablySecondaryText)
                                        .frame(width: 24, height: 24)
                                        .background(
                                            Circle()
                                                .fill(Color.noteablyBorder.opacity(0.4))
                                        )
                                }
                            }
                            .frame(width: 24, height: 24)
                            
                            Text(step.title)
                                .font(.noteablyBody(16, weight: index == viewModel.currentStepIndex ? .semibold : .regular))
                                .foregroundStyle(index <= viewModel.currentStepIndex ? Color.noteablyForeground : Color.noteablySecondaryText)
                            
                            Spacer()
                        }
                        .padding(12)
                        .background(
                             RoundedRectangle(cornerRadius: AppRadius.xl)
                                .fill(index == viewModel.currentStepIndex ? Color.noteablyPrimary.opacity(0.06) : Color.clear)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.xl)
                                .stroke(index == viewModel.currentStepIndex ? Color.noteablyPrimary.opacity(0.15) : Color.clear, lineWidth: 1)
                        )
                    }
                }
                .padding(.horizontal, 4)

                if let error = viewModel.errorMessage {
                    VStack(spacing: 12) {
                        Text(error)
                            .font(.noteablyBody(14))
                            .foregroundStyle(Color.noteablyDestructive)
                            .multilineTextAlignment(.center)

                        Button {
                            viewModel.reset()
                        } label: {
                            Text("Try Again")
                        }
                        .buttonStyle(NoteablySecondaryButtonStyle())
                    }
                    .padding(.top, 10)
                } else {
                    Button {
                        viewModel.reset()
                    } label: {
                        Text("Cancel Processing")
                    }
                    .buttonStyle(NoteablySecondaryButtonStyle())
                    .padding(.top, 10)
                }
            }
        }
    }

    private func formatDuration(_ totalSeconds: Int) -> String {
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
}

// MARK: - Document Picker

struct DocumentPicker: UIViewControllerRepresentable {
    let viewModel: UploadViewModel

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: UploadViewModel.supportedTypes)
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(viewModel: viewModel) }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let viewModel: UploadViewModel

        init(viewModel: UploadViewModel) {
            self.viewModel = viewModel
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }

            guard url.startAccessingSecurityScopedResource() else { return }
            defer { url.stopAccessingSecurityScopedResource() }

            guard let data = try? Data(contentsOf: url) else { return }

            let name = url.lastPathComponent
            let utType = UTType(filenameExtension: url.pathExtension) ?? .data
            let mime = UploadViewModel.mimeType(for: utType)

            viewModel.selectFile(data: data, name: name, mimeType: mime)
        }
    }
}

#if DEBUG
#Preview {
    UploadView()
        .environment(AppState())
}
#endif
