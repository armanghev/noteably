import SwiftUI

/// A lightweight markdown renderer that handles headings, bullet lists, bold/italic,
/// and code spans using the app's native Noteably typography.
struct MarkdownView: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(parseBlocks().enumerated()), id: \.offset) { _, block in
                blockView(block)
            }
        }
    }

    // MARK: - Block Types

    private enum Block {
        case heading(level: Int, text: String)
        case bullet(text: String, indent: Int)
        case paragraph(text: String)
        case divider
    }

    // MARK: - Parsing

    private func parseBlocks() -> [Block] {
        var blocks: [Block] = []
        let lines = text.components(separatedBy: "\n")
        var paragraphLines: [String] = []

        func flushParagraph() {
            let joined = paragraphLines.joined(separator: " ").trimmingCharacters(in: .whitespaces)
            if !joined.isEmpty {
                blocks.append(.paragraph(text: joined))
            }
            paragraphLines.removeAll()
        }

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            // Empty line — flush paragraph
            if trimmed.isEmpty {
                flushParagraph()
                continue
            }

            // Horizontal rule
            if trimmed.allSatisfy({ $0 == "-" || $0 == "*" || $0 == "_" }) && trimmed.count >= 3 {
                flushParagraph()
                blocks.append(.divider)
                continue
            }

            // Heading
            if let heading = parseHeading(trimmed) {
                flushParagraph()
                blocks.append(heading)
                continue
            }

            // Bullet point
            if let bullet = parseBullet(line) {
                flushParagraph()
                blocks.append(bullet)
                continue
            }

            // Regular text — accumulate into paragraph
            paragraphLines.append(trimmed)
        }

        flushParagraph()
        return blocks
    }

    private func parseHeading(_ line: String) -> Block? {
        var level = 0
        for char in line {
            if char == "#" { level += 1 }
            else { break }
        }
        guard level >= 1 && level <= 4 else { return nil }
        let text = String(line.dropFirst(level)).trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return nil }
        return .heading(level: level, text: text)
    }

    private func parseBullet(_ line: String) -> Block? {
        let stripped = line.replacingOccurrences(of: "\t", with: "    ")
        let indent = stripped.prefix(while: { $0 == " " }).count / 2
        let content = stripped.trimmingCharacters(in: .whitespaces)

        // - item or * item (but not **bold**)
        if content.hasPrefix("- ") {
            return .bullet(text: String(content.dropFirst(2)), indent: indent)
        }
        if content.hasPrefix("* ") && !content.hasPrefix("**") {
            return .bullet(text: String(content.dropFirst(2)), indent: indent)
        }
        // Numbered list: 1. item, 2. item
        if let dotIndex = content.firstIndex(of: "."),
           content[content.startIndex..<dotIndex].allSatisfy(\.isNumber),
           content.index(after: dotIndex) < content.endIndex,
           content[content.index(after: dotIndex)] == " " {
            let text = String(content[content.index(dotIndex, offsetBy: 2)...])
            return .bullet(text: text, indent: indent)
        }

        return nil
    }

    // MARK: - Rendering

    @ViewBuilder
    private func blockView(_ block: Block) -> some View {
        switch block {
        case .heading(let level, let text):
            headingView(level: level, text: text)
        case .bullet(let text, let indent):
            bulletView(text: text, indent: indent)
        case .paragraph(let text):
            paragraphView(text: text)
        case .divider:
            Divider()
                .padding(.vertical, 8)
        }
    }

    private func headingView(level: Int, text: String) -> some View {
        let (size, weight): (CGFloat, Font.Weight) = switch level {
        case 1: (24, .bold)
        case 2: (20, .bold)
        case 3: (17, .semibold)
        default: (16, .semibold)
        }

        return inlineMarkdown(text)
            .font(.noteablySerif(size, weight: weight))
            .foregroundStyle(Color.noteablyForeground)
            .padding(.top, level == 1 ? 16 : 12)
            .padding(.bottom, 4)
    }

    private func bulletView(text: String, indent: Int) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .font(.noteablyBody(15, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)

            inlineMarkdown(text)
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablyForeground)
                .lineSpacing(3)
        }
        .padding(.leading, CGFloat(indent) * 16)
        .padding(.vertical, 2)
    }

    private func paragraphView(text: String) -> some View {
        inlineMarkdown(text)
            .font(.noteablyBody(15))
            .foregroundStyle(Color.noteablyForeground)
            .lineSpacing(4)
            .padding(.vertical, 4)
    }

    /// Renders inline markdown (bold, italic, code) via AttributedString.
    private func inlineMarkdown(_ string: String) -> Text {
        if let attributed = try? AttributedString(markdown: string, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            return Text(attributed)
        }
        return Text(string)
    }
}

#if DEBUG
#Preview {
    ScrollView {
        MarkdownView(text: """
        # Study Guide: Introduction to Biology

        ## Cell Structure

        Cells are the basic unit of life. Every living organism is composed of cells.

        ### Key Organelles

        - **Nucleus** — Contains genetic material (DNA)
        - **Mitochondria** — Powerhouse of the cell, produces ATP
        - **Endoplasmic Reticulum** — Protein synthesis and transport
          - *Rough ER* has ribosomes
          - *Smooth ER* lacks ribosomes

        ## Key Takeaways

        1. All living things are made of cells
        2. Cells contain specialized organelles
        3. The nucleus controls cell activity

        ---

        Understanding cell biology is fundamental to all life sciences.
        """)
        .padding(20)
    }
    .background(Color.noteablyBackground)
}
#endif
