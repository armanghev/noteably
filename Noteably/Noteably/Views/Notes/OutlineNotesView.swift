import SwiftUI

struct OutlineNotesView: View {
    let data: OutlineData

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(data.title)
                .font(.noteablySerif(22, weight: .bold))
                .foregroundStyle(Color.noteablyForeground)
                .padding(.bottom, 4)

            ForEach(data.children) { node in
                OutlineNodeView(node: node, depth: 0)
            }
        }
    }
}

private struct OutlineNodeView: View {
    let node: OutlineNode
    let depth: Int

    /// Splits "I. Some text" into marker "I." and content "Some text"
    private var marker: String {
        guard let spaceIndex = node.bullet.firstIndex(of: " ") else { return "•" }
        return String(node.bullet[node.bullet.startIndex..<spaceIndex])
    }

    private var content: String {
        guard let spaceIndex = node.bullet.firstIndex(of: " ") else { return node.bullet }
        return String(node.bullet[node.bullet.index(after: spaceIndex)...])
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // This node
            HStack(alignment: .top, spacing: 8) {
                Text(marker)
                    .font(.noteablyBody(15, weight: .semibold))
                    .foregroundStyle(Color.noteablyPrimary)

                Text(content)
                    .font(.noteablyBody(15))
                    .foregroundStyle(Color.noteablyForeground)
                    .lineSpacing(3)
            }
            .padding(.vertical, 2)

            // Children
            if !node.children.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(node.children) { child in
                        OutlineNodeView(node: child, depth: depth + 1)
                    }
                }
                .padding(.leading, 20)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Color.noteablyBorder.opacity(0.3))
                        .frame(width: 2)
                }
            }
        }
    }
}
