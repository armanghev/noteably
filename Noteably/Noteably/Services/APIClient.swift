import Foundation

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case notFound
    case serverError(statusCode: Int, message: String?)
    case networkUnavailable
    case decodingError(Error)
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .unauthorized:
            return "Session expired. Please sign in again."
        case .notFound:
            return "Resource not found."
        case .serverError(let code, let message):
            return message ?? "Server error (\(code))"
        case .networkUnavailable:
            return "No internet connection. Please check your network."
        case .decodingError:
            return "Failed to process server response."
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}

// MARK: - API Client

final class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    var baseURL: String = ""
    var tokenProvider: (() async -> String?)? = nil

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Core Request

    func request<T: Decodable>(
        method: String,
        path: String,
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let url = try buildURL(path: path, queryItems: queryItems)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Inject auth token
        if let tokenProvider, let token = await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Encode body
        if let body {
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await performRequest(request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown(URLError(.badServerResponse))
        }

        try validateResponse(httpResponse, data: data)

        // Handle 204 No Content with empty body
        var finalData = data
        if httpResponse.statusCode == 204 && finalData.isEmpty {
            finalData = "{}".data(using: .utf8)!
        }

        do {
            return try decoder.decode(T.self, from: finalData)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Multipart Upload

    func upload<T: Decodable>(
        path: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        fields: [String: String]
    ) async throws -> T {
        let url = try buildURL(path: path, queryItems: nil)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let tokenProvider, let token = await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()

        // Text fields
        for (key, value) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        // File field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await performRequest(request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown(URLError(.badServerResponse))
        }

        try validateResponse(httpResponse, data: data)

        // Handle 204 No Content with empty body
        var finalData = data
        if httpResponse.statusCode == 204 && finalData.isEmpty {
            finalData = "{}".data(using: .utf8)!
        }

        do {
            return try decoder.decode(T.self, from: finalData)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Raw Data Request (for file downloads)

    func downloadData(path: String) async throws -> Data {
        let url = try buildURL(path: path, queryItems: nil)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let tokenProvider, let token = await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await performRequest(request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown(URLError(.badServerResponse))
        }

        try validateResponse(httpResponse, data: data)
        return data
    }

    // MARK: - Helpers

    private func buildURL(path: String, queryItems: [URLQueryItem]?) throws -> URL {
        guard var components = URLComponents(string: baseURL + path) else {
            throw APIError.invalidURL
        }
        if let queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        return url
    }

    private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch let error as URLError where error.code == .notConnectedToInternet ||
                                             error.code == .networkConnectionLost {
            throw APIError.networkUnavailable
        } catch {
            throw APIError.unknown(error)
        }
    }

    private func validateResponse(_ response: HTTPURLResponse, data: Data) throws {
        switch response.statusCode {
        case 200...299:
            return
        case 401:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        default:
            let message = try? decoder.decode([String: String].self, from: data)["detail"]
            throw APIError.serverError(statusCode: response.statusCode, message: message)
        }
    }
}

// MARK: - Convenience Methods

extension APIClient {
    func get<T: Decodable>(path: String, queryItems: [URLQueryItem]? = nil) async throws -> T {
        try await request(method: "GET", path: path, queryItems: queryItems)
    }

    func post<T: Decodable>(path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request(method: "POST", path: path, body: body)
    }

    func delete<T: Decodable>(path: String) async throws -> T {
        try await request(method: "DELETE", path: path)
    }
}
