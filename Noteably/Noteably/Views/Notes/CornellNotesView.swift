import SwiftUI

struct CornellNotesView: View {
    let data: CornellData
    var summaryText: String?

    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var cueColumnWidth: CGFloat = 100

    var body: some View {
        if sizeClass == .regular {
            landscapeLayout
        } else {
            portraitLayout
        }
    }

    // MARK: - Landscape layout (30/70 split)

    private var landscapeLayout: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Column headers
            HStack(spacing: 0) {
                Text("Cues / Questions")
                    .font(.noteablyBody(13, weight: .semibold))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .frame(width: cueColumnWidth, alignment: .leading)
                Text("Notes")
                    .font(.noteablyBody(13, weight: .semibold))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.bottom, 4)

            Divider()

            // Cue/Note pairs
            ForEach(Array(data.cues.enumerated()), id: \.offset) { index, cue in
                let note = index < data.notes.count ? data.notes[index] : ""

                HStack(alignment: .top, spacing: 0) {
                    Text(cue)
                        .font(.noteablyBody(14, weight: .semibold))
                        .foregroundStyle(Color.noteablyPrimary)
                        .frame(width: cueColumnWidth, alignment: .leading)

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
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            GeometryReader { geo in
                Color.clear
                    .onAppear { cueColumnWidth = geo.size.width * 0.3 }
                    .onChange(of: geo.size.width) { _, newWidth in
                        cueColumnWidth = newWidth * 0.3
                    }
            }
        )
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
