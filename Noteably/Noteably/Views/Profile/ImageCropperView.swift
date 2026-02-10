import SwiftUI
import UIKit

struct ImageCropperView: View {
    let image: UIImage
    let onCrop: (UIImage) -> Void
    let onCancel: () -> Void

    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    private let outputSize: CGFloat = 400

    var body: some View {
        GeometryReader { geometry in
            let cropSize = min(geometry.size.width, geometry.size.height) - 48

            ZStack {
                Color.black
                    .ignoresSafeArea()

                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .scaleEffect(scale)
                    .offset(offset)
                    .gesture(
                        MagnificationGesture()
                            .onChanged { value in
                                let delta = value / lastScale
                                lastScale = value
                                let minScale = minimumScale(in: geometry.size, cropSize: cropSize)
                                scale = min(max(scale * delta, minScale), 5.0)
                                offset = constrainOffset(offset, in: geometry.size, cropSize: cropSize)
                            }
                            .onEnded { _ in
                                lastScale = 1.0
                                lastOffset = offset
                            }
                    )
                    .simultaneousGesture(
                        DragGesture()
                            .onChanged { value in
                                let proposed = CGSize(
                                    width: lastOffset.width + value.translation.width,
                                    height: lastOffset.height + value.translation.height
                                )
                                offset = constrainOffset(proposed, in: geometry.size, cropSize: cropSize)
                            }
                            .onEnded { _ in
                                lastOffset = offset
                            }
                    )

                CircleMaskOverlay(cropSize: cropSize)

                // Header
                VStack {
                    HStack {
                        Button("Cancel") {
                            onCancel()
                        }
                        .font(.noteablyBody(16))
                        .foregroundStyle(.white)

                        Spacer()

                        Text("Move and Scale")
                            .font(.noteablyBody(17, weight: .semibold))
                            .foregroundStyle(.white)

                        Spacer()

                        Button("Done") {
                            cropImage(in: geometry, cropSize: cropSize)
                        }
                        .font(.noteablyBody(16, weight: .semibold))
                        .foregroundStyle(Color.noteablyPrimary)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 12)
                    .background(Color.black.opacity(0.3))

                    Spacer()
                }
            }
            .onAppear {
                let minScale = minimumScale(in: geometry.size, cropSize: cropSize)
                scale = max(1.0, minScale)
            }
        }
    }

    // MARK: - Image Geometry

    /// Size of the image when rendered with .scaledToFit() in the given view
    private func fittedImageSize(in viewSize: CGSize) -> CGSize {
        let imageAspect = image.size.width / image.size.height
        let viewAspect = viewSize.width / viewSize.height

        if imageAspect > viewAspect {
            // Image is wider than view → constrain by width
            return CGSize(width: viewSize.width, height: viewSize.width / imageAspect)
        } else {
            // Image is taller than view → constrain by height
            return CGSize(width: viewSize.height * imageAspect, height: viewSize.height)
        }
    }

    /// Minimum scale so the image always covers the crop circle
    private func minimumScale(in viewSize: CGSize, cropSize: CGFloat) -> CGFloat {
        let fitted = fittedImageSize(in: viewSize)
        return max(cropSize / fitted.width, cropSize / fitted.height)
    }

    /// Keep the crop circle within the image bounds
    private func constrainOffset(_ proposed: CGSize, in viewSize: CGSize, cropSize: CGFloat) -> CGSize {
        let fitted = fittedImageSize(in: viewSize)
        let scaledW = fitted.width * scale
        let scaledH = fitted.height * scale

        let maxX = max(0, (scaledW - cropSize) / 2)
        let maxY = max(0, (scaledH - cropSize) / 2)

        return CGSize(
            width: min(max(proposed.width, -maxX), maxX),
            height: min(max(proposed.height, -maxY), maxY)
        )
    }

    // MARK: - Cropping

    private func cropImage(in geometry: GeometryProxy, cropSize: CGFloat) {
        let viewSize = geometry.size
        let fitted = fittedImageSize(in: viewSize)

        // Scaled image size in view points
        let scaledSize = CGSize(
            width: fitted.width * scale,
            height: fitted.height * scale
        )

        // Image top-left corner in view coordinates
        let imageOriginX = (viewSize.width - scaledSize.width) / 2 + offset.width
        let imageOriginY = (viewSize.height - scaledSize.height) / 2 + offset.height

        // Crop circle top-left in view coordinates (centered in view)
        let cropX = (viewSize.width - cropSize) / 2
        let cropY = (viewSize.height - cropSize) / 2

        // Convert from view points to source image pixels
        let pointsToPixels = image.size.width / scaledSize.width

        let sourceRect = CGRect(
            x: (cropX - imageOriginX) * pointsToPixels,
            y: (cropY - imageOriginY) * pointsToPixels,
            width: cropSize * pointsToPixels,
            height: cropSize * pointsToPixels
        )

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(
            size: CGSize(width: outputSize, height: outputSize),
            format: format
        )

        let croppedImage = renderer.image { _ in
            if let cgImage = image.cgImage?.cropping(to: sourceRect) {
                UIImage(cgImage: cgImage).draw(
                    in: CGRect(origin: .zero, size: CGSize(width: outputSize, height: outputSize))
                )
            }
        }

        onCrop(croppedImage)
    }
}

// MARK: - Circle Mask Overlay

struct CircleMaskOverlay: View {
    let cropSize: CGFloat

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Dimmed background
                Rectangle()
                    .fill(Color.black.opacity(0.6))
                    .mask(
                        Canvas { context, size in
                            // Fill entire area
                            context.fill(
                                Path(CGRect(origin: .zero, size: size)),
                                with: .color(.black)
                            )

                            // Cut out circle
                            let center = CGPoint(x: size.width / 2, y: size.height / 2)
                            let circlePath = Path(ellipseIn: CGRect(
                                x: center.x - cropSize / 2,
                                y: center.y - cropSize / 2,
                                width: cropSize,
                                height: cropSize
                            ))

                            context.blendMode = .destinationOut
                            context.fill(circlePath, with: .color(.black))
                        }
                    )

                // Circle border
                Circle()
                    .stroke(Color.white, lineWidth: 2)
                    .frame(width: cropSize, height: cropSize)
            }
        }
        .allowsHitTesting(false)
    }
}

#if DEBUG
#Preview {
    ImageCropperView(
        image: UIImage(systemName: "photo.fill")!.withTintColor(.blue, renderingMode: .alwaysOriginal),
        onCrop: { _ in },
        onCancel: {}
    )
}
#endif
