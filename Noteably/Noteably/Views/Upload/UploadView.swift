import SwiftUI
import UniformTypeIdentifiers

struct UploadView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = UploadViewModel()
    @State private var showDocumentPicker = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    if viewModel.isUploading || viewModel.isComplete {
                        progressSection
                    } else {
                        fileSelectionSection
                        if viewModel.hasFile {
                            materialTypeSection
                            uploadButton
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
            .background(Color.noteablyBackground)
            .navigationTitle("Upload")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showDocumentPicker) {
                DocumentPicker(viewModel: viewModel)
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
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(
                            Color.noteablyPrimary.opacity(0.3),
                            style: StrokeStyle(lineWidth: 2, dash: [8])
                        )
                        .background(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
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

    // MARK: - Material Types

    private var materialTypeSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Generate")
                .font(.noteablyBody(16, weight: .semibold))
                .foregroundStyle(Color.noteablyForeground)

            let columns = [
                GridItem(.flexible()),
                GridItem(.flexible())
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
        VStack(spacing: 28) {
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
                // Processing
                VStack(spacing: 20) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Color.noteablyPrimary)
                        .padding(.top, 40)

                    Text("Processing...")
                        .font(.noteablySerif(22, weight: .bold))
                        .foregroundStyle(Color.noteablyForeground)

                    if let step = viewModel.currentStep {
                        Text(step)
                            .font(.noteablyBody(15))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.noteablyBorder)
                                .frame(height: 6)

                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.noteablyPrimary)
                                .frame(width: geo.size.width * CGFloat(viewModel.progress) / 100, height: 6)
                                .animation(.easeInOut, value: viewModel.progress)
                        }
                    }
                    .frame(height: 6)
                    .padding(.horizontal, 40)
                }

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
                }
            }
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
