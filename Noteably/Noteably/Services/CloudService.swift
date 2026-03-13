import Foundation

struct GoogleDriveFile: Codable, Identifiable {
    let id: String
    let name: String
    let mimeType: String
    let iconLink: String?
    let thumbnailLink: String?
    let modifiedTime: String?
    let size: String?
}

struct GoogleDriveListResponse: Codable {
    let files: [GoogleDriveFile]
    let nextPageToken: String?
}

final class CloudService {
    static let shared = CloudService()
    private let apiClient = APIClient.shared
    
    private init() {}
    
    // MARK: - Connections
    
    func getConnections() async throws -> [CloudConnection] {
        try await apiClient.get(path: "/api/cloud/connections/")
    }
    
    func getConnectURL(provider: CloudProvider, next: String = "") async throws -> URL {
        let queryItems = [
            URLQueryItem(name: "next", value: next)
        ]
        let response: [String: String] = try await apiClient.get(path: "/api/cloud/connect-url/\(provider.rawValue)/", queryItems: queryItems)
        guard let urlString = response["url"], let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        return url
    }
    
    func disconnect(provider: CloudProvider) async throws {
        try await apiClient.postVoid(path: "/api/cloud/connections/\(provider.rawValue)/")
    }
    
    // MARK: - Picker & Import
    
    func getPickerToken(provider: CloudProvider) async throws -> String {
        let response: [String: String] = try await apiClient.get(path: "/api/cloud/picker-token/\(provider.rawValue)/")
        guard let token = response["access_token"] else {
            throw APIError.serverError(statusCode: 500, message: "No token returned")
        }
        return token
    }
    
    func importFromCloud(params: CloudImportParams) async throws -> ProcessUploadResponse {
        try await apiClient.post(path: "/api/cloud/import/", body: params)
    }
    
    // MARK: - Native Google Drive
    
    func fetchGoogleDriveFiles(token: String) async throws -> [GoogleDriveFile] {
        guard let url = URL(string: "https://www.googleapis.com/drive/v3/files?q=trashed=false&fields=files(id,name,mimeType,iconLink,thumbnailLink,modifiedTime,size)&pageSize=100") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 500, message: "Google Drive API Error")
        }
        
        let decoder = JSONDecoder()
        let listResponse = try decoder.decode(GoogleDriveListResponse.self, from: data)
        return listResponse.files
    }
}
