import SwiftUI

struct GoogleDrivePickerView: View {
    @Environment(\.dismiss) private var dismiss
    let viewModel: UploadViewModel
    
    @State private var files: [GoogleDriveFile] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationStack {
            List {
                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView("Loading files...")
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                } else if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(Color.noteablyDestructive)
                        .listRowBackground(Color.clear)
                } else if files.isEmpty {
                    Text("No files found in your Google Drive.")
                        .foregroundStyle(Color.noteablySecondaryText)
                        .listRowBackground(Color.clear)
                } else {
                    ForEach(files) { file in
                        Button {
                            viewModel.selectCloudFile(id: file.id, link: nil, name: file.name, provider: .googleDrive)
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                if let icon = file.iconLink, let url = URL(string: icon) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().scaledToFit()
                                    } placeholder: {
                                        Image(systemName: "doc")
                                    }
                                    .frame(width: 24, height: 24)
                                } else {
                                    Image(systemName: "doc")
                                        .frame(width: 24, height: 24)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(file.name)
                                        .font(.noteablyBody(15, weight: .medium))
                                        .foregroundStyle(Color.noteablyForeground)
                                    
                                    if let modified = file.modifiedTime {
                                        Text("Modified \(formatDate(modified))")
                                            .font(.noteablyBody(12))
                                            .foregroundStyle(Color.noteablySecondaryText)
                                    }
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Google Drive")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task {
                await fetchFiles()
            }
        }
    }
    
    private func fetchFiles() async {
        isLoading = true
        do {
            let token = try await CloudService.shared.getPickerToken(provider: .googleDrive)
            files = try await CloudService.shared.fetchGoogleDriveFiles(token: token)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return isoString }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .none
        return displayFormatter.string(from: date)
    }
}
