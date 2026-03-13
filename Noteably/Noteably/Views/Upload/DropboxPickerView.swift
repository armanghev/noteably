import SwiftUI
import WebKit

struct DropboxPickerView: View {
    @Environment(\.dismiss) private var dismiss
    let viewModel: UploadViewModel
    
    // You should get this from your config or backend
    private let dropboxAppKey = "8tkfj5zv3l9d775" 
    
    var body: some View {
        NavigationStack {
            DropboxWebView(appKey: dropboxAppKey) { link, name in
                viewModel.selectCloudFile(id: nil, link: link, name: name, provider: .dropbox)
                dismiss()
            }
            .navigationTitle("Dropbox")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

struct DropboxWebView: UIViewRepresentable {
    let appKey: String
    let onFileSelected: (String, String) -> Void
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()
        userContentController.add(context.coordinator, name: "dropboxHandler")
        config.userContentController = userContentController
        
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        config.defaultWebpagePreferences = preferences
        
        // Essential for Dropbox Chooser to work in WKWebView
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = context.coordinator
        context.coordinator.parentWebView = webView
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        let html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script type="text/javascript" src="https://www.dropbox.com/static/api/2/dropins.js" id="dropboxjs" data-app-key="\(appKey)"></script>
            <style>
                body { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9f9f9; font-family: -apple-system, sans-serif; }
                #dropbox-button { padding: 14px 28px; background: #0061ff; color: white; border: none; border-radius: 8px; font-size: 17px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,97,255,0.3); }
                #status { margin-top: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <button id="dropbox-button" onclick="choose()">Choose from Dropbox</button>
            <div id="status">Ready</div>
            <script>
                function choose() {
                    document.getElementById('status').innerText = 'Opening...';
                    Dropbox.choose({
                        success: function(files) {
                            if (files.length > 0) {
                                window.webkit.messageHandlers.dropboxHandler.postMessage({
                                    link: files[0].link,
                                    name: files[0].name
                                });
                            }
                        },
                        cancel: function() { 
                            document.getElementById('status').innerText = 'Cancelled';
                            window.webkit.messageHandlers.dropboxHandler.postMessage({ action: 'cancel' });
                        },
                        linkType: 'direct',
                        multiselect: false,
                        extensions: ['.pdf', '.mp3', '.wav', '.txt', '.md', '.mp4', '.mov', '.doc', '.docx']
                    });
                }
                setTimeout(choose, 1000);
            </script>
        </body>
        </html>
        """
        uiView.loadHTMLString(html, baseURL: URL(string: "https://noteably.app"))
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onFileSelected: onFileSelected)
    }
    
    class Coordinator: NSObject, WKScriptMessageHandler, WKUIDelegate {
        let onFileSelected: (String, String) -> Void
        weak var parentWebView: WKWebView?
        private var popupWebView: WKWebView?
        
        init(onFileSelected: @escaping (String, String) -> Void) {
            self.onFileSelected = onFileSelected
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let dict = message.body as? [String: Any] else { return }
            
            if let action = dict["action"] as? String, action == "cancel" {
                return
            }
            
            guard let link = dict["link"] as? String,
                  let name = dict["name"] as? String else { return }
            
            onFileSelected(link, name)
            popupWebView?.removeFromSuperview()
            popupWebView = nil
        }
        
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            let popup = WKWebView(frame: webView.frame, configuration: configuration)
            popup.uiDelegate = self
            
            // Add to parent view so it's visible
            webView.addSubview(popup)
            self.popupWebView = popup
            return popup
        }
        
        func webViewDidClose(_ webView: WKWebView) {
            webView.removeFromSuperview()
            if webView == popupWebView {
                popupWebView = nil
            }
        }
    }
}
