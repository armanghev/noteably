import Foundation

// MARK: - WebSocket Message

struct WebSocketJobUpdate: Codable {
    let jobId: String
    let status: String
    let progress: Int?
    let currentStep: String?
    let errorMessage: String?

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case status, progress
        case currentStep = "current_step"
        case errorMessage = "error_message"
    }
}

struct WebSocketMessage: Codable {
    let type: String
    let data: WebSocketJobUpdate
}

// MARK: - WebSocket Service

@Observable
final class WebSocketService {
    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession
    private var baseURL: String
    private var isConnected = false
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 10
    private let reconnectDelay: TimeInterval = 3.0

    var onJobUpdate: ((WebSocketJobUpdate) -> Void)?

    init(baseURL: String = "") {
        // Normalize baseURL to remove trailing slashes and normalize http/ws
        var base = baseURL
        if base.hasSuffix("/") { base.removeLast() }
        self.baseURL = base
        self.session = URLSession(configuration: .default)
    }

    func connect(token: String) {
        disconnect()

        let wsScheme = baseURL.hasPrefix("https") ? "wss" : "ws"
        let host = baseURL
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")

        guard let url = URL(string: "\(wsScheme)://\(host)/ws/user/?token=\(token)") else {
            return
        }

        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        isConnected = true
        reconnectAttempts = 0
        receiveMessage()
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue listening
                self.receiveMessage()

            case .failure:
                self.isConnected = false
                self.attemptReconnect()
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            // First try to decode the wrapped message
            if let wrappedMessage = try? JSONDecoder().decode(WebSocketMessage.self, from: data) {
                DispatchQueue.main.async { [weak self] in
                    self?.onJobUpdate?(wrappedMessage.data)
                }
            } else {
                // Fallback to decoding the flat structure if backend ever changes
                let update = try JSONDecoder().decode(WebSocketJobUpdate.self, from: data)
                DispatchQueue.main.async { [weak self] in
                    self?.onJobUpdate?(update)
                }
            }
        } catch {
        }
    }

    private func attemptReconnect() {
        guard reconnectAttempts < maxReconnectAttempts else { return }
        reconnectAttempts += 1

        DispatchQueue.main.asyncAfter(deadline: .now() + reconnectDelay) { [weak self] in
            // Reconnection requires a fresh token — caller should re-invoke connect()
            _ = self
        }
    }
}
