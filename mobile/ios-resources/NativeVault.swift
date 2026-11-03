import Capacitor
import UIKit
import Security
import WebKit
import Speech
import AVFoundation

// Session credentials never enter Preferences, localStorage, logs, or cloud backup.
@objc(NativeVaultPlugin)
public class NativeVaultPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeVaultPlugin"
    public let jsName = "NativeVault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]
    private func query(_ call: CAPPluginCall) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "jp.anzen-ai-portal.session",
         kSecAttrAccount as String: call.getString("purpose") == "login" ? "pending-login" : "member-session"]
    }
    @objc func get(_ call: CAPPluginCall) {
        var request = query(call)
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve(); return }
        guard status == errSecSuccess, let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            call.reject("Secure session storage unavailable"); return
        }
        call.resolve(["value": value])
    }
    @objc func set(_ call: CAPPluginCall) {
        guard let value = call.getString("value"),
              value.range(of: call.getString("purpose") == "login" ? "^[0-9a-f-]{36}:[A-Za-z0-9_-]{43}:[0-9]{13}$" : "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil,
              let data = value.data(using: .utf8) else {
            call.reject("Invalid session credential"); return
        }
        let attributes: [String: Any] = [kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let update = SecItemUpdate(query(call) as CFDictionary, attributes as CFDictionary)
        if update == errSecItemNotFound {
            let status = SecItemAdd(query(call).merging(attributes) { _, new in new } as CFDictionary, nil)
            guard status == errSecSuccess else { call.reject("Secure storage write failed"); return }
        } else if update != errSecSuccess { call.reject("Secure storage write failed"); return }
        call.resolve()
    }
    @objc func clear(_ call: CAPPluginCall) {
        let status = SecItemDelete(query(call) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            call.reject("Secure storage removal failed"); return
        }
        call.resolve()
    }
}

@objc(AnzenBridgeViewController)
public class AnzenBridgeViewController: CAPBridgeViewController {
    public override func router() -> Router { AnzenStaticRouter() }
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeVaultPlugin())
        bridge?.registerPluginInstance(NativeDocumentsPlugin())
        bridge?.registerPluginInstance(NativeSpeechPlugin())
    }
}

@objc(NativeSpeechPlugin)
public class NativeSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSpeechPlugin"
    public let jsName = "NativeSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abort", returnType: CAPPluginReturnPromise)
    ]
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var tapped = false
    private var finished = true
    private var generation = UUID()
    public override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(backgrounded), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }
    @objc private func backgrounded() { finish(cancel: true) }
    private func finish(cancel: Bool) {
        if cancel { generation = UUID() }
        guard !finished else { return }; finished = true
        engine.stop()
        if tapped { engine.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio()
        if cancel { task?.cancel() }
        task = nil; request = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        notifyListeners("end", data: [:])
    }
    @objc func start(_ call: CAPPluginCall) {
        guard finished else { call.reject("Speech input already active"); return }
        let ticket = UUID(); generation = ticket
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: call.getString("lang") ?? "ja-JP")), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
            call.reject("On-device speech recognition unavailable"); return
        }
        SFSpeechRecognizer.requestAuthorization { status in
            guard self.generation == ticket else { call.reject("Speech input canceled"); return }
            guard status == .authorized else { call.reject("Speech permission denied"); return }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard self.generation == ticket else { call.reject("Speech input canceled"); return }
                guard granted else { call.reject("Microphone permission denied"); return }
                DispatchQueue.main.async {
                    guard self.generation == ticket else { call.reject("Speech input canceled"); return }
                    do {
                        let session = AVAudioSession.sharedInstance()
                        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
                        try session.setActive(true)
                        let request = SFSpeechAudioBufferRecognitionRequest()
                        request.shouldReportPartialResults = true
                        request.requiresOnDeviceRecognition = true
                        self.finished = false; self.request = request
                        let input = self.engine.inputNode
                        let format = input.outputFormat(forBus: 0)
                        guard format.sampleRate > 0 && format.channelCount > 0 else { throw NSError(domain: "AnzenSpeech", code: 1) }
                        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
                        self.tapped = true
                        self.task = recognizer.recognitionTask(with: request) { result, error in
                            DispatchQueue.main.async {
                                guard self.generation == ticket else { return }
                                if let result = result { self.notifyListeners("result", data: ["text": result.bestTranscription.formattedString, "final": result.isFinal]) }
                                if error != nil { self.notifyListeners("error", data: ["error": "audio-capture"]); self.finish(cancel: true) }
                                else if result?.isFinal == true { self.finish(cancel: false) }
                            }
                        }
                        self.engine.prepare(); try self.engine.start(); call.resolve()
                    } catch { self.finish(cancel: true); call.reject("Speech input unavailable") }
                }
            }
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { if self.finished { self.generation = UUID(); self.notifyListeners("end", data: [:]) } else { self.engine.stop(); self.request?.endAudio(); self.task?.finish() }; call.resolve() }
    }
    @objc func abort(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.finish(cancel: true); call.resolve() }
    }
}

// Capacitor's default SPA router always serves /index.html for extensionless paths.
// Next static export needs the matching bundled /route/index.html on cold navigation.
public struct AnzenStaticRouter: Router {
    public var basePath: String = ""
    public init() {}
    public func route(for path: String) -> String {
        let base = URL(fileURLWithPath: basePath).standardizedFileURL
        let candidate = base.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))).standardizedFileURL
        guard candidate.path == base.path || candidate.path.hasPrefix(base.path + "/") else {
            return base.appendingPathComponent("404.html").path
        }
        let file = candidate.pathExtension.isEmpty ? candidate.appendingPathComponent("index.html") : candidate
        return FileManager.default.fileExists(atPath: file.path) ? file.path : base.appendingPathComponent("404.html").path
    }
}

@objc(NativeDocumentsPlugin)
public class NativeDocumentsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeDocumentsPlugin"
    public let jsName = "NativeDocuments"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "printPage", returnType: CAPPluginReturnPromise)]
    @objc func printPage(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else { call.reject("Document unavailable"); return }
            let controller = UIPrintInteractionController.shared
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = call.getString("title") ?? "安全AIポータル"
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()
            controller.present(animated: true) { _, completed, error in
                if error != nil { call.reject("Printing unavailable") }
                else { call.resolve(["completed": completed]) }
            }
        }
    }
}
