import SwiftUI

struct QANotesView: View {
    let items: [QAData]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(items) { item in
                QARowView(item: item)
            }
        }
    }
}

// MARK: - Private sub-view

private struct QARowView: View {
    let item: QAData

    @State private var isExpanded: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Question row (tappable)
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(alignment: .center, spacing: 10) {
                    Text(item.question)
                        .font(.noteablyBody(15, weight: .medium))
                        .foregroundStyle(Color.noteablyForeground)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
                .padding(14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // Answer (shown when expanded)
            if isExpanded {
                Divider()
                    .padding(.horizontal, 14)

                Text(item.answer)
                    .font(.noteablyBody(14))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .multilineTextAlignment(.leading)
                    .lineSpacing(3)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(Color.noteablyCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.xl, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }
}

#if DEBUG
#Preview {
    ScrollView {
        QANotesView(items: [
            QAData(
                question: "What is photosynthesis?",
                answer: "Photosynthesis is the process by which green plants and other organisms convert sunlight, water, and carbon dioxide into glucose and oxygen."
            ),
            QAData(
                question: "What are the two stages of photosynthesis?",
                answer: "The two stages are the light-dependent reactions (which occur in the thylakoid membranes and capture energy from sunlight) and the Calvin cycle (which occurs in the stroma and uses that energy to produce glucose)."
            ),
            QAData(
                question: "Where in the cell does photosynthesis occur?",
                answer: "Photosynthesis occurs in the chloroplasts, specifically in the thylakoid membranes for the light reactions and in the stroma for the Calvin cycle."
            ),
            QAData(
                question: "What is the overall chemical equation for photosynthesis?",
                answer: "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂"
            )
        ])
        .padding(20)
    }
    .background(Color.noteablyBackground)
}
#endif
