import SwiftUI

struct CornellNotesView: View {
    let data: CornellData
    var summaryText: String?

    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        if sizeClass == .regular {
            landscapeLayout
        } else {
            portraitLayout
        }
    }

    // MARK: - Landscape layout (GeometryReader-based 30/70 split)

    private var landscapeLayout: some View {
        // GeometryReader has an intrinsic height of 0, so we read the width
        // and pass it into a self-sizing VStack via a preference or fixedSize trick.
        // The cleanest approach that keeps natural height: use a hidden GeometryReader
        // overlay to read the width, then render the real content with that value.
        GeometryReader { geometry in
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack(spacing: 0) {
                    Text("Cues / Questions")
                        .font(.noteablyBody(13, weight: .semibold))
                        .foregroundStyle(Color.noteablySecondaryText)
                        .frame(width: geometry.size.width * 0.3, alignment: .leading)
                    Text("Notes")
                        .font(.noteablyBody(13, weight: .semibold))
                        .foregroundStyle(Color.noteablySecondaryText)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.bottom, 4)

                Divider()

                ForEach(Array(data.cues.enumerated()), id: \.offset) { index, cue in
                    let note = index < data.notes.count ? data.notes[index] : ""

                    HStack(alignment: .top, spacing: 0) {
                        Text(cue)
                            .font(.noteablyBody(14, weight: .semibold))
                            .foregroundStyle(Color.noteablyPrimary)
                            .frame(width: geometry.size.width * 0.3, alignment: .leading)

                        Text(note)
                            .font(.noteablyBody(15))
                            .foregroundStyle(Color.noteablyForeground)
                            .lineSpacing(3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 8)

                    if index < data.cues.count - 1 {
                        Divider()
                    }
                }

                // Summary
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

    // MARK: - Portrait layout (stacked cards)

    private var portraitLayout: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(Array(data.cues.enumerated()), id: \.offset) { index, cue in
                let note = index < data.notes.count ? data.notes[index] : ""

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
