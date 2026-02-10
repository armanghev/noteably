import SwiftUI

struct JobCard: View {
    let job: JobListItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header: filename + status
            HStack {
                fileTypeIcon
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(Color.noteablyPrimary)
                    .frame(width: 40, height: 40)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.noteablyPrimary.opacity(0.10))
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(job.filename)
                        .font(.noteablyBody(15, weight: .semibold))
                        .foregroundStyle(Color.noteablyForeground)
                        .lineLimit(1)

                    Text(formattedDate)
                        .font(.noteablyBody(12))
                        .foregroundStyle(Color.noteablySecondaryText)
                }

                Spacer()

                StatusBadge(status: job.status)
            }

            // Title preview
            if let title = job.summaryTitle {
                Text(title)
                    .font(.noteablyBody(14, weight: .medium))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineLimit(1)
            }

            // Preview text
            if let preview = job.summaryPreview {
                Text(preview)
                    .font(.noteablyBody(13))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .lineLimit(2)
                    .lineSpacing(2)
            }

            // Content type chips + counts
            if let types = job.contentTypes, !types.isEmpty {
                HStack(spacing: 8) {
                    ForEach(types, id: \.self) { type in
                        MaterialTypeChip(type: type)
                    }

                    Spacer()

                    if let count = job.flashcardCount, count > 0 {
                        Label("\(count)", systemImage: "rectangle.on.rectangle")
                            .font(.noteablyBody(12))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }

                    if let count = job.quizCount, count > 0 {
                        Label("\(count)Q", systemImage: "questionmark.circle")
                            .font(.noteablyBody(12))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.noteablyCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }

    private var fileTypeIcon: some View {
        let icon: String = {
            let type = job.fileType.lowercased()
            if type.contains("pdf") { return "doc.text" }
            if type.contains("audio") || type.contains("mp3") || type.contains("wav") { return "waveform" }
            if type.contains("video") || type.contains("mp4") || type.contains("mov") { return "play.rectangle" }
            if type.contains("text") { return "doc.plaintext" }
            return "doc"
        }()
        return Image(systemName: icon)
    }

    private var formattedDate: String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = isoFormatter.date(from: job.createdAt)
                ?? ISO8601DateFormatter().date(from: job.createdAt) else {
            return job.createdAt
        }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: JobStatus

    var body: some View {
        HStack(spacing: 4) {
            if status.isProcessing {
                ProgressView()
                    .scaleEffect(0.6)
                    .frame(width: 12, height: 12)
            }
            Text(status.displayName)
                .font(.noteablyBody(11, weight: .medium))
        }
        .foregroundStyle(foregroundColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(backgroundColor)
        )
    }

    private var foregroundColor: Color {
        switch status {
        case .completed: return Color.noteablyPrimary
        case .failed: return Color.noteablyDestructive
        case .cancelled: return Color.noteablySecondaryText
        default: return Color.noteablyAccent
        }
    }

    private var backgroundColor: Color {
        switch status {
        case .completed: return Color.noteablyPrimary.opacity(0.12)
        case .failed: return Color.noteablyDestructive.opacity(0.10)
        case .cancelled: return Color.noteablySecondaryText.opacity(0.10)
        default: return Color.noteablyAccent.opacity(0.12)
        }
    }
}

// MARK: - Material Type Chip

struct MaterialTypeChip: View {
    let type: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .font(.system(size: 10))
        }
        .foregroundStyle(Color.noteablyPrimary)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(Color.noteablyPrimary.opacity(0.08))
        )
    }

    private var iconName: String {
        switch type.lowercased() {
        case "summary": return "text.alignleft"
        case "notes": return "doc.text"
        case "flashcards": return "rectangle.on.rectangle"
        case "quiz": return "questionmark.circle"
        default: return "doc"
        }
    }

    private var displayName: String {
        type.capitalized
    }
}

#if DEBUG
#Preview {
    VStack {
        JobCard(job: MockData.jobListItemCompleted)
        JobCard(job: MockData.jobListItemProcessing)
        JobCard(job: MockData.jobListItemFailed)
    }
    .padding()
    .background(Color.noteablyBackground)
}
#endif
