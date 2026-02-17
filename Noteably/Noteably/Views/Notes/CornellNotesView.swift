import SwiftUI

struct CornellNotesView: View {
    let data: CornellData

    @State private var containerWidth: CGFloat = 0

    private var cueColumnWidth: CGFloat { containerWidth * 0.3 }

    var body: some View {
        Group {
            if containerWidth > 500 {
                landscapeLayout
            } else {
                portraitLayout
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            GeometryReader { geo in
                Color.clear
                    .onAppear { containerWidth = geo.size.width }
                    .onChange(of: geo.size.width) { _, w in containerWidth = w }
            }
        )
    }



    // MARK: - Landscape layout (30/70 split)

    private var landscapeLayout: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Column headers
            HStack(alignment: .top, spacing: 16) {
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

                HStack(alignment: .top, spacing: 16) {
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

        }
    }
}

#if DEBUG
#Preview {
    ScrollView {
        CornellNotesView(
            data: CornellData(
                cues: [
                    "What is photosynthesis?",
                    "What are the products?",
                    "Where does it occur?"
                ],
                notes: [
                    "The process by which plants convert sunlight, water, and CO₂ into glucose and oxygen.",
                    "Glucose (C₆H₁₂O₆) and oxygen (O₂) are the two main outputs.",
                    "Primarily in the chloroplasts, specifically in the thylakoid membranes."
                ]
            )
        )
        .padding(20)
    }
    .background(Color.noteablyBackground)
}
#endif
