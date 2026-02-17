import SwiftUI

struct CornellNotesView: View {
    let data: CornellData
    var summaryText: String?

    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            if sizeClass == .regular {
                HStack(spacing: 0) {
                    Text("Cues / Questions")
                        .font(.noteablyBody(13, weight: .semibold))
                        .foregroundStyle(Color.noteablySecondaryText)
                        .frame(width: UIScreen.main.bounds.width * 0.3, alignment: .leading)
                    Text("Notes")
                        .font(.noteablyBody(13, weight: .semibold))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                .padding(.bottom, 4)

                Divider()
            }

            // Cue/Note pairs
            ForEach(Array(data.cues.enumerated()), id: \.offset) { index, cue in
                let note = index < data.notes.count ? data.notes[index] : ""

                if sizeClass == .regular {
                    // Landscape: side-by-side
                    HStack(alignment: .top, spacing: 0) {
                        Text(cue)
                            .font(.noteablyBody(14, weight: .semibold))
                            .foregroundStyle(Color.noteablyPrimary)
                            .frame(width: UIScreen.main.bounds.width * 0.3, alignment: .leading)

                        Text(note)
                            .font(.noteablyBody(15))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineSpacing(3)
                    }
                    .padding(.vertical, 8)

                    if index < data.cues.count - 1 {
                        Divider()
                    }
                } else {
                    // Portrait: stacked
                    VStack(alignment: .leading, spacing: 8) {
                        Text(cue)
                            .font(.noteablyBody(14, weight: .semibold))
                            .foregroundStyle(Color.noteablyPrimary)

                        Text(note)
                            .font(.noteablyBody(15))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineSpacing(3)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
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

            // Summary section
            if let summary = summaryText, !summary.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Summary")
                        .font(.noteablyBody(16, weight: .semibold))
                        .foregroundStyle(Color.noteablyForeground)

                    Text(summary)
                        .font(.noteablyBody(15))
                        .foregroundStyle(Color.noteablySecondaryText)
                        .lineSpacing(3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                        .fill(Color.noteablyPrimary.opacity(0.05))
                )
            }
        }
    }
}
